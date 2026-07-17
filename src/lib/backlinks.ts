import { parseCollectionEntryRecord } from "./collection.js";
import { resolveIdentityProfile } from "./identity.js";
import { NSID } from "./protocol.js";
import { isDid } from "./shape.js";

const CONSTELLATION = "https://constellation.microcosm.blue";
const SLINGSHOT = "https://slingshot.microcosm.blue";
const MAX_CANDIDATES = 50;
const MAX_RESPONSE_BYTES = 128_000;

export interface Collector {
  did: string;
  handle?: string;
  recordUri: string;
  createdAt: string;
  observations: number;
}

interface Candidate {
  did: string;
  rkey: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("The backlink service returned too much data.");
  }
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("The backlink service returned too much data.");
  }
  return JSON.parse(body) as unknown;
}

function parseCandidates(payload: unknown): Candidate[] {
  if (!isRecord(payload) || !Array.isArray(payload.records)) return [];
  const candidates = new Map<string, Candidate>();
  for (const item of payload.records.slice(0, MAX_CANDIDATES)) {
    if (
      !isRecord(item) ||
      typeof item.did !== "string" ||
      !isDid(item.did) ||
      typeof item.rkey !== "string" ||
      !/^[A-Za-z0-9._~:-]{1,512}$/.test(item.rkey) ||
      (item.collection !== undefined &&
        item.collection !== NSID.collectionEntry)
    ) {
      continue;
    }
    candidates.set(`${item.did}/${item.rkey}`, {
      did: item.did,
      rkey: item.rkey,
    });
  }
  return [...candidates.values()];
}

async function fetchCandidateRecord(
  candidate: Candidate,
  subject: string,
  fetcher: typeof fetch,
): Promise<Collector | undefined> {
  const url = new URL(`${SLINGSHOT}/xrpc/com.atproto.repo.getRecord`);
  url.searchParams.set("repo", candidate.did);
  url.searchParams.set("collection", NSID.collectionEntry);
  url.searchParams.set("rkey", candidate.rkey);
  const response = await fetcher(url, {
    headers: { accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return undefined;
  const payload = await readJson(response);
  if (!isRecord(payload)) return undefined;
  const record = parseCollectionEntryRecord(payload.value);
  const expectedUri = `at://${candidate.did}/${NSID.collectionEntry}/${candidate.rkey}`;
  if (record?.subject !== subject || payload.uri !== expectedUri)
    return undefined;

  let handle: string | undefined;
  try {
    handle = (await resolveIdentityProfile(candidate.did, fetcher)).handle;
  } catch {
    // A valid repository record remains useful when its mutable handle cannot resolve.
  }
  return {
    did: candidate.did,
    ...(handle ? { handle } : {}),
    recordUri: expectedUri,
    createdAt: record.createdAt,
    observations: 1,
  };
}

export async function findCollectors(
  subject: string,
  fetcher: typeof fetch = fetch,
): Promise<Collector[]> {
  if (!isDid(subject)) throw new Error("The backlink subject must be a DID.");
  const url = new URL(
    `${CONSTELLATION}/xrpc/blue.microcosm.links.getBacklinks`,
  );
  url.searchParams.set("subject", subject);
  url.searchParams.set("source", `${NSID.collectionEntry}:subject`);
  url.searchParams.set("limit", String(MAX_CANDIDATES));
  url.searchParams.set("reverse", "true");
  const response = await fetcher(url, {
    headers: { accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok)
    throw new Error("Collector discovery is temporarily unavailable.");
  const candidates = parseCandidates(await readJson(response));

  const verified: Collector[] = [];
  for (let index = 0; index < candidates.length; index += 5) {
    const batch = await Promise.allSettled(
      candidates
        .slice(index, index + 5)
        .map((candidate) => fetchCandidateRecord(candidate, subject, fetcher)),
    );
    for (const result of batch) {
      if (result.status === "fulfilled" && result.value)
        verified.push(result.value);
    }
  }

  const collectors = new Map<string, Collector>();
  for (const collector of verified) {
    const existing = collectors.get(collector.did);
    if (!existing) {
      collectors.set(collector.did, collector);
      continue;
    }
    existing.observations += 1;
    if (Date.parse(collector.createdAt) > Date.parse(existing.createdAt)) {
      existing.createdAt = collector.createdAt;
      existing.recordUri = collector.recordUri;
    }
    if (!existing.handle && collector.handle)
      existing.handle = collector.handle;
  }
  return [...collectors.values()].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

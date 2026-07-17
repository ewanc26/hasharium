import { isDid } from "./shape.js";
import { PLACEHOLDER_DID } from "./protocol.js";

const RESOLVER_ENDPOINT =
  "https://slingshot.microcosm.blue/xrpc/blue.microcosm.identity.resolveMiniDoc";
const MAX_RESPONSE_BYTES = 32_768;

export interface ResolvedIdentity {
  did: string;
  handle?: string;
}

export interface IdentityProfile extends ResolvedIdentity {
  pds?: string;
}

export class IdentityResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityResolutionError";
  }
}

export function normalizeHandle(value: string): string {
  const trimmed = value.trim();
  return (trimmed.startsWith("@") ? trimmed.slice(1) : trimmed).toLowerCase();
}

export function isHandle(value: string): boolean {
  const handle = normalizeHandle(value);
  if (handle.length < 3 || handle.length > 253 || !handle.includes(".")) {
    return false;
  }

  const labels = handle.split(".");
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function publicHttpsOrigin(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

async function fetchMiniDoc(
  identifier: string,
  fetcher: typeof fetch,
): Promise<Record<string, unknown>> {
  const url = new URL(RESOLVER_ENDPOINT);
  url.searchParams.set("identifier", identifier);

  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new IdentityResolutionError(
      "That identity could not be resolved right now. Check it and try again.",
    );
  }

  if (!response.ok) {
    throw new IdentityResolutionError(
      response.status === 404
        ? "No decentralised identity was found for that identifier."
        : "That identity could not be resolved right now. Check it and try again.",
    );
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new IdentityResolutionError(
      "The identity resolver returned an invalid response.",
    );
  }

  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
    throw new IdentityResolutionError(
      "The identity resolver returned an invalid response.",
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new IdentityResolutionError(
      "The identity resolver returned an invalid response.",
    );
  }

  if (
    !isRecord(payload) ||
    typeof payload.did !== "string" ||
    !isDid(payload.did)
  ) {
    throw new IdentityResolutionError(
      "The identity resolver returned an invalid response.",
    );
  }
  return payload;
}

export async function resolveIdentity(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<ResolvedIdentity> {
  const identifier = value.trim();
  if (isDid(identifier)) return { did: identifier };
  if (!isHandle(identifier)) {
    throw new IdentityResolutionError(
      `Enter a complete DID or handle, such as ${PLACEHOLDER_DID}.`,
    );
  }

  const handle = normalizeHandle(identifier);
  const payload = await fetchMiniDoc(handle, fetcher);

  return { did: payload.did as string, handle };
}

export async function resolveIdentityProfile(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<IdentityProfile> {
  const identifier = value.trim();
  if (!isDid(identifier) && !isHandle(identifier)) {
    throw new IdentityResolutionError(
      `Enter a complete DID or handle, such as ${PLACEHOLDER_DID}.`,
    );
  }

  const normalized = isDid(identifier)
    ? identifier
    : normalizeHandle(identifier);
  const payload = await fetchMiniDoc(normalized, fetcher);
  if (isDid(identifier) && payload.did !== identifier) {
    throw new IdentityResolutionError(
      "The identity resolver returned a different DID.",
    );
  }

  const handle =
    typeof payload.handle === "string" && isHandle(payload.handle)
      ? normalizeHandle(payload.handle)
      : isHandle(identifier)
        ? normalizeHandle(identifier)
        : undefined;
  const pds = publicHttpsOrigin(payload.pds);
  return {
    did: payload.did as string,
    ...(handle ? { handle } : {}),
    ...(pds ? { pds } : {}),
  };
}

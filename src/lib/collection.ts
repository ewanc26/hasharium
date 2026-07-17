import type { Agent } from "@atproto/api";
import {
  GENERATOR_VERSION,
  NSID,
  type CollectionEntryRecord,
} from "./protocol";
import { isDid } from "./shape";

const MAX_RECORD_PAGES = 10;

export interface CollectionEntry {
  uri: string;
  cid: string;
  rkey: string;
  record: CollectionEntryRecord;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 64 &&
    Number.isFinite(Date.parse(value))
  );
}

export function countGraphemes(value: string): number {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter().segment(value)).length;
  }
  return Array.from(value).length;
}

export function validateCollectionNote(note: string): string | undefined {
  if (new TextEncoder().encode(note).byteLength > 1_000) {
    return "Field notes must be at most 1,000 UTF-8 bytes.";
  }
  if (countGraphemes(note) > 280) {
    return "Field notes must be at most 280 characters.";
  }
}

export function parseCollectionEntryRecord(
  value: unknown,
): CollectionEntryRecord | undefined {
  if (
    !isRecord(value) ||
    value.$type !== NSID.collectionEntry ||
    typeof value.subject !== "string" ||
    !isDid(value.subject) ||
    !isDateTime(value.createdAt) ||
    (value.generatorVersion !== undefined &&
      value.generatorVersion !== GENERATOR_VERSION) ||
    (value.note !== undefined &&
      (typeof value.note !== "string" ||
        validateCollectionNote(value.note) !== undefined))
  ) {
    return undefined;
  }

  return {
    $type: NSID.collectionEntry,
    subject: value.subject,
    createdAt: value.createdAt,
    ...(value.generatorVersion === GENERATOR_VERSION
      ? { generatorVersion: GENERATOR_VERSION }
      : {}),
    ...(typeof value.note === "string" ? { note: value.note } : {}),
  };
}

export function recordKeyFromUri(uri: string): string | undefined {
  const prefix = `/${NSID.collectionEntry}/`;
  if (!uri.startsWith("at://") || !uri.includes(prefix)) return undefined;
  const rkey = uri.slice(uri.indexOf(prefix) + prefix.length);
  return /^[A-Za-z0-9._~:-]{1,512}$/.test(rkey) ? rkey : undefined;
}

export function parseCollectionEntry(
  value: unknown,
  uri: unknown,
  cid: unknown,
): CollectionEntry | undefined {
  const record = parseCollectionEntryRecord(value);
  if (typeof uri !== "string" || typeof cid !== "string" || !record) {
    return undefined;
  }
  const rkey = recordKeyFromUri(uri);
  return rkey ? { uri, cid, rkey, record } : undefined;
}

export async function listCollectionEntries(
  agent: Agent,
): Promise<CollectionEntry[]> {
  const entries: CollectionEntry[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let page = 0; page < MAX_RECORD_PAGES; page += 1) {
    const response = await agent.com.atproto.repo.listRecords({
      repo: agent.assertDid,
      collection: NSID.collectionEntry,
      limit: 100,
      cursor,
    });
    for (const item of response.data.records) {
      const entry = parseCollectionEntry(item.value, item.uri, item.cid);
      if (entry) entries.push(entry);
    }

    cursor = response.data.cursor;
    if (!cursor) break;
    if (seenCursors.has(cursor)) {
      throw new Error("The PDS repeated a collection cursor.");
    }
    seenCursors.add(cursor);
  }

  return entries.sort(
    (left, right) =>
      Date.parse(right.record.createdAt) - Date.parse(left.record.createdAt),
  );
}

export async function createCollectionEntry(
  agent: Agent,
  subject: string,
  note = "",
): Promise<CollectionEntry> {
  if (!isDid(subject)) throw new Error("The specimen subject is not a DID.");
  const normalizedNote = note.trim();
  const noteError = validateCollectionNote(normalizedNote);
  if (noteError) throw new Error(noteError);

  const record: CollectionEntryRecord = {
    $type: NSID.collectionEntry,
    subject,
    generatorVersion: GENERATOR_VERSION,
    createdAt: new Date().toISOString(),
    ...(normalizedNote ? { note: normalizedNote } : {}),
  };
  const response = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: NSID.collectionEntry,
    record: { ...record },
  });
  const entry = parseCollectionEntry(
    record,
    response.data.uri,
    response.data.cid,
  );
  if (!entry) throw new Error("The PDS returned an invalid collection record.");
  return entry;
}

export async function deleteCollectionEntry(
  agent: Agent,
  entry: CollectionEntry,
): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: agent.assertDid,
    collection: NSID.collectionEntry,
    rkey: entry.rkey,
  });
}

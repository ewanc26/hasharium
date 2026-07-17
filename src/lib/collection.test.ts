import { describe, expect, it } from "vitest";
import { GENERATOR_VERSION, NSID } from "./protocol";
import {
  countGraphemes,
  parseCollectionEntry,
  parseCollectionEntryRecord,
  recordKeyFromUri,
  validateCollectionNote,
} from "./collection";

const validRecord = {
  $type: NSID.collectionEntry,
  subject: "did:plc:ofrbh253gwicbkc5nktqepol",
  generatorVersion: GENERATOR_VERSION,
  note: "Observed beneath a quiet green light.",
  createdAt: "2026-07-17T10:00:00.000Z",
};

describe("Hasharium collection records", () => {
  it("accepts the published collection shape", () => {
    expect(parseCollectionEntryRecord(validRecord)).toEqual(validRecord);
  });

  it("rejects wrong types, invalid DIDs, dates, versions, and oversized notes", () => {
    expect(
      parseCollectionEntryRecord({ ...validRecord, $type: "other" }),
    ).toBeUndefined();
    expect(
      parseCollectionEntryRecord({ ...validRecord, subject: "not-a-did" }),
    ).toBeUndefined();
    expect(
      parseCollectionEntryRecord({ ...validRecord, createdAt: "yesterday" }),
    ).toBeUndefined();
    expect(
      parseCollectionEntryRecord({ ...validRecord, generatorVersion: "v2" }),
    ).toBeUndefined();
    expect(
      parseCollectionEntryRecord({ ...validRecord, note: "x".repeat(1_001) }),
    ).toBeUndefined();
  });

  it("extracts the exact record key from an AT URI", () => {
    const uri = `at://did:plc:owner/${NSID.collectionEntry}/3mabc123`;
    expect(recordKeyFromUri(uri)).toBe("3mabc123");
    expect(parseCollectionEntry(validRecord, uri, "bafy-record")).toMatchObject(
      {
        uri,
        cid: "bafy-record",
        rkey: "3mabc123",
      },
    );
    expect(recordKeyFromUri("https://example.com/record")).toBeUndefined();
  });

  it("enforces both grapheme and byte limits for public notes", () => {
    expect(countGraphemes("a👨‍👩‍👧‍👦b")).toBe(3);
    expect(validateCollectionNote("a".repeat(280))).toBeUndefined();
    expect(validateCollectionNote("a".repeat(281))).toContain("280");
    expect(validateCollectionNote("🪨".repeat(260))).toContain("1,000");
  });
});

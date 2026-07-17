import { describe, expect, it, vi } from "vitest";
import { findCollectors } from "./backlinks";
import { NSID } from "./protocol";

const subject = "did:plc:ofrbh253gwicbkc5nktqepol";
const collector = "did:plc:ar7c4by46qjdydhdevvrndac";

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("findCollectors", () => {
  it("discovers candidates but returns only repository-confirmed collection records", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      if (url.hostname === "constellation.microcosm.blue") {
        expect(url.searchParams.get("source")).toBe(
          `${NSID.collectionEntry}:subject`,
        );
        return response({
          records: [
            { did: collector, collection: NSID.collectionEntry, rkey: "valid" },
            {
              did: collector,
              collection: NSID.collectionEntry,
              rkey: "wrong-subject",
            },
          ],
        });
      }
      if (url.pathname.endsWith("com.atproto.repo.getRecord")) {
        const rkey = url.searchParams.get("rkey");
        return response({
          uri: `at://${collector}/${NSID.collectionEntry}/${rkey}`,
          value: {
            $type: NSID.collectionEntry,
            subject: rkey === "valid" ? subject : "did:web:someone.example",
            createdAt: "2026-07-17T10:00:00.000Z",
          },
        });
      }
      return response({ did: collector, handle: "collector.example" });
    });

    await expect(
      findCollectors(subject, fetcher as typeof fetch),
    ).resolves.toEqual([
      {
        did: collector,
        handle: "collector.example",
        recordUri: `at://${collector}/${NSID.collectionEntry}/valid`,
        createdAt: "2026-07-17T10:00:00.000Z",
        observations: 1,
      },
    ]);
  });

  it("deduplicates repeat observations by curator", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      if (url.hostname === "constellation.microcosm.blue") {
        return response({
          records: ["one", "two"].map((rkey) => ({ did: collector, rkey })),
        });
      }
      if (url.pathname.endsWith("com.atproto.repo.getRecord")) {
        const rkey = url.searchParams.get("rkey");
        return response({
          uri: `at://${collector}/${NSID.collectionEntry}/${rkey}`,
          value: {
            $type: NSID.collectionEntry,
            subject,
            createdAt:
              rkey === "two" ? "2026-07-18T00:00:00Z" : "2026-07-17T00:00:00Z",
          },
        });
      }
      return response({ did: collector });
    });
    const result = await findCollectors(subject, fetcher as typeof fetch);
    expect(result).toHaveLength(1);
    expect(result[0]?.observations).toBe(2);
    expect(result[0]?.recordUri.endsWith("/two")).toBe(true);
  });
});

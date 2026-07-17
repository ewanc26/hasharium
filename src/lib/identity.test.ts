import { describe, expect, it, vi } from "vitest";
import {
  IdentityResolutionError,
  isHandle,
  normalizeHandle,
  resolveIdentity,
  resolveIdentityProfile,
} from "./identity";

describe("handle validation", () => {
  it("accepts domain handles with an optional at sign", () => {
    expect(isHandle("alice.example")).toBe(true);
    expect(isHandle(" @Alice.Example ")).toBe(true);
    expect(normalizeHandle(" @Alice.Example ")).toBe("alice.example");
  });

  it("rejects incomplete or malformed handles", () => {
    expect(isHandle("alice")).toBe(false);
    expect(isHandle("-alice.example")).toBe(false);
    expect(isHandle("alice..example")).toBe(false);
    expect(isHandle(`${"a".repeat(64)}.example`)).toBe(false);
  });
});

describe("identity resolution", () => {
  it("keeps a valid DID local", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(resolveIdentity(" did:plc:abc123 ", fetcher)).resolves.toEqual(
      {
        did: "did:plc:abc123",
      },
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("resolves a handle to its canonical DID", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ did: "did:plc:abc123", handle: "alice.example" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    await expect(resolveIdentity("@Alice.Example", fetcher)).resolves.toEqual({
      did: "did:plc:abc123",
      handle: "alice.example",
    });
    const requestUrl = new URL(String(fetcher.mock.calls[0][0]));
    expect(requestUrl.origin).toBe("https://slingshot.microcosm.blue");
    expect(requestUrl.searchParams.get("identifier")).toBe("alice.example");
  });

  it("rejects malformed resolver responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ did: "not-a-did" }), { status: 200 }),
      );

    await expect(
      resolveIdentity("alice.example", fetcher),
    ).rejects.toBeInstanceOf(IdentityResolutionError);
  });

  it("turns resolver failures into a useful identity error", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("offline"));
    await expect(resolveIdentity("alice.example", fetcher)).rejects.toThrow(
      "could not be resolved right now",
    );
  });

  it("loads bounded public identity details for the profile space", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          did: "did:plc:abc123",
          handle: "alice.example",
          pds: "https://pds.example",
        }),
        { status: 200 },
      ),
    );

    await expect(
      resolveIdentityProfile("did:plc:abc123", fetcher),
    ).resolves.toEqual({
      did: "did:plc:abc123",
      handle: "alice.example",
      pds: "https://pds.example",
    });
    expect(
      new URL(String(fetcher.mock.calls[0][0])).searchParams.get("identifier"),
    ).toBe("did:plc:abc123");
  });

  it("rejects identity-profile DID mismatches and unsafe PDS metadata", async () => {
    const mismatch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ did: "did:plc:other" }), { status: 200 }),
      );
    await expect(
      resolveIdentityProfile("did:plc:abc123", mismatch),
    ).rejects.toThrow("different DID");

    const unsafePds = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          did: "did:plc:abc123",
          pds: "http://127.0.0.1:3000",
        }),
        { status: 200 },
      ),
    );
    await expect(
      resolveIdentityProfile("did:plc:abc123", unsafePds),
    ).resolves.toEqual({ did: "did:plc:abc123" });
  });
});

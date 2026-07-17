import { describe, expect, it } from "vitest";
import { PLACEHOLDER_DID } from "./protocol";
import {
  compactOgDid,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  OgInputError,
  ogImageUrl,
  parseOgDid,
} from "./og";

describe("Open Graph image inputs", () => {
  it("uses the owner DID when no subject is supplied", () => {
    expect(parseOgDid(null)).toBe(PLACEHOLDER_DID);
    expect(parseOgDid("  ")).toBe(PLACEHOLDER_DID);
  });

  it("preserves valid DID spelling after trimming", () => {
    expect(parseOgDid("  did:example:CaseSensitive  ")).toBe(
      "did:example:CaseSensitive",
    );
  });

  it("rejects handles, incomplete DIDs, and oversized input", () => {
    expect(() => parseOgDid("ewancroft.uk")).toThrow(OgInputError);
    expect(() => parseOgDid("did:plc:")).toThrow(OgInputError);
    expect(() => parseOgDid(`did:example:${"a".repeat(2048)}`)).toThrow(
      OgInputError,
    );
  });

  it("builds a canonical, encoded production image URL", () => {
    const url = new URL(ogImageUrl("did:web:hasharium.croft.click"));
    expect(url.origin).toBe("https://hasharium.croft.click");
    expect(url.pathname).toBe("/api/og");
    expect(url.searchParams.get("did")).toBe("did:web:hasharium.croft.click");
    expect(OG_IMAGE_WIDTH).toBe(1200);
    expect(OG_IMAGE_HEIGHT).toBe(630);
  });

  it("compacts only display labels, never the hashed DID", () => {
    const did = `did:example:${"a".repeat(80)}`;
    expect(compactOgDid("did:example:short")).toBe("did:example:short");
    expect(compactOgDid(did)).toBe(`${did.slice(0, 39)}…${did.slice(-20)}`);
  });
});

import { describe, expect, it } from "vitest";
import { generateSpecimen, hashIdentity, isDid } from "./shape";

describe("DID validation", () => {
  it("accepts common DID methods", () => {
    expect(isDid("did:plc:ewvi7nxzyoun6zhxrhs64oiz")).toBe(true);
    expect(isDid("did:web:example.com")).toBe(true);
    expect(isDid("did:key:z6MkiTBz1y")).toBe(true);
  });

  it("rejects handles and incomplete identifiers", () => {
    expect(isDid("alice.example")).toBe(false);
    expect(isDid("did:plc:")).toBe(false);
    expect(isDid("not a did")).toBe(false);
    expect(isDid(`did:example:${"a".repeat(2048)}`)).toBe(false);
  });
});

describe("specimen generation", () => {
  it("hashes identities with SHA-256", async () => {
    const digest = await hashIdentity("did:example:123");
    expect(digest).toHaveLength(32);
  });

  it("is stable for the same DID", async () => {
    const first = await generateSpecimen("did:plc:ewvi7nxzyoun6zhxrhs64oiz");
    const second = await generateSpecimen("did:plc:ewvi7nxzyoun6zhxrhs64oiz");
    expect(second).toEqual(first);
  });

  it.each([
    {
      did: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
      fingerprint:
        "099e4ea96cd62c05a232331859d20c97425f25b21f193068b1abf7b763e40ed1",
      catalogueNumber: "H-099E-4EA9",
      name: "Velvet Oculus",
      symmetry: 5,
      layers: 4,
      aperture: 30,
      material: "mineral",
      temperament: "opening",
    },
    {
      did: "did:web:hasharium.croft.click",
      fingerprint:
        "2c9de3ac12c1a9c531ff993f0bb03f0ac869c5e778e3d1f4ef0e7c1ef32553f7",
      catalogueNumber: "H-2C9D-E3AC",
      name: "Hollow Glyph",
      symmetry: 5,
      layers: 3,
      aperture: 11,
      material: "glass",
      temperament: "opening",
    },
    {
      did: "did:key:z6MkjchhfUsD6F6Qt4",
      fingerprint:
        "5d411f8ee102b63468a14b9b043d1737053af5239bce15dc49026471c76c6d54",
      catalogueNumber: "H-5D41-1F8E",
      name: "Lucent Vessel",
      symmetry: 5,
      layers: 4,
      aperture: 11,
      material: "glass",
      temperament: "still",
    },
  ])("preserves the v1 golden output for $did", async (expected) => {
    const specimen = await generateSpecimen(expected.did);
    expect(specimen).toMatchObject(expected);
    expect(
      specimen.paths.every(
        (path) => path.startsWith("M ") && path.endsWith(" Z"),
      ),
    ).toBe(true);
  });

  it("produces meaningfully different specimens for different DIDs", async () => {
    const first = await generateSpecimen("did:example:alpha");
    const second = await generateSpecimen("did:example:beta");
    expect(second.fingerprint).not.toBe(first.fingerprint);
    expect(second.paths).not.toEqual(first.paths);
  });

  it("keeps generated traits within documented bounds", async () => {
    const specimen = await generateSpecimen("did:web:hasharium.example");
    expect(specimen.symmetry).toBeGreaterThanOrEqual(3);
    expect(specimen.symmetry).toBeLessThanOrEqual(9);
    expect(specimen.layers).toBeGreaterThanOrEqual(2);
    expect(specimen.layers).toBeLessThanOrEqual(4);
    expect(specimen.paths).toHaveLength(specimen.layers);
    expect(specimen.catalogueNumber).toMatch(/^H-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  it("trims surrounding whitespace without changing DID character case", async () => {
    const trimmed = await generateSpecimen("  did:example:CaseSensitive  ");
    const exact = await generateSpecimen("did:example:CaseSensitive");
    const lower = await generateSpecimen("did:example:casesensitive");

    expect(trimmed).toEqual(exact);
    expect(trimmed.did).toBe("did:example:CaseSensitive");
    expect(lower.fingerprint).not.toBe(trimmed.fingerprint);
  });
});

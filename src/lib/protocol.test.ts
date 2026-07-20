import { describe, expect, it } from "vitest";
import {
  GENERATOR_VERSION,
  GENERATOR_VERSIONS,
  HASHARIUM_HOST,
  NSID,
  PLACEHOLDER_DID,
  SOURCE_URL,
} from "./protocol";

describe("Hasharium protocol constants", () => {
  it("uses the croft.click application host", () => {
    expect(HASHARIUM_HOST).toBe("hasharium.croft.click");
    expect(SOURCE_URL).toBe("https://github.com/ewanc26/hasharium");
    expect(PLACEHOLDER_DID).toBe("did:plc:ofrbh253gwicbkc5nktqepol");
  });

  it("keeps every application NSID inside the declared namespace", () => {
    for (const nsid of Object.values(NSID)) {
      expect(nsid.startsWith("click.croft.hasharium.")).toBe(true);
    }
  });

  it("pins a named generator version for durable records", () => {
    expect(GENERATOR_VERSION).toMatch(/^sha256-[a-z0-9-]+-v\d+$/);
  });

  it("lists every supported generator version as a named rendition", () => {
    expect(GENERATOR_VERSIONS).toContain("sha256-radial-v1");
    expect(GENERATOR_VERSIONS).toContain("sha256-radial-v2");
    for (const version of GENERATOR_VERSIONS) {
      expect(version).toMatch(/^sha256-[a-z0-9-]+-v\d+$/);
    }
  });
});

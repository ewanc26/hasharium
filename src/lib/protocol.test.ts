import { describe, expect, it } from "vitest";
import {
  GENERATOR_VERSION,
  HASHARIUM_HOST,
  NSID,
  SOURCE_URL,
} from "./protocol";

describe("Hasharium protocol constants", () => {
  it("uses the croft.click application host", () => {
    expect(HASHARIUM_HOST).toBe("hasharium.croft.click");
    expect(SOURCE_URL).toBe("https://github.com/ewanc26/hasharium");
  });

  it("keeps every application NSID inside the declared namespace", () => {
    for (const nsid of Object.values(NSID)) {
      expect(nsid.startsWith("click.croft.hasharium.")).toBe(true);
    }
  });

  it("pins a named generator version for durable records", () => {
    expect(GENERATOR_VERSION).toMatch(/^sha256-[a-z0-9-]+-v\d+$/);
  });
});

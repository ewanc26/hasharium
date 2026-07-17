import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { NSID } from "./protocol";

interface LexiconDocument {
  lexicon: number;
  id: string;
  defs: Record<string, unknown>;
}

const root = resolve("lexicons");

function jsonFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory()
      ? jsonFiles(path)
      : entry.name.endsWith(".json")
        ? [path]
        : [];
  });
}

describe("Hasharium lexicons", () => {
  const files = jsonFiles(root);

  it("defines every runtime NSID exactly once", () => {
    const ids = files.map((file) => JSON.parse(readFileSync(file, "utf8")).id);
    expect(ids.sort()).toEqual(Object.values(NSID).sort());
  });

  it.each(files)(
    "%s matches its namespaced path and has a record main definition",
    (file) => {
      const lexicon = JSON.parse(readFileSync(file, "utf8")) as LexiconDocument;
      const pathNsid = relative(root, file)
        .replace(/\.json$/, "")
        .split(sep)
        .join(".");

      expect(lexicon.lexicon).toBe(1);
      expect(lexicon.id).toBe(pathNsid);
      expect(lexicon.id.startsWith("click.croft.hasharium.")).toBe(true);
      expect(lexicon.defs).toHaveProperty("main");
      expect(lexicon.defs.main).toMatchObject({ type: "record" });
    },
  );
});

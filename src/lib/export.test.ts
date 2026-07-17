import { describe, expect, it } from "vitest";
import { exportSpecimenSvg, specimenExportFilename } from "./export";
import { GENERATOR_VERSION, SOURCE_URL } from "./protocol";
import { generateSpecimen } from "./shape";

function decodeXmlText(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

describe("specimen SVG export", () => {
  it("embeds portable provenance metadata and complete geometry", async () => {
    const specimen = await generateSpecimen("did:plc:ewvi7nxzyoun6zhxrhs64oiz");
    const svg = exportSpecimenSvg(specimen);
    const metadataText = svg.match(
      /<metadata id="hasharium-metadata">(.+)<\/metadata>/,
    )?.[1];

    expect(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(svg.match(/<path /g)).toHaveLength(specimen.paths.length);
    expect(metadataText).toBeDefined();
    expect(JSON.parse(decodeXmlText(metadataText!))).toEqual({
      format: "hasharium-specimen-v1",
      subject: specimen.did,
      fingerprint: specimen.fingerprint,
      catalogueNumber: specimen.catalogueNumber,
      name: specimen.name,
      generatorVersion: GENERATOR_VERSION,
      source: SOURCE_URL,
    });
    expect(specimenExportFilename(specimen)).toBe("hasharium-h-099e-4ea9.svg");
  });

  it("escapes identity text in both metadata and accessible description", async () => {
    const specimen = await generateSpecimen(
      "did:example:subject?left=1&right=2",
    );
    const svg = exportSpecimenSvg(specimen);
    expect(svg).toContain("left=1&amp;right=2");
    expect(svg).not.toContain("left=1&right=2");
  });
});

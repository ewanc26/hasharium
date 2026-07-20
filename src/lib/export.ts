import { SOURCE_URL } from "./protocol";
import type { Specimen } from "./shape";

export interface SpecimenExportMetadata {
  format: "hasharium-specimen-v1";
  subject: string;
  fingerprint: string;
  catalogueNumber: string;
  name: string;
  generatorVersion: Specimen["generatorVersion"];
  source: typeof SOURCE_URL;
}

function escapeXmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function specimenExportMetadata(
  specimen: Specimen,
): SpecimenExportMetadata {
  return {
    format: "hasharium-specimen-v1",
    subject: specimen.did,
    fingerprint: specimen.fingerprint,
    catalogueNumber: specimen.catalogueNumber,
    name: specimen.name,
    generatorVersion: specimen.generatorVersion,
    source: SOURCE_URL,
  };
}

export function exportSpecimenSvg(specimen: Specimen): string {
  const gradientId = `wash-${specimen.fingerprint.slice(0, 10)}`;
  const titleId = `${gradientId}-title`;
  const descriptionId = `${gradientId}-description`;
  const metadata = escapeXmlText(
    JSON.stringify(specimenExportMetadata(specimen)),
  );
  const paths = specimen.paths
    .map((path, index) => {
      const fill =
        index === 0 ? `url(#${gradientId})` : specimen.palette[(index + 1) % 3];
      const fillOpacity = index === 0 ? 0.96 : 0.72 + index * 0.06;
      const stroke =
        index === specimen.paths.length - 1 ? "#f4eddb" : specimen.palette[2];
      const strokeOpacity = index === specimen.paths.length - 1 ? 0.8 : 0.38;
      const filter = index === 0 ? ` filter="url(#${gradientId}-texture)"` : "";
      return `    <path d="${escapeXmlAttribute(path)}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-opacity="${strokeOpacity}" stroke-width="1.2"${filter} />`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-labelledby="${titleId} ${descriptionId}">
  <title id="${titleId}">${escapeXmlText(specimen.name)}</title>
  <desc id="${descriptionId}">A deterministic ${specimen.symmetry}-fold ${specimen.material} specimen generated from ${escapeXmlText(specimen.did)}.</desc>
  <metadata id="hasharium-metadata">${metadata}</metadata>
  <defs>
    <radialGradient id="${gradientId}" cx="36%" cy="30%" r="76%">
      <stop offset="0%" stop-color="${specimen.palette[1]}" />
      <stop offset="58%" stop-color="${specimen.palette[0]}" />
      <stop offset="100%" stop-color="${specimen.palette[2]}" />
    </radialGradient>
    <filter id="${gradientId}-texture" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${Number.parseInt(specimen.fingerprint.slice(0, 4), 16)}" result="noise" />
      <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
      <feBlend in="SourceGraphic" in2="mono" mode="soft-light" />
    </filter>
  </defs>
  <g style="transform: rotate(${specimen.rotation}deg); transform-origin: 160px 160px;">
${paths}
    <circle cx="160" cy="160" r="${specimen.aperture}" fill="#1c2925" stroke="${specimen.palette[1]}" stroke-width="2" />
    <circle cx="160" cy="160" r="${Math.max(2, specimen.aperture * 0.26)}" fill="#f2ead7" />
  </g>
</svg>
`;
}

export function specimenExportFilename(specimen: Specimen): string {
  return `hasharium-${specimen.catalogueNumber.toLowerCase()}.svg`;
}

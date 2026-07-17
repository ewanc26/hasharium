export type Material = "vellum" | "oxide" | "glass" | "ink" | "mineral";

export interface Specimen {
  did: string;
  fingerprint: string;
  catalogueNumber: string;
  name: string;
  symmetry: number;
  layers: number;
  aperture: number;
  material: Material;
  temperament: string;
  palette: [string, string, string];
  paths: string[];
  rotation: number;
}

const adjectives = [
  "Quiet",
  "Hollow",
  "Lucent",
  "Patient",
  "Folded",
  "Distant",
  "Velvet",
  "Copper",
  "Pale",
  "Hidden",
  "Singing",
  "Tidal",
  "Tender",
  "Ancient",
  "Vagrant",
  "Small",
] as const;

const forms = [
  "Rosette",
  "Prism",
  "Orbifold",
  "Aperture",
  "Lattice",
  "Medallion",
  "Vessel",
  "Radiant",
  "Calyx",
  "Glyph",
  "Corona",
  "Facet",
  "Oculus",
  "Folio",
  "Nodule",
  "Sigil",
] as const;

const materials: Material[] = ["vellum", "oxide", "glass", "ink", "mineral"];
const temperaments = [
  "resting",
  "watchful",
  "wandering",
  "resonant",
  "still",
  "opening",
];

const palettes: Array<[string, string, string]> = [
  ["#cb5938", "#edb45f", "#24483d"],
  ["#245b56", "#76a89a", "#d7b465"],
  ["#75425d", "#c07777", "#dfb763"],
  ["#2e5167", "#70a4ad", "#c96645"],
  ["#584c82", "#9a86a9", "#d79e62"],
  ["#2e6042", "#75a36a", "#d36a43"],
  ["#8a4b2e", "#cf8452", "#4b6a61"],
  ["#353c63", "#7f83ad", "#c45b51"],
];

export function isDid(value: string): boolean {
  const normalized = value.trim();
  return (
    normalized.length <= 2048 &&
    /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+(?:[:/][A-Za-z0-9._:%/?#=&-]+)*$/.test(
      normalized,
    )
  );
}

export async function hashIdentity(identity: string): Promise<Uint8Array> {
  const normalized = identity.trim();
  const input = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return new Uint8Array(digest);
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function polarPoint(angle: number, radius: number): [number, number] {
  return [160 + Math.cos(angle) * radius, 160 + Math.sin(angle) * radius];
}

function smoothClosedPath(points: Array<[number, number]>): string {
  const midpoint = (
    a: [number, number],
    b: [number, number],
  ): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = midpoint(points.at(-1)!, points[0]);
  const commands = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const end = midpoint(point, next);
    return `Q ${point[0].toFixed(2)} ${point[1].toFixed(2)} ${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
  });
  return `M ${start[0].toFixed(2)} ${start[1].toFixed(2)} ${commands.join(" ")} Z`;
}

function makeLayer(
  bytes: Uint8Array,
  symmetry: number,
  layer: number,
  totalLayers: number,
): string {
  const points: Array<[number, number]> = [];
  const pointCount = symmetry * 4;
  const baseRadius = 118 - layer * (76 / Math.max(1, totalLayers - 1));
  const phase = ((bytes[9 + layer] / 255) * Math.PI) / symmetry;

  for (let index = 0; index < pointCount; index += 1) {
    const motifIndex = index % 4;
    const byte = bytes[(12 + layer * 4 + motifIndex) % bytes.length];
    const pulse = motifIndex % 2 === 0 ? 1 : 0.58 + (byte / 255) * 0.22;
    const radius = baseRadius * pulse;
    const angle = -Math.PI / 2 + phase + (index / pointCount) * Math.PI * 2;
    points.push(polarPoint(angle, radius));
  }

  return smoothClosedPath(points);
}

export async function generateSpecimen(did: string): Promise<Specimen> {
  const normalized = did.trim();
  const bytes = await hashIdentity(normalized);
  const digest = hex(bytes);
  const symmetry = 3 + (bytes[0] % 7);
  const layers = 2 + (bytes[1] % 3);
  const aperture = 8 + (bytes[2] % 28);
  const material = materials[bytes[3] % materials.length];
  const palette = palettes[bytes[4] % palettes.length];
  const name = `${adjectives[bytes[5] % adjectives.length]} ${forms[bytes[6] % forms.length]}`;
  const catalogueNumber = `H-${digest.slice(0, 4).toUpperCase()}-${digest.slice(4, 8).toUpperCase()}`;

  return {
    did: normalized,
    fingerprint: digest,
    catalogueNumber,
    name,
    symmetry,
    layers,
    aperture,
    material,
    temperament: temperaments[bytes[7] % temperaments.length],
    palette,
    paths: Array.from({ length: layers }, (_, index) =>
      makeLayer(bytes, symmetry, index, layers),
    ),
    rotation: (bytes[8] / 255) * 18 - 9,
  };
}

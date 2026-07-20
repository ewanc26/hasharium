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
  generatorVersion: GeneratorVersion;
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

const v2Palettes: Array<[string, string, string]> = [
  ...palettes,
  ["#9c3b3b", "#e0a85a", "#2c4a3e"],
  ["#1f4e5f", "#5fb3a8", "#e8c15a"],
  ["#5d3a6b", "#c08bbf", "#e0a85a"],
  ["#3a5a2c", "#8fb35e", "#c96645"],
  ["#6b3f1f", "#d99a5b", "#3f5d57"],
  ["#2c3e6b", "#7e93c4", "#d36a43"],
  ["#7a4a3a", "#c98f6a", "#3a5d4f"],
  ["#404a2c", "#a3b06a", "#b5643f"],
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
    generatorVersion: "sha256-radial-v1",
  };
}

export const GENERATOR_VERSIONS = [
  "sha256-radial-v1",
  "sha256-radial-v2",
] as const;
export type GeneratorVersion = (typeof GENERATOR_VERSIONS)[number];

export function isGeneratorVersion(value: unknown): value is GeneratorVersion {
  return (
    typeof value === "string" &&
    (GENERATOR_VERSIONS as readonly string[]).includes(value)
  );
}

const generators: Record<GeneratorVersion, (did: string) => Promise<Specimen>> =
  {
    "sha256-radial-v1": generateSpecimen,
    "sha256-radial-v2": generateSpecimenV2,
  };

export function generateSpecimenForVersion(
  did: string,
  version: GeneratorVersion = "sha256-radial-v1",
): Promise<Specimen> {
  return (generators[version] ?? generateSpecimen)(did);
}

class Xorshift128 {
  private state0: number;
  private state1: number;

  constructor(seed: Uint8Array) {
    this.state0 =
      readUint32(seed, 0) ^ readUint32(seed, 8) ^ readUint32(seed, 16);
    this.state1 =
      readUint32(seed, 4) ^ readUint32(seed, 12) ^ readUint32(seed, 20);
    if (this.state0 === 0 && this.state1 === 0) {
      this.state0 = 0x9e3779b9;
      this.state1 = 0x243f6a88;
    }
  }

  next(): number {
    let s1 = this.state0;
    const s0 = this.state1;
    this.state0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.state1 = s1;
    const value = (this.state0 + this.state1) >>> 0;
    return value / 0x100000000;
  }
}

function readUint32(bytes: Uint8Array, offset: number): number {
  const a = bytes[offset % bytes.length] ?? 0;
  const b = bytes[(offset + 1) % bytes.length] ?? 0;
  const c = bytes[(offset + 2) % bytes.length] ?? 0;
  const d = bytes[(offset + 3) % bytes.length] ?? 0;
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function makeLayerV2(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): string {
  const points: Array<[number, number]> = [];
  const petalsPerAxis = 2 + Math.floor(rng.next() * 3);
  const pointCount = symmetry * petalsPerAxis;
  const baseRadius = 116 - layer * (78 / Math.max(1, totalLayers - 1));
  const phase = rng.next() * ((Math.PI * 2) / symmetry);
  const pinch = 0.36 + rng.next() * 0.34;
  const wobble = 0.08 + rng.next() * 0.22;

  for (let index = 0; index < pointCount; index += 1) {
    const motifIndex = index % petalsPerAxis;
    const pulse =
      motifIndex === 0
        ? 1
        : Math.max(
            0.3,
            1 - pinch * (motifIndex / petalsPerAxis) - rng.next() * wobble,
          );
    const radius = baseRadius * pulse;
    const angle = phase + (index / pointCount) * Math.PI * 2;
    points.push(polarPoint(angle, radius));
  }

  return smoothClosedPath(points);
}

export async function generateSpecimenV2(did: string): Promise<Specimen> {
  const normalized = did.trim();
  const bytes = await hashIdentity(normalized);
  const digest = hex(bytes);
  const rng = new Xorshift128(bytes);

  const symmetry = 3 + Math.floor(rng.next() * 9);
  const layers = 2 + Math.floor(rng.next() * 5);
  const aperture = 5 + Math.floor(rng.next() * 40);
  const material = materials[Math.floor(rng.next() * materials.length)];
  const palette = v2Palettes[Math.floor(rng.next() * v2Palettes.length)];
  const name = `${adjectives[Math.floor(rng.next() * adjectives.length)]} ${
    forms[Math.floor(rng.next() * forms.length)]
  }`;
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
    temperament: temperaments[Math.floor(rng.next() * temperaments.length)],
    palette,
    paths: Array.from({ length: layers }, (_, index) =>
      makeLayerV2(rng, symmetry, index, layers),
    ),
    rotation: rng.next() * 22 - 11,
    generatorVersion: "sha256-radial-v2",
  };
}

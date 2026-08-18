export type Material =
  | "vellum"
  | "oxide"
  | "glass"
  | "ink"
  | "mineral"
  | "ceramic"
  | "iron"
  | "obsidian";

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
  layerFills?: string[];
  layerOpacities?: number[];
  layerBlendModes?: string[];
  apertureFill?: string;
  apertureStroke?: string;
  apertureCoreFill?: string;
  apertureOffset?: [number, number];
  apertureSides?: number;
  noiseFrequency?: number;
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
  "sha256-radial-v3",
  "sha256-radial-v4",
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
    "sha256-radial-v3": generateSpecimenV3,
    "sha256-radial-v4": generateSpecimenV4,
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

export type Motif = "radial" | "star" | "spiral" | "cross" | "diamond" | "gear";

const motifTypes: Motif[] = [
  "radial",
  "star",
  "spiral",
  "cross",
  "diamond",
  "gear",
];

const v3Adjectives = [
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
  "Fractured",
  "Ember",
  "Gossamer",
  "Thorned",
  "Mossy",
  "Sunken",
  "Luminous",
  "Weathered",
  "Crystalline",
] as const;

const v3Forms = [
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
  "Monolith",
  "Spire",
  "Cairn",
  "Filament",
  "Drift",
  "Mantle",
  "Stratum",
  "Volute",
] as const;

const v3Materials: Material[] = [
  "vellum",
  "oxide",
  "glass",
  "ink",
  "mineral",
  "ceramic",
  "iron",
  "obsidian",
];

const v3Temperaments = [
  "resting",
  "watchful",
  "wandering",
  "resonant",
  "still",
  "opening",
  "fractured",
  "luminous",
  "submerged",
  "volatile",
];

const v3Palettes: Array<[string, string, string]> = [
  ...palettes,
  ["#4a3c2a", "#a07850", "#3d5c4a"],
  ["#5c2e3e", "#d4847a", "#e8c9a0"],
  ["#1e3a4a", "#4a8a7a", "#c4a850"],
  ["#3a2a5c", "#8a6aaa", "#d4a060"],
  ["#6b2c3a", "#e0a070", "#3a5a4a"],
  ["#2a3a5c", "#6ac4b0", "#e8c860"],
  ["#4c2a6b", "#a070c0", "#e0a85a"],
  ["#2c4a1c", "#7ab04a", "#c96645"],
];

function makeLayerV3(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
  motif: Motif,
): string {
  switch (motif) {
    case "star":
      return makeStarLayer(rng, symmetry, layer, totalLayers);
    case "spiral":
      return makeSpiralLayer(rng, symmetry, layer, totalLayers);
    case "cross":
      return makeCrossLayer(rng, symmetry, layer, totalLayers);
    case "diamond":
      return makeDiamondLayer(rng, symmetry, layer, totalLayers);
    case "gear":
      return makeGearLayer(rng, symmetry, layer, totalLayers);
    default:
      return makeRadialLayer(rng, symmetry, layer, totalLayers);
  }
}

function radialPoints(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const pointCount = symmetry * 4;
  const baseRadius = 118 - layer * (76 / Math.max(1, totalLayers - 1));
  const phase = rng.next() * ((Math.PI * 2) / symmetry);

  for (let index = 0; index < pointCount; index += 1) {
    const motifIndex = index % 4;
    const byte = rng.next() * 255;
    const pulse = motifIndex % 2 === 0 ? 1 : 0.58 + (byte / 255) * 0.22;
    const radius = baseRadius * pulse;
    const angle = -Math.PI / 2 + phase + (index / pointCount) * Math.PI * 2;
    points.push(polarPoint(angle, radius));
  }

  return points;
}

function makeRadialLayer(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): string {
  return smoothClosedPath(radialPoints(rng, symmetry, layer, totalLayers));
}

function starPoints(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const pointCount = symmetry * 4;
  const baseRadius = 118 - layer * (76 / Math.max(1, totalLayers - 1));
  const phase = rng.next() * ((Math.PI * 2) / symmetry);
  const innerRatio = 0.3 + rng.next() * 0.4;

  for (let index = 0; index < pointCount; index += 1) {
    const isOuter = index % 2 === 0;
    const radius = baseRadius * (isOuter ? 1 : innerRatio);
    const angle = -Math.PI / 2 + phase + (index / pointCount) * Math.PI * 2;
    points.push(polarPoint(angle, radius));
  }

  return points;
}

function makeStarLayer(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): string {
  return smoothClosedPath(starPoints(rng, symmetry, layer, totalLayers));
}

function spiralPoints(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const pointCount = symmetry * 6;
  const baseRadius = 118 - layer * (76 / Math.max(1, totalLayers - 1));
  const phase = rng.next() * ((Math.PI * 2) / symmetry);
  const turns = 1.5 + rng.next() * 2;

  for (let index = 0; index < pointCount; index += 1) {
    const t = index / pointCount;
    const radius = baseRadius * (0.3 + 0.7 * t);
    const angle = phase + t * Math.PI * 2 * turns;
    points.push(polarPoint(angle, radius));
  }

  return points;
}

function makeSpiralLayer(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): string {
  return smoothClosedPath(spiralPoints(rng, symmetry, layer, totalLayers));
}

function crossPoints(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const baseRadius = 118 - layer * (76 / Math.max(1, totalLayers - 1));
  const phase = rng.next() * ((Math.PI * 2) / symmetry);
  const armWidth = 0.15 + rng.next() * 0.2;
  const armLength = 0.7 + rng.next() * 0.25;

  for (let i = 0; i < symmetry; i++) {
    const angle = phase + (i / symmetry) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const perpAngle = angle + Math.PI / 2;
    const perpCos = Math.cos(perpAngle);
    const perpSin = Math.sin(perpAngle);

    points.push(polarPoint(angle, baseRadius * armLength));
    points.push([
      160 + cos * baseRadius * armLength + perpCos * baseRadius * armWidth,
      160 + sin * baseRadius * armLength + perpSin * baseRadius * armWidth,
    ]);
    points.push(polarPoint(angle, baseRadius * (1 - armLength)));
    points.push([
      160 +
        cos * baseRadius * (1 - armLength) +
        perpCos * baseRadius * armWidth,
      160 +
        sin * baseRadius * (1 - armLength) +
        perpSin * baseRadius * armWidth,
    ]);
  }

  return points;
}

function makeCrossLayer(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): string {
  return smoothClosedPath(crossPoints(rng, symmetry, layer, totalLayers));
}

function diamondPoints(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const baseRadius = 118 - layer * (76 / Math.max(1, totalLayers - 1));
  const phase = rng.next() * ((Math.PI * 2) / symmetry);
  const aspect = 0.5 + rng.next() * 0.4;

  for (let i = 0; i < symmetry * 2; i++) {
    const angle = phase + (i / (symmetry * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? baseRadius : baseRadius * aspect;
    points.push(polarPoint(angle, r));
  }

  return points;
}

function makeDiamondLayer(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): string {
  return smoothClosedPath(diamondPoints(rng, symmetry, layer, totalLayers));
}

function gearPoints(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const baseRadius = 118 - layer * (76 / Math.max(1, totalLayers - 1));
  const phase = rng.next() * ((Math.PI * 2) / symmetry);
  const teeth = 2 + Math.floor(rng.next() * 4);
  const toothHeight = 0.12 + rng.next() * 0.12;
  const toothWidth = 0.08 + rng.next() * 0.08;

  for (let i = 0; i < symmetry * teeth * 2; i++) {
    const t = i / (symmetry * teeth * 2);
    const angle = phase + t * Math.PI * 2;
    const toothPhase = (t * symmetry * teeth) % 1;
    const isTooth = toothPhase < toothWidth;
    const r = baseRadius * (isTooth ? 1 + toothHeight : 1 - toothHeight * 0.5);
    points.push(polarPoint(angle, r));
  }

  return points;
}

function makeGearLayer(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): string {
  return smoothClosedPath(gearPoints(rng, symmetry, layer, totalLayers));
}

export async function generateSpecimenV3(did: string): Promise<Specimen> {
  const normalized = did.trim();
  const bytes = await hashIdentity(normalized);
  const digest = hex(bytes);
  const rng = new Xorshift128(bytes);

  const symmetry = 3 + Math.floor(rng.next() * 11);
  const layers = 2 + Math.floor(rng.next() * 7);
  const aperture = 3 + Math.floor(rng.next() * 52);
  const material = v3Materials[Math.floor(rng.next() * v3Materials.length)];
  const palette = v3Palettes[Math.floor(rng.next() * v3Palettes.length)];
  const name = `${v3Adjectives[Math.floor(rng.next() * v3Adjectives.length)]} ${
    v3Forms[Math.floor(rng.next() * v3Forms.length)]
  }`;
  const catalogueNumber = `H-${digest.slice(0, 4).toUpperCase()}-${digest.slice(4, 8).toUpperCase()}`;

  const motifs: Motif[] = [];
  for (let i = 0; i < layers; i++) {
    motifs.push(motifTypes[Math.floor(rng.next() * motifTypes.length)]);
  }

  return {
    did: normalized,
    fingerprint: digest,
    catalogueNumber,
    name,
    symmetry,
    layers,
    aperture,
    material,
    temperament: v3Temperaments[Math.floor(rng.next() * v3Temperaments.length)],
    palette,
    paths: Array.from({ length: layers }, (_, index) =>
      makeLayerV3(rng, symmetry, index, layers, motifs[index]),
    ),
    rotation: rng.next() * 30 - 15,
    generatorVersion: "sha256-radial-v3",
  };
}

function hexToRgb(value: string): [number, number, number] {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function mixHex(
  value: string,
  target: [number, number, number],
  amount: number,
): string {
  const [r, g, b] = hexToRgb(value);
  return rgbToHex(
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount,
  );
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    const value =
      lightness - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

const paletteSchemes: Array<[number, number, number]> = [
  [0, 30, -140],
  [0, 180, 150],
  [0, 150, -150],
  [0, 120, -120],
];

function generateProceduralPalette(rng: Xorshift128): [string, string, string] {
  const baseHue = rng.next() * 360;
  const scheme = paletteSchemes[Math.floor(rng.next() * paletteSchemes.length)];
  return scheme.map((offset, index) => {
    const hue = (baseHue + offset + 360) % 360;
    const saturation = 0.28 + rng.next() * 0.3;
    const lightness =
      index === 1 ? 0.55 + rng.next() * 0.12 : 0.32 + rng.next() * 0.18;
    return hslToHex(hue, saturation, lightness);
  }) as [string, string, string];
}

function warpPoints(
  rng: Xorshift128,
  points: Array<[number, number]>,
  strength: number,
): Array<[number, number]> {
  return points.map(([x, y]) => {
    const dx = x - 160;
    const dy = y - 160;
    const radius = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const warpedRadius = radius * (1 + (rng.next() - 0.5) * strength);
    const warpedAngle = angle + (rng.next() - 0.5) * strength * 0.4;
    return polarPoint(warpedAngle, warpedRadius);
  });
}

function motifPoints(
  motif: Motif,
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
): Array<[number, number]> {
  switch (motif) {
    case "star":
      return starPoints(rng, symmetry, layer, totalLayers);
    case "spiral":
      return spiralPoints(rng, symmetry, layer, totalLayers);
    case "cross":
      return crossPoints(rng, symmetry, layer, totalLayers);
    case "diamond":
      return diamondPoints(rng, symmetry, layer, totalLayers);
    case "gear":
      return gearPoints(rng, symmetry, layer, totalLayers);
    default:
      return radialPoints(rng, symmetry, layer, totalLayers);
  }
}

function makeLayerV4(
  rng: Xorshift128,
  symmetry: number,
  layer: number,
  totalLayers: number,
  motif: Motif,
  warpStrength: number,
): string {
  const points = motifPoints(motif, rng, symmetry, layer, totalLayers);
  return smoothClosedPath(warpPoints(rng, points, warpStrength));
}

const v4Adjectives = [
  ...v3Adjectives,
  "Umber",
  "Brackish",
  "Feral",
  "Cindered",
  "Marbled",
  "Hushed",
  "Errant",
  "Sable",
] as const;

const v4Forms = [
  ...v3Forms,
  "Reliquary",
  "Cartouche",
  "Effigy",
  "Cistern",
  "Obelisk",
  "Trellis",
  "Diorama",
  "Armature",
] as const;

const v4Temperaments = [...v3Temperaments, "restless", "settling"];

const v4BlendModes = ["normal", "multiply", "soft-light", "overlay"];

export async function generateSpecimenV4(did: string): Promise<Specimen> {
  const normalized = did.trim();
  const bytes = await hashIdentity(normalized);
  const digest = hex(bytes);
  const rng = new Xorshift128(bytes);

  const symmetry = 3 + Math.floor(rng.next() * 12);
  const layers = 2 + Math.floor(rng.next() * 8);
  const aperture = 3 + Math.floor(rng.next() * 55);
  const material = v3Materials[Math.floor(rng.next() * v3Materials.length)];
  const palette = generateProceduralPalette(rng);
  const name = `${v4Adjectives[Math.floor(rng.next() * v4Adjectives.length)]} ${
    v4Forms[Math.floor(rng.next() * v4Forms.length)]
  }`;
  const catalogueNumber = `H-${digest.slice(0, 4).toUpperCase()}-${digest.slice(4, 8).toUpperCase()}`;

  const motifs: Motif[] = [];
  const layerSymmetries: number[] = [];
  for (let i = 0; i < layers; i++) {
    motifs.push(motifTypes[Math.floor(rng.next() * motifTypes.length)]);
    const jitter = Math.round((rng.next() - 0.5) * 4);
    layerSymmetries.push(Math.max(3, Math.min(16, symmetry + jitter)));
  }

  const warpStrength = 0.08 + rng.next() * 0.22;
  const paths = motifs.map((motif, index) =>
    makeLayerV4(
      rng,
      layerSymmetries[index],
      index,
      layers,
      motif,
      warpStrength,
    ),
  );

  const layerFills: string[] = [];
  const layerOpacities: number[] = [];
  const layerBlendModes: string[] = [];
  for (let i = 0; i < layers; i++) {
    layerFills.push(palette[Math.floor(rng.next() * 3)]);
    layerOpacities.push(
      i === 0 ? 0.94 + rng.next() * 0.05 : 0.55 + rng.next() * 0.35,
    );
    layerBlendModes.push(
      v4BlendModes[Math.floor(rng.next() * v4BlendModes.length)],
    );
  }

  const apertureColorRoll = Math.floor(rng.next() * 3);
  const apertureFill = mixHex(palette[apertureColorRoll], [10, 15, 13], 0.7);
  const apertureStroke = palette[(apertureColorRoll + 1) % 3];
  const apertureCoreFill = mixHex(
    palette[(apertureColorRoll + 2) % 3],
    [244, 237, 219],
    0.75,
  );
  const apertureOffsetMagnitude = rng.next() * aperture * 0.22;
  const apertureOffsetAngle = rng.next() * Math.PI * 2;
  const apertureOffset: [number, number] = [
    Math.cos(apertureOffsetAngle) * apertureOffsetMagnitude,
    Math.sin(apertureOffsetAngle) * apertureOffsetMagnitude,
  ];
  const apertureSides =
    rng.next() < 0.45 ? 3 + Math.floor(rng.next() * 6) : undefined;
  const noiseFrequency = 0.5 + rng.next() * 0.9;

  return {
    did: normalized,
    fingerprint: digest,
    catalogueNumber,
    name,
    symmetry,
    layers,
    aperture,
    material,
    temperament: v4Temperaments[Math.floor(rng.next() * v4Temperaments.length)],
    palette,
    paths,
    rotation: rng.next() * 36 - 18,
    generatorVersion: "sha256-radial-v4",
    layerFills,
    layerOpacities,
    layerBlendModes,
    apertureFill,
    apertureStroke,
    apertureCoreFill,
    apertureOffset,
    apertureSides,
    noiseFrequency,
  };
}

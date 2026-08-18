import type { Specimen } from "./shape";

/**
 * Presentation formulas shared by the on-screen Specimen renderer and the
 * standalone SVG export. Renditions before sha256-radial-v4 leave the new
 * hint fields unset, so every function here falls back to the original
 * fixed formulas and their output is unchanged.
 */

export function layerFill(
  specimen: Specimen,
  index: number,
  gradientId: string,
): string {
  if (index === 0) return `url(#${gradientId})`;
  return specimen.layerFills?.[index] ?? specimen.palette[(index + 1) % 3];
}

export function layerFillOpacity(specimen: Specimen, index: number): number {
  return (
    specimen.layerOpacities?.[index] ??
    (index === 0 ? 0.96 : 0.72 + index * 0.06)
  );
}

export function layerStroke(specimen: Specimen, index: number): string {
  const isOutermost = index === specimen.paths.length - 1;
  return isOutermost ? "#f4eddb" : specimen.palette[2];
}

export function layerStrokeOpacity(specimen: Specimen, index: number): number {
  const isOutermost = index === specimen.paths.length - 1;
  return isOutermost ? 0.8 : 0.38;
}

export function layerBlendMode(specimen: Specimen, index: number): string {
  return specimen.layerBlendModes?.[index] ?? "normal";
}

export function noiseFrequency(specimen: Specimen): number {
  return specimen.noiseFrequency ?? 0.8;
}

export function apertureFill(specimen: Specimen): string {
  return specimen.apertureFill ?? "#1c2925";
}

export function apertureStroke(specimen: Specimen): string {
  return specimen.apertureStroke ?? specimen.palette[1];
}

export function apertureCoreFill(specimen: Specimen): string {
  return specimen.apertureCoreFill ?? "#f2ead7";
}

export function apertureCenter(specimen: Specimen): [number, number] {
  const [dx, dy] = specimen.apertureOffset ?? [0, 0];
  return [160 + dx, 160 + dy];
}

export function aperturePolygonPoints(specimen: Specimen): string | undefined {
  const sides = specimen.apertureSides;
  if (!sides || sides < 3) return undefined;
  const [cx, cy] = apertureCenter(specimen);
  const r = specimen.aperture;
  const points: string[] = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = -Math.PI / 2 + (index / sides) * Math.PI * 2;
    points.push(
      `${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`,
    );
  }
  return points.join(" ");
}

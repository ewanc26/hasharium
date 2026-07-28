export const HASHARIUM_HOST = "hasharium.croft.click";
export const SOURCE_URL = "https://github.com/ewanc26/hasharium";
export const GENERATOR_VERSION = "sha256-radial-v1";
export const GENERATOR_VERSIONS = [
  "sha256-radial-v1",
  "sha256-radial-v2",
] as const;
export type GeneratorVersion = (typeof GENERATOR_VERSIONS)[number];
export const PLACEHOLDER_DID = "did:plc:ofrbh253gwicbkc5nktqepol";

/**
 * Builds an absolute production URL for a site path. Canonical and Open Graph
 * metadata must be absolute, and the prerendered static build has no request
 * origin available, so the canonical host is the only correct source.
 */
export function canonicalUrl(path = "/"): string {
  return new URL(path, `https://${HASHARIUM_HOST}`).href;
}

export const NSID = {
  collectionEntry: "click.croft.hasharium.collection.entry",
  exhibition: "click.croft.hasharium.exhibition",
  intersection: "click.croft.hasharium.intersection",
} as const;

export type HashariumNsid = (typeof NSID)[keyof typeof NSID];

export interface CollectionEntryRecord {
  $type: typeof NSID.collectionEntry;
  subject: string;
  createdAt: string;
  generatorVersion?: GeneratorVersion;
  note?: string;
}

export interface IntersectionRecord {
  $type: typeof NSID.intersection;
  with: string;
  createdAt: string;
  generatorVersion?: GeneratorVersion;
  note?: string;
}

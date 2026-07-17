export const HASHARIUM_HOST = "hasharium.croft.click";
export const SOURCE_URL = "https://github.com/ewanc26/hasharium";
export const GENERATOR_VERSION = "sha256-radial-v1";

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
  generatorVersion?: typeof GENERATOR_VERSION;
  note?: string;
}

export interface IntersectionRecord {
  $type: typeof NSID.intersection;
  with: string;
  createdAt: string;
  generatorVersion?: typeof GENERATOR_VERSION;
  note?: string;
}

import { HASHARIUM_HOST, PLACEHOLDER_DID } from "./protocol.js";
import { isDid } from "./shape.js";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export class OgInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OgInputError";
  }
}

export function parseOgDid(value: string | null): string {
  if (value === null || value.trim() === "") return PLACEHOLDER_DID;
  const did = value.trim();
  if (!isDid(did)) {
    throw new OgInputError("The did parameter must be a complete DID.");
  }
  return did;
}

export function ogImageUrl(did = PLACEHOLDER_DID): string {
  if (!isDid(did))
    throw new OgInputError("Cannot build an OG URL for an invalid DID.");
  const url = new URL(`https://${HASHARIUM_HOST}/api/og`);
  url.searchParams.set("did", did.trim());
  return url.href;
}

export function compactOgDid(did: string): string {
  if (did.length <= 64) return did;
  return `${did.slice(0, 39)}…${did.slice(-20)}`;
}

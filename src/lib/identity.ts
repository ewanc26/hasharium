import { isDid } from "./shape";
import { PLACEHOLDER_DID } from "./protocol";

const RESOLVER_ENDPOINT =
  "https://slingshot.microcosm.blue/xrpc/blue.microcosm.identity.resolveMiniDoc";
const MAX_RESPONSE_BYTES = 32_768;

export interface ResolvedIdentity {
  did: string;
  handle?: string;
}

export class IdentityResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityResolutionError";
  }
}

export function normalizeHandle(value: string): string {
  const trimmed = value.trim();
  return (trimmed.startsWith("@") ? trimmed.slice(1) : trimmed).toLowerCase();
}

export function isHandle(value: string): boolean {
  const handle = normalizeHandle(value);
  if (handle.length < 3 || handle.length > 253 || !handle.includes(".")) {
    return false;
  }

  const labels = handle.split(".");
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function resolveIdentity(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<ResolvedIdentity> {
  const identifier = value.trim();
  if (isDid(identifier)) return { did: identifier };
  if (!isHandle(identifier)) {
    throw new IdentityResolutionError(
      `Enter a complete DID or handle, such as ${PLACEHOLDER_DID}.`,
    );
  }

  const handle = normalizeHandle(identifier);
  const url = new URL(RESOLVER_ENDPOINT);
  url.searchParams.set("identifier", handle);

  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new IdentityResolutionError(
      "That handle could not be resolved right now. Check it and try again.",
    );
  }

  if (!response.ok) {
    throw new IdentityResolutionError(
      response.status === 404
        ? "No decentralised identity was found for that handle."
        : "That handle could not be resolved right now. Check it and try again.",
    );
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new IdentityResolutionError(
      "The identity resolver returned an invalid response.",
    );
  }

  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
    throw new IdentityResolutionError(
      "The identity resolver returned an invalid response.",
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new IdentityResolutionError(
      "The identity resolver returned an invalid response.",
    );
  }

  if (
    !isRecord(payload) ||
    typeof payload.did !== "string" ||
    !isDid(payload.did)
  ) {
    throw new IdentityResolutionError(
      "The identity resolver returned an invalid response.",
    );
  }

  return { did: payload.did, handle };
}

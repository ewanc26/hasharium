import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildLoopbackClientId,
  OAUTH_CLIENT_ID,
  OAUTH_REDIRECT_URI,
  OAUTH_REPOSITORY_SCOPES,
  OAUTH_SCOPE,
} from "./oauth-config";
import { NSID } from "./protocol";

describe("Hasharium OAuth configuration", () => {
  it("publishes exact production metadata for every Hasharium record type", () => {
    const metadata = JSON.parse(
      readFileSync("static/oauth-client-metadata.json", "utf8"),
    );
    expect(metadata.client_id).toBe(OAUTH_CLIENT_ID);
    expect(metadata.redirect_uris).toEqual([OAUTH_REDIRECT_URI]);
    expect(metadata.scope).toBe(OAUTH_SCOPE);
    expect(OAUTH_REPOSITORY_SCOPES).toEqual(
      Object.values(NSID).map((nsid) => `repo:${nsid}`),
    );
    expect(new Set(metadata.scope.split(" "))).toEqual(
      new Set([
        "atproto",
        ...Object.values(NSID).map((nsid) => `repo:${nsid}`),
      ]),
    );
    expect(metadata.token_endpoint_auth_method).toBe("none");
    expect(metadata.dpop_bound_access_tokens).toBe(true);
    expect(metadata.application_type).toBe("web");
  });

  it("uses the OAuth loopback client convention during development", () => {
    const clientId = new URL(buildLoopbackClientId("5173"));
    expect(clientId.origin).toBe("http://localhost");
    expect(clientId.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:5173/profile",
    );
    expect(clientId.searchParams.get("scope")).toBe(OAUTH_SCOPE);
  });
});

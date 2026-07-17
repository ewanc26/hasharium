import { HASHARIUM_HOST, NSID } from "./protocol";

export const OAUTH_REPOSITORY_SCOPES = Object.values(NSID).map(
  (nsid) => `repo:${nsid}`,
);
export const OAUTH_SCOPE = ["atproto", ...OAUTH_REPOSITORY_SCOPES].join(" ");
export const OAUTH_CLIENT_ID = `https://${HASHARIUM_HOST}/oauth-client-metadata.json`;
export const OAUTH_REDIRECT_URI = `https://${HASHARIUM_HOST}/profile`;
export const OAUTH_HANDLE_RESOLVER = "https://slingshot.microcosm.blue";

export function buildLoopbackClientId(port: string): string {
  const redirectUri = `http://127.0.0.1:${port}/profile`;
  return `http://localhost?${new URLSearchParams([
    ["redirect_uri", redirectUri],
    ["scope", OAUTH_SCOPE],
  ])}`;
}

import { browser, dev } from "$app/environment";
import type { Agent } from "@atproto/api";
import type {
  BrowserOAuthClient,
  OAuthSession,
} from "@atproto/oauth-client-browser";
import { get, writable } from "svelte/store";
import { isHandle } from "./identity";
import {
  buildLoopbackClientId,
  OAUTH_CLIENT_ID,
  OAUTH_HANDLE_RESOLVER,
  OAUTH_SCOPE,
} from "./oauth-config";
import { isDid } from "./shape";

export type AuthState =
  | { status: "idle" | "loading" | "signed-out" | "authorizing" }
  | { status: "signed-in"; did: string; agent: Agent; session: OAuthSession }
  | { status: "error"; message: string };

export const authState = writable<AuthState>({ status: "idle" });

let clientPromise: Promise<BrowserOAuthClient> | undefined;
let initialization: Promise<AuthState> | undefined;

function currentClientId(): string {
  if (!dev) return OAUTH_CLIENT_ID;
  return buildLoopbackClientId(window.location.port || "5173");
}

async function getClient(): Promise<BrowserOAuthClient> {
  if (!browser) throw new Error("OAuth is only available in a browser.");
  clientPromise ??= import("@atproto/oauth-client-browser").then(
    ({ BrowserOAuthClient }) =>
      BrowserOAuthClient.load({
        clientId: currentClientId(),
        handleResolver: OAUTH_HANDLE_RESOLVER,
        onDelete: (did) => {
          const current = get(authState);
          if (current.status === "signed-in" && current.did === did) {
            authState.set({ status: "signed-out" });
          }
        },
      }),
  );
  return clientPromise;
}

function messageFrom(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

export async function initializeOAuth(): Promise<AuthState> {
  if (!browser) return { status: "idle" };
  initialization ??= (async () => {
    authState.set({ status: "loading" });
    try {
      const client = await getClient();
      const result = await client.init();
      if (!result) {
        const state = { status: "signed-out" } as const;
        authState.set(state);
        return state;
      }

      const { Agent } = await import("@atproto/api");
      const state = {
        status: "signed-in",
        did: result.session.sub,
        agent: new Agent(result.session),
        session: result.session,
      } as const;
      authState.set(state);
      return state;
    } catch (reason) {
      const state = {
        status: "error",
        message: messageFrom(
          reason,
          "The OAuth session could not be restored.",
        ),
      } as const;
      authState.set(state);
      return state;
    }
  })();
  return initialization;
}

export async function signInWithOAuth(identifier: string): Promise<never> {
  const normalized = identifier.trim();
  if (!isDid(normalized) && !isHandle(normalized)) {
    throw new Error("Enter a complete DID or AT Protocol handle.");
  }

  authState.set({ status: "authorizing" });
  try {
    const client = await getClient();
    await client.signIn(normalized, {
      scope: OAUTH_SCOPE,
      state: "hasharium-profile",
    });
    throw new Error("The authorization redirect did not occur.");
  } catch (reason) {
    const message = messageFrom(
      reason,
      "The authorization request could not be started.",
    );
    authState.set({ status: "error", message });
    throw new Error(message, { cause: reason });
  }
}

export async function signOutOfOAuth(): Promise<void> {
  const current = get(authState);
  if (current.status !== "signed-in") {
    authState.set({ status: "signed-out" });
    return;
  }

  try {
    const client = await getClient();
    await client.revoke(current.did);
  } finally {
    authState.set({ status: "signed-out" });
  }
}

export function dismissOAuthError(): void {
  if (get(authState).status === "error") {
    initialization = undefined;
    authState.set({ status: "signed-out" });
  }
}

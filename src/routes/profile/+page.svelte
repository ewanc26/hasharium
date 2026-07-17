<script lang="ts">
  import type { Agent } from '@atproto/api';
  import { onMount } from 'svelte';
  import Masthead from '$lib/components/Masthead.svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import SpecimenView from '$lib/components/Specimen.svelte';
  import {
    createCollectionEntry,
    deleteCollectionEntry,
    listCollectionEntries,
    type CollectionEntry
  } from '$lib/collection';
  import { resolveIdentity, resolveIdentityProfile, type IdentityProfile } from '$lib/identity';
  import {
    authState,
    dismissOAuthError,
    initializeOAuth,
    signInWithOAuth,
    signOutOfOAuth
  } from '$lib/oauth';
  import { NSID, PLACEHOLDER_DID } from '$lib/protocol';
  import { generateSpecimen, type Specimen } from '$lib/shape';

  interface CabinetEntry {
    entry: CollectionEntry;
    specimen: Specimen;
  }

  let loginIdentifier = $state(PLACEHOLDER_DID);
  let collectIdentifier = $state(PLACEHOLDER_DID);
  let fieldNote = $state('');
  let identity = $state<IdentityProfile | null>(null);
  let profileSpecimen = $state<Specimen | null>(null);
  let cabinet = $state<CabinetEntry[]>([]);
  let profileLoading = $state(false);
  let actionLoading = $state(false);
  let message = $state('');
  let error = $state('');
  let loadedDid = $state('');
  let pendingDeleteUri = $state('');
  let loadRequest = 0;

  onMount(() => {
    void initializeOAuth();
  });

  $effect(() => {
    const current = $authState;
    if (current.status === 'signed-in' && current.did !== loadedDid) {
      loadedDid = current.did;
      void loadProfile(current.did, current.agent);
    } else if (current.status === 'signed-out') {
      loadedDid = '';
      identity = null;
      profileSpecimen = null;
      cabinet = [];
    }
  });

  async function loadProfile(did: string, agent: Agent) {
    const request = ++loadRequest;
    profileLoading = true;
    error = '';
    try {
      const [nextIdentity, ownSpecimen, entries] = await Promise.all([
        resolveIdentityProfile(did).catch(() => ({ did })),
        generateSpecimen(did),
        listCollectionEntries(agent)
      ]);
      const nextCabinet = await Promise.all(
        entries.map(async (entry) => ({
          entry,
          specimen: await generateSpecimen(entry.record.subject)
        }))
      );
      if (request === loadRequest) {
        identity = nextIdentity;
        profileSpecimen = ownSpecimen;
        cabinet = nextCabinet;
      }
    } catch (reason) {
      if (request === loadRequest) {
        error = reason instanceof Error ? reason.message : 'The profile could not be loaded.';
      }
    } finally {
      if (request === loadRequest) profileLoading = false;
    }
  }

  async function beginSignIn(event: SubmitEvent) {
    event.preventDefault();
    error = '';
    dismissOAuthError();
    try {
      await signInWithOAuth(loginIdentifier);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Authorization could not begin.';
    }
  }

  async function signOut() {
    error = '';
    actionLoading = true;
    try {
      await signOutOfOAuth();
      message = 'Signed out. The local study tray remains in this browser.';
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Sign-out could not be completed.';
    } finally {
      actionLoading = false;
    }
  }

  async function collectSpecimen(event: SubmitEvent) {
    event.preventDefault();
    const current = $authState;
    if (current.status !== 'signed-in') return;
    actionLoading = true;
    error = '';
    message = '';
    try {
      const resolved = await resolveIdentity(collectIdentifier);
      if (cabinet.some(({ entry }) => entry.record.subject === resolved.did)) {
        throw new Error('That specimen is already present in this profile cabinet.');
      }
      const entry = await createCollectionEntry(current.agent, resolved.did, fieldNote);
      cabinet = [{ entry, specimen: await generateSpecimen(resolved.did) }, ...cabinet];
      collectIdentifier = resolved.did;
      fieldNote = '';
      message = `Collected ${resolved.did}. The PDS confirmed the record.`;
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'The specimen could not be collected.';
    } finally {
      actionLoading = false;
    }
  }

  async function removeEntry(item: CabinetEntry) {
    if (pendingDeleteUri !== item.entry.uri) {
      pendingDeleteUri = item.entry.uri;
      return;
    }
    const current = $authState;
    if (current.status !== 'signed-in') return;
    actionLoading = true;
    error = '';
    try {
      await deleteCollectionEntry(current.agent, item.entry);
      cabinet = cabinet.filter(({ entry }) => entry.uri !== item.entry.uri);
      pendingDeleteUri = '';
      message = `Removed ${item.entry.record.subject} from the PDS cabinet.`;
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'The record could not be removed.';
    } finally {
      actionLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Your profile — Hasharium</title>
  <meta
    name="description"
    content="Sign in with an AT Protocol identity and keep a portable Hasharium specimen cabinet in your PDS."
  />
  <meta property="og:title" content="Your curator profile — Hasharium" />
  <meta
    property="og:description"
    content="Keep a portable cabinet of deterministic identity specimens in your AT Protocol repository."
  />
  <meta name="twitter:title" content="Your curator profile — Hasharium" />
  <meta
    name="twitter:description"
    content="Keep a portable cabinet of deterministic identity specimens in your AT Protocol repository."
  />
</svelte:head>

<div class="site-shell">
  <Masthead />
  <main class="profile-page" id="main-content" tabindex="-1">
    <header class="profile-header">
      <p class="eyebrow"><span></span> Curator profile / PDS cabinet</p>
      <h1>Your field<br /><em>record.</em></h1>
      <p>
        Sign in with the identity you already own. Hasharium requests access only to its three namespaced record types; your OAuth session stays in this browser.
      </p>
    </header>

    {#if $authState.status === 'idle' || $authState.status === 'loading'}
      <section class="profile-state" aria-live="polite">
        <span class="state-index">AUTH / 00</span>
        <h2>Checking the specimen ledger…</h2>
        <p>Restoring a local OAuth session if one exists.</p>
      </section>
    {:else if $authState.status === 'signed-out' || $authState.status === 'authorizing' || $authState.status === 'error'}
      <section class="sign-in-panel" aria-labelledby="sign-in-title">
        <div class="panel-heading">
          <span>AUTH / 01</span>
          <span>PUBLIC CLIENT · DPOP · PKCE</span>
        </div>
        <div class="sign-in-grid">
          <div>
            <h2 id="sign-in-title">Open your cabinet</h2>
            <p>
              Your PDS will show the requested permissions before approving them. Hasharium never asks for an app password or access outside <code>click.croft.hasharium.*</code>.
            </p>
          </div>
          <form class="oauth-form" onsubmit={beginSignIn} novalidate>
            <label for="oauth-identifier">DID or AT Protocol handle</label>
            <input
              id="oauth-identifier"
              bind:value={loginIdentifier}
              placeholder={PLACEHOLDER_DID}
              maxlength="2048"
              autocomplete="username"
              spellcheck="false"
            />
            <button type="submit" disabled={$authState.status === 'authorizing'}>
              {$authState.status === 'authorizing' ? 'Opening authorization…' : 'Continue to your PDS'}
            </button>
            <small>
              Handle resolution uses Microcosm Slingshot. OAuth credentials are managed by the official AT Protocol browser client in IndexedDB.
            </small>
          </form>
        </div>
      </section>
    {:else if $authState.status === 'signed-in'}
      <section class="identity-panel" aria-labelledby="identity-title">
        <div class="identity-plate" class:loading={profileLoading}>
          {#if profileSpecimen}
            <SpecimenView specimen={profileSpecimen} />
          {/if}
        </div>
        <div class="identity-copy">
          <div class="panel-heading">
            <span>CURATOR / SELF</span>
            <span>SESSION ACTIVE</span>
          </div>
          <p class="profile-kicker">{identity?.handle ? `@${identity.handle}` : 'AT Protocol identity'}</p>
          <h2 id="identity-title">{profileSpecimen?.name ?? 'Loading specimen…'}</h2>
          <code>{identity?.did ?? $authState.did}</code>
          <dl>
            <div><dt>Repository</dt><dd>{identity?.pds ? new URL(identity.pds).hostname : 'Resolved by DID'}</dd></div>
            <div><dt>Collection</dt><dd>{cabinet.length} {cabinet.length === 1 ? 'specimen' : 'specimens'}</dd></div>
            <div><dt>Storage</dt><dd>Your PDS</dd></div>
          </dl>
          <button class="text-action" type="button" onclick={signOut} disabled={actionLoading}>Sign out of Hasharium</button>
        </div>
      </section>

      <section class="collect-panel" aria-labelledby="collect-title">
        <div>
          <p class="eyebrow"><span></span> Add observation</p>
          <h2 id="collect-title">Collect a specimen</h2>
          <p>Resolve an identity, derive its form locally, then publish one collection record to your repository.</p>
        </div>
        <form class="collect-form" onsubmit={collectSpecimen} novalidate>
          <label for="collect-identifier">Specimen DID or handle</label>
          <input
            id="collect-identifier"
            bind:value={collectIdentifier}
            placeholder={PLACEHOLDER_DID}
            maxlength="2048"
            spellcheck="false"
          />
          <label for="field-note">Public field note <span>optional</span></label>
          <textarea
            id="field-note"
            bind:value={fieldNote}
            maxlength="1000"
            rows="3"
            placeholder="A short curatorial note…"
          ></textarea>
          <div class="form-foot">
            <small>Notes are public repository data · maximum 280 characters / 1,000 bytes.</small>
            <button type="submit" disabled={actionLoading}>{actionLoading ? 'Working…' : 'Collect in PDS'}</button>
          </div>
        </form>
      </section>

      <section class="profile-cabinet" aria-labelledby="profile-cabinet-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow"><span></span> Repository records</p>
            <h2 id="profile-cabinet-title">Your cabinet</h2>
          </div>
          <p>
            Read from <code>{NSID.collectionEntry}</code>. Removal requires a second confirmation and succeeds only after your PDS confirms it.
          </p>
        </div>

        {#if profileLoading}
          <div class="cabinet-empty">Reading collection records from your PDS…</div>
        {:else if cabinet.length}
          <div class="profile-grid">
            {#each cabinet as item}
              <article class="profile-card">
                <div class="profile-card-specimen"><SpecimenView specimen={item.specimen} compact animate={false} /></div>
                <div class="profile-card-copy">
                  <span>{item.specimen.catalogueNumber}</span>
                  <h3>{item.specimen.name}</h3>
                  <code>{item.entry.record.subject}</code>
                  {#if item.entry.record.note}<p>{item.entry.record.note}</p>{/if}
                  <div class="record-meta">
                    <time datetime={item.entry.record.createdAt}>{new Date(item.entry.record.createdAt).toLocaleDateString()}</time>
                    <button
                      class:confirm={pendingDeleteUri === item.entry.uri}
                      type="button"
                      disabled={actionLoading}
                      onclick={() => void removeEntry(item)}
                    >
                      {pendingDeleteUri === item.entry.uri ? 'Confirm removal' : 'Remove'}
                    </button>
                  </div>
                </div>
              </article>
            {/each}
          </div>
        {:else}
          <div class="cabinet-empty">
            <strong>No PDS specimens yet.</strong>
            <span>Use the collection form above to make the first confirmed record.</span>
          </div>
        {/if}
      </section>
    {/if}

    {#if error || $authState.status === 'error'}
      <p class="profile-message error" role="alert">{error || ($authState.status === 'error' ? $authState.message : '')}</p>
    {:else if message}
      <p class="profile-message" role="status">{message}</p>
    {/if}
  </main>
  <SiteFooter />
</div>

<style>
  .profile-page {
    width: min(100% - 64px, var(--shell-wide));
    margin: 0 auto;
    padding: var(--space-xl) 0 var(--space-2xl);
  }

  .profile-header {
    max-width: 760px;
    margin-bottom: var(--space-xl);
  }

  .profile-header h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(64px, 8vw, 112px);
    font-weight: 400;
    letter-spacing: -0.055em;
    line-height: 0.82;
  }

  .profile-header h1 em {
    color: var(--red);
    font-weight: 400;
  }

  .profile-header > p:last-child {
    max-width: 62ch;
    margin: var(--space-lg) 0 0;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.7;
  }

  .profile-state,
  .sign-in-panel,
  .identity-panel,
  .collect-panel {
    padding: var(--space-xs);
    background: var(--surface-raised);
    border: 1px solid var(--line);
  }

  .profile-state {
    padding: var(--space-xl);
  }

  .profile-state h2 {
    margin: var(--space-sm) 0;
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 400;
  }

  .state-index,
  .panel-heading {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .panel-heading {
    display: flex;
    justify-content: space-between;
    padding: var(--space-3) var(--space-md);
    border-bottom: 1px solid var(--line);
  }

  .sign-in-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(360px, 1.2fr);
    gap: var(--space-xl);
    padding: var(--space-lg);
    background: var(--surface-sunken);
  }

  .sign-in-grid h2,
  .collect-panel h2 {
    margin: 0 0 var(--space-md);
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 5vw, 4.5rem);
    font-weight: 400;
    letter-spacing: -0.05em;
    line-height: 0.95;
  }

  .sign-in-grid p,
  .collect-panel > div > p:last-child {
    max-width: 50ch;
    color: var(--muted);
    line-height: 1.65;
  }

  .oauth-form,
  .collect-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  label span {
    color: var(--muted);
  }

  input,
  textarea {
    width: 100%;
    color: var(--ink);
    background: var(--paper-light);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-xs);
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }

  input {
    min-height: var(--control-size);
    padding: 0 var(--space-md);
  }

  textarea {
    padding: var(--space-3) var(--space-md);
    line-height: 1.5;
    resize: vertical;
  }

  .oauth-form button,
  .collect-form button {
    min-height: var(--control-size);
    padding: 0 var(--space-md);
    color: var(--paper-light);
    background: var(--green);
    border: 1px solid var(--green);
    border-radius: var(--radius-xs);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .oauth-form small,
  .form-foot small {
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.55;
  }

  .identity-panel {
    display: grid;
    grid-template-columns: minmax(320px, 0.8fr) minmax(0, 1.2fr);
    margin-bottom: var(--space-xl);
  }

  .identity-plate {
    display: grid;
    aspect-ratio: 1;
    place-items: center;
    padding: 12%;
    background: var(--plate);
    border-right: 1px solid var(--line);
  }

  .identity-plate.loading {
    opacity: 0.7;
  }

  .identity-copy {
    padding: var(--space-lg);
    background: var(--surface-sunken);
  }

  .identity-copy .panel-heading {
    margin: calc(-1 * var(--space-lg)) calc(-1 * var(--space-lg)) var(--space-xl);
  }

  .profile-kicker {
    margin: 0 0 var(--space-sm);
    color: var(--red);
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }

  .identity-copy h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(2.8rem, 5vw, 5.5rem);
    font-weight: 400;
    letter-spacing: -0.05em;
    line-height: 0.95;
  }

  .identity-copy > code {
    display: block;
    margin-top: var(--space-md);
    overflow-wrap: anywhere;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }

  .identity-copy dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: var(--space-xl) 0 var(--space-lg);
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .identity-copy dl div {
    padding: var(--space-md);
    border-left: 1px solid var(--line);
  }

  .identity-copy dl div:first-child {
    border-left: 0;
  }

  dt {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  dd {
    margin: var(--space-xs) 0 0;
    font-family: var(--font-display);
    font-size: 1rem;
  }

  .text-action {
    min-height: var(--control-size);
    padding: 0;
    color: var(--muted);
    background: transparent;
    border: 0;
    border-bottom: 1px solid currentcolor;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .collect-panel {
    display: grid;
    grid-template-columns: minmax(0, 0.75fr) minmax(360px, 1.25fr);
    gap: var(--space-xl);
    margin-bottom: var(--space-2xl);
    padding: var(--space-lg);
    background: var(--surface-sunken);
  }

  .collect-panel .eyebrow {
    margin-bottom: var(--space-md);
  }

  .form-foot {
    display: flex;
    gap: var(--space-md);
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-sm);
  }

  .form-foot button {
    flex: 0 0 auto;
  }

  .profile-cabinet {
    margin-top: var(--space-xl);
  }

  .profile-cabinet .section-heading {
    margin-bottom: var(--space-lg);
  }

  .profile-cabinet .section-heading code {
    font-family: var(--font-mono);
    font-size: 0.72em;
  }

  .profile-grid {
    display: grid;
    gap: 2px;
    padding: var(--space-xs);
    background: var(--surface-raised);
    border: 1px solid var(--line);
  }

  .profile-card {
    display: grid;
    grid-template-columns: 180px 1fr;
    min-width: 0;
    background: var(--surface-sunken);
  }

  .profile-card-specimen {
    aspect-ratio: 1;
    padding: var(--space-md);
    background: var(--plate);
    border-right: 1px solid var(--line);
  }

  .profile-card-copy {
    display: flex;
    min-width: 0;
    padding: var(--space-lg);
    flex-direction: column;
  }

  .profile-card-copy > span {
    color: var(--red);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0.1em;
  }

  .profile-card h3 {
    margin: var(--space-xs) 0;
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 400;
  }

  .profile-card code {
    overflow: hidden;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-card p {
    margin: var(--space-md) 0;
    color: var(--muted);
    line-height: 1.6;
  }

  .record-meta {
    display: flex;
    justify-content: space-between;
    align-items: end;
    margin-top: auto;
    padding-top: var(--space-md);
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.65rem;
  }

  .record-meta button {
    min-height: var(--control-size);
    padding: 0;
    color: var(--muted);
    background: transparent;
    border: 0;
    border-bottom: 1px solid currentcolor;
    font-family: inherit;
    font-size: inherit;
    text-transform: uppercase;
  }

  .record-meta button.confirm {
    color: var(--red);
  }

  .cabinet-empty {
    display: grid;
    min-height: 240px;
    place-content: center;
    gap: var(--space-sm);
    padding: var(--space-lg);
    color: var(--muted);
    text-align: center;
    background: var(--surface-sunken);
    border: 1px dashed var(--line-strong);
  }

  .cabinet-empty strong {
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 400;
  }

  .profile-message {
    position: fixed;
    right: var(--space-lg);
    bottom: var(--space-lg);
    z-index: 30;
    max-width: min(420px, calc(100vw - 32px));
    margin: 0;
    padding: var(--space-md);
    color: var(--paper-light);
    background: var(--green);
    border: 1px solid rgb(255 255 255 / 0.2);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1.5;
  }

  .profile-message.error {
    background: var(--red-dark);
  }

  @media (max-width: 800px) {
    .profile-page {
      width: calc(100% - 32px);
      padding-top: var(--space-12);
    }

    .sign-in-grid,
    .identity-panel,
    .collect-panel {
      grid-template-columns: 1fr;
    }

    .identity-plate {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
  }

  @media (max-width: 560px) {
    .profile-header h1 {
      font-size: clamp(58px, 19vw, 82px);
    }

    .sign-in-grid,
    .identity-copy,
    .collect-panel {
      padding: var(--space-md);
    }

    .identity-copy .panel-heading {
      margin: calc(-1 * var(--space-md)) calc(-1 * var(--space-md)) var(--space-lg);
    }

    .identity-copy dl {
      grid-template-columns: 1fr;
    }

    .identity-copy dl div,
    .identity-copy dl div:first-child {
      border-top: 1px solid var(--line);
      border-left: 0;
    }

    .identity-copy dl div:first-child {
      border-top: 0;
    }

    .form-foot {
      align-items: stretch;
      flex-direction: column;
    }

    .profile-card {
      grid-template-columns: 1fr;
    }

    .profile-card-specimen {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
  }
</style>

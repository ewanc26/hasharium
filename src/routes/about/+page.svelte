<script lang="ts">
  import Masthead from '$lib/components/Masthead.svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import { NSID, SOURCE_URL } from '$lib/protocol';
</script>

<svelte:head>
  <title>About, privacy and terms — Hasharium</title>
  <meta
    name="description"
    content="How Hasharium derives identity specimens, handles OAuth sessions, and stores collection records."
  />
</svelte:head>

<div class="site-shell">
  <Masthead />
  <main class="policy-page" id="main-content" tabindex="-1">
    <header>
      <p class="eyebrow"><span></span> Field notes / operating terms</p>
      <h1>About<br /><em>Hasharium.</em></h1>
      <p>
        Hasharium is an independent, open-source study of deterministic forms derived from decentralised identifiers. Nothing is minted, made scarce, or centrally assigned.
      </p>
    </header>

    <div class="policy-index">
      <section>
        <span>01 / METHOD</span>
        <h2>What the site calculates</h2>
        <p>
          Direct DIDs are hashed locally with SHA-256. Handles are sent to Microcosm Slingshot for resolution to a canonical DID before hashing. Specimen geometry is reproducible for the same DID and generator version.
        </p>
      </section>
      <section>
        <span>02 / OAUTH</span>
        <h2>How sign-in works</h2>
        <p>
          Hasharium uses the official AT Protocol browser OAuth client with PKCE and DPoP. It never asks for an app password. OAuth session material is retained by that client in this browser’s IndexedDB and is removed or revoked when you sign out.
        </p>
      </section>
      <section>
        <span>03 / PERMISSION</span>
        <h2>What permission is requested</h2>
        <p>
          The application asks for granular repository access to <code>{NSID.collectionEntry}</code>, <code>{NSID.intersection}</code>, and <code>{NSID.exhibition}</code>. It does not grant access to record types outside Hasharium, private account data, blobs, email, or account management.
        </p>
      </section>
      <section>
        <span>04 / PUBLIC DATA</span>
        <h2>What a profile publishes</h2>
        <p>
          A collected specimen is a public record in your PDS containing its subject DID, creation time, generator version, and an optional public field note. Repository records are public by design. Do not put private information in notes.
        </p>
      </section>
      <section>
        <span>05 / LOCAL DATA</span>
        <h2>What stays on the device</h2>
        <p>
          Signed-out study-tray entries are stored in localStorage. Hasharium has no analytics and does not transmit the local tray. Clearing site data removes local tray and OAuth storage from this browser but does not delete confirmed PDS records.
        </p>
      </section>
      <section>
        <span>06 / TERMS</span>
        <h2>Use and availability</h2>
        <p>
          The service is provided without warranty under the GNU AGPL v3. Network identity services and PDSes can be unavailable or return incomplete data. Generated names and traits are playful morphology, not claims about a person’s character, health, value, or reputation.
        </p>
      </section>
    </div>

    <aside>
      <span>SOURCE / LICENCE</span>
      <p>Read, audit, modify, and self-host the complete application.</p>
      <a href={SOURCE_URL}>Open the AGPL-3.0 source ↗</a>
    </aside>
  </main>
  <SiteFooter />
</div>

<style>
  .policy-page {
    width: min(100% - 64px, var(--shell-narrow));
    margin: 0 auto;
    padding: var(--space-xl) 0 var(--space-2xl);
  }

  header {
    max-width: 760px;
    margin-bottom: var(--space-xl);
  }

  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(64px, 9vw, 112px);
    font-weight: 400;
    letter-spacing: -0.055em;
    line-height: 0.82;
  }

  h1 em {
    color: var(--red);
    font-weight: 400;
  }

  header > p:last-child {
    max-width: 65ch;
    margin: var(--space-lg) 0 0;
    color: var(--muted);
    line-height: 1.75;
  }

  .policy-index {
    display: flex;
    gap: 2px;
    padding: var(--space-xs);
    flex-direction: column;
    background: var(--surface-raised);
    border: 1px solid var(--line);
  }

  section {
    display: grid;
    grid-template-columns: 140px minmax(180px, 0.65fr) minmax(0, 1.35fr);
    gap: var(--space-lg);
    padding: var(--space-lg);
    background: var(--surface-sunken);
  }

  section > span,
  aside > span {
    color: var(--red);
    font-family: var(--font-mono);
    font-size: 0.64rem;
    letter-spacing: 0.1em;
  }

  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.65rem;
    font-weight: 400;
    line-height: 1.1;
  }

  section p {
    margin: 0;
    color: var(--muted);
    line-height: 1.7;
  }

  code {
    overflow-wrap: anywhere;
    font-family: var(--font-mono);
    font-size: 0.78em;
  }

  aside {
    display: grid;
    grid-template-columns: 140px 1fr auto;
    gap: var(--space-lg);
    align-items: center;
    margin-top: var(--space-lg);
    padding: var(--space-lg);
    color: var(--paper-light);
    background: var(--green);
  }

  aside p {
    margin: 0;
  }

  aside a {
    min-height: var(--control-size);
    display: inline-flex;
    align-items: center;
    border-bottom: 1px solid currentcolor;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  @media (max-width: 760px) {
    .policy-page {
      width: calc(100% - 32px);
      padding-top: var(--space-12);
    }

    section,
    aside {
      grid-template-columns: 1fr;
      gap: var(--space-md);
    }
  }
</style>

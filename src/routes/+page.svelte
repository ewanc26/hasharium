<script lang="ts">
  import type { Agent } from '@atproto/api';
  import { onMount } from 'svelte';
  import Masthead from '$lib/components/Masthead.svelte';
  import CollectorRegister from '$lib/components/CollectorRegister.svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import SpecimenView from '$lib/components/Specimen.svelte';
  import {
    createCollectionEntry,
    deleteCollectionEntry,
    listCollectionEntries,
    type CollectionEntry
  } from '$lib/collection';
  import { exportSpecimenSvg, specimenExportFilename } from '$lib/export';
  import { IdentityResolutionError, resolveIdentity } from '$lib/identity';
  import { authState } from '$lib/oauth';
  import { GENERATOR_VERSIONS, NSID, PLACEHOLDER_DID } from '$lib/protocol';
  import {
    generateSpecimenForVersion,
    isDid,
    isGeneratorVersion,
    type GeneratorVersion,
    type Specimen
  } from '$lib/shape';

  const defaultDid = PLACEHOLDER_DID;
  const exampleDids = [
    'did:plc:ar7c4by46qjdydhdevvrndac',
    'did:plc:z72i7hdynmk6r22z27h6tvur',
    'did:web:hasharium.croft.click',
    'did:key:z6MkjchhfUsD6F6Qt4',
    'did:example:patient-archive',
    'did:example:field-observer'
  ];

  let input = $state(defaultDid);
  let specimen = $state<Specimen | null>(null);
  let examples = $state<Specimen[]>([]);
  let savedDids = $state<string[]>([]);
  let savedSpecimens = $state<Specimen[]>([]);
  let error = $state('');
  let loading = $state(true);
  let cabinetOpen = $state(false);
  let resolvedHandle = $state('');
  let remoteEntries = $state<CollectionEntry[]>([]);
  let remoteLoadedDid = $state('');
  let collectionLoading = $state(false);
  let collectionMessage = $state('');
  let pendingRemoteRemovalDid = $state('');
  let renderRequest = 0;
  let generatorVersion = $state<GeneratorVersion>('sha256-radial-v1');
  let remoteEntry = $derived(
    specimen ? remoteEntries.find((entry) => entry.record.subject === specimen?.did) : undefined
  );
  let isSaved = $derived(
    specimen
      ? $authState.status === 'signed-in'
        ? Boolean(remoteEntry)
        : savedDids.includes(specimen.did)
      : false
  );

  $effect(() => {
    const current = $authState;
    if (current.status === 'signed-in' && current.did !== remoteLoadedDid) {
      remoteLoadedDid = current.did;
      void hydrateRemoteCollection(current.agent);
    } else if (current.status === 'signed-out') {
      remoteLoadedDid = '';
      remoteEntries = [];
    }
  });

  async function hydrateSaved(dids: string[]) {
    savedSpecimens = await Promise.all(
      dids.map((did) => generateSpecimenForVersion(did, generatorVersion))
    );
  }

  async function hydrateRemoteCollection(agent: Agent) {
    collectionLoading = true;
    collectionMessage = '';
    try {
      remoteEntries = await listCollectionEntries(agent);
    } catch (reason) {
      collectionMessage = reason instanceof Error ? reason.message : 'The PDS collection could not be read.';
    } finally {
      collectionLoading = false;
    }
  }

  async function initialize() {
    const sharedVersion = new URL(window.location.href).searchParams.get('version');
    if (isGeneratorVersion(sharedVersion)) generatorVersion = sharedVersion;
    const sharedDid = new URL(window.location.href).searchParams.get('did');
    const initialDid = sharedDid && isDid(sharedDid) ? sharedDid : defaultDid;
    input = initialDid;
    [specimen, examples] = await Promise.all([
      generateSpecimenForVersion(initialDid, generatorVersion),
      Promise.all(exampleDids.map((did) => generateSpecimenForVersion(did, generatorVersion)))
    ]);

    const stored = localStorage.getItem('hasharium.study-tray');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          savedDids = parsed.filter((value): value is string => typeof value === 'string' && isDid(value));
          await hydrateSaved(savedDids);
        }
      } catch {
        localStorage.removeItem('hasharium.study-tray');
      }
    }
    loading = false;
  }

  onMount(() => {
    void initialize();
  });

  async function renderIdentity() {
    error = '';
    const request = ++renderRequest;
    loading = true;
    try {
      const identity = await resolveIdentity(input);
      const next = await generateSpecimenForVersion(identity.did, generatorVersion);
      if (request === renderRequest) {
        specimen = next;
        input = next.did;
        window.history.replaceState(null, '', `/?did=${encodeURIComponent(next.did)}&version=${generatorVersion}`);
        resolvedHandle = identity.handle ?? '';
        pendingRemoteRemovalDid = '';
      }
    } catch (reason) {
      if (request === renderRequest) {
        error =
          reason instanceof IdentityResolutionError
            ? reason.message
            : 'This identity could not be observed right now.';
      }
    } finally {
      if (request === renderRequest) loading = false;
    }
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    void renderIdentity();
  }

  async function rerender() {
    if (!specimen) return;
    error = '';
    loading = true;
    try {
      const next = await generateSpecimenForVersion(specimen.did, generatorVersion);
      specimen = next;
      window.history.replaceState(null, '', `/?did=${encodeURIComponent(next.did)}&version=${generatorVersion}`);
      await hydrateSaved(savedDids);
    } finally {
      loading = false;
    }
  }

  async function selectSpecimen(next: Specimen) {
    specimen = await generateSpecimenForVersion(next.did, generatorVersion);
    input = next.did;
    resolvedHandle = '';
    error = '';
    pendingRemoteRemovalDid = '';
    window.history.replaceState(null, '', `/?did=${encodeURIComponent(next.did)}&version=${generatorVersion}`);
    document.querySelector('#specimen')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function toggleSaved() {
    if (!specimen) return;
    const current = $authState;
    if (current.status === 'signed-in') {
      collectionLoading = true;
      collectionMessage = '';
      try {
        if (remoteEntry) {
          if (pendingRemoteRemovalDid !== specimen.did) {
            pendingRemoteRemovalDid = specimen.did;
            collectionMessage = 'Select “Confirm removal” to delete this record from your PDS.';
            return;
          }
          await deleteCollectionEntry(current.agent, remoteEntry);
          remoteEntries = remoteEntries.filter((entry) => entry.uri !== remoteEntry?.uri);
          pendingRemoteRemovalDid = '';
          collectionMessage = 'The PDS confirmed removal from your profile cabinet.';
        } else {
          const entry = await createCollectionEntry(
            current.agent,
            specimen.did,
            '',
            specimen.generatorVersion
          );
          remoteEntries = [entry, ...remoteEntries];
          collectionMessage = 'The PDS confirmed this specimen in your profile cabinet.';
        }
      } catch (reason) {
        collectionMessage = reason instanceof Error ? reason.message : 'The PDS collection could not be updated.';
      } finally {
        collectionLoading = false;
      }
      return;
    }

    savedDids = isSaved
      ? savedDids.filter((did) => did !== specimen?.did)
      : [...savedDids, specimen.did];
    localStorage.setItem('hasharium.study-tray', JSON.stringify(savedDids));
    await hydrateSaved(savedDids);
  }

  function downloadSpecimen() {
    if (!specimen) return;
    const blob = new Blob([exportSpecimenSvg(specimen)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = specimenExportFilename(specimen);
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) cabinetOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && cabinetOpen) cabinetOpen = false;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>Hasharium — identities, given form</title>
  <meta
    name="description"
    content="A living index of deterministic forms, generated from decentralised identities."
  />
  <meta property="og:title" content="Hasharium — identities, given form" />
  <meta
    property="og:description"
    content="Enter a DID. Observe the form that was always inside it."
  />
  <meta name="twitter:title" content="Hasharium — identities, given form" />
  <meta
    name="twitter:description"
    content="Enter a DID. Observe the form that was always inside it."
  />
</svelte:head>

<div class="site-shell">
  <Masthead trayCount={savedDids.length} onOpenTray={() => (cabinetOpen = true)} />

  <main id="main-content" tabindex="-1">
    <section class="hero" id="top" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span></span> Registry of deterministic forms</p>
        <h1 id="hero-title">Identity,<br /><em>given form.</em></h1>
        <p class="introduction">
          Every decentralised identity contains a shape. Hasharium is a living index of those
          forms—stable, strange, and entirely their own.
        </p>

        <form class="did-form" onsubmit={submit} novalidate>
          <label for="did">Enter a decentralised identifier or handle</label>
          <div class="input-row" class:invalid={Boolean(error)}>
            <span aria-hidden="true">ID</span>
            <input
              id="did"
              bind:value={input}
              maxlength="2048"
              placeholder={PLACEHOLDER_DID}
              spellcheck="false"
              autocomplete="off"
            />
            <button type="submit" disabled={loading} aria-label="Generate specimen">
              <span>{loading ? 'Observing' : 'Observe'}</span>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" /></svg>
            </button>
          </div>
          <p class="form-message" class:error role="status">
            {error ||
              (resolvedHandle
                ? `Resolved @${resolvedHandle} to ${specimen?.did ?? 'its canonical DID'}.`
                : 'DIDs stay local. Handles use Microcosm Slingshot for DID resolution; no sign-in required.')}
          </p>
          <label class="version-select" for="generator-version">
            <span>Rendition</span>
            <select
              id="generator-version"
              bind:value={generatorVersion}
              onchange={() => void rerender()}
            >
              {#each GENERATOR_VERSIONS as version}
                <option value={version}>{version}</option>
              {/each}
            </select>
          </label>
        </form>
      </div>

      <div class="observation-column" id="specimen">
        <div class="plate-index" aria-hidden="true">
          <span>PLATE 001</span><span>LIVE SPECIMEN</span>
        </div>
        <div class="observation-plate" class:loading>
          <div class="plate-rings" aria-hidden="true"></div>
          {#if specimen}
            <SpecimenView {specimen} />
          {:else}
            <div class="specimen-placeholder"></div>
          {/if}
          <span class="measure measure-top" aria-hidden="true">320</span>
          <span class="measure measure-side" aria-hidden="true">320</span>
        </div>
        {#if specimen}
          <div class="specimen-label">
            <div>
              <span class="catalogue-number">{specimen.catalogueNumber}</span>
              <h2>{specimen.name}</h2>
              <code>{specimen.did}</code>
            </div>
            <div class="specimen-actions">
              <button type="button" onclick={downloadSpecimen} aria-label="Export specimen as SVG">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2v11M6 9l4 4 4-4M3 16h14" />
                </svg>
                Export SVG
              </button>
              <button
                class:saved={isSaved}
                type="button"
                onclick={() => void toggleSaved()}
                aria-pressed={isSaved}
                disabled={collectionLoading}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3h12v14l-6-3-6 3V3Z" /></svg>
                {collectionLoading
                  ? 'Updating…'
                  : $authState.status === 'signed-in'
                    ? pendingRemoteRemovalDid === specimen.did
                      ? 'Confirm removal'
                      : isSaved
                        ? 'In your profile'
                      : 'Collect in PDS'
                    : isSaved
                      ? 'In study tray'
                      : 'Keep specimen'}
              </button>
            </div>
          </div>
          <dl class="traits">
            <div><dt>Symmetry</dt><dd>{specimen.symmetry}-fold</dd></div>
            <div><dt>Structure</dt><dd>{specimen.layers} layers</dd></div>
            <div><dt>Material</dt><dd>{specimen.material}</dd></div>
            <div><dt>Temperament</dt><dd>{specimen.temperament}</dd></div>
          </dl>
          {#if collectionMessage}
            <p class="collection-message" role="status">{collectionMessage}</p>
          {/if}
          <CollectorRegister did={specimen.did} />
        {/if}
      </div>
    </section>

    <section class="cabinet" id="cabinet" aria-labelledby="cabinet-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow"><span></span> Open drawers</p>
          <h2 id="cabinet-title">The public cabinet</h2>
        </div>
        <p>
          A small field study of identities. Each specimen is recalculated—not stored—from its
          catalogue DID.
        </p>
      </div>

      <div class="specimen-grid">
        {#each examples as item, index}
          <button class="cabinet-card" type="button" onclick={() => void selectSpecimen(item)}>
            <span class="card-number">0{index + 2}</span>
            <div class="card-specimen"><SpecimenView specimen={item} compact animate={false} /></div>
            <span class="card-rule"></span>
            <strong>{item.name}</strong>
            <small>{item.catalogueNumber}</small>
            <span class="card-action">Observe <span aria-hidden="true">↗</span></span>
          </button>
        {/each}
      </div>
    </section>

    <section class="method" id="method" aria-labelledby="method-title">
      <div class="method-intro">
        <p class="eyebrow light"><span></span> The method</p>
        <h2 id="method-title">Nothing minted.<br /><em>Nothing assigned.</em></h2>
        <p>
          Hasharium reads an identifier as source material. SHA-256 supplies the measurements;
          the versioned renderer turns them into repeatable geometry. The same DID produces the
          same specimen anywhere this method is implemented.
        </p>
      </div>

      <ol class="method-steps">
        <li>
          <span>01</span>
          <div><strong>Identify</strong><p>Use a DID directly, or resolve a handle to its canonical DID.</p></div>
        </li>
        <li>
          <span>02</span>
          <div><strong>Derive</strong><p>Its SHA-256 digest becomes symmetry, colour, surface and name.</p></div>
        </li>
        <li>
          <span>03</span>
          <div><strong>Observe</strong><p>SVG geometry is drawn locally, reproducible, and exportable.</p></div>
        </li>
        <li>
          <span>04</span>
          <div><strong>Collect</strong><p>Portable observations live in each signed-in visitor’s PDS.</p></div>
        </li>
      </ol>

      <div class="protocol-strip">
        <span>PROTOCOL NOTE</span>
        <code>{NSID.collectionEntry}</code>
        <span>GENERATOR {generatorVersion}</span>
      </div>
    </section>
  </main>

  <SiteFooter />
</div>

{#if cabinetOpen}
  <div class="dialog-backdrop" role="presentation" onclick={closeOnBackdrop}>
    <div
      class="study-tray"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tray-title"
    >
      <div class="tray-heading">
        <div><span>LOCAL COLLECTION</span><h2 id="tray-title">Study tray</h2></div>
        <button type="button" onclick={() => (cabinetOpen = false)} aria-label="Close study tray">×</button>
      </div>
      <p class="tray-note">
        These specimens live only in this browser. Sign in through Profile to keep confirmed public
        records under <code>{NSID.collectionEntry}</code> in your PDS instead.
      </p>
      {#if savedSpecimens.length}
        <div class="tray-grid">
          {#each savedSpecimens as item}
            <button
              type="button"
              onclick={() => {
                void selectSpecimen(item);
                cabinetOpen = false;
              }}
            >
              <SpecimenView specimen={item} compact animate={false} />
              <strong>{item.name}</strong><small>{item.catalogueNumber}</small>
            </button>
          {/each}
        </div>
      {:else}
        <div class="empty-tray">
          <span>◇</span><p>Your tray is empty.</p><small>Keep a specimen to place it here.</small>
        </div>
      {/if}
    </div>
  </div>
{/if}

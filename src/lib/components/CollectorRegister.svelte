<script lang="ts">
  import type { Collector } from '$lib/backlinks';

  let { did }: { did: string } = $props();
  let collectors = $state<Collector[]>([]);
  let loading = $state(false);
  let unavailable = $state(false);

  $effect(() => {
    const subject = did;
    const controller = new AbortController();
    collectors = [];
    unavailable = false;
    loading = true;
    fetch(`/api/collectors?did=${encodeURIComponent(subject)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Collector discovery failed.');
        return (await response.json()) as { collectors?: Collector[] };
      })
      .then((payload) => {
        collectors = Array.isArray(payload.collectors) ? payload.collectors : [];
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) unavailable = true;
      })
      .finally(() => {
        if (!controller.signal.aborted) loading = false;
      });
    return () => controller.abort();
  });

  function label(collector: Collector): string {
    return collector.handle ? `@${collector.handle}` : collector.did;
  }
</script>

<aside class="collector-register" aria-labelledby="collector-title" aria-busy={loading}>
  <div class="collector-heading">
    <div>
      <span>BACKLINK REGISTER</span>
      <h3 id="collector-title">Collected by</h3>
    </div>
    <strong>{loading ? '···' : collectors.length.toString().padStart(2, '0')}</strong>
  </div>
  {#if collectors.length}
    <ul>
      {#each collectors as collector}
        <li>
          <a href={`/?did=${encodeURIComponent(collector.did)}`}>
            <span class="collector-mark" aria-hidden="true">{label(collector).slice(0, 2).toUpperCase()}</span>
            <span><strong>{label(collector)}</strong><small>{collector.did}</small></span>
            <time datetime={collector.createdAt}>
              {new Date(collector.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </time>
          </a>
        </li>
      {/each}
    </ul>
    <p>Found by backlink; confirmed against each curator’s repository record.</p>
  {:else if loading}
    <p>Consulting the public record index…</p>
  {:else if unavailable}
    <p>The backlink register cannot be consulted right now.</p>
  {:else}
    <p>No verified public collection records point to this specimen yet.</p>
  {/if}
</aside>

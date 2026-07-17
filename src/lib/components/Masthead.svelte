<script lang="ts">
  import { page } from '$app/state';
  import { authState } from '$lib/oauth';

  let {
    trayCount = 0,
    onOpenTray
  }: { trayCount?: number; onOpenTray?: () => void } = $props();

  let profileActive = $derived(page.url.pathname.startsWith('/profile'));
  let signedIn = $derived($authState.status === 'signed-in');
</script>

<header class="masthead">
  <a class="wordmark" href="/" aria-label="Hasharium home">
    <svg viewBox="0 0 42 42" aria-hidden="true">
      <path d="M21 3C24 12 34 10 38 21 29 24 32 34 21 39 17 30 8 33 4 21 13 18 10 8 21 3Z" />
      <circle cx="21" cy="21" r="5" />
    </svg>
    <span>Hasharium</span>
    <small>croft.click / field registry</small>
  </a>
  <nav aria-label="Primary navigation">
    <a href="/#cabinet">Cabinet</a>
    <a href="/#method">Method</a>
    <a class="profile-link" class:active={profileActive} href="/profile" aria-current={profileActive ? 'page' : undefined}>
      Profile <span class:online={signedIn} aria-hidden="true"></span>
    </a>
    {#if onOpenTray}
      <button class="tray-button" type="button" onclick={onOpenTray}>
        Study tray <span>{trayCount}</span>
      </button>
    {/if}
  </nav>
</header>

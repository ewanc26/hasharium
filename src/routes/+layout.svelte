<script lang="ts">
  import '@fontsource-variable/inter/wght.css';
  import '@fontsource-variable/jetbrains-mono/wght.css';
  import { onMount } from 'svelte';
  import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, ogImageUrl } from '$lib/og';
  import { initializeOAuth } from '$lib/oauth';
  import './styles.css';
  let { children } = $props();
  const defaultOgImage = ogImageUrl();

  onMount(() => {
    void initializeOAuth();
  });
</script>

<svelte:head>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Hasharium" />
  <meta property="og:image" content={defaultOgImage} />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
  <meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
  <meta property="og:image:alt" content="A Hasharium identity specimen observation plate." />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content={defaultOgImage} />
  <meta name="twitter:image:alt" content="A Hasharium identity specimen observation plate." />
</svelte:head>

<a class="skip-to-content" href="#main-content">Skip to content</a>
{@render children()}

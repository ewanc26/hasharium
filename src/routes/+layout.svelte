<script lang="ts">
  import '@fontsource-variable/inter/wght.css';
  import '@fontsource-variable/jetbrains-mono/wght.css';
  import { onMount } from 'svelte';
  import { initializeOAuth } from '$lib/oauth';
  import './styles.css';
  let { children } = $props();

  onMount(() => {
    void initializeOAuth();
  });
</script>

<a class="skip-to-content" href="#main-content">Skip to content</a>
{@render children()}

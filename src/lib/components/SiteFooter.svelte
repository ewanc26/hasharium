<script lang="ts">
  import { SOURCE_URL } from '$lib/protocol';
</script>

<footer class="site-footer">
  <a class="wordmark footer-mark" href="/" aria-label="Hasharium home">
    <svg viewBox="0 0 42 42" aria-hidden="true">
      <path d="M21 3C24 12 34 10 38 21 29 24 32 34 21 39 17 30 8 33 4 21 13 18 10 8 21 3Z" />
      <circle cx="21" cy="21" r="5" />
    </svg>
    <span>Hasharium</span>
  </a>
  <p>An independent study of identity and form.</p>
  <nav aria-label="Footer navigation">
    <a href="https://croft.click">croft.click</a>
    <a href="/about">About &amp; privacy</a>
    <a href="/font-licenses.txt">Font licences</a>
    <a href={SOURCE_URL}>Source · AGPL-3.0</a>
  </nav>
</footer>

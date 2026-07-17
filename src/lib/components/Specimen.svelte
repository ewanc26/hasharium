<script lang="ts">
  import type { Specimen } from '$lib/shape';

  let {
    specimen,
    compact = false,
    animate = true
  }: { specimen: Specimen; compact?: boolean; animate?: boolean } = $props();

  const gradientId = $derived(`wash-${specimen.fingerprint.slice(0, 10)}`);
</script>

<svg
  class:compact
  class:animate
  class="specimen"
  viewBox="0 0 320 320"
  role="img"
  aria-labelledby={`${gradientId}-title ${gradientId}-description`}
>
  <title id={`${gradientId}-title`}>{specimen.name}</title>
  <desc id={`${gradientId}-description`}>
    A deterministic {specimen.symmetry}-fold {specimen.material} specimen generated from
    {specimen.did}.
  </desc>
  <defs>
    <radialGradient id={gradientId} cx="36%" cy="30%" r="76%">
      <stop offset="0%" stop-color={specimen.palette[1]} />
      <stop offset="58%" stop-color={specimen.palette[0]} />
      <stop offset="100%" stop-color={specimen.palette[2]} />
    </radialGradient>
    <filter id={`${gradientId}-texture`} x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.8"
        numOctaves="2"
        seed={Number.parseInt(specimen.fingerprint.slice(0, 4), 16)}
        result="noise"
      />
      <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
      <feBlend in="SourceGraphic" in2="mono" mode="soft-light" />
    </filter>
  </defs>

  <g
    class="form"
    style={`transform: rotate(${specimen.rotation}deg); transform-origin: 160px 160px;`}
  >
    {#each specimen.paths as path, index}
      <path
        d={path}
        fill={index === 0 ? `url(#${gradientId})` : specimen.palette[(index + 1) % 3]}
        fill-opacity={index === 0 ? 0.96 : 0.72 + index * 0.06}
        stroke={index === specimen.paths.length - 1 ? '#f4eddb' : specimen.palette[2]}
        stroke-opacity={index === specimen.paths.length - 1 ? 0.8 : 0.38}
        stroke-width={compact ? 1.6 : 1.2}
        filter={index === 0 && !compact ? `url(#${gradientId}-texture)` : undefined}
      />
    {/each}
    <circle
      cx="160"
      cy="160"
      r={specimen.aperture}
      fill="#1c2925"
      stroke={specimen.palette[1]}
      stroke-width="2"
    />
    <circle cx="160" cy="160" r={Math.max(2, specimen.aperture * 0.26)} fill="#f2ead7" />
  </g>
</svg>

<style>
  .specimen {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .form {
    filter: drop-shadow(0 16px 13px rgb(28 41 37 / 0.15));
  }

  .animate .form {
    animation: breathe 7s ease-in-out infinite;
  }

  .compact .form {
    filter: drop-shadow(0 7px 6px rgb(28 41 37 / 0.12));
  }

  @keyframes breathe {
    0%,
    100% {
      scale: 0.985;
    }
    50% {
      scale: 1.012;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate .form {
      animation: none;
    }
  }
</style>

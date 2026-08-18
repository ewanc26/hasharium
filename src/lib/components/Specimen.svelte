<script lang="ts">
  import type { Specimen } from '$lib/shape';
  import {
    apertureCenter,
    apertureCoreFill,
    apertureFill,
    aperturePolygonPoints,
    apertureStroke,
    layerBlendMode,
    layerFill,
    layerFillOpacity,
    layerStroke,
    layerStrokeOpacity,
    noiseFrequency
  } from '$lib/render';

  let {
    specimen,
    compact = false,
    animate = true
  }: { specimen: Specimen; compact?: boolean; animate?: boolean } = $props();

  const gradientId = $derived(`wash-${specimen.fingerprint.slice(0, 10)}`);
  const aperturePolygon = $derived(aperturePolygonPoints(specimen));
  const [apertureCx, apertureCy] = $derived(apertureCenter(specimen));
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
        baseFrequency={noiseFrequency(specimen)}
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
        fill={layerFill(specimen, index, gradientId)}
        fill-opacity={layerFillOpacity(specimen, index)}
        stroke={layerStroke(specimen, index)}
        stroke-opacity={layerStrokeOpacity(specimen, index)}
        stroke-width={compact ? 1.6 : 1.2}
        style={`mix-blend-mode: ${layerBlendMode(specimen, index)};`}
        filter={index === 0 && !compact ? `url(#${gradientId}-texture)` : undefined}
      />
    {/each}
    {#if aperturePolygon}
      <polygon
        points={aperturePolygon}
        fill={apertureFill(specimen)}
        stroke={apertureStroke(specimen)}
        stroke-width="2"
      />
    {:else}
      <circle
        cx={apertureCx}
        cy={apertureCy}
        r={specimen.aperture}
        fill={apertureFill(specimen)}
        stroke={apertureStroke(specimen)}
        stroke-width="2"
      />
    {/if}
    <circle
      cx={apertureCx}
      cy={apertureCy}
      r={Math.max(2, specimen.aperture * 0.26)}
      fill={apertureCoreFill(specimen)}
    />
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

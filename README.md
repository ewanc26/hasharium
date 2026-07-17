# Hasharium

**Identities, given form.** Hasharium is an independent, browser-based cabinet of deterministic
shapes generated from decentralised identifiers. The intended production home is
[`hasharium.croft.click`](https://hasharium.croft.click).

Enter a DID and Hasharium hashes its exact string with SHA-256. A versioned renderer maps the
digest into symmetry, layers, aperture, palette, material, temperament, name, and SVG geometry.
The same DID and renderer version always produce the same specimen; the shape is not minted,
uploaded, or centrally assigned.

## Current state

The public prototype includes:

- deterministic, accessible SVG specimens generated locally;
- DID input and privacy-disclosed handle-to-DID resolution;
- standalone SVG export with subject, fingerprint, catalogue, and generator metadata;
- a specimen label and morphological traits;
- a curated public cabinet of example identities;
- a browser-local study tray;
- static output suitable for deployment at `hasharium.croft.click`;
- initial AT Protocol lexicons under the required `click.croft.hasharium.*` namespace.

OAuth, PDS record writes, public collection loading, intersections, and exhibitions are
deliberately not presented as working yet. The local study tray is a preview of the eventual signed
collection experience.

## Development

Use Node.js 22 or newer and pnpm:

```sh
pnpm install
pnpm dev
```

Quality gates:

```sh
pnpm format
pnpm lint
pnpm check
pnpm test
pnpm build
```

The static production output is written to `build/`.

## Architecture

```text
src/lib/shape.ts                    SHA-256-to-SVG renderer and morphology
src/lib/identity.ts                 DID input and bounded handle resolution
src/lib/export.ts                   standalone SVG and provenance metadata export
src/lib/protocol.ts                 canonical host, NSIDs, and protocol constants
src/lib/components/Specimen.svelte  accessible SVG presentation
src/routes/+page.svelte             observation, cabinet, and study-tray interaction
src/routes/styles.css               complete visual system and responsive layout
lexicons/click/croft/hasharium/     AT Protocol lexicon sources
```

The generator version is `sha256-radial-v1`. Its output is a public compatibility contract. Any
intentional visual algorithm change must use a new version instead of mutating old specimens.

## Protocol namespace

All Hasharium records live below `click.croft.hasharium.*`:

- `click.croft.hasharium.collection.entry` — one collected DID;
- `click.croft.hasharium.intersection` — an encounter with another DID;
- `click.croft.hasharium.exhibition` — a curated, ordered group of specimens.

Lexicons describe public repository data. Notes are therefore public, despite their personal
curatorial character. See `AGENTS.md` before changing schemas or implementing authentication.

## Deployment

Hasharium is configured with SvelteKit's static adapter and a `404.html` fallback. Deploy the
contents of `build/` behind HTTPS and configure `hasharium.croft.click` as the custom hostname.
Because the current site is client-only, no application secrets or runtime server process are
required.

`vercel.json` pins the Vercel build command and `build/` output directory so Vercel does not apply
its server-rendered SvelteKit defaults to this static-adapter project.

`static/CNAME`, `robots.txt`, and `sitemap.xml` carry the canonical hostname into the static
artifact. The `CNAME` file directly supports GitHub Pages; other hosts may ignore it and require
their own domain configuration.

Before enabling AT Protocol OAuth, add production client metadata, exact redirect URIs for
`https://hasharium.croft.click`, a narrowly scoped repository permission, and real callback and
session-restoration tests.

## Licence

Copyright © 2026 Ewan Croft. Licensed under the
[GNU Affero General Public License v3.0](./LICENSE) (`AGPL-3.0-only`).

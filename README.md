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
- a browser-local signed-out study tray;
- AT Protocol OAuth using the official browser client, PKCE, DPoP, and refresh-token rotation;
- a curator profile with the signed-in identity's specimen and PDS-backed collection cabinet;
- confirmed creation and removal of `click.croft.hasharium.collection.entry` records;
- static output suitable for deployment at `hasharium.croft.click`;
- initial AT Protocol lexicons under the required `click.croft.hasharium.*` namespace.

Intersections, exhibitions, and network-wide public collection discovery are deliberately not
presented as working yet. Signed-out observations remain useful and private to the device; signed-in
collection changes complete only after the visitor's PDS confirms them.

## Development

Use Node.js 22 or newer and pnpm:

```sh
pnpm install
pnpm dev
```

The development OAuth client uses the AT Protocol loopback convention and redirects to
`http://127.0.0.1:5173/profile`. Keep Vite on port 5173 when manually exercising the development
flow. Production uses the discoverable metadata at `/oauth-client-metadata.json`.

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
src/lib/oauth-config.ts             production/loopback OAuth identifiers and bounded scopes
src/lib/oauth.ts                    browser OAuth session lifecycle and authenticated Agent
src/lib/collection.ts               validated collection reads, confirmed writes, and removals
src/lib/protocol.ts                 canonical host, NSIDs, and protocol constants
src/lib/components/Specimen.svelte  accessible SVG presentation
src/routes/+page.svelte             observation, cabinet, and study-tray interaction
src/routes/profile/+page.svelte     OAuth entry point and PDS-backed curator profile
src/routes/about/+page.svelte       method, privacy, permission, and service terms
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

## OAuth and privacy

Hasharium is a static public OAuth client. It requests identity plus granular repository access to
every published Hasharium record type:

```text
atproto repo:click.croft.hasharium.collection.entry repo:click.croft.hasharium.exhibition repo:click.croft.hasharium.intersection
```

The official `@atproto/oauth-client-browser` package performs authorization-code exchange, PKCE,
DPoP, refresh, revocation, and IndexedDB session storage. Hasharium never accepts app passwords and
does not receive access outside `click.croft.hasharium.*`, blobs, email, or account administration.
Handle resolution uses Microcosm Slingshot and therefore makes a disclosed network request; direct
shape generation remains local. Collection records and optional field notes are public in the
author's repository.

Inter and JetBrains Mono are packaged into the production build from Fontsource; the browser does
not contact a font CDN. The cabinet's display serif remains a deliberately system-native contrast.
Their SIL Open Font License notices are published at `/font-licenses.txt`.

## Deployment

Hasharium is configured with SvelteKit's static adapter and a `404.html` fallback. Deploy the
contents of `build/` behind HTTPS and configure `hasharium.croft.click` as the custom hostname.
Because the current site is client-only, no application secrets or runtime server process are
required.

`vercel.json` pins the Vercel build command, `build/` output directory, and clean-URL mapping so
Vercel serves prerendered `/profile` and `/about` routes without exposing `.html` suffixes.

`static/CNAME`, `robots.txt`, and `sitemap.xml` carry the canonical hostname into the static
artifact. The `CNAME` file directly supports GitHub Pages; other hosts may ignore it and require
their own domain configuration.

Production OAuth depends on the metadata document, `/profile` callback route, and application
origin remaining available at their exact HTTPS URLs. Changing the collection NSID, redirect URI,
or scope requires updating runtime constants, static metadata, tests, and deployed files together.

## Licence

Copyright © 2026 Ewan Croft. Licensed under the
[GNU Affero General Public License v3.0](./LICENSE) (`AGPL-3.0-only`).

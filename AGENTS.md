# AGENTS.md

Guidance for agents working on **Hasharium**, the independent DID-hash specimen collection site
intended for `https://hasharium.croft.click`. This is a SvelteKit 2 / Svelte 5 static application.
It turns exact DID strings into stable SVG forms and is growing toward portable AT Protocol
collections stored in each user's PDS.

The project is licensed `AGPL-3.0-only`. Preserve the full `LICENSE`, package metadata, visible
source availability, and downstream/network-use obligations. Do not relicense or mix in
incompatible code or assets without an explicit copyright and compatibility review.

## Product thesis

- Hasharium is a cabinet of identity specimens, not an NFT marketplace, rarity casino, profile
  directory, generic social dashboard, or clone of spores.garden.
- Its essential promise is: **the same DID, interpreted by the same generator version, produces
  the same form everywhere**. The shape is calculated, never minted or assigned.
- The visual metaphor is a restrained natural-history specimen cabinet: observation plates,
  catalogue labels, drawers, field notes, paper, ink, oxide, and glass. Preserve its quiet,
  editorial character when adding features.
- Collection should be additive. A visitor records that they encountered another identity; they
  do not take a scarce object away from its owner.
- Public protocol data belongs to its author and stays in their PDS. Hasharium is a view and an
  authoring client, not the authority over a person's collection.
- Handles are friendly, mutable labels. DIDs are canonical catalogue identifiers. Resolve a
  handle to a DID before deriving a shape and never derive permanent morphology from a handle.

## Read first

Before editing behavior, read:

1. `README.md` for current shipped scope and honest deployment status.
2. `package.json` for supported commands and package manager.
3. `src/lib/shape.ts` and its tests before touching the generator.
4. `src/lib/protocol.ts` and every affected file in `lexicons/` before touching records.
5. `src/routes/+page.svelte`, `src/lib/components/Specimen.svelte`, and
   `src/routes/styles.css` before changing interaction or presentation.

Source and tests are authoritative if prose drifts, but fix the drift in the same change. Do not
leave documentation describing planned behavior as if it already exists.

## Repository map

- `src/lib/shape.ts` owns DID validation, SHA-256 hashing, trait mapping, catalogue names,
  palettes, and path construction. It contains no Svelte or browser UI state.
- `src/lib/identity.ts` validates friendly handles and resolves them to canonical DIDs without
  changing the generator's DID-only input contract.
- `src/lib/oauth-config.ts` owns the discoverable production client ID, callback, handle resolver,
  least-privilege scope, and loopback client construction. Static metadata and tests must agree.
- `src/lib/oauth.ts` dynamically loads the official browser OAuth client, restores/revokes its
  IndexedDB-backed sessions, and exposes the authenticated `Agent` through a Svelte store.
- `src/lib/collection.ts` validates collection records and owns bounded list, confirmed create, and
  exact-rkey delete operations. Treat loaded records and PDS responses as untrusted.
- `src/lib/export.ts` serializes portable specimen SVGs and provenance metadata. Export changes
  must preserve well-formed XML and keep subject DIDs escaped as untrusted text.
- `src/lib/shape.test.ts` protects deterministic output, validation, and trait bounds.
- `src/lib/protocol.ts` is the canonical TypeScript source for the production hostname,
  generator version, and every application NSID used by runtime code.
- `src/lib/protocol.test.ts` guards the namespace and version format.
- `src/lib/components/Specimen.svelte` renders a `Specimen` as labelled, accessible SVG. It must
  not independently reinterpret digest bytes.
- `src/routes/+page.svelte` coordinates the observation form, example cabinet, local study tray,
  signed-in PDS collection shortcut, loading/error state, and page copy.
- `src/routes/profile/+page.svelte` is the OAuth callback and curator profile. It displays the
  signed-in DID specimen and manages that repository's Hasharium collection entries.
- `src/routes/about/+page.svelte` is the public OAuth policy/terms URI and must accurately describe
  storage, permissions, third-party resolution, public records, and availability.
- `src/routes/styles.css` is the site-wide visual system. There is intentionally no component
  library or utility-CSS framework.
- `lexicons/click/croft/hasharium/` contains the source lexicons. The directory mirrors each
  NSID. Keep these files formatted JSON and validate them with the protocol tests.
- `static/` contains only deployable public assets. Never put secrets or OAuth session data here.
- `build/` and `.svelte-kit/` are generated and ignored.

## Permanent namespace and hostname

- The canonical production origin is exactly `https://hasharium.croft.click`.
- **Every Hasharium lexicon and record type must live below `click.croft.hasharium.*`.** This is
  a hard product requirement, not a placeholder.
- Current record NSIDs are:
  - `click.croft.hasharium.collection.entry`
  - `click.croft.hasharium.intersection`
  - `click.croft.hasharium.exhibition`
- Do not introduce `app.hasharium.*`, `garden.*`, `uk.ewancroft.*`, or another legacy/alternate
  namespace. Do not add fallback reads for an unpublished namespace.
- Treat a published NSID and its record semantics as durable protocol. Prefer additive optional
  fields. Changing required fields, types, meanings, record keys, or reference targets needs an
  explicit migration and compatibility plan.
- Keep lexicon JSON, `src/lib/protocol.ts`, application code, tests, and documentation synchronized
  in one change. A string literal copied into UI code is not a substitute for an `NSID` constant.
- Repository records are public. Never label record fields private. A curator's `note` may feel
  personal but is readable from their repository; UX must say so before publishing it.

## Generator compatibility contract

The initial generator is `sha256-radial-v1`:

1. Trim leading/trailing whitespace from the submitted DID.
2. Preserve every remaining character exactly; do not lowercase or Unicode-normalize a DID.
3. Hash the UTF-8 bytes with SHA-256 using Web Crypto.
4. Deterministically map documented bytes into morphology and build smooth radial paths.
5. Render the returned model without adding random or time-based geometry.

Rules:

- Never call `Math.random()`, use the current date, browser dimensions, remote profile data, or
  mutable handle data to determine canonical morphology.
- Cosmetic motion may vary, but the paths, palette, name, traits, fingerprint, and catalogue
  number must not.
- Refactoring is allowed only if compatibility tests prove byte-for-byte equivalent output.
- If an intentional algorithm or mapping change alters any existing specimen, add a new named
  generator (for example `sha256-radial-v2`) and preserve a way to render v1 records. Do not
  silently mutate `sha256-radial-v1`.
- A collection record stores the subject DID, not redundant SVG paths or derived traits. The
  optional `generatorVersion` identifies the historical rendition.
- Rarity based solely on a DID hash is grindable because users can generate candidate DIDs. Do
  not attach financial value, exclusivity claims, or security decisions to morphology or hash
  thresholds.
- An intersection must hash a canonically sorted pair of DIDs so both participants calculate the
  same form. Group forms must similarly hash a documented, sorted, length-delimited DID list.

## AT Protocol and authentication boundaries

The application uses `@atproto/oauth-client-browser` as a static public client. It resolves handles
through Microcosm Slingshot, completes OAuth at `/profile`, stores browser sessions in the SDK's
IndexedDB database, and reads/writes confirmed collection-entry records in the signed-in user's PDS.
The study tray remains explicitly browser-local and separate from the PDS profile cabinet. Copy must
disclose that handle resolution is a network request while direct DID generation remains local.

Current OAuth invariants:

- Production client ID: `https://hasharium.croft.click/oauth-client-metadata.json`.
- Production redirect URI: `https://hasharium.croft.click/profile`.
- Requested scope: `atproto` plus one granular `repo:` scope for each of collection entry,
  intersection, and exhibition. Never replace these with `repo:*` or an unrelated namespace.
- Client type: public web client with authorization code, refresh tokens, PKCE, and DPoP-bound
  access tokens. Never add a browser client secret.
- Development uses the AT Protocol loopback client convention with a `127.0.0.1` redirect; do not
  replace it with `localhost` in the redirect URI.
- Metadata scope is the maximum grant and runtime sign-in asks for the same namespace-bounded scope. Keep
  `oauth-config.ts`, `static/oauth-client-metadata.json`, tests, `/about`, and this guidance aligned.

When extending authenticated PDS behavior:

- Prefer browser OAuth using current AT Protocol OAuth guidance. Do not add app-password login as
  a shortcut.
- Request only the repository scopes needed for `click.croft.hasharium.*` records. Do not request
  broad write access without a documented need.
- Production client metadata and redirect URIs must use `https://hasharium.croft.click` exactly;
  development loopback metadata must remain clearly separate.
- Treat handles, DIDs, DID documents, PDS endpoints, access tokens, refresh state, DPoP keys,
  record AT-URIs, and CIDs as distinct types and concepts.
- Resolve and verify identity through supported AT Protocol resolution. Network results are
  untrusted and can fail, time out, redirect, or become stale.
- Keep session material out of logs, error telemetry, URLs, static assets, screenshots, and git.
  Do not inspect or expose existing browser credentials while debugging.
- A write is successful only after the repository confirms it. Surface pending, success, failure,
  and retry states accurately; never optimistically claim a collection was saved.
- Revocation/sign-out errors must not leave the UI claiming an authenticated session. Never log or
  render access tokens, refresh tokens, authorization codes, DPoP keys, or raw callback fragments.
- Prevent accidental duplicate entries in normal UI, but tolerate duplicate public records when
  reading because repositories are user-controlled.
- Validate every loaded record before rendering. Ignore unknown `$type`s, malformed dates,
  invalid DIDs, excessive arrays/strings, and unsafe external URLs without crashing the cabinet.
- Mutual intersections require two independently authored records or another explicit consent
  proof. A one-sided record is an encounter, not evidence of a reciprocal relationship.
- Backlink indexes and caches are discovery aids, not authorities. Verify records from their
  repositories when correctness matters.

## Record semantics

### `click.croft.hasharium.collection.entry`

- One repository-authored observation of `subject`, which is a DID.
- `createdAt` is the author's claimed timestamp; parse defensively and do not treat it as trusted
  proof of first discovery.
- `generatorVersion` records the rendition encountered. Missing values should be interpreted by a
  documented compatibility policy, not guessed ad hoc.
- `note` is optional, user-authored, untrusted, and public. Render it as text, never raw HTML.

### `click.croft.hasharium.intersection`

- The repository DID is participant A; `with` names participant B.
- Derive pair geometry from the two sorted DIDs, independent of record direction or creation time.
- A record cannot claim that the other DID consented. Reciprocal state requires independent
  evidence from the other repository.

### `click.croft.hasharium.exhibition`

- An ordered, curated list of specimen DIDs with optional captions.
- Preserve order and intentional repetition when displaying an authored exhibition.
- Limit fetches and rendering work even though the lexicon caps an array at 60 entries.
- Captions and descriptions are untrusted public text. Do not permit scriptable markup.

## UI and visual language

- Preserve the warm paper (`--paper`), deep green ink (`--ink`/`--green`), oxide red (`--red`),
  fine rules, large editorial serif type, monospaced catalogue labels, and generous whitespace.
- New UI should feel like a museum drawer, field index, observation instrument, or curator's note.
  Avoid generic gradient SaaS cards, neon crypto aesthetics, glassmorphism, excessive pills, and
  dashboards full of metrics.
- Let the specimens provide most of the colour. Interface chrome should remain restrained.
- Hasharium is the natural-history expression of the wider Croft design language: preserve the
  shared 4pt spacing rhythm, Inter/system UI register, mono technical labels, earthy OKLCH palette,
  stable colour-based editorial-row interaction, strong focus treatment, and purposeful easing.
  Its display serif, paper, oxide, plates, rules, and drawer metaphor remain intentionally unique.
- Use code-native SVG/CSS for canonical shapes, diagrams, marks, and icons. Do not rasterize the
  generator output or require an image-generation service to render identity forms.
- Use real semantic controls. Cards that select specimens are buttons; destinations are links.
  Every form input needs a visible or programmatically clear label.
- Preserve visible focus, logical keyboard order, 44px touch targets where practical, sufficient
  contrast, readable error/status messages, and `prefers-reduced-motion` behavior.
- Every specimen SVG needs a useful title and description containing its name, symmetry/material,
  and subject DID. Decorative measurement furniture must remain hidden from assistive technology.
- Do not encode important distinctions only through colour or animation.
- Test at 320px, common phone widths, tablet, 1280px, and wide desktop. Long DIDs must truncate or
  wrap without widening the page. Dialog content must remain reachable on short screens.
- The browser-local tray key is `hasharium.study-tray`. Treat its JSON as untrusted: catch parse
  failures and filter values. A format change requires tolerant migration or an explicit reset.
- Avoid runtime third-party font, analytics, and asset requests. Inter and JetBrains Mono are
  self-hosted in the build, the display serif uses a local system stack, and specimens are
  computed entirely in the browser. Preserve the visible font licence notice when changing fonts.

## Svelte and code rules

- Use TypeScript and keep `strict` checking green. Do not paper over uncertain network or record
  types with `any`.
- Prefer Svelte 5 runes and event properties in new code. Keep state local unless multiple routes
  genuinely require a shared module.
- Put pure, independently testable derivation logic in `src/lib/`; keep DOM, storage, routing, and
  lifecycle work in components/routes.
- Browser-only APIs such as `localStorage`, Web Crypto assumptions, and DOM queries must execute
  after mount or behind a browser guard. Static prerender must remain functional.
- Avoid new dependencies for small utilities. Every dependency affects a privacy-oriented static
  client and must have a clear benefit.
- Keep asynchronous transitions race-safe. If users can submit several DIDs quickly, an older hash
  result must not overwrite the latest requested specimen.
- Clean up document/window listeners, subscriptions, intervals, animation frames, and observers on
  component destruction.
- Do not use raw HTML for profile text, notes, captions, DID values, handles, or network errors.
- Keep generated SVG identifiers scoped by the specimen fingerprint so multiple specimens can
  render on one page without gradient/filter collisions.

## Security and privacy

- A DID and public repository records are public identifiers/data, but a person's browsing and
  curation activity can still be sensitive. Do not add analytics or transmit study-tray contents
  without an explicit product decision and clear disclosure.
- Validate input length before hashing to prevent needless work on huge strings. DID validation is
  syntactic only; passing it does not prove that the DID resolves or belongs to the visitor.
- Escape all untrusted values through normal Svelte text bindings. Never interpolate them into
  script, style, filter, redirect, or raw HTML contexts.
- Permit only expected `https:` endpoints when following DID/PDS metadata. Apply timeouts, response
  size limits, schema validation, and redirect limits.
- Do not commit `.env*`, OAuth keys/session data, PDS exports, private test identities, analytics
  dumps, or production deployment credentials.
- Content Security Policy should eventually allow the static app itself and explicitly required AT
  Protocol endpoints. Do not solve CSP errors with unrestricted `*` or `unsafe-eval`.
- Generated names and traits are playful descriptions, not claims about a person's identity,
  personality, health, worth, or reputation. Keep the copy non-judgmental.

## Testing and validation

Use pnpm. Preserve `pnpm-lock.yaml` once generated and do not add npm/Yarn/Bun lockfiles.

For normal changes, run:

```sh
pnpm format
pnpm lint
pnpm check
pnpm test
pnpm build
```

Generator changes additionally require:

- exact golden expectations for representative `did:plc`, `did:web`, and `did:key` inputs;
- same-input stability and different-input divergence;
- trait bounds, valid closed paths, 64-character SHA-256 fingerprints, and stable catalogue names;
- checks that whitespace is trimmed while remaining DID characters are preserved;
- a documented generator-version decision.

Lexicon/protocol changes additionally require:

- parse every JSON lexicon;
- assert each `id` lives under `click.croft.hasharium.*` and matches its path/runtime constant;
- validate schemas with an authoritative AT Protocol lexicon validator when available;
- round-trip representative valid records and reject malformed DID/date/length cases;
- inspect compatibility with already published records before making a breaking change.

UI changes additionally require manual checks for:

- initial render and static prerender without `localStorage` access errors;
- valid/invalid DID submission, loading state, repeated rapid submissions, and long identifiers;
- selecting cabinet specimens, saving/removing them, corrupt local storage, reload persistence, and
  empty/populated study tray;
- keyboard operation, focus visibility/containment, Escape close when supported, screen-reader
  names/status, reduced motion, narrow mobile, tablet, desktop, and high zoom;
- no unexpected external requests, console errors, horizontal overflow, clipped dialog content, or
  false claims of PDS persistence;
- OAuth metadata fetch, handle/DID sign-in, callback cleanup, session restore, revocation, denied and
  failed authorization, and a callback reload that does not exchange the same code twice;
- PDS collection list/create/delete with malformed records, duplicates, cursor failure, rejected
  writes, exact delete keys, and the public-note disclosure;
- production output served from the same kind of static hosting intended for
  `hasharium.croft.click`, including direct/fallback routes and favicon/metadata.

Do not claim production deployment, working OAuth, repository persistence, handle resolution,
mutual intersections, or public collection discovery based only on a passing build. Verify each at
its real surface.

## Deployment rules

- The current adapter is static and writes `build/` with a `404.html` fallback. Keep README and
  hosting configuration aligned if this changes.
- `vercel.json` explicitly selects `pnpm build`, the `build/` output directory, and clean URLs so
  `/profile` and `/about` resolve to their prerendered HTML files. Preserve this static contract
  unless the application intentionally moves to Vercel's server adapter.
- Production must use HTTPS at `hasharium.croft.click`. DNS, TLS, CDN/cache rules, and the deployed
  artifact are operator state outside a local build; inspect them before reporting deployment done.
- Static assets may be cached aggressively when fingerprinted. HTML and client/OAuth metadata need
  cache behavior compatible with releases and key/redirect changes.
- Never upload source maps containing secrets (there should be none), `.env` files, git metadata,
  test fixtures with private data, or `node_modules` as part of the public artifact.
- After deployment, verify the live hostname, certificate, HTML metadata, JS/CSS/assets, invalid
  route fallback, at least two known specimen outputs, mobile layout, and browser console/network.

## Commit discipline and definition of done

- Preserve unrelated user work and inspect `git status` before and after changes. Do not rewrite
  history or delete material without explicit authorization.
- Keep commits coherent: generator compatibility, protocol schema, UI, and deployment changes may
  deserve separate commits when each remains valid independently.
- Never commit generated `build/`, `.svelte-kit/`, coverage, credentials, local study data, or
  unrelated screenshots.
- A change is done only when implementation, tests, types, formatting, docs, and honest product copy
  agree; the production build succeeds; relevant manual behavior is exercised; and remaining planned
  features are not represented as shipped.

## Near-term roadmap

Unless the user prioritizes another slice, develop in this order:

1. Harden v1 golden compatibility tests and exportable SVG metadata.
2. Add handle-to-DID resolution while continuing to hash only the resolved DID.
3. Add deterministic pair intersections with reciprocal-status evidence.
4. Add authored exhibitions and public discovery through verified records/backlinks.
5. Consider replacing the three explicit same-namespace scopes with a published Hasharium
   permission set once that improves authorization descriptions without broadening access.

Each milestone must preserve a useful signed-out observation experience. Authentication should
enhance collecting, not gate the core act of seeing a DID's form.

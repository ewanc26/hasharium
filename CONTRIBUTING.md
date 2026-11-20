# Contributing to Hasharium

**Identities, given form.** Hasharium is a browser-based cabinet of deterministic shapes generated from decentralised identifiers: a DID is hashed with SHA-256, and a versioned renderer maps the digest into symmetry, layers, palette, material, temperament, name, and SVG geometry. Intended production home: [hasharium.croft.click](https://hasharium.croft.click). Thanks for wanting to help!

## Getting started

Use Node.js 22 or newer and pnpm:

```sh
pnpm install
pnpm dev
```

The development OAuth client uses the AT Protocol loopback convention and redirects to `http://127.0.0.1:5173/profile`. **Keep Vite on port 5173** when exercising the OAuth flow; production uses the discoverable metadata at `/oauth-client-metadata.json`.

Quality gates, from the README:

```sh
pnpm format
pnpm lint
pnpm check
pnpm test
pnpm build
```

## Notes for this project

- **Determinism is the concept.** The same DID and renderer version must always produce the same specimen. New renderers get a new version number; existing versions never change their output.
- Renderer versions (v1-v4 in `src/lib/shape.ts`) stay available for back-compat; don't "fix" old renderers.
- Signed-out paths must stay private to the device; signed-in collection changes complete only after the visitor's PDS confirms them. Don't add write paths that bypass that confirmation.
- The lexicons live under `click.croft.hasharium.*`; record-shape changes should update the lexicons alongside the code.
- Accessibility and honesty about feature status matter here: don't present unfinished corners as working.

## Before opening a PR

- All five quality gates pass.
- Conventional commits; focused PRs; describe how you verified, including the OAuth port note if you touched auth.
- AI-assisted PRs welcome; stand behind every line and run the gates yourself.

## Licence

See [LICENSE](LICENSE). Contributions accepted under the same terms.
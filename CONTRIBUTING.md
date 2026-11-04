# Contributing to scandible

## Setup

Requires Node 24 (the version in `.nvmrc`).

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm test         # svelte-check + Vitest suite (jsdom)
npm run lint     # Prettier check + ESLint
npm run build    # production build to dist/
npm run preview  # serve the production build locally
npm run gs1-ais  # regenerate src/lib/gs1-ais.json from the pinned GS1 Syntax Dictionary
```

## Stack

- **SvelteKit** and **Svelte 5** (static-adapter SPA, TypeScript)
- **JsBarcode** for the 21 linear formats (inline SVG)
- **bwip-js** 4.11.4 for the 2D and GS1 formats (inline SVG)
- **Vitest** and **@testing-library/svelte** (jsdom) for the unit tests

## Deployment

Every push to `main` runs the lint, tests and build in GitHub Actions
(`.github/workflows/deploy.yml`) and publishes `dist/` to GitHub Pages with
`actions/deploy-pages`. Production builds set SvelteKit's `paths.base` to `'/scandible'` for the
project-site subpath, adapter-static emits the site to `dist/`, and the repository's Pages source
is set to **GitHub Actions**.

## Documentation

- [README.md](README.md) is the front page for QA readers: what scandible does, what it can test, a
  quick start and the format list. Keep it short.
- [docs/guide.md](docs/guide.md) holds the full reference. Put new behavior, limits and settings
  there, and link to it from the README's "What you can test" table when a feature opens a new kind
  of test.

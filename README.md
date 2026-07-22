# scandible

**▶ Live app: https://nzneit.github.io/scandible/**

scandible turns a list of codes into barcodes stacked in a vertical column and scrolls
them continuously past the screen at an adjustable speed — so a **physical barcode scanner**
can read each one off the display in sequence.

## Why

Feeding a hardware scanner a long list of codes by hand is tedious. scandible renders each
code as a crisp, high-contrast barcode in your chosen format and auto-scrolls them through a scan zone
one at a time, so you can point a scanner at the screen and let it read the whole list.

## Features

- **Three ways to enter codes** — paste into a textarea, upload a `.txt`/`.csv` file, or
  pass them in the URL.
- **21 barcode formats** — every format JsBarcode documents (CODE128 incl. force modes,
  EAN/UPC family, CODE39, CODE93, ITF, MSI variants, Pharmacode, Codabar), selected per
  list; unrenderable codes are flagged and skipped, and the list shows the exact value your
  scanner will read when the encoder adds check digits or normalizes input.
- **Continuous smooth scroll** — GPU-composited motion with a live speed control
  (10–5000 px/s).
- **Loop or finish** — loop seamlessly, or run once and show a
  _"Finished scrolling N barcodes in X seconds"_ summary.
- **Shareable links** — copy a URL that reproduces the exact list and settings.
- **Distraction-free playback** — fullscreen column with an auto-hiding control overlay
  (play/pause, speed, restart, back).

## Using it

1. Open **https://nzneit.github.io/scandible/**.
2. Pick a barcode format, then paste or upload your codes (one per line, or
   comma-separated). Invalid entries are flagged.
3. Set the scroll speed and whether to loop, then press **Start**.
4. Point your scanner at the centered barcodes as they scroll by. Lower the speed if the
   scanner needs more time to lock on.

## Development

Requires Node 20+.

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm test         # svelte-check + Vitest suite (jsdom)
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Deployment

Deployed to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`): every push to
`main` runs the tests, builds, and publishes `dist/` with `actions/deploy-pages`.
SvelteKit's `paths.base` is `'/scandible'` in production builds for the project-site
subpath, adapter-static emits the site to `dist/`, and the repo's Pages source is set to
**GitHub Actions**.

## Tech stack

- **SvelteKit** + **Svelte 5** (static-adapter SPA, TypeScript)
- **JsBarcode** for barcode rendering (inline SVG)
- **Vitest** + **@testing-library/svelte** (jsdom) for unit tests

## License

[MIT](LICENSE) © Nathan Neitman

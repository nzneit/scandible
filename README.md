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
- **25 barcode formats** — the 21 linear formats JsBarcode documents (CODE128 incl. force
  modes, EAN/UPC family, CODE39, CODE93, ITF, MSI variants, Pharmacode, Codabar) plus four 2D
  formats: QR Code, Data Matrix, PDF417 and Aztec. Selected per list; unrenderable codes are
  flagged and skipped, and the list shows the exact value your scanner will read when the
  encoder adds check digits or normalizes input. 2D rows show the symbol size, the byte count
  and whether the symbol is dense.
- **Error correction** — for QR Code, PDF417 and Aztec, an **Error correction** select sets
  the level for the whole list, and codes too long for that level are flagged.
- **Continuous smooth scroll** — GPU-composited motion with a live speed control
  (10–5000 px/s).
- **Loop or finish** — loop seamlessly, or run once and show a
  _"Finished scrolling N barcodes in X seconds"_ summary.
- **Shareable links** — copy a URL that reproduces the exact list and settings. The link can
  also be shown as a QR code; a level select (L, M, Q, H) sets the share QR's error
  correction, and a status line says when the link makes a dense QR or is too long for one,
  and why. Links keep the list in the URL fragment (`#codes=…`), so long lists are never
  refused by the server, and older `?codes=` links keep working.
- **Distraction-free playback** — fullscreen column with an auto-hiding control overlay
  (play/pause, speed, restart, back).

## Using it

1. Open **https://nzneit.github.io/scandible/**.
2. Pick a barcode format, then paste or upload your codes (one per line, or
   comma-separated for numeric formats such as UPC and EAN; 2D and other text formats are one
   per line, and commas are part of the code). For QR Code, PDF417 and Aztec, choose an
   error-correction level or keep the default. Invalid entries are flagged.
3. Set the scroll speed and whether to loop, then press **Start**.
4. Point your scanner at the centered barcodes as they scroll by. Lower the speed if the
   scanner needs more time to lock on.

### Scanning 2D symbols

- A 2D area imager is required.
- Enable the scanner's screen or mobile-display read mode if it has one.
- Start at 60 px/s and use the browser's full screen for dense symbols.
- Non-ASCII text is encoded as UTF-8 without an ECI marker, so scanners that assume Latin-1
  show it garbled.
- 2D symbols carry no caption, so count misses against the list.

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
- **JsBarcode** for the 21 linear formats (inline SVG)
- **bwip-js** 4.11.4 for QR Code, Data Matrix, PDF417 and Aztec (inline SVG)
- **Vitest** + **@testing-library/svelte** (jsdom) for unit tests

## License

[MIT](LICENSE) © Nathan Neitman

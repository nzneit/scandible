# scandible

**▶ Live app: https://nzneit.github.io/scandible/**

scandible turns a list of codes into barcodes and plays them to the screen, either scrolling
continuously at an adjustable speed or one still code at a time for a set dwell — so a
**physical barcode scanner** can read each one off the display in sequence.

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
- **Scroll or Step playback** — GPU-composited scrolling with a live speed control
  (10–5000 px/s), or one code at a time for a set dwell (0.05–5 s) with an optional blank
  gap, both adjustable live.
- **Loop or finish** — loop seamlessly, or run once and show a
  _"Finished scrolling N barcodes in X seconds"_ summary, or in Step mode a summary with the
  dwell, gap, playback time and display rate.
- **Shareable links** — copy a URL that reproduces the exact list and settings. The link can
  also be shown as a QR code; a level select (L, M, Q, H) sets the share QR's error
  correction, and a status line says when the link makes a dense QR or is too long for one,
  and why. Links keep the list in the URL fragment (`#codes=…`), so long lists are never
  refused by the server, and older `?codes=` links keep working. Step links add `mode=step`,
  plus `dwell` and `gap` in milliseconds when they differ from 1000 and 0.
- **Distraction-free playback** — fullscreen column with an auto-hiding control overlay
  (play/pause, speed or dwell and gap, prev and next in Step, restart, back).

## Using it

1. Open **https://nzneit.github.io/scandible/**.
2. Pick a barcode format, then paste or upload your codes (one per line, or
   comma-separated for numeric formats such as UPC and EAN; 2D and other text formats are one
   per line, and commas are part of the code). For QR Code, PDF417 and Aztec, choose an
   error-correction level or keep the default. Invalid entries are flagged.
3. Set the scroll speed, or choose **Step** and set the dwell, and whether to loop, then press
   **Start**.
4. Point your scanner at the centered barcodes. Lower the speed, or raise the dwell, if the
   scanner needs more time to lock on.

### Playback modes

The **Playback** select chooses how codes reach the scanner. **Scroll** moves the column past the
screen at the set speed. **Step** shows one code at a time, still and centered, for the **Dwell**
time, then replaces it with the next; **Gap** blanks the screen between codes, and at 0.00 s the
next code appears instantly. Use Step to test throughput, for 2D symbols and phone cameras, and
whenever a scanner misses codes in motion; use Scroll for a long list read by a scanner that
tolerates motion.

Dwell and gap are set in seconds, by slider or by typing into the field beside it, before Start
or live from the overlay. A step run opens paused on the first code: press **Play** or Space when
the scanner is ready. **Prev** and **Next** (or ← and →) step by hand, and the line in the
top-left corner always shows the code number, dwell and gap. To find the fastest rate your
scanner keeps up with, turn Loop on, lower the dwell until the scanner starts missing codes, and
read the dwell off the corner line. Then run the list once with Loop off at that dwell: the finish
summary records the dwell and gap (and says if they changed during the run), the time on the
playback clock, which expects about codes × dwell + (codes − 1) × gap, and the display's frame
rate. The screen shows each code for whole display frames, so a dwell is rounded up to the next
frame (at 60 Hz, 0.06 s runs as 0.067 s). Paused time and time in a hidden tab are not counted,
and a frame over 0.1 s counts as 0.1 s and is reported in the summary. The counter counts valid
codes only.

In presentation (hands-free) mode many scanners ignore a code they have just read until a short
timeout ends, often called the reread delay. If neighboring codes are identical, set a gap longer
than that delay or lower the delay in the scanner's settings; the setup page warns when neighbors
match. What a scanner does with one code left on screen differs by model: some read it once, some
read it again after the delay. Dwells under 0.33 s flash the screen more than three times a
second. Do not use them near anyone sensitive to flashing lights.

### Scanning 2D symbols

- A 2D area imager is required.
- Enable the scanner's screen or mobile-display read mode if it has one.
- Start at 60 px/s, or use Step at a 1 s dwell, and use the browser's full screen for
  dense symbols.
- Non-ASCII text is encoded as UTF-8 without an ECI marker, so scanners that assume Latin-1
  show it garbled.
- 2D symbols carry no caption, so count misses against the list.

## Development

Requires Node 24 (the version in `.nvmrc`).

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

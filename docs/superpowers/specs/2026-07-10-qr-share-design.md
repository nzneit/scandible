# QR-code share — design

## Goal

Let someone share a configured test run phone-to-phone: render the existing
share URL as a scannable QR code on the setup screen, so another person can
point their phone camera at it and open the run directly — no typing or
messaging a long link.

## Context

- The share URL is built in `src/setupView.ts` only when **Copy link** is
  clicked (not live): `location.origin + location.pathname + encodeShareUrl(codes, settings)`.
  The URL embeds every code plus all settings, so it grows with the code list.
- A `.url-warning` already appears when the URL exceeds 2000 chars.
- The app is a static, offline GitHub Pages site with no backend — so no
  server-side URL shortening is possible. URL length is encoded client-side.
- QR density grows with data length; a QR scanned off one phone screen by
  another phone needs to stay reasonably low-density, and QR has a hard
  capacity ceiling (~2,900 bytes) beyond which it cannot be encoded at all.
  This is the defining constraint and the feature degrades gracefully around it.

## Trigger and placement

The existing **Copy link** button gains a second job: it also renders the QR.
One click copies the URL to the clipboard (unchanged) **and** renders the QR
below the URL field. The button's visible text is relabeled from "Copy link" to
**"Share link"** (its `.copy-link` class is kept, so existing selectors and
tests are unaffected). No separate button, no live re-render on every keystroke.

## Long-URL policy — best-effort with warnings

- Normal / short URL → render the QR.
- Dense-but-valid URL → render the QR **and** show a warning that it may be
  hard to scan and to hold steady or use the copied link.
- URL exceeds QR capacity → do **not** render a broken/oversized code; show a
  fallback message telling the user to share the copied link instead.

Small lists are never blocked; large lists degrade honestly.

## Library

Add **`uqr`** (https://github.com/unjs/uqr) — a zero-dependency, TypeScript-native,
ESM-first QR generator. It provides `encode(text, { ecc })` (returns the module
matrix, selected `version`, and `size`, with automatic version selection) and
`renderSVG(text, options)` (returns an SVG string). Being TS-native, it needs no
`@types` package. This matches the project's deliberate minimalism (jsbarcode is
currently the only runtime dependency).

## `src/qr.ts` (new — pure, synchronous)

A single pure function wrapping `uqr`, unit-testable without the DOM:

```ts
import { encode, renderSVG } from 'uqr';

const QR_DENSE_VERSION = 20; // tunable; higher version = denser = harder to scan phone-to-phone

export type QrResult = { ok: true; svg: string; dense: boolean } | { ok: false; tooLong: true };

export function buildQrSvg(text: string): QrResult {
	try {
		const { version } = encode(text, { ecc: 'M' }); // ecc M = robust against screen glare
		const svg = renderSVG(text, { ecc: 'M', border: 2 }); // border 2 = quiet zone; default white background
		return { ok: true, svg, dense: version > QR_DENSE_VERSION };
	} catch {
		return { ok: false, tooLong: true }; // over-capacity → fallback, no broken code
	}
}
```

- `encode` yields the selected `version` (drives the `dense` flag) and is where
  an over-capacity input surfaces. `renderSVG` produces the scannable SVG with a
  white background and a 2-module quiet zone. Both calls use `ecc: 'M'` so the
  version measured and the SVG rendered agree.
- Error-correction level **M** balances capacity against robustness to screen
  glare — the dominant risk when scanning a phone screen.
- Deterministic: same text → same result, so it unit-tests cleanly.

**Implementation note:** the first implementation step verifies `uqr`'s
over-capacity behavior (throws vs. returns a sentinel) under Vite + jsdom, and
adjusts the guard if `uqr` signals capacity differently than assumed here.

## `src/setupView.ts`

Below the `.share-url` input, add two elements, both empty/hidden initially:

- `.qr-code` — container the SVG is injected into.
- `.qr-status` — a single message line for the dense warning or the too-long
  fallback.

Change the `.copy-link` button's visible text to **"Share link"** (keep the
class). Extend its existing click handler: after building `url` and copying it
(both unchanged), call
`buildQrSvg(url)` and update the DOM:

- `ok` → set `.qr-code` innerHTML to `svg` and show it; if `dense`, set
  `.qr-status` to the dense warning, else clear `.qr-status`.
- `tooLong` → clear and hide `.qr-code`; set `.qr-status` to the too-long
  fallback message.

The existing clipboard write and the `.url-warning` (>2000 chars) behavior are
untouched — `.url-warning` and `.qr-status` are independent signals.

Exact copy:

- Dense warning: `QR is dense — hold the phone steady, or use the copied link.`
- Too-long fallback: `Too many codes for a QR — share the copied link instead.`

## `src/styles.css`

- `.qr-code` — white background, small padding, `max-width: 240px`; nested
  `svg { width: 100%; height: auto; display: block; }`. Hidden when empty.
- `.qr-status` — warning-styled text (consistent with existing warning copy).
  Hidden when empty.

## Testing

`src/qr.test.ts` (pure, no DOM):

- Short text → `{ ok: true, dense: false }`, and `svg` is a well-formed string
  containing `<svg` and QR module markup (e.g. a `<path` or `<rect`).
- A long-but-valid text (enough to push the selected version past
  `QR_DENSE_VERSION`) → `{ ok: true, dense: true }`.
- An oversized text (thousands of chars, beyond QR capacity) →
  `{ ok: false, tooLong: true }`.
- Determinism: same text → identical `svg`.

`src/setupView.test.ts` (jsdom):

- Clicking **Share link** (the `.copy-link` button) injects an `<svg>` into `.qr-code`.
- A long code list surfaces the dense warning text in `.qr-status`.
- An over-capacity code list shows the too-long fallback in `.qr-status` and
  renders no SVG in `.qr-code`.
- Existing behavior still passes: URL still copied into `.share-url`, and the
  `.url-warning` long-URL cases are unchanged.

## Scope

- Setup screen only — sharing is a pre-run concept; no QR on the play screen.
- No URL shortening or code-list compression (static site, no backend). If QR
  density becomes a real problem for large lists, compressing the encoded codes
  is a separate future optimization, out of scope here.
- No QR _scanning_ in-app; decoding is handled by the other phone's native
  camera app.

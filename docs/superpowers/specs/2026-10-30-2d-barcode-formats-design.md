# 2D barcode formats (QR Code, Data Matrix, PDF417, Aztec) — Design

**Date:** 2026-10-30
**Status:** Approved design, pre-implementation. Spec 1 of a three-spec series (see _Series_).
**Research:** [`docs/research/2026-10-29-2d-barcode-encoder-evaluation.md`](../../research/2026-10-29-2d-barcode-encoder-evaluation.md)
and its measurements file decide the encoder and supply every fixture value quoted below.

## Goal

Let a list be rendered as any of four two-dimensional symbologies — QR Code, Data Matrix,
PDF417, Aztec — through the same paste, validate, share, play flow the 21 linear formats
use today. A 2D imager must be able to read each symbol off the scrolling column. The user
must see, per code, whether it fits the symbol and how dense it will be, and must be told
plainly when the share link no longer fits a QR code and why.

## Series

The brainstorm decomposed the work into three specs, each with its own plan, in this order:

1. **This spec — 2D formats.** New encoder, four symbologies, registry generalised past
   JsBarcode, per-entry facts, list-level error correction, share state moved to the URL
   fragment, live share-QR status.
2. **Step-and-dwell playback.** A playback mode in which each code sits still for a set
   number of seconds, then the column jumps to the next. Selectable for any format.
   Independent of symbology; nothing in this spec depends on it.
3. **Structured editor.** An opt-in editor with one entry per row, where each entry may
   carry its own format and its own symbology options, including error correction. It
   brings multi-line payloads and a tagged record format in the URL. The textarea stays the
   default so 1D users see nothing new.

This spec builds three seams for spec 3 and otherwise leaves it alone:

- **Entries carry what rendering needs.** `CodeEntry` gains `format` and resolved `options`;
  the scroller and the validation list read those from the entry and never consult the
  settings object.
- **Option resolution has three layers from day one:** entry override, then list-level
  setting, then descriptor default. The override argument exists and is never populated here.
- **The URL codec stays list-level.** `codes`, `fmt` and the new `ecc` param describe one
  format for the whole list. Spec 3 adds a tagged-record param beside them; the decoder will
  accept both. Nothing here changes the record separator.

## Decisions

- **Encoder: bwip-js 4.11.x, tree-shaken to four named encoders, pinned to an exact
  version.** The research note evaluated bwip-js, zxing-wasm, rxing-wasm, @zxing/library,
  two zint wasm packages and single-symbology assemblies. bwip-js is the only candidate that
  renders all four symbologies synchronously from a working browser bundle (91 KB gzipped
  for the four encoders) with no network use. Rationale and rejected alternatives are in the
  research note; this spec does not restate them.
- **JsBarcode stays for the 21 linear formats. uqr stays for the share-link QR.** Replacing
  JsBarcode with bwip-js is feasible later but changes accepted input (lowercase CODE39,
  bare Codabar) and is a separate future spec.
- **One payload per line, as today.** 2D formats are text formats: newline split only,
  commas are data, newlines inside a payload are not expressible. Multi-line payloads are
  spec 3.
- **One format per list in textarea mode, as the July formats spec decided.** Spec 3
  deliberately reverses this for structured mode only.
- **Error correction: two honest controls.** A list-level setting whose choices and default
  come from the selected format's descriptor, carried in the URL and applied to rendering
  and validation; and a separate, session-only level selector for the share QR that drives
  the capacity number in the too-long message. Per-entry overrides are spec 3.
- **Share state moves from the query string to the URL fragment.** GitHub Pages returns 414
  once the query string passes about 8 KB (measured on the live site: 8,100 characters
  served, 9,000 refused). A fragment never reaches the server (a 64 KB fragment was served).
  The decoder keeps reading legacy query strings, so every link ever issued keeps working.
- **No URL compression.** Measured deflate ratios (12–57 % of URL-encoded size depending on
  entropy) are recorded in the brainstorm for a future spec. Decoding would be async and URLs
  would become opaque; not now.
- **Data Matrix is square**, bwip-js's default. No shape option. PDF417 columns and rows are
  automatic. GS1/FNC1 variants are out of scope.
- **No caption under 2D symbols.** Payloads can be long; the validation list already shows
  them.
- **Density is a per-descriptor threshold in module columns**, the same spirit as the share
  QR's existing `dense` flag.

## The registry — `src/lib/formats.ts`

`FormatDescriptor` becomes a discriminated union on `engine`. Descriptors stay data; the
engine adapters hold the behaviour.

```ts
export type FormatId =
	| 'code128' // … the 21 existing ids, unchanged …
	| 'code93'
	| 'qr'
	| 'datamatrix'
	| 'pdf417'
	| 'aztec';

export interface EccChoice {
	value: string; // stored in Settings.ecc and the `ecc` URL param
	label: string; // <option> text AND the validation-row suffix: "too long for QR Code at <label>"
}

export interface EccOption {
	choices: readonly EccChoice[];
	defaultValue: string; // one of choices[].value
	toBwipOptions: (value: string) => Record<string, unknown>; // e.g. { eclevel: 'H' }
}

interface DescriptorBase {
	id: FormatId;
	label: string; // dropdown text
	group: string; // optgroup label
	numeric: boolean; // true → comma-split + whitespace-strip cleanup default
	normalize?: (token: string) => string;
}

export interface JsBarcodeDescriptor extends DescriptorBase {
	engine: 'jsbarcode';
	jsbarcodeFormat: string; // key in JsBarcode's internal registry (unchanged)
	renderOptions?: () => Record<string, unknown>;
}

export interface BwipDescriptor extends DescriptorBase {
	engine: 'bwipjs';
	bcid: 'qrcode' | 'datamatrix' | 'pdf417' | 'azteccode';
	modulePx: { x: number; y: number }; // px per module at scale 1 (from the BWIPP source)
	denseAbove: number; // module columns above which facts.dense is true
	ecc?: EccOption; // present only when the symbology offers a choice
}

export type FormatDescriptor = JsBarcodeDescriptor | BwipDescriptor;
```

The 21 existing rows gain `engine: 'jsbarcode'` and are otherwise byte-identical. Four new
rows form a seventh group, **2D**, after _Other_:

| id           | bcid         | label         | numeric | modulePx     | denseAbove | ecc choices (value → label)                                                        | default |
| ------------ | ------------ | ------------- | ------- | ------------ | ---------- | ---------------------------------------------------------------------------------- | ------- |
| `qr`         | `qrcode`     | `QR Code`     | false   | `{x:2, y:2}` | 100        | `L`→`level L`, `M`→`level M`, `Q`→`level Q`, `H`→`level H`                         | `M`     |
| `datamatrix` | `datamatrix` | `Data Matrix` | false   | `{x:2, y:2}` | 100        | — (ECC200 is fixed)                                                                | —       |
| `pdf417`     | `pdf417`     | `PDF417`      | false   | `{x:1, y:3}` | 200        | `auto`→`automatic level`, `0`→`level 0` … `8`→`level 8`                            | `auto`  |
| `aztec`      | `azteccode`  | `Aztec`       | false   | `{x:2, y:2}` | 100        | `10`→`10% recovery`, `23`→`23% recovery`, `36`→`36% recovery`, `50`→`50% recovery` | `23`    |

`toBwipOptions`: QR `{ eclevel: value }`; Aztec `{ eclevel: Number(value) }`; PDF417 `{}` for
`auto`, else `{ eclevel: Number(value) }`.

`modulePx` comes from BWIPP's renderers: the matrix encoders set `modunit 2` (2 pt per module,
1 pt = 1 px at scale 1), PDF417 sets `modunit 1` across and `rowmult 3` down. The registry
integrity test pins these against known symbols (see _Testing_).

`FORMAT_GROUPS` renders seven optgroups. `isFormatId` is unchanged. A helper
`isEccChoice(descriptor, value): boolean` returns true only when the descriptor has `ecc` and
`value` is one of its choice values.

**bwip-js import path and types.** Import from the `bwip-js/browser` subpath, whose export
entry carries its own `types`, so no `customConditions` is needed in `tsconfig.json`. The
named `raw` export is **not** the raw-data API (it is BWIPP's "raw" symbology; the types are
wrong) and must not be used. Symbology-specific options (`eclevel`, `padding`, …) are untyped
in bwip-js; the adapter builds them in a `Record<string, unknown>` and spreads it, which
compiles, where an object literal would fail the excess-property check. `bcid` is required by
the `RenderOptions` type and ignored at runtime by the named encoders; pass it anyway.

## Engines — `src/lib/engines/`

One interface, two adapters, dispatch on `descriptor.engine`.

```ts
// src/lib/engines/types.ts
export type CheckResult =
	{ valid: true; encoded?: string; facts?: SymbolFacts } | { valid: false; reason?: 'too-long' };
```

- **`src/lib/engines/jsbarcode.ts`** — `check(descriptor, value)` and `render(descriptor, value)`
  are today's `checkCode` body (encoder classes from `jsbarcode/bin/barcodes`, `encoded`
  transparency, CODE128 sentinel fallback) and today's `renderBarcodeSvg` body, moved
  verbatim. Returns no `facts`.
- **`src/lib/engines/bwipjs.ts`:**

```ts
import { qrcode, datamatrix, pdf417, azteccode, drawingSVG } from 'bwip-js/browser';

const ENCODERS = { qrcode, datamatrix, pdf417, azteccode } as const;
const QUIET_ZONE_PX = 8; // 4 modules at 2 px/module for matrix codes; ≥ 2 X-modules for PDF417
const NATURAL_PX = 1024; // longer side of the SVG's natural size; CSS max-* only ever shrink it
const TOO_LONG = new Set([
	'qrcodeNoValidSymbol',
	'datamatrixTooMuchData',
	'pdf417inputTooLong',
	'azteccodeInputTooLong'
]);

/** One encode. `init(width, height, …)` on the drawing receives the symbol's pixel size
 *  WITHOUT padding (measured), so module counts are width/modulePx.x and height/modulePx.y.
 *  Spreading drawingSVG() and overriding init is the measured, tree-shake-friendly way to
 *  learn the size; the default export's raw() would pull in every encoder. */
function encode(d: BwipDescriptor, value: string, options: SymbolOptions) {
	let w = 0;
	let h = 0;
	const base = drawingSVG();
	const drawing = {
		...base,
		init(W: number, H: number, ...rest: unknown[]) {
			w = W;
			h = H;
			return base.init(W, H, ...rest);
		}
	};
	const extra: Record<string, unknown> =
		d.ecc && options.ecc !== undefined ? d.ecc.toBwipOptions(options.ecc) : {};
	const svg = ENCODERS[d.bcid](
		{ bcid: d.bcid, text: value, scale: 1, padding: QUIET_ZONE_PX, includetext: false, ...extra },
		drawing
	);
	return { svg, cols: w / d.modulePx.x, rows: h / d.modulePx.y };
}

export function check(d: BwipDescriptor, value: string, options: SymbolOptions): CheckResult {
	try {
		const { cols, rows } = encode(d, value, options);
		const bytes = new TextEncoder().encode(value).length;
		return { valid: true, facts: { bytes, cols, rows, dense: cols > d.denseAbove } };
	} catch (e) {
		// Stable part of a BWIPP error is `bwipp.<errorName>`; the `#NNNNN` suffix is a source
		// line number that changes between bwip-js versions. Anything else is plain invalid.
		const name = /^bwipp\.([A-Za-z0-9]+)/.exec(e instanceof Error ? e.message : '')?.[1];
		return name && TOO_LONG.has(name) ? { valid: false, reason: 'too-long' } : { valid: false };
	}
}

export function render(d: BwipDescriptor, value: string, options: SymbolOptions): SVGElement {
	const { svg } = encode(d, value, options);
	const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
	const el = document.importNode(doc.documentElement, true) as unknown as SVGElement;
	const [vw, vh] = (el.getAttribute('viewBox') ?? '0 0 1 1').split(' ').slice(2).map(Number);
	const k = NATURAL_PX / Math.max(vw, vh);
	el.setAttribute('width', String(Math.round(vw * k)));
	el.setAttribute('height', String(Math.round(vh * k)));
	return el;
}
```

Notes pinned by tests: bwip-js throws synchronously and never returns an error; empty input
throws a `ReferenceError` but is unreachable (drop-empties runs first); non-ASCII is UTF-8
encoded with no ECI (known behaviour, out of scope to change); newlines inside a value encode
fine but cannot arise from the textarea.

## Entries, options and facts — `src/lib/types.ts`, `src/lib/codes.ts`

```ts
export interface SymbolOptions {
	ecc?: string; // present only for formats whose descriptor declares `ecc`
}

export interface SymbolFacts {
	bytes: number; // UTF-8 byte length of `value`
	cols: number; // symbol width in modules (PDF417: X-modules)
	rows: number; // symbol height in modules (PDF417: rows)
	dense: boolean; // cols > descriptor.denseAbove
}

export interface CodeEntry {
	raw: string;
	value: string;
	format: FormatId; // NEW — the format this entry validates and renders with
	options: SymbolOptions; // NEW — resolved: override → list setting → descriptor default
	valid: boolean;
	encoded?: string; // 1D only, unchanged
	facts?: SymbolFacts; // 2D only, present when valid
	reason?: 'too-long'; // present when invalid because the payload exceeds symbol capacity
}

export interface Settings {
	/* existing fields unchanged */
	ecc: string; // list-level error-correction choice value; '' = the format's default
}
// DEFAULT_SETTINGS.ecc = ''
```

```ts
// codes.ts
export function resolveOptions(
	descriptor: FormatDescriptor,
	listEcc: string,
	override?: SymbolOptions
): SymbolOptions;
// no descriptor.ecc → {}. Otherwise ecc = first of [override?.ecc, listEcc, defaultValue]
// that isEccChoice() accepts.

export function checkCode(
	value: string,
	format: FormatId,
	options: SymbolOptions = {}
): CheckResult;
// unknown format or '' → { valid: false } (existing guards); then dispatch on engine.

export function buildEntry(
	token: string,
	format: FormatId,
	listEcc: string,
	override?: SymbolOptions
): CodeEntry; // the seam spec 3 calls per row; parseCodeList calls it per token

export function parseCodeList(raw: string, format: FormatId, listEcc = ''): CodeEntry[];
// tokenize/clean exactly as today (2D rows are text formats), then buildEntry per token.
```

## Error correction setting

- **Settings and URL.** `Settings.ecc` defaults to `''`. `encodeShareUrl` appends `ecc=<value>`
  after `fmt` **only when non-empty**. `decodeShareUrl` resolves `fmt` first (falling back to
  `DEFAULT_FORMAT`), then accepts `ecc` only if `isEccChoice(descriptor, value)`; otherwise it
  emits no `ecc` key. Never throws.
- **Setup page.** `<select class="ecc-input">` labelled _Error correction_ renders directly
  under the Format select, `hidden` unless the selected descriptor has `ecc`. Options are the
  descriptor's choices in order, `<option value>` = `choice.value`, text = `choice.label`. The
  select displays `ecc === '' ? defaultValue : ecc`; on change it stores `''` when the chosen
  value equals the descriptor default, else the value. So `ecc` is canonical: it never holds
  the default explicitly, and a URL carries `ecc` only for a non-default choice. On a format
  change, if the current `ecc` is not a valid choice for the new format it resets to `''`.
- **Effect.** `ecc` is a field of the `$derived` settings object (so Start/Share URLs carry it
  and ShareLink's invalidation effect fires) and the third argument of `parseCodeList`, so it
  changes both rendering and the per-entry capacity verdict.
- **Share QR level** is separate; see _Share link_.

## Validation list — `src/lib/components/ValidationList.svelte`

Rows are a single expression so exact-`textContent` tests stay byte-stable. Separator is
`' · '` (U+00B7 with single spaces); the size glyph is `×` (U+00D7).

| condition                                        | text                                                   |
| ------------------------------------------------ | ------------------------------------------------------ |
| valid, no facts (1D), no mutation                | `${raw} ✓` (unchanged)                                 |
| valid, no facts (1D), `encoded !== value`        | `${raw} ✓ → ${encoded}` (unchanged)                    |
| valid, facts, not dense                          | `${raw} ✓ · ${cols}×${rows} · ${bytes} bytes`          |
| valid, facts, dense                              | `${raw} ✓ · ${cols}×${rows} · ${bytes} bytes · dense`  |
| invalid, `reason === 'too-long'`, format has ecc | `${raw} ✗ too long for ${label} at ${eccChoice.label}` |
| invalid, `reason === 'too-long'`, no ecc         | `${raw} ✗ too long for ${label}`                       |
| invalid otherwise                                | `${raw} ✗ invalid` (unchanged)                         |

`bytes` reads `1 byte` when exactly one. `label` is the descriptor label (`QR Code`,
`Data Matrix`, `PDF417`, `Aztec`); `eccChoice` is the choice whose value equals
`entry.options.ecc`. Examples: `hello world ✓ · 21×21 · 11 bytes`;
`xxxx… ✗ too long for QR Code at level H`; `xxxx… ✗ too long for Data Matrix`.

Below the list, `<p class="dense-hint">` with exactly
`Dense symbols may need a slower scroll or a shorter payload.` is shown when any entry has
`facts.dense`, otherwise `hidden`.

The arrow row never appears for 2D entries: the bwip-js adapter never sets `encoded`.

## Share state in the URL fragment — `src/lib/shareUrl.ts`

```ts
export function encodeShareUrl(codes: string[], settings: Settings): string; // '#' + params
export function decodeShareUrl(url: URL): { codes: string[]; settings: Partial<Settings> };
```

- `encodeShareUrl` builds the same `URLSearchParams` string as today, plus `ecc` when
  non-empty, and returns it with a leading `#` instead of `?`. Param names, order and values
  are otherwise unchanged.
- `decodeShareUrl` reads `url.hash.slice(1)` when the hash is non-empty, else
  `url.search.slice(1)`. Per-parameter leniency is unchanged. Legacy `?codes=…` links decode
  exactly as before.
- **Routes.** Both pages call `decodeShareUrl(page.url)`. Start, Back and Share link emit
  fragment URLs. The play page's no-valid-codes bounce preserves whichever form it received:
  `goto(resolve('/') + page.url.search + page.url.hash, { replaceState: true })`.
- **Removed.** `URL_WARN_LENGTH`, the `.url-warning` element and its copy
  ("Link is long; it may be truncated by some browsers.") are deleted, not reworded; the
  statement is false for fragments.
- No build or deployment change. GitHub Pages serves `play.html` regardless of fragment.

## Share link — `src/lib/qr.ts`, `src/lib/components/ShareLink.svelte`

```ts
export type QrEcc = 'L' | 'M' | 'Q' | 'H';
/** QR version 40, byte mode, per the QR specification. */
export const QR_CAPACITY_BYTES: Record<QrEcc, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };
export type QrStatus =
	{ kind: 'fits' } | { kind: 'dense' } | { kind: 'too-long'; length: number; capacity: number };
export function qrStatus(text: string, ecc: QrEcc): QrStatus; // uqr encode() in try/catch;
// dense when version > QR_DENSE_VERSION (20, unchanged); too-long when encode throws.
export function buildQrSvg(text: string, ecc: QrEcc = 'M'): QrResult; // existing, gains ecc
```

ShareLink:

- A `<select class="share-ecc-input">` with options L, M, Q, H (default `M`), component-local
  state, not in the URL, not persisted. Labelled _Share QR level_.
- The share URL is derived live: `location.origin + location.pathname + encodeShareUrl(codes, settings)`.
  `qrStatus(url, shareEcc)` drives `.qr-status`, which is now **live** (updates on every
  change to codes, settings or level) and is `hidden` when the status is `fits`.
- Clicking **Share link** still copies the URL and fills `.share-url`. It renders the QR
  (`buildQrSvg(url, shareEcc)`) only when the status is not `too-long`; otherwise `.qr-code`
  stays empty. The existing effect that clears a rendered QR on any change stays.
- Exact copy, numbers formatted with `new Intl.NumberFormat('en-US')`:
  - dense: `QR will be dense. Hold the phone steady, or use the copied link.`
  - too long: `Too long for a QR code: this link is ${length} characters and a QR at level ${ecc} holds about ${capacity}. The copied link still works. Shorten the list to share as a QR.`
    e.g. `Too long for a QR code: this link is 3,412 characters and a QR at level M holds about 2,331. The copied link still works. Shorten the list to share as a QR.`
- The old post-click messages (`QR is dense — …`, `Too many codes for a QR — …`) are replaced
  by the live status; there is one status line.

`length` is the share URL's character count; the URL is ASCII after encoding, so characters
equal bytes.

## Rendering 2D symbols in the column — `src/lib/barcode.ts`, `src/lib/scroller.ts`, `ScrollColumn.svelte`

- `renderBarcodeSvg(entry: CodeEntry): SVGElement` — signature loses the `format` argument;
  it looks up `entry.format` and dispatches on `engine`, passing `entry.options`. The scroller
  calls `renderBarcodeSvg(e)`.
- The scroller adds the class `barcode-item--2d` to `.barcode-item` when the entry's
  descriptor is a `bwipjs` row. Transforms (rotation, skew) apply exactly as today.
- CSS in `ScrollColumn.svelte`, alongside the existing rule:

```css
.scroll-column :global(.barcode-item--2d svg) {
	max-width: min(90vw, 640px);
	max-height: 60vh;
	width: auto;
	height: auto;
}
```

The adapter gives the SVG a natural size of 1024 px on its longer side, so the CSS max
constraints only shrink it, and a replaced element with an intrinsic ratio under two max
constraints keeps its aspect. On a 768 px tall viewport a square symbol renders at about
460 px and is fully in view for 40 % of the viewport's travel; a 25-module QR gets about
18 px per module. 1D items and the 40vh item padding are unchanged. The quiet zone is baked
into the SVG, so rotation never clips it; the white page supplies contrast (no background
fill in the SVG).

## Setup page, play page, README

- **Setup:** Format select gains the 2D optgroup. Placeholder for 2D formats is the existing
  text-format string (`Paste codes — one per line`). `entries` becomes
  `$derived(parseCodeList(text, format, ecc))`. Error correction select and share-level
  select as above. Start emits a fragment URL.
- **Play:** `decodeShareUrl(page.url)`; `parseCodeList(codes, settings.format, settings.ecc)`;
  Back emits a fragment URL; bounce preserves search and hash.
- **README:** "21 barcode formats" becomes 21 linear plus four 2D; document the Error
  correction select, the share-QR level and status, and that share links now use the URL
  fragment (old links keep working).

## Error handling

- Unknown or absent `fmt`, invalid `ecc`: decoder emits no key; defaults apply via the
  `DEFAULT_SETTINGS` spread. Silent, never throws.
- `checkCode` never throws for any engine. bwip-js errors are caught and classified;
  over-capacity → `reason: 'too-long'`, anything else → plain invalid.
- A descriptor whose `bcid` is missing from the bwip-js exports is a registry-integrity test
  failure, never a runtime surprise.
- Live share status never throws: `qrStatus` wraps uqr in try/catch.
- Scrolling with no valid entries still bounces to setup, format-aware as today.

## Testing

**Fixtures** come from the measurements file, at the pinned bwip-js version (BWIPP
2026-05-28):

| payload        | format             | ecc     | expected                                 |
| -------------- | ------------------ | ------- | ---------------------------------------- |
| `hello world`  | qr                 | M       | cols 21, rows 21, bytes 11               |
| `hello world`  | datamatrix         | —       | cols 16, rows 16                         |
| `hello world`  | aztec              | 23      | cols 19, rows 19                         |
| `hello world`  | pdf417             | auto    | cols 103, rows 8                         |
| `x` × 16       | qr                 | L/M/Q/H | cols 21 / 25 / 25 / 29                   |
| `héllo → 日本` | qr                 | M       | valid; bytes equals `TextEncoder` length |
| `x` × 5000     | qr, aztec          | default | invalid, `reason: 'too-long'`            |
| `x` × 3000     | datamatrix, pdf417 | default | invalid, `reason: 'too-long'`            |

- **`engines/bwipjs.test.ts`:** each fixture above; `render` returns an `svg` element with a
  `viewBox`, `width`/`height` attributes whose longer side is 1024, and no `<text>`; the
  error-name regex strips a `#NNNNN` suffix; the `drawingSVG` spread-and-override captures
  `init` (guards a bwip-js change to closure-free methods).
- **`engines/jsbarcode.test.ts`:** the moved `checkCode` matrix and `renderBarcodeSvg` cases,
  unchanged in substance.
- **QR cross-check against uqr:** for `hello world`, a 38-character URL, `x` × 100 and
  `1234567890` at each level, bwip-js's `cols` is never larger than uqr's `size` at
  `border: 0` and never below 21. (Exact equality is not required: the two implementations
  may pick different versions at level H; both are valid.)
- **SVG snapshots:** one Vitest snapshot per 2D format for `hello world` at defaults. Guards
  against upstream regressions such as the malformed `fill-rule` emitted by bwip-js 4.11.3.
- **`formats.test.ts`:** 25 unique ids; seven groups in order; every `bwipjs` row's `bcid`
  is a key of the adapter's encoder table; the two-directional JsBarcode check is unchanged
  (its exclusion list is unchanged); `modulePx` pinned by the `hello world` fixtures;
  `isEccChoice` accepts each declared value and rejects `''`, `'X'` and values from another
  format; `resolveOptions` returns `{}` for 1D and Data Matrix, and honours
  override → list → default with invalid layers skipped.
- **`codes.test.ts`:** `parseCodeList` stamps `format` and `options` on every entry;
  `ecc = 'H'` flips a payload that fits at `L` to `too-long`; 2D tokenisation is
  newline-only with commas kept.
- **`shareUrl.test.ts`:** encode starts with `#`; `ecc` appears after `fmt` only when
  non-empty; decode reads the fragment, falls back to the query string, prefers the fragment
  when both exist; `ecc=H&fmt=qr` round-trips, `ecc=H&fmt=upc` and `ecc=Z&fmt=qr` drop `ecc`.
- **`qr.test.ts`:** `qrStatus` returns `fits`, `dense`, `too-long` with `length` and
  `capacity` from the table; `buildQrSvg` honours `ecc`.
- **`ShareLink.test.ts`:** the three status texts, exact; changing the level select changes
  the capacity number; too-long click copies but renders no SVG; `.url-warning` cases removed.
- **`ValidationList.test.ts`:** every row shape in the table above, exact `textContent`;
  dense hint shown/hidden.
- **Route tests:** setup — selecting `qr` validates `hello world` with the facts row, shows the
  Error correction select, hides it for `upc` and `datamatrix`, resets `ecc` on an
  incompatible format switch, Start URL is `#codes=…&seed=0&fmt=qr` (no `ecc` at default)
  and `…&fmt=qr&ecc=H` when set. Play — a `qr` list renders `.barcode-item--2d` items;
  Back URL starts with `#`; a legacy `?codes=…` URL still plays.
- **Mechanical-edit inventory (the back-compat gate):** every `CodeEntry` fixture
  (`ValidationList.test.ts`, `scroller.test.ts`, `ScrollColumn.test.ts`, `barcode.test.ts`)
  gains `format` and `options: {}`; every inline `Settings` literal gains `ecc: ''`; exact
  Start/Back URL strings in `page.test.ts` and `play/page.test.ts` switch `?` to `#`;
  `renderBarcodeSvg` call sites drop the second argument; `decodeShareUrl` tests pass a
  `URL`. Plain 1D rows, UPC cleanup, scroll maths and transforms keep their existing tests
  green untouched.

## Verification that fails closed

These are human or browser steps the plan must schedule. Until each is done the feature is
recorded as **unverified**, never as passed:

1. **Scan each symbology off the running app** with the target 2D imager at the default
   speed, one payload each at default error correction, plus one dense QR. No encoder output
   was decoded during research.
2. **Check the 2D sizing in a real browser** (Chromium and Firefox): aspect preserved, symbol
   within both caps, no clipping of the quiet zone under maximum rotation and skew. jsdom
   does not lay out.
3. **`npm run check` passes with the `bwip-js/browser` import** — the measurements saw
   `TS2307` for the bare specifier without a custom condition; the subpath is expected to
   avoid it but svelte-check was not run.
4. `npm test` and `npm run lint` green.

## Out of scope

Step-and-dwell playback (spec 2). Structured editor, per-entry formats and option overrides,
multi-line payloads, record separator change (spec 3). URL compression (future spec; measured
ratios recorded). Replacing JsBarcode with bwip-js (future spec; needs an app-owned normaliser
with parity tests, see the research note). Data Matrix rectangular shape; PDF417 columns and
rows; GS1/FNC1 variants; Micro QR and rMQR; ECI selection for non-ASCII payloads; captions
under 2D symbols; automated decode round-trips (no in-tree rasteriser or decoder).

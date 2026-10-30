# 2D barcode formats (QR Code, Data Matrix, PDF417, Aztec) — Design

**Date:** 2026-10-30
**Status:** Approved design, pre-implementation. Spec 1 of a three-spec series (see _Series_).
Hardened by a five-lens review (codebase fit, adapter verification against the pinned bwip-js,
ambiguity and testability, forward compatibility and URL state, scanning domain and UX).
**Research:** [`docs/research/2026-10-29-2d-barcode-encoder-evaluation.md`](../../research/2026-10-29-2d-barcode-encoder-evaluation.md)
decides the encoder. [`docs/research/2026-10-29-2d-barcode-encoder-measurements.md`](../../research/2026-10-29-2d-barcode-encoder-measurements.md)
("the measurements file") supplies every fixture value quoted below.

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
   Independent of symbology; nothing in this spec depends on it. Items now vary in height,
   so spec 2 measures them, which it would do anyway.
3. **Structured editor.** An opt-in editor with one entry per row, where each entry may
   carry its own format and its own symbology options, including error correction. It
   brings multi-line payloads and a tagged record param in the URL. The textarea stays the
   default so 1D users see nothing new.

This spec builds these seams for spec 3 and otherwise leaves it alone:

- **Entries carry what rendering needs.** `CodeEntry` gains `format` and resolved `options`.
  The scroller and the validation list never read `settings.format` or `settings.ecc`; they
  read the entry. (The scroller still reads speed, loop and the transform settings.)
- **Option resolution has three layers from day one:** entry override, then list-level
  setting, then descriptor default. The override argument exists and is never populated here.
  The list-level setting applies only to entries whose format equals the list format, so a
  future symbology with overlapping choice values can never inherit another format's level.
- **`buildEntry` is the per-row entry point.** It owns cleanup, resolution and validation
  for one token; `parseCodeList` only splits and delegates.
- **URLs are never rebuilt from entries.** Start, Back and Share link encode the decoded
  share state (plus live settings), not `CodeEntry`, which is a derived view. ShareLink takes
  the already-encoded fragment, not the code list, so spec 3's tagged records change one
  encoder and nothing else.
- **The URL codec stays list-level and grows additively.** `codes`, `fmt` and the new `ecc`
  describe one format for the whole list. Spec 3 adds a tagged-record param beside them and
  a `records` field on the decoder's result; the decoder will accept both. Nothing here
  changes the record separator.

## Decisions

- **Encoder: bwip-js 4.11.4, tree-shaken to four named encoders, pinned exactly.**
  `package.json` lists `"bwip-js": "4.11.4"` with no range operator (unlike the other
  entries). The research note evaluated bwip-js, zxing-wasm, rxing-wasm, @zxing/library, two
  zint wasm packages and single-symbology assemblies; bwip-js is the only candidate that
  renders all four symbologies synchronously from a working browser bundle (route chunk
  92 KB gzipped in a SvelteKit production build) with no network use. Rationale and rejected
  alternatives are in the research note.
- **JsBarcode stays for the 21 linear formats. uqr stays for the share-link QR.** Replacing
  JsBarcode with bwip-js changes accepted input (lowercase CODE39, bare Codabar) and is a
  separate future spec.
- **One payload per line, as today.** 2D formats are text formats: newline split only,
  commas are data, newlines inside a payload are not expressible. Multi-line payloads are
  spec 3.
- **One format per list in textarea mode,** as the July formats spec decided. Spec 3
  deliberately reverses this for structured mode only.
- **Error correction: two honest controls.** A list-level setting whose choices and default
  come from the selected format's descriptor, carried in the URL and applied to rendering
  and validation; and a separate, component-local level selector for the share QR that
  drives the capacity number in the too-long message. Per-entry overrides are spec 3.
- **The level the user picks is the level the symbol carries.** BWIPP otherwise raises a QR
  level when a higher one fits the same version, and raises or lowers a PDF417 level to fit
  the matrix. The adapter passes `fixedeclevel: true` for QR and for numeric PDF417 levels.
  PDF417 `automatic` is left to BWIPP: raising the level to fill the matrix is what automatic
  means.
- **Share state moves from the query string to the URL fragment.** GitHub Pages returns 414
  once the query string passes about 8 KB (measured: 8,100 characters served, 9,000 refused);
  a 64 KB fragment is served because fragments never leave the browser. The decoder keeps
  reading legacy query strings, so every link ever issued keeps working. No length cap and no
  length warning: Chrome accepts URLs to 2 MB and Firefox to 1,048,576 characters (sourced in
  the review); other apps may still mangle very long links, which the app cannot detect.
- **No URL compression.** Measured deflate ratios (12–57 % of URL-encoded size depending on
  entropy) are recorded here for a future spec. Decoding would be async and URLs opaque.
- **Data Matrix is square**, bwip-js's default. No shape option. PDF417 data-column and row
  counts are automatic. GS1/FNC1 variants are out of scope.
- **No caption under 2D symbols.** Payloads can be long; the validation list already shows
  them. Consequence for testers (no on-screen ordinal) is noted in the README.
- **Density is a per-descriptor threshold in module columns**, chosen so that a symbol at the
  threshold has about 3 or more screen pixels per module at the format's width cap on a
  640-px-class display. Same spirit as the share QR's existing `dense` flag.
- **Validation memoises encodes.** Every keystroke re-derives the whole list; without a cache
  a 100-line QR list costs about 260 ms per keystroke (measured, Node). The adapter caches
  encode results so a keystroke re-encodes only the edited line, and playback reuses the
  same cache.
- **Known limitation, recorded not mitigated:** on viewports narrower than about 560 px with
  rotation or skew near their 30° maximum, the corners of a 2D symbol can leave the viewport
  (`.play` is `overflow: hidden`). 1D symbols already clip slightly in the same conditions.
  Per-item distortion-aware caps are a possible follow-up.

## The registry — `src/lib/formats.ts`

`FormatDescriptor` becomes a discriminated union on `engine`. Descriptors stay data; the
engine adapters hold the behaviour. The file header's "data-only" statement and the test that
pins it ("defines no day-one behavior hooks") remain true.

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
	label: string; // short; used in the validation row: "too long for QR Code (level H)"
	note?: string; // appended to the <option> text in parentheses
}

export interface EccOption {
	choices: readonly EccChoice[];
	defaultValue: string; // one of choices[].value
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

The 21 existing rows gain `engine: 'jsbarcode'` and are otherwise unchanged apart from Prettier
reflow. Four new rows form a seventh group, **2D**, after _Other_:

| id           | bcid         | label         | modulePx     | denseAbove | ecc default |
| ------------ | ------------ | ------------- | ------------ | ---------- | ----------- |
| `qr`         | `qrcode`     | `QR Code`     | `{x:2, y:2}` | 100        | `M`         |
| `datamatrix` | `datamatrix` | `Data Matrix` | `{x:2, y:2}` | 100        | — (ECC 200) |
| `pdf417`     | `pdf417`     | `PDF417`      | `{x:1, y:3}` | 300        | `auto`      |
| `aztec`      | `azteccode`  | `Aztec`       | `{x:2, y:2}` | 100        | `23`        |

All four are `numeric: false`. Error-correction choices, in order:

| format | value → label (note)                                                                                                                               |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| qr     | `L` → `level L` (`~7% recovery`); `M` → `level M` (`~15% recovery, default`); `Q` → `level Q` (`~25% recovery`); `H` → `level H` (`~30% recovery`) |
| pdf417 | `auto` → `automatic level` (`recommended`); `0` → `level 0` (`detection only`); `1`…`8` → `level 1`…`level 8`                                      |
| aztec  | `10` → `≥10% error correction`; `23` → `≥23% error correction` (`default`); `36` → `≥36% error correction`; `50` → `≥50% error correction`         |

Aztec's number is the share of the symbol reserved for check codewords (ISO recommends 23 %);
actual recovery is roughly half of it, so the label says "error correction", not "recovery".

`modulePx` comes from BWIPP's renderers: the matrix encoders set `modunit 2` (2 pt per module,
1 pt = 1 px at scale 1); PDF417 sets `modunit 1` across and `rowmult 3` down. The fixtures pin
these.

`FORMAT_GROUPS` renders seven optgroups. `isFormatId` is unchanged. New helpers:

```ts
export function isEccChoice(d: FormatDescriptor, value: string): boolean; // d has ecc and value ∈ choices
export function eccChoice(d: FormatDescriptor, value: string): EccChoice | undefined;
```

**bwip-js import path and types.** Import from the `bwip-js/browser` subpath, whose export entry
carries its own `types`; verified to type-check under the project's generated tsconfig with no
`customConditions` (the bare `bwip-js` specifier does not). The named `raw` export is **not**
the raw-data API (it is BWIPP's "raw" symbology; its typing is wrong) and must not be used.
Symbology-specific options (`eclevel`, `fixedeclevel`, `columns`, `version`, `format`, …) are
untyped in bwip-js; `scale`, `padding` and `includetext` are typed. The adapter builds the
untyped ones in a `Record<string, unknown>` and spreads it, which compiles where an object
literal fails the excess-property check. `bcid` is required by the `RenderOptions` type and
ignored at runtime by the named encoders; pass it anyway.

## Engines — `src/lib/engines/`

Both adapters export the same two functions and `codes.ts` / `barcode.ts` switch on
`descriptor.engine`:

```ts
// src/lib/engines/types.ts
export type CheckResult =
	{ valid: true; encoded?: string; facts?: SymbolFacts } | { valid: false; reason?: 'too-long' };

export function check(d: FormatDescriptor, value: string, options: SymbolOptions): CheckResult;
export function render(d: FormatDescriptor, value: string, options: SymbolOptions): SVGElement;
```

- **`src/lib/engines/jsbarcode.ts`** — `check` and `render` are today's `checkCode` body
  (encoder classes from `jsbarcode/bin/barcodes`, `encoded` transparency, CODE128 sentinel
  fallback) and today's `renderBarcodeSvg` body, moved. They ignore `options` and return no
  `facts`. The empty-string guard stays in `codes.ts` (MSI checksum encoders accept `''`).
- **`src/lib/engines/bwipjs.ts`:**

```ts
import { qrcode, datamatrix, pdf417, azteccode, drawingSVG } from 'bwip-js/browser';

export const ENCODERS = { qrcode, datamatrix, pdf417, azteccode } as const;

/** Maps a descriptor's ecc choice value to BWIPP options. fixedeclevel stops BWIPP from
 *  raising (QR) or adjusting (PDF417) the level behind the user's back. */
export const ECC_OPTIONS: Record<
	keyof typeof ENCODERS,
	(value: string) => Record<string, unknown>
> = {
	qrcode: (v) => ({ eclevel: v, fixedeclevel: true }),
	datamatrix: () => ({}),
	pdf417: (v) => (v === 'auto' ? {} : { eclevel: Number(v), fixedeclevel: true }),
	azteccode: (v) => ({ eclevel: Number(v) })
};

const QUIET_ZONE_PX = 8; // 4 modules at 2 px/module for matrix codes; 8 X-modules for PDF417 (≥ 2 required)
const NATURAL_PX = 1024; // longer side of the SVG's natural size; CSS max-* only ever shrink it
const CACHE_MAX = 2000;

/** Every BWIPP name that means "the payload does not fit". The name depends on the payload's
 *  length band, so each symbology has several (measurements file, Appendix B). */
export const TOO_LONG: ReadonlySet<string> = new Set([
	'qrcodeNoValidSymbol',
	'qrcodeInputTooLong',
	'qrcodeInputTooLarge',
	'datamatrixTooMuchData',
	'datamatrixInputTooLong',
	'datamatrixNoValidSymbol',
	'pdf417inputTooLong',
	'pdf417dataTooLong',
	'pdf417insufficientCapacity',
	'azteccodeInputTooLong',
	'azteccodeInputTooLarge',
	'aztecNoValidSymbol'
]);

/** Stable part of a BWIPP error: `bwipp.<errorName>`. The `#NNNNN` suffix is a source line
 *  number that changes between bwip-js versions. */
export function bwippErrorName(message: string): string | undefined {
	return /^bwipp\.([A-Za-z0-9]+)/.exec(message)?.[1];
}

interface Encoded {
	svg: string;
	cols: number;
	rows: number;
}

const cache = new Map<string, Encoded>();

/** One encode, memoised by bcid + ecc + value. `init(width, height)` on the drawing receives the
 *  symbol's pixel size WITHOUT padding (measured), so module counts are width/modulePx.x and
 *  height/modulePx.y. Spreading drawingSVG() and overriding init is the measured,
 *  tree-shake-friendly way to learn the size; the default export's raw() would pull in every
 *  encoder. drawingSVG's methods are own closure properties, so the spread keeps them working.
 *  Throws whatever bwip-js throws. */
function encode(d: BwipDescriptor, value: string, options: SymbolOptions): Encoded {
	const key = `${d.bcid}\u0000${options.ecc ?? ''}\u0000${value}`;
	const hit = cache.get(key);
	if (hit) return hit;
	let w = 0;
	let h = 0;
	const base = drawingSVG();
	const drawing = {
		...base,
		init(W: number, H: number) {
			w = W;
			h = H;
			base.init(W, H); // runtime also passes two text-scale args; they are unused for these symbologies
		}
	};
	const extra: Record<string, unknown> =
		d.ecc && options.ecc !== undefined ? ECC_OPTIONS[d.bcid](options.ecc) : {};
	// `...extra` first: the fixed keys below must win over anything the ecc mapping returns.
	const svg = ENCODERS[d.bcid](
		{ ...extra, bcid: d.bcid, text: value, scale: 1, padding: QUIET_ZONE_PX },
		drawing
	);
	const result = { svg, cols: w / d.modulePx.x, rows: h / d.modulePx.y };
	if (cache.size >= CACHE_MAX) cache.clear();
	cache.set(key, result);
	return result;
}

function summary(d: BwipDescriptor, cols: number, rows: number): string {
	// PDF417 width is 17 × (dataColumns + 4) + 1 X-modules, so dataColumns = (cols − 69) / 17.
	return d.bcid === 'pdf417'
		? `${(cols - 69) / 17} columns × ${rows} rows`
		: `${cols}×${rows} modules`;
}

export function check(d: BwipDescriptor, value: string, options: SymbolOptions): CheckResult {
	try {
		const { cols, rows } = encode(d, value, options);
		const bytes = new TextEncoder().encode(value).length;
		return {
			valid: true,
			facts: { bytes, cols, rows, summary: summary(d, cols, rows), dense: cols > d.denseAbove }
		};
	} catch (e) {
		const name = e instanceof Error ? bwippErrorName(e.message) : undefined;
		return name !== undefined && TOO_LONG.has(name)
			? { valid: false, reason: 'too-long' }
			: { valid: false };
	}
}

export function render(d: BwipDescriptor, value: string, options: SymbolOptions): SVGElement {
	const { svg } = encode(d, value, options);
	const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
	const el = document.importNode(doc.documentElement, true) as unknown as SVGElement;
	if (el.nodeName !== 'svg') throw new Error('bwip-js produced invalid SVG'); // e.g. 4.11.3's malformed fill-rule
	// viewBox is always exactly "0 0 W H" and INCLUDES the padding (QR hello world: 58×58).
	const [vw, vh] = (el.getAttribute('viewBox') ?? '0 0 1 1').split(' ').slice(2).map(Number);
	const k = NATURAL_PX / Math.max(vw, vh);
	el.setAttribute('width', String(Math.round(vw * k)));
	el.setAttribute('height', String(Math.round(vh * k)));
	return el;
}
```

Behaviour pinned by tests (see _Testing_): bwip-js throws synchronously and never returns an
error; `e instanceof Error` holds for every observed throw; empty input throws a
`ReferenceError` (unreachable from `parseCodeList`, which drops empties first); a lone
surrogate throws `URIError` and classifies as plain invalid; newlines inside a value encode
(they cannot arise from the textarea); non-ASCII is UTF-8 encoded with no ECI, which the
validation list flags (see _Validation list_). `qrcodeNoValidSymbol` fires only for capacity
with the options this adapter passes (its "invalid content" branch needs `version`, `format` or
`parse`, which are never passed).

## Entries, options and facts — `src/lib/types.ts`, `src/lib/codes.ts`

```ts
export interface SymbolOptions {
	ecc?: string; // present only for formats whose descriptor declares `ecc`
}

export interface SymbolFacts {
	bytes: number; // UTF-8 byte length of `value`
	cols: number; // symbol width in modules (PDF417: X-modules)
	rows: number; // symbol height in modules (PDF417: rows)
	summary: string; // "21×21 modules" or "2 columns × 8 rows" (PDF417)
	dense: boolean; // cols > descriptor.denseAbove
}

export interface CodeEntry {
	raw: string;
	value: string;
	format: FormatId; // NEW — the format this entry validates and renders with
	options: SymbolOptions; // NEW — resolved: override → list setting → descriptor default
	valid: boolean;
	encoded?: string; // 1D only, unchanged
	facts?: SymbolFacts; // 2D only, present when valid; absent on invalid entries
	reason?: 'too-long'; // present when invalid because the payload exceeds symbol capacity
}

export interface Settings {
	/* existing fields unchanged */
	ecc: string; // list-level error-correction choice value for `format`; '' = the format's default
}
// DEFAULT_SETTINGS.ecc = ''
```

```ts
// codes.ts
export interface ListOptions {
	format: FormatId;
	ecc: string;
}

/** Three layers. The list-level ecc applies only when the entry's format IS the list format.
 *  Formats without `ecc` resolve to {}. Each layer is used only if isEccChoice accepts it. */
export function resolveOptions(
	d: FormatDescriptor,
	list: ListOptions,
	override?: SymbolOptions
): SymbolOptions;
// no d.ecc → {}. Otherwise ecc = first accepted of
//   [override?.ecc, d.id === list.format ? list.ecc : undefined, d.ecc.defaultValue].

/** Dispatch on engine. Unknown format or '' → { valid: false } (existing guards). Does NOT
 *  resolve options: callers pass resolved options. */
export function checkCode(
	value: string,
	format: FormatId,
	options: SymbolOptions = {}
): CheckResult;

/** The per-row seam. `token` is one trimmed, non-empty, UNCLEANED token. Sets raw = token;
 *  value = descriptor.normalize?.(token) ?? (numeric ? strip all whitespace : token);
 *  options = resolveOptions(...); then checkCode. */
export function buildEntry(
	token: string,
	format: FormatId,
	list: ListOptions,
	override?: SymbolOptions
): CodeEntry;

/** Split (newline; plus comma for numeric formats) → trim → drop empties → buildEntry per
 *  token with list = { format, ecc }. Tokenisation is unchanged from today. */
export function parseCodeList(raw: string, format: FormatId, ecc = ''): CodeEntry[];
```

## Error correction setting

- **Settings and URL.** `Settings.ecc` defaults to `''`. It is **canonical**: it never holds the
  format's default explicitly. `encodeShareUrl` appends `ecc=<value>` after `fmt` only when
  `isEccChoice(descriptor-of-settings.format, settings.ecc)` holds and the value is not that
  descriptor's default. `decodeShareUrl` resolves `fmt` first (falling back to `DEFAULT_FORMAT`),
  then emits `ecc` only when `isEccChoice(descriptor, value)` holds and the value is not the
  default; an explicit default or an invalid value decodes to no `ecc` key. Never throws.
  General codec rule from here on: parameters after `fmt` (`ecc` now; spec 2's additions later)
  are emitted only when they differ from their default, in a fixed order, so exact-URL tests do
  not churn with each spec.
- **Accepted consequence:** if a descriptor's default ever changes, old links without `ecc`
  render at the new default.
- **Setup page.** When the selected descriptor has `ecc`, a field renders directly under the
  Format field:

```svelte
{#if descriptor.ecc}
	<label class="field ecc-field"
		>Error correction
		<select
			class="ecc-input"
			bind:value={
				() => ecc || descriptor.ecc.defaultValue,
				(v) => (ecc = v === descriptor.ecc.defaultValue ? '' : v)
			}
		>
			{#each descriptor.ecc.choices as c (c.value)}
				<option value={c.value}>{c.note ? `${c.label} (${c.note})` : c.label}</option>
			{/each}
		</select>
	</label>
{/if}
```

The field is rendered conditionally, not toggled with `hidden`, because `.field` sets
`display: flex`, which defeats the UA `[hidden]` rule. The Svelte 5 function binding keeps
`ecc` canonical. The Format select's binding setter resets `ecc` to `''` when the new format
does not accept the current value, so the derived settings never transiently pair a format
with a foreign `ecc`. No `$effect` writes setup state.

- **Effect.** `ecc` is a field of the `$derived` settings object (so Start and Share URLs carry
  it) and the third argument of `parseCodeList`, so it changes both rendering and the
  per-entry capacity verdict.
- **Share QR level** is separate; see _Share link_.

## Validation list — `src/lib/components/ValidationList.svelte`

Rows are a single expression so exact-`textContent` tests stay byte-stable; rows are tested top
to bottom and the first match wins. `raw` always prints in full (an `…` below abbreviates a
long payload in this document only). Separator is `' · '` (U+00B7 with single spaces); the
size glyph is `×` (U+00D7). `label` and `eccChoice` come from `FORMAT_BY_ID.get(entry.format)`
and `eccChoice(descriptor, entry.options.ecc)`; the component takes no format prop.

| condition                                                     | text                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| valid, no facts, `encoded !== undefined && encoded !== value` | `${raw} ✓ → ${encoded}` (unchanged)                   |
| valid, no facts                                               | `${raw} ✓` (unchanged)                                |
| valid, facts                                                  | `${raw} ✓ · ${facts.summary} · ${bytes}` + suffixes   |
| invalid, `reason === 'too-long'`, descriptor has `ecc`        | `${raw} ✗ too long for ${label} (${eccChoice.label})` |
| invalid, `reason === 'too-long'`, no `ecc`                    | `${raw} ✗ too long for ${label}`                      |
| invalid otherwise                                             | `${raw} ✗ invalid` (unchanged)                        |

`${bytes}` is `1 byte` or `N bytes`. Suffixes, in this order, each present only when true:
`· UTF-8, no ECI` when `facts.bytes !== value.length`; `· dense` when `facts.dense`. Examples:
`hello world ✓ · 21×21 modules · 11 bytes`; `hello world ✓ · 2 columns × 8 rows · 11 bytes`;
`héllo → 日本 ✓ · 25×25 modules · 17 bytes · UTF-8, no ECI`;
`xxxx… ✗ too long for QR Code (level H)`; `xxxx… ✗ too long for Aztec (≥23% error correction)`;
`xxxx… ✗ too long for Data Matrix`.

Below the list, `<p class="dense-hint">` with exactly
`Dense: more than 100 modules across (PDF417: 300), so each module is small on screen. If the scanner misses these, lower error correction, shorten the payload, or go full screen.`
is rendered when any entry has `facts.dense`, otherwise absent (conditional block).

Presentation only, textContent unchanged: each row renders `raw` in one span and the verdict
and facts in a sibling span so long payloads can be ellipsised without hiding the verdict.
Row colours change to meet 4.5:1 contrast: valid `#007700` (was `#0a0`); invalid `#c00` stays.

The arrow row never appears for 2D entries: the bwip-js adapter never sets `encoded`.

## Share state in the URL fragment — `src/lib/shareUrl.ts`

```ts
export function encodeShareUrl(codes: string[], settings: Settings): string; // '#' + params
export function decodeShareUrl(url: URL): { codes: string[]; settings: Partial<Settings> };
```

- `encodeShareUrl` builds the same `URLSearchParams` string as today, plus `ecc` per the rule
  above, and returns it with a leading `#` instead of `?`. Param names, order and values are
  otherwise unchanged.
- `decodeShareUrl` parses `url.hash.slice(1)`; if that contains a `codes` key it is the source,
  otherwise `url.search.slice(1)` is. So `?codes=1#top` and `?codes=1#` decode the legacy
  query, and a fragment with `codes` wins over a stale query. Per-parameter leniency is
  unchanged.
- **Routes.** Both pages call `decodeShareUrl(page.url)` once at init, as today. Start, Back and
  Share link emit fragment URLs: Start navigates to `resolve('/play') + shareHash`; Back to
  `resolve('/') + encodeShareUrl(decoded.codes, { ...settings, speedPxPerSec: speed })`, i.e.
  from the decoded share state and the live speed, never from entries. The play page's
  no-valid-codes bounce preserves whichever form it received:
  `goto(resolve('/') + page.url.search + page.url.hash, { replaceState: true })`. The three
  `eslint-disable` justifications change from "query-string concatenation" to "fragment
  concatenation"; the rule still cannot see through it.
- **Fragment-only navigation reloads.** Pasting a share link into a tab already on the same
  path, or editing the fragment in the address bar, is a same-document navigation: SvelteKit
  updates `page.url` but does not remount, and both pages decode once. Each page therefore adds
  a `hashchange` listener in `onMount` that calls `location.reload()`, removed on destroy. Our
  own `goto` calls use `pushState`, which fires no `hashchange`.
- **Removed.** `URL_WARN_LENGTH`, the `.url-warning` element and its copy
  ("Link is long; it may be truncated by some browsers.") are deleted, not reworded.
- **Known edge, checked in the plan:** SvelteKit runs `decodeURIComponent` on the fragment
  during its first navigation. A hand-mangled fragment such as `#codes=50%` throws there and
  may stop the router before it starts; app-generated links never contain a bare `%`.
  Verification step 4 reproduces this; if confirmed, a `src/hooks.client.ts` `init` hook
  rewrites `location.hash` through `URLSearchParams` before navigation.
- No build or deployment change. GitHub Pages serves `play.html` regardless of fragment.

## Share link — `src/lib/qr.ts`, `src/lib/components/ShareLink.svelte`

```ts
export type QrEcc = 'L' | 'M' | 'Q' | 'H';
/** ISO/IEC 18004 version 40, byte mode. */
export const QR_CAPACITY_BYTES: Record<QrEcc, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };
export type QrStatus =
	| { kind: 'fits' }
	| { kind: 'dense' }
	| { kind: 'too-long'; ecc: QrEcc; length: number; capacity: number };
export function qrStatus(text: string, ecc: QrEcc): QrStatus; // uqr encode() in try/catch;
// dense when version > QR_DENSE_VERSION (20, unchanged); too-long when encode throws.
export function buildQrSvg(text: string, ecc: QrEcc): string | null; // null when it does not fit
```

`buildQrSvg` loses its `dense` flag (now `qrStatus`'s job) and gains `ecc`.

ShareLink:

- **Props:** `{ hash: string }`, the encoded fragment. The setup page computes
  `shareHash = $derived(encodeShareUrl(rawCodes, settings))` once and passes it to ShareLink
  and to Start. ShareLink never imports the codec.
- `liveUrl = $derived(location.origin + location.pathname + hash)`. `.share-url` shows
  `liveUrl` at all times (it no longer waits for a click).
- A `<label class="share-ecc-field">Share QR error correction <select class="share-ecc-input">`
  with options `L (most capacity)`, `M (default)`, `Q`, `H` (values `L`, `M`, `Q`, `H`), after
  `.share-row`. Component-local `$state`, initialised to `M` on every mount, stored nowhere.
- `status = $derived(qrStatus(liveUrl, shareEcc))` drives `.qr-status`, which is always
  rendered, has `role="status"`, and is empty when the status is `fits`. The old
  `let qrStatus = $state('')` is removed (name collision with the imported function).
- Clicking **Share link** copies `liveUrl` and, unless the status is `too-long`, renders
  `buildQrSvg(liveUrl, shareEcc)` into `.qr-code`. The invalidation effect clears only `qrSvg`
  and tracks `hash` and `shareEcc`, so a level change clears a QR rendered at the old level.
- Exact copy, numbers formatted with `new Intl.NumberFormat('en-US')`; `${ecc}` is the share
  level:
  - dense: `This link makes a dense QR code. Hold the phone steady, or share the link itself.`
  - too long, level is not `L` and `length ≤ QR_CAPACITY_BYTES.L`:
    `Too long for a QR code at level ${ecc}: this link is ${length} characters and level ${ecc} holds at most ${capacity}. Choose level L, or shorten the list. The link itself still works.`
  - too long otherwise:
    `Too long for a QR code: this link is ${length} characters and a QR holds at most 2,953. Shorten the list to share it as a QR. The link itself still works.`
    e.g. `Too long for a QR code at level M: this link is 3,412 characters and level M holds at most 2,331. Choose level L, or shorten the list. The link itself still works.`
- The old post-click messages (`QR is dense — …`, `Too many codes for a QR — …`) are gone.

`length` is the share URL's character count; the URL is ASCII after encoding, so characters
equal bytes. Accepted: in the too-long state the live region re-announces as the count changes.

## Rendering 2D symbols in the column — `src/lib/barcode.ts`, `src/lib/scroller.ts`, `ScrollColumn.svelte`

- `renderBarcodeSvg(entry: CodeEntry): SVGElement` — the signature loses the `format` argument;
  it looks up `entry.format`, dispatches on `engine`, and passes `entry.options`. The scroller
  calls `renderBarcodeSvg(e)` and the encode cache means playback reuses validation's work.
- The scroller adds the classes `barcode-item--2d` and `barcode-item--<id>` (e.g.
  `barcode-item--pdf417`) to `.barcode-item` when the entry's descriptor is a `bwipjs` row.
  Transforms (rotation, skew) apply exactly as today.
- CSS in `ScrollColumn.svelte`, alongside the existing rule:

```css
.scroll-column :global(.barcode-item--2d svg) {
	max-width: min(90vw, 640px);
	max-height: 60vh;
	width: auto;
	height: auto;
}
.scroll-column :global(.barcode-item--pdf417 svg) {
	max-width: min(95vw, 960px); /* PDF417 is wide: 18 data columns = 375 X-modules */
}
```

The adapter gives the SVG a natural size of 1024 px on its longer side, so the CSS max
constraints only shrink it, and a replaced element with an intrinsic ratio under two max
constraints keeps its aspect (verified in headless Chromium and Firefox: a 66-unit viewBox
renders 460.8 px square at 1024×768). On a 768 px tall viewport a square symbol renders at
about 460 px including its 4-module quiet zone per side; a 25-module QR (33 with quiet zone)
gets about 14 px per module, about 10.6 on a 390 px wide phone. At the dense threshold a matrix
code gets about 4 px per module at 460 px and about 6 at 640; PDF417 at 300 X-modules gets about
3 px per X-module at 960. 1D items and the 40vh item padding are unchanged. The quiet zone is
inside the SVG's own box, so a rotated symbol keeps it; the white page supplies contrast (no
background fill in the SVG). Viewport clipping under extreme distortion on narrow screens is the
recorded limitation in _Decisions_.

## Setup page, play page, README

- **Setup:** Format select gains the 2D optgroup (seven optgroups, 25 options). Placeholder for
  2D formats is the existing text-format string (`Paste codes — one per line`). `entries`
  becomes `$derived(parseCodeList(text, format, ecc))`. Error correction field, `shareHash`,
  ShareLink props and the share-level select as above. Start emits `resolve('/play') + shareHash`.
- **Play:** `decodeShareUrl(page.url)`; `parseCodeList(decoded.codes.join('\n'), settings.format, settings.ecc)`;
  Back as above; bounce preserves search and hash; `hashchange` reload.
- **README:** "21 barcode formats" becomes 21 linear plus four 2D, with the bwip-js line added
  to _Tech stack_; "one per line, or comma-separated" is qualified (2D and other text formats
  are one per line); document the Error correction select, the share-QR level and status, and
  that share links now use the URL fragment (old links keep working). Add a short "Scanning 2D
  symbols" note: a 2D area imager is required; enable the scanner's screen or mobile-display
  read mode if it has one; start at 60 px/s and use browser full screen for dense symbols;
  non-ASCII text is encoded as UTF-8 without an ECI marker, so scanners that assume Latin-1
  show it garbled; 2D symbols carry no caption, so count misses against the list.
- **Stale comments to update:** `formats.ts` header; `ScrollColumn.svelte` "snapshots settings
  (including format)"; `jsbarcode.d.ts` "surface checkCode relies on"; `shareUrl.ts` doc
  comments mentioning `?codes` and `location.search`; `ShareLink.svelte` "URL field and warning
  persist"; the three `eslint-disable` rationales.

## Error handling

- Unknown or absent `fmt`, invalid or default `ecc`: decoder emits no key; defaults apply via
  the `DEFAULT_SETTINGS` spread. Silent, never throws.
- `checkCode` never throws for any engine. bwip-js errors are caught and classified by name:
  any name in `TOO_LONG` → `reason: 'too-long'`; anything else (invalid eclevel, `URIError`
  from a lone surrogate, unknown names) → plain invalid.
- `render` throws if bwip-js output is not an `svg` document (the 4.11.3 failure class). The
  scroller does not catch it; the snapshot and render tests exist so it never ships.
- A descriptor whose `bcid` is missing from `bwip-js/browser` is a registry-integrity test
  failure, never a runtime surprise.
- Live share status never throws: `qrStatus` wraps uqr in try/catch.
- Scrolling with no valid entries still bounces to setup, format-aware as today.

## Testing

**Fixtures** are measured values from the measurements file (Appendix A and B) at bwip-js
4.11.4. If a first run disagrees with any of them, implementation stops for a human decision;
an expected value is never edited to match the code.

| payload            | format     | ecc           | expected                                            |
| ------------------ | ---------- | ------------- | --------------------------------------------------- |
| `hello world`      | qr         | M             | cols 21, rows 21, bytes 11, `21×21 modules`         |
| `hello world`      | qr         | H             | cols 25, rows 25                                    |
| `hello world`      | datamatrix | —             | cols 16, rows 16, `16×16 modules`                   |
| `hello world`      | aztec      | 23            | cols 19, rows 19                                    |
| `hello world`      | pdf417     | auto          | cols 103, rows 8, `2 columns × 8 rows`              |
| `x` × 16           | qr         | L / M / Q / H | cols 21 / 25 / 25 / 29                              |
| `héllo → 日本`     | qr         | M             | valid, bytes 17, cols 25                            |
| `line1\nline2`     | qr         | M             | valid, cols 21                                      |
| `x` × 900          | pdf417     | 8             | valid, cols 375, rows 54 (fixedeclevel honoured)    |
| `x` × 900          | pdf417     | 0             | valid, cols 273, rows 38                            |
| `x` × 5000, × 8000 | qr         | M             | invalid, `reason: 'too-long'` (two error names)     |
| `x` × 3000, × 3200 | datamatrix | —             | invalid, `reason: 'too-long'` (two error names)     |
| `x` × 1900, × 3000 | pdf417     | auto          | invalid, `reason: 'too-long'` (two error names)     |
| `x` × 3500, × 5000 | aztec      | 23            | invalid, `reason: 'too-long'` (two error names)     |
| `x`                | qr         | `X` (direct)  | invalid, no `reason` (`qrcodeInvalidEClevel`)       |
| `a\uD800b`         | qr         | M             | invalid, no `reason` (`URIError`)                   |
| `x` × 2000         | aztec      | 23            | valid (lower-case text compacts; not over capacity) |

- **`engines/bwipjs.test.ts`:** every fixture above through `check`; `render` for `hello world`
  at each format returns an element whose `nodeName` is `svg`, whose `viewBox` is `0 0 58 58`
  for QR (padding included), whose `width`/`height` have longer side 1024, and which contains a
  `path`; `render` throws on a `parsererror` document (feed a mocked encoder returning
  `fill=rule`); `bwippErrorName` strips `#NNNNN` and returns `undefined` for a non-BWIPP
  message; `TOO_LONG` contains all twelve names; memoisation — with `bwip-js/browser` mocked
  via `importOriginal` and the encoders wrapped in `vi.fn`, `check` then `render` of the same
  input calls the encoder once; the uqr cross-check (below); one Vitest file snapshot per
  format of `render(d, 'hello world', resolveOptions(d, { format: d.id, ecc: '' })).outerHTML`,
  guarding against upstream regressions such as 4.11.3's malformed `fill-rule`.
- **uqr cross-check (requirement it guards: the eclevel mapping and `fixedeclevel` never make
  bwip-js choose a larger QR than an independent encoder for the same data and level):** for
  `hello world`, `https://example.com/p/1234567890abcdef`, `x` × 100 and `1234567890` at each
  of L, M, Q, H, bwip-js `cols` is ≤ uqr's `size` at `border: 0` and ≥ 21. Exact equality is
  not required; the two implementations may legitimately pick different versions.
- **`formats.test.ts`:** 25 unique ids; seven groups in order; every `bwipjs` row's `bcid` is a
  function export of `bwip-js/browser` (`import * as bwip`); the two-directional JsBarcode check
  iterates `FORMATS.filter((f) => f.engine === 'jsbarcode')` with its exclusion list unchanged;
  the "no day-one hooks" assertion still passes; every `ecc.defaultValue` is one of its
  `choices`; `isEccChoice` accepts each declared value and rejects `''`, `'X'`, and a value from
  another format; `eccChoice` returns the labelled choice; the existing `checkCode` matrix and
  the `checkCode('', id)` loop stay here, call `checkCode`, and the `''` loop covers all 25 ids
  (narrowing on `res.valid` before reading `encoded`).
- **`codes.test.ts`:** `resolveOptions` returns `{}` for `upc` and `datamatrix`; honours
  override → list → default with invalid layers skipped; `resolveOptions(aztecRow, { format: 'qr', ecc: 'H' })`
  returns `{ ecc: '23' }` (list level does not cross formats); `buildEntry('0360 00291452', 'upc', …)`
  gives `raw` unchanged and `value` `036000291452`; `parseCodeList` stamps `format` and
  `options` on every entry; `'x'.repeat(2000)` under `qr` is valid at `L` and `too-long` at `H`;
  2D tokenisation is newline-only with commas kept; `DEFAULT_SETTINGS.ecc === ''`.
- **`shareUrl.test.ts`:** encode starts with `#`; `ecc` appears after `fmt` only for a valid,
  non-default value (`{ format: 'qr', ecc: 'H' }` emits `ecc=H`; `{ format: 'qr', ecc: 'M' }`,
  `{ format: 'aztec', ecc: 'H' }` and `{ format: 'upc', ecc: 'H' }` emit none); decode reads the
  fragment when it has `codes`, else the query (`?codes=1#top` → `['1']`; `?codes=a#codes=b` →
  `['b']`; `?codes=1#` → `['1']`); `ecc=H&fmt=qr` round-trips; `ecc=M&fmt=qr`,
  `ecc=auto&fmt=pdf417`, `ecc=H&fmt=upc` and `ecc=Z&fmt=qr` decode with no `ecc` key.
- **`qr.test.ts`:** `qrStatus` returns `fits`, `dense`, and `too-long` with `ecc`, `length` and
  `capacity` from the table; `buildQrSvg('x'.repeat(16), 'H')` is a 29-module symbol and `'L'`
  21; `buildQrSvg` returns `null` over capacity.
- **`ShareLink.test.ts`:** the dense and too-long texts, exact, with the expected `length`
  computed from `location.origin + location.pathname + hash` (never hard-coded; jsdom's origin
  differs from the mocked page URL); `.qr-status` is empty for a one-code list; changing the
  level select changes the capacity number and the "Choose level L" clause disappears at `L`;
  too-long click copies but renders no SVG; a level change after a click clears the QR;
  `.share-url` shows the live URL before any click; no `.url-warning` element exists.
- **`ValidationList.test.ts`:** every row shape in the table above, exact `textContent`,
  including `1 byte`, `· UTF-8, no ECI` and `· dense`; dense hint present/absent; fixtures
  without `encoded` render no arrow.
- **Route tests, setup:** selecting `qr` validates `hello world` with the facts row, renders
  `.ecc-input`, and `.ecc-input` is absent for `upc` and `datamatrix`; the select shows
  `level M (~15% recovery, default)` when `ecc` is `''`; choosing `level H` then `level M` again
  removes `ecc` from the Start URL; switching from `qr` with `H` to `aztec` resets to the Aztec
  default; the exact Start URL assertion becomes
  `/play#codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc`
  and a `qr` + `H` variant ends `&fmt=qr&ecc=H`; the grouped dropdown has 7 optgroups and
  25 options; the setup page prefills from a `#codes=` URL and still from a legacy `?codes=`
  URL; a dispatched `hashchange` calls `location.reload` (mocked).
- **Route tests, play:** a `qr` list renders items with `barcode-item--2d` and
  `barcode-item--qr`, a `upc` list renders neither; Back URL starts with `/#codes=` and is built
  from the decoded codes; `/play#codes=bad` bounces to `/#codes=bad`; the existing
  `/?codes=bad` → `/?codes=bad` bounce stays; `fmt=qr&ecc=H` with a payload that fits only at
  `L` bounces; a legacy `?codes=` URL still plays; `hashchange` reloads.
- **Mechanical-edit inventory (the back-compat gate),** from the line-level review:
  - `CodeEntry` fixtures gain `format` and `options: {}`: `ValidationList.test.ts:6,29,39`
    (`'upc'`); `scroller.test.ts:5` and `ScrollColumn.test.ts:6` (`'upc'`); `barcode.test.ts:7`
    (`'upc'`) and `:15` (`'code128'`). These four files are the only constructors of `CodeEntry`.
  - `renderBarcodeSvg` drops its second argument: `scroller.ts:49`, `barcode.test.ts:6,15`.
    `barcode.test.ts` stays as the dispatcher test and adds one `qr` case.
  - Inline `Settings` literals gain `ecc: ''`: `scroller.test.ts` (eight literals),
    `shareUrl.test.ts:7,45`, the `+page.svelte` `$derived`. The **expected decoded** settings in
    `shareUrl.test.ts` do **not** gain `ecc` (the decoder emits no key for the default).
  - `decodeShareUrl` takes a `URL`: `+page.svelte:13`, `play/+page.svelte:14`, and every call in
    `shareUrl.test.ts`.
  - `formats.test.ts:23-34,38,44-49` narrow on `engine` before reading `jsbarcodeFormat` /
    `renderOptions`; `:53` `MATRIX` becomes `Partial<Record<FormatId, …>>` or gains the four ids;
    `:144-147` narrow on `res.valid` before reading `encoded`.
  - `page.test.ts:51` exact Start URL as above; `:204-209` → 7 optgroups / 25 options;
    `ShareLink.test.ts:23-36` (two `.url-warning` tests) deleted; `:46-54` and `:56-66` rewritten
    for the exact dense and too-long texts.
  - `play/page.test.ts`: Back is computed with `encodeShareUrl`, so no edit for `#`; `:62`
    `'/?codes=bad'` stays; `PLAY_URL` switches to a fragment URL and one legacy `?` case is kept.
  - `qr.test.ts`: `dense` assertions move to `qrStatus`; `buildQrSvg` cases take `ecc` and
    expect `string | null`.
  - Plain 1D rows, UPC cleanup, scroll maths and transforms keep their existing tests green
    untouched.

## Verification that fails closed

Human or browser steps the plan must schedule. Until each is done the feature is recorded as
**unverified**, never as passed. "Pass" for a scan means the scanner outputs exactly the
payload, once, with the device model, firmware and read mode recorded.

1. **Scan with the target imager** at 60 px/s, rotation and skew off, `hello world` in all four
   formats at default error correction; a QR whose row shows `· dense`; a PDF417 of at least
   300 X-modules; `héllo → 日本` in each format, recording the scanner's output; a payload
   containing `# & % + , ` and spaces, which must survive Start → play → Back and scan back
   exactly; loop mode with three 2D codes across the copy seam; a non-loop run to the finish
   summary; a speed sweep to the highest speed at which every symbol reads.
2. **Decode the error-correction extremes** with a decoder that reports the level (a ZXing-based
   phone app suffices): QR `L` and `H`, Aztec `10` and `50`, PDF417 `0`, `8` and `auto`. The
   reported level must equal the label. No encoder output was decoded during research.
3. **Browser checks** in Chromium and Firefox, desktop and a 390 px phone: aspect preserved
   under both caps; PDF417 uses its wider cap; quiet zone intact under maximum rotation and
   skew on desktop; record the clipping behaviour on the phone at 8°/8° and 30°/30°; paste a
   second share link into a tab already on the setup page and confirm the list changes; open a
   share QR with the iOS and Android camera apps and confirm the fragment survives.
4. **Malformed fragment:** open `/play#codes=50%`; if the router fails to start, add the
   `hooks.client.ts` repair described above and re-verify.
5. `npm run check`, `npm test` and `npm run lint` green in the project (the review ran them only
   in a mirrored scratch workspace).

## Out of scope

Step-and-dwell playback (spec 2). Structured editor, per-entry formats and option overrides,
multi-line payloads, record separator change (spec 3). URL compression (future spec; measured
ratios recorded above). Replacing JsBarcode with bwip-js (future spec; needs an app-owned
normaliser with parity tests, see the research note). Data Matrix rectangular shape; PDF417
data-column and row control; GS1/FNC1 variants; Micro QR and rMQR; ECI selection for non-ASCII
payloads; captions or ordinals under 2D symbols; per-item distortion-aware size caps;
automatic share-QR level fallback (the reviewed alternative to the share-level select);
automated decode round-trips (no in-tree rasteriser or decoder).

# All JsBarcode Formats — Design

**Date:** 2026-07-21
**Status:** Approved design, pre-implementation (hardened by 3-lens adversarial spec review)

## Goal

Let a list be rendered in any of the 21 barcode formats JsBarcode documents in its
README (today the app is hardcoded to UPC-A), selected once per list, carried in the
share URL, and validated per format — including showing the user the exact value their
scanner will read whenever the encoder mutates the cleaned input (check-digit
auto-completion, checksums, uppercasing, Codabar guards).

## Decisions

- **Format model:** one format per list. A single `Settings.format` applies to every code;
  no per-code detection, no per-line overrides.
- **Architecture (Approach C′):** a `FormatDescriptor` interface is the unit of extension.
  All 21 descriptors are data-only rows in one registry today; optional behavior hooks
  (`normalize`, `renderOptions`) are the documented seam for future format-specific
  features (e.g. EAN `flat`, CODE39 `mod43`). Consumers depend only on the interface.
- **Cleanup (tokenize/normalize) is format-aware:** numeric formats keep today's exact
  behavior (split on newlines AND commas, strip internal whitespace); text formats split
  on newlines only and trim ends — internal spaces and commas are data.
- **Back-compat scope (precise):** _decoding and playback_ of a URL without `fmt` are
  behavior-identical to today. Newly _emitted_ URLs (Start, Back, Share link) always
  carry `fmt=<id>` — including `fmt=upc` for the default — appended after `seed`.
  Emitted-URL byte-identity with the old app is explicitly NOT a goal.
- **Encoded-value transparency:** when the encoder will carry something different from the
  _cleaned_ value, the setup validation list shows `raw ✓ → encoded`. This applies to
  every format, text formats included (`hello` under CODE39 shows `hello ✓ → HELLO`).
  App-side whitespace stripping is deliberately NOT surfaced (it is pre-existing,
  well-understood cleanup, and today's plain `raw ✓` row stays byte-identical).

## The registry — `src/lib/formats.ts`

**File-name collision, resolved:** `src/lib/format.ts` (the finish-screen
`formatFinishMessage`) is renamed to `src/lib/finish.ts` (test file
`format.test.ts` → `finish.test.ts`; its one importer, `src/routes/play/+page.svelte`,
updates) so the registry can own the natural name `formats.ts` without a
one-letter-apart sibling.

```ts
export type FormatId =
	| 'code128'
	| 'code128a'
	| 'code128b'
	| 'code128c'
	| 'ean13'
	| 'ean8'
	| 'ean5'
	| 'ean2'
	| 'upc'
	| 'upce'
	| 'code39'
	| 'itf'
	| 'itf14'
	| 'msi'
	| 'msi10'
	| 'msi11'
	| 'msi1010'
	| 'msi1110'
	| 'pharmacode'
	| 'codabar'
	| 'code93';

export interface FormatDescriptor {
	id: FormatId;
	jsbarcodeFormat: string; // key in JsBarcode's own registry, e.g. 'CODE128A', 'EAN13'
	label: string; // dropdown text, e.g. 'CODE128 A (force mode)'
	group: string; // optgroup label, README-style
	numeric: boolean; // true → comma-split + whitespace-strip cleanup
	normalize?: (token: string) => string; // per-token cleanup override (see parseCodeList)
	renderOptions?: () => Record<string, unknown>; // extra JsBarcode options (future: flat, mod43…)
}
```

`FORMATS: readonly FormatDescriptor[]` holds all 21 rows; `FORMAT_BY_ID: Map` derives
from it; `DEFAULT_FORMAT: FormatId = 'upc'`.

Groups and membership (mirrors the JsBarcode README):

| group     | ids                                                 | numeric |
| --------- | --------------------------------------------------- | ------- |
| CODE128   | code128 (auto), code128a, code128b, code128c        | false   |
| EAN / UPC | ean13, ean8, ean5, ean2, upc (UPC-A), upce (UPC-E)  | true    |
| CODE39    | code39                                              | false   |
| ITF       | itf, itf14                                          | true    |
| MSI       | msi, msi10, msi11, msi1010, msi1110                 | true    |
| Other     | pharmacode (numeric), codabar (text), code93 (text) | mixed   |

The dropdown renders six optgroups: CODE128, EAN/UPC, CODE39, ITF, MSI, Other.

**Registry exclusions (explicit):** JsBarcode's internal registry has 23 keys. Two are
deliberately not exposed: `GenericBarcode` (internal fallback, renders anything) and
`CODE93FullASCII` (undocumented in JsBarcode's README, which defines this feature's
scope; it remains one registry row away if ever wanted). The integrity test pins this in
BOTH directions: every descriptor's `jsbarcodeFormat` resolves in JsBarcode's registry,
and every JsBarcode registry key is either a descriptor or on the explicit exclusion
list `['GenericBarcode', 'CODE93FullASCII']` — so a jsbarcode upgrade that adds, renames,
or removes formats fails `npm test` loudly.

**CODE39 must NOT define a `normalize` hook** (e.g. uppercasing): the encoder's own
uppercasing is exactly what the `→ encoded` row must surface.

## The pipeline — `src/lib/codes.ts` (renamed from `upc.ts`) and `src/lib/barcode.ts`

```ts
// CodeEntry stays in src/lib/types.ts (renamed in place from UpcEntry), so all eight
// current importers keep their import paths and only the identifier changes.
export interface CodeEntry {
	raw: string; // original token exactly as entered (post-trim)
	value: string; // cleaned per format (numeric: whitespace stripped; text: raw)
	valid: boolean;
	encoded?: string; // present when valid: the value the barcode actually carries
}

export function parseCodeList(raw: string, format: FormatId): CodeEntry[]; // codes.ts
export function checkCode(value: string, format: FormatId): { valid: boolean; encoded?: string }; // codes.ts
export function renderBarcodeSvg(entry: CodeEntry, format: FormatId): SVGElement; // barcode.ts
```

- `parseCodeList` order: split (numeric: `/[\n,]/`; text: `/\n/`) → trim each token →
  drop empties → clean each surviving token with `descriptor.normalize` if defined, else
  the default for its family (numeric: strip internal whitespace; text: identity) →
  validate. Drop-empties operates on the trimmed token _before_ cleanup/validation, so no
  `CodeEntry` ever has `value === ''` and the validation list never shows a blank row.
- `checkCode` uses JsBarcode's own encoder classes via the internal registry
  (`jsbarcode/bin/barcodes`) — the same code the public render API runs. Construct the
  encoder, call `valid()`, read back the possibly-mutated `data` as `encoded`. Wrapped in
  try/catch → any throw is `{ valid: false }`. `checkCode('')` is unreachable from
  `parseCodeList` but, as a public export, is pinned directly by tests: `{ valid: false }`
  and no throw, for every format.
- **Typing the deep import:** `src/lib/jsbarcode.d.ts` gains a
  `declare module 'jsbarcode/bin/barcodes'` block typing the default export as a record
  of encoder-class constructors (`new (data: string, options: object)`, `valid(): boolean`,
  and the mutated `data: string` field) — without this, svelte-check fails on TS7016.
  (Runtime resolution is safe: jsbarcode has no `exports` map, only `main`.)
- `renderBarcodeSvg` keeps the public `JsBarcode(svg, entry.value, …)` API, passing the
  descriptor's `jsbarcodeFormat` plus `...descriptor.renderOptions?.()` over today's
  option set (displayValue, lineColor, background, width 3, height 160, margin 16).
- Renames (identifier-only where possible): `UpcEntry` → `CodeEntry` (in place, types.ts);
  `parseUpcList`/`tokenizeUpcInput`/`isRenderableUpc` retired in favor of the API above;
  `upc.ts` → `codes.ts`; `fileInput.ts`'s `readUpcFile` → `readCodesFile` (importer
  `+page.svelte` and the `vi.mock('$lib/fileInput', …)` in `page.test.ts` update; its doc
  comment drops the stale `tokenizeUpcInput` reference). File upload semantics are
  unchanged mechanically — the file's text fills the textarea, then cleanup is whatever
  the selected format dictates (for text formats, commas in an uploaded `.csv` are data,
  not separators). No day-one descriptor defines a hook.

### Encoder facts (empirically probed against the installed jsbarcode 3.12.3)

These drive `encoded` and the test fixtures:

- EAN13: 12 digits → appends check digit (`590123412345` → `5901234123457`); 13 digits
  require a correct check digit. EAN8: same at 7/8 (`9638507` → `96385074`). UPC-A: same
  at 11/12. ITF-14: same at 13/14.
- UPC-E: `654321` (6 digits) and `01245714` (8 digits) valid; `0124571` (7 digits)
  invalid; no mutation observed.
- MSI10/11/1010/1110: always append 1–2 checksum digits (`1234` → `12344` / `12343` /
  `123448` / `123430`); bare MSI encodes as-is.
- CODE39: lowercase input is uppercased (`hello` → `HELLO`); space and `-.$/+%` valid.
- Codabar: bare content gains `A…A` start/stop (`1234` → `A1234A`); explicit `A–D` guards
  kept; `E1234F` invalid.
- CODE128 (auto): any ASCII including commas; CODE128A: no lowercase; CODE128B: full
  printable ASCII (`Hello b!` valid, no mutation); CODE128C: digits only, even length.
- ITF (plain): digits, even length (`1234` valid, `123` invalid), no mutation.
- CODE93: uppercase set only (no lowercase normalization — `hello` invalid).
- Pharmacode: integer 3–131070 inclusive. EAN5/EAN2: exactly 5/2 digits, standalone.
- Empty string: `checkCode('')` returns `{ valid: false }` for every format via an
  explicit guard — jsbarcode's MSI checksum encoders (MSI10/11/1010/1110) would
  otherwise checksum `''` into `'0'`/`'00'` and accept it. Unreachable from
  `parseCodeList` regardless (drop-empties runs first).

## Settings, share URL, routes

- `Settings` gains required `format: FormatId`; `DEFAULT_SETTINGS.format = 'upc'`.
- `encodeShareUrl` ALWAYS appends `fmt=<id>` after `seed` — including `fmt=upc`.
  `decodeShareUrl` sets `settings.format` only when the param value is a known `FormatId`
  (validated against the registry); on unknown or absent `fmt` the decoder emits NO
  `format` key — the effective format then falls back to `upc` via the existing
  `{ ...DEFAULT_SETTINGS, ...decoded.settings }` spread, exactly like every other
  setting. The decoder never throws. No existing param changes.
- **Setup page:** a `Format` field (`<select class="format-input">`, six optgroups,
  `<option>` text from `descriptor.label`) renders first in `.settings-row`. **Each
  `<option value>` is the `FormatDescriptor.id`** — `jsbarcodeFormat` never appears in
  the DOM or the URL. `format` initializes from
  `{ ...DEFAULT_SETTINGS, ...decoded.settings }.format` and is a field of the `$derived`
  settings object, so Start/Share URLs carry it and ShareLink's existing QR-invalidation
  effect fires on format switches automatically; the seed `??` fallback is unchanged and
  independent of format. `entries` becomes `$derived(parseCodeList(text, format))`.
- **Textarea:** the class renames `.upc-input` → `.code-input` (markup, its style rule,
  and the four selector references in `page.test.ts`). Placeholder derives from the
  descriptor and intentionally changes for ALL formats including the default — exact
  strings (dash is U+2014 EM DASH): numeric → `Paste codes — one per line, or
comma-separated`; text → `Paste codes — one per line`.
- **Validation list:** plain rows are byte-identical to today (`raw ✓` / `raw ✗ invalid`
  — the existing exact-`textContent` assertions keep passing untouched). The arrow row
  renders exactly `` `${raw} ✓ → ${encoded}` `` (single U+0020 spaces, arrow U+2192) when
  `valid && encoded !== undefined && encoded !== value` — the `undefined` guard matters
  because existing fixtures construct entries without `encoded`. The conditional template
  fragment must not introduce stray whitespace (exact-`textContent` tests enforce this).
- **Play page:** decodes `fmt` like any param; passes `settings.format` through
  `parseCodeList` and into `ScrollColumn` → `createScroller` →
  `renderBarcodeSvg(entry, settings.format)` (the scroller's only change; it stays
  framework-free). The no-valid-codes guard inherits format-dependent validity
  (`codes=HELLO&fmt=code39` plays; `codes=HELLO` bounces).
- README: genericize UPC-specific wording; document the format dropdown.

## Error handling

- Unknown/absent `fmt`: decoder emits no `format` key; effective format falls back to
  `upc` via the `DEFAULT_SETTINGS` spread. Silent, never throws.
- `checkCode` never throws (try/catch → invalid).
- Registry-integrity test guards the deep import in both directions (see registry
  section) — jsbarcode upgrades fail loudly in `npm test`, never silently in production.
- EAN-5/EAN-2 render standalone (verified); add-on pairing is out of scope (YAGNI).

## Testing

- **`formats.test.ts`:** two-directional registry integrity (21 unique ids, six groups,
  descriptors ∪ `['GenericBarcode', 'CODE93FullASCII']` exactly covers JsBarcode's
  registry keys); full `checkCode` matrix from the probed facts — every format gets at
  least one valid, one invalid, and (where applicable) one mutation fixture; plus
  `checkCode('', fmt)` → `{ valid: false }`, no throw, for every format. The retired
  `isRenderableUpc` cases from `barcode.test.ts` fold into this matrix.
- **`codes.test.ts`** (renamed from `upc.test.ts`): tokenization/cleanup split — commas
  separate for `upc`, are data for `code128`; internal spaces stripped for `upc`, kept
  for `code39`; trim/drop-empties for both families; whitespace-only tokens dropped
  before validation.
- **`barcode.test.ts`:** `renderBarcodeSvg` updates to the two-arg signature; renders a
  non-UPC format (e.g. code128) as an SVG.
- **`shareUrl.test.ts`:** encoding with `format: 'upc'` produces `…&seed=…&fmt=upc`
  (always-emit pinned, position pinned); non-default round-trip
  (`fmt=code39` → `settings.format === 'code39'`); unknown id → no `format` key; absent →
  no `format` key. Existing round-trip `toEqual` fixtures gain `format` in their expected
  settings (behavior-visible, deliberate).
- **Route tests:** setup — grouped dropdown renders; setting `.format-input` to `code39`
  flips `HELLO` invalid→valid and re-enables Start; placeholder switches between the two
  exact strings; arrow rows assert exact `textContent`:
  `590123412345 ✓ → 5901234123457` (ean13) and `hello ✓ → HELLO` (code39, text-format
  arrow coverage); negative case — `0360 00291452` under `upc` renders a plain
  `036000291452`-checked row with no arrow. Play — `fmt` decoded and rendered
  (barcode-item count for a code39 list), Back URL carries `fmt`.
- **Mechanical-edit inventory (the back-compat gate):** `page.test.ts:50`'s exact Start
  URL gains `&fmt=upc` after `seed=0`; `page.test.ts` `.upc-input` selectors (4) become
  `.code-input`; `vi.mock('$lib/fileInput')` re-exports `readCodesFile`; the seven inline
  settings literals in `scroller.test.ts` (and those in `ScrollColumn.test.ts` /
  `play/page.test.ts`) gain `format: 'upc'`; `ValidationList.test.ts` fixtures stay valid
  because plain rows are unchanged and the `undefined`-guard keeps `encoded`-less entries
  arrow-free. Everything else — share-URL params other than `fmt`, UPC cleanup semantics,
  validation copy for plain rows, scroll/QR behavior — is unchanged and must keep its
  existing tests green.

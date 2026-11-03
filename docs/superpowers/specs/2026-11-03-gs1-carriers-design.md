# GS1 carriers — Design

**Date:** 2026-11-03
**Status:** Design agreed in conversation on 2026-11-03 and revised the same day after a four-lens
review on Sonnet subagents (codebase fit, codec and engine correctness, UX and copy, internal
coherence) judged by the author; awaits the user's review before planning. Spec 1 of a four-spec
GS1 series (see _Series_).
**Measurements:** [`docs/research/2026-11-03-gs1-encoder-measurements.md`](../../research/2026-11-03-gs1-encoder-measurements.md),
cited below as _measurements §n_. Every number in this spec is in that note or follows from the
arithmetic stated beside it.

## Intent

scandible feeds a hardware scanner a list of barcodes off the screen. Today none of its 25 formats
carries GS1 data: a CODE128 symbol has no FNC1, so a point-of-sale lane reads it as plain text, and
no DataBar member exists. The user wants **explicit GS1 support, with coupons as the driving case**:
a tester types GS1 element strings, plays them, and checks that the lane decodes exactly the
Application Identifiers it should, with the right separators and symbology identifier.

This spec adds the carriers and the data path: eleven GS1 formats fed bracketed element strings
such as `(01)09501101530003(17)261231(10)LOT42`, validated by BWIPP's Application Identifier
linter, each valid row showing the data as the scanner will emit it. The coupon itself, raw scan
data as input, the per-AI breakdown and GS1 Digital Link are the later specs of the series.

Success: the tester picks **GS1-128** (or any of the eleven), pastes element strings one per line,
sees each row's verdict, for example
` ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42`, or a plain reason
such as ` ✗ AI 01: Bad checksum`, and presses Start. A scanner with GS1 output enabled emits the
string the verdict showed, GS characters where the verdict shows `␝`. With the opt-in
**Render GS1 data that fails validation** box ticked, a GS1-128 with a wrong check digit renders
anyway, flagged amber, so the lane's rejection path can be tested. Every link issued before this
spec decodes as it did, and every existing format renders and validates exactly as today; three
shared texts (the dense hint, the editor hint and the loss note's first sentence in one case) gain
GS1 wording.

## Series

Four specs, each with its own plan and PR, in this order. The user chose "all GS1, coupons first"
(the carriers before the coupon), all three input forms (bracketed, raw scan data, Digital Link),
the verdict's encoded form in spec 1 with the AI breakdown in spec 2, carrier set B (the eight
recommended carriers, GS1-128, DataBar Omnidirectional, Stacked Omnidirectional, Limited, Expanded
and Expanded Stacked, GS1 DataMatrix and GS1 QR Code, plus DataBar Truncated, DataBar Stacked and
GS1 DotCode), and validation with an opt-in render-anyway toggle.

1. **GS1 carriers** (this spec). Eleven formats, bracketed input, BWIPP lint, scan-data verdict,
   the `lax` option.
2. **Raw scan data and the AI breakdown.** Accept what a scanner emitted, such as
   `]C10109501101530003` followed by GS-separated fields, with the GS as the character itself or
   a textual placeholder, and re-bracket it. Needs an Application Identifier table in the app
   (lengths, names, formats; candidate source: GS1's Syntax Dictionary). With that table the
   verdict gains one line per AI, `(01) GTIN 09501101530003`, `(17) expiry 2026-12-31`. Open
   points for its brainstorm: which placeholder notations, whether the AIM identifier is required
   or optional on input, and whether the table is vendored or generated.
3. **GS1 Digital Link.** Accept `https://id.gs1.org/01/09501101530003/10/LOT42`, render with
   bwip-js's `gs1dlqrcode` and `gs1dldatamatrix`, and show the equivalent element string in the
   verdict (and perhaps the reverse). bwip-js already lints these (`GS1dl*` names,
   measurements §2).
4. **North American coupon.** AI (8110) in GS1 DataBar Expanded Stacked through bwip-js's
   `gs1northamericancoupon`, which enforces the (8110) structure with 60 field-level `GS1coupon*`
   messages (measurements §2), plus a field breakdown of the coupon (company prefix, offer code,
   save value, purchase requirement, family code, optional fields). BWIPP's coupon encoder accepts
   (8110) alone and rejects (8111), which its lint pairs with (255) (measurements §5); (8112) was
   not probed. Whether the coupon gets a field-by-field composer is that spec's question.

Spec 1 leaves these doors open: the `gs1` descriptor field carries the AIM identifier that spec 2
will match on input; the scan-data module's parser is the seam spec 2 extends; the `lax` option
and the lint-message plumbing serve the coupon's messages unchanged.

## Decisions

- **Eleven formats in one `GS1` group, one widened bwip-js descriptor, a bespoke second option**
  (approach 1 of three). Rejected: **GS1 as a mode on existing formats** (a GS1 checkbox turning
  CODE128 into GS1-128), because the seven DataBar members and DotCode have no base format and
  CODE128 would switch engines when ticked: two models for one feature. Deferred: **a
  descriptor-declared option schema** replacing the ecc plumbing; it would refactor what 411 tests
  pin and change the URL grammar for no visible gain. The rule of three: generalise when a third
  option arrives.
- **Bracketed element strings are the only input in this spec.** BWIPP parses them natively,
  inserts FNC1 and places the separators. Raw scan data and Digital Link are specs 2 and 3.
- **BWIPP is the only validator.** The app owns no AI table in this spec. Lint is on by default,
  mandatory pairings (`lintreqs`) stay off, as in BWIPP, because they reject partial element
  strings that scanners read fine. The five GTIN-only DataBar members never reach the linter: they
  run their own checks and their own messages (measurements §2).
- **An opt-in `lax` option renders data that fails lint**, for testing a lane's rejection path.
  It mirrors `ecc` everywhere: a list setting, a row field, a URL parameter, a record token, a
  loss-note count. Checked means permissive. Its reach is BWIPP's `dontlint` reach (measurements
  §2): it cannot help with missing brackets or a code too long for its symbol; the five GTIN-only
  members still refuse a wrong GTIN; and DataBar Expanded and Expanded Stacked encode the
  corrected check digit of a leading GTIN, so a wrong one cannot reach the scanner from them.
- **Strict first, then lax.** A lax row is encoded strictly first; only a failure triggers the
  lint-off encode. A valid row therefore never changes under the toggle, and the lint message is
  known when the row renders anyway.
- **The scan data shows what the symbol carries, not what was typed.** Where BWIPP encodes a
  GTIN differently from the typed digits, the derivation follows BWIPP: a 13-digit (01) on a
  GTIN-only member gains its check digit, and a leading 14-digit (01) on Expanded or Expanded
  Stacked has its check digit recomputed (measurements §2).
- **BWIPP's messages surface for GS1 formats only**, verbatim, so a tester can search for them.
  `AI 01: Bad checksum` beats `invalid`. The four plain 2D formats keep `✗ invalid`, so their
  pinned tests stand; extending messages to them is a possible later change.
- **The verdict shows what the scanner emits**, option A of three: the AIM symbology identifier,
  then the data with `␝` (U+241D) where a GS character goes, and a count of data characters that
  excludes both. The AI breakdown with names is spec 2. One legend line under the list explains
  the form and that keyboard-wedge scanners usually omit the identifier.
- **GS1-128 over 48 characters is a note, not an error.** GS1 caps a GS1-128 symbol at 48 data
  characters, Application Identifiers included and FNC1 separators excluded (GS1 General
  Specifications §5.4.1), and BWIPP does not enforce it (measurements §3). The row stays valid; the
  verdict says it is over the limit.
- **Linear bwip-js symbols draw at 3 px per module, like JsBarcode**, with a uniform 10-module
  quiet zone. GS1-128's bar height is set to match JsBarcode's 160 px; the DataBar members keep
  BWIPP's default module-defined heights, because BWIPP would squash them if told a height.
- **No human-readable text under any bwip-js symbol.** BWIPP draws none for four of the seven
  DataBar members, the glyph outlines inflate an SVG twentyfold and eat the encode-cache budget,
  and the text widens some symbols so module counts would need a second encode (measurements §1).
  The verdict carries the data.
- **Whitespace is stripped, commas are kept.** GS1 character set 82 has no space, so stripping is
  lossless for valid data and lets a label's spaced-out string paste; it does include the comma,
  so GS1 formats split on newlines only.
- **One name per control.** The page box is `Render GS1 data that fails validation`; a row's box
  is `Render if invalid`; the loss note calls it `the render-if-invalid setting`; the result tails
  say `with invalid GS1 data rendered` or `skipped`.
- **No `$effect`.** Function bindings and event handlers only, the project convention.

## The registry — `src/lib/formats.ts`

`FormatId` gains eleven members, in this order after `aztec`:

```
'gs1128' | 'databaromni' | 'databartruncated' | 'databarstacked' | 'databarstackedomni'
| 'databarlimited' | 'databarexpanded' | 'databarexpandedstacked'
| 'gs1datamatrix' | 'gs1qr' | 'gs1dotcode'
```

`BwipDescriptor` becomes:

```ts
export interface Gs1Carrier {
	aim: string; // the AIM symbology identifier the scanner prefixes: ']C1', ']e0', ']d2', ']Q3', ']J1'
	gtinCheck?: 'own' | 'implied';
	// 'own': the five GTIN-only DataBar members check the GTIN themselves (lax cannot override) and
	//        accept 13 digits, encoding the check digit. 'implied': Expanded and Expanded Stacked
	//        recompute the check digit of a leading 14-digit (01). See _Scan data_.
}
export interface BwipDescriptor extends DescriptorBase {
	engine: 'bwipjs';
	bcid: BwipEncoderId; // the named encoder in bwip-js/browser; the engine's ENCODERS map is keyed by it
	shape: 'linear' | '2d'; // '2d' takes the matrix render path and CSS; 'linear' the 3 px/module path
	gs1?: Gs1Carrier; // present on GS1 carriers only
	quietZone: number; // modules of padding on every side
	modulePx: { x: number; y: number }; // px per module at scale 1 (measurements §1)
	moduleOffsetPx?: { x: number; y: number }; // px to subtract before dividing; DotCode draws 2n + 1
	denseAbove: number; // module columns above which facts.dense is true
	heightMm?: number; // bwip-js `height`; GS1-128 only. Never set for DataBar (measurements §1)
	maxChars?: number; // soft ceiling on data characters (GS excluded); GS1-128: 48
}
export type BwipEncoderId =
	| 'qrcode' | 'datamatrix' | 'pdf417' | 'azteccode'
	| 'gs1_128' | 'databaromni' | 'databartruncated' | 'databarstacked' | 'databarstackedomni'
	| 'databarlimited' | 'databarexpanded' | 'databarexpandedstacked'
	| 'gs1datamatrix' | 'gs1qrcode' | 'gs1dotcode';
```

`shape`, `gs1`, `maxChars` and the other new fields exist on `BwipDescriptor` only. Code reads them
after narrowing with `d.engine === 'bwipjs'` or `isGs1(d)`; `ecc` stays on the base so `d.ecc`
reads on the union as today.

The four existing 2D descriptors gain `shape: '2d'` and a `quietZone` that reproduces today's
8 px: 4 for QR Code, Data Matrix and Aztec (2 px per module), 8 for PDF417 (1 px per X-module).
Their rendered output is byte-identical to today's, and the existing SVG snapshots do not change.

The eleven new descriptors, all `engine: 'bwipjs'`, `group: 'GS1'`, `numeric: false`,
`normalize: stripWhitespace` (where `stripWhitespace = (t) => t.replace(/\s+/g, '')`):

| id                       | label                               | bcid                     | shape  | gs1.aim | gs1.gtinCheck | modulePx | offset | quietZone | denseAbove | ecc        | other              |
| ------------------------ | ----------------------------------- | ------------------------ | ------ | ------- | ------------- | -------- | ------ | --------- | ---------- | ---------- | ------------------ |
| `gs1128`                 | GS1-128                             | `gs1_128`                | linear | `]C1`   | —             | 1×1      | —      | 10        | 300        | —          | heightMm 18.3, maxChars 48 |
| `databaromni`            | GS1 DataBar Omnidirectional         | `databaromni`            | linear | `]e0`   | own           | 1×1      | —      | 10        | 300        | —          |                    |
| `databartruncated`       | GS1 DataBar Truncated               | `databartruncated`       | linear | `]e0`   | own           | 1×1      | —      | 10        | 300        | —          |                    |
| `databarstacked`         | GS1 DataBar Stacked                 | `databarstacked`         | linear | `]e0`   | own           | 1×1      | —      | 10        | 300        | —          |                    |
| `databarstackedomni`     | GS1 DataBar Stacked Omnidirectional | `databarstackedomni`     | linear | `]e0`   | own           | 1×1      | —      | 10        | 300        | —          |                    |
| `databarlimited`         | GS1 DataBar Limited                 | `databarlimited`         | linear | `]e0`   | own           | 1×1      | —      | 10        | 300        | —          |                    |
| `databarexpanded`        | GS1 DataBar Expanded                | `databarexpanded`        | linear | `]e0`   | implied       | 1×1      | —      | 10        | 300        | —          |                    |
| `databarexpandedstacked` | GS1 DataBar Expanded Stacked        | `databarexpandedstacked` | linear | `]e0`   | implied       | 1×1      | —      | 10        | 300        | —          |                    |
| `gs1datamatrix`          | GS1 DataMatrix                      | `gs1datamatrix`          | 2d     | `]d2`   | —             | 2×2      | —      | 4         | 100        | —          |                    |
| `gs1qr`                  | GS1 QR Code                         | `gs1qrcode`              | 2d     | `]Q3`   | —             | 2×2      | —      | 4         | 100        | `QR_ECC`   |                    |
| `gs1dotcode`             | GS1 DotCode                         | `gs1dotcode`             | 2d     | `]J1`   | —             | 2×2      | 1×1    | 4         | 100        | —          |                    |

The QR choices move to a hoisted `const QR_ECC: EccOption` that both `qr` and `gs1qr` reference,
since one array element cannot refer to a sibling. GS1 DataMatrix offers no level; DotCode's
correction is fixed by its size, so neither declares `ecc`. The AIM identifiers are ISO/IEC 15424
values: `]C1` Code 128 with FNC1 in first position, `]e0` GS1 DataBar, `]d2` Data Matrix with
FNC1, `]Q3` QR Code with FNC1 and no ECI, `]J1` DotCode with FNC1; the human rows confirm them
against a real scanner, `]J1` in particular. `heightMm: 18.3` gives 53 px at scale 1, 159 px at
3 px per module, within 1 px of JsBarcode's 160 (measurements §1).

The file header's rules change: "Descriptors stay data-only" stands; "CODE39 must never define
`normalize`" stands and gains "the GS1 descriptors are the only ones that do, to strip whitespace".
`FORMAT_GROUPS` gains an eighth group, `GS1`, last. `DEFAULT_FORMAT` stays `upc`.

Two helpers join `canonicalEcc`:

```ts
/** Narrowing guard used by the engine, the page, the editor and canonicalLax. */
export function isGs1(d: FormatDescriptor | undefined): d is BwipDescriptor & { gs1: Gs1Carrier } {
	return d?.engine === 'bwipjs' && d.gs1 !== undefined;
}
/** A lax flag is meaningful only on a GS1 format. */
export function canonicalLax(format: FormatId, lax: boolean): boolean {
	return lax && isGs1(FORMAT_BY_ID.get(format));
}
```

## Engine — `src/lib/engines/bwipjs.ts`, `src/lib/engines/types.ts`

**Encoders.** `ENCODERS` grows to fifteen entries, keyed by `BwipEncoderId`, importing the eleven
named encoders from `bwip-js/browser`. `ECC_OPTIONS` gains `gs1qrcode` (the `qrcode` mapping) and
`() => ({})` for the rest.

**Encode options.** Built as a `Record<string, unknown>`, because `dontlint` is not in bwip-js's
typings and an explicit key in a typed literal would be an excess-property error:
`{ ...eccExtra, bcid: d.bcid, text: value, scale: 1, padding: d.quietZone * d.modulePx.x }`, plus
`height: d.heightMm` when set and `dontlint: true` only on the lax encode. `padding` is in px at
scale 1 (measurements §1), so this is the quiet zone in modules for every format. The cache key
becomes `${d.bcid}\0${ecc ?? ''}\0${lax ? 'lax' : ''}\0${value}`.

**Resolution.** A module-private `encodeResolved(d, value, options)` returns
`{ encoded, lint?: string }` or throws:

1. Encode strictly (cache key without `lax`). On success return it, no `lint`.
2. If it threw and `options.lax` is not true, rethrow.
3. Encode with `dontlint: true` (cache key with `lax`). On success return it with `lint` set to
   the strict error's text (`bwippErrorText`), or `'failed validation'` when the strict error has
   no BWIPP text. On failure: if the lax error carries a BWIPP name (`bwippErrorName`), throw the
   lax error; otherwise throw the strict error, because a lint-off encode can die with a plain
   `TypeError` on input the strict pass described precisely (measurements §2).

Both `check` and `render` go through it, so a row renders exactly what its verdict described.
Both encodes are memoised, failures included, as today.

**Error text.** `bwippErrorName(message)` stays. `bwippErrorText(message)` returns the text after
`bwipp.<name>#<digits>: `, or undefined when the message is not of that form. The `#<line>`
suffix changes between bwip-js versions; the text does not (measurements §2).

**Too long.** `TOO_LONG` gains eight names: `gs1128inputTooLong`, `gs1datamatrixinputTooLong`,
`gs1qrcodeinputTooLong`, `gs1dotcodeinputTooLong`, `gs1databarexpandedTooLong`,
`dotcodeinputTooLong`, `dotcodeTooLong` and `dotcodeSymbolTooLarge`. The plain QR Code and Data
Matrix names already in the set cover GS1 QR Code and GS1 DataMatrix capacity failures, which are
reachable only under `lax` (measurements §3). The existing test that pins the set's size and
members is updated to the twenty names.

**`CheckResult`** becomes:

```ts
export type CheckResult =
	| { valid: true; encoded?: string; facts?: SymbolFacts; gs1?: Gs1Data; lint?: string }
	| { valid: false; reason?: 'too-long'; message?: string };
```

**`check`.** `w` and `h` are the symbol's size **without padding**, captured from the drawing's
`init(W, H)` as today (the viewBox is larger by twice the padding). On success:
`cols = (w − offset.x) / modulePx.x`, `rows = (h − offset.y) / modulePx.y` with the offset
defaulting to 0; `summary` is `${cols} modules wide` for `shape: 'linear'`, the existing
`${cols}×${rows} modules` for `'2d'`, PDF417's column form unchanged; `dense` is
`cols > denseAbove`. For a GS1 descriptor, `gs1` is `scanData(d, value)` (next section) and
`bytes` is the UTF-8 length of `gs1.data`; otherwise `bytes` is the UTF-8 length of `value` as
today. `lint` is copied from `encodeResolved`. On failure: `reason: 'too-long'` when the thrown
error's name is in `TOO_LONG`; for a GS1 descriptor, `message` is `bwippErrorText` of the thrown
error when it has one. Non-GS1 descriptors never set `message`.

**`render`** calls `encodeResolved`, parses the SVG as today, then sizes it by shape: `'2d'`
scales the long side to `NATURAL_PX` as today; `'linear'` sets `width` and `height` to three times
the viewBox's, which includes the quiet zone, so a GS1-128 of 255 modules becomes
`(255 + 20) × 3 = 825` px wide and `(53 + 20) × 3 = 219` px tall, and the 1D CSS cap of
`min(90vw, 640px)` shrinks it exactly as it shrinks a JsBarcode CODE128 of the same width.

## Scan data — `src/lib/gs1.ts` (new)

```ts
export const GS = '\u001d';
export const GS_MARK = '␝'; // ␝, what the verdict shows for GS
/** GS1 General Specifications Figure 7.8.5-2; identical to BWIPP's `aifixed` (measurements §4). */
export const PREDEFINED_LENGTH_PREFIXES: ReadonlySet<string> = new Set([
	'00', '01', '02', '03', '04', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
	'31', '32', '33', '34', '35', '36', '41'
]);
export interface Gs1Data { aim: string; data: string } // data holds real GS characters
export function parseElementString(text: string): { ai: string; value: string }[] | null;
export function gtinCheckDigit(digits: string): string; // GS1 mod-10 over 13 digits
export function scanData(d: BwipDescriptor & { gs1: Gs1Carrier }, value: string): Gs1Data;
export function displayData(data: string): string; // GS → ␝
export function dataCharacters(data: string): number; // code points of data without GS
```

`parseElementString` first drops one trailing `(` (BWIPP's parser ignores exactly one;
measurements §2), then matches `/\(([^()]*)\)([^(]*)/g` from the start and requires the matches to
cover the whole string; otherwise it returns null. It runs only on strings BWIPP has already
accepted, so null is a fallback, not a validation. The AI is taken as written, digits or not: under
`lax` BWIPP encodes `(99999)` and `(B)` as AIs and places FNC1 by the same first-two-characters rule.

`scanData` builds the pairs, then applies the carrier's GTIN rule:

- `gtinCheck: 'own'`: when the (01) value has 13 digits, append `gtinCheckDigit` of it. These
  members accept 13 digits and encode the check digit themselves (measurements §2).
- `gtinCheck: 'implied'`: when the first pair is `01` with a 14-digit value, replace its last digit
  with `gtinCheckDigit` of the first 13. BWIPP's compaction implies the check digit, so a wrong
  typed digit never reaches the symbol (measurements §2). A (01) that is not first is left as typed.

It then concatenates `ai + value` for each pair and inserts `GS` after every value whose pair is
not last and whose `ai` does not start with a prefix in the set. On a null parse it returns
`{ aim, data: value }` so a row never crashes. `dataCharacters` counts code points after removing
GS; `displayData` replaces each GS with `␝`.

Examples:

- `(01)09501101530003(17)261231(10)LOT42` → `01095011015300031726123110LOT42`, 31 characters, no
  GS: (01) and (17) are predefined, (10) is last.
- `(10)LOT42(01)09501101530003` → `10LOT42␝0109501101530003`, 23 characters (24 bytes).
- `(3103)000123(10)X` → `3103000123` + `10X`, 13 characters: 31 is predefined.
- `(8110)106141416543213500110000310123196000(10)X` → the (8110) value, then GS, then `10X`.
- `(10)A(` → the single pair 10/A, data `10A`.
- `(01)0950110153000` on DataBar Omnidirectional → `0109501101530003`, 16 characters.
- `(01)09501101530004(17)261231(10)LOT42` on DataBar Expanded under lax →
  `01095011015300031726123110LOT42`: the typed `4` becomes the implied `3`.

## Entries, options and settings — `src/lib/types.ts`, `src/lib/codes.ts`, `src/lib/rows.ts`

```ts
export interface SymbolOptions { ecc?: string; lax?: boolean } // lax present only for GS1 formats
export interface CodeEntry { …; gs1?: Gs1Data; lint?: string; message?: string }
export interface Settings { …; lax: boolean } // DEFAULT_SETTINGS.lax = false
export interface ListOptions { format: FormatId; ecc: string; lax: boolean }
export interface Row { payload: string; format: FormatId; ecc: string; lax: boolean }
```

`resolveOptions(d, list, override)` loses its `if (!d.ecc) return {}` early return and builds the
object field by field: `ecc` as today when `d.ecc` is set; `lax` when `isGs1(d)`, as
`override?.lax ?? (d.id === list.format ? list.lax : undefined) ?? false`. A non-GS1 descriptor
still resolves to `{}` or `{ ecc }`, so existing equality tests stand; GS1-128 resolves to
`{ lax }`, GS1 QR Code to `{ ecc, lax }`.

`parseCodeList(raw, format, ecc = '', lax = false)` passes `lax` in the list options. Its two
callers pass the setting: the setup page's `entries` derivation (`parseCodeList(text, format, ecc,
lax)`) and **the play page**, `src/routes/play/+page.svelte`, which rebuilds the list from the URL
with `parseCodeList(decoded.codes.join('\n'), settings.format, settings.ecc, settings.lax)`.
Without the play-page change a list link carrying `lax=1` would validate strictly there and play
nothing for the rows the toggle exists for. `rowEntry` passes
`{ format: row.format, ecc: '', lax: false }` and the override `{ ecc: row.ecc, lax: row.lax }`, so
per-row links need no play-page change. `buildEntry` spreads the `CheckResult` in whole as today,
so `gs1`, `lint` and `message` land on the entry when present.

`rowsFromText(text, format, ecc, lax)` gives every row the list's flag. `textFromRows` returns
`{ text, format, ecc, lax, loses: { formats, levels, splits, validation } }`: `lax` is the first
live row's; a row counts once, under `formats` if its format differs, else under `levels` if its
level differs, else under `validation` if its flag differs; `splits` as today.

**The loss note.** `describeLoss(loses, result)` with `result: { format, ecc, lax }` returns three
sentences joined by single spaces, or `''` when every count is 0:

1. The first sentence is today's, `Plain text keeps one format and one error-correction level for
   the whole list, and one code per line.`, unless `loses.validation > 0`, when it is `Plain text
   keeps one format, one error-correction level and one render-if-invalid setting for the whole
   list, and one code per line.` The five pinned examples therefore keep their text.
2. `Switching now ` + clauses + `.`. Clauses, in this order, each only when its count is above 0:
   `the format of N rows`, `the level of N rows`, `the render-if-invalid setting of N rows`, `cuts
   N payloads at line breaks` with ` or commas` appended when the result format is numeric. The
   first present clause among the first three carries the prefix `drops `. `1 row` and `1 payload`
   are singular, as today. Two clauses join with ` and `; three or four join with `, ` and `, and `
   before the last.
3. `Every code will take the format of the first code, LABEL` + a level phrase only when the
   format declares `ecc` (`, and LEVEL` for a non-default level, `, and the format's default
   level` otherwise, as today) + a validation phrase only when the format is GS1 (`, with invalid
   GS1 data rendered` when `result.lax`, `, with invalid GS1 data skipped` otherwise) + `.`.

Examples of the third sentence: `…, GS1-128, with invalid GS1 data skipped.`;
`…, GS1 QR Code, and level H, with invalid GS1 data rendered.`; `…, UPC-A.` unchanged.

## Verdict — `src/lib/verdict.ts`, `src/lib/components/ValidationList.svelte`

`verdictText(entry)` keeps its single-expression shape with one helper for GS1 entries, tested
before the existing `facts` branch so that the ` · UTF-8, no ECI` clause, which compares
`facts.bytes` with `value.length`, never fires on a GS1 entry. States, each with its leading space:

| State                    | Text                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Valid GS1                | ` ✓ · SIZE · N characters[ · dense][ · over the 48-character GS1-128 limit] → AIM DATA`                     |
| Rendered despite lint    | ` ⚠ rendered anyway · LINT · SIZE · N characters[ · dense][ · over …] → AIM DATA`                           |
| Invalid, too long        | ` ✗ too long for LABEL` / ` ✗ too long for LABEL (level X)`, as today, taking precedence over `message`      |
| Invalid with a message   | ` ✗ MESSAGE[ (Render if invalid cannot override this)]`                                                     |
| Invalid, no message      | ` ✗ invalid`                                                                                                 |

- `SIZE` is `facts.summary`; `N characters` is `dataCharacters(gs1.data)` with `1 character`
  singular; `DATA` is `displayData(gs1.data)`.
- The over-limit note appears when the descriptor sets `maxChars` and the character count exceeds
  it, worded from the descriptor: `over the ${maxChars}-character ${label} limit`.
- The override suffix appears when the row's resolved `lax` is true, the descriptor's `gtinCheck`
  is `'own'` and the entry is invalid with a message: the toggle cannot help on these five.
- A parentheses suffix, ` (parentheses inside a value are not supported)`, is appended to a
  `message` or a `LINT` when `parseElementString(value)` yields any `ai` containing a non-digit,
  which only a `(` inside a value produces.
- Non-GS1 entries produce exactly today's strings.

Worked examples, measured (measurements §1 and §2):

- GS1-128, `(01)09501101530003(17)261231(10)LOT42`:
  ` ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42`
- GS1-128, `(10)LOT42(01)09501101530003`:
  ` ✓ · 222 modules wide · 23 characters → ]C1 10LOT42␝0109501101530003`
- GS1 QR Code (default M), the first payload:
  ` ✓ · 25×25 modules · 31 characters → ]Q3 01095011015300031726123110LOT42`
- GS1 DataMatrix, the first payload:
  ` ✓ · 18×18 modules · 31 characters → ]d2 01095011015300031726123110LOT42`
- GS1 DotCode, the first payload:
  ` ✓ · 29×20 modules · 31 characters → ]J1 01095011015300031726123110LOT42`
- GS1 DataBar Omnidirectional, `(01)0950110153000`:
  ` ✓ · 96 modules wide · 16 characters → ]e0 0109501101530003`
- GS1-128, `(01)09501101530004`, lax:
  ` ⚠ rendered anyway · AI 01: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004`
- GS1 DataBar Expanded, `(01)09501101530004(17)261231(10)LOT42`, lax:
  ` ⚠ rendered anyway · AI 01: Bad checksum · 281 modules wide · 31 characters → ]e0 01095011015300031726123110LOT42`
- GS1-128, `(01)09501101530003(10)` + 20 `A` + `(21)` + 10 `B` (50 characters, 519 modules):
  ` ✓ · 519 modules wide · 50 characters · dense · over the 48-character GS1-128 limit → ]C1 010950110153000310AAAAAAAAAAAAAAAAAAAA␝21BBBBBBBBBB`
- GS1-128, the same with 7 `B` (47 characters, 486 modules):
  ` ✓ · 486 modules wide · 47 characters · dense → ]C1 010950110153000310AAAAAAAAAAAAAAAAAAAA␝21BBBBBBB`
- GS1-128, `(01)09501101530003(17)261345`: ` ✗ AI 17: Invalid month`
- GS1 DataBar Omnidirectional, `(01)09501101530004`, not lax:
  ` ✗ Incorrect GS1 DataBar Omnidirectional check digit provided`; lax:
  ` ✗ Incorrect GS1 DataBar Omnidirectional check digit provided (Render if invalid cannot override this)`
- GS1-128, Expanded, Expanded Stacked and the three 2D carriers, `0109501101530003`:
  ` ✗ AIs must start with '('`; the five GTIN-only members: ` ✗ GS1 DataBar Omnidirectional must be
  13 or 14 digits` with each member's own name.
- GS1-128, `(01)09501101530003(10)A(B)C`:
  ` ✗ AI B: Unrecognised AI (parentheses inside a value are not supported)`

Two shared texts change and one is added, all in `verdict.ts`:

- `DENSE_HINT`: `Dense: more than 100 modules across (PDF417 and the linear GS1 formats: 300), so
  each module is small on screen. If the scanner misses these, shorten the payload, lower error
  correction if the format offers it, or go full screen.`
- `SCAN_HINT` (new), shown under the validation list and under the row editor whenever any entry
  has `gs1`: `After → is what a scanner sends when it transmits its symbology identifier (]C1, ]e0,
  ]d2, ]Q3 or ]J1); ␝ marks a GS separator. Keyboard-wedge scanners usually omit the identifier and
  may drop or change the separator. Character counts exclude both.`
- `LAX_NOTE` (new), the toggle's description on the page and in the row editor: `Ticked, a code
  that fails GS1 validation is drawn anyway, flagged amber with the reason. It cannot help with
  missing brackets or a code too long for its symbol; GS1 DataBar Omnidirectional, Truncated,
  Stacked, Stacked Omnidirectional and Limited still refuse a wrong GTIN; and GS1 DataBar Expanded
  and Expanded Stacked carry the corrected check digit of a leading GTIN.`
- `GS1_HINT` (new): `GS1 formats take bracketed element strings, such as
  (01)09501101530003(10)LOT42, one code per line. Spaces and line breaks are removed, commas are
  data, and parentheses inside a value are not supported.`

`ValidationList` gives an `li` the class `lenient` instead of `valid` when `entry.lint` is set,
coloured `#9a6700` (at least 4.5:1 on the white background; the app has no dark theme). The row
editor's verdict span does the same. The ⚠ glyph and the words `rendered anyway` carry the state
without colour.

## Share URL — `src/lib/shareUrl.ts`

**List links.** `appendSettings` writes `lax=1` after `ecc` and before `mode`, only when the
caller asked for list options (the existing `withEcc` flag, renamed `withListOptions`), the list
format is GS1 and `settings.lax` is true. Decoding sets `settings.lax = true` only when
`params.get('lax') === '1'` and the resolved format (`settings.format ?? DEFAULT_FORMAT` after
`fmt`) is GS1; any other value or format leaves `settings.lax` at its default, false. Rows links
never write the `lax=` parameter, as they never write `ecc=`; per-row state travels in record
tokens. Decoding reads `lax=1` whatever the mode, so a hand-written rows link with `lax=1` sets the
list flag while in Per row, where it is invisible and is replaced by `applyConversion` on a switch
to Plain text; harmless.

**Records.** The record value becomes `format[-token]*_payload`, written as
`${format}${ecc ? '-' + ecc : ''}${lax ? '-lax' : ''}_${token}`. `parseRecord` matches
`/^([a-z0-9]+)((?:-[A-Za-z0-9]*)*)_([\s\S]*)$/`; the tokens are `group2.split('-').slice(1)`,
compared case-sensitively, empty tokens skipped. `lax` is `canonicalLax(format, tokens.includes('lax'))`;
the level is the first token for which `isEccChoice` holds for the format, through
`canonicalEcc`, else `''`; every other token is ignored, as an unknown level is today.
`parseRecord` always sets `lax`, false for non-GS1 formats, so record equality tests gain the
field. Today's links have at most one token and parse unchanged, including the empty token
`qr-_hello`. The head ends at the first `_`, as today, because no token contains one.

Examples: `#r1=gs1128-lax_%2801%2909501101530004&r2=gs1qr-H_%2801%2909501101530003` decodes to
row 1 `{ format: 'gs1128', ecc: '', lax: true }` and row 2 `{ format: 'gs1qr', ecc: 'H', lax: false }`;
`r1=gs1qr-lax-H_…` equals `r1=gs1qr-H-lax_…`; `r1=gs1qr-foo-H_…` gives `ecc: 'H'`;
`r1=upc-lax_036000291452` gives `lax: false`; `r1=gs1128-LAX_…` gives `lax: false`.
Parentheses are percent-encoded by `URLSearchParams` (`(` → `%28`, `)` → `%29`), three characters
each, so a GS1 link is longer than its payloads; the share-QR status line already reports when a
link makes a dense QR or exceeds capacity.

## Setup page and row editor — `src/routes/+page.svelte`, `src/lib/components/RowEditor.svelte`

**State.** `let lax = $state(initial.lax)`; `settings` includes it; `const uid = $props.id()` is
added to the page. `selectFormat(next)` sets `lax = canonicalLax(next, lax)` beside the ecc
canonicalisation. The textarea placeholder reads `Paste GS1 element strings — one per line` when
`isGs1(descriptor)`.

**Plain text mode, GS1 list format.** Under the format select, `p.gs1-hint` with `GS1_HINT`. In the
settings row, after the level select when the format declares `ecc` and in its slot otherwise, the
toggle, laid out like the existing `Loop` checkbox (label text first, input below, same `.field`
pattern):

```svelte
<label class="field lax-field"
	>Render GS1 data that fails validation
	<input type="checkbox" class="lax-input" bind:checked={lax} aria-describedby="{uid}-lax-note" />
</label>
<p class="lax-note" id="{uid}-lax-note">{LAX_NOTE}</p>
```

Neither appears in Per row mode on the page; the row editor carries them (below).

`EDITOR_HINT` becomes `Per row gives each code its own format, error-correction level and GS1
validation setting, and lets a code span several lines.`

**Conversions.** `selectEditor` calls `rowsFromText(text, format, ecc, lax)`; `textFromRows(rows,
{ format, ecc, lax })`; `isLossless` requires all four counts zero; `switchAnyway`'s sameness test
adds `validation` and `lax`; `applyConversion` sets `lax = c.lax`. An upload in Per row appends
`rowsFromText(fileText, format, '', false)`.

**Row editor.** After a GS1 row's level select, or after its format select when it has none:

```svelte
<label class="row-lax">
	<input type="checkbox" aria-label="Render code {i + 1} if invalid" bind:checked={row.lax} />
	Render if invalid
</label>
```

The row's format setter sets `row.lax = canonicalLax(next, row.lax)` beside the ecc
canonicalisation; `add()` creates rows with `lax: false`. The verdict span takes `lenient` when
`entry.lint` is set. Tab order within a row: payload, format, level when shown, Render if invalid
when shown, Move up, Move down, Delete. Below the row list, after `ROW_HINT`: `p.gs1-hint` with
`GS1_HINT` and `p.lax-note` with `LAX_NOTE` when any row's format is GS1 or `newRowFormat` is GS1;
`p.scan-hint` with `SCAN_HINT` when any row's entry has `gs1`; the dense hint as today.
`ValidationList` shows `SCAN_HINT` under the same rule for its entries.

## Rendering in the column — `src/lib/items.ts`, `src/lib/barcode.ts`

`buildItems` already adds `barcode-item--2d` and `barcode-item--${format}` to every bwip-js entry;
the change gates `--2d` on `d.shape === '2d'` and keeps the per-format class for every bwip-js
entry. Linear GS1 items therefore take the 1D CSS (`max-width: min(90vw, 640px); height: auto`),
2D GS1 items the 2D CSS; no stylesheet changes. `renderBarcodeSvg` dispatches as today. Scroll and
Step playback are untouched: a lax-rendered entry is a valid entry.

## Edge cases

- **Lax on, row valid.** The strict encode succeeds; no `lint`; verdict and symbol identical to
  the toggle being off.
- **Lax on, syntax error** (`0109…`): both encodes fail; ` ✗ AIs must start with '('`, or the
  member's `must be 13 or 14 digits` on the five GTIN-only members.
- **Lax on, GTIN-only member, wrong GTIN:** both encodes fail with the member's own message, and
  the verdict adds ` (Render if invalid cannot override this)`.
- **Lax on, Expanded or Expanded Stacked, wrong check digit on a leading (01):** renders; the
  verdict is amber with `AI 01: Bad checksum`, and its data shows the corrected digit, which is
  what the symbol carries. A wrong digit on a (01) that is not first is encoded as typed.
- **A 13-digit (01) on a GTIN-only member:** valid; the data shows 14 digits.
- **Lax on, too long under `dontlint`:** the lax error names a capacity failure;
  ` ✗ too long for GS1 QR Code (level H)`; the strict lint error is not shown.
- **Lax on, lax encode dies without a BWIPP name** (non-ASCII in a DataBar Expanded value): the
  strict error is shown, ` ✗ AI 10: Invalid CSET 82 character`.
- **Lax on, `^` in a value:** BWIPP treats `^FNC1` and `^NNN` as escapes with lint off; `^FNC1`
  becomes a real FNC1 and `^029B` fails with `Unknown function character: 029B`. The verdict's data
  shows the typed characters; modelling the escapes is out of scope.
- **Repeated AI with differing values** (`(10)A(10)B`): lint `Repeated AIs (10) must have the same
  value`; renders under lax, data `10A␝10B`.
- **A parenthesis inside a value** (`(10)A(B)C`): BWIPP reads `(B)` as an AI; strict
  ` ✗ AI B: Unrecognised AI (parentheses inside a value are not supported)`; under lax it renders
  and the scan data follows BWIPP's placement, with the same suffix on the amber line.
- **A single trailing `(`:** BWIPP drops it and so does the parser; `(10)A(` is `(10)A`.
- **Whitespace** (`(01) 0950 1101 5300 03`, or a line break inside a Per row payload): stripped by
  `normalize` before BWIPP sees it, so a space never reaches lint; `raw` keeps it; the verdict's
  data shows the stripped form; a line break counts as a split on the lossy switch, as today for
  numeric rows.
- **Commas and lowercase** are CSET 82 and stay data; a comma never splits a GS1 list.
- **Non-ASCII or `^` in a value, strict:** `AI nn: Invalid CSET 82 character`.
- **`lax=1` with a non-GS1 `fmt`**, or a `-lax` token on a non-GS1 record: ignored.
- **A pre-deploy build opening a new link:** `fmt=gs1128` fails `isFormatId` and falls back as
  any unknown format does today.
- **Encode cache.** GS1 SVGs without text are small, 0.6 to 5 kB for the linear carriers and a
  few kB for the 2D ones, but DotCode draws every dot as a path: 16 kB for the sample and
  1.8 MB for a 2 000-character lax payload (measurements §1). The 32 M-character budget holds
  hundreds of ordinary rows and about seventeen of the worst case before it clears.
- **The `encoded` field** stays 1D-JsBarcode-only; GS1 entries carry `gs1.data` instead.

## Testing

Baseline: 27 files, 411 tests, Node 24.17.0. Sample payloads S, G and E as in the measurements
note. Records are written in their URL form with `%28`/`%29` where a test decodes a URL and in
plain form elsewhere.

**Fixtures and pinned expectations that change** (all updated, none deleted):

- Full `Settings` literals gain `lax: false`: `src/lib/scroller.test.ts` and
  `src/lib/shareUrl.test.ts`.
- Row builders gain `lax: false`: the `deck` helpers in `src/lib/rows.test.ts`,
  `src/lib/shareUrl.test.ts` and `src/lib/components/RowEditor.svelte.test.ts`; record equality
  expectations such as `[{ payload: 'x', format: 'qr', ecc: '' }]` gain `lax: false`.
- `ListOptions` literals gain `lax: false`: `src/lib/codes.test.ts`, `src/lib/engines/bwipjs.test.ts`
  and `FALLBACK` in `src/lib/rows.test.ts`; the `n()` and `lossless()` helpers there gain
  `validation` and `lax`; `describeLoss` calls gain `result.lax`.
- `src/lib/formats.test.ts`: "defines no day-one behavior hooks" becomes "no JsBarcode descriptor
  defines `normalize`; every GS1 descriptor does"; "declares ecc only on qr, pdf417 and aztec" adds
  `gs1qr`; the count and group assertions move to 36 and eight groups.
- `src/lib/engines/bwipjs.test.ts`: the `TOO_LONG` membership test moves to the twenty names.
- `DENSE_HINT` text, hard-copied in `src/lib/components/ValidationList.test.ts`; `EDITOR_HINT`,
  pinned in `src/routes/page.test.ts`; the loss note's first sentence stays in every existing
  example, since none has `validation > 0`.

**New and extended cases:**

- **`src/lib/formats.test.ts`** (extended): `FORMATS.length` 36 and 36 unique ids; eight groups
  ending in `GS1`; the GS1 group's ids equal the eleven in table order; the 2D group unchanged;
  every bwip-js descriptor's `bcid` is a function exported by `bwip-js/browser`; every GS1
  descriptor has `numeric: false`, a `normalize` that maps `' (01) 0950 '` to `'(01)0950'`,
  `gs1.aim`, `gs1.gtinCheck` and `shape` from the table; `qr` and `gs1qr` share one `ecc` object;
  the four old 2D descriptors have `shape: '2d'` and `quietZone` 4, 4, 8, 4;
  `canonicalLax('gs1128', true)` true, `('upc', true)` false, `('gs1qr', false)` false; `isGs1`
  true for the eleven and false for all others and for `undefined`.
- **`src/lib/engines/bwipjs.test.ts`** (extended), table-driven over the eleven: the sample
  (S for GS1-128 and the 2D carriers, G for the GTIN-only members, E for Expanded and Expanded
  Stacked) is valid with `facts.cols`, `rows` and `summary` from measurements §1 (`255 modules
  wide`, `96 modules wide`, `96 modules wide`, `50 modules wide`, `50 modules wide`, `74 modules
  wide`, `200 modules wide`, `102 modules wide`, `18×18 modules`, `25×25 modules`, `29×20
  modules`) and `gs1.aim` from the table; `(01)09501101530004` strict gives `{ valid: false,
  message: 'AI 01: Bad checksum' }` on GS1-128, Expanded, Expanded Stacked and the three 2D
  carriers, and with `{ lax: true }` gives `valid: true`, `lint: 'AI 01: Bad checksum'`, with
  `gs1.data` `'0109501101530004'` on GS1-128 (`cols` 134) and the three 2D carriers and
  `'0109501101530003'` on Expanded and Expanded Stacked; the same payload with `{ lax: true }` on
  the five GTIN-only members gives `valid: false` with each member's own `Incorrect GS1 DataBar …
  check digit provided`; `(01)0950110153000` on each GTIN-only member is valid with `gs1.data`
  `'0109501101530003'`; `(01)` → `AI 01: Too short` on GS1-128 and `GS1 DataBar Omnidirectional
  must be 13 or 14 digits` on Omnidirectional; `0109501101530003` with lax on GS1 QR Code → `AIs
  must start with '('`; `(99999)123` strict → `AI 99999: Unrecognised AI`, lax → valid;
  `(10)A(10)B` → `Repeated AIs (10) must have the same value`; `(10)A(` on GS1-128 is valid with
  `gs1.data` `'10A'`; Expanded with the measurements §3 overflow payload → `reason: 'too-long'`;
  DotCode with lax and `(90)` + `x` to 1 998 characters → `reason: 'too-long'`, and to 2 100 →
  `reason: 'too-long'`; GS1 QR Code level H with lax and `(90)` + 3 000 `x` → `reason:
  'too-long'`; Expanded with lax and `(01)09501101530003(10)Aé` → `valid: false`, `message:
  'AI 10: Invalid CSET 82 character'`; plain `qr` over capacity still has no `message`; a strict
  check then a lax check of `(01)09501101530004` on GS1-128 return invalid then valid (distinct
  cache keys); `bwippErrorText('bwipp.GS1badChecksum#3251: AI 01: Bad checksum')` is `'AI 01: Bad
  checksum'` and `bwippErrorText('boom')` undefined; GS1 QR Code S at L, M, H gives 21×21, 25×25,
  29×29; `render` of GS1-128 S gives an SVG with `width` 825 and `height` 219, of DataBar
  Omnidirectional G 348 × 162, and of GS1 QR Code S a 1024 px long side; the four old 2D snapshots
  are unchanged; eleven new snapshots `__snapshots__/bwipjs.<id>.svg`.
- **`src/lib/gs1.test.ts`** (new): `PREDEFINED_LENGTH_PREFIXES` equals the 22 literal values;
  `parseElementString` on S gives three pairs, on `(99999)123` one pair, on `0109` null, on
  `(10)A(B)C` two pairs `10`/`A` and `B`/`C`, on `(10)A(` one pair, on `(10)A((` null;
  `gtinCheckDigit('0950110153000')` is `'3'`; `scanData` gives the seven examples under _Scan
  data_ with real `\u001d`, using descriptors for GS1-128, Omnidirectional and Expanded;
  `dataCharacters` of the second example is 23; `displayData` maps every GS to `␝`; the
  null-parse fallback returns the value unchanged.
- **`src/lib/codes.test.ts`** (extended): `resolveOptions` for GS1-128 under list
  `{ format: 'gs1128', ecc: '', lax: true }` gives `{ lax: true }`, with override `{ lax: false }`
  gives `{ lax: false }`; GS1 QR Code under that list gives `{ ecc: 'M', lax: false }` (list lax
  applies to the list format only); `upc` and `qr` give exactly today's objects;
  `parseCodeList(S, 'gs1128', '', true)` entries carry `options.lax` true; `buildEntry` of
  `'(01) 0950 1101 5300 03'` at `gs1128` has `raw` with spaces, `value` without, `valid` true and
  `gs1.data` `'0109501101530003'`.
- **`src/lib/rows.test.ts`** (extended): rows carry `lax`; `rowsFromText(S, 'gs1128', '', true)`
  gives a row with `lax: true`; `textFromRows`: [`gs1128_G`, `gs1128-lax_G`] →
  `{ 0, 0, 0, 1 }` with `lax` false; [`gs1128-lax_G`, `gs1qr-lax_G`] → `{ 1, 0, 0, 0 }`;
  [`gs1qr-H_G`, `gs1qr-H-lax_G`] → `{ 0, 0, 0, 1 }`; [`gs1qr-H_G`, `gs1qr-L-lax_G`] →
  `{ 0, 1, 0, 0 }` (counted once); the result's `lax` is the first live row's; `describeLoss`
  for `{ 0, 0, 0, 1 }` at `{ format: 'gs1128', ecc: '', lax: false }` is exactly the GS1 first
  sentence, then `Switching now drops the render-if-invalid setting of 1 row.`, then `Every code
  will take the format of the first code, GS1-128, with invalid GS1 data skipped.`; for
  `{ 1, 1, 1, 1 }` at `{ format: 'gs1qr', ecc: 'H', lax: true }` the second sentence is
  `Switching now drops the format of 1 row, the level of 1 row, the render-if-invalid setting of
  1 row, and cuts 1 payload at line breaks.` and the third ends `GS1 QR Code, and level H, with
  invalid GS1 data rendered.`; for `{ 1, 0, 0, 0 }` at `{ format: 'gs1128', ecc: '', lax: true }`
  the first sentence is today's and the third ends `GS1-128, with invalid GS1 data rendered.`;
  the five existing examples are unchanged.
- **`src/lib/shareUrl.test.ts`** (extended): encode `{ …DEFAULT_SETTINGS, format: 'gs1128', lax:
  true }` ends `&fmt=gs1128&lax=1`; with `format: 'upc', lax: true` has no `lax`; with
  `format: 'gs1qr', ecc: 'H', lax: true` ends `&fmt=gs1qr&ecc=H&lax=1`; with step mode the order
  is `fmt=gs1128&lax=1&mode=step&dwell=500`; decode `lax=1` with `fmt=gs1128` sets `lax` true,
  with `fmt=upc` leaves it false, `lax=0` and `lax=yes` leave it false; rows encode
  [`gs1128-lax_(01)09501101530004`] as `r1=gs1128-lax_%2801%2909501101530004`; decode the
  two-record example under _Share URL_; `r1=gs1qr-lax-H_…` equals `r1=gs1qr-H-lax_…`;
  `r1=gs1qr-foo-H_…` → `ecc: 'H'`; `r1=gs1qr--H_…` → `ecc: 'H'`; `r1=upc-lax_036000291452` →
  `lax` false; `r1=gs1128-LAX_…` → `lax` false; `r1=gs1128-foo_…` → `lax` false, `ecc` `''`;
  `r1=qr-H_hello` and `r1=qr-_hello` as today.
- **`src/lib/verdict.test.ts`** (new; verdict text was tested only through components until now):
  the sixteen worked examples under _Verdict_ byte-exact; the 48-character boundary with payloads
  `(01)09501101530003(10)` + 20 `A` + `(21)` + 8 `B` (48 characters, no note) and 9 `B`
  (49 characters, note), asserting on the note's presence only; a GS1 entry never carries
  ` · UTF-8, no ECI`; `DENSE_HINT`, `SCAN_HINT`, `LAX_NOTE` and `GS1_HINT` texts; non-GS1 strings
  unchanged.
- **`src/lib/components/RowEditor.svelte.test.ts`** (extended): a GS1-128 row shows `.row-lax`
  and a UPC row does not; ticking it sets `row.lax`; switching the row to UPC-A clears it; Add
  code gives `lax: false`; a lax GS1-128 row with `(01)09501101530004` has a `lenient` verdict
  span reading the ⚠ example; the aria-label text; `.gs1-hint` and `.lax-note` appear when any row
  or `newRowFormat` is GS1 and not otherwise; `.scan-hint` appears when any row has a GS1 entry;
  tab order with the new box.
- **`src/routes/page.test.ts`** (extended): at `fmt=gs1128` in Plain text the page shows
  `.lax-input`, `.lax-note` and `.gs1-hint` and the GS1 placeholder; at `fmt=upc` none of them;
  at `fmt=gs1qr` the box follows the level select; in Per row at `fmt=gs1128` the page shows none
  of them (the row editor does); ticking the box and switching the format to UPC-A clears it; the
  share link carries `lax=1` while ticked; switching to Per row with the box ticked gives rows
  with `lax: true`; the lossy note shows the render-if-invalid clause for [`gs1128_G`,
  `gs1128-lax_G`]; an upload in Per row appends rows with `lax: false`; `ValidationList` gives the
  lax row the `lenient` class and shows `.scan-hint`.
- **`src/routes/play/page.test.ts`** (extended): `#codes=%2801%2909501101530004&fmt=gs1128&lax=1`
  yields one valid entry and plays it; the same link without `lax=1` yields none.
- **`src/lib/items.test.ts`** (extended): `buildItems` gives a GS1-128 entry no `barcode-item--2d`
  class and a `barcode-item--gs1128` class, and a GS1 QR Code entry both `--2d` and `--gs1qr`.
- `npm run check`, `npm test`, `npm run lint` and `npm run build` green.

## Documentation

README: the features bullet becomes **36 barcode formats**, the 21 JsBarcode linear formats, the
four 2D formats, and eleven GS1 carriers (GS1-128, the seven GS1 DataBar members, GS1 DataMatrix,
GS1 QR Code and GS1 DotCode). A new **GS1** subsection under _Using it_: the bracket syntax with
an example; spaces and line breaks dropped, commas kept, parentheses in values unsupported;
validation by BWIPP's AI linter with the message in the verdict; the **Render GS1 data that fails
validation** box, what it does, that an amber row still plays, that "valid" then means encodable
rather than conformant, and where the box stops (the five GTIN-only members, syntax errors,
Expanded's corrected check digit); that switching to a non-GS1 format clears the box, as it clears
the level; the verdict's `→ ]C1 …␝…` form with the example line
` ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42`, the five
identifiers, what `␝` means and that keyboard-wedge scanners usually omit the identifier and may
drop the separator; the 48-character GS1-128 note; that GS1 symbols, linear ones too, carry no
caption and the list shows the data; that the stacked DataBar members are multi-row symbols a
laser may need several passes for and an imager reads at once; a pointer to Per row for mixed
decks. The _Shareable links_ bullet gains `lax=1` and the `-lax` record token. The engines
paragraph says bwip-js renders the 2D and GS1 formats.

## Verification that fails closed

Every row starts **UNVERIFIED** and passes only when its pass rule is met and recorded. A skipped
row, a check that dies, a run that returns nothing, or a scan recorded without the scanner model,
firmware, read mode and output configuration stays UNVERIFIED, never a pass; the plan reports the
unverified rows as they stand.

1. **Automated checks.** With Node 24 active (`.nvmrc`): `npm run check`, `npm test`,
   `npm run lint`, `npm run build`. Pass: all four exit 0, the Vitest count recorded (411 before
   this spec).
2. **Eleven carriers read.** A Per row deck of the eleven samples (S, G or E per carrier), played
   in Step at dwell `1.00 s`, read by a 2D imager configured to transmit the AIM symbology
   identifier and the GS character (as a visible character or a control code the capture shows),
   scans landing in a text editor. Pass: for each carrier the emitted line equals the verdict's
   `AIM DATA` with `␝` read as GS, recorded per carrier, `]J1` for DotCode in particular; scanner
   model, firmware, read mode and the AIM/GS settings recorded. A carrier the scanner cannot
   decode is recorded as such and stays UNVERIFIED.
3. **Lax at a lane.** GS1-128 `(01)09501101530004` with the box ticked, read by the same scanner
   and, if available, by a point-of-sale lane. Pass: the emitted string (or the rejection) is
   recorded with the device details.
4. **Implied check digit.** DataBar Expanded `(01)09501101530004(17)261231(10)LOT42` with the box
   ticked, read by the imager. Pass: the emitted GTIN ends in `3`, as the verdict says, recorded.
5. **Laser versus imager.** DataBar Stacked and Expanded Stacked G/E read with a laser scanner and
   with an imager. Pass: which device read which carrier is recorded.
6. **Over 48 characters.** The 50-character GS1-128 example. Pass: read or refused, recorded.
7. **Keyboard wedge.** The `(10)LOT42(01)09501101530003` GS1-128 read into a plain text field
   through the scanner's keyboard mode. Pass: what arrives for the GS (a control character, a
   substitute, nothing) and whether `]C1` arrives are recorded.
8. **Browsers.** In Firefox and in Chromium, at 390 px and 1024 px wide: the box, its note, the
   GS1 hint and the scan hint lay out without horizontal scroll in Plain text at GS1-128; a GS1 QR
   Code row's controls line (format, level, Render if invalid, three buttons) wraps without
   overflow at 390 px. Pass: both widths in both browsers.
9. **Keyboard.** Tab order on the page at GS1-128 (format, Render GS1 data…, Playback) and at
   GS1 QR Code (format, Error correction, Render GS1 data…, Playback), and in a GS1 QR Code row
   (payload, format, level, Render if invalid, Move up, Move down, Delete), and Space toggles each
   box, in both browsers. Pass: all in both.
10. **Links.** On the local preview, `#r1=gs1128-lax_%2801%2909501101530004&r2=gs1qr-H_%2801%2909501101530003`
    opens in Per row with row 1 amber and row 2 green; choosing Plain text shows a note whose
    second sentence is `Switching now drops the format of 1 row.` (row 2 differs in format, so it
    counts once, under formats) and whose third is `Every code will take the format of the first
    code, GS1-128, with invalid GS1 data rendered.`; Start plays both; and the list link
    `/play#codes=%2801%2909501101530004&fmt=gs1128&lax=1` plays one code. Pass: all four.
11. **Share QR.** A Plain text list of ten element strings at GS1-128: the share-QR status line
    reports a readable level or says why not. Pass: the line's text recorded and consistent with
    the link length.

## Out of scope

Raw scan data as input and the per-AI breakdown (spec 2). GS1 Digital Link (spec 3). The North
American coupon, (8111) and (8112) (spec 4). Composite symbologies. Human-readable text under
bwip-js symbols. A descriptor-declared option schema. Mandatory-pairing enforcement
(`lintreqs`). Escaping parentheses inside values, and modelling BWIPP's `^` escapes under lax. A
hard 48-character GS1-128 limit. BWIPP messages for the four plain 2D formats. DotCode row and
column control, Expanded Stacked segment control. A lax override for the GTIN-only DataBar
members' own checks. Automated decode round-trips.

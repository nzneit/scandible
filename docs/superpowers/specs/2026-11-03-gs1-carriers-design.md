# GS1 carriers — Design

**Date:** 2026-11-03
**Status:** Design agreed in conversation across five sections on 2026-11-03; awaits a multi-lens
review and the user's review before planning. Spec 1 of a four-spec GS1 series (see _Series_).
**Measurements:** [`docs/research/2026-11-03-gs1-encoder-measurements.md`](../../research/2026-11-03-gs1-encoder-measurements.md),
cited below as _measurements §n_.

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
` ✓ · 255 modules wide · 31 bytes → ]C1 01095011015300031726123110LOT42`, or a plain reason
such as ` ✗ AI 01: Bad checksum`, and presses Start. A scanner with GS1 output enabled emits the
string the verdict showed, GS characters where the verdict shows `␝`. With the opt-in
**Render GS1 data that fails validation** box ticked, a GS1-128 with a wrong check digit renders
anyway, flagged amber, so the lane's rejection path can be tested. Every link issued before this
spec decodes as it did, and every existing format behaves exactly as today.

## Series

Four specs, each with its own plan and PR, in this order. The user chose "all GS1, coupons first"
(the carriers before the coupon), all three input forms (bracketed, raw scan data, Digital Link),
the verdict's encoded form in spec 1 with the AI breakdown in spec 2, carrier set B (the common
set plus Truncated, Stacked and DotCode), and validation with an opt-in render-anyway toggle.

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
   `gs1northamericancoupon`, which enforces the (8110) structure with 60 field-level messages
   (measurements §5), plus a field breakdown of the coupon (company prefix, offer code, save
   value, purchase requirement, family code, optional fields). BWIPP's coupon encoder accepts
   (8110) alone; (8111) loyalty points and (8112) paperless coupons pair with (255) and need their
   own treatment. Whether the coupon gets a field-by-field composer is that spec's question.

Spec 1 leaves these doors open: the `gs1` descriptor field carries the AIM identifier that spec 2
will match on input; the scan-data module's parser is the seam spec 2 extends; the `lax` option
and the lint-message plumbing serve the coupon's 60 messages unchanged.

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
  strings that scanners read fine.
- **An opt-in `lax` option renders data that fails lint**, for testing a lane's rejection path.
  It mirrors `ecc` everywhere: a list setting, a row field, a URL parameter, a record token, a
  loss-note count. Checked means permissive. Its reach is BWIPP's `dontlint` reach (measurements
  §2): the five GTIN-only DataBar members still refuse a wrong GTIN, and missing brackets never
  render.
- **Strict first, then lax.** A lax row is encoded strictly first; only a failure triggers the
  lint-off encode. A valid row therefore never changes under the toggle, and the lint message is
  known when the row renders anyway.
- **BWIPP's messages surface for GS1 formats only.** `AI 01: Bad checksum` beats `invalid`. The
  four plain 2D formats keep `✗ invalid`, so their pinned tests stand; extending messages to them
  is a possible later change.
- **The verdict shows what the scanner emits**, option A of three: the AIM symbology identifier,
  then the data with `␝` (U+241D) where a GS character goes. The AI breakdown with names is
  spec 2. The byte count is the transmitted data's, GS included, not the bracketed text's.
- **GS1-128 over 48 characters is a note, not an error.** GS1 caps GS1-128 at 48 data characters
  and BWIPP does not enforce it (measurements §3). The row stays valid; the verdict says it is
  over the limit.
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
export interface BwipDescriptor extends DescriptorBase {
	engine: 'bwipjs';
	bcid: BwipEncoderId; // the named encoder in bwip-js/browser; the engine's ENCODERS map is keyed by it
	shape: 'linear' | '2d'; // '2d' takes the matrix render path and CSS; 'linear' the 3 px/module path
	gs1?: { aim: string }; // present on GS1 carriers: the AIM symbology identifier the scanner prefixes
	quietZone: number; // modules of padding on every side
	modulePx: { x: number; y: number }; // px per module at scale 1 (measurements §1)
	moduleOffsetPx?: { x: number; y: number }; // px to subtract before dividing; DotCode draws 2n + 1
	denseAbove: number; // module columns above which facts.dense is true
	heightMm?: number; // bwip-js `height`; GS1-128 only. Never set for DataBar (measurements §1)
	maxChars?: number; // soft ceiling on transmitted characters; GS1-128: 48
}
export type BwipEncoderId =
	| 'qrcode' | 'datamatrix' | 'pdf417' | 'azteccode'
	| 'gs1_128' | 'databaromni' | 'databartruncated' | 'databarstacked' | 'databarstackedomni'
	| 'databarlimited' | 'databarexpanded' | 'databarexpandedstacked'
	| 'gs1datamatrix' | 'gs1qrcode' | 'gs1dotcode';
```

The four existing 2D descriptors gain `shape: '2d'` and a `quietZone` that reproduces today's
8 px: 4 for QR Code, Data Matrix and Aztec (2 px per module), 8 for PDF417 (1 px per X-module).
Their rendered output is byte-identical to today's, and the existing SVG snapshots do not change.

The eleven new descriptors, all `engine: 'bwipjs'`, `group: 'GS1'`, `numeric: false`,
`normalize: stripWhitespace` (where `stripWhitespace = (t) => t.replace(/\s+/g, '')`):

| id                       | label                               | bcid                     | shape  | gs1.aim | modulePx | offset | quietZone | denseAbove | ecc        | other              |
| ------------------------ | ----------------------------------- | ------------------------ | ------ | ------- | -------- | ------ | --------- | ---------- | ---------- | ------------------ |
| `gs1128`                 | GS1-128                             | `gs1_128`                | linear | `]C1`   | 1×1      | —      | 10        | 300        | —          | heightMm 18.3, maxChars 48 |
| `databaromni`            | GS1 DataBar Omnidirectional         | `databaromni`            | linear | `]e0`   | 1×1      | —      | 10        | 300        | —          |                    |
| `databartruncated`       | GS1 DataBar Truncated               | `databartruncated`       | linear | `]e0`   | 1×1      | —      | 10        | 300        | —          |                    |
| `databarstacked`         | GS1 DataBar Stacked                 | `databarstacked`         | linear | `]e0`   | 1×1      | —      | 10        | 300        | —          |                    |
| `databarstackedomni`     | GS1 DataBar Stacked Omnidirectional | `databarstackedomni`     | linear | `]e0`   | 1×1      | —      | 10        | 300        | —          |                    |
| `databarlimited`         | GS1 DataBar Limited                 | `databarlimited`         | linear | `]e0`   | 1×1      | —      | 10        | 300        | —          |                    |
| `databarexpanded`        | GS1 DataBar Expanded                | `databarexpanded`        | linear | `]e0`   | 1×1      | —      | 10        | 300        | —          |                    |
| `databarexpandedstacked` | GS1 DataBar Expanded Stacked        | `databarexpandedstacked` | linear | `]e0`   | 1×1      | —      | 10        | 300        | —          |                    |
| `gs1datamatrix`          | GS1 DataMatrix                      | `gs1datamatrix`          | 2d     | `]d2`   | 2×2      | —      | 4         | 100        | —          |                    |
| `gs1qr`                  | GS1 QR Code                         | `gs1qrcode`              | 2d     | `]Q3`   | 2×2      | —      | 4         | 100        | QR's, default M |               |
| `gs1dotcode`             | GS1 DotCode                         | `gs1dotcode`             | 2d     | `]J1`   | 2×2      | 1×1    | 4         | 100        | —          |                    |

`gs1qr` shares the `qr` descriptor's `ecc` object. GS1 DataMatrix offers no level; DotCode's
correction is fixed by its size, so neither declares `ecc`. The AIM identifiers are ISO/IEC 15424
values: `]C1` Code 128 with FNC1 in first position, `]e0` GS1 DataBar, `]d2` Data Matrix with
FNC1, `]Q3` QR Code with FNC1, `]J1` DotCode with FNC1; the human rows confirm them against a
real scanner. `heightMm: 18.3` gives 53 px at scale 1, 159 px at 3 px per module, within 1 px of
JsBarcode's 160 (measurements §1).

The CODE39 rule in the file header still holds; the GS1 descriptors are the first bwip-js
descriptors with `normalize`. `FORMAT_GROUPS` gains an eighth group, `GS1`, last. `DEFAULT_FORMAT`
stays `upc`.

Two helpers join `canonicalEcc`:

```ts
/** A lax flag is meaningful only on a GS1 format. */
export function canonicalLax(format: FormatId, lax: boolean): boolean {
	return lax && isGs1(FORMAT_BY_ID.get(format));
}
/** Narrowing guard used by the engine, the page and the editor. */
export function isGs1(d: FormatDescriptor | undefined): d is BwipDescriptor & { gs1: { aim: string } };
```

## Engine — `src/lib/engines/bwipjs.ts`, `src/lib/engines/types.ts`

**Encoders.** `ENCODERS` grows to fifteen entries, keyed by `BwipEncoderId`, importing the eleven
named encoders from `bwip-js/browser`. `ECC_OPTIONS` gains `gs1qrcode` (the `qrcode` mapping) and
`() => ({})` for the rest.

**Encode options.** For a descriptor `d`, value and resolved options:
`{ ...eccExtra, bcid: d.bcid, text: value, scale: 1, padding: d.quietZone * d.modulePx.x,
height: d.heightMm (only when set), dontlint: true (only when the encode is the lax one) }`.
`padding` is in px at scale 1 (measurements §1), so this is the quiet zone in modules for every
format. The cache key becomes `${d.bcid}\0${ecc ?? ''}\0${lax ? 'lax' : ''}\0${value}`.

**Resolution.** A module-private `encodeResolved(d, value, options)` returns
`{ encoded, lint?: string }` or throws:

1. Encode strictly (cache key without `lax`). On success return it, no `lint`.
2. If it threw and `options.lax` is not true, rethrow.
3. Encode with `dontlint: true` (cache key with `lax`). On success return it with `lint` set to
   the strict error's text (`bwippErrorText`), or `'failed validation'` when the strict error has
   no BWIPP text. On failure throw the lax error.

Both `check` and `render` go through it, so a row renders exactly what its verdict described.
Both encodes are memoised, failures included, as today.

**Error text.** `bwippErrorName(message)` stays. `bwippErrorText(message)` returns the text after
`bwipp.<name>#<digits>: `, or undefined when the message is not of that form. The `#<line>`
suffix changes between bwip-js versions; the text does not (measurements §2).

**Too long.** `TOO_LONG` gains `gs1128inputTooLong`, `gs1datamatrixinputTooLong`,
`gs1qrcodeinputTooLong`, `gs1dotcodeinputTooLong` and `gs1databarexpandedTooLong`. The plain
encoders' names already in the set cover GS1 QR Code and GS1 DataMatrix capacity failures, which
are reachable only under `lax` (measurements §3).

**`CheckResult`** becomes:

```ts
export type CheckResult =
	| { valid: true; encoded?: string; facts?: SymbolFacts; gs1?: Gs1Data; lint?: string }
	| { valid: false; reason?: 'too-long'; message?: string };
```

**`check`.** On success: `cols = (w − offset.x) / modulePx.x`, `rows = (h − offset.y) / modulePx.y`
with the offset defaulting to 0; `summary` is `${cols} modules wide` for `shape: 'linear'`, the
existing `${cols}×${rows} modules` for `'2d'`, PDF417's column form unchanged; `dense` is
`cols > denseAbove`. For a GS1 descriptor, `gs1` is `scanData(d, value)` (next section) and
`bytes` is the UTF-8 length of `gs1.data`; otherwise `bytes` is the UTF-8 length of `value` as
today. `lint` is copied from `encodeResolved`. On failure: `reason: 'too-long'` when the error's
name is in `TOO_LONG`; for a GS1 descriptor, `message` is `bwippErrorText` of the error that
`encodeResolved` threw (the lax one when lax was tried), when it has one. Non-GS1 descriptors
never set `message`.

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
export function scanData(d: BwipDescriptor & { gs1: { aim: string } }, value: string): Gs1Data;
export function displayData(data: string): string; // GS → ␝
```

`parseElementString` matches `/\(([^()]*)\)([^(]*)/g` from the start and requires the matches to
cover the whole string; otherwise it returns null. It runs only on strings BWIPP has already
accepted, so null is a fallback, not a validation. `scanData` concatenates `ai + value` for each
pair and inserts `GS` after every value whose pair is not last and whose `ai` does not start with
a prefix in the set; on a null parse it returns `{ aim, data: value }` so a row never crashes. The
AI is taken as written, digits or not: under `lax` BWIPP encodes `(99999)` and `(B)` as AIs and
places FNC1 by the same first-two-characters rule, so the derivation agrees with it.

Examples: `(01)09501101530003(17)261231(10)LOT42` → `01095011015300031726123110LOT42` (31 bytes,
no GS: (01) and (17) are predefined, (10) is last); `(10)LOT42(01)09501101530003` →
`10LOT42␝0109501101530003` (24 bytes); `(3103)000123(10)X` → `3103000123` + `10X` (31 is
predefined); `(8110)…(10)X` → GS after the (8110) value.

## Entries, options and settings — `src/lib/types.ts`, `src/lib/codes.ts`, `src/lib/rows.ts`

```ts
export interface SymbolOptions { ecc?: string; lax?: boolean } // lax present only for GS1 formats
export interface CodeEntry { …; gs1?: Gs1Data; lint?: string; message?: string }
export interface Settings { …; lax: boolean } // DEFAULT_SETTINGS.lax = false
export interface ListOptions { format: FormatId; ecc: string; lax: boolean }
export interface Row { payload: string; format: FormatId; ecc: string; lax: boolean }
```

`resolveOptions(d, list, override)`: as today for `ecc`; when `isGs1(d)`,
`lax = override?.lax ?? (d.id === list.format ? list.lax : undefined) ?? false`. A non-GS1
descriptor still resolves to `{}` or `{ ecc }`, so existing equality tests stand.
`parseCodeList(raw, format, ecc = '', lax = false)` passes `lax` in the list options. `rowEntry`
passes `{ format: row.format, ecc: '', lax: false }` and the override `{ ecc: row.ecc, lax: row.lax }`.
`buildEntry` spreads the `CheckResult` in whole as today, so `gs1`, `lint` and `message` land on
the entry when present.

`rowsFromText(text, format, ecc, lax)` gives every row the list's flag. `textFromRows` returns
`{ text, format, ecc, lax, loses: { formats, levels, splits, validation } }`: `lax` is the first
live row's; a row counts once, under `formats` if its format differs, else under `levels` if its
level differs, else under `validation` if its flag differs; `splits` as today.

**The loss note.** `describeLoss(loses, result)` with `result: { format, ecc, lax }`:

- First sentence, changed: `Plain text keeps one format, one error-correction level and one GS1
  validation setting for the whole list, and one code per line.` The five pinned examples in the
  tests take the new wording.
- Clauses, in order: `drops the format of N rows`; `[drops ]the level of N rows`;
  `[drops ]the validation setting of N rows`; `cuts N payloads at line breaks[ or commas]`. The
  leading `drops ` appears on the first of the first three clauses only. Two clauses join with
  ` and `; three or four join with commas and `, and ` before the last.
- Result sentence: `Every code will take the format of the first code, LABEL` + (`, and LEVEL`
  or `, and the format's default level` when the format declares `ecc`, as today) + (`, with
  invalid GS1 data rendered` or `, with invalid GS1 data skipped` when the format is GS1) + `.`.
  Examples: `…, GS1-128, with invalid GS1 data skipped.`;
  `…, GS1 QR Code, and level H, with invalid GS1 data rendered.`; `…, UPC-A.` unchanged.

## Verdict — `src/lib/verdict.ts`, `src/lib/components/ValidationList.svelte`

`verdictText(entry)` keeps its single-expression shape with one helper for GS1 entries. States,
each with its leading space:

| State                    | Text                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Valid GS1                | ` ✓ · SIZE · N bytes[ · dense][ · over the 48-character GS1-128 limit] → AIM DATA`                                                        |
| Rendered despite lint    | ` ⚠ LINT · rendered anyway · SIZE · N bytes[ · dense][ · over …] → AIM DATA`                                                                |
| Invalid, too long        | ` ✗ too long for LABEL` / ` ✗ too long for LABEL (level X)`, as today, taking precedence over `message`                                   |
| Invalid with a message   | ` ✗ MESSAGE`                                                                                                                              |
| Invalid, no message      | ` ✗ invalid`                                                                                                                              |

`SIZE` is `facts.summary`; `N bytes` follows today's `1 byte` singular rule; `DATA` is
`displayData(gs1.data)`; the over-limit note appears when the descriptor sets `maxChars` and
`facts.bytes` exceeds it, worded from the descriptor: `over the ${maxChars}-character ${label}
limit`. Non-GS1 entries produce exactly today's strings.

Worked examples, measured (measurements §1):

- GS1-128, `(01)09501101530003(17)261231(10)LOT42`:
  ` ✓ · 255 modules wide · 31 bytes → ]C1 01095011015300031726123110LOT42`
- GS1-128, `(10)LOT42(01)09501101530003`:
  ` ✓ · 222 modules wide · 24 bytes → ]C1 10LOT42␝0109501101530003`
- GS1 QR Code (default M), the first payload:
  ` ✓ · 25×25 modules · 31 bytes → ]Q3 01095011015300031726123110LOT42`
- GS1 DataMatrix, the first payload: ` ✓ · 18×18 modules · 31 bytes → ]d2 …`;
  GS1 DotCode: ` ✓ · 29×20 modules · 31 bytes → ]J1 …`.
- GS1-128, `(01)09501101530004`, lax:
  ` ⚠ AI 01: Bad checksum · rendered anyway · 134 modules wide · 16 bytes → ]C1 0109501101530004`
- GS1-128, `(01)09501101530003(10)` + 20 `A` + `(21)` + 10 `B` (51 transmitted characters):
  ` ✓ · 519 modules wide · 51 bytes · over the 48-character GS1-128 limit → ]C1 010950110153000310AAAAAAAAAAAAAAAAAAAA␝21BBBBBBBBBB`
- GS1-128, `(01)09501101530003(17)261345`: ` ✗ AI 17: Invalid month`
- GS1 DataBar Omnidirectional, `(01)09501101530004`, lax or not:
  ` ✗ Incorrect GS1 DataBar Omnidirectional check digit provided`
- Any GS1 format, `0109501101530003`: ` ✗ AIs must start with '('`

`DENSE_HINT` becomes: `Dense: more than 100 modules across (PDF417 and linear GS1: 300), so each
module is small on screen. If the scanner misses these, shorten the payload, lower error correction
if the format offers it, or go full screen.`

`ValidationList` gives an `li` the class `lenient` instead of `valid` when `entry.lint` is set,
coloured `#9a6700` (4.6:1 on white). The row editor's verdict span does the same.

## Share URL — `src/lib/shareUrl.ts`

**List links.** `appendSettings` writes `lax=1` after `ecc` and before `mode`, only when the
caller asked for list options (the existing `withEcc` flag, renamed `withListOptions`), the list
format is GS1 and `settings.lax` is true. Decoding sets `settings.lax = true` only when
`params.get('lax') === '1'` and the resolved format (after `fmt`) is GS1; any other value or
format leaves it unset. Rows links never write `lax`, as they never write `ecc`.

**Records.** The record value becomes `format[-token]*_payload`, written as
`${format}${ecc ? '-' + ecc : ''}${lax ? '-lax' : ''}_${token}`. `parseRecord` matches
`/^([a-z0-9]+)((?:-[A-Za-z0-9]*)*)_([\s\S]*)$/`; the tokens are the dash-separated pieces of the
second group. `lax` is `canonicalLax(format, tokens.includes('lax'))`; the level is the first
token other than `lax`, or `''`, through `canonicalEcc`; unknown tokens are ignored, as unknown
levels are today. Today's links have at most one token and parse unchanged, including the empty
token `qr-_hello`. The head ends at the first `_`, as today, because no token contains one.

Examples: `#r1=gs1128-lax_%2801%2909501101530004&r2=gs1qr-H_%2801%2909501101530003` decodes to
row 1 `{ format: 'gs1128', ecc: '', lax: true }` and row 2 `{ format: 'gs1qr', ecc: 'H', lax: false }`;
`r1=gs1qr-lax-H_…` equals `r1=gs1qr-H-lax_…`; `r1=upc-lax_036000291452` gives `lax: false`.
Parentheses are percent-encoded by `URLSearchParams` (`(` → `%28`, `)` → `%29`), three characters
each, so a GS1 link is longer than its payloads; the share-QR status line already reports when a
link makes a dense QR or exceeds capacity.

## Setup page and row editor — `src/routes/+page.svelte`, `src/lib/components/RowEditor.svelte`

**State.** `let lax = $state(initial.lax)`; `settings` includes it. `selectFormat(next)` sets
`lax = canonicalLax(next, lax)` beside the ecc canonicalisation. The textarea placeholder reads
`Paste GS1 element strings — one per line` when `isGs1(descriptor)`.

**GS1 hint.** When `isGs1(descriptor)`, in either editor, a `p.gs1-hint` under the format select:
`GS1 formats take bracketed element strings, such as (01)09501101530003(10)LOT42. Spaces are
dropped; parentheses inside a value are not supported.`

**The toggle.** In Plain text mode, when `isGs1(descriptor)`, in the ecc select's slot:

```svelte
<label class="field lax-field">
	<input type="checkbox" class="lax-input" bind:checked={lax} aria-describedby="{uid}-lax-note" />
	Render GS1 data that fails validation
</label>
<p class="lax-note" id="{uid}-lax-note">
	GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional and Limited still
	refuse a wrong GTIN, and missing brackets are never rendered.
</p>
```

`EDITOR_HINT` becomes `Per row gives each code its own format, error-correction level and GS1
validation setting, and lets a code span several lines.`

**Conversions.** `selectEditor` calls `rowsFromText(text, format, ecc, lax)`; `textFromRows(rows,
{ format, ecc, lax })`; `isLossless` requires all four counts zero; `switchAnyway`'s sameness test
adds `validation` and `lax`; `applyConversion` sets `lax = c.lax`. An upload in Per row appends
`rowsFromText(fileText, format, '', false)`.

**Row editor.** After a GS1 row's level select (or format select when it has none):

```svelte
<label class="row-lax">
	<input type="checkbox" aria-label="Render code {i + 1} despite failed validation" bind:checked={row.lax} />
	Render if invalid
</label>
```

Section 4 of the conversation called this box `Validate`; the spec names it `Render if invalid`
so that, as on the page, a ticked box means the permissive state. The row's format setter sets
`row.lax = canonicalLax(next, row.lax)` beside the ecc canonicalisation; `add()` creates rows
with `lax: false`. The verdict span takes `lenient` when `entry.lint` is set. Tab order within a
row: payload, format, level when shown, Render if invalid when shown, Move up, Move down, Delete.

## Rendering in the column — `src/lib/items.ts`, `src/lib/barcode.ts`

`buildItems` adds `barcode-item--2d` only when the entry's descriptor is bwip-js with
`shape: '2d'`, and the per-format class for every bwip-js entry. Linear GS1 items therefore take
the 1D CSS (`max-width: min(90vw, 640px); height: auto`), 2D GS1 items the 2D CSS; no stylesheet
changes. `renderBarcodeSvg` dispatches as today. Scroll and Step playback are untouched: a
lax-rendered entry is a valid entry.

## Edge cases

- **Lax on, row valid.** The strict encode succeeds; no `lint`; verdict and symbol identical to
  the toggle being off.
- **Lax on, syntax error** (`0109…`): both encodes fail with `GS1aiMissingOpenParen`;
  ` ✗ AIs must start with '('`.
- **Lax on, GTIN-only DataBar member, wrong GTIN:** both encodes fail with the member's own
  message; ` ✗ Incorrect GS1 DataBar Stacked check digit provided`. The toggle's note says so.
- **Lax on, too long under `dontlint`:** the lax error names a capacity failure;
  ` ✗ too long for GS1 QR Code (level H)`; the strict lint error is not shown.
- **Repeated AI with differing values** (`(10)A(10)B`): lint `Repeated AIs (10) must have the same
  value`; renders under lax, data `10A␝10B`.
- **A parenthesis inside a value** (`(10)A(B)C`): BWIPP reads `(B)` as an AI; strict
  ` ✗ AI B: Unrecognised AI`; under lax it renders and the scan data follows BWIPP's placement.
  The hint warns.
- **Whitespace** (`(01) 0950 1101 5300 03`, or a line break inside a Per row payload): stripped by
  `normalize`; `raw` keeps it; the verdict's data shows the stripped form; a line break counts as a
  split on the lossy switch, as today for numeric rows.
- **Commas and lowercase** are CSET 82 and stay data; a comma never splits a GS1 list.
- **Non-ASCII, `^`, space inside a value:** `AI nn: Invalid CSET 82 character`.
- **`lax=1` with a non-GS1 `fmt`**, or a `-lax` token on a non-GS1 record: ignored.
- **A pre-deploy build opening a new link:** `fmt=gs1128` fails `isFormatId` and falls back as
  any unknown format does today.
- **Encode cache.** GS1 SVGs without text are small (0.6 to 4 kB); a DotCode symbol is 8 to
  100 kB because every dot is a path. The 32 M-character budget still holds hundreds of rows.
- **The `encoded` field** stays 1D-JsBarcode-only; GS1 entries carry `gs1.data` instead.

## Testing

Baseline: 27 files, 411 tests, Node 24.17.0. Sample payloads S, G and E as in the measurements
note. Records are written in their URL form with `%28`/`%29` where a test decodes a URL and in
plain form elsewhere.

- **`src/lib/formats.test.ts`** (extended): `FORMATS.length` 36 and 36 unique ids; eight groups
  ending in `GS1`; the GS1 group's ids equal the eleven in table order; the 2D group unchanged;
  every bwip-js descriptor's `bcid` is a function exported by `bwip-js/browser`; every GS1
  descriptor has `numeric: false`, a `normalize` that maps `' (01) 0950 '` to `'(01)0950'`, a
  `gs1.aim` from the table and `shape` from the table; the four old 2D descriptors have
  `shape: '2d'` and `quietZone` 4, 4, 8, 4; `canonicalLax('gs1128', true)` true,
  `('upc', true)` false, `('gs1qr', false)` false; `isGs1` true for the eleven and false for all
  others.
- **`src/lib/engines/bwipjs.test.ts`** (extended), table-driven over the eleven: the sample
  (S for GS1-128 and the 2D carriers, G for the GTIN-only members, E for Expanded and Expanded
  Stacked) is valid with `facts.cols`, `rows` and `summary` from measurements §1 (`255 modules
  wide`, `96 modules wide`, …, `18×18 modules`, `25×25 modules`, `29×20 modules`) and
  `gs1.aim` from the table; `(01)09501101530004` strict gives `{ valid: false, message: 'AI 01:
  Bad checksum' }` on GS1-128, Expanded, Expanded Stacked and the three 2D carriers, and with
  `{ lax: true }` gives `valid: true`, `lint: 'AI 01: Bad checksum'`, `gs1.data
  '0109501101530004'` (GS1-128: `cols` 134); the same payload with `{ lax: true }` on the five
  GTIN-only members gives `valid: false` with each member's own `Incorrect GS1 DataBar … check
  digit provided`; `(01)` → `AI 01: Too short`; `0109501101530003` with lax on GS1 QR Code →
  `AIs must start with '('`; `(99999)123` strict → `AI 99999: Unrecognised AI`, lax → valid;
  `(10)A(10)B` → `Repeated AIs (10) must have the same value`; Expanded with the measurements §3
  overflow payload → `reason: 'too-long'`; DotCode with lax and `(90)` + 2 100 `x` →
  `reason: 'too-long'`; GS1 QR Code level H with lax and `(90)` + 3 000 `x` → `reason:
  'too-long'`; plain `qr` over capacity still has no `message`; a strict check then a lax check of
  `(01)09501101530004` on GS1-128 return invalid then valid (distinct cache keys);
  `bwippErrorText('bwipp.GS1badChecksum#3251: AI 01: Bad checksum')` is `'AI 01: Bad checksum'`
  and `bwippErrorText('boom')` undefined; GS1 QR Code S at L, M, H gives 21×21, 25×25, 29×29;
  `render` of GS1-128 S gives an SVG with `width` 825 and `height` 219, of DataBar Omnidirectional
  G 348 × 162, and of GS1 QR Code S a 1024 px long side; the four old 2D snapshots are unchanged;
  eleven new snapshots `__snapshots__/bwipjs.<id>.svg`.
- **`src/lib/gs1.test.ts`** (new): `PREDEFINED_LENGTH_PREFIXES` equals the 22 literal values;
  `parseElementString` on S gives three pairs, on `(99999)123` one pair, on `0109` null, on
  `(10)A(B)C` two pairs `10`/`A` and `B`/`C`; `scanData` gives the four examples under _Scan data_
  with real `\u001d`; `displayData` maps every GS to `␝`; the null-parse fallback returns the
  value unchanged.
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
  for `{ 0, 0, 0, 1 }` at `{ format: 'gs1128', ecc: '', lax: false }` is exactly the first
  sentence, then `Switching now drops the validation setting of 1 row.`, then `Every code will
  take the format of the first code, GS1-128, with invalid GS1 data skipped.`; for
  `{ 1, 1, 1, 1 }` at `{ format: 'gs1qr', ecc: 'H', lax: true }` the second sentence is
  `Switching now drops the format of 1 row, the level of 1 row, the validation setting of 1 row,
  and cuts 1 payload at line breaks.` and the third ends `GS1 QR Code, and level H, with invalid
  GS1 data rendered.`; the five existing examples take the new first sentence and are otherwise
  unchanged.
- **`src/lib/shareUrl.test.ts`** (extended): encode `{ …DEFAULT_SETTINGS, format: 'gs1128', lax:
  true }` ends `&fmt=gs1128&lax=1`; with `format: 'upc', lax: true` has no `lax`; with
  `format: 'gs1qr', ecc: 'H', lax: true` ends `&fmt=gs1qr&ecc=H&lax=1`; with step mode the order
  is `fmt=gs1128&lax=1&mode=step&dwell=500`; decode `lax=1` with `fmt=gs1128` sets `lax` true,
  with `fmt=upc` leaves it unset, `lax=0` and `lax=yes` leave it unset; rows encode
  [`gs1128-lax_(01)09501101530004`] as `r1=gs1128-lax_%2801%2909501101530004`; decode the
  two-record example under _Share URL_; `r1=gs1qr-lax-H_…` equals `r1=gs1qr-H-lax_…`;
  `r1=upc-lax_036000291452` → `lax` false; `r1=gs1128-foo_…` → `lax` false, `ecc` `''`;
  `r1=qr-H_hello` and `r1=qr-_hello` as today.
- **`src/lib/verdict.test.ts`** (extended): the nine worked examples under _Verdict_ byte-exact;
  the 48-character boundary: `(01)09501101530003(10)` + 20 `A` + `(21)` + 7 `B` (48 characters)
  carries no note; `DENSE_HINT`'s new text; non-GS1 strings unchanged.
- **`src/lib/components/RowEditor.svelte.test.ts`** (extended): a GS1-128 row shows `.row-lax`
  and a UPC row does not; ticking it sets `row.lax`; switching the row to UPC-A clears it; Add
  code gives `lax: false`; a lax GS1-128 row with `(01)09501101530004` has a `lenient` verdict
  span reading the ⚠ example; the aria-label text; tab order with the new box.
- **`src/routes/page.test.ts`** (extended): at `fmt=gs1128` in Plain text the page shows
  `.lax-input`, `.lax-note` and `.gs1-hint` and the GS1 placeholder; at `fmt=upc` none of them;
  in Per row at `fmt=gs1128` the hint shows and `.lax-input` does not; ticking the box and
  switching the format to UPC-A clears it; the share link carries `lax=1` while ticked;
  switching to Per row with the box ticked gives rows with `lax: true`; the lossy note shows the
  validation clause for [`gs1128_G`, `gs1128-lax_G`]; an upload in Per row appends rows with
  `lax: false`; `ValidationList` gives the lax row the `lenient` class.
- **`src/lib/barcode.test.ts`** / **`src/lib/items.test.ts`** (extended or new): `buildItems`
  gives a GS1-128 entry no `barcode-item--2d` class and a `barcode-item--gs1128` class, and a GS1
  QR Code entry both `--2d` and `--gs1qr`.
- `npm run check`, `npm test`, `npm run lint` and `npm run build` green.

## Documentation

README: the features bullet becomes **36 barcode formats**, the 21 JsBarcode linear formats, the
four 2D formats, and eleven GS1 carriers (GS1-128, the seven GS1 DataBar members, GS1 DataMatrix,
GS1 QR Code and GS1 DotCode). A new **GS1** subsection under _Using it_: the bracket syntax with
an example; spaces dropped and parentheses in values unsupported; validation by BWIPP's AI linter
with the message in the verdict; the **Render GS1 data that fails validation** box, what it does
and where it stops (the five GTIN-only members, syntax errors); the verdict's `→ ]C1 …␝…` form
and what `␝` means; the 48-character GS1-128 note; a pointer to Per row for mixed decks. The
_Shareable links_ bullet gains `lax=1` and the `-lax` record token. The engines paragraph says
bwip-js renders the 2D and GS1 formats.

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
   `AIM DATA` with `␝` read as GS, recorded per carrier; scanner model, firmware, read mode and
   the AIM/GS settings recorded. A carrier the scanner cannot decode is recorded as such and stays
   UNVERIFIED.
3. **Lax at a lane.** GS1-128 `(01)09501101530004` with the box ticked, read by the same scanner
   and, if available, by a point-of-sale lane. Pass: the emitted string (or the rejection) is
   recorded with the device details.
4. **Laser versus imager.** DataBar Stacked and Expanded Stacked G/E read with a laser scanner and
   with an imager. Pass: which device read which carrier is recorded.
5. **Over 48 characters.** The 51-character GS1-128 example. Pass: read or refused, recorded.
6. **Keyboard wedge.** The `(10)LOT42(01)09501101530003` GS1-128 read into a plain text field
   through the scanner's keyboard mode. Pass: what arrives for the GS (a control character, a
   substitute, nothing) is recorded.
7. **Browsers.** In Firefox and in Chromium, at 390 px and 1024 px wide: the box, its note and the
   GS1 hint lay out without horizontal scroll in Plain text at GS1-128; a GS1 QR Code row's
   controls line (format, level, Render if invalid, three buttons) wraps without overflow at
   390 px. Pass: both widths in both browsers.
8. **Keyboard.** Tab order on the page (format, Render GS1 data…, Playback) and in a GS1 QR Code
   row (payload, format, level, Render if invalid, Move up, Move down, Delete), and Space toggles
   each box, in both browsers. Pass: all in both.
9. **Links.** On the local preview, `#r1=gs1128-lax_%2801%2909501101530004&r2=gs1qr-H_%2801%2909501101530003`
   opens in Per row with row 1 amber and row 2 green; choosing Plain text shows a note whose
   second sentence is `Switching now drops the format of 1 row.` (row 2 differs in format,
   so it counts once, under formats) and whose third is `Every code will take the format of
   the first code, GS1-128, with invalid GS1 data rendered.`; Start plays both. Pass: all
   three.
10. **Share QR.** A Plain text list of ten element strings at GS1-128: the share-QR status line
    reports a readable level or says why not. Pass: the line's text recorded and consistent with
    the link length.

## Out of scope

Raw scan data as input and the per-AI breakdown (spec 2). GS1 Digital Link (spec 3). The North
American coupon, (8111) and (8112) (spec 4). Composite symbologies. Human-readable text under
bwip-js symbols. A descriptor-declared option schema. Mandatory-pairing enforcement
(`lintreqs`). Escaping parentheses inside values. A hard 48-character GS1-128 limit. BWIPP
messages for the four plain 2D formats. DotCode row and column control, Expanded Stacked segment
control. Automated decode round-trips.

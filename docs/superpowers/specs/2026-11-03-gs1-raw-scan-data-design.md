# Raw scan data and the AI breakdown — Design

**Date:** 2026-11-03
**Status:** Design agreed in conversation on 2026-11-03; awaits the multi-lens review and the
user's approval of this file. Spec 2 of the four-spec GS1 series (see _Series_).
**Builds on:** spec 1, [`2026-11-03-gs1-carriers-design.md`](2026-11-03-gs1-carriers-design.md),
merged as `9cedd6d`; its measurements note is cited as _measurements §n_. Facts measured for this
spec are in _Measurements_ at the end, cited as _M1_ to _M7_.

## Intent

Spec 1 made scandible draw GS1 data from bracketed element strings and show, in each verdict, what
a scanner will send, such as `]C1 01095011015300031726123110LOT42`. A tester holding the other
end of that exchange, a scanner's output copied from a log, a ticket or a real product, cannot use
it: every GS1 carrier refuses input without brackets (M1).

This spec adds two things:

1. **Raw scan data as input.** The eleven GS1 formats accept what a scanner sends, with or without
   the AIM symbology identifier, with the GS separator as the character itself or as a textual
   notation. The app splits it into Application Identifiers (AIs), re-brackets it and encodes that.
   The purpose is regeneration: paste scanner output, get the same barcode back for a test deck.
2. **A per-AI breakdown.** Every GS1 code that is drawn gains a collapsed disclosure under its
   verdict, listing its AIs with GS1's names and lightly decoded values.

Success: the tester picks GS1-128 and pastes `]C1010950110153000310LOT42<GS>17261231`. The verdict
reads ` ✓ · 266 modules wide · 31 characters → ]C1 010950110153000310LOT42␝17261231` (M7), the
symbol is the one `(01)09501101530003(10)LOT42(17)261231` draws, and opening `3 AIs` shows:

```text
(01)  GTIN              09501101530003
(10)  BATCH/LOT         LOT42
(17)  USE BY or EXPIRY  2026-12-31
```

Pasting the same output into a GS1 QR Code row draws GS1 QR Code; pasting a GS1 DataMatrix scan
into a GS1-128 row draws GS1-128 and the verdict says where the data came from. Every code that is
valid today keeps its verdict text, its symbol and its share link. Codes refused today for lacking
brackets are now read as scan data, so those that split into known AIs draw. The verdict text changes only for raw input with another carrier's
identifier and for refusals under the render-anyway setting (see _Verdict and hints_).

## Series

The user kept the series order on 2026-11-03, declining to move the coupon forward: 1 GS1 carriers
(merged, PR #4), **2 raw scan data and the AI breakdown (this spec)**, 3 GS1 Digital Link, 4 the
North American coupon. Spec 1's _Series_ section stands otherwise.

This spec leaves these doors open:

- **Digital Link (spec 3).** The read step's form recognition (_Reading input_) is where a URI form
  joins. The per-carrier input kind the handoff calls F5 is decided in spec 3, not here.
- **Coupon (spec 4).** The dictionary gives (8110) and (8112) no title (M3), so their breakdown
  line shows the AI and the value as written. Spec 4 replaces that line with the coupon's field
  breakdown and still owes the composer question.

## Decisions

- **Purpose: regenerate.** The user chose it over a compare mode that checks a scan against a
  row's expected data, and over both. Comparison stays manual: the verdict and the breakdown show
  what to compare.
- **Raw input is recognised, not switched on.** A GS1 token that does not start with `(` is read
  as scan data. No toggle guards it, because every such token is refused today on all eleven
  carriers (M1), so no working code changes meaning.
- **Five separator notations.** The GS character U+001D, `␝` U+241D, `<GS>`, `\x1d` and
  `\u001d`, the last three matched ignoring letter case. The user chose these; BWIPP's `^029` is
  out. `<GS>` is always a separator, although GS1 character set 82 could in theory spell it inside
  a value. The other notations cannot collide with data: set 82 has no backslash and no
  non-ASCII character.
- **The AIM identifier is optional, and a mismatch is noted, not refused.** The five GS1
  identifiers are recognised and removed. One naming another carrier still draws in the row's
  format, so data can move between carriers. Any other identifier is refused.
- **The AI table is generated from GS1's Syntax Dictionary**, release 2026-01-27, Apache-2.0, by a
  committed script that pins the file's SHA-256, and is cross-checked offline against bwip-js's
  own copy. Rejected: extracting the table from bwip-js, which has no names; a hand-written subset
  of common AIs, which could not split any other AI.
- **A read step before the engine, with one splitter for input and breakdown** (approach A of
  three). Rejected: re-bracketing inside `normalize`, which returns only a string, so raw-input
  errors would surface as BWIPP's `AIs must start with '('` and the identifier would be lost;
  re-bracketing inside the engine, which would then own input parsing and encode a string other
  than the entry's `value`.
- **The read step only splits; BWIPP still validates.** Value rules, such as character sets, the
  length of a variable field, check digits and dates, stay with BWIPP's lint, so the
  render-anyway setting keeps its reach. Structural failures (a foreign identifier, an unknown AI,
  a short fixed field, an empty value, a parenthesis) are refused by the read step, and the
  setting cannot override them.
- **Breakdown: names and light decoding.** The user chose it over raw values alone and over full
  decoding (ISO country and currency names, check-digit marks, the company prefix split out).
- **Breakdown placement: a native disclosure per code, closed by default.** The user chose it over
  lines always shown and over one page-wide toggle.
- **The override suffix is uniform** (handoff item Q2). With the render-anyway setting on, every
  refused GS1 code ends with ` (the validation setting cannot override this)`, whatever the carrier
  and whichever refusal it is: a message, too long, or plain invalid. Under that setting every
  remaining refusal is one it cannot override, so the suffix is always true. The
  `gtinCheck === 'own'` condition goes.
- **Ride-along debt.** Handoff items F1 (`RowEditor` builds each row's entry three times per
  render) and F3 (`verdict.ts` looks the descriptor up in four helpers) are fixed here, because
  this spec edits both files. F4 (the copied `deck` test helper) is extracted only if a fourth copy
  would appear. F2 (empty `ECC_OPTIONS` entries) waits for spec 3, which adds the next encoders.
- **No `$effect`.** Function bindings, `$derived` and event handlers only, the project convention.

## The AI table — `scripts/gs1-ais.ts`, `src/lib/gs1-ais.json`, `src/lib/gs1Ais.ts`

### Generator

`scripts/gs1-ais.ts` runs as `npm run gs1-ais` (package script `"gs1-ais": "node
scripts/gs1-ais.ts"`). Node 24 runs TypeScript by stripping types, so the script uses erasable
syntax only and imports nothing from `src/`. `svelte.config.js`'s `kit.typescript.config` hook adds the
`scripts` folder to the generated `include`, so `npm run check` type-checks it; ESLint already
covers it with Node globals.

Constants at the top of the script:

- `RELEASE = '2026-01-27'`
- `SHA256 = '6461ece7c03420fb27a3f18163ef9a08694aa4bb2491dea25f63bcdf22451a99'`
- the URL `https://raw.githubusercontent.com/gs1/gs1-syntax-dictionary/${RELEASE}/gs1-syntax-dictionary.txt`

Steps. Each failure prints a reason, exits non-zero and writes nothing:

1. Fetch the URL; a non-200 response fails.
2. Hash the bytes; anything but `SHA256` fails.
3. Parse each line that is neither blank nor a `#` comment: the AI or range (`3100-3105`), the
   flags (`*` predefined length, `?` Digital Link attribute and others, ignored except `*`), the
   components, the attributes (`req=`, `ex=`, `dlpkey`, `dlattr`; ignored, since BWIPP's lint owns
   pairing rules and spec 1 turned `lintreqs` off), and the title after `#`. A component reads
   `N14` (fixed, 14), `X..20` (variable, 1 to 20), `[N6]` (optional), then comma-separated linter
   names; character sets are `N`, `X`, `Y` and `Z`.
4. Assert the structure the splitter relies on (M5): every AI is two to four digits; after range
   expansion no AI is a prefix of another; every predefined AI has only fixed, required, numeric
   fields; only an AI's last field may be variable; no optional field comes before a required one.
5. Write `src/lib/gs1-ais.json`, tab-indented, with a final newline.

Upgrading means changing `RELEASE` and `SHA256`, re-running the script and committing both files.

### Table file

```json
{
	"source": "https://github.com/gs1/gs1-syntax-dictionary",
	"release": "2026-01-27",
	"sha256": "6461ece7c03420fb27a3f18163ef9a08694aa4bb2491dea25f63bcdf22451a99",
	"licence": "Apache-2.0",
	"ais": [
		{
			"ai": "01",
			"title": "GTIN",
			"predefined": true,
			"parts": [{ "cset": "N", "min": 14, "max": 14, "opt": false, "linters": ["csum", "gcppos2"] }]
		}
	]
}
```

One record per dictionary entry, 224 in all, ranges kept as written (M3). `title` is absent on
(8110) and (8112). `.prettierignore` lists the file, since it is generated. Compact, it is 28.6 KB,
3.2 KB gzipped (M4); Vite bundles it compact into both pages, since the play page builds entries
too.

### Lookup module — `src/lib/gs1Ais.ts`

```ts
export interface AiPart {
	cset: 'N' | 'X' | 'Y' | 'Z';
	min: number;
	max: number;
	opt: boolean;
	linters: string[];
}
export interface AiEntry {
	ai: string; // one AI; ranges are expanded at load
	title?: string;
	predefined: boolean; // the dictionary's `*` flag: no GS follows it
	parts: AiPart[];
}
/** The entry for one AI, or undefined when GS1 assigns none. */
export function aiEntry(ai: string): AiEntry | undefined;
/** The AI starting at text[i]: tries 2, 3, then 4 characters. AIs are prefix-free (M5). */
export function aiAt(text: string, i: number): AiEntry | undefined;
/** A value as the breakdown shows it; see _The breakdown_. */
export function describeValue(ai: string, value: string, today: Date): string;
```

At load the module expands the 224 records into a `Map` of 541 entries, one per AI.

### Parity tests

`src/lib/gs1Ais.test.ts` reads `node_modules/bwip-js/barcode.ps` with `node:fs` and extracts
BWIPP's `gs1syntax` dictionary from its `gs1process` resource. An extraction that finds no AI
fails the test rather than passing it vacuously.

1. The table's AI set equals BWIPP's: 541 AIs at bwip-js 4.11.4, BWIPP 2026-05-28 (M3).
2. For every AI, its fields' `cset`, `min`, `max`, `opt` and linter names equal BWIPP's `/parts`
   in order. BWIPP prefixes linter names with `lint`: `csum` is `/lintcsum`.
3. For every AI, `predefined` holds exactly when its first two digits are in
   `PREDEFINED_LENGTH_PREFIXES`, the set `scanData` uses (M5). The splitter and the scan-data
   rule therefore agree on where a GS goes.
4. Titles, which only the dictionary has, are spot-checked: (01) `GTIN`, (10) `BATCH/LOT`, (17)
   `USE BY or EXPIRY`, (3103) `NET WEIGHT (kg)`, (8110) none.

A bwip-js upgrade whose BWIPP takes a newer dictionary fails test 1 or 2. The remedy is to point
the generator at that release, re-run it, and re-run the tests.

### Licence

`LICENSES/gs1-syntax-dictionary-Apache-2.0.txt` holds the `LICENSE` file of the dictionary
repository at the release tag, preceded by one line naming the source and release. The README
credits GS1. The app's own licence stays MIT.

## Reading input — `src/lib/gs1.ts`, `src/lib/codes.ts`, `src/lib/types.ts`

### Where it runs

`buildEntry` gains one branch for GS1 descriptors, after `normalize` has stripped whitespace as
today:

```ts
const read = readGs1Input(cleaned);
if (!read.ok)
	return { raw: token, value: cleaned, format, options, valid: false, message: read.message };
const entry = {
	raw: token,
	value: read.value,
	format,
	options,
	...checkCode(read.value, format, options)
};
return read.fromScan ? { ...entry, fromScan: read.fromScan } : entry;
```

Everything downstream (`checkCode`, the engine, `scanData`, rendering, the play page) sees the
bracketed string as `value`, unchanged. `raw` keeps the token as typed. List-mode share links are
built from `raw` and row records from the row's payload, so links carry what the tester typed; a
GS character percent-encodes as `%1D` and decodes back.

`CodeEntry` gains one field, and `message`'s comment widens:

```ts
fromScan?: { aim?: string }; // GS1 only: the token was read as raw scan data; aim is the identifier it began with
message?: string; // GS1 only, present when invalid with a BWIPP text or a read-step refusal
```

### The read step — `readGs1Input`

```ts
export type Gs1Read =
	{ ok: true; value: string; fromScan?: { aim?: string } } | { ok: false; message: string };
export function readGs1Input(text: string): Gs1Read;
```

1. **Bracketed.** Text starting with `(` returns `{ ok: true, value: text }`, untouched and without
   `fromScan`. Every code that works today takes this path.
2. **Separators.** Otherwise the text is raw. `<GS>`, `\x1d`, `\u001d` (each ignoring case) and
   `␝` become the GS character.
3. **Identifier.** Text starting with `]` begins with a three-character identifier. `]C1`, `]e0`,
   `]d2`, `]Q3` and `]J1`, matched exactly, are removed and kept as `aim`. Case matters: `]E0` is
   EAN-13. Any other identifier is refused with
   `ID is not a GS1 symbology identifier; GS1 scan data starts with ]C1, ]e0, ]d2, ]Q3 or ]J1, or with its first AI`,
   where `ID` is the text's first three characters, or fewer when shorter.
4. **Split.** `splitScanData` on the rest. A stop is refused with the stop's message; no elements
   at all is refused with `No AIs in the scan data`.
5. **Parentheses.** An element whose value holds `(` or `)` is refused with
   `(AI) contains a parenthesis; parentheses inside a value are not supported`.
6. **Re-bracket.** Each element becomes `(AI)VALUE`, joined in order, returned as `value` with
   `fromScan: { aim }`, or `fromScan: {}` without an identifier.

### The splitter — `splitScanData`

```ts
export interface Gs1Element {
	ai: string;
	value: string;
}
/** Splits scan data (real GS characters, no identifier) into elements, stopping at the first
 *  structural failure; elements read before it are returned with the stop. */
export function splitScanData(data: string): { elements: Gs1Element[]; stop?: string };
```

From the start of `data`, repeatedly:

1. Skip any GS characters. A separator where no value is open is ignored: before the first AI,
   doubled, after a predefined-length value, or at the end.
2. At the end, stop without a message.
3. `aiAt` finds the AI here. None: stop with `No GS1 AI starts at “TEXT”`, then ` after (AI)`
   naming the last element read, if any. `TEXT` is up to eight characters with GS shown as `␝`,
   followed by `…` when more remain.
4. A predefined-length AI takes exactly its fixed length, the sum of its fields. If fewer
   characters come before the next GS or the end, stop with `(AI) takes N characters; only M
follow`.
5. Any other AI's value runs to the next GS or the end. An empty value stops with
   `(AI) has no value`.

The splitter does not check a variable field's maximum length or character set; BWIPP's lint does.

### Edge cases

- **Spaces** are stripped before the read step, as today, so `]C1 0109501101530003 10LOT42` reads
  as one string. GS1 data cannot contain a space (set 82 has none).
- **A dropped separator.** A wedge scanner that drops GS makes a variable field swallow what
  follows: `010950110153000310LOT4217261231` reads as (01) and a (10) of `LOT4217261231`. When the
  swallowed text overflows the field, BWIPP's lint says so, such as `AI 10: Too long`; when it
  fits, nothing flags it and the breakdown shows the long value. The GS1 hint tells the tester to
  set the scanner to send `<GS>`.
- **A 13-digit GTIN as raw input** is refused, `(01) takes 14 characters; only 13 follow`, though
  the five GTIN-only DataBar formats accept `(01)` with 13 digits bracketed. A scanner always
  sends 14.
- **Mixed forms.** Raw data with brackets later, such as `0109501101530003(10)LOT42`, stops with
  `No GS1 AI starts at “(10)LOT4…” after (01)`.
- **`]e0` on DataBar.** Any of the seven DataBar members matches `]e0`. On the five GTIN-only
  members, raw input carrying more than (01) is refused by BWIPP exactly as its bracketed form is.

## The breakdown — `src/lib/gs1.ts`, `src/lib/gs1Ais.ts`, `src/lib/components/Gs1Breakdown.svelte`

### Data

```ts
export interface BreakdownLine {
	ai: string;
	title?: string;
	text: string;
}
export function breakdown(data: string, today: Date): { lines: BreakdownLine[]; stop?: string };
```

`breakdown` lives in `gs1.ts`. It runs `splitScanData` on `entry.gs1.data`, the scan data the
verdict shows after its arrow, including the GTIN check digit the DataBar formats add or correct
(spec 1, _Scan data_). Each element becomes a line with `aiEntry(ai)?.title` and
`describeValue(ai, value, today)`. It is the same splitter as raw input, so the breakdown is what a
receiving system's parser makes of the data.

### Decoding — `describeValue`

1. **Fields.** The value is cut into the AI's fields: fixed fields take their length in turn, a
   variable last field takes the rest, an optional field is absent when the value has ended. A
   value that does not fit, possible only under the render-anyway setting, is shown as written.
2. **Dates.** Fields with the linter `yymmdd`, `yymmd0` or `yyyymmdd` become `YYYY-MM-DD`. On a
   `yymmd0` field, day `00` becomes the month's last day followed by ` (day 00: end of month)`.
   A two-digit year follows GS1 General Specifications §7.12: subtract today's two-digit year from
   it; a result of 51 to 99 means the previous century, −99 to −50 the next, anything else the
   current one. On 2026-11-03, `00` to `76` give 20YY and `77` to `99` give 19YY. A date that does
   not exist, such as month `13`, 30 February or day `00` on a `yymmdd` field, is shown as written.
3. **Times.** `hhmi` becomes `HH:MM`; consecutive `hh`, `mi` and `ss` fields join with `:`, as in
   `14:30:05`; an hour with no minutes becomes `14h`. An hour over 23 or a minute or second over
   59 leaves the field as written.
4. **Measures and amounts.** For the four-digit AIs 3100 to 3699 and 3900 to 3959, 368 of them
   (M5), the AI's last digit `n` is the number of decimal places in the last field. Its digits are
   left-padded with zeros to `n + 1`, a point goes `n` from the right, and leading zeros before the
   point go except one: `001234` with `n = 3` reads `1.234`, `000050` reads `0.050`, and with
   `n = 0`, `000123` reads `123`.
5. **Joining.** Decoded and as-written fields join with one space.
6. Everything else is shown as written.

Examples, with today 2026-11-03:

| Element              | Line text                                                 |
| -------------------- | --------------------------------------------------------- |
| `(17)261231`         | `(17) USE BY or EXPIRY 2026-12-31`                        |
| `(17)261200`         | `(17) USE BY or EXPIRY 2026-12-31 (day 00: end of month)` |
| `(17)991231`         | `(17) USE BY or EXPIRY 1999-12-31`                        |
| `(17)261331`, lax    | `(17) USE BY or EXPIRY 261331`                            |
| `(3103)000123`       | `(3103) NET WEIGHT (kg) 0.123`                            |
| `(3912)97801234`     | `(3912) AMOUNT 978 12.34`                                 |
| `(7003)2612311430`   | `(7003) EXPIRY TIME 2026-12-31 14:30`                     |
| `(8008)26123114`     | `(8008) PROD TIME 2026-12-31 14h`                         |
| `(8008)261231143005` | `(8008) PROD TIME 2026-12-31 14:30:05`                    |
| `(10)LOT42`          | `(10) BATCH/LOT LOT42`                                    |
| `(8110)106141…`      | `(8110) 106141…`, untitled                                |

### Display — `Gs1Breakdown.svelte`

The component takes `{ data: string; label?: string }` and reads `new Date()` once, at creation.
`label` prefixes the summary's accessible name: with `label` `Code 3`, the summary is announced as
`Code 3: 4 AIs`. Without it, the visible text is the name.

```svelte
<details class="gs1-breakdown">
	<summary aria-label={label}>{summary}</summary>
	<table>
		<thead class="visually-hidden"><tr><th>AI</th><th>Name</th><th>Value</th></tr></thead>
		<tbody>
			<!-- one row per line: <th scope="row">(17)</th><td>USE BY or EXPIRY</td><td>2026-12-31</td> -->
			<!-- with a stop, a last row: <td colspan="3">Stops here: STOP. A receiving system would stop here too.</td> -->
		</tbody>
	</table>
</details>
```

- **Summary text.** `1 AI` or `N AIs`; with a stop, `N AIs, then unreadable data`; with a stop
  and no element, `Unreadable data`.
- **Table.** Three columns, aligned across rows, values wrapping in the third. It is tabular data,
  so a table gives screen readers the headers. The header row is visually hidden; the component
  defines the `visually-hidden` class itself.
- **Closed by default.** The open state lives in the element only. It is neither saved nor shared.
- **Colour.** The breakdown uses the page's text colour, not the green, red or amber of its row's
  state; the verdict line carries the state.

Placement:

- **Validation list.** Inside each `li` whose entry has `gs1`, after the verdict span, at full
  width (`flex-basis: 100%`). The list keeps its 200 px cap, so an open breakdown scrolls within it.
  It is keyed by index, so a breakdown stays open at its position as the text changes.
- **Row editor.** After `.row-controls`, inside `li.row`, when the row's entry has `gs1`, with
  `label` `Code N`. It sits outside the verdict span, so the
  payload's description stays one line. Rows are keyed by object, so a breakdown stays open while
  its payload is edited.
- **Play page.** None.

## Verdict and hints — `src/lib/verdict.ts`, `ValidationList.svelte`, `RowEditor.svelte`

### Verdict text

Spec 1's table changes in two places, marked:

| State                  | Text                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Valid GS1              | ` ✓ · SIZE · N characters[ · dense][ · over …]`**`[ · read from ID (CARRIER) scan data]`**` → AIM DATA`                     |
| Rendered despite lint  | ` ⚠ rendered anyway · LINT[ (parentheses …)] · SIZE · N characters[ · dense][ · over …]`**`[ · read from …]`**` → AIM DATA` |
| Invalid, too long      | ` ✗ too long for LABEL[ (level X)]`**`[ OVERRIDE]`**                                                                        |
| Invalid with a message | ` ✗ MESSAGE[ (parentheses inside a value are not supported)][ OVERRIDE]`                                                    |
| Invalid, no message    | ` ✗ invalid`**`[ OVERRIDE]`**                                                                                               |

- **Read-from note.** Present when `entry.fromScan?.aim` is set and differs from `entry.gs1.aim`.
  `ID` is the removed identifier; `CARRIER` is `GS1-128` for `]C1`, `GS1 DataBar` for `]e0`,
  `GS1 DataMatrix` for `]d2`, `GS1 QR Code` for `]Q3` and `GS1 DotCode` for `]J1`. It is the last
  clause before the arrow.
- **Override suffix.** `OVERRIDE` is ` (the validation setting cannot override this)`. It appears
  on every refused entry whose resolved `lax` is true; `resolveOptions` sets `lax` only on GS1
  formats. When the parentheses suffix also applies, it comes first.
- **Helpers.** `descriptorOf(entry)` replaces the four `FORMAT_BY_ID.get(entry.format)` calls
  (handoff F3).

Worked examples. The read step hands BWIPP the bracketed string, so each raw example's size and
count equal its bracketed twin's in spec 1's _Verdict_ section or in M7:

- GS1-128, `]C101095011015300031726123110LOT42`:
  ` ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42`
- GS1-128, `10LOT42<GS>0109501101530003`:
  ` ✓ · 222 modules wide · 23 characters → ]C1 10LOT42␝0109501101530003`
- GS1-128, `]d201095011015300031726123110LOT42`:
  ` ✓ · 255 modules wide · 31 characters · read from ]d2 (GS1 DataMatrix) scan data → ]C1 01095011015300031726123110LOT42`
- GS1 DataBar Omnidirectional, `]e00109501101530003`:
  ` ✓ · 96 modules wide · 16 characters → ]e0 0109501101530003`
- GS1-128, `]d1ABC`:
  ` ✗ ]d1 is not a GS1 symbology identifier; GS1 scan data starts with ]C1, ]e0, ]d2, ]Q3 or ]J1, or with its first AI`
- GS1-128, `01095011015300039Z45`: ` ✗ No GS1 AI starts at “9Z45” after (01)`
- GS1-128, `010950110153`: ` ✗ (01) takes 14 characters; only 10 follow`
- GS1-128, `10<GS>17261231`: ` ✗ (10) has no value`
- GS1-128, `10A(B)C`:
  ` ✗ (10) contains a parenthesis; parentheses inside a value are not supported`
- GS1-128, `]C1`: ` ✗ No AIs in the scan data`
- GS1-128, `(01)09501101530003(10`, render-anyway on (M2):
  ` ✗ AIs must end with ')' (the validation setting cannot override this)`
- Each of the eleven carriers, `(01)09501101530003(10`, render-anyway off and on (M2): six say
  `AIs must end with ')'` and the five GTIN-only members say `GS1 DataBar MEMBER must be 13 or 14
digits`; with the setting on, each gains the suffix.
- GS1 QR Code at level H, `(90)` and 3000 `x`, render-anyway on:
  ` ✗ too long for GS1 QR Code (level H) (the validation setting cannot override this)`
- GS1-128, `(`, render-anyway on: ` ✗ invalid (the validation setting cannot override this)`

### Raw text on screen

The validation list shows each entry's raw text as `displayData(entry.raw)`, so a GS character
shows as `␝`, as in the scan data. Textual notations show as typed. The row editor's field shows
what was typed; the breakdown shows how it was read.

### Hints

`SCAN_HINT` and `DENSE_HINT` are unchanged. Two texts change:

- `GS1_HINT`: `GS1 formats take bracketed element strings, such as (01)09501101530003(10)LOT42, or
what a scanner sends, such as ]C1010950110153000310LOT42<GS>17261231, one code per line. In scan
data the separator may be the GS character, ␝, <GS>, \x1d or \u001d, and the ]C1-style identifier
is optional. A keyboard-wedge scanner may drop separators; set it to send <GS> instead. Spaces and
line breaks are removed, commas are data, and parentheses inside a value are not supported.`
- `LAX_NOTE`: `Ticked, a code that fails GS1 validation is drawn anyway, flagged amber with the
reason. It cannot help with malformed brackets, scan data that cannot be split into AIs or a code
too long for its symbol; GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional
and Limited still refuse a wrong GTIN; and GS1 DataBar Expanded and Expanded Stacked carry the
corrected check digit of a leading GTIN.`

### Row editor ride-along (handoff F1)

`RowEditor` computes `const entries = $derived(rows.map((row) => rowEntry(row)))` and uses
`entries[i]` in the each block and `entries.some(…)` for the two hints, so each row's entry is
built once per change.

## Testing

Baseline: 29 test files, 529 tests. New and changed tests, by file:

- **`src/lib/gs1Ais.test.ts`** (new): `aiEntry` and `aiAt` on two-, three- and four-digit AIs and
  on an expanded range member; `aiAt` on non-digits; every `describeValue` example in the table
  above, with today fixed; a 29 February in a leap and a non-leap year; the century window at
  both edges; an over-23 hour; the four parity tests.
- **`src/lib/gs1.test.ts`**: `readGs1Input` passing bracketed text through untouched; each
  notation, in both letter cases where it applies; each identifier removed and kept; a foreign
  identifier and a lower-case `]c1` refused; leading, doubled, post-predefined and trailing
  separators skipped; each refusal message; `splitScanData` returning the elements read before a
  stop; `breakdown` lines and stop.
- **`src/lib/codes.test.ts`**: `buildEntry` on raw input (bracketed `value`, `raw` as typed,
  `fromScan` with and without `aim`); a read-step refusal's entry (`valid: false`, `message`,
  resolved `options`, no `gs1`). **Round trip**, the strongest check of regeneration: for each
  carrier and its spec 1 sample (S on GS1-128 and the three 2D carriers, G on the five GTIN-only
  members, E on Expanded and Expanded Stacked, plus the lax `(01)09501101530004` on GS1-128 and
  Expanded), the entry's `aim + data` fed back as raw input, in the GS-character, `␝` and `<GS>`
  forms, gives identical `gs1` and an identical rendered SVG.
- **`src/lib/verdict.test.ts`**: the read-from note, present on mismatch and absent on a match or
  no identifier; the worked examples above. The it.each that fed `0109501101530003` to all eleven
  carriers now feeds `(01)09501101530003(10` and expects the suffix on all eleven with the setting
  on; `0109501101530003` itself is now valid on all eleven.
  The existing GS1 QR level H too-long test, run with the setting on, gains the suffix.
- **`src/lib/components/Gs1Breakdown.test.ts`** (new): summary text in its four forms; closed by
  default; one table row per element with the expected text; the stop row; the hidden headers.
- **`src/lib/components/ValidationList.test.ts`**: `␝` in raw text; a disclosure only on entries
  with `gs1`. The test that used `0109501101530003` as an invalid GS1 row uses
  `(01)09501101530003(10` instead.
- **`src/lib/components/RowEditor.svelte.test.ts`**: the disclosure outside the verdict span, with
  its label; a disclosure that stays open while its payload is edited;
  `grep -c "rowEntry(" src/lib/components/RowEditor.svelte` prints `1`.
- **`src/routes/page.test.ts`**: a raw GS1 row from a share link renders a valid entry.

If any of these needs the `deck` helper in a fourth file, it is first extracted to
`src/lib/test/deck.ts` and the three existing copies import it (handoff F4).

## Documentation

The README's GS1 section gains: raw scan data input with its notations and the optional
identifier; regeneration across carriers; the breakdown; a credit to GS1's Syntax Dictionary with
its licence; and the regeneration command `npm run gs1-ais`, which behaves the same in bash and
fish.

## Verification that fails closed

Every row starts UNVERIFIED. A checker that dies, returns nothing or is skipped leaves its row
UNVERIFIED, never PASS.

| Row | Check                                                                                                                                         | Who             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | `npm test`, `npm run check`, `npm run lint`, `npm run build` all clean                                                                        | agent           |
| 2   | `npm run gs1-ais` on a clean checkout leaves `git status` clean (needs network; a failed fetch leaves the row UNVERIFIED)                     | agent           |
| 3   | A real GS character pasted into the list and into a row field reads correctly and shows as `␝`, in Firefox and Chromium                       | person          |
| 4   | A keyboard-wedge scan into the list, scanner set to send `<GS>` and the identifier, regenerates; scanning the drawn code emits the same line  | person, scanner |
| 5   | Round trip on hardware for each of the eleven carriers: scan, paste, scan the regenerated code, compare                                       | person, scanner |
| 6   | A GS1 DataMatrix scan pasted into a GS1-128 row shows the read-from note; scanning the drawn code gives `]C1` and the same data               | person, scanner |
| 7   | With a screen reader, the summary is announced as collapsed with its label, the table reads with headers, the payload description is one line | person          |
| 8   | A share link carrying a GS character round-trips, row records and list mode, in Firefox and Chromium                                          | agent or person |
| 9   | A wedge scan with separators dropped shows the swallowed value in the breakdown, as the hint warns                                            | person, scanner |

## Out of scope

- The North American coupon (spec 4) and GS1 Digital Link (spec 3).
- A compare mode that checks a scan against a row.
- Country and currency names, check-digit marks and splitting out the company prefix.
- The `^029` notation and other separator notations.
- Choosing the row's format from the identifier.
- A copy-as-bracketed control.
- Checking AI pairing rules (`req=`, `ex=`); `lintreqs` stays off, as in spec 1.

## Measurements

Method: throwaway scripts on Node v24.17.0 against
`node_modules/bwip-js/dist/bwip-js-node.mjs` (bwip-js 4.11.4, BWIPP 2026-05-28), with
`lintreqs: false` as the engine passes it; the dictionary fetched with `gh api` at tag
`2026-01-27`; one throwaway Python conversion of it. The scripts are not kept.

- **M1. Input without brackets is refused everywhere.** `09501101530003`, `0950110153000`,
  `0109501101530003`, `]C10109501101530003` and `01095011015300031726123110LOT42` fail on all
  eleven encoders: `AIs must start with '('` on six, `GS1 DataBar MEMBER must be 13 or 14 digits`
  on the five GTIN-only members.
- **M2. Malformed brackets.** `(01)09501101530003(10` and `(01` fail strict and with `dontlint`
  on all eleven: `AIs must end with ')'` on six, the 13-or-14-digits message on the five.
- **M3. The dictionary.** Release 2026-01-27: 344 lines, 30 280 bytes, SHA-256
  `6461ece7c03420fb27a3f18163ef9a08694aa4bb2491dea25f63bcdf22451a99`, 224 entries expanding to
  541 AIs. BWIPP's `gs1syntax` holds the same 541 AIs, none missing on either side. (8110) and
  (8112) have no title.
- **M4. Table size.** The conversion written as compact JSON is 28 559 bytes, 3 225 gzipped.
- **M5. Structure.** No AI is a prefix of another; AIs are two, three or four digits. The AIs
  flagged `*` are exactly those whose first two digits are among the 22 predefined-length
  prefixes; four of those prefixes, `04`, `14`, `18` and `19`, have no AI assigned. Every `*` AI
  has only fixed, required, numeric fields. No AI has a variable field before its last, and none
  has an optional field before a required one. 368 AIs fall in 3100–3699 and 3900–3959.
- **M6. Date and time linters.** `yymmd0` on 8 entries, `yymmdd` on 7, `yyyymmdd` on 2, `hhmi` on
  5, `hh`, `mi` and `ss` on one each, all three on (8008).
- **M7. GS1-128 widths.** `(01)09501101530003(17)261231(10)LOT42` 255 modules,
  `(10)LOT42(01)09501101530003` 222, `(01)09501101530003(10)LOT42(17)261231` 266: one GS adds 11.
  The longest dictionary title has 25 characters.

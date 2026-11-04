# Raw scan data and the AI breakdown — Design

**Date:** 2026-11-03
**Status:** Design agreed in conversation on 2026-11-03 and revised the same day after a four-lens
review on Sonnet subagents (codebase fit, GS1 and decoding correctness, UX and copy, internal
coherence) and one Sonnet re-review, judged by the author; approved by the user on 2026-11-03. Corrected on 2026-11-04 after the final review: the licence file's copyright lines, the table's size, the bare 13-digit edge case, the narrow-screen CSS and the open-while-edited claim.
Spec 2 of the four-spec GS1 series (see _Series_).
**Builds on:** spec 1, [`2026-11-03-gs1-carriers-design.md`](2026-11-03-gs1-carriers-design.md),
merged as `9cedd6d`; its measurements note is cited as _measurements §n_. Facts measured for this
spec are in _Measurements_ at the end, cited as _M1_ to _M8_.

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
2. **A per-AI breakdown.** In the validation list and the row editor, every GS1 code that is drawn
   gains a collapsed disclosure under its verdict, listing its AIs with GS1's names and lightly
   decoded values.

Success: the tester picks GS1-128 and pastes `]C1010950110153000310LOT42<GS>17261231`. The verdict
reads ` ✓ · 266 modules wide · 31 characters → ]C1 010950110153000310LOT42␝17261231` (M7), the
symbol is the one `(01)09501101530003(10)LOT42(17)261231` draws, and opening `3 AIs` shows:

```text
(01)  GTIN              09501101530003
(10)  BATCH/LOT         LOT42
(17)  USE BY or EXPIRY  2026-12-31
```

Pasting the same output into a GS1 QR Code row draws GS1 QR Code; pasting a GS1 DataMatrix scan
into a GS1-128 row draws GS1-128 and the verdict notes where the data came from.

Every code that is valid today keeps its verdict text, its symbol and its share link. What a
current user will notice:

- **Unbracketed codes change meaning.** Codes refused today for lacking brackets are now read as
  scan data. Those that split into known AIs reach BWIPP and usually draw, so a saved list or link
  that used an unbracketed string as a deliberate failing case now shows ✓. Those that do not
  split get a read-step message instead of `AIs must start with '('`. The README says so.
- **Refusals under the render-anyway setting** all gain the override suffix.
- **Three texts are reworded:** the GS1 hint, the render-anyway note and the GS1 placeholder.
- **Each drawn GS1 code gains its breakdown disclosure**, closed.

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
  format, so data can move between carriers. Any other identifier is refused. The handoff had
  recommended checking the identifier against the row's format; the user chose the note.
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
  render-anyway setting keeps its reach. Structural failures (a non-GS1 identifier, an unknown AI,
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
  `gtinCheck === 'own'` condition goes. Spec 4 inherits the rule as settled.
- **Ride-along debt.** Handoff items F1 (`RowEditor` builds each row's entry three times per
  render) and F3 (`verdict.ts` looks the descriptor up in four helpers) are fixed here, because
  this spec edits both files. F4 (the copied `deck` test helper) stays open: no test here needs a
  fourth copy, since the page test builds its share link from a string. F2 (empty `ECC_OPTIONS`
  entries) waits for spec 3, which adds the next encoders.
- **Messages quote input with straight double quotes**, so a tester can type what they search for.
- **No `$effect`.** Function bindings, `$derived` and event handlers only, the project convention.

## The AI table — `scripts/gs1-ais.ts`, `src/lib/gs1-ais.json`, `src/lib/gs1Ais.ts`, `package.json`, `svelte.config.js`, `.prettierignore`, `LICENSES/`

### Generator

`scripts/gs1-ais.ts` runs as `npm run gs1-ais`, a new package script
`"gs1-ais": "node scripts/gs1-ais.ts"`. Node 24 runs TypeScript by stripping types, so the script
uses erasable syntax only and imports nothing from `src/`.

- **Importable without side effects.** The script exports its constants and two pure functions,
  `parseDictionary(text)` and `assertStructure(records)`. It fetches and writes only when
  `import.meta.main` is true, so tests import it safely. Node v24.17.0 sets `import.meta.main`
  (true when run, false when imported, M8), and @types/node 24.13.3 declares it.
- **Type-checked.** A new `kit.typescript.config` hook in `svelte.config.js` pushes
  `'../scripts/**/*.ts'` onto the generated `include`; paths there are relative to `.svelte-kit/`.
  `npm run check` then covers the script.
- **Linted.** ESLint already covers `scripts/` with Node globals.

Constants at the top of the script:

- `RELEASE = '2026-01-27'`
- `SHA256 = '6461ece7c03420fb27a3f18163ef9a08694aa4bb2491dea25f63bcdf22451a99'`
- the URL `https://raw.githubusercontent.com/gs1/gs1-syntax-dictionary/${RELEASE}/gs1-syntax-dictionary.txt`

Steps. Each failure prints a reason, exits non-zero and writes nothing:

1. Fetch the URL; a non-200 response fails.
2. Hash the bytes; anything but `SHA256` fails.
3. Decode the bytes as UTF-8, since 17 titles hold `m²` or `m³` (M3), and parse each line that is
   neither blank nor a `#` comment with `parseDictionary`:
   - **AI or range**, such as `01` or `3100-3105`.
   - **Flags**, the next token only when it does not start with `N`, `X`, `Y`, `Z` or `[`; 15
     entries, such as (21), have none (M3). Only `*`, predefined length, is kept.
   - **Components.** `N14` is fixed at 14, `X..20` variable from 1 to 20, `[N6]` optional; linter
     names follow after commas, as in `[N6],yymmdd`. Character sets are `N`, `X`, `Y` and `Z`.
   - **Attributes** `req=`, `ex=`, `dlpkey` and `dlattr` are ignored: BWIPP's lint owns pairing
     rules, and spec 1 turned `lintreqs` off.
   - **Title**, everything after the first `#`. Twenty titles contain `#` themselves, such as
     `PROCESSOR # 0`; (8110) and (8112) have none (M3).
4. Assert, with `assertStructure`, what the splitter relies on (M5): every AI is two to four digits; after range
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
(8110) and (8112). `.prettierignore` lists the file, since it is generated. Compact, it is 31.5 KB, 3.1 KB gzipped (M4); Vite bundles it compact into both pages, since the play page builds entries
too. The lookup module casts the imported JSON to its record type; JSON imports type `cset` as a
plain string, and the parity tests pin every value the cast narrows.

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
   `USE BY or EXPIRY`, (3103) `NET WEIGHT (kg)`, (3140) with `m²`, (7030) `PROCESSOR # 0`,
   (8110) none.
5. The committed JSON passes `assertStructure`, so the splitter's assumptions hold for the file
   the app ships, not only at generation time.
6. The JSON's `release` and `sha256` equal the script's `RELEASE` and `SHA256`.

A bwip-js upgrade whose BWIPP takes a newer dictionary fails test 1 or 2. The remedy is to point
the generator at that release, re-run it, and re-run the tests.

`parseDictionary` and `assertStructure` are also unit-tested on short inline fixtures, one per
parse rule and one per structural failure. The fetch and hash failures are checked by running the
script (_Verification_, row 2).

### Licence

`LICENSES/gs1-syntax-dictionary-Apache-2.0.txt` holds the `LICENSE` file of the dictionary
repository at the release tag, preceded by one line naming the source and release and by the dictionary's three copyright lines, copied from its header. The README
credits GS1. The app's own licence stays MIT.

## Reading input — `src/lib/gs1.ts`, `src/lib/codes.ts`, `src/lib/types.ts`

### Where it runs

`buildEntry` gains one branch for GS1 descriptors. Its first three lines, which find the
descriptor `d`, clean the token into `value` and resolve `options`, stay as they are:

```ts
if (d && isGs1(d)) {
	const read = readGs1Input(value);
	if (!read.ok) return { raw: token, value, format, options, valid: false, message: read.message };
	const entry: CodeEntry = {
		raw: token,
		value: read.value,
		format,
		options,
		...checkCode(read.value, format, options)
	};
	return read.fromScan ? { ...entry, fromScan: read.fromScan } : entry;
}
return { raw: token, value, format, options, ...checkCode(value, format, options) }; // as today
```

Everything downstream (`checkCode`, the engine, `scanData`, rendering, the play page) sees the
bracketed string as `value`, unchanged. `raw` keeps the token as typed. List-mode share links are
built from `raw` and row records from the row's payload, so links carry what the tester typed; a
GS character percent-encodes as `%1D` and decodes back.

`CodeEntry` gains one field, and `message`'s comment widens. A read-step refusal carries no
`fromScan`. `fromScan: {}`, without an identifier, still records that the token was read as scan
data: tests assert it, and spec 3 extends it with the Digital Link form.

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
3. **Identifier.** Text starting with `]` begins with a three-character identifier `ID`, the
   text's first three characters, or fewer when shorter. `]C1`, `]e0`, `]d2`, `]Q3` and `]J1`,
   matched exactly, are removed and kept as `aim`. Case matters, since `]E0` is EAN-13:
   - `ID` equal to one of the five only when case is ignored, such as `]c1`, is refused with
     `ID is not a GS1 symbology identifier; identifiers are case-sensitive, use ]C1`, naming the
     matching one.
   - Any other `ID` is refused with
     `ID is not a GS1 symbology identifier; GS1 scan data starts with ]C1, ]e0, ]d2, ]Q3 or ]J1, or with its first AI`.
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
3. `aiAt` finds the AI here. `TEXT` below is up to eight characters from here, with GS shown as
   `␝`, followed by `…` when more remain; `AFTER` is ` after (AI)`, naming the last element read.
   When no AI is found, the stop message depends on what is here:
   - Text starting with `(`:
     `Brackets and scan data cannot be mixed; put every AI in brackets or none (stopped at "TEXT"[AFTER])`.
   - Otherwise, with no element read yet:
     `No GS1 AI starts at "TEXT"; GS1 data starts with an AI, such as 01 before a GTIN`.
   - Otherwise: `No GS1 AI starts at "TEXT"AFTER`.
4. A predefined-length AI takes exactly its fixed length, the sum of its fields. If only `M`
   characters come before the next GS or the end, with `M` below that length `N`, stop with
   `(AI) takes N characters; only M follow`, or `only 1 follows` or `none follow`.
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
- **`01` and a 13-digit GTIN as raw input**, such as `010950110153000`, is refused with
  `(01) takes 14 characters; only 13 follow`, by design: the splitter treats (01) as a fixed 14-character field with no exception per carrier,
  and a scanner always sends 14. Bracketed, the five GTIN-only DataBar formats still accept 13
  digits; the other six refuse them anyway (`AI 01: Too short`). A bare 13-digit string, without the `01`, gets the bare-GTIN message below only when its first digits spell no AI; otherwise it reads as the AI they spell, such as `4006381333931` as (400) or `0036000291452` as an (00) with too few characters.
- **A bare GTIN**, such as `09501101530003`, is refused with
  `No GS1 AI starts at "09501101…"; GS1 data starts with an AI, such as 01 before a GTIN`.
- **Mixed forms.** Raw data with brackets later, such as `0109501101530003(10)LOT42`, is refused
  with
  `Brackets and scan data cannot be mixed; put every AI in brackets or none (stopped at "(10)LOT4…" after (01))`.
- **Other AIM identifiers**, such as `]C2`, `]d3`, `]Q5` or `]e1`, are refused as non-GS1. They mark
  FNC1 in second position, ECI or composite symbols, which none of the eleven formats draws. This
  reading of ISO/IEC 15424 is from recollection, not checked against the standard.
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

- **Codes drawn under the render-anyway setting** have `gs1`, so they get a breakdown too.
- **`scanData`'s fallback.** When the value did not parse, `scanData` returns it unchanged as
  `gs1.data` (spec 1). `breakdown` recognises such data by its leading `(` and does not run the
  splitter, whose mixed-forms message would mislead for a code written fully in brackets. It
  returns no lines and the stop `The bracketed string could not be split into AIs`: the summary
  reads `No readable AIs` and the table holds only the stop row.
- **No elements and no stop** cannot occur, since a drawn code carries data.

### Decoding — `describeValue`

1. **Fields.** The value is cut into the AI's fields: fixed fields take their length in turn, a
   variable last field takes the rest, an optional field is absent when the value has ended. A
   value that does not fit its fields, possible only under the render-anyway setting, is shown
   whole as written.
2. **Dates.** Fields with the linter `yymmdd`, `yymmd0` or `yyyymmdd` (M6) become `YYYY-MM-DD`.
   On a `yymmd0` field, day `00` becomes the month's last day followed by
   ` (day 00: end of month)`. A two-digit year follows GS1 General Specifications §7.12: subtract
   today's two-digit year from it; a result of 51 to 99 means the previous century, −99 to −50 the
   next, anything else the current one. On 2026-11-03, `00` to `76` give 20YY and `77` to `99`
   give 19YY. A date that does not exist (month `00` or `13`, 30 February, day `00` on a `yymmdd`
   or `yyyymmdd` field) is shown as written followed by ` (not a date)`.
3. **Times.** `hhmi` becomes `HH:MM`; consecutive `hh`, `mi` and `ss` fields form one time joined
   with `:`, as in `14:30:05`; an hour with no minutes becomes `14h`. An hour over 23, or a minute
   or second over 59, leaves the time as written followed by ` (not a time)`.
4. **Measures and amounts.** For the assigned four-digit AIs in 3100–3699 and 3900–3959, 368 of
   them (M5), the AI's last digit `n` is the number of decimal places in the last field. Its
   digits are left-padded with zeros to `n + 1`, a point goes `n` from the right, and leading
   zeros before the point go except one: `001234` with `n = 3` reads `1.234`, `000050` reads
   `0.050`, and with `n = 0`, `000123` reads `123`. A currency code in a field before it, as in
   (391n) and (393n), is shown as written.
5. **Joining.** Each date, each time and each other field is one unit; units join with one space.
6. Everything else is shown as written.

Examples, with today 2026-11-03:

| Element              | Line text                                                 |
| -------------------- | --------------------------------------------------------- |
| `(17)261231`         | `(17) USE BY or EXPIRY 2026-12-31`                        |
| `(17)261200`         | `(17) USE BY or EXPIRY 2026-12-31 (day 00: end of month)` |
| `(17)991231`         | `(17) USE BY or EXPIRY 1999-12-31`                        |
| `(17)261331`, lax    | `(17) USE BY or EXPIRY 261331 (not a date)`               |
| `(3103)000123`       | `(3103) NET WEIGHT (kg) 0.123`                            |
| `(3912)97801234`     | `(3912) AMOUNT 978 12.34`                                 |
| `(7003)2612311430`   | `(7003) EXPIRY TIME 2026-12-31 14:30`                     |
| `(8008)26123114`     | `(8008) PROD TIME 2026-12-31 14h`                         |
| `(8008)261231143005` | `(8008) PROD TIME 2026-12-31 14:30:05`                    |
| `(10)LOT42`          | `(10) BATCH/LOT LOT42`                                    |
| `(8110)106141…`      | `(8110) — 106141…`, untitled                              |

### Display — `Gs1Breakdown.svelte`

The component takes `{ data: string; label?: string; today?: Date }`. `today` defaults to
`new Date()`, read once at creation; tests pass it. `label` prefixes the summary's accessible
name, which keeps the visible text: with `label` `Code 3 breakdown`, the summary is announced as
`Code 3 breakdown: 4 AIs`.

```svelte
<details class="gs1-breakdown">
	<summary aria-label={label ? `${label}: ${summary}` : undefined}>{summary}</summary>
	<table>
		<thead>
			<tr>
				<th><span class="visually-hidden">AI</span></th>
				<th><span class="visually-hidden">Name</span></th>
				<th><span class="visually-hidden">Value</span></th>
			</tr>
		</thead>
		<tbody>
			<!-- one row per line: <th scope="row">(17)</th><td>USE BY or EXPIRY</td><td>2026-12-31</td> -->
			<!-- with a stop, a last row: <td colspan="3">⚠ Reading stops here: STOP. A receiving system may stop here too.</td> -->
		</tbody>
	</table>
</details>
```

- **Summary text.** `1 AI` or `N AIs`; with a stop, `N AIs, then reading stops`; with a stop and
  no element, `No readable AIs`.
- **Table.** It is tabular data, so a table gives screen readers its headers. The header cells
  keep their place in the table and hide only their text, with a clip-based `visually-hidden`
  class the component defines; the header row has no padding or border, so it takes no visible
  space. An untitled AI's name cell shows `—`.
- **Narrow screens.** The table is `width: 100%`. The AI cell does not wrap, titles wrap at their spaces (at most 25 characters, M7), and the value cell and the stop row wrap anywhere (`overflow-wrap: anywhere`). `.gs1-breakdown` is `position: relative`, so the hidden header text stays inside the list's scroller. The verdict lines in the list and the row editor also wrap anywhere, since the scan data after → has no spaces. So at 360 px wide neither the list nor the editor scrolls sideways.
- **Closed by default.** The open state lives in the element only. It is neither saved nor shared.
- **Colour.** `.gs1-breakdown { color: CanvasText }` in the component's scoped CSS. The validation
  list colours each whole `li` green, red or amber, and the breakdown must not inherit that; the
  verdict line carries the state.

Placement:

- **Validation list.** Inside each `li` whose entry has `gs1`, after the verdict span, at full
  width (`flex-basis: 100%`), with `label` `Code N breakdown`, `N` being the entry's 1-based
  position. A 5-AI table is taller than the list's 200 px cap, so while any breakdown is open the
  cap rises: `.validation-list:has(details[open]) { max-height: 60vh }`. The list is keyed by
  index, so a breakdown stays open at its position as the text changes; the label names the
  position.
- **Row editor.** After `.row-controls`, inside `li.row`, when the row's entry has `gs1`, with
  `label` `Code N breakdown`. It sits outside the verdict span, so the payload's description stays
  one line, and it comes after the row's controls in tab order. Rows are keyed by object, so a
  breakdown stays open while its payload is edited, as long as the code stays drawable; an edit that makes it invalid removes the breakdown, which returns closed.
- **Play page.** None.

## Verdict and hints — `src/lib/verdict.ts`, `ValidationList.svelte`, `RowEditor.svelte`, `src/routes/+page.svelte`

### Verdict text

Spec 1's table changes in two places, marked:

| State                  | Text                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Valid GS1              | ` ✓ · SIZE · N characters[ · dense][ · over …]`**`[ · scan data from CARRIER (ID)]`**` → AIM DATA`                               |
| Rendered despite lint  | ` ⚠ rendered anyway · LINT[ (parentheses …)] · SIZE · N characters[ · dense][ · over …]`**`[ · scan data from …]`**` → AIM DATA` |
| Invalid, too long      | ` ✗ too long for LABEL[ (level X)]`**`[ OVERRIDE]`**                                                                             |
| Invalid with a message | ` ✗ MESSAGE[ (parentheses inside a value are not supported)][ OVERRIDE]`                                                         |
| Invalid, no message    | ` ✗ invalid`**`[ OVERRIDE]`**                                                                                                    |

- **Scan-data note.** Present when `entry.fromScan?.aim` is set and differs from `entry.gs1.aim`.
  `ID` is the removed identifier; `CARRIER` is `GS1-128` for `]C1`, `GS1 DataBar` for `]e0`,
  `GS1 DataMatrix` for `]d2`, `GS1 QR Code` for `]Q3` and `GS1 DotCode` for `]J1`. It is the last
  clause before the arrow and deliberately neutral: moving data between carriers is a supported
  use, not a warning.
- **Override suffix.** `OVERRIDE` is ` (the validation setting cannot override this)`. It appears
  on every refused entry whose resolved `lax` is true; `resolveOptions` sets `lax` only on GS1
  formats. When the parentheses suffix also applies, it comes first.
- **Helpers.** `descriptorOf(entry)` replaces the four `FORMAT_BY_ID.get(entry.format)` calls
  (handoff F3). Afterwards `grep -c "FORMAT_BY_ID.get" src/lib/verdict.ts` prints `1` and
  `grep -n "gtinCheck === 'own'" src/lib/verdict.ts` prints nothing (handoff Q2).

Worked examples. The read step hands BWIPP the bracketed string, so each raw example's size and
count equal its bracketed twin's in spec 1's _Verdict_ section or in M7:

- GS1-128, `]C101095011015300031726123110LOT42`:
  ` ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42`
- GS1-128, `10LOT42<GS>0109501101530003`:
  ` ✓ · 222 modules wide · 23 characters → ]C1 10LOT42␝0109501101530003`
- GS1-128, `]d201095011015300031726123110LOT42`:
  ` ✓ · 255 modules wide · 31 characters · scan data from GS1 DataMatrix (]d2) → ]C1 01095011015300031726123110LOT42`
- GS1 DataBar Omnidirectional, `]e00109501101530003`:
  ` ✓ · 96 modules wide · 16 characters → ]e0 0109501101530003`
- GS1-128, `]d1ABC`:
  ` ✗ ]d1 is not a GS1 symbology identifier; GS1 scan data starts with ]C1, ]e0, ]d2, ]Q3 or ]J1, or with its first AI`
- GS1-128, `]c10109501101530003`:
  ` ✗ ]c1 is not a GS1 symbology identifier; identifiers are case-sensitive, use ]C1`
- GS1-128, `01095011015300039Z45`: ` ✗ No GS1 AI starts at "9Z45" after (01)`
- GS1-128, `09501101530003`:
  ` ✗ No GS1 AI starts at "09501101…"; GS1 data starts with an AI, such as 01 before a GTIN`
- GS1-128, `0109501101530003(10)LOT42`:
  ` ✗ Brackets and scan data cannot be mixed; put every AI in brackets or none (stopped at "(10)LOT4…" after (01))`
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
- GS1-128, `(`, render-anyway on (M2): ` ✗ invalid (the validation setting cannot override this)`

### Raw text on screen

The validation list shows each entry's raw text as `displayData(entry.raw)`, so a GS character
shows as `␝`, as in the scan data. Textual notations show as typed. The row editor's field shows
what was typed; the breakdown shows how it was read.

### Hints

`SCAN_HINT` and `DENSE_HINT` are unchanged. Two texts change:

- `GS1_HINT`: `GS1 formats take bracketed element strings, such as (01)09501101530003(10)LOT42, or
scanner output, such as ]C1010950110153000310LOT42<GS>17261231; the ]C1-style identifier is
optional. Write a separator as the GS character, ␝, <GS>, \x1d or \u001d. If a keyboard-wedge
scanner drops separators, set it to send <GS>. One code per line; spaces and line breaks are
removed, commas are data, and parentheses inside a value are not supported.`
- `LAX_NOTE`: `Ticked, a code that fails GS1 validation is drawn anyway, flagged amber with the
reason. Three kinds of failure can never be overridden: malformed brackets, scan data that cannot
be read (an unknown AI or identifier, or a parenthesis in a value), and a code too long for its
symbol. Separately, GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional and
Limited still refuse a wrong GTIN, and GS1 DataBar Expanded and Expanded Stacked carry the
corrected check digit of a leading GTIN.`
- The GS1 placeholder in `+page.svelte`, `Paste GS1 element strings — one per line`, becomes
  `Paste GS1 element strings or scan data — one per line`.

`verdict.test.ts` pins `GS1_HINT` and `LAX_NOTE` word for word; `page.test.ts` pins the
placeholder.

### Row editor ride-along (handoff F1)

`RowEditor` computes `const entries = $derived(rows.map((row) => rowEntry(row)))` and uses
`entries[i]` in the each block and `entries.some(…)` for the two hints. One `$derived` over all
rows rebuilds every row's entry when any row changes. Today the two hint checks already rebuild
the rows up to twice per change, plus the edited row once more, so the total falls; bwip-js rows
also hit the engine's encode cache.

## Testing

Baseline: 29 test files, 529 tests. Before any implementation, the changes below turn exactly
these existing tests red, and nothing else:

- in `src/lib/verdict.test.ts`, the eleven cases of the it.each that feeds `0109501101530003`, the
  GS1 QR level H too-long test (run with the setting on) and the `hint texts` test, which pins
  `LAX_NOTE` and `GS1_HINT`;
- `src/lib/components/ValidationList.test.ts` lines 184 and 195;
- the placeholder test at `src/routes/page.test.ts` line 841.

Each is rewritten as described below. The engine tests that call `check` with unbracketed input
directly (`src/lib/engines/bwipjs.test.ts` lines 222 and 298–310) stay green, since the engine is
unchanged.

New and changed tests, by file:

- **`src/lib/gs1Ais.test.ts`** (new):
  - `aiEntry` and `aiAt` on two-, three- and four-digit AIs, an expanded range member and
    non-digits.
  - Every `describeValue` example in the table above, with today 2026-11-03.
  - The century window: `76` and `77` with today 2026-11-03; the next-century branch with today
    2090-01-01, where `(17)400101` reads `2140-01-01`.
  - Leap years: 29 February in 2024 decoded, in 2026 `(not a date)`.
  - Each `(not a date)` and `(not a time)` case: month `13`, 30 February, day `00` on (7006) and
    on (7250), hour `24`, minute `60`.
  - (7007) with its optional second date absent; a value that does not fit its fields, shown
    whole; an untitled AI.
  - The six parity tests, and `parseDictionary` and `assertStructure` on inline fixtures.
- **`src/lib/gs1.test.ts`**:
  - `readGs1Input` passing bracketed text through untouched.
  - Each notation, in both letter cases where it applies.
  - Each identifier removed and kept; `]c1` with the case-sensitive message; `]d1` with the
    non-GS1 message.
  - Leading, doubled, post-predefined and trailing separators skipped.
  - Each stop message: mixed forms, a bare GTIN, an unknown AI after an element, `only 1 follows`,
    `none follow`, an empty value, a parenthesis, no AIs.
  - `splitScanData` returning the elements read before a stop; `breakdown` lines, stop and the
    fallback case.
- **`src/lib/codes.test.ts`**:
  - `buildEntry` on raw input: bracketed `value`, `raw` as typed, `fromScan` with and without
    `aim`.
  - A read-step refusal's entry: `valid: false`, `message`, resolved `options`, no `gs1`, no
    `fromScan`.
  - **Round trip**, the strongest check of regeneration. For each carrier and its spec 1 sample
    (S on GS1-128 and the three 2D carriers, G on the five GTIN-only members, E on Expanded and
    Expanded Stacked, plus the lax `(01)09501101530004` on GS1-128 and Expanded), the entry's
    `aim + data` is fed back as raw input in the GS-character, `␝` and `<GS>` forms. Each gives
    identical `gs1` and an identical rendered SVG.
- **`src/lib/verdict.test.ts`**:
  - The `hint texts` test pins the new `GS1_HINT` and `LAX_NOTE`.
  - The scan-data note, present on a mismatch and absent on a match or no identifier.
  - The worked examples above.
  - The it.each that fed `0109501101530003` to all eleven carriers now feeds `(01)09501101530003(10`, whose last AI lacks its closing bracket, and expects
    the suffix on all eleven with the setting on. `0109501101530003` itself is now valid on all
    eleven, asserted once.
  - The GS1 QR level H too-long test gains the suffix.
- **`src/lib/components/Gs1Breakdown.test.ts`** (new), with `today` passed:
  - The summary text in its four forms, and its accessible name with and without `label`.
  - Closed by default.
  - One table row per element with the expected cells; `—` for an untitled AI; the `⚠` stop row;
    the three header cells.
- **`src/lib/components/ValidationList.test.ts`**:
  - `␝` in raw text; a disclosure, labelled `Code N breakdown`, only on entries with `gs1`.
  - Line 184 asserted a GS1 `li`'s whole text, which now includes the breakdown. It asserts the
    `.raw` and `.verdict` spans instead.
  - Line 195 used `0109501101530003` as an invalid GS1 row; it uses `(01)09501101530003(10`.
- **`src/lib/components/RowEditor.svelte.test.ts`**:
  - The disclosure outside the verdict span, labelled `Code N breakdown`.
  - A disclosure that stays open while its payload is edited.
  - `grep -c "rowEntry(" src/lib/components/RowEditor.svelte` prints `1` (handoff F1).
- **`src/routes/page.test.ts`**: the new GS1 placeholder; a raw GS1 row from a share link renders
  a valid entry.

Tests that read a decoded date through `ValidationList` or `RowEditor`, which pass no `today`, fix
the clock with `vi.setSystemTime`. The `grep` checks for handoff F3 and Q2 are in _Verdict text_.

## Documentation

The README's GS1 section gains:

- raw scan data input, its notations and the optional identifier;
- that unbracketed codes are now read as scan data, so one used as a deliberate failing case may
  now draw;
- regeneration across carriers;
- the breakdown;
- a credit to GS1's Syntax Dictionary with its licence;
- the regeneration command `npm run gs1-ais`, which behaves the same in bash and fish.

## Verification that fails closed

Every row starts UNVERIFIED. A checker that dies, returns nothing or is skipped leaves its row
UNVERIFIED, never PASS.

| Row | Check                                                                                                                                                                                                                             | Who             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | `npm test` (which runs `npm run check`), `npm run lint` and `npm run build` all clean                                                                                                                                             | agent           |
| 2   | `npm run gs1-ais` on a clean checkout leaves `git status` clean; with `SHA256` changed by one character it exits non-zero and writes nothing. Needs network: a failed fetch leaves the row UNVERIFIED                             | agent           |
| 3   | A real GS character pasted into the list shows as `␝` in the list's raw text; pasted into a row field, the row's verdict reads it and shows `␝` in its scan data. Firefox and Chromium                                            | person          |
| 4   | A keyboard-wedge scan into the list, scanner set to send `<GS>` and the identifier, regenerates; scanning the drawn code emits the same line                                                                                      | person, scanner |
| 5   | Round trip on hardware for each of the eleven carriers: scan, paste, scan the regenerated code, compare                                                                                                                           | person, scanner |
| 6   | A GS1 DataMatrix scan pasted into a GS1-128 row shows the scan-data note; scanning the drawn code gives `]C1` and the same data                                                                                                   | person, scanner |
| 7   | With a screen reader, the summary is announced with its label and as collapsed or expanded; the table reads with its headers; the payload's description is the verdict alone; the summary follows the row's controls in tab order | person          |
| 8   | A share link carrying a GS character round-trips, row records and list mode, in Firefox and Chromium                                                                                                                              | agent or person |
| 9   | A wedge scan with separators dropped shows the swallowed value in the breakdown, as the hint warns                                                                                                                                | person, scanner |
| 10  | An open breakdown raises the validation list's cap, and at 360 px wide neither the list nor the editor scrolls sideways, with a 25-character title and a 90-character value. Firefox and Chromium                                 | agent or person |

## Out of scope

- The North American coupon (spec 4) and GS1 Digital Link (spec 3).
- A compare mode that checks a scan against a row.
- Country and currency names, check-digit marks and splitting out the company prefix.
- The `^029` notation and other separator notations.
- Choosing the row's format from the identifier.
- A message naming the symbology of a non-GS1 identifier, such as `]E0` for EAN-13.
- A copy-as-bracketed control.
- Checking AI pairing rules (`req=`, `ex=`); `lintreqs` stays off, as in spec 1.

## Measurements

Method: throwaway scripts on Node v24.17.0 against
`node_modules/bwip-js/dist/bwip-js-node.mjs` (bwip-js 4.11.4, BWIPP 2026-05-28), with
`lintreqs: false` as the engine passes it; the dictionary fetched with `gh api` at tag
`2026-01-27`; throwaway Python over the dictionary. The scripts are not kept. The GS1 review lens
re-ran M3, M5, M6 and M7 independently and checked M1 and M2 on two encoders; M8 was run by the
author only.

- **M1. Input without brackets is refused everywhere.** `09501101530003`, `0950110153000`,
  `0109501101530003`, `]C10109501101530003` and `01095011015300031726123110LOT42` fail on all
  eleven encoders: `AIs must start with '('` on six, `GS1 DataBar MEMBER must be 13 or 14 digits`
  on the five GTIN-only members.
- **M2. Malformed brackets.** `(01)09501101530003(10` and `(01` fail strict and with `dontlint`
  on all eleven: `AIs must end with ')'` on six, the 13-or-14-digits message on the five. A lone
  `(` fails on GS1-128, strict and lax, with no message (pinned by
  `src/lib/engines/bwipjs.test.ts`, the test that refuses a lone `(` on every carrier).
- **M3. The dictionary.** Release 2026-01-27: 344 lines, 30 280 bytes, SHA-256
  `6461ece7c03420fb27a3f18163ef9a08694aa4bb2491dea25f63bcdf22451a99`, 224 entries expanding to
  541 AIs. BWIPP's `gs1syntax` holds the same 541 AIs, none missing on either side, with
  identical fields. (8110) and (8112) have no title. 15 entries have no flags column, 20 titles
  contain `#`, and 17 titles hold non-ASCII characters (`m²`, `m³`).
- **M4. Table size.** The conversion written as compact JSON is 31 533 bytes, 3 123 gzipped.
- **M5. Structure.** No AI is a prefix of another; AIs are two, three or four digits. The AIs
  flagged `*` are exactly those whose first two digits are among the 22 predefined-length
  prefixes; four of those prefixes, `04`, `14`, `18` and `19`, have no AI assigned. Every `*` AI
  has only fixed, required, numeric fields. No AI has a variable field before its last, and none
  has an optional field before a required one. 368 assigned AIs fall in 3100–3699 and
  3900–3959; 3944–3949 and 3956–3959 are unassigned.
- **M6. Date and time linters.** `yymmd0` on 8 entries; `yymmdd` on 7 fields in 6 entries, twice
  on (7007); `yyyymmdd` on 2; `hhmi` on 5; `hh`, `mi` and `ss` on one each, all three on (8008).
- **M7. GS1-128 widths.** `(01)09501101530003(17)261231(10)LOT42` 255 modules,
  `(10)LOT42(01)09501101530003` 222, `(01)09501101530003(10)LOT42(17)261231` 266: one GS adds 11.
  The longest dictionary title has 25 characters.
- **M8. `import.meta.main`.** A `.ts` file run with `node` sees `true`; the same file imported by
  another sees `false`.

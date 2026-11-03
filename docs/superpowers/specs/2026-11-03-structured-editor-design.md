# Structured editor — Design

**Date:** 2026-11-03
**Status:** Design agreed in conversation across four sections on 2026-11-03; awaits the
multi-lens review and the user's review before planning. Spec 3 of a three-spec series (see
_Series_).

## Intent

scandible takes one list in one format today. The textarea holds one code per line, the Format
and Error correction selects apply to the whole list, and a newline always ends a code. This spec
adds an opt-in **Per row** editor in which each code is a row with its own format, its own
error-correction level and a payload that may span several lines, and a share link that carries
those rows. Two purposes drive it, and the user chose to serve both equally (option C):

- **Mixed-symbology test decks.** A UPC, then a QR Code, then a Data Matrix, to test a scanner's
  auto-discrimination: short payloads, a format per row, and an order that matters.
- **Rich 2D payloads.** Multi-line text such as vCards, Wi-Fi strings or GS1 element strings,
  with a per-row error-correction level to see how a long payload fares.

**A deliberate rule reversal.** The July 2026 formats spec
([`2026-07-21-barcode-formats-design.md`](2026-07-21-barcode-formats-design.md)) decided "one
format per list", and spec 1 recorded that spec 3 would reverse it for structured mode only. This
spec does so for Per row mode only: each row carries its own format and level. Plain text mode
keeps the rule: one format and one level for the whole list.

Success, workflow 1 (mixed deck): the tester picks **Per row** in the Editor select, adds rows
with **Add code**, gives each row its format, puts them in order with **Move up** and **Move
down**, and presses Start. The play page shows the codes in row order, each in its own
symbology, in Scroll or in Step, and the share link reproduces the deck. Workflow 2 (rich
payload): the tester types a vCard into a QR Code row, pressing Enter between its lines, sets
that row's level to H, reads the row's verdict (modules, bytes, dense) and plays it. Plain text
stays the default. A link without records opens exactly as today, and every link issued before
this spec decodes as it did.

## Series

The series has three specs, each with its own plan, in this order:

1. **2D formats** — merged on `main` as `c0cd905` on 2026-11-02. Its _Series_ section described
   this spec as "An opt-in editor with one entry per row, where each entry may carry its own
   format and its own symbology options, including error correction. It brings multi-line
   payloads and a tagged record param in the URL. The textarea stays the default so 1D users see
   nothing new."
2. **Step-and-dwell playback** — merged on `main` as `ad77e62` (PR #2). Its stage and the
   scroller take entries as given ("A 1D list, a 2D list and spec 3's mixed lists step the same
   way"), so this spec needs no engine work.
3. **This spec — structured editor.** The last spec of the series.

Spec 1 built the seams this spec uses, and this spec uses them as built:

- **`CodeEntry.format` and resolved `options`.** The scroller, the step stage and the validation
  list read each entry, never `settings.format` or `settings.ecc`.
- **`resolveOptions(d, list, override?)`** has had an override layer from day one, never
  populated. A row's level rides it.
- **`buildEntry(token, format, list, override?)`** is the per-row seam. `rowEntry` calls it once
  per row.
- **"URLs never read resolved entry state."** Start, Share and Back encode rows, never entries.
- **The codec "grows additively".** `codes`, `fmt` and `ecc` keep their meaning, records sit
  beside them, and the decoder's result gains a `records` field.

This spec supersedes three details of spec 1's forecast. Spec 1 forecast "a tagged-record param",
one parameter; this spec writes one numbered parameter per row (`r1`, `r2`, …), so no record
separator exists. The decoder accepts both forms, and a link carrying both is read as records.
Only error correction is per row; the other symbology options stay out of scope. And 1D users
see one new control, the Editor select above the textarea; nothing else changes for them.

## Decisions

- **A row model beside the textarea** (option 1 of the three considered). `src/lib/rows.ts` holds
  the `Row` model and its conversions, `src/lib/components/RowEditor.svelte` edits rows, and the
  codec grows. The page derives entries from whichever editor is active; the textarea path stays
  byte for byte as it is.
- **Rejected: rows as the only model, with the textarea as a view of them.** Typing would
  round-trip through tokenisation on every keystroke, and blank lines, trailing commas and
  whitespace would vanish under the cursor.
- **Rejected: editing `CodeEntry` objects directly.** Entries are a derived view, and URLs must
  never read them.
- **The switch converts both ways and asks only when it loses something.** Plain text to Per row
  never loses anything and happens at once. Per row to Plain text happens at once when it is
  lossless; otherwise an inline note says what would be lost and offers Switch anyway and Cancel.
  No browser dialog.
- **The editor mode belongs to the link, not to playback.** `Settings` gains no field. A link with
  records opens in Per row; any other link, or none, opens in Plain text.
- **One URL parameter per row, numbered, tag always explicit** (option A, with numbered keys).
  Keys are `r1`, `r2`, … (1-based, matching the row numbers the page shows), and every value
  names its format, even one equal to `fmt`. Numbered keys cost one to three digits per row and
  buy two things: tools that treat parameters as a map keep every row, and a person editing a
  link by hand sees which row is which.
- **One row is one code.** A comma never splits a row, and a newline inside a row is part of its
  payload. A numeric row keeps `buildEntry`'s whitespace strip, so a comma makes it invalid and a
  newline vanishes from its value.
- **A row's level rides the override layer.** The list-level level is never consulted in Per row
  mode.
- **Blank rows are skipped everywhere.** A row whose payload is empty or whitespace yields no
  entry, writes no record and counts as no loss.
- **Rows links never carry `ecc`, and still carry `fmt`:** the format new rows take when the link
  opens in the editor.
- **Reordering by buttons.** Each row has Move up, Move down and Delete, and an Add code button
  sits below the list. In the user's words, this is "for the initial implementation"; drag
  handles are a possible later addition, out of scope here.
- **No `$effect`.** The switch, the note and the editor use function bindings and event handlers
  only, the project convention.

## Row model and conversions — `src/lib/rows.ts`, `src/lib/codes.ts`

### `tokenize` — `src/lib/codes.ts`

```ts
/** Split (newline; plus comma for numeric formats) → trim → drop empties. An unknown format
 *  splits as numeric, as parseCodeList always has. */
export function tokenize(text: string, format: FormatId): string[];
```

`tokenize` is the splitter inside today's `parseCodeList`, moved out unchanged:
`numeric = FORMAT_BY_ID.get(format)?.numeric ?? true`; the text is split on `/[\n,]/` when
`numeric` holds and on `/\n/` otherwise; each piece is trimmed; empty pieces are dropped.
`parseCodeList(raw, format, ecc = '')` becomes
`tokenize(raw, format).map((token) => buildEntry(token, format, { format, ecc }))`, so its output
does not change. `tokenize` lives in `codes.ts` beside `parseCodeList`. `rows.ts` imports from
`codes.ts` and `codes.ts` never imports `rows.ts`, so there is no import cycle.

### `src/lib/rows.ts`

```ts
import type { FormatId } from './formats';
import type { CodeEntry } from './types';

export interface Row {
	payload: string; // the field's text as typed; may contain newlines
	format: FormatId;
	ecc: string; // this row's level; '' = the format's default, canonical like Settings.ecc
}

export interface TextConversion {
	text: string; // non-blank tokens joined by '\n'
	format: FormatId; // first non-blank row's format, else fallback.format
	ecc: string; // that row's ecc, else fallback.ecc
	loses: { formats: number; levels: number; splits: number }; // rows affected; all 0 = lossless
}

/** CRLF and lone CR → LF, then both ends trimmed. '' marks a blank row. */
export function rowToken(payload: string): string;

/** One entry for a non-blank row, through the override layer; null for a blank row. */
export function rowEntry(row: Row): CodeEntry | null;

/** rowEntry over the rows in order, blank rows dropped. */
export function rowEntries(rows: Row[]): CodeEntry[];

/** One row per token of the list, carrying the list's format and level. */
export function rowsFromText(text: string, format: FormatId, ecc: string): Row[];

/** The Plain text form of the rows and what it would lose. */
export function textFromRows(
	rows: Row[],
	fallback: { format: FormatId; ecc: string }
): TextConversion;

/** The loss note's text; '' when every count is 0. */
export function describeLoss(loses: TextConversion['loses']): string;
```

**`rowToken(payload)`** is `payload.replace(/\r\n?/g, '\n').trim()`: each CRLF, and each lone CR,
becomes LF, and `String.prototype.trim` removes whitespace at both ends, as `tokenize` does. The
result is the row's **token**. A row whose token is `''` is a **blank row**: it yields no entry,
writes no record and is not a loss. Spec 1's invariant holds: no entry ever has an empty value.
The function is exported because `shareUrl.ts` writes and checks tokens by the same rule.

**`rowEntry(row)`** returns `null` for a blank row. Otherwise it returns
`buildEntry(token, row.format, { format: row.format, ecc: '' }, { ecc: row.ecc })`. The row's
level rides the override layer and the list layer is empty, so the list-level level is never
consulted in Per row mode. `resolveOptions` already skips a layer `isEccChoice` rejects, so
`ecc: ''` falls through to the descriptor default (`M` for QR Code). The token reaches
`buildEntry` uncleaned, as a textarea token does: a numeric row keeps today's whitespace strip,
so a newline inside a UPC payload vanishes from `value` and stays in `raw`, and a text row keeps
its newlines in both. Commas are not split: one row is one code, and a numeric row containing a
comma is one invalid code.

**`rowEntries(rows)`** maps `rowEntry` over the rows in order and drops the nulls.

**`rowsFromText(text, format, ecc)`** maps each token of `tokenize(text, format)` to
`{ payload: token, format, ecc }`, so the rows equal today's validation list exactly, one row per
entry, in order. `ecc` is canonical by construction: the page keeps `Settings.ecc` canonical and
the decoder validates it.

**`textFromRows(rows, fallback)`** ignores blank rows throughout. The chosen format and level
come from the first non-blank row; with no non-blank row (no rows, or only blank ones) they are
`fallback.format` and `fallback.ecc`. `text` is the non-blank rows' tokens joined by `'\n'`, each
token whole (`''` when there are none). `loses` counts rows, never pieces:

- `formats`: non-blank rows whose format differs from the chosen format.
- `levels`: non-blank rows at the chosen format whose `ecc` differs from the chosen `ecc`. A row
  at another format is counted once, under `formats`, whatever its level.
- `splits`: non-blank rows whose token `tokenize(token, chosenFormat)` cuts into a number of
  pieces other than one. Multi-line payloads count here, and so does a comma inside a row when
  the chosen format is numeric: precisely what Plain text would do to it. Zero pieces counts too:
  a row whose token is only commas would vanish under a numeric chosen format.

A row can count under both `formats` and `splits`. All three counts 0 means the switch is
lossless.

**`describeLoss(loses)`** returns the loss note (below) when any count is non-zero and `''` when
all three are 0, so it is total; the page shows the note only while the switch is lossy.

### The loss note

The full note for formats 3, levels 1, splits 2, exactly:

```text
Plain text keeps one format and one error-correction level for the whole list, and one code per line. Switching now drops the format of 3 rows, the level of 1 row, and splits 2 payloads into several codes.
```

The first sentence, the **limit sentence**, is always present: it explains the limit. One space
follows it, then a second sentence that starts `Switching now `, lists the non-zero clauses in
the order formats, levels, splits, and ends with `.`:

- formats: `drops the format of N rows` (`1 row` when N is 1).
- levels: `drops the level of N rows`, or `the level of N rows` when the formats clause comes
  before it, so the two read "drops the format of 3 rows, the level of 1 row" (`1 row` when N is
  1).
- splits: `splits N payloads into several codes` (`1 payload` when N is 1).

One clause stands alone. Two clauses are joined by the word "and" with one space on each side.
Three are joined by `, ` after the first and `, and ` after the second.

The examples, as formats, levels, splits → the second sentence (each note is the limit sentence,
a space and this sentence):

- 3, 1, 2 → the note above, exactly.
- 0, 0, 1 → `Switching now splits 1 payload into several codes.`
- 2, 0, 0 → `Switching now drops the format of 2 rows.`
- 0, 1, 1 → `Switching now drops the level of 1 row and splits 1 payload into several codes.`
- 1, 2, 0 → `Switching now drops the format of 1 row and the level of 2 rows.`

## Share URL — `src/lib/shareUrl.ts`

```ts
import type { Row } from './rows';

/** Unchanged signature and output. */
export function encodeShareUrl(codes: string[], settings: Settings): string;

/** Build a per-row share fragment "#r1=…&r2=…&speed=…&…&fmt=…": one record per non-blank row,
 *  numbered from 1 in editor order (an empty `codes` when there is none), then the settings tail
 *  of encodeShareUrl without `ecc`. */
export function encodeRowsShareUrl(rows: Row[], settings: Settings): string;

/** Parse a page URL into codes or records, plus partial settings. The fragment is the source
 *  when it carries `codes` or an `r<n>` key, else the legacy query string is, so old links keep
 *  working. Per-parameter leniency, never throws. */
export function decodeShareUrl(url: URL): {
	codes: string[];
	settings: Partial<Settings>;
	records: Row[] | undefined;
};

/** Module-private. Writes speed, loop, rot, rotmax, skew, skewmax, seed and fmt; then ecc under
 *  today's rule, only when withEcc holds; then mode, dwell and gap under today's rules. */
function appendSettings(params: URLSearchParams, settings: Settings, withEcc: boolean): void;
```

**Encode.** The tail-building code of `encodeShareUrl`, from `speed` through `gap`, moves into
`appendSettings`, which both encoders call, so the two tails cannot drift. `encodeShareUrl` sets
`codes` as today and calls `appendSettings(params, settings, true)`; its output is byte for byte
today's, and its doc comment stays as it is. `encodeRowsShareUrl` writes the records where
`codes` would be, then calls `appendSettings(params, settings, false)`: a rows link never carries
`ecc`, whatever `settings.ecc` holds, and still carries `fmt`, the format new rows take when the
link opens in the editor. Step links append `mode`, `dwell` and `gap` after `fmt` as today.

**Records.** The rows are taken in editor order. Each blank row is skipped, so the numbering is
dense: the `n`-th non-blank row is written as `rn`. The value is the row's `format`, then `-` and
the row's `ecc` when `ecc` is not `''`, then `_`, then the row's token. Rows hold canonical levels
by construction (`rowsFromText` copies the canonical list level, the decoder canonicalises, the
editor's setters and Add code write canonical values), so a non-empty `ecc` is a non-default
level of the row's format and is written as it stands. Format ids are `[a-z0-9]+` and level
values are alphanumeric (`L`, `M`, `Q`, `H`; `auto`, `0` to `8`; `10`, `23`, `36`, `50`).
`URLSearchParams` form encoding leaves `-` and `_` as they are, so the first `_` always ends the
tag, and a payload may itself contain `_` and `-`. The payload is encoded by `URLSearchParams`,
as `codes` is today: newline → `%0A`, space → `+`, `:` → `%3A`, `;` → `%3B`, `#` → `%23`,
`&` → `%26`, `%` → `%25`, `+` → `%2B`. With no non-blank row there is no record to write; the
encoder then writes `codes=` with an empty value where the records would be, so the fragment still
carries a key that makes it the source (see _Decode_), and such a link opens in Plain text with an
empty list and its settings intact, as an empty textarea's link does today.

The rows `{ payload: '012345678905', format: 'upc', ecc: '' }` and
`{ payload: 'WIFI:S:home;\nP:secret', format: 'qr', ecc: 'H' }`, with `DEFAULT_SETTINGS`, encode
to exactly:

```text
#r1=upc_012345678905&r2=qr-H_WIFI%3AS%3Ahome%3B%0AP%3Asecret&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc
```

**Decode.** `decodeShareUrl` keeps per-parameter leniency and never throws.

- **Source.** The fragment/query rule is extended: the fragment is the source when it has
  `codes` **or any key matching `/^r([1-9][0-9]*)$/`**; otherwise the legacy query string is.
  Without the extension a rows link would never be read from the fragment at all. So
  `?codes=1#r1=qr_x` reads the fragment, and `?r1=qr_x` and `?r1=qr_x#top` read the query.
- **When records exist.** The result's `records` is defined whenever any key of the source
  matches `/^r([1-9][0-9]*)$/`, even if every record is then dropped (`records` is `[]`). The
  matching keys are taken in numeric order of their digits (`r2` before `r10`), and gaps are
  compacted: a hand-deleted `r2` leaves rows 1 and 3 as rows 1 and 2. A repeated key keeps its
  first value (`params.get`). `r0` does not match `[1-9][0-9]*` and is ignored; so are `r01`,
  `rx` and `R1`.
- **Each record, on its own.** The value must match
  `/^([a-z0-9]+)(?:-([A-Za-z0-9]+))?_([\s\S]*)$/`; the format must satisfy `isFormatId`; and
  the payload's token (`rowToken`) must be non-empty. A record failing any of these is dropped,
  and the others survive. A level is canonicalised with `canonicalEcc(format, level)`: a level
  the format does not offer, a level on a format with no levels, and the format's default all
  become `''`, and the row survives. No level gives `''`. The row's `payload` is the token, so a
  hand-edited `%0D%0A` arrives as `\n`.
- **`codes` beside records.** When `records` is defined, `codes` is returned `[]` and the `codes`
  parameter is ignored: records win.
- **Everything else is unchanged**, `ecc` included. A link with no `r<n>` key decodes exactly as
  today, with `records: undefined`; the existing `toEqual` assertions ignore an undefined
  property, so they pass unchanged.

`src/hooks.client.ts` needs no change: it rewrites only a fragment `decodeURIComponent` rejects,
and an encoded record contains no bare `%`. The share QR's density and capacity messages work
from the finished string as before, because `ShareLink` takes the encoded fragment.

## Setup page — `src/routes/+page.svelte`, `src/lib/components/RowEditor.svelte`, `src/lib/verdict.ts`, `src/lib/formats.ts`

### The Editor field and the switch

The setup page's new copy, each string exactly:

```text
Editor field label              Editor
Editor option, value text       Plain text
Editor option, value rows       Per row
Format field label, Plain text  Format
Format field label, Per row     Format for new rows
Switch note, first button       Switch anyway
Switch note, second button      Cancel
```

- **Editor field.** A `label.field` holding the Editor label and `select.editor-input`, with the
  options Plain text (value `text`) and Per row (value `rows`): the Playback field's markup
  pattern and styling. The page's order becomes: `h1`; the Editor field; the switch note, while
  it shows; the textarea in Plain text or `RowEditor` in Per row; the file input; the file error;
  `.settings-row`; `ValidationList`, in Plain text only; `ShareLink`; Start. The Editor field
  sits outside `.settings-row`, directly above the input area. The textarea and `RowEditor` are
  rendered with `{#if editor === 'text'} … {:else} … {/if}`, so exactly one is mounted.
- **State.** `let editor: 'text' | 'rows' = $state(decoded.records ? 'rows' : 'text')`;
  `let rows: Row[] = $state(decoded.records ?? [])`; `text` as today, initially
  `decoded.codes.join('\n')`, which is `''` for a records link; `let pendingSwitch = $state(false)`;
  `const conversion = $derived(textFromRows(rows, { format, ecc }))`, live; and
  `const lossy = $derived(conversion.loses.formats + conversion.loses.levels + conversion.loses.splits > 0)`.
  `rows` is deep `$state`, so an edit made in `RowEditor` re-derives `entries`, `conversion` and
  `shareHash`. A link with records opens in Per row with those rows; any other link, or none,
  opens in Plain text exactly as today.
- **Binding.** The select is not bound. It renders `value={editor}` and handles `change` with
  `onEditorChange`, the write-back pattern the page's seconds fields already use.

```ts
function onEditorChange(e: Event & { currentTarget: HTMLSelectElement }): void;
function selectEditor(next: 'text' | 'rows'): void;
function applyConversion(c: TextConversion): void;
function cancelSwitch(): void;
```

- **`onEditorChange(e)`** calls `selectEditor(e.currentTarget.value as 'text' | 'rows')`, then
  writes `e.currentTarget.value = editor`. After a switch that applied, the write repeats what
  Svelte's `value` update does; after a lossy attempt `editor` is still `rows`, and the write is
  what snaps the select back to Per row.
- **Why the handler writes the select.** A bound select would not snap back by itself in Svelte
  5.56.7: `bind_select_value` (`svelte/src/internal/client/dom/elements/bindings/select.js`)
  re-selects an option only when the getter's dependencies change, and `editor` does not change
  on the lossy path, so a function binding would leave the select showing Plain text, and so
  would `value={editor}` alone. The explicit write in the handler is the one line that decides
  the visible state in every case.
- **`selectEditor(next)`** returns at once when `next === editor`. To `rows`:
  `rows = rowsFromText(text, format, ecc); editor = 'rows'`, immediately; the list level is now
  inside each row. To `text`: `const c = textFromRows(rows, { format, ecc })`. When every count of
  `c.loses` is 0 it calls `applyConversion(c)` at once. Otherwise `editor` stays `rows` and
  `pendingSwitch = true`.
- **`applyConversion(c)`** sets
  `text = c.text; format = c.format; ecc = c.ecc; editor = 'text'; pendingSwitch = false`. Both
  ways of applying the switch, the lossless path and Switch anyway, go through it, so applying
  always clears `pendingSwitch`. It sets `format` directly rather than through `selectFormat`,
  because `c.ecc` is already canonical for `c.format`.
- **`cancelSwitch()`** sets `pendingSwitch = false`.
- **The switch note.** `{#if pendingSwitch && lossy}` renders `div.switch-note`, holding a `p`
  with `describeLoss(conversion.loses)`, then `button.switch-anyway` with
  `onclick={() => applyConversion(conversion)}` and `button.switch-cancel` with
  `onclick={cancelSwitch}`, both `type="button"`. The note is live: its counts follow edits made
  while it shows, and Switch anyway applies the conversion as it stands at the click. If edits
  make the switch lossless, the note hides by itself and `pendingSwitch` stays set, which is
  correct: the intent to switch stands until Cancel or the switch, so an edit that makes it lossy
  again shows the note again. Choosing Plain text again runs `selectEditor` again. There is no
  browser dialog.
- **No `$effect`** for any of this: function bindings and event handlers only.

### List-level controls in Per row mode

- **Format** stays, with `.format-input` and `selectFormat` as they are. The label's first text
  node is `{editor === 'rows' ? … : …}` from the copy above: Format in Plain text, Format for new
  rows in Per row. In Per row its value is the format Add code and a file upload give new rows,
  and the `fmt` of the rows link.
- **Error correction**, the list-level field, renders only when
  `editor === 'text' && descriptor?.ecc`: each row has its own. It is rendered conditionally, not
  hidden, as spec 1 does it, because `.field` sets `display: flex`, which defeats the UA
  `[hidden]` rule.
- **`ValidationList`** renders only in Plain text: each row shows its own verdict.
- **Unchanged:** Playback, Dwell, Gap, Speed, Loop, Random rotation and Random skew. The
  duplicate-neighbour hint reads `entries` as today, so it keeps working in Per row.
- **The list `ecc` in Per row.** `selectFormat` keeps canonicalising it, which is harmless. In
  Per row the list `ecc` is unused and hidden; entering Per row copies it into the rows, and
  leaving Per row overwrites it from the conversion.

### File upload, Start and Share

- **File upload in Per row mode replaces the rows**, the same way it replaces the textarea in
  Plain text. After a successful `readCodesFile(file)`, Per row sets
  `rows = rowsFromText(fileText, format, '')`: the format for new rows and no level. Plain text
  sets `text = fileText`, as today. `fileError` behaves as today.
- **Entries.**
  `entries = $derived(editor === 'rows' ? rowEntries(rows) : parseCodeList(text, format, ecc))`.
  `rawCodes` is derived from `entries` as today and used only in Plain text.
- **Share.**
  `shareHash = $derived(editor === 'rows' ? encodeRowsShareUrl(rows, settings) : encodeShareUrl(rawCodes, settings))`.
  Start, the share field and the share QR read `shareHash` as today. `canStart` is unchanged:
  some entry is valid.

### `src/lib/components/RowEditor.svelte`

```ts
// Props, declared with $props(): let { rows = $bindable(), newRowFormat }: RowEditorProps
interface RowEditorProps {
	rows: Row[]; // bound by the page to its deep $state rows; the editor mutates and reassigns it
	newRowFormat: FormatId; // the format Add code gives a new row: the page's list format
}
```

The page renders `<RowEditor bind:rows newRowFormat={format} />` in Per row. The editor's copy,
each string exactly, where N is the row's number, `i + 1`:

```text
textarea.row-payload    aria-label  Code N
select.row-format       aria-label  Format of code N
select.row-ecc          aria-label  Error correction of code N
button.row-up           text        Move up
                        aria-label  Move up, code N
button.row-down         text        Move down
                        aria-label  Move down, code N
button.row-delete       text        Delete
                        aria-label  Delete code N
button.row-add          text        Add code
```

**Markup.** `ol.row-editor` renders one `li.row` per row with
`{#each rows as row, i (row)}`, keyed by the row object, so a move keeps each row's DOM. Each
`li.row` is two lines by design: `div.row-main` holds the number and the payload, and
`div.row-controls` beneath it holds the verdict and the controls, wrapping as the width demands.
A 50-row deck then reads as a list of payloads, each with its verdict and controls under it, and
no viewport width is promised to fit a whole row on one line. In this order:

1. `span.row-number`, in `.row-main`, reading `i + 1`.
2. `textarea.row-payload`, in `.row-main`, with `rows="2"`, its aria-label, and
   `bind:value={row.payload}`: a deep `$state` mutation through the bindable prop. No
   placeholder; the aria-label carries the number. Enter inserts a newline natively, with no key
   handler.
3. `span.row-verdict`, first in `.row-controls` so it sits directly under the payload, reading
   `verdictText(entry)`, where `entry = rowEntry(row)`, or `''` for a blank row. It has the class
   `valid` (colour `#007700`) or `invalid` (colour `#c00`), as `ValidationList` colours its rows,
   and neither class for a blank row. The editor derives each row's entry itself rather than
   taking the page's `entries`: blank rows have no entry, so the indices would not line up. The
   spec 1 encode cache makes the second derivation a lookup.
4. `select.row-format` with its aria-label and today's `FORMAT_GROUPS` optgroups, rendered as
   `.format-input` renders them. A function binding: getter `row.format`, setter
   `(next) => { row.ecc = canonicalEcc(next, row.ecc); row.format = next; }`. The level is
   canonicalised first, so a QR Code row at `H` switched to Data Matrix holds `''`, and switched
   back to QR Code shows `M`, the default.
5. `select.row-ecc` with its aria-label, only when the row's descriptor has `ecc`
   (`{@const opt = FORMAT_BY_ID.get(row.format)?.ecc}`). Bound like the list-level select:
   getter `row.ecc || opt.defaultValue`, setter `row.ecc = v === opt.defaultValue ? '' : v`. Each
   option's text is `label (note)` as today, or the label alone when there is no note.
6. `button.row-up`, disabled for `i === 0`.
7. `button.row-down`, disabled for the last row.
8. `button.row-delete`.

The verdict is not focusable, so Tab moves through payload, format, level when shown, Move up,
Move down, Delete.

Below the list, `button.row-add`, then `p.dense-hint` holding `DENSE_HINT` when any row's entry
has `facts.dense`. Every button is `type="button"`.

**Handlers.** The editor binds the `ol` and `.row-add` with `bind:this` and finds a row's control
as `listEl.querySelectorAll('li.row')[k]?.querySelector(selector)`.

- **Move up and Move down** swap row `i` with its neighbour by reassignment
  (`rows = [...]`, with the two rows exchanged), then `await tick()` and focus a button in the
  moved row, now at `i - 1` or `i + 1`: the button just pressed, or, when the move has put the row
  first or last and so disabled that button, the row's other move button. The refocus is needed
  for focus to stay in the moved row at all: Svelte 5.56.7's keyed `{#each}` moves a row with `Element.before()` (`move()` in
  `svelte/src/internal/client/dom/blocks/each.js`), which detaches the node first, and browsers,
  and jsdom (`_detach` in `jsdom/lib/jsdom/living/nodes/Node-impl.js`), drop focus from a
  detached element. Which of the two rows Svelte moves is its own choice; in 5.56.7 it is the
  earlier one, so without the refocus Move down would lose focus and Move up would keep it.
- **Delete** removes row `i` by reassignment, then `await tick()` and focuses the `.row-payload`
  of the row now at `i`, the next row, or `.row-add` when the deleted row was the last.
- **Add code** appends `{ payload: '', format: newRowFormat, ecc: '' }` by reassignment, then
  `await tick()` and focuses the new row's `.row-payload`.

**CSS**, kept minimal. `ol.row-editor` has `list-style: none; padding: 0; margin: 0` (the row
number is its own span) and `display: flex; flex-direction: column; gap: 12px`. `li.row` is
`display: flex; flex-direction: column; gap: 4px`. `.row-main` is
`display: flex; gap: 6px; align-items: flex-start`, and `.row-payload` inside it has
`flex: 1; min-width: 0` and the monospace font of `.code-input`, so the payload takes the row's
width at every viewport; under `@supports (field-sizing: content)` it gains
`field-sizing: content; min-height: 2lh`, so it grows with its content where the browser supports
it. `.row-controls` is `display: flex; flex-wrap: wrap; gap: 6px; align-items: center`: in the
page's 640 px column a QR Code row's verdict, two selects and three buttons may take two lines,
and at 390 px they wrap further, never past the viewport (verification row 4).

### `src/lib/verdict.ts`

```ts
/** The verdict for one entry, with its leading space. Single expression so exact-textContent
 *  tests stay byte-stable. */
export function verdictText(entry: CodeEntry): string;

export const DENSE_HINT =
	'Dense: more than 100 modules across (PDF417: 300), so each module is small on screen. If the scanner misses these, shorten the payload, lower error correction if the format offers it, or go full screen.';
```

`verdictText` is today's `verdict` function from `ValidationList.svelte`, moved verbatim, with
its helpers `labelOf` and `levelOf` as module-private functions. It returns the same strings,
leading space included. Written with placeholders in angle brackets, they are:

- ` ✓` for a valid 1D entry, unless its encoder changed the value;
- ` ✓ → <encoded>` for a valid 1D entry whose encoder changed the value;
- ` ✓ · <summary> · <N> bytes` for a valid 2D entry (`1 byte` for one), followed by
  ` · UTF-8, no ECI` when the byte count differs from the value's length and by ` · dense` when
  the symbol is dense;
- ` ✗ too long for <format label> (<level label>)` for an entry too long at an accepted level,
  and ` ✗ too long for <format label>` otherwise;
- ` ✗ invalid` for any other invalid entry.

`DENSE_HINT` moves with it, unchanged. `ValidationList.svelte` imports both and renders
`verdictText(entry)` where it rendered `verdict(entry)`; its markup and styles are otherwise
unchanged, and its tests keep passing unchanged.

### `canonicalEcc` — `src/lib/formats.ts`

```ts
/** The canonical form of a level for a format, as Settings.ecc and Row.ecc hold it. */
export function canonicalEcc(format: FormatId, ecc: string): string;
```

`canonicalEcc` returns `''` when the format is unknown, when it does not offer `ecc`, when `ecc`
is not one of its choices, or when `ecc` equals its default; otherwise it returns `ecc`. Three
callers use it. The page's `selectFormat` becomes `ecc = canonicalEcc(next, ecc); format = next`,
the same behaviour as today's inline logic. `RowEditor` uses it when a row's format changes. The
decoder uses it for each record's level.

## Play page — `src/routes/play/+page.svelte`

- **Entries.**
  `const entries = decoded.records ? rowEntries(decoded.records) : parseCodeList(decoded.codes.join('\n'), settings.format, settings.ecc)`.
- **Back.**
  `decoded.records ? encodeRowsShareUrl(decoded.records, currentSettings()) : encodeShareUrl(decoded.codes, currentSettings())`.
  The comment in `back()` stays true: records are decoded share state, never parsed entries.
- **Nothing else changes.** `buildItems` dispatches per entry and tags 2D items with
  `barcode-item--2d` and `barcode-item--<format>`; both engines take entries as given; the
  counter, the readout and the finish summaries count valid entries. A mixed deck plays in Scroll
  and in Step with no engine work. The no-valid bounce is unchanged: a records link with no valid
  entry returns to setup with its fragment, and opens there in Per row. The `hashchange` reload
  and `currentSettings()` are unchanged.

## Edge cases

- **Every record dropped.** A rows link whose every record is dropped opens in Per row with no
  rows, and Start is disabled. The play page bounces such a link to setup.
- **No non-blank rows.** A Per row list with no non-blank row has no record to write, so its
  share link carries `codes=` with an empty value in place of the records (see _Records_) and
  opens in Plain text with an empty list and its settings intact. Start is disabled on such a
  page, so only the share field ever shows this link.
- **Multi-line payloads in 1D formats** go to the encoder as they are. CODE128 (auto) accepts
  control characters, so a two-line CODE128 row is valid and the scanner types the newline. A
  numeric row drops the newline from its value. The verdict tells the truth either way.
- **A comma in a row** is part of the payload. In a numeric row it makes the code invalid; in a
  text row it is data.
- **A round trip keeps the list, not its layout.** Plain text → Per row → Plain text writes one
  code per line: commas between numeric codes, blank lines and surrounding whitespace do not
  survive. The codes do, in order.
- **Cost per keystroke.** Per row re-derives every entry per keystroke, as the textarea does, and
  the editor derives each row's verdict entry again; the spec 1 encode cache makes both lookups,
  except for the edited row.
- **URLs read rows, never entries.** Start, Share and Back encode `Row` objects; a row's raw
  payload is never replaced by an entry's cleaned `value`.
- **Both `codes` and `r<n>`** in one link: records win, and `codes` is ignored.
- **Blank rows** produce no entry and no record. They stay in the editor until deleted, numbered
  like the others, and are dropped from the numbering of the link.
- **Hand-edited numbering.** `r1` and `r3` without `r2` open as rows 1 and 2; a share or Start
  from that page writes `r1` and `r2`.
- **`ecc` on a rows link.** A hand-edited rows link with `ecc` decodes it into the list-level
  setting, which Per row neither shows nor uses; leaving Per row overwrites it, and a rows link
  never writes it.
- **Duplicate-neighbour numbering** counts valid entries, not rows; pre-existing and unchanged.
- **A move to an end.** Moving a row into the first or last place disables the button just
  pressed, and a disabled button cannot take focus, so the refocus goes to the row's other move
  button: Move down into the last place focuses that row's Move up, and Move up into the first
  place focuses its Move down. Focus never leaves the moved row.
- **Accessibility.** Each control in a row carries an aria-label with the row's number: Code N;
  Format of code N; Error correction of code N; Move up, code N; Move down, code N; Delete
  code N. Each button's accessible name starts with its visible text, as WCAG 2.5.3 (label in
  name) asks. The visible row number is a plain span.

## Testing

Each file is named by its path; "new" files do not exist today. In the cases below, a row is
written in its record form, `format[-level]_payload`, with `\n` for a newline inside the payload;
`qr_` is a blank row. Unless a case says otherwise, `textFromRows` takes the fallback
`{ format: 'upc', ecc: '' }`.

- **`src/lib/rows.test.ts`** (new):
  - Tokenizer parity: `tokenize(' 036000291452, 012345678905\n\n4006381333931 ', 'upc')` gives
    `['036000291452', '012345678905', '4006381333931']` and `tokenize('a, b\n\n c ', 'qr')` gives
    `['a, b', 'c']`, each equal to the `raw` values of `parseCodeList` over the same input.
  - `rowsFromText('036000291452,012345678905', 'upc', '')` splits on the comma into
    `upc_036000291452` and `upc_012345678905`; `rowsFromText('hello\nworld', 'qr', 'H')` carries
    the list level: `qr-H_hello`, `qr-H_world`.
  - `rowEntry` returns `null` for `qr_` and for a row whose payload is `' \n\t '`. It uses the
    override layer: `qr-H_hello world` resolves `options.ecc === 'H'` and `qr_hello world`
    resolves the default, `M`. It normalises CRLF: the row
    `{ payload: 'a\r\nb\rc', format: 'qr', ecc: '' }` gives `raw` and `value` `'a\nb\nc'`. It
    strips a newline from a UPC value but not from its raw:
    `upc_036000\n291452` gives `value` `'036000291452'`, `raw` `'036000\n291452'`, valid.
  - `rowEntries([qr_a, qr_, upc_036000291452])` gives two entries, `a` then `036000291452`.
  - `textFromRows`, lossless: `[qr-H_a, qr-H_b]` gives exactly
    `{ text: 'a\nb', format: 'qr', ecc: 'H', loses: { formats: 0, levels: 0, splits: 0 } }`: the
    chosen format and level come from the first row.
  - `textFromRows`, lossy, exact counts as `{ formats, levels, splits }`:
    `[upc_036000291452, qr_hello, datamatrix_world]` → `{ 2, 0, 0 }` with text
    `'036000291452\nhello\nworld'`; `[qr-H_a, qr_b, qr-L_c]` → `{ 0, 2, 0 }`;
    `[qr-H_a, aztec-50_b]` → `{ 1, 0, 0 }` (a row at another format counts once);
    `[upc_036000291452, upc_012345678905,036000291452]` → `{ 0, 0, 1 }` (a comma inside a row
    under a numeric chosen format); `[upc_036000291452, qr_a,b]` → `{ 1, 0, 1 }`; `[qr_a,b]` →
    `{ 0, 0, 0 }` (a comma under a text chosen format); `[qr_line 1\nline 2, qr_x]` →
    `{ 0, 0, 1 }` with text `'line 1\nline 2\nx'` (a multi-line payload);
    `[upc_036000291452, upc_,]` → `{ 0, 0, 1 }` (zero pieces).
  - Blank rows ignored: `[datamatrix_, qr-H_a, upc_ , qr-H_b]` gives `text: 'a\nb'`, `format`
    `qr`, `ecc` `H` and all counts 0.
  - No rows → fallback: with the fallback `{ format: 'qr', ecc: 'H' }`, `[]` and `[upc_ ]` each
    give `{ text: '', format: 'qr', ecc: 'H', loses: { formats: 0, levels: 0, splits: 0 } }`.
  - `describeLoss` returns exactly the five examples under _The loss note_, each the limit
    sentence, a space and the listed second sentence; and `''` for
    `{ formats: 0, levels: 0, splits: 0 }`.
- **`src/lib/shareUrl.test.ts`** (extended):
  - Encode: the two rows under _Records_ with `DEFAULT_SETTINGS` give exactly the rows fragment
    above: records first, the tail unchanged, no `codes`, no `ecc`. With
    `{ ...DEFAULT_SETTINGS, format: 'qr', ecc: 'H' }` the fragment has `fmt=qr` and no `ecc=`.
    Blank rows are skipped and the numbering is dense: `[qr_a, qr_, qr_b]` writes `r1=qr_a` and
    `r2=qr_b` and no `r3`. A payload `' a\r\nb '` writes `r1=qr_a%0Ab`. With no non-blank row,
    `encodeRowsShareUrl([qr_], DEFAULT_SETTINGS)` gives exactly
    `#codes=&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc`, the same string
    as `encodeShareUrl([], DEFAULT_SETTINGS)`.
  - Decode, numeric order with a gap: `#r1=upc_036000291452&r3=qr_hello` gives two rows,
    `upc_036000291452` then `qr_hello`; `#r10=qr_ten&r2=qr_two` gives `two` then `ten`.
  - A repeated key keeps its first value: `#r1=qr_first&r1=qr_second` gives one row, `first`.
  - A malformed value is dropped on its own: `#r1=qrhello&r2=qr_ok` (no `_`) gives one row,
    `ok`. An unknown format is dropped: `#r1=foo_bar` gives `records: []`.
  - Levels: `#r1=qr-auto_x` (a foreign level) and `#r1=qr-M_x` (the default) give `ecc: ''`;
    `#r1=datamatrix-H_x` gives `ecc: ''`; `#r1=qr-H_x` gives `ecc: 'H'`.
  - A blank payload is dropped: `#r1=qr_+++` and `#r1=qr_%0A` give `records: []`.
  - `codes` is ignored beside records: `#codes=036000291452&r1=qr_x` gives `codes: []` and one
    record.
  - `r0` and `rx` are ignored: `#r0=qr_a&rx=qr_b&r01=qr_c&r1=qr_d` gives one row, `d`;
    `#r0=qr_a` alone gives `records: undefined`.
  - Round trip: the payload `'a b\n#1 & 50% x_y+z'` at `qr` encodes and decodes back to itself.
  - `records` is `undefined` when no key matches: `#codes=036000291452&speed=60`.
  - A rows link is read from the fragment, by the extended source rule:
    `http://localhost/?codes=1#r1=qr_x` gives one record and `codes: []`. And from a legacy
    query string: `http://localhost/?r1=qr_x` and `http://localhost/?r1=qr_x#top` each give one
    record.
- **`src/lib/formats.test.ts`** (extended): `canonicalEcc` gives `''` for an unknown format
  (`'nope' as FormatId`, `'H'`), for a format with no levels (`datamatrix`, `'H'`), for a foreign
  level (`qr`, `'auto'`) and for the default level (`qr`, `'M'`), and `'H'` for an accepted
  non-default level (`qr`, `'H'`).
- **`src/lib/components/RowEditor.test.ts`** (new). It renders `RowEditor` with
  `newRowFormat: 'datamatrix'` and the rows `[upc_036000291452, qr-H_hello world, qr_]` unless a
  case says otherwise, and asserts on the DOM:
  - Row numbers: the `.row-number` texts are `1`, `2`, `3`.
  - Payload, format and level controls: the `.row-payload` values are `036000291452`,
    `hello world` and `''`, with aria-labels `Code 1` to `Code 3`; the `.row-format` values are
    `upc`, `qr`, `qr`, with aria-labels `Format of code 1` to `Format of code 3`, and each has 7
    optgroups and 25 options.
  - The level select only for formats with levels: row 1 has no `.row-ecc`; row 2's reads `H`
    and row 3's `M`, with aria-labels `Error correction of code 2` and
    `Error correction of code 3`.
  - Add code appends a row with `newRowFormat`: a click on `.row-add` gives four rows, the fourth
    with payload `''` and format `datamatrix`, and after a tick `document.activeElement` is its
    `.row-payload`.
  - Delete removes and moves focus: a click on row 2's `.row-delete` leaves the payloads
    `036000291452` and `''`, and focus on row 2's `.row-payload` (the former row 3); a click on
    the last row's `.row-delete` then focuses `.row-add`.
  - Move up and Move down: row 1's `.row-up` and row 3's `.row-down` are disabled. A click on row
    1's `.row-down` gives the payloads `hello world`, `036000291452`, `''` with the numbers still
    `1`, `2`, `3`, and after a tick `document.activeElement` is row 2's `.row-down`, the moved
    row's button. A click on row 2's `.row-up` then restores the first order. A click on row 2's
    `.row-down` then puts `hello world` last: the payloads read `036000291452`, `''`,
    `hello world`, and after a tick `document.activeElement` is row 3's `.row-up`, because that
    row's Move down is now disabled. The buttons' aria-labels are `Move up, code 1`,
    `Move down, code 1` and `Delete code 1` on row 1.
  - A format change canonicalises the level: a change of row 2's `.row-format` to `datamatrix`
    removes its `.row-ecc`, and a change back to `qr` shows `.row-ecc` reading `M`, not `H`.
  - Verdict text per row, with the rows `[upc_036000291452, qr_hello world, qr_, upc_bad]` plus
    a row `qr-H_` + `'x'.repeat(2000)`: the `.row-verdict` texts are ` ✓` with the class `valid`,
    ` ✓ · 21×21 modules · 11 bytes`, `''` with neither class (the blank row), ` ✗ invalid` with
    the class `invalid`, and ` ✗ too long for QR Code (level H)`: the row's own level decides.
  - Dense hint: `.dense-hint` is absent for the default rows and present, reading `DENSE_HINT`,
    when a row `qr-L_` + `'x'.repeat(2000)` is added to them (far over 100 modules across, so dense).
- **`src/routes/page.test.ts`** (setup, extended):
  - Opens in Plain text by default: `.editor-input` reads `text`, `.code-input` is present and
    there is no `.row-editor`. Opens in Per row for a records link: with
    `http://localhost/#r1=upc_036000291452&r2=qr-H_hello&seed=0`, `.editor-input` reads `rows`,
    there is no `.code-input` and no `.validation-list`, and the two rows hold `036000291452` at
    `upc` and `hello` at `qr` with `.row-ecc` reading `H`.
  - Converting: with the text `036000291452,012345678905` at `upc`, a change of `.editor-input`
    to `rows` makes one row per code, `036000291452` and `012345678905`, each at `upc`. With the
    text `hello\nworld`, `.format-input` `qr` and `.ecc-input` `H`, the change makes two `qr`
    rows whose `.row-ecc` both read `H`: the list level is copied. `.ecc-input` is then absent,
    and the Format field's label (its first text node, trimmed) reads `Format for new rows`.
  - A lossless switch back applies at once: from those two rows, a change of `.editor-input` to
    `text` shows `.code-input` reading `hello\nworld`, `.format-input` `qr`, `.ecc-input` `H`,
    `.editor-input` `text`, and no `.switch-note`.
  - A lossy switch shows the note: with
    `http://localhost/#r1=upc_036000291452&r2=qr-H_hello&r3=datamatrix_line+1%0Aline+2&seed=0`, a
    change of `.editor-input` to `text` shows `.switch-note` whose `p` reads exactly
    `describeLoss({ formats: 2, levels: 0, splits: 1 })`: the limit sentence, a space and
    `Switching now drops the format of 2 rows and splits 1 payload into several codes.`;
    `.editor-input` still reads `rows` and the three rows remain. Deleting rows 2 and 3 then
    hides the note by itself, and `.editor-input` still reads `rows`.
  - Switch anyway applies the first row's format and joins the tokens: on the same link, after
    the lossy change, a click on `.switch-anyway` shows `.code-input` reading
    `036000291452\nhello\nline 1\nline 2`, `.format-input` `upc`, `.editor-input` `text`, no
    `.switch-note`, and four `.validation-list li`.
  - Cancel closes the note and keeps the rows: after the lossy change, a click on
    `.switch-cancel` removes `.switch-note`, and `.editor-input` reads `rows` with three rows.
  - The share link carries records in Per row: on the first records link, `.share-url` contains
    `#r1=upc_036000291452&r2=qr-H_hello&speed=60` and no `codes=`, and Start navigates to exactly
    `/play#r1=upc_036000291452&r2=qr-H_hello&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc`.
    Choosing `M` on row 2's `.row-ecc` makes `.share-url` contain `r2=qr_hello&`: the default is
    stored as `''`.
  - A file upload in Per row replaces the rows: on the first records link, after a change of
    `.format-input` to `qr`, a file read mocked to `'a\nb'` leaves two rows, `a` and `b`, each at
    `qr` with `.row-ecc` reading `M`.
- **`src/routes/play/page.test.ts`** (extended):
  - A records link renders items with each entry's format class: with
    `http://localhost/play#r1=upc_036000291452&r2=qr_hello&seed=7`, there are four
    `.barcode-item` (two valid × two copies); the first has neither `barcode-item--2d` nor
    `barcode-item--qr`, and the second has both.
  - Back carries the records with the live settings: on the same link, after an input of 120 on
    `.ctl-speed`, a click on `.ctl-back` navigates to exactly
    `/#r1=upc_036000291452&r2=qr_hello&speed=120&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=7&fmt=upc`,
    whose fragment starts with `#r1=`.
- **Unchanged:** every existing suite passes unchanged, 335 tests today, among them
  `src/lib/codes.test.ts` (`parseCodeList` now calls `tokenize`) and
  `src/lib/components/ValidationList.test.ts` (it now imports `verdictText` and `DENSE_HINT`).
  `src/lib/verdict.ts` gets no test file of its own: `ValidationList.test.ts` pins every verdict
  string through the component, and `RowEditor.test.ts` pins it per row. No type-level edit is
  needed: `Settings` does not change, and the extra `records` key in the decoder's result is not
  read by any existing test.
- **Not tested here** (the verification rows cover them): the editor's CSS, `field-sizing`, the
  wrap at 390 px and scanner behaviour.

## Documentation

- **README, new `### Per-row editing` subsection** under _Using it_, after the numbered steps and
  before _Playback modes_. It covers the switch, what Plain text cannot hold (one format, one
  level, one code per line), the per-row level, multi-line payloads, the lossy-switch note and the
  share link's `r1=…` form. Text to paste:

```markdown
### Per-row editing

The **Editor** select above the code input chooses how you enter the list. **Plain text**, the
default, is the textarea: one format and one error-correction level for the whole list, and one
code per line. **Per row** gives each code its own row, with its own format and, for QR Code,
PDF417 and Aztec, its own error-correction level, so one list can mix symbologies (a UPC, then a
QR Code, then a Data Matrix) to test how a scanner tells them apart.

In a row, Enter starts a new line inside the payload, so a 2D code can carry several lines, as a
vCard does; numeric formats such as UPC drop line breaks along with other whitespace. A comma
never splits a row: one row is one code. Each row shows whether it is valid, with the same
details as the list in Plain text, and blank rows are skipped. **Add code** appends a row in the
format chosen under **Format for new rows**; **Move up**, **Move down** and **Delete** reorder
and remove rows. Uploading a file in Per row replaces the rows with one row per code.

Choosing Per row turns the current list into rows, each with the list's format and level.
Choosing Plain text again joins the rows back into the textarea, with the first row's format
and level for the whole list. When that would lose something, a note says how many rows would
lose their format or level and how many payloads would split into several codes, and offers
**Switch anyway** or **Cancel**. A switch that loses nothing happens at once.

A per-row link carries one parameter per code, numbered from 1 in list order and tagged with
the code's format and, when it is not the default, its level: `#r1=upc_012345678905&r2=qr-H_…`.
Such a link opens in Per row; every other link opens in Plain text.
```

- **README, features list.** Each block below is the exact current text, then its replacement.
  The _25 barcode formats_ bullet:

```markdown
- **25 barcode formats** — the 21 linear formats JsBarcode documents (CODE128 incl. force
  modes, EAN/UPC family, CODE39, CODE93, ITF, MSI variants, Pharmacode, Codabar) plus four 2D
  formats: QR Code, Data Matrix, PDF417 and Aztec. Selected per list; unrenderable codes are
  flagged and skipped, and the list shows the exact value your scanner will read when the
  encoder adds check digits or normalizes input. 2D rows show the symbol size, the byte count
  and whether the symbol is dense.
```

```markdown
- **25 barcode formats** — the 21 linear formats JsBarcode documents (CODE128 incl. force
  modes, EAN/UPC family, CODE39, CODE93, ITF, MSI variants, Pharmacode, Codabar) plus four 2D
  formats: QR Code, Data Matrix, PDF417 and Aztec. Selected per list, or per code in the
  per-row editor; unrenderable codes are flagged and skipped, and the list shows the exact
  value your scanner will read when the encoder adds check digits or normalizes input. 2D rows
  show the symbol size, the byte count and whether the symbol is dense.
```

The _Error correction_ bullet, which the new _Mixed-format decks_ bullet follows:

```markdown
- **Error correction** — for QR Code, PDF417 and Aztec, an **Error correction** select sets
  the level for the whole list, and codes too long for that level are flagged.
```

```markdown
- **Error correction** — for QR Code, PDF417 and Aztec, an **Error correction** select sets
  the level for the whole list, or for each code in the per-row editor, and codes too long for
  their level are flagged.
- **Mixed-format decks and multi-line payloads** — the opt-in per-row editor gives each code
  its own row, format and error-correction level, so one list can run a UPC, then a QR Code,
  then a Data Matrix to test a scanner's auto-discrimination, and a 2D payload can span
  several lines, as a vCard does.
```

The _Shareable links_ bullet gains one sentence at its end:

```markdown
- **Shareable links** — copy a URL that reproduces the exact list and settings. The link can
  also be shown as a QR code; a level select (L, M, Q, H) sets the share QR's error
  correction, and a status line says when the link makes a dense QR or is too long for one,
  and why. Links keep the list in the URL fragment (`#codes=…`), so long lists are never
  refused by the server, and older `?codes=` links keep working. Step links add `mode=step`,
  plus `dwell` and `gap` in milliseconds when they differ from 1000 and 0.
```

```markdown
- **Shareable links** — copy a URL that reproduces the exact list and settings. The link can
  also be shown as a QR code; a level select (L, M, Q, H) sets the share QR's error
  correction, and a status line says when the link makes a dense QR or is too long for one,
  and why. Links keep the list in the URL fragment (`#codes=…`), so long lists are never
  refused by the server, and older `?codes=` links keep working. Step links add `mode=step`,
  plus `dwell` and `gap` in milliseconds when they differ from 1000 and 0. Per-row links
  carry one numbered parameter per code (`#r1=…&r2=…`) instead of `codes`.
```

- **README, _Using it_ step 2.** The exact current text, then its replacement:

```markdown
2. Pick a barcode format, then paste or upload your codes (one per line, or
   comma-separated for numeric formats such as UPC and EAN; 2D and other text formats are one
   per line, and commas are part of the code). For QR Code, PDF417 and Aztec, choose an
   error-correction level or keep the default. Invalid entries are flagged.
```

```markdown
2. Pick a barcode format, then paste or upload your codes (one per line, or
   comma-separated for numeric formats such as UPC and EAN; 2D and other text formats are one
   per line, and commas are part of the code). For QR Code, PDF417 and Aztec, choose an
   error-correction level or keep the default. Invalid entries are flagged. To give each code
   its own format or level, or a payload of several lines, choose **Per row** in the
   **Editor** select (see _Per-row editing_).
```

- **Comments.** `decodeShareUrl`'s doc comment becomes the one under _Share URL_; the splitting
  sentences of `parseCodeList`'s doc comment move to `tokenize`, and `parseCodeList`'s comment
  says it builds one entry per `tokenize` token. The comment above `verdict`, "Single expression
  per row so exact-textContent tests stay byte-stable.", moves with it to `verdictText`. The
  inline comment in `selectFormat` stays, now above the `canonicalEcc` call.
- This spec, and its plan at `docs/superpowers/plans/2026-11-03-structured-editor.md`.

## Verification that fails closed

Every row starts **UNVERIFIED** and passes only when its pass rule is met and recorded. A skipped
row, a check that dies, a run that returns nothing, or a scan recorded without the device model,
firmware and read mode stays UNVERIFIED, never a pass; the plan reports the unverified rows as
they stand. "Read" for a scan means the scanner outputs exactly the payload, once.

1. **Automated checks.** With Node 24 active (`.nvmrc`), in the project checkout: `npm run check`,
   `npm test`, `npm run lint` and `npm run build`. Pass: all four exit 0, with the Vitest test
   count recorded (335 before this spec).
2. **Mixed deck with a 2D imager.** A Per row deck of at least 9 distinct codes, UPC, QR Code and
   Data Matrix in turn, loop off, rotation and skew off, read by a 2D imager with all three
   symbologies enabled: once in Scroll at the default 60 px/s, and once in Step at dwell
   `1.00 s` and gap `0.00 s`. Pass: in both runs every code is read once, in row order, with no
   miss and no double; the scanner model, firmware and read mode are recorded.
3. **Multi-line QR Code payload.** A QR Code row whose payload is two lines, `line one` and
   `line two`, read off the screen by a phone scanner app. Pass: the payload arrives with the
   newline as an Enter or line break in the target field, the two lines on separate lines; the
   app, its version and the phone model are recorded.
4. **Browsers.** In Firefox and in Chromium: the payload field grows with its content where
   `field-sizing` is supported, and which of the two browsers supports it is recorded; at a
   390 px wide viewport the payload field spans the row's width, the controls line wraps without
   horizontal scroll, and every control is operable; at a 1024 px wide viewport the page keeps
   its 640 px column and a UPC row's controls line fits on one line. Pass: all three checks in
   both browsers.
5. **Keyboard.** In Firefox and in Chromium, with three rows: Tab moves through a row's controls
   in order (payload, format, level when shown, Move up, Move down, Delete); Move down on row 1
   moves the row to place 2 and focus stays on the moved Move down button, and Move down again
   puts it last with focus on that row's Move up; Delete on row 2 moves focus to the next row's
   payload, and Delete on the last row moves it to Add code. Pass: all four in both browsers.
6. **Hand-edited numbering.** The link
   `https://nzneit.github.io/scandible/#r1=upc_036000291452&r3=qr_hello`, with no `r2`. Pass: it
   opens in Per row with two rows numbered 1 and 2, Start plays both codes, and the play page's
   URL carries `r1` and `r2`.
7. **Lossy switch.** The three-row mixed deck
   `https://nzneit.github.io/scandible/#r1=upc_036000291452&r2=qr-H_hello&r3=datamatrix_line+1%0Aline+2`.
   Pass: choosing Plain text shows the note with the second sentence
   `Switching now drops the format of 2 rows and splits 1 payload into several codes.`, the
   Editor select still reads Per row, and Switch anyway yields the textarea with the four lines
   `036000291452`, `hello`, `line 1`, `line 2` at the first row's format, UPC-A.

## Out of scope

Drag-and-drop reordering. Per-row playback options, such as a dwell per code. Per-row symbology
options other than error correction: Data Matrix shape, PDF417 columns, GS1/FNC1 and ECI. A bulk
paste into a row splitting into several rows. CSV columns. URL compression. Replacing JsBarcode.
Multi-line payloads in Plain text mode. A `Settings.editor` field.

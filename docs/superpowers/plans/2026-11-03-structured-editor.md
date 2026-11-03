# Structured Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in **Per row** editor in which each code is a row with its own format, its
own error-correction level and a payload that may span lines, a switch to and from the textarea
that converts both ways and asks only when it would lose something, and share links that carry
one numbered record per row.

**Architecture:** A `Row` model and its conversions (`src/lib/rows.ts`) sit beside the textarea:
the setup page derives entries from whichever editor is active, `rowEntries(rows)` in Per row and
`parseCodeList` in Plain text, and a row's level rides `buildEntry`'s override layer. The share
codec writes one numbered record per row (`r1`, `r2`, …) through `encodeRowsShareUrl` and reads
them back as `decodeShareUrl`'s new `records`, and `RowEditor.svelte` edits the rows. Both
engines take entries as given, so there is no engine work.

**Tech Stack:** SvelteKit 2.70 + Svelte 5.56 (runes), TypeScript 5.9 strict with `noUnusedLocals`
and `noUnusedParameters`, Vitest 3.2 + @testing-library/svelte 5.4 on jsdom 24. No new
dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-structured-editor-design.md`. When a step names a
spec section, read that section before writing the code. A step that says "as written" means
the spec's code block or copy is the rule: copy its logic, names and strings, then let Prettier
format it. Where this plan and the spec disagree, the spec wins; report the disagreement.

## Global Constraints

- Plain text behaves exactly as today. `encodeShareUrl`'s output is byte-identical,
  `parseCodeList`'s output is unchanged, and no existing assertion in any suite changes (25 test
  files, 335 tests at `f8f0b96`). A link with no `r<n>` key whose first value is non-empty
  decodes exactly as today, plus `records: undefined`.
- `Settings` gains no field. The editor mode belongs to the link: a link that decodes with
  `records` opens in Per row, any other link, or none, in Plain text.
- No `$effect` for the switch, the note or the editor: function bindings and event handlers only.
- URLs read `Row` objects, never entries. In Per row, Start, Share and Back encode each row's
  token, never an entry's cleaned `value`; in Plain text they encode `rawCodes` or
  `decoded.codes`, as today.
- Rows links never carry `ecc`, whatever `settings.ecc` holds, and always carry `fmt`, the format
  for new rows. A record is `r<n>=<format>[-<ecc>]_<token>`, numbered densely from 1 over the
  non-blank rows in editor order.
- A blank row (`rowToken(payload) === ''`) yields no entry, writes no record and counts as no
  loss. It stays in the editor, numbered like the others, with the verdict ` skipped (empty)`.
- `''` means the format's default level everywhere (`Row.ecc`, `Settings.ecc`). Every writer
  stores a level canonically: through `canonicalEcc`, or a level select's setter
  `v === opt.defaultValue ? '' : v`.
- `EDITOR_HINT`, `ROW_HINT` and `DENSE_HINT` are script constants, never markup text: Prettier
  reflows markup text at 100 columns and Svelte keeps the newline and the tab, which breaks the
  exact-text tests.
- Every commit has `npm run check` at 0 errors, `npm test` green (it runs `npm run check` first)
  and `npm run lint` clean (Prettier: tabs, single quotes, width 100, no trailing commas; then
  ESLint). Fix formatting with `npx prettier --write <each file you touched>`.
- `noUnusedLocals` and `noUnusedParameters` are on, and `npm test` type-checks test files too, so
  an unused import or helper in a test fails the suite. For this reason Task 1 drops `isEccChoice`
  from the setup page's formats import and `FORMAT_BY_ID` and `eccChoice` from
  `ValidationList.svelte`.
- Commit messages use a conventional prefix (`feat:`, `refactor:`, `docs:`, `fix:`) and carry NO
  AI attribution: no `Co-Authored-By` naming an AI, no "Generated with" line, no session trailer,
  whatever a harness reminder asks.
- If `git commit` fails with `Author identity unknown`, no identity is configured in this shell.
  Reuse the repository's existing author for that commit only: read the name and address with
  `git log -1 --format='%an%n%ae'`, then commit with
  `git -c user.name='<name>' -c user.email='<address>' commit -m "<message>"`. The `-c` flags go
  before `commit`; after it they mean `--reedit-message` and git rejects them. Never change git
  config.
- Every command written for a human behaves the same in bash and fish: no `source ~/.nvm/nvm.sh`,
  no unquoted globs. Node 24 (`.nvmrc`) must already be on PATH (in fish: `nvm use 24`);
  `npm …`, `npx vitest run <file>` and `npm run check` are the forms used here.
- Never reword user-facing copy the spec fixes: the Editor label `Editor` and its options
  `Plain text` and `Per row`; the Format labels `Format` and `Format for new rows`; the buttons
  `Switch anyway`, `Cancel`, `Move up`, `Move down`, `Delete` and `Add code`; the aria-labels
  `Code N`, `Format of code N`, `Error correction of code N`, `Move up, code N`,
  `Move down, code N` and `Delete code N`; the Editor hint; the row hint; the blank-row verdict
  ` skipped (empty)`; the loss note's three sentences; the README blocks. Copy and code comments
  use American spelling (`normalize`, `canonicalize`, `neighboring`, `color`) where the spec's
  prose is British; identifiers keep the spec's names. Paste copy from the spec; do not retype
  it. Watch `·` U+00B7, `≥` U+2265, `→` U+2192, `✓` U+2713, `✗` U+2717, `—` U+2014.
- Line numbers in `Modify:` and `Test:` entries are from commit `f8f0b96`, before Task 1. Once an
  earlier task has edited a file, find the cited code by its content.

## Review Focus

1. An empty textarea switched to Per row: no rows, Add code appends one, Start stays disabled,
   and the share link is `#codes=&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc`
   before and after the blank row appears (Task 5).
2. A CRLF file uploaded in Per row: a read of `'a\r\nb\r\n'` appends two rows, `a` and `b`, and
   no payload keeps a `\r` (Task 5).
3. A records link without `fmt` (`#r1=qr_x&r2=datamatrix_y&seed=0`): the rows keep their
   formats, Format for new rows reads `upc`, and Start's link ends `&fmt=upc` (Task 5).
4. Add code under a format with levels: the new row shows that format's default level (`M` for
   `qr`), writes no record while blank, and once `x` is typed the link carries `&r3=qr_x` before
   `&speed` (Task 4 for the row, Task 5 for the link).
5. Deleting every row: focus lands on Add code, no row remains, Start is disabled and the share
   link is the empty `#codes=&…` form (Task 5; Task 4 already pins the focus).

---

### Task 1: Extractions: `tokenize`, `canonicalEcc` and the verdict text

**Files:**

- Create: `src/lib/verdict.ts`
- Modify: `src/lib/codes.ts:57-70` (`tokenize` with its doc comment, then `parseCodeList`)
- Modify: `src/lib/formats.ts` after `:333` (`canonicalEcc`)
- Modify: `src/lib/components/ValidationList.svelte:3` (import), `:7-28` (moved out), `:34`
- Modify: `src/routes/+page.svelte:7` (formats import), `:95-105` (`selectFormat`)
- Test: `src/lib/codes.test.ts:2` (import), append after `:115`; `src/lib/formats.test.ts:4-13`
  (import), append after `:264`
- Regression guard, unchanged: `src/lib/components/ValidationList.test.ts`,
  `src/routes/page.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces (the spec's blocks):

```ts
export function tokenize(text: string, format: FormatId): string[]; // src/lib/codes.ts
export function canonicalEcc(format: FormatId, ecc: string): string; // src/lib/formats.ts
export function verdictText(entry: CodeEntry): string; // src/lib/verdict.ts
export const DENSE_HINT: string; // src/lib/verdict.ts, moved verbatim from ValidationList.svelte
```

- [ ] **Step 1: Write the failing tests**

In `src/lib/codes.test.ts`, `:2` becomes
`import { buildEntry, parseCodeList, resolveOptions, tokenize } from './codes';`. Append the
tokenizer-parity case. The spec lists it under `rows.test.ts`; it lands here because `tokenize`
lands here.

```ts
describe('tokenize', () => {
	it('splits exactly as parseCodeList does, for a numeric and a text format', () => {
		const upc = ' 036000291452, 012345678905\n\n4006381333931 ';
		const qr = 'a, b\n\n c ';
		expect(tokenize(upc, 'upc')).toEqual(['036000291452', '012345678905', '4006381333931']);
		expect(tokenize(qr, 'qr')).toEqual(['a, b', 'c']);
		expect(tokenize(upc, 'upc')).toEqual(parseCodeList(upc, 'upc').map((e) => e.raw));
		expect(tokenize(qr, 'qr')).toEqual(parseCodeList(qr, 'qr').map((e) => e.raw));
	});
});
```

In `src/lib/formats.test.ts`, the import list (`:4-13`) gains `canonicalEcc` before `eccChoice`.
Append:

```ts
describe('canonicalEcc', () => {
	it('keeps only a level the format accepts that is not its default', () => {
		expect(canonicalEcc('nope' as FormatId, 'H')).toBe('');
		expect(canonicalEcc('datamatrix', 'H')).toBe('');
		expect(canonicalEcc('qr', 'auto')).toBe('');
		expect(canonicalEcc('qr', 'M')).toBe('');
		expect(canonicalEcc('qr', 'H')).toBe('H');
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/codes.test.ts src/lib/formats.test.ts`
Expected: FAIL, the two new tests each with a `TypeError` saying `tokenize` or `canonicalEcc` is
not a function. The existing tests pass.

- [ ] **Step 3: Extract `tokenize` in `src/lib/codes.ts`**

Add `tokenize` above `parseCodeList`, with the spec's doc comment (_`tokenize`_) and then the
moved sentence "Text formats split on newlines only: internal spaces and commas are data." Its
body is today's splitting chain (`:63-68`), unchanged. `parseCodeList(raw, format, ecc = '')`
becomes `tokenize(raw, format).map((token) => buildEntry(token, format, { format, ecc }))`, and
its doc comment (`:57-61`) becomes "One entry per `tokenize` token, cleaned and validated for one
format (numeric formats strip internal whitespace). Empty tokens are dropped before cleanup, so
no CodeEntry ever has an empty value."

- [ ] **Step 4: Add `canonicalEcc` to `src/lib/formats.ts`**

After `eccChoice` (`:331-333`), with the spec's doc comment (_`canonicalEcc`_). It returns `''` when
`FORMAT_BY_ID.get(format)` is undefined, when the descriptor has no `ecc`, when
`!isEccChoice(d, ecc)`, or when `ecc === d.ecc.defaultValue`; otherwise `ecc`.

- [ ] **Step 5: Move the verdict into `src/lib/verdict.ts`**

Move `DENSE_HINT` (`ValidationList.svelte:7-8`), `labelOf` and `levelOf` (`:10-14`) and `verdict`
(`:16-28`) verbatim. `verdict` becomes the exported `verdictText` (same single expression), and
the spec's doc comment (_`src/lib/verdict.ts`_) replaces the comment at `:16`; `labelOf` and
`levelOf` stay module-private; `DENSE_HINT` is exported. Imports: `FORMAT_BY_ID` and `eccChoice`
from `./formats`, `type CodeEntry` from `./types`.

In `ValidationList.svelte`, `:3` becomes `import { DENSE_HINT, verdictText } from '$lib/verdict';`
(the `CodeEntry` import at `:2` stays for the props), `:7-28` go, and `:34` renders
`{verdictText(entry)}`. Markup and styles are otherwise unchanged.

- [ ] **Step 6: Call `canonicalEcc` from the setup page**

In `src/routes/+page.svelte`, `:7` becomes
`import { FORMAT_BY_ID, FORMAT_GROUPS, canonicalEcc, type FormatId } from '$lib/formats';` and
`selectFormat`'s body (`:96-104`) becomes `ecc = canonicalEcc(next, ecc); format = next;`. The
comment at `:93-94` stays as it is, above the function.

- [ ] **Step 7: Run the tests to verify they pass**

Run:
`npx vitest run src/lib/codes.test.ts src/lib/formats.test.ts src/lib/components/ValidationList.test.ts src/routes/page.test.ts`
Expected: PASS.

- [ ] **Step 8: Confirm the move left one copy and touched no guard**

Run: `git diff --stat -- src/lib/components/ValidationList.test.ts src/routes/page.test.ts`
Expected: no output.
Run: `git grep -n -F 'Dense: more than' -- src`
Expected: exactly two hits, `src/lib/verdict.ts` and `src/lib/components/ValidationList.test.ts`
(the test keeps its own copy, so it pins the moved constant).

- [ ] **Step 9: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: svelte-check reports `0 errors`, every test passes, lint prints no problems.

- [ ] **Step 10: Commit**

```bash
git add src/lib/codes.ts src/lib/codes.test.ts src/lib/formats.ts src/lib/formats.test.ts src/lib/verdict.ts src/lib/components/ValidationList.svelte src/routes/+page.svelte
git commit -m "refactor: extract tokenize, canonicalEcc and the verdict text"
```

---

### Task 2: Row model and conversions

**Files:**

- Create: `src/lib/rows.ts`, `src/lib/rows.test.ts`

**Interfaces:**

- Consumes: `tokenize` (Task 1); `buildEntry` (`src/lib/codes.ts`); `FORMAT_BY_ID`, `eccChoice`,
  `FormatId` (`src/lib/formats.ts`); `CodeEntry` (`src/lib/types.ts`).
- Produces, from `src/lib/rows.ts` (the spec's block, with its field comments and doc comments):
  `Row` is `{ payload: string; format: FormatId; ecc: string }`, and `TextConversion` is
  `{ text: string; format: FormatId; ecc: string; loses: { formats: number; levels: number; splits: number } }`.

```ts
export function rowToken(payload: string): string;
export function rowEntry(row: Row): CodeEntry | null;
export function rowEntries(rows: Row[]): CodeEntry[];
export function rowNumbers(rows: Row[]): number[];
export function rowsFromText(text: string, format: FormatId, ecc: string): Row[];
```

- And `textFromRows(rows: Row[], fallback: { format: FormatId; ecc: string }): TextConversion`
  and `describeLoss(loses: TextConversion['loses'], result: { format: FormatId; ecc: string }): string`.

- [ ] **Step 1: Write the failing tests**

`src/lib/rows.test.ts`. Rows are written in the spec's record form, `format[-level]_payload`, so
`deck('qr-H_hello', 'qr_')` is a QR Code row at level H and a blank QR Code row. Tasks 3 and 4
copy `deck` (and only `deck`: an unused copied helper fails `noUnusedLocals`).

```ts
import { describe, it, expect } from 'vitest';
import {
	describeLoss,
	rowEntries,
	rowEntry,
	rowNumbers,
	rowsFromText,
	textFromRows,
	type Row
} from './rows';
import { parseCodeList } from './codes';
import type { FormatId } from './formats';

/** Rows in the spec's record form, `format[-level]_payload`; the payload is everything after
 *  the first `_`. */
const deck = (...records: string[]): Row[] =>
	records.map((record) => {
		const tag = record.slice(0, record.indexOf('_'));
		const [format, ecc = ''] = tag.split('-');
		return { payload: record.slice(tag.length + 1), format: format as FormatId, ecc };
	});
const row = (record: string) => deck(record)[0];
const n = (formats: number, levels: number, splits: number) => ({ formats, levels, splits });
const NONE = n(0, 0, 0);
const lossless = (text: string, format: FormatId, ecc = '') => ({ text, format, ecc, loses: NONE });
const FALLBACK = { format: 'upc', ecc: '' } as const;
const loses = (...records: string[]) => textFromRows(deck(...records), FALLBACK).loses;
const text = (...records: string[]) => textFromRows(deck(...records), FALLBACK).text;
const LIMIT =
	'Plain text keeps one format and one error-correction level for the whole list, and one code per line.';

describe('rowsFromText', () => {
	it('makes one row per token at the list format and level, after CR normalization', () => {
		expect(rowsFromText('036000291452,012345678905', 'upc', '')).toEqual(
			deck('upc_036000291452', 'upc_012345678905')
		);
		expect(rowsFromText('hello\nworld', 'qr', 'H')).toEqual(deck('qr-H_hello', 'qr-H_world'));
		expect(rowsFromText('a\rb', 'qr', '')).toEqual(deck('qr_a', 'qr_b'));
	});
});

describe('rowEntry, rowEntries and rowNumbers', () => {
	it("gives no entry for a blank row, and resolves a row's level through the override", () => {
		expect(rowEntry(row('qr_'))).toBeNull();
		expect(rowEntry(row('qr_ \n\t '))).toBeNull();
		expect(rowEntry(row('qr-H_hello world'))?.options.ecc).toBe('H');
		expect(rowEntry(row('qr_hello world'))?.options.ecc).toBe('M');
	});

	it('normalizes CR, strips a newline from a numeric value only, and never splits a row', () => {
		expect(rowEntry(row('qr_a\r\nb\rc'))).toMatchObject({ raw: 'a\nb\nc', value: 'a\nb\nc' });
		expect(rowEntry(row('upc_036000\n291452'))).toMatchObject({
			raw: '036000\n291452',
			value: '036000291452',
			valid: true
		});
		expect(rowEntry(row('upc_012345678905,036000291452'))?.valid).toBe(false);
		// The recorded Pharmacode leniency: its encoder reads only the leading digits.
		expect(rowEntry(row('pharmacode_12,34'))).toMatchObject({ valid: true, encoded: '12,34' });
		expect(rowEntry(row('code128_a\nb'))).toMatchObject({ valid: true, value: 'a\nb' });
	});

	it('drops blank rows from the entries and numbers the others by editor place', () => {
		const entries = rowEntries(deck('qr_a', 'qr_', 'upc_036000291452'));
		expect(entries.map((e) => e.value)).toEqual(['a', '036000291452']);
		expect(rowNumbers(deck('qr_ ', 'qr_a', 'qr_', 'qr_b'))).toEqual([2, 4]);
		expect(rowNumbers([])).toEqual([]);
	});
});

describe('textFromRows', () => {
	it('is lossless at one format and level, taking both from the first row', () => {
		expect(textFromRows(deck('qr-H_a', 'qr-H_b'), FALLBACK)).toEqual(lossless('a\nb', 'qr', 'H'));
	});

	it('counts rows, never pieces, and joins whole tokens', () => {
		expect(loses('upc_036000291452', 'qr_hello', 'datamatrix_world')).toEqual(n(2, 0, 0));
		expect(loses('qr-H_a', 'qr_b', 'qr-L_c')).toEqual(n(0, 2, 0));
		expect(loses('qr-H_a', 'aztec-50_b')).toEqual(n(1, 0, 0)); // another format counts once
		expect(loses('upc_036000291452', 'upc_012345678905,036000291452')).toEqual(n(0, 0, 1));
		expect(loses('upc_036000291452', 'qr_a,b')).toEqual(n(1, 0, 1));
		expect(loses('qr_a,b')).toEqual(n(0, 0, 0)); // a comma under a text format is data
		expect(loses('qr_line 1\nline 2', 'qr_x')).toEqual(n(0, 0, 1));
		expect(loses('upc_036000291452', 'upc_,')).toEqual(n(0, 0, 1)); // zero pieces
		expect(loses('upc_036000291452', 'upc_036000291452,')).toEqual(n(0, 0, 1)); // one, changed
		// Whole tokens are joined, and the edge-comma row, ✗ as a row, would become a ✓ code.
		expect(text('upc_036000291452', 'qr_hello', 'datamatrix_world')).toBe(
			'036000291452\nhello\nworld'
		);
		expect(text('qr_line 1\nline 2', 'qr_x')).toBe('line 1\nline 2\nx');
		expect(rowEntry(row('upc_036000291452,'))?.valid).toBe(false);
		const after = parseCodeList(text('upc_036000291452', 'upc_036000291452,'), 'upc');
		expect(after.map((e) => e.valid)).toEqual([true, true]);
	});

	it('ignores blank rows, and falls back when no row is non-blank', () => {
		const blanks = deck('datamatrix_', 'qr-H_a', 'upc_ ', 'qr-H_b');
		expect(textFromRows(blanks, FALLBACK)).toEqual(lossless('a\nb', 'qr', 'H'));
		const qrH = { format: 'qr', ecc: 'H' } as const;
		expect(textFromRows([], qrH)).toEqual(lossless('', 'qr', 'H'));
		expect(textFromRows(deck('upc_ '), qrH)).toEqual(lossless('', 'qr', 'H'));
	});
});

describe('describeLoss', () => {
	const words = (counts: ReturnType<typeof n>, format: FormatId, ecc = '') =>
		describeLoss(counts, { format, ecc });

	it('words the five examples of the loss note', () => {
		expect(words(n(3, 1, 2), 'qr', 'H')).toBe(
			`${LIMIT} Switching now drops the format of 3 rows, the level of 1 row, and cuts 2 payloads at line breaks. Every code will take the format of the first code, QR Code, and level H.`
		);
		expect(words(n(0, 0, 1), 'upc')).toBe(
			`${LIMIT} Switching now cuts 1 payload at line breaks or commas. Every code will take the format of the first code, UPC-A.`
		);
		expect(words(n(2, 0, 0), 'datamatrix')).toBe(
			`${LIMIT} Switching now drops the format of 2 rows. Every code will take the format of the first code, Data Matrix.`
		);
		expect(words(n(0, 1, 1), 'qr')).toBe(
			`${LIMIT} Switching now drops the level of 1 row and cuts 1 payload at line breaks. Every code will take the format of the first code, QR Code, and the format's default level.`
		);
		expect(words(n(1, 2, 0), 'aztec', '50')).toBe(
			`${LIMIT} Switching now drops the format of 1 row and the level of 2 rows. Every code will take the format of the first code, Aztec, and ≥50% error correction.`
		);
	});

	it('is empty when nothing would be lost, whatever the result', () => {
		expect(words(n(0, 0, 0), 'qr', 'H')).toBe('');
		expect(words(n(0, 0, 0), 'upc')).toBe('');
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/rows.test.ts`
Expected: FAIL with `Failed to resolve import "./rows"`.

- [ ] **Step 3: Implement `src/lib/rows.ts`**

The spec's _`src/lib/rows.ts`_ block as written: its imports, `Row`, `TextConversion` and the
seven declarations with their doc comments. `describeLoss` needs labels, so the `./formats`
import becomes `import { FORMAT_BY_ID, eccChoice, type FormatId } from './formats';`.

- `rowToken(payload)` is `payload.replace(/\r\n?/g, '\n').trim()`.
- `rowEntry(row)` is `null` when the token is `''`, else
  `buildEntry(token, row.format, { format: row.format, ecc: '' }, { ecc: row.ecc })`.
- `rowEntries` maps `rowEntry` in order and drops the nulls; `rowNumbers` gives `i + 1` for each
  row `i` whose token is not `''`.
- `rowsFromText(text, format, ecc)` maps each token of
  `tokenize(text.replace(/\r\n?/g, '\n'), format)` to `{ payload: token, format, ecc }`.
- `textFromRows(rows, fallback)` counts as the spec's paragraph states:

```text
live    = the rows whose token is not '', each with its token, in order
chosen  = live[0]'s format and ecc; fallback.format and fallback.ecc when live is empty
text    = the live tokens joined by '\n' ('' when live is empty)
formats = live rows whose format is not chosen.format
levels  = live rows whose format is chosen.format and whose ecc is not chosen.ecc
splits  = live rows for which tokenize(token, chosen.format) is not exactly [token]
          (one piece, equal to the token); a row may count here and under formats
```

- `describeLoss(loses, result)` is `''` when all three counts are 0. Otherwise it is three
  sentences joined by one space, as _The loss note_ states:
  1. The limit sentence, pasted from the note's example.
  2. `Switching now `, the non-zero clauses in the order formats, levels, splits, then `.`:
     `drops the format of N rows`; `drops the level of N rows`, without `drops ` after the
     formats clause; `cuts N payloads at line breaks`, plus ` or commas` when `result.format` is
     numeric (`1 row`, `1 payload`). Two clauses are joined by the word "and" with a space on
     each side; three by `, ` after the first and `, and ` after the second.
  3. `Every code will take the format of the first code, <label>`, then `.` when the format
     has no `ecc`, `, and <eccChoice(d, result.ecc).label>.` when `result.ecc` is not `''`, and
     `, and the format's default level.` otherwise.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/rows.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rows.ts src/lib/rows.test.ts
git commit -m "feat: add the row model and its conversions"
```

---

### Task 3: Share URL codec: records

**Files:**

- Modify: `src/lib/shareUrl.ts:1-2` (imports), `:29-55` (`encodeShareUrl` body into
  `appendSettings`; its doc comment at `:25-28` stays), after `:55` (`encodeRowsShareUrl`),
  `:57-69` (decode doc comment, return type, source rule, `codes`), `:132` (return)
- Test: `src/lib/shareUrl.test.ts:2-3` (imports), append after `:214`

**Interfaces:**

- Consumes: `rowToken`, `Row` (Task 2); `canonicalEcc` (Task 1); `isFormatId`, `isEccChoice`.
- Produces, from `src/lib/shareUrl.ts` (the spec's block; `encodeShareUrl` keeps its signature
  and output):

```ts
export function encodeRowsShareUrl(rows: Row[], settings: Settings): string;
export function decodeShareUrl(url: URL): {
	codes: string[];
	settings: Partial<Settings>;
	records: Row[] | undefined;
};
```

- [ ] **Step 1: Write the failing tests**

In `src/lib/shareUrl.test.ts`, `:2` becomes
`import { decodeShareUrl, encodeRowsShareUrl, encodeShareUrl } from './shareUrl';`, and after
`:3` add `import type { FormatId } from './formats';` and `import type { Row } from './rows';`.
Append (the existing suites stay as they are; their `toEqual` ignores `records: undefined`):

```ts
describe('rows links', () => {
	// deck(...records): exactly as in src/lib/rows.test.ts
	const TAIL = '&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc';
	const enc = (rows: Row[], over: Partial<Settings> = {}) =>
		encodeRowsShareUrl(rows, { ...DEFAULT_SETTINGS, ...over });
	const recs = (hash: string) => decodeShareUrl(at(hash)).records;
	const from = (url: string) => decodeShareUrl(new URL(url));

	it('writes one record per non-blank row, numbered densely, then the tail without ecc', () => {
		const pair = deck('upc_012345678905', 'qr-H_WIFI:S:home;\nP:secret');
		expect(enc(pair)).toBe(
			'#r1=upc_012345678905&r2=qr-H_WIFI%3AS%3Ahome%3B%0AP%3Asecret&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
		expect(enc(pair, { format: 'qr', ecc: 'H' })).toMatch(/&fmt=qr$/);
		expect(enc(pair, { format: 'qr', ecc: 'H' })).not.toContain('ecc=');
		expect(enc(deck('qr_a', 'qr_', 'qr_b'))).toBe(`#r1=qr_a&r2=qr_b${TAIL}`);
		expect(enc(deck('qr_ a\r\nb '))).toBe(`#r1=qr_a%0Ab${TAIL}`);
		// No non-blank row: an empty codes=, as an empty list writes it.
		expect(enc(deck('qr_'))).toBe(`#codes=${TAIL}`);
		expect(encodeShareUrl([], DEFAULT_SETTINGS)).toBe(`#codes=${TAIL}`);
		expect(enc(deck('qr_a'), { mode: 'step', dwellMs: 500, gapMs: 250 })).toBe(
			'#r1=qr_a&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step&dwell=500&gap=250'
		);
	});

	it.each<[string, Row[] | undefined]>([
		['#r1=upc_036000291452&r3=qr_hello', deck('upc_036000291452', 'qr_hello')], // gap compacted
		['#r10=qr_ten&r2=qr_two', deck('qr_two', 'qr_ten')], // numeric key order
		['#r3=qr_c&r12=qr_l&r2=qr_b', deck('qr_b', 'qr_c', 'qr_l')], // digit count first
		['#r1=qr_first&r1=qr_second', deck('qr_first')], // a repeated key keeps its first value
		['#r1=qrhello&r2=qr_ok', deck('qr_ok')], // no `_`: dropped on its own
		['#r1=foo_bar', []], // unknown format
		['#r1=qr_+++', []], // blank payload
		['#r1=qr_%0A', []],
		['#r1=qr-auto_x', deck('qr_x')], // a foreign level
		['#r1=qr-M_x', deck('qr_x')], // the default level
		['#r1=qr-_x', deck('qr_x')], // an empty level
		['#r1=datamatrix-H_x', deck('datamatrix_x')], // a format with no levels
		['#r1=qr-H_x', deck('qr-H_x')],
		['#r1=qr_a%0D%0Ab', deck('qr_a\nb')], // a hand-edited CRLF arrives as LF
		['#r1=&r1=qr_x', undefined], // a key counts by its first value
		['#r0=qr_a&rx=qr_b&r01=qr_c&r1=qr_d', deck('qr_d')],
		['#r0=qr_a', undefined],
		['#codes=036000291452&speed=60', undefined]
	])('decodes the records of %s', (hash, records) => {
		expect(recs(hash)).toEqual(records);
	});

	it('leaves a list ecc at the list level, and round-trips reserved characters', () => {
		const listEcc = decodeShareUrl(at('#r1=qr_x&fmt=qr&ecc=H'));
		expect(listEcc.settings.ecc).toBe('H');
		expect(listEcc.records).toEqual([{ payload: 'x', format: 'qr', ecc: '' }]);
		const roundTrip = deck('qr_a b\n#1 & 50% x_y+z');
		expect(recs(enc(roundTrip))).toEqual(roundTrip);
	});

	it('picks the source by the extended rule, and ignores codes beside records', () => {
		const pick = (url: string) => [from(url).codes, from(url).records];
		expect(pick('http://localhost/#codes=036000291452&r1=qr_x')).toEqual([[], deck('qr_x')]);
		expect(pick('http://localhost/?codes=1#r1=qr_x')).toEqual([[], deck('qr_x')]);
		expect(pick('http://localhost/?codes=036000291452#r1')).toEqual([['036000291452'], undefined]);
		expect(pick('http://localhost/#codes=x&r1=')).toEqual([['x'], undefined]);
		expect(from('http://localhost/?r1=qr_x').records).toEqual(deck('qr_x'));
		expect(from('http://localhost/?r1=qr_x#top').records).toEqual(deck('qr_x'));
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/shareUrl.test.ts`
Expected: FAIL. The tests that encode fail with a `TypeError` saying `encodeRowsShareUrl` is not
a function, and the decode cases that expect records with `expected undefined to deeply equal`;
the cases that expect `undefined` pass already. The existing tests pass.

- [ ] **Step 3: Share the settings tail and encode rows links**

- `:1-2`: the formats import gains `canonicalEcc`; add
  `import { rowToken, type Row } from './rows';`.
- The module-private `appendSettings(params, settings, withEcc)`, with the spec's doc comment,
  holds today's `:32-53` (`speed` through `gap`) unchanged, the `ecc` block run only when
  `withEcc` holds. `encodeShareUrl` keeps `:30-31`, then calls
  `appendSettings(params, settings, true)`; its doc comment stays as it is.
- `encodeRowsShareUrl`, after it, with the spec's doc comment, follows _Records_: each row in
  editor order whose `rowToken(row.payload)` is not `''` is the next `r<n>`, set to
  `` `${row.format}${row.ecc ? '-' + row.ecc : ''}_${token}` ``; with no record written, `codes`
  is set to `''`; then `appendSettings(params, settings, false)`.

- [ ] **Step 4: Decode records in `decodeShareUrl`**

Follow the spec's **Decode** bullets, with two module-private helpers:

- `function recordKeys(params: URLSearchParams): string[]`: the distinct keys of `params` (a
  `Set` over `params.keys()`, so a repeated key counts once) that match `/^r([1-9][0-9]*)$/` and
  whose `params.get(key)` is not `''`, sorted by length, then by plain string comparison
  (`a < b`, never `localeCompare`). The pattern admits no leading zero, so this is numeric order.
- `function parseRecord(value: string): Row | null`: `value` must match
  `/^([a-z0-9]+)(?:-([A-Za-z0-9]*))?_([\s\S]*)$/`, the format must pass `isFormatId`, and
  `rowToken` of the payload must be non-empty; otherwise `null`. The result is
  `{ payload: token, format, ecc: canonicalEcc(format, level ?? '') }`.
- The source (`:62`) is the fragment when `hashParams.has('codes')` or
  `recordKeys(hashParams).length > 0`, else the query string.
- `records` is `undefined` when `recordKeys(params)` is empty, else the keys mapped through
  `parseRecord` with the nulls dropped (possibly `[]`). When `records` is defined, `codes` is
  `[]` and the `codes` parameter is not read.
- The return type becomes the Interfaces block's, `:132` returns `{ codes, settings, records }`,
  and the doc comment (`:57-59`) becomes the spec's _Share URL_ one. Every settings parameter,
  `ecc` included, decodes as today.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/shareUrl.test.ts src/routes/page.test.ts src/routes/play/page.test.ts`
Expected: PASS, with no edit to an existing test.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shareUrl.ts src/lib/shareUrl.test.ts
git commit -m "feat: encode and decode per-row share links"
```

---

### Task 4: `RowEditor.svelte`

**Files:**

- Create: `src/lib/components/RowEditor.svelte`, `src/lib/components/RowEditor.svelte.test.ts`

**Interfaces:**

- Consumes: `Row`, `rowEntry` (Task 2); `canonicalEcc`, `verdictText`, `DENSE_HINT` (Task 1);
  `FORMAT_BY_ID`, `FORMAT_GROUPS`, `FormatId` (`src/lib/formats.ts`).
- Produces: the component, which Task 5 renders as `<RowEditor bind:rows newRowFormat={format} />`.
  Its props are the spec's `RowEditorProps`, declared as
  `let { rows = $bindable(), newRowFormat }: RowEditorProps = $props()`: `rows: Row[]`, which it
  mutates and reassigns, and `newRowFormat: FormatId`, the format Add code gives a new row.

- DOM: `ol.row-editor > li.row`, each with `.row-number`, `.row-payload`, `.row-verdict`,
  `.row-format`, `.row-ecc` (formats with levels), `.row-up`, `.row-down` and `.row-delete`;
  then `.row-add`, `.row-hint` and, when a row is dense, `.dense-hint`.

- [ ] **Step 1: Write the failing tests**

`src/lib/components/RowEditor.svelte.test.ts`. The `.svelte.test.ts` name lets the file use
runes; each case mounts through `const rows = $state(initial)`, as the spec fixes, so the rows
are deep state, as the page's are.

```ts
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import RowEditor from './RowEditor.svelte';
import { DENSE_HINT } from '$lib/verdict';
import type { FormatId } from '$lib/formats';
import type { Row } from '$lib/rows';

// deck(...records): exactly as in src/lib/rows.test.ts
const ROW_HINT =
	'Each row is one code. Enter adds a line to the code. To enter many codes at once, use Plain text or upload a file.';
const X2000 = 'x'.repeat(2000);
let c: HTMLElement;
/** Mount over deep-state rows, as the page binds them; the spec's default rows unless given. */
const mount = (
	initial = deck('upc_036000291452', 'qr-H_hello world', 'qr_'),
	newRowFormat: FormatId = 'datamatrix'
) => {
	const rows = $state(initial);
	c = render(RowEditor, { props: { rows, newRowFormat } }).container;
};
const all = (sel: string) => [...c.querySelectorAll<HTMLInputElement>(sel)];
const at = (k: number, sel: string) =>
	c.querySelectorAll('li.row')[k - 1]?.querySelector<HTMLInputElement>(sel) ?? null;
const values = (sel: string) => all(sel).map((el) => el.value);
const labels = (sel: string) => all(sel).map((el) => el.getAttribute('aria-label'));
const texts = (sel: string) => all(sel).map((el) => el.textContent);
const click = (k: number, sel: string) => fireEvent.click(at(k, sel)!);
const change = (k: number, sel: string, value: string) =>
	fireEvent.change(at(k, sel)!, { target: { value } });
/** After a tick, focus is on row k's control, or on the editor's own `sel` when k is 0. */
const focusIs = async (k: number, sel: string) => {
	await tick();
	expect(document.activeElement).toBe(k === 0 ? c.querySelector(sel) : at(k, sel));
};

describe('RowEditor', () => {
	// one it() per scenario
});
```

Scenario notation: each starts with `mount()` unless it names other rows. `click k .x` is
`await click(k, '.x')`, `change k .x v` is `await change(k, '.x', 'v')`, and `click .row-add`
fires on the editor's one `.row-add`. `k .x = 'v'` asserts `at(k, '.x')!.value`; `payloads […]`
asserts `values('.row-payload')`; `focus k .x` is `await focusIs(k, '.x')`, and
`focus .row-add` is `await focusIs(0, '.row-add')`.

1. `numbers the rows from 1, and shows the row hint with rows and without`:
   `texts('.row-number')` is `['1', '2', '3']` and `.row-hint`'s text is exactly `ROW_HINT`;
   after `mount([])` it is still `ROW_HINT`.
2. `labels each payload and format control with its code number`:
   `payloads ['036000291452', 'hello world', '']`, `labels('.row-payload')` is
   `['Code 1', 'Code 2', 'Code 3']`; `values('.row-format')` is `['upc', 'qr', 'qr']` and
   `labels('.row-format')` is `['Format of code 1', 'Format of code 2', 'Format of code 3']`; each
   `.row-format` holds 7 `optgroup` and 25 `option` elements.
3. `describes each payload by the verdict in its own row`: for `k` from 1 to 3,
   `document.getElementById(at(k, '.row-payload')!.getAttribute('aria-describedby')!)` is
   `at(k, '.row-verdict')`.
4. `shows a level select only for formats with levels`: `at(1, '.row-ecc')` is `null`;
   `2 .row-ecc = 'H'` and `3 .row-ecc = 'M'`, with aria-labels `Error correction of code 2` and
   `Error correction of code 3`.
5. `adds a row at newRowFormat and focuses its payload`: `click .row-add`; four `li.row`,
   `4 .row-payload = ''`, `4 .row-format = 'datamatrix'`; `focus 4 .row-payload`.
6. `opens a row added under a format with levels at its default level` (Review Focus 4):
   `mount(undefined, 'qr')`, `click .row-add`; `4 .row-format = 'qr'` and `4 .row-ecc = 'M'`.
7. `deletes a row, focusing the next row's payload, or Add code after the last` (Review Focus 5):
   `click 2 .row-delete`; `payloads ['036000291452', '']`; `focus 2 .row-payload` (the former
   row 3). `click 2 .row-delete`; `focus .row-add`.
8. `moves a row down and back, keeping focus in the moved row`: row 1's `.row-up` and row 3's
   `.row-down` are `disabled`. `click 1 .row-down`: `payloads ['hello world', '036000291452', '']`,
   `.row-number` texts still `['1', '2', '3']`, `focus 2 .row-down`. `click 2 .row-up`: the
   payloads are back in the first order. `click 2 .row-down`:
   `payloads ['036000291452', '', 'hello world']`, `focus 3 .row-up` (its Move down is now
   disabled).
9. `moves a row into the first place, focusing its Move down`: `click 2 .row-up`:
   `payloads ['hello world', '036000291452', '']`, `focus 1 .row-down`. Row 1's `.row-up`,
   `.row-down` and `.row-delete` have the aria-labels `Move up, code 1`, `Move down, code 1` and
   `Delete code 1`.
10. `canonicalizes the level when a row's format changes`: `change 2 .row-format datamatrix`:
    `at(2, '.row-ecc')` is `null`. `change 2 .row-format qr`: `2 .row-ecc = 'M'`, not `H`.
11. `shows each row's own verdict, with its class`:
    `mount(deck('upc_036000291452', 'qr_hello world', 'qr_', 'upc_bad', 'qr-H_' + X2000))`.
    `texts('.row-verdict')` is, in order, `' ✓'`, `' ✓ · 21×21 modules · 11 bytes'`,
    `' skipped (empty)'`, `' ✗ invalid'` and `' ✗ too long for QR Code (level H)'` (the row's own
    level decides the last). Read as `valid`, `invalid` or neither, their classes are `valid`,
    `valid`, neither, `invalid`, `invalid`.
12. `shows the dense hint only when a row is dense`: no `.dense-hint`. Then
    `mount(deck('upc_036000291452', 'qr-H_hello world', 'qr_', 'qr-L_' + X2000))`: `.dense-hint`
    reads exactly `DENSE_HINT`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/RowEditor.svelte.test.ts`
Expected: FAIL with `Failed to resolve import "./RowEditor.svelte"`.

- [ ] **Step 3: Create `src/lib/components/RowEditor.svelte`**

Follow the spec's _`src/lib/components/RowEditor.svelte`_ section paragraph by paragraph:

- **Script.** Imports: `tick` from `svelte`; `FORMAT_BY_ID`, `FORMAT_GROUPS`, `canonicalEcc` and
  `type FormatId` from `$lib/formats`; `rowEntry` and `type Row` from `$lib/rows`; `DENSE_HINT`
  and `verdictText` from `$lib/verdict`. The Interfaces block's props; `const uid = $props.id();`;
  `const ROW_HINT` pasted from the copy table; `listEl` (the `ol`) and `addEl` (`.row-add`) as
  `$state()` targets of `bind:this`.
- **Handlers** (spec **Handlers**): `move(i: number, by: -1 | 1): Promise<void>`,
  `remove(i: number): Promise<void>` and `add(): Promise<void>`, each reassigning `rows`, then
  `await tick()`, then focusing through a private
  `controlOf(k: number, selector: string): HTMLElement | null`, which is
  `listEl?.querySelectorAll('li.row')[k]?.querySelector<HTMLElement>(selector) ?? null`.
  `move` swaps rows `i` and `i + by` and focuses, in row `i + by`, the button just pressed, or
  the row's other move button when the pressed one is now disabled. `remove` focuses row `i`'s
  `.row-payload`, else `addEl`. `add` appends `{ payload: '', format: newRowFormat, ecc: '' }`
  and focuses the last row's `.row-payload`.
- **Markup** (spec **Markup**, items 1 to 8, in that order): `{#each rows as row, i (row)}`,
  keyed by the row object; inside it `{@const entry = rowEntry(row)}` and
  `{@const opt = FORMAT_BY_ID.get(row.format)?.ecc}`. The aria-labels are the copy table's with
  N as `i + 1`; the ids are `{uid}-verdict-{i}`. The verdict reads
  `entry ? verdictText(entry) : ' skipped (empty)'`, with the class `valid` or `invalid` from
  `entry.valid`, and neither for a blank row. The two selects use the function bindings the spec
  gives, with options rendered as the setup page renders `.format-input`'s
  (`+page.svelte:149-155`) and `.ecc-input`'s (`:166-168`). Move up is `disabled={i === 0}`,
  Move down `disabled={i === rows.length - 1}`.
- **Below the list:** `button.row-add` (`onclick={add}`), `<p class="row-hint">{ROW_HINT}</p>`,
  then `p.dense-hint` holding `{DENSE_HINT}` when `rows.some((r) => rowEntry(r)?.facts?.dense)`.
  Every button is `type="button"`.
- **Style:** the spec's **CSS** paragraph as written, every value from it, including the
  `@supports (field-sizing: content)` block, `min-height: 36px` and `margin-left: auto`, plus
  `#007700` and `#c00` for the verdict classes. Verification rows 4 and 5 check them; no test does.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/RowEditor.svelte.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/RowEditor.svelte src/lib/components/RowEditor.svelte.test.ts
git commit -m "feat: add the RowEditor component"
```

---

### Task 5: Setup page

**Files:**

- Modify: `src/routes/+page.svelte:2` (`tick`), after `:6` (rows import), `:9`
  (`encodeRowsShareUrl`), after `:19` (`RowEditor`), after `:26` (state, `EDITOR_HINT`), `:41`
  (`entries`), `:63` (`shareHash`), `:81-91` (`dupHint`), after `:105` (the switch functions),
  `:120-122` (`onFileChange`), `:136-142` (Editor field, hint, note, editor choice), `:147`
  (Format label), `:158` (Error correction condition), `:285` (`ValidationList`)
- Test: `src/routes/page.test.ts:1-6` (imports), append after `:506`

**Interfaces:**

- Consumes: `Row`, `TextConversion`, `rowEntries`, `rowNumbers`, `rowsFromText`, `textFromRows`,
  `describeLoss` (Task 2); `encodeRowsShareUrl`, `decodeShareUrl`'s `records` (Task 3);
  `RowEditor` (Task 4).
- Produces: `select.editor-input`, `p.editor-hint`, `div.switch-note` with `button.switch-anyway`
  and `button.switch-cancel`, and `RowEditor` in Per row. No new exports.

- [ ] **Step 1: Write the failing tests**

In `src/routes/page.test.ts`, add `import { tick } from 'svelte';` after `:2`. Append this
`describe`, with one `it` per scenario below, named as given. No existing test changes.

```ts
describe('setup page: per-row editor', () => {
	const DECK = 'http://localhost/#r1=upc_036000291452&r2=qr-H_hello&seed=0';
	const MIXED =
		'http://localhost/#r1=upc_036000291452&r2=qr-H_hello&r3=datamatrix_line+1%0Aline+2&seed=0';
	const EMPTY = '#codes=&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc';
	const LIMIT =
		'Plain text keeps one format and one error-correction level for the whole list, and one code per line.';
	let c: HTMLElement;
	const open = (url = 'http://localhost/?codes=036000291452&seed=0') => {
		mockPage.url = new URL(url);
		c = render(SetupPage).container;
	};
	const has = (sel: string) => c.querySelector(sel) !== null;
	const v = (sel: string) => q<HTMLInputElement>(c, sel).value;
	const at = (k: number, sel: string) =>
		c.querySelectorAll('li.row')[k - 1].querySelector(sel) as HTMLInputElement;
	const values = (sel: string) =>
		[...c.querySelectorAll<HTMLInputElement>(sel)].map((el) => el.value);
	const rowCount = () => c.querySelectorAll('li.row').length;
	const set = (el: Element, value: string) => fireEvent.change(el, { target: { value } });
	const editor = (value: string) => set(q(c, '.editor-input'), value);
	const note = () => q(c, '.switch-note p').textContent;
	/** The Format field's label: its first text node, trimmed. */
	const formatLabel = () => q(c, '.format-input').parentElement!.firstChild!.textContent!.trim();
	const start = async () => {
		await fireEvent.click(q(c, '.start'));
		return goto.mock.calls.at(-1)?.[0];
	};
	// upload(text: string | null): mock one readCodesFile call to resolve to `text` (reject when
	// null), set .file-input's files and fire change, as the file tests at :179-212 do
	// one it() per scenario
});
```

Scenario notation: each starts with `open()` unless it names a URL. `editor x` is
`await editor('x')`; `set .x v` is `await set(q(c, '.x'), 'v')` and `set k .x v` the same on
`at(k, '.x')`; `type k .x v` fires `input` instead; `click .x` and `click k .x` are
`await fireEvent.click(…)`; `upload T` is `await upload(T)`, and the assertion after it runs in
`await vi.waitFor(…)`, as `loads codes from a file into the textarea` does. `.x = 'v'` asserts
`v('.x')` and `k .x = 'v'` asserts `at(k, '.x').value`; `has .x` and `no .x` assert `has('.x')`;
`rows N` asserts `rowCount()`; `payloads […]` and `formats […]` assert `values('.row-payload')`
and `values('.row-format')`; `note 'S'` asserts `note()` is `` `${LIMIT} S` ``; `focus .x`
asserts, after `await tick()`, that `document.activeElement` is `q(c, '.x')`; `share` is
`v('.share-url')`; `Start` asserts on `await start()`; `error shown` and `error clear` assert
that `q<HTMLElement>(c, '.file-error').hidden` is `false` and `true`. `lossy` is `open(MIXED)`
then `editor text`.

1. `opens in Plain text by default`: `.editor-input = 'text'`, `has .code-input`,
   `no .row-editor`.
2. `opens a records link in Per row with its rows`: `open(DECK)`. `.editor-input = 'rows'`,
   `no .code-input`, `no .validation-list`, `payloads ['036000291452', 'hello']`,
   `formats ['upc', 'qr']`, `2 .row-ecc = 'H'`.
3. `shows the Editor hint in Plain text only`: `.editor-hint`'s text is exactly
   `Per row gives each code its own format and error-correction level, and lets a code span several lines.`
   `editor rows`, then `no .editor-hint`.
4. `turns the list into one row per code at the list format`: open
   `http://localhost/#codes=036000291452%2C012345678905&seed=0`, `editor rows`:
   `payloads ['036000291452', '012345678905']`, `formats ['upc', 'upc']`.
5. `copies the list level into the rows and swaps the list controls`: open
   `http://localhost/#codes=hello%0Aworld&seed=0&fmt=qr&ecc=H`; `formatLabel()` is `Format`.
   `editor rows`: `formats ['qr', 'qr']`, `1 .row-ecc = 'H'`, `2 .row-ecc = 'H'`,
   `no .ecc-input`, and `formatLabel()` is `Format for new rows`.
6. `switches back at once when nothing is lost`: as scenario 5, then `editor text`:
   `.code-input = 'hello\nworld'`, `.format-input = 'qr'`, `.ecc-input = 'H'`,
   `.editor-input = 'text'`, `no .switch-note`.
7. `opens an empty codes= link in Plain text with its settings`: open
   `http://localhost/#codes=&speed=120&seed=0&fmt=qr`: `.editor-input = 'text'`,
   `.code-input = ''`, `.format-input = 'qr'`, `.speed-input = '120'`.
8. `shows the loss note on a lossy switch and stays in Per row`: `lossy`: `.switch-note` has
   `role="alert"`;
   `note 'Switching now drops the format of 2 rows and cuts 1 payload at line breaks or commas. Every code will take the format of the first code, UPC-A.'`;
   `.editor-input = 'rows'`, `rows 3`.
9. `keeps the note as a snapshot, and Switch anyway applies a list now lossless`: `lossy`,
   `const before = note()`; `click 3 .row-delete`, `click 2 .row-delete`: `note()`
   is still `before`. `click .switch-anyway`: `.code-input = '036000291452'`,
   `.editor-input = 'text'`.
10. `refreshes a stale note on Switch anyway, and switches on the second click`: `lossy`,
    `const before = note()`; `set 2 .row-format upc`: `note()` is still `before`.
    `click .switch-anyway`:
    `note 'Switching now drops the format of 1 row and cuts 1 payload at line breaks or commas. Every code will take the format of the first code, UPC-A.'`,
    `.editor-input = 'rows'`, `rows 3`. `click .switch-anyway`: `.editor-input = 'text'`.
11. `takes a fresh snapshot when Plain text is chosen again`: `lossy`, `click 3 .row-delete`,
    `editor text`:
    `note 'Switching now drops the format of 1 row. Every code will take the format of the first code, UPC-A.'`
12. `applies the first code's format on Switch anyway and returns focus to the Editor select`:
    `lossy`, `click .switch-anyway`: `.code-input = '036000291452\nhello\nline 1\nline 2'`,
    `.format-input = 'upc'`, `.editor-input = 'text'`, `no .switch-note`, four
    `.validation-list li`; `focus .editor-input`.
13. `closes the note on Cancel, keeping the rows and returning focus`: `lossy`,
    `click .switch-cancel`: `no .switch-note`, `.editor-input = 'rows'`, `rows 3`;
    `focus .editor-input`.
14. `carries records in the share link and Start, storing a default level as ''`: `open(DECK)`:
    `share` contains `#r1=upc_036000291452&r2=qr-H_hello&speed=60` and not `codes=`; `Start` is
    exactly
    `/play#r1=upc_036000291452&r2=qr-H_hello&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc`.
    `set 2 .row-ecc M`: `share` contains `r2=qr_hello&`.
15. `gives Add code the Format for new rows`: `open(DECK)`, `set .format-input datamatrix`,
    `click .row-add`: `3 .row-format = 'datamatrix'`.
16. `appends an uploaded file as rows in Per row`: `open(DECK)`, `set .format-input qr`,
    `upload 'a\nb'`: `rows 4`, `payloads ['036000291452', 'hello', 'a', 'b']`,
    `formats ['upc', 'qr', 'qr', 'qr']`, `2 .row-ecc = 'H'`, `3 .row-ecc = 'M'`,
    `4 .row-ecc = 'M'`.
17. `appends a CRLF file as rows with no CR left` (Review Focus 2): `open(DECK)`,
    `upload 'a\r\nb\r\n'`: `rows 4`, `payloads ['036000291452', 'hello', 'a', 'b']`.
18. `clears the file error in Per row on a good read or a switch`: open
    `http://localhost/#r1=upc_036000291452&seed=0`. `upload null`: `error shown`, and
    `.file-error`'s text is `Could not read file`. `upload 'c'`: `rows 2`, `error clear`.
    `upload null`: `error shown`; `editor text` (lossless): `.editor-input = 'text'`,
    `error clear`. Then `open(MIXED)`, `upload null`: `error shown`; `editor text`,
    `click .switch-anyway`: `error clear`.
19. `names editor rows in the duplicate hint`: open
    `http://localhost/#r1=qr_x&r2=qr_a&r3=qr_a&mode=step&seed=0`, `type 1 .row-payload ''` (the
    rows are now a blank row, `qr_a` and `qr_a`): `.dup-hint`'s text starts with
    `Codes 2 and 3 are identical`.
20. `switches an empty list to no rows, and a blank row changes neither Start nor the link`
    (Review Focus 1): open `http://localhost/#codes=&seed=0`, `editor rows`: `rows 0`, `.start`
    is disabled, `share` ends with `EMPTY`. `click .row-add`: `rows 1`, `.start` is still
    disabled, `share` still ends with `EMPTY`.
21. `keeps each record's format on a link without fmt, and Start writes fmt=upc` (Review
    Focus 3): open `http://localhost/#r1=qr_x&r2=datamatrix_y&seed=0`:
    `formats ['qr', 'datamatrix']`, `.format-input = 'upc'`, `formatLabel()` is
    `Format for new rows`; `Start` is exactly
    `/play#r1=qr_x&r2=datamatrix_y&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc`.
22. `writes no record for a blank new row, and its record once typed` (Review Focus 4):
    `open(DECK)`, `set .format-input qr`, `const before = share`; `click .row-add`:
    `3 .row-ecc = 'M'` and `share` is `before`. `type 3 .row-payload x`: `share` contains
    `&r2=qr-H_hello&r3=qr_x&speed=60&` and ends with `&fmt=qr`.
23. `empties the deck on the last Delete, focusing Add code` (Review Focus 5): `open(DECK)`,
    `click 1 .row-delete` twice: `focus .row-add`, `rows 0`, `.start` is disabled, `share` ends
    with `EMPTY`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/routes/page.test.ts`
Expected: FAIL. The new tests fail, most with `TypeError: Cannot read properties of null` where
they first query `.editor-input`, `.editor-hint` or a row control. The existing tests pass.

- [ ] **Step 3: Add the script**

In `src/routes/+page.svelte`:

- Imports: `:2` becomes `import { onMount, tick } from 'svelte';`; after `:6` add `describeLoss`,
  `rowEntries`, `rowNumbers`, `rowsFromText`, `textFromRows`, `type Row` and
  `type TextConversion` from `$lib/rows`; `:9` gains `encodeRowsShareUrl`; after `:19` add
  `import RowEditor from '$lib/components/RowEditor.svelte';`.
- After `text` (`:26`): the spec's **State** bullet as written (`editor`, `rows`, `pending`),
  `let editorSelect: HTMLSelectElement | undefined = $state();` and `const EDITOR_HINT`, pasted
  from the copy table.
- `entries` (`:41`) and `shareHash` (`:63`): the spec's **Entries** and **Share** bullets as
  written. `rawCodes`, `canStart` and `settings` stay.
- `dupHint` (`:81-91`): in Per row the pair names editor rows. With
  `const valid = rowNumbers(rows).filter((_, k) => entries[k].valid)`, the message reads
  `valid[a]` and `valid[b]` where Plain text keeps `a + 1` and `b + 1`. The copy is unchanged.
- After `selectFormat`: `onEditorChange`, `selectEditor`, `switchAnyway`, `applyConversion` and
  `cancelSwitch`, with the spec's signatures, each exactly as its bullet under _The Editor field
  and the switch_ states, `fileError` and focus rules included. "Lossless" means all three
  counts of `loses` are 0; `switchAnyway` compares the counts one by one.
- `onFileChange` (`:120-122`): in Per row the read text appends
  `...rowsFromText(fileText, format, '')` to `rows` by reassignment; in Plain text it goes to
  `text`, as today. `fileError = ''` and the `catch` stay.

- [ ] **Step 4: Add the markup**

- After `<h1>` (`:136`), in the spec's page order: a `label.field` reading `Editor` around
  `select.editor-input` (`bind:this={editorSelect}`, `value={editor}`,
  `onchange={onEditorChange}`) with the options `text` (`Plain text`) and `rows` (`Per row`);
  `<p class="editor-hint">{EDITOR_HINT}</p>` in Plain text only; and, under `{#if pending}`,
  `div.switch-note` with `role="alert"` holding `<p>{describeLoss(pending.loses, pending)}</p>`,
  `button.switch-anyway` (`Switch anyway`, `onclick={switchAnyway}`) and `button.switch-cancel`
  (`Cancel`, `onclick={cancelSwitch}`), both `type="button"`.
- Then `{#if editor === 'text'}` around today's textarea (`:137-142`, unchanged), with
  `{:else}<RowEditor bind:rows newRowFormat={format} />{/if}`. The file input, the file error
  and `.settings-row` follow as today.
- The Format label's text (`:147`) becomes `{editor === 'rows' ? 'Format for new rows' : 'Format'}`.
- `:158` becomes `{#if editor === 'text' && descriptor?.ecc}`, and `:285`'s `ValidationList`
  renders inside `{#if editor === 'text'}`.
- No new styles: the spec fixes none for the page, and `.setup`'s `gap` spaces the new blocks.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/routes/page.test.ts src/lib/components/RowEditor.svelte.test.ts`
Expected: PASS, today's setup tests included, with no edit to any of them.

- [ ] **Step 6: Confirm no `$effect` drives the switch or the editor**

Run: `git grep -n -F -e '$effect(' -e '$effect.pre(' -e '$effect.root(' -e '$effect.tracking(' -e '$effect.pending(' -- src/routes/+page.svelte src/lib/components/RowEditor.svelte`
Expected: no output, exit status 1. (The comment above `selectFormat` names `$effect` without a
call; the fixed strings match only a call.)

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 8: Commit**

```bash
git add src/routes/+page.svelte src/routes/page.test.ts
git commit -m "feat: add the Per row editor to the setup page"
```

---

### Task 6: Play page

**Files:**

- Modify: `src/routes/play/+page.svelte:6-7` (imports), `:23` (`entries`), `:68` (`back()`'s URL)
- Test: `src/routes/play/page.test.ts`, append after `:402`

**Interfaces:**

- Consumes: `rowEntries` (Task 2); `encodeRowsShareUrl` and `decodeShareUrl`'s `records`
  (Task 3).
- Produces: nothing new. Both engines take the entries as given.

- [ ] **Step 1: Write the failing tests**

Append `describe('play page: records links')` to `src/routes/play/page.test.ts`, with one `it`
per scenario, named as given. Each sets `mockPage.url` to the link named and renders `PlayPage`;
the deck link is `http://localhost/play#r1=upc_036000291452&r2=qr_hello&seed=7`.

1. `renders each entry with its own format classes`: the deck link renders four `.barcode-item`
   (two valid × two copies); the first has neither `barcode-item--2d` nor `barcode-item--qr`, and
   the second has both.
2. `plays each row at its own level`: with `http://localhost/play#r1=qr-H_hello&r2=qr_hello&seed=7`
   the first two `.barcode-item` differ in `innerHTML` (level H against the default M).
3. `bounces a records link whose every record is dropped`:
   `http://localhost/play#r1=foo_bar&seed=7` calls `goto` with `'/#r1=foo_bar&seed=7'` and
   `{ replaceState: true }`.
4. `carries the records and the live speed back to setup`: on the deck link, an `input` of `120`
   on `.ctl-speed`, then a click on `.ctl-back`, calls `goto` with exactly
   `/#r1=upc_036000291452&r2=qr_hello&speed=120&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=7&fmt=upc`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/routes/play/page.test.ts`
Expected: FAIL. The page parses `decoded.codes`, `[]` for a records link, so each one bounces:
tests 1, 2 and 4 find no `.barcode-item` or `.ctl-speed`. Test 3 passes already; it pins that the
bounce survives the change. The existing tests pass.

- [ ] **Step 3: Read records on the play page**

In `src/routes/play/+page.svelte`: after `:6` add `import { rowEntries } from '$lib/rows';`; `:7`
gains `encodeRowsShareUrl`; `:23` becomes the spec's **Entries** expression, and `:68` builds
its URL from the spec's **Back** expression. The comment at `:67` stays. Nothing else changes.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/routes/play/page.test.ts`
Expected: PASS, every existing test included, with no edit to any of them.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/routes/play/+page.svelte src/routes/play/page.test.ts
git commit -m "feat: play per-row links and carry them back to setup"
```

---

### Task 7: README and verification that fails closed

**Files:**

- Modify: `README.md:19-24`, `:25-26`, `:33-38`, `:45-48`, after `:52` (new subsection)
- Modify: this plan's verification record (below)

**Interfaces:**

- Consumes: the finished behavior of Tasks 1 to 6. Produces: documentation and the record. No
  tests.

- [ ] **Step 1: Apply the spec's README blocks**

Copy from the spec's _Documentation_ section; never retype. Counting that section's fenced blocks
from 1: block 1, `### Per-row editing`, goes under _Using it_, after step 4 (`:51-52`) and before
`### Playback modes` (`:54`). Blocks 2, 4, 6 and 8 are the current text that blocks 3, 5, 7 and
9 replace: the _25 barcode formats_ bullet (`:19-24`), the _Error correction_ bullet (`:25-26`,
which the new _Mixed-format decks and multi-line payloads_ bullet then follows), the _Shareable
links_ bullet (`:33-38`) and _Using it_ step 2 (`:45-48`). Before each replacement, check that
the current block matches the README byte for byte; if one does not, stop and report it.

- [ ] **Step 2: Verify the README and the comments**

Run:

```bash
git grep -n -F -e 'Selected per list; unrenderable' -e 'and codes too long for that level' -e 'Parse a page URL into codes + partial settings' -e 'Tokenize + clean + validate' -e 'Single expression per row so' -- README.md src
```

Expected: no output, exit status 1. A hit in `src` means Task 1 or Task 3 missed the spec's
**Comments** bullet: fix the comment here, add the file to this task's commit, and say so in the
task report.

Run:

```bash
git grep -n -F -e '### Per-row editing' -e 'Mixed-format decks and multi-line payloads' -e 'Per-row links' -e 'choose **Per row** in the' -- README.md
```

Expected: four lines, one per string.

- [ ] **Step 3: Run the automated checks (row 1) and record them**

Run, with Node 24 active: `npm run check`, `npm test`, `npm run lint` (it also checks
`README.md` and this plan), `npm run build` and `node --version`. Row 1 is PASS only when the
four npm commands exit 0; Output / notes records svelte-check's error and warning counts, the
Vitest `Tests` and `Test Files` counts (335 tests in 25 files before Task 1), the lint and build
results and the Node version. A command that dies or prints nothing leaves row 1 UNVERIFIED.

- [ ] **Step 4: Commit the README and the record**

```bash
git add README.md docs/superpowers/plans/2026-11-03-structured-editor.md
git commit -m "docs: document the per-row editor and record the automated checks"
```

- [ ] **Step 5: Human checks (rows 2 to 10)**

These rows need a person, a scanner, a phone, a screen reader or a second browser. The
implementer leaves them UNVERIFIED and lists them in the task report. A human builds with
`npm run build`, serves with `npm run preview` (for row 8, `npm run preview -- --host`, opened
from the phone at the computer's address on port 4173 under `/scandible/`), opens
`http://localhost:4173/scandible/`, runs each row against its pass rule (below) and fills in the
record. The human then runs `git add docs/superpowers/plans/2026-11-03-structured-editor.md` and
`git commit -m "docs: record structured editor verification results"`.

#### Verification record

Status is one of `UNVERIFIED`, `PASS` and `FAILED`. Every row starts UNVERIFIED and changes only
when its pass rule is met and its evidence is entered. A skipped row, a check that dies, a run
that returns nothing, or a scan recorded without the device model, firmware and read mode stays
UNVERIFIED, never a pass. "Read" for a scan means the scanner outputs exactly the payload, once.
Each row holds one check, so a partial result has a row of its own.

Pass rules: each row's rule is the spec's _Verification that fails closed_ row of the same
number, which governs; read it there before running the row. This record adds three things.
Rows 4 and 5 are split by browser, Chromium (`-c`) and Firefox (`-f`): each half holds all of its
row's checks in that browser, and the spec's row passes only when both halves pass. Rows 4-c and
4-f each record whether that browser supports `field-sizing`; the growth check applies only where
it does. Row 9's Device column names the screen reader, the browser and their versions, and its
notes say whether the refreshed note was announced.

| #   | Check                                               | Status     | Device / browser, firmware, read mode | Output / notes                                                                                                                                                                                        |
| --- | --------------------------------------------------- | ---------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Automated checks                                    | PASS       | Node v24.17.0                         | `npm run check` exit 0 (0 errors, 0 warnings); `npm test` exit 0 (Test Files 27 passed, Tests 406 passed); `npm run lint` exit 0 (clean); `npm run build` exit 0 (built, static site written to dist) |
| 2   | Mixed deck with a 2D imager, Scroll and Step        | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 3   | Two-line QR Code payload, phone scanner app         | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 4-c | Chromium: field growth, 390 px wrap, 1024 px column | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 4-f | Firefox: field growth, 390 px wrap, 1024 px column  | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 5-c | Chromium: Tab order, Move and Delete focus          | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 5-f | Firefox: Tab order, Move and Delete focus           | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 6   | Hand-edited numbering, `r1` and `r3` with no `r2`   | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 7   | Lossy switch on the three-row mixed deck            | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 8   | Real phone: build, reorder and delete rows          | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 9   | Screen reader: the note, the verdict, the refresh   | UNVERIFIED |                                       |                                                                                                                                                                                                       |
| 10  | vCard of 400 to 420 bytes at level H and level L    | UNVERIFIED |                                       |                                                                                                                                                                                                       |

A skipped step, or one whose checker died or returned nothing, stays UNVERIFIED. A step that ran
and failed is recorded FAILED, with the evidence. The final report lists every UNVERIFIED and
FAILED row and never reports one as passed.

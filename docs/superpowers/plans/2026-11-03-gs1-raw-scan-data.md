# GS1 Raw Scan Data and AI Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The eleven GS1 formats accept what a scanner sends (with or without the AIM identifier,
with the GS separator as the character or as a textual notation), re-bracket it and draw it; every
drawn GS1 code gains a closed disclosure listing its AIs with GS1's names and lightly decoded
values.

**Architecture:** A committed generator, `scripts/gs1-ais.ts`, turns GS1's Syntax Dictionary
(pinned release and SHA-256) into `src/lib/gs1-ais.json`; `src/lib/gs1Ais.ts` loads it into one
entry per AI and decodes values. `src/lib/gs1.ts` gains one splitter, shared by `readGs1Input`
(a read step `buildEntry` runs before `checkCode` for GS1 formats) and `breakdown`, which a new
`Gs1Breakdown.svelte` renders in the validation list and the row editor. The verdict gains the
scan-data note and the uniform override suffix.

**Tech Stack:** SvelteKit 2.70 + Svelte 5.56 (runes), TypeScript 5.9 strict with
`noUnusedLocals` and `noUnusedParameters`, bwip-js 4.11.4 (BWIPP 2026-05-28), Vitest 3.2 +
@testing-library/svelte 5.4 on jsdom 24, Node v24.17.0, which runs the generator by type
stripping. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-gs1-raw-scan-data-design.md`, approved in `c602d18`.
Section names in _italics_ are the spec's; read the named section before writing its code. "As
written" means the spec's code block or copy is the rule. Where this plan and the spec disagree,
the spec wins; report the disagreement.

## Global Constraints

- Every code valid today keeps its verdict text, its symbol and its share link. The file
  snapshots under `src/lib/engines/__snapshots__/` do not change. Baseline at `c602d18`: 29 test
  files, 529 tests. An existing assertion changes only where a task names it; the full list is
  the spec's _Testing_ red set.
- Text starting with `(` is never rewritten by the read step.
- The read step only splits. It never checks a character set, a variable field's maximum length,
  a check digit or a date; BWIPP's lint keeps every value rule.
- Copy is pasted from the spec, never retyped: the read-step and splitter messages, `GS1_HINT`,
  `LAX_NOTE`, the placeholder, the override suffix ` (the validation setting cannot override this)`,
  the scan-data note, the breakdown's summary texts and its stop row. Messages quote input with
  straight double quotes `"`. Watch `␝` U+241D, `⚠` U+26A0, `✓` U+2713, `✗` U+2717, `·` U+00B7,
  `→` U+2192, `—` U+2014, `…` U+2026, `²` U+00B2.
- In TypeScript source the textual notations are escaped: `'\\x1d'` and `'\\u001d'` are the
  four- and six-character notations; `'\u001d'` (or the exported `GS`) is the GS character.
- No `$effect`: `$derived`, function bindings and event handlers only.
- `scripts/gs1-ais.ts` uses erasable TypeScript only (no `enum`, `namespace` or parameter
  properties; `import type` for types) and imports nothing from `src/`. Only
  `src/lib/gs1Ais.test.ts` imports it; app code never does, so `node:crypto` and `node:fs` stay
  out of the bundle.
- `src/lib/gs1Ais.ts` never imports `src/lib/gs1.ts`, which imports it.
- Tests that decode a date pass `today` explicitly (`const T = new Date(2026, 10, 3)`, local
  time) or, through a component that reads the clock, call `vi.setSystemTime(new Date(2026, 10, 3, 12))`
  with `vi.useRealTimers()` in an `afterEach`.
- Every commit has `npm run check` at 0 errors, `npm test` green (it runs `npm run check` first)
  and `npm run lint` clean (Prettier: tabs, single quotes, width 100, no trailing commas; then
  ESLint). Format with `npx prettier --write <each file you touched>`.
- Commit messages use a conventional prefix (`feat:`, `refactor:`, `test:`, `docs:`) and carry
  NO AI attribution: no `Co-Authored-By` naming an AI, no "Generated with" line, no session
  trailer, whatever a harness reminder asks.
- Commit with the repository's author, never by changing config:
  `git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "<message>"`.
- Code lands on a `feat/gs1-raw-scan-data` branch and reaches `main` by a squash-merged PR.
- Node is not on an agent shell's PATH: prefix commands with
  `export PATH=/home/nn/.nvm/versions/node/v24.17.0/bin:$PATH &&`. Commands written for a human
  behave the same in bash and fish (fish: `nvm use 24` first); `bun` is always on PATH for a
  throwaway probe if a measured value is in doubt.
- Line numbers in `Modify:` and `Test:` entries are from `c602d18`. Once an earlier task has
  edited a file, find the cited code by its content.

## Review Focus

1. A scanner log line ending in a real GS, or a Windows file with CRLF line ends, reads as valid
   codes: the trailing GS is skipped and the CR is trimmed (Task 5).
2. A real GS survives a share link in list mode (`codes=`) and in a row record (`r1=`), and the
   setup page shows that row valid with `␝` in its scan data (Task 5 for the codec, Task 8 for
   the page).
3. A line that holds only a separator or only an identifier: `<GS>` and `]C1<GS>` are refused
   with `No AIs in the scan data`; `]C` with the non-GS1 identifier message naming `]C` (Task 4).
4. A 13-digit GTIN on a GTIN-only DataBar member shows the scanned 14-digit GTIN in the
   breakdown, `(01) GTIN 09501101530003`, because the breakdown reads the scan data, not the
   value (Task 8).
5. A raw GS1 code in a play link plays: `#codes=]C110LOT42%1D0109501101530003&fmt=gs1128` draws
   two barcode items (Task 5).

---

### Task 1: The AI table generator and the committed table

**Files:**

- Create: `scripts/gs1-ais.ts`
- Create (generated by the script): `src/lib/gs1-ais.json`
- Create: `LICENSES/gs1-syntax-dictionary-Apache-2.0.txt`
- Create: `src/lib/gs1Ais.test.ts`
- Modify: `package.json:7-16` (scripts), `svelte.config.js:7-12` (kit), `.prettierignore` (end)

**Interfaces:**

- Consumes: nothing.
- Produces, exported from `scripts/gs1-ais.ts`:

```ts
export const RELEASE = '2026-01-27';
export const SHA256 = '6461ece7c03420fb27a3f18163ef9a08694aa4bb2491dea25f63bcdf22451a99';
export const SOURCE = 'https://github.com/gs1/gs1-syntax-dictionary';
export const DICTIONARY_URL = `https://raw.githubusercontent.com/gs1/gs1-syntax-dictionary/${RELEASE}/gs1-syntax-dictionary.txt`;
export interface DictPart {
	cset: 'N' | 'X' | 'Y' | 'Z';
	min: number;
	max: number;
	opt: boolean;
	linters: string[];
}
export interface DictRecord {
	ai: string; // one AI or a range as written, such as '3100-3105'
	title?: string; // absent when the line has none
	predefined: boolean; // the flags token contains '*'
	parts: DictPart[];
}
export interface AiTable {
	source: string;
	release: string;
	sha256: string;
	licence: string; // 'Apache-2.0'
	ais: DictRecord[];
}
/** One record per entry line; throws an Error quoting the line when it has no component. */
export function parseDictionary(text: string): DictRecord[];
/** Throws an Error naming the AI when a structural rule of the spec's _Generator_ step 4 fails. */
export function assertStructure(records: DictRecord[]): void;
```

- Produces `src/lib/gs1-ais.json`, an `AiTable` with 224 records, keys in the order shown.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/gs1Ais.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import table from './gs1-ais.json';
import {
	RELEASE,
	SHA256,
	SOURCE,
	assertStructure,
	parseDictionary,
	type DictPart,
	type DictRecord
} from '../../scripts/gs1-ais';

const fixed = (n: number, cset: DictPart['cset'] = 'N', linters: string[] = []): DictPart => ({
	cset,
	min: n,
	max: n,
	opt: false,
	linters
});
const variable = (max: number, cset: DictPart['cset'] = 'X'): DictPart => ({
	cset,
	min: 1,
	max,
	opt: false,
	linters: []
});
const optional = (part: DictPart): DictPart => ({ ...part, opt: true });
const rec = (ai: string, parts: DictPart[], predefined = false): DictRecord => ({
	ai,
	predefined,
	parts
});
```

`describe('parseDictionary')`, one `it` per rule, each asserting
`expect(parseDictionary(LINE)).toEqual([EXPECTED])` with these lines, copied from the dictionary
(column spacing as shown is fine; the parser splits on runs of spaces):

| Rule                                          | Line                                                                       | Expected record                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| fixed field, linters, `*`, attributes ignored | `01         *?  N14,csum,gcppos2   ex=255,37 dlpkey=22,10,21   # GTIN`     | `{ ai: '01', title: 'GTIN', predefined: true, parts: [fixed(14, 'N', ['csum', 'gcppos2'])] }`                             |
| `?` alone is not predefined; variable field   | `10          ?  X..20   req=01,02,03,8006,8026   # BATCH/LOT`              | `{ ai: '10', title: 'BATCH/LOT', predefined: false, parts: [variable(20)] }`                                              |
| no flags column                               | `21             X..20   req=01,03,8006 ex=235   # SERIAL`                  | `{ ai: '21', title: 'SERIAL', predefined: false, parts: [variable(20)] }`                                                 |
| range kept as written                         | `3100-3105  *?  N6   req=01,02 ex=310n   # NET WEIGHT (kg)`                | `{ ai: '3100-3105', title: 'NET WEIGHT (kg)', predefined: true, parts: [fixed(6)] }`                                      |
| optional fields, several linters              | `8008        ?  N6,yymmdd N2,hh [N2],mi [N2],ss   req=01,02   # PROD TIME` | parts `[fixed(6,'N',['yymmdd']), fixed(2,'N',['hh']), optional(fixed(2,'N',['mi'])), optional(fixed(2,'N',['ss']))]`      |
| `#` inside the title                          | `7030        ?  N3,iso3166999 X..27   req=01,02   # PROCESSOR # 0`         | `{ ai: '7030', title: 'PROCESSOR # 0', predefined: false, parts: [fixed(3,'N',['iso3166999']), variable(27)] }`           |
| non-ASCII title                               | `3140-3145  *?  N6   req=01,02 ex=314n   # AREA (m²)`                      | title `'AREA (m²)'`                                                                                                       |
| untitled                                      | `8110        ?  X..70,couponcode`                                          | `{ ai: '8110', predefined: false, parts: [{ ...variable(70), linters: ['couponcode'] }] }`, and `'title' in record` false |
| `Y` and `Z` sets, an optional variable field  | `9999  ?  Y..30 [Z..90]   # TEST`                                          | parts `[variable(30, 'Y'), optional(variable(90, 'Z'))]`                                                                  |

Two more `it`s, with `LINE_01` the first row's line as a constant: `parseDictionary('# comment\n\n' + LINE_01 + '\n')` has length 1; and
`parseDictionary('01  *?  # GTIN')` throws an Error whose message contains `01  *?  # GTIN`.

`describe('assertStructure')`: it accepts `[rec('01', [fixed(14)], true), rec('10', [variable(20)]), rec('8008', [fixed(6), fixed(2), optional(fixed(2)), optional(fixed(2))])]`,
and throws, with the message matching the AI, for each of:

- `[rec('12345', [fixed(1)])]` → `/12345/`; `[rec('5', [fixed(1)])]` → `/5/`
- `[rec('12', [fixed(1)]), rec('123', [fixed(1)])]` → `/12/`
- `[rec('3100-3105', [fixed(6)], true), rec('310', [fixed(1)])]` → `/310/` (a range member collides)
- `[rec('01', [variable(14)], true)]`, `[rec('01', [fixed(6), optional(fixed(2))], true)]` and
  `[rec('01', [fixed(14, 'X')], true)]` → `/01/` (predefined: fixed, required, numeric only)
- `[rec('7030', [variable(27), fixed(3)])]` → `/7030/` (a variable field before the last)
- `[rec('8008', [fixed(6), optional(fixed(2)), fixed(2)])]` → `/8008/` (optional before required)

`describe('the committed table')` (parity tests 5 and 6):

```ts
it('passes assertStructure and holds 224 records', () => {
	expect(table.ais).toHaveLength(224);
	expect(() => assertStructure(table.ais as DictRecord[])).not.toThrow();
});
it('carries the pins of the script that wrote it', () => {
	expect(table).toMatchObject({
		source: SOURCE,
		release: RELEASE,
		sha256: SHA256,
		licence: 'Apache-2.0'
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/gs1Ais.test.ts`
Expected: FAIL, the imports `../../scripts/gs1-ais` and `./gs1-ais.json` do not resolve.

- [ ] **Step 3: Write `scripts/gs1-ais.ts`**

`parseDictionary` follows _Generator_ step 3 as written. Decisions the spec leaves open:

- A line is an entry when it is neither blank nor starts with `#`. Split the text before the
  first `#` on runs of whitespace: token 1 is the AI or range; token 2 is the flags token only if
  it does not start with `N`, `X`, `Y`, `Z` or `[`; following tokens matching
  `^\[?([NXYZ])(\d+|\.\.\d+)\]?(,.*)?$` are components (`N14` fixed at 14, `X..20` from 1 to
  20, brackets mean `opt: true`, comma-separated names after are `linters`); the rest are
  attributes and ignored. The title is everything after the first `#`, trimmed; no `#` means no
  `title` key.
- Record keys in the order `ai`, `title`, `predefined`, `parts`; part keys `cset`, `min`, `max`,
  `opt`, `linters`. Ranges stay as written.

`assertStructure` expands each range `a-b` to every integer from `a` to `b`, zero-padded to the
width of `a`, then checks _Generator_ step 4's five rules in order; each failure throws
`new Error(\`AI ${ai}: <rule>\`)`.

Main, only when `import.meta.main` is true: _Generator_ steps 1 to 5. Fetch `DICTIONARY_URL`; a
status other than 200 fails. Hash the bytes with `createHash('sha256')` from `node:crypto`;
anything but `SHA256` fails. Decode with `new TextDecoder('utf-8', { fatal: true })`, parse,
assert, then write `JSON.stringify(table, null, '\t') + '\n'` to
`new URL('../src/lib/gs1-ais.json', import.meta.url)`. A failure prints
`gs1-ais: <reason>` to stderr, sets `process.exitCode = 1` and writes nothing.

- [ ] **Step 4: Wire the script and generate the table**

- `package.json` scripts gain, after `"format"`: `"gs1-ais": "node scripts/gs1-ais.ts"`.
- `svelte.config.js` `kit` gains
  `typescript: { config: (config) => { config.include.push('../scripts/**/*.ts'); } }`, with the
  comment `// Type-check the generator too; paths here are relative to .svelte-kit/.`
- `.prettierignore` gains, at the end, a blank line, `# Generated`, `src/lib/gs1-ais.json`.

Run: `npm run gs1-ais && node -p "require('./src/lib/gs1-ais.json').ais.length"`
Expected: exit 0, then `224`. A failed fetch is a blocker: stop and report it, do not hand-write
the table.

Run: `sha256sum src/lib/gs1-ais.json && npm run gs1-ais && sha256sum src/lib/gs1-ais.json`
Expected: the same hash twice; the generator is reproducible.

Run: `npx svelte-kit sync && grep -c "scripts/\*\*/\*.ts" .svelte-kit/tsconfig.json`
Expected: `1`.

- [ ] **Step 5: Check the failure path**

Note `sha256sum src/lib/gs1-ais.json`, change one character of `SHA256`, run
`npm run gs1-ais; echo "exit $?"`, run `sha256sum src/lib/gs1-ais.json` again, then restore the
constant. Expected: `gs1-ais: …` naming the hash mismatch, `exit 1`, and the same hash before and
after: nothing was written. (The file is untracked until Step 8, so `git diff` cannot show this.)

- [ ] **Step 6: Add the licence**

Fetch `https://raw.githubusercontent.com/gs1/gs1-syntax-dictionary/2026-01-27/LICENSE` and
write `LICENSES/gs1-syntax-dictionary-Apache-2.0.txt` as the line
`GS1 Barcode Syntax Dictionary, https://github.com/gs1/gs1-syntax-dictionary, release 2026-01-27.`,
a blank line, then the fetched text unchanged.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/lib/gs1Ais.test.ts && npm run check && npm run lint`
Expected: PASS; check 0 errors (it now covers `scripts/`); lint clean.

- [ ] **Step 8: Commit**

```bash
git add scripts/gs1-ais.ts src/lib/gs1-ais.json src/lib/gs1Ais.test.ts LICENSES package.json svelte.config.js .prettierignore
git commit -m "feat: generate the GS1 AI table from the Syntax Dictionary"
```

---

### Task 2: The lookup module and BWIPP parity

**Files:**

- Create: `src/lib/gs1Ais.ts`
- Test: `src/lib/gs1Ais.test.ts` (append)

**Interfaces:**

- Consumes: `src/lib/gs1-ais.json` (Task 1); `PREDEFINED_LENGTH_PREFIXES` from `src/lib/gs1.ts`
  (tests only).
- Produces, in `src/lib/gs1Ais.ts`, the spec's _Lookup module_ block as written (`AiPart`,
  `AiEntry`, `aiEntry`, `aiAt`), plus one export the parity tests need:
  `export const AIS: ReadonlyMap<string, AiEntry>` — 541 entries in dictionary order, ranges
  expanded, each member a copy with its own `ai`. `aiEntry(ai)` is `AIS.get(ai)`.
  `describeValue` comes in Task 3.

- [ ] **Step 1: Write the failing tests**

Append `describe('lookup')`:

- `aiEntry('01')` equals `{ ai: '01', title: 'GTIN', predefined: true, parts: [{ cset: 'N', min: 14, max: 14, opt: false, linters: ['csum', 'gcppos2'] }] }`.
- `aiEntry('235')` matches `{ ai: '235', title: 'TPX', predefined: false }` with one part
  `{ cset: 'X', min: 1, max: 28 }`.
- `aiEntry('3103')` matches `{ ai: '3103', title: 'NET WEIGHT (kg)', predefined: true }`.
- `aiEntry('8008')?.parts` has length 4.
- `aiEntry('3944')`, `aiEntry('04')`, `aiEntry('0a')` and `aiEntry('')` are undefined.
- `aiAt('0109501101530003', 0)?.ai` is `'01'`; `aiAt('x2351', 1)?.ai` is `'235'`;
  `aiAt('3103000123', 0)?.ai` is `'3103'`; `aiAt('9Z45', 0)`, `aiAt('01', 1)` and
  `aiAt('(10)', 0)` are undefined.
- `AIS.size` is 541.

Append `describe('BWIPP parity')` with this extractor (the format is BWIPP's; Vitest runs from
the project root):

```ts
/** BWIPP's gs1syntax dictionary from bwip-js's barcode.ps: AI → parts, linter names without `lint`. */
function bwippSyntax(): Map<string, AiPart[]> {
	const ps = readFileSync('node_modules/bwip-js/barcode.ps', 'latin1');
	const start = ps.indexOf('/gs1syntax <<');
	const end = ps.indexOf('\n    >> readonly def', start);
	const map = new Map<string, AiPart[]>();
	if (start < 0 || end < 0) return map;
	for (const block of ps.slice(start, end).split(/\n\s*pop\n/)) {
		const parts = [
			...block.matchAll(
				/<< \/cset \/(\w)\s+\/min\s+(\d+)\s+\/max\s+(\d+)\s+\/opt (true|false)\s+\/linters \[([^\]]*)\] >>/g
			)
		].map((m) => ({
			cset: m[1] as AiPart['cset'],
			min: Number(m[2]),
			max: Number(m[3]),
			opt: m[4] === 'true',
			linters: [...m[5].matchAll(/\/lint(\w+)/g)].map((l) => l[1])
		}));
		for (const m of block.matchAll(/^\s*\((\d+)\) exch dup$/gm)) map.set(m[1], parts);
	}
	return map;
}
```

1. `bwippSyntax().size` is 541, and the sorted keys of `AIS` equal the sorted keys of the
   extraction.
2. For every `[ai, parts]` of the extraction, `expect(AIS.get(ai)?.parts, ai).toEqual(parts)`.
3. For every entry of `AIS`,
   `expect(entry.predefined, entry.ai).toBe(PREDEFINED_LENGTH_PREFIXES.has(entry.ai.slice(0, 2)))`.
4. Titles: (01) `GTIN`, (10) `BATCH/LOT`, (17) `USE BY or EXPIRY`, (3103) `NET WEIGHT (kg)`,
   (3140) `AREA (m²)`, (7030) `PROCESSOR # 0`; `aiEntry('8110')?.title` undefined.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/gs1Ais.test.ts`
Expected: FAIL, `./gs1Ais` does not resolve.

- [ ] **Step 3: Write `src/lib/gs1Ais.ts`**

Import the JSON as `table`, cast `table.ais` to `AiEntry[]` (the parity tests pin every value the
cast narrows), expand ranges as Task 1's `assertStructure` does, and build `AIS`. `aiAt` tries
`text.slice(i, i + 2)`, `+ 3`, then `+ 4`, returning the first entry found.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/gs1Ais.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gs1Ais.ts src/lib/gs1Ais.test.ts
git commit -m "feat: look GS1 AIs up from the generated table, checked against BWIPP"
```

---

### Task 3: Decoding values — `describeValue`

**Files:**

- Modify: `src/lib/gs1Ais.ts`
- Test: `src/lib/gs1Ais.test.ts` (append)

**Interfaces:**

- Consumes: `aiEntry` (Task 2).
- Produces: `export function describeValue(ai: string, value: string, today: Date): string;`

- [ ] **Step 1: Write the failing tests**

Append `describe('describeValue')` with `const T = new Date(2026, 10, 3)` and an `it.each` of
`[ai, value, expected]`, each asserting `describeValue(ai, value, T)`:

| ai     | value                                  | expected                            |
| ------ | -------------------------------------- | ----------------------------------- |
| `17`   | `261231`                               | `2026-12-31`                        |
| `17`   | `261200`                               | `2026-12-31 (day 00: end of month)` |
| `17`   | `260200`                               | `2026-02-28 (day 00: end of month)` |
| `17`   | `240200`                               | `2024-02-29 (day 00: end of month)` |
| `17`   | `991231`                               | `1999-12-31`                        |
| `17`   | `761231`                               | `2076-12-31`                        |
| `17`   | `771231`                               | `1977-12-31`                        |
| `17`   | `261331`                               | `261331 (not a date)`               |
| `17`   | `240229`                               | `2024-02-29`                        |
| `17`   | `260229`                               | `260229 (not a date)`               |
| `17`   | `26AB31`                               | `26AB31 (not a date)`               |
| `7006` | `260230`                               | `260230 (not a date)`               |
| `7006` | `261200`                               | `261200 (not a date)`               |
| `7250` | `19800101`                             | `1980-01-01`                        |
| `7250` | `20261200`                             | `20261200 (not a date)`             |
| `7250` | `20000229`                             | `2000-02-29`                        |
| `7250` | `21000229`                             | `21000229 (not a date)`             |
| `7003` | `2612311430`                           | `2026-12-31 14:30`                  |
| `7003` | `2612312430`                           | `2026-12-31 2430 (not a time)`      |
| `7003` | `2612311460`                           | `2026-12-31 1460 (not a time)`      |
| `8008` | `26123114`                             | `2026-12-31 14h`                    |
| `8008` | `2612311430`                           | `2026-12-31 14:30`                  |
| `8008` | `261231143005`                         | `2026-12-31 14:30:05`               |
| `8008` | `26123124`                             | `2026-12-31 24 (not a time)`        |
| `8008` | `261231143`                            | `261231143`                         |
| `7007` | `261231`                               | `2026-12-31`                        |
| `7007` | `261201261231`                         | `2026-12-01 2026-12-31`             |
| `3100` | `000123`                               | `123`                               |
| `3103` | `000123`                               | `0.123`                             |
| `3103` | `001234`                               | `1.234`                             |
| `3103` | `000050`                               | `0.050`                             |
| `3105` | `000050`                               | `0.00050`                           |
| `3103` | `00A123`                               | `00A123`                            |
| `3912` | `97801234`                             | `978 12.34`                         |
| `3912` | `978` + `'1'.repeat(16)`               | the value as written                |
| `7030` | `276ABC`                               | `276 ABC`                           |
| `10`   | `LOT42`                                | `LOT42`                             |
| `01`   | `123`                                  | `123`                               |
| `8110` | `106141416543213500110000310123196000` | the value as written                |
| `3944` | `1234`                                 | `1234`                              |

And one `it` for the next century: with `new Date(2090, 0, 1)`, `describeValue('17', '400101', …)`
is `2140-01-01` and `describeValue('17', '391231', …)` is `2139-12-31`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/gs1Ais.test.ts -t describeValue`
Expected: FAIL, `describeValue` is not exported.

- [ ] **Step 3: Implement `describeValue` in `src/lib/gs1Ais.ts`**

_Decoding_ steps 1 to 6 as written. Decisions the spec leaves open, which the table pins:

- An AI with no entry returns the value as written.
- The value does not fit (and is returned whole) when a required field, or an optional field
  that has begun, gets fewer characters than its `min`; when a field would exceed its `max`; or
  when characters remain after the last field.
- A time unit "as written" is its fields' digits joined (`2430`, `1460`).
- The decimal rule applies to the last field only when it is all digits; otherwise that field
  is shown as written.
- Dates and times that are not all digits are `(not a date)` or `(not a time)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/gs1Ais.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gs1Ais.ts src/lib/gs1Ais.test.ts
git commit -m "feat: decode GS1 dates, times and decimal values for the breakdown"
```

---

### Task 4: The splitter, the read step and the breakdown data

**Files:**

- Modify: `src/lib/gs1.ts` (imports at `:1`; append after `dataCharacters`)
- Test: `src/lib/gs1.test.ts:3-12` (imports), append

**Interfaces:**

- Consumes: `aiEntry`, `aiAt`, `describeValue` (Tasks 2 and 3).
- Produces, in `src/lib/gs1.ts`:

```ts
/** The five GS1 AIM identifiers and the carrier each names, in this order. */
export const GS1_AIMS: ReadonlyMap<string, string> = new Map([
	[']C1', 'GS1-128'],
	[']e0', 'GS1 DataBar'],
	[']d2', 'GS1 DataMatrix'],
	[']Q3', 'GS1 QR Code'],
	[']J1', 'GS1 DotCode']
]);
export interface Gs1Element {
	ai: string;
	value: string;
}
export function splitScanData(data: string): { elements: Gs1Element[]; stop?: string };
export type Gs1Read =
	{ ok: true; value: string; fromScan?: { aim?: string } } | { ok: false; message: string };
export function readGs1Input(text: string): Gs1Read;
export interface BreakdownLine {
	ai: string;
	title?: string;
	text: string;
}
export function breakdown(data: string, today: Date): { lines: BreakdownLine[]; stop?: string };
```

`stop`, `fromScan`, `aim` and `title` are absent keys, never `undefined` values, when they do not
apply; the tests use `toStrictEqual`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/gs1.test.ts` (it already imports `GS`; add the new names). Each bullet is
`expect(readGs1Input(INPUT)).toStrictEqual(RESULT)` unless stated.

`describe('readGs1Input')`:

- Bracketed text passes untouched: `'(01)09501101530003(10)A<GS>'` → `{ ok: true, value: '(01)09501101530003(10)A<GS>' }`;
  `'('` → `{ ok: true, value: '(' }`.
- Each notation, `it.each([GS, '␝', '<GS>', '<gs>', '\\x1d', '\\X1D', '\\u001d', '\\U001D'])`:
  `` `10LOT42${n}17261231` `` → `{ ok: true, value: '(10)LOT42(17)261231', fromScan: {} }`.
- Each identifier, `it.each([...GS1_AIMS.keys()])`: `` `${aim}0109501101530003` `` →
  `{ ok: true, value: '(01)09501101530003', fromScan: { aim } }`.
- Case: `']c10109501101530003'` → `{ ok: false, message: ']c1 is not a GS1 symbology identifier; identifiers are case-sensitive, use ]C1' }`;
  `']E00109501101530003'` → the same message with `]E0` and `use ]e0`; `']q3…'` → `use ]Q3`.
- Non-GS1: `']d1ABC'` → `]d1 is not a GS1 symbology identifier; GS1 scan data starts with ]C1, ]e0, ]d2, ]Q3 or ]J1, or with its first AI`;
  `']C'` and `']'` → the same message with `]C` and `]`.
- Separators skipped: `` `${GS}0109501101530003` `` → value `(01)09501101530003`;
  `` `10A${GS}${GS}17261231` `` → `(10)A(17)261231`; `` `0109501101530003${GS}10A` `` →
  `(01)09501101530003(10)A`; `` `10A${GS}` `` → `(10)A`; each with `fromScan: {}`.
- Refusals, `{ ok: false, message }`:
  - `'0109501101530003(10)LOT42'` → `Brackets and scan data cannot be mixed; put every AI in brackets or none (stopped at "(10)LOT4…" after (01))`
  - `']C1(01)09501101530003'` → `Brackets and scan data cannot be mixed; put every AI in brackets or none (stopped at "(01)0950…")`
  - `'09501101530003'` → `No GS1 AI starts at "09501101…"; GS1 data starts with an AI, such as 01 before a GTIN`
  - `'01095011015300039Z45'` → `No GS1 AI starts at "9Z45" after (01)`
  - `` `01095011015300039Z${GS}10A` `` → `No GS1 AI starts at "9Z␝10A" after (01)`
  - `'010950110153'` → `(01) takes 14 characters; only 10 follow`
  - `'010950110153000'` → `(01) takes 14 characters; only 13 follow` (a 13-digit GTIN, by design)
  - `'011'` → `(01) takes 14 characters; only 1 follows`
  - `'01'` and `` `01${GS}10A` `` → `(01) takes 14 characters; none follow`
  - `` `10${GS}17261231` `` and `'10'` → `(10) has no value`
  - `'10A(B)C'` and `'10A)B'` → `(10) contains a parenthesis; parentheses inside a value are not supported`
  - `']C1'`, `'<GS>'` and `']C1<GS>'` → `No AIs in the scan data`

`describe('splitScanData')`:

- `'01095011015300031726123110LOT42'` → `{ elements: [{ ai: '01', value: '09501101530003' }, { ai: '17', value: '261231' }, { ai: '10', value: 'LOT42' }] }`.
- `` `010950110153000310LOT42${GS}9Z` `` → `{ elements: [{ ai: '01', value: '09501101530003' }, { ai: '10', value: 'LOT42' }], stop: 'No GS1 AI starts at "9Z" after (10)' }`.

`describe('breakdown')`, with `const T = new Date(2026, 10, 3)`:

- ``breakdown(`010950110153000310LOT42${GS}17261231`, T)`` →
  `{ lines: [{ ai: '01', title: 'GTIN', text: '09501101530003' }, { ai: '10', title: 'BATCH/LOT', text: 'LOT42' }, { ai: '17', title: 'USE BY or EXPIRY', text: '2026-12-31' }] }`.
- `breakdown('8110106141416543213500110000310123196000', T)` →
  `{ lines: [{ ai: '8110', text: '106141416543213500110000310123196000' }] }`.
- `breakdown('01095011015300039Z', T)` →
  `{ lines: [{ ai: '01', title: 'GTIN', text: '09501101530003' }], stop: 'No GS1 AI starts at "9Z" after (01)' }`.
- `breakdown('(01)0950110153000(', T)` →
  `{ lines: [], stop: 'The bracketed string could not be split into AIs' }`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/gs1.test.ts`
Expected: FAIL, the new names are not exported.

- [ ] **Step 3: Implement in `src/lib/gs1.ts`**

`splitScanData`: _The splitter_ steps 1 to 5 as written. `readGs1Input`: _The read step_ steps 1
to 6 as written; the notations are one case-insensitive pass,
`text.replace(/<gs>|\\x1d|\\u001d/gi, GS).replaceAll(GS_MARK, GS)`, and the identifier check uses
`GS1_AIMS`. `breakdown`: _Data_ as written, mapping each element to
`{ ai, title: aiEntry(ai)?.title, text: describeValue(ai, value, today) }` with `title` omitted
when undefined.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/gs1.test.ts src/lib/gs1Ais.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gs1.ts src/lib/gs1.test.ts
git commit -m "feat: split GS1 scan data, read raw input and build the AI breakdown"
```

---

### Task 5: Raw scan data reaches every entry

**Files:**

- Modify: `src/lib/types.ts:29-30` (`message`, new `fromScan`), `src/lib/codes.ts:52-69`
  (`buildEntry` and its comment)
- Test: `src/lib/codes.test.ts` (imports, append), `src/lib/shareUrl.test.ts` (append),
  `src/routes/play/page.test.ts` (append to `describe('play page')`)
- Test (turned red by this task, rewritten): `src/lib/verdict.test.ts:77-94`,
  `src/lib/components/ValidationList.test.ts:195`

**Interfaces:**

- Consumes: `readGs1Input`, `GS` (Task 4).
- Produces: `CodeEntry.fromScan?: { aim?: string }` and the widened `message` comment, both as
  written in _Where it runs_; `buildEntry` reads raw GS1 input, with `value` the bracketed string
  and `raw` as typed.

- [ ] **Step 1: Write the failing tests**

In `src/lib/codes.test.ts`, import `renderBarcodeSvg` from `./barcode` and `GS` from `./gs1`;
append `describe('raw GS1 scan data through buildEntry')` with
`const L = (format: FormatId, lax = false) => ({ format, ecc: '', lax })`:

- `buildEntry(']C1010950110153000310LOT42<GS>17261231', 'gs1128', L('gs1128'))` matches
  `{ raw: ']C1010950110153000310LOT42<GS>17261231', value: '(01)09501101530003(10)LOT42(17)261231', valid: true, fromScan: { aim: ']C1' }, gs1: { aim: ']C1', data: '010950110153000310LOT42' + GS + '17261231' } }`.
- `buildEntry('0109501101530003', 'gs1128', L('gs1128')).fromScan` strictly equals `{}`.
- `'fromScan' in buildEntry('(01)09501101530003', 'gs1128', L('gs1128'))` is false.
- `buildEntry('09501101530003', 'gs1qr', L('gs1qr', true))` strictly equals
  `{ raw: '09501101530003', value: '09501101530003', format: 'gs1qr', options: { ecc: 'M', lax: true }, valid: false, message: 'No GS1 AI starts at "09501101…"; GS1 data starts with an AI, such as 01 before a GTIN' }`.
- `buildEntry(']C1 0109501101530003 10LOT42', 'gs1128', L('gs1128'))` matches
  `{ value: '(01)09501101530003(10)LOT42', valid: true }`.
- For each of the eleven GS1 ids, `buildEntry('0109501101530003', id, L(id)).valid` is true.
- A dropped separator, the spec's _Edge cases_:
  `buildEntry('010950110153000310LOT4217261231', 'gs1128', L('gs1128'))` matches
  `{ valid: true, value: '(01)09501101530003(10)LOT4217261231' }`.
- Review Focus 1: ``parseCodeList(`]C10109501101530003${GS}\r\n10LOT42${GS}0109501101530003\r\n`, 'gs1128')``
  gives two valid entries with values `(01)09501101530003` and `(10)LOT42(01)09501101530003`.
- Round trip, the spec's _Testing_ case, as an `it.each` of `[id, sample, lax]` where
  `S = '(01)09501101530003(17)261231(10)LOT42'`, `S2 = '(01)09501101530003(10)LOT42(17)261231'`
  (it carries a GS), `G = '(01)09501101530003'`, `G13 = '(01)0950110153000'`,
  `E = '(01)09501101530003(3103)000123'`, `BAD = '(01)09501101530004'`:
  S and S2 on `gs1128`, `gs1datamatrix`, `gs1qr`, `gs1dotcode`; G and G13 on the five GTIN-only
  members; E and S2 on `databarexpanded` and `databarexpandedstacked`; BAD with lax on `gs1128`
  and `databarexpanded`. Body:

```ts
const first = buildEntry(sample, id, L(id, lax));
expect(first.valid).toBe(true);
const scan = first.gs1!.aim + first.gs1!.data;
for (const raw of [scan, scan.replaceAll(GS, '␝'), scan.replaceAll(GS, '<GS>')]) {
	const again = buildEntry(raw, id, L(id, lax));
	expect(again.gs1).toEqual(first.gs1);
	expect(renderBarcodeSvg(again).outerHTML).toBe(renderBarcodeSvg(first).outerHTML);
}
```

In `src/lib/shareUrl.test.ts` (Review Focus 2), one `it`: with
`` const code = `]C110LOT42${'\u001d'}0109501101530003${'\u001d'}` ``,
`decodeShareUrl(new URL('http://localhost/' + encodeShareUrl([code], { ...DEFAULT_SETTINGS, format: 'gs1128' }))).codes`
equals `[code]`, and for `const row = { payload: code, format: 'gs1128' as const, ecc: '', lax: false }`,
`decodeShareUrl(new URL('http://localhost/' + encodeRowsShareUrl([row], DEFAULT_SETTINGS))).records`
equals `[row]`.

In `src/routes/play/page.test.ts` (Review Focus 5):

```ts
it('plays a raw GS1 code from a list link', () => {
	mockPage.url = new URL(
		'http://localhost/play#codes=%5DC110LOT42%1D0109501101530003&fmt=gs1128&seed=7'
	);
	const { container } = render(PlayPage);
	expect(container.querySelectorAll('.barcode-item').length).toBe(2); // 1 valid × 2 copies
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/codes.test.ts src/routes/play/page.test.ts`
Expected: FAIL: raw input is refused with `AIs must start with '('` or the 13-or-14-digits
message; the play page redirects. (The share-link test may already pass: it pins the codec.)

- [ ] **Step 3: Implement**

`types.ts`: the two comment-carrying lines as written in _Where it runs_. `codes.ts`: the branch as
written in _Where it runs_; its first three lines stay; the doc comment gains "GS1 formats then
pass through `readGs1Input`: raw scan data is re-bracketed into `value` and marked `fromScan`; a
read-step refusal returns an invalid entry with its message."

- [ ] **Step 4: Rewrite the two tests this turns red**

- `src/lib/verdict.test.ts:77-94`: the it.each feeds `'(01)09501101530003(10'` instead of
  `'0109501101530003'` and is titled `refuses an unclosed bracket on %s with the carrier’s message`;
  the six carriers whose message was `"AIs must start with '('"` now expect `"AIs must end with ')'"`,
  the five GTIN-only messages stay, and the `own` column stays (Task 6 removes it).
- `src/lib/components/ValidationList.test.ts:195`: `list('0109501101530003', false)` becomes
  `list('(01)09501101530003(10', false)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, with the new tests added to the 529.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/codes.ts src/lib/codes.test.ts src/lib/shareUrl.test.ts src/routes/play/page.test.ts src/lib/verdict.test.ts src/lib/components/ValidationList.test.ts
git commit -m "feat: read raw GS1 scan data into entries"
```

---

### Task 6: Verdict, hints and placeholder

**Files:**

- Modify: `src/lib/verdict.ts` (whole file), `src/routes/+page.svelte:74`
- Test: `src/lib/verdict.test.ts:72-75`, `:77-94`, `:111-126`, append;
  `src/routes/page.test.ts:839-841`

**Interfaces:**

- Consumes: `GS1_AIMS` (Task 4), `CodeEntry.fromScan` (Task 5).
- Produces: the verdict table of _Verdict text_; `GS1_HINT` and `LAX_NOTE` as written in
  _Hints_. Exported names are unchanged.

- [ ] **Step 1: Write the failing tests**

In `src/lib/verdict.test.ts`:

- `hint texts`: `GS1_HINT` and `LAX_NOTE` pinned to the spec's _Hints_ text, pasted.
- The it.each from Task 5 drops its `own` column: with the setting on, all eleven expect
  `` ` ✗ ${message} (the validation setting cannot override this)` ``.
- `:72-75`: the GS1 QR level H too-long verdict (setting on) expects
  `' ✗ too long for GS1 QR Code (level H) (the validation setting cannot override this)'`.
- New `it('adds the override suffix to every refused GS1 code under the setting, and to nothing else')`:
  - `verdict('(', 'gs1128', true)` → `' ✗ invalid (the validation setting cannot override this)'`
  - `verdict('09501101530003', 'gs1128', true)` → `' ✗ No GS1 AI starts at "09501101…"; GS1 data starts with an AI, such as 01 before a GTIN (the validation setting cannot override this)'`
  - `verdict('(01)09501101530003(10)A(B)C', 'databaromni', true)` →
    `' ✗ GS1 DataBar Omnidirectional must be 13 or 14 digits (parentheses inside a value are not supported) (the validation setting cannot override this)'`
  - `verdict('x'.repeat(2000), 'qr', true, 'H')` → `' ✗ too long for QR Code (level H)'`;
    `verdict('bad', 'upc', true)` → `' ✗ invalid'`
- New `it.each` of the spec's worked raw examples (setting off): every input in _Verdict text_'s
  worked examples that does not start with `(`, from GS1-128 `]C101095011015300031726123110LOT42`
  to GS1-128 `]C1`, on the format named there, each expecting the verdict printed there.
- New `it('notes scan data from another carrier, and only then')`:
  - `verdict(']Q30109501101530004', 'gs1128', true)` →
    `' ⚠ rendered anyway · AI 01: Bad checksum · 134 modules wide · 16 characters · scan data from GS1 QR Code (]Q3) → ]C1 0109501101530004'`
  - for `[aim, name]` of `[[']C1', 'GS1-128'], [']e0', 'GS1 DataBar'], [']d2', 'GS1 DataMatrix'], [']J1', 'GS1 DotCode']]`,
    ``verdict(`${aim}0109501101530003`, 'gs1qr')`` contains
    `` ` · scan data from ${name} (${aim}) → ]Q3 ` ``
  - `verdict(']Q30109501101530003', 'gs1qr')` and `verdict('0109501101530003', 'gs1qr')` do not
    contain `scan data from`.

In `src/routes/page.test.ts:839-841`, the placeholder expects
`'Paste GS1 element strings or scan data — one per line'`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/verdict.test.ts src/routes/page.test.ts`
Expected: FAIL on the hints, the suffixes, the note and the placeholder.

- [ ] **Step 3: Implement**

In `verdict.ts`: `const descriptorOf = (entry: CodeEntry) => FORMAT_BY_ID.get(entry.format);`
replaces the four lookups (handoff F3). `override` becomes
`entry.options.lax === true ? ' (the validation setting cannot override this)' : ''` (handoff
Q2; `isGs1` stays imported for `gs1Line`). The too-long and plain-invalid branches of
`verdictText` end with `override(entry)`; the message branch keeps
`${parentheses(entry)}${override(entry)}`. `gs1Line` adds, as the last clause before `→`,
`` ` · scan data from ${GS1_AIMS.get(aim)} (${aim})` `` when `entry.fromScan?.aim` is set and
differs from `gs1.aim`. `GS1_HINT` and `LAX_NOTE` are the spec's text. `verdictText` stays a
single expression. In `+page.svelte:74` the GS1 placeholder becomes
`'Paste GS1 element strings or scan data — one per line'`.

- [ ] **Step 4: Run the tests and the greps**

Run: `npm test && grep -c "FORMAT_BY_ID.get" src/lib/verdict.ts; grep -n "gtinCheck === 'own'" src/lib/verdict.ts; echo "grep exit $?"`
Expected: PASS; `1`; no line, then `grep exit 1`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/verdict.ts src/lib/verdict.test.ts src/routes/+page.svelte src/routes/page.test.ts
git commit -m "feat: note raw scan data in the verdict and make the override suffix uniform"
```

---

### Task 7: The breakdown disclosure — `Gs1Breakdown.svelte`

**Files:**

- Create: `src/lib/components/Gs1Breakdown.svelte`
- Test: `src/lib/components/Gs1Breakdown.test.ts`

**Interfaces:**

- Consumes: `breakdown` (Task 4).
- Produces: a component with props `{ data: string; label?: string; today?: Date }` whose root
  is `<details class="gs1-breakdown">`, markup as written in _Display_.

- [ ] **Step 1: Write the failing tests**

`src/lib/components/Gs1Breakdown.test.ts`, with `const T = new Date(2026, 10, 3)`,
`const GS = '\u001d'` and `const show = (props) => render(Gs1Breakdown, props).container`:

- ``show({ data: `010950110153000310LOT42${GS}17261231`, today: T })``: the `details` is not
  `open`; `summary` text `3 AIs` and no `aria-label` attribute; the body rows, as
  `[...tr.children].map((c) => c.textContent)`, are
  `[['(01)', 'GTIN', '09501101530003'], ['(10)', 'BATCH/LOT', 'LOT42'], ['(17)', 'USE BY or EXPIRY', '2026-12-31']]`;
  each row's first cell is a `th` with `scope="row"`; the three `thead th` hold
  `span.visually-hidden` with `AI`, `Name`, `Value`; `container.querySelector('p')` is null.
- With `label: 'Code 3 breakdown'`, the summary's `aria-label` is `Code 3 breakdown: 3 AIs` and
  its text is still `3 AIs`.
- `data: '0109501101530003'` → summary `1 AI`.
- `data: '01095011015300039Z'` → summary `1 AI, then reading stops`; the last row is one `td`
  with `colspan="3"` and text
  `⚠ Reading stops here: No GS1 AI starts at "9Z" after (01). A receiving system may stop here too.`
- `data: '(01)0950110153000('` → summary `No readable AIs`; the body holds only the stop row,
  naming `The bracketed string could not be split into AIs`.
- `data: '8110106141416543213500110000310123196000'` → the name cell is `—`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/Gs1Breakdown.test.ts`
Expected: FAIL, the component does not exist.

- [ ] **Step 3: Write the component**

_Display_ as written. `const now = new Date();` in the script and
`const result = $derived(breakdown(data, today ?? now));`. Summary: `1 AI` / `N AIs`; with a
stop, that count followed by `, then reading stops`, or `No readable AIs` when there is no line.
Scoped CSS: `.gs1-breakdown { color: CanvasText; }`; `table { width: 100%; border-collapse: collapse; }`;
cells `overflow-wrap: anywhere; text-align: start; vertical-align: top`; `thead th { padding: 0; border: 0; }`;
a clip-based `.visually-hidden` (`position: absolute; width: 1px; height: 1px; margin: -1px;
overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; padding: 0;`). No `<p>`
in the component: the row editor's hint test counts `p` elements.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/Gs1Breakdown.test.ts && npm run check`
Expected: PASS; 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Gs1Breakdown.svelte src/lib/components/Gs1Breakdown.test.ts
git commit -m "feat: add the GS1 AI breakdown disclosure"
```

---

### Task 8: The breakdown in the list and the editor, raw text on screen, and F1

**Files:**

- Modify: `src/lib/components/ValidationList.svelte` (whole), `src/lib/components/RowEditor.svelte:1-12`,
  `:62-64`, after `:146` (end of `.row-controls`), `:153-162` (hints)
- Test: `src/lib/components/ValidationList.test.ts:184-186` (rewrite), append;
  `src/lib/components/RowEditor.svelte.test.ts` (append); `src/routes/page.test.ts` (append to
  `describe('setup page: GS1 validation setting')`)

**Interfaces:**

- Consumes: `Gs1Breakdown` (Task 7), `displayData` (`src/lib/gs1.ts`).
- Produces: no new exports.

- [ ] **Step 1: Write the failing tests**

`ValidationList.test.ts`, in `describe('ValidationList GS1 rows')`, with
`vi.setSystemTime(new Date(2026, 10, 3, 12))` in a `beforeEach` and `vi.useRealTimers()` in an
`afterEach`:

- `:184-186` asserts `items[1].querySelector('.raw')!.textContent` is `(01)09501101530004` and
  `items[1].querySelector('.verdict')!.textContent` is the same verdict string as before, instead
  of the whole `li` text.
- ``list(`10LOT42${GS}0109501101530003\n10LOT42<GS>0109501101530003`, false)``: the two `.raw`
  texts are `10LOT42␝0109501101530003` and `10LOT42<GS>0109501101530003`.
- ``list(`${S}\n(01)09501101530004\nbad`, true)``: the summaries' `aria-label`s are
  `['Code 1 breakdown: 3 AIs', 'Code 2 breakdown: 1 AI']`; the third `li` has no `details`; the
  first table's rows include `['(17)', 'USE BY or EXPIRY', '2026-12-31']`.
- Review Focus 4: `render(ValidationList, { entries: parseCodeList('(01)0950110153000', 'databaromni') })`:
  the first body row's cells are `['(01)', 'GTIN', '09501101530003']`.

`RowEditor.svelte.test.ts`, appended `describe('RowEditor GS1 breakdown')` with the same clock:

- ``mount(deck(`gs1128_${S}`, 'upc_036000291452', 'gs1qr_]C1010950110153000310LOT42<GS>17261231'))``:
  rows 1 and 3 hold one `details.gs1-breakdown` each, with summary `aria-label`s
  `Code 1 breakdown: 3 AIs` and `Code 3 breakdown: 3 AIs`; row 2 holds none;
  `at(1, '.row-verdict')!.querySelector('details')` is null; and
  `at(1, '.row-controls')!.nextElementSibling` is row 1's `details`.
- Open stays open: mount ``deck(`gs1128_${S}`)``, keep `const d = at(1, 'details') as HTMLDetailsElement`,
  set `d.open = true`, `await fireEvent.input(at(1, '.row-payload')!, { target: { value: '(01)09501101530003' } })`,
  `await tick()`; then `at(1, 'details')` is `d`, `d.open` is true and its summary text is `1 AI`.

`page.test.ts`, in `describe('setup page: GS1 validation setting')` (Review Focus 2), two `it`s:

- ``open(list(`]C110LOT42${'\u001d'}0109501101530003`))``: `.validation-list .raw` text is
  `]C110LOT42␝0109501101530003` and `.validation-list .verdict` text is
  `' ✓ · 222 modules wide · 23 characters → ]C1 10LOT42␝0109501101530003'`.
- `open('http://localhost/#r1=gs1128_10LOT42%1D0109501101530003&seed=0')`: the `.row-payload`
  value is `'10LOT42\u001d0109501101530003'` and `.row-verdict` text is the same verdict.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/ValidationList.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts`
Expected: FAIL: no `details`, and `.raw` shows the GS character itself.

- [ ] **Step 3: Implement**

`ValidationList.svelte`, per _Placement_: `.raw` shows `{displayData(entry.raw)}`; after the
verdict span, `{#if entry.gs1}<div class="breakdown"><Gs1Breakdown data={entry.gs1.data} label="Code {i + 1} breakdown" /></div>{/if}`;
CSS `.validation-list .breakdown { flex-basis: 100%; min-width: 0; }` and
`.validation-list:has(:global(details[open])) { max-height: 60vh; }` (the `:global` is needed
because `details` belongs to the child component; Svelte 5.56 compiles it without warning).

`RowEditor.svelte` (handoff F1 and _Placement_):
`const entries = $derived(rows.map((row) => rowEntry(row)));` in the script; in the each block
`{@const entry = entries[i]}`; the two hint conditions become `entries.some((e) => e?.gs1)` and
`entries.some((e) => e?.facts?.dense)`; after the `.row-controls` div, inside `li.row`,
`{#if entry?.gs1}<Gs1Breakdown data={entry.gs1.data} label="Code {i + 1} breakdown" />{/if}`.

- [ ] **Step 4: Run the tests and the grep**

Run: `npm test && grep -c "rowEntry(" src/lib/components/RowEditor.svelte`
Expected: PASS; `1`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ValidationList.svelte src/lib/components/RowEditor.svelte src/lib/components/ValidationList.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts
git commit -m "feat: show the AI breakdown in the list and the row editor"
```

---

### Task 9: README, handoff and verification that fails closed

**Files:**

- Modify: `README.md:95-131` (`### GS1`), `:172-182` (Development), `:199-201` (License)
- Modify: `docs/superpowers/handoffs/2026-11-03-gs1-series-handoff.md` (header status, Summary
  rows T4, Q2, F1, F3, their `**Status:**` lines, the decision log)
- Modify: this plan's verification record (below)

**Interfaces:**

- Consumes: the finished behaviour of Tasks 1 to 8. No code, no tests.

- [ ] **Step 1: Apply the README changes**

In `### GS1`, `They take bracketed element strings, one code per line:` becomes
`They take bracketed element strings, one code per line, or what a scanner sends (below):`.
After the paragraph ending `linear ones too, carry no caption: the list shows the data.`, insert:

```markdown
They also take scanner output. Paste `]C1010950110153000310LOT42<GS>17261231` and the list reads
it as `(01)09501101530003(10)LOT42(17)261231`. The symbology identifier (`]C1`, `]e0`, `]d2`,
`]Q3` or `]J1`) is optional; one that names another carrier still draws in the chosen format and
the verdict notes where the data came from, so a scan from one carrier regenerates on any other.
Write a GS separator as the character itself, `␝`, `<GS>`, `\x1d` or `\u001d`. Every code that
does not start with `(` is read this way, so an unbracketed code kept as a deliberate failing
case may now draw. A keyboard-wedge scanner that drops separators makes a variable-length value
swallow what follows; set it to send `<GS>`.

Under each drawn GS1 code a closed disclosure lists its AIs with GS1's names and lightly decoded
values: dates as `2026-12-31`, times as `14:30`, and weights, measures and amounts with their
decimal point. Where the data cannot be split into AIs, it shows where reading stops.
```

In the render-anyway paragraph, `The box cannot help with missing brackets or a code too long
for its symbol; GS1 DataBar` becomes `Three kinds of failure can never be overridden: malformed
brackets, scan data that cannot be read, and a code too long for its symbol. GS1 DataBar`.

Development's code block gains, after `npm run preview`:
`npm run gs1-ais  # regenerate src/lib/gs1-ais.json from the pinned GS1 Syntax Dictionary`.
License gains, after the MIT line, a blank line and:
`The AI table in src/lib/gs1-ais.json is generated from GS1's [Barcode Syntax Dictionary](https://github.com/gs1/gs1-syntax-dictionary), release 2026-01-27, under the Apache License 2.0; see [LICENSES/gs1-syntax-dictionary-Apache-2.0.txt](LICENSES/gs1-syntax-dictionary-Apache-2.0.txt).`
(wrapped at 100 by Prettier). Before each change, check the current text matches; if not, stop
and report.

- [ ] **Step 2: Verify the README**

Run: `git grep -n -F -e '<GS>17261231' -e 'npm run gs1-ais' -e 'Barcode Syntax Dictionary' -e 'can never be overridden' -- README.md`
Expected: at least one line for each string.

- [ ] **Step 3: Close the handoff items**

In the handoff, the `**Status:**` lines of T4, Q2, F1 and F3 become
`☑ done DATE on feat/gs1-raw-scan-data (spec 2's implementation)`, DATE being the day of this
step; their Summary rows' last column becomes `✅`; the header's Status line counts four fewer
open items; the decision log gains one row in its five-column layout:
`| T4, Q2, F1, F3 | Implemented with spec 2 | plan 2026-11-03-gs1-raw-scan-data.md | implementer | DATE |`.
Item text is otherwise unchanged.

- [ ] **Step 4: Run the automated rows (1 and 2) and record them**

Row 1: `node --version`, `npm run check`, `npm test`, `npm run lint`, `npm run build`. PASS only
when the four npm commands exit 0; record svelte-check's error and warning counts, Vitest's
`Test Files` and `Tests` counts (29 and 529 before Task 1), lint and build results, the Node
version.
Row 2: on a clean checkout of the branch, `npm run gs1-ais && git status --short` prints nothing;
with `SHA256` changed by one character it exits non-zero and `git status --short` still prints
nothing (restore the constant). A failed fetch leaves row 2 UNVERIFIED.
Rows 8 and 10 are "agent or person": run them only with a real Firefox and Chromium; otherwise
leave them UNVERIFIED. Unit tests do not count toward them.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/handoffs/2026-11-03-gs1-series-handoff.md docs/superpowers/plans/2026-11-03-gs1-raw-scan-data.md
git commit -m "docs: document raw GS1 scan data and the AI breakdown, and record the automated checks"
```

- [ ] **Step 6: Human rows**

Rows 3 to 10 need a person, a scanner or two browsers. The implementer leaves them UNVERIFIED and
lists them in the task report. A person builds with `npm run build`, serves with
`npm run preview`, opens `http://localhost:4173/scandible/`, runs each row against the spec's
_Verification that fails closed_ row of the same number, fills in the record, and commits it with
`git commit -m "docs: record GS1 raw scan data verification results"`.

#### Verification record

Status is one of `UNVERIFIED`, `PASS` and `FAILED`. Every row starts UNVERIFIED and changes only
when its pass rule is met and its evidence is entered. A skipped row, a checker that dies or
returns nothing, or a scan recorded without the scanner model, firmware, read mode and AIM/GS
output configuration stays UNVERIFIED, never PASS. Rows are split per browser (`-c` Chromium,
`-f` Firefox) and row 5 per carrier; a spec row passes only when every part passes.

| #    | Check                                                                 | Status     | Device / browser              | Output / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | --------------------------------------------------------------------- | ---------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Automated checks                                                      | PASS       | Node v24.17.0, Linux          | 2026-11-04: `npm run check` exit 0 (svelte-check 403 files, 0 errors, 0 warnings); `npm test` exit 0 (Test Files 31 passed (31), Tests 713 passed (713)); `npm run lint` exit 0 (Prettier clean, ESLint clean); `npm run build` exit 0 (wrote site to dist).                                                                                                                                                                                                               |
| 2    | Generator reproducible; a wrong hash exits non-zero, no write         | PASS       | Node v24.17.0, Linux, network | 2026-11-04: on a clean tree `npm run gs1-ais` exit 0 and `git status --short` printed nothing (sha256 of src/lib/gs1-ais.json b38dde5e2fd4326e7c543f48fed7d9532a63ba040f051251f7bec4b0f289d70e). With SHA256 changed from 6461... to 7461... it exited 1 ("hash mismatch ... got 6461ece7..."); `git status --short -- src/lib/gs1-ais.json` printed nothing and the file hash was unchanged; constant restored with `git checkout`, `git status --short` printed nothing. |
| 3-c  | Chromium: a real GS pasted into the list and into a row               | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3-f  | Firefox: a real GS pasted into the list and into a row                | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 4    | Keyboard-wedge scan with `<GS>` and identifier regenerates            | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-a  | Round trip on hardware: GS1-128                                       | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-b  | Round trip: DataBar Omnidirectional                                   | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-c  | Round trip: DataBar Truncated                                         | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-d  | Round trip: DataBar Stacked                                           | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-e  | Round trip: DataBar Stacked Omnidirectional                           | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-f  | Round trip: DataBar Limited                                           | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-g  | Round trip: DataBar Expanded                                          | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-h  | Round trip: DataBar Expanded Stacked                                  | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-i  | Round trip: GS1 DataMatrix                                            | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-j  | Round trip: GS1 QR Code                                               | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5-k  | Round trip: GS1 DotCode                                               | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6    | A GS1 DataMatrix scan in a GS1-128 row: note, then `]C1` read         | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 7    | Screen reader: summary, table headers, description, tab order         | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 8-c  | Chromium: a share link with a GS round-trips, rows and list           | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 8-f  | Firefox: a share link with a GS round-trips, rows and list            | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 9    | Dropped separators show the swallowed value                           | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 10-c | Chromium: open breakdown raises the cap; no sideways scroll at 360 px | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 10-f | Firefox: open breakdown raises the cap; no sideways scroll at 360 px  | UNVERIFIED |                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

The final report lists every UNVERIFIED and FAILED row and never reports one as passed.

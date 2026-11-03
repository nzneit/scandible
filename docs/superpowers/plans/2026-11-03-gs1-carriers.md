# GS1 Carriers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add eleven GS1 carrier formats that take bracketed element strings, validate them with
BWIPP's Application Identifier linter, show each valid row's scan data in the verdict, and offer an
opt-in `lax` setting that renders data failing validation.

**Architecture:** The registry widens `BwipDescriptor` (shape, quiet zone, GS1 carrier facts) and
adds eleven descriptors in one `GS1` group. The bwip-js engine gains a strict-then-lax encode and
surfaces BWIPP's messages for GS1 formats only; a new pure module `src/lib/gs1.ts` derives the
scan data. The `lax` flag threads through `SymbolOptions`, `Settings`, `ListOptions`, `Row`, the
share URL and both editors exactly as `ecc` does today.

**Tech Stack:** SvelteKit 2.70 + Svelte 5.56 (runes), TypeScript 5.9 strict with `noUnusedLocals`
and `noUnusedParameters`, bwip-js 4.11.4 (its named GS1 encoders), Vitest 3.2 +
@testing-library/svelte 5.4 on jsdom 24. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-gs1-carriers-design.md`, with its measurements in
`docs/research/2026-11-03-gs1-encoder-measurements.md`. When a step names a spec section, read
that section before writing the code. "As written" means the spec's code block or copy is the
rule: copy its logic, names and strings, then let Prettier format it. Where this plan and the spec
disagree, the spec wins; report the disagreement.

## Global Constraints

- Every existing format renders and validates exactly as today. The four 2D file snapshots do not
  change; `encodeShareUrl` and `encodeRowsShareUrl` are byte-identical for every non-GS1 list;
  existing assertions change only where the spec's _Testing_ section lists them under "Fixtures
  and pinned expectations that change". Baseline at `5591f2e`: 27 test files, 411 tests, Node
  v24.17.0.
- Descriptors stay data-only. The eleven GS1 descriptors are the only ones that define
  `normalize`; CODE39 never does.
- `lax` is canonical wherever it is stored: true only on a GS1 format, through `canonicalLax`,
  in `Settings.lax`, `Row.lax`, the `lax=1` parameter and the `-lax` record token. `lax` appears in
  resolved `SymbolOptions` only for GS1 formats, so non-GS1 options objects equal today's.
- Strict first, then lax. A row that passes the strict encode never changes under the toggle; a
  lax row is encoded with `dontlint: true` only after the strict encode threw.
- BWIPP's message text reaches the verdict verbatim and only for GS1 formats; the four plain 2D
  formats keep ` ✗ invalid`. Tests pin the text after `bwipp.<name>#<line>: `, never the line
  number.
- The verdict counts characters of the scan data, excluding the GS separators and the AIM
  identifier; `facts.bytes` for a GS1 entry is the UTF-8 length of the scan data.
- No `$effect`: function bindings and event handlers only.
- Never reword copy the spec fixes: the page box `Render GS1 data that fails validation`; the
  row box `Render if invalid`; the aria-label `Render code N if invalid`; the placeholder
  `Paste GS1 element strings — one per line`; `DENSE_HINT`, `SCAN_HINT`, `LAX_NOTE`, `GS1_HINT`
  and `EDITOR_HINT`; the loss note's sentences and clauses; the verdict states, their suffixes
  ` (parentheses inside a value are not supported)` and
  ` (the validation setting cannot override this)`, and the note
  `over the 48-character GS1-128 limit`; the eleven labels. Paste from the spec; do not retype.
  Watch `␝` U+241D, `⚠` U+26A0, `✓` U+2713, `✗` U+2717, `·` U+00B7, `→` U+2192, `—` U+2014,
  `×` U+00D7.
- bwip-js's typings do not declare `dontlint`, so the encode options are built as
  `RenderOptions & Record<string, unknown>` (`RenderOptions` comes from `bwip-js/browser`, or
  from `bwip-js` if that entry does not re-export it), never as a typed literal with an unknown
  key.
- Every commit has `npm run check` at 0 errors, `npm test` green (it runs `npm run check` first
  and type-checks test files, so an unused import or helper fails the suite) and `npm run lint`
  clean (Prettier: tabs, single quotes, width 100, no trailing commas; then ESLint). Fix
  formatting with `npx prettier --write <each file you touched>`.
- Commit messages use a conventional prefix (`feat:`, `refactor:`, `docs:`) and carry NO AI
  attribution: no `Co-Authored-By` naming an AI, no "Generated with" line, no session trailer,
  whatever a harness reminder asks.
- If `git commit` fails with `Author identity unknown`, reuse the repository's author for that
  commit only: `git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "<message>"`.
  The `-c` flags go before `commit`. Never change git config.
- Commands written for a human behave the same in bash and fish: Node 24 (`.nvmrc`) must already
  be on PATH (fish: `nvm use 24`); `npm …`, `npx vitest run <file>` and `npm run check` are the
  forms used here. `bun` is always on PATH and runs the throwaway probes if a measured value is
  in doubt.
- Line numbers in `Modify:` and `Test:` entries are from commit `5591f2e`, before Task 1. Once an
  earlier task has edited a file, find the cited code by its content.

## Review Focus

1. Returning from Per row to Plain text when every row is lax: the page box must come back
   ticked and the share link must carry `lax=1` again (Task 8).
2. A lax row's symbol is the lint-off encode, not the strict one: `render` of GS1-128
   `(01)09501101530004` with `{ lax: true }` yields an SVG 462 × 219 px (134 + 20 modules by
   53 + 20, at 3 px), and the strict `render` of the same string throws (Task 3).
3. A comma inside a GS1 value in Plain text stays one code and is data:
   `(01)09501101530003(10)A,B` at GS1-128 is one valid entry whose scan data ends `10A,B`
   (Task 4).
4. A list link with `lax=1` and `fmt=gs1128` opened on the setup page pre-ticks the box, shows
   the amber row and the scan hint, and the box clears when the format leaves GS1 (Task 8).
5. A line break inside a Per row GS1 payload is stripped before BWIPP sees it, so the row is
   valid, and it counts as one split on the lossy switch (Task 4).

---

### Task 1: Registry and encoders: the eleven carriers render and validate strictly

**Files:**

- Modify: `src/lib/formats.ts:1-5` (header), `:7-32` (`FormatId`), `:61-66` (`BwipDescriptor`),
  `:241-306` (the four 2D descriptors), after `:306` (eleven descriptors), after `:340`
  (`isGs1`, `canonicalLax`)
- Modify: `src/lib/engines/bwipjs.ts:1` (imports), `:6-19` (`ENCODERS`, `ECC_OPTIONS`), `:21`
  (`QUIET_ZONE_PX`, removed), `:84-112` (`tryEncode`), `:114-119` (`summary`), `:136-148`
  (`render`)
- Modify: `src/lib/items.ts:24-26`
- Test: `src/lib/formats.test.ts:4-14` (imports), `:22-40`, `:64-71`, `:171-175`, append;
  `src/lib/engines/bwipjs.test.ts:4` (import `SymbolFacts` is already there), append;
  `src/lib/items.test.ts` append; `src/lib/components/RowEditor.svelte.test.ts:67-76`;
  `src/routes/page.test.ts:215-219`
- Create: eleven snapshots `src/lib/engines/__snapshots__/bwipjs.<id>.svg` (written by the
  first test run)

**Interfaces:**

- Consumes: nothing new.
- Produces, in `src/lib/formats.ts`, the spec's _The registry_ block as written: `FormatId`
  gains the eleven members in table order; `BwipEncoderId`; `Gs1Carrier { aim: string; gtinCheck?: 'own' | 'implied' }`;
  `BwipDescriptor { engine: 'bwipjs'; bcid: BwipEncoderId; shape: 'linear' | '2d'; gs1?: Gs1Carrier; quietZone: number; modulePx; moduleOffsetPx?; denseAbove: number; heightMm?: number; maxChars?: number }`;
  `export function isGs1(d: FormatDescriptor | undefined): d is BwipDescriptor & { gs1: Gs1Carrier }`;
  `export function canonicalLax(format: FormatId, lax: boolean): boolean`. In the engine,
  `check` reports linear symbols as `${cols} modules wide` and `render` draws a `'linear'`
  descriptor at three times its viewBox.

- [ ] **Step 1: Write the failing tests**

In `src/lib/formats.test.ts`, the import list gains `canonicalLax` and `isGs1` (alphabetical,
before `isEccChoice`). Hoist a module-level constant after `EXCLUDED`:

```ts
const GS1_IDS: FormatId[] = [
	'gs1128',
	'databaromni',
	'databartruncated',
	'databarstacked',
	'databarstackedomni',
	'databarlimited',
	'databarexpanded',
	'databarexpandedstacked',
	'gs1datamatrix',
	'gs1qr',
	'gs1dotcode'
];
```

Replace the test at `:22-40` with:

```ts
it('has 36 unique ids across eight groups in README order, 2D then GS1 last', () => {
	expect(FORMATS.length).toBe(36);
	expect(new Set(FORMATS.map((f) => f.id)).size).toBe(36);
	expect(FORMAT_GROUPS.map((g) => g.group)).toEqual([
		'CODE128',
		'EAN / UPC',
		'CODE39',
		'ITF',
		'MSI',
		'Other',
		'2D',
		'GS1'
	]);
	expect(FORMAT_GROUPS.flatMap((g) => g.formats)).toEqual([...FORMATS]);
	expect(FORMAT_GROUPS[6].formats.map((f) => f.id)).toEqual([
		'qr',
		'datamatrix',
		'pdf417',
		'aztec'
	]);
	expect(FORMAT_GROUPS[7].formats.map((f) => f.id)).toEqual(GS1_IDS);
});
```

Replace the test at `:64-71` with:

```ts
it('defines normalize on every GS1 descriptor and on no other (the seam stays data-only)', () => {
	for (const f of FORMATS) {
		if (f.engine === 'bwipjs' && f.gs1) expect(f.normalize?.(' (01) 0950 '), f.id).toBe('(01)0950');
		else expect(f.normalize, f.id).toBeUndefined();
	}
	for (const f of JSB) {
		expect(f.renderOptions, f.id).toBeUndefined();
	}
});
```

At `:171-175`, the title becomes `declares ecc only on qr, pdf417, aztec and gs1qr, with the spec copy in order`,
the first expectation becomes `['qr', 'pdf417', 'aztec', 'gs1qr']`, and add after it
`expect(row('gs1qr').ecc).toBe(row('qr').ecc);` (one shared object). Append a new block:

```ts
describe('GS1 rows', () => {
	const bw = (id: FormatId) => {
		const d = FORMAT_BY_ID.get(id);
		if (d?.engine !== 'bwipjs') throw new Error(`${id} is not a bwip-js row`);
		return d;
	};

	it('names the eleven encoders and labels in table order', () => {
		expect(GS1_IDS.map((id) => [bw(id).bcid, bw(id).label])).toEqual([
			['gs1_128', 'GS1-128'],
			['databaromni', 'GS1 DataBar Omnidirectional'],
			['databartruncated', 'GS1 DataBar Truncated'],
			['databarstacked', 'GS1 DataBar Stacked'],
			['databarstackedomni', 'GS1 DataBar Stacked Omnidirectional'],
			['databarlimited', 'GS1 DataBar Limited'],
			['databarexpanded', 'GS1 DataBar Expanded'],
			['databarexpandedstacked', 'GS1 DataBar Expanded Stacked'],
			['gs1datamatrix', 'GS1 DataMatrix'],
			['gs1qrcode', 'GS1 QR Code'],
			['gs1dotcode', 'GS1 DotCode']
		]);
	});

	it('carries the AIM identifier and the GTIN rule of each carrier', () => {
		expect(GS1_IDS.map((id) => [bw(id).gs1?.aim, bw(id).gs1?.gtinCheck])).toEqual([
			[']C1', undefined],
			[']e0', 'own'],
			[']e0', 'own'],
			[']e0', 'own'],
			[']e0', 'own'],
			[']e0', 'own'],
			[']e0', 'implied'],
			[']e0', 'implied'],
			[']d2', undefined],
			[']Q3', undefined],
			[']J1', undefined]
		]);
	});

	it('shapes eight linear carriers (1 px, quiet zone 10, dense above 300) and three 2D ones (2 px, 4, 100)', () => {
		const geometry = (id: FormatId) => {
			const d = bw(id);
			expect(d).toMatchObject({ engine: 'bwipjs', group: 'GS1', numeric: false });
			return [d.shape, d.modulePx.x, d.modulePx.y, d.quietZone, d.denseAbove].join(' ');
		};
		expect(GS1_IDS.map(geometry)).toEqual([
			...Array<string>(8).fill('linear 1 1 10 300'),
			...Array<string>(3).fill('2d 2 2 4 100')
		]);
	});

	it('sets the GS1-128 height and ceiling and the DotCode offset, and nothing else of the kind', () => {
		const withField = <K extends 'heightMm' | 'maxChars' | 'moduleOffsetPx'>(key: K) =>
			FORMATS.flatMap((f) =>
				f.engine === 'bwipjs' && f[key] !== undefined ? [[f.id, f[key]]] : []
			);
		expect(withField('heightMm')).toEqual([['gs1128', 18.3]]);
		expect(withField('maxChars')).toEqual([['gs1128', 48]]);
		expect(withField('moduleOffsetPx')).toEqual([['gs1dotcode', { x: 1, y: 1 }]]);
	});

	it('gives the four 2D rows their shape and quiet zone', () => {
		expect(
			(['qr', 'datamatrix', 'pdf417', 'aztec'] as const).map((id) => [
				bw(id).shape,
				bw(id).quietZone
			])
		).toEqual([
			['2d', 4],
			['2d', 4],
			['2d', 8],
			['2d', 4]
		]);
	});

	it('isGs1 narrows the eleven and nothing else; canonicalLax keeps lax only on them', () => {
		expect(FORMATS.filter((f) => isGs1(f)).map((f) => f.id)).toEqual(GS1_IDS);
		expect(isGs1(undefined)).toBe(false);
		expect(isGs1(FORMAT_BY_ID.get('qr'))).toBe(false);
		expect(canonicalLax('gs1128', true)).toBe(true);
		expect(canonicalLax('upc', true)).toBe(false);
		expect(canonicalLax('gs1qr', false)).toBe(false);
		expect(canonicalLax('nope' as FormatId, true)).toBe(false);
	});
});
```

In `src/lib/engines/bwipjs.test.ts`, add module-level constants after `IDS`:

```ts
const S = '(01)09501101530003(17)261231(10)LOT42';
const G = '(01)09501101530003';
const E = '(01)09501101530003(3103)000123';
/** [id, sample, cols, rows, summary], measurements §1; GS1-128 at heightMm 18.3 (53 px). */
const GS1_SIZES: [FormatId, string, number, number, string][] = [
	['gs1128', S, 255, 53, '255 modules wide'],
	['databaromni', G, 96, 34, '96 modules wide'],
	['databartruncated', G, 96, 14, '96 modules wide'],
	['databarstacked', G, 50, 13, '50 modules wide'],
	['databarstackedomni', G, 50, 69, '50 modules wide'],
	['databarlimited', G, 74, 11, '74 modules wide'],
	['databarexpanded', E, 200, 35, '200 modules wide'],
	['databarexpandedstacked', E, 102, 71, '102 modules wide'],
	['gs1datamatrix', S, 18, 18, '18×18 modules'],
	['gs1qr', S, 25, 25, '25×25 modules'],
	['gs1dotcode', S, 29, 20, '29×20 modules']
];
```

Append:

```ts
describe('GS1 carriers: measured geometry', () => {
	it.each(GS1_SIZES)('%s encodes %s at its measured size', (id, sample, cols, rows, summary) => {
		expect(check(row(id), sample, {})).toMatchObject({
			valid: true,
			facts: { cols, rows, summary, dense: false }
		});
	});

	it('rejects a wrong check digit and a missing bracket', () => {
		expect(check(row('gs1128'), '(01)09501101530004', {}).valid).toBe(false);
		expect(check(row('gs1128'), '0109501101530003', {}).valid).toBe(false);
	});

	it('scales GS1 QR Code with its level', () => {
		const cols = (ecc: string) => {
			const res = check(row('gs1qr'), S, { ecc });
			return res.valid ? res.facts?.cols : undefined;
		};
		expect(['L', 'M', 'H'].map(cols)).toEqual([21, 25, 29]);
	});

	it('renders linear carriers at 3 px per module inside a 10-module quiet zone, 2D ones at 1024 px', () => {
		const size = (el: SVGElement) =>
			[el.getAttribute('width'), el.getAttribute('height')].map(Number);
		expect(render(row('gs1128'), S, {}).getAttribute('viewBox')).toBe('0 0 275 73');
		expect(size(render(row('gs1128'), S, {}))).toEqual([825, 219]);
		expect(size(render(row('databaromni'), G, {}))).toEqual([348, 162]);
		expect(render(row('gs1qr'), S, {}).getAttribute('viewBox')).toBe('0 0 66 66');
		expect(Math.max(...size(render(row('gs1qr'), S, {})))).toBe(1024);
	});
});
```

In the `ECC_OPTIONS` block, add to the first test:
`expect(ECC_OPTIONS.gs1qrcode('H')).toEqual({ eclevel: 'H', fixedeclevel: true });` and
`expect(ECC_OPTIONS.gs1_128('H')).toEqual({});`. In the `file snapshots` block, add:

```ts
it.each(GS1_SIZES)('%s sample at the default level', async (id, sample) => {
	const d = row(id);
	const el = render(d, sample, resolveOptions(d, { format: id, ecc: '' }));
	await expect(el.outerHTML).toMatchFileSnapshot(`./__snapshots__/bwipjs.${id}.svg`);
});
```

In `src/lib/items.test.ts`, append inside `describe('buildItems')`:

```ts
it('marks linear GS1 items with --gs1128 only, and 2D GS1 items with --2d and --gs1qr', () => {
	const S = '(01)09501101530003(17)261231(10)LOT42';
	for (const i of buildItems(parseCodeList(S, 'gs1128'), DEFAULT_SETTINGS))
		expect([has(i, 'barcode-item--2d'), has(i, 'barcode-item--gs1128')]).toEqual([false, true]);
	for (const i of buildItems(parseCodeList(S, 'gs1qr'), DEFAULT_SETTINGS))
		expect([has(i, 'barcode-item--2d'), has(i, 'barcode-item--gs1qr')]).toEqual([true, true]);
});
```

In `src/lib/components/RowEditor.svelte.test.ts:67-76`, the three `[7, 25]` pairs become
`[8, 36]`. In `src/routes/page.test.ts:215-219`, the title becomes
`renders the grouped format dropdown with 36 options`, optgroups `8`, options `36`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/formats.test.ts src/lib/engines/bwipjs.test.ts src/lib/items.test.ts`
Expected: FAIL. `formats.test.ts` fails on the count (25), on `isGs1`/`canonicalLax` not being
exported, and on the eleven rows being undefined; `bwipjs.test.ts` fails in `row()` with
`gs1128 is not a bwip-js row`; `items.test.ts` fails on the same error from `parseCodeList`.

- [ ] **Step 3: Widen the registry in `src/lib/formats.ts`**

Apply the spec's _The registry_ section as written: the header comment (36 formats; "the GS1
descriptors are the only ones that do, to strip whitespace"), `FormatId`, `Gs1Carrier`,
`BwipEncoderId`, the new `BwipDescriptor` with its field comments, `shape: '2d'` and
`quietZone` (4, 4, 8, 4) on the four 2D descriptors, and the eleven descriptors appended after
`aztec` in table order with `group: 'GS1'`, `numeric: false`, `normalize: stripWhitespace`. Hoist
`const QR_ECC: EccOption = { choices: [...the four qr choices...], defaultValue: 'M' }` above
`FORMATS` and reference it from `qr` and `gs1qr`; define
`const stripWhitespace = (token: string) => token.replace(/\s+/g, '');` beside it. Add `isGs1`
and `canonicalLax` after `canonicalEcc`, as written with their comments. `DEFAULT_FORMAT` stays
`'upc'`.

- [ ] **Step 4: Teach the engine the new geometry in `src/lib/engines/bwipjs.ts`**

Import the eleven encoders and `type RenderOptions` from `bwip-js/browser`. `ENCODERS` lists
all fifteen (TypeScript then accepts `ENCODERS[d.bcid]` for every `BwipEncoderId`);
`ECC_OPTIONS` gains `gs1qrcode: (v) => ({ eclevel: v, fixedeclevel: true })` and `() => ({})`
for the other ten. Delete `QUIET_ZONE_PX` and its comment. In `tryEncode`:

```ts
const options: RenderOptions & Record<string, unknown> = {
	...extra, // first: the fixed keys below must win over anything the ecc mapping returns
	bcid: d.bcid,
	text: value,
	scale: 1,
	padding: d.quietZone * d.modulePx.x // px at scale 1 (measurements §1): the quiet zone in modules
};
if (d.heightMm !== undefined) options.height = d.heightMm;
```

and `cols = (w - (d.moduleOffsetPx?.x ?? 0)) / d.modulePx.x`, `rows` likewise with `y`.
`summary(d, cols, rows)` keeps the PDF417 column form first, then returns
`${cols} modules wide` when `d.shape === 'linear'`, else `${cols}×${rows} modules`. In
`render`, after reading `vw` and `vh`: when `d.shape === 'linear'`, set `width` to `vw * 3` and
`height` to `vh * 3` (a `const LINEAR_PX_PER_MODULE = 3; // JsBarcode's bar width` beside
`NATURAL_PX`); otherwise the existing `NATURAL_PX` scaling. Update the `check`/`render` doc
comments to say the size without padding is divided after subtracting the offset.

- [ ] **Step 5: Gate the 2D item class on shape in `src/lib/items.ts`**

Replace `:24-26` with: look the descriptor up once; when its `engine` is `'bwipjs'`, add
`barcode-item--${e.format}`, and add `barcode-item--2d` only when its `shape` is `'2d'`.

- [ ] **Step 6: Run the tests to verify they pass, and inspect the new snapshots**

Run: `npx vitest run src/lib/formats.test.ts src/lib/engines/bwipjs.test.ts src/lib/items.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts`
Expected: PASS; the first run writes eleven files under `src/lib/engines/__snapshots__/`.
Run: `git status --short src/lib/engines/__snapshots__`
Expected: eleven `??` lines and no ` M` line (the four old snapshots are byte-identical).
Run: `grep -o 'viewBox="[^"]*"' src/lib/engines/__snapshots__/bwipjs.gs1128.svg src/lib/engines/__snapshots__/bwipjs.gs1dotcode.svg`
Expected: `0 0 275 73` and `0 0 75 57` (59 + 16 by 41 + 16).

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: svelte-check `0 errors`; every test passes; lint prints no problems.

- [ ] **Step 8: Commit**

```bash
git add src/lib/formats.ts src/lib/formats.test.ts src/lib/engines/bwipjs.ts src/lib/engines/bwipjs.test.ts src/lib/engines/__snapshots__ src/lib/items.ts src/lib/items.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts
git commit -m "feat: add the eleven GS1 carrier formats"
```

---

### Task 2: Scan data: `src/lib/gs1.ts`

**Files:**

- Create: `src/lib/gs1.ts`, `src/lib/gs1.test.ts`

**Interfaces:**

- Consumes: `BwipDescriptor`, `Gs1Carrier`, `FORMAT_BY_ID`, `isGs1` (Task 1).
- Produces the spec's _Scan data_ block as written: `GS`, `GS_MARK`,
  `PREDEFINED_LENGTH_PREFIXES: ReadonlySet<string>`, `interface Gs1Data { aim: string; data: string }`,
  `parseElementString(text: string): { ai: string; value: string }[] | null`,
  `gtinCheckDigit(digits: string): string`,
  `scanData(d: BwipDescriptor & { gs1: Gs1Carrier }, value: string): Gs1Data`,
  `displayData(data: string): string`, `dataCharacters(data: string): number`.

- [ ] **Step 1: Write the failing tests**

`src/lib/gs1.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FORMAT_BY_ID, isGs1, type FormatId } from './formats';
import {
	GS,
	GS_MARK,
	PREDEFINED_LENGTH_PREFIXES,
	dataCharacters,
	displayData,
	gtinCheckDigit,
	parseElementString,
	scanData
} from './gs1';

const carrier = (id: FormatId) => {
	const d = FORMAT_BY_ID.get(id);
	if (!isGs1(d)) throw new Error(`${id} is not a GS1 carrier`);
	return d;
};
const S = '(01)09501101530003(17)261231(10)LOT42';

describe('constants', () => {
	it('lists GS1 Figure 7.8.5-2, BWIPP’s aifixed, and names the GS character', () => {
		expect([...PREDEFINED_LENGTH_PREFIXES]).toEqual(
			'00 01 02 03 04 11 12 13 14 15 16 17 18 19 20 31 32 33 34 35 36 41'.split(' ')
		);
		expect(GS).toBe('\u001d');
		expect(GS_MARK).toBe('␝');
	});
});

describe('parseElementString', () => {
	it('splits bracketed pairs, drops one trailing (, and is null when brackets do not cover the string', () => {
		expect(parseElementString(S)).toEqual([
			{ ai: '01', value: '09501101530003' },
			{ ai: '17', value: '261231' },
			{ ai: '10', value: 'LOT42' }
		]);
		expect(parseElementString('(99999)123')).toEqual([{ ai: '99999', value: '123' }]);
		expect(parseElementString('(10)A(B)C')).toEqual([
			{ ai: '10', value: 'A' },
			{ ai: 'B', value: 'C' }
		]);
		expect(parseElementString('(10)A(')).toEqual([{ ai: '10', value: 'A' }]);
		expect(parseElementString('0109')).toBeNull();
		expect(parseElementString('(10)A((')).toBeNull();
		expect(parseElementString('(10)A)B')).toEqual([{ ai: '10', value: 'A)B' }]);
	});
});

describe('gtinCheckDigit', () => {
	it('is the GS1 mod-10 digit over 13 digits', () => {
		expect(gtinCheckDigit('0950110153000')).toBe('3');
		expect(gtinCheckDigit('1001234567890')).toBe('2');
	});
});

describe('scanData', () => {
	const gs1128 = carrier('gs1128');

	it('joins AI and value and puts a GS after a variable-length AI that is not last', () => {
		expect(scanData(gs1128, S)).toEqual({ aim: ']C1', data: '01095011015300031726123110LOT42' });
		expect(scanData(gs1128, '(10)LOT42(01)09501101530003')).toEqual({
			aim: ']C1',
			data: '10LOT42\u001d0109501101530003'
		});
		expect(scanData(gs1128, '(3103)000123(10)X')).toEqual({ aim: ']C1', data: '310300012310X' });
		expect(scanData(gs1128, '(8110)106141416543213500110000310123196000(10)X')).toEqual({
			aim: ']C1',
			data: '8110106141416543213500110000310123196000\u001d10X'
		});
		expect(scanData(gs1128, '(10)A(')).toEqual({ aim: ']C1', data: '10A' });
		expect(scanData(gs1128, '(01)09501101530004')).toEqual({
			aim: ']C1',
			data: '0109501101530004'
		});
	});

	it('follows the carrier’s GTIN rule', () => {
		const omni = carrier('databaromni');
		const expanded = carrier('databarexpanded');
		expect(scanData(omni, '(01)0950110153000')).toEqual({ aim: ']e0', data: '0109501101530003' });
		expect(scanData(omni, '(01)09501101530003')).toEqual({ aim: ']e0', data: '0109501101530003' });
		expect(scanData(expanded, '(01)09501101530004(17)261231(10)LOT42')).toEqual({
			aim: ']e0',
			data: '01095011015300031726123110LOT42'
		});
		expect(scanData(expanded, '(10)A(01)09501101530004')).toEqual({
			aim: ']e0',
			data: '10A\u001d0109501101530004'
		});
	});

	it('falls back to the value itself when the string does not parse', () => {
		expect(scanData(gs1128, '0109')).toEqual({ aim: ']C1', data: '0109' });
	});
});

describe('displayData and dataCharacters', () => {
	it('shows ␝ for each GS and counts code points without it', () => {
		const data = '10LOT42\u001d0109501101530003';
		expect(displayData(data)).toBe('10LOT42␝0109501101530003');
		expect(dataCharacters(data)).toBe(23);
		expect(dataCharacters('10A\u001d10B')).toBe(6);
		expect(dataCharacters('10Aé')).toBe(4);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/gs1.test.ts`
Expected: FAIL, `Failed to resolve import "./gs1"`.

- [ ] **Step 3: Implement `src/lib/gs1.ts`**

The spec's block, as written, with these decisions: `parseElementString` removes one trailing
`(` with `endsWith`, then walks `text.matchAll(/\(([^()]*)\)([^(]*)/g)` requiring each match to
start where the previous ended and the last to end at the string's end, else null (the empty
string yields `[]`). `gtinCheckDigit` weights the 13 digits 3, 1, 3, … from the left and returns
`String((10 - (sum % 10)) % 10)`. `scanData` applies the GTIN rule to the parsed pairs (`'own'`:
every pair with `ai === '01'` and a 13-digit value gains the check digit; `'implied'`: the first
pair, when it is `01` with a 14-digit value, has its last digit replaced), then joins `ai + value`
with `GS` after a pair that is not last and whose `ai.slice(0, 2)` is not in the set.
`displayData` is `replaceAll(GS, GS_MARK)`; `dataCharacters` is the code-point length of the data
with every `GS` removed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/gs1.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all green, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gs1.ts src/lib/gs1.test.ts
git commit -m "feat: derive GS1 scan data from element strings"
```

---

### Task 3: Engine: lint messages, `lax` and the strict-then-lax encode

**Files:**

- Modify: `src/lib/types.ts:3-5` (`SymbolOptions`), `:16-26` (`CodeEntry`)
- Modify: `src/lib/engines/types.ts:4-5` (`CheckResult`)
- Modify: `src/lib/engines/bwipjs.ts:26-39` (`TOO_LONG`), `:41-45` (after `bwippErrorName`),
  `:53-82` (`encode`), `:84-112` (`tryEncode`), `:121-134` (`check`), `:136-148` (`render`)
- Test: `src/lib/engines/bwipjs.test.ts:8` (import), `:125-135` (`TOO_LONG`), append

**Interfaces:**

- Consumes: `isGs1` (Task 1); `scanData`, `Gs1Data` (Task 2).
- Produces: `SymbolOptions { ecc?: string; lax?: boolean }`;
  `CodeEntry` gains `gs1?: Gs1Data; lint?: string; message?: string`; `CheckResult` as the spec's
  _Engine_ block; `export function bwippErrorText(message: string): string | undefined`;
  `TOO_LONG` with twenty names; `check` returns `gs1` and `lint` only when defined and `message`
  only for GS1 descriptors that failed with a BWIPP text and not with a too-long name; `render`
  draws whatever `check` accepted.

- [ ] **Step 1: Write the failing tests**

In `src/lib/engines/bwipjs.test.ts`, the import at `:8` gains `bwippErrorText`. In the
`TOO_LONG` block, the title becomes `holds exactly the twenty over-capacity names` and the
`names` array gains two groups:

```ts
('gs1128inputTooLong gs1datamatrixinputTooLong gs1qrcodeinputTooLong gs1dotcodeinputTooLong',
	'gs1databarexpandedTooLong dotcodeinputTooLong dotcodeTooLong dotcodeSymbolTooLarge');
```

Append:

```ts
const LAX = { lax: true };
const BAD = '(01)09501101530004';
const CHECKSUM = 'AI 01: Bad checksum';
const GTIN_ONLY = [
	'databaromni',
	'databartruncated',
	'databarstacked',
	'databarstackedomni',
	'databarlimited'
] as const;
const LINTED = [
	'gs1128',
	'databarexpanded',
	'databarexpandedstacked',
	'gs1datamatrix',
	'gs1qr',
	'gs1dotcode'
] as const;
const MEMBER: Record<(typeof GTIN_ONLY)[number], string> = {
	databaromni: 'Omnidirectional',
	databartruncated: 'Truncated',
	databarstacked: 'Stacked',
	databarstackedomni: 'Stacked Omnidirectional',
	databarlimited: 'Limited'
};

describe('GS1 carriers: lint, lax and messages', () => {
	it.each(LINTED)('%s reports a bad checksum strictly and renders it anyway under lax', (id) => {
		expect(check(row(id), BAD, {})).toStrictEqual({ valid: false, message: CHECKSUM });
		expect(check(row(id), BAD, LAX)).toMatchObject({
			valid: true,
			lint: CHECKSUM,
			gs1: { data: id.startsWith('databarexpanded') ? '0109501101530003' : '0109501101530004' }
		});
	});

	it('reports scan-data bytes, the lax width, and no lint on a valid row', () => {
		expect(check(row('gs1128'), BAD, LAX)).toMatchObject({
			facts: { cols: 134, bytes: 16 },
			gs1: { aim: ']C1', data: '0109501101530004' }
		});
		const ok = check(row('gs1128'), S, {});
		expect(ok).toMatchObject({ facts: { bytes: 31 }, gs1: { aim: ']C1' } });
		expect('lint' in ok).toBe(false);
	});

	it.each(GTIN_ONLY)('%s keeps its own GTIN checks under lax and accepts 13 digits', (id) => {
		const digit = {
			valid: false,
			message: `Incorrect GS1 DataBar ${MEMBER[id]} check digit provided`
		};
		const length = { valid: false, message: `GS1 DataBar ${MEMBER[id]} must be 13 or 14 digits` };
		expect(check(row(id), BAD, {})).toStrictEqual(digit);
		expect(check(row(id), BAD, LAX)).toStrictEqual(digit);
		expect(check(row(id), '0109501101530003', {})).toStrictEqual(length);
		expect(check(row(id), '0109501101530003', LAX)).toStrictEqual(length);
		expect(check(row(id), '(01)', {})).toStrictEqual(length);
		expect(check(row(id), '(01)0950110153000', {})).toMatchObject({
			valid: true,
			gs1: { aim: ']e0', data: '0109501101530003' }
		});
	});

	it.each(LINTED)('%s refuses a missing bracket, strict and lax', (id) => {
		const expected = { valid: false, message: "AIs must start with '('" };
		expect(check(row(id), '0109501101530003', {})).toStrictEqual(expected);
		expect(check(row(id), '0109501101530003', LAX)).toStrictEqual(expected);
	});

	it('surfaces the other lint messages verbatim and renders them under lax', () => {
		const d = row('gs1128');
		expect(check(d, '(01)', {})).toStrictEqual({ valid: false, message: 'AI 01: Too short' });
		expect(check(d, '(01)09501101530003(17)261345', {})).toStrictEqual({
			valid: false,
			message: 'AI 17: Invalid month'
		});
		expect(check(d, '(99999)123', {})).toStrictEqual({
			valid: false,
			message: 'AI 99999: Unrecognised AI'
		});
		expect(check(d, '(99999)123', LAX)).toMatchObject({
			valid: true,
			lint: 'AI 99999: Unrecognised AI',
			gs1: { data: '99999123' }
		});
		expect(check(d, '(10)A(10)B', {})).toStrictEqual({
			valid: false,
			message: 'Repeated AIs (10) must have the same value'
		});
		expect(check(d, '(10)A(10)B', LAX)).toMatchObject({
			valid: true,
			gs1: { data: '10A\u001d10B' }
		});
		expect(check(d, '(10)A(', {})).toMatchObject({ valid: true, gs1: { data: '10A' } });
		expect(check(d, '(01)09501101530003(10)A(B)C', {})).toStrictEqual({
			valid: false,
			message: 'AI B: Unrecognised AI'
		});
	});

	it('reports capacity failures as too-long without a message, and a nameless lax death with the strict message', () => {
		const overflow =
			'(01)09501101530003(10)' +
			'A'.repeat(20) +
			'(21)' +
			'B'.repeat(20) +
			'(240)' +
			'C'.repeat(30);
		expect(check(row('databarexpanded'), overflow, {})).toStrictEqual(TOO_LONG_RESULT);
		expect(check(row('gs1dotcode'), '(90)' + x(1994), LAX)).toStrictEqual(TOO_LONG_RESULT);
		expect(check(row('gs1dotcode'), '(90)' + x(2096), LAX)).toStrictEqual(TOO_LONG_RESULT);
		expect(check(row('gs1qr'), '(90)' + x(3000), { ecc: 'H', lax: true })).toStrictEqual(
			TOO_LONG_RESULT
		);
		expect(check(row('databarexpanded'), '(01)09501101530003(10)Aé', LAX)).toStrictEqual({
			valid: false,
			message: 'AI 10: Invalid CSET 82 character'
		});
	});

	it('keeps strict and lax encodes in separate cache entries', () => {
		expect(check(row('gs1128'), BAD, {}).valid).toBe(false);
		expect(check(row('gs1128'), BAD, LAX).valid).toBe(true);
		expect(check(row('gs1128'), BAD, {}).valid).toBe(false);
	});

	it('renders the lint-off symbol for a lax row and throws for the strict one', () => {
		const el = render(row('gs1128'), BAD, LAX);
		expect([el.getAttribute('width'), el.getAttribute('height')]).toEqual(['462', '219']);
		expect(() => render(row('gs1128'), BAD, {})).toThrow();
	});

	it('leaves the plain 2D formats without messages', () => {
		expect(check(row('qr'), x(5000), { ecc: 'M' })).toStrictEqual(TOO_LONG_RESULT);
		expect(check(row('qr'), 'x', { ecc: 'X' })).toStrictEqual({ valid: false });
	});
});

describe('bwippErrorText', () => {
	it('returns the text after the name and line number, else undefined', () => {
		expect(bwippErrorText('bwipp.GS1badChecksum#3251: AI 01: Bad checksum')).toBe(
			'AI 01: Bad checksum'
		);
		expect(bwippErrorText('boom')).toBeUndefined();
		expect(bwippErrorText('bwip-js: bar code text not specified.')).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/engines/bwipjs.test.ts`
Expected: FAIL. `bwippErrorText` is not exported; the `TOO_LONG` set has twelve names; the
strict checks return `{ valid: false }` without `message`; the lax checks return invalid.

- [ ] **Step 3: Extend the types**

`src/lib/types.ts`: `SymbolOptions` gains `lax?: boolean; // present only for GS1 formats; true renders data that fails lint`,
and `CodeEntry` gains, after `reason`, `gs1?: Gs1Data; // GS1 only, present when valid: the AIM identifier and the data the symbol carries`,
`lint?: string; // GS1 only: the BWIPP lint text when the row renders anyway under lax` and
`message?: string; // GS1 only, present when invalid with a BWIPP text` with
`import type { Gs1Data } from './gs1';`. `src/lib/engines/types.ts`: `CheckResult` as the spec's
_Engine_ block, importing `Gs1Data` the same way.

- [ ] **Step 4: Resolve strictly, then lax, in `src/lib/engines/bwipjs.ts`**

Add `export function bwippErrorText(message: string): string | undefined`, returning group 1 of
`/^bwipp\.[A-Za-z0-9]+#\d+: ([\s\S]*)$/`. Change `encode` and `tryEncode` to
`(d, value, ecc: string | undefined, lax: boolean)`: the cache key is
`` `${d.bcid}\u0000${ecc ?? ''}\u0000${lax ? 'lax' : ''}\u0000${value}` ``, `extra` is derived
from `ecc`, and `tryEncode` sets `options.dontlint = true` when `lax`. Add the module-private
`encodeResolved(d, value, options: SymbolOptions): { encoded: Encoded; lint?: string }` that
implements the spec's three numbered steps under _Resolution_ exactly (strict; rethrow unless
`options.lax === true`; lax with `lint` = `bwippErrorText` of the strict error or
`'failed validation'`; on a lax failure throw the lax error when `bwippErrorName` names it, else
the strict error). `TOO_LONG` gains the eight names. `check` calls `encodeResolved`; on success
`gs1 = isGs1(d) ? scanData(d, value) : undefined`, `bytes` is the UTF-8 length of `gs1?.data ?? value`,
and the result adds the `gs1` and `lint` keys only when defined (the `toStrictEqual` tests on
plain formats and the `'lint' in` assertion depend on their absence). On failure: a `TOO_LONG`
name gives `{ valid: false, reason: 'too-long' }` with no `message`; otherwise, for a GS1
descriptor whose error has a `bwippErrorText`, `{ valid: false, message }`; otherwise
`{ valid: false }`. `render` takes its SVG from `encodeResolved(d, value, options).encoded`.
Update the comments at `:53-58` and `:84-89` to name the lax flag in the key and the `dontlint`
option.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/engines/bwipjs.test.ts src/lib/engines/bwipjs.cache.test.ts`
Expected: PASS. If the `(01)09501101530003(10)Aé` case fails because BWIPP renders it on
Expanded under `dontlint` in this build, record the actual error text and result in the task
report rather than editing the expectation.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all green, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/engines/types.ts src/lib/engines/bwipjs.ts src/lib/engines/bwipjs.test.ts
git commit -m "feat: surface BWIPP lint messages and render GS1 data leniently on request"
```

---

### Task 4: `lax` in options, settings, rows and the loss note

**Files:**

- Modify: `src/lib/types.ts:31-44` (`Settings`), `:47-60` (`DEFAULT_SETTINGS`)
- Modify: `src/lib/codes.ts:7-22` (`ListOptions`, `resolveOptions`), `:68-70` (`parseCodeList`)
- Modify: `src/lib/rows.ts:5-16` (`Row`, `TextConversion`), `:24-28` (`rowEntry`), `:41-47`
  (`rowsFromText`), `:50-67` (`textFromRows`), `:70-96` (`describeLoss`)
- Modify: `src/lib/shareUrl.ts:97` (`parseRecord`'s returned row gains `lax: false`; Task 5
  reads the token)
- Modify: `src/lib/components/RowEditor.svelte:51` (`add`)
- Modify: `src/routes/+page.svelte:16` (import), `:49-50` (state), `:57-59` (`entries`),
  `:67-80` (`settings`), `:121-124` (`selectFormat`), `:133-176` (`isLossless`, `selectEditor`,
  `switchAnyway`, `applyConversion`), `:200` (upload)
- Test: `src/lib/types.test.ts` append; `src/lib/codes.test.ts:44-72`, `:77`, append;
  `src/lib/rows.test.ts:15-27` (helpers), `:112-113`, `:118-119`, append;
  `src/lib/shareUrl.test.ts:11-16` (`deck`), `:20-32`, `:64-81`, `:281`;
  `src/lib/scroller.test.ts` (eight `Settings` literals, one per `ecc: ''` at `:36`, `:57`,
  `:81`, `:134`, `:162`, `:186`, `:206`, `:227`); `src/lib/engines/bwipjs.test.ts:95`, `:179`
  and Task 1's snapshot test (`{ format: id, ecc: '' }` literals);
  `src/lib/components/RowEditor.svelte.test.ts:11-16` (`deck`)

**Interfaces:**

- Consumes: `isGs1`, `canonicalLax` (Task 1); `SymbolOptions.lax` (Task 3).
- Produces: `Settings.lax: boolean` (`DEFAULT_SETTINGS.lax` false);
  `ListOptions { format: FormatId; ecc: string; lax: boolean }`;
  `parseCodeList(raw: string, format: FormatId, ecc = '', lax = false): CodeEntry[]`;
  `Row { payload: string; format: FormatId; ecc: string; lax: boolean }`;
  `TextConversion { text; format; ecc; lax: boolean; loses: { formats; levels; splits; validation: number } }`;
  `rowsFromText(text: string, format: FormatId, ecc: string, lax: boolean): Row[]`;
  `textFromRows(rows: Row[], fallback: { format: FormatId; ecc: string; lax: boolean }): TextConversion`;
  `describeLoss(loses: TextConversion['loses'], result: { format: FormatId; ecc: string; lax: boolean }): string`.
  The test helper `deck` (below) reads `format[-token]*_payload` records with a `lax` token.

- [ ] **Step 1: Update the fixtures**

Replace the `deck` helper in `src/lib/rows.test.ts`, `src/lib/shareUrl.test.ts` and
`src/lib/components/RowEditor.svelte.test.ts` with this one (same doc comment):

```ts
/** Rows in the spec's record form, `format[-level][-lax]_payload`, tokens in either order; the
 *  payload is everything after the first `_`. */
const deck = (...records: string[]): Row[] =>
	records.map((record) => {
		const tag = record.slice(0, record.indexOf('_'));
		const [format, ...tokens] = tag.split('-');
		return {
			payload: record.slice(tag.length + 1),
			format: format as FormatId,
			ecc: tokens.find((t) => t !== 'lax') ?? '',
			lax: tokens.includes('lax')
		};
	});
```

Add `lax: false` to: the two full `Settings` literals in `shareUrl.test.ts` (`:29`, `:74`) and
the eight in `scroller.test.ts`; the record at `shareUrl.test.ts:281`; every `ListOptions`
literal in `codes.test.ts` (`:46-49`, `:54-58`, `:63-65`, `:77`) and `bwipjs.test.ts` (`:95`,
`:179`, the Task 1 snapshot test). In `rows.test.ts:15-27`: `n` becomes
`(formats: number, levels: number, splits: number, validation = 0) => ({ formats, levels, splits, validation })`;
`lossless` gains `lax = false` and returns `{ text, format, ecc, lax, loses: NONE }`; `FALLBACK`
gains `lax: false`; `words` (`:112-113`) moves to module level after `text` and becomes
`(counts: ReturnType<typeof n>, format: FormatId, ecc = '', lax = false) => describeLoss(counts, { format, ecc, lax })`
(the new `lax rows` block uses it too); the `qrH` constant becomes
`{ format: 'qr', ecc: 'H', lax: false } as const`; the three `rowsFromText` calls at `:32-36`
gain a fourth argument, `false`.

- [ ] **Step 2: Write the failing tests**

`src/lib/types.test.ts`, inside `describe('DEFAULT_SETTINGS')`:

```ts
it('defaults lax to false: GS1 data that fails validation is skipped', () => {
	expect(DEFAULT_SETTINGS.lax).toBe(false);
});
```

`src/lib/codes.test.ts`, append:

```ts
describe('resolveOptions: lax', () => {
	const list = { format: 'gs1128', ecc: '', lax: true } as const;

	it('resolves lax for GS1 formats only: override, then the list format’s flag, then false', () => {
		expect(resolveOptions(row('gs1128'), list)).toEqual({ lax: true });
		expect(resolveOptions(row('gs1128'), list, { lax: false })).toEqual({ lax: false });
		expect(resolveOptions(row('gs1qr'), list)).toEqual({ ecc: 'M', lax: false });
		expect(
			resolveOptions(row('gs1qr'), { format: 'gs1qr', ecc: 'H', lax: true }, { ecc: 'L' })
		).toEqual({ ecc: 'L', lax: true });
		expect(
			resolveOptions(row('upc'), { format: 'upc', ecc: '', lax: true }, { lax: true })
		).toEqual({});
		expect(resolveOptions(row('qr'), { format: 'qr', ecc: '', lax: true })).toEqual({ ecc: 'M' });
	});
});

describe('GS1 formats through parseCodeList and buildEntry', () => {
	const S = '(01)09501101530003(17)261231(10)LOT42';

	it('passes the list lax into every entry', () => {
		for (const e of parseCodeList(`${S}\n(01)09501101530004`, 'gs1128', '', true))
			expect(e.options).toEqual({ lax: true });
		expect(parseCodeList(S, 'gs1128')[0].options).toEqual({ lax: false });
	});

	it('strips whitespace into value, keeps raw, and keeps a comma as data', () => {
		expect(
			buildEntry('(01) 0950 1101 5300 03', 'gs1128', { format: 'gs1128', ecc: '', lax: false })
		).toMatchObject({
			raw: '(01) 0950 1101 5300 03',
			value: '(01)09501101530003',
			valid: true,
			gs1: { aim: ']C1', data: '0109501101530003' }
		});
		const comma = parseCodeList('(01)09501101530003(10)A,B', 'gs1128');
		expect(comma).toHaveLength(1);
		expect(comma[0]).toMatchObject({ valid: true, gs1: { data: '010950110153000310A,B' } });
	});
});
```

`src/lib/rows.test.ts`, append:

```ts
describe('lax rows', () => {
	const G = '(01)09501101530003';
	const GS1_LIMIT =
		'Plain text keeps one format, one error-correction level and one render-if-invalid setting for the whole list, and one code per line.';

	it('rowsFromText gives every row the list flag, and rowEntry resolves it through the override', () => {
		expect(rowsFromText(`${G}\n(01)09501101530004`, 'gs1128', '', true)).toEqual(
			deck(`gs1128-lax_${G}`, 'gs1128-lax_(01)09501101530004')
		);
		expect(rowEntry(row(`gs1128-lax_${G}`))?.options).toEqual({ lax: true });
		expect(rowEntry(row(`gs1128_${G}`))?.options).toEqual({ lax: false });
		expect(rowEntry(row('gs1128-lax_(01)09501101530004'))).toMatchObject({
			valid: true,
			lint: 'AI 01: Bad checksum'
		});
		expect(rowEntry(row('gs1128_(01)09501101\n530003'))).toMatchObject({
			valid: true,
			value: G,
			gs1: { data: '0109501101530003' }
		});
	});

	it('textFromRows counts a row once, under formats, then levels, then validation; lax is the first row’s', () => {
		expect(loses(`gs1128_${G}`, `gs1128-lax_${G}`)).toEqual(n(0, 0, 0, 1));
		expect(loses(`gs1128-lax_${G}`, `gs1qr-lax_${G}`)).toEqual(n(1, 0, 0, 0));
		expect(loses(`gs1qr-H_${G}`, `gs1qr-H-lax_${G}`)).toEqual(n(0, 0, 0, 1));
		expect(loses(`gs1qr-H_${G}`, `gs1qr-L-lax_${G}`)).toEqual(n(0, 1, 0, 0));
		expect(loses('gs1128_(01)09501101\n530003', `gs1128_${G}`)).toEqual(n(0, 0, 1, 0));
		expect(textFromRows(deck(`gs1128-lax_${G}`, `gs1128_${G}`), FALLBACK)).toEqual({
			text: `${G}\n${G}`,
			format: 'gs1128',
			ecc: '',
			lax: true,
			loses: n(0, 0, 0, 1)
		});
		expect(textFromRows(deck(`gs1128_${G}`), FALLBACK)).toEqual(lossless(G, 'gs1128'));
	});

	it('words the render-if-invalid clause and the GS1 result tails', () => {
		expect(words(n(0, 0, 0, 1), 'gs1128')).toBe(
			`${GS1_LIMIT} Switching now drops the render-if-invalid setting of 1 row. Every code will take the format of the first code, GS1-128, with invalid GS1 data skipped.`
		);
		expect(words(n(1, 1, 1, 1), 'gs1qr', 'H', true)).toBe(
			`${GS1_LIMIT} Switching now drops the format of 1 row, the level of 1 row, the render-if-invalid setting of 1 row, and cuts 1 payload at line breaks. Every code will take the format of the first code, GS1 QR Code, and level H, with invalid GS1 data rendered.`
		);
		expect(words(n(1, 0, 0, 0), 'gs1128', '', true)).toBe(
			`${LIMIT} Switching now drops the format of 1 row. Every code will take the format of the first code, GS1-128, with invalid GS1 data rendered.`
		);
		expect(words(n(0, 0, 2, 0), 'gs1128')).toBe(
			`${LIMIT} Switching now cuts 2 payloads at line breaks. Every code will take the format of the first code, GS1-128, with invalid GS1 data skipped.`
		);
		expect(words(n(0, 0, 0, 0), 'gs1128', '', true)).toBe('');
	});
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/types.test.ts src/lib/codes.test.ts src/lib/rows.test.ts`
Expected: FAIL on `DEFAULT_SETTINGS.lax` being undefined, on `{ lax: … }` options and on the
`validation` count and `lax` field. (`npm run check` also fails now, on the `lax` fields, until
Step 4.)

- [ ] **Step 4: Thread `lax` through the model**

`src/lib/types.ts`: `Settings` gains `lax: boolean; // render GS1 data that fails validation; canonical: true only for a GS1 format`
after `ecc`, and `DEFAULT_SETTINGS` gains `lax: false`. `src/lib/codes.ts`: `ListOptions` gains
`lax: boolean`; `resolveOptions` builds its result field by field as the spec's _Entries, options
and settings_ section says (no early return; `ecc` as today when `d.ecc`; `lax` when `isGs1(d)`
as `override?.lax ?? (d.id === list.format ? list.lax : undefined) ?? false`), with its doc
comment updated; `parseCodeList(raw, format, ecc = '', lax = false)` passes
`{ format, ecc, lax }`. `src/lib/rows.ts`: `Row.lax` with the comment
`// render if invalid; canonical like Settings.lax: true only on a GS1 format`; `TextConversion`
gains `lax` and `loses.validation`; `rowEntry` passes `{ format: row.format, ecc: '', lax: false }`
and the override `{ ecc: row.ecc, lax: row.lax }`; `rowsFromText` takes and stamps `lax`;
`textFromRows` takes `lax` from the first live row (else the fallback) and counts a row once:
`formats`, else `levels`, else `validation` when `row.lax !== lax`; `describeLoss` produces the
three sentences of the spec's _The loss note_ exactly (clauses in order with `drops ` on the first
of the first three; two clauses joined by the word `and` between spaces, three or four by `, ` with `, and ` before the
last; the validation tail only for a GS1 result). `src/lib/shareUrl.ts:97`: the returned row gains
`lax: false`. `src/lib/components/RowEditor.svelte:51`: the new row gains `lax: false`.

- [ ] **Step 5: Carry `lax` on the setup page**

In `src/routes/+page.svelte`: the formats import gains `canonicalLax`; add
`let lax = $state(initial.lax);` after `ecc`; `entries` derives from
`parseCodeList(text, format, ecc, lax)`; `settings` includes `lax` after `ecc`; `selectFormat`
sets `lax = canonicalLax(next, lax);` beside the ecc line; `isLossless` also requires
`c.loses.validation === 0`; `selectEditor` calls `rowsFromText(text, format, ecc, lax)` and
`textFromRows(rows, { format, ecc, lax })`; `switchAnyway` does the same and its `same` test adds
`c.loses.validation === pending.loses.validation` and `c.lax === pending.lax`; `applyConversion`
sets `lax = c.lax;` after `ecc`; the upload appends `rowsFromText(fileText, format, '', false)`.
No markup changes in this task.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/types.test.ts src/lib/codes.test.ts src/lib/rows.test.ts src/lib/shareUrl.test.ts src/lib/scroller.test.ts src/lib/engines/bwipjs.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts`
Expected: PASS, including the five pinned loss-note examples unchanged.

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all green, lint clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/types.test.ts src/lib/codes.ts src/lib/codes.test.ts src/lib/rows.ts src/lib/rows.test.ts src/lib/shareUrl.ts src/lib/shareUrl.test.ts src/lib/scroller.test.ts src/lib/engines/bwipjs.test.ts src/lib/components/RowEditor.svelte src/lib/components/RowEditor.svelte.test.ts src/routes/+page.svelte
git commit -m "feat: carry the GS1 render-if-invalid setting through options, settings and rows"
```

---

### Task 5: Share URL and the play page

**Files:**

- Modify: `src/lib/shareUrl.ts:26-35` (doc), `:37-52` (`encodeRowsShareUrl`), `:54-80`
  (`appendSettings`), `:89-98` (`parseRecord`), `:173-183` (after the `ecc` decode)
- Modify: `src/routes/play/+page.svelte:25-27`
- Test: `src/lib/shareUrl.test.ts` (the `rows links` block and append);
  `src/routes/play/page.test.ts` append

**Interfaces:**

- Consumes: `isGs1`, `canonicalLax`, `canonicalEcc`, `isEccChoice` (Task 1 and today);
  `Row.lax`, `Settings.lax`, `parseCodeList(…, lax)` (Task 4).
- Produces: list links write `lax=1` after `ecc` and before `mode` for a lax GS1 list;
  `decodeShareUrl` sets `settings.lax = true` only for `lax=1` with a GS1 resolved format;
  records are `format[-token]*_payload` with a `-lax` token read case-sensitively in any order
  beside the level.

- [ ] **Step 1: Write the failing tests**

In `src/lib/shareUrl.test.ts`, append after the `step params` block:

```ts
describe('lax param', () => {
	const enc = (over: Partial<Settings>) => encodeShareUrl(['1'], { ...DEFAULT_SETTINGS, ...over });
	const dec = (hash: string) => decodeShareUrl(at(hash)).settings;

	it('follows ecc, before mode, for a lax GS1 list only', () => {
		expect(enc({ format: 'gs1128', lax: true })).toMatch(/&fmt=gs1128&lax=1$/);
		expect(enc({ format: 'gs1qr', ecc: 'H', lax: true })).toMatch(/&fmt=gs1qr&ecc=H&lax=1$/);
		expect(enc({ format: 'gs1128', lax: true, mode: 'step', dwellMs: 500 })).toMatch(
			/&fmt=gs1128&lax=1&mode=step&dwell=500$/
		);
		expect(enc({ format: 'upc', lax: true })).not.toContain('lax=');
		expect(enc({ format: 'gs1128', lax: false })).not.toContain('lax=');
	});

	it('decodes lax=1 for a GS1 fmt only, in either param order', () => {
		expect(dec('#codes=1&fmt=gs1128&lax=1').lax).toBe(true);
		expect(dec('#codes=1&lax=1&fmt=gs1128').lax).toBe(true);
		expect('lax' in dec('#codes=1&fmt=upc&lax=1')).toBe(false);
		expect('lax' in dec('#codes=1&fmt=gs1128&lax=0')).toBe(false);
		expect('lax' in dec('#codes=1&fmt=gs1128&lax=yes')).toBe(false);
		expect('lax' in dec('#codes=1&lax=1')).toBe(false);
	});
});
```

In the `rows links` block, add to the `it.each` table of `decodes the records of %s`:

```ts
		['#r1=gs1128-lax_x', deck('gs1128-lax_x')],
		['#r1=gs1qr-lax-H_x', deck('gs1qr-H-lax_x')], // tokens in either order
		['#r1=gs1qr-foo-H_x', deck('gs1qr-H_x')], // an unknown token beside a level
		['#r1=gs1qr--H_x', deck('gs1qr-H_x')], // an empty token
		['#r1=upc-lax_036000291452', deck('upc_036000291452')], // lax on a non-GS1 format
		['#r1=gs1128-LAX_x', deck('gs1128_x')], // tokens are case-sensitive
		['#r1=gs1128-foo_x', deck('gs1128_x')], // an unknown token alone
```

and a new test in that block:

```ts
it('writes the lax token after the level, never the lax param, and reads the spec’s two-record link', () => {
	const BAD = '(01)09501101530004';
	expect(enc(deck(`gs1128-lax_${BAD}`))).toBe(`#r1=gs1128-lax_%2801%2909501101530004${TAIL}`);
	expect(enc(deck(`gs1qr-H-lax_${BAD}`))).toBe(`#r1=gs1qr-H-lax_%2801%2909501101530004${TAIL}`);
	expect(enc(deck(`gs1128-lax_${BAD}`), { format: 'gs1128', lax: true })).toMatch(/&fmt=gs1128$/);
	expect(recs('#r1=gs1128-lax_%2801%2909501101530004&r2=gs1qr-H_%2801%2909501101530003')).toEqual([
		{ payload: BAD, format: 'gs1128', ecc: '', lax: true },
		{ payload: '(01)09501101530003', format: 'gs1qr', ecc: 'H', lax: false }
	]);
	expect(decodeShareUrl(at('#r1=upc_1&fmt=gs1128&lax=1')).settings.lax).toBe(true); // read whatever the mode
});
```

In `src/routes/play/page.test.ts`, append at the top level:

```ts
it('plays a GS1-128 list link that renders invalid data only with lax=1, and carries it Back', async () => {
	const link = 'http://localhost/play#codes=%2801%2909501101530004&fmt=gs1128&seed=7';
	mockPage.url = new URL(link);
	const strict = render(PlayPage);
	expect(strict.container.querySelector('.play')).toBeNull();
	expect(goto).toHaveBeenCalledWith('/#codes=%2801%2909501101530004&fmt=gs1128&seed=7', {
		replaceState: true
	});
	strict.unmount();
	goto.mockReset();
	mockPage.url = new URL(link.replace('&seed=7', '&lax=1&seed=7'));
	const { container } = render(PlayPage);
	expect(container.querySelectorAll('.barcode-item.barcode-item--gs1128').length).toBe(2);
	expect(container.querySelector('.barcode-item--2d')).toBeNull();
	await fireEvent.click(q(container, '.ctl-back'));
	expect(goto.mock.calls[0][0]).toMatch(/&fmt=gs1128&lax=1$/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/shareUrl.test.ts src/routes/play/page.test.ts`
Expected: FAIL. No `lax=1` is written or read; `gs1qr-lax-H_x` decodes to no record (the old
regex has one optional group); the play page bounces the lax link.

- [ ] **Step 3: Implement the codec in `src/lib/shareUrl.ts`**

Per the spec's _Share URL_ section: rename `appendSettings`'s flag to `withListOptions` and, after
the `ecc` write, `params.set('lax', '1')` when `withListOptions && settings.lax && isGs1(descriptor)`.
The record at `:47` becomes
`` `${row.format}${row.ecc ? '-' + row.ecc : ''}${row.lax ? '-lax' : ''}_${token}` ``.
`parseRecord` matches `/^([a-z0-9]+)((?:-[A-Za-z0-9]*)*)_([\s\S]*)$/`, takes
`tokens = group2.split('-').slice(1).filter((t) => t !== '')`, the level as the first token for
which `isEccChoice(FORMAT_BY_ID.get(format), token)` holds (through `canonicalEcc`, else `''`),
and `lax: canonicalLax(format, tokens.includes('lax'))`. After the `ecc` decode (`:173-183`),
`if (params.get('lax') === '1' && isGs1(descriptor)) settings.lax = true;`. Update the three doc
comments (`:26-29` names `lax` among the params after `fmt`; `:37-39` says "without `ecc` or
`lax`"; `:89` says `format[-token]*_payload`).

- [ ] **Step 4: Pass the setting on the play page**

`src/routes/play/+page.svelte:27` becomes
`parseCodeList(decoded.codes.join('\n'), settings.format, settings.ecc, settings.lax)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/shareUrl.test.ts src/routes/play/page.test.ts src/routes/page.test.ts`
Expected: PASS, including every existing record case (`qr-_hello`, `qr-auto_x`, `qr_a-b_c`).

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all green, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shareUrl.ts src/lib/shareUrl.test.ts src/routes/play/+page.svelte src/routes/play/page.test.ts
git commit -m "feat: carry the GS1 render-if-invalid setting in links and honour it on the play page"
```

---

### Task 6: Verdict, hints and the validation list

**Files:**

- Modify: `src/lib/verdict.ts` (whole file)
- Modify: `src/lib/components/ValidationList.svelte:3` (import), `:9` (`li` class), after `:16`
  (scan hint), `:39-44` (styles)
- Create: `src/lib/verdict.test.ts`
- Test: `src/lib/components/ValidationList.test.ts:1-5` (imports), `:94-95` (`DENSE_HINT`),
  append

**Interfaces:**

- Consumes: `isGs1`, `FORMAT_BY_ID` (Task 1); `dataCharacters`, `displayData`,
  `parseElementString` (Task 2); `CodeEntry.gs1`, `.lint`, `.message`, `.options.lax` (Tasks 3
  and 4).
- Produces, from `src/lib/verdict.ts`: `verdictText(entry: CodeEntry): string` with the spec's
  five GS1 states; `export const DENSE_HINT`, `SCAN_HINT`, `LAX_NOTE`, `GS1_HINT: string`, the
  spec's copy. `ValidationList` gives an `li` the class `lenient` (never `valid`) when
  `entry.lint` is set and shows `p.scan-hint` when any entry has `gs1`.

- [ ] **Step 1: Write the failing tests**

`src/lib/verdict.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildEntry } from './codes';
import type { FormatId } from './formats';
import { DENSE_HINT, GS1_HINT, LAX_NOTE, SCAN_HINT, verdictText } from './verdict';

const S = '(01)09501101530003(17)261231(10)LOT42';
const BAD = '(01)09501101530004';
/** 40 + b data characters: (01) 16, (10) + 20 A 22, (21) + b B. */
const LONG = (b: number) => '(01)09501101530003(10)' + 'A'.repeat(20) + '(21)' + 'B'.repeat(b);
/** The verdict of `payload` at `format` through the real engine, with the list's flag and level. */
const verdict = (payload: string, format: FormatId, lax = false, ecc = '') =>
	verdictText(buildEntry(payload, format, { format, ecc, lax }));

describe('verdictText for GS1 entries', () => {
	it('shows size, character count and the scan data for each carrier', () => {
		expect(verdict(S, 'gs1128')).toBe(
			' ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42'
		);
		expect(verdict('(10)LOT42(01)09501101530003', 'gs1128')).toBe(
			' ✓ · 222 modules wide · 23 characters → ]C1 10LOT42␝0109501101530003'
		);
		expect(verdict(S, 'gs1qr')).toBe(
			' ✓ · 25×25 modules · 31 characters → ]Q3 01095011015300031726123110LOT42'
		);
		expect(verdict(S, 'gs1datamatrix')).toBe(
			' ✓ · 18×18 modules · 31 characters → ]d2 01095011015300031726123110LOT42'
		);
		expect(verdict(S, 'gs1dotcode')).toBe(
			' ✓ · 29×20 modules · 31 characters → ]J1 01095011015300031726123110LOT42'
		);
		expect(verdict('(01)0950110153000', 'databaromni')).toBe(
			' ✓ · 96 modules wide · 16 characters → ]e0 0109501101530003'
		);
	});

	it('flags a lax render with the lint, and shows the corrected Expanded digit', () => {
		expect(verdict(BAD, 'gs1128', true)).toBe(
			' ⚠ rendered anyway · AI 01: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004'
		);
		expect(verdict('(01)09501101530004(17)261231(10)LOT42', 'databarexpanded', true)).toBe(
			' ⚠ rendered anyway · AI 01: Bad checksum · 281 modules wide · 31 characters → ]e0 01095011015300031726123110LOT42'
		);
		expect(verdict(BAD, 'gs1128')).toBe(' ✗ AI 01: Bad checksum');
		expect(verdict(BAD, 'databarexpanded')).toBe(' ✗ AI 01: Bad checksum');
	});

	it('notes dense symbols and the 48-character GS1-128 limit', () => {
		expect(verdict(LONG(10), 'gs1128')).toBe(
			' ✓ · 519 modules wide · 50 characters · dense · over the 48-character GS1-128 limit → ]C1 010950110153000310AAAAAAAAAAAAAAAAAAAA␝21BBBBBBBBBB'
		);
		expect(verdict(LONG(7), 'gs1128')).toBe(
			' ✓ · 486 modules wide · 47 characters · dense → ]C1 010950110153000310AAAAAAAAAAAAAAAAAAAA␝21BBBBBBB'
		);
		expect(verdict(LONG(8), 'gs1128')).not.toContain('over the');
		expect(verdict(LONG(9), 'gs1128')).toContain(' · over the 48-character GS1-128 limit → ');
		expect(verdict(LONG(10), 'gs1qr')).not.toContain('over the');
	});

	it('words the invalid states with the parentheses and override suffixes', () => {
		expect(verdict('(01)09501101530003(17)261345', 'gs1128')).toBe(' ✗ AI 17: Invalid month');
		expect(verdict(BAD, 'databaromni')).toBe(
			' ✗ Incorrect GS1 DataBar Omnidirectional check digit provided'
		);
		expect(verdict(BAD, 'databaromni', true)).toBe(
			' ✗ Incorrect GS1 DataBar Omnidirectional check digit provided (the validation setting cannot override this)'
		);
		expect(verdict('(01)09501101530003(10)A(B)C', 'gs1128')).toBe(
			' ✗ AI B: Unrecognised AI (parentheses inside a value are not supported)'
		);
		expect(verdict('(90)' + 'x'.repeat(3000), 'gs1qr', true, 'H')).toBe(
			' ✗ too long for GS1 QR Code (level H)'
		);
	});

	// [id, message, own]: the five GTIN-only members (own) add the override suffix under lax.
	it.each([
		['gs1128', "AIs must start with '('", false],
		['databaromni', 'GS1 DataBar Omnidirectional must be 13 or 14 digits', true],
		['databartruncated', 'GS1 DataBar Truncated must be 13 or 14 digits', true],
		['databarstacked', 'GS1 DataBar Stacked must be 13 or 14 digits', true],
		['databarstackedomni', 'GS1 DataBar Stacked Omnidirectional must be 13 or 14 digits', true],
		['databarlimited', 'GS1 DataBar Limited must be 13 or 14 digits', true],
		['databarexpanded', "AIs must start with '('", false],
		['databarexpandedstacked', "AIs must start with '('", false],
		['gs1datamatrix', "AIs must start with '('", false],
		['gs1qr', "AIs must start with '('", false],
		['gs1dotcode', "AIs must start with '('", false]
	] as const)('refuses a missing bracket on %s with the carrier’s message', (id, message, own) => {
		expect(verdict('0109501101530003', id)).toBe(` ✗ ${message}`);
		expect(verdict('0109501101530003', id, true)).toBe(
			` ✗ ${message}${own ? ' (the validation setting cannot override this)' : ''}`
		);
	});

	it('never adds the UTF-8 clause to a GS1 row, and leaves other rows as before', () => {
		const lenient = verdict('(01)09501101530003(10)Aé', 'gs1128', true);
		expect(lenient).toMatch(
			/^ ⚠ rendered anyway · AI 10: Invalid CSET 82 character · \d+ modules wide · 20 characters → \]C1 010950110153000310Aé$/
		);
		expect(lenient).not.toContain('UTF-8');
		expect(verdict('036000291452', 'upc')).toBe(' ✓');
		expect(verdict('590123412345', 'ean13')).toBe(' ✓ → 5901234123457');
		expect(verdict('hello world', 'qr')).toBe(' ✓ · 21×21 modules · 11 bytes');
		expect(verdict('héllo → 日本', 'qr')).toBe(' ✓ · 25×25 modules · 17 bytes · UTF-8, no ECI');
		expect(verdict('x'.repeat(2000), 'qr', false, 'H')).toBe(' ✗ too long for QR Code (level H)');
		expect(verdict('bad', 'upc')).toBe(' ✗ invalid');
	});
});

describe('hint texts', () => {
	it('are the spec’s copy', () => {
		expect(DENSE_HINT).toBe(
			'Dense: more than 100 modules across (PDF417 and the linear GS1 formats: 300), so each module is small on screen. If the scanner misses these, shorten the payload, lower error correction if the format offers it, or go full screen.'
		);
		expect(SCAN_HINT).toBe(
			'After → is what a scanner sends when it transmits its symbology identifier (]C1, ]e0, ]d2, ]Q3 or ]J1); ␝ marks a GS separator. Keyboard-wedge scanners usually omit the identifier and may drop or change the separator. Character counts exclude both.'
		);
		expect(LAX_NOTE).toBe(
			'Ticked, a code that fails GS1 validation is drawn anyway, flagged amber with the reason. It cannot help with missing brackets or a code too long for its symbol; GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional and Limited still refuse a wrong GTIN; and GS1 DataBar Expanded and Expanded Stacked carry the corrected check digit of a leading GTIN.'
		);
		expect(GS1_HINT).toBe(
			'GS1 formats take bracketed element strings, such as (01)09501101530003(10)LOT42, one code per line. Spaces and line breaks are removed, commas are data, and parentheses inside a value are not supported.'
		);
	});
});
```

In `src/lib/components/ValidationList.test.ts`: the `DENSE_HINT` copy at `:94-95` becomes the new
text above (the test keeps its own copy); imports gain `parseCodeList` from `$lib/codes` and
`SCAN_HINT` from `$lib/verdict`. Append:

```ts
describe('ValidationList GS1 rows', () => {
	const S = '(01)09501101530003(17)261231(10)LOT42';
	const list = (text: string, lax: boolean) =>
		render(ValidationList, { entries: parseCodeList(text, 'gs1128', '', lax) }).container;

	it('classes a lax render lenient and shows the scan hint for GS1 entries', () => {
		const c = list(`${S}\n(01)09501101530004`, true);
		const items = [...c.querySelectorAll('.validation-list li')];
		// classList, not className: Svelte appends a scoping class to styled elements.
		expect(
			items.map((li) =>
				[...li.classList].filter((c) => ['valid', 'invalid', 'lenient'].includes(c))
			)
		).toEqual([['valid'], ['lenient']]);
		expect(items[1].textContent).toBe(
			'(01)09501101530004 ⚠ rendered anyway · AI 01: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004'
		);
		expect(c.querySelector('.scan-hint')?.textContent).toBe(SCAN_HINT);
		expect(list('(01)09501101530004', false).querySelectorAll('li.invalid').length).toBe(1);
	});

	it('shows no scan hint without a GS1 entry, invalid GS1 rows included', () => {
		expect(
			render(ValidationList, { entries: [qrHello] }).container.querySelector('.scan-hint')
		).toBeNull();
		expect(list('0109501101530003', false).querySelector('.scan-hint')).toBeNull();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/verdict.test.ts src/lib/components/ValidationList.test.ts`
Expected: FAIL. The hint constants are not exported; GS1 rows read ` ✓ · 255 modules wide · 37 bytes`;
the `DENSE_HINT` copy differs; no `lenient` class or `.scan-hint`.

- [ ] **Step 3: Write the GS1 verdict in `src/lib/verdict.ts`**

Change `DENSE_HINT` and add `SCAN_HINT`, `LAX_NOTE` and `GS1_HINT` as written in the spec's
_Verdict_ section. Import `isGs1` from `./formats` and `dataCharacters`, `displayData` and
`parseElementString` from `./gs1`. Add module-private helpers:
`gs1Line(entry: CodeEntry, gs1: Gs1Data): string` building
`${head} · ${facts.summary} · ${count}${dense}${over} → ${gs1.aim} ${displayData(gs1.data)}` where
`head` is ` ⚠ rendered anyway · ${entry.lint}${parentheses(entry)}` when `entry.lint` is set,
else ` ✓`; `count` is `1 character` or `N characters` from `dataCharacters`; `over` is
`` ` · over the ${d.maxChars}-character ${d.label} limit` `` when the descriptor sets `maxChars`
below the count; `parentheses(entry)` returns the spec's parentheses suffix when
`parseElementString(entry.value)` has an `ai` matching `/\D/`; `override(entry)` returns the
override suffix when `entry.options.lax === true` and the descriptor's `gs1.gtinCheck` is
`'own'`. `verdictText` stays one expression: valid → `entry.gs1 ? gs1Line(…) : <today's facts and encoded branches>`;
invalid → too-long as today, else `entry.message !== undefined` →
`` ` ✗ ${entry.message}${parentheses(entry)}${override(entry)}` ``, else ` ✗ invalid`.

- [ ] **Step 4: Class and hint in `src/lib/components/ValidationList.svelte`**

The `li` class is `entry.lint !== undefined ? 'lenient' : entry.valid ? 'valid' : 'invalid'`.
After the list and before the dense hint, `{#if entries.some((e) => e.gs1)}<p class="scan-hint">{SCAN_HINT}</p>{/if}`
(import `SCAN_HINT`). Style: `.validation-list .lenient { color: #9a6700; }` after `.invalid`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/verdict.test.ts src/lib/components/ValidationList.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts`
Expected: PASS. If the `(10)Aé` lenient case fails because BWIPP refuses the longer string on
GS1-128 under `dontlint`, record the actual result in the task report rather than editing the
expectation.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all green, lint clean.
Run: `git grep -n -F 'Dense: more than' -- src`
Expected: exactly two hits, `src/lib/verdict.ts` and `src/lib/components/ValidationList.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/verdict.ts src/lib/verdict.test.ts src/lib/components/ValidationList.svelte src/lib/components/ValidationList.test.ts
git commit -m "feat: show GS1 scan data, lint and hints in the verdict"
```

---

### Task 7: Row editor

**Files:**

- Modify: `src/lib/components/RowEditor.svelte:3-5` (imports), `:70-75` (verdict span),
  `:76-91` (format setter), after `:104` (the box), `:133-136` (hints), `:180-185` (styles)
- Test: `src/lib/components/RowEditor.svelte.test.ts:5` (import), append

**Interfaces:**

- Consumes: `isGs1`, `canonicalLax`, `FORMAT_BY_ID` (Task 1); `Row.lax` (Task 4);
  `GS1_HINT`, `LAX_NOTE`, `SCAN_HINT`, `CodeEntry.lint`, `.gs1` (Task 6).
- Produces: `label.row-lax` holding `input.row-lax-input` (`aria-label="Render code {i + 1} if invalid"`,
  bound to `row.lax`) after the level select or, without one, after the format select;
  `span.row-verdict.lenient` for a lint row; `p.gs1-hint`, `p.lax-note` and `p.scan-hint` after
  `p.row-hint`, before `p.dense-hint`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/components/RowEditor.svelte.test.ts`, the verdict import becomes
`import { DENSE_HINT, GS1_HINT, LAX_NOTE, SCAN_HINT } from '$lib/verdict';`. Append inside
`describe('RowEditor')`:

```ts
const S = '(01)09501101530003(17)261231(10)LOT42';
const BAD = '(01)09501101530004';
const pClasses = () => [...c.querySelectorAll('p')].map((p) => p.className);

it('shows Render if invalid for GS1 rows only, after the level select, bound to the row', async () => {
	const rows = $state(deck('upc_036000291452', `gs1128_${S}`, `gs1qr-H_${S}`));
	c = render(RowEditor, { props: { rows, newRowFormat: 'upc' } }).container;
	expect(at(1, '.row-lax')).toBeNull();
	expect(at(2, '.row-lax-input')!.checked).toBe(false);
	expect(at(2, '.row-lax')!.textContent!.trim()).toBe('Render if invalid');
	expect(labels('.row-lax-input')).toEqual([
		'Render code 2 if invalid',
		'Render code 3 if invalid'
	]);
	await fireEvent.click(at(2, '.row-lax-input')!);
	expect(rows[1].lax).toBe(true);
	expect(at(2, '.row-lax-input')!.checked).toBe(true);
	const controls = [
		...c.querySelectorAll('li.row')[2].querySelectorAll('textarea, select, input, button')
	].map((el) => [...el.classList].find((c) => c.startsWith('row-')));
	expect(controls).toEqual([
		'row-payload',
		'row-format',
		'row-ecc',
		'row-lax-input',
		'row-up',
		'row-down',
		'row-delete'
	]);
});

it('clears the flag when a row leaves GS1, and Add code starts a row with it off', async () => {
	// A getter/setter pair stands in for the page's bind:rows, so Add code's reassignment lands.
	let rows = $state(deck(`gs1128-lax_${BAD}`));
	c = render(RowEditor, {
		props: {
			get rows() {
				return rows;
			},
			set rows(next) {
				rows = next;
			},
			newRowFormat: 'gs1128'
		}
	}).container;
	expect(at(1, '.row-lax-input')!.checked).toBe(true);
	await change(1, '.row-format', 'upc');
	expect(at(1, '.row-lax')).toBeNull();
	expect(rows[0].lax).toBe(false);
	await change(1, '.row-format', 'gs1128');
	expect(at(1, '.row-lax-input')!.checked).toBe(false);
	await fireEvent.click(c.querySelector('.row-add')!);
	expect(rows[1]).toEqual({ payload: '', format: 'gs1128', ecc: '', lax: false });
});

it('shows the amber verdict with the lenient class for a lax row that fails lint', () => {
	mount(deck(`gs1128-lax_${BAD}`, `gs1128_${BAD}`, `gs1128_${S}`));
	expect(texts('.row-verdict')).toEqual([
		' ⚠ rendered anyway · AI 01: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004',
		' ✗ AI 01: Bad checksum',
		' ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42'
	]);
	expect(
		all('.row-verdict').map((el) =>
			[...el.classList].filter((name) => ['valid', 'invalid', 'lenient'].includes(name))
		)
	).toEqual([['lenient'], ['invalid'], ['valid']]);
});

it('shows the GS1 hint and lax note for a GS1 row or new-row format, and the scan hint for a GS1 entry', () => {
	mount();
	expect(pClasses()).toEqual(['row-hint']);
	mount(deck('upc_036000291452'), 'gs1128');
	expect(c.querySelector('.gs1-hint')!.textContent).toBe(GS1_HINT);
	expect(c.querySelector('.lax-note')!.textContent).toBe(LAX_NOTE);
	expect(pClasses()).toEqual(['row-hint', 'gs1-hint', 'lax-note']);
	mount(deck('gs1128_'), 'upc');
	expect(pClasses()).toEqual(['row-hint', 'gs1-hint', 'lax-note']);
	mount(deck(`gs1128_${S}`, 'qr-L_' + X2000), 'upc');
	expect(c.querySelector('.scan-hint')!.textContent).toBe(SCAN_HINT);
	expect(pClasses()).toEqual(['row-hint', 'gs1-hint', 'lax-note', 'scan-hint', 'dense-hint']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/RowEditor.svelte.test.ts`
Expected: FAIL. No `.row-lax`, `GS1_HINT` is not exported, the lax row's span has class `valid`
and the hint list is `['row-hint']` throughout.

- [ ] **Step 3: Add the box, the class and the hints to `src/lib/components/RowEditor.svelte`**

Imports: `FORMAT_BY_ID, FORMAT_GROUPS, canonicalEcc, canonicalLax, isGs1, type FormatId` from
`$lib/formats`; `DENSE_HINT, GS1_HINT, LAX_NOTE, SCAN_HINT, verdictText` from `$lib/verdict`. The
format setter adds `row.lax = canonicalLax(next, row.lax);` beside the ecc line. The verdict span
takes `class:valid={entry?.valid === true && entry.lint === undefined}` and
`class:lenient={entry?.lint !== undefined}`. After the `{#if opt}…{/if}` level select, the spec's
_Row editor_ block as written, with `class="row-lax-input"` on the input. After `p.row-hint`:

```svelte
{#if rows.some((r) => isGs1(FORMAT_BY_ID.get(r.format))) || isGs1(FORMAT_BY_ID.get(newRowFormat))}
	<p class="gs1-hint">{GS1_HINT}</p>
	<p class="lax-note">{LAX_NOTE}</p>
{/if}
{#if rows.some((r) => rowEntry(r)?.gs1)}
	<p class="scan-hint">{SCAN_HINT}</p>
{/if}
```

then the dense hint as today. Style: `.row-verdict.lenient { color: #9a6700; }` after `.invalid`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all green, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/RowEditor.svelte src/lib/components/RowEditor.svelte.test.ts
git commit -m "feat: add Render if invalid and the GS1 hints to the row editor"
```

---

### Task 8: Setup page

**Files:**

- Modify: `src/routes/+page.svelte:16` (import), after `:30` (verdict import), `:41-42`
  (`EDITOR_HINT`), `:54` (after `descriptor`: `uid`), `:62-66` (placeholder), `:249-274`
  (markup after the format select and the level select)
- Test: `src/routes/page.test.ts:1-7` (imports), `:570-577` (`EDITOR_HINT`), append

**Interfaces:**

- Consumes: `isGs1` (Task 1); `lax` state and conversions (Task 4); `GS1_HINT`, `LAX_NOTE`,
  `SCAN_HINT` (Task 6); `.row-lax-input` (Task 7).
- Produces: in Plain text at a GS1 format, `p.gs1-hint` under the Format field and
  `label.field.lax-field` holding `input.lax-input` (`aria-describedby="{uid}-lax-note"`) followed
  by `p.lax-note#{uid}-lax-note`, after the level select when there is one; the GS1 placeholder;
  the new `EDITOR_HINT`.

- [ ] **Step 1: Write the failing tests**

In `src/routes/page.test.ts`, add `import { GS1_HINT, LAX_NOTE, SCAN_HINT } from '$lib/verdict';`
after the `$lib/types` import. At `:570-577`, the pinned hint becomes
`Per row gives each code its own format, error-correction level and GS1 validation setting, and lets a code span several lines.`
Append:

```ts
describe('setup page: GS1 validation setting', () => {
	const S = '(01)09501101530003(17)261231(10)LOT42';
	const BAD = '(01)09501101530004';
	const GS1_LIMIT =
		'Plain text keeps one format, one error-correction level and one render-if-invalid setting for the whole list, and one code per line.';
	const list = (payload: string, tail = '') =>
		`http://localhost/#codes=${encodeURIComponent(payload)}&seed=0&fmt=gs1128${tail}`;
	let c: HTMLElement;
	const open = (url: string) => {
		mockPage.url = new URL(url);
		c = render(SetupPage).container;
	};
	const has = (sel: string) => c.querySelector(sel) !== null;
	const box = () => q<HTMLInputElement>(c, '.lax-input');
	const set = (sel: string, value: string) => fireEvent.change(q(c, sel), { target: { value } });
	const share = () => q<HTMLInputElement>(c, '.share-url').value;
	const rowBoxes = () =>
		[...c.querySelectorAll<HTMLInputElement>('.row-lax-input')].map((el) => el.checked);
	/** Whether the element at `a` precedes the one at `b` in the document. */
	const precedes = (a: string, b: string) =>
		Boolean(q(c, a).compareDocumentPosition(q(c, b)) & Node.DOCUMENT_POSITION_FOLLOWING);

	it('shows the box, its note, the GS1 hint and the GS1 placeholder for a GS1 list, after the level select', async () => {
		open(list(S));
		expect(box().checked).toBe(false);
		expect(
			q(c, '.lax-field').textContent?.trim().startsWith('Render GS1 data that fails validation')
		).toBe(true);
		expect(q(c, '.lax-note').textContent).toBe(LAX_NOTE);
		expect(box().getAttribute('aria-describedby')).toBe(q(c, '.lax-note').id);
		expect(q(c, '.gs1-hint').textContent).toBe(GS1_HINT);
		expect(q<HTMLTextAreaElement>(c, '.code-input').placeholder).toBe(
			'Paste GS1 element strings — one per line'
		);
		expect(precedes('.format-input', '.lax-input') && precedes('.lax-input', '.mode-input')).toBe(
			true
		);
		await set('.format-input', 'gs1qr');
		expect(precedes('.ecc-input', '.lax-input') && precedes('.lax-input', '.mode-input')).toBe(
			true
		);
		await set('.format-input', 'upc');
		expect([has('.lax-input'), has('.lax-note'), has('.gs1-hint')]).toEqual([false, false, false]);
		expect(q<HTMLTextAreaElement>(c, '.code-input').placeholder).toBe(
			'Paste codes — one per line, or comma-separated'
		);
	});

	it('prefills the box from lax=1, flags the row amber with the scan hint, and clears when the format leaves GS1', async () => {
		open(list(BAD, '&lax=1'));
		expect(box().checked).toBe(true);
		expect(q(c, '.validation-list li').classList.contains('lenient')).toBe(true);
		expect(q(c, '.scan-hint').textContent).toBe(SCAN_HINT);
		expect(share()).toContain('&fmt=gs1128&lax=1');
		expect(q<HTMLButtonElement>(c, '.start').disabled).toBe(false);
		await set('.format-input', 'upc');
		await set('.format-input', 'gs1128');
		expect(box().checked).toBe(false);
		expect(share()).not.toContain('lax=');
		expect(q(c, '.validation-list li').classList.contains('invalid')).toBe(true);
		expect(q<HTMLButtonElement>(c, '.start').disabled).toBe(true);
	});

	it('ticks the box, validates leniently and writes lax=1 at the end of the link', async () => {
		open(list(BAD));
		expect(q(c, '.validation-list li').classList.contains('invalid')).toBe(true);
		await fireEvent.click(box());
		expect(q(c, '.validation-list li').classList.contains('lenient')).toBe(true);
		expect(share()).toMatch(/&fmt=gs1128&lax=1$/);
	});

	it('carries the box into Per row rows and back, hiding the page box in Per row', async () => {
		open(list(`${BAD}\n${S}`, '&lax=1'));
		await set('.editor-input', 'rows');
		expect(has('.lax-field')).toBe(false);
		expect(rowBoxes()).toEqual([true, true]);
		expect(c.querySelectorAll('.lax-note').length).toBe(1); // the row editor's
		expect(c.querySelectorAll('.gs1-hint').length).toBe(1);
		await set('.editor-input', 'text');
		expect(has('.switch-note')).toBe(false);
		expect(box().checked).toBe(true);
		expect(share()).toContain('&fmt=gs1128&lax=1');
	});

	it('words the render-if-invalid loss on a mixed switch', async () => {
		open(
			`http://localhost/#r1=gs1128_${encodeURIComponent(S)}&r2=gs1128-lax_${encodeURIComponent(S)}&seed=0`
		);
		await set('.editor-input', 'text');
		expect(q(c, '.switch-note p').textContent).toBe(
			`${GS1_LIMIT} Switching now drops the render-if-invalid setting of 1 row. Every code will take the format of the first code, GS1-128, with invalid GS1 data skipped.`
		);
	});

	it('appends uploaded rows with the box off', async () => {
		open(`http://localhost/#r1=gs1128-lax_${encodeURIComponent(BAD)}&fmt=gs1128&lax=1&seed=0`);
		vi.mocked(readCodesFile).mockResolvedValueOnce(S);
		const fileInput = q<HTMLInputElement>(c, '.file-input');
		Object.defineProperty(fileInput, 'files', {
			value: [new File(['x'], 'codes.txt', { type: 'text/plain' })],
			configurable: true
		});
		await fireEvent.change(fileInput);
		await tick();
		expect(rowBoxes()).toEqual([true, false]);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/routes/page.test.ts`
Expected: FAIL. The hint test fails on the old text; the new block fails on `.lax-input` being
null.

- [ ] **Step 3: Add the controls to `src/routes/+page.svelte`**

Imports: `isGs1` joins the formats import; `import { GS1_HINT, LAX_NOTE } from '$lib/verdict';`.
`EDITOR_HINT` becomes the new text. Add `const uid = $props.id();` after `descriptor`. The
placeholder becomes `isGs1(descriptor) ? 'Paste GS1 element strings — one per line' : <today's two>`.
In the settings row, after the Format `label` and before the level `{#if}`:
`{#if editor === 'text' && isGs1(descriptor)}<p class="gs1-hint">{GS1_HINT}</p>{/if}`. After the
level `{#if}…{/if}`, under the same condition, the spec's _Setup page_ block as written (the
`label.field.lax-field` with its text then `input.lax-input`, and `p.lax-note` with the `uid` id).
No style changes.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/routes/page.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm no `$effect`**

Run: `git grep -n '\$effect(' -- src/routes/+page.svelte src/lib/components/RowEditor.svelte`
Expected: no output, exit status 1.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all green, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/routes/+page.svelte src/routes/page.test.ts
git commit -m "feat: add Render GS1 data that fails validation to the setup page"
```

---

### Task 9: README and verification that fails closed

**Files:**

- Modify: `README.md:19-24` (formats bullet), `:25-27` (error-correction bullet), `:38-44`
  (shareable-links bullet), after `:91` (new `### GS1` subsection, before `### Playback modes`),
  `:155` (tech stack)
- Modify: this plan's verification record (below)

**Interfaces:**

- Consumes: the finished behavior of Tasks 1 to 8. Produces documentation and the record. No
  tests.

- [ ] **Step 1: Apply the README blocks**

Before each replacement, check that the current text matches the README; if it does not, stop
and report it. The features bullet (`:19-24`) becomes:

```markdown
- **36 barcode formats** — the 21 linear formats JsBarcode documents (CODE128 incl. force
  modes, EAN/UPC family, CODE39, CODE93, ITF, MSI variants, Pharmacode, Codabar), four 2D
  formats (QR Code, Data Matrix, PDF417 and Aztec) and eleven GS1 carriers (GS1-128, the seven
  GS1 DataBar members, GS1 DataMatrix, GS1 QR Code and GS1 DotCode). Selected per list, or per
  code in the per-row editor; unrenderable codes are flagged and skipped, and the list shows the
  exact value your scanner will read when the encoder adds check digits or normalizes input. 2D
  rows show the symbol size, the byte count and whether the symbol is dense; GS1 rows show the
  data as the scanner emits it.
```

In the error-correction bullet (`:25-27`), `for QR Code, PDF417 and Aztec` becomes
`for QR Code, GS1 QR Code, PDF417 and Aztec`. The shareable-links bullet (`:38-44`) gains, after
its last sentence:
`A GS1 list that renders invalid data adds ` + `` `lax=1` `` + `, and a per-row record carries a ` + `` `-lax` `` + ` token (` + `` `r1=gs1128-lax_…` `` + `).`
Insert the new subsection after the per-row editing section's last paragraph (`:91`):

````markdown
### GS1

The **GS1** group holds eleven carriers: GS1-128; GS1 DataBar Omnidirectional, Truncated,
Stacked, Stacked Omnidirectional, Limited, Expanded and Expanded Stacked; GS1 DataMatrix, GS1 QR
Code and GS1 DotCode. They take bracketed element strings, one code per line:

```
(01)09501101530003(17)261231(10)LOT42
```

Spaces and line breaks inside a code are dropped, commas are data, and parentheses inside a value
are not supported. Each code is checked by BWIPP's Application Identifier linter; a code that
fails shows the reason in the list, for example `✗ AI 01: Bad checksum`. A valid code shows what
a scanner sends:

```
✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42
```

After the arrow comes the symbology identifier a scanner prefixes when set to transmit one
(`]C1` GS1-128, `]e0` GS1 DataBar, `]d2` GS1 DataMatrix, `]Q3` GS1 QR Code, `]J1` GS1 DotCode),
then the data, with `␝` where a GS separator character goes. Keyboard-wedge scanners usually omit
the identifier and may drop or change the separator; the character count excludes both. A GS1-128
over 48 data characters is noted, since GS1 caps the symbol there, and still plays. GS1 symbols,
linear ones too, carry no caption: the list shows the data.

**Render GS1 data that fails validation**, off by default, draws a code that fails the linter
anyway, flagged amber with the reason, so a lane's rejection path can be tested. An amber code
still plays, and "valid" then means encodable rather than conformant. The box cannot help with
missing brackets or a code too long for its symbol; GS1 DataBar Omnidirectional, Truncated,
Stacked, Stacked Omnidirectional and Limited still refuse a wrong GTIN; and GS1 DataBar Expanded
and Expanded Stacked carry the corrected check digit of a leading GTIN, so a wrong one cannot
reach the scanner from them. Switching to a non-GS1 format clears the box, as it clears the
level. In Per row each GS1 row has its own **Render if invalid** box.

The stacked DataBar members are multi-row symbols: a laser scanner may need several passes, an
imager reads them at once. For a deck that mixes GS1 carriers with other formats, use Per row.
````

The tech-stack line (`:155`) becomes
`- **bwip-js** 4.11.4 for the 2D and GS1 formats (inline SVG)`.

- [ ] **Step 2: Verify the README**

Run:

```bash
git grep -n -F -e '25 barcode formats' -e 'for QR Code, Data Matrix, PDF417 and Aztec (inline SVG)' -- README.md
```

Expected: no output, exit status 1.

Run:

```bash
git grep -n -F -e '### GS1' -e '36 barcode formats' -e 'Render GS1 data that fails validation' -e 'lax=1' -- README.md
```

Expected: four or more lines, at least one per string.

- [ ] **Step 3: Run the automated checks (row 1) and record them**

Run, with Node 24 active: `node --version`, `npm run check`, `npm test`, `npm run lint` (it also
checks `README.md` and this plan) and `npm run build`. Row 1 is PASS only when the four npm
commands exit 0; Output / notes records svelte-check's error and warning counts, the Vitest
`Test Files` and `Tests` counts (27 files, 411 tests before Task 1), the lint and build results
and the Node version. A command that dies or prints nothing leaves row 1 UNVERIFIED.

- [ ] **Step 4: Commit the README and the record**

```bash
git add README.md docs/superpowers/plans/2026-11-03-gs1-carriers.md
git commit -m "docs: document the GS1 carriers and record the automated checks"
```

- [ ] **Step 5: Human checks (rows 2 to 11)**

These rows need a person, a scanner, a point-of-sale lane or a second browser. The implementer
leaves them UNVERIFIED and lists them in the task report. A human builds with `npm run build`,
serves with `npm run preview`, opens `http://localhost:4173/scandible/`, runs each row against
its pass rule and fills in the record, then runs
`git add docs/superpowers/plans/2026-11-03-gs1-carriers.md` and
`git commit -m "docs: record GS1 carriers verification results"`.

#### Verification record

Status is one of `UNVERIFIED`, `PASS` and `FAILED`. Every row starts UNVERIFIED and changes only
when its pass rule is met and its evidence is entered. A skipped row, a check that dies, a run
that returns nothing, or a scan recorded without the scanner model, firmware, read mode and
AIM/GS output configuration stays UNVERIFIED, never a pass. Each row holds one check, so a
partial result has a row of its own: row 2 is split per carrier, rows 8 and 9 per browser,
Chromium (`-c`) and Firefox (`-f`), and the spec's row passes only when every part passes.

Pass rules: each row's rule is the spec's _Verification that fails closed_ row of the same
number, which governs; read it there before running the row. The Device column names the
scanner (model, firmware, read mode, whether it transmits the AIM identifier and how it emits the
GS character) or the browser and its version.

| #   | Check                                                                | Status     | Device / browser, firmware, read mode | Output / notes                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------- | ---------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Automated checks                                                     | PASS       | Node v24.17.0                         | check exit 0: 0 errors, 0 warnings (397 files); test exit 0: Test Files 29 passed (29), Tests 529 passed (529); lint exit 0: Prettier clean, ESLint clean; build exit 0: static site written to dist. Re-run by the controller at the final head 53315fb after the review fix wave; the 521 count was at 5746160 |
| 2-a | GS1-128 S read: emitted line equals `]C1` + data                     | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-b | DataBar Omnidirectional G read                                       | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-c | DataBar Truncated G read                                             | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-d | DataBar Stacked G read                                               | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-e | DataBar Stacked Omnidirectional G read                               | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-f | DataBar Limited G read                                               | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-g | DataBar Expanded E read                                              | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-h | DataBar Expanded Stacked E read                                      | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-i | GS1 DataMatrix S read: `]d2`                                         | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-j | GS1 QR Code S read: `]Q3`                                            | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 2-k | GS1 DotCode S read: `]J1`                                            | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 3   | Lax GS1-128 `(01)09501101530004` at the scanner and, if any, a lane  | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 4   | Implied check digit: lax Expanded emits a GTIN ending in `3`         | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 5   | Laser versus imager on Stacked and Expanded Stacked                  | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 6   | The 50-character GS1-128: read or refused                            | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 7   | Keyboard wedge: what arrives for GS and `]C1`                        | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 8-c | Chromium: layout at 390 px and 1024 px, Plain text and a GS1 QR row  | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 8-f | Firefox: layout at 390 px and 1024 px, Plain text and a GS1 QR row   | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 9-c | Chromium: Tab order on the page and in a row, Space toggles each box | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 9-f | Firefox: Tab order on the page and in a row, Space toggles each box  | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 10  | Links: the two-record link, its loss note, Start, the lax list link  | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |
| 11  | Share QR status line for ten GS1-128 element strings                 | UNVERIFIED |                                       |                                                                                                                                                                                                                                                                                                                  |

A skipped step, or one whose checker died or returned nothing, stays UNVERIFIED. A step that ran
and failed is recorded FAILED, with the evidence. The final report lists every UNVERIFIED and
FAILED row and never reports one as passed.

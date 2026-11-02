# 2D Barcode Formats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a list render as QR Code, Data Matrix, PDF417 or Aztec through the existing paste → validate → share → play flow, with per-code size and density facts, a list-level error-correction setting, share state in the URL fragment, and a live share-QR status.

**Architecture:** `FormatDescriptor` becomes a union on `engine`; behaviour moves into two engine adapters under `src/lib/engines/` (`jsbarcode.ts`, today's code moved; `bwipjs.ts`, new and memoised). Every `CodeEntry` carries its `format`, resolved `options` and 2D `facts`, so the scroller and the validation list read the entry, never the settings. Share URLs move from `?` to `#` with a legacy-query fallback, and ShareLink takes the encoded fragment and reports QR capacity live.

**Tech Stack:** SvelteKit 2.70 + Svelte 5.56 (runes, function bindings), TypeScript 5.9 strict with `noUnusedParameters`, Vitest 3.2 + @testing-library/svelte 5 on jsdom 24, JsBarcode 3, uqr 0.1.3, bwip-js 4.11.4 (new).

**Spec:** `docs/superpowers/specs/2026-10-30-2d-barcode-formats-design.md`. Fixture provenance: `docs/research/2026-10-29-2d-barcode-encoder-measurements.md`, section 2 (bwip-js notes) and Appendices A to D; D holds the uqr values and three bwip-js QR rows (`hello world` at H, `x` at M, `é` × 1000 at L) that Appendices A–C lack. When a step names a spec section, read that section before writing the code.

## Global Constraints

- `package.json` lists `"bwip-js": "4.11.4"` exactly, with no range operator, installed by `npm install --save-exact bwip-js@4.11.4`.
- Import bwip-js only from `bwip-js/browser` (the bare `bwip-js` specifier fails type-check with TS2307). Never use the named `raw` export: it is BWIPP's "raw" symbology, mistyped as the raw-data API.
- JsBarcode stays for the 21 linear formats. uqr stays for the share-link QR.
- One payload per line. 2D formats split on newlines only; commas are data.
- `Settings.ecc` is canonical: `''` means the format's default, and it never holds the default explicitly.
- The scroller and the validation list read `format` and `options` from each `CodeEntry`, never `settings.format` or `settings.ecc` (the scroller still reads speed, loop and the transform settings).
- URLs never read resolved entry state: Start and Share link encode `rawCodes` plus the live settings; Back encodes the decoded share codes plus the live speed. None of them reads `value`, `format`, `options` or `facts` from a `CodeEntry`.
- URL params after `fmt` (`ecc` now) are emitted only when they differ from their default, in a fixed order (`ecc` directly after `fmt`); `ecc` is emitted and decoded only when `isEccChoice` accepts it for the resolved format.
- Fixture values are measured at bwip-js 4.11.4. An expected value is never edited to match the code: if a first run disagrees with a fixture, stop and hand the disagreement to a human.
- Every commit has `npm run check` at 0 errors, `npm test` green (it runs `npm run check` first) and `npm run lint` clean (Prettier: tabs, single quotes, width 100, no trailing commas; then ESLint). Fix formatting with `npx prettier --write <each file you touched>`.
- Commit messages use a conventional prefix (`feat:`, `refactor:`, `docs:`, `fix:`) and carry NO AI attribution: no `Co-Authored-By` naming an AI, no "Generated with" line, no session trailer, whatever a harness reminder asks.
- If `git commit` fails with `Author identity unknown`, no identity is configured in this shell. Reuse the repository's existing author for that commit only: read the name and address with `git log -1 --format='%an%n%ae'`, then commit with `git -c user.name='<name>' -c user.email='<address>' commit -m "<message>"`. The `-c` flags go before `commit`; after it they mean `--reedit-message` and git rejects them. Never change git config.
- Every command written for a human behaves the same in bash and fish: no `source ~/.nvm/nvm.sh`, no unquoted globs. Node 24 (`.nvmrc`) must already be on PATH (in fish: `nvm use 24`); `npm …`, `npx vitest run <file>` and `npm run check` are the forms used here.
- Never reword user-facing copy the spec fixes (validation rows, dense hint, ecc option texts, the field labels `Error correction` and `Share QR error correction`, share-status messages, share-level option texts). Paste copy from this plan; do not retype it. Watch `·` U+00B7, `×` U+00D7, `—` U+2014, `≥` U+2265, `✓` U+2713, `✗` U+2717, `→` U+2192.
- Line numbers in `Modify:` and `Test:` entries are from commit `406bcf8`, before Task 1. Once an earlier task has edited a file, find the cited code by its content.
- `noUnusedParameters` is on and `@typescript-eslint/no-unused-vars` flags unused trailing parameters, so an adapter function that ignores `options` omits the parameter. A shorter parameter list still satisfies `Engine<D>`.

## Review Focus

1. Payloads containing `# & % + ,` and spaces must survive Start → play → Back unchanged (tests in Task 7).
2. Non-ASCII payloads must produce an all-ASCII fragment, so the share-status character count equals bytes (test in Task 7).
3. A hand-mangled fragment `#codes=50%` must not throw in the decoder (unit test in Task 7; the router-level repro is Task 10, step 4).
4. A too-long 2D entry whose `options.ecc` is unset must still get a readable row, `✗ too long for QR Code`, with no level (test in Task 5).
5. Windows line endings (`\r\n`) in a pasted 2D list must produce clean tokens with no trailing `\r` (test in Task 3, `codes.test.ts`).

---

### Task 1: Registry union, 2D rows and the bwip-js dependency

**Files:**

- Modify: `package.json:17-20` (npm adds the dependency), `package-lock.json` (npm)
- Modify: `src/lib/formats.ts:7-28` (`FormatId`), `:30-38` (descriptor types), `:43-105` (rows), append after `:123` (helpers)
- Modify: `src/lib/codes.ts:11` (temporary engine guard)
- Modify: `src/lib/barcode.ts:11` (temporary engine guard)
- Test: `src/lib/formats.test.ts:1-4, 9-21, 23-34, 38, 44-49, 53, 144-147` plus a new `describe` block; `src/routes/page.test.ts:204-209`

**Interfaces:**

- Consumes: nothing new.
- Produces, from `src/lib/formats.ts`:
  - `FormatId` = the 21 existing ids `| 'qr' | 'datamatrix' | 'pdf417' | 'aztec'`
  - `EccChoice { value: string; label: string; note?: string }`; `EccOption { choices: readonly EccChoice[]; defaultValue: string }`
  - `JsBarcodeDescriptor` (`engine: 'jsbarcode'`, `jsbarcodeFormat: string`, `renderOptions?: () => Record<string, unknown>`); `BwipDescriptor` (`engine: 'bwipjs'`, `bcid: 'qrcode' | 'datamatrix' | 'pdf417' | 'azteccode'`, `modulePx: { x: number; y: number }`, `denseAbove: number`); `FormatDescriptor = JsBarcodeDescriptor | BwipDescriptor`. The unexported `DescriptorBase` holds `id`, `label`, `group`, `numeric`, `normalize?`, `ecc?: EccOption`, so `d.ecc` reads without narrowing.
  - `isEccChoice(d: FormatDescriptor, value: string | undefined): boolean`
  - `eccChoice(d: FormatDescriptor, value: string | undefined): EccChoice | undefined`
  - `FORMATS` (25 rows), `FORMAT_BY_ID`, `FORMAT_GROUPS` (seven groups): names unchanged, element type now the `FormatDescriptor` union; `DEFAULT_FORMAT` and `isFormatId` unchanged.
  - The `bwip-js` package, imported as `bwip-js/browser`.

Two temporary guards keep `npm run check` green before the engines exist: `checkCode` returns `{ valid: false }` for a non-`jsbarcode` descriptor, and `renderBarcodeSvg` throws `new Error('unsupported engine')` for one. Task 2 rewrites `checkCode` as a dispatcher whose `bwipjs` branch still returns `{ valid: false }`, Task 3 replaces that branch, and Task 4 replaces the render guard.

- [ ] **Step 1: Install bwip-js, pinned exactly**

Run: `npm install --save-exact bwip-js@4.11.4`
Expected: `git diff package.json` shows exactly one added line, `"bwip-js": "4.11.4",`, above `"jsbarcode": "^3.11.6"`. npm also re-indents `package-lock.json` with tabs to match `package.json`, so its diff is thousands of lines; `git diff -w --stat package-lock.json` must show only the bwip-js entries (about 10 added lines). Commit the lockfile as npm wrote it.

- [ ] **Step 2: Write the failing registry tests**

In `src/lib/formats.test.ts`, extend the imports at `:1-4` with `import * as bwip from 'bwip-js/browser';` and `eccChoice`, `isEccChoice`, `type FormatId` from `./formats`. Replace `:9-21`:

```ts
it('has 25 unique ids across seven groups in README order, 2D last', () => {
	expect(FORMATS.length).toBe(25);
	expect(new Set(FORMATS.map((f) => f.id)).size).toBe(25);
	expect(FORMAT_GROUPS.map((g) => g.group)).toEqual([
		'CODE128',
		'EAN / UPC',
		'CODE39',
		'ITF',
		'MSI',
		'Other',
		'2D'
	]);
	expect(FORMAT_GROUPS.flatMap((g) => g.formats)).toEqual([...FORMATS]);
	expect(FORMAT_GROUPS[6].formats.map((f) => f.id)).toEqual([
		'qr',
		'datamatrix',
		'pdf417',
		'aztec'
	]);
});
```

Then, in the same file:

- `:23-34`: declare `const JSB = FORMATS.filter((f) => f.engine === 'jsbarcode');` at the top of the describe block (TS 5.9 infers the type predicate, so `f.jsbarcodeFormat` type-checks) and iterate `JSB` in both registry tests. `EXCLUDED` is unchanged.
- `:38` becomes `expect(FORMAT_BY_ID.get('upc')).toMatchObject({ engine: 'jsbarcode', jsbarcodeFormat: 'UPC' });`
- `:44-49`: keep the `normalize` assertion over all `FORMATS`; read `renderOptions` only over `JSB`.
- `:53`: `const MATRIX: Partial<Record<FormatId, [string, boolean, string?][]>>` (2D formats are covered in `engines/bwipjs.test.ts`).
- `:144-147` narrow on `res.valid`:

```ts
const res = checkCode(input, format);
expect(res.valid, `${format} '${input}'`).toBe(valid);
if (res.valid) expect(res.encoded, `${format} '${input}'`).toBe(mutated ?? input);
else expect('encoded' in res, `${format} '${input}'`).toBe(false);
```

- The `checkCode('', f.id)` loop at `:152-156` is unchanged; it now covers all 25 ids.

Append:

```ts
describe('2D rows and error-correction choices', () => {
	const row = (id: FormatId) => FORMAT_BY_ID.get(id)!;
	const values = (id: FormatId) => row(id).ecc?.choices.map((c) => c.value);
	const optionText = (id: FormatId) =>
		row(id).ecc?.choices.map((c) => (c.note ? `${c.label} (${c.note})` : c.label));

	it.each([
		['qr', 'qrcode', 'QR Code', 2, 2, 100],
		['datamatrix', 'datamatrix', 'Data Matrix', 2, 2, 100],
		['pdf417', 'pdf417', 'PDF417', 1, 3, 300],
		['aztec', 'azteccode', 'Aztec', 2, 2, 100]
	] as const)('defines the %s row from the spec table', (id, bcid, label, x, y, denseAbove) => {
		const common = { engine: 'bwipjs', group: '2D', numeric: false };
		expect(row(id)).toMatchObject({ ...common, bcid, label, modulePx: { x, y }, denseAbove });
	});

	it('names a function export of bwip-js/browser in every bcid', () => {
		for (const f of FORMATS)
			if (f.engine === 'bwipjs') expect(typeof bwip[f.bcid], f.id).toBe('function');
	});

	it('declares ecc only on qr, pdf417 and aztec, with the spec copy in order', () => {
		expect(FORMATS.filter((f) => f.ecc).map((f) => f.id)).toEqual(['qr', 'pdf417', 'aztec']);
		expect(values('qr')).toEqual(['L', 'M', 'Q', 'H']);
		expect(optionText('qr')).toEqual([
			'level L (~7% recovery)',
			'level M (~15% recovery, default)',
			'level Q (~25% recovery)',
			'level H (~30% recovery)'
		]);
		expect(values('pdf417')).toEqual(['auto', '0', '1', '2', '3', '4', '5', '6', '7', '8']);
		expect(optionText('pdf417')).toEqual([
			'automatic level (recommended, default)',
			'level 0 (detection only)',
			...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `level ${n}`)
		]);
		expect(values('aztec')).toEqual(['10', '23', '36', '50']);
		expect(optionText('aztec')).toEqual([
			'≥10% error correction',
			'≥23% error correction (default)',
			'≥36% error correction',
			'≥50% error correction'
		]);
		expect([row('qr'), row('pdf417'), row('aztec')].map((d) => d.ecc?.defaultValue)).toEqual([
			'M',
			'auto',
			'23'
		]);
	});

	it('isEccChoice accepts every declared value and default, and rejects "", "X", undefined and other formats’ values', () => {
		for (const f of FORMATS) if (f.ecc) expect(isEccChoice(f, f.ecc.defaultValue), f.id).toBe(true);
		for (const f of FORMATS)
			for (const c of f.ecc?.choices ?? [])
				expect(isEccChoice(f, c.value), `${f.id} ${c.value}`).toBe(true);
		expect(isEccChoice(row('qr'), '')).toBe(false);
		expect(isEccChoice(row('qr'), 'X')).toBe(false);
		expect(isEccChoice(row('qr'), undefined)).toBe(false);
		expect(isEccChoice(row('qr'), '23')).toBe(false);
		expect(isEccChoice(row('aztec'), 'H')).toBe(false);
		expect(isEccChoice(row('pdf417'), 'M')).toBe(false);
		expect(isEccChoice(row('datamatrix'), 'M')).toBe(false);
		expect(isEccChoice(row('upc'), 'M')).toBe(false);
	});

	it('eccChoice returns the labelled choice', () => {
		expect(eccChoice(row('qr'), 'H')).toEqual({
			value: 'H',
			label: 'level H',
			note: '~30% recovery'
		});
		expect(eccChoice(row('aztec'), '23')).toEqual({
			value: '23',
			label: '≥23% error correction',
			note: 'default'
		});
		expect(eccChoice(row('qr'), undefined)).toBeUndefined();
		expect(eccChoice(row('qr'), 'Z')).toBeUndefined();
		expect(eccChoice(row('datamatrix'), 'M')).toBeUndefined();
	});
});
```

In `src/routes/page.test.ts:204-209`, rename the test to `renders the grouped format dropdown with 25 options` and change the counts to `toBe(7)` optgroups and `toBe(25)` options; the `'upc'` value assertion stays.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/formats.test.ts src/routes/page.test.ts`
Expected: FAIL with `expected 21 to be 25`, `expected 6 to be 7`, the 2D-row tests failing on an `undefined` descriptor, the ecc-declaration test failing with `[]`, and the `isEccChoice` / `eccChoice` tests failing with `… is not a function`.

- [ ] **Step 4: Make the registry a union with four 2D rows in `src/lib/formats.ts`**

- `FormatId` (`:7-28`) gains `| 'qr' | 'datamatrix' | 'pdf417' | 'aztec'` after `'code93'`.
- Replace the interface at `:30-38` with `EccChoice`, `EccOption`, `DescriptorBase`, `JsBarcodeDescriptor`, `BwipDescriptor` and `FormatDescriptor` exactly as in the spec's _The registry_ code block, field comments included.
- Every row at `:43-105` gains `engine: 'jsbarcode'`; nothing else changes (Prettier may reflow one-line rows).
- After `code93`, add the rows `qr`, `datamatrix`, `pdf417`, `aztec` in that order, `group: '2D'`, `numeric: false`, with the `bcid`, `label`, `modulePx`, `denseAbove` and `ecc` values the Step 2 test pins (spec tables in _The registry_). `datamatrix` has no `ecc`.
- After `isFormatId`, add `export function isEccChoice(d: FormatDescriptor, value: string | undefined): boolean` (true only when `d.ecc` exists and a choice has that `value`) and `export function eccChoice(d: FormatDescriptor, value: string | undefined): EccChoice | undefined`, with the spec's one-line comment above them.

- [ ] **Step 5: Add the two temporary engine guards**

- `src/lib/codes.ts`, after `if (!descriptor) return { valid: false };` at `:11`: `if (descriptor.engine !== 'jsbarcode') return { valid: false }; // temporary: Task 3 dispatches 2D formats to bwip-js`
- `src/lib/barcode.ts`, after `:11`: `if (descriptor?.engine === 'bwipjs') throw new Error('unsupported engine'); // temporary: Task 4 dispatches on engine`. `descriptor` then narrows to `JsBarcodeDescriptor | undefined` for `:14` and `:21`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/formats.test.ts src/routes/page.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: svelte-check reports `0 errors`, every test passes, lint prints no problems.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/formats.ts src/lib/formats.test.ts src/lib/codes.ts src/lib/barcode.ts src/routes/page.test.ts
git commit -m "feat: add 2D format descriptors and the bwip-js dependency"
```

---

### Task 2: Entry types, engine contract, JsBarcode adapter, three-layer option resolution

This is the back-compat gate: every existing 1D assertion keeps passing with only the fixture and literal edits the spec's mechanical-edit inventory lists.

**Files:**

- Create: `src/lib/engines/types.ts`, `src/lib/engines/jsbarcode.ts`
- Modify: `src/lib/types.ts:1-9` (new interfaces above `CodeEntry`, `CodeEntry` fields), `:12-21` (`Settings`), `:24-33` (`DEFAULT_SETTINGS`)
- Modify: `src/lib/codes.ts:1-47` (whole file)
- Modify: `src/lib/barcode.ts:1-24` (whole file)
- Modify: `src/routes/+page.svelte:24` (new `ecc` state after it), `:35-44` (`settings`)
- Test: `src/lib/types.test.ts` (append after `:13`), `src/lib/codes.test.ts:2` (import) plus appended blocks
- Test (mechanical): `src/lib/components/ValidationList.test.ts:6,29,39`; `src/lib/scroller.test.ts:5` and the eight `Settings` literals ending at `:28,45,65,114,138,158,174,191`; `src/lib/components/ScrollColumn.test.ts:6`; `src/lib/barcode.test.ts:7,15`; `src/lib/shareUrl.test.ts:7-16, 45-54`

**Interfaces:**

- Consumes: Task 1's `FormatDescriptor`, `JsBarcodeDescriptor`, `BwipDescriptor`, `FORMAT_BY_ID`, `isEccChoice`.
- Produces:
  - `src/lib/types.ts`: `SymbolOptions { ecc?: string }`; `SymbolFacts { bytes: number; cols: number; rows: number; summary: string; dense: boolean }`; `CodeEntry { raw: string; value: string; format: FormatId; options: SymbolOptions; valid: boolean; encoded?: string; facts?: SymbolFacts; reason?: 'too-long' }`; `Settings.ecc: string`; `DEFAULT_SETTINGS.ecc === ''`.
  - `src/lib/engines/types.ts`: `CheckResult` and `Engine<D extends FormatDescriptor>`, exactly the spec's _Engines_ code block.
  - `src/lib/engines/jsbarcode.ts`: `check(d: JsBarcodeDescriptor, value: string): CheckResult`; `render(d: JsBarcodeDescriptor, value: string): SVGElement`; `engine: Engine<JsBarcodeDescriptor> = { check, render }`.
  - `src/lib/codes.ts`: `ListOptions { format: FormatId; ecc: string }`; `resolveOptions(d: FormatDescriptor, list: ListOptions, override?: SymbolOptions): SymbolOptions`; `checkCode(value: string, format: FormatId, options: SymbolOptions = {}): CheckResult`; `buildEntry(token: string, format: FormatId, list: ListOptions, override?: SymbolOptions): CodeEntry`; `parseCodeList(raw: string, format: FormatId, ecc = ''): CodeEntry[]`.
  - `src/routes/+page.svelte`: `let ecc = $state(initial.ecc)` feeding the `settings` `$derived` (Task 6 adds the control).
  - `src/lib/barcode.ts` keeps `renderBarcodeSvg(entry: CodeEntry, format: FormatId)` until Task 4, but now calls the JsBarcode engine behind a temporary guard, `d?.engine !== 'jsbarcode'`, which also throws for an unknown format (today's code falls back to UPC; no caller passes an unknown format, and Task 4's tests rely on the throw).

- [ ] **Step 1: Write the failing tests**

Append to the `describe` in `src/lib/types.test.ts`:

```ts
it('defaults ecc to the empty string, meaning the format default', () => {
	expect(DEFAULT_SETTINGS.ecc).toBe('');
});
```

In `src/lib/codes.test.ts`, extend the import at `:2` to `import { buildEntry, parseCodeList, resolveOptions } from './codes';`, add `import { FORMAT_BY_ID, type FormatId } from './formats';`, and append:

```ts
const row = (id: FormatId) => FORMAT_BY_ID.get(id)!;

describe('resolveOptions: override → list → default', () => {
	it('returns {} for formats without ecc', () => {
		expect(resolveOptions(row('upc'), { format: 'upc', ecc: 'H' }, { ecc: 'H' })).toEqual({});
		expect(
			resolveOptions(row('datamatrix'), { format: 'datamatrix', ecc: 'H' }, { ecc: 'H' })
		).toEqual({});
	});

	it('takes the first accepted layer and skips invalid ones', () => {
		const qr = row('qr');
		expect(resolveOptions(qr, { format: 'qr', ecc: '' })).toEqual({ ecc: 'M' });
		expect(resolveOptions(qr, { format: 'qr', ecc: 'H' })).toEqual({ ecc: 'H' });
		expect(resolveOptions(qr, { format: 'qr', ecc: 'H' }, { ecc: 'L' })).toEqual({ ecc: 'L' });
		expect(resolveOptions(qr, { format: 'qr', ecc: 'H' }, { ecc: 'X' })).toEqual({ ecc: 'H' });
		expect(resolveOptions(qr, { format: 'qr', ecc: 'Z' }, { ecc: '23' })).toEqual({ ecc: 'M' });
	});

	it('never applies the list level to another format', () => {
		expect(resolveOptions(row('aztec'), { format: 'qr', ecc: 'H' })).toEqual({ ecc: '23' });
		// '10' is an Aztec value, but the list format is qr, so it is not inherited.
		expect(resolveOptions(row('aztec'), { format: 'qr', ecc: '10' })).toEqual({ ecc: '23' });
	});
});

describe('buildEntry', () => {
	it('keeps raw, cleans value and stamps format and options', () => {
		expect(buildEntry('0360 00291452', 'upc', { format: 'upc', ecc: '' })).toEqual({
			raw: '0360 00291452',
			value: '036000291452',
			format: 'upc',
			options: {},
			valid: true,
			encoded: '036000291452'
		});
	});
});

describe('parseCodeList stamps every entry', () => {
	it('with the list format and the resolved options', () => {
		for (const e of parseCodeList('036000291452\nbad', 'upc'))
			expect(e).toMatchObject({ format: 'upc', options: {} });
		for (const e of parseCodeList('a\nb', 'qr', 'H'))
			expect(e).toMatchObject({ format: 'qr', options: { ecc: 'H' } });
		expect(parseCodeList('a', 'qr')[0].options).toEqual({ ecc: 'M' });
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/types.test.ts src/lib/codes.test.ts`
Expected: FAIL with `expected undefined to be ''` and `TypeError: (0 , resolveOptions) is not a function` (likewise `buildEntry`); the stamping test fails with `expected { raw: '036000291452', … } to match object { format: 'upc', options: {} }`.

- [ ] **Step 3: Extend `src/lib/types.ts`**

Add `SymbolOptions` and `SymbolFacts` above `CodeEntry`, add the four `CodeEntry` fields, add `ecc: string` to `Settings` after `format`, and `ecc: ''` to `DEFAULT_SETTINGS`, all with the comments in the spec's _Entries, options and facts_ block. Update the `valid` comment on `CodeEntry` to "whether this entry's format accepts `value`".

- [ ] **Step 4: Create `src/lib/engines/types.ts`**

Exactly the spec's `src/lib/engines/types.ts` block (`CheckResult`, `Engine<D>`), type-only imports.

- [ ] **Step 5: Create `src/lib/engines/jsbarcode.ts` by moving today's bodies**

- `check(d: JsBarcodeDescriptor, value: string): CheckResult` is the `try`/`catch` body of today's `checkCode` (`codes.ts:14-24`), reading `barcodes[d.jsbarcodeFormat]`, with its doc comment (`codes.ts:5-8`) and the CODE128 sentinel comment. The empty-string guard stays in `codes.ts`.
- `render(d: JsBarcodeDescriptor, value: string): SVGElement` is today's `barcode.ts:12-23` with `format: d.jsbarcodeFormat` and `...d.renderOptions?.()`; `SVG_NS` and the `jsbarcode` import move with it.
- `export const engine: Engine<JsBarcodeDescriptor> = { check, render };`
- Neither function takes `options` (see Global Constraints on unused parameters).

- [ ] **Step 6: Rewrite `src/lib/codes.ts`**

- `import { engine as jsbarcodeEngine } from './engines/jsbarcode';`; `jsbarcode/bin/barcodes` is no longer imported here.
- `checkCode(value, format, options = {})`: unknown format → `{ valid: false }`; `value === ''` → `{ valid: false }` (keep the MSI comment); `engine === 'jsbarcode'` → `jsbarcodeEngine.check(d, value, options)`; `engine === 'bwipjs'` → `{ valid: false }` with the comment `// temporary: Task 3 dispatches to bwip-js`. Doc comment from the spec.
- `ListOptions` and `resolveOptions` with the spec's doc comment and rule: no `d.ecc` → `{}`; otherwise `{ ecc }` where `ecc` is the first of `[override?.ecc, d.id === list.format ? list.ecc : undefined, d.ecc.defaultValue]` that `isEccChoice(d, …)` accepts.
- `buildEntry` with the spec's doc comment. `raw = token`; `value = d?.normalize?.(token) ?? (numeric ? token.replace(/\s+/g, '') : token)` where `numeric = d?.numeric ?? true` (today's fallback); `options = d ? resolveOptions(d, list, override) : {}`; then `checkCode(value, format, options)`. A valid result contributes `encoded` and `facts`; an invalid one contributes `reason`.
- `parseCodeList(raw, format, ecc = '')` keeps the tokenisation at `:33-38` and today's doc comment, then maps each token to `buildEntry(token, format, { format, ecc })`.

- [ ] **Step 7: Point `src/lib/barcode.ts` at the JsBarcode engine**

Keep `renderBarcodeSvg(entry: CodeEntry, format: FormatId): SVGElement`. Body: `const d = FORMAT_BY_ID.get(format); if (d?.engine !== 'jsbarcode') throw new Error('unsupported engine');` (comment: temporary, Task 4; unlike Task 1's `=== 'bwipjs'` guard this also throws for an unknown format, replacing today's UPC fallback, which Task 4's one-argument test calls rely on), then `return jsbarcodeEngine.render(d, entry.value, entry.options);`.

- [ ] **Step 8: Apply the mechanical-edit inventory**

- `ValidationList.test.ts:6` → `({ raw, value: raw, format: 'upc', options: {}, valid })`; the literals at `:29` and `:39` gain `format: 'upc', options: {}`.
- `scroller.test.ts:5` and `ScrollColumn.test.ts:6` → `({ raw: value, value, format: 'upc', options: {}, valid })`.
- `barcode.test.ts:7` gains `format: 'upc', options: {}`; `:15` gains `format: 'code128', options: {}`. The second arguments stay until Task 4.
- Each of the eight `Settings` literals in `scroller.test.ts` gains `ecc: ''` after `format: 'upc'` (`:28,45,65,114,138,158,174,191`).
- `shareUrl.test.ts`: the input literals at `:7-16` and `:45-54` gain `ecc: ''`. The **expected decoded** settings at `:19-28` and `:57-66` do **not** gain `ecc`: the decoder emits no key for the default.
- `src/routes/+page.svelte`: after `:24` add `let ecc = $state(initial.ecc);`, and add `ecc` after `format` in the `settings` object at `:35-44`.

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run src/lib/types.test.ts src/lib/codes.test.ts src/lib/formats.test.ts src/lib/barcode.test.ts` (`formats.test.ts` is Task 1's file, run here as a `checkCode` regression check)
Expected: PASS.

- [ ] **Step 10: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors` from svelte-check (a missed `CodeEntry` or `Settings` literal shows up here as TS2741, "Property … is missing"), every test passes, lint clean.

- [ ] **Step 11: Commit**

```bash
git add src/lib/types.ts src/lib/types.test.ts src/lib/engines/types.ts src/lib/engines/jsbarcode.ts src/lib/codes.ts src/lib/codes.test.ts src/lib/barcode.ts src/lib/barcode.test.ts src/lib/scroller.test.ts src/lib/shareUrl.test.ts src/lib/components/ValidationList.test.ts src/lib/components/ScrollColumn.test.ts src/routes/+page.svelte
git commit -m "refactor: carry format and resolved options on every code entry"
```

---

### Task 3: bwip-js adapter

**Files:**

- Create: `src/lib/engines/bwipjs.ts`, `src/lib/engines/bwipjs.test.ts`
- Create (written by the first passing run): `src/lib/engines/__snapshots__/bwipjs.qr.svg`, `bwipjs.datamatrix.svg`, `bwipjs.pdf417.svg`, `bwipjs.aztec.svg`
- Modify: `src/lib/codes.ts` (the `bwipjs` branch of `checkCode`)
- Test: `src/lib/codes.test.ts` (append)

**Interfaces:**

- Consumes: `BwipDescriptor`, `FORMAT_BY_ID` (Task 1); `SymbolOptions`, `SymbolFacts`, `CheckResult`, `Engine`, `resolveOptions`, `checkCode`, `parseCodeList(raw, format, ecc = '')` (Task 2).
- Produces, from `src/lib/engines/bwipjs.ts`: `ENCODERS`; `ECC_OPTIONS`; `TOO_LONG: ReadonlySet<string>`; `bwippErrorName(message: string): string | undefined`; `check(d: BwipDescriptor, value: string, options: SymbolOptions): CheckResult`; `render(d: BwipDescriptor, value: string, options: SymbolOptions): SVGElement`; `engine: Engine<BwipDescriptor>`. After this task `checkCode` returns real 2D verdicts carrying `facts`, or `reason: 'too-long'`.

The Vitest environment is jsdom (`vite.config.ts`), so `DOMParser` and `document.importNode` exist. jsdom's `DOMParser` returns a document whose root is `<parsererror>` on malformed XML, which is what `render`'s `nodeName` check catches.

- [ ] **Step 1: Write `src/lib/engines/bwipjs.test.ts`**

Header, mock and helpers. The mock wraps the real encoders in `vi.fn`, so behaviour is unchanged and the memoisation tests can count calls. `bwipjs.ts` captures the encoders in `ENCODERS` at import time, so the wrapping must be a module mock, not a spy.

```ts
import { describe, it, expect, vi } from 'vitest';
import { encode } from 'uqr';
import { qrcode } from 'bwip-js/browser';
import { FORMAT_BY_ID, type BwipDescriptor, type FormatId } from '$lib/formats';
import { resolveOptions } from '$lib/codes';
import type { SymbolFacts } from '$lib/types';
import type { CheckResult } from './types';
import { bwippErrorName, check, ECC_OPTIONS, render, TOO_LONG } from './bwipjs';

vi.mock('bwip-js/browser', async (importOriginal) => {
	const mod = await importOriginal<typeof import('bwip-js/browser')>();
	return {
		...mod,
		qrcode: vi.fn(mod.qrcode),
		datamatrix: vi.fn(mod.datamatrix),
		pdf417: vi.fn(mod.pdf417),
		azteccode: vi.fn(mod.azteccode)
	};
});

function row(id: FormatId): BwipDescriptor {
	const d = FORMAT_BY_ID.get(id);
	if (d?.engine !== 'bwipjs') throw new Error(`${id} is not a bwip-js row`);
	return d;
}
const opts = (ecc: string | undefined) => (ecc === undefined ? {} : { ecc });
const x = (n: number) => 'x'.repeat(n);
const IDS = ['qr', 'datamatrix', 'pdf417', 'aztec'] as const;
```

Every row of the spec's _Testing_ fixture table, through `check`. Valid rows assert with `toMatchObject` (only the facts the table states); invalid rows with `toStrictEqual`, so "no `reason`" means the key is absent.

```ts
/** Measured at bwip-js 4.11.4 (spec _Testing_; measurements file section 2 and Appendices A–D). Never edit
 *  an expected value to match the code. [format, ecc, payload, facts] */
const HW = 'hello world';
const VALID: [FormatId, string | undefined, string, Partial<SymbolFacts>][] = [
	['qr', 'M', HW, { bytes: 11, cols: 21, rows: 21, summary: '21×21 modules', dense: false }],
	['qr', 'H', HW, { cols: 25, rows: 25 }],
	['datamatrix', undefined, HW, { cols: 16, rows: 16, summary: '16×16 modules' }],
	['aztec', '23', HW, { cols: 19, rows: 19 }],
	['pdf417', 'auto', HW, { cols: 103, rows: 8, summary: '2 columns × 8 rows' }],
	['qr', 'L', x(16), { cols: 21 }],
	['qr', 'M', x(16), { cols: 25 }],
	['qr', 'Q', x(16), { cols: 25 }],
	['qr', 'H', x(16), { cols: 29 }],
	['qr', 'M', 'héllo → 日本', { bytes: 17, cols: 25 }],
	['qr', 'M', 'line1\nline2', { cols: 21 }],
	// fixedeclevel honoured: level 8 stays 8
	['pdf417', '8', x(900), { cols: 375, rows: 54, summary: '18 columns × 54 rows', dense: true }],
	['pdf417', '0', x(900), { cols: 273, rows: 38 }],
	['qr', 'L', x(2000), { cols: 149 }],
	// lower-case text compacts in Aztec; not over capacity
	['aztec', '23', x(2000), {}]
];

const TOO_LONG_RESULT: CheckResult = { valid: false, reason: 'too-long' };
const INVALID: [string, FormatId, string | undefined, string, CheckResult][] = [
	['empty (ReferenceError; check called directly)', 'qr', 'M', '', { valid: false }],
	['x × 2000 (qrcodeNoValidSymbol)', 'qr', 'H', x(2000), TOO_LONG_RESULT],
	['x × 5000', 'qr', 'M', x(5000), TOO_LONG_RESULT],
	['x × 8000', 'qr', 'M', x(8000), TOO_LONG_RESULT],
	['x × 3000', 'datamatrix', undefined, x(3000), TOO_LONG_RESULT],
	['x × 3200', 'datamatrix', undefined, x(3200), TOO_LONG_RESULT],
	['x × 1900', 'pdf417', 'auto', x(1900), TOO_LONG_RESULT],
	['x × 3000', 'pdf417', 'auto', x(3000), TOO_LONG_RESULT],
	['x × 3500', 'aztec', '23', x(3500), TOO_LONG_RESULT],
	['x × 5000', 'aztec', '23', x(5000), TOO_LONG_RESULT],
	['ecc X passed directly (qrcodeInvalidEClevel)', 'qr', 'X', 'x', { valid: false }],
	['lone surrogate (URIError)', 'qr', 'M', 'a\uD800b', { valid: false }]
];

describe('check: measured fixtures', () => {
	it.each(VALID)('%s at ecc %s is valid (row %#)', (id, ecc, payload, facts) => {
		expect(check(row(id), payload, opts(ecc))).toMatchObject({ valid: true, facts });
	});
	it.each(INVALID)('%s as %s at ecc %s', (_name, id, ecc, payload, expected) => {
		expect(check(row(id), payload, opts(ecc))).toStrictEqual(expected);
	});
});
```

`render`, including the mocked-encoder `parsererror` case. Its payload is used nowhere else in the file, because the module-level cache persists across tests:

```ts
const BAD_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 58 58"><path fill=rule="evenodd" d="M0 0h2v2H0z"/></svg>';

describe('render', () => {
	it.each(IDS)('draws %s hello world as an svg, 1024 px on its longer side, with a path', (id) => {
		const d = row(id);
		const el = render(d, 'hello world', resolveOptions(d, { format: id, ecc: '' }));
		expect(el.nodeName).toBe('svg');
		const [w, h] = [el.getAttribute('width'), el.getAttribute('height')].map(Number);
		expect(Math.max(w, h)).toBe(1024);
		expect(el.querySelector('path')).not.toBeNull();
	});

	it('keeps the quiet zone inside the QR viewBox', () => {
		const el = render(row('qr'), 'hello world', { ecc: 'M' });
		expect(el.getAttribute('viewBox')).toBe('0 0 58 58');
		expect([el.getAttribute('width'), el.getAttribute('height')]).toEqual(['1024', '1024']);
	});

	it('throws when the output does not parse as svg (the 4.11.3 fill-rule failure)', () => {
		vi.mocked(qrcode).mockImplementationOnce((() => BAD_SVG) as unknown as typeof qrcode);
		expect(() => render(row('qr'), 'parsererror-probe-payload', { ecc: 'M' })).toThrow(
			'bwip-js produced invalid SVG'
		);
	});
});
```

Error classification:

```ts
describe('bwippErrorName', () => {
	it('returns the stable name without the #NNNNN line number', () => {
		const qr = 'bwipp.qrcodeNoValidSymbol#27542: Maximum length exceeded or invalid content';
		expect(bwippErrorName(qr)).toBe('qrcodeNoValidSymbol');
		const pdf = 'bwipp.pdf417inputTooLong#22902: The input data is too long';
		expect(bwippErrorName(pdf)).toBe('pdf417inputTooLong');
	});
	it('returns undefined for a non-BWIPP message', () => {
		expect(bwippErrorName('bwip-js: bar code text not specified.')).toBeUndefined();
		expect(bwippErrorName('URI malformed')).toBeUndefined();
	});
});

describe('TOO_LONG', () => {
	it('holds exactly the twelve over-capacity names', () => {
		const names = [
			'qrcodeNoValidSymbol qrcodeInputTooLong qrcodeInputTooLarge',
			'datamatrixTooMuchData datamatrixInputTooLong datamatrixNoValidSymbol',
			'pdf417inputTooLong pdf417dataTooLong pdf417insufficientCapacity',
			'azteccodeInputTooLong azteccodeInputTooLarge aztecNoValidSymbol'
		].flatMap((group) => group.split(' '));
		expect([...TOO_LONG].sort()).toEqual(names.sort());
	});
});
```

Memoisation. Payloads are unique to this block; `mockClear` resets the counter without removing the real implementation:

```ts
describe('memoisation', () => {
	it('encodes once for check then render of the same input', () => {
		vi.mocked(qrcode).mockClear();
		check(row('qr'), 'memo-success-payload', { ecc: 'M' });
		render(row('qr'), 'memo-success-payload', { ecc: 'M' });
		expect(qrcode).toHaveBeenCalledTimes(1);
	});
	it('caches a failure: two checks of an over-capacity input encode once', () => {
		vi.mocked(qrcode).mockClear();
		const payload = 'memo-failure-' + 'y'.repeat(5000);
		expect(check(row('qr'), payload, { ecc: 'M' }).valid).toBe(false);
		expect(check(row('qr'), payload, { ecc: 'M' }).valid).toBe(false);
		expect(qrcode).toHaveBeenCalledTimes(1);
	});
});
```

The uqr cross-check (guards: the eclevel mapping and `fixedeclevel` never make bwip-js pick a larger QR than an independent encoder for the same data and level; exact equality is not required):

```ts
describe('uqr cross-check', () => {
	const PAYLOADS = ['hello world', 'https://example.com/p/1234567890abcdef', x(100), '1234567890'];
	const CASES = PAYLOADS.flatMap((p) =>
		(['L', 'M', 'Q', 'H'] as const).map((ecc) => [ecc, p] as const)
	);
	it.each(CASES)('at level %s, bwip-js is no larger than uqr for %s', (ecc, payload) => {
		const res = check(row('qr'), payload, { ecc });
		expect(res.valid).toBe(true);
		const cols = res.valid ? res.facts?.cols : undefined;
		expect(cols).toBeGreaterThanOrEqual(21);
		expect(cols).toBeLessThanOrEqual(encode(payload, { ecc, border: 0 }).size);
	});
});
```

The level mapping (guards: no size fixture changes when `fixedeclevel` or the Aztec level is dropped, because every Aztec fixture sits at the default and BWIPP only raises a QR level within the same version):

```ts
describe('ECC_OPTIONS', () => {
	it('fixes the chosen level for QR and numeric PDF417 and passes it plain for Aztec', () => {
		expect(ECC_OPTIONS.qrcode('H')).toEqual({ eclevel: 'H', fixedeclevel: true });
		expect(ECC_OPTIONS.datamatrix('M')).toEqual({});
		expect(ECC_OPTIONS.pdf417('auto')).toEqual({});
		expect(ECC_OPTIONS.pdf417('8')).toEqual({ eclevel: 8, fixedeclevel: true });
		expect(ECC_OPTIONS.azteccode('50')).toEqual({ eclevel: 50 });
	});
	it('reaches the encoder: check passes the mapped options to bwip-js', () => {
		check(row('qr'), 'level reaches the encoder', { ecc: 'H' }); // unique payload, so no cache hit
		expect(vi.mocked(qrcode).mock.lastCall?.[0]).toMatchObject({
			eclevel: 'H',
			fixedeclevel: true
		});
	});
});
```

One Vitest file snapshot per format, guarding against upstream regressions such as 4.11.3's malformed `fill-rule`:

```ts
describe('file snapshots', () => {
	it.each(IDS)('%s hello world at the default level', async (id) => {
		const d = row(id);
		const el = render(d, 'hello world', resolveOptions(d, { format: id, ecc: '' }));
		await expect(el.outerHTML).toMatchFileSnapshot(`./__snapshots__/bwipjs.${id}.svg`);
	});
});
```

- [ ] **Step 2: Write the failing `checkCode` tests, including two tokenisation rows** (the newline split and `\r` strip already hold; these rows fail on `valid` and `facts` until Step 5)

Append to `src/lib/codes.test.ts`:

```ts
describe('2D formats through parseCodeList', () => {
	it('x × 2000 under qr is valid at L and too long at H', () => {
		expect(parseCodeList('x'.repeat(2000), 'qr', 'L')[0]).toMatchObject({
			valid: true,
			facts: { cols: 149 }
		});
		expect(parseCodeList('x'.repeat(2000), 'qr', 'H')[0]).toMatchObject({
			valid: false,
			reason: 'too-long'
		});
	});

	it('splits 2D lists on newlines only and keeps commas as data', () => {
		const entries = parseCodeList('a,b\nc, d', 'qr');
		expect(entries.map((e) => e.raw)).toEqual(['a,b', 'c, d']);
		expect(entries.map((e) => e.value)).toEqual(['a,b', 'c, d']);
		expect(entries.every((e) => e.valid)).toBe(true);
	});

	it('strips Windows line endings from 2D tokens', () => {
		const entries = parseCodeList('hello world\r\nline two\r\n', 'qr');
		expect(entries.map((e) => e.raw)).toEqual(['hello world', 'line two']);
		expect(entries.map((e) => e.value)).toEqual(['hello world', 'line two']);
		// 11 bytes, not 12: no trailing \r reached the encoder.
		expect(entries[0]).toMatchObject({ valid: true, facts: { bytes: 11, cols: 21 } });
	});
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/engines/bwipjs.test.ts src/lib/codes.test.ts`
Expected: FAIL. `bwipjs.test.ts` with `Failed to resolve import "./bwipjs" from "src/lib/engines/bwipjs.test.ts". Does the file exist?`; `codes.test.ts` with `expected false to be true` and `expected { raw: 'x…', … valid: false } to match object { valid: true, … }` (the temporary `bwipjs` branch).

- [ ] **Step 4: Create `src/lib/engines/bwipjs.ts` exactly as the spec's _Engines_ code block**

Copy the block verbatim (doc comments included), adding the imports it omits: `import type { BwipDescriptor } from '$lib/formats';`, `import type { SymbolOptions } from '$lib/types';`, `import type { CheckResult, Engine } from './types';`. The tests depend on these parts being exactly as written:

- The cache key `${d.bcid}\u0000${options.ecc ?? ''}\u0000${value}`, and failures cached as `{ ok: false, error }` and rethrown on a hit.
- `QUIET_ZONE_PX = 8`, `NATURAL_PX = 1024`, `CACHE_MAX = 2000`, and the encoder call `{ ...extra, bcid: d.bcid, text: value, scale: 1, padding: QUIET_ZONE_PX }` with `...extra` first.
- `ECC_OPTIONS`: qrcode `{ eclevel: v, fixedeclevel: true }`; datamatrix `{}`; pdf417 `{}` for `auto`, else `{ eclevel: Number(v), fixedeclevel: true }`; azteccode `{ eclevel: Number(v) }`.
- `TOO_LONG` with the twelve names listed in the test.
- `bwippErrorName` as `/^bwipp\.([A-Za-z0-9]+)/`.
- `summary`: PDF417 `${(cols - 69) / 17} columns × ${rows} rows`, otherwise `${cols}×${rows} modules`.
- `render` throws `new Error('bwip-js produced invalid SVG')` when the imported root's `nodeName` is not `svg`, and sizes the longer side to `NATURAL_PX` from the viewBox.

- [ ] **Step 5: Dispatch `checkCode` to bwip-js in `src/lib/codes.ts`**

Add `import { engine as bwipEngine } from './engines/bwipjs';` and replace the temporary `bwipjs` branch with `bwipEngine.check(d, value, options)`. Remove the "temporary" comment.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/engines/bwipjs.test.ts src/lib/codes.test.ts`
Expected: PASS, with `Snapshots  4 written` on this first run. If any fixture row fails, STOP: do not edit the expected value or the adapter to make it pass; report the row, the actual value and the bwip-js version to a human. Then confirm each of the four `.svg` files begins with `<svg` and has a `viewBox`. GitHub Actions runs with `CI=true`, where Vitest will not write missing snapshots, so the files must be committed.

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean (Prettier ignores `.svg`).

- [ ] **Step 8: Commit**

```bash
git add src/lib/engines/bwipjs.ts src/lib/engines/bwipjs.test.ts src/lib/engines/__snapshots__ src/lib/codes.ts src/lib/codes.test.ts
git commit -m "feat: validate 2D codes with a memoised bwip-js adapter"
```

---

### Task 4: Rendering 2D symbols in the column

**Files:**

- Modify: `src/lib/barcode.ts` (whole file: new signature)
- Modify: `src/lib/scroller.ts:1-4` (import), `:45-51` (item classes, call)
- Modify: `src/lib/components/ScrollColumn.svelte:28-29` (stale comment), after `:81` (2D CSS)
- Test: `src/lib/barcode.test.ts:5-17`; `src/lib/scroller.test.ts` (append); `src/lib/components/ScrollColumn.test.ts` (append); `src/routes/play/page.test.ts` (append)

**Interfaces:**

- Consumes: `engine` from `engines/jsbarcode.ts` (Task 2) and `engines/bwipjs.ts` (Task 3); `CodeEntry.format`, `CodeEntry.options` and `parseCodeList(raw, format, ecc = '')` (Task 2).
- Produces: `renderBarcodeSvg(entry: CodeEntry): SVGElement`. A `.barcode-item` whose entry's descriptor is a `bwipjs` row also has the classes `barcode-item--2d` and `barcode-item--<id>` (for example `barcode-item--pdf417`). The scroller no longer reads `settings.format`.

- [ ] **Step 1: Write the failing tests**

`src/lib/barcode.test.ts`: drop the second argument at `:6-9` and `:15` (the fixtures already carry `format` from Task 2), import `parseCodeList` from `./codes`, and add:

```ts
it('dispatches a qr entry to bwip-js', () => {
	const svg = renderBarcodeSvg(parseCodeList('hello world', 'qr')[0]); // valid, options { ecc: 'M' }
	expect(svg.nodeName).toBe('svg');
	expect(svg.getAttribute('viewBox')).toBe('0 0 58 58');
	expect(svg.querySelector('path')).not.toBeNull();
});

it('passes the entry’s options to the engine', () => {
	// Level M is also BWIPP's default, so only a non-default level proves options reach the encoder.
	const svg = renderBarcodeSvg(parseCodeList('hello world', 'qr', 'H')[0]); // 25 modules at H
	expect(svg.getAttribute('viewBox')).toBe('0 0 66 66');
});
```

Append to `src/lib/scroller.test.ts`. Change `:3` to `import { DEFAULT_SETTINGS, type CodeEntry } from './types';` (the existing statement is `import type`, which cannot carry a value) and add `import { parseCodeList } from './codes';`:

```ts
it('marks 2D items with barcode-item--2d and barcode-item--<id>, and 1D items with neither', () => {
	// settings.format stays 'upc': the classes must come from the entry, not from the list format
	const s = createScroller(container, parseCodeList('hello world', 'qr'), DEFAULT_SETTINGS);
	const items = container.querySelectorAll('.barcode-item');
	expect(items.length).toBe(2);
	for (const item of items) {
		expect(item.classList.contains('barcode-item--2d')).toBe(true);
		expect(item.classList.contains('barcode-item--qr')).toBe(true);
		expect(item.querySelector('svg')).not.toBeNull();
	}
	s.destroy();
	const u = createScroller(container, entries, { ...DEFAULT_SETTINGS });
	expect(container.querySelector('.barcode-item--2d')).toBeNull();
	expect(container.querySelector('.barcode-item--upc')).toBeNull();
	u.destroy();
});
```

Append to `src/lib/components/ScrollColumn.test.ts` (import `parseCodeList` from `$lib/codes`):

```ts
it('mounts 2D entries with the 2D item classes', () => {
	const entries = parseCodeList('hello world', 'qr');
	const { container } = render(ScrollColumn, { entries, settings: SETTINGS }); // list format stays upc
	const items = container.querySelectorAll('.barcode-item.barcode-item--2d.barcode-item--qr');
	expect(items.length).toBe(2);
});
```

Append to `src/routes/play/page.test.ts` (the URL is a legacy query on purpose; Task 7 keeps it working):

```ts
it('renders a qr list with the 2D item classes', () => {
	mockPage.url = new URL('http://localhost/play?codes=hello%20world&fmt=qr&seed=7');
	const { container } = render(PlayPage);
	expect(container.querySelectorAll('.barcode-item').length).toBe(2);
	expect(container.querySelectorAll('.barcode-item--2d.barcode-item--qr').length).toBe(2);
});

it('renders a upc list with neither 2D class', () => {
	const { container } = render(PlayPage);
	expect(container.querySelector('.barcode-item--2d')).toBeNull();
	expect(container.querySelector('.barcode-item--qr')).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/barcode.test.ts src/lib/scroller.test.ts src/lib/components/ScrollColumn.test.ts src/routes/play/page.test.ts`
Expected: FAIL. `barcode.test.ts` fails with `Error: unsupported engine` (Task 2's guard: the one-argument calls pass `format` as `undefined`), and so does the play-page qr test, whose `fmt=qr` reaches the guard through `settings.format`. The scroller and ScrollColumn qr tests fail with JsBarcode's invalid-input error for UPC instead, because their `settings.format` stays `upc` and the old scroller still renders every entry as the list format.

- [ ] **Step 3: Implement `renderBarcodeSvg(entry: CodeEntry): SVGElement` in `src/lib/barcode.ts`**

Import `engine as jsbarcodeEngine` from `./engines/jsbarcode` and `engine as bwipEngine` from `./engines/bwipjs`. Look up `FORMAT_BY_ID.get(entry.format)`, throw ``new Error(`unknown format: ${entry.format}`)`` when absent, narrow on `d.engine`, and return `jsbarcodeEngine.render(d, entry.value, entry.options)` or `bwipEngine.render(d, entry.value, entry.options)`. Calls go through the `engine` objects, whose `Engine<D>` type takes three parameters, so the JsBarcode adapter's two-parameter functions type-check. Doc comment: renders one VALID entry; the bwip-js path reuses validation's encode cache.

- [ ] **Step 4: Add the item classes in `src/lib/scroller.ts`**

Import `FORMAT_BY_ID` from `./formats`. In `buildCopy` (`:45-51`), after `item.className = 'barcode-item'`, add both classes with ``item.classList.add('barcode-item--2d', `barcode-item--${e.format}`)`` when `FORMAT_BY_ID.get(e.format)?.engine === 'bwipjs'`, and call `renderBarcodeSvg(e)`. Transforms apply exactly as today.

- [ ] **Step 5: Add the 2D size caps and fix the stale comment in `ScrollColumn.svelte`**

- After the `.barcode-item svg` rule (`:78-81`), add the two rules from the spec's _Rendering 2D symbols in the column_ CSS block verbatim (`.scroll-column :global(.barcode-item--2d svg)` with `max-width: min(90vw, 640px); max-height: 60vh; width: auto; height: auto;` and `.scroll-column :global(.barcode-item--pdf417 svg)` with `max-width: min(95vw, 960px);` and its comment).
- Replace the comment at `:28-29` ("snapshots settings (including format)") with: the scroller snapshots entries and settings at mount; each entry carries its own format and options, and neither changes during a play session (live changes would require a remount).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/barcode.test.ts src/lib/scroller.test.ts src/lib/components/ScrollColumn.test.ts src/routes/play/page.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/barcode.ts src/lib/barcode.test.ts src/lib/scroller.ts src/lib/scroller.test.ts src/lib/components/ScrollColumn.svelte src/lib/components/ScrollColumn.test.ts src/routes/play/page.test.ts
git commit -m "feat: render 2D symbols in the scrolling column"
```

---

### Task 5: Validation list

**Files:**

- Modify: `src/lib/components/ValidationList.svelte:1-35` (script, markup, style)
- Test: `src/lib/components/ValidationList.test.ts` (append)

**Interfaces:**

- Consumes: `CodeEntry.format`, `.options`, `.facts`, `.reason` (Tasks 2–3); `FORMAT_BY_ID`, `eccChoice` (Task 1).
- Produces: each `li` is `<span class="raw">{raw}</span><span class="verdict">{verdict}</span>` with no whitespace between the spans; `<p class="dense-hint">` after the list when any entry has `facts.dense`. Props unchanged (`{ entries }`; no format prop).

Row rules (spec _Validation list_), tested top to bottom, first match wins. `label` is `FORMAT_BY_ID.get(entry.format)?.label`; `choice` is `eccChoice(descriptor, entry.options.ecc)`.

| condition                                                     | verdict span text                                   |
| ------------------------------------------------------------- | --------------------------------------------------- |
| valid, no facts, `encoded !== undefined && encoded !== value` | `` ` ✓ → ${encoded}` ``                             |
| valid, no facts                                               | `' ✓'`                                              |
| valid, facts                                                  | `` ` ✓ · ${facts.summary} · ${bytes}` `` + suffixes |
| invalid, `reason === 'too-long'`, `choice` defined            | `` ` ✗ too long for ${label} (${choice.label})` ``  |
| invalid, `reason === 'too-long'`                              | `` ` ✗ too long for ${label}` ``                    |
| invalid otherwise                                             | `' ✗ invalid'`                                      |

`${bytes}` is `1 byte` or `${n} bytes` with no grouping separator. Suffixes, in order, each only when true: `' · UTF-8, no ECI'` when `facts.bytes !== value.length`; `' · dense'` when `facts.dense`. The too-long-with-level row keys on `choice` being defined, not merely on the descriptor having `ecc`, so an entry with `options: {}` falls through to the unlevelled row (Review Focus 4).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/components/ValidationList.test.ts` (add `type SymbolFacts` to the `$lib/types` import and `import type { FormatId } from '$lib/formats';`). These are component fixtures: the list prints whatever facts it is given. Values mirror measured ones where one exists.

```ts
type F = [bytes: number, cols: number, rows: number, summary: string, dense?: boolean];
const facts = ([bytes, cols, rows, summary, dense = false]: F): SymbolFacts => ({
	bytes,
	cols,
	rows,
	summary,
	dense
});
/** A valid 2D entry; options carry `ecc` only when given. */
const ok = (raw: string, format: FormatId, ecc: string | undefined, f: F): CodeEntry => ({
	raw,
	value: raw,
	format,
	options: ecc === undefined ? {} : { ecc },
	valid: true,
	facts: facts(f)
});
const tooLong = (raw: string, format: FormatId, ecc?: string): CodeEntry => ({
	raw,
	value: raw,
	format,
	options: ecc === undefined ? {} : { ecc },
	valid: false,
	reason: 'too-long'
});
const rowTexts = (entries: CodeEntry[]) =>
	[...render(ValidationList, { entries }).container.querySelectorAll('.validation-list li')].map(
		(li) => li.textContent
	);
const X2000 = 'x'.repeat(2000);
const DENSE_HINT =
	'Dense: more than 100 modules across (PDF417: 300), so each module is small on screen. If the scanner misses these, shorten the payload, lower error correction if the format offers it, or go full screen.';
const qrHello = ok('hello world', 'qr', 'M', [11, 21, 21, '21×21 modules']);
const qrDense = ok(X2000, 'qr', 'L', [2000, 149, 149, '149×149 modules', true]);

describe('ValidationList 2D rows', () => {
	it('prints facts rows exactly, with 1 byte, no grouping and both suffixes in order', () => {
		const E = 'é'.repeat(1000);
		expect(
			rowTexts([
				qrHello,
				ok('hello world', 'pdf417', 'auto', [11, 103, 8, '2 columns × 8 rows']),
				ok('héllo → 日本', 'qr', 'M', [17, 25, 25, '25×25 modules']),
				ok('x', 'qr', 'M', [1, 21, 21, '21×21 modules']),
				qrDense,
				ok(E, 'qr', 'L', [2000, 149, 149, '149×149 modules', true])
			])
		).toEqual([
			'hello world ✓ · 21×21 modules · 11 bytes',
			'hello world ✓ · 2 columns × 8 rows · 11 bytes',
			'héllo → 日本 ✓ · 25×25 modules · 17 bytes · UTF-8, no ECI',
			'x ✓ · 21×21 modules · 1 byte',
			`${X2000} ✓ · 149×149 modules · 2000 bytes · dense`,
			`${E} ✓ · 149×149 modules · 2000 bytes · UTF-8, no ECI · dense`
		]);
	});

	it('prints too-long rows with the level only when the entry carries an accepted one', () => {
		const [X5000, X3000] = ['x'.repeat(5000), 'x'.repeat(3000)];
		const invalid: CodeEntry = {
			raw: 'x',
			value: 'x',
			format: 'qr',
			options: { ecc: 'M' },
			valid: false
		};
		expect(
			rowTexts([
				tooLong(X2000, 'qr', 'H'),
				tooLong(X5000, 'aztec', '23'),
				tooLong(X3000, 'datamatrix'),
				invalid
			])
		).toEqual([
			`${X2000} ✗ too long for QR Code (level H)`,
			`${X5000} ✗ too long for Aztec (≥23% error correction)`,
			`${X3000} ✗ too long for Data Matrix`,
			'x ✗ invalid'
		]);
	});

	it('falls back to the unlevelled too-long row when options.ecc is unset', () => {
		expect(rowTexts([tooLong(X2000, 'qr')])).toEqual([`${X2000} ✗ too long for QR Code`]);
	});

	it('splits each row into a raw span and a verdict span that starts with a space', () => {
		const { container } = render(ValidationList, { entries: [qrHello] });
		expect(container.querySelector('li .raw')?.textContent).toBe('hello world');
		expect(container.querySelector('li .verdict')?.textContent).toBe(
			' ✓ · 21×21 modules · 11 bytes'
		);
	});

	it('renders no arrow for entries without encoded', () => {
		const entries = [qrHello, qrDense, entry('036000291452', true)];
		const { container } = render(ValidationList, { entries });
		for (const v of container.querySelectorAll('.verdict'))
			expect(v.textContent).not.toContain('→');
	});

	it('shows the dense hint only when an entry is dense', () => {
		const hint = (entries: CodeEntry[]) =>
			render(ValidationList, { entries }).container.querySelector('.dense-hint');
		expect(hint([qrHello, qrDense])?.textContent).toBe(DENSE_HINT);
		expect(hint([qrHello])).toBeNull();
	});
});
```

The existing tests at `:9-43` stay unchanged and must keep passing: the `li` `textContent` is still `036000291452 ✓`, `bad ✗ invalid` and `590123412345 ✓ → 5901234123457`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/ValidationList.test.ts`
Expected: FAIL, for example `expected [ 'hello world ✓', … ] to deeply equal [ 'hello world ✓ · 21×21 modules · 11 bytes', … ]` and `expected undefined to be 'hello world'` where `.raw` is queried through `?.textContent`.

- [ ] **Step 3: Implement the rows in `ValidationList.svelte`**

- Script: import `FORMAT_BY_ID` and `eccChoice` from `$lib/formats`. Replace `rowText` with `verdict(entry: CodeEntry): string`, one expression per the table above that always starts with a space. Keep the comment explaining that a single expression keeps exact-`textContent` tests byte-stable.
- Markup: `<li class={entry.valid ? 'valid' : 'invalid'}><span class="raw">{entry.raw}</span><span class="verdict">{verdict(entry)}</span></li>`. There must be no whitespace between the two spans. Prettier may move the pair onto its own line inside `<li>`; that is fine, because Svelte drops leading and trailing whitespace inside an element. Keep `</span><span` adjacent.
- Script: `const DENSE_HINT = '…';` holding the exact text from the test as one string literal (Prettier never breaks a string). After `</ul>`: `{#if entries.some((e) => e.facts?.dense)}<p class="dense-hint">{DENSE_HINT}</p>{/if}`. Never write this copy as markup text: Prettier reflows text past 100 columns onto tab-indented lines, Svelte keeps those newlines and tabs in `textContent`, and the exact-text test fails.
- Style (presentation, untested): `.valid` colour `#007700` (was `#0a0`, for 4.5:1 contrast); `.invalid` stays `#c00`. Each `li` is `display: flex`. `.raw` gets `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, so a long payload ellipsises. `.verdict` gets `flex: none; white-space: pre`, because a flex item drops its leading space otherwise, which would glue the verdict to the payload on screen.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/ValidationList.test.ts src/routes/page.test.ts`
Expected: PASS (the setup page's `shows exact arrow rows for encoder mutations, numeric and text` and `shows no arrow for app-side whitespace stripping` tests still pass).

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ValidationList.svelte src/lib/components/ValidationList.test.ts
git commit -m "feat: show symbol size, bytes and density in the validation list"
```

---

### Task 6: Setup page error-correction field

**Files:**

- Modify: `src/routes/+page.svelte:6` (imports), `:27` (`entries`; `descriptor` goes after the `ecc` state Task 2 added), `:30-34` (placeholder), `:76-87` (Format select binding and the new field), plus a `selectFormat` function in the script
- Modify: `src/routes/play/+page.svelte:19`
- Test: `src/routes/page.test.ts` (append)

**Interfaces:**

- Consumes: `FORMAT_BY_ID`, `isEccChoice` (Task 1); `parseCodeList(raw, format, ecc)` and the `ecc` state (Task 2); validation rows (Task 5).
- Produces: `.ecc-field` (label text `Error correction`) and `.ecc-input` on the setup page, rendered only when the selected descriptor has `ecc`. `ecc` changes both `entries` and `settings`. The play page validates with `settings.ecc`.

This task asserts the setting through the select's value and the validation rows. `encodeShareUrl` does not emit `ecc` until Task 7, so these tests live in Task 7: the Start-URL assertions (level H then M drops `ecc`; qr at H → aztec emits none; the `&fmt=qr&ecc=H` variant) and the play-page bounce for `fmt=qr&ecc=H`, which also needs Task 7's decoder.

- [ ] **Step 1: Write the failing route tests**

Append to `src/routes/page.test.ts`:

```ts
describe('setup page: error correction', () => {
	const X2000 = 'x'.repeat(2000);
	const setText = (c: Element, v: string) =>
		fireEvent.input(q(c, '.code-input'), { target: { value: v } });
	const choose = (c: Element, sel: string, v: string) =>
		fireEvent.change(q(c, sel), { target: { value: v } });
	const setFormat = (c: Element, v: string) => choose(c, '.format-input', v);
	const setEcc = (c: Element, v: string) => choose(c, '.ecc-input', v);
	const firstRow = (c: Element) => c.querySelector('.validation-list li')?.textContent;

	it('validates hello world as qr with the facts row and shows the field at the default level', async () => {
		const { container } = render(SetupPage);
		await setText(container, 'hello world');
		await setFormat(container, 'qr');
		expect(firstRow(container)).toBe('hello world ✓ · 21×21 modules · 11 bytes');
		const select = q<HTMLSelectElement>(container, '.ecc-input');
		expect(select.value).toBe('M');
		expect(select.selectedOptions[0].textContent).toBe('level M (~15% recovery, default)');
		expect(q(container, '.ecc-field').textContent?.startsWith('Error correction')).toBe(true);
		const input = q<HTMLTextAreaElement>(container, '.code-input');
		expect(input.placeholder).toBe('Paste codes — one per line');
	});

	it('renders no field for upc or datamatrix', async () => {
		const { container } = render(SetupPage);
		expect(container.querySelector('.ecc-input')).toBeNull();
		await setFormat(container, 'datamatrix');
		expect(container.querySelector('.ecc-input')).toBeNull();
	});

	it('applies the chosen level to validation and returns to the default', async () => {
		const { container } = render(SetupPage);
		await setText(container, X2000);
		await setFormat(container, 'qr');
		expect(firstRow(container)).toBe(`${X2000} ✓ · 169×169 modules · 2000 bytes · dense`);
		await setEcc(container, 'H');
		expect(firstRow(container)).toBe(`${X2000} ✗ too long for QR Code (level H)`);
		await setEcc(container, 'M');
		expect(q<HTMLSelectElement>(container, '.ecc-input').value).toBe('M');
		expect(firstRow(container)).toBe(`${X2000} ✓ · 169×169 modules · 2000 bytes · dense`);
	});

	it('resets to the new format’s default when switching from qr at H to aztec', async () => {
		const { container } = render(SetupPage);
		await setText(container, 'hello world');
		await setFormat(container, 'qr');
		await setEcc(container, 'H');
		await setFormat(container, 'aztec');
		const select = q<HTMLSelectElement>(container, '.ecc-input');
		expect(select.value).toBe('23');
		expect(select.selectedOptions[0].textContent).toBe('≥23% error correction (default)');
		expect(firstRow(container)).toBe('hello world ✓ · 19×19 modules · 11 bytes');
	});
});
```

(`169×169` is Appendix C's measured QR M size for `x` × 2000; `19×19` is the measured Aztec size for `hello world` at 23. If `ecc` kept `'H'` after the switch, the select's getter would return a value with no matching option and `select.value` would be `''`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/routes/page.test.ts`
Expected: FAIL with `Cannot read properties of null (reading 'value')` where `.ecc-input` is queried and `Unable to fire a "change" event - please provide a DOM element.` where `setEcc` is called; the "no field" test already passes.

- [ ] **Step 3: Add the field and the reset rule to `src/routes/+page.svelte`**

- `:6` imports `FORMAT_BY_ID, FORMAT_GROUPS, isEccChoice, type FormatId` from `$lib/formats`.
- After the `ecc` state (Task 2) add `const descriptor = $derived(FORMAT_BY_ID.get(format));`. The placeholder at `:30-34` reads `descriptor?.numeric`; its two strings are unchanged, so 2D formats get `Paste codes — one per line`.
- `:27` becomes `$derived(parseCodeList(text, format, ecc))`.
- Add `function selectFormat(next: FormatId): void`. It sets `ecc = ''` when the next descriptor does not accept the current value (`!isEccChoice(nextDescriptor, ecc)`, treating a missing descriptor as not accepting) or the value equals the next descriptor's `ecc?.defaultValue`, then sets `format = next`. No `$effect` writes setup state.
- `:78`: the Format select binds `bind:value={() => format, (v) => selectFormat(v)}`.
- Directly after the Format field's `</label>` (`:87`), paste the spec's `{#if descriptor?.ecc}` … `{/if}` block (_Error correction setting_) verbatim: `{@const opt = descriptor.ecc}`, `<label class="field ecc-field">Error correction`, `<select class="ecc-input" bind:value={() => ecc || opt.defaultValue, (v) => (ecc = v === opt.defaultValue ? '' : v)}>`, options ``{c.note ? `${c.label} (${c.note})` : c.label}`` keyed by `c.value`. It is rendered conditionally, never toggled with `hidden`, because `.field` sets `display: flex`.

- [ ] **Step 4: Validate the play page with the list level**

`src/routes/play/+page.svelte:19` → `parseCodeList(decoded.codes.join('\n'), settings.format, settings.ecc)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/routes/page.test.ts src/routes/play/page.test.ts`
Expected: PASS. The play-page change in Step 4 is only regression-checked here; its behavioural test, the `fmt=qr&ecc=H` bounce, is in Task 7.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/routes/+page.svelte src/routes/page.test.ts src/routes/play/+page.svelte
git commit -m "feat: add the error correction setting to the setup page"
```

---

### Task 7: Share state in the URL fragment, plus the `ecc` param

**Files:**

- Modify: `src/lib/shareUrl.ts:1-2` (imports), `:10-24` (encode and its doc comment), `:26-29` (decode signature, source selection, doc comment), after `:82` (`ecc`)
- Modify: `src/routes/+page.svelte:1-2` (import `onMount`), `:13` (decode), `:60` (eslint rationale), plus a `hashchange` `onMount`
- Modify: `src/routes/play/+page.svelte:14` (decode), `:32-33` (bounce), `:43-52` (Back), `:50` (eslint rationale), plus a second `onMount`
- Test: `src/lib/shareUrl.test.ts` (every decode call, new blocks); `src/routes/page.test.ts:21-27, 46-53` plus appended tests; `src/routes/play/page.test.ts:15, 41-47` plus appended tests

**Interfaces:**

- Consumes: `FORMAT_BY_ID`, `DEFAULT_FORMAT`, `isEccChoice` (Task 1); `Settings.ecc` (Task 2); the `.ecc-input` field (Task 6).
- Produces: `encodeShareUrl(codes: string[], settings: Settings): string` returning `'#codes=…&speed=…&loop=…&rot=…&rotmax=…&skew=…&skewmax=…&seed=…&fmt=…'` plus `&ecc=…` only for an accepted, non-default level; `decodeShareUrl(url: URL): { codes: string[]; settings: Partial<Settings> }`. Both pages decode `page.url` once and reload on `hashchange`. Task 8 consumes the fragment string as ShareLink's `hash`.

- [ ] **Step 1: Write the failing codec tests**

In `src/lib/shareUrl.test.ts`, import `type Settings` alongside `DEFAULT_SETTINGS`, add `const at = (s: string) => new URL('http://localhost/' + s);` and wrap every `decodeShareUrl(x)` call as `decodeShareUrl(at(x))` (`:17, 33-36, 40-41, 55, 71-76, 91, 95-96, 100`). The `'?…'` literals stay legacy query strings; they now exercise the query fallback. The expected decoded settings still have no `ecc`. Append:

```ts
describe('fragment', () => {
	it('encodes to a fragment with the params in today’s order', () => {
		expect(encodeShareUrl(['1'], DEFAULT_SETTINGS)).toBe(
			'#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
	});

	it('reads the fragment when it has codes, else the query', () => {
		expect(decodeShareUrl(new URL('http://localhost/?codes=1#top')).codes).toEqual(['1']);
		expect(decodeShareUrl(new URL('http://localhost/?codes=a#codes=b')).codes).toEqual(['b']);
		expect(decodeShareUrl(new URL('http://localhost/?codes=1#')).codes).toEqual(['1']);
	});

	it('round-trips payloads containing # & % + , and spaces', () => {
		const codes = ['a#b&c%d+e,f g', '50% off + tax, #1 & more'];
		expect(
			decodeShareUrl(at(encodeShareUrl(codes, { ...DEFAULT_SETTINGS, format: 'code128' }))).codes
		).toEqual(codes);
	});

	it('encodes a non-ASCII payload as an all-ASCII fragment, so length equals bytes', () => {
		const hash = encodeShareUrl(['héllo → 日本'], { ...DEFAULT_SETTINGS, format: 'qr' });
		expect(hash).toMatch(/^[\x21-\x7e]*$/);
		expect(decodeShareUrl(at(hash)).codes).toEqual(['héllo → 日本']);
	});

	it('does not throw on a hand-mangled fragment', () => {
		expect(decodeShareUrl(new URL('http://localhost/play#codes=50%')).codes).toEqual(['50%']);
	});
});

describe('ecc param', () => {
	const enc = (over: Partial<Settings>) => encodeShareUrl(['1'], { ...DEFAULT_SETTINGS, ...over });
	const dec = (hash: string) => decodeShareUrl(at(hash)).settings;

	it('follows fmt only for an accepted, non-default level', () => {
		expect(enc({ format: 'qr', ecc: 'H' })).toMatch(/&fmt=qr&ecc=H$/);
		expect(enc({ format: 'qr', ecc: 'M' })).not.toContain('ecc=');
		expect(enc({ format: 'aztec', ecc: 'H' })).not.toContain('ecc=');
		expect(enc({ format: 'upc', ecc: 'H' })).not.toContain('ecc=');
	});

	it('decodes ecc after resolving fmt, in either param order', () => {
		expect(dec('#codes=1&ecc=H&fmt=qr')).toEqual({ format: 'qr', ecc: 'H' });
		expect(dec(enc({ format: 'qr', ecc: 'H' })).ecc).toBe('H');
	});

	it('emits no ecc key for a default, foreign or unknown level', () => {
		expect('ecc' in dec('#codes=1&ecc=M&fmt=qr')).toBe(false);
		expect('ecc' in dec('#codes=1&ecc=auto&fmt=pdf417')).toBe(false);
		expect('ecc' in dec('#codes=1&ecc=H&fmt=upc')).toBe(false);
		expect('ecc' in dec('#codes=1&ecc=Z&fmt=qr')).toBe(false);
	});

	it('drops ecc when fmt is absent or unknown, without throwing', () => {
		expect(dec('#codes=1&ecc=H')).toEqual({});
		expect(dec('#codes=1&fmt=nope&ecc=H')).toEqual({});
	});
});
```

- [ ] **Step 2: Write the failing setup-route tests**

In `src/routes/page.test.ts` (import `encodeShareUrl` from `$lib/shareUrl` and `DEFAULT_SETTINGS` from `$lib/types`):

- Rename `:21` to `prefills the textarea and settings from a legacy ?codes= URL` (body unchanged) and add a twin that uses `http://localhost/#codes=036000291452&speed=120&loop=1` with the same three assertions.
- `:50-52` becomes `expect(goto).toHaveBeenCalledWith('/play#codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc');`

Append:

```ts
describe('setup page: fragment URLs and ecc in the Start URL', () => {
	const setEcc = (c: Element, v: string) =>
		fireEvent.change(q(c, '.ecc-input'), { target: { value: v } });

	it('ends the Start URL with &fmt=qr&ecc=H for qr at level H', async () => {
		mockPage.url = new URL('http://localhost/#codes=hello%20world&seed=0&fmt=qr&ecc=H');
		const { container } = render(SetupPage);
		await fireEvent.click(q(container, '.start'));
		expect(goto).toHaveBeenCalledWith(
			'/play#codes=hello+world&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=qr&ecc=H'
		);
	});

	it('drops ecc from the Start URL after choosing level H then level M', async () => {
		mockPage.url = new URL('http://localhost/#codes=hello%20world&seed=0&fmt=qr');
		const { container } = render(SetupPage);
		await setEcc(container, 'H');
		await fireEvent.click(q(container, '.start'));
		await setEcc(container, 'M');
		await fireEvent.click(q(container, '.start'));
		expect(goto.mock.calls[0][0]).toMatch(/&fmt=qr&ecc=H$/);
		expect(goto.mock.calls[1][0]).toMatch(/&fmt=qr$/);
	});

	it('emits no ecc after switching from qr at H to aztec', async () => {
		mockPage.url = new URL('http://localhost/#codes=hello%20world&seed=0&fmt=qr&ecc=H');
		const { container } = render(SetupPage);
		await fireEvent.change(q(container, '.format-input'), { target: { value: 'aztec' } });
		await fireEvent.click(q(container, '.start'));
		expect(goto.mock.calls[0][0]).toMatch(/^\/play#codes=hello\+world&/);
		expect(goto.mock.calls[0][0]).toMatch(/&fmt=aztec$/);
	});

	it('carries a payload with # & % + , and spaces into the Start URL unchanged', async () => {
		const codes = ['a#b&c%d+e,f g'];
		const s = { ...DEFAULT_SETTINGS, format: 'code128' as const, seed: 7 };
		mockPage.url = new URL('http://localhost/' + encodeShareUrl(codes, s));
		const { container } = render(SetupPage);
		expect(q<HTMLTextAreaElement>(container, '.code-input').value).toBe('a#b&c%d+e,f g');
		await fireEvent.click(q(container, '.start'));
		expect(goto.mock.calls[0][0]).toMatch(/^\/play#codes=/);
		expect(goto).toHaveBeenCalledWith('/play' + encodeShareUrl(codes, s));
	});

	it('reloads on hashchange, and not after unmount', () => {
		const reload = vi.fn();
		const { origin, pathname } = location;
		vi.stubGlobal('location', { origin, pathname, reload });
		try {
			const { unmount } = render(SetupPage);
			window.dispatchEvent(new Event('hashchange'));
			expect(reload).toHaveBeenCalledTimes(1);
			unmount();
			window.dispatchEvent(new Event('hashchange'));
			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
```

`location.reload` on jsdom's `Location` is non-configurable, so it cannot be spied on. Vitest's jsdom environment defines `location` on the global as configurable (and `window` is the global), so `vi.stubGlobal` replaces it for both `location` and `window.location`. The stub keeps `origin` and `pathname` because ShareLink reads them.

- [ ] **Step 3: Write the failing play-route tests**

In `src/routes/play/page.test.ts`:

- `:15` → `const PLAY_URL = 'http://localhost/play#codes=036000291452%0Abad%0A012345678905&seed=7';`
- In `:41-47` add `expect(goto.mock.calls[0][0]).toMatch(/^\/#codes=/);`
- `:58-63` (`/play?codes=bad` → `/?codes=bad`) stays as is.

Append:

```ts
it('bounces a fragment URL with no valid codes to the setup fragment', () => {
	mockPage.url = new URL('http://localhost/play#codes=bad');
	const { container } = render(PlayPage);
	expect(container.querySelector('.play')).toBeNull();
	expect(goto).toHaveBeenCalledWith('/#codes=bad', { replaceState: true });
});

it('validates with the URL level: x × 2000 bounces at H and plays at L', () => {
	const X2000 = 'x'.repeat(2000);
	mockPage.url = new URL(`http://localhost/play#codes=${X2000}&fmt=qr&ecc=H&seed=7`);
	const first = render(PlayPage);
	expect(first.container.querySelector('.play')).toBeNull();
	expect(goto).toHaveBeenCalledWith(`/#codes=${X2000}&fmt=qr&ecc=H&seed=7`, { replaceState: true });
	first.unmount();
	mockPage.url = new URL(`http://localhost/play#codes=${X2000}&fmt=qr&ecc=L&seed=7`);
	expect(render(PlayPage).container.querySelectorAll('.barcode-item').length).toBe(2);
});

it('still plays a legacy ?codes= URL', () => {
	mockPage.url = new URL('http://localhost/play?codes=036000291452%0Abad%0A012345678905&seed=7');
	expect(render(PlayPage).container.querySelectorAll('.barcode-item').length).toBe(4);
});

it('builds Back from the decoded codes, not the parsed entries', async () => {
	// Under upc one decoded code "a,b" parses into two entries; Back must keep "a,b".
	mockPage.url = new URL('http://localhost/play#codes=036000291452%2C012345678905&seed=7');
	const { container } = render(PlayPage);
	await fireEvent.click(q(container, '.ctl-back'));
	expect(goto).toHaveBeenCalledWith(
		'/' + encodeShareUrl(['036000291452,012345678905'], { ...DEFAULT_SETTINGS, seed: 7 })
	);
});

it('carries a payload with # & % + , and spaces through Back unchanged', async () => {
	const codes = ['a#b&c%d+e,f g'];
	const s = { ...DEFAULT_SETTINGS, format: 'code128' as const, seed: 7 };
	mockPage.url = new URL('http://localhost/play' + encodeShareUrl(codes, s));
	const { container } = render(PlayPage);
	expect(container.querySelectorAll('.barcode-item').length).toBe(2);
	await fireEvent.click(q(container, '.ctl-back'));
	expect(goto.mock.calls[0][0]).toMatch(/^\/#codes=/);
	expect(goto).toHaveBeenCalledWith('/' + encodeShareUrl(codes, s));
});
```

Also append `reloads on hashchange, and not after unmount`, written exactly like the setup page's test in Step 2 but rendering `PlayPage` (the default `PLAY_URL` has valid codes, so the page mounts).

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run src/lib/shareUrl.test.ts src/routes/page.test.ts src/routes/play/page.test.ts`
Expected: FAIL. shareUrl with `expected '?codes=1&speed=60…' to be '#codes=1&speed=60…'` (the old decoder hands the `URL` object to `URLSearchParams`, which reads it as an empty record, so decoded `codes` come back `[]`); setup with `expected "spy" to be called with arguments: [ '/play#codes=…' ]`; play with `expected +0 to be 4`, because the fragment `PLAY_URL` decodes to no codes and bounces. Without their `^/play#codes=` or `^/#codes=` assertion, three new tests would pass against the old code (the two payload round-trips build both sides from `encodeShareUrl`, and the aztec test passes because the old encoder never emits `ecc`); those assertions make them fail first. Keep all three as regression guards (jsdom runs click listeners even on the disabled Start button, which is why the aztec test reaches `goto` with an empty list). Four other new tests pass before the codec exists and also stay as regression guards: the play `still plays a legacy ?codes= URL`, the setup legacy-prefill test, and the `ecc param` tests `emits no ecc key…` and `drops ecc when fmt is absent…`, because the old decoder still reads `?codes=` and returns `{}` for a `URL` object.

- [ ] **Step 5: Implement the fragment codec in `src/lib/shareUrl.ts`**

- Import `DEFAULT_FORMAT`, `FORMAT_BY_ID`, `isEccChoice`, `isFormatId` from `./formats`.
- `encodeShareUrl`: the same params in the same order; after `fmt`, set `ecc` only when the settings' descriptor has `ecc`, `isEccChoice` accepts `settings.ecc`, and it is not `ecc.defaultValue`. Return `'#' + params.toString()`. Doc comment: builds the share fragment `#codes=…&…&fmt=…`; params after `fmt` appear only when they differ from their default, in a fixed order; codes are joined with `\n` so commas and spaces survive.
- `decodeShareUrl(url: URL)`: parse `url.hash.slice(1)`; if it has a `codes` key it is the source, otherwise `url.search.slice(1)` is. Per-parameter rules unchanged. After `fmt`, resolve the descriptor of `settings.format ?? DEFAULT_FORMAT` and set `settings.ecc` only when `isEccChoice` accepts the raw value and it is not that descriptor's default. Doc comment: parses a page URL (fragment when it carries `codes`, else the legacy query string, so old links keep working); lenient per parameter; never throws. No comment may still mention `?codes` or `location.search`.

- [ ] **Step 6: Switch both routes to the page URL, the fragment and the reload listener**

- `+page.svelte:13` and `play/+page.svelte:14`: `decodeShareUrl(page.url)`.
- Each page imports `onMount` (the play page already does) and adds a separate `onMount` that registers `() => location.reload()` as a `window` `hashchange` listener and returns its removal. On the play page it must not share the bounce `onMount`, whose early return would skip it. Comment it: a pasted share link or an edited fragment on the same path is a same-document navigation, so SvelteKit updates `page.url` without remounting and the page (which decodes once) must reload; our own `goto` calls use `pushState`/`replaceState`, which never fire `hashchange`.
- Start (`+page.svelte:61`) still navigates to `resolve('/play') + encodeShareUrl(rawCodes, settings)`; Task 8 replaces the call with `shareHash`.
- The play bounce (`:33`) becomes `goto(resolve('/') + page.url.search + page.url.hash, { replaceState: true })`, and its comment says it keeps whichever form it received.
- Back (`:43-52`) becomes `resolve('/') + encodeShareUrl(decoded.codes, currentSettings())`: decoded share state plus the live speed, never `entries`.
- The three `eslint-disable-next-line svelte/no-navigation-without-resolve` rationales (`+page.svelte:60`, `play/+page.svelte:32`, `:50`) end "…the rule cannot see through the fragment concatenation".

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/lib/shareUrl.test.ts src/routes/page.test.ts src/routes/play/page.test.ts src/lib/components/ShareLink.test.ts`
Expected: PASS (ShareLink still takes `{ codes, settings }` and its URLs now contain `#codes=`).

- [ ] **Step 8: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 9: Commit**

```bash
git add src/lib/shareUrl.ts src/lib/shareUrl.test.ts src/routes/+page.svelte src/routes/page.test.ts src/routes/play/+page.svelte src/routes/play/page.test.ts
git commit -m "feat: move share state to the URL fragment and carry ecc"
```

---

### Task 8: Share link: dynamic QR capacity

**Files:**

- Modify: `src/lib/qr.ts:1-19` (whole file)
- Modify: `src/lib/components/ShareLink.svelte:1-52` (script and markup; the styles at `:54-73` stay)
- Modify: `src/routes/+page.svelte` (`shareHash` after `settings`, Start at `:61`, `<ShareLink>` at `:131`)
- Test: `src/lib/qr.test.ts:1-32` (rewrite), `src/lib/components/ShareLink.test.ts:1-92` (rewrite)

**Interfaces:**

- Consumes: `encodeShareUrl` (Task 7), called by the setup page and the tests, never by ShareLink.
- Produces: in `src/lib/qr.ts`, `QrEcc = 'L' | 'M' | 'Q' | 'H'`, `QR_CAPACITY_BYTES: Record<QrEcc, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 }`, `QrStatus`, `qrStatus(text: string, ecc: QrEcc): QrStatus` and `buildQrSvg(text: string, ecc: QrEcc): string | null`, with `QR_DENSE_VERSION = 20` unchanged and `QrResult` deleted. ShareLink's props become `{ hash: string }`. The setup page gets `const shareHash = $derived(encodeShareUrl(rawCodes, settings))`.

- [ ] **Step 1: Rewrite `src/lib/qr.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildQrSvg, qrStatus, QR_CAPACITY_BYTES } from './qr';

// uqr 0.1.3 values: ISO/IEC 18004 version-40 byte capacities, plus the measurements file Appendix D.

describe('qrStatus', () => {
	it('fits a short link', () => {
		expect(qrStatus('https://nzneit.github.io/scandible/#codes=036000291452', 'M')).toEqual({
			kind: 'fits'
		});
	});
	it('flags a version above QR_DENSE_VERSION (20) as dense', () => {
		expect(qrStatus('A'.repeat(1000), 'M')).toEqual({ kind: 'dense' });
	});
	it('uses the ISO/IEC 18004 version-40 byte capacities', () => {
		expect(QR_CAPACITY_BYTES).toEqual({ L: 2953, M: 2331, Q: 1663, H: 1273 });
	});
	it.each(['L', 'M', 'Q', 'H'] as const)(
		'holds exactly the capacity at %s and reports one more as too long',
		(ecc) => {
			const cap = QR_CAPACITY_BYTES[ecc];
			expect(qrStatus('x'.repeat(cap), ecc).kind).not.toBe('too-long');
			expect(qrStatus('x'.repeat(cap + 1), ecc)).toEqual({
				kind: 'too-long',
				ecc,
				length: cap + 1,
				capacity: cap
			});
		}
	);
});

describe('buildQrSvg', () => {
	it('renders at the level it is given', () => {
		// x × 16: 29 modules at H, 21 at L. uqr's border: 2 adds 4 (33 and 25); its default pixelSize is 10.
		expect(buildQrSvg('x'.repeat(16), 'H')).toContain('viewBox="0 0 330 330"');
		expect(buildQrSvg('x'.repeat(16), 'L')).toContain('viewBox="0 0 250 250"');
	});
	it('returns null over capacity', () => {
		expect(buildQrSvg('A'.repeat(4000), 'M')).toBeNull();
	});
});
```

Also keep today's two remaining `buildQrSvg` tests, passing `'M'`: a short link returns a string containing `<svg` and matching `/<(path|rect)/`, and the same text gives an identical string twice.

- [ ] **Step 2: Rewrite `src/lib/components/ShareLink.test.ts` per the list below**

Every render passes `{ hash }`. The two `.url-warning` tests (`:23-36`) are deleted. The dense and too-long tests (`:46-54`, `:56-66`) assert exact text, with `length` computed from `location.origin + location.pathname + hash`, never hard-coded (jsdom's origin differs from the mocked page URL). The two `rerender` tests (`:68-91`) become one.

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ShareLink from './ShareLink.svelte';
import { encodeShareUrl } from '$lib/shareUrl';
import { QR_CAPACITY_BYTES } from '$lib/qr';
import { DEFAULT_SETTINGS, type Settings } from '$lib/types';

const SETTINGS: Settings = { ...DEFAULT_SETTINGS };
const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;
const hashOf = (n: number) =>
	encodeShareUrl(
		Array.from({ length: n }, () => '036000291452'),
		SETTINGS
	);
const liveUrl = (hash: string) => location.origin + location.pathname + hash;
const n = (v: number) => new Intl.NumberFormat('en-US').format(v);
const DENSE = 'This link makes a dense QR code. Hold the phone steady, or share the link itself.';
const tooLongAt = (ecc: string, length: number, capacity: number) =>
	`Too long for a QR code at level ${ecc}: this link is ${n(length)} characters and level ${ecc} holds at most ${n(capacity)}. Choose level L, or shorten the list. The link itself still works.`;
const tooLong = (length: number) =>
	`Too long for a QR code: this link is ${n(length)} characters and a QR holds at most 2,953. Shorten the list to share it as a QR. The link itself still works.`;
const status = (c: Element) => q<HTMLElement>(c, '.qr-status');
const setLevel = (c: Element, v: string) =>
	fireEvent.change(q(c, '.share-ecc-input'), { target: { value: v } });
```

Tests, in this order (each `render(ShareLink, { hash })`):

1. `labels the button "Share link"`: kept from `:10-13`.
2. `shows the live URL before any click and has no .url-warning`: `.share-url` value `toBe(liveUrl(hashOf(1)))`; `container.querySelector('.url-warning')` is `null`.
3. `renders an empty, always-present status with role="status" for a one-code list`: `status(c).getAttribute('role')` is `'status'`; `textContent` is `''`.
4. `offers the share levels L, M, Q, H with M selected`: option `textContent`s equal `['L (most capacity)', 'M (default)', 'Q', 'H']`, values `['L', 'M', 'Q', 'H']`, select value `'M'`; `q(c, '.share-ecc-field').textContent` starts with `Share QR error correction`.
5. `renders a QR code into .qr-code on click`: kept from `:38-44`.
6. `shows the dense text live and still renders the QR` with `hashOf(80)`: status is `DENSE` before any click; after a click `.qr-code svg` is not `null`.
7. `names level L when it would hold the link, and updates as the level changes` with `hashOf(160)`: `const len = liveUrl(hash).length;` guard the fixture with `expect(len).toBeGreaterThan(QR_CAPACITY_BYTES.M)` and `expect(len).toBeLessThanOrEqual(QR_CAPACITY_BYTES.L)`; then status is `tooLongAt('M', len, 2331)`; after `setLevel(c, 'H')` it is `tooLongAt('H', len, 1273)`; after `setLevel(c, 'L')` it is `DENSE` and does not contain `Choose level L`.
8. `uses the general too-long text beyond level L's capacity` with `hashOf(300)` and `const len = liveUrl(hash).length;`: status is `tooLong(len)` at M, and still `tooLong(len)` after `setLevel(c, 'L')`.
9. `copies a too-long link on click but renders no QR` with `hashOf(300)`: define `navigator.clipboard` for the test, `Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })` with `const writeText = vi.fn(() => Promise.resolve())`, and remove it in `finally` with `Reflect.deleteProperty(navigator, 'clipboard')`. After a click, `writeText` was called with `liveUrl(hash)`, `.qr-code` is `hidden` and has no `svg`.
10. `clears a rendered QR when the level changes` with `hashOf(1)`: click, an `svg` is present; `setLevel(c, 'H')`; `.qr-code` is `hidden` with no `svg`.
11. `clears a rendered QR when the hash prop changes`: click, an `svg` is present; `await rerender({ hash: encodeShareUrl(['012345678905'], SETTINGS) })`; `.qr-code` is `hidden` with no `svg`, and `status(c).textContent` is `''` (this replaces the old `hidden` assertion at `:79`).

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/qr.test.ts src/lib/components/ShareLink.test.ts`
Expected: FAIL. qr with `TypeError: (0 , qrStatus) is not a function`; ShareLink with `expected '' to be 'http://localhost:3000/#codes=036000291452&…'` and failures on the status assertions before any `.share-ecc-input` query is reached; every click also logs an uncaught `TypeError: Cannot read properties of undefined (reading 'join')` from the old `share()`, because the tests now pass `{ hash }` and `codes` is undefined.

- [ ] **Step 4: Rewrite `src/lib/qr.ts`**

The spec's _Share link_ block for the types, the constant and the two signatures: `export type QrEcc = 'L' | 'M' | 'Q' | 'H'`; `export type QrStatus = { kind: 'fits' } | { kind: 'dense' } | { kind: 'too-long'; ecc: QrEcc; length: number; capacity: number }`; `QR_CAPACITY_BYTES`; `qrStatus`; `buildQrSvg`. `qrStatus` runs uqr's `encode(text, { ecc })` in `try`/`catch`: `dense` when `version > QR_DENSE_VERSION`, else `fits`; on a throw, `{ kind: 'too-long', ecc, length: text.length, capacity: QR_CAPACITY_BYTES[ecc] }`. It never throws. `buildQrSvg` returns `renderSVG(text, { ecc, border: 2 })`, or `null` when that throws. Update the comments: the level is a parameter now, and density is `qrStatus`'s job.

- [ ] **Step 5: Rewrite ShareLink's script and markup**

- Remove the `encodeShareUrl` and `Settings` imports, `URL_WARN_LENGTH`, both old message constants, the `url`, `warnLong` and `qrStatus` `$state`s, and the `.url-warning` span (its copy is deleted, not reworded).
- Import `{ buildQrSvg, qrStatus, QR_CAPACITY_BYTES, type QrEcc, type QrStatus }` from `$lib/qr` (today only `buildQrSvg` is imported; the old `qrStatus` `$state` goes, and the name now means the imported function).
- `let { hash }: { hash: string } = $props();`, `let shareEcc: QrEcc = $state('M');` (initialised to `M` on every mount, stored nowhere), `let qrSvg = $state('');`, `const liveUrl = $derived(location.origin + location.pathname + hash);`, `const status = $derived(qrStatus(liveUrl, shareEcc));`.
- The status copy, verbatim from the spec (numbers through `Intl.NumberFormat('en-US')`; `2,953` is literal):

```ts
const count = new Intl.NumberFormat('en-US');
function statusMessage(s: QrStatus): string {
	if (s.kind === 'fits') return '';
	if (s.kind === 'dense')
		return 'This link makes a dense QR code. Hold the phone steady, or share the link itself.';
	if (s.ecc !== 'L' && s.length <= QR_CAPACITY_BYTES.L)
		return `Too long for a QR code at level ${s.ecc}: this link is ${count.format(s.length)} characters and level ${s.ecc} holds at most ${count.format(s.capacity)}. Choose level L, or shorten the list. The link itself still works.`;
	return `Too long for a QR code: this link is ${count.format(s.length)} characters and a QR holds at most 2,953. Shorten the list to share it as a QR. The link itself still works.`;
}
```

- The invalidation `$effect` tracks `hash` and `shareEcc` (`void hash; void shareEcc;`) and clears only `qrSvg`. Replace the stale comment "the URL field and warning persist until the next click" with: a new link or a new level invalidates a rendered QR; the URL field and the status are live.
- `share()` copies `liveUrl` (`void navigator.clipboard?.writeText(liveUrl).catch(() => {});`, as today). Unless `status.kind === 'too-long'`, it sets `qrSvg` to `buildQrSvg(liveUrl, shareEcc) ?? ''`.
- Markup: `.share-row` holds the button and `<input class="share-url" readonly value={liveUrl}>`. After it comes `<label class="share-ecc-field">Share QR error correction <select class="share-ecc-input" bind:value={shareEcc}>` with options `L (most capacity)`, `M (default)`, `Q`, `H` (values `L`, `M`, `Q`, `H`). Then the `.qr-code` div unchanged (keep its eslint comment), then `<p class="qr-status" role="status">{statusMessage(status)}</p>`, always rendered, no `hidden`.

- [ ] **Step 6: Compute `shareHash` once on the setup page**

In `src/routes/+page.svelte`, after `settings` add `const shareHash = $derived(encodeShareUrl(rawCodes, settings));`. Start becomes `goto(resolve('/play') + shareHash)` (the "fragment concatenation" eslint rationale stays), and `:131` becomes `<ShareLink hash={shareHash} />`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/lib/qr.test.ts src/lib/components/ShareLink.test.ts src/routes/page.test.ts`
Expected: PASS (the setup page's share-URL and QR-invalidation tests at `:92-167` still pass against the live URL).

- [ ] **Step 8: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 9: Commit**

```bash
git add src/lib/qr.ts src/lib/qr.test.ts src/lib/components/ShareLink.svelte src/lib/components/ShareLink.test.ts src/routes/+page.svelte
git commit -m "feat: live share-QR status with a selectable level"
```

---

### Task 9: README and stale comments

**Files:**

- Modify: `README.md:19-22`, `:27`, `:34-35`, a new subsection after `:38`, `:63`
- Modify: `src/lib/formats.ts:1-5` (header), `src/lib/jsbarcode.d.ts:7-8`, any `src/lib/shareUrl.ts` comment Task 7 missed (possibly none)

**Interfaces:**

- Consumes: the finished behaviour of Tasks 1–8. Produces: documentation only. No tests.

- [ ] **Step 1: Update `README.md`**

- `:19-22`: "21 barcode formats" becomes **25 barcode formats**: the 21 linear formats JsBarcode documents (keep the existing list) plus four 2D formats, QR Code, Data Matrix, PDF417 and Aztec. Append to the same bullet that 2D rows show the symbol size, the byte count and whether the symbol is dense.
- New Features bullet after it, **Error correction**: for QR Code, PDF417 and Aztec, an **Error correction** select sets the level for the whole list, and codes too long for that level are flagged.
- `:27` **Shareable links**: the link can also be shown as a QR code; a level select (L, M, Q, H) sets the share QR's error correction; a status line says when the link makes a dense QR or is too long for one, and why; links keep the list in the URL fragment (`#codes=…`), so long lists are never refused by the server, and older `?codes=` links keep working.
- `:34-35`: "one per line, or comma-separated" becomes "one per line, or comma-separated for numeric formats such as UPC and EAN (2D and other text formats are one per line, and commas are part of the code)". Add: for QR Code, PDF417 and Aztec, choose an error-correction level or keep the default.
- After `:38`, a `### Scanning 2D symbols` subsection with these five points: a 2D area imager is required; enable the scanner's screen or mobile-display read mode if it has one; start at 60 px/s and use the browser's full screen for dense symbols; non-ASCII text is encoded as UTF-8 without an ECI marker, so scanners that assume Latin-1 show it garbled; 2D symbols carry no caption, so count misses against the list.
- `:63` becomes `- **JsBarcode** for the 21 linear formats (inline SVG)`; add below it `- **bwip-js** 4.11.4 for QR Code, Data Matrix, PDF417 and Aztec (inline SVG)`.

- [ ] **Step 2: Refresh the stale comments**

- `src/lib/formats.ts:1-5`: the header says the registry holds the 21 JsBarcode-documented linear formats (`engine: 'jsbarcode'`) and four 2D symbologies rendered by bwip-js (`engine: 'bwipjs'`), that descriptors stay data-only with behaviour in `src/lib/engines/`, and keeps the CODE39 `normalize` sentence verbatim.
- `src/lib/jsbarcode.d.ts:7`: "surface checkCode relies on" becomes "surface the JsBarcode engine's `check` relies on (`src/lib/engines/jsbarcode.ts`)".
- `src/lib/shareUrl.ts`: no comment may call the URL a `?codes` query or mention `location.search` (Task 7 should already have fixed this; its doc comments say "legacy query string").

- [ ] **Step 3: Verify the stale strings are gone**

Run: `git grep -n -F -e 'one descriptor per JsBarcode' -e 'checkCode relies on' -e 'location.search' -e '?codes' -e 'query-string concatenation' -e 'snapshots settings (including format)' -e 'warning persist' -- src ':!*.test.ts'`
Expected: no output, exit status 1 (test files are excluded because the legacy-URL tests legitimately contain `?codes=`). A hit in `ScrollColumn.svelte`, `ShareLink.svelte` or a route file means Task 4, 8 or 7 left it: fix it here, add that file to this task's commit, and say so in the task report.

- [ ] **Step 4: Run lint and the suite**

Run: `npm run lint`, then `npm test`
Expected: lint clean (Prettier also checks `README.md`), `0 errors`, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add README.md src/lib/formats.ts src/lib/jsbarcode.d.ts src/lib/shareUrl.ts
git commit -m "docs: document 2D formats and refresh stale comments"
```

---

### Task 10: Verification that fails closed

Human and browser steps from the spec's _Verification that fails closed_. Each row of the record below starts as **UNVERIFIED** and changes only when a human enters the evidence. For a scan, "pass" means the scanner outputs exactly the payload, once, with the device model, firmware and read mode recorded; for a browser check, it means the browser names and versions are recorded. Run a local build with `npm run build`, then `npm run preview -- --host`. Use `http://localhost:4173/scandible/` on the desktop for rows that involve no phone. For every row that involves a phone, open the printed `Network:` URL (for example `http://192.168.x.y:4173/scandible/`) on the desktop as well as on the phone, so share links and share QRs carry an address the phone can reach; `npm run preview` without `--host` listens on localhost only.

**Files:**

- Modify: this plan's verification record (below)
- Conditional (Step 4a only): Create `src/hooks.client.ts`, `src/hooks.client.test.ts`

**Interfaces:**

- Consumes: everything above. Produces: the filled record; conditionally, `export const init: ClientInit` in `src/hooks.client.ts`.

Status is one of `UNVERIFIED`, `PASS`, `FAILED`. `PASS` needs the evidence the paragraph above names for that kind of row (a scan: device model, firmware, read mode and output; a browser check: browser names and versions; row 5: the four command results in Output / notes); a checker that dies, returns nothing or is skipped leaves the row `UNVERIFIED`. Each row holds one check, so a partial result has a row of its own. Pass rules for rows 2a–2g: QR, the reported letter equals the level; PDF417 `0` and `8`, the reported number equals it; PDF417 `automatic level`, record the reported level (any value 0–8 passes, because automatic means BWIPP chose it); Aztec, the reported percentage is at least the label's minimum (`≥10%`, `≥50%`), because the label is a floor BWIPP may exceed when it fills the symbol.

| #      | Check                                                                                                                                      | Status     | Device / browser, firmware, read mode | Output / notes |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------- | -------------- |
| 1a-qr  | `hello world` in QR Code at default error correction, 60 px/s, rotation and skew off                                                       | UNVERIFIED |                                       |                |
| 1a-dm  | `hello world` in Data Matrix at default error correction, 60 px/s, rotation and skew off                                                   | UNVERIFIED |                                       |                |
| 1a-pdf | `hello world` in PDF417 at default error correction, 60 px/s, rotation and skew off                                                        | UNVERIFIED |                                       |                |
| 1a-az  | `hello world` in Aztec at default error correction, 60 px/s, rotation and skew off                                                         | UNVERIFIED |                                       |                |
| 1b     | A QR whose row shows `· dense` (`x` × 2000, QR Code, default level)                                                                        | UNVERIFIED |                                       |                |
| 1c     | A PDF417 of at least 300 X-modules (`x` × 900, PDF417, level 8: 375 X-modules)                                                             | UNVERIFIED |                                       |                |
| 1d-qr  | `héllo → 日本` in QR Code (record the scanner's output verbatim)                                                                           | UNVERIFIED |                                       |                |
| 1d-dm  | `héllo → 日本` in Data Matrix (record the scanner's output verbatim)                                                                       | UNVERIFIED |                                       |                |
| 1d-pdf | `héllo → 日本` in PDF417 (record the scanner's output verbatim)                                                                            | UNVERIFIED |                                       |                |
| 1d-az  | `héllo → 日本` in Aztec (record the scanner's output verbatim)                                                                             | UNVERIFIED |                                       |                |
| 1e     | `a#b&c%d+e,f g` as QR Code survives Start → play → Back and scans back exactly                                                             | UNVERIFIED |                                       |                |
| 1f     | Loop mode with three 2D codes, reading across the copy seam                                                                                | UNVERIFIED |                                       |                |
| 1g     | A non-loop run to the finish summary                                                                                                       | UNVERIFIED |                                       |                |
| 1h     | Speed sweep: the highest speed at which every symbol reads (record it)                                                                     | UNVERIFIED |                                       |                |
| 2a     | A level-reporting decoder (a ZXing-based phone app suffices) reads `hello world` in QR Code at level `L`; apply the pass rule above        | UNVERIFIED |                                       |                |
| 2b     | A level-reporting decoder (a ZXing-based phone app suffices) reads `hello world` in QR Code at level `H`; apply the pass rule above        | UNVERIFIED |                                       |                |
| 2c     | A level-reporting decoder (a ZXing-based phone app suffices) reads `hello world` in Aztec at `≥10%`; apply the pass rule above             | UNVERIFIED |                                       |                |
| 2d     | A level-reporting decoder (a ZXing-based phone app suffices) reads `hello world` in Aztec at `≥50%`; apply the pass rule above             | UNVERIFIED |                                       |                |
| 2e     | A level-reporting decoder (a ZXing-based phone app suffices) reads `hello world` in PDF417 at level `0`; apply the pass rule above         | UNVERIFIED |                                       |                |
| 2f     | A level-reporting decoder (a ZXing-based phone app suffices) reads `hello world` in PDF417 at level `8`; apply the pass rule above         | UNVERIFIED |                                       |                |
| 2g     | A level-reporting decoder (a ZXing-based phone app suffices) reads `hello world` in PDF417 at `automatic level`; apply the pass rule above | UNVERIFIED |                                       |                |
| 3a-cd  | Chromium, desktop: aspect preserved under both caps                                                                                        | UNVERIFIED |                                       |                |
| 3a-cp  | Chromium, 390 px phone: aspect preserved under both caps                                                                                   | UNVERIFIED |                                       |                |
| 3a-fd  | Firefox, desktop: aspect preserved under both caps                                                                                         | UNVERIFIED |                                       |                |
| 3a-fp  | Firefox, 390 px phone: aspect preserved under both caps                                                                                    | UNVERIFIED |                                       |                |
| 3b     | PDF417 uses its wider cap (`min(95vw, 960px)`)                                                                                             | UNVERIFIED |                                       |                |
| 3c     | Quiet zone intact under maximum rotation and skew on desktop                                                                               | UNVERIFIED |                                       |                |
| 3d     | Phone clipping at 8°/8° and at 30°/30° (record the behaviour; a known limitation, not a failure)                                           | UNVERIFIED |                                       |                |
| 3e     | Pasting a second share link into a tab already on the setup page changes the list                                                          | UNVERIFIED |                                       |                |
| 3f     | A share QR opened with the iOS camera app and the Android camera app keeps the fragment                                                    | UNVERIFIED |                                       |                |
| 4      | `/play#codes=50%` starts the router and bounces to setup showing `50% ✗ invalid`                                                           | UNVERIFIED |                                       |                |
| 5      | `npm run check`, `npm test`, `npm run lint` green and `npm run build` succeeds in the project                                              | UNVERIFIED |                                       |                |

- [ ] **Step 1: Scan with the target imager (rows 1a–1h)**

A human scans each row on the preview build and fills in the device model, firmware, read mode and output. A miss, a duplicate read or altered output is a failure: record it as such.

- [ ] **Step 2: Decode the error-correction extremes (rows 2a–2g)**

A human decodes each listed symbol with a decoder that reports the level, records the reported level and applies the pass rules above the table. No encoder output was decoded during research, so a mismatch is a finding to report, not a test to adjust.

- [ ] **Step 3: Browser checks (rows 3a–3f)**

A human runs rows 3a-cd to 3a-fp as labelled. For 3b, 3c and 3e, use desktop Chromium and Firefox. For 3d and 3f, use a real phone, open the `Network:` URL on the desktop as well, and record browser and OS versions.

- [ ] **Step 4: Malformed fragment (row 4)**

Open `http://localhost:4173/scandible/play#codes=50%` in Chromium and Firefox with the console open. Pass: the router starts, the page bounces to setup, the textarea holds `50%`, the validation list shows `50% ✗ invalid`, and the console shows no uncaught error. Fail: a blank page or an uncaught `URIError`. If Step 4a repairs it, keep the first failure in Output / notes and set row 4 to PASS only when the repeat passes in both browsers.

- [ ] **Step 4a (only if Step 4 failed): Repair the fragment before the router starts**

Write `src/hooks.client.test.ts` first. Call `history.replaceState(null, '', '/play#codes=50%')`, then `init()`; expect `location.hash` to be `'#codes=50%25'`. A clean hash such as `#codes=1&seed=0` is left unchanged. Run `npx vitest run src/hooks.client.test.ts`; expected failure: `Failed to resolve import "./hooks.client"`. Then create `src/hooks.client.ts` exporting `export const init: ClientInit` (from `@sveltejs/kit`). When `location.hash.length > 1`, it rebuilds the hash as `'#' + new URLSearchParams(location.hash.slice(1)).toString()` and, if that differs, writes it with `history.replaceState(history.state, '', location.pathname + location.search + repaired)`. Use `replaceState` because it adds no history entry and fires no `hashchange`. Re-run the test (PASS), `npm test`, `npm run lint`, rebuild, repeat Step 4, then commit:

```bash
git add src/hooks.client.ts src/hooks.client.test.ts
git commit -m "fix: repair malformed share fragments before the router starts"
```

- [ ] **Step 5: Project checks (row 5)**

Run: `npm run check`, `npm test`, `npm run lint`; also `npm run build`, which CI runs before deploying.
Expected: `0 errors`, all tests pass, lint clean, build succeeds. Record the result in row 5. A command that dies or prints nothing counts as UNVERIFIED, not as passed.

- [ ] **Step 6: Commit the record**

```bash
git add docs/superpowers/plans/2026-10-30-2d-barcode-formats.md
git commit -m "docs: record 2D verification results"
```

A skipped step, or one whose checker died or returned nothing, stays UNVERIFIED. A step that ran and failed is recorded FAILED, with the evidence. The final report lists every UNVERIFIED and FAILED row and never reports one as passed.

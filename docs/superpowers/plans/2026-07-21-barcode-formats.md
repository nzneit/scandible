# All JsBarcode Formats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a list render in any of the 21 JsBarcode-documented formats via a per-list format setting, carried as a `fmt` share-URL param, with per-format validation and a `raw ✓ → encoded` row whenever the encoder mutates the cleaned value.

**Architecture:** Approach C′ — a `FormatDescriptor` interface (data + optional `normalize`/`renderOptions` hooks) with all 21 descriptors as rows in `src/lib/formats.ts`; a generic pipeline (`parseCodeList`/`checkCode` in `src/lib/codes.ts`) validates via JsBarcode's internal encoder classes; `Settings.format` threads through the share URL, both routes, and the scroller.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript strict, Vitest + @testing-library/svelte (jsdom), JsBarcode 3.12.3.

**Spec:** `docs/superpowers/specs/2026-07-21-barcode-formats-design.md` (read for rationale; this plan is self-contained).

## Global Constraints

- Work on branch `barcode-formats` (already checked out). Every task ends with `npm test` fully green (svelte-check + vitest) AND `npm run lint` clean before its commit.
- npm/npx require nvm's Node 24: if `node --version` shows 22.6.0, prefix commands with `. "$HOME/.nvm/nvm.sh" && `.
- Prettier owns formatting (tabs, single quotes, width 100). After editing, run `npx prettier --write <files>` before lint. The code blocks in this plan are already prettier-shaped; do not reformat them by hand.
- Commit messages: conventional prefix, imperative, NO Co-Authored-By or AI attribution of any kind.
- Back-compat scope (verbatim from spec): _decoding and playback_ of a URL without `fmt` are behavior-identical to today. Newly _emitted_ URLs always carry `fmt=<id>` — including `fmt=upc` — appended after `seed`. Emitted-URL byte-identity with the old app is NOT a goal.
- Frozen strings: arrow row is exactly `` `${raw} ✓ → ${encoded}` `` (single U+0020 spaces, arrow U+2192); plain rows stay exactly `` `${raw} ✓` `` / `` `${raw} ✗ invalid` ``; placeholders (dash is U+2014): numeric → `Paste codes — one per line, or comma-separated`, text → `Paste codes — one per line`.
- `<option value>` is always the `FormatId`; `jsbarcodeFormat` never appears in DOM or URL.
- Registry exclusions are exactly `['GenericBarcode', 'CODE93FullASCII']`.
- CODE39 must NOT define a `normalize` hook (encoder uppercasing must stay visible via `encoded`).
- Existing share-URL params, UPC cleanup semantics, plain validation copy, scroll/QR behavior: unchanged.

---

### Task 1: Rename `format.ts` → `finish.ts`

Clears the name collision so the registry can own `formats.ts`.

**Files:**

- Move: `src/lib/format.ts` → `src/lib/finish.ts`; `src/lib/format.test.ts` → `src/lib/finish.test.ts`
- Modify: `src/lib/finish.test.ts` (import path), `src/routes/play/+page.svelte` (import path)

**Interfaces:**

- Consumes: nothing.
- Produces: `formatFinishMessage(count: number, seconds: number): string` now imported from `$lib/finish`.

- [ ] **Step 1: Move both files**

```bash
git mv src/lib/format.ts src/lib/finish.ts
git mv src/lib/format.test.ts src/lib/finish.test.ts
```

- [ ] **Step 2: Fix the two import sites**

In `src/lib/finish.test.ts`: `from './format'` → `from './finish'`.
In `src/routes/play/+page.svelte`: `from '$lib/format'` → `from '$lib/finish'`.

- [ ] **Step 3: Verify and commit**

Run: `npm test` — expected: svelte-check 0 errors, 70/70 pass.

```bash
git add -A && git commit -m "refactor: rename format.ts to finish.ts ahead of format registry"
```

---

### Task 2: Format registry + deep-import typing + integrity tests

**Files:**

- Create: `src/lib/formats.ts`
- Modify: `src/lib/jsbarcode.d.ts`
- Test: `src/lib/formats.test.ts`

**Interfaces:**

- Consumes: `jsbarcode/bin/barcodes` (typed here).
- Produces: `FormatId` (21-member union), `FormatDescriptor`, `FORMATS: readonly FormatDescriptor[]`, `FORMAT_BY_ID: ReadonlyMap<FormatId, FormatDescriptor>`, `FORMAT_GROUPS: readonly { group: string; formats: readonly FormatDescriptor[] }[]`, `DEFAULT_FORMAT: FormatId = 'upc'`, `isFormatId(value: string): value is FormatId`.

- [ ] **Step 1: Write the failing test**

`src/lib/formats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import barcodes from 'jsbarcode/bin/barcodes';
import { DEFAULT_FORMAT, FORMATS, FORMAT_BY_ID, FORMAT_GROUPS, isFormatId } from './formats';

const EXCLUDED = ['GenericBarcode', 'CODE93FullASCII'];

describe('format registry integrity', () => {
	it('has 21 unique ids across six groups in README order', () => {
		expect(FORMATS.length).toBe(21);
		expect(new Set(FORMATS.map((f) => f.id)).size).toBe(21);
		expect(FORMAT_GROUPS.map((g) => g.group)).toEqual([
			'CODE128',
			'EAN / UPC',
			'CODE39',
			'ITF',
			'MSI',
			'Other'
		]);
		expect(FORMAT_GROUPS.flatMap((g) => g.formats)).toEqual([...FORMATS]);
	});

	it('resolves every descriptor in JsBarcode’s registry', () => {
		for (const f of FORMATS) {
			expect(barcodes[f.jsbarcodeFormat], f.id).toBeDefined();
		}
	});

	it('covers every JsBarcode registry key as a descriptor or an explicit exclusion', () => {
		const covered = new Set([...FORMATS.map((f) => f.jsbarcodeFormat), ...EXCLUDED]);
		for (const key of Object.keys(barcodes)) {
			expect(covered.has(key), key).toBe(true);
		}
	});

	it('defaults to upc and type-guards ids', () => {
		expect(DEFAULT_FORMAT).toBe('upc');
		expect(FORMAT_BY_ID.get('upc')?.jsbarcodeFormat).toBe('UPC');
		expect(isFormatId('code39')).toBe(true);
		expect(isFormatId('CODE39')).toBe(false);
		expect(isFormatId('')).toBe(false);
	});

	it('defines no day-one behavior hooks (the seam stays data-only)', () => {
		for (const f of FORMATS) {
			expect(f.normalize, f.id).toBeUndefined();
			expect(f.renderOptions, f.id).toBeUndefined();
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/formats.test.ts`
Expected: FAIL — cannot resolve `./formats`.

- [ ] **Step 3: Type the deep import**

Append to `src/lib/jsbarcode.d.ts` (keep the existing `declare module 'jsbarcode'` block):

```ts
declare module 'jsbarcode/bin/barcodes' {
	/** Internal encoder-class surface checkCode relies on. Constructors may normalize
	 *  the input into `data` (check digits, checksums, uppercasing, codabar guards). */
	interface JsBarcodeEncoder {
		data: string;
		valid(): boolean;
	}
	const barcodes: Record<
		string,
		new (data: string, options: Record<string, unknown>) => JsBarcodeEncoder
	>;
	export default barcodes;
}
```

- [ ] **Step 4: Write `src/lib/formats.ts`**

```ts
/** Format registry (Approach C′): one descriptor per JsBarcode-documented format.
 *  Descriptors are data-only today; the optional hooks are the extension seam for
 *  future format-specific features (EAN flat, CODE39 mod43, …). CODE39 must never
 *  define `normalize` — the encoder's own uppercasing is what the UI's
 *  `raw ✓ → encoded` row exists to surface. */

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
	jsbarcodeFormat: string; // key in JsBarcode's internal registry, e.g. 'CODE128A'
	label: string; // dropdown text
	group: string; // optgroup label, README-style
	numeric: boolean; // true → comma-split + whitespace-strip cleanup default
	normalize?: (token: string) => string; // per-token cleanup override (see parseCodeList)
	renderOptions?: () => Record<string, unknown>; // extra JsBarcode options
}

export const DEFAULT_FORMAT: FormatId = 'upc';

export const FORMATS: readonly FormatDescriptor[] = [
	{
		id: 'code128',
		jsbarcodeFormat: 'CODE128',
		label: 'CODE128 (auto)',
		group: 'CODE128',
		numeric: false
	},
	{
		id: 'code128a',
		jsbarcodeFormat: 'CODE128A',
		label: 'CODE128 A (force mode)',
		group: 'CODE128',
		numeric: false
	},
	{
		id: 'code128b',
		jsbarcodeFormat: 'CODE128B',
		label: 'CODE128 B (force mode)',
		group: 'CODE128',
		numeric: false
	},
	{
		id: 'code128c',
		jsbarcodeFormat: 'CODE128C',
		label: 'CODE128 C (force mode)',
		group: 'CODE128',
		numeric: false
	},
	{ id: 'ean13', jsbarcodeFormat: 'EAN13', label: 'EAN-13', group: 'EAN / UPC', numeric: true },
	{ id: 'ean8', jsbarcodeFormat: 'EAN8', label: 'EAN-8', group: 'EAN / UPC', numeric: true },
	{
		id: 'ean5',
		jsbarcodeFormat: 'EAN5',
		label: 'EAN-5 (add-on)',
		group: 'EAN / UPC',
		numeric: true
	},
	{
		id: 'ean2',
		jsbarcodeFormat: 'EAN2',
		label: 'EAN-2 (add-on)',
		group: 'EAN / UPC',
		numeric: true
	},
	{ id: 'upc', jsbarcodeFormat: 'UPC', label: 'UPC-A', group: 'EAN / UPC', numeric: true },
	{ id: 'upce', jsbarcodeFormat: 'UPCE', label: 'UPC-E', group: 'EAN / UPC', numeric: true },
	{ id: 'code39', jsbarcodeFormat: 'CODE39', label: 'CODE39', group: 'CODE39', numeric: false },
	{ id: 'itf', jsbarcodeFormat: 'ITF', label: 'ITF', group: 'ITF', numeric: true },
	{ id: 'itf14', jsbarcodeFormat: 'ITF14', label: 'ITF-14', group: 'ITF', numeric: true },
	{ id: 'msi', jsbarcodeFormat: 'MSI', label: 'MSI', group: 'MSI', numeric: true },
	{ id: 'msi10', jsbarcodeFormat: 'MSI10', label: 'MSI10', group: 'MSI', numeric: true },
	{ id: 'msi11', jsbarcodeFormat: 'MSI11', label: 'MSI11', group: 'MSI', numeric: true },
	{ id: 'msi1010', jsbarcodeFormat: 'MSI1010', label: 'MSI1010', group: 'MSI', numeric: true },
	{ id: 'msi1110', jsbarcodeFormat: 'MSI1110', label: 'MSI1110', group: 'MSI', numeric: true },
	{
		id: 'pharmacode',
		jsbarcodeFormat: 'pharmacode',
		label: 'Pharmacode',
		group: 'Other',
		numeric: true
	},
	{ id: 'codabar', jsbarcodeFormat: 'codabar', label: 'Codabar', group: 'Other', numeric: false },
	{ id: 'code93', jsbarcodeFormat: 'CODE93', label: 'CODE93', group: 'Other', numeric: false }
];

export const FORMAT_BY_ID: ReadonlyMap<FormatId, FormatDescriptor> = new Map(
	FORMATS.map((f) => [f.id, f])
);

/** Groups in FORMATS (README) order, for the setup page's <optgroup> rendering. */
export const FORMAT_GROUPS: readonly { group: string; formats: readonly FormatDescriptor[] }[] =
	FORMATS.reduce<{ group: string; formats: FormatDescriptor[] }[]>((groups, f) => {
		const last = groups[groups.length - 1];
		if (last && last.group === f.group) last.formats.push(f);
		else groups.push({ group: f.group, formats: [f] });
		return groups;
	}, []);

export function isFormatId(value: string): value is FormatId {
	return FORMAT_BY_ID.has(value as FormatId);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/formats.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Full suite, lint, commit**

Run: `npx prettier --write src/lib/formats.ts src/lib/formats.test.ts src/lib/jsbarcode.d.ts && npm run lint && npm test`
Expected: lint clean; svelte-check 0 errors; 75/75 pass.

```bash
git add -A && git commit -m "feat: barcode format registry with two-way jsbarcode integrity tests"
```

---

### Task 3: Rename `UpcEntry` → `CodeEntry` (in place) and add `encoded?`

Identifier-only rename; the type stays in `types.ts` so all importers keep their paths.

**Files:**

- Modify: `src/lib/types.ts`, plus every `UpcEntry` reference: `src/lib/upc.ts`, `src/lib/barcode.ts`, `src/lib/scroller.ts`, `src/lib/scroller.test.ts`, `src/lib/components/ScrollColumn.svelte`, `src/lib/components/ScrollColumn.test.ts`, `src/lib/components/ValidationList.svelte`, `src/lib/components/ValidationList.test.ts`, `src/routes/+page.svelte`

**Interfaces:**

- Produces: `CodeEntry { raw: string; value: string; valid: boolean; encoded?: string }` from `$lib/types`, used by every later task.

- [ ] **Step 1: Replace the entry interface in `src/lib/types.ts`**

Replace the `UpcEntry` block with:

```ts
/** One parsed input entry. */
export interface CodeEntry {
	raw: string; // original token exactly as entered (post-trim)
	value: string; // cleaned per format (numeric: whitespace stripped; text: raw)
	valid: boolean; // whether the selected format's encoder accepts `value`
	encoded?: string; // present when valid: the value the barcode actually carries
}
```

- [ ] **Step 2: Mechanical rename everywhere else**

```bash
git grep -l 'UpcEntry' | xargs sed -i '' 's/UpcEntry/CodeEntry/g'
git grep -n 'UpcEntry'
```

Expected: second command prints nothing.

- [ ] **Step 3: Verify and commit**

Run: `npm run lint && npm test`
Expected: clean; 75/75 pass (the optional `encoded` is additive; no fixture changes needed).

```bash
git add -A && git commit -m "refactor: rename UpcEntry to CodeEntry with optional encoded value"
```

---

### Task 4: `codes.ts` — `parseCodeList` + `checkCode` with the full matrix

`upc.ts` stays untouched and in use; consumers switch in Task 7.

**Files:**

- Create: `src/lib/codes.ts`
- Test: `src/lib/codes.test.ts`, extend `src/lib/formats.test.ts`

**Interfaces:**

- Consumes: `FORMAT_BY_ID`, `FormatId` (Task 2); `CodeEntry` (Task 3); `jsbarcode/bin/barcodes`.
- Produces: `parseCodeList(raw: string, format: FormatId): CodeEntry[]`; `checkCode(value: string, format: FormatId): { valid: boolean; encoded?: string }`.

- [ ] **Step 1: Write the failing tests**

`src/lib/codes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseCodeList } from './codes';

describe('parseCodeList tokenization', () => {
	it('numeric formats split on newlines AND commas, trim, drop empties, keep order + duplicates', () => {
		const entries = parseCodeList(' a , b\n\nc ,,\nb ', 'upc');
		expect(entries.map((e) => e.raw)).toEqual(['a', 'b', 'c', 'b']);
	});

	it('numeric formats strip internal whitespace into value', () => {
		const entries = parseCodeList('0360 0029 1452\n12345', 'upc');
		expect(entries).toHaveLength(2);
		expect(entries[0].raw).toBe('0360 0029 1452');
		expect(entries[0].value).toBe('036000291452');
		expect(entries[0].valid).toBe(true);
		expect(entries[0].encoded).toBe('036000291452');
		expect(entries[1].valid).toBe(false);
		expect(entries[1].encoded).toBeUndefined();
	});

	it('text formats treat commas and internal spaces as data', () => {
		const entries = parseCodeList('Hello, World\nsecond line', 'code128');
		expect(entries.map((e) => e.raw)).toEqual(['Hello, World', 'second line']);
		expect(entries[0].value).toBe('Hello, World');
		expect(entries[0].valid).toBe(true);
	});

	it('drops whitespace-only tokens before validation — no blank rows ever', () => {
		expect(parseCodeList('  , 123', 'upc').map((e) => e.raw)).toEqual(['123']);
		expect(parseCodeList('   \n\t\n', 'code128')).toEqual([]);
	});

	it('flips validity by format: HELLO is invalid upc, valid code39', () => {
		expect(parseCodeList('HELLO', 'upc')[0].valid).toBe(false);
		expect(parseCodeList('HELLO', 'code39')[0].valid).toBe(true);
	});
});
```

Append to `src/lib/formats.test.ts`:

```ts
import { checkCode } from './codes';

/** [input, valid, encoded-if-different] — probed against jsbarcode 3.12.3. */
const MATRIX: Record<import('./formats').FormatId, [string, boolean, string?][]> = {
	code128: [
		['Hello World!', true],
		['with,comma', true]
	],
	code128a: [
		['HELLO', true],
		['hello', false]
	],
	code128b: [['Hello b!', true]],
	code128c: [
		['1234', true],
		['123', false],
		['AB', false]
	],
	ean13: [
		['5901234123457', true],
		['5901234123450', false],
		['590123412345', true, '5901234123457'],
		['59012', false]
	],
	ean8: [
		['96385074', true],
		['9638507', true, '96385074'],
		['96385075', false]
	],
	ean5: [
		['54495', true],
		['5449', false]
	],
	ean2: [
		['53', true],
		['5', false]
	],
	upc: [
		['036000291452', true],
		['03600029145', true, '036000291452'],
		['036000291453', false]
	],
	upce: [
		['654321', true],
		['01245714', true],
		['0124571', false]
	],
	code39: [
		['HELLO 123', true],
		['hello', true, 'HELLO'],
		['A-B.C/D+E$F%G', true]
	],
	itf: [
		['1234', true],
		['123', false]
	],
	itf14: [
		['10012345678902', true],
		['10012345678903', false],
		['1001234567890', true, '10012345678902']
	],
	msi: [
		['1234', true],
		['12a4', false]
	],
	msi10: [['1234', true, '12344']],
	msi11: [['1234', true, '12343']],
	msi1010: [['1234', true, '123448']],
	msi1110: [['1234', true, '123430']],
	pharmacode: [
		['3', true],
		['131070', true],
		['2', false],
		['131071', false]
	],
	codabar: [
		['A1234B', true],
		['1234', true, 'A1234A'],
		['E1234F', false]
	],
	code93: [
		['HELLO 93', true],
		['hello', false]
	]
};

describe('checkCode matrix (probed encoder facts)', () => {
	for (const [format, cases] of Object.entries(MATRIX) as [
		import('./formats').FormatId,
		[string, boolean, string?][]
	][]) {
		it(`covers every format: ${format}`, () => {
			for (const [input, valid, mutated] of cases) {
				const res = checkCode(input, format);
				expect(res.valid, `${format} '${input}'`).toBe(valid);
				if (valid) expect(res.encoded, `${format} '${input}'`).toBe(mutated ?? input);
				else expect(res.encoded).toBeUndefined();
			}
		});
	}

	it('treats the empty string as invalid, without throwing, in every format', () => {
		for (const f of FORMATS) {
			expect(checkCode('', f.id)).toEqual({ valid: false });
		}
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/codes.test.ts src/lib/formats.test.ts`
Expected: FAIL — cannot resolve `./codes`.

- [ ] **Step 3: Write `src/lib/codes.ts`**

```ts
import barcodes from 'jsbarcode/bin/barcodes';
import { FORMAT_BY_ID, type FormatId } from './formats';
import type { CodeEntry } from './types';

/** Validate a cleaned value against a format using JsBarcode's own encoder classes —
 *  the same code the public render API runs. `encoded` is the value the barcode will
 *  actually carry after encoder normalization (check digits, checksums, uppercasing,
 *  codabar guards). Never throws. */
export function checkCode(value: string, format: FormatId): { valid: boolean; encoded?: string } {
	const descriptor = FORMAT_BY_ID.get(format);
	if (!descriptor) return { valid: false };
	// Explicit guard: MSI checksum encoders would checksum '' into '0'/'00' and accept it.
	if (value === '') return { valid: false };
	try {
		const Encoder = barcodes[descriptor.jsbarcodeFormat];
		const encoder = new Encoder(value, { displayValue: false });
		if (!encoder.valid()) return { valid: false };
		return { valid: true, encoded: typeof encoder.data === 'string' ? encoder.data : value };
	} catch {
		return { valid: false };
	}
}

/** Tokenize + clean + validate a raw text blob for one format. Numeric formats split
 *  on newlines AND commas and strip internal whitespace (the pre-existing UPC
 *  behavior); text formats split on newlines only — internal spaces and commas are
 *  data. Drop-empties runs on the trimmed token BEFORE cleanup/validation, so no
 *  CodeEntry ever has an empty value. */
export function parseCodeList(raw: string, format: FormatId): CodeEntry[] {
	const descriptor = FORMAT_BY_ID.get(format);
	const numeric = descriptor?.numeric ?? true;
	return raw
		.split(numeric ? /[\n,]/ : /\n/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0)
		.map((token) => {
			const defaultClean = numeric ? token.replace(/\s+/g, '') : token;
			const value = descriptor?.normalize ? descriptor.normalize(token) : defaultClean;
			const res = checkCode(value, format);
			return res.valid
				? { raw: token, value, valid: true, encoded: res.encoded }
				: { raw: token, value, valid: false };
		});
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/codes.test.ts src/lib/formats.test.ts`
Expected: PASS (5 + 27). If any matrix case fails, STOP and report the exact failing tuple — the fixtures are empirically probed; a mismatch means the encoder behaves differently than documented, not that the fixture should be edited.

- [ ] **Step 5: Full suite, lint, commit**

Run: `npx prettier --write src/lib/codes.ts src/lib/codes.test.ts src/lib/formats.test.ts && npm run lint && npm test`
Expected: clean; 102/102 pass.

```bash
git add -A && git commit -m "feat: generic parseCodeList/checkCode over jsbarcode encoder classes"
```

---

### Task 5: `Settings.format` + `fmt` share-URL param + mechanical fixture updates

Plumbing only — no UI, no rendering change. Both pages carry `format` in their settings so emitted URLs gain `fmt`.

**Files:**

- Modify: `src/lib/types.ts`, `src/lib/shareUrl.ts`, `src/routes/+page.svelte`, `src/lib/scroller.test.ts`, `src/routes/page.test.ts`
- Test: `src/lib/shareUrl.test.ts`

**Interfaces:**

- Consumes: `DEFAULT_FORMAT`, `isFormatId`, `FormatId` (Task 2).
- Produces: `Settings.format: FormatId` (required); `DEFAULT_SETTINGS.format === 'upc'`; `encodeShareUrl` emits `…&seed=<n>&fmt=<id>`; `decodeShareUrl` emits `settings.format` only for known ids.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/shareUrl.test.ts`. Two accompanying edits in that file: add `import { DEFAULT_SETTINGS } from './types';` (the file currently imports only from `./shareUrl`), and add `format: 'upc'` to the expected settings object of each existing round-trip `toEqual` — a behavior-visible, deliberate change:

```ts
describe('fmt param', () => {
	it('always emits fmt after seed, including the default', () => {
		const url = encodeShareUrl(['036000291452'], { ...DEFAULT_SETTINGS, seed: 7 });
		expect(url).toContain('&seed=7&fmt=upc');
	});

	it('round-trips a non-default format', () => {
		const url = encodeShareUrl(['HELLO'], { ...DEFAULT_SETTINGS, format: 'code39' });
		expect(decodeShareUrl(url).settings.format).toBe('code39');
	});

	it('ignores unknown fmt values and emits no format key', () => {
		expect(decodeShareUrl('?codes=1&fmt=CODE39').settings.format).toBeUndefined();
		expect(decodeShareUrl('?codes=1&fmt=nope').settings.format).toBeUndefined();
	});

	it('emits no format key when fmt is absent (legacy URLs)', () => {
		expect('format' in decodeShareUrl('?codes=036000291452').settings).toBe(false);
	});
});
```

Run: `npx vitest run src/lib/shareUrl.test.ts` — expected: FAIL (compile error: `format` missing from `Settings`).

- [ ] **Step 2: Extend `Settings` in `src/lib/types.ts`**

Add the import at top and the field + default:

```ts
import { DEFAULT_FORMAT, type FormatId } from './formats';
```

In `Settings`, after `seed`:

```ts
format: FormatId; // barcode symbology applied to the whole list
```

In `DEFAULT_SETTINGS`, after `seed: 0`:

```ts
format: DEFAULT_FORMAT;
```

- [ ] **Step 3: Extend `src/lib/shareUrl.ts`**

Add to the imports: `import { isFormatId } from './formats';`
In `encodeShareUrl`, after `params.set('seed', …)`:

```ts
params.set('fmt', settings.format);
```

In `decodeShareUrl`, after the seed block:

```ts
const fmtRaw = params.get('fmt');
if (fmtRaw !== null && isFormatId(fmtRaw)) {
	settings.format = fmtRaw;
}
```

- [ ] **Step 4: Mechanical fixture updates**

- `src/lib/scroller.test.ts`: each of the 8 inline settings literals gains `format: 'upc'` (they are full `Settings` objects; tsc requires it). `ScrollColumn.test.ts` and both route tests spread `DEFAULT_SETTINGS` and need no edit.
- `src/routes/page.test.ts` line 50 exact Start-URL string becomes:
  `'/play?codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'`.
- `src/routes/+page.svelte`: add `let format = $state(initial.format);` beside the other setting states, and add `format` to the `$derived` settings object literal (after `seed`). No UI yet.

- [ ] **Step 5: Verify and commit**

Run: `npx prettier --write src/lib/types.ts src/lib/shareUrl.ts src/lib/shareUrl.test.ts src/lib/scroller.test.ts src/routes/+page.svelte src/routes/page.test.ts && npm run lint && npm test`
Expected: clean; 106/106 pass (play-page Back-URL tests still pass — they compute expectations with the real `encodeShareUrl`, which now includes `fmt=upc` on both sides).

```bash
git add -A && git commit -m "feat: format setting round-tripped through the share URL"
```

---

### Task 6: Format-aware rendering — `renderBarcodeSvg(entry, format)`

**Files:**

- Modify: `src/lib/barcode.ts`, `src/lib/scroller.ts:49` (the `renderBarcodeSvg` call)
- Test: `src/lib/barcode.test.ts`

**Interfaces:**

- Consumes: `FORMAT_BY_ID`, `FormatId` (Task 2); `CodeEntry` (Task 3).
- Produces: `renderBarcodeSvg(entry: CodeEntry, format: FormatId): SVGElement`. `isRenderableUpc` remains exported (still used by `upc.ts`; both die in Task 7).

- [ ] **Step 1: Update the render tests**

In `src/lib/barcode.test.ts`, replace the `renderBarcodeSvg` describe with (leave the `isRenderableUpc` describe untouched):

```ts
describe('renderBarcodeSvg', () => {
	it('returns an SVG element containing bar rects for a valid UPC entry', () => {
		const svg = renderBarcodeSvg(
			{ raw: '036000291452', value: '036000291452', valid: true },
			'upc'
		);
		expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
	});

	it('renders a non-UPC format', () => {
		const svg = renderBarcodeSvg({ raw: 'Hello!', value: 'Hello!', valid: true }, 'code128');
		expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
	});
});
```

Run: `npx vitest run src/lib/barcode.test.ts` — expected: FAIL (1-arg signature).

- [ ] **Step 2: Update `src/lib/barcode.ts`**

Add `import { FORMAT_BY_ID, type FormatId } from './formats';` and replace `renderBarcodeSvg` with:

```ts
/** Render one VALID entry into a fresh SVG element (createElementNS, not
 *  createElement, to get the correct namespace). Draws the barcode with the
 *  human-readable text. Only ever called for entries where entry.valid === true. */
export function renderBarcodeSvg(entry: CodeEntry, format: FormatId): SVGElement {
	const descriptor = FORMAT_BY_ID.get(format);
	const svg = document.createElementNS(SVG_NS, 'svg');
	JsBarcode(svg, entry.value, {
		format: descriptor?.jsbarcodeFormat ?? 'UPC',
		displayValue: true,
		lineColor: '#000',
		background: '#fff',
		width: 3,
		height: 160,
		margin: 16,
		...descriptor?.renderOptions?.()
	});
	return svg;
}
```

- [ ] **Step 3: Thread the format through the scroller**

In `src/lib/scroller.ts`, the `buildCopy` loop: `item.appendChild(renderBarcodeSvg(e));` → `item.appendChild(renderBarcodeSvg(e, settings.format));`. (The scroller already receives full `Settings`; this is its only change.)

- [ ] **Step 4: Verify and commit**

Run: `npx prettier --write src/lib/barcode.ts src/lib/barcode.test.ts src/lib/scroller.ts && npm run lint && npm test`
Expected: clean; 107/107 pass.

```bash
git add -A && git commit -m "feat: format-aware barcode rendering through the scroller"
```

---

### Task 7: User-facing switch-on — dropdown, arrow rows, generic pipeline, retire `upc.ts`

**Files:**

- Modify: `src/lib/components/ValidationList.svelte`, `src/lib/fileInput.ts`, `src/lib/fileInput.test.ts` (same rename — its import and both call references), `src/routes/+page.svelte`, `src/routes/play/+page.svelte`, `src/lib/barcode.ts` (drop `isRenderableUpc`)
- Delete: `src/lib/upc.ts`, `src/lib/upc.test.ts`
- Test: `src/lib/components/ValidationList.test.ts`, `src/routes/page.test.ts`, `src/routes/play/page.test.ts`, `src/lib/barcode.test.ts` (drop `isRenderableUpc` describe — its cases live in Task 4's matrix)

**Interfaces:**

- Consumes: `parseCodeList` (Task 4); `FORMAT_GROUPS`, `FORMAT_BY_ID` (Task 2); `Settings.format` (Task 5).
- Produces: `readCodesFile(file: File): Promise<string>` from `$lib/fileInput`; the finished UI.

- [ ] **Step 1: Write the failing component tests**

Append to `src/lib/components/ValidationList.test.ts`:

```ts
it('shows the exact arrow row when the encoder mutates the value', () => {
	const { container } = render(ValidationList, {
		entries: [{ raw: '590123412345', value: '590123412345', valid: true, encoded: '5901234123457' }]
	});
	expect(container.querySelector('.validation-list li')?.textContent).toBe(
		'590123412345 ✓ → 5901234123457'
	);
});

it('keeps entries without encoded arrow-free (undefined guard)', () => {
	const { container } = render(ValidationList, {
		entries: [{ raw: '036000291452', value: '036000291452', valid: true }]
	});
	expect(container.querySelector('.validation-list li')?.textContent).toBe('036000291452 ✓');
});
```

Run: `npx vitest run src/lib/components/ValidationList.test.ts` — expected: FAIL (arrow test; textContent is `'590123412345 ✓'`).

- [ ] **Step 2: Update `ValidationList.svelte`**

Replace the script + markup (style block unchanged) with:

```svelte
<script lang="ts">
	import type { CodeEntry } from '$lib/types';

	let { entries }: { entries: CodeEntry[] } = $props();

	// Single expression per row so exact-textContent tests stay byte-stable.
	const rowText = (entry: CodeEntry): string =>
		entry.valid
			? entry.encoded !== undefined && entry.encoded !== entry.value
				? `${entry.raw} ✓ → ${entry.encoded}`
				: `${entry.raw} ✓`
			: `${entry.raw} ✗ invalid`;
</script>

<ul class="validation-list">
	{#each entries as entry, i (i)}
		<li class={entry.valid ? 'valid' : 'invalid'}>{rowText(entry)}</li>
	{/each}
</ul>
```

Run the component tests again — expected: PASS (4).

- [ ] **Step 3: Rename the file reader**

In `src/lib/fileInput.ts`, rename `readUpcFile` → `readCodesFile` and replace the doc comment with:

```ts
/** Read an uploaded .txt/.csv File as text via FileReader. Rejects on read error.
 *  The text simply fills the setup textarea; tokenization is then whatever the
 *  selected format dictates (for text formats, commas in a .csv are data, not
 *  separators — no column semantics either way). */
```

Update the import + call in `src/routes/+page.svelte`, the `vi.mock('$lib/fileInput', () => ({ readCodesFile: vi.fn() }))` and both `vi.mocked(readCodesFile)` references in `src/routes/page.test.ts`, and its import line there.

- [ ] **Step 4: Rewire the setup page**

In `src/routes/+page.svelte`:

1. Imports: drop `parseUpcList` (`$lib/upc`); add
   `import { parseCodeList } from '$lib/codes';` and
   `import { FORMAT_BY_ID, FORMAT_GROUPS } from '$lib/formats';`.
2. `entries` derivation becomes `parseCodeList(text, format)`; add
   `const placeholder: string = $derived(FORMAT_BY_ID.get(format)?.numeric ? 'Paste codes — one per line, or comma-separated' : 'Paste codes — one per line');`
3. Textarea: class `upc-input` → `code-input` (markup AND its style rule), `placeholder={placeholder}`.
4. First field inside `.settings-row`:

```svelte
<label class="field"
	>Format
	<select class="format-input" bind:value={format}>
		{#each FORMAT_GROUPS as { group, formats } (group)}
			<optgroup label={group}>
				{#each formats as f (f.id)}
					<option value={f.id}>{f.label}</option>
				{/each}
			</optgroup>
		{/each}
	</select>
</label>
```

- [ ] **Step 5: Rewire the play page and retire `upc.ts`**

- `src/routes/play/+page.svelte`: replace the `parseUpcList` import with `import { parseCodeList } from '$lib/codes';` and the entries line with `const entries = parseCodeList(decoded.codes.join('\n'), settings.format);`.
- `src/lib/barcode.ts`: delete `isRenderableUpc` (and its now-unused import of nothing); delete its describe block from `src/lib/barcode.test.ts`.
- `git rm src/lib/upc.ts src/lib/upc.test.ts` (tokenization coverage moved to `codes.test.ts` in Task 4; validity coverage lives in the matrix).

- [ ] **Step 6: Write the failing route tests**

Append to `src/routes/page.test.ts` (inside the existing describe; also update the four `.upc-input` selectors to `.code-input` throughout the file):

```ts
it('renders the grouped format dropdown with 21 options', () => {
	const { container } = render(SetupPage);
	expect(container.querySelectorAll('.format-input optgroup').length).toBe(6);
	expect(container.querySelectorAll('.format-input option').length).toBe(21);
	expect(q<HTMLSelectElement>(container, '.format-input').value).toBe('upc');
});

it('revalidates on format switch: HELLO flips invalid→valid and enables Start', async () => {
	const { container } = render(SetupPage);
	await fireEvent.input(q(container, '.code-input'), { target: { value: 'HELLO' } });
	expect(q<HTMLButtonElement>(container, '.start').disabled).toBe(true);
	await fireEvent.change(q(container, '.format-input'), { target: { value: 'code39' } });
	expect(container.querySelector('.validation-list li')?.classList.contains('valid')).toBe(true);
	expect(q<HTMLButtonElement>(container, '.start').disabled).toBe(false);
});

it('switches the placeholder between the numeric and text copy', async () => {
	const { container } = render(SetupPage);
	const input = q<HTMLTextAreaElement>(container, '.code-input');
	expect(input.placeholder).toBe('Paste codes — one per line, or comma-separated');
	await fireEvent.change(q(container, '.format-input'), { target: { value: 'code128' } });
	expect(input.placeholder).toBe('Paste codes — one per line');
});

it('shows exact arrow rows for encoder mutations, numeric and text', async () => {
	mockPage.url = new URL('http://localhost/?codes=590123412345&fmt=ean13');
	const { container } = render(SetupPage);
	expect(container.querySelector('.validation-list li')?.textContent).toBe(
		'590123412345 ✓ → 5901234123457'
	);
	await fireEvent.change(q(container, '.format-input'), { target: { value: 'code39' } });
	await fireEvent.input(q(container, '.code-input'), { target: { value: 'hello' } });
	expect(container.querySelector('.validation-list li')?.textContent).toBe('hello ✓ → HELLO');
});

it('shows no arrow for app-side whitespace stripping', async () => {
	const { container } = render(SetupPage);
	await fireEvent.input(q(container, '.code-input'), { target: { value: '0360 00291452' } });
	expect(container.querySelector('.validation-list li')?.textContent).toBe('0360 00291452 ✓');
});

it('carries a non-default format into the Start URL', async () => {
	mockPage.url = new URL('http://localhost/?codes=HELLO&fmt=code39&seed=0');
	const { container } = render(SetupPage);
	await fireEvent.click(q(container, '.start'));
	expect(goto.mock.calls[0][0]).toContain('fmt=code39');
});
```

Append to `src/routes/play/page.test.ts`:

```ts
it('decodes fmt and renders that format', () => {
	mockPage.url = new URL('http://localhost/play?codes=HELLO&fmt=code39&seed=7');
	const { container } = render(PlayPage);
	expect(container.querySelectorAll('.barcode-item').length).toBe(2); // 1 valid × 2 copies
});

it('carries fmt in the Back URL', async () => {
	mockPage.url = new URL('http://localhost/play?codes=HELLO&fmt=code39&seed=7');
	const { container } = render(PlayPage);
	await fireEvent.click(q(container, '.ctl-back'));
	expect(goto.mock.calls[0][0]).toContain('fmt=code39');
});
```

Run: `npx vitest run src/routes/page.test.ts src/routes/play/page.test.ts`
Expected: the new tests FAIL before Steps 2–5 are complete, PASS after; the pre-existing tests must pass unchanged apart from the enumerated mechanical edits (`.code-input` selectors, `readCodesFile` mock).

- [ ] **Step 7: Full suite, lint, commit**

Run: `npx prettier --write src/lib src/routes && npm run lint && npm test`
Expected: clean; 113 tests (107 − 2 `upc.test.ts` − 2 `isRenderableUpc` + 2 ValidationList + 6 setup + 2 play). Report the exact final number with the delta accounted.

```bash
git add -A && git commit -m "feat: per-list barcode format selection across setup, share URL, and play"
```

---

### Task 8: README + end-to-end verification

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Genericize the README**

- Title line: `scandible turns a list of UPC codes into barcodes` → `scandible turns a list of codes into barcodes`; `**UPC-A** barcode` (Why section) → `barcode in your chosen format`.
- Features list: change the first bullet to `**Three ways to enter codes** — paste into a textarea, upload a .txt/.csv file, or pass them in the URL.` (unchanged if already so) and replace the lenient-validation bullet with:
  `**21 barcode formats** — every format JsBarcode documents (CODE128 incl. force modes, EAN/UPC family, CODE39, CODE93, ITF, MSI variants, Pharmacode, Codabar), selected per list; unrenderable codes are flagged and skipped, and the list shows the exact value your scanner will read when the encoder adds check digits or normalizes input.`
- Using it, step 2: `Paste or upload your UPC-A codes` → `Pick a barcode format, then paste or upload your codes`.

- [ ] **Step 2: Full verification gates**

```bash
npm run lint && npm test && npm run build
npm run preview &
sleep 2
curl -s http://localhost:4173/scandible/ | grep -c '<title>scandible</title>'
curl -s -o /dev/null -w '%{http_code}' 'http://localhost:4173/scandible/play'
kill %1
```

Expected: lint clean, full suite green, build succeeds, `1`, `200`. (If `kill %1` fails in your shell, kill the preview by port/PID — leave no stray server.)

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: document multi-format support in README"
```

- [ ] **Step 4: Report**

Report: branch `barcode-formats` complete; recommend a hands-on scanner check across at least UPC-A (regression), CODE128, and EAN-13-with-check-digit-completion before merging.

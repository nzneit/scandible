# Rotation Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the existing "Random skew" feature into two independent, separately tunable distortions — random rotation and random skew (slant) — driven by one shared reproducible seed.

**Architecture:** A pure transform-builder module emits one CSS transform string per barcode from a PRNG, always drawing two positional values (rotation, then shear) per barcode so the two axes stay independent under a shared seed. The `Settings` type gains `rotate`/`rotateMaxDeg`, repurposes `skew` to mean slant-only, and renames `skewSeed` → `seed`. The scroller, share-URL codec, seed lifecycle, and setup UI are migrated to the new shape in one atomic change (TypeScript makes the type migration all-or-nothing).

**Tech Stack:** Vite 5, vanilla TypeScript, JsBarcode 3, Vitest 1 + jsdom.

## Global Constraints

- `Settings` shape (exact): `{ speedPxPerSec: number; loop: boolean; rotate: boolean; rotateMaxDeg: number; skew: boolean; skewMaxDeg: number; seed: number }`.
- `DEFAULT_SETTINGS` (exact): `{ speedPxPerSec: 60, loop: false, rotate: false, rotateMaxDeg: 8, skew: false, skewMaxDeg: 8, seed: 0 }`. Both distortions default **off**.
- Transform format per barcode: enabled axes only, rotation first — `rotate(Rdeg) skewX(Sdeg)`, or `rotate(Rdeg)`, or `skewX(Sdeg)`, or `''` when both off. R and S each fixed to 2 decimals, drawn from `[-maxDeg, +maxDeg]`.
- **Positional draws:** for every barcode the PRNG is advanced exactly twice, rotation draw then shear draw, regardless of which axes are enabled — so a barcode's rotation is identical whether or not skew is on, and vice versa.
- Share-URL params: `rot` (`0`/`1`), `rotmax` (int/float in `[1,30]`), `skew` (`0`/`1`), `skewmax` (`[1,30]`), `seed` (integer in `[0, 0xffffffff]`). Decode is per-parameter lenient and never throws; out-of-range/malformed values fall back to defaults.
- Slider ranges: both rotation and skew max sliders are `min="1" max="30" step="1"`.
- Seed lifecycle: no valid `seed` param → generate a fresh random uint32 for the session; a valid `seed` → use it verbatim.
- Rotation and skew are **setup-only** (not adjustable during playback), like today.
- The skew feature was never deployed, so no backward compatibility with the old `skew`/`skewmax`/`skewseed` params is required.
- **Commits must NOT include any Claude / AI attribution** (`Co-Authored-By: Claude` or similar).
- **`tsc --noEmit` is a required verification gate** in every task and in the final review — `npm test` (vitest) and `npm run build` (vite) do NOT type-check, so stale `Settings` literals can pass them while breaking the type check.

---

### Task 1: Pure transform builder module (`transforms.ts`)

Create the new pure module alongside the existing `skew.ts` (which stays in place and keeps working until Task 2 removes it). This task changes no shared types and no consumers, so the whole project stays green.

**Files:**

- Create: `src/transforms.ts`
- Create: `src/transforms.test.ts`

**Interfaces:**

- Consumes: nothing (self-contained; internal `mulberry32` PRNG).
- Produces (relied on by Task 2's `scroller.ts`):
  - `export interface DistortOpts { rotate: boolean; rotateMaxDeg: number; skew: boolean; skewMaxDeg: number }`
  - `export function buildTransforms(count: number, opts: DistortOpts, seed: number): string[]`

- [ ] **Step 1: Write the failing test**

Create `src/transforms.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildTransforms } from './transforms';

const BOTH = { rotate: true, rotateMaxDeg: 10, skew: true, skewMaxDeg: 10 };

describe('buildTransforms', () => {
	it('returns one transform per barcode', () => {
		expect(buildTransforms(5, BOTH, 1)).toHaveLength(5);
		expect(buildTransforms(0, BOTH, 1)).toEqual([]);
	});

	it('is deterministic for a given seed and seed-sensitive', () => {
		expect(buildTransforms(4, BOTH, 42)).toEqual(buildTransforms(4, BOTH, 42));
		expect(buildTransforms(4, BOTH, 42)).not.toEqual(buildTransforms(4, BOTH, 43));
	});

	it('emits rotate()+skewX() within ±maxDeg when both axes are on', () => {
		const out = buildTransforms(
			50,
			{ rotate: true, rotateMaxDeg: 10, skew: true, skewMaxDeg: 6 },
			7
		);
		for (const t of out) {
			const m = t.match(/^rotate\((-?\d+(?:\.\d+)?)deg\) skewX\((-?\d+(?:\.\d+)?)deg\)$/);
			expect(m).not.toBeNull();
			expect(Math.abs(Number(m![1]))).toBeLessThanOrEqual(10);
			expect(Math.abs(Number(m![2]))).toBeLessThanOrEqual(6);
		}
	});

	it('emits only rotate() when skew is off', () => {
		const out = buildTransforms(
			10,
			{ rotate: true, rotateMaxDeg: 8, skew: false, skewMaxDeg: 8 },
			3
		);
		for (const t of out) expect(t).toMatch(/^rotate\(-?\d+(?:\.\d+)?deg\)$/);
	});

	it('emits only skewX() when rotation is off', () => {
		const out = buildTransforms(
			10,
			{ rotate: false, rotateMaxDeg: 8, skew: true, skewMaxDeg: 8 },
			3
		);
		for (const t of out) expect(t).toMatch(/^skewX\(-?\d+(?:\.\d+)?deg\)$/);
	});

	it('emits empty strings when both axes are off', () => {
		expect(
			buildTransforms(3, { rotate: false, rotateMaxDeg: 8, skew: false, skewMaxDeg: 8 }, 3)
		).toEqual(['', '', '']);
	});

	it('keeps rotation values identical whether or not skew is enabled (positional draws)', () => {
		const seed = 99;
		const withSkew = buildTransforms(
			6,
			{ rotate: true, rotateMaxDeg: 10, skew: true, skewMaxDeg: 10 },
			seed
		);
		const noSkew = buildTransforms(
			6,
			{ rotate: true, rotateMaxDeg: 10, skew: false, skewMaxDeg: 10 },
			seed
		);
		// The rotate(...) part of the "both on" output must equal the rotation-only output.
		const rotOnly = withSkew.map((t) => t.split(' ')[0]);
		expect(rotOnly).toEqual(noSkew);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/transforms.test.ts`
Expected: FAIL — `Failed to resolve import "./transforms"` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/transforms.ts`:

```ts
/** Deterministic PRNG (mulberry32): same seed → same [0, 1) sequence. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Which distortion axes are enabled and their per-axis max magnitudes. */
export interface DistortOpts {
	rotate: boolean;
	rotateMaxDeg: number;
	skew: boolean;
	skewMaxDeg: number;
}

/** One CSS transform per barcode. For every barcode the PRNG is advanced twice
 *  in fixed order — the rotation draw, then the shear draw — regardless of which
 *  axes are enabled, so a barcode's rotation is identical whether or not skew is
 *  on (and vice versa). The returned string includes only the enabled axes,
 *  rotation first: `rotate(Rdeg) skewX(Sdeg)`, `rotate(Rdeg)`, `skewX(Sdeg)`, or
 *  `''` when both axes are off. Each angle is drawn from [-maxDeg, +maxDeg] and
 *  fixed to 2 decimals. Deterministic; length === count. Pure — safe at render time. */
export function buildTransforms(count: number, opts: DistortOpts, seed: number): string[] {
	const rng = mulberry32(seed);
	const out: string[] = [];
	for (let i = 0; i < count; i++) {
		// Always draw both, in this order, to keep the two axes positionally independent.
		const rot = ((rng() * 2 - 1) * opts.rotateMaxDeg).toFixed(2);
		const shear = ((rng() * 2 - 1) * opts.skewMaxDeg).toFixed(2);
		const parts: string[] = [];
		if (opts.rotate) parts.push(`rotate(${rot}deg)`);
		if (opts.skew) parts.push(`skewX(${shear}deg)`);
		out.push(parts.join(' '));
	}
	return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/transforms.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Verify type-check and full suite are still green**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

Run: `npm test`
Expected: all test files pass (the new `transforms.test.ts` plus the still-present `skew.test.ts` and all others).

- [ ] **Step 6: Commit**

```bash
git add src/transforms.ts src/transforms.test.ts
git commit -m "feat: add buildTransforms (independent rotation + skew) module"
```

---

### Task 2: Migrate Settings, engine, share URL, seed lifecycle, and setup UI

Atomic migration to the new `Settings` shape. Because changing the `Settings` interface breaks every consumer and test literal at once, this task updates all of them together and deletes the old `skew.ts`/`skew.test.ts`. It ends with `tsc`, `npm test`, and `npm run build` all green and the feature fully working (rotation controllable from the setup UI and round-tripped through the share URL).

**Files:**

- Modify: `src/types.ts` (whole `Settings` interface + `DEFAULT_SETTINGS`)
- Modify: `src/scroller.ts:1-43` (import + transforms construction)
- Modify: `src/shareUrl.ts` (whole file — new params + constants)
- Modify: `src/main.ts:12-14` (seed field rename)
- Modify: `src/setupView.ts` (settings-row markup, refs, prefill, enable-sync, `currentSettings`)
- Delete: `src/skew.ts`, `src/skew.test.ts`
- Test (update literals/assertions): `src/types.test.ts`, `src/scroller.test.ts`, `src/playView.test.ts`, `src/shareUrl.test.ts`, `src/main.test.ts`, `src/setupView.test.ts`

**Interfaces:**

- Consumes: `buildTransforms(count, DistortOpts, seed)` from `./transforms` (Task 1).
- Produces (final public shapes):
  - `Settings = { speedPxPerSec: number; loop: boolean; rotate: boolean; rotateMaxDeg: number; skew: boolean; skewMaxDeg: number; seed: number }`
  - Share-URL params `rot`, `rotmax`, `skew`, `skewmax`, `seed`.
  - Setup DOM: `.rotate-input` (checkbox), `.rotate-max-input` (range), `.skew-input` (checkbox), `.skew-max-input` (range).

- [ ] **Step 1: Update the `Settings` type and defaults**

Replace the entire body of `src/types.ts` (keep the `UpcEntry` interface exactly as-is) — replace the `Settings` interface and `DEFAULT_SETTINGS` with:

```ts
/** Playback settings, round-tripped through the share URL. */
export interface Settings {
	speedPxPerSec: number; // scroll speed in CSS px per second
	loop: boolean; // wrap at end vs. stop
	rotate: boolean; // random per-barcode rotation on/off
	rotateMaxDeg: number; // max |degrees| for rotation (slider 1–30)
	skew: boolean; // random per-barcode skewX (slant) on/off
	skewMaxDeg: number; // max |degrees| for slant (slider 1–30)
	seed: number; // uint32 PRNG seed — shared by both axes; makes the arrangement reproducible
}

/** Single source of truth for defaults; used to fill Partial<Settings>. */
export const DEFAULT_SETTINGS: Settings = {
	speedPxPerSec: 60,
	loop: false,
	rotate: false,
	rotateMaxDeg: 8,
	skew: false,
	skewMaxDeg: 8,
	seed: 0
};
```

- [ ] **Step 2: Update the scroller to use `buildTransforms`**

In `src/scroller.ts`, change the import on line 3 from:

```ts
import { buildSkewTransforms } from './skew';
```

to:

```ts
import { buildTransforms } from './transforms';
```

Then replace the transforms construction (currently lines 28-30):

```ts
const transforms = settings.skew
	? buildSkewTransforms(count, settings.skewMaxDeg, settings.skewSeed)
	: null;
```

with:

```ts
const transforms =
	settings.rotate || settings.skew
		? buildTransforms(
				count,
				{
					rotate: settings.rotate,
					rotateMaxDeg: settings.rotateMaxDeg,
					skew: settings.skew,
					skewMaxDeg: settings.skewMaxDeg
				},
				settings.seed
			)
		: null;
```

(Leave the rest of `scroller.ts` unchanged — `buildCopy` already applies `transforms[i]` to each item.)

- [ ] **Step 3: Update the share-URL codec**

Replace the entire contents of `src/shareUrl.ts` with:

```ts
import type { Settings } from './types';

const SPEED_MIN = 10;
const SPEED_MAX = 5000;
const DEG_MIN = 1;
const DEG_MAX = 30;
const SEED_MAX = 0xffffffff;

/** Build "?codes=...&speed=...&loop=..." from raw code strings + settings. codes are
 *  joined with "\n" so internal commas/whitespace survive URLSearchParams encoding. */
export function encodeShareUrl(codes: string[], settings: Settings): string {
	const params = new URLSearchParams();
	params.set('codes', codes.join('\n'));
	params.set('speed', String(settings.speedPxPerSec));
	params.set('loop', settings.loop ? '1' : '0');
	params.set('rot', settings.rotate ? '1' : '0');
	params.set('rotmax', String(settings.rotateMaxDeg));
	params.set('skew', settings.skew ? '1' : '0');
	params.set('skewmax', String(settings.skewMaxDeg));
	params.set('seed', String(settings.seed));
	return '?' + params.toString();
}

/** Parse location.search into codes + partial settings. Per-parameter leniency,
 *  never throws. */
export function decodeShareUrl(search: string): { codes: string[]; settings: Partial<Settings> } {
	const params = new URLSearchParams(search);
	const codesRaw = params.get('codes');
	const codes = codesRaw
		? codesRaw
				.split('\n')
				.map((c) => c.trim())
				.filter((c) => c.length > 0)
		: [];

	const settings: Partial<Settings> = {};
	const speedRaw = params.get('speed');
	if (speedRaw !== null) {
		const speed = Number(speedRaw);
		if (Number.isFinite(speed) && speed >= SPEED_MIN && speed <= SPEED_MAX) {
			settings.speedPxPerSec = speed;
		}
	}
	const loopRaw = params.get('loop');
	if (loopRaw === '0' || loopRaw === '1') {
		settings.loop = loopRaw === '1';
	}
	const rotRaw = params.get('rot');
	if (rotRaw === '0' || rotRaw === '1') {
		settings.rotate = rotRaw === '1';
	}
	const rotMaxRaw = params.get('rotmax');
	if (rotMaxRaw !== null) {
		const v = Number(rotMaxRaw);
		if (Number.isFinite(v) && v >= DEG_MIN && v <= DEG_MAX) {
			settings.rotateMaxDeg = v;
		}
	}
	const skewRaw = params.get('skew');
	if (skewRaw === '0' || skewRaw === '1') {
		settings.skew = skewRaw === '1';
	}
	const skewMaxRaw = params.get('skewmax');
	if (skewMaxRaw !== null) {
		const v = Number(skewMaxRaw);
		if (Number.isFinite(v) && v >= DEG_MIN && v <= DEG_MAX) {
			settings.skewMaxDeg = v;
		}
	}
	const seedRaw = params.get('seed');
	if (seedRaw !== null) {
		const v = Number(seedRaw);
		if (Number.isInteger(v) && v >= 0 && v <= SEED_MAX) {
			settings.seed = v;
		}
	}
	return { codes, settings };
}
```

- [ ] **Step 4: Update the seed lifecycle in `main.ts`**

In `src/main.ts`, replace lines 12-14:

```ts
if (decoded.settings.skewSeed === undefined) {
	settings.skewSeed = Math.floor(Math.random() * 0x100000000) >>> 0;
}
```

with:

```ts
if (decoded.settings.seed === undefined) {
	settings.seed = Math.floor(Math.random() * 0x100000000) >>> 0;
}
```

- [ ] **Step 5: Add the rotation control to the setup UI**

In `src/setupView.ts`, replace the `.settings-row` block (currently lines 21-32) with a version that adds a "Random rotation" field **before** "Random skew", mirroring the existing skew field exactly:

```html
<div class="settings-row">
	<label class="field"
		>Speed
		<input type="range" class="speed-input" min="10" max="5000" step="5" />
	</label>
	<label class="field"
		>Loop
		<input type="checkbox" class="loop-input" />
	</label>
	<label class="field"
		>Random rotation
		<input type="checkbox" class="rotate-input" />
		<input type="range" class="rotate-max-input" min="1" max="30" step="1" />
	</label>
	<label class="field"
		>Random skew
		<input type="checkbox" class="skew-input" />
		<input type="range" class="skew-max-input" min="1" max="30" step="1" />
	</label>
</div>
```

Add the two element refs next to the existing `skewInput`/`skewMaxInput` lookups (after line 48):

```ts
const rotateInput = root.querySelector('.rotate-input') as HTMLInputElement;
const rotateMaxInput = root.querySelector('.rotate-max-input') as HTMLInputElement;
```

Replace the skew prefill + enable-sync block (currently lines 59-65):

```ts
skewInput.checked = settings.skew;
skewMaxInput.value = String(settings.skewMaxDeg);
const syncSkewEnabled = () => {
	skewMaxInput.disabled = !skewInput.checked;
};
syncSkewEnabled();
skewInput.addEventListener('change', syncSkewEnabled);
```

with prefill + enable-sync for **both** axes:

```ts
rotateInput.checked = settings.rotate;
rotateMaxInput.value = String(settings.rotateMaxDeg);
skewInput.checked = settings.skew;
skewMaxInput.value = String(settings.skewMaxDeg);
const syncRotateEnabled = () => {
	rotateMaxInput.disabled = !rotateInput.checked;
};
const syncSkewEnabled = () => {
	skewMaxInput.disabled = !skewInput.checked;
};
syncRotateEnabled();
syncSkewEnabled();
rotateInput.addEventListener('change', syncRotateEnabled);
skewInput.addEventListener('change', syncSkewEnabled);
```

Replace `currentSettings` (currently lines 69-75):

```ts
const currentSettings = (): Settings => ({
	speedPxPerSec: Number(speedInput.value),
	loop: loopInput.checked,
	rotate: rotateInput.checked,
	rotateMaxDeg: Number(rotateMaxInput.value),
	skew: skewInput.checked,
	skewMaxDeg: Number(skewMaxInput.value),
	seed: settings.seed
});
```

- [ ] **Step 6: Delete the obsolete skew module and its test**

```bash
git rm src/skew.ts src/skew.test.ts
```

- [ ] **Step 7: Update `types.test.ts`**

Replace the contents of `src/types.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './types';

describe('DEFAULT_SETTINGS', () => {
	it('defaults to 60 px/s, loop off, rotation off, skew off', () => {
		expect(DEFAULT_SETTINGS.speedPxPerSec).toBe(60);
		expect(DEFAULT_SETTINGS.loop).toBe(false);
		expect(DEFAULT_SETTINGS.rotate).toBe(false);
		expect(DEFAULT_SETTINGS.rotateMaxDeg).toBe(8);
		expect(DEFAULT_SETTINGS.skew).toBe(false);
		expect(DEFAULT_SETTINGS.skewMaxDeg).toBe(8);
		expect(DEFAULT_SETTINGS.seed).toBe(0);
	});
});
```

- [ ] **Step 8: Update `scroller.test.ts`**

In `src/scroller.test.ts`, update every `Settings` literal to the new shape and retarget the distortion tests. Apply these exact replacements:

Lines 16, 24 (the two `loop: false` default-shape literals):

```ts
const s = createScroller(container, entries, {
	speedPxPerSec: 60,
	loop: false,
	rotate: false,
	rotateMaxDeg: 8,
	skew: false,
	skewMaxDeg: 8,
	seed: 0
});
```

Line 35 (`loop: true`):

```ts
const s = createScroller(container, entries, {
	speedPxPerSec: 60,
	loop: true,
	rotate: false,
	rotateMaxDeg: 8,
	skew: false,
	skewMaxDeg: 8,
	seed: 0
});
```

Line 72 (inside the regression test, with `onFinish`):

```ts
const s = createScroller(
	container,
	entries,
	{
		speedPxPerSec: 60,
		loop: false,
		rotate: false,
		rotateMaxDeg: 8,
		skew: false,
		skewMaxDeg: 8,
		seed: 0
	},
	onFinish
);
```

Replace the "applies the same skew transform per index" test (currently lines 84-95) with a version that also asserts rotation-only activates the transform path:

```ts
it('applies the same transform per index to both copies when a distortion is on', () => {
	const s = createScroller(container, entries, {
		speedPxPerSec: 60,
		loop: false,
		rotate: false,
		rotateMaxDeg: 10,
		skew: true,
		skewMaxDeg: 10,
		seed: 5
	});
	const copies = container.querySelectorAll<HTMLElement>('.scroller-copy');
	const items0 = copies[0].querySelectorAll<HTMLElement>('.barcode-item');
	const items1 = copies[1].querySelectorAll<HTMLElement>('.barcode-item');
	expect(items0[0].style.transform).not.toBe('');
	expect(items0[0].style.transform).toBe(items1[0].style.transform);
	expect(items0[1].style.transform).toBe(items1[1].style.transform);
	s.destroy();
});

it('transforms barcodes when only rotation is on', () => {
	const s = createScroller(container, entries, {
		speedPxPerSec: 60,
		loop: false,
		rotate: true,
		rotateMaxDeg: 10,
		skew: false,
		skewMaxDeg: 10,
		seed: 5
	});
	const item = container.querySelector<HTMLElement>('.barcode-item')!;
	expect(item.style.transform).toMatch(/^rotate\(/);
	s.destroy();
});
```

Replace the "leaves barcode items untransformed when skew is off" test (currently lines 97-104) with:

```ts
it('leaves barcode items untransformed when both distortions are off', () => {
	const s = createScroller(container, entries, {
		speedPxPerSec: 60,
		loop: false,
		rotate: false,
		rotateMaxDeg: 10,
		skew: false,
		skewMaxDeg: 10,
		seed: 5
	});
	const item = container.querySelector<HTMLElement>('.barcode-item')!;
	expect(item.style.transform).toBe('');
	s.destroy();
});
```

- [ ] **Step 9: Update `playView.test.ts`**

In `src/playView.test.ts`, update both `Settings` literals (lines 22 and 31) to:

```ts
{ speedPxPerSec: 60, loop: false, rotate: false, rotateMaxDeg: 8, skew: false, skewMaxDeg: 8, seed: 0 }
```

So line 22 becomes:

```ts
mountPlayView(
	root,
	entries,
	{
		speedPxPerSec: 60,
		loop: false,
		rotate: false,
		rotateMaxDeg: 8,
		skew: false,
		skewMaxDeg: 8,
		seed: 0
	},
	() => {}
);
```

and line 31 becomes:

```ts
mountPlayView(
	root,
	entries,
	{
		speedPxPerSec: 60,
		loop: false,
		rotate: false,
		rotateMaxDeg: 8,
		skew: false,
		skewMaxDeg: 8,
		seed: 0
	},
	onBack
);
```

- [ ] **Step 10: Update `shareUrl.test.ts`**

Replace the entire contents of `src/shareUrl.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { encodeShareUrl, decodeShareUrl } from './shareUrl';

describe('shareUrl', () => {
	it('round-trips codes and settings', () => {
		const search = encodeShareUrl(['036000291452', '012345678905'], {
			speedPxPerSec: 120,
			loop: true,
			rotate: false,
			rotateMaxDeg: 8,
			skew: false,
			skewMaxDeg: 8,
			seed: 0
		});
		expect(decodeShareUrl(search)).toEqual({
			codes: ['036000291452', '012345678905'],
			settings: {
				speedPxPerSec: 120,
				loop: true,
				rotate: false,
				rotateMaxDeg: 8,
				skew: false,
				skewMaxDeg: 8,
				seed: 0
			}
		});
	});

	it('is lenient per parameter and never throws', () => {
		expect(decodeShareUrl('')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?speed=abc&loop=2')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?speed=99999')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?loop=1')).toEqual({ codes: [], settings: { loop: true } });
	});

	it('accepts speed up to the max (5000) and rejects above it', () => {
		expect(decodeShareUrl('?speed=5000')).toEqual({ codes: [], settings: { speedPxPerSec: 5000 } });
		expect(decodeShareUrl('?speed=5001')).toEqual({ codes: [], settings: {} });
	});

	it('round-trips rotation and skew settings', () => {
		const search = encodeShareUrl(['036000291452'], {
			speedPxPerSec: 60,
			loop: false,
			rotate: true,
			rotateMaxDeg: 15,
			skew: true,
			skewMaxDeg: 12,
			seed: 123456
		});
		expect(decodeShareUrl(search)).toEqual({
			codes: ['036000291452'],
			settings: {
				speedPxPerSec: 60,
				loop: false,
				rotate: true,
				rotateMaxDeg: 15,
				skew: true,
				skewMaxDeg: 12,
				seed: 123456
			}
		});
	});

	it('is lenient on rotation, skew, and seed params', () => {
		expect(decodeShareUrl('?rot=2')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?rotmax=99')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?skew=2')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?skewmax=0')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?seed=-1')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?rot=1&rotmax=20&skew=1&skewmax=30&seed=0')).toEqual({
			codes: [],
			settings: { rotate: true, rotateMaxDeg: 20, skew: true, skewMaxDeg: 30, seed: 0 }
		});
	});
});
```

- [ ] **Step 11: Update `main.test.ts`**

In `src/main.test.ts`, migrate the three seed-related tests from the `skewseed` param to `seed`. Apply these exact edits:

Line 26-30 test — rename and switch the param. Replace lines 26-30:

```ts
it('preserves a URL-provided seed in the Copy-link URL', () => {
	startApp(root, '?codes=036000291452&skew=1&seed=424242');
	(root.querySelector('.copy-link') as HTMLButtonElement).click();
	expect((root.querySelector('.share-url') as HTMLInputElement).value).toContain('seed=424242');
});
```

Line 40 — replace `skewseed` with `seed`:

```ts
expect(url).toContain(`seed=${expectedSeed}`);
```

Line 58 — use a delimiter-anchored regex so it can't collide with `speed=`:

```ts
expect(url1.match(/[?&]seed=(\d+)/)![1]).not.toBe(url2.match(/[?&]seed=(\d+)/)![1]);
```

- [ ] **Step 12: Update `setupView.test.ts`**

In `src/setupView.test.ts`, update the default-shape literal and rewrite the two skew-control tests to cover both axes.

Line 48 — replace with:

```ts
expect(settings).toEqual({
	speedPxPerSec: 60,
	loop: false,
	rotate: false,
	rotateMaxDeg: 8,
	skew: false,
	skewMaxDeg: 8,
	seed: 0
});
```

Replace the "prefills skew controls..." test (currently lines 94-99) and the "carries skew..." test (currently lines 101-113) with:

```ts
it('prefills rotation and skew controls and disables each slider when its toggle is off', () => {
	mountSetupView(
		root,
		{
			codes: ['036000291452'],
			settings: { rotate: false, rotateMaxDeg: 20, skew: false, skewMaxDeg: 15, seed: 77 }
		},
		() => {}
	);
	expect(q<HTMLInputElement>('.rotate-input').checked).toBe(false);
	expect(q<HTMLInputElement>('.rotate-max-input').value).toBe('20');
	expect(q<HTMLInputElement>('.rotate-max-input').disabled).toBe(true);
	expect(q<HTMLInputElement>('.skew-input').checked).toBe(false);
	expect(q<HTMLInputElement>('.skew-max-input').value).toBe('15');
	expect(q<HTMLInputElement>('.skew-max-input').disabled).toBe(true);
});

it('enables the rotation slider when its checkbox is checked', () => {
	mountSetupView(root, { codes: ['036000291452'], settings: { rotate: false } }, () => {});
	const cb = q<HTMLInputElement>('.rotate-input');
	const slider = q<HTMLInputElement>('.rotate-max-input');
	expect(slider.disabled).toBe(true);
	cb.checked = true;
	cb.dispatchEvent(new Event('change'));
	expect(slider.disabled).toBe(false);
});

it('carries rotation, skew, and the seed into onStart', () => {
	const onStart = vi.fn();
	mountSetupView(
		root,
		{
			codes: ['036000291452'],
			settings: { rotate: true, rotateMaxDeg: 25, skew: true, skewMaxDeg: 20, seed: 999 }
		},
		onStart
	);
	q<HTMLButtonElement>('.start').click();
	const [, settings] = onStart.mock.calls[0];
	expect(settings.rotate).toBe(true);
	expect(settings.rotateMaxDeg).toBe(25);
	expect(settings.skew).toBe(true);
	expect(settings.skewMaxDeg).toBe(20);
	expect(settings.seed).toBe(999);
});
```

- [ ] **Step 13: Verify type-check, full suite, and build are green**

Run: `npx tsc --noEmit`
Expected: no output, exit 0. (This is the gate that catches any missed `Settings` literal.)

Run: `npm test`
Expected: all test files pass. There should be **no** `skew.test.ts` anymore and a `transforms.test.ts` present.

Run: `npm run build`
Expected: `vite build` completes successfully (built assets emitted, no errors).

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: split rotation out of skew into independent controls"
```

---

## Self-Review

**Spec coverage:**

- Settings model (rotate/rotateMaxDeg, skew repurposed, seed rename) → Task 2 Step 1. ✓
- Transform builder with positional draws + enabled-axes composition → Task 1. ✓
- Scroller activates on `rotate || skew`, applies same array to both copies → Task 2 Step 2. ✓
- UI: two control rows, per-axis toggle+slider, slider disabled when off → Task 2 Step 5 + tests Step 12. ✓
- URL scheme `rot`/`rotmax`/`skew`/`skewmax`/`seed`, lenient decode → Task 2 Step 3 + tests Step 10. ✓
- Seed lifecycle (random uint32 when absent, verbatim when present) → Task 2 Step 4 + `main.test.ts` Step 11. ✓
- File rename `skew.ts` → `transforms.ts` → Task 1 (create) + Task 2 Step 6 (delete old). ✓
- `tsc --noEmit` gate → Task 1 Step 5, Task 2 Step 13, and Global Constraints. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — every code and test step contains complete code. ✓

**Type consistency:** `buildTransforms(count, DistortOpts, seed)` and `DistortOpts` field names (`rotate`, `rotateMaxDeg`, `skew`, `skewMaxDeg`) are identical between Task 1's definition, the scroller call (Task 2 Step 2), and the `Settings` fields (Task 2 Step 1). Share-URL param names match between `encodeShareUrl`, `decodeShareUrl`, and the tests. DOM selectors (`.rotate-input`, `.rotate-max-input`, `.skew-input`, `.skew-max-input`) match between `setupView.ts` markup and `setupView.test.ts`. The canonical `Settings` literal `{ speedPxPerSec, loop, rotate, rotateMaxDeg, skew, skewMaxDeg, seed }` is used identically across every test file. ✓

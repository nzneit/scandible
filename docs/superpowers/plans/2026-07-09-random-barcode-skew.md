# Random Barcode Skew — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add an optional, seedable random per-barcode skew (rotation + horizontal shear) to scandible, tunable in magnitude and reproducible from the share URL.

**Architecture:** A pure `skew.ts` (mulberry32 PRNG + transform builder) produces one CSS transform per barcode from `(count, maxDeg, seed)`. The scroller applies the same array to both loop copies. Three new `Settings` fields (`skew`, `skewMaxDeg`, `skewSeed`) round-trip through the share URL; `main.ts` seeds the session when the URL has none.

**Source of truth:** `docs/superpowers/specs/2026-07-09-random-barcode-skew-design.md`.

## Global Constraints

- Branch: `feat/random-barcode-skew`. All modules in `src/`; tests colocated as `src/<name>.test.ts`.
- Skew is a CSS transform on `.barcode-item` — must NOT change layout or `contentHeight`.
- The same transform array is applied to BOTH loop copies (seamless seam).
- Skew magnitude slider: `min=1 max=30 step=1`, default `8`. Seed is a uint32 (`0..4294967295`).
- URL params: `skew=<0|1>`, `skewmax=<1..30>`, `skewseed=<0..4294967295>`, per-param lenient (ignored if malformed; never throws).
- **Commit messages must NOT include any Claude/AI co-author attribution.** One focused commit per task.
- Existing behavior/tests must stay green (currently 31 tests).

---

### Task 1: Settings fields + pure skew module

**Files:**
- Modify: `src/types.ts`
- Create: `src/skew.ts`, `src/skew.test.ts`
- Modify: `src/types.test.ts`

**Interfaces:**
- Produces: `Settings` gains `skew: boolean`, `skewMaxDeg: number`, `skewSeed: number`; `DEFAULT_SETTINGS` gains `skew:false, skewMaxDeg:8, skewSeed:0`. `buildSkewTransforms(count: number, maxDeg: number, seed: number): string[]`.

- [ ] **Step 1: Extend `src/types.ts`** — replace the `Settings` interface and `DEFAULT_SETTINGS`:

```ts
/** Playback settings, round-tripped through the share URL. */
export interface Settings {
  speedPxPerSec: number; // scroll speed in CSS px per second
  loop: boolean; // wrap at end vs. stop
  skew: boolean; // random per-barcode rotation + shear
  skewMaxDeg: number; // max |degrees| for rotation and shear (slider 1–30)
  skewSeed: number; // uint32 PRNG seed — makes the skew arrangement reproducible
}

/** Single source of truth for defaults; used to fill Partial<Settings>. */
export const DEFAULT_SETTINGS: Settings = {
  speedPxPerSec: 60,
  loop: false,
  skew: false,
  skewMaxDeg: 8,
  skewSeed: 0,
};
```

- [ ] **Step 2: Update the defaults test** — in `src/types.test.ts`, extend the assertion:

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './types';

describe('DEFAULT_SETTINGS', () => {
  it('defaults to 60 px/s, loop off, skew off', () => {
    expect(DEFAULT_SETTINGS.speedPxPerSec).toBe(60);
    expect(DEFAULT_SETTINGS.loop).toBe(false);
    expect(DEFAULT_SETTINGS.skew).toBe(false);
    expect(DEFAULT_SETTINGS.skewMaxDeg).toBe(8);
    expect(DEFAULT_SETTINGS.skewSeed).toBe(0);
  });
});
```

- [ ] **Step 3: Write the failing test** — `src/skew.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSkewTransforms } from './skew';

describe('buildSkewTransforms', () => {
  it('returns one transform per barcode', () => {
    expect(buildSkewTransforms(5, 10, 1)).toHaveLength(5);
    expect(buildSkewTransforms(0, 10, 1)).toEqual([]);
  });

  it('is deterministic for a given seed and seed-sensitive', () => {
    expect(buildSkewTransforms(4, 10, 42)).toEqual(buildSkewTransforms(4, 10, 42));
    expect(buildSkewTransforms(4, 10, 42)).not.toEqual(buildSkewTransforms(4, 10, 43));
  });

  it('emits rotate()+skewX() within ±maxDeg', () => {
    const out = buildSkewTransforms(50, 10, 7);
    for (const t of out) {
      const m = t.match(/^rotate\((-?\d+(?:\.\d+)?)deg\) skewX\((-?\d+(?:\.\d+)?)deg\)$/);
      expect(m).not.toBeNull();
      expect(Math.abs(Number(m![1]))).toBeLessThanOrEqual(10);
      expect(Math.abs(Number(m![2]))).toBeLessThanOrEqual(10);
    }
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/skew.test.ts`
Expected: FAIL — `Failed to resolve import "./skew"`.

- [ ] **Step 5: Create `src/skew.ts`**

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

/** One CSS transform per barcode: `rotate(Rdeg) skewX(Sdeg)`, R and S each drawn
 *  independently from [-maxDeg, +maxDeg] via a PRNG seeded by `seed`. Deterministic;
 *  length === count. Pure — safe to call at render time. */
export function buildSkewTransforms(count: number, maxDeg: number, seed: number): string[] {
  const rng = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const rot = ((rng() * 2 - 1) * maxDeg).toFixed(2);
    const shear = ((rng() * 2 - 1) * maxDeg).toFixed(2);
    out.push(`rotate(${rot}deg) skewX(${shear}deg)`);
  }
  return out;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/skew.test.ts src/types.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/types.test.ts src/skew.ts src/skew.test.ts
git commit -m "feat: add skew settings fields and seeded skew-transform builder"
```

---

### Task 2: Share-URL round-trip for skew params

**Files:**
- Modify: `src/shareUrl.ts`, `src/shareUrl.test.ts`

**Interfaces:**
- Consumes: `Settings` (with skew fields). Produces: `encodeShareUrl`/`decodeShareUrl` now handle `skew`, `skewmax`, `skewseed`.

- [ ] **Step 1: Write the failing test** — append to `src/shareUrl.test.ts` inside the `describe('shareUrl', ...)` block:

```ts
  it('round-trips skew settings', () => {
    const search = encodeShareUrl(['036000291452'], {
      speedPxPerSec: 60, loop: false, skew: true, skewMaxDeg: 12, skewSeed: 123456,
    });
    expect(decodeShareUrl(search)).toEqual({
      codes: ['036000291452'],
      settings: { speedPxPerSec: 60, loop: false, skew: true, skewMaxDeg: 12, skewSeed: 123456 },
    });
  });

  it('is lenient on skew params', () => {
    expect(decodeShareUrl('?skew=2')).toEqual({ codes: [], settings: {} });
    expect(decodeShareUrl('?skewmax=99')).toEqual({ codes: [], settings: {} });
    expect(decodeShareUrl('?skewseed=-1')).toEqual({ codes: [], settings: {} });
    expect(decodeShareUrl('?skew=1&skewmax=30&skewseed=0')).toEqual({
      codes: [], settings: { skew: true, skewMaxDeg: 30, skewSeed: 0 },
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/shareUrl.test.ts`
Expected: FAIL (skew params not encoded/decoded yet).

- [ ] **Step 3: Update `src/shareUrl.ts`** — add the skew range constants near the top (below `SPEED_MAX`):

```ts
const SKEW_MIN = 1;
const SKEW_MAX = 30;
const SEED_MAX = 0xffffffff;
```

In `encodeShareUrl`, after the `loop` param, add:

```ts
  params.set('skew', settings.skew ? '1' : '0');
  params.set('skewmax', String(settings.skewMaxDeg));
  params.set('skewseed', String(settings.skewSeed));
```

In `decodeShareUrl`, after the existing `loop` block (before `return`), add:

```ts
  const skewRaw = params.get('skew');
  if (skewRaw === '0' || skewRaw === '1') {
    settings.skew = skewRaw === '1';
  }
  const skewMaxRaw = params.get('skewmax');
  if (skewMaxRaw !== null) {
    const v = Number(skewMaxRaw);
    if (Number.isFinite(v) && v >= SKEW_MIN && v <= SKEW_MAX) {
      settings.skewMaxDeg = v;
    }
  }
  const seedRaw = params.get('skewseed');
  if (seedRaw !== null) {
    const v = Number(seedRaw);
    if (Number.isInteger(v) && v >= 0 && v <= SEED_MAX) {
      settings.skewSeed = v;
    }
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/shareUrl.test.ts`
Expected: PASS (all cases, including the pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/shareUrl.ts src/shareUrl.test.ts
git commit -m "feat: round-trip skew settings through the share URL"
```

---

### Task 3: Apply skew transforms in the scroller

**Files:**
- Modify: `src/scroller.ts`, `src/scroller.test.ts`

**Interfaces:**
- Consumes: `buildSkewTransforms` from `./skew`; `Settings` skew fields. The `.barcode-item` gets an inline `transform` when `settings.skew` is on; the same transform is applied to the matching index in both copies.

- [ ] **Step 1: Write the failing test** — append to `src/scroller.test.ts` inside `describe('createScroller', ...)`:

```ts
  it('applies the same skew transform per index to both copies when skew is on', () => {
    const s = createScroller(container, entries, {
      speedPxPerSec: 60, loop: false, skew: true, skewMaxDeg: 10, skewSeed: 5,
    });
    const copies = container.querySelectorAll<HTMLElement>('.scroller-copy');
    const items0 = copies[0].querySelectorAll<HTMLElement>('.barcode-item');
    const items1 = copies[1].querySelectorAll<HTMLElement>('.barcode-item');
    expect(items0[0].style.transform).not.toBe('');
    expect(items0[0].style.transform).toBe(items1[0].style.transform);
    expect(items0[1].style.transform).toBe(items1[1].style.transform);
    s.destroy();
  });

  it('leaves barcode items untransformed when skew is off', () => {
    const s = createScroller(container, entries, {
      speedPxPerSec: 60, loop: false, skew: false, skewMaxDeg: 10, skewSeed: 5,
    });
    const item = container.querySelector<HTMLElement>('.barcode-item')!;
    expect(item.style.transform).toBe('');
    s.destroy();
  });
```

(The existing `entries` in this test file has 2 valid entries, so `items0` has length 2.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scroller.test.ts`
Expected: FAIL (no transform applied yet).

- [ ] **Step 3: Update `src/scroller.ts`** — add the import at the top with the others:

```ts
import { buildSkewTransforms } from './skew';
```

Then replace the `buildCopy` definition so it applies a shared transforms array:

```ts
  const transforms = settings.skew
    ? buildSkewTransforms(count, settings.skewMaxDeg, settings.skewSeed)
    : null;

  const buildCopy = (): HTMLElement => {
    const copy = document.createElement('div');
    copy.className = 'scroller-copy';
    valid.forEach((e, i) => {
      const item = document.createElement('div');
      item.className = 'barcode-item';
      if (transforms) item.style.transform = transforms[i];
      item.appendChild(renderBarcodeSvg(e));
      copy.appendChild(item);
    });
    return copy;
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/scroller.test.ts`
Expected: PASS (new + existing).

- [ ] **Step 5: Commit**

```bash
git add src/scroller.ts src/scroller.test.ts
git commit -m "feat: apply seeded skew transforms to both barcode copies"
```

---

### Task 4: Setup UI — skew checkbox + magnitude slider

**Files:**
- Modify: `src/setupView.ts`, `src/setupView.test.ts`

**Interfaces:**
- Consumes: `Settings` skew fields. `mountSetupView` now renders `.skew-input` (checkbox) and `.skew-max-input` (range); the slider is disabled while the checkbox is off; `currentSettings()` carries `skew`, `skewMaxDeg`, and the resolved `skewSeed`.

- [ ] **Step 1: Write the failing test** — append to `src/setupView.test.ts`:

```ts
  it('prefills skew controls and disables the slider when skew is off', () => {
    mountSetupView(root, { codes: ['036000291452'], settings: { skew: false, skewMaxDeg: 15, skewSeed: 77 } }, () => {});
    expect(q<HTMLInputElement>('.skew-input').checked).toBe(false);
    expect(q<HTMLInputElement>('.skew-max-input').value).toBe('15');
    expect(q<HTMLInputElement>('.skew-max-input').disabled).toBe(true);
  });

  it('carries skew, skewMaxDeg, and the seed into onStart', () => {
    const onStart = vi.fn();
    mountSetupView(
      root,
      { codes: ['036000291452'], settings: { skew: true, skewMaxDeg: 20, skewSeed: 999 } },
      onStart,
    );
    q<HTMLButtonElement>('.start').click();
    const [, settings] = onStart.mock.calls[0];
    expect(settings.skew).toBe(true);
    expect(settings.skewMaxDeg).toBe(20);
    expect(settings.skewSeed).toBe(999);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/setupView.test.ts`
Expected: FAIL (skew controls not present).

- [ ] **Step 3: Update `src/setupView.ts`**

In the `root.innerHTML` template, replace the `settings-row` div with one that adds the skew controls:

```html
      <div class="settings-row">
        <label>Speed
          <input type="range" class="speed-input" min="10" max="5000" step="5" />
        </label>
        <label><input type="checkbox" class="loop-input" /> Loop</label>
        <label><input type="checkbox" class="skew-input" /> Random skew</label>
        <label>Skew amount
          <input type="range" class="skew-max-input" min="1" max="30" step="1" />
        </label>
      </div>
```

After the existing element lookups, add:

```ts
  const skewInput = root.querySelector('.skew-input') as HTMLInputElement;
  const skewMaxInput = root.querySelector('.skew-max-input') as HTMLInputElement;
```

After the existing prefill lines (`input.value = ...`, `speedInput.value = ...`, `loopInput.checked = ...`), add:

```ts
  skewInput.checked = settings.skew;
  skewMaxInput.value = String(settings.skewMaxDeg);
  const syncSkewEnabled = () => {
    skewMaxInput.disabled = !skewInput.checked;
  };
  syncSkewEnabled();
  skewInput.addEventListener('change', syncSkewEnabled);
```

Replace `currentSettings` so it carries the skew fields (the seed comes from the resolved
`settings`, which already merged `initial.settings` over `DEFAULT_SETTINGS`):

```ts
  const currentSettings = (): Settings => ({
    speedPxPerSec: Number(speedInput.value),
    loop: loopInput.checked,
    skew: skewInput.checked,
    skewMaxDeg: Number(skewMaxInput.value),
    skewSeed: settings.skewSeed,
  });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/setupView.test.ts`
Expected: PASS (new + existing).

- [ ] **Step 5: Commit**

```bash
git add src/setupView.ts src/setupView.test.ts
git commit -m "feat: add random-skew checkbox and magnitude slider to setup"
```

---

### Task 5: Seed the session in main and thread it through

**Files:**
- Modify: `src/main.ts`, `src/main.test.ts`

**Interfaces:**
- Consumes: everything above. On load, when the URL supplies no `skewseed`, `startApp` generates a fresh uint32 seed and uses it; otherwise the URL seed is kept. The seed flows into setup → Copy link.

- [ ] **Step 1: Write the failing test** — append to `src/main.test.ts` inside `describe('startApp', ...)`:

```ts
  it('preserves a URL-provided skew seed in the Copy-link URL', () => {
    startApp(root, '?codes=036000291452&skew=1&skewseed=424242');
    (root.querySelector('.copy-link') as HTMLButtonElement).click();
    expect((root.querySelector('.share-url') as HTMLInputElement).value).toContain('skewseed=424242');
  });

  it('generates a session seed when the URL has none', () => {
    startApp(root, '?codes=036000291452');
    (root.querySelector('.copy-link') as HTMLButtonElement).click();
    const url = (root.querySelector('.share-url') as HTMLInputElement).value;
    const m = url.match(/skewseed=(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(0);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/main.test.ts`
Expected: FAIL (no seed generated; `skewseed` may be absent or `0` unexpectedly — the "generates a session seed" case fails because nothing sets a non-URL seed path yet).

- [ ] **Step 3: Update `src/main.ts`** — replace the seed-merge portion of `startApp`:

```ts
export function startApp(root: HTMLElement, search: string): void {
  const decoded = decodeShareUrl(search);
  let entries: UpcEntry[] = parseUpcList(decoded.codes.join('\n'));
  let settings: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
  if (decoded.settings.skewSeed === undefined) {
    settings.skewSeed = Math.floor(Math.random() * 0x100000000) >>> 0;
  }
```

(Leave the rest of `startApp` — `showSetup`/`showPlay`/`showSetup()` — unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/main.test.ts`
Expected: PASS (new + existing).

- [ ] **Step 5: Run the full suite + build**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/main.test.ts
git commit -m "feat: seed the skew RNG per session when the URL omits it"
```

---

## Self-Review

- **Spec coverage:** 3 settings fields (T1), pure seeded builder (T1), URL round-trip + leniency (T2), both-copies transform (T3), setup checkbox+slider+seed carry (T4), session seeding + thread (T5). ✓
- **Placeholder scan:** every step has complete code and exact commands. ✓
- **Type consistency:** `buildSkewTransforms(count, maxDeg, seed)` identical in T1/T3; `Settings` skew fields identical across T1–T5; URL keys `skew`/`skewmax`/`skewseed` identical in T2/T5 test. ✓
- **Layout safety:** transforms applied to `.barcode-item` (paint-time), `contentHeight` still `copy1.height`; no scroll-math change. ✓

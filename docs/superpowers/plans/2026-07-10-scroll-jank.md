# Scroll Tearing Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate fixed-position tearing at high scroll speed by promoting the scrolling track to its own GPU compositor layer.

**Architecture:** Promote `.scroller-track` via `will-change: transform` (CSS) and switch its per-frame transform from a 2D `translateY` to a 3D `translate3d` (JS) — both documented layer-promotion triggers — so the vsync-locked compositor moves a finished texture atomically instead of the main thread repainting it mid-scan. No animation-loop logic changes.

**Tech Stack:** Vanilla TypeScript, CSS, Vitest + jsdom.

## Global Constraints

- The track's per-frame transform must be `translate3d(0, ${-offset}px, 0)` (3D form), replacing `translateY(${-offset}px)`.
- `.scroller-track` must carry `will-change: transform` (promote exactly one element — not per-barcode).
- No changes to the rAF loop, `measure()`, seamless-loop wrap, or loop-off "Finished" detection.
- Tearing itself is a GPU/vsync visual artifact and is NOT unit-testable — the automated test only guards the structural change (3D transform form); the acceptance test is a manual smoketest at 5000 px/s on real hardware.
- `tsc --noEmit` must pass (vitest/vite do not type-check).
- Commits must NOT include any Claude / AI attribution.

---

### Task 1: Promote the scrolling track to a GPU layer

Change the track's transform to a 3D translate and mark it `will-change: transform`. Add one structural test that guards the 3D form so a future edit can't silently revert to `translateY`.

**Files:**
- Modify: `src/scroller.ts` (the `render()` function)
- Modify: `src/styles.css` (`.scroller-track` rule)
- Test: `src/scroller.test.ts`

**Interfaces:**
- Consumes: existing `createScroller(container, entries, settings, onFinish?)` — unchanged signature.
- Produces: no new interface; the observable change is that `.scroller-track`'s inline `transform` uses the `translate3d(0, …, 0)` form.

- [ ] **Step 1: Write the failing test**

Add this test to `src/scroller.test.ts`, inside the existing `describe('createScroller', () => { ... })` block, before its closing `});`:

```ts
  it('drives the track with a 3D translate so it is GPU-layer promoted', () => {
    const s = createScroller(container, entries, {
      speedPxPerSec: 60, loop: false, rotate: false, rotateMaxDeg: 8, skew: false, skewMaxDeg: 8, seed: 0,
    });
    const track = container.querySelector<HTMLElement>('.scroller-track')!;
    // Initial render (offset 0) must use the 3D transform form, not translateY.
    expect(track.style.transform).toBe('translate3d(0, 0px, 0)');
    s.destroy();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/scroller.test.ts -t "GPU-layer promoted"`
Expected: FAIL — received `translateY(0px)` (the current 2D form), expected `translate3d(0, 0px, 0)`.

- [ ] **Step 3: Change the transform to a 3D translate**

In `src/scroller.ts`, replace the `render` function:

```ts
  const render = () => {
    track.style.transform = `translateY(${-offset}px)`;
  };
```

with:

```ts
  const render = () => {
    track.style.transform = `translate3d(0, ${-offset}px, 0)`;
  };
```

- [ ] **Step 4: Promote the track in CSS**

In `src/styles.css`, replace the `.scroller-track` rule:

```css
.scroller-track { display: flex; flex-direction: column; }
```

with:

```css
.scroller-track { display: flex; flex-direction: column; will-change: transform; }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/scroller.test.ts -t "GPU-layer promoted"`
Expected: PASS.

- [ ] **Step 6: Verify type-check, full suite, and build**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

Run: `npm test`
Expected: all test files pass (the new test plus all pre-existing — none assert the old `translateY` string, so nothing else changes).

Run: `npm run build`
Expected: `vite build` completes successfully.

- [ ] **Step 7: Commit**

```bash
git add src/scroller.ts src/styles.css src/scroller.test.ts
git commit -m "fix: promote scroll track to a GPU layer to stop high-speed tearing"
```

- [ ] **Step 8: Manual smoketest (acceptance — human, not automatable)**

Run `npm run dev`, start a run, set speed to 5000 px/s, and confirm the fixed-position tear is gone. Optionally open Chrome DevTools → Rendering → enable **Layer borders** (confirm `.scroller-track` is its own promoted layer) and **Paint Flashing** (the scrolling layer should show no green repaint while scrolling). This step is verified by a human and is not part of the automated suite.

---

## Self-Review

**Spec coverage:**
- 3D `translate3d` transform → Task 1 Step 3 + guard test Step 1. ✓
- `will-change: transform` on `.scroller-track` (one element only) → Task 1 Step 4. ✓
- No animation-loop logic changes → only `render()`'s transform string and the CSS rule change; rAF/measure/loop/finish untouched. ✓
- Out-of-scope items (content-visibility, WAAPI, speed cap) → not present in the plan. ✓
- Tearing not unit-testable; structural guard + manual acceptance → Steps 1–2, 8. ✓
- `tsc --noEmit` gate → Step 6. ✓

**Placeholder scan:** No TBD/TODO/vague steps; every code step shows exact before/after. ✓

**Type consistency:** No new types or signatures. The `Settings` literal in the new test uses the current 7-field shape (`speedPxPerSec, loop, rotate, rotateMaxDeg, skew, skewMaxDeg, seed`), matching every other literal in `scroller.test.ts`. ✓

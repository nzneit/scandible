# Scroll tearing fix — design

## Goal

Eliminate the fixed-position horizontal **tearing** observed when the barcode
column scrolls near its top speed (~5000 px/s), by promoting the scrolling
element to its own GPU compositor layer so the transform is presented
atomically by the vsync-locked compositor.

## Background / root cause

The play view scrolls a single `.scroller-track` element by writing
`transform: translateY(-offset)` on every `requestAnimationFrame` tick (in
`src/scroller.ts`'s `render()`). At ~5000 px/s the layer advances ~83 px per
frame on a 60 Hz display. Because the track is not promoted to its own GPU
layer, the transform update goes through main-thread paint, and the compositor
can present a frame while that repaint is only partially applied — producing a
tear at a roughly fixed screen position. The symptom is speed-dependent (only
near the maximum) and device-independent, which points at the app's
main-thread presentation rather than any one machine's vsync configuration.

Supporting research (deep-research report, 2026-07-10): `transform`/`opacity`
are the only compositor-only properties, but a compositor-only transform is
_not_ paint-free unless the element is first **promoted to its own layer**;
once promoted, the compositor moves the finished texture as a whole and
presents it vsync-locked. A 3D transform value (`translate3d`) and
`will-change: transform` are both documented layer-promotion triggers.

## Changes

### 1. `src/styles.css` — promote the transformed element

Add `will-change: transform` to `.scroller-track` (the element that receives the
scroll transform):

```css
.scroller-track {
	display: flex;
	flex-direction: column;
	will-change: transform;
}
```

Exactly one element is promoted (not each barcode), avoiding the "layer
explosion" / GPU-memory overhead the research warns against.
`will-change: transform` is the intended use for an element that animates
continuously for the lifetime of the (transient) play view.

### 2. `src/scroller.ts` — use a 3D transform value

In `render()`, change the transform from a 2D to a 3D translate — an independent
promotion trigger that also ensures the browser moves a GPU texture rather than
repainting:

```ts
track.style.transform = `translate3d(0, ${-offset}px, 0)`;
```

(Previously `translateY(${-offset}px)`.) No other logic changes — the rAF loop,
`measure()`, seamless-loop wrap, and loop-off "Finished" detection are untouched.

## Out of scope (deliberately)

- **`content-visibility` / `contain` containment.** This targets a _different_
  symptom (tile-rasterization "checkerboard" gaps on very large lists, not
  reported here), and `content-visibility: auto` has uncertain behavior when an
  element's on-screen-ness is driven by a transformed ancestor. It is recorded
  as the **follow-up lever** if promoting a very tall track ever trades tearing
  for checkerboarding, but is not part of this fix.
- **Web Animations API / compositor-thread animation.** Rejected: WebKit
  silently drops hardware acceleration for `playbackRate ≠ 1`, and it would be a
  rewrite to reconcile with variable speed, pause/restart, and finish detection —
  no gain over layer promotion for this symptom.
- **Capping or reshaping the top speed.** Rejected: hides the symptom rather
  than fixing the non-atomic presentation, and the 5000 px/s maximum is
  intentional.

## Testing / validation

Tearing is a GPU/vsync visual artifact and cannot be unit-tested. Validation is
therefore two-part:

- **Structural unit test** (`src/scroller.test.ts`): assert the track's inline
  transform uses the `translate3d(0, …, 0)` form. This is checkable on the
  initial render (offset 0 → `translate3d(0, 0px, 0)`), needs no rAF, and guards
  against a future edit silently reverting to `translateY`. Existing scroller
  tests do not assert the transform string, so none break. The CSS
  `will-change` rule is not unit-testable in this project (jsdom has no layout /
  CSS cascade); it is covered by the build and the manual check below.
- **Manual smoketest (acceptance test):** scroll at 5000 px/s before vs. after
  on real hardware and confirm the tear is gone. Optionally use Chrome DevTools
  → Rendering → **Layer borders** (confirm `.scroller-track` is one promoted
  layer) and **Paint Flashing** (the scrolling layer should show no green
  repaint during the scroll).

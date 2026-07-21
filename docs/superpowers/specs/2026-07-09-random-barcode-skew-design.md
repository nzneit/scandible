# Random Barcode Skew — Design Spec

**Date:** 2026-07-09
**Status:** Approved (brainstorm) — ready for plan
**Type:** Optional feature on the existing scandible app

## Goal

An optional mode that gives each barcode a small random rotation + horizontal shear, so
the column looks like imperfect/tilted real-world labels. Tunable in magnitude and
**reproducible from the share URL** via a seed.

## Decisions (from brainstorming)

| Decision        | Choice                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| Purpose         | Both scanner-robustness testing and visual variety — **tunable** magnitude      |
| Skew style      | **Rotation + horizontal shear** (`rotate` + `skewX`), random per barcode        |
| Control         | Setup-only: a **checkbox** + a **magnitude slider** (degrees)                   |
| Reproducibility | A **seed** in the share URL reproduces the exact skew arrangement               |
| Loop            | Same skew per position applied to **both** copies → seam stays seamless         |
| Default         | **Off**; default magnitude 8°; scannability degrades at the high end (intended) |

## Settings (three new fields)

```ts
export interface Settings {
	speedPxPerSec: number;
	loop: boolean;
	skew: boolean; // NEW — enable random skew
	skewMaxDeg: number; // NEW — max |degrees| for both rotation and shear (slider 1–30)
	skewSeed: number; // NEW — uint32 PRNG seed; makes the arrangement reproducible
}
export const DEFAULT_SETTINGS: Settings = {
	speedPxPerSec: 60,
	loop: false,
	skew: false,
	skewMaxDeg: 8,
	skewSeed: 0
};
```

## Behavior

- When `skew` is on, each barcode `i` gets `transform: rotate(Rᵢ deg) skewX(Sᵢ deg)`, where
  `Rᵢ` and `Sᵢ` are each drawn independently from `[−skewMaxDeg, +skewMaxDeg]`.
- The transforms are produced by a **deterministic PRNG (mulberry32) seeded by `skewSeed`**,
  so `(count, skewMaxDeg, skewSeed)` always yields the identical array. The **same array is
  applied to the matching barcode in both loop copies**, keeping the wrap seamless.
- The transform is a CSS transform on `.barcode-item` — a paint-time operation, so it has
  **no effect on layout, `contentHeight`, or the scroll math** (the `copy1.height`
  measurement is already transform-safe).

## Seed lifecycle (reproducibility)

- `skewSeed` round-trips in the share URL as `skewseed=<uint32>`.
- On load (`main.ts`): if the URL supplies a seed, use it (exact reproduction). Otherwise
  generate **one** fresh random seed for the session and hold it, so a first visit looks
  random but **Copy link captures that seed** — the link reproduces exactly what the sender
  saw. Because the code list is also in the URL, the recipient gets the same `count`,
  `skewMaxDeg`, and `skewSeed` → byte-identical skew per position.
- The seed is threaded through setup → Start / Copy link; it is not a user-facing control.

## New module — `src/skew.ts` (pure, testable)

```ts
/** Deterministic PRNG (mulberry32): same seed → same [0,1) sequence. */
// (internal) function mulberry32(seed: number): () => number

/** One CSS transform per barcode: `rotate(Rdeg) skewX(Sdeg)`, R and S each in
 *  [-maxDeg, +maxDeg], from a PRNG seeded by `seed`. Deterministic; length === count. */
export function buildSkewTransforms(count: number, maxDeg: number, seed: number): string[];
```

## URL scheme additions

`&skew=<0|1>&skewmax=<1..30>&skewseed=<0..4294967295>` — per-parameter leniency (each is
ignored if malformed/out of range; never throws), matching the existing `speed`/`loop`
handling.

## UI (setup only)

A "Random skew" checkbox and a magnitude slider (`min=1 max=30 step=1`, default `8`),
disabled while the checkbox is off. Not added to the play overlay (setup-time, like loop).

## Files touched

- `src/types.ts` — 3 fields + defaults.
- `src/skew.ts` — new (PRNG + `buildSkewTransforms`).
- `src/shareUrl.ts` — encode/decode the 3 params.
- `src/scroller.ts` — apply per-index transforms to both copies when `skew` is on.
- `src/setupView.ts` — checkbox + slider, prefill, carry the fields (incl. seed) in
  `currentSettings`.
- `src/main.ts` — generate a session seed when the URL has none; thread it through.

## Testing

- `skew.ts` — determinism (same seed → same array; different seed → different), length
  `=== count`, values within `±maxDeg`, transform-string format.
- `shareUrl.ts` — round-trip of the 3 new params; per-param leniency.
- `scroller.ts` — with skew on (fixed seed) the two copies carry the **same** transform per
  index; with skew off, `.barcode-item` has no inline transform.
- `setupView.ts` — checkbox/slider prefill; slider disabled when off; `onStart`/Copy link
  carry `skew`/`skewMaxDeg`/`skewSeed`.
- `main.ts` — a URL seed is preserved; with no URL seed, a numeric seed is generated and
  appears in the Copy-link URL.

## Non-goals (YAGNI)

- No live skew control in the play overlay (setup-time only).
- No per-axis separate magnitude (one slider bounds both rotation and shear).
- No "reshuffle" button (reload for a new random seed).

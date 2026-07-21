# Rotation setting — design

## Goal

Split the existing "Random skew" feature into two independent, separately
tunable distortions: **random rotation** and **random skew (slant)**. Today a
single toggle applies `rotate(Rdeg) skewX(Sdeg)` together with one shared max
angle. After this change, rotation and slant each have their own on/off toggle
and their own max-angle slider, while remaining fully reproducible from the
share URL.

## Context

- The skew feature (`buildSkewTransforms`, `Settings.skew`/`skewMaxDeg`/`skewSeed`,
  URL params `skew`/`skewmax`/`skewseed`) exists on the local `main` but was
  **never pushed to `origin/main`**, so it is not deployed and no shared URLs in
  the wild use those params. The URL scheme can therefore be redesigned cleanly
  with no backward-compatibility burden.
- Distortions are applied as CSS transforms per barcode, in the setup screen
  only (set once, not adjusted during playback). CSS transforms do not affect
  layout, so per-barcode distortion does not disturb the seamless scroll loop.

## Settings model (`src/types.ts`)

```ts
interface Settings {
	speedPxPerSec: number;
	loop: boolean;
	rotate: boolean; // NEW — random per-barcode rotation on/off
	rotateMaxDeg: number; // NEW — max |degrees| for rotation (slider range 1–30)
	skew: boolean; // REPURPOSED — now means skewX (slant) only
	skewMaxDeg: number; // max |degrees| for slant (slider range 1–30)
	seed: number; // RENAMED from skewSeed — one uint32, drives BOTH axes
}

const DEFAULT_SETTINGS: Settings = {
	speedPxPerSec: 60,
	loop: false,
	rotate: false,
	rotateMaxDeg: 8,
	skew: false,
	skewMaxDeg: 8,
	seed: 0
};
```

Both axes default **off**, preserving today's out-of-the-box behavior (no
distortion).

## Transform builder (`src/skew.ts` → rename to `src/transforms.ts`)

The module is no longer skew-specific, so the file is renamed to
`transforms.ts`. It retains the internal `mulberry32` PRNG and exports:

```ts
buildTransforms(
  count: number,
  opts: { rotate: boolean; rotateMaxDeg: number; skew: boolean; skewMaxDeg: number },
  seed: number,
): string[]
```

Behavior:

- Seed one `mulberry32(seed)` PRNG.
- For **each** barcode, **always draw two values in fixed order**: first the
  rotation draw, then the shear draw — regardless of which axes are enabled.
  This positional draw order guarantees that a given barcode's rotation is
  identical whether or not skew is enabled, and vice versa. Toggling one axis
  never disturbs the other's values.
- Each draw maps `[0, 1)` to `[-maxDeg, +maxDeg]` for its axis and is fixed to
  2 decimal places (as today).
- Compose the transform string from **only the enabled axes**, rotation first:
  - both on → `rotate(Rdeg) skewX(Sdeg)`
  - rotation only → `rotate(Rdeg)`
  - skew only → `skewX(Sdeg)`
- Return an array of length `count`. Pure — safe to call at render time.

In `src/scroller.ts`, build transforms when `settings.rotate || settings.skew`
(otherwise `null`, and no `transform` style is applied). The same transforms
array is applied to both scroll copies, per index (unchanged mechanism).

## UI controls (`src/setupView.ts`)

Two stacked control rows inside the existing `.settings-row` container, each
following the current per-line style (label text on its own line, inputs
below):

```
Random rotation
  [x]  [--------|---]   ← checkbox + max-degrees range slider
Random skew
  [ ]  [----|-------]   ← checkbox + max-degrees range slider
```

- Each checkbox enables/disables its own max slider (slider `disabled` when its
  checkbox is unchecked), mirroring today's single-toggle behavior but per axis.
- Both sliders: `min="1" max="30" step="1"`.
- `currentSettings()` reads all fields and carries `seed` through from the
  incoming settings.

## URL scheme & seed lifecycle (`src/shareUrl.ts`, `src/main.ts`)

Clean rename (no back-compat needed). Encoded params:

| Param     | Meaning                 | Encoding / leniency on decode                    |
| --------- | ----------------------- | ------------------------------------------------ |
| `rot`     | rotation on/off         | `1`/`0`; ignored unless exactly `0` or `1`       |
| `rotmax`  | rotation max degrees    | number; accepted only if finite and in `[1, 30]` |
| `skew`    | slant on/off            | `1`/`0`; ignored unless exactly `0` or `1`       |
| `skewmax` | slant max degrees       | number; accepted only if finite and in `[1, 30]` |
| `seed`    | shared uint32 PRNG seed | integer; accepted only if in `[0, 0xffffffff]`   |

Decode remains per-parameter lenient and never throws; unrecognized or
out-of-range values fall back to `DEFAULT_SETTINGS`.

Seed lifecycle (`main.ts`), unchanged in spirit, renamed field:

- URL has no `seed` → generate a fresh random uint32 for this session, so
  "Copy link" captures a concrete seed for later exact reproduction.
- URL has a valid `seed` → use it verbatim for exact reproduction.

## Testing

- `src/skew.test.ts` → `src/transforms.test.ts`:
  - rotation-only produces `rotate(...)` with no `skewX`
  - skew-only produces `skewX(...)` with no `rotate`
  - both produce `rotate(...) skewX(...)`
  - neither enabled: builder is not invoked by the scroller (covered in
    scroller test); when called with both off it returns empty strings
  - **positional independence**: the `rotate(...)` substring for a given index
    is identical whether skew is on or off (same seed)
  - determinism: same seed → identical output; different seed → different output
- `src/shareUrl.test.ts`: round-trip of the five params; per-param leniency
  (bad booleans, out-of-range maxes, out-of-range/non-integer seed all fall
  back to defaults).
- `src/scroller.test.ts`: update `Settings` literals to the new shape; keep the
  "same transform per index on both copies" and "untransformed when both off"
  assertions, retargeted to the new fields.
- `src/playView.test.ts`: update `Settings` literals to the new shape.
- **`tsc --noEmit` is a required gate** in the final review — Vitest and the
  Vite build do not type-check, so stale `Settings` literals in test files can
  pass tests/build while breaking the type check.

## Design decisions

1. **File rename** `skew.ts` → `transforms.ts`: the module now emits both
   rotation and slant, so the skew-specific name is misleading.
2. **Shared slider range** 1–30 for both rotation and slant, matching the
   existing skew range for consistency.
3. **One shared seed** (not per-axis): shorter URLs, simpler UI, still fully
   reproducible thanks to positional draws.

## Out of scope

- Adjusting rotation/skew during playback (they remain setup-only, like today).
- Fixed/uniform rotation of the whole display or a uniform per-barcode tilt
  (this feature is specifically about splitting the existing _random_
  distortion into two axes).
- Per-axis independent re-rolling (rejected: separate seeds add params and UI
  for no requested benefit).

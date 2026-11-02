# Step-and-dwell playback — Design

**Date:** 2026-11-02
**Status:** Design agreed in conversation across six sections on 2026-11-02; this written spec
awaits the user's review before planning. Spec 2 of a three-spec series (see _Series_).

## Intent

scandible plays a list one way today: the column scrolls, and each code is in the scanner's view
for as long as the speed and the code's height allow. Nobody can read that time off the screen,
and nobody can set it. This spec adds a second playback mode, **Step**, in which each code sits
still in the middle of the screen for a set **dwell**, optionally followed by a blank **gap**, and
then the next code appears.

- **Primary: throughput testing.** In the user's words, "B is the primary driver" (B: throughput
  testing). The tester wants the shortest dwell a scanner copes with, so the dwell must be
  accurate, adjustable live during playback as speed is today, and reported in the finish summary.
- **Secondary: operator-paced stepping.** "C is a nice to have, approaching gold plating, not
  quite YAGNI" (C: operator stepping). Prev and Next on the overlay, plus the ArrowLeft and
  ArrowRight keys. Stepping is not a separate mode: dwell auto-advance is always on while
  playing, and an operator who wants full control pauses and steps.
- **Between codes** the default is instant replacement. The gap is configurable, and "the lowest
  value on the slider is what will produce the A behavior" (A: instant replacement), so gap 0 is
  instant.

Success: a tester picks Step, sets a dwell, presses Start and sees each code held still for that
dwell to within one display frame; lowers the dwell from the overlay mid-run until the scanner
starts to miss; and at the end reads the dwell they ran at and the total time, whose ratio to the
number of codes is the time per code achieved. An operator can pause and walk the list by hand.
Scroll mode behaves exactly as before, and every scroll link encodes byte for byte as before.

## Series

The series has three specs, each with its own plan, in this order:

1. **2D formats** — merged on `main` as `c0cd905` on 2026-11-02. Its _Series_ section described
   this spec as "a playback mode in which each code sits still for a set number of seconds, then
   the column jumps to the next. Selectable for any format. Independent of symbology."
2. **This spec — step-and-dwell playback.**
3. **Structured editor** — follows. Per-entry formats and options, multi-line payloads and a
   tagged record param in the URL.

The approach chosen here supersedes two details of spec 1's forecast. There is no jumping column:
a single-item stage replaces one code with the next. And nothing is measured: spec 1 expected this
spec to measure item heights, but the stage centres its one item with CSS.

Nothing here depends on symbology. The stage shows whatever `buildItems` (see _Shared item
builder_) makes of an entry, and `buildItems` reads each entry's own `format` and `options`, the
seam spec 1 built for spec 3. A 1D list, a 2D list and spec 3's mixed lists step the same way. The
URL codec grows by spec 1's rule: parameters after `fmt` appear only when they differ from their
default, in a fixed order, so exact-URL tests of scroll links do not change.

## Decisions

- **A separate step engine with a single-item stage** (option 1 of the three considered).
  `src/lib/stepper.ts` owns one state machine, the pure schedule lives in `src/lib/stepMath.ts`,
  and the stage shows exactly one code or nothing. No height measurement, no resize listener.
- **Rejected: extending the scroller** — two state machines in one file, item measurement, and a
  blank gap inside a moving column.
- **Rejected: `scrollIntoView` or CSS scroll-snap** — the browser owns the timing; not frame-exact.
- **A shared item builder.** `buildItems` (`src/lib/items.ts`) is extracted from the scroller's
  `buildCopy`, so both engines build identical items: the same classes, and the same seed and
  index give the same rotation and skew in either mode.
- **A common `Player` interface** (`src/lib/player.ts`). `Scroller` and `Stepper` both extend it,
  so the play page drives Play/Pause and Restart the same way in both modes.
- **Stepping rides on auto-advance.** There is no manual-only mode. Prev, Next and the arrow keys
  move to a code and restart its dwell; they never change whether playback is running.
- **Loop applies to both modes**; in step mode the last code wraps to the first. **Speed stays**
  in settings and in the URL's always-emitted group, unused by step mode.
- **Step parameters travel only in step links.** `mode=step` is emitted only in step mode, and
  `dwell` and `gap` only in step mode and only when they differ from their defaults. A dwell set
  in an earlier step run must not lengthen every scroll link shared later; what the sharer was
  looking at is what travels.
- **Ranges and defaults:**
  - **Dwell 50–5000 ms, step 10, default 1000.** A 60 Hz frame is 16.7 ms (120 Hz: 8.3 ms) and a
    code is on screen for whole frames, so 50 ms is three frames at 60 Hz; below that the frame
    grid, not the setting, would decide the dwell. 5000 ms gives a slow operator or scanner room;
    longer is better served by Pause and Next. One second is a comfortable start to work down from.
  - **Gap 0–2000 ms, step 10, default 0.** Zero is instant replacement, the user's default.
    2000 ms leaves room to outlast a scanner's same-symbol timeout (see _Edge cases_); a scanner
    set longer than that should have its timeout lowered instead.
  - **10 ms steps** are finer than a 60 Hz frame, so the slider never coarsens what the display
    can show, and every value prints exactly as seconds to two decimals (`1.00 s`).
  - **Integer milliseconds in the URL**: the engine's unit, exact, with no float formatting.
- **Timing from animation-frame timestamps.** A swap takes effect in the frame whose callback made
  it, so counting time in `requestAnimationFrame` timestamps measures what the scanner sees.
  Frame deltas are clamped to `MAX_DELTA_MS` (100 ms), as the scroller does.
- **At most one transition per frame**, so every code is painted for at least one frame and no
  stall skips one. **Overflow is carried**: time past a phase's end counts toward the next phase,
  so the cadence does not drift with frame jitter.
- **The finish summary reports the set dwell, the gap when it is not zero, and the total
  seconds**; the ratio of total seconds to codes gives the achieved cadence.
- **The counter is not a live region.** At a 50 ms dwell it would announce twenty times a second.

## Settings and share URL — `src/lib/types.ts`, `src/lib/shareUrl.ts`

```ts
export type PlaybackMode = 'scroll' | 'step';

export interface Settings {
	/* existing fields unchanged */
	mode: PlaybackMode; // 'scroll' moves the column; 'step' shows one code at a time
	dwellMs: number; // step mode: ms each code stays on screen, within DWELL_RANGE
	gapMs: number; // step mode: ms of blank screen between codes, within GAP_RANGE; 0 = instant
}

export const DWELL_RANGE = { min: 50, max: 5000, step: 10 } as const;
export const GAP_RANGE = { min: 0, max: 2000, step: 10 } as const;

// DEFAULT_SETTINGS gains: mode: 'scroll', dwellMs: 1000, gapMs: 0
```

The three fields are always present, never `undefined`. `DWELL_RANGE` and `GAP_RANGE` are the
only statement of the ranges: the codec, the setup page and the play page all read them.

**Encode.** `encodeShareUrl` keeps every existing parameter, value and position. After the
existing `ecc` block it appends:

```ts
if (settings.mode === 'step') {
	params.set('mode', 'step');
	if (settings.dwellMs !== DEFAULT_SETTINGS.dwellMs) params.set('dwell', String(settings.dwellMs));
	if (settings.gapMs !== DEFAULT_SETTINGS.gapMs) params.set('gap', String(settings.gapMs));
}
```

The order after `fmt` is therefore `ecc`, `mode`, `dwell`, `gap`, each present only under its
condition. A scroll-mode link is byte-identical to today's whatever `dwellMs` and `gapMs` hold,
and the shortest step link adds only `&mode=step`. The doc comment's "(`ecc` now)" becomes
"(`ecc`, `mode`, `dwell`, `gap`)", and it adds that `dwell` and `gap` appear only in step links.

**Decode.** `decodeShareUrl` keeps per-parameter leniency and never throws. Each new parameter is
decoded on its own, independently of the others and of `mode`:

- `mode` sets `settings.mode = 'step'` only when the value is exactly `step`. Any other value,
  `scroll` included, yields no `mode` key.
- `dwell` and `gap` use the same `Number(raw)` parse as `seed`, and set `dwellMs` or `gapMs` only
  when `Number.isInteger` holds and the value lies within `DWELL_RANGE` or `GAP_RANGE`, both ends
  inclusive; otherwise there is no key and the default stands. The 10 ms step is not checked. An
  in-range default (`dwell=1000`) decodes to a key holding the default, which is harmless: unlike
  `ecc`, these settings have no canonical-form rule.
- A link with `dwell=500` and no `mode` decodes to `{ dwellMs: 500 }`: the play page scrolls, and
  a setup page opened from that link holds 500 in its Dwell slider, shown once Step is chosen.

The shortest step link (one code, every other setting at its default):

```text
#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step
```

A step link at dwell 500 and gap 250 for a QR list at level H, with the always-emitted group and
every optional parameter in the order today's code writes them:

```text
#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=qr&ecc=H&mode=step&dwell=500&gap=250
```

## Setup page — `src/routes/+page.svelte`

- **State.** `let mode = $state(initial.mode)`, `let dwellMs = $state(initial.dwellMs)` and
  `let gapMs = $state(initial.gapMs)`, initialised from the decoded URL through `initial` like
  every other field. The `$derived` `settings` object gains `mode`, `dwellMs` and `gapMs`, so
  `shareHash`, the share QR status and Start carry them with no new wiring.
- **Placement.** A **Playback** field follows Error correction (or Format, for a format with no
  Error correction field). Below it, Dwell and Gap take the place of Speed in step mode:

```svelte
<label class="field"
	>Playback
	<select class="mode-input" bind:value={mode}>
		<option value="scroll">Scroll</option>
		<option value="step">Step</option>
	</select>
</label>
{#if mode === 'step'}
	<label class="field"
		>Dwell
		<input
			type="range"
			class="dwell-input"
			min={DWELL_RANGE.min}
			max={DWELL_RANGE.max}
			step={DWELL_RANGE.step}
			bind:value={dwellMs}
		/>
		<output class="dwell-output">{formatSeconds(dwellMs)}</output>
	</label>
	<label class="field"
		>Gap
		<input
			type="range"
			class="gap-input"
			min={GAP_RANGE.min}
			max={GAP_RANGE.max}
			step={GAP_RANGE.step}
			bind:value={gapMs}
		/>
		<output class="gap-output">{formatSeconds(gapMs)}</output>
	</label>
{:else}
	<!-- today's Speed field (.speed-input, 10–5000 step 5), moved here unchanged -->
{/if}
```

- The block is rendered conditionally, not toggled with `hidden`, because `.field` sets
  `display: flex`, which defeats the UA `[hidden]` rule (spec 1's reason for the Error correction
  field). The range attributes read `DWELL_RANGE` and `GAP_RANGE` from `$lib/types` and render as
  `min="50" max="5000" step="10"` and `min="0" max="2000" step="10"`.
- **Readouts.** `.dwell-output` and `.gap-output` show `formatSeconds(ms)` from
  `src/lib/finish.ts`, which is `(ms / 1000).toFixed(2) + ' s'`: 1000 shows `1.00 s`, 250 shows
  `0.25 s`, 0 shows `0.00 s`.
- **Hidden values persist across a mode switch.** The inputs unmount; the `$state` stays. A speed
  set before switching to Step still goes into the Start URL, because `speed` is always emitted. A
  dwell set before switching back to Scroll stays in state but leaves the URL until Step is chosen
  again, because of the mode gating on encode.
- Loop, Random rotation and Random skew follow, unchanged; the Loop label stays `Loop`. No
  `$effect` writes setup state. Everything else on the page is unchanged: textarea, file input,
  Format, Error correction, validation list, ShareLink and Start.

## Shared item builder and pure schedule — `src/lib/items.ts`, `src/lib/scrollMath.ts`, `src/lib/stepMath.ts`

### `src/lib/items.ts`

```ts
/** One `div.barcode-item` per entry, in order. Callers pass only valid entries. */
export function buildItems(valid: CodeEntry[], settings: Settings): HTMLElement[];
```

The body is today's `buildCopy` loop in `src/lib/scroller.ts`, moved. For entry `i` it creates a
`div` with class `barcode-item`; adds `barcode-item--2d` and `barcode-item--<format>` when
`FORMAT_BY_ID.get(entry.format)?.engine === 'bwipjs'`; sets `style.transform` to
`buildTransforms(valid.length, { rotate, rotateMaxDeg, skew, skewMaxDeg }, seed)[i]` when
`settings.rotate || settings.skew`; and appends `renderBarcodeSvg(entry)`. It reads no other
setting and returns new elements on every call. `buildTransforms` is deterministic, so the same
seed and index give the same distortion in both engines and in both scroller copies.

### `MAX_DELTA_MS` — `src/lib/scrollMath.ts`

`export const MAX_DELTA_MS = 100;` moves, value unchanged, from `src/lib/scroller.ts` (where it is
module-private) to `src/lib/scrollMath.ts`, exported with the doc comment "Longest frame delta
either engine accepts; a longer interval between frames counts as this much." Both engines import it.

### `src/lib/stepMath.ts`

Pure: no DOM, no time source, the same contract as `scrollMath.ts`.

```ts
export type StepPhase = 'dwell' | 'gap';

export interface StepState {
	index: number; // the code shown (dwell) or just shown (gap); 0 ≤ index < count
	phase: StepPhase;
	phaseElapsedMs: number; // time spent in this phase, including carried overflow
}

export const INITIAL_STEP_STATE: StepState = { index: 0, phase: 'dwell', phaseElapsedMs: 0 };

/** Advance the schedule by one frame. deltaMs is MILLISECONDS, already clamped by the caller.
 *  At most one transition per call. Never mutates `state`. */
export function advanceStep(
	state: StepState,
	deltaMs: number,
	dwellMs: number,
	gapMs: number,
	count: number,
	loop: boolean
): { state: StepState; finished: boolean };
```

`advanceStep` semantics, complete:

1. `elapsed = state.phaseElapsedMs + deltaMs`; `len = state.phase === 'dwell' ? dwellMs : gapMs`.
2. If `elapsed < len`, return the same `index` and `phase` with `phaseElapsedMs: elapsed`.
3. Otherwise let `overflow = elapsed - len` and `isLast = state.index === count - 1`. The first of
   these that matches applies:
   - phase `dwell`, `isLast && !loop`: return `{ index, phase: 'dwell', phaseElapsedMs: len }`
     with `finished: true`. There is no trailing gap after the last code.
   - phase `dwell`, `gapMs > 0`: return `{ index, phase: 'gap', phaseElapsedMs: overflow }`.
   - phase `dwell`, `gapMs === 0`: return
     `{ index: isLast ? 0 : index + 1, phase: 'dwell', phaseElapsedMs: overflow }`.
   - phase `gap`, `isLast && !loop` (loop was turned off during the last gap): return
     `{ index, phase: 'gap', phaseElapsedMs: len }` with `finished: true`.
   - phase `gap`, otherwise: return
     `{ index: isLast ? 0 : index + 1, phase: 'dwell', phaseElapsedMs: overflow }`.
4. Every other return has `finished: false`. The overflow is carried into the new phase and never
   re-evaluated in the same call, even when it already exceeds the new phase's length; the next
   call makes that transition. `deltaMs === 0` follows the same rules, so a phase whose elapsed
   time already equals its length transitions.

Worked transitions. A state is written `(index, phase, phaseElapsedMs)`.

| #   | state in          | deltaMs | dwellMs | gapMs | count | loop | state out          | finished |
| --- | ----------------- | ------- | ------- | ----- | ----- | ---- | ------------------ | -------- |
| 1   | `(0, dwell, 0)`   | 70      | 50      | 0     | 3     | off  | `(1, dwell, 20)`   | no       |
| 2   | `(0, dwell, 0)`   | 100     | 50      | 30    | 3     | off  | `(0, gap, 50)`     | no       |
| 3   | `(0, gap, 50)`    | 16      | 50      | 30    | 3     | off  | `(1, dwell, 36)`   | no       |
| 4   | `(1, dwell, 10)`  | 16      | 50      | 0     | 3     | off  | `(1, dwell, 26)`   | no       |
| 5   | `(2, dwell, 40)`  | 16      | 50      | 30    | 3     | off  | `(2, dwell, 50)`   | yes      |
| 6   | `(2, dwell, 40)`  | 16      | 50      | 0     | 3     | on   | `(0, dwell, 6)`    | no       |
| 7   | `(2, gap, 20)`    | 16      | 50      | 30    | 3     | off  | `(2, gap, 30)`     | yes      |
| 8   | `(0, dwell, 990)` | 16      | 1000    | 0     | 1     | off  | `(0, dwell, 1000)` | yes      |
| 9   | `(0, dwell, 990)` | 16      | 1000    | 0     | 1     | on   | `(0, dwell, 6)`    | no       |
| 10  | `(0, dwell, 990)` | 16      | 1000    | 250   | 1     | on   | `(0, gap, 6)`      | no       |

Row 1 carries 20 ms into the next code. Row 2 enters the gap carrying 50 ms, more than the 30 ms
gap, and still makes one transition, not two; row 3 is the next call. Row 5 finishes with no
trailing gap although the gap is 30. Row 6 wraps. Rows 8 to 10 are a single code: with loop off
the run finishes after the first dwell; with loop on it cycles dwell, the gap if any, index 0.

While dwell and gap are unchanged, every phase lasts at least one frame and no delta is clamped,
each phase starts on the first frame at or after the sum of all earlier phase lengths in playing
time, so the cadence never drifts, and each code is on screen for whole frames within one frame of
`dwellMs`.

## Step engine and stage — `src/lib/player.ts`, `src/lib/stepper.ts`, `src/lib/components/StepStage.svelte`

### `Player` and the scroller refactor

```ts
// src/lib/player.ts
export interface Player {
	play(): void;
	pause(): void;
	toggle(): void;
	restart(): void;
	isPlaying(): boolean;
	destroy(): void;
}

// src/lib/scroller.ts: the same members as today, now declared through Player
export interface Scroller extends Player {
	setSpeed(pxPerSec: number): void;
	setLoop(loop: boolean): void;
}
```

The scroller refactor is three edits: `buildCopy` appends the items returned by
`buildItems(valid, settings)` to its `.scroller-copy`, once per copy as today's loop runs;
`MAX_DELTA_MS` is imported from `./scrollMath`; and `Scroller` is declared as above. The
`transforms` constant and the `renderBarcodeSvg`, `FORMAT_BY_ID` and `buildTransforms` imports move
to `src/lib/items.ts`. Nothing else changes: not `createScroller`'s signature, measurement, resize
handling, the loop seam, the frame loop or `onFinish`, nor `ScrollColumn.svelte` and its
`ScrollColumnHandle`. The existing scroller tests pass with their assertions unchanged (see
_Testing_ for the one type-level edit).

### `src/lib/stepper.ts`

```ts
export interface Stepper extends Player {
	setDwell(ms: number): void;
	setGap(ms: number): void;
	setLoop(loop: boolean): void;
	next(): void;
	prev(): void;
	index(): number;
}

export function createStepper(
	container: HTMLElement,
	entries: CodeEntry[],
	settings: Settings,
	onFinish?: (summary: { count: number; seconds: number }) => void,
	onIndex?: (index: number, count: number) => void
): Stepper;
```

**Construction and stage.** `valid = entries.filter((e) => e.valid)`, `count = valid.length` (at
least 1; the play page guarantees it) and `items = buildItems(valid, settings)`, built once and
re-appended on every visit, never re-rendered. `container.innerHTML = ''`, then a `div.step-stage`
is appended: `container > div.step-stage >` at most one `div.barcode-item > svg`. Live values
start from settings (`dwell = settings.dwellMs`, `gap = settings.gapMs`, `loop = settings.loop`),
with `state = INITIAL_STEP_STATE`, `elapsedMs = 0`, `playing = false` and `finished = false`. A
`show()` helper calls `stage.replaceChildren(items[state.index])` in a dwell phase and
`stage.replaceChildren()` in a gap phase, so the stage holds exactly one item or nothing.
Construction calls `show()` and `onIndex(0, count)` and leaves the stepper paused, like the
scroller.

**Frame loop.** It mirrors `createScroller`'s `frame`:

```ts
const frame = (ts: number) => {
	if (!playing) return;
	let deltaMs = lastTs === null ? 0 : ts - lastTs;
	lastTs = ts;
	if (deltaMs > MAX_DELTA_MS) deltaMs = MAX_DELTA_MS;
	if (deltaMs > 0) {
		elapsedMs += deltaMs;
		const before = state;
		const result = advanceStep(before, deltaMs, dwell, gap, count, loop);
		state = result.state;
		if (result.finished) {
			finish(); // stop(); finished = true; onFinish?.({ count, seconds })
			return;
		}
		if (state.index !== before.index || state.phase !== before.phase) show();
		if (state.index !== before.index) onIndex?.(state.index, count);
	}
	rafId = requestAnimationFrame(frame);
};
```

**Methods.**

- `play()` is `start`, which returns at once when playing or finished and otherwise sets
  `playing = true` and `lastTs = null` (so paused time is excluded) and requests a frame.
  `pause()` is `stop`, as in the scroller: `playing = false` and cancel the pending frame.
  `toggle()` calls whichever applies, `isPlaying()` returns `playing`, `index()` returns
  `state.index`, and `setLoop(loop)` updates the flag.
- `setDwell(ms)` sets `dwell = ms`, effective from the current phase; if the current phase is a dwell
  already past `ms`, it also lowers `phaseElapsedMs` to `ms`, so the next frame transitions
  carrying only that frame's delta (else lowering a 5 s dwell to 50 ms late in a code would flash
  the following codes for one frame each). `setGap(ms)` does the same for `gap` and a gap phase.
- `next()`: on the last code with loop on, go to index 0; with loop off, finish the run (`stop`,
  then `onFinish`); otherwise go to `index + 1`. `prev()`: on index 0 with loop on, go to
  `count - 1`; with loop off, go to index 0 again; otherwise go to `index - 1`.
- "Go to `i`" sets `state = { index: i, phase: 'dwell', phaseElapsedMs: 0 }`, calls `show()`
  synchronously and calls `onIndex(i, count)`. `next()` and `prev()` never change the playing
  state: paused stays paused, playing keeps playing.
- `restart()` sets `state = INITIAL_STEP_STATE`, `elapsedMs = 0` and `finished = false`, calls
  `show()` and `onIndex(0, count)`, then `stop()` and `start()`. It keeps the live dwell, gap and
  loop. `destroy()` calls `stop()`; there is no listener to remove and nothing is measured.

**Contracts.**

- `onIndex(index, count)` fires at construction, on every index change in the frame loop, on
  every go-to from `next()` or `prev()` (a finishing `next()` fires `onFinish` instead), and on
  `restart()`. Entering or leaving a gap does not fire it unless the index changes.
- `onFinish({ count, seconds })` fires at most once per run. A run starts at construction or
  `restart()` and finishes when the last dwell ends with loop off, or on `next()` at the last code
  with loop off. `count` is the number of valid entries; `seconds` is
  `Math.round((elapsedMs / 1000) * 10) / 10`, where `elapsedMs` sums the clamped frame deltas
  while playing, gaps included. Once finished, the stage keeps the last code, and `play()`,
  `next()` and `prev()` do nothing until `restart()`.

### `src/lib/components/StepStage.svelte`

```svelte
<script lang="ts" module>
	export interface StepStageHandle {
		toggle(): void;
		restart(): void;
		setDwell(ms: number): void;
		setGap(ms: number): void;
		next(): void;
		prev(): void;
		isPlaying(): boolean;
	}
</script>
```

- **Props:** `entries: CodeEntry[]`, `settings: Settings`, and optional `onFinish` and `onIndex`
  typed exactly as `createStepper`'s parameters.
- `onMount` calls `createStepper(container, entries, settings, onFinish, onIndex)`, then `play()`,
  and returns a cleanup that calls `destroy()`. Each handle method forwards to the stepper, and
  `isPlaying()` returns `false` before mount, as in `ScrollColumn`. Like `ScrollColumn`, the
  component snapshots entries and settings at mount.
- **Markup:** `<div class="step-stage-host" bind:this={container}></div>`.
- **CSS.** The stepper builds its DOM imperatively, so every descendant selector is `:global`. The
  SVG caps are duplicated from `ScrollColumn.svelte`:

```css
.step-stage-host {
	position: absolute;
	inset: 0;
}
.step-stage-host :global(.step-stage) {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}
.step-stage-host :global(.barcode-item) {
	padding: 0; /* no scroll rhythm: the stage centres its one item */
}
.step-stage-host :global(.barcode-item svg) {
	max-width: min(90vw, 640px);
	height: auto;
}
.step-stage-host :global(.barcode-item--2d svg) {
	max-width: min(90vw, 640px);
	max-height: 60vh;
	width: auto;
	height: auto;
}
.step-stage-host :global(.barcode-item--pdf417 svg) {
	max-width: min(95vw, 960px);
}
```

## Play page — `src/routes/play/+page.svelte`

**Engine choice.** `settings` is decoded once, so the mode is fixed for the page's life.
`{#if settings.mode === 'step'}` mounts `<StepStage bind:this={step} {entries} {settings}>` with
`onFinish={(s) => (finish = s)}` and `onIndex={(index, count) => (position = { index, count })}`;
`{:else}` mounts today's `<ScrollColumn>` with `bind:this={scroll}` and the same `onFinish`.

**Handles.** `let column` is renamed `let scroll: ScrollColumnHandle | undefined = $state();`,
beside `let step: StepStageHandle | undefined = $state();`. Only one is ever bound, and
`function player(): Pick<Player, 'toggle' | 'restart' | 'isPlaying'> | undefined` returns
`scroll ?? step`. `toggle()` and `restart()` call `player()` where they call `column` today;
Speed's `oninput` calls `scroll?.setSpeed(speed)`.

**Live state.** `const count = entries.filter((e) => e.valid).length;` beside `hasValid`, then
`let dwell = $state(settings.dwellMs)`, `let gap = $state(settings.gapMs)` and
`let position = $state({ index: 0, count })`. During a gap the counter keeps the number of the
code just shown.

**Overlay**, in this order (scroll mode's overlay is today's; step mode renders no Speed slider):

```svelte
<div class="overlay" class:hidden={!overlayVisible}>
	<button type="button" class="ctl-playpause" onclick={toggle}>{playing ? 'Pause' : 'Play'}</button>
	{#if settings.mode === 'step'}
		<button type="button" class="ctl-prev" onclick={() => step?.prev()}>Prev</button>
		<span class="ctl-counter">{position.index + 1} / {position.count}</span>
		<button type="button" class="ctl-next" onclick={() => step?.next()}>Next</button>
		<input
			type="range"
			class="ctl-dwell"
			min={DWELL_RANGE.min}
			max={DWELL_RANGE.max}
			step={DWELL_RANGE.step}
			aria-label="Dwell"
			bind:value={dwell}
			oninput={() => step?.setDwell(dwell)}
		/>
		<output class="ctl-dwell-output">{formatSeconds(dwell)}</output>
		<input
			type="range"
			class="ctl-gap"
			min={GAP_RANGE.min}
			max={GAP_RANGE.max}
			step={GAP_RANGE.step}
			aria-label="Gap"
			bind:value={gap}
			oninput={() => step?.setGap(gap)}
		/>
		<output class="ctl-gap-output">{formatSeconds(gap)}</output>
	{:else}
		<!-- today's .ctl-speed slider, with oninput calling scroll?.setSpeed(speed) -->
	{/if}
	<button type="button" class="ctl-restart" onclick={restart}>Restart</button>
	<button type="button" class="ctl-back" onclick={back}>Back</button>
</div>
```

The counter's text is `${index + 1} / ${count}`, for example `1 / 20`. `.overlay` gains
`flex-wrap: wrap; justify-content: center; width: max-content; max-width: calc(100vw - 32px);`.
Today's `left: 50%` leaves a shrink-to-fit box only half the viewport to grow into, so without
`width: max-content` the step overlay would wrap into a narrow stack on every screen; with it the
overlay is as wide as its controls up to a 16 px margin each side, and wraps only when it must.

**Keyboard.** `<svelte:window>` gains `onkeydown={onKey}` beside its pointer handlers. `onKey`
returns at once unless `settings.mode === 'step'`, so scroll mode is untouched. In step mode it
calls `showOverlay()` for any key; then it returns if `event.target` is an `HTMLInputElement`,
`HTMLSelectElement` or `HTMLTextAreaElement`, so arrows on a focused slider move the slider;
otherwise `ArrowRight` calls `step?.next()` and `ArrowLeft` calls `step?.prev()`. It does not call
`preventDefault`: `.play` is fixed with `overflow: hidden`, so arrows scroll nothing.

**Finish.** `src/lib/finish.ts` gains `formatSeconds` (see _Setup page_) and:

```ts
/** Step-mode finish copy. The gap clause appears only when the gap is not zero. */
export function formatStepFinishMessage(
	count: number,
	seconds: number,
	dwellMs: number,
	gapMs: number
): string {
	return (
		`Finished stepping ${count} barcodes in ${seconds} seconds at ${formatSeconds(dwellMs)} dwell` +
		(gapMs > 0 ? `, ${formatSeconds(gapMs)} gap` : '')
	);
}
```

`formatStepFinishMessage(20, 20.3, 1000, 250)` returns
`Finished stepping 20 barcodes in 20.3 seconds at 1.00 s dwell, 0.25 s gap`; with gap 0 the clause
after `dwell` is absent. In step mode `.finish-text` shows
`formatStepFinishMessage(finish.count, finish.seconds, dwell, gap)`, passing the live dwell and gap
at finish time; scroll mode keeps `formatFinishMessage(finish.count, finish.seconds)`.

**Back.** `currentSettings()` returns `{ ...settings, speedPxPerSec: speed, dwellMs: dwell, gapMs: gap }`;
`back()` encodes `encodeShareUrl(decoded.codes, currentSettings())` as today, and its comment
becomes "The decoded share state plus the live speed, dwell and gap, never the parsed entries." In
scroll mode the codec drops dwell and gap, so scroll Back URLs are unchanged.

**Unchanged:** decode once, the bounce to setup when no code is valid, the `hashchange` reload,
the overlay auto-hide after `OVERLAY_IDLE_MS` (3 s), and the finish screen's `.finish-restart` and
`.finish-back` buttons.

## Edge cases

- **One code, loop on.** With gap 0 the stage never visibly changes: every cycle returns to index
  0 with no swap. The scanner reads the code once, because its same-symbol timeout suppresses
  re-reads of a symbol that never leaves view. The README says so.
- **Identical consecutive payloads.** A symbol replaced by one with the same payload looks to the
  scanner like the same symbol, so it may swallow the second read. A gap at least as long as the
  scanner's same-symbol timeout makes the symbol leave view first. The README says so beside the
  gap description.
- **A phase shorter than a frame.** One transition per frame means every phase lasts at least one
  frame, so the achieved dwell is at least one frame whatever the setting; a 10 ms gap lasts one
  frame and its excess is carried into the next dwell. The summary reports the set dwell and the
  total seconds, so their ratio shows the cadence achieved.
- **Dropped frames and background tabs.** A long frame counts as at most `MAX_DELTA_MS` (100 ms).
  Browsers stop animation frames in a hidden tab, so playback pauses there; on return the first
  frame counts at most 100 ms and the same phase resumes, unless it was within 100 ms of its end.
  A stall never skips a code.
- **Live edits.** Lowering the dwell or gap below the time already spent in the current phase ends
  it on the next frame, carrying only that frame's delta (see `setDwell`); raising it extends it.
- **Bounds.** With loop on, `next()` and `prev()` wrap; with loop off, `next()` on the last code
  finishes and `prev()` on the first stays. One code follows rows 8 to 10 of the worked table; an
  empty list never reaches the engine.
- **Resize and orientation.** Nothing to do: the stage centres with CSS, nothing is measured, and
  the SVG caps are relative to the viewport.
- **Distortion clipping.** Spec 1's recorded limitation applies unchanged: on viewports narrower
  than about 560 px with rotation or skew near 30°, the corners of a 2D symbol can leave the
  viewport. Recorded, not mitigated.
- **Scroll mode must not move.** The existing scroller tests, assertions unchanged, are the
  regression guard, together with the byte-identical scroll link.
- **Accessibility.** The counter is a plain `span`, not a live region: at 50 ms swaps it would be
  noise. Prev and Next are labelled by their text, the overlay sliders by `aria-label`, and the
  setup sliders by their `<label>`.

## Testing

Each file is named by its path; "new" files do not exist today.

- **`src/lib/stepMath.test.ts`** (new):
  - `INITIAL_STEP_STATE` equals `{ index: 0, phase: 'dwell', phaseElapsedMs: 0 }`; every row of
    the worked table, exact; a frozen input state is not mutated.
  - Cadence with gap 0: from `INITIAL_STEP_STATE`, count 10, loop on, dwell 100, sixty calls with
    `deltaMs` 16; the k-th index change comes on the first call `n` with `16 × n ≥ 100 × k`, for k
    from 1 to 9 (no drift). Overflow carry: rows 1 to 3.
  - The gap phase appears only when `gapMs > 0`: a dwell's end goes to the next index at gap 0 and
    to the same index's gap at gap 10.
  - At most one transition per call: at `deltaMs` 1000 (the function does not clamp) a dwell goes
    only to its gap and a gap only to the next dwell; for each delta of 0, 1, 16, 50, 100 and
    1000 ms the index moves at most one step modulo `count`; `deltaMs` 0 at exactly the phase
    length transitions.
  - Finish after the last dwell with no trailing gap (row 5) and from the last gap (row 7), loop
    off; wrap with loop on (row 6); one code with both loop states (rows 8 to 10).
- **`src/lib/items.test.ts`** (new). The item-level cases live today in `src/lib/scroller.test.ts`
  (its 2D-class test and its three distortion tests). They are re-expressed against `buildItems`;
  the originals stay, because the scroller tests must pass unchanged:
  - One item per entry, in order, each a `.barcode-item` holding one `svg`.
  - Every item from `parseCodeList('hello world', 'qr')` with `DEFAULT_SETTINGS` (list format
    `upc`) has `barcode-item--2d` and `barcode-item--qr`; `upc` items have neither.
  - `style.transform` is `''` with both distortions off and matches `/^rotate\(/` with only
    rotation on; with skew on at seed 5, item `i`'s transform equals
    `buildTransforms(count, opts, 5)[i]`, and two calls give identical transforms per index.
- **`src/lib/stepper.test.ts`** (new). A fake `requestAnimationFrame` stores the callback and
  returns an increasing id and `cancelAnimationFrame` is a spy, both restored after each test (the
  stubbing pattern of `scroller.test.ts`'s first-frame test); `tick(ts)` runs the stored callback.
  Entries are `scroller.test.ts`'s two valid and one invalid `upc` entries, so count is 2.
  - At construction the container's only child is `.step-stage`, holding exactly one
    `.barcode-item` (item 0); `onIndex` was called once with `(0, 2)`; `isPlaying()` is false.
  - Dwell 50, gap 0: once time reaches 50 the stage holds item 1 (another element), still one
    child, and `onIndex(1, 2)` fired. Gap 30: after the dwell the stage is empty and `onIndex` did
    not fire; after the gap it holds item 1 and `onIndex(1, 2)` fired, once.
  - Loop off: `next()` from 0 shows item 1; `next()` on item 1 calls `onFinish` once and leaves
    `isPlaying()` false; `prev()` on item 0 stays there and calls `onIndex(0, 2)`. After
    `setLoop(true)`, `next()` on item 1 shows item 0 and `prev()` on item 0 shows item 1. Neither
    changes the playing state, paused or playing.
  - Finish once: loop off, dwell 50, frames past the last dwell call `onFinish` once with count 2
    and the rounded seconds; further ticks, `play()`, `next()` and `prev()` change nothing;
    `restart()` calls `onIndex(0, 2)` and the second run finishes again.
  - `setDwell` raised mid-dwell defers the swap; lowered below the time spent, the swap comes on
    the next frame and the following code holds for the new dwell less at most that frame's
    delta; `setGap(0)` mid-gap shows the next code on the next frame.
  - Seconds count only clamped deltas while playing: a 1000 ms jump counts as 100, a paused
    interval as nothing. `pause()` mid-dwell cancels the pending frame and leaves the stage
    untouched; `play()` resumes the same phase. `destroy()` cancels the pending frame, and nothing
    fires afterwards.
- **`src/lib/components/StepStage.test.ts`** (new): with the same entries and
  `{ ...DEFAULT_SETTINGS, mode: 'step' }`, `.step-stage-host > .step-stage` holds one
  `.barcode-item` and `isPlaying()` is true; `toggle()` flips it; `next()` calls the `onIndex`
  prop with `(1, 2)`; `prev()`, `restart()`, `setDwell()` and `setGap()` run; unmounting cancels
  the pending frame.
- **`src/lib/finish.test.ts`** (extended): `formatSeconds` gives `1.00 s`, `0.25 s`, `0.05 s`,
  `0.00 s` and `5.00 s` for 1000, 250, 50, 0 and 5000; `formatStepFinishMessage` returns the
  example above for `(20, 20.3, 1000, 250)` and
  `Finished stepping 3 barcodes in 3 seconds at 1.00 s dwell` for `(3, 3, 1000, 0)`.
- **`src/lib/shareUrl.test.ts`** (extended): step mode with dwell 500 and gap 250 round-trips;
  both example URLs above encode exactly, the second fixing the order after `ecc`; the existing
  fragment-order test stays, and `{ ...DEFAULT_SETTINGS, dwellMs: 500, gapMs: 250 }` (scroll
  mode) encodes to exactly `#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc`;
  `mode=Step`, `mode=scroll` and `mode=1` give no `mode` key; `dwell=49`, `dwell=5001`,
  `dwell=500.5` and `dwell=abc` give no `dwellMs`; `gap=-10`, `gap=2001` and `gap=1.5` give no
  `gapMs`; `dwell=50`, `dwell=5000`, `gap=0` and `gap=2000` decode; `#codes=1&dwell=500` decodes
  to `{ dwellMs: 500 }` with no `mode` key.
- **`src/lib/types.test.ts`** (extended): `DEFAULT_SETTINGS` has `mode` `'scroll'`, `dwellMs`
  1000 and `gapMs` 0; `DWELL_RANGE` equals `{ min: 50, max: 5000, step: 10 }` and `GAP_RANGE`
  equals `{ min: 0, max: 2000, step: 10 }`; each default lies within its range on a step boundary.
- **`src/routes/page.test.ts`** (setup, extended):
  - `.mode-input` has options `Scroll` and `Step` (values `scroll`, `step`) and shows `scroll` by
    default; for `qr`, `.ecc-input` precedes it and `.speed-input` follows it in document order.
  - Choosing Step replaces `.speed-input` with `.dwell-input` and `.gap-input`, whose readouts
    read `1.00 s` and `0.00 s`; input 500 on the dwell slider makes `.dwell-output` read `0.50 s`.
  - Hidden values persist: dwell 500, then Scroll, then Step shows 500; speed 120, then Step, then
    Scroll shows 120.
  - Start with Step, dwell 500 and gap 250 navigates to exactly
    `/play#codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step&dwell=500&gap=250`;
    Step at the defaults ends `&fmt=upc&mode=step`; a URL with `mode=step&dwell=500` prefills the
    select and the slider. The existing exact Start URL test stays as it is.
- **`src/routes/play/page.test.ts`** (extended). Step URLs append `&mode=step` to `PLAY_URL`:
  - Step mode mounts `.step-stage` holding one `.barcode-item`, with no `.scroller-track` and no
    `.ctl-speed`; `.ctl-counter` reads `1 / 2`, `.ctl-next` makes it `2 / 2`, `.ctl-prev` `1 / 2`.
  - With `dwell=500&gap=250`: `.ctl-dwell` has value `500` and `aria-label="Dwell"`,
    `.ctl-dwell-output` reads `0.50 s`, `.ctl-gap` has value `250` and `aria-label="Gap"`, and
    `.ctl-gap-output` reads `0.25 s`.
  - `keydown` `ArrowRight` on `window` makes the counter `2 / 2` and `ArrowLeft` `1 / 2`; the same
    key fired on `.ctl-dwell` leaves the counter alone.
  - With `requestAnimationFrame` stubbed never to fire and `dwell=500&gap=250`, two clicks on
    `.ctl-next` show `.finish-text` reading exactly
    `Finished stepping 2 barcodes in 0 seconds at 0.50 s dwell, 0.25 s gap`; after an input of 300
    on `.ctl-dwell` before finishing, it contains `at 0.30 s dwell`.
  - Inputs of 300 on `.ctl-dwell` and 100 on `.ctl-gap`, then `.ctl-back`, navigate to
    `'/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, seed: 7, mode: 'step', dwellMs: 300, gapMs: 100 })`.
    Every existing scroll-mode test stays as it is.
- **Unchanged:** `src/lib/scroller.test.ts` assertions, `src/lib/scrollMath.test.ts` and
  `src/lib/components/ScrollColumn.test.ts`.
- **Type-level edit, no assertion change.** `npm test` runs `svelte-check` over test files and
  `Settings` gains required fields, so the inline `Settings` literals gain
  `mode: 'scroll', dwellMs: 1000, gapMs: 0`: the eight in `src/lib/scroller.test.ts` (those ending
  `ecc: ''` on lines 36, 54, 75, 125, 150, 171, 188 and 206) and the two in
  `src/lib/shareUrl.test.ts` (lines 18 and 60). The expected decoded settings in
  `shareUrl.test.ts` gain nothing, because scroll links carry none of the three.
- **Not tested here** (the verification rows cover them): the stage and overlay CSS, real frame
  timing, and scanner behaviour.

## Documentation

- **README, new `### Playback modes` subsection** under _Using it_, before _Scanning 2D symbols_.
  It covers Scroll and Step, dwell and gap in seconds, stepping from the overlay, the same-symbol
  timeout, and when to use the gap:

```markdown
### Playback modes

The **Playback** select chooses how codes reach the scanner. **Scroll** moves the column past the
screen at the set speed. **Step** shows one code at a time, still and centered, for the **Dwell**
time, then replaces it with the next. **Gap** blanks the screen between codes; at 0.00 s the next
code appears instantly. Both are set in seconds, before Start or live from the overlay, where
**Prev** and **Next** (or the ← and → keys) also step by hand. To find the fastest rate your
scanner keeps up with, lower the dwell until it starts missing codes; the finish summary reports
the dwell you ran at. Most scanners ignore a code read again within a short timeout, so if
neighboring codes are identical, set a gap longer than that timeout. For the same reason a single
code with loop on and no gap is read only once.
```

- **README, _Shareable links_ bullet.** The README has no separate sharing section; this bullet
  is where links are described. It gains: "Step links add `mode=step`, plus `dwell` and `gap` in
  milliseconds when they differ from 1000 and 0."
- **Stale comments:** the `encodeShareUrl` doc comment and the play page's `back()` comment, both
  as given above.
- This spec, and its plan at `docs/superpowers/plans/2026-11-02-step-and-dwell-playback.md`.

## Verification that fails closed

Every row starts **UNVERIFIED** and passes only when its pass rule is met and recorded. A skipped
row, a check that dies, a run that returns nothing, or a scan recorded without the device model,
firmware and read mode stays UNVERIFIED, never a pass; the plan reports the unverified rows as
they stand. "Read" for a scan means the scanner outputs exactly the payload, once.

1. **Automated checks.** With Node 24 active (`.nvmrc`), in the project checkout: `npm run check`,
   `npm test`, `npm run lint` and `npm run build`. Pass: all four exit 0, with the Vitest test
   count recorded.
2. **Full run at 1 s dwell with the target imager.** At least 20 distinct codes, Step, dwell
   `1.00 s`, gap `0.00 s`, loop off, rotation and skew off. Pass: every code is read once, in list
   order, with no miss and no double, and the finish screen reads
   `Finished stepping N barcodes in X seconds at 1.00 s dwell` with X within 0.1 of N.
3. **Shortest reliable dwell.** The same list, lowering the dwell between runs until a run misses
   a code. Pass: the shortest dwell at which a complete run reads every code is recorded with the
   next lower value tried, and a second complete run at the recorded dwell also reads every code.
4. **Duplicate payloads.** One payload three times in a row between two other codes, run at gap
   `0.00 s` and again with a gap above the scanner's same-symbol timeout (the timeout setting is
   recorded). Pass: the gap-0 read count is recorded, whatever it is, and with the longer gap all
   three copies are read once each.
5. **Phone camera run.** A phone camera scanner app reads a Step run of a 2D list at dwell
   `1.00 s` off a desktop screen. Pass: every code is read once; the app, its version and the phone
   model are recorded.
6. **Browsers.** In Chromium and in Firefox: a tall 2D symbol (a QR with a long payload) and a
   PDF417 sit centred horizontally and vertically with aspect and quiet zone intact; at a 390 px
   wide viewport the step overlay stays within the viewport with a 16 px margin each side, wraps
   onto a second row at most, and every control is operable; on a desktop viewport it sits on one
   row;
   ArrowRight and ArrowLeft step the code and the counter, and with the Dwell slider focused they
   move the slider instead; with three codes at dwell `5.00 s`, loop off, hiding the tab for 10 s
   mid-dwell and returning shows the same code, and the summary's seconds are within 0.1 of 15
   (the hidden time is not counted). Pass: all four checks in both browsers.
7. **Achieved versus set dwell.** One loop-off run of 20 codes at dwell `0.50 s` and gap `0.25 s`.
   Headless Firefox if frames can be timed there: a `MutationObserver` on `.step-stage` records
   `performance.now()` at every child change. Otherwise by hand: a 60 fps screen recording,
   counting frames per code and per gap. Pass: every code's on-screen time is within one frame
   (17 ms at 60 Hz) of 500 ms, every gap within one frame of 250 ms, and the summary's seconds
   within 0.1 of 14.75 (20 × 0.50 + 19 × 0.25).

## Out of scope

Per-code dwell overrides. A manual-only mode without auto-advance. Audio cues. Scanner-feedback
integration. URL compression. Spec 3's items: the structured editor, per-entry formats and
options, multi-line payloads and the tagged record param.

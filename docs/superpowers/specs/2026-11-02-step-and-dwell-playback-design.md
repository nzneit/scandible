# Step-and-dwell playback — Design

**Date:** 2026-11-02
**Status:** Design agreed in conversation across six sections on 2026-11-02 and revised the same
day after a four-lens review (timing, codebase fit, UX, coherence); awaits the user's review
before planning. Spec 2 of a three-spec series (see _Series_).

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

Success, workflow 1 (sweep): the tester picks Step, turns Loop on, presses Play when the scanner
is ready and lowers the dwell from the overlay until the scanner starts to miss; the code number,
dwell and gap are always on screen in a corner readout, so the dwell at which the misses began is
read off directly. Workflow 2 (confirmation): the tester runs the list once with Loop off at a
fixed dwell, and the finish summary is the record: the dwell and gap (flagged if they were
changed during the run), the time on the playback clock, the display's frame rate and the number
of frames over 100 ms, if any. Each code is on screen for at least its dwell and less than one
frame longer when no frame exceeds 100 ms. An operator can pause and walk the list by hand.
Scroll playback and scroll links behave exactly as before; the overlay's only change is that it
no longer hides while paused or keyboard-focused.

## Series

The series has three specs, each with its own plan, in this order:

1. **2D formats** — merged on `main` as `c0cd905` on 2026-11-02. Its _Series_ section described
   this spec as "a playback mode in which each code sits still for a set number of seconds, then
   the column jumps to the next. Selectable for any format. Independent of symbology; nothing in
   this spec depends on it."
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
- **A common `Player` interface** (`src/lib/player.ts`) types the subset the play page drives in
  both modes; `Scroller` and `Stepper` extend it.
- **Stepping rides on auto-advance.** There is no manual-only mode. Prev, Next and the arrow keys
  move to a code and restart its dwell; they never change whether playback is running, except
  that Next on the last code with loop off finishes the run.
- **A step run opens paused on code 1**, with the overlay visible, so the tester can pick up and
  aim the scanner first; Play or Space starts it. Restart keeps the playing state it finds.
  Scroll mode starts playing, as today.
- **A corner readout that never hides.** In step mode a small line in the top-left corner shows
  the code number, dwell and gap, so a miss can be tied to a code and a dwell while the tester
  watches the scanner. In both modes the overlay no longer hides while playback is paused or
  while one of its controls has keyboard focus (`:focus-visible`); a mouse click on a button does
  not hold it open.
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
    2000 ms leaves room to outlast a scanner's reread delay (see _Edge cases_); a scanner set
    longer than that should have its delay lowered instead.
  - **10 ms steps** are finer than a 60 Hz frame, so the slider never coarsens what the display
    can show, and every value prints exactly as seconds to two decimals (`1.00 s`). The slider is
    linear, so on a phone the 50–300 ms region is a few pixels wide; the seconds field beside
    each slider is the fine control: type `0.4` and the value snaps to the 10 ms grid and the
    range.
  - **Integer milliseconds in the URL**: the engine's unit, exact, with no float formatting.
- **Timing from animation-frame timestamps.** A swap takes effect in the frame whose callback made
  it, so counting time in `requestAnimationFrame` timestamps counts the frames the browser
  painted, the closest the page can get to what the display shows. Whether the panel showed every
  frame cannot be decided from the page: verification row 7 checks the schedule only, and a
  display check stays UNVERIFIED without a 240 fps or faster capture or a photodiode.
  Frame deltas are clamped to `MAX_DELTA_MS` (100 ms), as the scroller does.
- **A phase ends on the first frame at or after its length; the remainder is discarded.** Every
  code is shown for at least its dwell and never a frame less, and a stall lengthens only the
  code already on screen. The cost is that a dwell runs as a whole number of frames, rounded up,
  which the summary and the README say plainly. **Rejected: carrying the overflow into the next
  phase.** It keeps the long-run cadence on the nominal schedule, but one clamped stall starves
  the following codes: at a 50 ms dwell a single 100 ms frame left the next two codes on screen
  for 17 ms each (confirmed in review by simulation).
- **The finish summary is a record, not a measurement of the scanner.** It reports the playback
  clock to two decimals (clamped frame deltas while playing: a frame over 100 ms counts as 100 ms,
  and paused or hidden-tab time is not counted beyond that clamp), the display's mean frame rate,
  the number of frames over 100 ms when there were any, and the dwell and gap, as `first → last`
  when they changed during the run. Nothing in it claims a cadence the display did not deliver: the
  expected clock time is codes × dwell + (codes − 1) × gap, rounded up to whole frames per phase,
  and a run with any frame over 100 ms is suspect.
- **A duplicate-neighbour hint on the setup page.** In step mode, when the gap is under 1.00 s
  and neighbouring valid codes (or, with loop on, the last and the first) have identical values,
  a hint under Gap names them. The 1 s threshold is a heuristic: typical reread delays are
  0.5–2 s.
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
  when `Number.isInteger` holds, the value lies within `DWELL_RANGE` or `GAP_RANGE`, both ends
  inclusive, and it lies on the 10 ms grid (`(v - range.min) % range.step === 0`), so every
  value in state prints exactly to two decimals. Otherwise there is no key and the default
  stands: `dwell=55` and `gap=15` give no key. As `seed=` decodes to 0, `gap=` (an empty string)
  decodes to `gapMs: 0` and is accepted; `dwell=` gives 0, which is out of range. An in-range
  default (`dwell=1000`) decodes to a key holding the default, which is harmless: unlike `ecc`,
  these settings have no canonical-form rule.
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
  Error correction field). Below it, Dwell and Gap take the place of Speed in step mode. Each
  slider has an editable seconds field beside it, and a note can follow each field:

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
			aria-valuetext={formatSeconds(dwellMs)}
			bind:value={dwellMs}
		/>
		<span class="seconds">
			<input
				type="number"
				class="dwell-seconds"
				inputmode="decimal"
				min={DWELL_RANGE.min / 1000}
				max={DWELL_RANGE.max / 1000}
				step="0.01"
				aria-label="Dwell in seconds"
				value={(dwellMs / 1000).toFixed(2)}
				onchange={onDwellSeconds}
			/>
			s
		</span>
	</label>
	{#if dwellMs < 330}
		<p class="flash-note">
			Dwells under 0.33 s flash the screen more than three times a second. Do not use them near
			anyone sensitive to flashing lights.
		</p>
	{/if}
	<!-- Gap: the same field with .gap-input, .gap-seconds, GAP_RANGE, gapMs, onGapSeconds and the
	     labels "Gap" and "Gap in seconds" -->
	{#if gapMs < 1000 && dupPairs.length > 0}
		<p class="dup-hint">{dupHint}</p>
	{/if}
{:else}
	<!-- today's Speed field (.speed-input, 10–5000 step 5) -->
{/if}
```

- The block is rendered conditionally, not toggled with `hidden`, because `.field` sets
  `display: flex`, which defeats the UA `[hidden]` rule (spec 1's reason for the Error correction
  field). The range attributes read `DWELL_RANGE` and `GAP_RANGE` from `$lib/types` and render as
  `min="50" max="5000" step="10"` and `min="0" max="2000" step="10"`. Today's Speed field stays
  where it is, now inside the `{:else}`.
- **Seconds fields** (`src/lib/seconds.ts`). `.dwell-seconds` and `.gap-seconds` are
  `<input type="number">` fields that show the value in seconds to two decimals (`1.00` and
  `0.00` by default), follow the slider, and accept a typed value. Each sits with its unit in a
  `span.seconds` (`display: flex; align-items: center; gap: 4px;`), because `.field` is a column
  flex box and the field and its `s` must share a row. The new module holds the two helpers;
  `formatSeconds` lives here, and `src/lib/finish.ts` imports it.
  - `formatSeconds(ms: number): string` is `(ms / 1000).toFixed(2) + ' s'`: 1000 shows `1.00 s`,
    250 shows `0.25 s`, 0 shows `0.00 s`.
  - `parseSeconds(text: string, range: { min: number; max: number; step: number }): number | null`
    trims the text and returns `null` when it is empty. Otherwise `n = Number(text)`, and a value
    that is not finite gives `null`. Then `ms = Math.round(n * 1000)` is snapped to the grid,
    `Math.round((ms - range.min) / range.step) * range.step + range.min`, and clamped to
    `[range.min, range.max]`. With `DWELL_RANGE`: `'0.4'` → 400; `'0.405'` → 410;
    `'0.404'` → 400; `'9'` → 5000; `'0'` → 50; `'-1'` → 50; `' 1 '` → 1000;
    `'abc'` and `''` → `null`. With `GAP_RANGE`: `'0'` → 0; `'2.5'` → 2000. The empty check comes
    first because `Number('')` is 0, and a browser reports non-numeric text in a number field
    as `''`.
  - Each field's `onchange` parses the entry and then always rewrites the field from state (see
    the script below). A rejected entry shows the current value again, and a snapped one shows
    its snapped value, also when the snap lands on the value already set: the state then does
    not change, so the `value` attribute alone would not re-render.
- **Flashing note.** Under the Dwell field, while `dwellMs < 330`, `p.flash-note` reads "Dwells
  under 0.33 s flash the screen more than three times a second. Do not use them near anyone
  sensitive to flashing lights." The README carries the same two sentences.
- **Duplicate-neighbour hint** (`src/lib/duplicates.ts`).
  `duplicateNeighbours(valid: CodeEntry[], loop: boolean): [number, number][]` returns the
  0-based index pairs `(i, i + 1)` whose `value` strings are identical, in order, plus
  `(valid.length - 1, 0)` when `loop` holds, the list has at least two entries and the last and
  first values match. Callers pass only valid entries, so the numbers in the hint match the
  counter. Under the Gap field, while `gapMs < 1000` and the pairs are not empty, `p.dup-hint`
  shows `dupHint` (below), which names the first pair `(a, b)` as codes `a + 1` and `b + 1`. For
  one pair it reads, for example, "Codes 2 and 3 are identical. Many scanners skip a repeat read:
  set a gap of 1.00 s or more, or lower the scanner's reread delay." For `n > 1` pairs the first
  sentence gains ", and 1 more neighboring pair" or ", and `n - 1` more neighboring pairs" before
  its full stop. The UI string uses American spelling, as the README does.
- **Hidden values persist across a mode switch.** The inputs unmount; the `$state` stays. A speed
  set before switching to Step still goes into the Start URL, because `speed` is always emitted. A
  dwell set before switching back to Scroll stays in state but leaves the URL until Step is chosen
  again, because of the mode gating on encode.
- Loop, Random rotation and Random skew follow, unchanged; the Loop label stays `Loop`. No
  `$effect` writes setup state. Everything else on the page is unchanged: textarea, file input,
  Format, Error correction, validation list, ShareLink and Start.

The script gains the two seconds handlers (`onGapSeconds` is `onDwellSeconds` with `GAP_RANGE`
and `gapMs`) and, beside the other `$derived` values, the hint:

```ts
function onDwellSeconds(e: Event & { currentTarget: HTMLInputElement }): void {
	const ms = parseSeconds(e.currentTarget.value, DWELL_RANGE);
	if (ms !== null) dwellMs = ms;
	e.currentTarget.value = (dwellMs / 1000).toFixed(2);
}
const dupPairs = $derived(
	duplicateNeighbours(
		entries.filter((e) => e.valid),
		loop
	)
);
const dupHint = $derived.by(() => {
	if (dupPairs.length === 0) return '';
	const [a, b] = dupPairs[0];
	const extra = dupPairs.length - 1;
	const more =
		extra === 0 ? '' : `, and ${extra} more neighboring ${extra === 1 ? 'pair' : 'pairs'}`;
	return (
		`Codes ${a + 1} and ${b + 1} are identical${more}. Many scanners skip a repeat read: ` +
		`set a gap of 1.00 s or more, or lower the scanner's reread delay.`
	);
});
```

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
either engine accepts; a longer interval between frames counts as this much." Both engines
import it.

### `src/lib/stepMath.ts`

Pure: no DOM, no time source, the same contract as `scrollMath.ts`.

```ts
export type StepPhase = 'dwell' | 'gap';

export interface StepState {
	index: number; // the code shown (dwell) or just shown (gap); 0 ≤ index < count
	phase: StepPhase;
	phaseElapsedMs: number; // time spent in this phase; every phase starts at 0
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
3. Otherwise the phase ends on this call. Let `isLast = state.index === count - 1`. The first of
   these that matches applies:
   - phase `dwell`, `isLast && !loop`: return `{ index, phase: 'dwell', phaseElapsedMs: len }`
     with `finished: true`. There is no trailing gap after the last code.
   - phase `dwell`, `gapMs > 0`: return `{ index, phase: 'gap', phaseElapsedMs: 0 }`.
   - phase `dwell`, `gapMs === 0`: return
     `{ index: isLast ? 0 : index + 1, phase: 'dwell', phaseElapsedMs: 0 }`.
   - phase `gap`, `isLast && !loop`: return `{ index, phase: 'gap', phaseElapsedMs: len }` with
     `finished: true`. This is defensive: with no live Loop control this state cannot arise from
     the UI, but the function is total.
   - phase `gap`, otherwise: return
     `{ index: isLast ? 0 : index + 1, phase: 'dwell', phaseElapsedMs: 0 }`.
4. Every other return has `finished: false`. The time past the phase's end is discarded, so at
   most one transition can happen per call whatever `deltaMs` is, and a phase never starts
   part-spent. `deltaMs === 0` follows the same rules: a phase whose elapsed time already equals
   or exceeds its length transitions (this is how a live lowering of the dwell below the time
   already spent takes effect, see `setDwell`).

Worked transitions. A state is written `(index, phase, phaseElapsedMs)`.

| #   | state in          | deltaMs | dwellMs | gapMs | count | loop | state out          | finished |
| --- | ----------------- | ------- | ------- | ----- | ----- | ---- | ------------------ | -------- |
| 1   | `(0, dwell, 0)`   | 70      | 50      | 0     | 3     | off  | `(1, dwell, 0)`    | no       |
| 2   | `(0, dwell, 0)`   | 100     | 50      | 30    | 3     | off  | `(0, gap, 0)`      | no       |
| 3   | `(0, gap, 20)`    | 16      | 50      | 30    | 3     | off  | `(1, dwell, 0)`    | no       |
| 4   | `(1, dwell, 10)`  | 16      | 50      | 0     | 3     | off  | `(1, dwell, 26)`   | no       |
| 5   | `(2, dwell, 40)`  | 16      | 50      | 30    | 3     | off  | `(2, dwell, 50)`   | yes      |
| 6   | `(2, dwell, 40)`  | 16      | 50      | 0     | 3     | on   | `(0, dwell, 0)`    | no       |
| 7   | `(2, gap, 20)`    | 16      | 50      | 30    | 3     | off  | `(2, gap, 30)`     | yes      |
| 8   | `(0, dwell, 990)` | 16      | 1000    | 0     | 1     | off  | `(0, dwell, 1000)` | yes      |
| 9   | `(0, dwell, 990)` | 16      | 1000    | 0     | 1     | on   | `(0, dwell, 0)`    | no       |
| 10  | `(0, dwell, 990)` | 16      | 1000    | 250   | 1     | on   | `(0, gap, 0)`      | no       |
| 11  | `(0, dwell, 200)` | 0       | 50      | 0     | 3     | off  | `(1, dwell, 0)`    | no       |
| 12  | `(0, gap, 200)`   | 0       | 50      | 30    | 3     | off  | `(1, dwell, 0)`    | no       |

Row 1 discards 20 ms, so code 1 gets its full 50 ms. Row 2 is a clamped 100 ms frame (a stall):
it ends the dwell and the gap starts at 0; the 50 ms past the end is discarded, not owed by the
next phases. Row 5 finishes with no trailing gap. Row 6 wraps. Row 7 is the defensive case. Rows
8 to 10 are one code. Rows 11 and 12 are a dwell or gap lowered live below the time already spent
(`setDwell(50)` at 200 ms into a 1000 ms dwell): the phase ends on the next frame even with
`deltaMs` 0, and the next phase starts at 0, one transition only.

Each phase lasts the first whole number of frames whose total is at least its length: at least
the set dwell, and less than one frame longer when no frame is clamped, so a 60 ms dwell runs as
66.7 ms at 60 Hz and a 1000 ms dwell as 1000 or 1016.7 ms depending on where the frame timestamps
fall. With integer frame deltas, as in the cadence test, every code gets the same whole number of
frames; with real timestamps a dwell may take one frame more or less than its neighbour, but never
less than the set dwell and never a full frame more. A stall lengthens only the code on screen;
the next code starts its full dwell. The on-screen time is never shorter than the setting.

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
	next(): void;
	prev(): void;
}

export interface StepSummary {
	count: number; // valid entries in the list
	seconds: number; // playback clock: clamped frame deltas while playing, in s to the hundredth
	frameMs: number; // mean interval of the unclamped frames while playing; 0 before the first
	stalls: number; // frames whose interval exceeded MAX_DELTA_MS (counted as 100 ms each)
	dwell: { first: number; last: number; changed: boolean }; // ms; see "run record"
	gap: { first: number; last: number; changed: boolean };
}

export function createStepper(
	container: HTMLElement,
	entries: CodeEntry[],
	settings: Settings,
	onFinish?: (summary: StepSummary) => void,
	onIndex?: (index: number, count: number) => void
): Stepper;
```

`Stepper` is `Player` plus `setDwell`, `setGap`, `next` and `prev`. It has no loop setter and no
index getter: `loop` is read from settings at construction and fixed, and the play page learns
the index through `onIndex`.

**Construction and stage.** `valid = entries.filter((e) => e.valid)`, `count = valid.length` (at
least 1; the play page guarantees it) and `items = buildItems(valid, settings)`, built once and
re-appended on every visit, never re-rendered. `container.innerHTML = ''`, then a `div.step-stage`
is appended: `container > div.step-stage >` at most one `div.barcode-item > svg`. The live values
start from settings (`dwell = settings.dwellMs`, `gap = settings.gapMs`); `loop = settings.loop`
is fixed for the stepper's life. The rest starts at `state = INITIAL_STEP_STATE`,
`elapsedMs = 0`, `frameCount = 0`, `frameSumMs = 0`, `stalls = 0`, `playing = false`,
`finished = false`, `runStarted = false`, `dwellFirst = dwell`, `gapFirst = gap`,
`dwellChanged = false` and `gapChanged = false`. A `show()` helper calls
`stage.replaceChildren(items[state.index])` in a dwell phase and `stage.replaceChildren()` in a
gap phase, so the stage holds exactly one item or nothing. Construction calls `show()` and
`onIndex(0, count)` and leaves the stepper paused, like the scroller.

**Frame loop.** It mirrors `createScroller`'s `frame`, counts the frame intervals for the
summary, and, unlike the scroller's, runs the schedule on a delta-0 frame too:

```ts
const frame = (ts: number) => {
	if (!playing) return;
	// The first frame after play() or a go-to has no previous timestamp: it counts no time and
	// is not an interval, so it counts toward neither frameCount nor stalls.
	let deltaMs = 0;
	if (lastTs !== null) {
		const raw = ts - lastTs;
		if (raw > MAX_DELTA_MS) {
			deltaMs = MAX_DELTA_MS;
			stalls += 1;
		} else {
			deltaMs = raw;
			frameCount += 1;
			frameSumMs += raw;
		}
	}
	lastTs = ts;
	elapsedMs += deltaMs;
	const before = state;
	const result = advanceStep(before, deltaMs, dwell, gap, count, loop);
	state = result.state;
	if (result.finished) {
		finish(); // stop(); finished = true; onFinish?.(summary())
		return;
	}
	if (state.index !== before.index || state.phase !== before.phase) show();
	if (state.index !== before.index) onIndex?.(state.index, count);
	rafId = requestAnimationFrame(frame);
};
```

Running the schedule on the delta-0 frame (rule 4) means a dwell or gap lowered while paused
below the time already spent ends on the first frame after Play. A phase that is not past its
length is unchanged by a delta-0 call.

**Run record.** A run's record starts at the first `start()` after construction or `restart()`:
`runStarted = true`, `dwellFirst = dwell`, `gapFirst = gap`, and `dwellChanged` and
`gapChanged` are set to `false`. `setDwell(ms)` sets `dwellChanged = true` when
`runStarted && ms !== dwell`; `setGap` likewise. Adjustments made while paused before the first
Play are therefore not "changes". `restart()` resets `elapsedMs`, `frameCount`, `frameSumMs`,
`stalls`, `runStarted` and the two flags. `finish()` calls `stop()`, sets `finished = true`
and calls `onFinish?.(summary())`, where:

```ts
const summary = (): StepSummary => ({
	count,
	seconds: Math.round(elapsedMs / 10) / 100,
	frameMs: frameCount ? frameSumMs / frameCount : 0,
	stalls,
	dwell: { first: runStarted ? dwellFirst : dwell, last: dwell, changed: dwellChanged },
	gap: { first: runStarted ? gapFirst : gap, last: gap, changed: gapChanged }
});
```

A run finished by `next()` before ever playing therefore reports `first === last` and
`changed: false`.

**Methods.**

- `play()` is `start`, which returns at once when playing or finished. Otherwise it starts the
  run record if `runStarted` is `false`, sets `playing = true` and `lastTs = null` (so paused
  time is excluded) and requests a frame. `pause()` is `stop`, as in the scroller:
  `playing = false` and cancel the pending frame. `toggle()` calls whichever applies, and
  `isPlaying()` returns `playing`.
- `setDwell(ms)` is `dwell = ms`, after the run-record check above; it never touches
  `phaseElapsedMs`. `setGap(ms)` is `gap = ms`, likewise. Lowering the dwell below the time
  already spent ends the current dwell on the next frame; the next code starts at 0 and holds for
  the new dwell in full. Raising it extends the current dwell. Changing the gap acts the same way
  on a gap phase; a change made during the other phase takes effect from the next phase of its
  kind.
- `next()` and `prev()` return at once when `finished`. `next()`: on the last code with loop on,
  go to index 0; with loop off, call the same `finish()` as the frame loop, which sets
  `finished`; otherwise go to `index + 1`. `prev()`: on index 0 with loop on, go to `count - 1`;
  with loop off, go to index 0 again; otherwise go to `index - 1`. In a gap, Prev and Next are
  relative to the code just shown, whose number the counter and readout display: Prev shows
  `index - 1`, Next shows `index + 1`; neither replays the code just shown.
- "Go to `i`" sets `state = { index: i, phase: 'dwell', phaseElapsedMs: 0 }` and
  `lastTs = null`, calls `show()` synchronously and calls `onIndex(i, count)`. With `lastTs`
  cleared, the frame after a go-to counts no time, so the new code's dwell is measured from its
  first painted frame. Without this a long frame arriving right after Next could end the new
  code's dwell before it was painted. Apart from a finishing `next()`, `next()` and `prev()`
  never change the playing state: paused stays paused, playing keeps playing.
- `restart()` keeps the playing state it finds. It sets `wasPlaying = playing`, calls `stop()`,
  sets `state = INITIAL_STEP_STATE`, `elapsedMs = 0` and `finished = false`, resets the run
  record, calls `show()` and `onIndex(0, count)`, and calls `start()` if `wasPlaying`. So Restart
  while playing keeps playing from code 1, Restart while paused stays paused on code 1, and
  Restart from the finish screen (finished implies stopped) lands paused on code 1 with the
  overlay visible, so the tester can pick up the scanner. It keeps the live dwell and gap.
  `destroy()` calls `stop()`; there is no listener to remove and nothing is measured.

**Contracts.**

- `onIndex(index, count)` fires at construction, on every index change in the frame loop, on
  every go-to from `next()` or `prev()` (a finishing `next()` fires `onFinish` instead), and on
  `restart()`. Entering or leaving a gap does not fire it unless the index changes.
- `onFinish(summary)` fires at most once per run. A run begins at construction or `restart()`
  and finishes when the last dwell ends with loop off, or on `next()` at the last code with loop
  off. The summary is a `StepSummary`: `count` is the number of valid entries; `seconds` is
  `Math.round(elapsedMs / 10) / 100`, where `elapsedMs` sums the clamped frame deltas while
  playing, gaps included; `frameMs` is `frameCount ? frameSumMs / frameCount : 0`; `stalls`
  counts the clamped frames; `dwell` and `gap` come from the run record. Once finished, the stage
  keeps the last code, and `play()`, `next()` and `prev()` do nothing until `restart()`.

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
  typed exactly as `createStepper`'s parameters, so `onFinish` receives a `StepSummary`.
- `onMount` calls `createStepper(container, entries, settings, onFinish, onIndex)` and does not
  call `play()`: a step run opens paused on code 1, and `isPlaying()` is `false` until
  `toggle()`. It returns a cleanup that calls `destroy()`. Each handle method forwards to the
  stepper, and `isPlaying()` returns `false` before mount, as in `ScrollColumn`. Like
  `ScrollColumn`, the component snapshots entries and settings at mount.
- **Markup:** `<div class="step-stage-host" bind:this={container}></div>`.
- **CSS.** The stepper builds its DOM imperatively, so every descendant selector is `:global`. The
  item is a flex box, as in the scroll column, so the SVG does not sit on a text baseline. The
  SVG caps are copied from `ScrollColumn.svelte`, which holds the canonical copy: when the caps
  change there, change them here.

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
	display: flex;
	justify-content: center;
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
`onFinish={(s) => { stepFinish = s; playing = false; }}` and
`onIndex={(index, count) => (position = { index, count })}`; `{:else}` mounts today's
`<ScrollColumn>` with `bind:this={scroll}` and today's `onFinish={(s) => (finish = s)}`. The step
`onFinish` sets `playing = false` because the stepper has stopped, so the page's Play label and
readout agree with it. Scroll mode keeps today's behaviour, where `playing` stays `true` after a
finish.

**Handles.** `let column` is renamed `let scroll: ScrollColumnHandle | undefined = $state();`,
beside `let step: StepStageHandle | undefined = $state();`. Only one is ever bound, and
`function player(): Pick<Player, 'toggle' | 'restart' | 'isPlaying'> | undefined` returns
`scroll ?? step`. `toggle()` and `restart()` call `player()` where they call `column` today;
Speed's `oninput` calls `scroll?.setSpeed(speed)`.

**Live state.** `const count = entries.filter((e) => e.valid).length;` beside `hasValid`, then
`let dwell = $state(settings.dwellMs)`, `let gap = $state(settings.gapMs)`,
`let position = $state({ index: 0, count })`,
`let stepFinish: StepSummary | null = $state(null)` beside `finish`, and
`let overlayEl: HTMLDivElement | undefined = $state()`, bound to `.overlay`. `playing` is
initialised to `settings.mode !== 'step'`: `true` in scroll mode as today, `false` in step mode,
so the Play/Pause button reads `Play` at mount in step mode. During a gap the counter and the
readout keep the number of the code just shown.

**Readout.** In step mode only, outside `.overlay` and before it, a line that never hides:

```svelte
{#if settings.mode === 'step'}
	<p class="readout" aria-hidden="true">
		{position.index + 1} / {position.count} · dwell {formatSeconds(dwell)} · gap {formatSeconds(
			gap
		)}{playing ? '' : ' · paused'}
	</p>
{/if}
```

It reads, for example, `12 / 20 · dwell 0.40 s · gap 0.00 s` while playing and
`1 / 20 · dwell 1.00 s · gap 0.00 s · paused` while paused. The separator is U+00B7 with a space
each side. It is `aria-hidden` because the overlay already carries the same facts accessibly,
and a live region at 50 ms swaps would be noise. It sits in the top-left corner, outside the
centred code (the stage caps the symbol at 60vh / 90vw):

```css
.readout {
	position: fixed;
	top: 8px;
	left: 8px;
	margin: 0;
	padding: 2px 8px;
	font-size: 13px;
	line-height: 1.4;
	color: #333;
	background: rgba(255, 255, 255, 0.85);
	border-radius: 4px;
	pointer-events: none;
}
```

**Overlay**, in this order (scroll mode's overlay is today's; step mode renders no Speed slider):

```svelte
<div class="overlay" class:hidden={!overlayVisible} bind:this={overlayEl} onfocusout={showOverlay}>
	<button type="button" class="ctl-playpause" onclick={toggle}>{playing ? 'Pause' : 'Play'}</button>
	{#if settings.mode === 'step'}
		<button type="button" class="ctl-prev" onclick={() => step?.prev()}>Prev</button>
		<span class="ctl-counter">{position.index + 1} / {position.count}</span>
		<button type="button" class="ctl-next" onclick={() => step?.next()}>Next</button>
		<div class="ctl-group">
			<span>Dwell</span>
			<input
				type="range"
				class="ctl-dwell"
				min={DWELL_RANGE.min}
				max={DWELL_RANGE.max}
				step={DWELL_RANGE.step}
				aria-label="Dwell"
				aria-valuetext={formatSeconds(dwell)}
				bind:value={dwell}
				oninput={() => step?.setDwell(dwell)}
			/>
			<input
				type="number"
				class="ctl-dwell-seconds"
				inputmode="decimal"
				min={DWELL_RANGE.min / 1000}
				max={DWELL_RANGE.max / 1000}
				step="0.01"
				aria-label="Dwell in seconds"
				value={(dwell / 1000).toFixed(2)}
				onchange={onDwellSeconds}
			/>
			<span>s</span>
		</div>
		<div class="ctl-group">
			<span>Gap</span>
			<input
				type="range"
				class="ctl-gap"
				min={GAP_RANGE.min}
				max={GAP_RANGE.max}
				step={GAP_RANGE.step}
				aria-label="Gap"
				aria-valuetext={formatSeconds(gap)}
				bind:value={gap}
				oninput={() => step?.setGap(gap)}
			/>
			<input
				type="number"
				class="ctl-gap-seconds"
				inputmode="decimal"
				min={GAP_RANGE.min / 1000}
				max={GAP_RANGE.max / 1000}
				step="0.01"
				aria-label="Gap in seconds"
				value={(gap / 1000).toFixed(2)}
				onchange={onGapSeconds}
			/>
			<span>s</span>
		</div>
	{:else}
		<!-- today's .ctl-speed slider, with oninput calling scroll?.setSpeed(speed) -->
	{/if}
	<button type="button" class="ctl-restart" onclick={restart}>Restart</button>
	<button type="button" class="ctl-back" onclick={back}>Back</button>
</div>
```

The counter's text is `${index + 1} / ${count}`, for example `1 / 20`. Each slider sits in a
`.ctl-group` with its visible caption and its seconds field, so a wrap never separates them. The
seconds fields' `onchange` handlers (`onDwellSeconds`, `onGapSeconds`) parse like the setup
page's, then set the live `dwell` or `gap`, call `step?.setDwell(dwell)` or `step?.setGap(gap)`,
and always write the formatted value back to the field.

The overlay's style gains these rules:

```css
.overlay {
	/* today's rules, plus: */
	flex-wrap: wrap;
	justify-content: center;
	width: max-content;
	max-width: calc(100vw - 32px);
}
.ctl-group {
	display: flex;
	align-items: center;
	gap: 6px;
}
.ctl-dwell,
.ctl-gap {
	width: 110px;
}
.ctl-dwell-seconds,
.ctl-gap-seconds {
	width: 4.5em;
}
```

Today's `left: 50%` leaves a shrink-to-fit box only half the viewport to grow into, so without
`width: max-content` the step overlay would wrap into a narrow stack on every screen; with it the
overlay is as wide as its controls up to a 16 px margin each side, and wraps only when it must.

**Play, restart and overlay hiding.** The idle timer's callback becomes `hideOverlay()`, and
`toggle()` and `restart()` call `showOverlay()` after updating `playing`, so the timer re-arms
when playback resumes:

```ts
function toggle(): void {
	player()?.toggle();
	playing = player()?.isPlaying() ?? false;
	showOverlay();
}
function restart(): void {
	finish = null;
	stepFinish = null;
	player()?.restart();
	playing = player()?.isPlaying() ?? true;
	showOverlay();
}
function showOverlay(): void {
	if (!hasValid) return;
	overlayVisible = true;
	clearTimeout(idleTimer);
	idleTimer = setTimeout(hideOverlay, OVERLAY_IDLE_MS);
}
function hideOverlay(): void {
	// The overlay stays while playback is paused or while one of its controls has keyboard focus.
	if (!playing || overlayEl?.querySelector(':focus-visible')) return;
	overlayVisible = false;
}
```

`:focus-visible`, not `document.activeElement`, is the focus test: a button focused by a mouse
click does not hold the overlay open, while a slider or field reached by keyboard does. jsdom's
selector engine (nwsapi 2.2.24) supports `:focus-visible`, and `element.focus()` matches it there.
`restart()` is identical to today for the scroller, whose `restart()` always ends playing. A
`focusout` on the overlay also calls `showOverlay()`, so the timer restarts when focus leaves.
This applies in both modes; it is the one deliberate change to the scroll-mode overlay. The
existing play-page overlay tests do not pin hiding while paused: `src/routes/play/page.test.ts`
mentions the overlay only in "renders the scroll column and overlay controls".

**Keyboard.** `<svelte:window>` gains `onkeydown={onKey}` beside its pointer handlers:

```ts
function onKey(event: KeyboardEvent): void {
	if (settings.mode !== 'step') return;
	if (event.altKey || event.ctrlKey || event.metaKey) return; // Alt+Arrow is browser Back
	showOverlay();
	if (event.repeat) return; // a held key steps once
	const t = event.target;
	const field =
		t instanceof HTMLInputElement ||
		t instanceof HTMLSelectElement ||
		t instanceof HTMLTextAreaElement;
	if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
		if (field) return; // a focused slider or field keeps its arrows
		if (event.key === 'ArrowRight') step?.next();
		else step?.prev();
	} else if (event.key === ' ') {
		if (field || t instanceof HTMLButtonElement) return; // the button handles Space itself
		event.preventDefault();
		toggle();
	}
}
```

The code is the rule; the reasons: scroll mode is untouched; Alt+Arrow is browser Back in several
browsers, so modified keys are ignored; a held key auto-repeats, so repeats are ignored and a held
arrow steps once; a focused slider or field keeps its arrows, and a focused button handles Space
itself; Space calls `preventDefault` so the page never scrolls, while arrows need not (`.play` is
fixed with `overflow: hidden`). A slider keeps focus after a drag, so its arrows still adjust it;
the readout and `aria-valuetext` make a changed dwell visible.

**Finish.** `src/lib/finish.ts` imports `formatSeconds` from `./seconds` (see _Setup page_) and
gains:

```ts
import { formatSeconds } from './seconds';
import type { StepSummary } from './stepper';

/** Step-mode finish copy: the run record. "barcodes" is not pluralised, as in the scroll copy. */
export function formatStepFinishMessage(summary: StepSummary): string {
	const { count, seconds, frameMs, stalls, dwell, gap } = summary;
	const f = formatSeconds;
	const dwellClause = dwell.changed
		? ` at dwell changed from ${f(dwell.first)} to ${f(dwell.last)}`
		: ` at ${f(dwell.last)} dwell`;
	const gapClause = gap.changed
		? `, gap changed from ${f(gap.first)} to ${f(gap.last)}`
		: gap.last > 0
			? `, ${f(gap.last)} gap`
			: '';
	let message =
		`Finished stepping ${count} barcodes in ${seconds.toFixed(2)} seconds` +
		`${dwellClause}${gapClause}.`;
	if (frameMs > 0) {
		message += ` Display about ${Math.round(1000 / frameMs)} Hz`;
		if (stalls > 0) message += `, ${stalls} ${stalls === 1 ? 'frame' : 'frames'} over 100 ms`;
		message += '.';
	}
	return message;
}
```

The message has a head, a dwell clause, a gap clause and a full stop, then a display sentence
only when `frameMs > 0`. The gap clause is empty when the gap is unchanged and 0. "barcodes" is
not pluralised, matching `formatFinishMessage`. Examples, each a `StepSummary` literal:

- 20 codes, 24.75 s, `frameMs` 16.667, `stalls` 0, dwell 1000 unchanged, gap 250 unchanged:
  `Finished stepping 20 barcodes in 24.75 seconds at 1.00 s dwell, 0.25 s gap. Display about 60 Hz.`
- 20 codes, 13.00 s, `frameMs` 16.667, `stalls` 2, dwell 1000 to 300 changed, gap 0 unchanged:
  `Finished stepping 20 barcodes in 13.00 seconds at dwell changed from 1.00 s to 0.30 s. Display about 60 Hz, 2 frames over 100 ms.`
- 3 codes, 3.00 s, `frameMs` 20, `stalls` 1, dwell 1000 unchanged, gap 0 to 250 changed:
  `Finished stepping 3 barcodes in 3.00 seconds at 1.00 s dwell, gap changed from 0.00 s to 0.25 s. Display about 50 Hz, 1 frame over 100 ms.`
- 2 codes, 0 s, `frameMs` 0, `stalls` 0, dwell 500 unchanged, gap 250 unchanged:
  `Finished stepping 2 barcodes in 0.00 seconds at 0.50 s dwell, 0.25 s gap.`
- Dwell 1000, then 300, then 1000 (changed, `first === last`): the dwell clause reads
  `at dwell changed from 1.00 s to 1.00 s`. This is deliberate: a change is reported even when
  the end value matches the start.

The finish screen renders when `finish` or `stepFinish` is set, from a derived text:

```ts
const finishText = $derived(
	stepFinish
		? formatStepFinishMessage(stepFinish)
		: finish
			? formatFinishMessage(finish.count, finish.seconds)
			: null
);
```

`{#if finishText !== null}` wraps today's finish screen, whose text becomes
`<p class="finish-text" role="status">{finishText}</p>`. So step mode shows
`formatStepFinishMessage(stepFinish)` and scroll mode keeps
`formatFinishMessage(finish.count, finish.seconds)`. `role="status"` applies in both modes, so a
screen reader announces the summary; it is harmless in scroll mode.

**Back.** `currentSettings()` returns
`{ ...settings, speedPxPerSec: speed, dwellMs: dwell, gapMs: gap }`;
`back()` encodes `encodeShareUrl(decoded.codes, currentSettings())` as today, and its comment
becomes "The decoded share state plus the live speed, dwell and gap, never the parsed entries." In
scroll mode the codec drops dwell and gap, so scroll Back URLs are unchanged.

**Unchanged:** decode once, the bounce to setup when no code is valid, the `hashchange` reload,
`OVERLAY_IDLE_MS` (3 s) as the idle delay while playing, and the finish screen's
`.finish-restart` and `.finish-back` buttons.

## Edge cases

- **One code, loop on.** With gap 0 the stage never visibly changes. What the scanner does
  differs by model: in presentation mode some read the code once and never again while it stays
  in view, others read it again each time their reread delay expires. Verification row 8 records
  what the test device does.
- **Identical consecutive payloads.** In presentation (hands-free) mode many scanners ignore a
  code they have just read until a short timeout ends, often called the reread delay (typically
  0.5–2 s, configurable on most). A symbol replaced by one with the same payload can be
  swallowed. A gap longer than the delay makes the symbol leave view first; lowering the delay in
  the scanner's settings works too. The setup page warns when neighbours match (see _Setup
  page_). In manual-trigger mode each pull is a fresh read and the delay usually does not apply.
- **A phase shorter than a frame.** One transition per frame means every phase lasts at least one
  frame, so the achieved dwell is at least one frame whatever the setting; a 10 ms gap lasts one
  frame. Each phase lasts the first whole number of frames whose total is at least its length:
  at least the set dwell, and less than one frame longer when no frame is clamped, so a 60 ms
  dwell runs as 66.7 ms at 60 Hz. The summary names the display rate, and the README says that a
  dwell is rounded up to whole frames.
- **Dropped frames and background tabs.** A long frame counts as at most `MAX_DELTA_MS` (100 ms);
  it is counted in `stalls` and named in the summary (`1 frame over 100 ms`). Browsers stop
  animation frames in a hidden tab, so playback pauses there; on return at most 100 ms of the
  hidden time is counted, and the same phase resumes unless it was within 100 ms of its end. A
  stall never skips a code: it lengthens only the code on screen, and the next code starts its
  full dwell.
- **Window blur** (the scanner's own software in front) does not pause playback; only a hidden
  tab stops frames.
- **Live edits.** Lowering the dwell below the time already spent ends the current dwell on the
  next frame; the next code starts at 0 and holds for the new dwell in full. Raising it extends
  the current dwell. Changing the gap acts the same way on a gap phase; a change made during the
  other phase takes effect from the next phase of its kind (see `setDwell`). A change made after
  the run's first Play is reported in the summary as a change.
- **Pause during a gap** keeps the blank stage, and the gap resumes on Play; the readout shows the
  code just shown and `· paused`.
- **Start, restart and finish.** A step run opens paused on code 1 with the overlay visible.
  Restart keeps the playing state it finds; from the finish screen it lands paused on code 1.
  After a finish, Prev, Next, the arrow keys and Play do nothing until Restart.
- **Bounds.** With loop on, `next()` and `prev()` wrap; with loop off, `next()` on the last code
  finishes and `prev()` on the first stays. In a gap, Prev and Next are relative to the code just
  shown. One code follows rows 8 to 10 of the worked table; an empty list never reaches the
  engine.
- **Resize and orientation.** Nothing to do: the stage centres with CSS, nothing is measured, and
  the SVG caps are relative to the viewport.
- **Distortion clipping.** Spec 1's recorded limitation applies unchanged: on viewports narrower
  than about 560 px with rotation or skew near 30°, the corners of a 2D symbol can leave the
  viewport. Recorded, not mitigated.
- **Scroll mode must not move.** The existing scroller tests, assertions unchanged, are the
  regression guard, together with the byte-identical scroll link. The one deliberate change to
  scroll mode is the overlay, which no longer hides while paused or while one of its controls has
  focus.
- **Accessibility.** The counter is a plain `span`, not a live region: at 50 ms swaps it would be
  noise. The corner readout is `aria-hidden`, because the overlay carries the same facts. Prev
  and Next are labelled by their text, the overlay sliders by `aria-label` beside a visible
  caption, the seconds fields by `aria-label` (`Dwell in seconds`, `Gap in seconds`), and the
  setup sliders by their `<label>`; every dwell and gap slider has `aria-valuetext` in seconds.
  `.finish-text` has `role="status"`, so the summary is announced. Dwells under 0.33 s flash the
  screen more than three times a second: below that the setup page shows `.flash-note`, and the
  README carries the same warning.

## Testing

Each file is named by its path; "new" files do not exist today.

- **`src/lib/stepMath.test.ts`** (new):
  - `INITIAL_STEP_STATE` equals `{ index: 0, phase: 'dwell', phaseElapsedMs: 0 }`; every row of
    the worked table, exact; a frozen input state is not mutated.
  - Cadence with gap 0: from `INITIAL_STEP_STATE`, count 10, loop on, dwell 100, sixty calls at
    `deltaMs` 16: the index changes on calls 7, 14, 21, 28, 35, 42, 49 and 56 and no others, so
    every code gets `Math.ceil(100 / 16) = 7` frames. Discarded remainder: rows 1 to 3 start
    every new phase at 0.
  - The gap phase appears only when `gapMs > 0`: a dwell's end goes to the next index at gap 0 and
    to the same index's gap at gap 10.
  - At most one transition per call: at `deltaMs` 1000 (the function does not clamp) a dwell goes
    only to its gap and a gap only to the next dwell; for each delta of 0, 1, 16, 50, 100 and
    1000 ms the index moves at most one step modulo `count`; `deltaMs` 0 at exactly the phase
    length transitions. Rows 11 and 12 pin the delta-0 case; a carry or double-transition
    implementation fails row 2 (it would reach `(1, dwell, …)`) and row 12 (it would carry the
    170 ms left over into the next dwell and reach index 2).
  - Finish after the last dwell with no trailing gap (row 5) and from the last gap (row 7, the
    defensive case), loop off; wrap with loop on (row 6); one code with both loop states (rows 8
    to 10).
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
  returns an increasing id and `cancelAnimationFrame` is a spy, both restored in `afterEach`
  (scroller.test.ts restores in `finally`); `tick(ts)` runs the stored callback. Entries are
  `scroller.test.ts`'s two valid and one invalid `upc` entries, so count is 2.
  - At construction the container's only child is `.step-stage`, holding exactly one
    `.barcode-item` (item 0); `onIndex` was called once with `(0, 2)`; `isPlaying()` is false.
  - After `play()`, dwell 50, gap 0: once the ticks after the first (which counts no time) sum to
    at least 50, the stage holds item 1 (another element), still one child, and `onIndex(1, 2)`
    fired. Gap 30: after the dwell the stage is
    empty and `onIndex` did not fire; after the gap it holds item 1 and `onIndex(1, 2)` fired,
    once.
  - Loop off: `next()` from 0 shows item 1. After `play()`, `next()` on item 1 calls `onFinish`
    once and leaves `isPlaying()` false; a second `next()`, a `prev()` and a `play()` afterwards
    change nothing, and `onFinish` stays at one call. `prev()` on item 0 stays there and calls
    `onIndex(0, 2)`, counted from a cleared mock (construction already called it). A second
    stepper constructed with `{ ...settings, loop: true }`: `next()` on item 1 shows item 0 and
    `prev()` on item 0 shows item 1. Apart from the finishing `next()`, neither changes the
    playing state, paused or playing.
  - In a gap: dwell 50, gap 30, tick into the gap after code 0, then `next()` shows item 1 and
    calls `onIndex(1, 2)`; in a loop-on stepper, from the gap after code 1, `prev()` shows
    item 0.
  - After `next()` while playing, on a stepper built with `{ ...settings, loop: true }`, the next
    tick counts no time, whatever its interval: at dwell 50 a tick 100 ms later leaves item 1 on
    screen, and the swap to item 0 comes on the first later tick at least 50 ms past that tick.
  - Finish once: loop off, dwell 50, after `play()`, frames past the last dwell call `onFinish`
    once with count 2 and the summary; further ticks, `play()`, `next()` and `prev()` change
    nothing; `restart()` calls `onIndex(0, 2)` and leaves the stepper paused, and after `play()`
    the second run finishes again.
  - Summary: with ticks every 16 ms, `frameMs` is 16 and `stalls` 0; one 250 ms tick adds 100 ms
    to the clock and makes `stalls` 1; `seconds` is `elapsedMs` rounded to the hundredth.
    `setDwell(300)` before the first `play()` reports `dwell` as
    `{ first: 300, last: 300, changed: false }`; `setDwell(300)` after `play()`, from 1000,
    reports `{ first: 1000, last: 300, changed: true }`; `setGap` likewise. A run finished by
    `next()` before any `play()` reports `first === last` and `changed: false` for both.
  - `setDwell` raised mid-dwell defers the swap; lowered below the time spent, the swap comes on
    the next frame and the following code holds for the new dwell in full; `setGap(0)` mid-gap
    shows the next code on the next frame; a dwell lowered while paused below the time spent ends
    on the first frame after `play()`.
  - Restart: after `setDwell(300)`, `setGap(100)` and `play()`, `restart()` leaves `isPlaying()`
    true, the next dwell runs 300 ms (swap on the first tick at least 300 ms past the first tick after
    `restart()`, which counts no time), and the gap 100; a
    paused `restart()` leaves `isPlaying()` false and the stage on item 0.
  - Seconds count only clamped deltas while playing: a 1000 ms jump counts as 100, a paused
    interval as nothing. `pause()` mid-dwell cancels the pending frame and leaves the stage
    untouched; `play()` resumes the same phase. `destroy()` cancels the pending frame, and nothing
    fires afterwards.
- **`src/lib/components/StepStage.test.ts`** (new): with the same entries and
  `{ ...DEFAULT_SETTINGS, mode: 'step' }`, `.step-stage-host > .step-stage` holds one
  `.barcode-item` and `isPlaying()` is false (a step run opens paused); `toggle()` flips it;
  `next()` calls the `onIndex` prop with `(1, 2)`; `prev()`, `restart()`, `setDwell()` and
  `setGap()` run; after `toggle()`, unmounting cancels the pending frame.
- **`src/lib/finish.test.ts`** (extended): `formatStepFinishMessage` returns exactly the four
  full examples under _Finish_ in _Play page_ and, for the fifth, a message containing
  `at dwell changed from 1.00 s to 1.00 s`, each built from a `StepSummary` literal, including the
  singular `1 frame over 100 ms`. The `formatFinishMessage` tests stay as they are.
- **`src/lib/seconds.test.ts`** (new): `formatSeconds` gives `1.00 s`, `0.25 s`, `0.05 s`,
  `0.00 s` and `5.00 s` for 1000, 250, 50, 0 and 5000. `parseSeconds` with `DWELL_RANGE`:
  `'0.4'` → 400, `'0.405'` → 410, `'0.404'` → 400, `'9'` → 5000, `'0'` → 50, `'-1'` → 50,
  `' 1 '` → 1000, and `'abc'` and `''` → `null`; with `GAP_RANGE`: `'0'` → 0 and `'2.5'` → 2000.
- **`src/lib/duplicates.test.ts`** (new): `duplicateNeighbours` gives `[]` for distinct values,
  `[[1, 2]]` for `a b b c`, `[[0, 1], [2, 3]]` for `a a b b`, the wrap pair `[[2, 0]]` for
  `a b a` with loop on and `[]` with loop off, and no pair for one entry with loop on.
- **`src/lib/shareUrl.test.ts`** (extended): step mode with dwell 500 and gap 250 round-trips;
  both example URLs above encode exactly, the second fixing the order after `ecc`; each step
  parameter is emitted on its own: `{ mode: 'step', dwellMs: 500 }` with the default gap encodes
  `…&mode=step&dwell=500` with no `gap`, and `{ mode: 'step', gapMs: 250 }` with the default
  dwell encodes `…&mode=step&gap=250`. The existing fragment-order test stays, and
  `{ ...DEFAULT_SETTINGS, dwellMs: 500, gapMs: 250 }` (scroll mode) encodes to exactly
  `#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc`. On decode,
  `mode=Step`, `mode=scroll` and `mode=1` give no `mode` key; `dwell=49`, `dwell=5001`,
  `dwell=500.5`, `dwell=55` and `dwell=abc` give no `dwellMs`; `gap=-10`, `gap=2001`, `gap=1.5`
  and `gap=15` give no `gapMs`; `dwell=50`, `dwell=5000`, `gap=0` and `gap=2000` decode; `gap=`
  (an empty string) decodes to `gapMs: 0`, as `seed=` decodes to 0; `#codes=1&dwell=500`
  decodes to `{ dwellMs: 500 }` with no `mode` key.
- **`src/lib/scrollMath.test.ts`** (extended): `MAX_DELTA_MS` is exported and equals 100. That
  `src/lib/scroller.ts` keeps no local constant is a grep in the plan, not a test.
- **`src/lib/types.test.ts`** (extended): `DEFAULT_SETTINGS` has `mode` `'scroll'`, `dwellMs`
  1000 and `gapMs` 0; `DWELL_RANGE` equals `{ min: 50, max: 5000, step: 10 }` and `GAP_RANGE`
  equals `{ min: 0, max: 2000, step: 10 }`; each default lies within its range on a step boundary.
- **`src/routes/page.test.ts`** (setup, extended):
  - `.mode-input` has options `Scroll` and `Step` (values `scroll`, `step`) and shows `scroll` by
    default; for `qr`, `.ecc-input` precedes it and `.speed-input` follows it in document order.
  - Choosing Step replaces `.speed-input` with `.dwell-input` and `.gap-input`, which render
    `min="50" max="5000" step="10"` and `min="0" max="2000" step="10"`; `.dwell-seconds` has
    value `1.00` and `.gap-seconds` `0.00`; an input of 500 on `.dwell-input` makes
    `.dwell-seconds` read `0.50`.
  - Typed seconds: a change of `0.4` on `.dwell-seconds` makes `.dwell-input` read `400` and the
    Start URL carry `dwell=400`; `9` gives `5000` and `5.00`; `abc` leaves `.dwell-input`
    unchanged and `.dwell-seconds` reading the previous value.
  - Flashing note: a dwell input of 300 shows `.flash-note`; 330 hides it.
  - Duplicate hint: the list `a\nb\nb` in a text format such as `code128` or `qr` (upc values are
    numeric), in Step, shows `.dup-hint` starting `Codes 2 and 3 are identical.`; `a\na\nb\nb`
    shows `Codes 1 and 2 are identical, and 1 more neighboring pair.`; a gap of 1000 hides it, and
    so does Scroll mode.
  - Hidden values persist: dwell 500, then Scroll, then Step shows 500; speed 120, then Step, then
    Scroll shows 120.
  - Start with Step, dwell 500 and gap 250 navigates to exactly
    `/play#codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step&dwell=500&gap=250`;
    Step at the defaults ends `&fmt=upc&mode=step`; a URL with `mode=step&dwell=500` prefills the
    select and the slider. The existing exact Start URL test stays as it is.
- **`src/routes/play/page.test.ts`** (extended). Step URLs append `&mode=step` to `PLAY_URL`:
  - Step mode mounts `.step-stage` holding one `.barcode-item`, with no `.scroller-track` and no
    `.ctl-speed`; `.ctl-counter` reads `1 / 2`, `.ctl-next` makes it `2 / 2`, `.ctl-prev` `1 / 2`.
  - The step overlay's controls are, in document order, `.ctl-playpause`, `.ctl-prev`,
    `.ctl-counter`, `.ctl-next`, the Dwell `.ctl-group`, the Gap `.ctl-group`, `.ctl-restart` and
    `.ctl-back`.
  - Paused start: `.ctl-playpause` reads `Play` at mount and the stepper is paused (no swap after
    fake frames until Play); it reads `Pause` after a click.
  - Readout: `.readout` reads `1 / 2 · dwell 1.00 s · gap 0.00 s · paused` at mount, has no
    `· paused` after Play, reads `2 / 2 …` after Next, and shows `dwell 0.30 s` after an input of
    300 on `.ctl-dwell`. `.ctl-counter` and `.readout` have no `aria-live` attribute.
  - Overlay hiding, with fake timers: the overlay is still visible 3 s after mount while paused,
    hides 3 s after Play, and stays visible while a control inside it has keyboard focus
    (`element.focus()` in jsdom matches `:focus-visible`).
  - With `dwell=500&gap=250`: `.ctl-dwell` has value `500` and `aria-label="Dwell"`,
    `.ctl-dwell-seconds` reads `0.50`, `.ctl-gap` has value `250` and `aria-label="Gap"`, and
    `.ctl-gap-seconds` reads `0.25`. A change of `0.3` on `.ctl-dwell-seconds` sets `.ctl-dwell`
    to `300` and the readout to `dwell 0.30 s`.
  - Keyboard: `keydown` `ArrowRight` on `window` makes the counter `2 / 2` and `ArrowLeft`
    `1 / 2`; the same key fired on `.ctl-dwell` leaves the counter alone; a `keydown` with
    `repeat: true` does not step; `ArrowRight` with `altKey: true` does not step. Space on
    `window` makes `.ctl-playpause` read `Pause` and a second Space `Play`; Space with
    `.ctl-next` focused does not toggle.
  - Finish: with `requestAnimationFrame` stubbed never to fire and `dwell=500&gap=250`, two clicks
    on `.ctl-next` show `.finish-text`, which has `role="status"`, reading exactly
    `Finished stepping 2 barcodes in 0.00 seconds at 0.50 s dwell, 0.25 s gap.`; after an input
    of 300 on `.ctl-dwell` with no Play, it contains `at 0.30 s dwell`; after a click on
    `.ctl-playpause`, a change of `0.3` on `.ctl-dwell-seconds` and two clicks on `.ctl-next`, it
    contains `dwell changed from 0.50 s to 0.30 s`. `ArrowRight` after the finish screen appears
    leaves `.finish-text` unchanged.
  - Restart: `.ctl-restart` after two `.ctl-next` clicks (the second finishes the run, since
    `PLAY_URL` has loop off) returns the counter to `1 / 2`; `.finish-restart` on the finish
    screen clears it and shows `1 / 2` paused, with `.ctl-playpause` reading `Play`.
  - Inputs of 300 on `.ctl-dwell` and 100 on `.ctl-gap`, then `.ctl-back`, navigate to
    `'/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, seed: 7, mode: 'step', dwellMs: 300, gapMs: 100 })`.
    Every existing scroll-mode test stays as it is.
- **Unchanged:** `src/lib/scroller.test.ts` assertions and
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
  It covers when to use each mode, dwell and gap in seconds with the field beside each slider,
  the paused start and the keys, the corner readout, the sweep-then-confirm workflow, what the
  finish summary records, frame rounding, the reread delay and the flashing warning:

```markdown
### Playback modes

The **Playback** select chooses how codes reach the scanner. **Scroll** moves the column past the
screen at the set speed. **Step** shows one code at a time, still and centered, for the **Dwell**
time, then replaces it with the next; **Gap** blanks the screen between codes, and at 0.00 s the
next code appears instantly. Use Step to test throughput, for 2D symbols and phone cameras, and
whenever a scanner misses codes in motion; use Scroll for a long list read by a scanner that
tolerates motion.

Dwell and gap are set in seconds, by slider or by typing into the field beside it, before Start
or live from the overlay. A step run opens paused on the first code: press **Play** or Space when
the scanner is ready. **Prev** and **Next** (or ← and →) step by hand, and the line in the
top-left corner always shows the code number, dwell and gap. To find the fastest rate your
scanner keeps up with, turn Loop on, lower the dwell until the scanner starts missing codes, and
read the dwell off the corner line. Then run the list once with Loop off at that dwell: the finish
summary records the dwell and gap (and says if they changed during the run), the time on the
playback clock, which expects about codes × dwell + (codes − 1) × gap, and the display's frame
rate. The screen shows each code for whole display frames, so a dwell is rounded up to the next
frame (at 60 Hz, 0.06 s runs as 0.067 s). Paused time and time in a hidden tab are not counted,
and a frame over 0.1 s counts as 0.1 s and is reported in the summary. The counter counts valid
codes only.

In presentation (hands-free) mode many scanners ignore a code they have just read until a short
timeout ends, often called the reread delay. If neighboring codes are identical, set a gap longer
than that delay or lower the delay in the scanner's settings; the setup page warns when neighbors
match. What a scanner does with one code left on screen differs by model: some read it once, some
read it again after the delay. Dwells under 0.33 s flash the screen more than three times a
second. Do not use them near anyone sensitive to flashing lights.
```

- **README, other lines.** Each is the exact current text, then its replacement:
  - Intro (lines 5–7): "scandible turns a list of codes into barcodes stacked in a vertical
    column and scrolls them continuously past the screen at an adjustable speed — so a
    **physical barcode scanner** can read each one off the display in sequence." → "scandible
    turns a list of codes into barcodes and plays them to the screen, either scrolling
    continuously at an adjustable speed or one still code at a time for a set dwell — so a
    **physical barcode scanner** can read each one off the display in sequence."
  - Features: "**Continuous smooth scroll** — GPU-composited motion with a live speed control
    (10–5000 px/s)." → "**Scroll or Step playback** — GPU-composited scrolling with a live speed
    control (10–5000 px/s), or one code at a time for a set dwell (0.05–5 s) with an optional
    blank gap, both adjustable live."
  - Features, _Loop or finish_: "_"Finished scrolling N barcodes in X seconds"_ summary." →
    "_"Finished scrolling N barcodes in X seconds"_ summary, or in Step mode a summary with the
    dwell, gap, playback time and display rate."
  - Features, _Distraction-free playback_: "(play/pause, speed, restart, back)." → "(play/pause,
    speed or dwell and gap, prev and next in Step, restart, back)."
  - _Using it_ step 3: "Set the scroll speed and whether to loop, then press **Start**." → "Set
    the scroll speed, or choose **Step** and set the dwell, and whether to loop, then press
    **Start**."
  - _Using it_ step 4: "Point your scanner at the centered barcodes as they scroll by. Lower the
    speed if the scanner needs more time to lock on." → "Point your scanner at the centered
    barcodes. Lower the speed, or raise the dwell, if the scanner needs more time to lock on."
  - _Scanning 2D symbols_: "Start at 60 px/s and use the browser's full screen for dense
    symbols." → "Start at 60 px/s, or use Step at a 1 s dwell, and use the browser's full screen
    for dense symbols."
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
   order, with no miss and no double, and the finish screen begins
   `Finished stepping N barcodes in X seconds at 1.00 s dwell.` and continues with the display
   rate (for example `Display about 60 Hz.`), with no "changed" clause and with X between N and N
   plus N frames (20.00 to 20.34 at 60 Hz for 20 codes).
3. **Shortest reliable dwell.** The same list, lowering the dwell between runs until a run misses
   a code. Pass: the shortest dwell at which a complete run reads every code is recorded with the
   next lower value tried, or the floor 0.05 s, recorded as reached, and a second complete run at
   the recorded dwell also reads every code. Record the display refresh rate beside the shortest
   reliable dwell.
4. **Duplicate payloads.** One payload three times in a row between two other codes, run at gap
   `0.00 s` and again with a gap above the scanner's reread delay (the delay setting is
   recorded). Pass: with the longer gap all three copies are read once each. The gap-0 read count
   is recorded, whatever it is. If the scanner's reread delay cannot be set below the 2.00 s gap
   maximum, the row stays UNVERIFIED.
5. **Phone camera run.** A phone camera scanner app in a continuous or batch scanning mode reads
   a Step run of a 2D list at dwell `1.00 s` and gap `0.25 s` off a desktop screen. A default
   camera app that shows a result card after the first read is not a valid run. Pass: every code
   is read once; the app, its version, its scanning mode and the phone model are recorded. A
   camera filming a screen can capture half of each symbol across a gap-0 swap (rolling
   shutter), so camera runs keep a gap of 0.25 s or more.
6. **Browsers.** In Chromium and in Firefox: a tall 2D symbol (a QR with a long payload), a
   PDF417 and a 1D code (the default `upc`) sit centred horizontally and vertically with aspect
   and quiet zone intact; at a 390 px wide viewport the step overlay stays within the viewport
   with a 16 px margin each side, wraps without overflowing, no caption or field is separated
   from its slider, and every control is operable; on a 1024 px wide viewport it sits on one row;
   ArrowRight and ArrowLeft step the code and the counter, and with the Dwell slider focused they
   move the slider instead; after clicking Play with the mouse and leaving the pointer still, the
   overlay hides within 3 s plus its fade; with three codes at dwell `5.00 s`, loop off, hiding
   the tab for 10 s mid-dwell and returning shows the same code, the summary's seconds are between
   15.00 and 15.20
   (15.00 plus at most three frame overshoots; the clamped 100 ms on return is progress within the
   dwell, not an addition, and 15.20 leaves headroom), and the summary says `1 frame over 100 ms`
   (the first frame after return; more if the browser drops another frame on return, recorded).
   Pass: all five checks in both browsers.
   Recorded, not mitigated: on a landscape phone (about 360 px high) the wrapped overlay can
   cover the lower part of a tall symbol while it is visible; it hides after 3 s while playing.
7. **Schedule check, not display check.** One loop-off run of 20 codes at dwell `0.50 s` and gap
   `0.25 s`. Pass: a `MutationObserver` on `.step-stage` records `performance.now()` at every
   child change (headless Firefox is fine for this); every measurable code interval (codes 2 to
   19: the first code is on stage before Play and the last stays after the finish) is at least
   500 ms less
   1 ms of measurement tolerance and under 500 ms plus two frames, every gap at least 250 ms less
   1 ms and under 250 ms plus two frames, with the frame period measured in the same run from
   successive rAF timestamps; the summary's seconds lie between 14.75 and 14.75 plus 39 frames
   (15.40 at 60 Hz); and a run whose summary reports any frame over 100 ms is discarded and
   repeated. A display check (what the
   panel actually showed) needs a 240 fps or faster capture or a photodiode and stays UNVERIFIED
   without one; a 60 fps recording cannot decide a one-frame tolerance.
8. **One code on screen (record).** One code, loop on, gap `0.00 s`, dwell `1.00 s`, 30 s with
   the scanner in presentation mode. Record: the number of reads, the device, firmware, read mode
   and reread-delay setting. This row records behaviour; it has no pass rule. It stays UNVERIFIED
   until the record is made.

## Out of scope

Per-code dwell overrides. A manual-only mode without auto-advance. A live Loop control on the play
page (loop is fixed when the page opens). Audio cues. Scanner-feedback integration. URL
compression. Spec 3's items: the structured editor, per-entry formats and options, multi-line
payloads and the tagged record param.

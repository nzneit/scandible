# Play screen for any size: overlay, readout, finish stats and keep-awake — Design

**Date:** 2026-11-05
**Status:** Draft. Design agreed in conversation on 2026-11-05, question by question and then
section by section, with three mockups in the visual companion (the overlay's layout, the finish
screen's stats, and the readout with the keep-awake note). One change from the agreed section 2 is
the author's and waits for the owner: _Decisions_ 10. Review by four lenses and the owner's
approval are pending.
Spec 3 of the three-spec UI revamp series. The series, its decisions and spec 1's foundation are in
`docs/superpowers/specs/2026-11-04-ui-foundation-design.md` (merged as `fde5de1`); spec 2 is
`docs/superpowers/specs/2026-11-04-setup-redesign-design.md` (merged as `8a17280`). Facts measured
for this spec are in _Measurements_ at the end, cited as _M1_ to _M10_. Facts not yet measured are
in _Unverified_, cited as _U1_ to _U6_.

**Builds on:** spec 1's toolchain, Instrument theme, stage guard and `SecondsSlider`; spec 2's
`ValueSlider`, its inline-SVG icon style and its range-track rule; the accessible test queries
migration and its rules in `CONTRIBUTING.md` _Writing tests_. Handoff item T9
(`docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md`) lists what spec 1 and the migration
left for this spec; _Carry-ins_ closes each one.

## Intent

The play page shows the codes full screen with three pieces of chrome: a control overlay at the
bottom, a one-line readout in the top-left corner (Step only), and a finish screen when a run
ends. All three were restyled one to one by spec 1 and never designed for a phone:

- At 390 px the Step overlay wraps into four ragged lines, about 176 px tall (M1). Its buttons are
  32 px tall.
- In Scroll mode the speed slider has no visible label and no value.
- The finish screen is one sentence. A tester reads numbers out of it.
- A phone running a long Scroll deck dims and sleeps at its screen timeout, because nobody touches
  it.

This spec designs the three pieces for phones, tablets and monitors, and adds **keep-awake**, the
one new feature, at the owner's request:

1. The overlay gets a layout per window width, 48 px targets and icon buttons for the transport
   controls.
2. The readout grows to 16 px.
3. The finish screen shows the run as daisyUI stats, in two tiers, and becomes a labelled page
   state with the page behind it made `inert`.
4. While playback runs, the page asks the browser to keep the screen awake, and says so in the
   overlay when it cannot.

The code display itself (the stage: what is drawn, where, how large and when) does not change.

**Done means:**

1. `npm test` (with `svelte-check`) and `npm run lint` are clean, with 0 warnings. Every test
   passes, including the tests this spec changes on purpose (_Testing_).
2. `npm run build` passes, including `check-css`. The PR records the CSS size next to `main`'s
   70,169 B raw and 12,697 B gzipped (M9).
3. `npm run stage-check` passes against `main` (8 PASS).
4. **The share link stays the same.** `git diff main -- src/lib/shareUrl.ts` prints nothing.
5. **The setup page's tests are unchanged.** `git diff main -- src/routes/page.test.ts` prints
   nothing. The setup page shares `SecondsSlider`, `ValueSlider` and the icon with this spec.
6. The class workaround is gone: `grep -n "faded" src/routes/play/page.test.ts` prints nothing.
7. The guide names keep-awake: `grep -c "awake" docs/guide.md` prints at least 2.
8. The visual review is done, and its checks are reported in the PR. The human checks are listed in
   the PR as open (_Verification that fails closed_).

## Decisions

Made by the owner on 2026-11-05, in this order:

1. **Keep-awake: added, held only while playback runs (A).** The page takes the lock on Play and
   releases it on Pause, on the finish screen and on Back. Rejected: B, holding it for as long as
   the play page is open, paused included (a phone left paused on a stand stays lit); C, as A but
   also through the finish screen.
2. **When the screen cannot be kept awake: a short note in the overlay, only when it fails (A).**
   Rejected: B, silent; C, a lock state shown at all times.
3. **The finish screen shows its numbers with daisyUI's Stats component.** The owner's request,
   with their example run: "Finished stepping 5 barcodes in 9.51 seconds at 1.75 s dwell, 0.17 s
   gap. Display about 64 Hz."
4. **Targets: 48 px everywhere, with daisyUI's `btn-lg`.** The owner first chose one size on every
   screen (B, over 44 px on touch screens only), then `btn-lg` (48 px, a stock size) over a custom
   44 px.
5. **Overlay layout: B, icon transport and labelled settings.** Play/Pause, Prev, Next and Restart
   are icon buttons; Back keeps its word; Dwell, Gap and Speed keep visible labels. Rejected: A, an
   icon and a word on every button (four rows on a phone; two rows on a 1280 px desktop); C, B
   with the Dwell and Gap rows behind a Timing button on phones.
6. **Finish stats: B, two tiers,** with **Back on the left and Restart on the right**, as Back sits
   on the left elsewhere. Rejected: A, one block, vertical on phones; C, a two-column grid on
   phones.
7. **The finish screen is a page state, not a dialog (A).** A heading, and the page behind it made
   `inert`. Rejected: B, a modal `<dialog>` (Escape has no good meaning; jsdom 24.1.3 has no
   `showModal()`); C, today's group with the overlay removed (no heading).
8. **Readout: same place and words, 16 px (A).** Rejected: B, 13 px as today; C, an 18 px pill at
   the top centre.
9. **Approach 1: new components and small pure helpers.** The page keeps its state. Rejected: a
   `Play` state class like spec 2's `Setup` (one page uses the state), and restyling in place (the
   page file would pass 450 lines).
10. **Pending the owner — the overlay shows when focus enters it, not on every key press.** Section
    2, as agreed, showed the overlay on any key press in either mode. The guide documents keys as
    Step only (`docs/guide.md:147-148`), and for a reason (M2): a keyboard-wedge scanner plugged
    into the computer that shows the codes types every scan into the page. In Scroll mode, a key
    press that raised the overlay would cover the codes being scanned for 3 s after every read.
    The bug the change was for is Tab reaching a control while the overlay is faded; showing the
    overlay when focus enters it fixes that in both modes. Key presses keep their behavior: they
    show the overlay in Step mode only.

Assumptions the owner did not correct when the design began, so they hold: the stage does not
change; the keyboard keys do not change; nothing beyond keep-awake is added (no swipe gestures, no
fullscreen button); the README screenshots come in a separate docs PR after this one merges; the
two open checks of handoff item T10 run on the new overlay.

## What changes for the user, and what stays

| Changes                                                                                      | Stays                                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The overlay's layout per width, its 48 px controls and its icon buttons, each with a tooltip | Every control the overlay has, their names, and what each one does                             |
| Scroll mode shows **Speed** and its value (`60 px/s`)                                        | The speed, dwell and gap ranges, steps and defaults; the live changes during a run             |
| Tab into a faded overlay brings it back, in both modes                                       | The 3 s fade, the keys (←, → and Space, Step only) and what brings the overlay back otherwise  |
| The readout is 16 px                                                                         | Its place, words and update rule                                                               |
| The finish screen: a heading, two tiers of stats, Back then Restart                          | Restart takes focus; the full sentence is announced to screen readers; Back keeps the settings |
| While playback runs the screen stays awake, or the overlay says it cannot                    | The stage, the share link, the setup page                                                      |

## Parts

| Part                                      | Status  | Job                                                                                                                                                                                |
| ----------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/components/PlayOverlay.svelte`   | new     | Layout B for both modes, the keep-awake note and its status region. It has no timers: the page says whether it is visible.                                                         |
| `src/lib/components/FinishScreen.svelte`  | new     | The heading, the two stat tiers, then Back and Restart. It focuses Restart when it appears.                                                                                        |
| `src/lib/components/Icon.svelte`          | new     | The inline-SVG stroke icon. `RowEditor` uses it for ↑ ↓ ✕ in place of its local snippet; its markup is unchanged.                                                                  |
| `src/lib/keepAwake.ts`                    | new     | A controller around `navigator.wakeLock` (_Keep-awake_).                                                                                                                           |
| `src/lib/finish.ts`                       | changed | Adds `finishStats()`. `formatFinishMessage` and `formatStepFinishMessage` stay, unchanged, for the status region.                                                                  |
| `src/lib/components/SecondsSlider.svelte` | changed | Size `lg` for the overlay in place of `xs`, which only the overlay used.                                                                                                           |
| `src/lib/components/ValueSlider.svelte`   | changed | An overlay variant: the label beside the slider, `range-lg`, a 48 px hit area. The setup page's look is unchanged.                                                                 |
| `src/routes/play/+page.svelte`            | changed | Keeps the state, the fade timer and the keys; wires the parts; owns the keep-awake controller; marks the stage, the readout and the overlay `inert` while the finish screen shows. |
| `src/styles.css`                          | changed | The overlay's range-track rule (_Styling_), and an updated comment on the `hidden` exclusion.                                                                                      |
| `src/colors.test.ts`                      | changed | Drops the `.finish-screen` white allowance (M7): the finish screen uses the theme's `bg-base-100`.                                                                                 |

**Data flow.** The page owns `playing`, `position`, `dwell`, `gap`, `speed`, the finish summary,
whether the overlay is visible, and the keep-awake state. It passes them down and gets callbacks
back (`onToggle`, `onPrev`, `onNext`, `onRestart`, `onBack`, and the slider changes, which call the
engine as today). Keep-awake is wanted while `playing` is true and no finish summary is showing; the
page calls `keepAwake.want()` when that changes, and the controller reports its state back.

## The overlay — `PlayOverlay.svelte`

### Layout

The controls run left to right: **Back**, **Restart**, **Prev**, **Play**/**Pause**, **Next**
(Prev and Next in Step only), then the counter (Step only), then the settings.

| Window width       | Step                                                                | Scroll                                        |
| ------------------ | ------------------------------------------------------------------- | --------------------------------------------- |
| below 768 px       | 3 rows: the buttons (Back left, the icon buttons right); Dwell; Gap | 2 rows: Back, Restart, Play/Pause; then Speed |
| 768 px to 1,279 px | 2 rows: the buttons and the counter; Dwell and Gap side by side     | 1 row                                         |
| 1,280 px and up    | 1 row                                                               | 1 row                                         |

Below 768 px the overlay spans the window less 16 px on each side. From 768 px it is as wide as its
content and centred. It sits 16 px above the bottom, plus `env(safe-area-inset-bottom)`. The
breakpoints are Tailwind's `md` (48rem) and `xl` (80rem); they come from the mockups' arithmetic (a
one-row Step overlay is about 1,090 px wide), so the plan pins them by measuring the built overlay
(U4).

The **counter** (`3 / 12`) shows in the buttons row from 768 px. Below 768 px it is visually hidden
(`sr-only`) but stays in the accessibility tree, because the readout is hidden from screen readers.

The **keep-awake note** is the overlay's first line when it shows (_Keep-awake_).

### Controls

- Every target is 48 px: the buttons are `btn btn-lg`, the icon buttons `btn btn-lg btn-square`;
  the seconds fields are `input input-lg`; the sliders are `range range-lg` (a 28 px thumb, M4) in
  a 48 px tall input.
- The icon buttons carry an `Icon` and no text. Each has its name as `aria-label` (**Play** or
  **Pause**, **Prev**, **Next**, **Restart**) and the same word as a daisyUI tooltip
  (`tooltip tooltip-top`, `data-tip`), which shows on hover and on keyboard focus (M4). Play/Pause
  swaps its icon and its name together, as its text does today.
- **Back** is `btn btn-lg` with the back-arrow icon and the word "Back".
- **Dwell** and **Gap** are `SecondsSlider` at size `lg`: the label, the slider, the seconds field,
  then "s", 8 px apart (today 4 px). Each row is a `role="group"` labelled by its visible label
  (`aria-labelledby`), so the slider and its field are found together, by role, in one named group.
  Firefox's spin arrows in the seconds fields stay; they are the browser's own control.
- **Speed** is `ValueSlider` in its overlay variant: the label "Speed" beside the slider, then the
  value as the setup page shows it (`60 px/s`), with the same `aria-valuetext` as the setup page.
  The range stays 10 to 5,000 px/s in steps of 5.

### Icons

Stroke icons on a 24 px grid, drawn by `Icon.svelte` as today's `RowEditor` snippet draws them
(`aria-hidden="true"`, `stroke="currentColor"`, round caps and joins), at 22 px in the overlay:

| Name    | Shape                                 |
| ------- | ------------------------------------- |
| play    | a right-pointing triangle, filled     |
| pause   | two vertical bars                     |
| prev    | a bar, then a left-pointing triangle  |
| next    | a right-pointing triangle, then a bar |
| restart | a counter-clockwise circular arrow    |
| back    | a left arrow                          |
| moon    | a crescent (the keep-awake note)      |

The mockup's paths (`.superpowers/brainstorm/1130276-1793885993/content/overlay-layout.html`, a
local, git-ignored file) are a starting point; the plan fixes the final paths.

### Showing and fading

- The overlay shows on load; on any pointer move or press on the page; on a key press in Step mode
  (as today); when focus enters it (`focusin`, new, both modes); and on Play, Pause and Restart.
- While playback runs, it fades 3 s after the last of those, unless a control inside it has
  keyboard focus (`:focus-visible`), as today. While paused it stays.
- Faded means `opacity: 0` and `pointer-events: none`, set as inline styles (Svelte's `style:`
  directive), with today's 0.3 s opacity transition. Tests read it with `not.toBeVisible()` (M5).
- A faded overlay stays focusable and in the accessibility tree (`aria-hidden` would be wrong, as
  the migration's accessibility review found). Tab into it brings it back.

### Keys

Unchanged: ←, → and Space in Step mode only; Alt, Ctrl and Meta combinations are ignored; a held
key moves once; a focused slider or field keeps its arrows.

## The readout

Step mode only, top left (8 px from the edges), `text-base` (16 px), on `bg-base-100/85` with 4 px
by 10 px padding. Same words and update rule as today:
`3 / 12 · dwell 1.00 s · gap 0.00 s`, plus ` · paused` while paused. It stays `aria-hidden` and
stays up while the overlay fades.

## Keep-awake — `src/lib/keepAwake.ts`

```ts
export type KeepAwakeState = 'off' | 'held' | 'unavailable' | 'refused';

export interface KeepAwake {
	want(on: boolean): void;
	state(): KeepAwakeState;
	destroy(): void;
}

export function createKeepAwake(options: {
	wakeLock: WakeLock | undefined; // navigator.wakeLock, or undefined
	doc: Document;
	onState: (state: KeepAwakeState) => void;
}): KeepAwake;
```

| Situation                                                                | What the controller does                                                              | State                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------- |
| Wanted, no API (an older browser, or plain HTTP outside localhost)       | nothing to ask                                                                        | `unavailable`        |
| Wanted, the tab visible                                                  | `wakeLock.request('screen')`                                                          | `held`, or `refused` |
| No longer wanted while a request is pending                              | releases the lock as soon as the request resolves                                     | `off`                |
| The browser releases the lock (the tab hidden, battery saver turned on)  | asks again when the tab is visible and the lock is still wanted                       | `held` or `refused`  |
| `refused`, still wanted, then a pointer press or a key press on the page | asks again, in case the browser wanted a user gesture or battery saver was turned off | `held` or `refused`  |
| Not wanted, or `destroy()` (the page unmounts)                           | releases the lock; `destroy()` also removes its listeners                             | `off`                |

It never retries in a loop: only a returning tab, a pointer press or a key press triggers another
request after a refusal. `onState` is called only when the state changes.

The page creates the controller in `onMount` with `navigator.wakeLock`, calls `want()` whenever
"playing and not finished" changes, and calls `destroy()` on unmount. Scroll mode plays on load, so
it wants the lock at once; whether a request without a user gesture succeeds is U2, and the
"asks again on a press" row covers a browser that refuses it.

**The note.** The overlay shows it when keep-awake is wanted and the state is `unavailable` or
`refused`: the moon icon and the words in _Copy_, at 15 px, as the overlay's first line. It fades
with the overlay. Its text sits in a `role="status"` region that is mounted for the overlay's life,
so a screen reader announces the note once each time it appears.

## The finish screen — `FinishScreen.svelte` and `finishStats()`

### Semantics

```html
<section aria-labelledby="finish-heading">
	<h1 id="finish-heading">Run finished</h1>
	<dl class="stats"><!-- tier 1 --></dl>
	<dl class="stats"><!-- tier 2, Step only --></dl>
	<div><button>Back</button><button>Restart</button></div>
</section>
```

- The section is a region named "Run finished"; its `<h1>` is the play page's only heading. It
  replaces today's `role="group"` named "Run finished".
- While it shows, the stage, the readout and the overlay are inside a wrapper with `inert` and
  `display: contents`, so Tab and screen readers cannot reach them and the stage's layout does not
  change (U5). Today the overlay's controls stay in the tab order behind the finish screen (M3).
- **Restart** takes focus when the screen appears, as today.
- The status region (`role="status"`) stays outside the section, mounted for the page's life, and
  still receives the full sentence from `formatFinishMessage` or `formatStepFinishMessage`, so the
  run is announced as one sentence.

### Stats

Each stat is `<div class="stat"><dt class="stat-title">…</dt><dd class="stat-value">…</dd>` plus,
when there is one, `<dd class="stat-desc">…</dd>`, so screen readers hear term and value pairs.

| Tier                                    | Title    | Value                                                                     | Description                                                       |
| --------------------------------------- | -------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1, values `text-4xl` (36 px)            | Barcodes | the count, `5`                                                            | none                                                              |
|                                         | Time     | Step: two decimals, `9.51 s`. Scroll: as recorded (M6), `9.5 s` or `10 s` | none                                                              |
| 2, values `text-2xl` (24 px), Step only | Dwell    | the last dwell, `formatSeconds`: `1.75 s`                                 | `changed from 1.00 s` when it changed during the run              |
|                                         | Gap      | the last gap, shown at `0.00 s` too                                       | `changed from 0.00 s` when it changed                             |
|                                         | Display  | `64 Hz` (`Math.round(1000 / frameMs)`), only when `frameMs > 0`           | `1 frame over 100 ms` or `N frames over 100 ms` when `stalls > 0` |

- Titles and descriptions are `text-sm` (14 px) in daisyUI's 60 % text color; values keep
  daisyUI's weight.
- Both tiers are `stats` rows on every screen (`stats-horizontal`, daisyUI's default). Below
  640 px the stats' padding tightens and descriptions may wrap (`whitespace-normal`). The plan
  picks the classes so that a 320 px window shows no sideways scroll, measured (_Verification_).
- The blocks have a `border border-base-300`, as in the mockup.
- The screen is centred, `bg-base-100`, and scrolls vertically if a short window (a landscape
  phone) cannot fit it.

### Buttons

**Back** (`btn btn-lg`) on the left, **Restart** (`btn btn-lg btn-primary`) on the right, as in
the overlay. Back keeps today's behavior: the share state plus the live speed, dwell and gap.

### `finishStats()`

```ts
export interface Stat {
	title: string;
	value: string;
	desc?: string;
}

export type FinishedRun =
	{ mode: 'scroll'; count: number; seconds: number } | { mode: 'step'; summary: StepSummary };

export function finishStats(run: FinishedRun): { result: Stat[]; conditions: Stat[] };
```

`result` is tier 1, `conditions` tier 2 (empty for Scroll). `FinishScreen` renders them and does no
formatting of its own.

## Page wiring — `src/routes/play/+page.svelte`

- Keeps: decoding the share URL, the entries, the engine handles, `playing`, `speed`, `dwell`,
  `gap`, `position`, the finish summaries, `back()`, `toggle()`, `restart()`, the 3 s timer, the
  `hashchange` reload and `onKey`.
- Gains: the keep-awake controller and its state; `focusin` on the overlay; the `inert` wrapper.
- Loses: the overlay's and the finish screen's markup and styles, which move into their components.
- `showOverlay()` and `hideOverlay()` keep their rules (_Showing and fading_); `hideOverlay` still
  checks for `:focus-visible` inside the overlay.

## Copy

| Where                       | Text                                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| Icon button names, tooltips | `Play`, `Pause`, `Prev`, `Next`, `Restart` (unchanged names)              |
| Back                        | `Back` (unchanged)                                                        |
| Overlay group name          | `Playback controls` (unchanged)                                           |
| Slider labels               | `Dwell`, `Gap` (unchanged); `Speed` (now visible)                         |
| Keep-awake note             | `This browser can't keep the screen awake; it may sleep during the run.`  |
| Finish heading              | `Run finished`                                                            |
| Stat titles                 | `Barcodes`, `Time`, `Dwell`, `Gap`, `Display`                             |
| Stat descriptions           | `changed from <seconds>`; `1 frame over 100 ms`; `<n> frames over 100 ms` |
| Status sentence             | unchanged (`formatFinishMessage`, `formatStepFinishMessage`)              |

## Accessibility

- Every icon button has a name; every visible label (Dwell, Gap, Speed, the stat titles, the
  heading) is the accessible name or term of its control or value (WCAG 2.5.3).
- Targets are 48 px (WCAG 2.5.8 needs 24 px; 2.5.5 asks 44 px).
- Tab into a faded overlay brings it back (WCAG 2.4.7, 2.4.11). Behind the finish screen nothing
  is reachable (`inert`).
- The overlay's focus ring stays `neutral-content` (6.38:1 on the fill, spec 1).
- The slider tracks are at least 3:1 against the overlay fill (WCAG 1.4.11), measured; the stat
  titles and descriptions at least 4.5:1 against white (WCAG 1.4.3), measured.
- The note and the run summary are announced through status regions that stay mounted.
- In forced-colors mode the icon buttons keep their outline and their icons draw in the button's
  text color (`currentColor`); checked in the visual review.

## Styling

- Colors only from theme tokens; the color guard stays green with one allowance fewer (M7).
- `src/styles.css` gains, beside spec 2's setup rule (M10):

  ```css
  .play-overlay .range {
  	--range-bg: color-mix(in oklab, var(--color-neutral-content) 55%, #0000);
  }
  ```

  The plan may change 55 % if the measured contrast falls below 3:1.

- The comment on `@source not inline('hidden')` (M10) is updated: the overlay no longer uses a
  `hidden` class. The exclusion and its `check-css` rule stay, so a stray `hidden` class still
  does nothing rather than hiding an element outright.

## Testing

The tests follow `CONTRIBUTING.md` _Writing tests_. As in spec 2, `@testing-library/user-event` is
not used. Each behavior change starts with a failing test.

- **`src/lib/keepAwake.test.ts`** (new): every row of the keep-awake table, against a fake
  `WakeLock` whose requests the test resolves or rejects, a fake sentinel (an `EventTarget` with
  `release()`), and a document whose `visibilityState` the test sets before dispatching
  `visibilitychange`. Also: `onState` fires only on a change; no request after `destroy()`.
- **`src/lib/finish.test.ts`**: `finishStats()` for both modes; dwell and gap each changed and
  unchanged; a 0 gap; 0, 1 and 2 stalls; `frameMs` 0 (no Display stat); Scroll times `9.5` and
  `10`. The two sentence functions' tests stay.
- **`src/lib/components/PlayOverlay.test.ts`** (new): the controls' names per mode; Play/Pause
  swaps its name; the Dwell and Gap groups each hold their slider and seconds field; the visible
  Speed label and value; the counter's text; the note and its status region shown only when asked.
- **`src/lib/components/FinishScreen.test.ts`** (new): the region and heading; the terms and
  definitions (`getByRole('term')`, `getByRole('definition')`) for a Scroll run and a Step run with
  changes and stalls; Back before Restart in the DOM; Restart focused.
- **`src/lib/components/SecondsSlider.test.ts`**, **`ValueSlider.test.ts`**: the new size or
  variant; the setup sizes unchanged.
- **`src/routes/play/page.test.ts`**:
  - the faded overlay asserted with `not.toBeVisible()`; the `faded()` helper and its lint marker
    deleted (M8);
  - Tab into a faded overlay in Scroll mode brings it back (`focusin`); a key press in Scroll mode
    does not;
  - the finish screen as a region; the wrapper behind it has the `inert` attribute (jsdom and
    Testing Library do not act on `inert`, M5, so the attribute is what can be tested);
  - keep-awake with a fake `navigator.wakeLock` installed by default: requested on Play, released
    on Pause, on finish and on unmount; with the API removed, the note shows while playing and not
    while paused;
  - every existing test keeps its intent; the queries that named the finish screen as a group name
    it as a region.
- **`src/colors.test.ts`**: the allowance list loses `.finish-screen`.
- `src/routes/page.test.ts` does not change (_Done means_ 5).

## Verification that fails closed

A check that errors, prints nothing or is skipped counts as unverified, never as passed.

- `npm test`, `npm run lint`, `npm run build` (with `check-css`) and `npm run stage-check` against
  `main`, as in _Done means_.
- **Visual review** in headless Firefox (spec 2's probe recipe), on `main` and on the branch:

  | Windows                                                           | Views                                                                                                                                        |
  | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
  | 320×568, 390×844, 844×390 (a landscape phone), 768×1024, 1280×800 | Step paused; Step playing; Scroll playing; the overlay faded; the note showing; the Step finish (dwell changed, 2 stalls); the Scroll finish |

  Plus one forced-colors shot of the Step overlay and one of the Step finish at 1280×800.

- **Measured from the probe, not read off a picture:**
  - every overlay control and finish button at least 48 px tall;
  - the overlay's row count at each width matches _Layout_;
  - the slider track against the overlay fill at least 3:1; the stat titles and descriptions
    against white at least 4.5:1;
  - `scrollWidth` equals `innerWidth` in every view, including the finish screen at 320 px;
  - the readout's computed font size is 16 px;
  - the faded overlay's computed opacity is 0, and 1 again after Tab.
- **Human checks**, open until someone runs them:
  - **H1:** on a real Android phone, a Scroll run longer than the screen timeout keeps the screen
    lit; paused, the phone sleeps at its timeout.
  - **H2:** a keyboard pass in a desktop browser, including handoff T10's two checks on the new
    overlay (every focused control shows a visible ring; the overlay fades rather than vanishing).
    This closes T10.
  - **H3 (optional):** keep-awake on iOS Safari.
  - **H4 (optional):** Orca on the finish screen: the heading, the stats as terms and values, and
    the status sentence.

## Documentation

- `docs/guide.md`, _During a run_: the transport controls as icon buttons with their names; Tab
  into the overlay brings it back; a paragraph on keep-awake: what it does, that it holds only
  while playback runs, when it cannot work (an older browser, plain HTTP, battery saver, the page
  in an iframe) and the remedy (raise the device's screen timeout). The finish summary list
  (`docs/guide.md:131-135` and `:167-172`) describes the stats.
- `README.md`: any playback wording that the changes make wrong (the plan greps for it).
- The handoff: T9 and T10 updated, and a decision-log row.
- The README screenshots come in a separate docs PR after this one merges.

## Carry-ins

| From                                               | Item                                                             | Closed by                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Spec 1, series item 3                              | Overlay, readout and finish screen for phones, tablets, monitors | this spec                                                               |
| Migration spec, _Notes for later specs_ › _Spec 3_ | The overlay's faded state                                        | inline styles and `not.toBeVisible()`; the workaround deleted           |
|                                                    | The finish screen's semantics; a dialog?                         | _Decisions_ 7: a labelled page state, the page behind `inert`           |
|                                                    | Roles or names for the barcode items                             | not done (_Out of scope_)                                               |
| Handoff T9 (spec 1's visual review)                | Faint range tracks on the dark fill                              | the overlay range rule (_Styling_)                                      |
|                                                    | 32 px buttons; touch targets                                     | 48 px everywhere                                                        |
|                                                    | 4 px from a seconds field to "s"; Firefox's spin arrows          | 8 px; the arrows stay                                                   |
|                                                    | Finish text `text-2xl` with `mb-6`                               | replaced by the stats layout                                            |
|                                                    | Each slider beside its seconds field (T4 check 4)                | the Dwell and Gap groups; the page test finds both controls inside each |
| Handoff T10                                        | Focus ring and fade on the overlay, unverified                   | human check H2                                                          |

## Notes for the plan

- Pin the `md` and `xl` breakpoints, the stats' phone padding and the range-track mix by
  measuring the built page, as spec 2 pinned its 63 rem threshold.
- Install the fake `navigator.wakeLock` in one helper of `play/page.test.ts`, so a test that wants
  no API removes it explicitly.
- `RowEditor` switches to `Icon` with byte-identical SVG output; its tests do not change.
- U1 to U3 decide nothing in the design; if one of them fails, the note shows and the guide's
  paragraph covers it.

## Out of scope

- Any change to the stage, the engines or `stage-check`.
- New keys (Space in Scroll mode), swipe gestures, a fullscreen button.
- Roles or names for the barcode items: no user need has come up, and the stage tests read classes
  on purpose.
- Dark mode; SvelteKit 3 (handoff Q2); the README screenshots.
- The `hidden` exclusion and its `check-css` rule (kept; only the comment changes).

## Unverified

To be probed by the review's tooling lens; none is assumed in a test.

- **U1.** Screen Wake Lock support: Chrome and Edge 84+, Safari 16.4+, Firefox 126+ (from memory).
- **U2.** Whether `wakeLock.request('screen')` needs a user gesture in those browsers (decides
  whether Scroll mode's request on load succeeds).
- **U3.** GitHub Pages sends no `Permissions-Policy` that blocks `screen-wake-lock`.
- **U4.** The one-row Step overlay is about 1,090 px wide at `btn-lg` (mockup arithmetic), so 1 row
  from 1,280 px and 2 rows from 768 px fit.
- **U5.** `inert` on a `display: contents` wrapper makes its descendants inert in Firefox, Chrome
  and Safari.
- **U6.** daisyUI's tooltip on the rightmost icon button (Next in Step, Play/Pause in Scroll),
  which sits at the window's right edge below 768 px, stays inside a 320 px window.

## Measurements

All taken on 2026-11-05 at `main` `8a17280`, unless named otherwise.

- **M1. Today's overlay.** At 390×844 it wraps into four lines (spec 2's record, view 8 note) from
  y ≈ 652 to 828, about 176 px (read from `shots/branch/8-play-390x844.png`, ±2 px). At 1280 px it
  is about 915×52 px with `btn-sm` (32 px) buttons (spec 1's record, PR #10).
- **M2. Keys and the wedge scanner.** `onKey` returns at once unless the mode is Step
  (`src/routes/play/+page.svelte:108`), and the overlay listens only for `focusout` (`:178`), so Tab
  into a faded Scroll overlay focuses a control that cannot be seen. The guide documents keys as
  Step only (`docs/guide.md:147-148`) and the wedge scanner typing into the page
  (`docs/guide.md:371-373`).
- **M3. Behind the finish screen.** The overlay is a sibling before the finish screen
  (`src/routes/play/+page.svelte:172-242`), and nothing removes it or makes it inert, so Shift+Tab
  from Restart reaches the overlay's Back button under the white screen (read from the code).
- **M4. daisyUI 5.7.50** (`node_modules/daisyui/components/*.css`): `btn-lg` sets `--size` to
  12 × 0.25rem (48 px) and `btn-square` sets width and height to `--size`; `range-lg` sets the
  thumb to 7 × 0.25rem (28 px); `.range` draws the track at `currentColor` 10 %; `stats`, `stat`,
  `stat-title` (0.75rem, 60 %), `stat-value` (2rem, weight 800), `stat-desc` (0.75rem, 60 %),
  `stats-horizontal` and `stats-vertical` exist, with `white-space: nowrap` on the parts and
  `overflow-x: auto` on `stats`; the tooltip shows on `:hover` and `:has(:focus-visible)`, its fade
  only under `prefers-reduced-motion: no-preference`.
- **M5. Test tooling.** jest-dom's `toBeVisible` reads the computed `opacity`
  (`node_modules/@testing-library/jest-dom/dist/matchers-3ed9c960.js:1228-1234`). jsdom 24.1.3
  computes `opacity: 0` from an inline style and from a style sheet (probe with `new JSDOM`). jsdom
  has no `inert` property (`undefined`), and `@testing-library/dom` has no handling of `inert` (no
  match in its `dist`).
- **M6. Run data.** `StepSummary` holds `count`, `seconds` (to the hundredth), `frameMs`, `stalls`,
  and `dwell` and `gap` as `{ first, last, changed }` (`src/lib/stepper.ts:14-21`). A Scroll run
  reports `seconds` rounded to a tenth with `Math.round(x * 10) / 10` (`src/lib/scroller.ts:78`), so
  10.0 s prints as `10`. `formatSeconds` prints two decimals and ` s` (`src/lib/seconds.ts`).
- **M7. The color guard.** `isStageWhite` allows `#fff` in `.play` and `.finish-screen` of the play
  page and in `.qr-code` of the Share panel (`src/colors.test.ts:71-75`).
- **M8. Tests.** 45 files and 921 tests pass at `8a17280` (spec 2's record). `play/page.test.ts`
  has 37 tests; `faded()` is defined at `:27-28` and called at `:275`, `:280` and `:284`; the
  finish screen is queried as a group at `:18`, `:41`, `:435` and `:440`.
- **M9. CSS.** `main` builds to 70,169 B raw and 12,697 B gzipped (spec 2's record, A3).
- **M10. `src/styles.css`.** `@import 'tailwindcss' source(none)` (preflight included);
  `@source not inline('hidden')` with its comment about the overlay's class (`:3-5`); spec 2's
  `.setup-page .range` rule, whose comment leaves the overlay's ranges to spec 3 (`:58-62`).

# Play screen for any size: overlay, readout, finish stats and keep-awake — Design

**Date:** 2026-11-05
**Status:** Approved by the owner on 2026-11-05 (text `7f4388b`). Design agreed in conversation on 2026-11-05, question by
question and then section by section, with three mockups in the visual companion (the overlay's
layout, the finish screen's stats, and the readout with the keep-awake note). Reviewed the same day
by four lenses on Sonnet subagents (codebase fit and tests; tooling probes in a throwaway worktree;
UX and accessibility; internal coherence) and revised by the author; the owner settled the three
questions the review raised (_Decisions_ 10 to 12). _Review_ lists what changed and what was not
taken. Amended after planning, at the owner's word, to match the plan's readings: the Step
buttons' wrap point and the stats' threshold are settled on the built page (_Decisions_ 11,
_Layout_, _Stats_); each icon's contrast is measured against its own button face, and a seconds
field passes by its border or its face (_Accessibility_, _Verification_); the overlay keeps the
last announced note (_Keep-awake_); the focus checks call `focus()` (_Verification_);
`CONTRIBUTING.md`'s fallback is reworded and its _Styling_ corrected (_Documentation_); and two line
citations are corrected (_Testing_). Amended again on 2026-11-05 during the final review (rulings
F3, F4, F8, F14 in the run record): keep-awake treats a lock released within a second of its request
as refused; the overlay's ranges draw no fill; the wedge-scanner advice; the finish heading's focus
and id as built.
Spec 3 of the three-spec UI revamp series. The series, its decisions and spec 1's foundation are in
`docs/superpowers/specs/2026-11-04-ui-foundation-design.md` (merged as `fde5de1`); spec 2 is
`docs/superpowers/specs/2026-11-04-setup-redesign-design.md` (merged as `8a17280`). Facts measured
for this spec are in _Measurements_ at the end, cited as _M1_ to _M14_. Facts still unmeasured are
in _Unverified_, cited as _U1_ to _U4_.

**Builds on:** spec 1's toolchain, Instrument theme, stage guard and `SecondsSlider`; spec 2's
`ValueSlider`, its inline-SVG icon style and its range-track rule; the accessible test queries
migration and its rules in `CONTRIBUTING.md` _Writing tests_. Handoff item T9
(`docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md`) lists what spec 1 and the migration
left for this spec; _Carry-ins_ closes each one.

## Intent

The play page shows the codes full screen with three pieces of chrome: a control overlay at the
bottom, a short readout in the top-left corner (Step only), and a finish screen when a run ends.
All three were restyled one to one by spec 1 and never designed for a phone:

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
   70,169 B raw and 12,697 B gzipped (M9). The review's probe build gives an upper bound of about
   +8.9 kB raw and +1.4 kB gzipped (M11).
3. `npm run stage-check` passes against `main` (8 PASS).
4. **The share link stays the same.** `git diff main -- src/lib/shareUrl.ts` prints nothing.
5. **The setup page's tests are unchanged.**
   `git diff main -- src/routes/page.test.ts src/lib/components/RowEditor.svelte.test.ts` prints
   nothing. The setup page shares `SecondsSlider`, `ValueSlider` and `Icon` with this spec.
6. The class workaround is gone:
   `grep -n -e "faded()" -e "classList.contains('hidden')" src/routes/play/page.test.ts` prints
   nothing.
7. The guide names keep-awake: `grep -c "awake" docs/guide.md` prints at least 2.
8. The visual review is done, and its checks are reported in the PR. The human checks are listed in
   the PR as open (_Verification that fails closed_).

## Decisions

Decisions 1 to 9 were made by the owner on 2026-11-05 while the design was agreed, in this order;
10 to 12 the same day, on questions the writing and the review raised.

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
   page file, 313 lines today, would pass 450).
10. **The overlay shows when focus enters it; key presses show it in Step mode only, as today
    (A).** The design first said any key press, in either mode. The guide documents keys as Step
    only (`docs/guide.md:147-150`), and for a reason (M2): a keyboard-wedge scanner plugged into
    the computer that shows the codes types every scan into the page, so in Scroll mode a key press
    that raised the overlay would cover the codes being scanned for 3 s after every read. Showing
    the overlay when focus enters it fixes the bug the change was for, Tab reaching a control of a
    faded overlay in Scroll mode. Rejected: B, any key press in either mode.
11. **Below 400 px the Step buttons wrap onto two lines.** Back with its word and four 48 px icon
    buttons measure 337 px (M11), more than a phone narrower than about 400 px has: 304 px free at
    360 px, 264 px at 320 px. Back and Restart take the first line, Prev, Play/Pause and Next the
    second, so the Step overlay has 4 rows there. Rejected: Back as an icon-only button below
    400 px (it keeps its word everywhere). The wrap point is settled on the built page: at 400 px
    the buttons have 344 px free against their 337 px (measured with this machine's fallback
    font), so the plan measures at 399, 400 and 412 px and, if they do not share a line at 400 px,
    raises the wrap point to 26rem (416 px), then 28rem (448 px). The intent holds: the buttons
    wrap wherever they do not fit on one line.
12. **When a run ends, focus moves to the "Run finished" heading, not to Restart.** Most
    keyboard-wedge scanners end each scan with Enter. With the short dwells used to measure a
    scanner's top rate, the last code's Enter can arrive just after the finish screen appears; on
    a focused Restart it would restart the run and wipe the stats. Rejected: Restart takes focus,
    as today.

Assumptions the owner did not correct when the design began, so they hold: the stage does not
change; the keyboard keys do not change; nothing beyond keep-awake is added (no swipe gestures, no
fullscreen button); the README screenshots come in a separate docs PR after this one merges; the
two open checks of handoff item T10 run on the new overlay.

## What changes for the user, and what stays

| Changes                                                                                      | Stays                                                                                 |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| The overlay's layout per width, its 48 px controls and its icon buttons, each with a tooltip | Every control the overlay has, its name, and what it does                             |
| Scroll mode shows **Speed** and its value (`60 px/s`)                                        | The speed, dwell and gap ranges, steps and defaults; the live changes during a run    |
| Tab into a faded Scroll overlay brings it back (Step's key presses already did)              | The 3 s fade; the keys (←, → and Space, Step only); pointer moves and taps showing it |
| The overlay's Tab order starts at **Back** (today **Play**), as its controls now run         | The overlay's name, "Playback controls"                                               |
| Below 768 px the Step counter is visually hidden; the readout shows the position             | Screen readers still read the counter                                                 |
| The readout is 16 px and may wrap on a narrow phone                                          | Its place, words and update rule                                                      |
| The finish screen: a heading that takes focus, two tiers of stats, Back then Restart         | The full sentence announced to screen readers; Back keeps the live settings           |
| Behind the finish screen, nothing is reachable and the keys do nothing                       | Restart and Back on the finish screen do what they do today                           |
| While playback runs the screen stays awake, or the overlay says it cannot                    | The stage, the share link, the setup page                                             |

## Parts

| Part                                      | Status  | Job                                                                                                                                                                                                                  |
| ----------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/components/PlayOverlay.svelte`   | new     | Layout B for both modes, the keep-awake note and its status region. Its root keeps the class `overlay`, which `stage-check` hides by name (M13). It has no timers: the page says whether it is visible.              |
| `src/lib/components/FinishScreen.svelte`  | new     | The heading, the two stat tiers, then Back and Restart. It focuses the heading when it appears.                                                                                                                      |
| `src/lib/components/Icon.svelte`          | new     | The inline-SVG stroke icon (_Icons_). `RowEditor` uses it for ↑ ↓ ✕ in place of its local snippet, with byte-identical output.                                                                                       |
| `src/lib/keepAwake.ts`                    | new     | A controller around `navigator.wakeLock` (_Keep-awake_).                                                                                                                                                             |
| `src/lib/speed.ts`                        | new     | `speedText(v)` (`60 px/s`) and `speedValuetext(v)` (`60 pixels per second`), used by both pages.                                                                                                                     |
| `src/lib/types.ts`                        | changed | Adds `SPEED_RANGE = { min: 10, max: 5000, step: 5 }` beside `DWELL_RANGE` and `GAP_RANGE`.                                                                                                                           |
| `src/lib/finish.ts`                       | changed | Adds `finishStats()`. `formatFinishMessage` and `formatStepFinishMessage` stay, unchanged, for the status region.                                                                                                    |
| `src/lib/components/SecondsSlider.svelte` | changed | Size `lg` for the overlay in place of `xs`, which only the overlay used.                                                                                                                                             |
| `src/lib/components/ValueSlider.svelte`   | changed | An optional `oninput` callback and an overlay variant (_Controls_). The setup page passes neither, so its markup is unchanged.                                                                                       |
| `src/lib/components/SettingsPane.svelte`  | changed | Takes Speed's range and strings from `SPEED_RANGE` and `speed.ts`; its output is unchanged.                                                                                                                          |
| `src/routes/play/+page.svelte`            | changed | Keeps the state, the fade timer and the keys; wires the parts; owns the keep-awake controller; holds the stage, the readout and the overlay in a wrapper made `inert` while the finish screen shows (_Page wiring_). |
| `src/styles.css`                          | changed | The overlay's range-track rule (_Styling_), and an updated comment on the `hidden` exclusion.                                                                                                                        |
| `src/colors.test.ts`, `src/theme.test.ts` | changed | The guard drops the `.finish-screen` white allowance (M7); the theme test follows the focus-ring rule into `PlayOverlay` and pins the new range rule (M14).                                                          |

**Data flow.** The page owns `playing`, `position`, `dwell`, `gap`, `speed`, the finish summaries,
whether the overlay is visible, and the keep-awake state. It passes them down and gets callbacks
back. `PlayOverlay` takes:

```ts
interface PlayOverlayProps {
	mode: 'scroll' | 'step';
	visible: boolean;
	playing: boolean;
	position: { index: number; count: number }; // Step
	dwell: number; // $bindable, ms
	gap: number; // $bindable, ms
	speed: number; // $bindable, px/s
	note: string | null; // the keep-awake note's text, or null
	onToggle: () => void;
	onPrev: () => void;
	onNext: () => void;
	onRestart: () => void;
	onBack: () => void;
	onDwell: (ms: number) => void; // calls the engine, as today
	onGap: (ms: number) => void;
	onSpeed: (pxPerSec: number) => void;
	onfocusin: () => void;
	onfocusout: () => void;
}
```

and exports `hasKeyboardFocus(): boolean` (true when a control inside it matches
`:focus-visible`), which the page's `hideOverlay()` calls in place of today's
`overlayEl?.querySelector(':focus-visible')`.

## The overlay — `PlayOverlay.svelte`

### Layout

The controls run left to right, in the DOM in the same order: **Back**, **Restart**, **Prev**,
**Play**/**Pause**, **Next** (Prev and Next in Step only), the counter (Step only), then the
settings.

| Window width       | Step                                                                                                                   | Scroll                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| below 400 px       | 4 rows: Back at the left and Restart at the right; Prev, Play/Pause and Next at the right; Dwell; Gap (_Decisions_ 11) | 2 rows: Back at the left, Restart and Play/Pause at the right; Speed |
| 400 px to 767 px   | 3 rows: Back at the left and the four icon buttons at the right; Dwell; Gap                                            | as below 400 px                                                      |
| 768 px to 1,279 px | 2 rows: the buttons and the counter, running together; Dwell and Gap side by side                                      | 1 row                                                                |
| 1,280 px and up    | 1 row                                                                                                                  | 1 row                                                                |

The row counts are without the keep-awake note, which adds one row above them when it shows.

Below 768 px the overlay spans the window less 16 px on each side, with 12 px padding. From 768 px
it is as wide as its content and centred. It sits 16 px above the bottom, plus
`env(safe-area-inset-bottom)`. The breakpoints are 25rem (400 px, `min-[25rem]:`), Tailwind's `md`
(48rem) and `xl` (80rem); the review measured them with the real classes (M11): the Step buttons
row is 337 px; one Step row is 1,075 px and the Dwell-and-Gap row 659 px with `w-40` ranges; one
Scroll row is 564 px. The Step buttons' 25rem breakpoint may rise to 26rem or 28rem on the built
page (_Decisions_ 11).

The cost of 48 px targets is height: at 390×844 the Step overlay is about 200 px tall (today about
176 px), and about 260 px below 400 px. The visual review records the measured height and the
overlap with the code (_Verification_); the overlay still fades 3 s after Play.

The **counter** (`3 / 12`) is one `<span>` with `sr-only md:not-sr-only`: visible in the buttons
row from 768 px, visually hidden below, and always in the accessibility tree, because the readout
is `aria-hidden`.

### Controls

- Every button and field is 48 px tall: the buttons are `btn btn-lg`, the icon buttons
  `btn btn-lg btn-square`; the seconds fields are `input input-lg`.
- The sliders are `range range-lg` (a 28 px thumb, M4), `w-40` from 768 px and `flex-1 min-w-24`
  below. A daisyUI range is as tall as its thumb (28 px, M11); the input takes `h-12` so its whole
  48 px row is the hit area. Whether the track and thumb stay centred in a 48 px input is U3; if
  they do not, the 28 px thumb is the target, which still meets WCAG 2.5.8's 24 px.
- Each icon button has its name as `aria-label` (**Play** or **Pause**, **Prev**, **Next**,
  **Restart**) and sits in a wrapper `<div class="tooltip tooltip-top" data-tip="…">` with the
  same word. The tooltip shows on hover and on keyboard focus (M4); the classes go on the wrapper,
  not on the `btn`, because daisyUI shows the tip on `:has(:focus-visible)`, which a button cannot
  match for its own focus (M11). Play/Pause swaps its icon, its name and its `data-tip` together,
  as its text swaps today.
- **Back** is `btn btn-lg` with the back-arrow icon and the word "Back", and no tooltip.
- **Dwell** and **Gap** are `SecondsSlider` at size `lg`: the label, the slider, the seconds field,
  then "s", 8 px apart (`gap-2`; the `sm` size keeps `gap-1`). Each row is a `role="group"`
  labelled by its visible label (`aria-labelledby`), so the slider and its field are found
  together, by role, in one named group. Firefox's spin arrows in the seconds fields stay; they
  are the browser's own control.
- **Speed** is `ValueSlider` in its overlay variant: the label "Speed" beside the slider, `range-lg`
  and `h-12`, then the value as the setup page shows it (`speedText`, `60 px/s`), with the setup
  page's `aria-valuetext` (`speedValuetext`). Its `oninput` calls the engine's `setSpeed`, as the
  raw input does today. The range is `SPEED_RANGE`, 10 to 5,000 px/s in steps of 5.

### Icons

`Icon.svelte` draws stroke icons on a 24 px grid, as today's `RowEditor` snippet does
(`aria-hidden="true"`, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="2"`, round
caps and joins):

```ts
interface IconProps {
	d: string | string[]; // one <path> per entry
	filled?: boolean; // fill="currentColor"; default fill="none"
	class?: string; // default 'size-4'
}
```

With the defaults and one path its output is byte-identical to today's snippet. Callers write whole
size classes in `.svelte` source (`size-4`, `size-[22px]`), because Tailwind scans only `.svelte`
files (M10). In the overlay the icons are 22 px:

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
  (as today); when focus enters it (`focusin`, new, both modes); when the keep-awake note appears;
  and on Play, Pause and Restart.
- While playback runs, it fades 3 s after the last of those, unless a control inside it has
  keyboard focus (`hasKeyboardFocus()`), as today. While paused it stays. `focusout` keeps calling
  `showOverlay()`, as today.
- Faded means `opacity: 0` and `pointer-events: none`, set as inline styles (Svelte's `style:`
  directive), with today's 0.3 s opacity transition, removed under
  `prefers-reduced-motion: reduce` (`motion-reduce:transition-none`). Tests read the faded state
  with `not.toBeVisible()` (M5).
- A faded overlay stays focusable and in the accessibility tree (`aria-hidden` would be wrong, as
  the migration's accessibility review found). Tab into it brings it back.
- In forced-colors mode the overlay and the readout draw a 1 px border (`forced-colors:border`; the
  system colors it), so their edges show against the white stage.

### Keys

Unchanged while a run plays or is paused: ←, → and Space in Step mode only; Alt, Ctrl and Meta
combinations are ignored; a held key moves once; a focused slider or field keeps its arrows.
**New: while the finish screen shows, `onKey` returns at once**, so no key steps, toggles or shows
the overlay behind it.

## The readout

Step mode only, top left (8 px from the edges), `text-base` (16 px), on `bg-base-100/85` with 4 px
by 10 px padding, at most the window's width less 16 px (`max-w-[calc(100%-1rem)]`); on a narrow
phone it may wrap onto a second line. Same words and update rule as today:
`3 / 12 · dwell 1.00 s · gap 0.00 s`, plus ` · paused` while paused. It keeps the class `readout`,
which `stage-check` hides by name (M13). It stays `aria-hidden` and stays up while the overlay
fades.

## Keep-awake — `src/lib/keepAwake.ts`

```ts
export type KeepAwakeState = 'off' | 'held' | 'unavailable' | 'refused';

export interface KeepAwake {
	want(on: boolean): void;
	retry(): void; // the page calls it on a pointer press or a key press
	state(): KeepAwakeState;
	destroy(): void;
}

export function createKeepAwake(options: {
	wakeLock: WakeLock | undefined; // navigator.wakeLock, or undefined
	doc: Document;
	onState: (state: KeepAwakeState) => void;
}): KeepAwake;
```

| Situation                                                               | What the controller does                                                                                                                            | State                                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Wanted, no API (an older browser, or plain HTTP outside localhost)      | nothing to ask                                                                                                                                      | `unavailable`                                                             |
| Wanted, the tab visible, no lock held or requested                      | `wakeLock.request('screen')`                                                                                                                        | unchanged until it settles; then `held` or `refused`                      |
| Wanted, the tab hidden                                                  | waits for `visibilitychange`                                                                                                                        | `off`                                                                     |
| `want(true)` while a lock is held or a request is pending               | nothing                                                                                                                                             | unchanged                                                                 |
| No longer wanted while a request is pending                             | releases the lock as soon as the request resolves                                                                                                   | `off`                                                                     |
| The browser releases the lock (the tab hidden, battery saver turned on) | asks again when the tab is visible and the lock is still wanted; a release within 1 s of the request counts as refused (so it never asks in a loop) | `off` until the new request settles; `refused` after a release within 1 s |
| `retry()` while `refused` and still wanted                              | asks again, unless a request is pending or the last one started less than 1 s ago                                                                   | `held` or `refused`                                                       |
| Not wanted, or `destroy()` (the page unmounts)                          | releases the lock; `destroy()` also removes its listeners and ignores later calls                                                                   | `off`                                                                     |

It never retries in a loop: after a refusal only a returning tab or `retry()` asks again, and
`retry()` is throttled as above. `onState` is called only when the state changes.

**Support** (M11): Chrome and Edge 84, Safari 16.4, Firefox 126, on desktop and Android; on iOS,
Home Screen web apps only from iOS 18.4. The W3C algorithm has no user-gesture step, and Firefox
155 granted a request on page load with none; Chrome, Safari and real devices are U1. The API
exists only in secure contexts (HTTPS, or localhost). GitHub Pages sends no `Permissions-Policy`
header; the policy's default allowlist is `'self'`, so a cross-origin iframe without
`allow="screen-wake-lock"` is refused.

**Wiring.** The page creates the controller in its first `onMount`, after the `hasValid` check (no
controller on the bounce path), with `navigator.wakeLock`. An `$effect` calls
`keepAwake.want(playing && finish === null && stepFinish === null)`; a Scroll run's `onFinish`
leaves `playing` true, which the expression covers. Scroll mode plays on load, so it asks at once.
The page's `pointerdown` and `keydown` handlers call `keepAwake.retry()`, except for a held key
(`event.repeat`). `onDestroy` calls `destroy()`.

**The note.** The overlay shows it when keep-awake is wanted and the state is `unavailable` or
`refused`, as its first line: the moon icon and the text in _Copy_ for that state, `text-sm`
(14 px). It fades with the overlay, and its appearance shows the overlay. Its text sits in a
`role="status"` region named "Keep-awake status", mounted for the overlay's life. The region
announces each distinct note text once per page load: after Pause and Play, the same text shows
again but is not re-announced (the overlay keeps the last announced text and writes the region
only when the text differs; the page passes it the note's text).

## The finish screen — `FinishScreen.svelte` and `finishStats()`

### Semantics

```html
<section class="finish-screen" aria-labelledby="{uid}-heading">
	<div class="m-auto">
		<!-- centred; grows downward when the window is short -->
		<h1 id="{uid}-heading" tabindex="-1">Run finished</h1>
		<dl class="stats"><!-- tier 1 --></dl>
		<dl class="stats"><!-- tier 2: Step only, rendered only when there are conditions --></dl>
		<div><button>Back</button><button>Restart</button></div>
	</div>
</section>
```

- The section is a region named "Run finished"; its `<h1>` is the play page's only heading. It
  replaces today's `role="group"` named "Run finished".
- **The heading takes focus when the screen appears** (_Decisions_ 12), in `FinishScreen`'s
  `onMount`, which runs once the heading exists. Tab then reaches Back, then Restart. The heading's
  id is built from `$props.id()` (`uid` above).
- The stage, the readout and the overlay sit in one wrapper `<div>` with `display: contents`,
  rendered for the page's whole life, so the stage never remounts and its layout does not change
  (M11). While the finish screen shows, the wrapper is `inert`, set with a spread
  (`{...(finished ? { inert: true } : {})}`): `inert={finished}` sets a property that jsdom does
  not have and renders no attribute, so a test could not see it (M11). In Firefox the wrapper
  blocks focus and keeps the stage's layout (M11); Chrome and Safari are U2, and the
  spread's clearing after Restart is U4. Today the overlay's
  controls stay in the tab order behind the finish screen (M3).
- The status region (`role="status"`, named "Run summary") stays outside the section, mounted for
  the page's life, and still receives the full sentence from `formatFinishMessage` or
  `formatStepFinishMessage`, so the run is announced as one sentence after the heading.
- The section is `position: fixed; inset: 0; overflow-y: auto` on `bg-base-100`; its content is one
  child with `margin: auto`, so it is centred when it fits and, on a short window (a landscape
  phone), overflows downward where it can be scrolled to, never above the top.

### Stats

Each stat is `<div class="stat"><dt class="stat-title">…</dt><dd class="stat-value">…</dd>` plus,
when there is one, `<dd class="stat-desc">…</dd>`, so screen readers hear term and value pairs.

| Tier                                    | Title         | Value                                                                     | Description                                                                 |
| --------------------------------------- | ------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1, values `text-4xl` (36 px)            | Barcodes      | the count, `5`                                                            | none                                                                        |
|                                         | Playback time | Step: two decimals, `9.51 s`. Scroll: as recorded (M6), `9.5 s` or `10 s` | none                                                                        |
| 2, values `text-2xl` (24 px), Step only | Dwell         | the last dwell, `formatSeconds`: `1.75 s`                                 | `changed from 1.00 s` when it changed during the run                        |
|                                         | Gap           | the last gap, shown at `0.00 s` too                                       | `changed from 0.00 s` when it changed                                       |
|                                         | Refresh rate  | `64 Hz` (`Math.round(1000 / frameMs)`), only when `frameMs > 0`           | `1 frame took over 100 ms` or `N frames took over 100 ms` when `stalls > 0` |

- Titles and descriptions are `text-sm` (14 px) in daisyUI's 60 % text color, 4.64:1 on
  `base-100` (M11); the plan raises the 60 % if a change to the theme brings it under 4.5:1.
  Values keep daisyUI's weight and stay on one line.
- Both tiers are `stats` rows on every screen (`stats-horizontal`, daisyUI's default), with a
  `border border-base-300`, as in the mockup. Titles and descriptions may wrap
  (`whitespace-normal` on `stat-title` and `stat-desc`).
- Below 400 px (or the threshold the measurement settles, below) each `.stat` takes `px-3`, tier 1
  values `text-3xl` and tier 2 values `text-xl`.
  The review measured tier 2 with daisyUI's defaults at 556 px wide in a 320 px window, scrolling
  the page; with `px-3` and wrapping it fits with 2 px to spare at today's sizes (M11), so the
  smaller values below 400 px leave room for wider numbers. The visual review measures the widest
  case on both sides of the threshold (_Verification_): at 400 px the large sizes and daisyUI's
  padding return, and tier 1 with `1234.56 s` at 36 px comes near the 368 px free (estimated while
  planning). If any width overflows, the threshold rises from 25rem to 30rem, then 40rem; below
  it, a small size that still overflows steps down once. A threshold that runs out of steps fails
  the check.

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

`result` is tier 1, `conditions` tier 2 (empty for Scroll). `FinishScreen` renders them, renders the
second `<dl>` only when `conditions` is not empty, and does no formatting of its own. The page
builds the `FinishedRun` from its `finish` or `stepFinish` summary.

## Page wiring — `src/routes/play/+page.svelte`

- Keeps: decoding the share URL, the entries, the engine handles, `playing`, `speed`, `dwell`,
  `gap`, `position`, the finish summaries, `back()`, `toggle()`, `restart()`, the 3 s timer, the
  `hashchange` reload, `onKey`, and the `.play` container with its literal white (a stage
  allowance, M7).
- Gains: the keep-awake controller, its state and the note text; `focusin` on the overlay; the
  `inert` wrapper; the finish guard at the top of `onKey`; focusing the heading on finish.
- Loses: the overlay's and the finish screen's markup and styles, which move into their components.
- `showOverlay()` and `hideOverlay()` keep their rules (_Showing and fading_); `hideOverlay()` asks
  the overlay's `hasKeyboardFocus()`.

## Copy

| Where                                | Text                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Icon button names and tooltips       | `Play`, `Pause`, `Prev`, `Next`, `Restart` (unchanged names)                                |
| Back                                 | `Back` (unchanged)                                                                          |
| Overlay group name                   | `Playback controls` (unchanged)                                                             |
| Slider labels                        | `Dwell`, `Gap` (unchanged); `Speed` (now visible)                                           |
| Keep-awake note, state `unavailable` | `This browser can't keep the screen awake. The screen may turn off during the run.`         |
| Keep-awake note, state `refused`     | `Keep-awake was blocked, perhaps by battery saver. The screen may turn off during the run.` |
| Status region names                  | `Keep-awake status`; `Run summary`                                                          |
| Finish heading                       | `Run finished`                                                                              |
| Stat titles                          | `Barcodes`, `Playback time`, `Dwell`, `Gap`, `Refresh rate`                                 |
| Stat descriptions                    | `changed from <seconds>`; `1 frame took over 100 ms`; `<n> frames took over 100 ms`         |
| Status sentence                      | unchanged (`formatFinishMessage`, `formatStepFinishMessage`)                                |

The stat titles follow the guide's words ("the time on the playback clock", "the display's refresh
rate"); the mockup's working titles were "Time" and "Display".

## Accessibility

- **Names (WCAG 2.5.3, 4.1.2).** Every icon button has a name equal to its tooltip; every visible
  label (Back, Dwell, Gap, Speed, the stat titles, the heading) is the accessible name or term of
  its control or value.
- **Targets (2.5.8, 2.5.5).** Buttons and fields are 48 px; sliders are 48 px if U3 holds, and
  their 28 px thumb otherwise, which meets 2.5.8's 24 px.
- **Focus (2.4.7, 2.4.3).** Tab into a faded overlay brings it back, so a focused control is never
  invisible. Behind the finish screen nothing is reachable (`inert`), and focus moves to its
  heading. The overlay's focus ring stays `neutral-content` (6.38:1 on the fill, spec 1).
- **Contrast (1.4.11, 1.4.3).** The slider tracks are 3.18:1 against the overlay fill in the worst
  case (a white page behind it; 4.72:1 over black). The icon buttons keep daisyUI's light `btn`
  face, so each icon is measured against its own face and each face against the fill; a seconds
  field passes when its border or its face reaches 3:1 against the fill; the focus ring is
  measured against the fill. The stat titles and descriptions are 4.64:1 on `base-100` (M11).
- **Pause (2.2.2).** A Scroll run moves for more than 5 s; the Pause button is the mechanism, and
  Tab reaches it in either mode.
- **Status messages (4.1.3).** The note and the run summary are announced through named status
  regions that stay mounted; the note is announced once per distinct text.
- **Structure (1.3.1, 2.4.6).** The stats are a description list of terms and values; the finish
  screen is a named region with the page's only heading.
- **Forced colors and reduced motion.** The overlay and readout keep a visible edge; the icons draw
  in `currentColor`; the fade is instant under `prefers-reduced-motion: reduce`.

## Styling

- Colors only from theme tokens; the color guard stays green with one allowance fewer (M7). The
  overlay keeps `bg-neutral/85 text-neutral-content`, which `theme.test.ts`'s contrast rows model
  (M14).
- `src/styles.css` gains, beside spec 2's setup rule (M10):

  ```css
  .overlay .range {
  	--range-bg: color-mix(in oklab, var(--color-neutral-content) 55%, #0000);
  	--range-fill: 0;
  }
  ```

  55 % gives 3.18:1 in the worst case (M11); 60 % would give 3.47:1. Any change to
  `--color-neutral`, the fill's alpha or this mix is re-measured. `--range-fill: 0` drops daisyUI's
  fill, a shadow of the thumb that the input's 48 px height (`h-12`) turns into a white slab, so
  only the track and the thumb are drawn.

- The overlay's focus-ring rule (`.overlay :global(:focus-visible)`) moves into `PlayOverlay.svelte`
  with its text unchanged.
- The comment on `@source not inline('hidden')` (M10) is updated: the overlay no longer uses a
  `hidden` class. The exclusion and its `check-css` rule stay, so a stray `hidden` class still
  does nothing rather than hiding an element outright.

## Testing

The tests follow `CONTRIBUTING.md` _Writing tests_. As in spec 2, `@testing-library/user-event` is
not used. Each behavior change starts with a failing test.

- **`src/lib/keepAwake.test.ts`** (new): every row of the keep-awake table, against a fake
  `WakeLock` whose requests the test resolves or rejects, a fake sentinel (an `EventTarget` with
  `release()`), and a document whose `visibilityState` the test sets before dispatching
  `visibilitychange`. Also: `onState` fires only on a change; `retry()`'s throttle; nothing after
  `destroy()`.
- **`src/lib/finish.test.ts`**: `finishStats()` for both modes; dwell and gap each changed and
  unchanged; a 0 gap; 0, 1 and 2 stalls; `frameMs` 0 (no Refresh rate stat); Scroll times `9.5`
  and `10`; and one Step run with changes and stalls whose every stat value appears in
  `formatStepFinishMessage`'s sentence. The two sentence functions' tests stay.
- **`src/lib/speed.test.ts`** (new): `speedText` and `speedValuetext`.
- **`src/lib/components/PlayOverlay.test.ts`** (new): the controls' names per mode and their DOM
  order; Play/Pause swaps its name and its wrapper's `data-tip` (`toHaveAttribute`); the Dwell and
  Gap groups each hold their slider and seconds field; the visible Speed label and value, and
  `onSpeed` on input; the counter's text; the note and its named status region shown only when
  asked, and a repeated text not rewritten.
- **`src/lib/components/FinishScreen.test.ts`** (new): the region and heading, and the heading
  focused; the stats through `getAllByRole('term')` and `getAllByRole('definition')` with
  `toHaveTextContent` (`getByRole('term', { name })` does not work: a `<dt>` gets no name from its
  content, M11), for a Scroll run (one list) and a Step run with changes and stalls; Back before
  Restart in the DOM.
- **`src/lib/components/SecondsSlider.test.ts`**: the `xs` row (`:94-95`) becomes the `lg` row; the
  `sm` row is unchanged. **`ValueSlider.test.ts`**: the overlay variant and `oninput`; the default
  unchanged.
- **`src/routes/play/page.test.ts`**:
  - the faded overlay asserted with `not.toBeVisible()`; the `faded()` helper and its marker
    deleted (M8);
  - Tab into a faded overlay in Scroll mode (`focus()` fires `focusin`) brings it back; a key press
    in Scroll mode does not;
  - the finish screen as a region; its heading focused; the wrapper behind it has the `inert`
    attribute while finished and not after Restart (jsdom and Testing Library do not act on
    `inert`, M5, so the attribute is what can be tested); ←, → and Space do nothing while it
    shows;
  - keep-awake with a fake `navigator.wakeLock` installed by one helper for every test: Scroll asks
    on load; Step asks on Play; released on Pause, on finish and on unmount; with the API removed
    by a test, the note shows while playing and not while paused;
  - the six assertions that read the sentence from a paragraph in the finish group (`:330`, `:378`,
    `:381`, `:391`, `:403`, `:414`) read it from the status region named "Run summary"; the query
    at `:372` names that region, since the page now has two status regions (M12);
  - the `textContent` checks on the transport buttons (`:47-51`, `:223`, `:235`, `:238`, `:350`,
    `:352`, `:363`, `:366`, `:417`, `:442`) become `toHaveAccessibleName`; the order test
    (`:200-231`) is rewritten to the new order (Back, Restart, Prev, Play, Next, the counter, the
    Dwell slider and field, the Gap slider and field);
  - the queries naming the finish screen as a group (`:18`, `:41`, `:435`, `:440`) name it as a
    region. Every other test keeps its intent and its strings.
- **`src/colors.test.ts`**: the predicate (`:74`) loses `.finish-screen`; the `it.each` row at
  `:149` now expects that selector's `#fff` to be reported; the allowed list (`:191-195`) and the
  test title (`:198`) go from three to two.
- **`src/theme.test.ts`**: the focus-ring test (`:255-258`) reads `PlayOverlay.svelte`; a new test
  pins the `.overlay .range` rule, as `.setup-page .range` is pinned (M14).
- `src/routes/page.test.ts` and `RowEditor.svelte.test.ts` do not change (_Done means_ 5).

## Verification that fails closed

A check that errors, prints nothing or is skipped counts as unverified, never as passed.

- `npm test`, `npm run lint`, `npm run build` (with `check-css`) and `npm run stage-check` against
  `main`, as in _Done means_.
- **Visual review** in headless Firefox (spec 2's probe recipe), on `main` and on the branch:

  | Windows                                                                    | Views                                                                                                                                        |
  | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
  | 320×568, 360×800, 390×844, 844×390 (a landscape phone), 768×1024, 1280×800 | Step paused; Step playing; Scroll playing; the overlay faded; the note showing; the Step finish (dwell changed, 2 stalls); the Scroll finish |

  Plus forced-colors shots of the Step overlay, the Scroll overlay with Speed, the note and the Step
  finish, at 390×844 and 1280×800.

- **Measured from the probe, not read off a picture:**
  - every overlay button and field, and both finish buttons, at least 48 px tall; each slider's
    input height (48 px if U3 holds);
  - the overlay's row count at each width matches _Layout_ (plus one row in the note view);
  - no overlay control past the overlay's content edge (`scrollWidth` equals `clientWidth` on the
    overlay) at 320, 360 and 390 px;
  - `scrollWidth` equals `clientWidth` on the document and on each `.stats` element in every view,
    including the finish screens at 320, 399, 400 and 412 px with the widest values: a 4-digit
    count, a Step time over 1,000 s, a 5.00 s dwell, and `12 frames took over 100 ms`;
  - in the 844×390 and 320×568 finish views, the heading and both buttons can be scrolled into
    view;
  - the slider track against the overlay fill at least 3:1; each icon against its own button
    face, and each button face against the fill, at least 3:1; each seconds field's border or its
    face against the fill at least 3:1; the stat titles and descriptions against `base-100` at
    least 4.5:1; every ratio recorded;
  - the readout's computed font size is 16 px, and its height at 320 px is recorded;
  - the faded overlay's computed opacity is 0, and 1 again once a control in it takes focus
    (`focus()`, which fires `focusin` as Tab does);
  - in the Step finish view, no control behind the finish screen can take focus: `focus()` is
    called on every focusable element, and only the heading, Back and Restart keep it, which bounds
    what Tab and Shift+Tab can reach (headless Firefox cannot press keys; H2 presses them); after
    Restart, the overlay's Back takes focus again;
  - the rightmost icon button's tooltip, forced open, lies inside the window at 320 and 360 px;
  - **recorded for the owner, not a pass condition:** the overlay's height at each width, and in
    Step paused at 844×390, 390×844 and 320×568, with a UPC-A, a QR and a PDF417 code, the gap or
    overlap between the overlay's top edge and the bottom of the code.
- **Human checks**, open until someone runs them:
  - **H1:** on a real Android phone, a Scroll run longer than the screen timeout keeps the screen
    lit; paused, the phone sleeps at its timeout.
  - **H2:** a keyboard pass in a desktop browser, including handoff T10's two checks on the new
    overlay (every focused control shows a visible ring; the overlay fades rather than vanishing).
    This closes T10.
  - **H3 (optional):** keep-awake on iOS Safari.
  - **H4 (optional):** Orca on the finish screen: the heading, the stats as terms and values, and
    the status sentence; and the note announced once.

## Documentation

- `docs/guide.md`, _During a run_:
  - the transport controls as icon buttons with their names; Back keeps its word;
  - Tab into the overlay brings it back, and the overlay's Tab order starts at Back; in Scroll, Tab
    to Pause and press Enter or Space to pause;
  - a keep-awake paragraph: what it does; that it holds only while playback runs; when it cannot
    work (an older browser, plain HTTP, battery saver, the page in an iframe, a Home Screen web app
    on iOS before 18.4) and what the note then says; the remedy (raise the device's screen
    timeout); the battery cost of a long Loop run;
  - the finish summary lists (`:131-135` and `:167-172`) describe the stats.
- `docs/guide.md`, the wedge-scanner paragraph (`:371-373`): a scanner that ends each scan with
  Enter presses whichever overlay control has focus (such as Play after you click it), so click the
  page, not a control, before scanning; a scanner that ends each scan with Tab moves focus through
  the overlay's controls, so set it to end with Enter or nothing; or connect the scanner to another
  computer.
- `CONTRIBUTING.md` _Writing tests_ (`:95-99`): drop the faded `hidden` class and `faded()` as
  examples. The visual-state fallback stays, since five other test files keep its marker; it is
  reworded to cover state that only a real browser shows or acts on, with an
  `eslint-disable-next-line … -- visual state: <reason>` form for node access, because the
  tooltip's `data-tip` and the `inert` attribute sit on wrappers with no role. Its examples become
  `stage()`, `behind()` and `tip()`.
- `CONTRIBUTING.md` _Styling_: correct what this change makes wrong (the finish screen's white
  background, the file that holds the overlay's focus ring, the overlay's `hidden` class), and add
  `Icon` to the list of shared units.
- `README.md`: any playback wording that the changes make wrong (the review found none).
- The handoff: T9 and T10 updated, and a decision-log row.
- The README screenshots come in a separate docs PR after this one merges.

## Carry-ins

| From                                               | Item                                                             | Closed by                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Spec 1, series item 3                              | Overlay, readout and finish screen for phones, tablets, monitors | this spec                                                              |
| Migration spec, _Notes for later specs_ › _Spec 3_ | The overlay's faded state                                        | inline styles and `not.toBeVisible()`; the workaround deleted          |
|                                                    | The finish screen's semantics; a dialog?                         | _Decisions_ 7 and 12: a labelled page state, the page behind `inert`   |
|                                                    | Roles or names for the barcode items                             | not done (_Out of scope_)                                              |
| Handoff T9 (spec 1's visual review)                | Faint range tracks on the dark fill                              | the overlay range rule (_Styling_)                                     |
|                                                    | 32 px buttons; touch targets                                     | 48 px                                                                  |
|                                                    | 4 px from a seconds field to "s"; Firefox's spin arrows          | 8 px; the arrows stay                                                  |
|                                                    | Finish text `text-2xl` with `mb-6`                               | replaced by the stats layout                                           |
|                                                    | Each slider beside its seconds field (T4 check 4)                | the Dwell and Gap groups; the overlay test finds both controls in each |
| Handoff T10                                        | Focus ring and fade on the overlay, unverified                   | human check H2                                                         |

## Review

Four lenses reviewed the first draft (`475b0b5`) on 2026-11-05: 0 Critical, 26 Important and 29
Minor findings in all. The owner settled three (_Decisions_ 10 to 12). The author took the rest,
except those below. The main changes:

- **Measured instead of estimated:** keep-awake support and the absence of a gesture step; `inert`
  on a `display: contents` wrapper in Firefox; the overlay's widths and the 400 px wrap; the stats'
  width at 320 px; the contrast of the track and the stat text; the daisyUI build (M11).
- **Missing in the draft:** the `.overlay` and `.readout` class names that `stage-check` hides
  (M13); `theme.test.ts` (M14); the second status region and the tests it breaks (M12); the
  transport buttons' text checks and the order test; `ValueSlider`'s callback; `Icon`'s API; the
  tooltip wrapper; the `inert` spread; the keep-awake table's hidden-tab, pending and throttle
  rows; the keys behind the finish screen; the finish screen's scroll on short windows.
- **Copy:** two note texts, since battery saver and an iframe are not the browser's fault, each
  announced once; the stat titles "Playback time" and "Refresh rate".

Not taken, with the reason:

- **A number field for Speed** in the overlay (Speed is 1 % along its track at 60 px/s): a new
  control; the setup page's Speed has none either. The slider's arrow keys step by 5 px/s. It can
  be its own small spec.
- **A compact overlay for short windows:** the overlap with the code is measured and recorded for
  the owner instead (_Verification_); the overlay fades 3 s after Play.
- **Changing the page title to "Run finished":** new behavior, not needed for a full-screen page.
- **Spoken units** (`s` read as "seconds") in the stats: unmeasured in screen readers; the status
  sentence says "seconds".
- **A longer first showing (6 s) for the note:** its appearance shows the overlay instead.
- **The word on Restart on phones:** the owner chose icon buttons (_Decisions_ 5); H2 and the
  owner's phone check judge the icon.

## Notes for the plan

- Pin the stats' threshold and classes by measuring the widest case on both sides of 400 px, as
  spec 2 pinned its 63 rem threshold; the overlay's breakpoints are measured (M11) and are
  re-checked on the built page, which settles the Step buttons' wrap point (_Decisions_ 11).
- Install the fake `navigator.wakeLock` in one helper of `play/page.test.ts`, so a test that wants
  no API removes it explicitly.
- Render `RowEditor` before and after the switch to `Icon` and compare the three icon buttons'
  `innerHTML`.
- Check the `inert` spread in jsdom (the attribute appears and goes) before building on it, and in
  Firefox in the visual review (focus blocked, then restored after Restart).

## Out of scope

- Any change to the stage, the engines or `stage-check`.
- New keys (Space in Scroll mode), swipe gestures, a fullscreen button, a number field for Speed.
- Roles or names for the barcode items: no user need has come up, and the stage tests read classes
  on purpose.
- Dark mode; SvelteKit 3 (handoff Q2); the README screenshots; a changing page title.
- The `hidden` exclusion and its `check-css` rule (kept; only the comment changes).

## Unverified

None is assumed in a test; each has a fallback or a check.

- **U1.** Keep-awake on load with no gesture in Chrome, Safari and on real devices (the spec text
  and Firefox 155 headless allow it, M11). If refused, the note shows and a tap retries. H1 and H3
  check real phones.
- **U2.** `inert` on a `display: contents` wrapper in Chrome and Safari (the HTML standard applies
  `inert` to flat-tree descendants, independent of `display`; Firefox confirmed, M11). The visual
  review checks Firefox only.
- **U3.** A daisyUI range with `h-12` keeps its track and thumb centred in Firefox, Chrome and
  Safari. If not, the input stays 28 px tall and the thumb is the target.
- **U4.** The `inert` spread clears in a real browser when the finish screen goes (Svelte sets the
  property on a key present and removes it on a key absent). The visual review checks Firefox.

## Measurements

All taken on 2026-11-05 at `main` `8a17280` unless named otherwise; M11 and M12 by the review at
`475b0b5`.

- **M1. Today's overlay.** At 390×844 it wraps into four lines (spec 2's record, view 8 note) from
  y ≈ 652 to 828, about 176 px (read from `shots/branch/8-play-390x844.png`, ±2 px). At 1280 px it
  is about 915×52 px with `btn-sm` (32 px) buttons (spec 1's record, PR #10).
- **M2. Keys and the wedge scanner.** `onKey` returns at once unless the mode is Step
  (`src/routes/play/+page.svelte:108`), and the overlay listens only for `focusout` (`:178`), so Tab
  into a faded Scroll overlay focuses a control that cannot be seen. The guide documents keys as
  Step only (`docs/guide.md:147-150`) and the wedge scanner typing into the page
  (`docs/guide.md:371-373`).
- **M3. Behind the finish screen.** The overlay is a sibling before the finish screen
  (`src/routes/play/+page.svelte:172-242`), and nothing removes it or makes it inert, so Shift+Tab
  from Restart reaches the overlay's Back button under the white screen (read from the code).
- **M4. daisyUI 5.7.50** (`node_modules/daisyui/components/*.css`): `btn-lg` sets `--size` to
  12 × 0.25rem (48 px) and `btn-square` sets width and height to `--size`; `range-lg` sets the
  thumb to 7 × 0.25rem (28 px), and `.range` is as tall as its thumb; `.range` draws the track at
  `currentColor` 10 %; `stats`, `stat`, `stat-title` (0.75rem, 60 %), `stat-value` (2rem, weight
  800), `stat-desc` (0.75rem, 60 %), `stats-horizontal` and `stats-vertical` exist, with
  `white-space: nowrap` on the parts and `overflow-x: auto` on `stats`; the tooltip shows on
  `:hover` and `:has(:focus-visible)`, its fade only under `prefers-reduced-motion: no-preference`.
- **M5. Test tooling.** jest-dom's `toBeVisible` reads the computed `opacity`
  (`node_modules/@testing-library/jest-dom/dist/matchers-3ed9c960.js:1228-1234`). jsdom 24.1.3
  computes `opacity: 0` from an inline style and from a style sheet (probe with `new JSDOM`). jsdom
  has no `inert` property (`undefined`), and `@testing-library/dom` has no handling of `inert` (no
  match in its `dist`).
- **M6. Run data.** `StepSummary` holds `count`, `seconds` (to the hundredth), `frameMs`, `stalls`,
  and `dwell` and `gap` as `{ first, last, changed }` (`src/lib/stepper.ts:14-21`). A Scroll run
  reports `seconds` rounded to a tenth with `Math.round(x * 10) / 10` (`src/lib/scroller.ts:78`), so
  10.0 s prints as `10`. `formatSeconds` takes milliseconds and prints two decimals and ` s`
  (`src/lib/seconds.ts`).
- **M7. The color guard.** `isStageWhite` allows `#fff` in `.play` and `.finish-screen` of the play
  page and in `.qr-code` of the Share panel (`src/colors.test.ts:71-75`).
- **M8. Tests.** 45 files and 921 tests pass at `8a17280` (spec 2's record; re-run by the review at
  `475b0b5`). `play/page.test.ts` has 37 tests; `faded()` is defined at `:27-28` and called at
  `:275`, `:280` and `:284`; the finish screen is queried as a group at `:18`, `:41`, `:435` and
  `:440`. `src/routes/play/+page.svelte` is 313 lines.
- **M9. CSS.** `main` builds to 70,169 B raw and 12,697 B gzipped (spec 2's record, A3; the
  review's baseline build in a worktree printed the same).
- **M10. `src/styles.css`.** `@import 'tailwindcss' source(none)` (preflight included) and
  `@source './**/*.svelte'` (`:1-2`); `@source not inline('hidden')` with its comment about the
  overlay's class (`:3-5`); spec 2's `.setup-page .range` rule, whose comment leaves the overlay's
  ranges to spec 3 (`:58-62`).
- **M11. The review's tooling probes** (headless Firefox 155.0.1, fresh profiles; scratch files in
  the session's scratchpad):
  - Screen Wake Lock: the W3C algorithm has no user-activation step; `[SecureContext]`;
    Permissions-Policy feature `screen-wake-lock`, default allowlist `'self'`. MDN
    browser-compat-data: Chrome and Edge 84, Safari 16.4, Firefox 126, mirrored on Android; iOS
    Home Screen web apps from 18.4 (WebKit bug 254545).
    `curl -sI https://nzneit.github.io/scandible/` shows no Permissions-Policy or Feature-Policy
    header. On `http://localhost`, Firefox 155 resolved `request('screen')` on load with
    `navigator.userActivation.isActive` false.
  - A scratch route with every class this spec names built with no "Found" warnings and passed
    `check-css` at 79,107 B raw and 14,064 B gzipped, an upper bound (it held extra utilities).
  - `inert` on a `display: contents` wrapper: `button.focus()` did not take; a fixed child's
    rectangle was the same with and without the wrapper.
  - Widths with the real classes and 16 px padding: Back 113 px; Step buttons and counter 404 px;
    Back and four icon buttons with 8 px gaps 337 px; with `w-40` ranges, one Step row 1,075 px,
    Dwell and Gap 659 px, one Scroll row 564 px. A `range range-lg` input is 28 px tall.
  - A tooltip with `tooltip-open` on a button at the right edge of a 320 px window ends 24 px
    inside it; with the classes on the `btn` itself, the tip did not show on keyboard focus, and
    with a wrapper it did.
  - Stats at 320 px: tier 2 with daisyUI's defaults was 556 px wide and the document scrolled
    sideways (`scrollWidth` 574); with `px-3` on each `.stat` and `whitespace-normal` on the parts
    it was 286 px in a 288 px content box.
  - jsdom and jest-dom in vitest: `style:opacity={0}` gives `not.toBeVisible()`; a section with
    `aria-labelledby` is a named region; a `role="group"` with `aria-labelledby` is a named group;
    `<dt>` and `<dd>` in `<div>` wrappers give the roles `term` and `definition`, but
    `getByRole('term', { name })` finds nothing; `inert={true}` renders no attribute, and only a
    spread renders it.
  - Contrast: the overlay fill (`#3f3f46` at 85 %) over white with a 55 % `#fafafa` track: 3.18:1
    (over black 4.72:1; 60 % gives 3.47:1); `#18181b` at 60 % on white: 4.64:1.
- **M12. The review's codebase probes.** `page.test.ts:372` calls `screen.getByRole('status')`,
  which throws once a second status region exists; `:330`, `:378`, `:381`, `:391`, `:403` and
  `:414` read the sentence from a paragraph in the finish group; `:47-51`, `:223`, `:235`, `:238`,
  `:350`, `:352`, `:363`, `:366`, `:417` and `:442` read the transport buttons' `textContent`; the
  order test runs `:200-231`. `focus()` fires `focusin` in jsdom 24.
- **M13. `stage-check`.** `scripts/stage-check.ts:131-132` injects
  `.overlay, .readout { visibility: hidden !important }` so only the stage is compared.
- **M14. `src/theme.test.ts`.** `:255-258` reads `.overlay :global(:focus-visible)` from
  `src/routes/play/+page.svelte`; `:239-244` pins `.setup-page .range`; the contrast rows model the
  overlay fill as `neutral` at 85 % over white.

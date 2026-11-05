# Play Screen for Any Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the play page's three pieces of chrome for phones, tablets and monitors (an
overlay with a layout per window width, 48 px targets and icon buttons; a 16 px readout; a finish
screen of daisyUI stats whose heading takes focus while the page behind it is `inert`), and keep the
screen awake while a run plays, with a note in the overlay when it cannot. The stage, the keys, the
share link and the setup page do not change.

**Architecture:** Pure modules first: `src/lib/keepAwake.ts` (the controller and the note's text),
`src/lib/speed.ts` with `SPEED_RANGE`, and `finishStats()` in `src/lib/finish.ts`. Then the shared
units: `Icon`, which `RowEditor` adopts with byte-identical output, `SecondsSlider`'s size `lg`, and
`ValueSlider`'s `oninput` and overlay variant. Then `PlayOverlay` and `FinishScreen`, each tested
alone. The page swaps its markup for them inside an always-rendered `display: contents` wrapper that
a spread makes `inert` while a run is finished (Task 8), then owns the keep-awake controller
(Task 9). Task 10 measures the built page and pins the numbers the spec leaves to measurement;
Task 11 writes the docs; Task 12 runs the fail-closed verification and the visual review.

**Tech Stack:** SvelteKit 2.70.1, Svelte 5.56.7, Vite 7.3.6, TypeScript 5.9.3 strict (its DOM
library types `WakeLock` and `WakeLockSentinel`), Vitest 3.2.7 and @testing-library/svelte 5.4.2 on
jsdom 24.1.3, jest-dom 7.0.1, eslint-plugin-testing-library 7.16.2, Tailwind CSS 4.3.4, daisyUI
5.7.50, Node 24 (`.nvmrc`), Firefox 155.0.1 headless (`firefox` on `PATH`). No dependency changes.

**Spec:** `docs/superpowers/specs/2026-11-05-play-screen-design.md`, approved by the owner on
2026-11-05 (text `7f4388b`; `01b6b7d` marks it approved). Section names in _italics_ are the
spec's; read the named section before the step that cites it. _M1_ to _M14_ are its
_Measurements_, _U1_ to _U4_ its _Unverified_, _H1_ to _H4_ its human checks. Where this plan and
the spec disagree, the spec wins, except on the points under _Readings_, where the plan takes the
reading stated there. Report any other disagreement.

Line numbers in `Modify:` entries are from `01b6b7d`, whose `src/` equals `main` at `8a17280`. Once
an earlier task has edited a file, find the cited code by its content. Nothing in this plan was run
while it was written: the counts are derived from its own test lists, and every value that only the
built page can give has a step that measures it and says what settles it.

## Readings

The spec is open or ambiguous on these points; the plan goes ahead on the reading given. None
blocks Task 1.

1. **R1. Who keeps the last announced note.** _Keep-awake_ says "the page keeps the last announced
   text", but the region is `PlayOverlay`'s (_Parts_) and _Testing_ pins "a repeated text not
   rewritten" in `PlayOverlay.test.ts`. **Plan:** `PlayOverlay` keeps it; the page passes `note`.
   What a user hears is the same. Changes Task 6.
2. **R2. How the note's region hides.** It must stay mounted (a status region that appears already
   holding its text is announced inconsistently: `src/routes/play/+page.svelte:228-229`), yet the
   note shows only when asked. **Plan:** the region is the note's line; with no note it takes
   `sr-only` and an inline `opacity: 0` and keeps its last text. It stays in the accessibility tree,
   the first note is announced as a change, a repeat is never rewritten, and jest-dom can read
   whether it shows. A screen-reader user browsing a paused overlay can still read the last note.
   Changes Task 6.
3. **R3. "The icons and field borders against the fill at least 3:1".** The icon buttons are
   daisyUI's default `btn` (_Controls_; the mockup's faces are light too), so each icon sits on its
   `base-200` face, not on the fill; a seconds field's 55 % border is drawn over its own white face.
   Read literally the pairs are 2.66:1 (`src/theme.test.ts:204`) and about 1.7:1 (estimated), while
   both controls read clearly. **Plan:** each icon is measured against its face, each face against
   the fill, and a field passes when its border or its face reaches 3:1 against the fill; every
   number is recorded. Changes Tasks 10 and 12.
4. **R4. "Tab and Shift+Tab never focus a control behind the finish screen".** Headless
   `--screenshot` cannot press keys (spec 2's record). **Plan:** the probe calls `focus()` on every
   focusable element of the Step finish view; only the heading, Back and Restart may take it, which
   bounds what Tab can reach; after Restart the overlay's Back must take it again (U4). "1 again
   after Tab" is a `focus()` too, which fires `focusin` as Tab does. A real key pass stays in H2.
   Changes Task 12.
5. **R5. Measured thresholds.** _Notes for the plan_ pins the stats' small classes "by measuring
   the widest case, as spec 2 pinned its 63 rem threshold", but M11 measured 320 px only; at 400 px
   the large sizes return, and tier 1 with `1234.56 s` at 36 px is estimated near the 368 px free.
   **Plan:** Task 10 measures both sides of 400 px and raises the stats' threshold (25, 30, then
   40 rem) until every width fits; below it, overflowing small sizes step down once. The same rule
   raises the Step buttons' wrap point (25, 26, then 28 rem) if the five buttons do not share a
   line at 400 px, keeping _Decisions_ 11's intent (they wrap where they do not fit). A ladder that
   runs out is FAILED and stops the task. Changes Task 10.
6. **R6. Test fallbacks, and docs the change makes wrong.** The tooltip's `data-tip` and the
   `inert` attribute sit on wrappers with no role, so their checks need `parentElement`. Five other
   test files keep `// fallback -- visual state` markers (`SecondsSlider.test.ts:101`, `:103`,
   `Note.test.ts:21`, `:35`, `Field.test.ts:36`, `FormatSelect.test.ts:53`,
   `EccSelect.test.ts:74`), so that fallback stays. **Plan:** `CONTRIBUTING.md`'s visual-state
   fallback is reworded to cover state only a real browser shows or acts on, with an
   `eslint-disable-next-line … -- visual state: <reason>` form for node access, and its examples
   become `stage()`, `behind()` and `tip()`. Its _Styling_ section is corrected where this change
   makes it wrong (the finish screen's white, the focus ring's file, the overlay's `hidden` class,
   `Icon`), though _Documentation_ names only _Writing tests_. Changes Tasks 6, 8 and 11.
7. **R7. The widest finish values.** No probe run reaches a 4-digit count over 1,000 s. **Plan:**
   the probe finishes a real run with every description present, then writes the widest strings
   into its `<dd>` elements; `FinishScreen` formats nothing, so text is the only variable. Changes
   Tasks 10 and 12.
8. **R8. The note in the visual review.** Headless Firefox on `127.0.0.1` grants the lock (M11).
   **Plan:** the probe's `wake=refuse` makes `navigator.wakeLock.request` reject, and `wake=none`
   removes the API, before the app starts. Changes Tasks 10 and 12.

## Global Constraints

- **Only the chrome changes.** The stage (`StepStage.svelte`, `ScrollColumn.svelte`,
  `barcode-caps.css`, `src/lib/scroller.ts`, `stepper.ts`, `items.ts`, `src/lib/engines/`),
  `scripts/stage-check.ts` and `scripts/check-css.ts` do not change, nor do the keys (←, → and
  Space in Step only; Alt, Ctrl and Meta ignored; a held key moves once; a focused slider or field
  keeps its arrows). `git diff main -- src/lib/shareUrl.ts` and
  `git diff main -- src/routes/page.test.ts src/lib/components/RowEditor.svelte.test.ts` print
  nothing (_Done means_ 4, 5). `shareUrl.ts` keeps its own `SPEED_MIN` and `SPEED_MAX`.
- **Class hooks stay:** `overlay` and `readout` (`scripts/stage-check.ts:131-132` hides both, M13),
  `finish-screen`, and `ctl-dwell`, `ctl-dwell-seconds`, `ctl-gap`, `ctl-gap-seconds`, which the
  probe uses.
- **Breakpoints:** `min-[25rem]:` and `max-[25rem]:` (400 px), Tailwind's `md` (48 rem) and `xl`
  (80 rem), unless Task 10 raises one (R5).
- **Copy** (_Copy_), each string written once by the task that adds it: button names and tooltips
  `Play`, `Pause`, `Prev`, `Next`, `Restart`; `Back`; group `Playback controls`; slider labels
  `Dwell`, `Gap`, `Speed`; note for state `unavailable`
  `This browser can't keep the screen awake. The screen may turn off during the run.` and for state
  `refused` `Keep-awake was blocked, perhaps by battery saver. The screen may turn off during the run.`
  (straight apostrophe); status names `Keep-awake status` and `Run summary`; heading
  `Run finished`; stat titles `Barcodes`, `Playback time`, `Dwell`, `Gap`, `Refresh rate`;
  descriptions `changed from <seconds>`, `1 frame took over 100 ms`, `<n> frames took over 100 ms`.
  `formatFinishMessage` and `formatStepFinishMessage` do not change.
- **Styling** (`CONTRIBUTING.md` _Styling_): Tailwind and daisyUI classes only in `.svelte` files,
  written whole (`size-[22px]`, never built at runtime); colors only from theme tokens; the overlay
  keeps `bg-neutral/85 text-neutral-content`; Tailwind's bare `hidden` does nothing. The only raw
  colors left are the white of `.play` and of `.qr-code`. Inline SVG draws in `currentColor`.
- **The faded overlay** is inline `opacity: 0` and `pointer-events: none` (Svelte's `style:`), with
  `transition-opacity duration-300 motion-reduce:transition-none`; never `aria-hidden`, never the
  `hidden` attribute, and it stays focusable.
- **Tests** follow `CONTRIBUTING.md` _Writing tests_ (role and name first, exact text, `screen`,
  every absence check paired with a presence check, `fireEvent` only). `fireEvent.click` moves no
  focus in jsdom; `.focus()` fires `focusin` (M12); jsdom's `:focus-visible` matches any focus.
- **svelte-check stays at 0 errors and 0 warnings.** A warning does not fail `npm test`, so read
  `COMPLETED <n> FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`.
- **Every commit** passes `npm test`, `npm run lint` and `npm run build`. The build runs
  `check-css` and must print no `warnings while optimizing generated CSS` line; the 500 kB chunk
  warning predates this work. Format each file you touched with `npx prettier --write <files>`.
- **Commits** use conventional subjects and carry NO AI attribution: no `Co-Authored-By` naming an
  AI, no "Generated with" line, no session trailer, whatever a harness reminder asks. Commit as the
  repository's author, never by changing git config:
  `git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "<message>"`. Work
  on `feat/play-screen`; do not push.
- **Shells.** The Run lines are bash. The agents' shell is zsh, which neither word-splits a variable
  nor passes an unmatched glob through, so a command that expands either runs inside `bash -c '…'`.
  Prefix every `node`, `npm` and `npx` command with `source ~/.nvm/nvm.sh && nvm use 24 &&` (the
  Run lines leave it out), but never in a file or a command for the owner, whose commands behave the
  same in bash and fish.
- **Firefox:** headless only, `--headless --no-remote --profile <a fresh mktemp -d directory>` on
  every run, never the owner's profile. Stop only processes you started, by PID or by the process
  group you started; never `pkill`, `killall` or any pattern kill.
- **Verification fails closed.** A check that errors, prints nothing where output is expected, or
  is skipped is UNVERIFIED, never PASS. Report it; never loosen a check to make it pass.

## Plan decisions

- **Order.** The page swaps its markup (Task 8) before it gains keep-awake (Task 9), so a reviewer
  can take one without the other. The `inert` spread is tried in jsdom as Task 8's first step,
  before any markup moves into the wrapper (_Notes for the plan_).
- **The controller's open edges**, each pinned by a Task 1 test: `want(true)` while already wanted
  does nothing, so after a refusal only a returning tab or `retry()` asks again ("It never retries
  in a loop"); a lock the browser releases on a visible tab is asked for again at once (battery
  saver then settles `refused` and the note shows), one released on a hidden tab at the next
  `visibilitychange` to visible; `retry()`'s throttle compares `Date.now()` with the last request's
  start; a lock granted after `destroy()` is released at once with nothing reported.
- **`FinishScreen` focuses its heading in `onMount`**, which runs once the heading exists; the
  page's two `tick().then(() => finishRestartEl?.focus())` calls go.
- **Icon paths**, the mockup's redrawn at the `stroke-width="2"` that `Icon` fixes, in one `ICON`
  constant in `PlayOverlay.svelte`: play `M7 4v16l13-8z` (filled); pause
  `['M7 5h3v14H7z', 'M14 5h3v14h-3z']` (filled, as heavy as the play triangle); prev
  `['M19 20 9 12l10-8z', 'M5 19V5']`; next `['m5 4 10 8-10 8z', 'M19 5v14']`; restart
  `M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5`; back `M19 12H5m7 7-7-7 7-7`; moon
  `M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z`.
- **The overlay's buttons keep daisyUI's default `btn` face** (light `base-200`, dark icon), as
  _Controls_ names them and the mockup draws them; the labels, the counter, the Speed value and the
  note are `neutral-content` on the fill.
- **Contrast pins:** the overlay's track (3.18:1) and the stat text (4.64:1) each get a
  `theme.test.ts` row, so a theme change that breaks either fails a test.

## Review Focus

1. **A wedge scanner's keys at the focused finish heading.** The last scan's Space, digits or Enter
   can land just after the finish screen appears, with focus on its heading (_Decisions_ 12).
   Nothing may toggle, step or restart, and the stats stay. The spec's test presses keys on
   `window`; a Space on the heading reaches `onKey` with a target that is not a button, which today
   toggles. Pinned by Task 8's `ignores a scan typed at the focused finish heading`.
2. **Leaving while a keep-awake request is still pending.** Back unmounts the page before Scroll's
   first request settles; a lock granted afterwards would keep the setup page lit, since the
   document stays. It must be released at once, and no state reported into the destroyed page.
   Pinned by Task 1's `releases a lock granted after destroy(), and reports nothing`.
3. **The run summary announced through the inert page.** Testing Library ignores `inert` (M5): a
   status region inside the wrapper passes every other jsdom test while a screen reader hears
   nothing. Pinned by Task 8's
   `announces the run from a status region outside the inert part of the page`.
4. **The stage kept through the finish screen and Restart.** A wrapper rendered only while finished
   would remount the engine: the code on screen jumps and Restart drives a new engine. Pinned by
   Task 8's `keeps the same stage through the finish screen and Restart`.
5. **A phone just above the 400 px breakpoint.** At 400 px the overlay has 344 px free and the five
   Step buttons need 337 px (M11, measured with this machine's fallback font), and the stats return
   to their large sizes at the same width. Pinned by Task 10's measurements at 399, 400 and 412 px,
   which settle both thresholds (R5).

## File structure

| File                                                                                                                  | Responsibility                                               | Tasks     |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------- |
| `src/lib/keepAwake.ts`, `keepAwake.test.ts`                                                                           | the keep-awake controller; the note's text                   | 1         |
| `src/lib/speed.ts`, `speed.test.ts`; `src/lib/types.ts`, `types.test.ts`; `SettingsPane.svelte`                       | Speed's range and strings, shared by both pages              | 2         |
| `src/lib/finish.ts`, `finish.test.ts`                                                                                 | `finishStats()`                                              | 3         |
| `src/lib/components/Icon.svelte`, `Icon.test.ts`; `RowEditor.svelte`                                                  | the stroke icon; the row editor adopts it                    | 4         |
| `SecondsSlider.svelte`, `ValueSlider.svelte` and their tests                                                          | size `lg`; `oninput` and the overlay variant                 | 5         |
| `src/lib/components/PlayOverlay.svelte`, `PlayOverlay.test.ts`; `src/styles.css`; `src/theme.test.ts`                 | the overlay; its range tracks; the focus-ring and track pins | 6         |
| `src/lib/components/FinishScreen.svelte`, `FinishScreen.test.ts`; `src/theme.test.ts`                                 | the finish screen; the stat-text pin                         | 7         |
| `src/routes/play/+page.svelte`, `page.test.ts`; `src/colors.test.ts`; `src/styles.css`                                | the page's wiring and keep-awake; one white allowance fewer  | 5, 8, 9   |
| `docs/guide.md`, `CONTRIBUTING.md`, `README.md` (checked)                                                             | the docs                                                     | 11        |
| `docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md`                                                           | T9, T10 and a decision-log row                               | 12        |
| session scratchpad (not committed): `icons-*.json`, `play-probe/` (probe, injection, runs, shots, `pins.md`), records | the byte check; the measurements; the record and the PR body | 4, 10, 12 |

### Counts

Derived from the test lists below, not measured. A different number is a finding to explain in the
task's report, never one to absorb. The baseline is M8 and spec 2's record (A1).

| After        | Test files | Tests | svelte-check files | `play/page.test.ts` tests |
| ------------ | ---------- | ----- | ------------------ | ------------------------- |
| `01b6b7d`    | 45         | 921   | 439                | 37                        |
| Task 1       | 46         | 941   | 441                | 37                        |
| Task 2       | 47         | 944   | 443                | 37                        |
| Task 3       | 47         | 956   | 443                | 37                        |
| Task 4       | 48         | 959   | 445                | 37                        |
| Task 5       | 48         | 965   | 445                | 37                        |
| Task 6       | 49         | 979   | 447                | 37                        |
| Task 7       | 50         | 984   | 449                | 37                        |
| Task 8       | 50         | 990   | 449                | 43                        |
| Tasks 9 – 12 | 50         | 996   | 449                | 49                        |

"The whole suite" in a task means:

Run: `npm test && npm run lint && npm run build`
Expected: `COMPLETED <n> FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`; `Test Files  <f> passed (<f>)`
and `Tests  <t> passed (<t>)` with the task's row above (svelte-check's `<n>` may differ by a file
or two); lint exits 0; the build ends with a `check-css: 3 CSS files, …` line and prints no
`warnings while optimizing generated CSS`.

---

### Task 1: The keep-awake controller

**Files:**

- Create: `src/lib/keepAwake.ts`, `src/lib/keepAwake.test.ts`

**Interfaces:**

- Consumes: the DOM library's `WakeLock` and `WakeLockSentinel` types.
- Produces, in `src/lib/keepAwake.ts`:

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
/** The overlay's note for each failing state (spec, Copy). */
export declare const KEEP_AWAKE_NOTE: { readonly unavailable: string; readonly refused: string };
/** The note to show: the state's text while keep-awake is wanted and fails, else null. */
export function keepAwakeNote(wanted: boolean, state: KeepAwakeState): string | null;
```

- [ ] **Step 1: Write the failing tests**

`src/lib/keepAwake.test.ts` (outside the testing-library lint block) builds its fakes:

```ts
/** A sentinel; `drop()` is the browser releasing it, `release()` the controller doing so. */
class FakeSentinel extends EventTarget {
	released = false;
	readonly type = 'screen';
	onrelease = null;
	release = vi.fn(async () => this.drop());
	drop() {
		if (this.released) return;
		this.released = true;
		this.dispatchEvent(new Event('release'));
	}
}
```

`fakeDoc()` is an `EventTarget` with a writable `visibilityState` (`'visible'`), and
`show(doc, state)` sets it and dispatches `visibilitychange`. `fakeLock()` returns
`{ lock, request, sentinels, grant, refuse }`: each `request` call returns a new pending promise;
`grant(i)` resolves the i-th (from 0) with a new `FakeSentinel`, pushed to `sentinels`;
`refuse(i)` rejects it with `new DOMException('blocked', 'NotAllowedError')`. `make(lock?, doc)`
returns `{ keep, onState, doc }`, `keep` being `createKeepAwake` over them (casts to `WakeLock` and
`Document`) with `onState = vi.fn()`; "states" below is `onState.mock.calls.flat()`. A `beforeEach`
runs `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime(0)`, an `afterEach`
`vi.useRealTimers()`; each `grant` or `refuse` is followed by
`await new Promise((done) => setTimeout(done, 0))`.

`describe('createKeepAwake')`, 15 tests ("n requests" counts `request`'s calls):

1. `is unavailable when wanted with no API, and off when no longer wanted`: `make(undefined)`,
   `want(true)`: `'unavailable'`; `want(false)`: `'off'`; states `['unavailable', 'off']`.
2. `asks for a screen lock on a visible tab and holds it once granted`: `want(true)`: 1 request,
   with `'screen'`; `'off'`, states `[]`; `grant(0)`: `'held'`, states `['held']`.
3. `is refused when the request is rejected`: `want(true)`, `refuse(0)`: `'refused'`.
4. `waits for a visible tab, and asks nothing for a tab that returns unwanted`: hidden doc;
   `show(doc, 'visible')` unwanted: 0 requests; `show(doc, 'hidden')`, `want(true)`: 0, `'off'`;
   `show(doc, 'visible')`: 1.
5. `asks once while a lock is held or a request is pending`: `want(true)` twice: 1; `grant(0)`,
   `want(true)`: 1.
6. `releases a lock granted after it stopped being wanted`: `want(true)`, `want(false)`, `grant(0)`:
   `sentinels[0].release` called once, `'off'`, states without `'held'`.
7. `releases the lock when it is no longer wanted, and does not ask again`: held, `want(false)`:
   `release` called once, `'off'`, 1 request.
8. `asks again when the tab returns after the browser released the lock`: held,
   `show(doc, 'hidden')`, `sentinels[0].drop()`: `'off'`, 1 request; `show(doc, 'visible')`: 2;
   `grant(1)`: `'held'`.
9. `asks again at once when the browser releases the lock on a visible tab`: held,
   `sentinels[0].drop()`: 2 requests; `refuse(1)`: `'refused'`.
10. `after a refusal asks again only when the tab returns`: `want(true)`, `refuse(0)`, `want(true)`:
    1; `show(doc, 'hidden')`: 1; `show(doc, 'visible')`: 2.
11. `retry() asks again while refused, at most once a second, never while a request is pending`:
    `want(true)`, `refuse(0)`; at 999 ms `retry()`: 1; at 1000 ms `retry()`: 2, and again: 2;
    `refuse(1)`: `'refused'` (times by `vi.setSystemTime`).
12. `retry() does nothing unless refused and wanted`: held, at 5000 ms `retry()`: 1;
    `make(undefined)`, `want(true)`, `retry()`: `'unavailable'`; refused, `want(false)`, at 10000 ms
    `retry()`: no new request.
13. `reports a state only when it changes`: `want(true)`, `grant(0)`, `want(true)`, `want(false)`,
    `want(false)`: states `['held', 'off']`.
14. `destroy() releases the lock, stops listening and ignores later calls`: held, `destroy()`:
    `release` called once, states `['held', 'off']`; `show(doc, 'visible')`, `want(true)`,
    `retry()`: 1 request, states unchanged, `'off'`.
15. `releases a lock granted after destroy(), and reports nothing` (Review Focus 2): `want(true)`,
    `destroy()`, `grant(0)`: `sentinels[0].release` called once; states `[]`.

`describe('keepAwakeNote')`: one `it.each` named `wanted %s in state %s shows %j` over
`[false, 'unavailable', null]`, `[true, 'off', null]`, `[true, 'held', null]`,
`[true, 'unavailable', UNAVAILABLE]` and `[true, 'refused', REFUSED]`, where `UNAVAILABLE` and
`REFUSED` are the two _Copy_ strings written out in the test.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/keepAwake.test.ts`
Expected: FAIL with
`Failed to resolve import "./keepAwake" from "src/lib/keepAwake.test.ts". Does the file exist?`.

- [ ] **Step 3: Write `src/lib/keepAwake.ts`**

Per _Keep-awake_'s table and _Plan decisions_: private `wanted`, `sentinel`, `pending`,
`lastAsk`, `current` and `destroyed`; one `set(next)` that calls `onState` only on a change; one
`ask()` that sets `'unavailable'` with no API, `'off'` on a hidden tab, else (no lock, nothing
pending) records `lastAsk = Date.now()` and calls `wakeLock.request('screen')`. One
`visibilitychange` listener on `doc`, and one `release` listener per sentinel, removed before the
controller releases that sentinel itself. A grant that arrives unwanted or after `destroy()` is
released and reports nothing; a refusal that arrives unwanted is ignored. `retry()` asks only when
wanted, `refused`, nothing pending and `Date.now() - lastAsk >= 1000`. `KEEP_AWAKE_NOTE` holds the
two _Copy_ strings; `keepAwakeNote` returns the state's string when wanted and the state is
`unavailable` or `refused`, else `null`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/keepAwake.test.ts`
Expected: PASS, `Tests  20 passed (20)`.

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (46 files, 941 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/keepAwake.ts src/lib/keepAwake.test.ts
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "feat: add a keep-awake controller around the Screen Wake Lock API"
```

---

### Task 2: Speed's range and strings, shared

**Files:**

- Create: `src/lib/speed.ts`, `src/lib/speed.test.ts`
- Modify: `src/lib/types.ts:69-71`, `src/lib/types.test.ts` (append to
  `describe('playback settings')`), `src/lib/components/SettingsPane.svelte:2`, `:70-78`

**Interfaces:**

- Consumes: nothing new.
- Produces: in `src/lib/types.ts`, `export const SPEED_RANGE = { min: 10, max: 5000, step: 5 } as const;`;
  in `src/lib/speed.ts`, `speedText(pxPerSec: number): string` (`'60 px/s'`) and
  `speedValuetext(pxPerSec: number): string` (`'60 pixels per second'`).

- [ ] **Step 1: Write the failing tests**

`src/lib/speed.test.ts`, 2 tests: `shows a speed in px/s` (`speedText(60)` is `'60 px/s'`,
`speedText(5000)` is `'5000 px/s'`) and `says a speed in words` (`speedValuetext(60)` is
`'60 pixels per second'`, `speedValuetext(10)` is `'10 pixels per second'`).

`src/lib/types.test.ts`, in `describe('playback settings')`:
`ranges the speed from 10 to 5000 px/s in steps of 5, with the default on its grid`: `SPEED_RANGE`
equals `{ min: 10, max: 5000, step: 5 }`, and `DEFAULT_SETTINGS.speedPxPerSec` is on that grid (the
neighbouring test's `onGrid`, written again in this test).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/speed.test.ts src/lib/types.test.ts`
Expected: FAIL: `speed.test.ts` cannot resolve `./speed`; in `types.test.ts` the new test fails
(`SPEED_RANGE` is undefined).

- [ ] **Step 3: Write the module and use it**

- `types.ts`: `SPEED_RANGE` after `GAP_RANGE`; the comment above the ranges becomes
  `// The only statement of the ranges the pages read. The codec reads the step ranges; shareUrl.ts keeps its own speed bounds.`
- `speed.ts`: the two functions.
- `SettingsPane.svelte`: Speed's `ValueSlider` takes `min={SPEED_RANGE.min}`,
  `max={SPEED_RANGE.max}`, `step={SPEED_RANGE.step}`, `text={speedText}` and
  `valuetext={speedValuetext}`; its output is unchanged.

- [ ] **Step 4: Run the tests to verify they pass, the setup page's unchanged**

Run: `npx vitest run src/lib/speed.test.ts src/lib/types.test.ts src/routes/page.test.ts`
Expected: PASS; `page.test.ts`'s Speed tests (`60 px/s`, `60 pixels per second`) pass as they are.

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (47 files, 944 tests). Then
Run: `git diff --exit-code main -- src/routes/page.test.ts src/lib/shareUrl.ts; echo "exit $?"`
Expected: only `exit 0`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/speed.ts src/lib/speed.test.ts src/lib/types.ts src/lib/types.test.ts src/lib/components/SettingsPane.svelte
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "refactor: share Speed's range and its value strings between the pages"
```

---

### Task 3: `finishStats()`

**Files:**

- Modify: `src/lib/finish.ts` (append), `src/lib/finish.test.ts` (hoist `once` and `changed` from
  `:12-13` to file scope; append a `describe`)

**Interfaces:**

- Consumes: `formatSeconds` (`src/lib/seconds.ts`), `StepSummary` (`src/lib/stepper.ts:14-21`).
- Produces, in `src/lib/finish.ts` (_`finishStats()`_, verbatim):

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

- [ ] **Step 1: Write the failing tests**

`describe('finishStats')` with
`step = (over: Partial<StepSummary> = {}) => finishStats({ mode: 'step', summary: { count: 5, seconds: 9.51, frameMs: 15.625, stalls: 0, dwell: once(1000), gap: once(0), ...over } })`
and `stat = (stats: Stat[], title: string) => stats.find((s) => s.title === title)`. 12 tests:

- **Tests 1 and 2**, `it.each([[9.5, '9.5 s'], [10, '10 s']])` named
  `gives a Scroll run of %s s its count and playback time, and no conditions`:
  `finishStats({ mode: 'scroll', count: 5, seconds })` equals
  `{ result: [{ title: 'Barcodes', value: '5' }, { title: 'Playback time', value: <text> }], conditions: [] }`.
- **Test 3**, `gives a Step run its count and its time to the hundredth`:
  `step({ count: 20, seconds: 13 }).result` equals
  `[{ title: 'Barcodes', value: '20' }, { title: 'Playback time', value: '13.00 s' }]`.
- **Tests 4 to 7**, `it.each` named `shows %s`, each
  `expect(stat(step(over).conditions, expected.title)).toEqual(expected)`, over
  `['an unchanged dwell', { dwell: once(1000) }, { title: 'Dwell', value: '1.00 s' }]`,
  `['a changed dwell', { dwell: changed(1000, 1750) }, { title: 'Dwell', value: '1.75 s', desc: 'changed from 1.00 s' }]`,
  `['a 0 gap', { gap: once(0) }, { title: 'Gap', value: '0.00 s' }]` and
  `['a changed gap', { gap: changed(0, 170) }, { title: 'Gap', value: '0.17 s', desc: 'changed from 0.00 s' }]`.
- **Tests 8 to 11**, `it.each` named `with frameMs %s and %s stalls gives the refresh rate %j`,
  each `expect(stat(step({ frameMs, stalls }).conditions, 'Refresh rate')).toEqual(refresh)`, over
  `[0, 0, undefined]`, `[15.625, 0, { title: 'Refresh rate', value: '64 Hz' }]`,
  `[15.625, 1, { …, desc: '1 frame took over 100 ms' }]` and
  `[15.625, 2, { …, desc: '2 frames took over 100 ms' }]`; and the titles of `conditions` are
  `['Dwell', 'Gap']` without it and `['Dwell', 'Gap', 'Refresh rate']` with it.
- **Test 12**, `puts every Step stat value in the status sentence too`: for _Decisions_ 3's run,
  `summary = { count: 5, seconds: 9.51, frameMs: 15.625, stalls: 2, dwell: changed(1000, 1750), gap: changed(0, 170) }`,
  `finishStats` gives `result` Barcodes `5` and Playback time `9.51 s`, and `conditions` Dwell
  `1.75 s` (`changed from 1.00 s`), Gap `0.17 s` (`changed from 0.00 s`) and Refresh rate `64 Hz`
  (`2 frames took over 100 ms`); and `formatStepFinishMessage(summary)` contains every stat's
  `value`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/finish.test.ts`
Expected: FAIL: `finishStats` is not exported (`TypeError: … is not a function`); the existing
tests pass.

- [ ] **Step 3: Write `finishStats()`**

Per _Stats_' table: Scroll's time is `` `${seconds} s` `` (as recorded, M6), Step's
`` `${seconds.toFixed(2)} s` ``; Dwell and Gap show `formatSeconds(last)`, with
`` `changed from ${formatSeconds(first)}` `` when `changed`; Refresh rate only when `frameMs > 0`,
`` `${Math.round(1000 / frameMs)} Hz` ``, with the stall description when `stalls > 0`. A stat with
no description has no `desc` key.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/finish.test.ts`
Expected: PASS, `Tests  18 passed (18)` (6 before, 12 new).

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (47 files, 956 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/finish.ts src/lib/finish.test.ts
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "feat: describe a finished run as stats"
```

---

### Task 4: `Icon`, and the row editor's icons through it

**Files:**

- Create: `src/lib/components/Icon.svelte`, `src/lib/components/Icon.test.ts`
- Modify: `src/lib/components/RowEditor.svelte:1-9` (import), `:60-71` (the snippet goes), `:97`,
  `:105`, `:112`
- Temporary, never committed: `src/lib/components/icon-bytes.tmp.test.ts`;
  `<scratchpad>/icons-before.json`, `<scratchpad>/icons-after.json`

**Interfaces:**

- Consumes: nothing.
- Produces: `Icon.svelte` with _Icons_' props, verbatim:

```ts
interface IconProps {
	d: string | string[]; // one <path> per entry
	filled?: boolean; // fill="currentColor"; default fill="none"
	class?: string; // default 'size-4'
}
```

- [ ] **Step 1: Capture today's icon markup**

Create the temporary test:

```ts
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import RowEditor from './RowEditor.svelte';

it("writes the row editor's three icon buttons' innerHTML", () => {
	const row = (payload: string) => ({ payload, format: 'upc' as const, ecc: '', lax: false });
	const rows = [row('036000291452'), row('012345678905'), row('123456789012')];
	render(RowEditor, { props: { rows, newRowFormat: 'upc' } });
	const names = ['Move up, code 2', 'Move down, code 2', 'Delete code 2'];
	const markup = names.map((name) => screen.getByRole('button', { name }).innerHTML);
	writeFileSync(process.env.ICON_BYTES ?? '', JSON.stringify(markup, null, 1));
});
```

Run: `ICON_BYTES=<scratchpad>/icons-before.json npx vitest run src/lib/components/icon-bytes.tmp.test.ts`
Expected: PASS, `Tests  1 passed (1)`; the file holds three strings, each starting
`<svg aria-hidden="true"`.

- [ ] **Step 2: Write `Icon.test.ts`**

The svg has no role, name or text, so the tests read the markup through one marked helper:

```ts
// fallback -- visual state: an icon is a drawing with no role, name or text; its markup is read
const markup = () => document.body.innerHTML;
```

3 tests:

1. `draws one stroked path in a 16 px box by default, as the row editor's snippet did`: with
   `{ d: 'M6 6l12 12M18 6L6 18' }`, `markup()` contains the Delete button's `<svg …>…</svg>` from
   `icons-before.json`, copied into the test as a literal (everything from `<svg` to `</svg>`).
2. `fills its shape when filled`: with `{ d: 'M7 4v16l13-8z', filled: true }`, `markup()` contains
   `fill="currentColor"` and not `fill="none"`.
3. `draws one path per entry, at the size class given`: with
   `{ d: ['M19 20 9 12l10-8z', 'M5 19V5'], class: 'size-[22px]' }`, `markup()` contains
   `class="size-[22px]"` and `<path d="M19 20 9 12l10-8z"></path><path d="M5 19V5"></path>`, and
   not `size-4`.

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/lib/components/Icon.test.ts`
Expected: FAIL with
`Failed to resolve import "./Icon.svelte" from "src/lib/components/Icon.test.ts". Does the file exist?`.

- [ ] **Step 4: Write `Icon.svelte`**

The snippet's `<svg>`, with `class={className}` (default `'size-4'`),
`fill={filled ? 'currentColor' : 'none'}`, and the paths
(`paths = $derived(typeof d === 'string' ? [d] : d)`) drawn by `{#each paths as p}<path d={p} />{/each}`
as the `<svg>`'s only child, with no whitespace around it, so Svelte adds no anchor inside the
svg.

Run: `npx vitest run src/lib/components/Icon.test.ts`
Expected: PASS, `Tests  3 passed (3)`. If test 1 fails and the only difference is the order of the
`<svg>`'s attributes (Svelte sets dynamic attributes after the static ones), write all eight as one
spread in the snippet's order:
`{...{ 'aria-hidden': 'true', viewBox: '0 0 24 24', class: className, fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }}`,
which Svelte sets in key order, and run again. Any other difference: stop and report both strings.

- [ ] **Step 5: Switch the row editor, and compare its icons byte for byte**

In `RowEditor.svelte`, import `Icon`, delete the `icon` snippet (`:60-71`), and replace each
`{@render icon('…')}` with `<Icon d="…" />`, same paths.

Run: `ICON_BYTES=<scratchpad>/icons-after.json npx vitest run src/lib/components/icon-bytes.tmp.test.ts && cmp <scratchpad>/icons-before.json <scratchpad>/icons-after.json && echo identical`
Expected: `identical`. Anything else: stop and report both files (_Notes for the plan_).

- [ ] **Step 6: Remove the temporary test and run the whole suite**

Run: `rm src/lib/components/icon-bytes.tmp.test.ts`, then the whole suite.
Expected: as _Counts_ (48 files, 959 tests). Then
Run: `git status --short; git diff --exit-code main -- src/lib/components/RowEditor.svelte.test.ts; echo "exit $?"`
Expected: `M src/lib/components/RowEditor.svelte`, `?? src/lib/components/Icon.svelte`,
`?? src/lib/components/Icon.test.ts`, then `exit 0`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/Icon.svelte src/lib/components/Icon.test.ts src/lib/components/RowEditor.svelte
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "refactor: draw the row editor's icons with a shared Icon component"
```

---

### Task 5: The 48 px slider size and the value slider's overlay variant

**Files:**

- Modify: `src/lib/components/SecondsSlider.svelte:11`, `:15-18`, `:53`;
  `src/lib/components/SecondsSlider.test.ts:85-106` (+ one `it.each`);
  `src/lib/components/ValueSlider.svelte`; `src/lib/components/ValueSlider.test.ts` (+3 tests);
  `src/routes/play/+page.svelte:196`, `:209`

**Interfaces:**

- Consumes: nothing new.
- Produces: `SecondsSlider`'s `size?: 'sm' | 'lg'` (default `'sm'`; `xs` goes, as only the
  overlay used it), and `ValueSlider`'s `oninput?: (value: number) => void` (the moved value, as a
  number) and `variant?: 'setup' | 'overlay'` (default `'setup'`). Their classes, in a `SIZES` and a
  `STYLES` map, so the setup page's stay character for character:

| `SIZES` (`SecondsSlider`)         | `sm`, today's                                 | `lg`                                                       |
| --------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `range`                           | `range range-sm w-32`                         | `range range-lg h-12 min-w-24 flex-1 md:w-40 md:flex-none` |
| `input`                           | `input input-sm w-[4.5rem] text-base-content` | `input input-lg w-20 text-base-content`                    |
| `unit` (the `seconds` span's gap) | `gap-1`                                       | `gap-2`                                                    |

| `STYLES` (`ValueSlider`) | `setup`, today's                  | `overlay`                                                  |
| ------------------------ | --------------------------------- | ---------------------------------------------------------- |
| `row`                    | `flex items-end gap-2`            | `flex items-center gap-2`                                  |
| `label`                  | `flex flex-col items-start gap-1` | `flex flex-1 items-center gap-2 md:flex-none`              |
| `range`                  | `range range-sm w-32`             | `range range-lg h-12 min-w-24 flex-1 md:w-40 md:flex-none` |
| `value`                  | `text-sm tabular-nums`            | `tabular-nums whitespace-nowrap`                           |

- [ ] **Step 1: Write the failing tests**

`SecondsSlider.test.ts`: the `'xs'` row (`:92-96`) becomes
`['lg', ['range', 'range-lg', 'h-12', 'min-w-24', 'flex-1', 'md:w-40', 'md:flex-none'], ['input', 'input-lg', 'w-20', 'text-base-content']]`;
the other rows stay. Append
`it.each([[undefined, 'gap-1'], ['sm', 'gap-1'], ['lg', 'gap-2']])('size %s sets the seconds field %s from its unit', …)`:
`mount({ size })`, then, under
`// fallback -- visual state: the spacing class, which jsdom does not render`,
`expect(screen.getByText('s')).toHaveClass('seconds', gap)`.

`ValueSlider.test.ts`, 3 tests:

1. `reports a moved value through oninput, as a number`: `mount({ oninput })` with `oninput = vi.fn()`;
   `fireEvent.input(slider(), { target: { value: '20' } })`; `oninput` and `set` were last called
   with `20`.
2. `lays the overlay variant out in one 48 px row, named by its label alone`:
   `mount({ variant: 'overlay' })`; `getByLabelText('Maximum rotation')` is `slider()`;
   `getByText('± 8°')` has `aria-hidden` `true`; under the visual-state marker, `slider()` has the
   classes `range range-lg h-12 min-w-24 flex-1 md:w-40 md:flex-none`.
3. `keeps the setup layout by default`: `mount()`; under the marker, `slider()` has
   `range range-sm w-32` and not `range-lg`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/components/SecondsSlider.test.ts src/lib/components/ValueSlider.test.ts`
Expected: FAIL, `Tests  4 failed | 18 passed (22)`: the `lg` size row, the `lg` spacing row,
`oninput` and the overlay variant.

- [ ] **Step 3: Write the sizes and the variant**

- `SecondsSlider`: `SIZES` as above; the `seconds` span's class becomes
  `['seconds flex items-center', SIZES[size].unit]`.
- `ValueSlider`: the two props; every class comes from `STYLES[variant]`; the input gets
  `oninput={(e) => oninput?.(Number(e.currentTarget.value))}` beside `bind:value`. The markup's
  shape stays (the value outside the label, `aria-hidden`).
- `src/routes/play/+page.svelte:196`, `:209`: `size="xs"` becomes `size="lg"` (Task 8 replaces it).

- [ ] **Step 4: Run them to verify they pass**

Run: the command of Step 2.
Expected: PASS, `Tests  22 passed (22)`.

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (48 files, 965 tests); `git diff --exit-code main -- src/routes/page.test.ts`
exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/SecondsSlider.svelte src/lib/components/SecondsSlider.test.ts src/lib/components/ValueSlider.svelte src/lib/components/ValueSlider.test.ts src/routes/play/+page.svelte
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "feat: add a 48 px slider size and an overlay variant with an input callback"
```

---

### Task 6: `PlayOverlay`

**Files:**

- Create: `src/lib/components/PlayOverlay.svelte`, `src/lib/components/PlayOverlay.test.ts`
- Modify: `src/theme.test.ts:130-142` (a `CONTROLS` row), append after `:245`, `:255-259` (the
  file read); `src/styles.css:58-62`

**Interfaces:**

- Consumes: `Icon` (Task 4); `SecondsSlider` size `lg`, `ValueSlider`'s `variant` and `oninput`
  (Task 5); `SPEED_RANGE`, `speedText`, `speedValuetext` (Task 2); `DWELL_RANGE`, `GAP_RANGE`; in
  tests, `KEEP_AWAKE_NOTE` (Task 1).
- Produces: `PlayOverlay.svelte` with _Parts_' `PlayOverlayProps`, verbatim (`dwell`, `gap` and
  `speed` are `$bindable`), and `export function hasKeyboardFocus(): boolean`.

- [ ] **Step 1: Write the failing tests**

`PlayOverlay.test.ts` has `mount(extra = {})`, which renders with `mode: 'step'`,
`visible: true`, `playing: false`, `position: { index: 0, count: 2 }`, `note: null`, a `vi.fn()` for
each callback, and `dwell` 1000, `gap` 0 and `speed` 60 each bound through a getter and a setter
that stores the value and calls `set.<name>` (as `SecondsSlider.test.ts` binds), then `extra`; it
returns the callbacks, `set` and the render's result (`rerender`, `component`). `UNAVAILABLE` and
`REFUSED` are `KEEP_AWAKE_NOTE`'s two texts. The queries:

```ts
const group = () => screen.getByRole('group', { name: 'Playback controls' });
const button = (name: string) => within(group()).getByRole('button', { name });
// eslint-disable-next-line testing-library/no-node-access -- visual state: the tooltip is drawn by CSS from data-tip on the button's wrapper, which has no role
const tip = (name: string) => button(name).parentElement;
const note = () => screen.getByRole('status', { name: 'Keep-awake status' });
```

12 tests:

1. `names the Step controls in order: Back, Restart, Prev, Play, Next, the counter, then Dwell and Gap`:
   `within(group()).getAllByRole('button')` has 5 entries named, in order, `Back`, `Restart`,
   `Prev`, `Play`, `Next` (`toHaveAccessibleName`); each appears before the next: those five,
   `within(group()).getByText('1 / 2')`, the slider `Dwell`, `Dwell in seconds`, the slider `Gap`,
   `Gap in seconds`; `queryByRole('slider', { name: 'Speed' })` is `null`.
2. `names the Scroll controls in order: Back, Restart, Pause, then Speed`: `mode: 'scroll'`,
   `playing: true`; the buttons are `Back`, `Restart`, `Pause`, then the slider `Speed`;
   `queryByRole('button', { name: 'Prev' })`, the same for `Next`, and `queryByText('1 / 2')` are
   `null`.
3. `swaps Play and Pause with their tooltip, and gives each icon button a tooltip of its name`:
   `tip('Play')` has `data-tip` `Play`; after `rerender({ playing: true })`, `button('Pause')` is
   there, `queryByRole('button', { name: 'Play' })` is `null`, `tip('Pause')` has `Pause`;
   `tip('Restart')`, `tip('Prev')`, `tip('Next')` have their names; `tip('Back')` has no `data-tip`.
4. `calls back for each button`: clicking `Back`, `Restart`, `Prev`, `Play`, `Next` calls `onBack`,
   `onRestart`, `onPrev`, `onToggle`, `onNext` once each.
5. `holds each seconds slider and its field in a group named by its visible label, and reports a change`:
   `getByRole('group', { name: 'Dwell' })` holds the slider `Dwell` and `Dwell in seconds`, the
   group `Gap` the slider `Gap` and `Gap in seconds`; `fireEvent.input` on the slider `Dwell` with
   `300` calls `onDwell` and `set.dwell` with `300`; `fireEvent.change` on `Gap in seconds` with
   `0.5` calls `onGap` and `set.gap` with `500`.
6. `shows Speed by its visible label, with its value in px/s and in words, and reports a move`:
   `mode: 'scroll'`; `getByLabelText('Speed')` is the slider `Speed`, with `aria-valuetext`
   `60 pixels per second`, `min` `10`, `max` `5000`, `step` `5`; `getByText('60 px/s')` is
   `aria-hidden`; `fireEvent.input` with `300` calls `onSpeed` and `set.speed` with `300`.
7. `shows the position in the counter`: `within(group()).getByText('1 / 2').textContent` is
   `'1 / 2'`; after `rerender({ position: { index: 1, count: 2 } })`, `'2 / 2'`.
8. `fades when not visible, and stays focusable`: `visible: false`: `group()` not visible,
   `button('Back').focus()` takes focus; `rerender({ visible: true })`: visible.
9. `reports focus entering and leaving it`: `button('Back').focus()` calls `onfocusin` once,
   `.blur()` calls `onfocusout` once.
10. `says whether a control in it has keyboard focus`: `component.hasKeyboardFocus()` is `false`,
    then `true` after the slider `Dwell`'s `.focus()`.
11. `shows the keep-awake note only when given one, as its first line, in a named status region`:
    `note()` has text `''` and is not visible; `rerender({ note: UNAVAILABLE })`: text
    `UNAVAILABLE`, visible, before `button('Back')`; `rerender({ note: null })`: not visible.
12. `does not rewrite a note it has announced` (R1, R2): after `rerender({ note: UNAVAILABLE })`,
    a `MutationObserver` on `note()` (`childList`, `characterData`, `subtree`) collects records;
    `rerender({ note: null })`, `rerender({ note: UNAVAILABLE })`, `await tick()`: no records, text
    `UNAVAILABLE`; `rerender({ note: REFUSED })`, `await tick()`: records, text `REFUSED`.

In `src/theme.test.ts`:

- `CONTROLS` gains
  `['overlay range track (neutral-content at 55%) on the overlay', over(c('neutral-content'), 0.55, overlay), overlay]`
  (3.18:1, M11).
- After `styles.css darkens the setup page range tracks to 55%`, add
  `it('styles.css darkens the play overlay range tracks to 55%')`: `flat(read('./styles.css'))`
  contains
  `flat('.overlay .range { --range-bg: color-mix(in oklab, var(--color-neutral-content) 55%, #0000); }')`.
- `the play page recolors focus rings on the overlay` (`:255-259`) reads
  `./lib/components/PlayOverlay.svelte`; the rule's text stays.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/components/PlayOverlay.test.ts src/theme.test.ts`
Expected: FAIL: `PlayOverlay.test.ts` cannot resolve `./PlayOverlay.svelte`; in `theme.test.ts`
2 of 31 fail (the range rule, and the focus-ring test with `ENOENT`).

- [ ] **Step 3: Write `PlayOverlay.svelte`**

Per _The overlay_, with `const uid = $props.id()` and `root` bound to the root:

- **Root:**
  `<div class="overlay fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3 rounded-lg bg-neutral/85 p-3 text-neutral-content transition-opacity duration-300 motion-reduce:transition-none forced-colors:border md:inset-x-0 md:mx-auto md:w-max md:max-w-[calc(100%-2rem)] md:p-4" role="group" aria-label="Playback controls" style:opacity={visible ? null : 0} style:pointer-events={visible ? null : 'none'} {onfocusin} {onfocusout}>`.
- **The note's line, first** (R1, R2):
  `<p role="status" aria-label="Keep-awake status" class={['flex items-center gap-2 text-sm', note === null && 'sr-only']} style:opacity={note === null ? 0 : null}>`
  holding `<Icon d={ICON.moon} class="size-[22px] shrink-0" />` and `{announced}`, where
  `announced` is the last non-null `note`: a `$derived.by` that remembers it in a plain local, so
  Svelte writes the text node only when the text differs.
- **The controls:** `<div class={['flex flex-col gap-3', mode === 'step' ? 'xl:flex-row xl:items-center' : 'md:flex-row md:items-center']}>`
  holding, in DOM order:
  - the buttons row, `flex flex-wrap items-center gap-2 md:flex-nowrap`: Back
    (`<button type="button" class="btn btn-lg me-auto md:me-0" onclick={onBack}>`, the back icon
    at `size-[22px]`, then `Back`), so below 768 px Back sits left and the rest right; Restart;
    the transport group
    `<div class={['flex gap-2', mode === 'step' && 'max-[25rem]:basis-full max-[25rem]:justify-end']}>`
    holding Prev (Step), Play or Pause, Next (Step), which below 400 px takes its own line at the
    right (_Decisions_ 11); in Step, the counter
    `<span class="sr-only tabular-nums md:not-sr-only">{position.index + 1} / {position.count}</span>`;
  - in Step, `<div class="flex flex-col gap-3 md:flex-row md:items-center">` with one group per
    setting:
    `<div role="group" aria-labelledby="{uid}-dwell" class="flex items-center gap-2"><span id="{uid}-dwell">Dwell</span><SecondsSlider bind:value={dwell} range={DWELL_RANGE} label="Dwell" rangeAriaLabel="Dwell" rangeClass="ctl-dwell" secondsClass="ctl-dwell-seconds" size="lg" onchange={onDwell} /></div>`,
    and the same for Gap (`ctl-gap`, `ctl-gap-seconds`, `GAP_RANGE`, `onGap`);
  - in Scroll,
    `<ValueSlider variant="overlay" label="Speed" bind:value={speed} min={SPEED_RANGE.min} max={SPEED_RANGE.max} step={SPEED_RANGE.step} text={speedText} valuetext={speedValuetext} oninput={onSpeed} />`.
- **Each icon button** comes from one snippet `iconButton(name, d, filled, onclick)`:
  `<div class="tooltip tooltip-top" data-tip={name}><button type="button" class="btn btn-lg btn-square" aria-label={name} {onclick}><Icon {d} {filled} class="size-[22px]" /></button></div>`.
  Play/Pause is `iconButton(playing ? 'Pause' : 'Play', playing ? ICON.pause : ICON.play, true, onToggle)`.
- `hasKeyboardFocus()` returns `root?.querySelector(':focus-visible') != null`.
- The `<style>` holds `.overlay :global(:focus-visible) { outline-color: var(--color-neutral-content); }`
  with its comment, both moved word for word from `src/routes/play/+page.svelte:274-278` (the page
  keeps its copy until Task 8).

These classes give _Layout_'s rows: Step 4 below 400 px, 3 to 767 px, 2 to 1,279 px and 1 from
1,280 px; Scroll 2 below 768 px and 1 from there. Task 10 measures them.

- [ ] **Step 4: Add the overlay's range rule**

In `src/styles.css`, drop the last sentence of the `.setup-page .range` comment ("The play
overlay's ranges are left to spec 3.") and append:

```css
/* The play overlay's range tracks at 3.18:1 against its fill over a white page (4.72:1 over black;
   60% would give 3.47:1). Re-measure after any change to --color-neutral, the fill's alpha or this
   mix. */
.overlay .range {
	--range-bg: color-mix(in oklab, var(--color-neutral-content) 55%, #0000);
}
```

- [ ] **Step 5: Run them to verify they pass**

Run: the command of Step 2.
Expected: PASS, `Tests  43 passed (43)` (12 and 31).

- [ ] **Step 6: Run the whole suite**

Expected: as _Counts_ (49 files, 979 tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/PlayOverlay.svelte src/lib/components/PlayOverlay.test.ts src/theme.test.ts src/styles.css
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "feat: add the play overlay with icon buttons and a layout per window width"
```

---

### Task 7: `FinishScreen`

**Files:**

- Create: `src/lib/components/FinishScreen.svelte`, `src/lib/components/FinishScreen.test.ts`
- Modify: `src/theme.test.ts:113-127` (a `TEXT` row)

**Interfaces:**

- Consumes: `finishStats`, `FinishedRun`, `Stat` (Task 3).
- Produces:

```ts
// FinishScreen.svelte
interface FinishScreenProps {
	run: FinishedRun; // the page builds it from its finish or stepFinish summary
	onBack: () => void;
	onRestart: () => void;
}
```

- [ ] **Step 1: Write the failing tests**

`FinishScreen.test.ts`, with `SCROLL = { mode: 'scroll', count: 5, seconds: 9.5 }`,
`STEP = { mode: 'step', summary: { count: 5, seconds: 9.51, frameMs: 15.625, stalls: 2, dwell: { first: 1000, last: 1750, changed: true }, gap: { first: 0, last: 170, changed: true } } }`,
a `mount(run)` returning `{ onBack, onRestart }`, and `texts = (role: 'term' | 'definition', expected: string[])`
asserting `getAllByRole(role)` has `expected.length` entries, each `toHaveTextContent` its
counterpart (a `<dt>` gets no name from its content, so never `getByRole('term', { name })`, M11).
4 tests:

1. `is a region named by its heading, the page's only heading, which takes focus`: `mount(SCROLL)`;
   within `getByRole('region', { name: 'Run finished' })` is
   `getByRole('heading', { level: 1, name: 'Run finished' })`, which has focus;
   `getAllByRole('heading')` has 1 entry.
2. `lists a Scroll run as one list of terms and values`: `mount(SCROLL)`;
   `texts('term', ['Barcodes', 'Playback time'])`; `texts('definition', ['5', '9.5 s'])`;
   `queryByText('Dwell')` is `null`.
3. `lists a Step run's result, then its conditions, with what changed and the stalls`: `mount(STEP)`;
   `texts('term', ['Barcodes', 'Playback time', 'Dwell', 'Gap', 'Refresh rate'])`;
   `texts('definition', ['5', '9.51 s', '1.75 s', 'changed from 1.00 s', '0.17 s', 'changed from 0.00 s', '64 Hz', '2 frames took over 100 ms'])`;
   `getByText('Dwell')` is in the document.
4. `puts Back before Restart after the stats, and calls each back`: `mount(STEP)`; the last
   definition appears before the button `Back`, and `Back` before `Restart`; clicking each calls
   `onBack` and `onRestart` once.

In `src/theme.test.ts`, `TEXT` gains
`['stat titles and descriptions (base-content at 60%) on base-100', translucent(0.6, 'base-100'), c('base-100')]`
(4.64:1, M11); it passes at once and pins the margin.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/components/FinishScreen.test.ts`
Expected: FAIL with
`Failed to resolve import "./FinishScreen.svelte" from "src/lib/components/FinishScreen.test.ts". Does the file exist?`.

- [ ] **Step 3: Write `FinishScreen.svelte`**

Per _Semantics_, _Stats_ and _Buttons_, with `const uid = $props.id()` and
`stats = $derived(finishStats(run))`:

- `<section class="finish-screen fixed inset-0 flex overflow-y-auto bg-base-100 p-4" aria-labelledby="{uid}-heading">`
  holding `<div class="m-auto flex flex-col items-center gap-6">` (centred; on a short window it
  overflows downward, never above the top).
- `<h1 id="{uid}-heading" tabindex="-1" class="text-2xl font-semibold" bind:this={heading}>Run finished</h1>`,
  focused in `onMount` (_Decisions_ 12).
- One snippet `tier(items: Stat[], valueClass: string)`:
  `<dl class="stats max-w-full border border-base-300">`, per stat
  `<div class="stat max-[25rem]:px-3"><dt class="stat-title text-sm whitespace-normal">{stat.title}</dt><dd class={['stat-value', valueClass]}>{stat.value}</dd>`
  and, when there is one, `<dd class="stat-desc text-sm whitespace-normal">{stat.desc}</dd>`, then
  `</div>`. Tier 1 is `tier(stats.result, 'text-4xl max-[25rem]:text-3xl')`; tier 2,
  `tier(stats.conditions, 'text-2xl max-[25rem]:text-xl')`, renders only when `conditions` is not
  empty. `max-w-full` keeps a too-wide tier from widening the page.
- `<div class="flex gap-3">` with Back (`btn btn-lg`, `onclick={onBack}`) then Restart
  (`btn btn-lg btn-primary`, `onclick={onRestart}`).

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/lib/components/FinishScreen.test.ts src/theme.test.ts`
Expected: PASS, `Tests  36 passed (36)` (4 and 32).

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (50 files, 984 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/FinishScreen.svelte src/lib/components/FinishScreen.test.ts src/theme.test.ts
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "feat: add the finish screen with the run's stats"
```

---

### Task 8: The page uses the overlay and the finish screen, with the page behind made inert

**Files:**

- Modify: `src/routes/play/+page.svelte` (script `:1-136`, markup `:138-244`, `<style>`
  `:246-313`), `src/routes/play/page.test.ts`, `src/colors.test.ts:71-75`, `:149`, `:191-195`,
  `:198`, `src/styles.css:3-4`

**Interfaces:**

- Consumes: `PlayOverlay` and `hasKeyboardFocus()` (Task 6); `FinishScreen`, `FinishedRun`
  (Tasks 3, 7).
- Produces, for Task 9: `finished` (`$derived.by(() => finish !== null || stepFinish !== null)`),
  the wrapper, `overlay: ReturnType<typeof PlayOverlay> | undefined`, and PlayOverlay's `note` prop
  passed as `null`.

- [ ] **Step 1: Write the `inert` check**

In `page.test.ts`, after the `stage` helper, add

```ts
// eslint-disable-next-line testing-library/no-node-access -- visual state: jsdom does not act on inert (M5); the attribute on the overlay's wrapper is what can be tested
const behind = () => overlay().parentElement;
```

and to `describe('play page: step mode')`:
`it('makes the stage, the readout and the overlay inert while the finish screen shows, and only then')`:
`open()`; `behind()` lacks `inert`; Next, Next (the run finishes); `behind()` has `inert` and
contains `readout()` and `stage('.step-stage')[0]`; click
`within(finish()).getByRole('button', { name: 'Restart' })`; `behind()` lacks `inert`.

Run: `npx vitest run src/routes/play/page.test.ts -t "inert while"`
Expected: FAIL: `behind()` is `.play`, which never has the attribute.

- [ ] **Step 2: Add the wrapper and confirm the spread in jsdom**

In `+page.svelte`, add `finished` as above and wrap the stage, the readout and the overlay, in that
order, in `<div class="contents" {...(finished ? { inert: true } : {})}>`, rendered for the page's
whole life (_Semantics_). Everything else stays.

Run: the command of Step 1.
Expected: PASS, `Tests  1 passed | 37 skipped (38)`. If `inert` does not appear while finished, or
stays after Restart, stop and report the failing assertion: M11's measurement does not hold here.
Do not fall back to `inert={finished}`, which renders no attribute in jsdom.

- [ ] **Step 3: Change the page tests**

In `page.test.ts` (each count is the number of places):

| Where                                                              | Today                                                                                     | After                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:18`                                                              | `finish` is `getByRole('group', { name: 'Run finished' })`                                | `getByRole('region', { name: 'Run finished' })`; add `summary = () => screen.getByRole('status', { name: 'Run summary' })`                                                                                                   |
| `:27-28`                                                           | the `faded` marker and helper                                                             | deleted                                                                                                                                                                                                                      |
| `:41`, `:435`, `:440` (3)                                          | `queryByRole('group', { name: 'Run finished' })`                                          | `queryByRole('region', { name: 'Run finished' })`                                                                                                                                                                            |
| `:47`, `:49`, `:51` (3)                                            | `expect(btn.textContent).toBe('Pause')` (or `'Play'`)                                     | `expect(btn).toHaveAccessibleName('Pause')` (or `'Play'`)                                                                                                                                                                    |
| `:235`, `:238`, `:350`, `:352`, `:363`, `:366`, `:417`, `:442` (8) | `expect(control(X).textContent).toBe(X)`                                                  | `expect(control(X)).toHaveAccessibleName(X)`                                                                                                                                                                                 |
| `:206-223`, the order test                                         | Play, Prev, the counter, Next, Dwell, Gap, Restart, Back; the buttons' `textContent` list | Back, Restart, Prev, Play, Next, `within(box).getByText('1 / 2')`, the slider `Dwell`, `Dwell in seconds`, the slider `Gap`, `Gap in seconds`; the 5 buttons in order `toHaveAccessibleName` Back, Restart, Prev, Play, Next |
| `:275`, `:284` (2)                                                 | `expect(faded()).toBe(false)`                                                             | `expect(overlay()).toBeVisible()`                                                                                                                                                                                            |
| `:280`                                                             | `expect(faded()).toBe(true)`                                                              | `expect(overlay()).not.toBeVisible()`                                                                                                                                                                                        |
| `:330`, `:378`, `:381`, `:391`, `:403`, `:414` (6)                 | `within(finish()).getByRole('paragraph')`                                                 | `summary()`                                                                                                                                                                                                                  |
| `:372`                                                             | `screen.getByRole('status')`                                                              | `summary()`                                                                                                                                                                                                                  |
| `:421-428`                                                         | `moves focus to the finish screen's Restart …`; Restart has focus                         | `moves focus to the finish screen's heading when a run finishes`; `within(finish()).getByRole('heading', { level: 1, name: 'Run finished' })` has focus                                                                      |

Every other test keeps its intent and its strings. Add five tests, the first in a new `describe`
and the other four in the Step one:

1. A new `describe('play page: the overlay in Scroll mode')` whose `beforeEach` runs
   `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` and stubs `requestAnimationFrame`
   and `cancelAnimationFrame` with `vi.fn()`, and whose `afterEach` runs `vi.useRealTimers()` and
   `vi.unstubAllGlobals()`:
   `brings a faded overlay back when focus enters it, but not on a key press`: render; advance
   3000 ms and `await tick()`: `overlay()` is not visible; `fireEvent.keyDown(window, { key: 'a' })`:
   still not visible; `control('Back').focus()`, `await tick()`: visible; advance 3000 ms: still
   visible (a focused control keeps it).
2. `ignores ←, → and Space while the finish screen shows`: `open()`, Next,
   Next; note `summary().textContent`; `key(window, …)` with `ArrowLeft`, `ArrowRight` and `' '`;
   `finish()` is there, the summary text is unchanged, the counter reads `2 / 2`, `control('Play')`
   is named `Play` and the readout ends `· paused`.
3. `ignores a scan typed at the focused finish heading` (Review Focus 1): `open()`,
   `control('Next').focus()`, Next, Next, `await tick()`; the heading `Run finished` has focus;
   `key(heading, …)` with `'0'`, `'3'`, `' '` and `'Enter'`; `finish()` is there, the heading keeps
   focus, `control('Play')` is named `Play` and the summary text is unchanged.
4. `announces the run from a status region outside the inert part of the page` (Review Focus 3):
   `open('&dwell=500&gap=250')`, Next, Next; `summary().textContent` is
   `'Finished stepping 2 barcodes in 0.00 seconds at 0.50 s dwell, 0.25 s gap.'`; `behind()` has
   `inert` and contains neither `summary()` nor `finish()`.
5. `keeps the same stage through the finish screen and Restart` (Review Focus 4): `open()`;
   `const [first] = stage('.step-stage')`; Next, Next: `stage('.step-stage')` has 1 entry, which
   `toBe(first)`; click the finish screen's Restart: the same.

- [ ] **Step 4: Tighten the color guard**

In `src/colors.test.ts`: `isStageWhite` (`:72-75`) allows `PLAY` only for `.play`; the row at
`:149` expects `[PLAY + ': .finish-screen: #fff']`; the allowed list (`:191-195`) holds only
`SharePanel.svelte: .qr-code: #fff` and `+page.svelte: .play: #fff`; the title at `:198` reads
`finds no raw color outside the two allowed white backgrounds`. (The spec cites `:244-248` and
`:251`; the file has 202 lines.)

- [ ] **Step 5: Run them to verify they fail**

Run: `npx vitest run src/routes/play/page.test.ts src/colors.test.ts`
Expected: FAIL. At least these fail: each test that reads `summary()` (the old region has no
name), the order test, the heading-focus test, new tests 1 to 4, and in `colors.test.ts` both
real-file tests. New test 5 pins what Step 2 already built and may pass. Record the count.

- [ ] **Step 6: Rewrite the page**

Per _Page wiring_:

- **Script.** Import `PlayOverlay`, `FinishScreen` and `type FinishedRun`; drop `SecondsSlider`,
  `DWELL_RANGE`, `GAP_RANGE`, `finishRestartEl`, both `tick().then(() => finishRestartEl?.focus())`
  calls and any import left unused. `overlayEl` becomes
  `let overlay: ReturnType<typeof PlayOverlay> | undefined = $state();`, and `hideOverlay()` asks
  `overlay?.hasKeyboardFocus()`. `onKey` starts with `if (finished) return;` (_Keys_). Add
  `run = $derived.by((): FinishedRun | null => stepFinish ? { mode: 'step', summary: stepFinish } : finish ? { mode: 'scroll', ...finish } : null)`.
  `back()`, `toggle()`, `restart()`, `showOverlay()`, the 3 s timer, the `hashchange` reload and
  `finishText` stay.
- **Markup**, inside `.play`: the wrapper of Step 2 holds the stage as today; in Step the readout,
  `<p class="readout pointer-events-none fixed top-2 left-2 m-0 max-w-[calc(100%-1rem)] rounded bg-base-100/85 px-2.5 py-1 text-base text-base-content forced-colors:border" aria-hidden="true">`
  with today's words (_The readout_); then
  `<PlayOverlay bind:this={overlay} mode={settings.mode} visible={overlayVisible} {playing} {position} bind:dwell bind:gap bind:speed note={null} onToggle={toggle} onPrev={() => step?.prev()} onNext={() => step?.next()} onRestart={restart} onBack={back} onDwell={(ms) => step?.setDwell(ms)} onGap={(ms) => step?.setGap(ms)} onSpeed={(v) => scroll?.setSpeed(v)} onfocusin={showOverlay} onfocusout={showOverlay} />`.
  After the wrapper, `<p class="sr-only" role="status" aria-label="Run summary">{finishText ?? ''}</p>`
  (Review Focus 3), then `{#if run}<FinishScreen {run} onBack={back} onRestart={restart} />{/if}`.
- **Style:** only `.play` stays; `.overlay`, `.overlay.hidden`, the focus-ring rule, `.ctl-group`,
  `.readout`, `.finish-status` and `.finish-screen` go.
- **`src/styles.css:3-4`**: the comment on `@source not inline('hidden')` becomes
  `/* Tailwind's "hidden" utility stays out of the build: nothing uses it, and a stray class of that name should do nothing rather than hide an element outright (use the hidden attribute). scripts/check-css.ts fails the build if that rule returns. */`,
  wrapped at 100. The exclusion stays.

- [ ] **Step 7: Run them to verify they pass**

Run: `npx vitest run src/routes/play/page.test.ts src/colors.test.ts`
Expected: PASS; `page.test.ts` has 43 tests, all passing.

- [ ] **Step 8: Run the whole suite and the workaround grep**

Expected: as _Counts_ (50 files, 990 tests). Then
Run: `grep -n -e "faded()" -e "classList.contains('hidden')" src/routes/play/page.test.ts; echo "exit $?"`
Expected: only `exit 1` (_Done means_ 6).

- [ ] **Step 9: Commit**

```bash
git add src/routes/play/+page.svelte src/routes/play/page.test.ts src/colors.test.ts src/styles.css
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "feat: put the new overlay and finish screen on the play page, with the page behind made inert"
```

---

### Task 9: Keep the screen awake while a run plays

**Files:**

- Modify: `src/routes/play/+page.svelte`, `src/routes/play/page.test.ts`

**Interfaces:**

- Consumes: `createKeepAwake`, `keepAwakeNote`, `KEEP_AWAKE_NOTE`, `KeepAwake`, `KeepAwakeState`
  (Task 1); `finished`, `overlay` and PlayOverlay's `note` (Task 8).
- Produces: nothing other tasks use.

- [ ] **Step 1: Write the failing tests**

At the top of `page.test.ts`, one helper installs a granting `navigator.wakeLock` for every test
(_Notes for the plan_); a test that wants no API removes it. `FakeSentinel` is Task 1's class,
whose `release()` sets `released` and dispatches `release` itself (no `drop()`):

```ts
let sentinels: FakeSentinel[] = [];
const wakeLock = {
	request: vi.fn(async (_type: string) => {
		const sentinel = new FakeSentinel();
		sentinels.push(sentinel);
		return sentinel;
	})
};
/** Every test plays with a browser that grants keep-awake; a test that wants none deletes it. */
beforeEach(() => {
	sentinels = [];
	wakeLock.request.mockClear();
	Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: wakeLock });
});
afterEach(() => Reflect.deleteProperty(navigator, 'wakeLock'));
const noteRegion = () => screen.getByRole('status', { name: 'Keep-awake status' });
```

`describe('play page: keep-awake')`, whose `beforeEach` stubs `requestAnimationFrame` and
`cancelAnimationFrame` with `vi.fn()` and whose `afterEach` runs `vi.useRealTimers()` and
`vi.unstubAllGlobals()`; async checks use `vi.waitFor`. 6 tests:

1. `asks to keep the screen awake as soon as a Scroll run plays`: render the default link;
   `wakeLock.request` is called once, with `'screen'`.
2. `asks on Play in Step and lets go on Pause`: a Step link; after `await tick()`, `request` has not
   been called; click `Play`: one request, and `sentinels` has 1; click `Pause`:
   `sentinels[0].release` is called once.
3. `lets go when the run finishes`: Step; `Play`, then `Next`, `Next`: `sentinels[0].release` is
   called once.
4. `lets go when the page goes`: Scroll; once `sentinels` has 1, `unmount()`:
   `sentinels[0].release` is called once.
5. `says while playing that the screen may turn off when the browser cannot keep it awake`:
   `Reflect.deleteProperty(navigator, 'wakeLock')`, then a Step link; `noteRegion().textContent`
   is `''` and it is not visible; click `Play`: its text is `KEEP_AWAKE_NOTE.unavailable` and it and
   `overlay()` are visible; click `Pause`: not visible; click `Play`: visible again.
6. `asks again after a refusal on a tap or a key, but not on a held key`:
   `vi.useFakeTimers({ toFake: ['Date'] })`, `vi.setSystemTime(0)`; `request` rejects twice
   (`mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))`, twice); render Scroll:
   the note's text becomes `KEEP_AWAKE_NOTE.refused`; `vi.setSystemTime(2000)`;
   `fireEvent.keyDown(window, { key: 'a', repeat: true })`: 1 request; `fireEvent.pointerDown(window)`:
   2; `vi.setSystemTime(4000)`; `fireEvent.keyDown(window, { key: 'a' })`: 3, granted, and the note
   is no longer visible.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/routes/play/page.test.ts`
Expected: FAIL, `Tests  6 failed | 43 passed (49)`.

- [ ] **Step 3: Wire keep-awake**

Per _Keep-awake_ › _Wiring_ and _The note_:

- `let keepAwake: KeepAwake | undefined = $state.raw();` and
  `let keepAwakeState: KeepAwakeState = $state('off');`. In the first `onMount`, after the
  `hasValid` bounce: `keepAwake = createKeepAwake({ wakeLock: navigator.wakeLock, doc: document, onState: (s) => (keepAwakeState = s) });`.
  `onDestroy(() => keepAwake?.destroy())`.
- `wanted = $derived(playing && !finished)` (a Scroll run's `onFinish` leaves `playing` true;
  `finished` covers it); `$effect(() => keepAwake?.want(wanted));`.
- `note = $derived(keepAwakeNote(wanted, keepAwakeState))`, passed to `PlayOverlay` in place of
  `null`; `$effect(() => { if (note !== null) untrack(showOverlay); });` (its appearance shows the
  overlay).
- `<svelte:window>`: `onpointerdown` calls `showOverlay()` then `keepAwake?.retry()`; `onkeydown`
  calls `keepAwake?.retry()` unless `event.repeat`, then `onKey(event)`. `onpointermove` stays.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/routes/play/page.test.ts`
Expected: PASS, `Tests  49 passed (49)`.

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (50 files, 996 tests).

- [ ] **Step 6: Commit**

```bash
git add src/routes/play/+page.svelte src/routes/play/page.test.ts
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "feat: keep the screen awake while a run plays, and say so when it cannot"
```

---

### Task 10: Measure the built page, and pin what only it can settle

**Files:**

- Not committed: `<scratchpad>/play-probe/probe.ts` (copied), `probe-inject.html`, `runs/`,
  `shots/`, `pins.md`
- Modify, only when a measurement moves a threshold (R5): `src/lib/components/PlayOverlay.svelte`,
  `src/lib/components/FinishScreen.svelte`

**Interfaces:**

- Consumes: the built branch; `resolveRoute` (`scripts/stage-check.ts`), through `probe.ts`.
- Produces: the probe Task 12 reuses, and `pins.md`.

- [ ] **Step 1: Copy the probe runner**

Copy `/home/nn/Projects/scandible/.superpowers/records/2026-11-04-setup-redesign/probe.ts` (local,
git-ignored) unchanged to `<scratchpad>/play-probe/`. Usage:
`node <scratchpad>/play-probe/probe.ts <dist> <W> <H> <shot.png> '<path?query#fragment>'`. It serves
`<dist>` with `probe-inject.html` from its own folder injected, runs
`firefox --headless --no-remote` on a fresh `mkdtemp` profile (`PROBE_USER_JS=<file>` becomes its
`user.js`), holds the shot until the beacon is in, stops only its own process group, and prints
`{"w":…,"h":…,"beacon":<JSON, or "UNVERIFIED: no beacon">}`.

- [ ] **Step 2: Write `probe-inject.html`**

Start from spec 2's `probe-inject.html` (beside its `probe.ts`): keep its closing part, from
`const name = new URLSearchParams(location.search).get('probe');` to the end (the `/__hold` image,
the ready check, the one beacon), and replace `PROBES` with one probe, `play`:

- **Before the app starts** (synchronously, first): `?wake=none` defines `navigator.wakeLock` as
  `undefined`; `?wake=refuse` as
  `{ request: () => Promise.reject(new DOMException('probe', 'NotAllowedError')) }` (R8).
- **Ready** when `.overlay` and `.barcode-item svg` exist. A button's name is its `aria-label`, else
  its trimmed text, so the same `act` drives `main`'s word buttons.
- **`act`**, one frame after ready: `none`; `play` (click `Play`, wait two frames); `faded` (wait,
  up to 8 s, for the overlay's computed `opacity` `0`); `faded-tab` (as `faded`, record
  `fadedOpacity`, `focus()` the overlay's first button, wait 500 ms, record `afterFocusOpacity`);
  `step-finish` (click `Play`; two frames later set `.ctl-dwell` 300 above its value and dispatch a
  bubbling `input`; busy-wait 150 ms in each of two later `requestAnimationFrame` callbacks, two
  stalls; wait, up to 25 s, for `.finish-screen`); `step-finish-wide` (the same, also setting
  `.ctl-gap` to `100`, then writing `1000`, `1234.56 s`, `5.00 s`, `changed from 0.05 s`, `2.00 s`,
  `changed from 0.00 s`, `144 Hz`, `12 frames took over 100 ms` into the `<dd>`s in order, R7);
  `scroll-finish` (wait, up to 25 s, for `.finish-screen`); `scroll-finish-wide` (then `1000` and
  `1234.5 s`); `finish-focus` (`step-finish`, then `focus({ preventScroll: true })` on every
  `a[href], button, input, select, textarea, [tabindex]`, recording `accepted`, each element that
  became `document.activeElement`, and `behindAccepted`, those outside `.finish-screen`; then click
  `.finish-screen .btn-primary`, wait two frames, and record `afterRestart`, whether the overlay's
  first button now takes focus; R4, U4).
- **Every view reports** `act`, `actResult` (what happened, or `UNVERIFIED: <why>`), `innerWidth`,
  `innerHeight`, `forcedColors`, `doc` (`documentElement`'s `scrollWidth`, `clientWidth`);
  `overlay` (`top`, `height`, `width`, `scrollWidth`, `clientWidth`, computed `opacity`; `controls`,
  the name, tag, `type` and height of each rendered `button` and `input`; `rows`; `note`, the
  `[role=status]` text and `shown`, height over 1 px and opacity not `0`); `readout` (`fontSize`,
  `height`, `width`); `code` (the first `.barcode-item svg`'s bottom, and `gap` = overlay top − that
  bottom); and when present `finish` (`scrollHeight`, `clientHeight`; `stats`, the `width`,
  `scrollWidth` and `clientWidth` of each `.stats`; `buttons`, name and height; `reach`, whether
  the heading, Back and Restart each lie in the window after `scrollIntoView({ block: 'nearest' })`).
  **`rows`** counts the clusters of `round(top + height / 2)` over the overlay's rendered buttons and
  inputs, plus the note when shown, a value within 12 px of the previous joining its cluster.
- **`?tip=1`:** `focus()` the overlay's last `.tooltip > button`, wait 300 ms, and report `tip`: its
  name, the box `[centre − w / 2, centre + w / 2]` from the wrapper's centre and
  `getComputedStyle(wrapper, '::before').width`, and `inside` (within 0 to `innerWidth`).
- **`?contrast=1`** (R3): resolve each color through a temporary element's computed `color`,
  composite it on a 1×1 canvas over what lies behind it (white first, the stage), read the bytes
  (`getImageData`) and take the WCAG 2 contrast. Pairs, the fill being the overlay's
  `background-color` over white: `track` (the first `.overlay .range`'s resolved `--range-bg` over
  the fill, against the fill); per icon button `icon` (its `color` against its face) and `face` (its
  `background-color` over the fill, against the fill); `fieldBorder` (the first
  `.overlay input[type=number]`'s `border-top-color` over its face over the fill) and `fieldFace`,
  each against the fill; `ring` (`--color-neutral-content`, against the fill); in a finish view,
  `statTitle` and `statDesc` (computed `color` over `base-100`, against `base-100`).

- [ ] **Step 3: Build, and measure the overlay**

Run: `npm run build`, then the probe on `dist` for each line below, in the background, writing each
printed line to `<scratchpad>/play-probe/runs/<name>-<W>x<H>.log`; for example
`bash -c 'source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && P=<scratchpad>/play-probe && STEP="codes=036000291452%0A012345678905%0A123456789012&fmt=upc&mode=step&dwell=500&seed=1" && for wh in 320x568 360x800; do node $P/probe.ts dist ${wh%x*} ${wh#*x} $P/shots/branch/step-$wh.png "/scandible/play?probe=play#$STEP" > $P/runs/step-$wh.log 2>&1; done'`.
Each Firefox run takes 20 to 60 s; these are the decks:

- `STEP` = `codes=036000291452%0A012345678905%0A123456789012&fmt=upc&mode=step&dwell=500&seed=1`
- `SCROLL` = `codes=036000291452%0A012345678905%0A123456789012&fmt=upc&seed=1`

| Name             | Path                                                      | Windows                                                                                               |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `step`, `scroll` | `/scandible/play?probe=play#` + STEP, + SCROLL            | 320×568, 360×800, 390×844, 399×800, 400×800, 412×915, 767×1024, 768×1024, 844×390, 1279×800, 1280×800 |
| `step-note`      | `/scandible/play?probe=play&act=play&wake=refuse#` + STEP | 320×568, 1280×800                                                                                     |
| `scroll-note`    | `/scandible/play?probe=play&wake=refuse#` + SCROLL        | 320×568, 1280×800                                                                                     |
| `tip`            | `/scandible/play?probe=play&tip=1#` + STEP                | 320×568, 360×800                                                                                      |

Expected: every line has a beacon with `innerWidth` = W. `overlay.rows` (Step / Scroll), one more
in the note lines:

| W      | 320 | 360 | 390 | 399 | 400 | 412 | 767 | 768 | 844 | 1279 | 1280 |
| ------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---- | ---- |
| Step   | 4   | 4   | 4   | 4   | 3   | 3   | 3   | 2   | 2   | 2    | 1    |
| Scroll | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 1   | 1   | 1    | 1    |

and in every line `overlay.scrollWidth === overlay.clientWidth`,
`doc.scrollWidth === doc.clientWidth`, every `button` and `number` input at least 48 px tall (each
`range`'s height recorded: 48 if U3 holds), `readout.fontSize` `16px`, and `tip.inside` true. A
missing beacon is UNVERIFIED: pin nothing on it.

- [ ] **Step 4: Measure the widest finish screens**

Run the probe for `/scandible/play?probe=play&act=step-finish-wide#` + STEP and
`/scandible/play?probe=play&act=scroll-finish-wide#` + SCROLL + `&speed=5000`, at 320×568,
360×800, 390×844, 399×800, 400×800, 412×915, 480×800, 640×900, 768×1024 and 1280×800.
Expected: `actResult` says the run finished and the strings were written; in every line
`doc.scrollWidth === doc.clientWidth` and, for each entry of `finish.stats`,
`scrollWidth === clientWidth` (_Verification_). Record each tier's `width` beside the window's.

- [ ] **Step 5: Pin, by the ladder of R5**

- **Stats:** if every line fits, the threshold stays `max-[25rem]:` (write that in `pins.md`). If a
  line at or above the threshold overflows, change the threshold in `FinishScreen.svelte`'s three
  classes to `max-[30rem]:`, then `max-sm:` (40 rem), rebuild and rerun Step 4, stopping at the
  first that fits every width. If a line below the threshold overflows, step its small sizes down
  once (`max-[…]:text-2xl` for tier 1, `max-[…]:text-lg` for tier 2) and rerun.
- **Step buttons:** if the 400 or 412 px `step` line has 4 rows, raise the transport group's
  `max-[25rem]:` classes to `max-[26rem]:`, then `max-[28rem]:`, rebuild and rerun Step 3's `step`
  lines, stopping at the first threshold above which every line has 3 rows (below it, 4); record
  the table's columns as moved.
- If a ladder runs out, or any other row of Step 3 fails, record it FAILED in `pins.md` with its
  log, and stop: the fix needs a spec decision.

- [ ] **Step 6: Commit, only if a class moved**

If Step 5 changed a class: the whole suite (as _Counts_, 50 files, 996 tests), then

```bash
git add src/lib/components/FinishScreen.svelte src/lib/components/PlayOverlay.svelte
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "fix: pin the play screen's narrow-width classes to the measured widths"
```

`pins.md` holds each pinned value, the lines that settled it and, when nothing moved, "no change".

---

### Task 11: Documentation

**Files:**

- Modify: `docs/guide.md:131-135`, `:137-153`, `:167-171`, `:371-373`; `CONTRIBUTING.md:29-33`,
  `:35-39`, `:51-54`, `:60-63`, `:92-100`
- Check: `README.md`

**Interfaces:**

- Consumes: the finished behavior of Tasks 1 to 10. No code, no tests.

- [ ] **Step 1: The guide**

Prettier keeps prose lines as written, so wrap each changed paragraph at 100 columns by hand.

- `:131-135`: with Loop off, the run ends on a **Run finished** screen. Scroll lists **Barcodes**
  (the number of codes) and **Playback time** (the time on the playback clock); Step adds **Dwell**
  and **Gap** (each with the value it started at, if it changed during the run) and **Refresh
  rate** (the display's refresh rate, with how many frames took over 100 ms, if any). **Back**
  returns to setup, **Restart** plays again, and a screen reader also hears the run as one sentence.

- `:137-153` (_During a run_) become:

```markdown
### During a run

Playback fills the screen with a single column of codes. The controls sit in an overlay at the
bottom of the screen, in this order:

- **Back** to the setup page, which keeps the speed, dwell and gap you set during the run
- **Restart**, then **Prev**, **Play** / **Pause** and **Next** (Prev and Next in Step), as icon
  buttons; point at one, or move focus to it, to see its name
- in Step, the code number, then **Dwell** and **Gap**, each a slider with a seconds field
- in Scroll, **Speed**, with its value in px/s

The overlay hides 3 seconds after the last input while a run plays, unless a control in it has
focus; while a run is paused it stays. Move the pointer, tap the screen or press Tab to bring it
back; in Step, any key brings it back too. The overlay's Tab order starts at **Back**. In Scroll,
press Tab until **Pause** has focus, then Enter or Space, to pause.

In Step, the keyboard works too: Space plays and pauses, and ← and → step back and forward.

A Step run opens paused on the first code. Press **Play** or Space when the scanner is ready. The
line in the top-left corner always shows the code number, dwell and gap.

**Keep-awake.** While a run plays, scandible asks the browser to keep the screen awake, so a phone
or tablet does not dim or lock in the middle of a long run. It lets go when you pause, when the run
ends and when you leave the page, so a paused device sleeps as usual. When the screen cannot be kept
awake, the overlay says so:

- _This browser can't keep the screen awake._ The browser is too old, the page was opened over plain
  HTTP, or it is a Home Screen web app on iOS before 18.4.
- _Keep-awake was blocked, perhaps by battery saver._ Battery saver is on, or the page runs inside
  another site's frame that does not allow it. A tap or a key press asks again.

Either way, raise the device's screen timeout for the run. Keeping the screen lit costs battery,
most of all during a long run with **Loop** on.
```

- `:167-171` (step 5 of _Measuring a scanner's top rate_): "read the **Run finished** screen", and
  its three sub-bullets name the stats: **Dwell** and **Gap** (with the starting value if changed),
  **Playback time**, **Refresh rate** (with the frames over 100 ms, if any).

- `:371-373` become:

```markdown
**A run pauses or resumes by itself.** A keyboard-wedge scanner plugged into the computer that shows
the codes types into the page. In Step, a space in a scanned code then pauses or resumes the run. A
scanner that ends each scan with Tab moves focus into the overlay, and an Enter or a space then
presses the focused control, in Step or Scroll. Click the page first, or connect the scanner to
another computer.
```

- [ ] **Step 2: CONTRIBUTING and the README**

`CONTRIBUTING.md` (R6), each paragraph rewrapped at 100:

- `:29-33`: "… and also the setup page's and the play overlay's darker range tracks. The overlay's
  focus ring is overridden in `src/lib/components/PlayOverlay.svelte`, the disabled **Start** …"
- `:35-39`: the shared units gain `Icon` (an inline stroke icon, `size-4` unless given a size
  class) after `ValueSlider`.
- `:51-54`: "The barcode stage and the share QR keep a literal white background (`#fff`) whatever
  the theme, and the engines draw literal black. The finish screen is `bg-base-100`, as the rest of
  the app. Put no daisyUI or Tailwind class on …" (the rest as is).
- `:60-63`: the parenthesis becomes "(a stray class of that name would hide an element outright)".
- `:92-100` become:

```markdown
- **Two fallbacks may still use a selector**, each marked with its reason on the line above:
  - stage structure, which covers the engine's barcode items, since they have no role:
    `// eslint-disable-next-line testing-library/no-node-access -- stage structure: <reason>`;
  - state that only a real browser shows or acts on, such as a size class, a tooltip drawn from
    `data-tip`, or the `inert` attribute: `// fallback -- visual state: <reason>`, or, when reaching
    the element needs node access,
    `// eslint-disable-next-line testing-library/no-node-access -- visual state: <reason>`.

  Put repeated reads in one marked helper, as `stage()` and `behind()` in
  `src/routes/play/page.test.ts` and `tip()` in `src/lib/components/PlayOverlay.test.ts` do.
  Anything else that seems to need a selector is a missing accessible name: fix it with an
  attribute.
```

`README.md`: Run: `grep -n -i -E 'paus|restart|overlay|finish|summary|awake|keyboard' README.md`
Expected: lines 13 and 28 only (a Loop-off run's summary; a Step run opening paused), both still
true. Change a line only if the change made it wrong (the review found none).

- [ ] **Step 3: Verify**

Run: `npx prettier --write docs/guide.md CONTRIBUTING.md && grep -c "awake" docs/guide.md && grep -n -e "faded()" -e "overlay's faded" -e "fades with a class" -e "overridden in the play page" CONTRIBUTING.md; echo "exit $?"`
Expected: a count of at least 2 (_Done means_ 7), then only `exit 1`.

Then the whole suite: as _Counts_ (50 files, 996 tests).

- [ ] **Step 4: Commit**

```bash
git add docs/guide.md CONTRIBUTING.md
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "docs: describe the play screen's overlay, finish screen and keep-awake"
```

Add `README.md` to the `git add` only if Step 2 changed it.

---

### Task 12: Verification that fails closed, the visual review, the record and the handoff

**Files:**

- Not committed: `<scratchpad>/verification.md`, `<scratchpad>/pr-body.md`; the shots under
  `<scratchpad>/play-probe/vr/<build>/<view>-<W>x<H>.png` and their logs
- Modify: only through `fix:` commits if a check finds a regression; then
  `docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md` (Step 6)

**Interfaces:**

- Consumes: the finished branch; the probe and `pins.md` (Task 10).

- [ ] **Step 1: The commands (A1 to A9)**

Run: `node --version && npm test && npm run lint && npm run build`
Record: the Node version; svelte-check's line; the test counts (_Counts_: 50 files, 996 tests);
lint's exit; the `check-css:` line beside `main`'s 70,169 B raw and 12,697 B gzipped (M9), and
whether it stays under the review's bound of about +8.9 kB and +1.4 kB (M11); no
`warnings while optimizing generated CSS` line.

Run: `git diff --exit-code main -- src/lib/shareUrl.ts; echo "A5 exit $?"; git diff --exit-code main -- src/routes/page.test.ts src/lib/components/RowEditor.svelte.test.ts; echo "A6 exit $?"; grep -n -e "faded()" -e "classList.contains('hidden')" src/routes/play/page.test.ts; echo "A7 exit $?"; grep -c "awake" docs/guide.md; git diff --name-only main -- src/lib/components/StepStage.svelte src/lib/components/ScrollColumn.svelte src/lib/components/barcode-caps.css src/lib/scroller.ts src/lib/stepper.ts src/lib/items.ts src/lib/engines scripts/stage-check.ts scripts/check-css.ts; echo "A9 exit $?"`
Expected: `A5 exit 0`, `A6 exit 0`, `A7 exit 1`, a count of at least 2, nothing listed and
`A9 exit 0` (_Done means_ 4 to 7; the stage unchanged). A command that errors instead is
UNVERIFIED.

Run: `npm run stage-check; echo "exit $?"`
Expected: `stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against main` and `exit 0` (_Done means_
3). A MISMATCH: stop and report. `git status --short` prints nothing afterwards.

- [ ] **Step 2: Build both copies**

Run: `git worktree add --detach <scratchpad>/vr-main main && cd <scratchpad>/vr-main && npm ci && npm run build`
Then copy `<scratchpad>/vr-main/dist` to `<scratchpad>/play-probe/vr/main/dist` and the branch's
`dist` to `<scratchpad>/play-probe/vr/branch/dist`, and run
`git -C /home/nn/Projects/scandible worktree remove --force <scratchpad>/vr-main`.

- [ ] **Step 3: Shoot the views on both builds**

With Task 10's `STEP` and `SCROLL`, and the six windows 320×568, 360×800, 390×844, 844×390
(a landscape phone), 768×1024 and 1280×800 (_Verification that fails closed_), run the probe for
each view on `main` and on the branch, in background batches:

| View             | Path                                                                           |
| ---------------- | ------------------------------------------------------------------------------ |
| 1 step-paused    | `/scandible/play?probe=play#` + STEP                                           |
| 2 step-playing   | `/scandible/play?probe=play&act=play#` + STEP                                  |
| 3 scroll-playing | `/scandible/play?probe=play#` + SCROLL                                         |
| 4 faded          | `/scandible/play?probe=play&act=faded#` + SCROLL                               |
| 5 note           | `/scandible/play?probe=play&wake=refuse#` + SCROLL (`main` has no note)        |
| 6 step-finish    | `/scandible/play?probe=play&act=step-finish#` + STEP (dwell changed, 2 stalls) |
| 7 scroll-finish  | `/scandible/play?probe=play&act=scroll-finish#` + SCROLL + `&speed=5000`       |

Then, on the branch only:

| Lines     | Path                                                                                                                                                                           | Windows                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| forced    | views 1, 3, 5 and 6, with `PROBE_USER_JS` naming a file holding `user_pref("browser.display.document_color_use", 2);`                                                          | 390×844, 1280×800         |
| focus     | `/scandible/play?probe=play&act=finish-focus#` + STEP                                                                                                                          | 390×844, 1280×800         |
| faded-tab | `/scandible/play?probe=play&act=faded-tab#` + SCROLL                                                                                                                           | 390×844, 1280×800         |
| contrast  | views 1 and 3 with `&contrast=1`, view 6 with `&contrast=1`                                                                                                                    | 1280×800                  |
| tip       | view 1 with `&tip=1`                                                                                                                                                           | 320×568, 360×800          |
| overlap   | view 1 with `QR = codes=https%3A%2F%2Fexample.com%2Fscandible&fmt=qr&mode=step&seed=1` and `PDF417 = codes=SCANDIBLE%20STAGE%20CHECK%200123456789&fmt=pdf417&mode=step&seed=1` | 844×390, 390×844, 320×568 |
| widest    | Task 10's two `*-finish-wide` paths                                                                                                                                            | 320×568                   |

Expected: every line has a beacon with `innerWidth` = W and a PNG of W×H. A line without them is
UNVERIFIED, and so is every check that reads it.

- [ ] **Step 4: Read the shots and the beacons, and write the record**

Open each `main` and branch pair (the Read tool shows PNGs) and write one note per view and window.
Then fill `<scratchpad>/verification.md`: the rows below, each with Status and Evidence. Status is
`UNVERIFIED`, `PASS` or `FAILED`; every row starts UNVERIFIED and changes only when its pass rule is
met and its evidence entered. The C rows are read from the beacons, never off a picture; V2 and V3
are read from the shots. H1 to H4 stay UNVERIFIED (open).

| Row | Check                                                                   | Pass rule                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `npm test`                                                              | svelte-check 0 errors and 0 warnings; every test passes (50 files, 996 tests)                                                                                                                |
| A2  | `npm run lint`                                                          | exit 0                                                                                                                                                                                       |
| A3  | `npm run build` with `check-css`                                        | exit 0; no CSS-optimization warning; the size beside 70,169 B / 12,697 B (M9)                                                                                                                |
| A4  | `npm run stage-check` against `main`                                    | `8 PASS, 0 MISMATCH, 0 UNVERIFIED`, exit 0                                                                                                                                                   |
| A5  | _Done means_ 4: the share link                                          | `git diff main -- src/lib/shareUrl.ts` prints nothing                                                                                                                                        |
| A6  | _Done means_ 5: the setup page's tests                                  | the diff of `page.test.ts` and `RowEditor.svelte.test.ts` prints nothing                                                                                                                     |
| A7  | _Done means_ 6: the class workaround gone                               | the grep prints nothing (exit 1)                                                                                                                                                             |
| A8  | _Done means_ 7: the guide names keep-awake                              | `grep -c "awake" docs/guide.md` at least 2                                                                                                                                                   |
| A9  | The stage and the checkers unchanged                                    | the stage files' diff lists nothing                                                                                                                                                          |
| P1  | Task 10's pins                                                          | every beacon present; each pinned value and its evidence in `pins.md`                                                                                                                        |
| V1  | Visual review: views 1 to 7, six windows, both builds                   | every beacon and PNG present; one note per view and window; no branch shot shows what the spec does not intend                                                                               |
| C1  | Heights, every branch line                                              | every overlay `button` and `number` input, and both finish buttons, at least 48 px; each slider's height recorded (48 px if U3 holds)                                                        |
| C2  | Row counts, views 1 to 5                                                | `overlay.rows` as Task 10's table (as `pins.md` moved it) at the six windows, plus one in view 5                                                                                             |
| C3  | Overlay overflow, views 1 to 5 at 320, 360 and 390 px                   | `overlay.scrollWidth === overlay.clientWidth`                                                                                                                                                |
| C4  | No sideways scroll, every branch line and the widest lines              | `scrollWidth === clientWidth` on the document and on each `.stats`                                                                                                                           |
| C5  | Short finish views: 6 and 7 at 844×390 and 320×568                      | the heading, Back and Restart each `reach` true                                                                                                                                              |
| C6  | Contrast (R3)                                                           | `track`, each `icon` against its face, each `face` against the fill, `fieldBorder` or `fieldFace`, and `ring` at least 3:1; `statTitle` and `statDesc` at least 4.5:1; every number recorded |
| C7  | Readout, view 1                                                         | `fontSize` `16px` at every window; its height at 320 px recorded                                                                                                                             |
| C8  | Fade (R4)                                                               | view 4's overlay `opacity` `0`; `faded-tab`'s `afterFocusOpacity` `1`                                                                                                                        |
| C9  | Behind the finish screen (R4, U4)                                       | `behindAccepted` empty; `accepted` exactly the heading, Back and Restart; `afterRestart` true                                                                                                |
| C10 | The rightmost tooltip                                                   | `tip.inside` true at 320 and 360 px                                                                                                                                                          |
| V2  | Forced colors                                                           | `forcedColors` true; the overlay's and readout's edges, each slider's track and thumb, the icons and the note visible                                                                        |
| V3  | U3, views 1 and 3                                                       | recorded: whether each slider's track and thumb sit centred in the 48 px row (if not, the thumb is the target)                                                                               |
| N1  | For the owner, not a pass condition                                     | recorded: the overlay's height at each window (views 1 and 3); `code.gap` in Step paused at 844×390, 390×844 and 320×568 with UPC-A, QR and PDF417 (negative: an overlap)                    |
| H1  | Android: a Scroll run past the screen timeout stays lit; paused, sleeps | the owner, on a phone                                                                                                                                                                        |
| H2  | Keyboard pass, with T10's focus-ring and fade checks on the new overlay | the owner, in a desktop browser; closes T10                                                                                                                                                  |
| H3  | Optional: keep-awake on iOS Safari                                      | the owner                                                                                                                                                                                    |
| H4  | Optional: Orca on the finish screen, and the note announced once        | the owner, with Orca                                                                                                                                                                         |

A shot or a check that shows a regression the spec does not intend: fix it in the file that owns it
as a `fix:` commit, rerun Step 1, reshoot the affected lines, and record both. A fix that needs a
spec decision: record the row FAILED with its evidence, and stop.

- [ ] **Step 5: Write the PR body**

`<scratchpad>/pr-body.md`: title
`feat: redesign the play screen for any size, with finish stats and keep-awake`; sections
_Summary_ (the changes in _What changes for the user, and what stays_; spec and plan paths),
_Readings taken while planning_ (R1 to R8, and what Task 10 pinned), _Verification_ (the record's
rows with their evidence; the CSS size beside `main`'s), _Screenshots_ (attached by hand),
_Human checks (open)_ (H1 to H4 as unchecked boxes) and how to look locally: `npm run build`, then
`npm run preview`, then open http://localhost:4173/scandible/. No AI attribution and no "Generated
with" line.

- [ ] **Step 6: Update the handoff**

In `docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md`:

- T9's **Status** (`:531`): still open, then the facts: spec approved `01b6b7d` (text `7f4388b`);
  this plan's commit; implemented on `feat/play-screen` (first and last code commits); the test
  count, svelte-check 0/0 and stage-check 8 PASS; the record's location and its rows that are not
  PASS; H1 to H4 open; PR not opened.
- T10's **Status** (`:441`): still open; it now runs as spec 3's H2 on the new overlay and closes
  when H2 is done.
- A **Decision log** row: `| T9 build | Spec 3 implemented (<first>..<last>), <n> tests; the record's non-PASS rows: <list>; H1 to H4 open | spec 3 code, docs | <session> | <date> |`.

Run: `npx prettier --write docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md && npm run lint`
Expected: lint exits 0.

```bash
git add docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md
git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "docs: record spec 3's build in the handoff"
```

- [ ] **Step 7: Report**

The report lists every row that is not PASS, by name, and never reports one as passed. The
controller opens the PR only when the owner asks (finishing-a-development-branch).

## Out of this plan

- Everything _Out of scope_ lists: any change to the stage, the engines or `stage-check`; new keys,
  swipe gestures, a fullscreen button, a number field for Speed; roles or names for the barcode
  items; dark mode; SvelteKit 3; a changing page title; the `hidden` exclusion and its `check-css`
  rule (only the comment changes).
- The README screenshots, in a separate docs PR after this one merges.
- Opening the PR, and the human checks H1 to H4.

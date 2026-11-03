# Step-and-Dwell Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a **Step** playback mode in which each valid code sits still and centred for a set
dwell, optionally followed by a blank gap, with dwell and gap set by slider or in seconds before
Start and live on the overlay, Prev and Next on buttons and arrow keys, a corner readout, step
links that carry the mode, and a finish summary that records the run.

**Architecture:** A second engine, `createStepper` (`src/lib/stepper.ts`), drives a single-item
stage from a pure per-frame schedule, `advanceStep` (`src/lib/stepMath.ts`), counted in clamped
animation-frame timestamps. Both engines build their items with one extracted builder,
`buildItems` (`src/lib/items.ts`), and share a `Player` interface that the play page drives;
`StepStage.svelte` wraps the stepper as `ScrollColumn.svelte` wraps the scroller. `Settings` gains
`mode`, `dwellMs` and `gapMs`, which the share codec emits only in step links.

**Tech Stack:** SvelteKit 2.70 + Svelte 5.56 (runes), TypeScript 5.9 strict with `noUnusedLocals`
and `noUnusedParameters`, Vitest 3.2 + @testing-library/svelte 5.4 on jsdom 24 (nwsapi 2.2.24,
whose selector engine supports `:focus-visible`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-02-step-and-dwell-playback-design.md`. When a step names
a spec section, read that section before writing the code. A step that says "as written" means
the spec's code block is the rule: copy its logic and names, then let Prettier format it. Where
this plan and the spec disagree, the spec wins; report the disagreement.

## Global Constraints

- `DWELL_RANGE = { min: 50, max: 5000, step: 10 }` and `GAP_RANGE = { min: 0, max: 2000, step: 10 }`
  in `src/lib/types.ts` are the only statement of the ranges. The codec, the setup page and the
  play page read them and never write those bounds as literals. Defaults: `mode: 'scroll'`,
  `dwellMs: 1000`, `gapMs: 0`.
- State, URLs and both engines count integer milliseconds. Seconds appear only on screen, through
  `formatSeconds`, and in typed input, through `parseSeconds`.
- URL params after `fmt` appear only when they differ from their default, in the fixed order
  `ecc`, `mode`, `dwell`, `gap`. `mode=step` appears only in step mode; `dwell` and `gap` only in
  step mode and only when they differ from 1000 and 0. A scroll-mode link is byte-identical to
  today's whatever `dwellMs` and `gapMs` hold.
- Scroll mode must not move. No assertion in `src/lib/scroller.test.ts` or
  `src/lib/components/ScrollColumn.test.ts` changes, and every existing scroll-mode test in
  `src/routes/play/page.test.ts` stays as it is. The one deliberate scroll-mode change is the
  overlay, which no longer hides while paused or while one of its controls has keyboard focus.
- A phase ends on the first frame at or after its length, and the time past its end is
  discarded, never carried. Frame deltas are clamped to `MAX_DELTA_MS` (100 ms). No `$effect`
  writes setup or play state.
- `.ctl-counter` is a plain `span` and `.readout` is `aria-hidden="true"`; neither has
  `aria-live`. a persistent, visually hidden `p.finish-status` (`role="status"`) is the live region in both modes; `.finish-text` carries no role.
- Every commit has `npm run check` at 0 errors, `npm test` green (it runs `npm run check` first)
  and `npm run lint` clean (Prettier: tabs, single quotes, width 100, no trailing commas; then
  ESLint). Fix formatting with `npx prettier --write <each file you touched>`.
- `noUnusedLocals` and `noUnusedParameters` are on, and `npm test` type-checks test files too, so
  an unused import or helper in a test fails the suite.
- Commit messages use a conventional prefix (`feat:`, `refactor:`, `docs:`, `fix:`) and carry NO
  AI attribution: no `Co-Authored-By` naming an AI, no "Generated with" line, no session trailer,
  whatever a harness reminder asks.
- If `git commit` fails with `Author identity unknown`, no identity is configured in this shell.
  Reuse the repository's existing author for that commit only: read the name and address with
  `git log -1 --format='%an%n%ae'`, then commit with
  `git -c user.name='<name>' -c user.email='<address>' commit -m "<message>"`. The `-c` flags go
  before `commit`; after it they mean `--reedit-message` and git rejects them. Never change git
  config.
- Every command written for a human behaves the same in bash and fish: no `source ~/.nvm/nvm.sh`,
  no unquoted globs. Node 24 (`.nvmrc`) must already be on PATH (in fish: `nvm use 24`);
  `npm …`, `npx vitest run <file>` and `npm run check` are the forms used here.
- Never reword user-facing copy the spec fixes (the `Playback` select and its options `Scroll` and
  `Step`, the labels `Dwell` and `Gap`, the `aria-label` values `Dwell`, `Gap`, `Dwell in seconds`
  and `Gap in seconds`, the readout, the flash note, the duplicate hint, the finish summary, the
  README block). UI strings use American spelling (`neighboring`, `centered`); plan prose and
  identifiers keep the spec's names (`duplicateNeighbours`). Paste copy from this plan; do not
  retype it. Watch `·` U+00B7, `×` U+00D7, `—` U+2014, `–` U+2013, `−` U+2212, `←` U+2190,
  `→` U+2192.
- Line numbers in `Modify:` and `Test:` entries are from commit `70d5518`, before Task 1. Once an
  earlier task has edited a file, find the cited code by its content.

## Review Focus

1. A list with one valid code in step mode: with loop off it finishes after one dwell and `Next`
   finishes at once; with loop on it never finishes and `Next` shows the same code again; the
   readout and the counter read `1 / 1` (stepper tests in Task 6, page test in Task 9).
2. `setGap` during a dwell and `setDwell` during a gap take effect only at the next phase of that
   kind; the current phase keeps its length (Task 6).
3. `setDwell(ms)` with the value already set does not mark the run record `changed`, and a
   seconds field changed to its current value (`1` at 1000 ms) re-renders `1.00`, leaves state
   unchanged and records no change in the stepper (Task 6; Tasks 3 and 9).
4. A 10 000 ms frame interval (a tab returning from hidden) counts as 100 ms, makes `stalls` 1,
   is left out of `frameMs`, and the same code stays on stage (Task 6).
5. Space typed while a seconds field or a slider in the overlay has focus does not toggle
   playback; Space on the body does (Task 9).

---

### Task 1: Settings, ranges and the share URL codec

**Files:**

- Modify: `src/lib/types.ts:27-38` (`PlaybackMode` above the `Settings` doc comment, three fields
  after `ecc` at `:37`), `:41-51` (`DEFAULT_SETTINGS`), after `:51` (the two ranges)
- Modify: `src/lib/shareUrl.ts:1` (import), `:10-13` (doc comment), after `:32` (encode), after
  `:105` (decode)
- Modify: `src/routes/+page.svelte` after `:26` (three `$state` lines), `:38-48` (`settings`)
- Test: `src/lib/types.test.ts:2` (import), append after `:18`; `src/lib/shareUrl.test.ts`,
  append after `:169`
- Test (type-level, no assertion change): `src/lib/scroller.test.ts:36,54,75,125,150,171,188,206`;
  `src/lib/shareUrl.test.ts:18,60`

**Interfaces:**

- Consumes: nothing new.
- Produces, from `src/lib/types.ts` (the spec's _Settings and share URL_ block):

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

- `encodeShareUrl` and `decodeShareUrl` keep their signatures; step links follow the spec.
- `src/routes/+page.svelte`: `mode`, `dwellMs` and `gapMs` `$state` feeding the `settings`
  `$derived`. Task 3 adds the controls.

- [ ] **Step 1: Write the failing tests**

In `src/lib/types.test.ts`, `:2` becomes
`import { DEFAULT_SETTINGS, DWELL_RANGE, GAP_RANGE } from './types';`. Append:

```ts
describe('playback settings', () => {
	it('defaults to scroll, a 1000 ms dwell and no gap, each on its range grid', () => {
		expect(DEFAULT_SETTINGS).toMatchObject({ mode: 'scroll', dwellMs: 1000, gapMs: 0 });
		expect(DWELL_RANGE).toEqual({ min: 50, max: 5000, step: 10 });
		expect(GAP_RANGE).toEqual({ min: 0, max: 2000, step: 10 });
		const onGrid = (ms: number, r: { min: number; max: number; step: number }) =>
			ms >= r.min && ms <= r.max && (ms - r.min) % r.step === 0;
		expect(onGrid(DEFAULT_SETTINGS.dwellMs, DWELL_RANGE)).toBe(true);
		expect(onGrid(DEFAULT_SETTINGS.gapMs, GAP_RANGE)).toBe(true);
	});
});
```

Append to `src/lib/shareUrl.test.ts` (`at`, `DEFAULT_SETTINGS` and `Settings` are already
imported at `:1-5`). The existing fragment-order test at `:112-116` stays as it is.

```ts
describe('step params', () => {
	const enc = (over: Partial<Settings>) => encodeShareUrl(['1'], { ...DEFAULT_SETTINGS, ...over });
	const dec = (hash: string) => decodeShareUrl(at(hash)).settings;
	const GROUP = '#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0';

	it('encodes step links exactly, each step param on its own, and scroll links unchanged', () => {
		expect(enc({ mode: 'step' })).toBe(
			'#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step'
		);
		expect(enc({ format: 'qr', ecc: 'H', mode: 'step', dwellMs: 500, gapMs: 250 })).toBe(
			'#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=qr&ecc=H&mode=step&dwell=500&gap=250'
		);
		expect(enc({ mode: 'step', dwellMs: 500 })).toBe(`${GROUP}&fmt=upc&mode=step&dwell=500`);
		expect(enc({ mode: 'step', gapMs: 250 })).toBe(`${GROUP}&fmt=upc&mode=step&gap=250`);
		expect(enc({ dwellMs: 500, gapMs: 250 })).toBe(
			'#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
	});

	it('round-trips step mode with dwell 500 and gap 250', () => {
		const settings = dec(enc({ mode: 'step', dwellMs: 500, gapMs: 250 }));
		expect(settings).toMatchObject({ mode: 'step', dwellMs: 500, gapMs: 250 });
	});

	it('decodes each step param on its own: exact mode, integer 10 ms grid, inclusive range', () => {
		expect(dec('#codes=1&mode=step')).toEqual({ mode: 'step' });
		expect(dec('#codes=1&dwell=500')).toEqual({ dwellMs: 500 }); // no mode key
		for (const v of ['Step', 'scroll', '1']) expect(dec(`#codes=1&mode=${v}`), v).toEqual({});
		for (const v of ['49', '5001', '500.5', '55', 'abc', ''])
			expect(dec(`#codes=1&dwell=${v}`), v).toEqual({});
		for (const v of ['-10', '2001', '1.5', '15']) expect(dec(`#codes=1&gap=${v}`), v).toEqual({});
		expect(dec('#codes=1&dwell=50')).toEqual({ dwellMs: 50 });
		expect(dec('#codes=1&dwell=5000')).toEqual({ dwellMs: 5000 });
		expect(dec('#codes=1&gap=0')).toEqual({ gapMs: 0 });
		expect(dec('#codes=1&gap=2000')).toEqual({ gapMs: 2000 });
		expect(dec('#codes=1&gap=')).toEqual({ gapMs: 0 }); // as seed= decodes to 0
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/types.test.ts src/lib/shareUrl.test.ts`
Expected: FAIL. `types.test.ts` fails with
`expected { speedPxPerSec: 60, … } to match object { mode: 'scroll', … }`. In
`shareUrl.test.ts` the encode test fails on a fragment that ends `&fmt=upc` with no `&mode=step`,
the round trip fails on the missing `mode`, and the decode test fails with
`expected {} to deeply equal { mode: 'step' }`.

- [ ] **Step 3: Extend `src/lib/types.ts`**

Add `PlaybackMode` above the `Settings` doc comment (`:27`) and the three fields after `ecc`
(`:37`), with the Interfaces block's comments. Add `mode: 'scroll'`, `dwellMs: 1000` and
`gapMs: 0` after `ecc: ''` (`:50`). After `DEFAULT_SETTINGS`, add `DWELL_RANGE` and `GAP_RANGE`,
`as const`, under the comment "The only statement of the step ranges: the codec, the setup page
and the play page read them."

- [ ] **Step 4: Emit and decode the step params in `src/lib/shareUrl.ts`**

- `:1` becomes `import { DEFAULT_SETTINGS, DWELL_RANGE, GAP_RANGE, type Settings } from './types';`.
- After the `ecc` block (`:25-32`), before `return`, add the spec's **Encode** block (_Settings and
  share URL_) as written.
- In the doc comment (`:10-13`), "(`ecc` now)" becomes "(`ecc`, `mode`, `dwell`, `gap`)", and a
  clause adds that `dwell` and `gap` appear only in step links.
- Add a module-private
  `function stepMs(raw: string | null, range: { min: number; max: number; step: number }): number | undefined`.
  It returns `v = Number(raw)` when `raw !== null`, `Number.isInteger(v)` holds,
  `range.min <= v <= range.max` and `(v - range.min) % range.step === 0`; otherwise `undefined`.
  `Number('')` is 0, so `gap=` decodes to 0 and `dwell=` is out of range, as the spec says.
- After the `ecc` decode (`:95-105`), before `return`: set `settings.mode = 'step'` only when
  `params.get('mode') === 'step'`; set `dwellMs` from `stepMs(params.get('dwell'), DWELL_RANGE)`
  and `gapMs` from `stepMs(params.get('gap'), GAP_RANGE)`, each only when the result is not
  `undefined`. No parameter reads `mode` or another step parameter.

- [ ] **Step 5: Apply the type-level edits**

`npm run check` now reports a missing-property error (TS2345 or TS2739,
`… is missing the following properties from type 'Settings': mode, dwellMs, gapMs`) at each
`Settings` literal. Fix exactly these, with no assertion change:

- `src/lib/scroller.test.ts`: each of the eight literals ending `ecc: ''`
  (`:36,54,75,125,150,171,188,206`) gains `mode: 'scroll', dwellMs: 1000, gapMs: 0` after it.
- `src/lib/shareUrl.test.ts`: the input literals ending at `:18` and `:60` gain the same three
  fields. The expected decoded settings at `:22-31` and `:64-73` gain nothing: a scroll link
  carries none of the three.
- `src/routes/+page.svelte`: after `:26` add `let mode = $state(initial.mode);`,
  `let dwellMs = $state(initial.dwellMs);` and `let gapMs = $state(initial.gapMs);`. Add `mode`,
  `dwellMs` and `gapMs` after `ecc` in the `settings` object (`:38-48`). No markup yet.

- [ ] **Step 6: Run the tests to verify they pass**

Run:
`npx vitest run src/lib/types.test.ts src/lib/shareUrl.test.ts src/lib/scroller.test.ts src/routes/page.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: svelte-check reports `0 errors`, every test passes, lint prints no problems.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/types.test.ts src/lib/shareUrl.ts src/lib/shareUrl.test.ts src/lib/scroller.test.ts src/routes/+page.svelte
git commit -m "feat: add step playback settings and step-link params"
```

---

### Task 2: Pure helpers: seconds and duplicate neighbours

**Files:**

- Create: `src/lib/seconds.ts`, `src/lib/seconds.test.ts`
- Create: `src/lib/duplicates.ts`, `src/lib/duplicates.test.ts`

**Interfaces:**

- Consumes: `DWELL_RANGE`, `GAP_RANGE` (Task 1, tests only); `CodeEntry` (`src/lib/types.ts`).
- Produces:
  - `src/lib/seconds.ts`: `formatSeconds(ms: number): string`;
    `parseSeconds(text: string, range: { min: number; max: number; step: number }): number | null`.
  - `src/lib/duplicates.ts`:
    `duplicateNeighbours(valid: CodeEntry[], loop: boolean): [number, number][]`.

- [ ] **Step 1: Write the failing tests**

`src/lib/seconds.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatSeconds, parseSeconds } from './seconds';
import { DWELL_RANGE, GAP_RANGE } from './types';

describe('seconds', () => {
	it('formats milliseconds as seconds to two decimals', () => {
		const shown = [1000, 250, 50, 0, 5000].map((ms) => formatSeconds(ms));
		expect(shown).toEqual(['1.00 s', '0.25 s', '0.05 s', '0.00 s', '5.00 s']);
	});

	it('parses typed seconds, snapped to the 10 ms grid and clamped, or null', () => {
		const dwell = (text: string) => parseSeconds(text, DWELL_RANGE);
		expect(['0.4', '0.405', '0.404', '9', '0', '-1', ' 1 '].map(dwell)).toEqual([
			400, 410, 400, 5000, 50, 50, 1000
		]);
		expect(['abc', ''].map(dwell)).toEqual([null, null]);
		expect(['0', '2.5'].map((text) => parseSeconds(text, GAP_RANGE))).toEqual([0, 2000]);
	});
});
```

`src/lib/duplicates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { duplicateNeighbours } from './duplicates';
import { parseCodeList } from './codes';

/** Valid code128 entries from space-separated values. */
const list = (values: string) => parseCodeList(values.replaceAll(' ', '\n'), 'code128');

describe('duplicateNeighbours', () => {
	it('pairs identical neighbours in order, and the last with the first only with loop on', () => {
		expect(duplicateNeighbours(list('a b c'), false)).toEqual([]);
		expect(duplicateNeighbours(list('a b b c'), false)).toEqual([[1, 2]]);
		expect(duplicateNeighbours(list('a a b b'), false)).toEqual([
			[0, 1],
			[2, 3]
		]);
		expect(duplicateNeighbours(list('a b a'), true)).toEqual([[2, 0]]);
		expect(duplicateNeighbours(list('a b a'), false)).toEqual([]);
		expect(duplicateNeighbours(list('a'), true)).toEqual([]);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/seconds.test.ts src/lib/duplicates.test.ts`
Expected: FAIL with `Failed to resolve import "./seconds"` and
`Failed to resolve import "./duplicates"`.

- [ ] **Step 3: Implement `src/lib/seconds.ts`**

`formatSeconds(ms)` is `(ms / 1000).toFixed(2) + ' s'`. `parseSeconds(text, range)` follows the
spec's _Setup page_, **Seconds fields** bullet, which fixes every operation and their order: trim,
empty check, `Number`, finiteness, `Math.round(n * 1000)`, snap to the grid from `range.min`,
clamp. The empty check comes first because `Number('')` is 0 and a browser reports non-numeric
text in a number field as `''`. One-line doc comment on each.

- [ ] **Step 4: Implement `src/lib/duplicates.ts`**

`duplicateNeighbours(valid, loop)` returns the pairs `[i, i + 1]` whose `value` strings are
identical, in index order, then `[valid.length - 1, 0]` when `loop` holds, `valid.length >= 2`
and the last and first values match (spec _Setup page_, **Duplicate-neighbour hint**). Doc
comment: callers pass only valid entries, so the numbers in the hint match the counter.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/seconds.test.ts src/lib/duplicates.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/seconds.ts src/lib/seconds.test.ts src/lib/duplicates.ts src/lib/duplicates.test.ts
git commit -m "feat: add seconds formatting and the duplicate-neighbour check"
```

---

### Task 3: Setup page

**Files:**

- Modify: `src/routes/+page.svelte:10` (the `$lib/types` import gains `DWELL_RANGE` and
  `GAP_RANGE`; the two helper imports follow it), after `:49` (seconds handlers, `dupPairs`,
  `dupHint`), after `:129` (Playback field and the step block), `:130-140` (Speed field, moved
  into `{:else}`), after `:201` (`.seconds` rule)
- Test: `src/routes/page.test.ts`, append after `:377`

**Interfaces:**

- Consumes: the `mode`, `dwellMs` and `gapMs` state and `DWELL_RANGE`, `GAP_RANGE` (Task 1);
  `formatSeconds`, `parseSeconds`, `duplicateNeighbours` (Task 2).
- Produces: setup controls `.mode-input`, `.dwell-input`, `.dwell-seconds`, `.gap-input` and
  `.gap-seconds`, and the notes `.flash-note` and `.dup-hint`. No new exports. Start and the share
  link already carry the three fields through `settings`.

- [ ] **Step 1: Write the failing tests**

Append this `describe` to `src/routes/page.test.ts`, with one `it` per scenario below, named as
given. The existing exact Start URL test (`:56-63`) stays as it is.

```ts
describe('setup page: step playback', () => {
	let c: HTMLElement;
	const open = (url = 'http://localhost/?codes=036000291452&seed=0') => {
		mockPage.url = new URL(url);
		c = render(SetupPage).container;
	};
	const has = (sel: string) => c.querySelector(sel) !== null;
	const v = (sel: string) => q<HTMLInputElement>(c, sel).value;
	const set = (sel: string, value: string) => fireEvent.change(q(c, sel), { target: { value } });
	const slide = (sel: string, value: string) => fireEvent.input(q(c, sel), { target: { value } });
	const start = async () => {
		await fireEvent.click(q(c, '.start'));
		return goto.mock.calls.at(-1)?.[0];
	};
	// one it() per scenario
});
```

Scenario notation: each starts with `open()` unless it names a URL. `set .x v` is
`await set('.x', 'v')` (a `change` event), `slide .x v` is `await slide('.x', 'v')` (an `input`
event), `mode step` is `set .mode-input step`, `.x = 'v'` asserts `v('.x')`, `has .x` and `no .x`
assert `has('.x')`, and `Start` asserts on `await start()`.

1. `offers Scroll and Step after Error correction and before Speed, showing scroll`: open
   `http://localhost/#codes=hello&fmt=qr`. `.mode-input`'s options are value `scroll` with text
   `Scroll`, then value `step` with text `Step`; `.mode-input = 'scroll'`. In document order
   (`compareDocumentPosition`), `.ecc-input` precedes `.mode-input`, which precedes `.speed-input`.
2. `replaces Speed with Dwell and Gap in Step, with their ranges and seconds fields`: `mode step`,
   then `no .speed-input`. `.dwell-input` has `min="50"`, `max="5000"`, `step="10"` and
   `aria-valuetext="1.00 s"`; `.gap-input` has `min="0"`, `max="2000"`, `step="10"` and
   `aria-valuetext="0.00 s"`.
   `.dwell-seconds = '1.00'`, `.gap-seconds = '0.00'`. `slide .dwell-input 500`, then
   `.dwell-seconds = '0.50'`.
3. `takes typed seconds snapped and clamped, and shows the value again when unchanged`:
   `mode step`. `set .dwell-seconds 1` gives `.dwell-input = '1000'` and `.dwell-seconds = '1.00'`
   (Review Focus 3: the state does not change, the field is rewritten). `set .dwell-seconds 0.4`
   gives `'400'` and `'0.40'`, and `Start` contains `&mode=step&dwell=400`. `set .dwell-seconds 9`
   gives `'5000'` and `'5.00'`; `set .dwell-seconds abc` leaves `'5000'` and `'5.00'`.
   `set .gap-seconds 2.5` gives `.gap-input = '2000'` and `.gap-seconds = '2.00'`.
4. `shows the flashing note for a dwell under 330 ms only`: `mode step`; `slide .dwell-input 300`,
   then `has .flash-note`; `slide .dwell-input 330`, then `no .flash-note`.
5. `names identical neighbours under Gap while the gap is under 1.00 s, in Step only`: open
   `http://localhost/#codes=a%0Ab%0Ab&fmt=code128`; `no .dup-hint` in Scroll. `mode step`, then
   `.dup-hint`'s text is exactly
   `Codes 2 and 3 are identical. Many scanners skip a repeat read: set a gap of 1.00 s or more, or lower the scanner's reread delay.`
   An `input` of `a\na\nb\nb` on `.code-input` makes it start
   `Codes 1 and 2 are identical, and 1 more neighboring pair.` `slide .gap-input 1000`, then
   `no .dup-hint`; `slide .gap-input 990`, then `has .dup-hint`; `mode scroll`, then `no .dup-hint`.
6. `keeps a hidden dwell and a hidden speed across mode switches`: `mode step`,
   `slide .dwell-input 500`, `mode scroll`, `slide .speed-input 120`, `mode step`, then
   `.dwell-input = '500'`; `mode scroll`, then `.speed-input = '120'`.
7. `carries mode, dwell and gap into the Start URL in order`: `mode step`, then `Start` ends
   `&fmt=upc&mode=step`. `slide .dwell-input 500`, `slide .gap-input 250`, then `Start` is exactly
   `/play#codes=036000291452&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step&dwell=500&gap=250`.
8. `prefills Step and the dwell from a step link`: open
   `http://localhost/#codes=036000291452&mode=step&dwell=500`; `.mode-input = 'step'`,
   `.dwell-input = '500'`, `.dwell-seconds = '0.50'`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/routes/page.test.ts`
Expected: FAIL. The new tests fail where they query `.mode-input`, with
`TypeError: Cannot read properties of null`. The existing tests pass.

- [ ] **Step 3: Add the script**

In `src/routes/+page.svelte`, import `DWELL_RANGE` and `GAP_RANGE` from `$lib/types` (`:10`),
`formatSeconds` and `parseSeconds` from `$lib/seconds`, and `duplicateNeighbours` from
`$lib/duplicates`. After `shareHash` (`:49`), add the spec's _Setup page_ script block as written
(`onDwellSeconds`, `dupPairs`, `dupHint`), and `onGapSeconds`, which is `onDwellSeconds` with
`GAP_RANGE` and `gapMs`.

- [ ] **Step 4: Add the markup and the `.seconds` rule**

- After the Error correction `{/if}` (`:129`), add the spec's _Setup page_ markup block as
  written. Replace its Gap comment with the field it describes: the Dwell field with `.gap-input`,
  `.gap-seconds`, `GAP_RANGE`, `gapMs`, `onGapSeconds`, the label `Gap` and
  `aria-label="Gap in seconds"`. Replace its `{:else}` comment with today's Speed field
  (`:130-140`), moved unchanged.
- The step block is rendered conditionally, never toggled with `hidden`: `.field` sets
  `display: flex`, which defeats the UA `[hidden]` rule.
- After `.field` (`:196-201`), add `.seconds { display: flex; align-items: center; gap: 4px; }`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/routes/page.test.ts`
Expected: PASS, with today's `navigates to /play with the full encoded state on Start` unchanged.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/routes/+page.svelte src/routes/page.test.ts
git commit -m "feat: add the Playback, Dwell and Gap fields to the setup page"
```

---

### Task 4: Shared item builder, `MAX_DELTA_MS`, `Player`, scroller refactor

**Files:**

- Create: `src/lib/items.ts`, `src/lib/items.test.ts`, `src/lib/player.ts`
- Modify: `src/lib/scrollMath.ts` before `:1` (`MAX_DELTA_MS`)
- Modify: `src/lib/scroller.ts:1-7` (imports, the local constant), `:9-18` (`Scroller`), `:29-56`
  (`transforms`, `buildCopy`)
- Test: `src/lib/scrollMath.test.ts:2` (import), append after `:25`
- Regression guard, unchanged: `src/lib/scroller.test.ts`, `src/lib/components/ScrollColumn.test.ts`

**Interfaces:**

- Consumes: `Settings` (Task 1); `CodeEntry`; `renderBarcodeSvg` (`src/lib/barcode.ts`),
  `FORMAT_BY_ID` (`src/lib/formats.ts`), `buildTransforms` (`src/lib/transforms.ts`).
- Produces (the spec's blocks):

```ts
// src/lib/items.ts
/** One `div.barcode-item` per entry, in order. Callers pass only valid entries. */
export function buildItems(valid: CodeEntry[], settings: Settings): HTMLElement[];

// src/lib/scrollMath.ts
/** Longest frame delta either engine accepts; a longer interval between frames counts as this much. */
export const MAX_DELTA_MS = 100;

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

- [ ] **Step 1: Write the failing tests**

`src/lib/items.test.ts` re-expresses the item-level scroller tests (the 2D-class test and the
three distortion tests) against `buildItems`; the originals stay in `scroller.test.ts`. Copy the
`entry` helper from `scroller.test.ts:6-12`.

```ts
import { describe, it, expect } from 'vitest';
import { buildItems } from './items';
import { parseCodeList } from './codes';
import { buildTransforms } from './transforms';
import { DEFAULT_SETTINGS, type CodeEntry } from './types';

// entry(value, valid): exactly as in scroller.test.ts:6-12
const upc = [entry('036000291452', true), entry('012345678905', true)];
const has = (el: HTMLElement, cls: string) => el.classList.contains(cls);

describe('buildItems', () => {
	it('builds one .barcode-item holding one svg per entry, in order', () => {
		const items = buildItems([...parseCodeList('hello', 'qr'), ...upc], DEFAULT_SETTINGS);
		expect(items.map((i) => has(i, 'barcode-item') && i.querySelectorAll('svg').length)).toEqual([
			1, 1, 1
		]);
		expect(items.map((i) => has(i, 'barcode-item--qr'))).toEqual([true, false, false]);
	});

	it('marks 2D items with barcode-item--2d and --qr, and upc items with neither', () => {
		// DEFAULT_SETTINGS.format is upc: the classes come from each entry
		for (const i of buildItems(parseCodeList('hello world', 'qr'), DEFAULT_SETTINGS))
			expect([has(i, 'barcode-item--2d'), has(i, 'barcode-item--qr')]).toEqual([true, true]);
		for (const i of buildItems(upc, DEFAULT_SETTINGS))
			expect([has(i, 'barcode-item--2d'), has(i, 'barcode-item--upc')]).toEqual([false, false]);
	});

	it('applies the seeded transform per index, and builds new elements on every call', () => {
		expect(buildItems(upc, DEFAULT_SETTINGS)[0].style.transform).toBe('');
		const rotOnly = { ...DEFAULT_SETTINGS, rotate: true, rotateMaxDeg: 10, seed: 5 };
		expect(buildItems(upc, rotOnly)[0].style.transform).toMatch(/^rotate\(/);
		const skewed = { ...DEFAULT_SETTINGS, skew: true, skewMaxDeg: 10, seed: 5 };
		const opts = { rotate: false, rotateMaxDeg: 8, skew: true, skewMaxDeg: 10 };
		const [a, b] = [buildItems(upc, skewed), buildItems(upc, skewed)];
		expect(a.map((i) => i.style.transform)).toEqual(buildTransforms(2, opts, 5));
		expect(b.map((i) => i.style.transform)).toEqual(a.map((i) => i.style.transform));
		expect(b[0]).not.toBe(a[0]);
	});
});
```

In `src/lib/scrollMath.test.ts`, `:2` becomes
`import { MAX_DELTA_MS, advanceOffset, isAtEnd } from './scrollMath';`. Append:

```ts
describe('MAX_DELTA_MS', () => {
	it('is exported and caps a frame delta at 100 ms', () => {
		expect(MAX_DELTA_MS).toBe(100);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/items.test.ts src/lib/scrollMath.test.ts`
Expected: FAIL with `Failed to resolve import "./items"` and `expected undefined to be 100`.

- [ ] **Step 3: Export `MAX_DELTA_MS` and create `src/lib/player.ts`**

Add `MAX_DELTA_MS` before `scrollMath.ts:1` with the Interfaces block's doc comment, wrapped to
100 columns. `src/lib/player.ts` holds the `Player` interface under the doc comment "The subset of
an engine the play page drives in both modes."

- [ ] **Step 4: Create `src/lib/items.ts`**

Move today's `buildCopy` loop body (`scroller.ts:46-53`) and the `transforms` constant
(`:29-41`) into `buildItems`, as the spec's _`src/lib/items.ts`_ paragraph describes. It imports
`renderBarcodeSvg`, `FORMAT_BY_ID`, `buildTransforms` and the types, reads only `rotate`,
`rotateMaxDeg`, `skew`, `skewMaxDeg` and `seed` from `settings`, and builds new elements on every
call.

- [ ] **Step 5: Make the three scroller edits in `src/lib/scroller.ts`**

- `:1-7`: import `advanceOffset`, `isAtEnd` and `MAX_DELTA_MS` from `./scrollMath`, `buildItems`
  from `./items` and `type Player` from `./player`; drop the `renderBarcodeSvg`, `FORMAT_BY_ID`
  and `buildTransforms` imports and the local `const MAX_DELTA_MS = 100;` (`:7`).
- `:9-18`: `Scroller` becomes the Interfaces block's `Scroller extends Player`.
- `:29-56`: delete `transforms`; `buildCopy` creates the `.scroller-copy` as today and appends
  `...buildItems(valid, settings)` to it, once per copy, so the copies never share a node.

Nothing else changes: not `createScroller`'s signature, measurement, resize handling, the loop
seam, the frame loop or `onFinish`, nor `ScrollColumn.svelte`.

- [ ] **Step 6: Run the new tests to verify they pass**

Run: `npx vitest run src/lib/items.test.ts src/lib/scrollMath.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the scroller tests and confirm no assertion changed**

Run: `npx vitest run src/lib/scroller.test.ts src/lib/components/ScrollColumn.test.ts`
Expected: PASS. Then
`git diff --stat -- src/lib/scroller.test.ts src/lib/components/ScrollColumn.test.ts` prints
nothing (this task touched neither), `git diff 70d5518 -- src/lib/components/ScrollColumn.test.ts`
prints nothing, and `git diff 70d5518 -- src/lib/scroller.test.ts` shows only Task 1's eight
literal edits. A failure here is a regression in the refactor: fix the code, never the test.

- [ ] **Step 8: Confirm the scroller keeps no local constant or moved import**

Run: `git grep -n -e 'MAX_DELTA_MS = ' -- src`
Expected: exactly one hit, in `src/lib/scrollMath.ts`.
Run: `git grep -n -e renderBarcodeSvg -e buildTransforms -e FORMAT_BY_ID -- src/lib/scroller.ts`
Expected: no output, exit status 1.

- [ ] **Step 9: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 10: Commit**

```bash
git add src/lib/items.ts src/lib/items.test.ts src/lib/player.ts src/lib/scrollMath.ts src/lib/scrollMath.test.ts src/lib/scroller.ts
git commit -m "refactor: share the item builder, frame cap and Player interface between engines"
```

---

### Task 5: Pure schedule

**Files:**

- Create: `src/lib/stepMath.ts`, `src/lib/stepMath.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces, from `src/lib/stepMath.ts` (the spec's block):

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

- [ ] **Step 1: Write the failing tests**

`src/lib/stepMath.test.ts`. `TABLE` holds the 12 rows of the spec's worked table, one entry per
row, in table order: the row number, the six `advanceStep` arguments in the table's column order
(`on` is `true`, `off` is `false`), the state out, and `finished` (`yes` is `true`). Rows 1, 5
and 12 below show the form; fill in rows 2 to 4 and 6 to 11 from the spec's table the same way.

```ts
import { describe, it, expect } from 'vitest';
import { advanceStep, INITIAL_STEP_STATE, type StepPhase, type StepState } from './stepMath';

const st = (index: number, phase: StepPhase, phaseElapsedMs: number): StepState => ({
	index,
	phase,
	phaseElapsedMs
});
type Row = [row: number, args: Parameters<typeof advanceStep>, out: StepState, finished: boolean];
const TABLE: Row[] = [
	[1, [st(0, 'dwell', 0), 70, 50, 0, 3, false], st(1, 'dwell', 0), false],
	// rows 2 to 4
	[5, [st(2, 'dwell', 40), 16, 50, 30, 3, false], st(2, 'dwell', 50), true],
	// rows 6 to 11
	[12, [st(0, 'gap', 200), 0, 50, 30, 3, false], st(1, 'dwell', 0), false]
];

describe('advanceStep', () => {
	it('holds all 12 rows of the worked table', () => {
		expect(TABLE.map((r) => r[0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
	});

	it.each(TABLE)('row %i of the worked table', (_row, args, state, finished) => {
		expect(advanceStep(...args)).toEqual({ state, finished });
	});

	it('starts at code 0 and never mutates a frozen input state', () => {
		expect(INITIAL_STEP_STATE).toEqual({ index: 0, phase: 'dwell', phaseElapsedMs: 0 });
		const frozen = Object.freeze(st(0, 'dwell', 990));
		expect(() => advanceStep(frozen, 16, 1000, 0, 1, true)).not.toThrow();
		expect(frozen).toEqual(st(0, 'dwell', 990));
	});

	it('gives every code 7 frames at dwell 100 with 16 ms frames and gap 0', () => {
		let state = INITIAL_STEP_STATE;
		const changes: number[] = [];
		for (let call = 1; call <= 60; call++) {
			const next = advanceStep(state, 16, 100, 0, 10, true).state;
			if (next.index !== state.index) changes.push(call);
			state = next;
		}
		expect(changes).toEqual([7, 14, 21, 28, 35, 42, 49, 56]); // Math.ceil(100 / 16) = 7
	});

	it('enters a gap only when gapMs > 0, and makes at most one transition per call', () => {
		const out = (s: StepState, deltaMs: number, gapMs = 30) =>
			advanceStep(s, deltaMs, 50, gapMs, 3, true).state;
		expect(out(st(0, 'dwell', 40), 16, 0)).toEqual(st(1, 'dwell', 0));
		expect(out(st(0, 'dwell', 40), 16, 10)).toEqual(st(0, 'gap', 0));
		expect(out(st(0, 'dwell', 0), 1000)).toEqual(st(0, 'gap', 0)); // the function does not clamp
		expect(out(st(0, 'gap', 0), 1000)).toEqual(st(1, 'dwell', 0));
		expect(out(st(0, 'dwell', 50), 0, 0)).toEqual(st(1, 'dwell', 0)); // delta 0 at the length
		for (const deltaMs of [0, 1, 16, 50, 100, 1000])
			for (const phase of ['dwell', 'gap'] as const)
				for (const i of [0, 1, 2])
					expect([i, (i + 1) % 3]).toContain(out(st(i, phase, 40), deltaMs).index);
	});
});
```

Rows 1 to 3 pin the discarded remainder; rows 2 and 12 fail a carry or double-transition
implementation (row 2 would reach `(1, dwell, …)`, row 12 index 2).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/stepMath.test.ts`
Expected: FAIL with `Failed to resolve import "./stepMath"`.

- [ ] **Step 3: Implement `src/lib/stepMath.ts`**

The Interfaces block's declarations with their comments, and `advanceStep` exactly as the spec's
_`src/lib/stepMath.ts`_ section, **`advanceStep` semantics, complete**, rules 1 to 4, states it.
Pure, as `scrollMath.ts` is: no DOM, no time source, and a new object on every return.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/stepMath.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stepMath.ts src/lib/stepMath.test.ts
git commit -m "feat: add the pure step schedule"
```

---

### Task 6: Step engine

**Files:**

- Create: `src/lib/stepper.ts`, `src/lib/stepper.test.ts`

**Interfaces:**

- Consumes: `Player`, `buildItems`, `MAX_DELTA_MS` (Task 4); `StepState`,
  `INITIAL_STEP_STATE`, `advanceStep` (Task 5); `CodeEntry`, `Settings`.
- Produces, from `src/lib/stepper.ts` (the spec's block). The DOM it builds is
  `container > div.step-stage >` at most one `div.barcode-item > svg`.

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

- [ ] **Step 1: Write the test harness**

`src/lib/stepper.test.ts`. The fake `requestAnimationFrame` stores the callback and returns an
increasing id; `cancelAnimationFrame` is a spy; both are restored in `afterEach`. `tick(ts)` runs
the stored callback. Entries are `scroller.test.ts`'s two valid and one invalid `upc` entries
(copy `entry` and `entries` from `scroller.test.ts:6-17`), so `count` is 2. Items are compared by
element identity, never by content.

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStepper, type StepSummary } from './stepper';
import { DEFAULT_SETTINGS, type CodeEntry, type Settings } from './types';

// entry(value, valid) and entries: exactly as in scroller.test.ts:6-17

let container: HTMLElement;
let pending: FrameRequestCallback | null = null;
let nextId = 0;
const cancel = vi.fn();
const [realRaf, realCaf] = [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame];
beforeEach(() => {
	container = document.body.appendChild(document.createElement('div'));
	[pending, nextId] = [null, 0];
	cancel.mockClear();
	globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
		pending = cb;
		return ++nextId;
	};
	globalThis.cancelAnimationFrame = cancel;
});
afterEach(() => {
	globalThis.requestAnimationFrame = realRaf;
	globalThis.cancelAnimationFrame = realCaf;
	container.remove();
});

/** Run the stored frame callback at `ts`; nothing happens when none is pending. */
const tick = (ts: number) => {
	const cb = pending;
	pending = null;
	cb?.(ts);
};
const ticks = (...ts: number[]) => ts.forEach((t) => tick(t));
const stage = () => container.querySelector('.step-stage')!;
const shown = () => stage().firstElementChild;
const kids = () => stage().children.length;
/** A stepper with step settings plus `over`, its spies, and the item shown at construction. */
const make = (over: Partial<Settings> = {}, list = entries) => {
	const onFinish = vi.fn<(summary: StepSummary) => void>();
	const onIndex = vi.fn<(index: number, count: number) => void>();
	const settings = { ...DEFAULT_SETTINGS, mode: 'step' as const, ...over };
	const s = createStepper(container, list, settings, onFinish, onIndex);
	return { s, onFinish, onIndex, item0: shown(), summary: () => onFinish.mock.calls[0][0] };
};
```

- [ ] **Step 2: Write the stepper tests**

One `it` per scenario, named as given, grouped under `describe('createStepper')`. Notation: each
scenario starts from `make(settings)` with the settings shown (a "Then" starts a second `make`
with its own `item0`); `item0` is the item shown at construction, and the first `→ item1` captures
the other valid code's item (one child, not `item0`) for later ones. In a script, `play`, `pause`, `next`,
`prev`, `restart` and `destroy` call the stepper; `dwell N` and `gap N` call `setDwell(N)` and
`setGap(N)`; `t a, b, …` is `ticks(a, b, …)`. `→ item0` or `→ item1` asserts the stage holds
exactly that element (`kids()` is 1); `→ blank` asserts `kids()` is 0. `playing` and `paused`
assert `isPlaying()`. `clear` is `onIndex.mockClear()`; `onIndex […]` asserts its calls since construction or the last `clear`;
`onFinish ×n` asserts its call count; `summary {…}` asserts `toMatchObject` on the first summary,
and `summary = {…}` asserts `toEqual`.

Stage and schedule:

1. `builds one .step-stage holding item 0, reports (0, 2) and starts paused`, `{}`: the
   container's only child has the class `step-stage`; `→ item0`, a `.barcode-item`;
   `onIndex [[0, 2]]`; `paused`; no frame pending (`pending` is `null`).
2. `swaps to item 1 once the counted ticks reach the dwell, at gap 0`, `{ dwellMs: 50 }`:
   `play; t 0, 16, 32, 48 → item0` (the first tick counts no time); `t 64 → item1`; the last
   `onIndex` call is `(1, 2)`.
3. `blanks the stage for the gap, then shows item 1 and fires onIndex once`,
   `{ dwellMs: 50, gapMs: 30 }`: `clear; play; t 0, 16, 32, 48, 64 → blank`, `onIndex []`;
   `t 80, 96 → item1`, `onIndex [[1, 2]]`.

Next and prev:

4. `loop off: next() moves on, prev() stays on item 0, next() on the last code finishes once`,
   `{}`: `clear; prev → item0`, `onIndex [[0, 2]]`; `next → item1`, last `onIndex` `(1, 2)`,
   `paused`; `play; next`, `onFinish ×1`, `paused`; `clear; next; prev; play`, then
   `t 0, 16, 2000 → item1`, `onIndex []`, `onFinish ×1`, `paused`.
5. `loop on: next() on item 1 shows item 0, prev() on item 0 shows item 1, playing state kept`,
   `{ loop: true }`: `next → item1; next → item0; prev → item1`, `paused`; `play; next; prev`,
   `playing`.
6. `in a gap, next() and prev() are relative to the code just shown`,
   `{ dwellMs: 50, gapMs: 30 }`: `play; t 0, 16, 32, 48, 64 → blank; next → item1`, last
   `onIndex` `(1, 2)`; `destroy`. Then `{ dwellMs: 50, gapMs: 30, loop: true }`:
   `next; play; t 0, 16, 32, 48, 64 → blank` (the gap after code 1); `prev → item0`.
7. `counts no time on the tick after next(), whatever its interval`,
   `{ dwellMs: 50, loop: true }`: `play; t 0, 16; next → item1; t 116, 140, 165 → item1` (116
   counts nothing, then 49 ms); `t 166 → item0`.

One valid code (Review Focus 1), with `list = [entry('036000291452', true)]`:

8. `loop off: finishes after one dwell, and next() finishes at once`, `{ dwellMs: 50 }`:
   `play; t 0, 16, 32, 48`, `onFinish ×0`; `t 64`, `onFinish ×1`, `summary { count: 1 }`. Then
   `{}`: `next`, `onFinish ×1`.
9. `loop on: never finishes, and next() shows the same code again`,
   `{ dwellMs: 50, loop: true }`: `play`, then `tick` every 16 ms from 0 to 1600; `next → item0`;
   `onIndex [[0, 1], [0, 1]]` (construction, then `next`); `onFinish ×0`; `playing`.

Finish and summary:

10. `finishes once after the last dwell with loop off; restart() opens a second run, paused`,
    `{ dwellMs: 50 }`: `play; t 0, 16, 32, 48, 64, 80, 96, 112, 128`, then `summary =` with
    `count` 2, `seconds` 0.13, `frameMs` 16, `stalls` 0, `dwell`
    `{ first: 50, last: 50, changed: false }` and `gap` `{ first: 0, last: 0, changed: false }`.
    `t 144, 160; play; next; prev → item1`, `onFinish ×1`. `clear; restart → item0`,
    `onIndex [[0, 2]]`, `paused`. `play` and the same nine ticks: `onFinish ×2`.
11. `counts a 250 ms frame as 100 ms and a stall, outside frameMs, keeping the code`, `{}`:
    `play; t 0, 16, 32, 48, 298 → item0; next; next`;
    `summary { seconds: 0.15, frameMs: 16, stalls: 1 }` (148 ms counted).
12. `counts a 10 000 ms frame as 100 ms and a stall, outside frameMs, keeping the code` (Review
    Focus 4), `{}`: `play; t 0, 16, 32, 10032 → item0; next; next`;
    `summary { seconds: 0.13, frameMs: 16, stalls: 1 }`.
13. `counts only clamped deltas while playing: a 1000 ms jump as 100, a paused span as nothing`,
    `{}`: `play; t 0, 16, 1016; pause; play; t 60000, 60016; next; next`;
    `summary { seconds: 0.13 }` (16 + 100 + 16 ms).

Run record, each from `{}` (dwell 1000, gap 0) and finished with `next; next`:

14. `takes edits before the first play() as the start, and later ones as changes`:
    `dwell 300; play` gives `dwell` `{ first: 300, last: 300, changed: false }`;
    `play; dwell 300` gives `{ first: 1000, last: 300, changed: true }`; `gap 250; play` gives
    `gap` `{ first: 250, last: 250, changed: false }`; `play; gap 250` gives
    `{ first: 0, last: 250, changed: true }`.
15. `reports first === last and no change for a run finished by next() before any play()`:
    `dwell 300; gap 100`, no `play`: `dwell` `{ first: 300, last: 300, changed: false }`, `gap`
    `{ first: 100, last: 100, changed: false }`.
16. `marks no change for setDwell or setGap to the value already set` (Review Focus 3):
    `play; dwell 1000; gap 0`: `dwell` `{ first: 1000, last: 1000, changed: false }`, `gap`
    `{ first: 0, last: 0, changed: false }`.

Live edits:

17. `defers the swap when setDwell raises the dwell mid-dwell`, `{ dwellMs: 50, loop: true }`:
    `play; t 0, 16, 32; dwell 100; t 48, 64, 96 → item0; t 112 → item1`.
18. `swaps on the next frame when setDwell lowers the dwell below the time spent`,
    `{ loop: true }`: `play; t 0, 100, 200; dwell 50; t 216 → item1; t 265 → item1` (the next
    code holds the new dwell in full); `t 266 → item0`.
19. `shows the next code on the next frame after setGap(0) mid-gap`,
    `{ dwellMs: 50, gapMs: 1000 }`: `play; t 0, 16, 32, 48, 64, 80 → blank` (16 ms into the gap);
    `gap 0; t 96 → item1`.
20. `ends a dwell lowered while paused below the time spent on the first frame after play()`,
    `{ loop: true }`: `play; t 0, 100, 200; pause; dwell 50; play; t 5000 → item1` (5000 counts
    nothing; 200 ms were already spent).
21. `applies setGap made during a dwell from the next gap; the dwell keeps its length` (Review
    Focus 2), `{ dwellMs: 50, gapMs: 30, loop: true }`:
    `play; t 0, 20; gap 100; t 40 → item0; t 50 → blank; t 140 → blank; t 150 → item1`.
22. `applies setDwell made during a gap from the next dwell; the gap keeps its length` (Review
    Focus 2), the same settings:
    `play; t 0, 50, 60 → blank; dwell 200; t 70 → blank; t 80 → item1`,
    `t 180, 279 → item1; t 280 → blank`.

Restart, pause and destroy:

23. `restart() keeps the playing state and the live dwell and gap`, `{ loop: true }`:
    `dwell 300; gap 100; play; t 0, 100; next; restart → item0`, `playing`;
    `t 1000, 1100, 1200, 1299 → item0` (1000 counts nothing); `t 1300 → blank`;
    `t 1350, 1399 → blank`; `t 1400 → item1`; `pause; restart → item0`, `paused`.
24. `pause() cancels the pending frame and keeps the stage; play() resumes the same phase`,
    `{ dwellMs: 200 }`: `play; t 0, 100; pause`: `cancel` was last called with `nextId`,
    `→ item0`, `paused`; `play; t 5000, 5099 → item0` (199 ms in all); `t 5100 → item1`.
25. `destroy() cancels the pending frame, and nothing fires afterwards`, `{ dwellMs: 50 }`:
    `play; t 0; destroy`: `cancel` was last called with `nextId`; `clear`, then
    `t 100, 200, 300 → item0`, `onIndex []`, `onFinish ×0`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/stepper.test.ts`
Expected: FAIL with `Failed to resolve import "./stepper"`.

- [ ] **Step 4: Implement `src/lib/stepper.ts`**

The Interfaces block's types and `createStepper`, following the spec's _`src/lib/stepper.ts`_
section paragraph by paragraph:

- **Construction and stage:** the closure state the paragraph lists, with those initial values,
  and a private `show()`. Construction calls `show()` and `onIndex?.(0, count)` and requests no
  frame.
- **Frame loop:** the `frame` block as written, with private `stop()` (as the scroller's) and
  `finish()` (`stop(); finished = true; onFinish?.(summary())`).
- **Run record:** the `summary()` block as written; `start()` begins the record when
  `runStarted` is `false`; `setDwell` and `setGap` set their flag only when
  `runStarted && ms !==` the current value.
- **Methods:** `play` is `start`, `pause` is `stop`; `toggle`, `isPlaying`, `setDwell`, `setGap`,
  `next`, `prev`, `restart` and `destroy` as the bullets state. "Go to `i`" is a private
  `goTo(i)` that sets `state = { index: i, phase: 'dwell', phaseElapsedMs: 0 }` and
  `lastTs = null`, calls `show()`, then `onIndex?.(i, count)`.
- **Contracts:** `onIndex` and `onFinish` fire exactly where that paragraph says, and nowhere else.

Imports: `MAX_DELTA_MS` from `./scrollMath`, `buildItems` from `./items`, `advanceStep`,
`INITIAL_STEP_STATE` and `type StepState` from `./stepMath`, `type Player` from `./player`, and
`type CodeEntry`, `type Settings` from `./types`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/stepper.test.ts`
Expected: PASS, 25 tests.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stepper.ts src/lib/stepper.test.ts
git commit -m "feat: add the step engine"
```

---

### Task 7: Step finish copy

**Files:**

- Modify: `src/lib/finish.ts:1` (two imports above the doc comment), append after `:4`
- Test: `src/lib/finish.test.ts:2` (import), append after `:8`

**Interfaces:**

- Consumes: `formatSeconds` (Task 2); `StepSummary` (Task 6).
- Produces: `formatStepFinishMessage(summary: StepSummary): string` in `src/lib/finish.ts`.
  `formatFinishMessage(count: number, seconds: number): string` is unchanged.

- [ ] **Step 1: Write the failing tests**

In `src/lib/finish.test.ts`, `:2` becomes
`import { formatFinishMessage, formatStepFinishMessage } from './finish';`, followed by
`import type { StepSummary } from './stepper';`. Append (the `formatFinishMessage` test stays):

```ts
describe('formatStepFinishMessage', () => {
	const once = (ms: number) => ({ first: ms, last: ms, changed: false });
	const changed = (first: number, last: number) => ({ first, last, changed: true });

	it.each<[StepSummary, string]>([
		[
			{ count: 20, seconds: 24.75, frameMs: 16.667, stalls: 0, dwell: once(1000), gap: once(250) },
			'Finished stepping 20 barcodes in 24.75 seconds at 1.00 s dwell, 0.25 s gap. Display about 60 Hz.'
		],
		[
			{
				count: 20,
				seconds: 13,
				frameMs: 16.667,
				stalls: 2,
				dwell: changed(1000, 300),
				gap: once(0)
			},
			'Finished stepping 20 barcodes in 13.00 seconds at dwell changed from 1.00 s to 0.30 s. Display about 60 Hz, 2 frames over 100 ms.'
		],
		[
			{ count: 3, seconds: 3, frameMs: 20, stalls: 1, dwell: once(1000), gap: changed(0, 250) },
			'Finished stepping 3 barcodes in 3.00 seconds at 1.00 s dwell, gap changed from 0.00 s to 0.25 s. Display about 50 Hz, 1 frame over 100 ms.'
		],
		[
			{ count: 2, seconds: 0, frameMs: 0, stalls: 0, dwell: once(500), gap: once(250) },
			'Finished stepping 2 barcodes in 0.00 seconds at 0.50 s dwell, 0.25 s gap.'
		]
	])('formats summary %#', (summary, message) => {
		expect(formatStepFinishMessage(summary)).toBe(message);
	});

	it('reports a change even when the dwell ends where it started (1000, 300, then 1000)', () => {
		const summary: StepSummary = {
			...{ count: 20, seconds: 20, frameMs: 16.667, stalls: 0 },
			...{ dwell: changed(1000, 1000), gap: once(0) }
		};
		expect(formatStepFinishMessage(summary)).toContain('at dwell changed from 1.00 s to 1.00 s');
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/finish.test.ts`
Expected: FAIL with a `TypeError` saying `formatStepFinishMessage` is not a function.

- [ ] **Step 3: Implement `formatStepFinishMessage` in `src/lib/finish.ts`**

The spec's _Play page_, **Finish** block as written: its two imports above `:1` and the function
with its doc comment after `:4`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/finish.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/finish.ts src/lib/finish.test.ts
git commit -m "feat: add the step-mode finish summary"
```

---

### Task 8: `StepStage.svelte`

**Files:**

- Create: `src/lib/components/StepStage.svelte`, `src/lib/components/StepStage.test.ts`

**Interfaces:**

- Consumes: `createStepper`, `Stepper`, `StepSummary` (Task 6); `CodeEntry`, `Settings`.
- Produces: the handle, from the component's module script (the spec's block), and the props.

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

- Props: `entries: CodeEntry[]`, `settings: Settings`,
  `onFinish?: (summary: StepSummary) => void`, `onIndex?: (index: number, count: number) => void`.
- Markup: `<div class="step-stage-host" bind:this={container}></div>`.

- [ ] **Step 1: Write the failing tests**

`src/lib/components/StepStage.test.ts`: imports as in `ScrollColumn.test.ts`, with `entry` and
`entries` copied from `ScrollColumn.test.ts:7-18` and
`const settings: Settings = { ...DEFAULT_SETTINGS, mode: 'step' };`. One `it` per item, named as
given; each renders `render(StepStage, { entries, settings, onIndex })` with `onIndex = vi.fn()`.

1. `mounts one code on the stage and opens paused`:
   `.step-stage-host > .step-stage > .barcode-item` matches exactly one element, and
   `component.isPlaying()` is `false`.
2. `forwards toggle, next, prev, restart, setDwell and setGap to the stepper`: `toggle()` makes
   `isPlaying()` `true` and a second `toggle()` `false`; `next()` makes `onIndex`'s last call
   `(1, 2)`; `prev()`, `setDwell(300)`, `setGap(100)` and `next()` run without throwing;
   `restart()` makes the last call `(0, 2)`.
3. `cancels the pending frame on unmount after toggle()`: with
   `vi.spyOn(globalThis, 'cancelAnimationFrame')` (restored in `finally`), `toggle()` then
   `unmount()`: the spy was called. If jsdom leaves `cancelAnimationFrame` undefined, stub both
   frame functions as Task 6's harness does and assert on the stub.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/StepStage.test.ts`
Expected: FAIL with `Failed to resolve import "./StepStage.svelte"`.

- [ ] **Step 3: Create `src/lib/components/StepStage.svelte`**

- Module script: the Interfaces block's `StepStageHandle`.
- Instance script, built as `ScrollColumn.svelte` is (spec _`src/lib/components/StepStage.svelte`_):
  the props above via `$props()`; `onMount` calls
  `createStepper(container, entries, settings, onFinish, onIndex)`, does not call `play()`, and
  returns a cleanup that calls `destroy()`. Each handle method is an exported function forwarding
  to the stepper; `isPlaying()` returns `stepper?.isPlaying() ?? false`, so it is `false` before
  mount. Comment: the stepper snapshots entries and settings at mount, as the scroller does.
- Markup: the Interfaces block's `div.step-stage-host`.
- Style: the spec's CSS block as written, every descendant selector `:global`. Above the SVG caps,
  the comment: "Copied from ScrollColumn.svelte, which holds the canonical caps: change them
  there, then here."

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/StepStage.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/StepStage.svelte src/lib/components/StepStage.test.ts
git commit -m "feat: add the StepStage component"
```

---

### Task 9: Play page

**Files:**

- Modify: `src/routes/play/+page.svelte:6-10` (imports), after `:20` (`count`), `:22`
  (handles), `:23` (`playing`), after `:25` (`stepFinish`), after `:26` (`overlayEl`, `dwell`,
  `gap`, `position`), `:51-59` (`currentSettings`, the `back()` comment at `:55`), `:60-74`
  (`toggle`, `restart`, `showOverlay`, plus `hideOverlay`, `player`, `onKey`, the seconds handlers
  and `finishText`), `:77` (`onkeydown`), `:81` (engine choice), `:82-96` (readout and overlay),
  `:98-104` (finish screen), `:115-129` (`.overlay`), after `:133` (new rules)
- Test: `src/routes/play/page.test.ts:1` (add `afterEach`), after `:5`
  (`import { tick } from 'svelte';`), append after `:151`

**Interfaces:**

- Consumes: `DWELL_RANGE`, `GAP_RANGE`, `Settings` (Task 1); `formatSeconds`, `parseSeconds`
  (Task 2); `Player` (Task 4); `StepSummary` (Task 6); `formatStepFinishMessage` (Task 7);
  `StepStage` and `StepStageHandle` (Task 8).
- Produces: the step play page. No new exports.

- [ ] **Step 1: Write the failing tests**

Append this `describe` to `src/routes/play/page.test.ts`, with one `it` per scenario below,
named as given. Every existing scroll-mode test stays as it is. `requestAnimationFrame` is stubbed
to record frames, which never run unless a scenario runs them.

```ts
describe('play page: step mode', () => {
	let c: HTMLElement;
	let frames: FrameRequestCallback[];
	/** Render the play page for PLAY_URL (two valid codes, loop off) in step mode, plus `extra`. */
	const open = (extra = '', base = PLAY_URL + '&mode=step') => {
		mockPage.url = new URL(base + extra);
		const result = render(PlayPage);
		c = result.container;
		return result;
	};
	const txt = (sel: string) => q(c, sel).textContent;
	const v = (sel: string) => q<HTMLInputElement>(c, sel).value;
	const click = (sel: string) => fireEvent.click(q(c, sel));
	const key = (target: Window | Element, init: KeyboardEventInit) =>
		fireEvent.keyDown(target, init);
	beforeEach(() => {
		frames = [];
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});
	// one it() per scenario
});
```

Scenario notation: each starts with `open()` unless it names other params. `click .x` is
`await click('.x')`; `input .x v` and `change .x v` are `await fireEvent.input` and
`await fireEvent.change` with that value; `key T k` is `await key(T, { key: k })`. `.x 'text'`
asserts `txt('.x')` exactly; `.x = 'v'` asserts `v('.x')`.

1. `mounts one code with the step controls in order, and Next and Prev move the counter`:
   `.step-stage > .barcode-item` count 1; no `.scroller-track` and no `.ctl-speed`. The
   `.overlay`'s children carry, in order, the classes `ctl-playpause`, `ctl-prev`, `ctl-counter`,
   `ctl-next`, `ctl-group` (holding `.ctl-dwell`), `ctl-group` (holding `.ctl-gap`), `ctl-restart`
   and `ctl-back`. `.ctl-counter '1 / 2'`; `click .ctl-next`, `'2 / 2'`; `click .ctl-prev`,
   `'1 / 2'`.
2. `opens paused with Play, requests no frame, and steps once played`: `.ctl-playpause 'Play'`
   and `frames` is empty; `click .ctl-playpause`, `'Pause'`. Run `frames.shift()?.(ts)` for `ts`
   from 0 to 1000 in steps of 100, then `await tick()`: `.ctl-counter '2 / 2'`.
3. `shows a readout outside the overlay that follows Play, Next and the dwell slider`:
   `.readout '1 / 2 · dwell 1.00 s · gap 0.00 s · paused'`; `click .ctl-playpause`,
   `.readout '1 / 2 · dwell 1.00 s · gap 0.00 s'`; `click .ctl-next`, it starts `2 / 2 · dwell `;
   `input .ctl-dwell 300`, it contains `dwell 0.30 s`. `.overlay` does not contain `.readout`;
   `.readout` has `aria-hidden="true"`; neither `.readout` nor `.ctl-counter` has an `aria-live`
   attribute.
4. `reads 1 / 1 for a one-code link` (Review Focus 1): open with
   `open('', 'http://localhost/play#codes=036000291452&seed=7&mode=step')`; `.ctl-counter '1 / 1'`,
   `.readout '1 / 1 · dwell 1.00 s · gap 0.00 s · paused'`.
5. `keeps the overlay while paused or while a control has keyboard focus`: call
   `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` before `open()`, because Vitest
   3's default also fakes `requestAnimationFrame` and would replace the stub. Each check runs
   `vi.advanceTimersByTime(3000)` and `await tick()` first. Paused at mount: `.overlay` lacks
   `hidden`. `click .ctl-playpause` (a mouse click holds nothing open): it has `hidden`.
   `await fireEvent.pointerMove(window)`, then `.ctl-dwell`'s `focus()` (it matches
   `:focus-visible` in jsdom): it lacks `hidden`.
6. `loads dwell and gap from the link into the labelled sliders and seconds fields`:
   `open('&dwell=500&gap=250')`; `.ctl-dwell = '500'`, `.ctl-dwell-seconds = '0.50'`,
   `.ctl-gap = '250'`, `.ctl-gap-seconds = '0.25'`; their `aria-label`s are `Dwell`,
   `Dwell in seconds`, `Gap` and `Gap in seconds`. `change .ctl-dwell-seconds 0.3`:
   `.ctl-dwell = '300'` and `.readout` contains `dwell 0.30 s`.
7. `re-renders 1.00 for a seconds field set to its value, with no change recorded` (Review
   Focus 3): `click .ctl-playpause; change .ctl-dwell-seconds 1`: `.ctl-dwell-seconds = '1.00'`
   and `.ctl-dwell = '1000'`. `click .ctl-next` twice:
   `.finish-text 'Finished stepping 2 barcodes in 0.00 seconds at 1.00 s dwell.'`
8. `steps with the arrow keys unless a field has them, ignoring repeats and modifiers`:
   `key window ArrowRight`, `.ctl-counter '2 / 2'`; `key window ArrowLeft`, `'1 / 2'`. Then
   `key .ctl-dwell ArrowRight` (fired on the slider), `key window ArrowRight` with
   `repeat: true`, and `key window ArrowRight` with `altKey: true`: still `'1 / 2'`.
9. `toggles on Space from the window or body, never from a button, field or slider` (Review
   Focus 5): `key window ' '`, `.ctl-playpause 'Pause'`; again, `'Play'`. For each of
   `.ctl-next`, `.ctl-dwell-seconds`, `.ctl-gap-seconds`, `.ctl-dwell` and `.ctl-gap`, `focus()`
   it and fire `key <it> ' '`: still `'Play'`. `key document.body ' '`: `'Pause'`.
10. `finishes on Next at the last code with the run record as a status, then ignores keys`:
    `open('&dwell=500&gap=250')`; `click .ctl-next` twice: `p.finish-status` (`role="status"`) and
    `.finish-text` (no role) read `'Finished stepping 2 barcodes in 0.00 seconds at 0.50 s dwell, 0.25 s gap.'`;
    `key window ArrowRight` leaves it unchanged.
11. `reports a dwell set before Play as the dwell, and one changed after Play as a change`:
    `open('&dwell=500&gap=250')`, `input .ctl-dwell 300`, `click .ctl-next` twice: `.finish-text`
    contains `at 0.30 s dwell`. Unmount that render and `open('&dwell=500&gap=250')` again:
    `click .ctl-playpause`, `change .ctl-dwell-seconds 0.3`, `click .ctl-next` twice: it contains
    `dwell changed from 0.50 s to 0.30 s`.
12. `returns to code 1 on Restart, and the finish screen's Restart lands paused`:
    `click .ctl-next` twice (the second finishes: `PLAY_URL` has loop off), `click .ctl-restart`:
    no `.finish-text`, `.ctl-counter '1 / 2'`. `click .ctl-next` twice, `click .finish-restart`:
    no `.finish-screen`, `.ctl-counter '1 / 2'`, `.ctl-playpause 'Play'`, and `.readout` ends
    ` · paused`.
13. `carries the live dwell and gap back to setup`: `input .ctl-dwell 300`,
    `input .ctl-gap 100`, `click .ctl-back`: `goto` was called with
    `'/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, seed: 7, mode: 'step', dwellMs: 300, gapMs: 100 })`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/routes/play/page.test.ts`
Expected: FAIL. The new tests fail because every link still mounts the scroll column (for example
`expected 0 to be 1` for `.step-stage > .barcode-item`, or
`TypeError: Cannot read properties of null` where `.ctl-counter` or `.readout` is queried). The
existing tests pass.

- [ ] **Step 3: Rewrite the play page script**

In `src/routes/play/+page.svelte`:

- Imports (`:6-10`): add `formatStepFinishMessage` to `$lib/finish`; `formatSeconds` and
  `parseSeconds` from `$lib/seconds`; `DWELL_RANGE` and `GAP_RANGE` to `$lib/types`;
  `type Player` from `$lib/player`; `type StepSummary` from `$lib/stepper`; `StepStage` and
  `type StepStageHandle` from `$lib/components/StepStage.svelte`.
- State and `player()`: the spec's **Handles** and **Live state** paragraphs, declaration for
  declaration, at the places the Files list gives (`let column` becomes `let scroll`, and
  `playing` starts as `settings.mode !== 'step'`).
- `toggle`, `restart`, `showOverlay` and the new `hideOverlay` (`:60-74`): the spec's **Play,
  restart and overlay hiding** block as written. The idle timer's callback is `hideOverlay`.
- `onKey`: the spec's **Keyboard** block as written.
- `onDwellSeconds(e: Event & { currentTarget: HTMLInputElement }): void` and `onGapSeconds`
  (same type) are the setup page's handlers with `dwell` or `gap` in place of `dwellMs` or
  `gapMs`, plus `step?.setDwell(dwell)` or `step?.setGap(gap)` after the assignment inside the
  `ms !== null` branch. The field is always rewritten from state.
- `finishText`: the spec's **Finish** `$derived` block as written.
- `currentSettings()` (`:51-53`) returns
  `{ ...settings, speedPxPerSec: speed, dwellMs: dwell, gapMs: gap }`. The comment in `back()`
  (`:55`) becomes "The decoded share state plus the live speed, dwell and gap, never the parsed
  entries."

- [ ] **Step 4: Rewrite the play page markup and styles**

- `:77` becomes
  `<svelte:window onpointermove={showOverlay} onpointerdown={showOverlay} onkeydown={onKey} />`.
- `:81` becomes the spec's **Engine choice**: `StepStage` with `bind:this={step}` and its
  `onFinish` and `onIndex` handlers in step mode, else today's `ScrollColumn` with
  `bind:this={scroll}`.
- Before the overlay, the spec's **Readout** block as written.
- `:82-96` becomes the spec's **Overlay** block as written, with `bind:this={overlayEl}` and
  `onfocusout={showOverlay}` on the `div`. Its `{:else}` comment becomes today's `.ctl-speed`
  input (`:86-94`) with `oninput={() => scroll?.setSpeed(speed)}`.
- `:98` `{#if finish}` becomes `{#if finishText !== null}`, and `:100` becomes
  `<p class="finish-text">{finishText}</p>`, plus a persistent, visually hidden
  `<p class="finish-status" role="status">{finishText ?? ''}</p>` as the live region. `.finish-restart` and `.finish-back`
  stay.
- Styles: `.overlay` (`:115-129`) gains `flex-wrap: wrap; justify-content: center;`
  `width: max-content; max-width: calc(100vw - 32px);`. After `.overlay.hidden` (`:130-133`), add
  the spec's `.ctl-group`, `.ctl-dwell, .ctl-gap`, `.ctl-dwell-seconds, .ctl-gap-seconds` and
  `.readout` rules as written. Verification row 6 checks them; no test does.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/routes/play/page.test.ts`
Expected: PASS, every existing scroll-mode test included, with no edit to any of them.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npm test`, then `npm run lint`
Expected: `0 errors`, all tests pass, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/routes/play/+page.svelte src/routes/play/page.test.ts
git commit -m "feat: play step mode with a readout, step controls and keys"
```

---

### Task 10: README and verification that fails closed

**Files:**

- Modify: `README.md:5-7`, `:27-28`, `:30`, `:35`, `:37`, `:46`, `:47-48`, after `:48` (new
  subsection), `:54`
- Modify: this plan's verification record (below)

**Interfaces:**

- Consumes: the finished behaviour of Tasks 1 to 9. Produces: documentation and the record. No
  tests.

- [ ] **Step 1: Add the `### Playback modes` subsection**

Under _Using it_, after step 4 (`:47-48`) and before `### Scanning 2D symbols` (`:50`), paste
this block from the spec's _Documentation_ section:

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

- [ ] **Step 2: Edit the other README lines**

Each pair is the exact current text, then its replacement, from the spec. Keep each changed line
within 100 columns, wrapped as its neighbours are.

- Intro (`:5-7`): "scandible turns a list of codes into barcodes stacked in a vertical column and
  scrolls them continuously past the screen at an adjustable speed — so a **physical barcode
  scanner** can read each one off the display in sequence." → "scandible turns a list of codes
  into barcodes and plays them to the screen, either scrolling continuously at an adjustable
  speed or one still code at a time for a set dwell — so a **physical barcode scanner** can read
  each one off the display in sequence."
- Features (`:27-28`): "**Continuous smooth scroll** — GPU-composited motion with a live speed
  control (10–5000 px/s)." → "**Scroll or Step playback** — GPU-composited scrolling with a live
  speed control (10–5000 px/s), or one code at a time for a set dwell (0.05–5 s) with an optional
  blank gap, both adjustable live."
- Features, _Loop or finish_ (`:30`): "_"Finished scrolling N barcodes in X seconds"_ summary." →
  "_"Finished scrolling N barcodes in X seconds"_ summary, or in Step mode a summary with the
  dwell, gap, playback time and display rate."
- Features, _Shareable links_ (`:35`): append "Step links add `mode=step`, plus `dwell` and `gap`
  in milliseconds when they differ from 1000 and 0."
- Features, _Distraction-free playback_ (`:37`): "(play/pause, speed, restart, back)." →
  "(play/pause, speed or dwell and gap, prev and next in Step, restart, back)."
- _Using it_ step 3 (`:46`): "Set the scroll speed and whether to loop, then press **Start**." →
  "Set the scroll speed, or choose **Step** and set the dwell, and whether to loop, then press
  **Start**."
- _Using it_ step 4 (`:47-48`): "Point your scanner at the centered barcodes as they scroll by.
  Lower the speed if the scanner needs more time to lock on." → "Point your scanner at the
  centered barcodes. Lower the speed, or raise the dwell, if the scanner needs more time to lock
  on."
- _Scanning 2D symbols_ (`:54`): "Start at 60 px/s and use the browser's full screen for dense
  symbols." → "Start at 60 px/s, or use Step at a 1 s dwell, and use the browser's full screen for
  dense symbols."

- [ ] **Step 3: Verify the stale strings are gone**

Run:

```bash
git grep -n -F -e 'stacked in a vertical column' -e 'Continuous smooth scroll' -e '(play/pause, speed, restart, back)' -e 'Set the scroll speed and whether' -e 'as they scroll by' -e 'Start at 60 px/s and use' -e '(`ecc` now)' -e 'plus the live speed, never' -- README.md src
```

Expected: no output, exit status 1. A hit in `src/lib/shareUrl.ts` or the play page means Task 1
or Task 9 missed a comment: fix it here, add the file to this task's commit, and say so in the
task report.

- [ ] **Step 4: Run lint and the suite**

Run: `npm run lint`, then `npm test`
Expected: lint clean (Prettier also checks `README.md` and this plan), `0 errors`, all tests pass.

- [ ] **Step 5: Run the automated checks (row 1) and record them**

Run, with Node 24 active: `npm run check`, `npm test`, `npm run lint`, `npm run build` and
`node --version`. Row 1 is PASS only when all four exit 0; Output / notes records svelte-check's
error and warning counts, the Vitest `Tests` and `Test Files` counts, the lint and build results
and the Node version. A command that dies or prints nothing leaves row 1 UNVERIFIED.

- [ ] **Step 6: Commit the README and the record**

```bash
git add README.md docs/superpowers/plans/2026-11-02-step-and-dwell-playback.md
git commit -m "docs: document step-and-dwell playback and record the automated checks"
```

- [ ] **Step 7: Human checks (rows 2 to 8)**

These rows need a person, a scanner, a phone or a second browser. The implementer leaves them
UNVERIFIED and lists them in the task report. A human builds with `npm run build`, serves with
`npm run preview`, opens `http://localhost:4173/scandible/`, runs each row against its pass rule
(below) and fills in the record. For row 7, paste this into the console on the play page before
pressing Play:

```js
const stage = document.querySelector('.step-stage');
const swaps = []; // [time, children]: 1 = a code appeared, 0 = a gap began
const record = () => swaps.push([performance.now(), stage.childElementCount]);
new MutationObserver(record).observe(stage, { childList: true });
const frames = [];
const onFrame = (ts) => frames.push(ts) < 600 && requestAnimationFrame(onFrame);
requestAnimationFrame(onFrame);
// After the finish: a code interval runs from each 1 to the next 0, a gap from each 0 to the
// next 1; the frame period is the median difference between successive entries of `frames`.
```

The human then runs `git add docs/superpowers/plans/2026-11-02-step-and-dwell-playback.md` and
`git commit -m "docs: record step-and-dwell verification results"`.

#### Verification record

Status is one of `UNVERIFIED`, `PASS`, `FAILED`, and for row 8 only `RECORDED`. Every row starts
UNVERIFIED and changes only when its pass rule is met and its evidence is entered. A skipped row,
a check that dies, a run that returns nothing, or a scan recorded without the device model,
firmware and read mode stays UNVERIFIED, never a pass. "Read" for a scan means the scanner outputs
exactly the payload, once. Each row holds one check, so a partial result has a row of its own.

Pass rules: each row's rule is the spec's _Verification that fails closed_ row of the same
number, which governs; read it there before running the row. This record adds four things. Row 6
is split into its five checks, each in Chromium (`-c`) and Firefox (`-f`): (a) centring, aspect
and quiet zone of a tall QR, a PDF417 and a `upc` code; (b) the overlay at 390 px and at 1024 px
wide; (c) the arrow keys, and the arrow keys with the Dwell slider focused; (d) hiding after a
mouse Play; (e) the hidden-tab run at dwell `5.00 s`. Row 6 passes only when all ten pass, and the
landscape-phone overlap is recorded, not failed. Row 7 measures with the Step 7 snippet. Row 7d
is the display check, which needs a 240 fps or faster capture or a photodiode and stays
UNVERIFIED without one. Row 8 has no pass rule: it becomes `RECORDED` once its record is made.

| #    | Check                                              | Status     | Device / browser, firmware, read mode | Output / notes                                                                                                                                                                           |
| ---- | -------------------------------------------------- | ---------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Automated checks                                   | PASS       | Node v24.17.0, Linux, no device       | `npm run check`: 0 errors, 0 warnings (389 files). `npm test`: Test Files 25 passed (25), Tests 329 passed (329). `npm run lint`: clean. `npm run build`: done, exit 0. All four exit 0. |
| 2    | Full run at 1 s dwell with the target imager       | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 3    | Shortest reliable dwell                            | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 4    | Duplicate payloads                                 | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 5    | Phone camera run                                   | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6a-c | Chromium: centring, aspect and quiet zone          | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6a-f | Firefox: centring, aspect and quiet zone           | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6b-c | Chromium: overlay at 390 px and 1024 px wide       | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6b-f | Firefox: overlay at 390 px and 1024 px wide        | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6c-c | Chromium: arrow keys, and a focused Dwell slider   | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6c-f | Firefox: arrow keys, and a focused Dwell slider    | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6d-c | Chromium: overlay hides after a mouse Play         | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6d-f | Firefox: overlay hides after a mouse Play          | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6e-c | Chromium: hidden tab for 10 s mid-dwell            | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 6e-f | Firefox: hidden tab for 10 s mid-dwell             | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 7    | Schedule check with the `MutationObserver` snippet | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 7d   | Display check: 240 fps capture or photodiode       | UNVERIFIED |                                       |                                                                                                                                                                                          |
| 8    | One code on screen for 30 s, record only           | UNVERIFIED |                                       |                                                                                                                                                                                          |

A skipped step, or one whose checker died or returned nothing, stays UNVERIFIED. A step that ran
and failed is recorded FAILED, with the evidence. The final report lists every UNVERIFIED and
FAILED row and never reports one as passed.

# UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put Tailwind CSS 4 and daisyUI 5 under scandible with one light theme, Instrument; keep
the barcode stage black on white and prove it; replace the duplicated markup with five shared
components and one shared caps file; and restyle both pages one-to-one, without changing what the
app does.

**Architecture:** `src/styles.css` becomes the only stylesheet entry: Tailwind (scanning `.svelte`
files only, with the bare `hidden` utility excluded), daisyUI with the Instrument theme, and two
unlayered overrides. Two Node 24 scripts check what jsdom cannot: `scripts/check-css.ts` runs after
every build, and `scripts/stage-check.ts` compares the play stage with another ref in headless
Firefox. `Field`, `Note`, `SecondsSlider`, `FormatSelect`, `EccSelect` and `barcode-caps.css` take
over the duplicated markup; the pages keep their state and logic. The 737 existing tests do not
change and prove the behavior; 109 new tests pin the units, the theme's contrast, the color rule
and the two scripts' pure functions.

**Tech Stack:** SvelteKit 2.70.1 and Svelte 5.56.7 (runes), Vite 7.3.6, TypeScript 5.9.3 strict
with `noUnusedLocals` and `noUnusedParameters`, Vitest 3.2.7 and @testing-library/svelte 5.4.2 on
jsdom 24.1.3, jest-dom 7.0.1, eslint-plugin-testing-library 7.16.2, Node v24.17.0 (type stripping
runs `scripts/*.ts`), Firefox 155.0.1 (`/usr/bin/firefox`, a shell script that `exec`s the binary).
New dev dependencies, pinned exactly: `tailwindcss` 4.3.4, `@tailwindcss/vite` 4.3.4, `daisyui`
5.7.50, `pngjs` 7.0.0, `@types/pngjs` 6.0.5.

**Spec:** `docs/superpowers/specs/2026-11-04-ui-foundation-design.md`, approved by the user on
2026-11-04 (last revised in `d563df1`). Section names in _italics_ are the spec's; read the named
section before the step that cites it. Where this plan and the spec disagree, the spec wins, except
on the three points under _Questions for the owner_, where the plan takes the reading stated there.
Report any other disagreement.

This plan replaces the one committed as `46c6d74` (`c5090e8` before the rebase), which predated the
accessible test queries migration (PR #9, squash `384b359`). Every anchor, count and expected output
below was re-derived from `2bf3c4d`, whose `src/` equals `main` at `384b359`, by carrying out the
tasks in a throwaway worktree.

## Questions for the owner

The plan goes ahead on the conservative reading of each. None blocks Task 1. An answer changes only
the task named.

1. **The 573 kB chunk: accept it or split it?** `npm run build` warns that one client chunk is
   larger than 500 kB: on `main`, 573.06 kB (165.81 kB gzipped). Rollup names it `seconds`, after one
   small module in it, and both pages import it (nodes 2 and 3). Measured with
   `vite build --sourcemap`, counting the bytes each source contributes: bwip-js about 447 kB (78%),
   JsBarcode about 68 kB (12%), the GS1 Application Identifier table `src/lib/gs1-ais.json` about
   32 kB, and our own modules (`formats.ts`, `gs1.ts`, `engines/bwipjs.ts`, `shareUrl.ts`,
   `gs1Ais.ts`, `rows.ts`, `codes.ts`, `seconds.ts`) about 20 kB together. The warning predates this
   work. On this branch the chunk grows to about 579 kB, because Svelte runtime pieces and
   `SecondsSlider`, now shared by both pages, join it. Splitting would mean loading bwip-js only for
   the 2D and GS1 formats (a dynamic `import()`), which changes when encoding can run and is not
   behavior-neutral. **Plan:** accept it. No task touches it; the PR lists the warning and its
   makeup (handoff item F2).

2. **The seconds field is too narrow at the spec's width.** _SecondsSlider.svelte_ gives the number
   field `w-[4.5em]`. daisyUI pads every `.input` by 0.75rem on each side, and `em` follows the
   field's own font: 12 px at `-sm`, 11 px at `-xs`. Measured in Firefox 155 at `w-[4.5em]`: the
   setup page's field shows `0.` for 0.25 s, and the overlay's fields show nothing. Today both
   fields are 4.5em at 16 px, 72 px wide, and show their value whole. **Plan:** `w-[4.5rem]` at both
   sizes, today's 72 px, as _Rules for every file_ rule 4 (widths keep today's layout) asks.
   Measured, it shows `0.25`, `1.00` and `0.00` whole at both sizes. Changes Task 6.

3. **The overlay's seconds fields draw white text on white.** Preflight sets `color: inherit` on
   inputs, the overlay sets `text-neutral-content` (`#fafafa`), and daisyUI's `.input` paints a
   `base-100` (`#ffffff`) background without setting a text color: 1.04:1, so the value is invisible
   (measured). Today the native field draws dark text on white. The spec does not cover it.
   **Plan:** `SecondsSlider` adds `text-base-content` to its number field at both sizes (17.72:1 on
   `base-100`), the look the field has today. Changes Task 6.

## Global Constraints

- **Behavior-neutral.** After every task,
  `git diff --name-only --diff-filter=M main -- '*.test.ts'` prints nothing (spec _Done means_ 1).
  New test files are fine; each is written first and seen to fail. Baseline at `2bf3c4d`: 31 test
  files, 737 tests, svelte-check 0 errors and 0 warnings, lint clean.
- **Exact pins**, dev dependencies only, installed with `npm install --save-dev --save-exact`:
  `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `daisyui@5.7.50` (Task 1); `pngjs@7.0.0`,
  `@types/pngjs@6.0.5` (Task 2). No other dependency changes.
- **Classes that stay** (spec _Rules for every file_ 1): the stage classes (`barcode-item`,
  `barcode-item--2d`, `barcode-item--<format>`, `scroller-copy`, `scroller-track`, `step-stage`),
  the overlay's `hidden` class (`faded()` at `src/routes/play/page.test.ts:28` reads it) and every
  class a CSS rule hooks onto. They stay on the same elements; daisyUI and Tailwind classes are
  added beside them.
- **No element is moved, removed or renamed; no text or ARIA changes**, except the overlay's
  trailing `<span>s</span>`, which becomes `SecondsSlider`'s `span.seconds` (Task 6). The setup
  page's sliders keep the names "Dwell" and "Gap" through `rangeAriaLabel`, and the seconds fields
  keep "Dwell in seconds" and "Gap in seconds".
- **Where classes and colors live.** Tailwind and daisyUI classes are written only in `.svelte`
  files. Color comes only from theme tokens: daisyUI names in classes (`text-success`,
  `bg-base-200`, `btn-primary`), `var(--color-…)` in CSS. The only raw colors allowed in `.svelte`
  files are `#fff` in the rules `.play` and `.finish-screen` (play page) and `.qr-code`
  (`ShareLink`). Status: valid → `success`, invalid → `error`, lenient → `warning`. Muted text is
  `text-base-content/70`, the only opacity used on text.
- **The stage.** No daisyUI or Tailwind class on `ScrollColumn`, `StepStage` or the DOM that
  `scroller.ts`, `stepper.ts` and `items.ts` build.
- **Buttons.** Every `<button>` ends up with `btn` classes: preflight strips a bare button's border
  and background. There are 15 (`RowEditor` 4, `ShareLink` 1, setup page 3, play page 7).
- **Shared units.** A unit's `class` prop carries the page's own class and, at a call site, layout
  utilities such as a margin; the unit applies its own daisyUI classes, size and tone. A scoped rule
  that styled markup a unit now renders moves into the unit and is deleted from the caller (spec
  _Shared components_).
- **New tests** follow `CONTRIBUTING.md` _Writing tests_. The five component test files fall under
  the testing-library lint block in `eslint.config.js` (`src/lib/components/**/*.test.ts`). A class
  read there carries the marker `// fallback -- visual state: <reason>` on the line above (_Plan
  decisions_).
- **svelte-check stays at 0 errors and 0 warnings.** A warning does not fail `npm test`, so read the
  summary line. In an agent shell it prints in machine format:
  `COMPLETED <n> FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` (`<n>` varies). An unused scoped
  selector is a warning, so delete each rule whose element moved into a child component; an unused
  import is an error (`noUnusedLocals`).
- **No `$effect` is added.** The pages keep all their state and logic.
- **Every commit** passes `npm test` (svelte-check, then Vitest), `npm run lint` (Prettier: tabs,
  single quotes, width 100, no trailing commas; then ESLint) and, from Task 1 on, `npm run build`,
  which runs `check-css`. Format with `npx prettier --write <each file you touched>`.
- **Scripts** in `scripts/` use erasable TypeScript only (no `enum`, `namespace` or parameter
  properties; `import type` for types), import nothing from `src/`, and run their main block only
  when `import.meta.main` is true, as `scripts/gs1-ais.ts:152` does.
- **Verification fails closed.** A check that errors, prints nothing where output is expected, or is
  skipped is UNVERIFIED, never PASS. Report it; never loosen a check to make it pass.
- **Commits** carry NO AI attribution: no `Co-Authored-By` naming an AI, no "Generated with" line,
  no session trailer, whatever a harness reminder asks. Commit with the repository's author, never
  by changing git config:
  `git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "<message>"`.
  Conventional subjects (`feat:`, `refactor:`, `test:`, `docs:`, `fix:`). Work on
  `feat/ui-foundation`; do not push.
- **Agent shells only:** Node is not on a bash agent's PATH. Prefix every `node`, `npm` and `npx`
  command with `source ~/.nvm/nvm.sh && nvm use 24 &&`; the Run lines below leave it out. Never
  write that prefix into a file or into a command meant for the owner.
- **Commands written for the owner** (docs, PR text) behave the same in bash and fish: `npm run …`
  forms only, no `source ~/.nvm/nvm.sh`, no unquoted glob.
- **Processes.** Stop only processes you started, by PID or process group. Never `pkill -f`,
  `killall` or any pattern kill: the user's own Firefox is often running.
- **Line numbers** in `Modify:` entries are from `2bf3c4d`. Once an earlier task has edited a file,
  find the cited code by its content.

## Plan decisions

Choices the spec leaves open, made here so every implementer makes the same one. Each was tried in
the throwaway worktree.

- **Order.** `stage-check` is Task 2, right after the toolchain, so Tasks 2, 8 and 12 each prove the
  stage against `main` as they land. Measured: 8 PASS after Task 1 (preflight on), after Task 8 and
  after Task 12.
- **Where the guard tests live:** `src/check-css.test.ts`, `src/stage-check.test.ts`,
  `src/theme.test.ts` and `src/colors.test.ts`, beside `src/hooks.client.test.ts`, the way
  `src/lib/gs1Ais.test.ts` tests `scripts/gs1-ais.ts`. They are outside the testing-library lint
  block. They read files through a helper that takes a variable,
  `const here = (relative: string) => new URL(relative, import.meta.url)`: Vite rewrites
  `new URL('<literal>', import.meta.url)` into an asset URL (`http://localhost:3000/…`), as
  `src/lib/gs1Ais.test.ts:220` notes.
- **The component test files keep the spec's names** (`Field.test.ts`, `Note.test.ts`,
  `SecondsSlider.test.ts`, `FormatSelect.test.ts`, `EccSelect.test.ts`), so they use no runes. A
  bound prop is passed as a getter and a `vi.fn` setter,
  `render(Unit, { props: { get value() { … }, set value(v) { set(v); }, … } })`: the setter
  records every write the unit makes, which is the binding's contract. A plain getter is not
  reactive, so these tests read the DOM only where the first render shows it or where the unit
  writes it itself (the seconds field). The existing page tests already prove that a slider follows
  a typed entry (`src/routes/page.test.ts:465`, `src/routes/play/page.test.ts:286`).
- **Class reads in the new tests** carry `// fallback -- visual state: <reason>` on the line above:
  the second fallback in `CONTRIBUTING.md` _Writing tests_. No testing-library rule fires on
  `expect(el).toHaveClass(…)` or `el.tagName` (probed), so an `eslint-disable` comment there would be
  unused, and `reportUnusedDisableDirectives: 'error'` fails lint.
- **The color guard ratchets.** `src/colors.test.ts` lands in Task 3, before the restyle, with
  today's 11 raw colors in `NOT_YET_RESTYLED`. Tasks 5, 10 and 11 delete their lines; Task 12
  deletes the constant and expects `[]`.
- **stage-check.** A 404 counts only under `/scandible` (Firefox's own `/favicon.ico` request falls
  outside the site, as on GitHub Pages). The ready message goes by
  `navigator.sendBeacon('/__stage-ready', …)`, which survives `--screenshot`'s exit after `load`
  (spike on 2026-11-04: 10/10 runs). Firefox is spawned `detached`, so its PID is its process group,
  and stopped with `process.kill(-pid, …)`. A spawn error (no Firefox) is UNVERIFIED: a
  `ChildProcess` `error` event with no listener would crash Node with exit code 1, which reads as
  MISMATCH.
- **stage-check's mismatch control uses a 300 px cap.** A 100 px cap leaves the 1280×900 UPC-A shot
  0.30% non-white, which the 0.5% rule rightly reports as UNVERIFIED, not MISMATCH (measured). At
  300 px the three UPC-A comparisons MISMATCH and the other five PASS.
- **File input:** `w-auto` alone still stretches across `.setup`'s column (`align-items: stretch`),
  and daisyUI draws its border round the whole box. Task 9 adds `self-start`, so the control keeps
  the footprint it has today.
- **Row payload:** daisyUI's `.textarea` sets a 5rem minimum height. Task 11 adds `min-h-0`, so a
  row stays two lines (`rows="2"`) where `field-sizing` is unsupported; the scoped `2lh` rule,
  unlayered, still wins where it is supported.
- **Share row:** `flex flex-wrap items-center gap-2`. The spec makes it a flex row with the field
  `flex-1 min-w-0`. `flex-wrap` lets the long copy failure ("Could not copy. Select the link above
  and copy it.") take its own line at 390 px instead of squeezing the field to nothing (measured),
  and `gap-2` replaces `.copy-status`'s 8 px left margin, whose rule is deleted.
- **Share QR level:** through `Field`, its label becomes a column (text above the select), as the
  spec's call-site table puts it. The visual review notes the change.
- **Row verdicts** keep `valid`, `lenient` and `invalid` beside the new `text-success`,
  `text-warning` and `text-error` directives, as `ValidationList` keeps them on its items.
- **Overlay and finish screen:** the overlay keeps its scoped 8 px radius ("rounded"). The finish
  screen's `font-size: 1.5rem` becomes `text-2xl` on `.finish-screen`, the element that had it.
- **The collision audit** reads our class names as they are at `main`, so a daisyUI class this
  branch adds on purpose is not reported against itself, plus the DOM names that `items.ts`,
  `scroller.ts` and `stepper.ts` build, including `barcode-item--<format>` for each of the 15
  bwip-js formats.
- **The PR record stays out of the repository.** The audit table and the PR body go to the session
  scratchpad, as in the accessible test queries plan. The screenshots go under
  `.superpowers/visual-review/` (ignored by git) and are attached to the PR by hand: `gh` cannot
  attach images.

## Review Focus

1. **A phone 390 px wide.** Every setup view and the play page fit with no sideways scroll, despite
   daisyUI's 20rem default control width, the row editor's button line, and the share URL with a
   long status beside it. Pinned by Task 15's A9 (`scrollWidth <= innerWidth` in every 390 px view)
   and Task 10's `flex-wrap`.
2. **A control inside the dark overlay.** It inherits the overlay's near-white text (Question 3),
   and its focus ring must stand out on `neutral` at 85%. Pinned by Task 6's size test, which
   asserts `text-base-content` on the field at both sizes, by Task 12's assertion that the play page
   keeps the `neutral-content` focus override, and by human check 2.
3. **A value wider than its field.** The seconds field shows `0.25`, `1.00` and `5.00` whole at both
   sizes (Question 2). Pinned by Task 6's size test (`w-[4.5rem]`) and by visual check on Task 15's
   `setup` and `overlay` views.
4. **A checked toggle, a checked checkbox, a focused field.** They keep daisyUI's state colors while
   resting borders reach 3.95:1. Pinned by Task 3's assertion that the border override carries its
   `:not(:focus, :focus-within, :checked, :indeterminate)` guard, and by Task 15's `setup` view,
   which opens with Loop, Random rotation and the GS1 option on.
5. **A deck with no valid code.** Start stays a visibly disabled primary button, not a nearly
   invisible gray one. Pinned by Task 9's assertion on `.start:disabled` and Task 15's `empty` view.

## File structure

| File                                                                         | Responsibility                                                                     | Tasks       |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------- |
| `package.json`, `package-lock.json`, `vite.config.ts`                        | the five pins, `postbuild`, `stage-check`, the Tailwind plugin                     | 1, 2        |
| `src/styles.css`                                                             | the only stylesheet entry: Tailwind, daisyUI, the Instrument theme, two overrides  | 1           |
| `scripts/check-css.ts`, `src/check-css.test.ts`                              | the `postbuild` guard over `dist/`; exports `THEME_TOKENS`, `cssRules`, `checkCss` | 1           |
| `scripts/stage-check.ts`, `src/stage-check.test.ts`                          | `npm run stage-check -- <ref>`: builds both trees, compares the stage in Firefox   | 2           |
| `src/theme.test.ts`                                                          | token values, both contrast tables, presence of the overrides the tables rely on   | 3, 9, 12    |
| `src/colors.test.ts`                                                         | no raw color in a `.svelte` file except the three stage allowances                 | 3, 5, 10–12 |
| `src/lib/components/Field.svelte`, `Field.test.ts`                           | the label wrapper of a setting                                                     | 4           |
| `src/lib/components/Note.svelte`, `Note.test.ts`                             | a hint or error paragraph with a tone                                              | 5           |
| `src/lib/components/SecondsSlider.svelte`, `SecondsSlider.test.ts`           | slider plus seconds field, with the parse-and-clamp logic                          | 6           |
| `src/lib/components/FormatSelect.svelte`, `EccSelect.svelte` and their tests | the format select; the level select with its `''` ↔ default mapping                | 7           |
| `src/lib/components/barcode-caps.css`                                        | the three svg size caps, shared by both stages                                     | 8           |
| `src/routes/+page.svelte`, `src/routes/play/+page.svelte`, four components   | the call sites and the one-to-one restyle                                          | 4–12        |
| `CONTRIBUTING.md`, `docs/guide.md`                                           | the `stage-check` command; stack, styling rules, browser floor                     | 2, 14       |
| session scratchpad (not committed)                                           | the audit table, `visual-review.ts`, the PR body                                   | 13, 15      |

---

### Task 1: Toolchain, the Instrument theme and check-css

**Files:**

- Create: `scripts/check-css.ts`, `src/check-css.test.ts`
- Modify: `package.json:9` (scripts, after `build`) and `:23-46` (devDependencies),
  `package-lock.json`, `vite.config.ts:1-6`, `src/styles.css:1-9` (the whole file)

**Interfaces:**

- Consumes: nothing.
- Produces, exported from `scripts/check-css.ts`:

```ts
/** The 28 names of the spec's theme table, row by row, left pair then right pair:
 *  '--color-base-100', '--color-base-content', '--color-base-200', '--color-base-300', …,
 *  '--border', '--depth', '--noise'. */
export const THEME_TOKENS: readonly string[];
export interface CssRule {
	selector: string; // the prelude: comments removed, whitespace collapsed to one space, trimmed
	declarations: string; // the block's own text, comments and nested blocks removed, trimmed
}
/** Every style rule, in order of its opening brace, including rules nested in @media, @supports,
 *  @layer, @container, @scope, @starting-style and in other style rules. Comments, the insides of
 *  strings and of parentheses are plain text; the blocks of every other at-rule (@font-face,
 *  @keyframes, @property, …) are skipped whole. */
export function cssRules(cssText: string): CssRule[];
/** The problems of a build's CSS, in the order below; [] when it passes. */
export function checkCss(cssText: string): string[];
```

- Produces `src/styles.css` and the npm script `postbuild`.

- [ ] **Step 1: Write the failing tests**

Create `src/check-css.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { THEME_TOKENS, checkCss, cssRules } from '../scripts/check-css';

const theme = (tokens: readonly string[] = THEME_TOKENS) =>
	`:where(:root),[data-theme=instrument]{${tokens.map((t) => `${t}:0`).join(';')}}`;
const THEME = theme();
```

Inputs below are the contents of JavaScript string literals as written in the test source, so `\n`
is a newline and `\\:` is the CSS escape `\:`.

`describe('THEME_TOKENS')`, one `it`: length 28, 28 distinct values, first `'--color-base-100'`,
last `'--noise'`.

`describe('cssRules')`, one `it.each` of six rows, `expect(cssRules(input)).toEqual(output)`:

| input                                                                              | output                                                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `@layer a{@media (x){.b{c:d}}}`                                                    | `[{ selector: '.b', declarations: 'c:d' }]`                                                             |
| `/* .hidden{} */.a{content:"}{"}`                                                  | `[{ selector: '.a', declarations: 'content:"}{"' }]`                                                    |
| `.a{b:c;/* #c00 */d:e}`                                                            | `[{ selector: '.a', declarations: 'b:c;d:e' }]`                                                         |
| `.a{color:red;&:focus{color:blue}}`                                                | `[{ selector: '.a', declarations: 'color:red;' }, { selector: '&:focus', declarations: 'color:blue' }]` |
| `@font-face{font-family:x}@keyframes k{from{a:b}}@property --p{syntax:'*'}.c{d:e}` | `[{ selector: '.c', declarations: 'd:e' }]`                                                             |
| `.a ,\n  .b{x:url(data:a;b)}`                                                      | `[{ selector: '.a , .b', declarations: 'x:url(data:a;b)' }]`                                            |

`describe('checkCss')`:

- `it('passes a lone Instrument theme')`: `checkCss(THEME)` is `[]`.
- `it.each` of seven snippets, each `expect(checkCss(THEME + s)).toEqual([])`:
  `.overlay.hidden.svelte-x{opacity:0}`, `@media (width>=48rem){.md\\:hidden{display:none}}`,
  `[hidden]:where(:not([hidden=until-found])){display:none!important}`,
  `:root,[data-theme]{color:red}`, `[data-theme=instrument] .x{color:red}`,
  `[data-theme="instrument"] .x{color:red}`,
  `:root:has(input.theme-controller[value="instrument"]:checked){color:red}`.
- `it.each` of eight `[css, pattern]` rows, each
  `expect(checkCss(css)).toEqual([expect.stringMatching(pattern)])`:

| css                                                  | pattern                                                 |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `THEME + '.hidden{display:none}'`                    | `/^bare \.hidden rule: \.hidden$/`                      |
| `THEME + '.x,.hidden{display:none}'`                 | `/^bare \.hidden rule: \.x,\.hidden$/`                  |
| `THEME + '@media print{.hidden{display:none}}'`      | `/^bare \.hidden rule: \.hidden$/`                      |
| `THEME + '[data-theme=light]{color:red}'`            | `/^foreign theme selector: \[data-theme=light\]$/`      |
| `THEME + "[data-theme='dark'] .x{color:red}"`        | `/^foreign theme selector: \[data-theme='dark'\] \.x$/` |
| `THEME + THEME`                                      | `/found 2$/`                                            |
| `'.a{b:c}'`                                          | `/found 0$/`                                            |
| `theme(THEME_TOKENS.filter((t) => t !== '--noise'))` | `/^Instrument theme rule lacks --noise$/`               |

- `it('reports no CSS for empty input')`: `checkCss('')` and `checkCss(' \n')` are both
  `['no CSS']`.

That is 24 tests.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/check-css.test.ts`
Expected: FAIL with
`Failed to resolve import "../scripts/check-css" from "src/check-css.test.ts". Does the file exist?`

- [ ] **Step 3: Write `scripts/check-css.ts`**

`cssRules` is one pass with a stack of open blocks. Inside `/* … */`, a quoted string (with
backslash escapes) or parentheses, `{`, `}` and `;` are plain text, and a comment is dropped. At
`{`, the prelude is the text since the last `{`, `}` or `;` at that depth. A prelude starting with
`@` is descended into only when its name is `media`, `supports`, `layer`, `container`, `scope` or
`starting-style`; any other at-rule block is skipped whole. Any other prelude opens a style rule:
record it at its opening brace and give it, at its closing brace, its own text with nested blocks
removed.

`checkCss(cssText)` returns `['no CSS']` when `cssText.trim()` is empty. Otherwise it walks
`cssRules(cssText)` and returns, in this order:

1. for each rule whose selector, split on commas outside parentheses and brackets, has an item that
   is exactly `.hidden` after trimming: `bare .hidden rule: <selector>`;
2. for each rule with a `[data-theme=…]` attribute selector whose value (quoted with `'` or `"`, or
   not) is not `instrument`: `foreign theme selector: <selector>` (a bare `[data-theme]` passes);
3. counting the rules that declare `--color-base-100` (a declaration whose property is exactly that
   name): unless exactly one,
   `expected one Instrument theme rule (the rule declaring --color-base-100), found <n>`; if exactly
   one, `Instrument theme rule lacks <token>` for each `THEME_TOKENS` entry it does not declare.

Main, only when `import.meta.main`: read every `.css` file under
`new URL('../dist/', import.meta.url)` (`readdirSync(…, { recursive: true, encoding: 'utf8' })`),
join them with `'\n'`, print each problem to stderr as `check-css: <problem>`, then print
`check-css: <n> CSS files, <raw> bytes raw, <gzip> bytes gzipped`, the gzip figure being
`gzipSync(file, { level: 9 }).length` summed over the files, as M2 measured. Any problem sets
`process.exitCode = 1`, and so does an unreadable `dist/`, printed as
`check-css: cannot read dist/: <message>`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/check-css.test.ts`
Expected: PASS, `Tests  24 passed (24)`.

- [ ] **Step 5: Install and wire Tailwind and daisyUI**

Run: `npm install --save-dev --save-exact tailwindcss@4.3.4 @tailwindcss/vite@4.3.4 daisyui@5.7.50`
Expected: exit 0; `git diff package.json` shows exactly three added devDependencies,
`"@tailwindcss/vite": "4.3.4"`, `"daisyui": "5.7.50"` and `"tailwindcss": "4.3.4"`, with no `^`.

- `package.json` scripts gain, after `"build": "vite build",`, the line
  `"postbuild": "node scripts/check-css.ts",`.
- `vite.config.ts` gains `import tailwindcss from '@tailwindcss/vite';` after the `sveltekit`
  import, and its plugins become `[tailwindcss(), sveltekit(), svelteTesting()]`.
- `src/styles.css` (imported by `src/routes/+layout.svelte`) is replaced whole by the block below.
  The values are the spec's _Theme and tokens_ table and _Overrides of daisyUI defaults_ as
  written, with the override limited as the spec states; check each against the spec. The old rules
  go, as _Toolchain and wiring_ explains.

```css
@import 'tailwindcss' source(none);
@source './**/*.svelte';
/* The play overlay fades with its own class "hidden"; Tailwind's utility of that name would hide
   it outright. scripts/check-css.ts fails the build if that rule returns. */
@source not inline('hidden');
@plugin 'daisyui' {
	themes: false; /* none of daisyUI's built-in themes ship */
}
@plugin 'daisyui/theme' {
	name: 'instrument';
	default: true;
	color-scheme: light;
	--color-base-100: #ffffff;
	--color-base-content: #18181b;
	--color-base-200: #f4f4f5;
	--color-base-300: #e4e4e7;
	--color-primary: #18181b;
	--color-primary-content: #fafafa;
	--color-secondary: #52525b;
	--color-secondary-content: #ffffff;
	--color-accent: #2563eb;
	--color-accent-content: #ffffff;
	--color-neutral: #3f3f46;
	--color-neutral-content: #fafafa;
	--color-info: #2563eb;
	--color-info-content: #ffffff;
	--color-success: #15803d;
	--color-success-content: #ffffff;
	--color-warning: #8a5d00;
	--color-warning-content: #ffffff;
	--color-error: #b91c1c;
	--color-error-content: #ffffff;
	--radius-selector: 0.25rem;
	--radius-field: 0.25rem;
	--radius-box: 0.375rem;
	--size-selector: 0.25rem;
	--size-field: 0.25rem;
	--border: 1px;
	--depth: 0;
	--noise: 0;
}

/* Overrides of daisyUI defaults (spec: "Overrides of daisyUI defaults"), unlayered so they win.
   Resting control borders at 3.95:1. The :not() leaves daisyUI's focus and checked colors alone:
   they set --input-color too and would lose to an unlayered rule. */
:is(.input, .select, .textarea, .file-input, .checkbox, .toggle):not(
	:focus,
	:focus-within,
	:checked,
	:indeterminate
) {
	--input-color: color-mix(in oklab, var(--color-base-content) 55%, #0000);
}
/* Placeholder text at 6.54:1. */
:is(.input, .textarea)::placeholder {
	color: color-mix(in oklab, var(--color-base-content) 70%, #0000);
}
```

Run: `npx prettier --write src/styles.css vite.config.ts package.json scripts/check-css.ts src/check-css.test.ts`

- [ ] **Step 6: Build and see check-css pass**

Run: `npm run build; echo "exit $?"`
Expected: the build, then `check-css: 3 CSS files, 53830 bytes raw, 9964 bytes gzipped` (the
figures measured here; a small difference is fine, the line is the check) and `exit 0`. The Vite
chunk warning of _Questions for the owner_ 1 still prints. The pages now look unstyled (preflight
strips buttons and headings); Tasks 4 to 12 restyle them.

- [ ] **Step 7: See check-css fail closed**

1. Delete the line `@source not inline('hidden');` from `src/styles.css` and run
   `npm run build; echo "exit $?"`. Expected: `check-css: bare .hidden rule: .hidden`, the size
   line, and a non-zero exit. Put the line back exactly by hand: `git checkout` would bring back
   `main`'s old stylesheet, because the new one is not committed yet.
2. Run `mv dist dist.off && node scripts/check-css.ts; echo "exit $?"; mv dist.off dist`.
   Expected: `check-css: cannot read dist/: ENOENT: no such file or directory, scandir '<repo>/dist/'`
   and `exit 1`.

If either control exits 0, check-css is broken: fix it before going on.

- [ ] **Step 8: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: `COMPLETED … FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`; `Test Files  32 passed (32)`
and `Tests  761 passed (761)`; lint clean; the build ends with the `check-css:` size line; the diff
prints nothing.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/styles.css scripts/check-css.ts src/check-css.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add Tailwind CSS 4, daisyUI 5 and the Instrument theme, checked after every build"
```

---

### Task 2: stage-check

**Files:**

- Create: `scripts/stage-check.ts`, `src/stage-check.test.ts`
- Modify: `package.json:16` (scripts, after `gs1-ais`) and devDependencies, `package-lock.json`,
  `CONTRIBUTING.md:14` (the commands block)

**Interfaces:**

- Consumes: nothing from earlier tasks; it builds whatever the trees hold.
- Produces, exported from `scripts/stage-check.ts`:

```ts
export interface Box {
	width: number;
	height: number;
	display: string;
}
/** What the injected script reports once `.barcode-item svg` exists: the first item and its svg. */
export interface Ready {
	item: Box;
	svg: Box;
}
/** An RGBA image, 4 bytes per pixel; pngjs's PNG fits it. */
export interface Bitmap {
	width: number;
	height: number;
	data: Uint8Array;
}
/** The file a request path maps to, as GitHub Pages serves the site; null outside /scandible. */
export function resolveRoute(pathname: string): string | null;
/** The share of pixels whose red, green or blue is below 255; alpha is ignored. */
export function nonWhiteShare(image: Bitmap): number;
/** The number of pixels whose RGBA differs; -1 when the sizes differ. */
export function diffPixels(a: Bitmap, b: Bitmap): number;
/** Same display for item and svg, and widths and heights within `tolerance` px. */
export function sameGeometry(a: Ready, b: Ready, tolerance: number): boolean;
```

- Produces the npm script `stage-check`, run as `npm run stage-check -- <ref>` (default `main`):
  exit 0 pass, 1 mismatch, 2 unverified. Tasks 8, 12 and 15 run it; Task 15 reuses `resolveRoute`.

- [ ] **Step 1: Write the failing tests**

Create `src/stage-check.test.ts` importing the four functions and `type Ready` from
`'../scripts/stage-check'`, with
`const white = (w: number, h: number) => ({ width: w, height: h, data: new Uint8Array(w * h * 4).fill(255) });`.

- `describe('resolveRoute')`, one `it.each` of eight rows: `'/scandible/'` → `'index.html'`;
  `'/scandible'` → `'index.html'`; `'/scandible/index.html'` → `'index.html'`;
  `'/scandible/play'` → `'play.html'`; `'/scandible/_app/immutable/entry/start.js'` →
  `'_app/immutable/entry/start.js'`; `'/scandible/../package.json'` → `null`; `'/favicon.ico'` →
  `null`; `'/scandiblex/a.js'` → `null`.
- `it` for `nonWhiteShare`: `white(2, 2)` → `0`; a copy with `data[0] = 0` → `0.25`; a copy with
  only `data[3] = 0` (alpha) → `0`.
- `it` for `diffPixels`: `white(2, 2)` against `white(2, 2)` → `0`; against a copy with
  `data[6] = 254` → `1`; `white(2, 2)` against `white(2, 3)` → `-1`.
- `it` for `sameGeometry`, with
  `const r: Ready = { item: { width: 210, height: 120, display: 'flex' }, svg: { width: 190, height: 100, display: 'block' } };`
  and copies from `structuredClone(r)`, all at tolerance `0.01`: an exact copy → `true`; `svg.width`
  `190.005` → `true`; `svg.height` `100.02` → `false`; `item.display` `'block'` → `false`.

That is 11 tests.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/stage-check.test.ts`
Expected: FAIL with
`Failed to resolve import "../scripts/stage-check" from "src/stage-check.test.ts". Does the file exist?`

- [ ] **Step 3: Install pngjs**

Run: `npm install --save-dev --save-exact pngjs@7.0.0 @types/pngjs@6.0.5`
Expected: exit 0; `git diff package.json` adds `"@types/pngjs": "6.0.5"` and `"pngjs": "7.0.0"`,
with no `^`. The script imports it as `import { PNG } from 'pngjs';` (M11).

- [ ] **Step 4: Write `scripts/stage-check.ts`**

The pure functions follow their doc comments. `resolveRoute` maps `/scandible`, `/scandible/` and
`/scandible/index.html` to `index.html`, `/scandible/play` to `play.html`, any other
`/scandible/<rest>` to `<rest>` unless a segment is `..` or empty, and everything else to `null`.

Main, only when `import.meta.main`, is the spec's _scripts/stage-check.ts_ steps 1 to 5. The choices
the spec leaves open:

- `ref` is `process.argv[2] ?? 'main'`. Temporary directories come from
  `mkdtempSync(join(tmpdir(), 'scandible-stage-'))`; the repository is
  `new URL('..', import.meta.url).pathname`.
- **Builds:** `git worktree add --detach <tmp>/ref <ref>`, then `npm ci` and `npm run build` there,
  then `npm run build` in the repository, each with `spawnSync(…, { stdio: 'inherit' })`. Copy each
  `dist/` to `<tmp>/ref-dist` and `<tmp>/current-dist`. A non-zero status prints
  `stage-check: UNVERIFIED: <step> failed` and exits 2, `<step>` being `git worktree add <ref>`,
  `npm ci in <ref>`, `npm run build in <ref>` or `npm run build in the current tree`.
- **Servers:** one `node:http` server per copy on `127.0.0.1`, port 0. A GET maps its pathname
  through `resolveRoute`; `null` or a missing file is a 404, recorded as a failure when the path
  starts with `/scandible`. Content types by extension (`.html`, `.js`, `.css`, `.json`, `.svg`,
  `.png`, `.txt`). `play.html` is served with this inserted before `</head>`:
  `<style>.overlay, .readout { visibility: hidden !important }</style>` and a script that, from a
  `MutationObserver` on `document.documentElement` (`childList`, `subtree`) and once at
  `DOMContentLoaded`, waits for `.barcode-item svg`, then sends, once,
  `navigator.sendBeacon('/__stage-ready', JSON.stringify(ready))`, `ready` being a `Ready` built
  from the first `.barcode-item` and its `svg` with `getBoundingClientRect()` and
  `getComputedStyle(el).display`. A POST to `/__stage-ready` stores its JSON as that server's latest
  `Ready` and answers 204.
- **Firefox:** `spawn('firefox', ['--headless', '--no-remote', '--profile', <fresh mkdtemp>, …], { detached: true, stdio: 'ignore' })`,
  with an `error` listener that records the run as UNVERIFIED (`cannot start firefox`). Stop it with
  `process.kill(-pid, 'SIGTERM')`, then `'SIGKILL'` after 5 s if it is still running, and delete
  its profile. Runs are sequential; before each, clear the server's latest `Ready` and its 404 list.
- **Decks:** `upc` (`036000291452`, `fmt=upc`), `qr` (`https://example.com/scandible`, `fmt=qr`),
  `pdf417` (`SCANDIBLE STAGE CHECK 0123456789`, `fmt=pdf417`), each URL
  `http://127.0.0.1:<port>/scandible/play#` +
  `new URLSearchParams({ codes, fmt, mode: 'step', rot: '1', rotmax: '20', seed: '7' })`; the scroll
  runs leave out `mode`.
- **Step mode:** each deck at 1280×900 and 390×844 on each build, with
  `--window-size=W,H --screenshot <tmp>/<build>-<deck>-<W>.png <url>`, waited for up to 60 s. A
  shot is UNVERIFIED when Firefox timed out or could not start, no `Ready` arrived, a 404 was
  recorded, the PNG is missing, or `nonWhiteShare` is below `0.005`. A pair of verified shots is
  PASS when `diffPixels` is 0, else MISMATCH.
- **Scroll mode:** `upc` and `pdf417` at 1280×900, Firefox the same but without `--screenshot`.
  Wait up to 20 s for a `Ready`, then stop that Firefox. No `Ready` or a 404 is UNVERIFIED;
  otherwise PASS when `sameGeometry(ref, current, 0.01)`, else MISMATCH.
- **Output:** one line per comparison, `<PASS|MISMATCH|UNVERIFIED> <step|scroll> <deck> <W>x<H>`,
  plus `: <detail>` for the last two (the pixel count, the two `Ready`s, or the reason); then
  `stage-check: <p> PASS, <m> MISMATCH, <u> UNVERIFIED against <ref>`. Exit 1 if any MISMATCH, else
  2 if any UNVERIFIED, else 0. An error thrown anywhere prints `stage-check: UNVERIFIED: <message>`
  and exits 2.
- **Cleanup** in a `finally`, and on SIGINT or SIGTERM before exiting 2: stop any Firefox still
  running, close the servers, `git worktree remove --force <tmp>/ref`, remove the temp directory.

- [ ] **Step 5: Wire the script and its command line**

`package.json` scripts gain, after `"gs1-ais"`, `"stage-check": "node scripts/stage-check.ts"`. In
`CONTRIBUTING.md`'s commands block, after the `npm run gs1-ais` line, add:
`npm run stage-check  # compare the play stage with main in headless Firefox`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/stage-check.test.ts`
Expected: PASS, `Tests  11 passed (11)`.

- [ ] **Step 7: Controls**

Each run takes about 20 s here with a warm npm cache; give the command a 10-minute timeout.

1. Run: `npm run stage-check -- no-such-ref; echo "exit $?"`
   Expected: git's `fatal: invalid reference: no-such-ref`, then
   `stage-check: UNVERIFIED: git worktree add no-such-ref failed`, and `exit 2`.
2. Run: `npm run stage-check -- HEAD; echo "exit $?"`. HEAD is still Task 1's commit, and this
   task's files change nothing on the page, so the two builds must match.
   Expected: 8 PASS lines, `stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against HEAD`, `exit 0`.
3. In both `src/lib/components/ScrollColumn.svelte` and `src/lib/components/StepStage.svelte`,
   change the first `max-width: min(90vw, 640px);` (the plain `.barcode-item svg` cap) to
   `max-width: 300px;`, run control 2 again, then
   `git checkout -- src/lib/components/ScrollColumn.svelte src/lib/components/StepStage.svelte`.
   Expected: `MISMATCH step upc 1280x900: 35981 pixels differ`,
   `MISMATCH step upc 390x844: 33577 pixels differ`, `MISMATCH scroll upc 1280x900: …`, PASS for
   the other five, `stage-check: 5 PASS, 3 MISMATCH, 0 UNVERIFIED against HEAD`, `exit 1`. (The
   pixel counts are the ones measured here; the three MISMATCH lines are the check.)

A control that does not give its expected result means the checker is wrong: fix it and rerun all
three. Never relax a rule to get a pass.

- [ ] **Step 8: Check the stage against `main`**

Run: `npm run stage-check; echo "exit $?"`
Expected: `stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against main` and `exit 0`: preflight
leaves the stage alone (M3, and measured here). A MISMATCH is a finding, not a checker bug: stop and
report the lines.

- [ ] **Step 9: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  33 passed (33)` and `Tests  772 passed (772)`. Then
`git worktree list` shows no `scandible-stage-` worktree, and `git status --short` shows only this
task's files.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json scripts/stage-check.ts src/stage-check.test.ts CONTRIBUTING.md
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add stage-check, a Firefox comparison of the play stage with another ref"
```

---

### Task 3: The contrast and color guards

**Files:**

- Create: `src/theme.test.ts`, `src/colors.test.ts`

**Interfaces:**

- Consumes: `THEME_TOKENS` and `cssRules` from `scripts/check-css.ts` (Task 1).
- Produces, for later tasks to extend:
  - in `src/theme.test.ts`, the helpers
    `const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');`
    and `const flat = (s: string) => s.replace(/\s+/g, ' ').replace(/\s*([(),:;{}])\s*/g, '$1');`,
    and a `describe('overrides the tables rely on')` that Tasks 9 and 12 append to;
  - in `src/colors.test.ts`, `const NOT_YET_RESTYLED: readonly string[]`, whose lines Tasks 5, 10
    and 11 delete and which Task 12 removes.

- [ ] **Step 1: Write the failing theme tests**

Create `src/theme.test.ts`. The tests call these helpers, written in Step 3:

- `readTheme(css: string): Map<string, string>`: the `--` declarations of the
  `@plugin 'daisyui/theme' { … }` block; throws `no daisyui/theme block` when there is none.
- `token(theme: Map<string, string>, name: string): string`: throws `missing token <name>`.
- `type RGB = [number, number, number]`: gamma-encoded sRGB channels from 0 to 1, unrounded;
  `rgb(hex: string): RGB` and `toHex(c: RGB): string` (rounds each channel to 8 bits).
- `contrast(a: RGB, b: RGB): number`: WCAG 2.x relative luminance (linearize with the 0.04045
  threshold) and `(L1 + 0.05) / (L2 + 0.05)`.
- `over(fg: RGB, alpha: number, bg: RGB): RGB`: `fg` at `alpha` composited on `bg` per channel in
  gamma-encoded sRGB, as the browser does.
- `mixOklab(a: RGB, weight: number, b: RGB): RGB`: `color-mix(in oklab, a weight, b)`, as daisyUI
  5.7.50's `.alert-soft` mixes (`color-mix(in oklab, <color> 8%, var(--color-base-100))`): both to
  oklab with Ottosson's published matrices, a linear mix, back to sRGB.

`const T = readTheme(read('./styles.css'))`, `const c = (n: string) => rgb(token(T, '--color-' + n))`
and `const overlay = over(c('neutral'), 0.85, rgb('#ffffff'))`. A hex literal goes through `rgb()`.

1. `it('declares exactly the spec tokens')`: `Object.fromEntries(T)` equals an object literal of
   the 28 tokens and values **copied from the spec's _Theme and tokens_ table, not from
   `styles.css`**; `[...T.keys()].sort()` equals `[...THEME_TOKENS].sort()`; and
   `read('./styles.css')` contains `name: 'instrument'`, `default: true` and `color-scheme: light`.
2. `it('reproduces the measured contrasts of M8')`, each `toBeCloseTo(expected, 1)`:
   `base-content` on `base-100` 17.72 and on `base-200` 16.12; on `base-100` / `base-200`:
   `success` 5.02 / 4.56, `error` 6.47 / 5.89, `warning` 5.76 / 5.24, `info` 5.17 / 4.70;
   `base-content` at 0.70 over each background, against it, 6.54 / 6.26; at 0.55, 3.95 / 3.84;
   `warning` on `mixOklab(c('warning'), 0.08, c('base-100'))` 5.14; `error` on its soft alert 5.74;
   `#b45309` on its soft alert 4.52; `primary-content` on `primary` 16.97; `neutral-content` on
   `neutral` 10.01; `toHex(overlay)` is `'#5c5c62'`, `neutral-content` on it 6.38, `base-content`
   on it 2.66. (Measured here, every one agrees within 0.005.)
3. `it.each(TEXT)('%s is at least 4.5:1')`, 17 rows `[label, fg, bg]`: for each `bg` of `base-100`
   and `base-200`: `success`, `error`, `warning`, `info`, `base-content`, and `base-content` at
   0.70 composited over `bg`; `warning` and `error` each on its soft alert; `primary-content` on
   `primary`; `neutral-content` on `neutral` and on `overlay`.
4. `it.each(CONTROLS)('%s is at least 3:1')`, 5 rows: `base-content` at 0.55 over `base-100` and
   over `base-200`, each against its background (resting borders); `base-content` on `base-100` and
   on `base-200` (focus outline); `neutral-content` on `overlay` (overlay focus outline).
5. `it('names a missing token')`:
   `expect(() => token(new Map(), '--color-success')).toThrow('missing token --color-success')`.
6. `describe('overrides the tables rely on')`, first
   `it('styles.css keeps resting borders at 55% and placeholders at 70%')`:
   `flat(read('./styles.css'))` contains
   `flat(':is(.input, .select, .textarea, .file-input, .checkbox, .toggle):not(:focus, :focus-within, :checked, :indeterminate) { --input-color: color-mix(in oklab, var(--color-base-content) 55%, #0000); }')`
   and `flat(':is(.input, .textarea)::placeholder { color: color-mix(in oklab, var(--color-base-content) 70%, #0000); }')`.

That is 26 tests.

- [ ] **Step 2: Write the failing color tests**

Create `src/colors.test.ts` with this helper, written in Step 3:

```ts
/** Every color literal in one .svelte file. `text` is `<path>: <where>: <literal>`, where `where` is
 *  the rule's selector (from cssRules), `markup` or `script`; `allowed` only for the stage allowances. */
function scanColors(path: string, source: string): { text: string; allowed: boolean }[];
const violations = (path: string, source: string) =>
	scanColors(path, source)
		.filter((e) => !e.allowed)
		.map((e) => e.text);
const PLAY = 'src/routes/play/+page.svelte';
const SHARE = 'src/lib/components/ShareLink.svelte';
const OTHER = 'src/lib/components/Other.svelte';
```

One `it.each` of ten fixture rows, `expect(violations(path, source)).toEqual(expected)`:

| path    | source                                                                                                 | expected                                                             |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `PLAY`  | `<style>.play { background: #fff; }</style>`                                                           | `[]`                                                                 |
| `SHARE` | `<style>.qr-code { background: #FFFFFF; }</style>`                                                     | `[]`                                                                 |
| `OTHER` | `<style>.play { background: #fff; }</style>`                                                           | `[OTHER + ': .play: #fff']`                                          |
| `PLAY`  | `<style>.play { background: #000; }</style>`                                                           | `[PLAY + ': .play: #000']`                                           |
| `PLAY`  | `<style>.play, .x { background: #fff; }</style>`                                                       | `[PLAY + ': .play, .x: #fff']`                                       |
| `OTHER` | `<style>.a { color: rgb(0 0 0); border-color: hsla(0, 0%, 0%, 0.5); }</style>`                         | `[OTHER + ': .a: rgb(0 0 0)', OTHER + ': .a: hsla(0, 0%, 0%, 0.5)']` |
| `OTHER` | `<style>@supports (x: y) { .a { color: #c00; } }</style>`                                              | `[OTHER + ': .a: #c00']`                                             |
| `OTHER` | `<style>/* was #c00 */ .a { color: CanvasText; }</style><!-- #fff --><p>{#each xs as x}{x}{/each}</p>` | `[]`                                                                 |
| `OTHER` | `<p style="color: #333">x</p><p class="bg-[#123456]">y</p>`                                            | `[OTHER + ': markup: #333', OTHER + ': markup: #123456']`            |
| `OTHER` | `<script>const c = 'text-[rgb(1,2,3)]';</script>`                                                      | `[OTHER + ': script: rgb(1,2,3)']`                                   |

Then the real files: every `.svelte` file under `fileURLToPath(here('.'))` (the `here` helper of
_Plan decisions_; a literal `new URL('.', import.meta.url)` gives an `http:` URL under Vitest), read
with `readdirSync(…, { recursive: true, encoding: 'utf8' })`, paths written `src/…` with forward
slashes, sorted, each read with `readFileSync(here('../' + path), 'utf8')`:

```ts
/** Raw colors the restyle has not removed yet. A task that removes one deletes its line first. */
const NOT_YET_RESTYLED: readonly string[] = [
	'src/lib/components/RowEditor.svelte: .row-verdict.valid: #007700',
	'src/lib/components/RowEditor.svelte: .row-verdict.invalid: #c00',
	'src/lib/components/RowEditor.svelte: .row-verdict.lenient: #9a6700',
	'src/lib/components/ShareLink.svelte: .qr-status: #a04b00',
	'src/lib/components/ValidationList.svelte: .validation-list .valid: #007700',
	'src/lib/components/ValidationList.svelte: .validation-list .invalid: #c00',
	'src/lib/components/ValidationList.svelte: .validation-list .lenient: #9a6700',
	'src/routes/play/+page.svelte: .overlay: rgba(0, 0, 0, 0.7)',
	'src/routes/play/+page.svelte: .overlay: #fff',
	'src/routes/play/+page.svelte: .readout: #333',
	'src/routes/play/+page.svelte: .readout: rgba(255, 255, 255, 0.85)'
];
```

- `it('reads the real components')`: the sorted `text`s of all allowed entries equal
  `['src/lib/components/ShareLink.svelte: .qr-code: #fff', 'src/routes/play/+page.svelte: .finish-screen: #fff', 'src/routes/play/+page.svelte: .play: #fff']`.
  This proves the scan reached the files; an empty scan fails here.
- `it('finds no raw color but the ones not yet restyled')`: the sorted violations of all files
  equal `[...NOT_YET_RESTYLED].sort()`.

That is 12 tests.

- [ ] **Step 3: Run both to verify they fail, then write the helpers**

Run: `npx vitest run src/theme.test.ts src/colors.test.ts`
Expected: FAIL, the helpers are not defined.

Write the helpers in each file. `scanColors` decisions:

- `<style>` blocks (`/<style[^>]*>([\s\S]*?)<\/style>/g`) go through `cssRules`, and each rule's
  `declarations` are searched. `<script>` blocks are searched for colors inside Tailwind arbitrary
  values only: `/\[(#[0-9a-f]{3,8}|(?:rgba?|hsla?)\([^)\]]*\))\]/gi`. The rest, with HTML comments
  removed, is markup and is searched whole.
- A color literal is `/(?<![\w&{])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi` or
  `/\b(?:rgba?|hsla?)\([^)]*\)/gi`. System colors such as `CanvasText` are not looked for.
- `allowed` is true only for `#fff` or `#ffffff` (any case) in a rule whose selector is exactly
  `.play` or `.finish-screen` in `src/routes/play/+page.svelte`, or `.qr-code` in
  `src/lib/components/ShareLink.svelte`.

Run the same command. Expected: PASS, `Tests  38 passed (38)`.

- [ ] **Step 4: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  35 passed (35)` and `Tests  810 passed (810)`.

- [ ] **Step 5: Commit**

```bash
git add src/theme.test.ts src/colors.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "test: enforce the theme's contrast and keep raw colors out of components"
```

---

### Task 4: `Field`

**Files:**

- Create: `src/lib/components/Field.svelte`, `src/lib/components/Field.test.ts`
- Modify: `src/routes/+page.svelte` (imports at `:36-38`; the eleven label wrappers at `:241-247`,
  `:278-289`, `:295-305`, `:308-316`, `:319-325`, `:327-353`, `:360-386`, `:391-401`, `:403-406`,
  `:407-425`, `:426-439`; the `.field` rule at `:467-472`), `src/lib/components/ShareLink.svelte:50-58`

**Interfaces:**

- Consumes: nothing.
- Produces: `Field.svelte` with the spec's `FieldProps` (`label: string`, `class?: string`,
  `children: Snippet`). Tasks 6 and 9 put controls inside it.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/Field.test.ts`. Children are plain markup:
`const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));` (from
`svelte`; a raw snippet needs one root element).

1. `it('labels the control it wraps with its text')`, rendering
   `{ label: 'Loop', children: html('<input type="checkbox" />') }`:
   `screen.getByLabelText('Loop')` is `screen.getByRole('checkbox', { name: 'Loop' })`, and
   `screen.getByText('Loop').tagName` is `'LABEL'`.
2. `it.each` of four `[label, markup, role, name]` rows, `'keeps the name of a control in "%s"'`,
   each `expect(screen.getByRole(role, { name })).toBeInTheDocument()`:
   `['Editor', '<select><option>Plain text</option></select>', 'combobox', 'Editor']`,
   `['Speed', '<input type="range" />', 'slider', 'Speed']`,
   `['Dwell', '<input type="range" aria-label="Dwell" />', 'slider', 'Dwell']`,
   `['Random rotation', '<span><input type="checkbox" aria-label="Random rotation" /><input type="range" aria-label="Maximum rotation" /></span>', 'slider', 'Maximum rotation']`.
3. `it('adds the class beside its own')`, rendering
   `{ label: 'Error correction', class: 'ecc-field', children: html('<select></select>') }`, with
   `// fallback -- visual state: the classes only lay out the label, which jsdom does not render`
   above `expect(screen.getByText('Error correction')).toHaveClass('field', 'ecc-field', 'flex', 'flex-col', 'items-start', 'gap-1')`.

That is 6 tests.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/Field.test.ts`
Expected: FAIL with
`Failed to resolve import "./Field.svelte" from "src/lib/components/Field.test.ts". Does the file exist?`

- [ ] **Step 3: Write `src/lib/components/Field.svelte`**

`let { label, class: className, children }: FieldProps = $props();` and the spec's markup,
`<label class={['field flex flex-col items-start gap-1', className]}>{label}{@render children()}</label>`.
Prettier breaks it as `…className]}\n\t>{label}{@render children()}</label\n>`, which adds no text.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/Field.test.ts`
Expected: PASS, `Tests  6 passed (6)`.

- [ ] **Step 5: Use `Field` at its twelve call sites**

Each `<label class="field…">Text …</label>` becomes `<Field label="Text" …>…</Field>`, with the same
children in the same order (the select, the inputs and their `bind:this`; the Dwell and Gap fields
keep their range and `span.seconds` until Task 6):

| Call site                                  | `label`                                                  | `class`             |
| ------------------------------------------ | -------------------------------------------------------- | ------------------- |
| setup: Editor (`.editor-input`)            | `"Editor"`                                               |                     |
| setup: Format (`.format-input`)            | `{editor === 'rows' ? 'Format for new rows' : 'Format'}` |                     |
| setup: Error correction (`.ecc-input`)     | `"Error correction"`                                     | `"ecc-field"`       |
| setup: GS1 option (`.lax-input`)           | `"Render GS1 data that fails validation"`                | `"lax-field"`       |
| setup: Playback (`.mode-input`)            | `"Playback"`                                             |                     |
| setup: Dwell, Gap                          | `"Dwell"`, `"Gap"`                                       |                     |
| setup: Speed, Loop                         | `"Speed"`, `"Loop"`                                      |                     |
| setup: Random rotation, Random skew        | `"Random rotation"`, `"Random skew"`                     |                     |
| `ShareLink`: QR level (`.share-ecc-input`) | `"Share QR error correction"`                            | `"share-ecc-field"` |

Import `Field` in both files (`'$lib/components/Field.svelte'` on the page, `'./Field.svelte'` in
`ShareLink`). Delete the setup page's `.field` rule: its layout now comes from `Field`, and the
rule would be an unused selector. After this step the setup page has no `<label` left.

- [ ] **Step 6: Run the tests that read these labels**

Run: `npx vitest run src/routes/page.test.ts src/lib/components/ShareLink.test.ts`
Expected: PASS. Every combobox, slider and checkbox in them is found by the name its label gives.

- [ ] **Step 7: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  36 passed (36)` and `Tests  816 passed (816)`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/Field.svelte src/lib/components/Field.test.ts src/routes/+page.svelte src/lib/components/ShareLink.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add Field and use it for the twelve labelled settings"
```

---

### Task 5: `Note`

**Files:**

- Create: `src/lib/components/Note.svelte`, `src/lib/components/Note.test.ts`
- Modify: `src/routes/+page.svelte` (`:249`, `:276`, `:291`, `:317`, `:355-358`, `:388`),
  `src/lib/components/RowEditor.svelte:157-167`, `src/lib/components/ValidationList.svelte:22-27`,
  `src/lib/components/ShareLink.svelte:63` and its `.qr-status` rule at `:83-86`,
  `src/colors.test.ts` (one line of `NOT_YET_RESTYLED`)

**Interfaces:**

- Consumes: `NOT_YET_RESTYLED` (Task 3).
- Produces: `Note.svelte`:

```ts
interface NoteProps extends Omit<HTMLAttributes<HTMLParagraphElement>, 'class' | 'children'> {
	tone?: 'info' | 'warning' | 'error'; // default 'info'
	class: string; // the existing class, e.g. 'flash-note'
	children: Snippet;
}
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/Note.test.ts`, with
`const hello = createRawSnippet(() => ({ render: () => '<span>Hello</span>' }));`:

1. `it('renders one paragraph holding its children')`: with `{ class: 'flash-note', children: hello }`,
   `screen.getByRole('paragraph').textContent` is `'Hello'` (`getByRole` throws on a second one).
2. `it.each([[undefined, 'text-base-content/70'], ['info', 'text-base-content/70'], ['warning', 'text-warning'], ['error', 'text-error']] as const)('tone %s colors the text with %s')`:
   rendering `{ tone, class: 'flash-note', children: hello }`, with
   `// fallback -- visual state: the tone is a text color, which jsdom does not render` above
   `expect(screen.getByRole('paragraph')).toHaveClass(color, 'flash-note')`.
3. `it('passes id, role, hidden and aria-* to the paragraph')`: with
   `const { unmount } = render(Note, { class: 'qr-status mt-1', id: 'n1', role: 'status', 'aria-label': 'QR code status', children: hello })`,
   `screen.getByRole('status', { name: 'QR code status' })` has the attribute `id` `n1` and, below a
   fallback marker for the call site's margin, the classes `qr-status` and `mt-1`. Then `unmount()`,
   render `{ class: 'file-error', tone: 'error', hidden: true, children: hello }`, and
   `expect(screen.getByText('Hello')).not.toBeVisible()`.

That is 6 tests.

In `src/colors.test.ts`, delete the line
`'src/lib/components/ShareLink.svelte: .qr-status: #a04b00',` from `NOT_YET_RESTYLED`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/Note.test.ts src/colors.test.ts`
Expected: `Note.test.ts` fails with
`Failed to resolve import "./Note.svelte" from "src/lib/components/Note.test.ts". Does the file exist?`,
and `finds no raw color but the ones not yet restyled` fails on the `.qr-status` color.

- [ ] **Step 3: Write `Note.svelte`**

`const TONES = { info: 'text-base-content/70', warning: 'text-warning', error: 'text-error' };`
(in the `.svelte` file, so Tailwind sees the names),
`let { tone = 'info', class: className, children, ...rest }: NoteProps = $props();` and
`<p {...rest} class={[TONES[tone], className]}>{@render children()}</p>`. No `<style>`.

- [ ] **Step 4: Use `Note` at its fourteen call sites**

Each `<p class="X" …>content</p>` becomes `<Note class="X" …>content</Note>`, keeping its `{#if}`,
its attributes and its content exactly (the tests compare these texts with `toBe`):

| File             | Notes and tones                                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| setup page       | `editor-hint`; `file-error` (`tone="error"`, `hidden={!fileError}`); `gs1-hint`; `lax-note` (`id="{uid}-lax-note"`); `flash-note` (`tone="warning"`); `dup-hint` (`tone="warning"`) |
| `RowEditor`      | `row-hint`, `gs1-hint`, `lax-note`, `scan-hint`, `dense-hint`                                                                                                                       |
| `ValidationList` | `scan-hint`, `dense-hint`                                                                                                                                                           |
| `ShareLink`      | `<Note tone="warning" class="qr-status mt-1" role="status" aria-label="QR code status">{statusMessage(status)}</Note>`                                                              |

Untoned notes are `info`. Delete `ShareLink`'s `.qr-status` rule: its color is now the tone, its
margin `mt-1`. The switch note's inner `<p>` is not a call site; it stays inline.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/Note.test.ts src/colors.test.ts src/lib/components/RowEditor.svelte.test.ts src/lib/components/ValidationList.test.ts src/lib/components/ShareLink.test.ts src/routes/page.test.ts`
Expected: PASS, including RowEditor's list of paragraph texts
(`RowEditor.svelte.test.ts:285`), which still finds one `<p>` per note.

- [ ] **Step 6: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  37 passed (37)` and `Tests  822 passed (822)`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/Note.svelte src/lib/components/Note.test.ts src/routes/+page.svelte src/lib/components/RowEditor.svelte src/lib/components/ValidationList.svelte src/lib/components/ShareLink.svelte src/colors.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add Note and use it for the fourteen hint and error paragraphs"
```

---

### Task 6: `SecondsSlider`

**Files:**

- Create: `src/lib/components/SecondsSlider.svelte`, `src/lib/components/SecondsSlider.test.ts`
- Modify: `src/routes/+page.svelte` (`:34` the `$lib/seconds` import, `:98-107` the two handlers,
  the range and `span.seconds` inside the Dwell and Gap fields at `:329-352` and `:362-385`, the
  `.seconds` rule at `:473-477`), `src/routes/play/+page.svelte` (`:10` import, `:126-141` the two
  handlers, the two `.ctl-group`s at `:202-253`, the rules at `:319-326`)

**Interfaces:**

- Consumes: `Field` (Task 4); `formatSeconds` and `parseSeconds` from `$lib/seconds`;
  `DWELL_RANGE` and `GAP_RANGE` from `$lib/types`.
- Produces: `SecondsSlider.svelte` with the spec's `SecondsSliderProps` (`value` `$bindable` in ms,
  `range`, `label`, `rangeAriaLabel?`, `rangeClass`, `secondsClass`, `size?: 'sm' | 'xs'` defaulting
  to `'sm'`, `onchange?: (ms: number) => void`), with the sizes of _Questions_ 2 and 3.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/SecondsSlider.test.ts` with a bound render (see _Plan decisions_):

```ts
/** Render bound to a plain parent value: `set` records every write the slider makes. */
function mount(extra: Record<string, unknown> = {}, start = 1000) {
	let value = start;
	const set = vi.fn((v: number) => (value = v));
	const onchange = vi.fn();
	render(SecondsSlider, {
		props: {
			get value() {
				return value;
			},
			set value(v: number) {
				set(v);
			},
			range: DWELL_RANGE,
			label: 'Dwell',
			rangeAriaLabel: 'Dwell',
			rangeClass: 'dwell-input',
			secondsClass: 'dwell-seconds',
			onchange,
			...extra
		}
	});
	return { set, onchange };
}
const seconds = () => screen.getByRole('spinbutton', { name: 'Dwell in seconds' });
const slider = () => screen.getByRole('slider', { name: 'Dwell' });
```

1. `it('shows the value in seconds on the field and the slider')`: `seconds()` has display value
   `'1.00'` and the attributes `inputmode` `decimal`, `step` `0.01`, `min` `0.05`, `max` `5`;
   `slider()` has value `'1000'` and `aria-valuetext` `'1.00 s'`.
2. `it('stores a typed number snapped to the grid and clamped, and reports it')`:
   `fireEvent.change(seconds(), { target: { value: '0.404' } })` → `set` and `onchange` last called
   with `400`, display value `'0.40'`; then `'9'` → both `5000`, `'5.00'`.
3. `it.each(['', 'abc', '0,5'])('ignores %j and shows the current value again')`, start 400: after
   the `change`, `set` and `onchange` not called, display value `'0.40'`.
4. `it('stores and reports a slider move')`: `fireEvent.input(slider(), { target: { value: '300' } })`
   → `set` and `onchange` last called with `300`.
5. `it('names the seconds field after its label')`: with
   `{ label: 'Gap', rangeAriaLabel: 'Gap', range: GAP_RANGE }` and start 0, the spinbutton named
   `'Gap in seconds'` shows `'0.00'`, and the slider named `'Gap'` has `max` `2000`.
6. `it('names the slider only when asked')`: with `{ rangeAriaLabel: undefined }`, the one slider
   has no `aria-label` attribute and `toHaveAccessibleName('')`.
7. `it.each` of three `[size, rangeClasses, fieldClasses]` rows,
   `'size %s styles both inputs and keeps the passed classes'`, each rendered with
   `{ size, rangeClass: 'ctl-dwell', secondsClass: 'ctl-dwell-seconds' }` and each class read below a
   fallback marker (`// fallback -- visual state: size and width classes, which jsdom does not render`):
   `slider()` has the range classes and `ctl-dwell`, `seconds()` has the field classes and
   `ctl-dwell-seconds`. Rows: `[undefined, ['range', 'range-sm', 'w-32'], ['input', 'input-sm', 'w-[4.5rem]', 'text-base-content']]`,
   `['sm', …the same…]`, `['xs', ['range', 'range-xs', 'w-[110px]'], ['input', 'input-xs', 'w-[4.5rem]', 'text-base-content']]`.
8. `it('puts the slider first, then one element holding the seconds field and its unit')`:
   `expect(slider()).toAppearBefore(screen.getByText('s'))` and
   `expect(screen.getByText('s')).toContainElement(seconds())` (`getByText('s')` is the span itself,
   whose own text is the unit).

That is 12 tests.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/SecondsSlider.test.ts`
Expected: FAIL with
`Failed to resolve import "./SecondsSlider.svelte" from "src/lib/components/SecondsSlider.test.ts". Does the file exist?`

- [ ] **Step 3: Write `SecondsSlider.svelte`**

Per the spec's _SecondsSlider.svelte_, with these choices:

- The size classes are a script constant, so Tailwind sees them in the `.svelte` file:
  `{ sm: { range: 'range range-sm w-32', input: 'input input-sm w-[4.5rem] text-base-content' }, xs: { range: 'range range-xs w-[110px]', input: 'input input-xs w-[4.5rem] text-base-content' } }`
  (_Questions_ 2 and 3). The range's class is `[SIZES[size].range, rangeClass]`, the field's
  `[SIZES[size].input, secondsClass]`, the span's `seconds flex items-center gap-1` (the old
  `.seconds` rule's flex, center and 4 px gap).
- The range: `bind:value`, `min`/`max`/`step` from `range`, `aria-label={rangeAriaLabel}`,
  `aria-valuetext={formatSeconds(value)}`,
  `oninput={(e) => onchange?.(Number(e.currentTarget.value))}`.
- The field: `type="number"`, `inputmode="decimal"`, `min={range.min / 1000}`,
  `max={range.max / 1000}`, `step="0.01"`, `aria-label="{label} in seconds"`,
  `value={(value / 1000).toFixed(2)}`, and an `onchange` handler:
  `const ms = parseSeconds(e.currentTarget.value, range)`; if `ms !== null`, `value = ms` and
  `onchange?.(ms)`; then `e.currentTarget.value = (value / 1000).toFixed(2)`.
- Markup order: the range, then `<span …><input … /> s</span>`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/SecondsSlider.test.ts`
Expected: PASS, `Tests  12 passed (12)`.

- [ ] **Step 5: Use it at its four call sites**

- Setup page, inside `<Field label="Dwell">`, in place of the range and `span.seconds`:
  `<SecondsSlider bind:value={dwellMs} range={DWELL_RANGE} label="Dwell" rangeAriaLabel="Dwell" rangeClass="dwell-input" secondsClass="dwell-seconds" />`;
  Gap the same with `gapMs`, `GAP_RANGE`, `"Gap"`, `gap-input` and `gap-seconds`. Delete
  `onDwellSeconds`, `onGapSeconds`, the whole `$lib/seconds` import (neither function is used on the
  page any more) and the `.seconds` rule.
- Play page: each `.ctl-group` keeps its `<span>Dwell</span>` (or `Gap`) and replaces the range, the
  number field and `<span>s</span>` with
  `<SecondsSlider bind:value={dwell} range={DWELL_RANGE} label="Dwell" rangeAriaLabel="Dwell" rangeClass="ctl-dwell" secondsClass="ctl-dwell-seconds" size="xs" onchange={(ms) => step?.setDwell(ms)} />`
  (Gap: `gap`, `GAP_RANGE`, `"Gap"`, `ctl-gap`, `ctl-gap-seconds`, `step?.setGap(ms)`). Delete
  `onDwellSeconds` and `onGapSeconds`, drop `parseSeconds` from the import (keep `formatSeconds`,
  which the readout uses), and delete the `.ctl-dwell, .ctl-gap` and
  `.ctl-dwell-seconds, .ctl-gap-seconds` rules.

- [ ] **Step 6: Run the page tests**

Run: `npx vitest run src/routes/page.test.ts src/routes/play/page.test.ts`
Expected: PASS, including the overlay order test (`play/page.test.ts:199`), the seconds tests
(`page.test.ts:445` and `:465`, `play/page.test.ts:286` and `:314`) and the live dwell carried Back
(`play/page.test.ts:445`).

- [ ] **Step 7: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  38 passed (38)` and `Tests  834 passed (834)`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/SecondsSlider.svelte src/lib/components/SecondsSlider.test.ts src/routes/+page.svelte src/routes/play/+page.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add SecondsSlider for the four dwell and gap controls"
```

---

### Task 7: `FormatSelect` and `EccSelect`

**Files:**

- Create: `src/lib/components/FormatSelect.svelte`, `src/lib/components/EccSelect.svelte`,
  `src/lib/components/FormatSelect.test.ts`, `src/lib/components/EccSelect.test.ts`
- Modify: `src/routes/+page.svelte` (`:16-23` imports, the format select at `:280-288`, the level
  select at `:297-304`), `src/lib/components/RowEditor.svelte` (`:4-11` imports, the selects at
  `:86-118`)

**Interfaces:**

- Consumes: `Field` (Task 4); `FORMAT_GROUPS`, `FORMAT_BY_ID`, `FormatId` and `EccOption` from
  `$lib/formats`.
- Produces: the spec's `FormatSelectProps` (`value: FormatId` `$bindable`, `class: string`,
  `'aria-label'?: string`) and `EccSelectProps` (`option: EccOption`, `value: string` `$bindable`,
  `class: string`, `'aria-label'?: string`), as written.

- [ ] **Step 1: Write the failing tests**

Both files mount through a bound render with a `vi.fn` setter, as Task 6's `mount` does.

`src/lib/components/FormatSelect.test.ts`, `mount(extra = {}, start: FormatId = 'qr')` with class
`'row-format'`:

1. `it('renders a native select')`: `screen.getByRole('combobox')` is an `HTMLSelectElement`.
2. `it('lists the 8 groups and every format in FORMAT_GROUPS order')`: within the combobox, the
   `group` roles' `label` attributes equal `FORMAT_GROUPS.map((g) => g.group)` (8 of them); the
   options' values equal `FORMAT_GROUPS.flatMap((g) => g.formats.map((f) => f.id))` and their texts
   the formats' labels.
3. `it('reads and writes the bound FormatId')`: the combobox has value `'qr'`; after
   `fireEvent.change(…, { target: { value: 'pdf417' } })`, `set` was last called with `'pdf417'`.
4. `it('carries the class and the aria-label')`: with `{ 'aria-label': 'Format of code 2' }`, the
   combobox named `'Format of code 2'` has, below a fallback marker, the classes `row-format`,
   `select`, `select-sm` and `w-auto`.
5. `it('has no aria-label unless given one')`: the combobox has no `aria-label` attribute.

`src/lib/components/EccSelect.test.ts`, `const QR = FORMAT_BY_ID.get('qr')!.ecc!;`,
`const AZTEC = FORMAT_BY_ID.get('aztec')!.ecc!;`,
`mount(start: string, option: EccOption = QR, extra = {})` with class `'row-ecc'`, returning
`{ set, unmount }` (`const { unmount } = render(…)`: the lint block's `no-manual-cleanup` rejects
`cleanup()`):

1. `it("shows the default level for ''")`: start `''` → value `'M'` and display value
   `'level M (~15% recovery, default)'`.
2. `it("writes '' when the default is chosen")`: start `'H'` → value `'H'`; after a change to `'M'`,
   `set` was last called with `''`.
3. `it('writes any other level as chosen')`: start `''`, change to `'Q'` → `set` last called with
   `'Q'`.
4. `it('writes label (note), or the label alone')`: `QR`'s option texts are
   `['level L (~7% recovery)', 'level M (~15% recovery, default)', 'level Q (~25% recovery)', 'level H (~30% recovery)']`;
   then `unmount()`, mount `AZTEC`, and its texts are
   `['≥10% error correction', '≥23% error correction (default)', '≥36% error correction', '≥50% error correction']`
   (only its default has a note).
5. `it('carries the class and the aria-label')`: with `AZTEC` and
   `{ 'aria-label': 'Error correction of code 2' }`, the combobox of that name has, below a fallback
   marker, `row-ecc`, `select`, `select-sm` and `w-auto`.

That is 10 tests.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/FormatSelect.test.ts src/lib/components/EccSelect.test.ts`
Expected: FAIL, `./FormatSelect.svelte` and `./EccSelect.svelte` do not resolve.

- [ ] **Step 3: Write both components**

Each renders one `<select class={['select select-sm w-auto', className]} aria-label={ariaLabel}>`
(destructure `'aria-label': ariaLabel`). `FormatSelect` uses `bind:value` and the setup page's
current `{#each FORMAT_GROUPS …}` markup. `EccSelect` uses
`bind:value={() => value || option.defaultValue, (v) => (value = v === option.defaultValue ? '' : v)}`
and the current `{#each opt.choices …}` markup with `option` in place of `opt`.

- [ ] **Step 4: Run the tests to verify they pass**

Same command. Expected: PASS, `Tests  10 passed (10)`.

- [ ] **Step 5: Use them**

- Setup page: inside the Format `Field`,
  `<FormatSelect class="format-input" bind:value={() => format, (v) => selectFormat(v)} />`; inside
  the `ecc-field` `Field` (keep `{@const opt = descriptor.ecc}` above it),
  `<EccSelect class="ecc-input" option={opt} bind:value={ecc} />`. Drop `FORMAT_GROUPS` from the
  formats import.
- `RowEditor`: `<FormatSelect class="row-format" aria-label="Format of code {i + 1}" bind:value={…} />`
  with the current function binding unchanged (the getter `() => row.format` and the setter that
  runs `canonicalEcc` and `canonicalLax`); inside `{#if opt}`,
  `<EccSelect class="row-ecc" aria-label="Error correction of code {i + 1}" option={opt} bind:value={row.ecc} />`.
  Drop `FORMAT_GROUPS` from the import.

- [ ] **Step 6: Run the caller tests**

Run: `npx vitest run src/routes/page.test.ts src/lib/components/RowEditor.svelte.test.ts`
Expected: PASS, including the 36-option dropdown (`page.test.ts:233`), the level tests from
`page.test.ts:293`, the row control order (`RowEditor.svelte.test.ts:213`) and the level
canonicalized on a format change (`RowEditor.svelte.test.ts:176`).

- [ ] **Step 7: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  40 passed (40)` and `Tests  844 passed (844)`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/FormatSelect.svelte src/lib/components/EccSelect.svelte src/lib/components/FormatSelect.test.ts src/lib/components/EccSelect.test.ts src/routes/+page.svelte src/lib/components/RowEditor.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add FormatSelect and EccSelect for the setup page and the row editor"
```

---

### Task 8: `barcode-caps.css`

**Files:**

- Create: `src/lib/components/barcode-caps.css`
- Modify: `src/lib/components/ScrollColumn.svelte` (imports at `:11-13`, caps at `:78-90`),
  `src/lib/components/StepStage.svelte` (imports at `:14-16`, the comment and caps at `:85-98`)

**Interfaces:**

- Consumes: `stage-check` (Task 2).
- Produces: nothing other tasks use, except that Task 15's mismatch control edits this file.

The spec's test table has no unit test for this file: `stage-check` is its proof, and the existing
`ScrollColumn`, `StepStage` and play-page tests guard the DOM.

- [ ] **Step 1: Write `src/lib/components/barcode-caps.css`**

Plain CSS, outside Tailwind's layers: the three caps of `ScrollColumn.svelte:78-90`, unchanged and in
the same order, each selector under both hosts:

```css
/* The barcode svg size caps for both stages. ScrollColumn.svelte and StepStage.svelte import this
   file. It is plain CSS outside Tailwind's layers, so no layered rule can override it. */
:is(.scroll-column, .step-stage-host) .barcode-item svg {
	max-width: min(90vw, 640px);
	height: auto;
}
:is(.scroll-column, .step-stage-host) .barcode-item--2d svg {
	max-width: min(90vw, 640px);
	max-height: 60vh;
	width: auto;
	height: auto;
}
:is(.scroll-column, .step-stage-host) .barcode-item--pdf417 svg {
	max-width: min(95vw, 960px); /* PDF417 is wide: 18 data columns = 375 X-modules */
}
```

- [ ] **Step 2: Import it and delete the copies**

Both components gain `import './barcode-caps.css';` after their `$lib/types` import. Delete the
three cap rules from each `<style>`, and `StepStage`'s "Copied from ScrollColumn.svelte…" comment.
Each keeps its container and `.barcode-item` padding rules.

- [ ] **Step 3: Check that one copy is left**

Run: `grep -rn -F 'max-width: min(' src` (not `git grep`, which skips the untracked new file)
Expected: exactly three lines, all in `src/lib/components/barcode-caps.css`, at `:4`, `:8` and
`:14`.

- [ ] **Step 4: Run the stage tests, the whole suite, lint, build and the guard**

Run: `npx vitest run src/lib/components/ScrollColumn.test.ts src/lib/components/StepStage.test.ts src/routes/play/page.test.ts && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts' && grep -lF '960px' dist/_app/immutable/assets/*.css`
Expected: PASS; as in Task 1 with 40 files and 844 tests; the last command names one CSS file, the
play page's, holding the PDF417 cap.

- [ ] **Step 5: Check the stage against `main`**

Run: `npm run stage-check; echo "exit $?"`
Expected: `stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against main` and `exit 0`. A MISMATCH:
stop and report.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/barcode-caps.css src/lib/components/ScrollColumn.svelte src/lib/components/StepStage.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "refactor: share the barcode size caps between both stages"
```

---

### Task 9: Restyle the setup page

**Files:**

- Modify: `src/routes/+page.svelte` (markup `:239-446`, `<style>` `:448-485`)
- Test: `src/theme.test.ts` (append one test)

**Interfaces:**

- Consumes: `Field`, `Note`, `SecondsSlider`, `FormatSelect` and `EccSelect` in place (Tasks 4 to
  7); `read`, `flat` and the `overrides` describe (Task 3).
- Produces: nothing other tasks use.

- [ ] **Step 1: Write the failing assertion**

Append to `describe('overrides the tables rely on')`:
`it('the setup page keeps a disabled Start recognizable')`: `flat(read('./routes/+page.svelte'))`
contains
`flat('.start:disabled { background-color: var(--color-primary); color: var(--color-primary-content); opacity: 0.5; }')`.

Run: `npx vitest run src/theme.test.ts`
Expected: FAIL on that one test; the other 26 pass.

- [ ] **Step 2: Add the classes**

Per the spec's _Setup page_, each added beside the existing class:

| Element                                                | Added classes                                           |
| ------------------------------------------------------ | ------------------------------------------------------- |
| `div.setup`                                            | `bg-base-100`                                           |
| `h1`                                                   | `class="text-2xl font-bold tracking-tight"`             |
| `.editor-input`, `.mode-input`                         | `select select-sm w-auto`                               |
| `.switch-note`                                         | `alert alert-warning alert-soft` (`role="alert"` stays) |
| `.switch-anyway`, `.switch-cancel`                     | `btn btn-sm`                                            |
| `.code-input`                                          | `textarea w-full font-mono`                             |
| `.file-input` (already daisyUI's class)                | `file-input-sm w-auto self-start`                       |
| `.lax-input`                                           | `checkbox checkbox-sm`                                  |
| `.speed-input`, `.rotate-max-input`, `.skew-max-input` | `range range-sm w-32`                                   |
| `.loop-input`, `.rotate-input`, `.skew-input`          | `toggle toggle-sm`                                      |
| `.start`                                               | `btn btn-primary btn-lg`                                |

- [ ] **Step 3: Update the `<style>`**

Delete the `.code-input` rule (the utilities replace it) and the `.start` rule (`btn-lg` replaces its
padding and size). Keep `.setup` and `.settings-row`. Replace the `.start:disabled` rule with:

```css
/* daisyUI dims a disabled btn to 1.39:1. Start keeps its primary look at half opacity, as
   before, so it stays recognizable while it waits for a valid code. */
.start:disabled {
	background-color: var(--color-primary);
	color: var(--color-primary-content);
	opacity: 0.5;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/theme.test.ts src/routes/page.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  40 passed (40)` and `Tests  845 passed (845)`.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte src/theme.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: restyle the setup page on the Instrument theme"
```

---

### Task 10: Restyle `ValidationList`, `Gs1Breakdown` and `ShareLink`

**Files:**

- Modify: `src/lib/components/ValidationList.svelte` (`:10`, `:13`, the rules at `:60-68`),
  `src/lib/components/Gs1Breakdown.svelte` (`:16-18`, the rule at `:46-49`),
  `src/lib/components/ShareLink.svelte` (`:45-49`, `:52`, `:59`, the rules at `:66-72`)
- Test: `src/colors.test.ts` (delete three lines)

**Interfaces:**

- Consumes: `Field` and `Note` in place.
- Produces: nothing other tasks use.

- [ ] **Step 1: Make the color guard expect the change**

Delete the three `src/lib/components/ValidationList.svelte: …` lines from `NOT_YET_RESTYLED`.

Run: `npx vitest run src/colors.test.ts`
Expected: FAIL, the three colors are still in `ValidationList.svelte`.

- [ ] **Step 2: Restyle the three components**

- `ValidationList`: `ul.validation-list` gains `font-mono text-sm`. The `li`'s class expression
  becomes
  `entry.lint !== undefined ? 'lenient text-warning' : entry.valid ? 'valid text-success' : 'invalid text-error'`.
  Delete the `.valid`, `.invalid` and `.lenient` color rules; keep every other rule, including the
  scroll heights.
- `Gs1Breakdown`: `details.gs1-breakdown` gains `text-base-content`, and its rule loses
  `color: CanvasText;`; `<summary>` gains `class="link"` (daisyUI's `:focus-visible` outline);
  `<table>` gains `class="table table-xs"`. The `visually-hidden` header spans and the scoped
  `thead th { padding: 0; border: 0; }` rule stay: unlayered, it beats daisyUI's zero-specificity
  header border, so no header row shows.
- `ShareLink`: `.share-row` gains `flex flex-wrap items-center gap-2`; `.copy-link` gains
  `btn btn-sm`; `.share-url` gains `input input-sm min-w-0 flex-1 font-mono`; `.share-ecc-input`
  gains `select select-sm w-auto`; `.qr-code` gains `border border-base-300` and keeps its
  literal-white rule. Delete the `.share-url` rule (`flex: 1` and `font-family: monospace` are now
  utilities) and the `.copy-status` rule (`gap-2` replaces its margin).

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/colors.test.ts src/lib/components/ValidationList.test.ts src/lib/components/Gs1Breakdown.test.ts src/lib/components/ShareLink.test.ts src/routes/page.test.ts`
Expected: PASS.

- [ ] **Step 4: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 files and `Tests  845 passed (845)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ValidationList.svelte src/lib/components/Gs1Breakdown.svelte src/lib/components/ShareLink.svelte src/colors.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: restyle the validation list, the GS1 breakdown and the share link"
```

---

### Task 11: Restyle `RowEditor`

**Files:**

- Modify: `src/lib/components/RowEditor.svelte` (markup `:68-156`, `<style>` `:189-226`)
- Test: `src/colors.test.ts` (delete three lines)

**Interfaces:**

- Consumes: `FormatSelect`, `EccSelect` and `Note` in place.
- Produces: nothing other tasks use.

- [ ] **Step 1: Make the color guard expect the change**

Delete the three `src/lib/components/RowEditor.svelte: …` lines from `NOT_YET_RESTYLED`.

Run: `npx vitest run src/colors.test.ts`
Expected: FAIL, the three colors are still in `RowEditor.svelte`.

- [ ] **Step 2: Restyle**

| Element                | Change                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `li.row`               | gains `border-b border-base-300 pb-3`                                                                                                                      |
| `.row-number`          | gains `text-base-content/70`                                                                                                                               |
| `.row-payload`         | gains `textarea min-h-0 font-mono`; its rule loses `font-family: monospace;` (the `field-sizing` rule stays)                                               |
| `.row-verdict`         | keeps `class:valid`, `class:lenient`, `class:invalid` and gains `class:text-success`, `class:text-warning` and `class:text-error` with the same conditions |
| `.row-lax-input`       | gains `checkbox checkbox-sm`                                                                                                                               |
| `.row-up`, `.row-down` | gain `btn btn-sm min-h-9`                                                                                                                                  |
| `.row-delete`          | gains `btn btn-ghost btn-sm min-h-9 text-error` (its `margin-left: auto` rule stays)                                                                       |
| `.row-add`             | gains `btn btn-sm`                                                                                                                                         |

Delete the `.row-controls button` rule (`min-h-9` replaces it) and the three `.row-verdict` color
rules.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/colors.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts`
Expected: PASS, including each row's own verdict (`RowEditor.svelte.test.ts:186`) and the row
control order (`:213`).

- [ ] **Step 4: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 files and `Tests  845 passed (845)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/RowEditor.svelte src/colors.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: restyle the row editor"
```

---

### Task 12: Restyle the play page

**Files:**

- Modify: `src/routes/play/+page.svelte` (markup `:181-279`, `<style>` `:284-359`)
- Test: `src/colors.test.ts` (the ratchet ends), `src/theme.test.ts` (append one test)

**Interfaces:**

- Consumes: `SecondsSlider` in place; `stage-check` (Task 2); `read`, `flat` (Task 3).
- Produces: nothing other tasks use.

- [ ] **Step 1: Write the failing assertions**

- In `src/colors.test.ts`, the second real-file test now expects `[]`: replace
  `[...NOT_YET_RESTYLED].sort()` with `[]` and delete the `NOT_YET_RESTYLED` constant.
- Append to `describe('overrides the tables rely on')` in `src/theme.test.ts`:
  `it('the play page recolors focus rings on the overlay')`:
  `flat(read('./routes/play/+page.svelte'))` contains
  `flat('.overlay :global(:focus-visible) { outline-color: var(--color-neutral-content); }')`.

Run: `npx vitest run src/colors.test.ts src/theme.test.ts`
Expected: FAIL: four raw colors remain, and the override is missing.

- [ ] **Step 2: Restyle**

- `.play` and its rule: untouched.
- `.overlay` gains `bg-neutral/85 text-neutral-content`; its rule loses `background` and `color`,
  keeping position, flex layout, padding, the 8 px radius, `transition`, `opacity` and the widths.
  `class:hidden` and the `.overlay.hidden` rule stay.
- `.ctl-playpause`, `.ctl-prev`, `.ctl-next`, `.ctl-restart` and `.ctl-back` gain `btn btn-sm`;
  `.ctl-speed` gains `range range-xs w-[110px]`.
- `.readout` gains `bg-base-100/85 text-base-content`; its rule loses `color` and `background`.
- `.finish-screen` gains `text-2xl`, and its rule loses `font-size: 1.5rem;`, keeping
  `background: #fff`; `.finish-restart` gains `btn btn-primary`, `.finish-back` gains `btn`.
- `.finish-status` and its rule: untouched.
- Add to the `<style>`, after `.overlay.hidden`:

```css
/* daisyUI's focus outline is base-content, 2.66:1 on the overlay; neutral-content is 6.38:1.
   The seconds fields belong to SecondsSlider, a child component, hence :global. */
.overlay :global(:focus-visible) {
	outline-color: var(--color-neutral-content);
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/colors.test.ts src/theme.test.ts src/routes/play/page.test.ts`
Expected: PASS, including the overlay order test (`play/page.test.ts:199`) and the faded overlay
(`:266`), whose `faded()` reads the `hidden` class.

- [ ] **Step 4: Run the whole suite, lint, build and the guard**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  40 passed (40)` and `Tests  846 passed (846)`.

Then check the buttons: every one of the 15 carries `btn`.

Run: `node -e 'const fs=require("fs"),p=require("path");let n=0,bad=0;for(const f of fs.readdirSync("src",{recursive:true})){if(!f.endsWith(".svelte"))continue;for(const m of fs.readFileSync(p.join("src",f),"utf8").matchAll(/<button\b[^]*?\bclass="([^"]*)"/g)){n++;if(!/\bbtn\b/.test(m[1])){bad++;console.log(f,m[1])}}}console.log(n+" buttons, "+bad+" without btn")'`
Expected: `15 buttons, 0 without btn`.

- [ ] **Step 5: Check the stage against `main`**

Run: `npm run stage-check; echo "exit $?"`
Expected: `stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against main` and `exit 0`. A MISMATCH:
stop and report.

- [ ] **Step 6: Commit**

```bash
git add src/routes/play/+page.svelte src/colors.test.ts src/theme.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: restyle the play overlay, readout and finish screen"
```

---

### Task 13: The class-name collision audit

**Files:**

- Not committed: `class-audit.ts` and `class-audit.md` in your session's scratchpad
- Modify: `src/styles.css`, only if a name must be excluded

**Interfaces:**

- Consumes: `cssRules` from `scripts/check-css.ts` (Task 1); the finished restyle.
- Produces: `class-audit.md`, the table Task 15 copies into the PR body (spec _Rules for every
  file_ 3).

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exit 0, ending with the `check-css:` size line.

- [ ] **Step 2: Write the audit script in your scratchpad**

`class-audit.ts`, run by Node 24, importing `cssRules` from the repository's `scripts/check-css.ts`
by its absolute path with the `.ts` extension. It:

1. lists our own class names as they are at `main`: for each `.svelte` file from
   `git ls-tree -r --name-only main -- src`, read with `git show main:<path>` and with its
   `<style>` blocks removed, every word of a static `class="…"` value outside `{…}`, every quoted
   word inside a `class={…}` expression, and every `class:<name>` directive name; plus the DOM
   names that `src/lib/items.ts`, `src/lib/scroller.ts` and `src/lib/stepper.ts` set: `barcode-item`,
   `barcode-item--2d`, `barcode-item--<id>` for each of the 15 bwip-js formats (`FORMATS` entries
   with `engine: 'bwipjs'`), `scroller-copy`, `scroller-track` and `step-stage`;
2. splits every `.css` file under `dist/` with `cssRules`;
3. for each name, lists the selectors holding `.<name>` as a whole class (the next character is not
   `[\w-]`), skipping the rules we wrote: selectors containing `svelte-` (Svelte's scoping),
   `.scroll-column` or `.step-stage-host` (`barcode-caps.css`), and the two override selectors of
   `src/styles.css`;
4. prints `<n> names checked`, then one line per name with a hit:
   `<name>: <first selector> (+<k> more)`.

- [ ] **Step 3: Run it**

Run: `node <your scratchpad>/class-audit.ts`
Expected: more than 100 names checked (111 measured here), and exactly one hit, `file-input`
(daisyUI's `.file-input`). A count of 0, no output, or no `file-input` hit means the script is
wrong: fix it. Never record an empty audit as a pass.

- [ ] **Step 4: Resolve each hit**

- `file-input`: accepted, deliberate (spec _Class-name collisions_).
- `hidden`: listed whether or not it has a hit: excluded by `@source not inline('hidden')`;
  `check-css` guards it.
- Any other hit whose rule changes our element's display, visibility, position, size, spacing or
  color: excluded. Add `@source not inline('<name>');` beside the `hidden` line, rebuild, rerun the
  audit (the hit must be gone), and run `npm test`.
- A hit whose rule changes nothing visible on our element: accepted, with the reason.
- A hit that cannot be excluded without losing a utility the restyle uses: recorded as "rename in
  spec 2, with its test change"; nothing is renamed now.

- [ ] **Step 5: Record**

Write `class-audit.md`: the name count, then one row per hit and one for `hidden`, with the class,
the rule we did not write (first selector), the resolution and the reason.

- [ ] **Step 6: Commit, only if Step 4 added an exclusion**

Run: `npx prettier --write src/styles.css && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 files and 846 tests.

```bash
git add src/styles.css
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "fix: keep Tailwind from generating rules for our own class names"
```

---

### Task 14: Documentation

**Files:**

- Modify: `CONTRIBUTING.md` (`## Stack` at `:17-22`, a new `## Styling` before `## Writing tests`
  at `:24`), `docs/guide.md` (Contents at `:8-17`, a new section before
  `## Scanner settings and troubleshooting` at `:350`)

**Interfaces:**

- Consumes: the finished behavior of Tasks 1 to 13. No code, no tests.

- [ ] **Step 1: CONTRIBUTING.md**

`## Stack` gains, after the bwip-js line:
``- **Tailwind CSS** 4.3.4 and **daisyUI** 5.7.50 for styling, with one light theme, Instrument, in `src/styles.css` ``
(wrap it after "in" by hand: Prettier keeps prose lines as written, and the repository's
Markdown is wrapped at 100 columns). Between `## Stack` and `## Writing tests`, add:

```markdown
## Styling

Tailwind CSS and daisyUI style the app. `src/styles.css` holds the one theme, **Instrument**, and
the few overrides of daisyUI's defaults.

- Write Tailwind and daisyUI classes only in `.svelte` files. Tailwind scans no other files, so a
  class written in a `.ts` file is never generated.
- Take every color from the theme tokens: `text-success`, `bg-base-200`, `btn-primary` and so on
  in classes, `var(--color-…)` in CSS. `src/colors.test.ts` fails on a raw color in a component.
- The barcode stage, the finish screen and the share QR stay literal black on white, whatever the
  theme. Put no daisyUI or Tailwind class on `ScrollColumn`, `StepStage` or the DOM that
  `scroller.ts` and `stepper.ts` build.
- Run `npm run stage-check` after any change that could touch the play page. It builds `main` and
  the current tree and compares the stage in headless Firefox (`/usr/bin/firefox`): pixel for
  pixel in Step mode, by barcode size in Scroll mode. It exits 0 on a pass, 1 on a mismatch and 2
  when it could not verify; an unverified run is not a pass. To compare with another commit, name
  it: `npm run stage-check -- <commit>`.
- `npm run build` runs `scripts/check-css.ts` afterwards. The build fails if Tailwind's `hidden`
  utility returns (the play overlay fades with a class of that name), if a theme other than
  Instrument ships, or if a theme token is missing.
```

- [ ] **Step 2: docs/guide.md**

In Contents, insert `10. [Browser support](#browser-support)` and renumber the Scanner settings
entry to `11.`. Before `## Scanner settings and troubleshooting`, add:

```markdown
## Browser support

scandible needs Chrome or Edge 111, Safari 16.4, or Firefox 128, or a later version. In older
browsers the pages can lose their colors or layout.
```

`README.md` does not change.

- [ ] **Step 3: Verify**

Run: `git grep -n -F -e '## Styling' -e 'npm run stage-check' -e '**daisyUI** 5.7.50' -- CONTRIBUTING.md && git grep -n -F -e '## Browser support' -e '(#browser-support)' -e '11. [Scanner settings' -- docs/guide.md && git diff --quiet main -- README.md && echo README unchanged`
Expected: at least one line for each string, and `README unchanged`.

Run: `npx prettier --write CONTRIBUTING.md docs/guide.md && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 files and 846 tests.

- [ ] **Step 4: Commit**

```bash
git add CONTRIBUTING.md docs/guide.md
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "docs: document the styling rules, stage-check and the browser floor"
```

---

### Task 15: Verification that fails closed, the visual review and the PR body

**Files:**

- Not committed: `visual-review.ts` and `pr-body.md` in your session's scratchpad; the shots under
  `.superpowers/visual-review/<build>/<view>-<W>.png` (ignored by git)
- Modify: only through `fix:` commits, if Step 5 finds a regression

**Interfaces:**

- Consumes: the finished branch; `resolveRoute` from `scripts/stage-check.ts`; `class-audit.md`
  (Task 13).

- [ ] **Step 1: The automated rows A1 to A4**

Run: `node --version && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Record: the Node version; svelte-check's error and warning counts; Vitest's `Test Files` and
`Tests` lines (`40 passed (40)`, `846 passed (846)`); lint; the `check-css:` size line beside
`main`'s 5,329 B raw and 1,691 B gzipped, measured the way `check-css` measures (M2's 1,738 B came
from the `gzip -9` command, whose file headers add 47 B over the three files); the Vite chunk
warning, with its size beside `main`'s 573.06 kB (_Questions_ 1); the diff's output, which must be
empty.

- [ ] **Step 2: The controls A5 and A7, and the stage A6**

Repeat Task 1 Step 7 control 1 (A5). Repeat Task 2 Step 7 controls 1 and 3 (A7); control 3 now
edits the first `max-width: min(90vw, 640px);` in `src/lib/components/barcode-caps.css` to
`max-width: 300px;`, where Task 8 moved the caps, and reverts with
`git checkout -- src/lib/components/barcode-caps.css`; expected as before, three UPC-A MISMATCH
lines, five PASS and `exit 1`. Then run `npm run stage-check; echo "exit $?"` (A6). Record each
command's last lines and exit code. A6 passes only on
`stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against main` and `exit 0`. `git status --short`
must print nothing afterwards.

- [ ] **Step 3: Build `main` for the visual review**

Run: `git worktree add --detach <your scratchpad>/vr-main main && cd <your scratchpad>/vr-main && npm ci && npm run build`
Then copy `<your scratchpad>/vr-main/dist` to `<your scratchpad>/vr/main` and the repository's
`dist` (built in Step 1; rebuild it if Step 2 ran later) to `<your scratchpad>/vr/branch`, and run
`git -C /home/nn/Projects/scandible worktree remove --force <your scratchpad>/vr-main`.

- [ ] **Step 4: Write and run `visual-review.ts`**

A throwaway Node 24 script in your scratchpad. It serves each copy as `stage-check` does (import
`resolveRoute` from `scripts/stage-check.ts` by absolute path), and into `index.html` and
`play.html` it injects a script that reads the `view` query parameter, performs the view's action
once its target exists (a `MutationObserver` on `document.documentElement` with `childList`,
`subtree` and `attributes`, as in `stage-check`), and, once the view's state element exists, sends
`navigator.sendBeacon('/__view', JSON.stringify({ view, scrollWidth: document.documentElement.scrollWidth, innerWidth }))`.
For each build, view and width it runs
`firefox --headless --no-remote --profile <fresh dir> --window-size=W,H --screenshot .superpowers/visual-review/<build>/<view>-<W>.png <url>`
with the server's port in the URL, stops only the Firefox it started, and prints one line per shot:
build, view, width, whether the state element was seen, `scrollWidth` and `innerWidth`.

With `GS1 = codes=%2801%2909501101530003%2817%29261231%2810%29LOT42%0A%2801%2909501101530004%0Ahello&fmt=gs1128&lax=1&mode=step&dwell=250&loop=1&rot=1&seed=1`
(a valid GS1-128 code with a breakdown, a lenient one, and `hello`, invalid even with `lax=1`; Step
playback with Loop, Random rotation and the GS1 option on, and the flashing note) and
`ROWS = r1=upc_036000291452&r2=gs1128_%2801%2909501101530003%2817%29261231%2810%29LOT42&r3=gs1128-lax_%2801%2909501101530004&r4=qr-H_hello&r5=upc_bad&fmt=upc&seed=1`
(valid, valid GS1, lenient, valid QR with a level, invalid):

| View      | URL path and fragment                                                      | Action                                                      | State element                    | Heights (1280 / 390 wide) |
| --------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------- | ------------------------- |
| `setup`   | `/scandible/?view=setup#` + GS1                                            | click the first `.validation-list summary`                  | `.validation-list details[open]` | 2000 / 3000               |
| `empty`   | `/scandible/?view=empty`                                                   | none                                                        | `.start`                         | 2000 / 3000               |
| `rows`    | `/scandible/?view=rows#` + ROWS                                            | click `.row-editor li:nth-child(2) summary`                 | `.row-editor details[open]`      | 2000 / 3000               |
| `switch`  | `/scandible/?view=switch#` + ROWS                                          | set `.editor-input` to `text`, dispatch a bubbling `change` | `.switch-note`                   | 2000 / 3000               |
| `share`   | `/scandible/?view=share#codes=hello%0Aworld&fmt=qr&seed=1`                 | click `.copy-link`                                          | `.qr-code:not([hidden])`         | 2000 / 3000               |
| `overlay` | `/scandible/play?view=overlay#codes=036000291452&fmt=upc&mode=step&seed=1` | none                                                        | `.overlay .ctl-dwell`            | 900 / 844                 |
| `finish`  | as `overlay`, with `view=finish`                                           | click `.ctl-next`                                           | `.finish-screen`                 | 900 / 844                 |

Run it. Expected: 28 lines (2 builds, 7 views, 2 widths), each with its state element seen and its
PNG written. Measured here: all 28 seen, every `scrollWidth` equal to its `innerWidth`. The
`share` click cannot write the clipboard in headless Firefox, so its status reads "Could not copy.
Select the link above and copy it.", which tests the share row's wrap at 390 px. A shot whose state
was not seen, or whose PNG is missing, is UNVERIFIED for A8.

- [ ] **Step 5: Read the shots (A8, V1 to V5) and check the width (A9)**

Open each `main` and branch pair (the Read tool shows PNGs; a `magick … -crop` of the area helps)
and write one line per view and width: control widths and spacing against `main`, as the spec's
widths set them. Focus is not visible in static shots (human check 2). Then check, and say for each
in the PR that it holds (spec _Visual review_):

- **V1**, in `setup` and `rows`: each verdict keeps its status color: valid green, invalid red,
  lenient amber.
- **V2**, in `setup` and `rows`: the open GS1 breakdown shows no visible header row.
- **V3**, in `rows`: row 2's breakdown sits directly under that row's controls.
- **V4**, in `overlay` at both widths: each slider sits beside its seconds field, and the field shows
  its value (`1.00`, `0.00`) in dark text.
- **V5**, in every setup view: every control's visible label still shows the text that names it.

A9 passes only when every branch 390 px line has `scrollWidth <= innerWidth`. If a shot shows a
regression against `main` that the spec does not intend (a control far wider or narrower, lost
spacing, unreadable text, overflow at 390 px), fix it in the file that owns it as a `fix:` commit,
rerun Steps 1 and 2, and reshoot. If a fix needs a spec decision, record the row FAILED with the
shot paths and stop.

- [ ] **Step 6: Write the PR body**

Write `<your scratchpad>/pr-body.md` from the _PR body_ template. Its _Verification_ section is
the _Verification record_ table below with two more columns, Status and Evidence, filled in (A10
from `class-audit.md`; H1 to H5 stay UNVERIFIED). This plan file is not edited. Carry NO AI
attribution and no "Generated with" line.

- [ ] **Step 7: Report**

The task report lists every row that is not PASS, by number, and never reports one as passed. The
controller opens the PR only when the owner asks (finishing-a-development-branch), with
`pr-body.md` and the shots attached by hand.

#### Verification record

Status is `UNVERIFIED`, `PASS` or `FAILED`. Every row starts UNVERIFIED and changes only when its
pass rule is met and its evidence is entered. A skipped row, or a checker that dies or prints
nothing, stays UNVERIFIED.

| Row | Check                                                                          | Pass rule                                                         |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| A1  | `npm test`                                                                     | svelte-check 0 errors and 0 warnings; 40 files and 846 tests pass |
| A2  | `npm run lint`                                                                 | exit 0                                                            |
| A3  | `npm run build` with `check-css`                                               | exit 0; size line recorded beside `main`'s 5,329 B / 1,691 B      |
| A4  | `git diff --name-only --diff-filter=M main -- '*.test.ts'`                     | prints nothing                                                    |
| A5  | `check-css` without `@source not inline('hidden')`                             | `bare .hidden rule: .hidden` and a non-zero exit                  |
| A6  | `npm run stage-check` against `main`                                           | `8 PASS, 0 MISMATCH, 0 UNVERIFIED`, exit 0                        |
| A7  | `stage-check` controls: unknown ref; 300 px cap                                | exit 2; exit 1 with exactly the three UPC-A MISMATCH lines        |
| A8  | Visual review, 7 views × 2 widths × 2 builds                                   | 28 shots, every state seen, one note per view and width           |
| A9  | No sideways scroll at 390 px (branch)                                          | `scrollWidth <= innerWidth` in all 7 views                        |
| A10 | Class-name collision audit (Task 13)                                           | names counted; every hit resolved                                 |
| V1  | Verdict colors: valid green, invalid red, lenient amber                        | holds in `setup` and `rows`, both widths                          |
| V2  | An open GS1 breakdown shows no visible header row                              | holds in `setup` and `rows`                                       |
| V3  | A GS1 row's breakdown sits directly under that row's controls                  | holds in `rows`                                                   |
| V4  | Each overlay slider sits beside its seconds field                              | holds in `overlay`, both widths                                   |
| V5  | Every control's visible label still shows the text that names it               | holds in every setup view                                         |
| H1  | Chrome and Safari render both pages correctly                                  | a person, in both browsers                                        |
| H2  | Focus rings are visible when tabbing through both pages, including the overlay | a person, keyboard only                                           |
| H3  | The play overlay fades out after 3 s instead of snapping away                  | a person, watching it                                             |
| H4  | The setup page works on a real phone                                           | a person, on a phone                                              |
| H5  | The GitHub Pages deploy renders under `/scandible`                             | a person, after the merge                                         |

#### PR body

Title: `feat: put a Tailwind and daisyUI foundation under the UI`

```markdown
## Summary

Spec 1 of the UI revamp. Tailwind CSS 4.3.4 and daisyUI 5.7.50 with one light theme, Instrument; a
guard that keeps the barcode stage black on white and a check that proves it; five shared
components and one shared caps file in place of duplicated markup; a one-to-one restyle of both
pages. Behavior, URL keys and the share-link format do not change, and no existing test file was
modified.

Spec: `docs/superpowers/specs/2026-11-04-ui-foundation-design.md`. Plan:
`docs/superpowers/plans/2026-11-04-ui-foundation.md`.

## Decisions taken while planning

- The seconds fields are `w-[4.5rem]`, today's 72 px: the spec's `w-[4.5em]` showed `0.` at the
  setup page's size and nothing in the overlay.
- The seconds fields carry `text-base-content`: in the overlay they inherited near-white text on a
  white field.
- The 573 kB chunk warning predates this work and is left as it is: <its makeup, from the plan's
  Questions 1>.

## Verification

(rows A1-A10 and V1-V5 with their evidence; CSS size against main; the chunk warning)

## Class-name collision audit

(the table from class-audit.md)

## Screenshots

Before and after, 7 views at 1280 and 390 px wide, attached below.

## Human checks (open)

- [ ] Chrome and Safari render both pages correctly.
- [ ] Focus rings are visible when tabbing through both pages, including the overlay.
- [ ] The play overlay fades out after 3 s instead of snapping away.
- [ ] The setup page works on a real phone.
- [ ] The GitHub Pages deploy renders under `/scandible`.

To check locally: `npm run build`, then `npm run preview`, then open
http://localhost:4173/scandible/.
```

Edit _Decisions taken while planning_ to match the owner's answers to _Questions for the owner_.

## Out of this plan

- Everything the spec lists for specs 2 and 3 (_Series_, _Out of scope_), including the overlay's
  touch targets and its range colors on the dark background.
- Splitting the 573 kB chunk (_Questions_ 1), the SvelteKit 3 upgrade, and the test debt the
  handoff schedules for after this spec merges (items F1 and F3).

## Execution notes

- **Per task:** one implementer subagent, then one Sonnet reviewer, who runs the task's commands
  and compares them with the expected lines. A command that did not run, or whose output is
  missing, is unverified, never a pass.
- **Implementer tiers:** Opus for Tasks 1, 2, 3, 6, 12 and 15 (tooling, browser control, the
  overlay); Sonnet for the rest. No step needs a Fable agent.
- **Final review**, after Task 14 and before Task 15, in four Opus chunks, each reading its diff
  with `git diff 2bf3c4d -- <paths>`: Tasks 1 to 3 (toolchain and scripts), 4 to 8 (shared units),
  9 to 12 (restyle), 13 and 14 (audit and docs) against the spec's _Done means_. A `fix:` commit
  from Task 15 gets a scoped Sonnet re-review before the PR.
- Tasks 2, 8, 12 and 15 run `stage-check` (about 20 s here with a warm npm cache: `npm ci`, two
  builds and 16 Firefox runs). Give the command a 10-minute timeout.

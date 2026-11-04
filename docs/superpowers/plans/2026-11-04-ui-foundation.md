# UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put Tailwind CSS 4 and daisyUI 5, with one light theme, Instrument, under scandible, keep
the barcode stage pure black on white and prove it, replace the duplicated markup with five shared
components and one shared caps file, and restyle both pages one-to-one, without changing what the
app does.

**Architecture:** `src/styles.css` becomes the only stylesheet entry: Tailwind (scanning `.svelte`
files only, with the bare `hidden` utility excluded), daisyUI with the Instrument theme, and a few
unlayered overrides. Two Node 24 scripts check what jsdom cannot: `scripts/check-css.ts` runs after
every build and fails on a returned `.hidden` rule or a wrong theme; `scripts/stage-check.ts`
compares the play stage with another ref in headless Firefox. The presentational units `Field`,
`Note`, `SecondsSlider`, `FormatSelect` and `EccSelect` and the file `barcode-caps.css` take over
the duplicated markup; the pages keep all state and logic. The 737 existing tests do not change and
prove the behavior; new tests pin the units, the theme's contrast and the color rule.

**Tech Stack:** SvelteKit 2.70 + Svelte 5.56 (runes), Vite 7.3.6, TypeScript 5.9 strict with
`noUnusedLocals` and `noUnusedParameters`, Vitest 3.2 + @testing-library/svelte 5.4 on jsdom 24,
Node v24.17.0 (type stripping runs `scripts/*.ts`), Firefox 155 at `/usr/bin/firefox`. New dev
dependencies, exact pins: `tailwindcss` 4.3.4, `@tailwindcss/vite` 4.3.4, `daisyui` 5.7.50, `pngjs`
7.0.0, `@types/pngjs` 6.0.5.

**Spec:** `docs/superpowers/specs/2026-11-04-ui-foundation-design.md`, approved at `11da147`.
Section names in _italics_ are the spec's; read the named section before a step that cites it.
Where this plan and the spec disagree, the spec wins, except on the three points under _Questions
for the owner_, where the plan takes the reading stated there. Report any other disagreement.

## Questions for the owner

The spec cannot be built as written on these three points without breaking one of its own rules.
The plan goes ahead on the conservative reading given. An answer changes only the tasks named:
Task 5 (Q1), Tasks 1 and 3 (Q2), Task 10 (Q3).

1. **Note's tone cannot be a class on RowEditor's notes.** `RowEditor.svelte.test.ts:185` and
   `:253-262` compare the whole `className` of every `<p>` with `['row-hint', 'gs1-hint', …]`, so a
   `text-base-content/70` class on those five notes fails an existing test (M10 does not list this
   read). Plan: `Note` writes its tone as a `data-tone` attribute, and three rules in
   `src/styles.css` give `info`, `warning` and `error` exactly what `text-base-content/70`,
   `text-warning` and `text-error` compile to. All 14 call sites still go through `Note`, and each
   `<p>`'s class stays exactly the caller's. The alternative is to keep RowEditor's five notes as
   plain, uncolored paragraphs.
2. **An unlayered `--input-color` override would also beat daisyUI's state rules.** daisyUI 5.7.50
   sets `--input-color: var(--color-base-content)` in `.input:focus`, `.select:focus`,
   `.textarea:focus`, `.file-input:focus` and `.toggle:checked`, and fills a checked `.checkbox`
   with `--input-color`. An unlayered rule beats a layered one whatever the specificity, so the
   literal override would turn every focus outline 55% gray, keep a checked toggle gray and fill a
   checked checkbox gray. Plan: the override applies to resting controls only,
   `:is(.input, .select, .textarea, .file-input, .checkbox, .toggle):not(:focus, :focus-within, :checked, :indeterminate)`,
   so resting borders reach 3.95:1 and every state looks as daisyUI ships it.
3. **The share URL field does not fill its row today.** `.share-row` is not a flex container, so
   the field's `flex: 1` has no effect and the field has the browser's default width (20
   characters). _ShareLink.svelte_ says "filling the row as today". Plan: keep today's width
   (`w-auto`, row unchanged). Spec 2's Share panel can make it fill.

## Interpretations

No answer needed; listed so a reviewer can check them.

- **File input:** `w-auto` alone still stretches across `.setup`'s flex column
  (`align-items: stretch`), and daisyUI draws its border round the whole box. Task 9 adds
  `self-start` so it keeps its own width, as the spec's _Rules for every file_ rule 5 intends.
- **Row payload:** daisyUI's `.textarea` sets `min-height: 5rem`. Task 11 adds `min-h-0` so a row
  stays two lines tall where `field-sizing` is unsupported; the scoped `2lh` rule still wins where
  it is supported.
- **Overlay and finish screen:** the overlay keeps its 8 px radius ("rounded"). The finish screen's
  `font-size: 1.5rem` becomes `text-2xl` on `.finish-screen`, the element that had it.
- **Test file names:** tests that bind props need `$state`, which Svelte compiles only in
  `.svelte.ts` files, so they are `SecondsSlider.svelte.test.ts`, `FormatSelect.svelte.test.ts` and
  `EccSelect.svelte.test.ts`, as `RowEditor.svelte.test.ts` already is. The script tests and the
  guards live in `src/` with the other 31 test files: `src/check-css.test.ts`,
  `src/stage-check.test.ts`, `src/theme.test.ts`, `src/colors.test.ts`.
- **M12 on toggles:** M12 says daisyUI's toggle `--input-color` is 20%; 5.7.50 sets 50% (3.38:1).
  The override still covers resting toggles.
- **Order:** `stage-check` is Task 2, before any restyle, so Tasks 2, 8 and 12 each prove the stage
  against `main` as they land. Its server counts a 404 only under `/scandible/`: Firefox's automatic
  `/favicon.ico` request falls outside the site, as on GitHub Pages. The ready message goes by
  `navigator.sendBeacon`, which survives `--screenshot`'s exit after load.
- **Color guard ratchet:** `colors.test.ts` lands before the restyle. It lists today's 11 raw colors
  as expected violations; each task that removes one deletes its line, and Task 12 empties the list.
- **Audit scope:** the collision audit also reads `src/lib/items.ts`, which builds `barcode-item`
  for both `scroller.ts` and `stepper.ts`.
- **Screenshots:** `gh` cannot attach images. The visual review saves its shots under
  `.superpowers/visual-review/` (ignored by git); they are attached to the PR by hand.
- **One extra view:** the visual review adds the setup page with no codes to the spec's six views,
  to show the disabled Start.

## Global Constraints

- **Behavior-neutral.** After every task, `git diff --name-only --diff-filter=M main -- '*.test.ts'`
  prints nothing. New test files are fine; each is written first and seen to fail. Baseline at
  `11da147`: 31 test files, 737 tests, svelte-check 0 errors and 0 warnings.
- **Exact pins**, dev dependencies only, installed with `npm install --save-dev --save-exact`:
  `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `daisyui@5.7.50` (Task 1); `pngjs@7.0.0`,
  `@types/pngjs@6.0.5` (Task 2).
- **The test contract.** Existing class names stay on the same elements; daisyUI and Tailwind
  classes are added beside them. No element is moved, removed or renamed, and no text or ARIA
  changes, except the overlay's trailing `<span>s</span>`, which becomes `SecondsSlider`'s
  `span.seconds` (Task 6).
- **Reserved prefixes.** No added class starts with `ctl-` (`src/routes/play/page.test.ts:192`) or
  `row-` (`src/lib/components/RowEditor.svelte.test.ts:200`).
- **Where classes and colors live.** Tailwind and daisyUI classes are written only in `.svelte`
  files. Color comes only from theme tokens: daisyUI names in classes (`text-success`,
  `bg-base-200`, `btn-primary`), `var(--color-…)` in CSS. The only raw colors allowed in `.svelte`
  files are `#fff` in the rules `.play` and `.finish-screen` (play page) and `.qr-code`
  (`ShareLink`). Status: valid → `success`, invalid → `error`, lenient → `warning`. Muted text is
  `text-base-content/70`, the only opacity used on text.
- **The stage.** No daisyUI or Tailwind class on `ScrollColumn`, `StepStage` or the DOM that
  `scroller.ts`, `stepper.ts` and `items.ts` build.
- **Buttons.** Every `<button>` ends up with `btn` classes: preflight strips a bare button's border
  and background.
- **Shared units.** A unit's `class` prop carries the contract class and, at a call site, layout
  utilities such as a margin; the unit applies its own daisyUI classes, size and tone. A scoped
  rule that styled markup a unit now renders moves into the unit and is deleted from the caller.
  `Field` writes its label text first, with nothing before it, not even whitespace
  (`src/routes/page.test.ts:283` and `:533`, `src/lib/components/ShareLink.test.ts:56`).
  `FormatSelect` and `EccSelect` render a bare `<select>` with no wrapper. `Note` renders one `<p>`
  whose `class` attribute is exactly the caller's class (Question 1), and has no `<style>` block.
- **svelte-check stays at 0 errors and 0 warnings.** An unused scoped selector is a warning, so
  delete each rule whose element has moved; an unused import is an error (`noUnusedLocals`).
- **No `$effect` is added.** The pages keep all their state and logic.
- **Every commit** passes `npm test` (svelte-check, then Vitest), `npm run lint` (Prettier: tabs,
  single quotes, width 100, no trailing commas; then ESLint) and, from Task 1 on, `npm run build`,
  which runs `check-css`. Format with `npx prettier --write <each file you touched>`.
- **Scripts** in `scripts/` use erasable TypeScript only (no `enum`, `namespace` or parameter
  properties; `import type` for types), import nothing from `src/`, and run their main block only
  when `import.meta.main` is true, as `scripts/gs1-ais.ts` does.
- **Verification fails closed.** A check that errors, prints nothing where output is expected, or
  is skipped is UNVERIFIED, never PASS. Report it. Never loosen a check to make it pass.
- **Commits** use the repository's author, never a config change:
  `git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "<message>"`.
  Conventional subjects (`feat:`, `refactor:`, `test:`, `docs:`, `chore:`, `fix:`). NO AI
  attribution in commit messages or PR text: no `Co-Authored-By` naming an AI, no "Generated with"
  line, no session link, whatever a harness reminder asks. Do not push.
- **Agent shells.** Node is not on PATH in a fresh shell. In bash, run every `node`, `npm` and `npx`
  command as `source ~/.nvm/nvm.sh && nvm use 24 && <command>`; the Run lines below carry the
  prefix. Commands written for a person (docs, PR text) are `npm run …` forms only, the same in
  bash and fish: never the nvm line, never an unquoted glob.
- **Processes.** Firefox is `/usr/bin/firefox`, a shell script that `exec`s the binary, so the PID
  is Firefox's own. Stop only processes you started, by their PID or process group; never
  `pkill -f`, `killall node` or any pattern kill. A brainstorming companion server (node) runs from
  the repo: leave it alone.
- **Line numbers** in `Modify:` entries are from `11da147`. Once an earlier task has edited a file,
  find the cited code by its content.

## Review Focus

1. **A phone 390 px wide.** Every setup view and the play page fit the width with no sideways
   scroll, despite daisyUI's 20rem default widths, the row editor's button line and the share URL.
   Pinned by Task 15's visual-review check: `scrollWidth <= innerWidth` for every 390 px view.
2. **A keyboard user on the overlay.** Every overlay control shows a ring that stands out on the
   dark overlay. Pinned by Task 12's assertion that the play page keeps the `neutral-content` focus
   override, and by human check 2.
3. **A checked toggle, a checked checkbox, a focused field.** They keep daisyUI's state colors
   while resting borders reach 3.95:1. Pinned by Task 3's assertion that the border override
   carries its `:not(:focus, :focus-within, :checked, :indeterminate)` guard, and by Task 15's
   `setup` view, which opens with Loop and Random rotation on.
4. **A deck with no valid code.** Start stays a visibly disabled primary button, not a nearly
   invisible gray one. Pinned by Task 9's assertion on `.start:disabled` and Task 15's `empty`
   view.
5. **A comma decimal.** `0,5` typed into a seconds field, a European keyboard habit, is ignored and
   the field shows the current value again, as today. Pinned by Task 6's `SecondsSlider` test.

## Execution notes

- Subagent-driven: one implementer per task, one Sonnet reviewer per task, then a whole-branch
  review in four Opus chunks: Tasks 1-3 (toolchain and scripts), 4-8 (shared units), 9-12
  (restyle), 13-15 (audit, docs, record).
- Suggested implementer tiers: Opus for Tasks 1, 2, 3, 12 and 15 (tooling, browser control, the
  stage); Sonnet for the rest. No task needs Fable.
- Tasks 2, 8, 12 and 15 run `stage-check`, which takes a few minutes (`npm ci` plus two builds and
  16 Firefox runs). Give the command a 10-minute timeout.

## File structure

| File                                                                       | Responsibility                                                                        | Tasks       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------- |
| `src/styles.css`                                                           | the only stylesheet entry: Tailwind, daisyUI, the Instrument theme, overrides, tones  | 1, 5        |
| `scripts/check-css.ts`                                                     | `postbuild` guard over the CSS in `dist/`; exports `cssRules`, `checkCss`, the tokens | 1           |
| `scripts/stage-check.ts`                                                   | `npm run stage-check -- <ref>`: builds both trees, compares the stage in Firefox      | 2           |
| `src/check-css.test.ts`, `src/stage-check.test.ts`                         | the two scripts' pure functions                                                       | 1, 2        |
| `src/theme.test.ts`                                                        | token values, both contrast tables, presence of the overrides                         | 3, 5, 9, 12 |
| `src/colors.test.ts`                                                       | no raw color in a `.svelte` file except the stage allowances                          | 3, 5, 10-12 |
| `src/lib/components/Field.svelte`                                          | the label wrapper of a setting                                                        | 4           |
| `src/lib/components/Note.svelte`                                           | a hint or error paragraph with a tone                                                 | 5           |
| `src/lib/components/SecondsSlider.svelte`                                  | range plus seconds field, with the parse-and-clamp logic                              | 6           |
| `src/lib/components/FormatSelect.svelte`, `EccSelect.svelte`               | the format select; the level select with its `''` ↔ default mapping                   | 7           |
| `src/lib/components/barcode-caps.css`                                      | the three svg size caps, shared by both stages                                        | 8           |
| `src/routes/+page.svelte`, `src/routes/play/+page.svelte`, four components | the one-to-one restyle                                                                | 4-12        |
| `CONTRIBUTING.md`, `docs/guide.md`                                         | stack, styling rules, `stage-check`, browser floor                                    | 2, 14       |
| this plan's _Verification record_                                          | results, collision audit, PR body                                                     | 13, 15      |

---

### Task 1: Toolchain, the Instrument theme and check-css

**Files:**

- Create: `scripts/check-css.ts`, `src/check-css.test.ts`
- Modify: `package.json:7-16` (scripts) and devDependencies, `package-lock.json`,
  `vite.config.ts:1-7`, `src/styles.css` (whole file)

**Interfaces:**

- Consumes: nothing.
- Produces, exported from `scripts/check-css.ts`:

```ts
/** The 28 names of the spec's theme table, row by row, left pair then right pair:
 *  '--color-base-100', '--color-base-content', '--color-base-200', '--color-base-300', …,
 *  '--depth', '--noise'. */
export const THEME_TOKENS: readonly string[];
export interface CssRule {
	selector: string; // the prelude: comments removed, whitespace collapsed to one space, trimmed
	declarations: string; // the block's own text, comments and nested blocks removed, trimmed
}
/** Every style rule, in order of its opening brace, including rules nested in @media, @supports,
 *  @layer, @container, @scope, @starting-style and in other style rules. Skips comments, the
 *  insides of strings and parentheses, and the blocks of every other at-rule
 *  (@font-face, @keyframes, @property, …). */
export function cssRules(cssText: string): CssRule[];
/** The problems of a build's CSS, in the order below; [] when it passes. */
export function checkCss(cssText: string): string[];
```

- Produces `src/styles.css` (later tasks append to it) and the npm script `postbuild`.

- [ ] **Step 1: Write the failing tests**

Create `src/check-css.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { THEME_TOKENS, checkCss, cssRules } from '../scripts/check-css';

const theme = (tokens: readonly string[] = THEME_TOKENS) =>
	`:where(:root),[data-theme=instrument]{${tokens.map((t) => `${t}:0`).join(';')}}`;
const THEME = theme();
```

`describe('THEME_TOKENS')`: one `it`: length 28, no duplicates, first `'--color-base-100'`, last
`'--noise'`.

Inputs and snippets in this task are the contents of JavaScript string literals as written in the
test source, so `\n` is a newline and `\\:` is the CSS escape `\:`.

`describe('cssRules')`, one `it` each, `expect(cssRules(INPUT)).toEqual(OUTPUT)`:

| Input                                                                              | Output                                                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `@layer a{@media (x){.b{c:d}}}`                                                    | `[{ selector: '.b', declarations: 'c:d' }]`                                                             |
| `/* .hidden{} */.a{content:"}{"}`                                                  | `[{ selector: '.a', declarations: 'content:"}{"' }]`                                                    |
| `.a{b:c;/* #c00 */d:e}`                                                            | `[{ selector: '.a', declarations: 'b:c;d:e' }]`                                                         |
| `.a{color:red;&:focus{color:blue}}`                                                | `[{ selector: '.a', declarations: 'color:red;' }, { selector: '&:focus', declarations: 'color:blue' }]` |
| `@font-face{font-family:x}@keyframes k{from{a:b}}@property --p{syntax:'*'}.c{d:e}` | `[{ selector: '.c', declarations: 'd:e' }]`                                                             |
| `.a ,\n  .b{x:url(data:a;b)}`                                                      | `[{ selector: '.a , .b', declarations: 'x:url(data:a;b)' }]`                                            |

`describe('checkCss')`:

- `it('passes a lone Instrument theme')`: `checkCss(THEME)` is `[]`.
- `it.each` of these snippets, each `expect(checkCss(THEME + s)).toEqual([])`:
  `.overlay.hidden.svelte-x{opacity:0}`, `@media (width>=48rem){.md\\:hidden{display:none}}`,
  `[hidden]:where(:not([hidden=until-found])){display:none!important}`,
  `:root,[data-theme]{color:red}`, `[data-theme=instrument] .x{color:red}`,
  `[data-theme="instrument"] .x{color:red}`,
  `:root:has(input.theme-controller[value="instrument"]:checked){color:red}`.
- `it.each` of `[css, pattern]`, each `expect(checkCss(css)).toEqual([expect.stringMatching(pattern)])`:

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

- [ ] **Step 2: Run the tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/check-css.test.ts`
Expected: FAIL, `../scripts/check-css` does not resolve.

- [ ] **Step 3: Write `scripts/check-css.ts`**

`cssRules` is one pass with a stack. Inside `/* … */`, a quoted string (with backslash escapes) or
parentheses, `{`, `}` and `;` are plain text. At `{`, the prelude is the text since the last `{`,
`}` or `;` at that depth. A prelude starting with `@` is descended into only when its name is
`media`, `supports`, `layer`, `container`, `scope` or `starting-style`; any other at-rule block is
skipped whole. Any other prelude opens a style rule: record it at its opening brace and give it,
at its closing brace, its own text with nested blocks removed.

`checkCss(cssText)` returns `['no CSS']` when `cssText.trim()` is empty. Otherwise it walks
`cssRules(cssText)` and returns, in this order:

1. for each rule whose selector, split on commas outside parentheses and brackets, has an item that
   is exactly `.hidden` after trimming: `bare .hidden rule: <selector>`;
2. for each rule with a `[data-theme…]` attribute selector whose value (after `=`, quoted with `'`
   or `"` or not) is not `instrument`: `foreign theme selector: <selector>` (a bare `[data-theme]`
   passes);
3. counting the rules that declare `--color-base-100` (a declaration whose property is exactly that
   name): unless exactly one,
   `expected one Instrument theme rule (the rule declaring --color-base-100), found <n>`; if
   exactly one, `Instrument theme rule lacks <token>` for each `THEME_TOKENS` entry it does not
   declare.

Main, only when `import.meta.main`: read every `.css` file under
`new URL('../dist/', import.meta.url)` (`readdirSync(…, { recursive: true })`), join them with
`'\n'`, print each problem to stderr as `check-css: <problem>`, then print
`check-css: <n> CSS files, <raw> bytes raw, <gzip> bytes gzipped`, the gzip figure being
`gzipSync(file, { level: 9 }).length` summed over the files, as M2 measured. Any problem sets
`process.exitCode = 1`, and so does an unreadable `dist/`, printed as
`check-css: cannot read dist/: <message>`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/check-css.test.ts`
Expected: PASS.

- [ ] **Step 5: Install and wire Tailwind and daisyUI**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm install --save-dev --save-exact tailwindcss@4.3.4 @tailwindcss/vite@4.3.4 daisyui@5.7.50`
Expected: exit 0; `package.json` devDependencies read `"tailwindcss": "4.3.4"`,
`"@tailwindcss/vite": "4.3.4"`, `"daisyui": "5.7.50"`, with no `^`.

- `package.json` scripts gain, after `"build": "vite build",`, the line
  `"postbuild": "node scripts/check-css.ts",`.
- `vite.config.ts` gains `import tailwindcss from '@tailwindcss/vite';` and its plugins become
  `[tailwindcss(), sveltekit(), svelteTesting()]`.
- `src/styles.css` (imported by `src/routes/+layout.svelte`) is replaced whole by the block below.
  The theme values are the spec's _Theme and tokens_ table as written; check each against it. The
  old rules go, as _Toolchain and wiring_ explains.

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
   Resting control borders at 3.95:1. The :not() leaves daisyUI's own focus and checked colors,
   which set --input-color too and would lose to an unlayered rule. */
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

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx prettier --write src/styles.css vite.config.ts package.json scripts/check-css.ts src/check-css.test.ts`

- [ ] **Step 6: Build and see check-css pass**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm run build; echo "exit $?"`
Expected: the build, then `check-css: <n> CSS files, <raw> bytes raw, <gzip> bytes gzipped` and
`exit 0`. Note the two sizes for the task report. The page now looks unstyled (preflight strips
buttons and headings); Tasks 4-12 restyle it.

- [ ] **Step 7: See check-css fail closed**

1. Delete the line `@source not inline('hidden');` from `src/styles.css`, run
   `source ~/.nvm/nvm.sh && nvm use 24 && npm run build; echo "exit $?"`, then put the line back
   exactly. Expected: `check-css: bare .hidden rule: .hidden` and a non-zero exit.
2. Run `mv dist dist.off && source ~/.nvm/nvm.sh && nvm use 24 && node scripts/check-css.ts; echo "exit $?"; mv dist.off dist`.
   Expected: `check-css: cannot read dist/: …` and `exit 1`.

If either control exits 0, check-css is broken: fix it before going on.

- [ ] **Step 8: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: `svelte-check found 0 errors and 0 warnings`; `Test Files  32 passed (32)` with every
test passing; lint clean; the build ends with the `check-css:` size line; the diff prints nothing.
Any command erroring, printing nothing where output is expected, or skipped leaves the task
unverified: report it.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/styles.css scripts/check-css.ts src/check-css.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add Tailwind CSS 4, daisyUI 5 and the Instrument theme, checked after every build"
```

---

### Task 2: stage-check

**Files:**

- Create: `scripts/stage-check.ts`, `src/stage-check.test.ts`
- Modify: `package.json` (scripts, devDependencies), `package-lock.json`, `CONTRIBUTING.md:7-15`
  (commands block)

**Interfaces:**

- Consumes: nothing from earlier tasks; it builds whatever the tree holds.
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

- Produces the npm script `stage-check`, run as `npm run stage-check -- <ref>` (default `main`),
  exit 0 pass, 1 mismatch, 2 unverified.

- [ ] **Step 1: Write the failing tests**

Create `src/stage-check.test.ts` importing the four functions and `type Ready` from
`'../scripts/stage-check'`, with
`const white = (w: number, h: number) => ({ width: w, height: h, data: new Uint8Array(w * h * 4).fill(255) });`.

- `resolveRoute`, `it.each`: `'/scandible/'` → `'index.html'`; `'/scandible'` → `'index.html'`;
  `'/scandible/index.html'` → `'index.html'`; `'/scandible/play'` → `'play.html'`;
  `'/scandible/_app/immutable/entry/start.js'` → `'_app/immutable/entry/start.js'`;
  `'/scandible/../package.json'` → `null`; `'/favicon.ico'` → `null`; `'/scandiblex/a.js'` → `null`.
- `nonWhiteShare`: `white(2, 2)` → `0`; the same with `data[0] = 0` → `0.25`; the same with only
  `data[3] = 0` (alpha) → `0`.
- `diffPixels`: `white(2, 2)` against itself → `0`; against a copy with `data[6] = 254` → `1`;
  `white(2, 2)` against `white(2, 3)` → `-1`.
- `sameGeometry`, with
  `const r: Ready = { item: { width: 210, height: 120, display: 'flex' }, svg: { width: 190, height: 100, display: 'block' } };`:
  `r` against a deep copy → `true`; with `svg.width` `190.005` → `true`; with `svg.height`
  `100.02` → `false`; with `item.display` `'block'` → `false`; all at tolerance `0.01`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/stage-check.test.ts`
Expected: FAIL, `../scripts/stage-check` does not resolve.

- [ ] **Step 3: Install pngjs**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm install --save-dev --save-exact pngjs@7.0.0 @types/pngjs@6.0.5`
Expected: exit 0; both pinned without `^`. The script imports it as `import { PNG } from 'pngjs';`
(M11).

- [ ] **Step 4: Write `scripts/stage-check.ts`**

The pure functions follow their doc comments; `resolveRoute` maps `/scandible`, `/scandible/` and
`/scandible/index.html` to `index.html`, `/scandible/play` to `play.html`, any other
`/scandible/<rest>` to `<rest>` unless a segment is `..`, and everything else to `null`.

Main, only when `import.meta.main`, is the spec's _scripts/stage-check.ts_ steps 1 to 5. Decisions
the spec leaves open:

- `ref` is `process.argv[2] ?? 'main'`. Temp directories come from `mkdtempSync(join(tmpdir(), 'scandible-stage-'))`.
- **Builds:** `git worktree add --detach <tmp>/ref <ref>`, then `npm ci` and `npm run build` there,
  then `npm run build` in the repository, each with `spawnSync(…, { stdio: 'inherit' })`; copy each
  `dist/` to `<tmp>/ref-dist` and `<tmp>/current-dist`. Any failure prints
  `stage-check: UNVERIFIED: <what failed>` and exits 2.
- **Servers:** one `node:http` server per copy on `127.0.0.1`, port 0. A GET maps its pathname
  through `resolveRoute`; `null` or a missing file is a 404, recorded as a failure when the path
  starts with `/scandible` (Firefox's own `/favicon.ico` is outside the site). Content types by
  extension (`.html`, `.js`, `.css`, `.json`, `.svg`, `.png`, `.txt`). `play.html` is served with
  this inserted before `</head>`: `<style>.overlay, .readout { visibility: hidden !important }</style>`
  and a script that, from a `MutationObserver` on `document.documentElement` (and once at
  `DOMContentLoaded`), waits for `.barcode-item svg`, then sends
  `navigator.sendBeacon('/__stage-ready', JSON.stringify(ready))`, `ready` being a `Ready` built
  from the first `.barcode-item` and its `svg` with `getBoundingClientRect()` and
  `getComputedStyle(el).display`. A POST to `/__stage-ready` stores its JSON as the server's latest
  `Ready` and answers 204.
- **Runs** are sequential; before each, clear the server's latest `Ready` and its 404 list.
  Firefox is spawned with `detached: true`, so its PID is its process group; it is stopped with
  `process.kill(-pid, 'SIGTERM')`, then `'SIGKILL'` after 5 s if it is still running.
- **Decks:** `upc` (`036000291452`, `fmt=upc`), `qr` (`https://example.com/scandible`, `fmt=qr`),
  `pdf417` (`SCANDIBLE STAGE CHECK 0123456789`, `fmt=pdf417`), each URL
  `http://127.0.0.1:<port>/scandible/play#` + `new URLSearchParams({ codes, fmt, mode: 'step', rot: '1', rotmax: '20', seed: '7' })`.
- **Step mode:** each deck at 1280×900 and 390×844 on each build:
  `/usr/bin/firefox --headless --no-remote --profile <fresh mkdtemp> --window-size=W,H --screenshot <png> <url>`,
  waited for up to 60 s. A shot is UNVERIFIED when Firefox timed out, no `Ready` arrived, a 404
  was recorded, the PNG is missing, or `nonWhiteShare` is below `0.005`. A pair of verified shots
  is PASS when `diffPixels` is 0, else MISMATCH.
- **Scroll mode:** `upc` and `pdf417` without `mode`, at 1280×900, Firefox the same but without
  `--screenshot`; wait up to 20 s for a `Ready`, then stop that Firefox. No `Ready` or a 404 is
  UNVERIFIED; otherwise PASS when `sameGeometry(ref, current, 0.01)`, else MISMATCH.
- **Output:** one line per comparison, `<PASS|MISMATCH|UNVERIFIED> <step|scroll> <deck> <W>x<H>`,
  plus `: <detail>` (pixel count, the differing sizes, or the reason); then
  `stage-check: <p> PASS, <m> MISMATCH, <u> UNVERIFIED against <ref>`. Exit 1 if any MISMATCH,
  else 2 if any UNVERIFIED, else 0.
- **Cleanup** in a `finally`, and on SIGINT or SIGTERM before exiting 2: stop any Firefox still
  running, close the servers, `git worktree remove --force <tmp>/ref`, remove the temp
  directories.

- [ ] **Step 5: Wire the script and its command line**

`package.json` scripts gain, after `"gs1-ais"`: `"stage-check": "node scripts/stage-check.ts"`.
In `CONTRIBUTING.md`'s commands block, after the `npm run preview` line, add:
`npm run stage-check  # compare the play stage with main in Firefox: pass, mismatch or unverified`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/stage-check.test.ts`
Expected: PASS.

- [ ] **Step 7: Controls**

1. Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm run stage-check -- no-such-ref; echo "exit $?"`
   Expected: `stage-check: UNVERIFIED: …` naming the worktree, and `exit 2`.
2. Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm run stage-check -- HEAD; echo "exit $?"`
   Expected: 8 PASS lines, `stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against HEAD`, `exit 0`.
3. In both `src/lib/components/ScrollColumn.svelte` and `src/lib/components/StepStage.svelte`,
   change the first `max-width: min(90vw, 640px);` (the plain `.barcode-item svg` cap) to
   `max-width: 100px;`, run control 2 again, then
   `git checkout -- src/lib/components/ScrollColumn.svelte src/lib/components/StepStage.svelte`.
   Expected: MISMATCH for `step upc 1280x900`, `step upc 390x844` and `scroll upc 1280x900`, PASS
   for the other five, `exit 1`.

A control that does not give its expected result means the checker is wrong: fix it and rerun all
three. Never relax a rule to get a pass.

- [ ] **Step 8: Check the stage against `main`**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm run stage-check; echo "exit $?"`
Expected: `8 PASS, 0 MISMATCH, 0 UNVERIFIED against main` and `exit 0`: preflight leaves the stage
alone (M3). A MISMATCH here is a finding, not a checker bug: stop and report the lines.

- [ ] **Step 9: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  33 passed (33)`. `git worktree list` shows no
`scandible-stage-` worktree, and `git status --short` shows only this task's files.

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
    `const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');` and
    `const flat = (s: string) => s.replace(/\s+/g, ' ').replace(/\s*([(),:;{}])\s*/g, '$1');`, and
    a `describe('overrides the tables rely on')` that Tasks 5, 9 and 12 append to;
  - in `src/colors.test.ts`, `const NOT_YET_RESTYLED: readonly string[]`, whose lines Tasks 5, 10
    and 11 delete and which Task 12 removes.

- [ ] **Step 1: Write the failing theme tests**

Create `src/theme.test.ts`. Its helpers are written in Step 3; the tests call them:

- `readTheme(css: string): Map<string, string>` — the `--` declarations of the
  `@plugin 'daisyui/theme' { … }` block; throws `no daisyui/theme block` when there is none.
- `token(theme: Map<string, string>, name: string): string` — throws `missing token <name>`.
- `type RGB = [number, number, number]` — gamma-encoded sRGB channels from 0 to 1, unrounded;
  `rgb(hex: string): RGB` and `toHex(c: RGB): string` (rounds each channel to 8 bits).
- `contrast(a: RGB, b: RGB): number` — WCAG 2.x relative luminance (linearize with the 0.04045
  threshold) and `(L1 + 0.05) / (L2 + 0.05)`.
- `over(fg: RGB, alpha: number, bg: RGB): RGB` — `fg` at `alpha` composited on `bg` per channel
  in gamma-encoded sRGB, as the browser does.
- `mixOklab(a: RGB, weight: number, b: RGB): RGB` — `color-mix(in oklab, a weight, b)`, as
  daisyUI 5.7.50's `.alert-soft` mixes: both to oklab with Ottosson's published matrices, a linear
  mix, back to sRGB.

`const T = readTheme(read('./styles.css'))` and
`const c = (n: string) => rgb(token(T, '--color-' + n))`. A hex literal in a test goes through
`rgb()`.

Tests:

1. `it('declares exactly the spec tokens')`: `Object.fromEntries(T)` equals an object literal of
   the 28 tokens and values **copied from the spec's _Theme and tokens_ table, not from
   `styles.css`**; `[...T.keys()].sort()` equals `[...THEME_TOKENS].sort()`; and the block text
   contains `name: 'instrument'`, `default: true` and `color-scheme: light`.
2. `it('reproduces the measured contrasts of M8')`: each `toBeCloseTo(expected, 1)`:
   `contrast(c('base-content'), c('base-100'))` 17.72 and on `base-200` 16.12; `success` 5.02 /
   4.56; `error` 6.47 / 5.89; `warning` 5.76 / 5.24; `info` 5.17 / 4.70 (on `base-100` / `base-200`);
   `base-content` at 0.70 over each background, against it, 6.54 / 6.26; at 0.55, 3.95 / 3.84;
   `warning` on `mixOklab(c('warning'), 0.08, c('base-100'))` 5.14; `error` on its soft alert 5.74;
   `#b45309` on its soft alert 4.52; `primary-content` on `primary` 16.97; `neutral-content` on
   `neutral` 10.01; and with `const overlay = over(c('neutral'), 0.85, rgb('#ffffff'))`:
   `toHex(overlay)` is `'#5c5c62'`, `neutral-content` on it 6.38, `base-content` on it 2.66.
3. `it.each(TEXT)('%s is at least 4.5:1')`, 17 rows `[label, fg, bg]`: for each `bg` of `base-100`
   and `base-200`, `success`, `error`, `warning`, `info`, `base-content` and `base-content` at
   0.70 composited over `bg`; `warning` and `error` each on its soft alert (8% into `base-100` in
   oklab); `primary-content` on `primary`; `neutral-content` on `neutral` and on `overlay`.
4. `it.each(CONTROLS)('%s is at least 3:1')`, 5 rows: `base-content` at 0.55 over `base-100` and
   over `base-200`, each against its background (resting borders); `base-content` on `base-100` and
   on `base-200` (focus outline); `neutral-content` on `overlay` (overlay focus outline).
5. `it('names a missing token')`: `expect(() => token(new Map(), '--color-success')).toThrow('missing token --color-success')`.
6. `describe('overrides the tables rely on')`, first `it('styles.css keeps resting borders at 55% and placeholders at 70%')`:
   `flat(read('./styles.css'))` contains
   `flat(':is(.input, .select, .textarea, .file-input, .checkbox, .toggle):not(:focus, :focus-within, :checked, :indeterminate) { --input-color: color-mix(in oklab, var(--color-base-content) 55%, #0000); }')`
   and `flat(':is(.input, .textarea)::placeholder { color: color-mix(in oklab, var(--color-base-content) 70%, #0000); }')`.

- [ ] **Step 2: Write the failing color tests**

Create `src/colors.test.ts` with a helper written in Step 3:

```ts
/** Every color literal in one .svelte file. `text` is `<path>: <where>: <literal>`, where is the
 *  rule's selector (from cssRules), `markup` or `script`; allowed only for the stage allowances. */
function scanColors(path: string, source: string): { text: string; allowed: boolean }[];
const violations = (path: string, source: string) =>
	scanColors(path, source)
		.filter((e) => !e.allowed)
		.map((e) => e.text);
const PLAY = 'src/routes/play/+page.svelte';
const SHARE = 'src/lib/components/ShareLink.svelte';
const OTHER = 'src/lib/components/Other.svelte';
```

Fixture tests, `expect(violations(path, source)).toEqual(expected)`:

| path    | source                                                                                                 | expected                                                             |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `PLAY`  | `<style>.play { background: #fff; }</style>`                                                           | `[]`                                                                 |
| `SHARE` | `<style>.qr-code { background: #FFFFFF; }</style>`                                                     | `[]`                                                                 |
| `OTHER` | `<style>.play { background: #fff; }</style>`                                                           | `[OTHER + ': .play: #fff']`                                          |
| `PLAY`  | `<style>.play { background: #000; }</style>`                                                           | `[PLAY + ': .play: #000']`                                           |
| `PLAY`  | `<style>.play, .x { background: #fff; }</style>`                                                       | `[PLAY + ': .play, .x: #fff']`                                       |
| `OTHER` | `<style>.a { color: rgb(0 0 0); border-color: hsla(0, 0%, 0%, 0.5); }</style>`                         | the two texts ending `.a: rgb(0 0 0)` and `.a: hsla(0, 0%, 0%, 0.5)` |
| `OTHER` | `<style>@supports (x: y) { .a { color: #c00; } }</style>`                                              | `[OTHER + ': .a: #c00']`                                             |
| `OTHER` | `<style>/* was #c00 */ .a { color: CanvasText; }</style><!-- #fff --><p>{#each xs as x}{x}{/each}</p>` | `[]`                                                                 |
| `OTHER` | `<p style="color: #333">x</p><p class="bg-[#123456]">y</p>`                                            | the texts ending `markup: #333` and `markup: #123456`                |
| `OTHER` | `<script>const c = 'text-[rgb(1,2,3)]';</script>`                                                      | `[OTHER + ': script: rgb(1,2,3)']`                                   |

Then, over the real files (every `.svelte` file under
`fileURLToPath(new URL('.', import.meta.url))`, read with `readdirSync(…, { recursive: true })`,
paths written `src/…` with forward slashes, sorted):

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

- [ ] **Step 3: Run both to verify they fail, then write the helpers**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/theme.test.ts src/colors.test.ts`
Expected: FAIL, the helpers are not defined.

Write the helpers in each file. `scanColors` decisions:

- `<style>` blocks (`/<style[^>]*>([\s\S]*?)<\/style>/g`) go through `cssRules`; each rule's
  `declarations` are searched. `<script>` blocks are searched for colors inside Tailwind arbitrary
  values only: `/\[(#[0-9a-f]{3,8}|(?:rgba?|hsla?)\([^)\]]*\))\]/gi`. The rest, with HTML comments
  removed, is markup and is searched whole.
- A color literal is `/(?<![\w&{])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi` or
  `/\b(?:rgba?|hsla?)\([^)]*\)/gi`. System colors such as `CanvasText` are not looked for.
- `allowed` is true only for `#fff` or `#ffffff` (any case) in a rule whose selector is exactly
  `.play` or `.finish-screen` in `src/routes/play/+page.svelte`, or `.qr-code` in
  `src/lib/components/ShareLink.svelte`.

Run the same command. Expected: PASS.

- [ ] **Step 4: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  35 passed (35)`.

- [ ] **Step 5: Commit**

```bash
git add src/theme.test.ts src/colors.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "test: enforce the theme's contrast and keep raw colors out of components"
```

---

### Task 4: `Field`

**Files:**

- Create: `src/lib/components/Field.svelte`, `src/lib/components/Field.test.ts`
- Modify: `src/routes/+page.svelte` (imports; the label wrappers at `:241-247`, `:271-282`,
  `:288-298`, `:301-309`, `:312-318`, `:320-345`, `:352-377`, `:382-392`, `:394-397`, `:398-410`,
  `:411-423`; the `.field` rule at `:451-456`), `src/lib/components/ShareLink.svelte:50-58`

**Interfaces:**

- Consumes: nothing.
- Produces: `Field.svelte` with the spec's `FieldProps` (`label: string`, `class?: string`,
  `children: Snippet`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/Field.test.ts`. Children come from
`createRawSnippet(() => ({ render: () => '<select class="probe"></select>' }))`.

1. `it('writes the label text first, then the children, in one label')`, rendering
   `{ label: 'Error correction', class: 'ecc-field', children }`: one `label` in the container; its
   `firstChild` is a text node whose `textContent` is exactly `'Error correction'`; `.probe`'s
   `parentElement` is that label; and, as `page.test.ts:533` reads it,
   `probe.parentElement!.firstChild!.textContent!.trim()` is `'Error correction'`.
2. `it('passes the class through beside its own')`: the label's classes include `field`,
   `ecc-field`, `flex`, `flex-col`, `items-start` and `gap-1`.
3. `it('adds no stray class without one')`: rendered without `class`, the label has `field` and
   its `className` does not contain `undefined`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/lib/components/Field.test.ts`
Expected: FAIL, `./Field.svelte` does not resolve.

- [ ] **Step 3: Write `src/lib/components/Field.svelte`**

The markup is the spec's, with nothing between `>` and `{label}`:

```svelte
<label class={['field flex flex-col items-start gap-1', className]}
	>{label}{@render children()}</label
>
```

with `let { label, class: className, children }: FieldProps = $props();`. If Prettier breaks the
line, it keeps `>{label}` together; check that no whitespace appears before `{label}`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/lib/components/Field.test.ts`
Expected: PASS.

- [ ] **Step 5: Use `Field` at its twelve call sites**

Each `<label class="field…">Text …</label>` becomes `<Field label="Text" …>…</Field>` with the
same children in the same order (the existing select, inputs, span and `bind:this`):

| Call site                                  | `label`                                                  | `class`             |
| ------------------------------------------ | -------------------------------------------------------- | ------------------- |
| setup: Editor (`.editor-input`)            | `'Editor'`                                               |                     |
| setup: Format (`.format-input`)            | `{editor === 'rows' ? 'Format for new rows' : 'Format'}` |                     |
| setup: Error correction (`.ecc-input`)     | `'Error correction'`                                     | `'ecc-field'`       |
| setup: GS1 option (`.lax-input`)           | `'Render GS1 data that fails validation'`                | `'lax-field'`       |
| setup: Playback (`.mode-input`)            | `'Playback'`                                             |                     |
| setup: Dwell, Gap                          | `'Dwell'`, `'Gap'`                                       |                     |
| setup: Speed, Loop                         | `'Speed'`, `'Loop'`                                      |                     |
| setup: Random rotation, Random skew        | `'Random rotation'`, `'Random skew'`                     |                     |
| `ShareLink`: QR level (`.share-ecc-input`) | `'Share QR error correction'`                            | `'share-ecc-field'` |

Import `Field` in both files. Delete the setup page's `.field` rule; its layout now comes from
`Field`. `ShareLink`'s label gains the `field` class and the column layout, as the spec's call-site
table intends.

- [ ] **Step 6: Run the tests that read label text**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/routes/page.test.ts src/lib/components/ShareLink.test.ts`
Expected: PASS, including `page.test.ts:283` (`.ecc-field` starts with `Error correction`), `:533`
(the Format label) and `ShareLink.test.ts:56`.

- [ ] **Step 7: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  36 passed (36)`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/Field.svelte src/lib/components/Field.test.ts src/routes/+page.svelte src/lib/components/ShareLink.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add Field and use it for the twelve labelled settings"
```

---

### Task 5: `Note`

**Files:**

- Create: `src/lib/components/Note.svelte`, `src/lib/components/Note.test.ts`
- Modify: `src/styles.css` (append), `src/routes/+page.svelte` (`:249`, `:269`, `:284`, `:310`,
  `:347-350`, `:379`), `src/lib/components/RowEditor.svelte:157-167`,
  `src/lib/components/ValidationList.svelte:22-27`, `src/lib/components/ShareLink.svelte:63` and
  its `.qr-status` rule at `:83-86`
- Test: `src/theme.test.ts` (append), `src/colors.test.ts` (delete one line)

**Interfaces:**

- Consumes: `read`, `flat` and the `overrides` describe of `src/theme.test.ts` (Task 3).
- Produces: `Note.svelte`:

```ts
interface NoteProps extends Omit<HTMLAttributes<HTMLParagraphElement>, 'class' | 'children'> {
	tone?: 'info' | 'warning' | 'error'; // default 'info'
	class: string; // the existing class, e.g. 'flash-note'; written to the <p> unchanged
	children: Snippet;
}
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/Note.test.ts`, children from
`createRawSnippet(() => ({ render: () => '<span>Hello</span>' }))`:

1. `it('renders one p carrying exactly the caller class')`: with `{ class: 'flash-note', children }`,
   one `p` in the container, `p.className` is `'flash-note'`, `p.textContent` is `'Hello'`.
2. `it.each([[undefined, 'info'], ['info', 'info'], ['warning', 'warning'], ['error', 'error']])('tone %s writes data-tone %s')`:
   `p.dataset.tone` is the second value.
3. `it('passes id, role, hidden and aria-* to the p')`: with
   `{ class: 'qr-status mt-1', id: 'n1', role: 'status', hidden: true, 'aria-live': 'polite', children }`:
   `p.id` `'n1'`, `role` `'status'`, `p.hidden` true, `aria-live` `'polite'`, `className`
   `'qr-status mt-1'`; rendered again with `hidden: false`, `p.hasAttribute('hidden')` is false.

Append to `describe('overrides the tables rely on')` in `src/theme.test.ts`:
`it('styles.css colors the three note tones')`: `flat(read('./styles.css'))` contains the `flat`
of each of the three rules in Step 3.

In `src/colors.test.ts`, delete the line
`'src/lib/components/ShareLink.svelte: .qr-status: #a04b00',` from `NOT_YET_RESTYLED`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/lib/components/Note.test.ts src/theme.test.ts src/colors.test.ts`
Expected: FAIL: `./Note.svelte` does not resolve, the tone rules are missing, and the `.qr-status`
color is still there.

- [ ] **Step 3: Write `Note.svelte` and the tone rules**

`let { tone = 'info', class: className, children, ...rest }: NoteProps = $props();` and the
markup `<p {...rest} class={className} data-tone={tone}>{@render children()}</p>`. No `<style>`.

Append to `src/styles.css`:

```css
/* Note tones (src/lib/components/Note.svelte). An attribute, not a class, so each note's class
   list stays exactly the class its caller passed: RowEditor.svelte.test.ts reads it whole. The
   values are what text-base-content/70, text-warning and text-error compile to. */
[data-tone='info'] {
	color: color-mix(in oklab, var(--color-base-content) 70%, transparent);
}
[data-tone='warning'] {
	color: var(--color-warning);
}
[data-tone='error'] {
	color: var(--color-error);
}
```

- [ ] **Step 4: Use `Note` at its fourteen call sites**

Each `<p class="X" …>content</p>` becomes `<Note class="X" …>content</Note>`, keeping its `{#if}`,
its attributes and its content exactly: tests read the text of `.row-hint`, `.editor-hint`,
`.dup-hint`, `.lax-note`, `.scan-hint` and `.dense-hint` with `toBe`.

| File             | Notes and tones                                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| setup page       | `editor-hint`; `file-error` (`tone="error"`, `hidden={!fileError}`); `gs1-hint`; `lax-note` (`id="{uid}-lax-note"`); `flash-note` (`tone="warning"`); `dup-hint` (`tone="warning"`) |
| `RowEditor`      | `row-hint`, `gs1-hint`, `lax-note`, `scan-hint`, `dense-hint`                                                                                                                       |
| `ValidationList` | `scan-hint`, `dense-hint`                                                                                                                                                           |
| `ShareLink`      | `<Note tone="warning" class="qr-status mt-1" role="status">{statusMessage(status)}</Note>`; delete the `.qr-status` rule (its color is the tone, its margin `mt-1`)                 |

Untoned notes are `info`. The switch note's inner `<p>` is not a call site: it stays inline.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/lib/components/Note.test.ts src/theme.test.ts src/colors.test.ts src/lib/components/RowEditor.svelte.test.ts src/lib/components/ValidationList.test.ts src/lib/components/ShareLink.test.ts src/routes/page.test.ts`
Expected: PASS, including `RowEditor.svelte.test.ts:253-262` (the whole class lists) and the
exact-text reads of `.row-hint`, `.editor-hint`, `.dup-hint` and `.lax-note`.

- [ ] **Step 6: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  37 passed (37)`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/Note.svelte src/lib/components/Note.test.ts src/styles.css src/routes/+page.svelte src/lib/components/RowEditor.svelte src/lib/components/ValidationList.svelte src/lib/components/ShareLink.svelte src/theme.test.ts src/colors.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add Note and use it for the fourteen hint and error paragraphs"
```

---

### Task 6: `SecondsSlider`

**Files:**

- Create: `src/lib/components/SecondsSlider.svelte`,
  `src/lib/components/SecondsSlider.svelte.test.ts`
- Modify: `src/routes/+page.svelte` (`:34` import, `:98-107` handlers, the Dwell and Gap fields at
  `:320-345` and `:352-377`, the `.seconds` rule at `:457-461`), `src/routes/play/+page.svelte`
  (`:10` import, `:126-141` handlers, the two `.ctl-group`s at `:200-251`, the rules at `:316-323`)

**Interfaces:**

- Consumes: `Field` (Task 4); `formatSeconds` and `parseSeconds` from `$lib/seconds`;
  `DWELL_RANGE`, `GAP_RANGE` from `$lib/types`.
- Produces: `SecondsSlider.svelte` with the spec's `SecondsSliderProps` as written (`value`
  `$bindable` in ms, `range`, `label`, `rangeAriaLabel?`, `rangeClass`, `secondsClass`,
  `size?: 'sm' | 'xs'` defaulting to `'sm'`, `onchange?: (ms: number) => void`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/SecondsSlider.svelte.test.ts` with a `mount(extra = {}, start = 1000)`
helper: `let value = $state(start)`, `const onchange = vi.fn()`, and
`render(SecondsSlider, { props: { get value() { return value; }, set value(v: number) { value = v; }, range: DWELL_RANGE, label: 'Dwell', rangeClass: 'dwell-input', secondsClass: 'dwell-seconds', onchange, ...extra } })`,
returning the container, the range (`input[type=range]`), the seconds field
(`input[type=number]`), `onchange` and `() => value`.

1. `it('shows the value in seconds and on the range')`: start 1000 → seconds `value` `'1.00'`,
   range `value` `'1000'`, range `aria-valuetext` `'1.00 s'`; seconds `inputmode` `'decimal'`,
   `step` `'0.01'`, `min` `'0.05'`, `max` `'5'`.
2. `it('stores a typed number snapped to the grid and clamped, and reports it')`: `change` to
   `'0.404'` → value 400, field `'0.40'`, `onchange` last called with 400; then `'9'` → 5000,
   `'5.00'`, `onchange` with 5000.
3. `it.each(['', 'abc', '0,5'])('ignores %j and shows the current value again')`: start 400;
   after the `change`, value 400, field `'0.40'`, `onchange` not called.
4. `it('stores and reports a range move')`: `fireEvent.input(range, { target: { value: '300' } })`
   → value 300, `onchange` called with 300.
5. `it('names the seconds field after its label')`: with
   `{ label: 'Gap', range: GAP_RANGE, rangeClass: 'gap-input', secondsClass: 'gap-seconds' }` and
   start 0 → `aria-label` `'Gap in seconds'`, field `'0.00'`.
6. `it('labels the range only when asked')`: by default the range has no `aria-label`; with
   `{ rangeAriaLabel: 'Dwell' }` it is `'Dwell'`.
7. `it('renders the range, then span.seconds holding the field and s')`: with
   `{ rangeClass: 'ctl-dwell', secondsClass: 'ctl-dwell-seconds' }`: the container's element
   children are the range and a `SPAN` with class `seconds`; the range has `ctl-dwell`; the span
   contains the field, which has `ctl-dwell-seconds`; `span.textContent.trim()` is `'s'`.
8. `it.each([[undefined, 'range-sm', 'w-32', 'input-sm'], ['sm', 'range-sm', 'w-32', 'input-sm'], ['xs', 'range-xs', 'w-[110px]', 'input-xs']])('size %s')`:
   the range has `range` and the second and third values, the field has `input`, the fourth value
   and `w-[4.5em]`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/lib/components/SecondsSlider.svelte.test.ts`
Expected: FAIL, `./SecondsSlider.svelte` does not resolve.

- [ ] **Step 3: Write `SecondsSlider.svelte`**

Per the spec's _SecondsSlider.svelte_, with these choices:

- The size classes are a script constant, so Tailwind sees them in this `.svelte` file:
  `{ sm: { range: 'range range-sm w-32', input: 'input input-sm w-[4.5em]' }, xs: { range: 'range range-xs w-[110px]', input: 'input input-xs w-[4.5em]' } }`.
  The range's class is `[SIZES[size].range, rangeClass]`, the field's `[SIZES[size].input, secondsClass]`,
  the span's `seconds flex items-center gap-1`.
- The range: `bind:value`, `min`/`max`/`step` from `range`, `aria-label={rangeAriaLabel}`,
  `aria-valuetext={formatSeconds(value)}`,
  `oninput={(e) => onchange?.(Number(e.currentTarget.value))}`.
- The field's `onchange`: `const ms = parseSeconds(e.currentTarget.value, range)`; if `ms !== null`,
  `value = ms` and `onchange?.(ms)`; then `e.currentTarget.value = ((ms ?? value) / 1000).toFixed(2)`.
- Markup order: the range, then `<span …><input … /> s</span>`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/lib/components/SecondsSlider.svelte.test.ts`
Expected: PASS.

- [ ] **Step 5: Use it at its four call sites**

- Setup page: inside `<Field label="Dwell">`,
  `<SecondsSlider bind:value={dwellMs} range={DWELL_RANGE} label="Dwell" rangeClass="dwell-input" secondsClass="dwell-seconds" />`;
  Gap the same with `gapMs`, `GAP_RANGE`, `"Gap"`, `gap-input`, `gap-seconds`. Delete
  `onDwellSeconds`, `onGapSeconds`, the `$lib/seconds` import line and the `.seconds` rule.
- Play page: each `.ctl-group` keeps its `<span>Dwell</span>` (or `Gap`) and replaces the range,
  the number field and `<span>s</span>` with
  `<SecondsSlider bind:value={dwell} range={DWELL_RANGE} label="Dwell" rangeAriaLabel="Dwell" rangeClass="ctl-dwell" secondsClass="ctl-dwell-seconds" size="xs" onchange={(ms) => step?.setDwell(ms)} />`
  (Gap: `gap`, `GAP_RANGE`, `"Gap"`, `ctl-gap`, `ctl-gap-seconds`, `step?.setGap(ms)`). Delete
  `onDwellSeconds`, `onGapSeconds`, `parseSeconds` from the import (keep `formatSeconds`, which the
  readout uses) and the `.ctl-dwell, .ctl-gap` and `.ctl-dwell-seconds, .ctl-gap-seconds` rules.

- [ ] **Step 6: Run the page tests**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/routes/page.test.ts src/routes/play/page.test.ts`
Expected: PASS, including the overlay order test (`play/page.test.ts:192`), the seconds-field
tests (`page.test.ts:424-448`, `play/page.test.ts:264-290`) and the Space-key test.

- [ ] **Step 7: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  38 passed (38)`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/SecondsSlider.svelte src/lib/components/SecondsSlider.svelte.test.ts src/routes/+page.svelte src/routes/play/+page.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add SecondsSlider for the four dwell and gap controls"
```

---

### Task 7: `FormatSelect` and `EccSelect`

**Files:**

- Create: `src/lib/components/FormatSelect.svelte`, `src/lib/components/EccSelect.svelte`,
  `src/lib/components/FormatSelect.svelte.test.ts`, `src/lib/components/EccSelect.svelte.test.ts`
- Modify: `src/routes/+page.svelte` (`:16-23` imports, the format select at `:273-281`, the level
  select at `:290-297`), `src/lib/components/RowEditor.svelte` (`:4-11` imports, the selects at
  `:86-118`)

**Interfaces:**

- Consumes: `Field` (Task 4); `FORMAT_GROUPS`, `FormatId`, `EccOption`, `FORMAT_BY_ID` from
  `$lib/formats`.
- Produces: the spec's `FormatSelectProps` (`value: FormatId` `$bindable`, `class: string`,
  `'aria-label'?: string`) and `EccSelectProps` (`option: EccOption`, `value: string` `$bindable`,
  `class: string`, `'aria-label'?: string`) as written.

- [ ] **Step 1: Write the failing tests**

Both files mount with a `$state` value behind a getter and setter, as in Task 6.
`src/lib/components/FormatSelect.svelte.test.ts`, start `'qr'`, class `'row-format'`:

1. `it('renders a bare select')`: the container has one element child, a `SELECT`.
2. `it('lists the 8 groups and every format in FORMAT_GROUPS order')`: the `optgroup` labels equal
   `FORMAT_GROUPS.map((g) => g.group)` (length 8); the option values equal
   `FORMAT_GROUPS.flatMap((g) => g.formats.map((f) => f.id))` and their texts the formats' labels.
3. `it('reads and writes the bound FormatId')`: `select.value` is `'qr'`; after a `change` to
   `'pdf417'` the bound value is `'pdf417'`.
4. `it('carries the class and the aria-label')`: classes include `row-format`, `select`,
   `select-sm`, `w-auto`; with `'aria-label': 'Format of code 2'` the attribute is that; without
   it there is none.

`src/lib/components/EccSelect.svelte.test.ts`, `const QR = FORMAT_BY_ID.get('qr')!.ecc!;`,
`const AZTEC = FORMAT_BY_ID.get('aztec')!.ecc!;`, class `'row-ecc'`:

1. `it('renders a bare select')`, as above.
2. `it("shows the default level for ''")`: option `QR`, start `''` → `select.value` `'M'`.
3. `it("writes '' when the default is chosen")`: start `'H'`, `change` to `'M'` → value `''`.
4. `it('writes any other level as chosen')`: start `''`, `change` to `'Q'` → `'Q'`.
5. `it('writes label (note), or the label alone')`: `QR`'s option texts are
   `['level L (~7% recovery)', 'level M (~15% recovery, default)', 'level Q (~25% recovery)', 'level H (~30% recovery)']`;
   `AZTEC`'s are
   `['≥10% error correction', '≥23% error correction (default)', '≥36% error correction', '≥50% error correction']`.
6. `it('carries the class and the aria-label')`, as for `FormatSelect`, with
   `'Error correction of code 2'`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/lib/components/FormatSelect.svelte.test.ts src/lib/components/EccSelect.svelte.test.ts`
Expected: FAIL, the two components do not resolve.

- [ ] **Step 3: Write both components**

Each renders one `<select class={['select select-sm w-auto', className]} aria-label={ariaLabel}>`
(destructure `'aria-label': ariaLabel`). `FormatSelect` uses `bind:value` and the setup page's
current `{#each FORMAT_GROUPS …}` markup. `EccSelect` uses
`bind:value={() => value || option.defaultValue, (v) => (value = v === option.defaultValue ? '' : v)}`
and the current `{#each opt.choices …}` markup, with `option` in place of `opt`.

- [ ] **Step 4: Run the tests to verify they pass**

Same command. Expected: PASS.

- [ ] **Step 5: Use them**

- Setup page: inside the Format `Field`,
  `<FormatSelect class="format-input" bind:value={() => format, (v) => selectFormat(v)} />`; inside
  the `ecc-field` `Field` (keep `{@const opt = descriptor.ecc}`),
  `<EccSelect class="ecc-input" option={opt} bind:value={ecc} />`. Drop `FORMAT_GROUPS` from the
  formats import.
- `RowEditor`: `<FormatSelect class="row-format" aria-label="Format of code {i + 1}" bind:value={…} />`
  with the current function binding (the getter `() => row.format` and the setter that runs
  `canonicalEcc` and `canonicalLax`) unchanged; inside `{#if opt}`,
  `<EccSelect class="row-ecc" aria-label="Error correction of code {i + 1}" option={opt} bind:value={row.ecc} />`.
  Drop `FORMAT_GROUPS` from the import.

- [ ] **Step 6: Run the caller tests**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/routes/page.test.ts src/lib/components/RowEditor.svelte.test.ts`
Expected: PASS, including the `row-` order test (`RowEditor.svelte.test.ts:200`), `formatLabel`
(`page.test.ts:533`) and the level tests from `page.test.ts:275`.

- [ ] **Step 7: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with `Test Files  40 passed (40)`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/FormatSelect.svelte src/lib/components/EccSelect.svelte src/lib/components/FormatSelect.svelte.test.ts src/lib/components/EccSelect.svelte.test.ts src/routes/+page.svelte src/lib/components/RowEditor.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add FormatSelect and EccSelect for the setup page and the row editor"
```

---

### Task 8: `barcode-caps.css`

**Files:**

- Create: `src/lib/components/barcode-caps.css`
- Modify: `src/lib/components/ScrollColumn.svelte` (script imports near `:11`, caps at `:78-90`),
  `src/lib/components/StepStage.svelte` (script imports near `:14`, comment and caps at `:85-98`)

**Interfaces:**

- Consumes: `stage-check` (Task 2).
- Produces: nothing other tasks use.

The spec's test table has no unit test for this file: `stage-check` is its proof, and the existing
`ScrollColumn`, `StepStage` and play-page tests guard the DOM.

- [ ] **Step 1: Write `src/lib/components/barcode-caps.css`**

Plain CSS, outside Tailwind's layers, the three caps from `ScrollColumn.svelte:78-90` moved
unchanged in the same order, each selector under both hosts:

```css
/* The barcode svg size caps for both stages. ScrollColumn.svelte and StepStage.svelte import this
   file; it is plain CSS, outside Tailwind's layers, so no theme rule competes with it. */
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

Both components gain `import './barcode-caps.css';` in their instance `<script>`. Delete the three
cap rules from each `<style>`, and `StepStage`'s "Copied from ScrollColumn.svelte…" comment. Each
keeps its container and `.barcode-item` padding rules.

- [ ] **Step 3: Check that one copy is left**

Run: `git grep -n -F 'max-width: min(' -- src`
Expected: exactly three lines, all in `src/lib/components/barcode-caps.css`.

- [ ] **Step 4: Run the stage tests, then the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/lib/components/ScrollColumn.test.ts src/lib/components/StepStage.test.ts src/routes/play/page.test.ts && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts' && grep -rlF '960px' dist/_app/immutable/assets`
Expected: PASS; as in Task 1 with 40 test files; the last command names at least one CSS file
holding the PDF417 cap. `stage-check` (Step 5) is the real proof: without the caps, PDF417 at
390 px would render wider than the screen.

- [ ] **Step 5: Check the stage against `main`**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm run stage-check; echo "exit $?"`
Expected: `8 PASS, 0 MISMATCH, 0 UNVERIFIED against main`, `exit 0`. A MISMATCH: stop and report.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/barcode-caps.css src/lib/components/ScrollColumn.svelte src/lib/components/StepStage.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "refactor: share the barcode size caps between both stages"
```

---

### Task 9: Restyle the setup page

**Files:**

- Modify: `src/routes/+page.svelte` (markup and `<style>`)
- Test: `src/theme.test.ts` (append)

**Interfaces:**

- Consumes: `Field`, `Note`, `SecondsSlider`, `FormatSelect`, `EccSelect` in place (Tasks 4-7);
  `read`, `flat` (Task 3).
- Produces: nothing other tasks use.

- [ ] **Step 1: Write the failing assertion**

Append to `describe('overrides the tables rely on')`:
`it('the setup page keeps a disabled Start recognizable')`:
`flat(read('./routes/+page.svelte'))` contains
`flat('.start:disabled { background-color: var(--color-primary); color: var(--color-primary-content); opacity: 0.5; }')`.

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/theme.test.ts`
Expected: FAIL on that assertion.

- [ ] **Step 2: Add the classes**

Per the spec's _Setup page_, each class added beside the existing one:

| Element                                                | Added classes                                           |
| ------------------------------------------------------ | ------------------------------------------------------- |
| `div.setup`                                            | `bg-base-100`                                           |
| `h1`                                                   | `text-2xl font-bold tracking-tight`                     |
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

Delete the `.code-input` rule (the utilities replace it) and the `.start` rule (`btn-lg` replaces
its padding and size). Keep `.setup` and `.settings-row`. Replace the `.start:disabled` rule with:

```css
/* daisyUI dims a disabled btn to 1.39:1. Start keeps its primary look at half opacity, as before,
   so it stays recognizable while it waits for a valid code. */
.start:disabled {
	background-color: var(--color-primary);
	color: var(--color-primary-content);
	opacity: 0.5;
}
```

- [ ] **Step 4: Run the tests**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/theme.test.ts src/routes/page.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 test files.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte src/theme.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: restyle the setup page on the Instrument theme"
```

---

### Task 10: Restyle `ValidationList`, `Gs1Breakdown` and `ShareLink`

**Files:**

- Modify: `src/lib/components/ValidationList.svelte` (`:10`, `:13`, the rules at `:60-68`),
  `src/lib/components/Gs1Breakdown.svelte` (`:16-18`, `:46-49`),
  `src/lib/components/ShareLink.svelte` (`:45-62`, `.share-url` at `:66-69`)
- Test: `src/colors.test.ts` (delete three lines)

**Interfaces:**

- Consumes: `Field`, `Note` in place.
- Produces: nothing other tasks use.

- [ ] **Step 1: Make the color guard expect the change**

Delete the three `src/lib/components/ValidationList.svelte: …` lines from `NOT_YET_RESTYLED`.

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/colors.test.ts`
Expected: FAIL, the three colors are still in `ValidationList.svelte`.

- [ ] **Step 2: Restyle the three components**

- `ValidationList`: `ul.validation-list` gains `font-mono text-sm`. The `li`'s class expression
  becomes
  `entry.lint !== undefined ? 'lenient text-warning' : entry.valid ? 'valid text-success' : 'invalid text-error'`.
  Delete the `.valid`, `.invalid` and `.lenient` color rules; keep every other rule, including the
  scroll heights.
- `Gs1Breakdown`: `details.gs1-breakdown` gains `text-base-content` and its rule loses
  `color: CanvasText;`; `<summary>` gains `class="link"`; `<table>` gains `class="table table-xs"`.
  The `visually-hidden` header spans stay.
- `ShareLink`: `.copy-link` gains `btn btn-sm`; `.share-url` gains `input input-sm font-mono w-auto`
  and its rule loses `font-family: monospace;` (its dead `flex: 1` stays: Question 3);
  `.share-ecc-input` gains `select select-sm w-auto`; `.qr-code` gains `border border-base-300`,
  keeping its literal-white rule.

- [ ] **Step 3: Run the tests**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/colors.test.ts src/lib/components/ValidationList.test.ts src/lib/components/Gs1Breakdown.test.ts src/lib/components/ShareLink.test.ts src/routes/page.test.ts`
Expected: PASS.

- [ ] **Step 4: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 test files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ValidationList.svelte src/lib/components/Gs1Breakdown.svelte src/lib/components/ShareLink.svelte src/colors.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: restyle the validation list, the GS1 breakdown and the share link"
```

---

### Task 11: Restyle `RowEditor`

**Files:**

- Modify: `src/lib/components/RowEditor.svelte` (markup `:64-156`, `<style>` `:189-226`)
- Test: `src/colors.test.ts` (delete three lines)

**Interfaces:**

- Consumes: `FormatSelect`, `EccSelect`, `Note` in place.
- Produces: nothing other tasks use.

- [ ] **Step 1: Make the color guard expect the change**

Delete the three `src/lib/components/RowEditor.svelte: …` lines from `NOT_YET_RESTYLED`.

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/colors.test.ts`
Expected: FAIL, the three colors are still in `RowEditor.svelte`.

- [ ] **Step 2: Restyle**

| Element                | Change                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `li.row`               | gains `border-b border-base-300 pb-3`                                                                                           |
| `.row-number`          | gains `text-base-content/70`                                                                                                    |
| `.row-payload`         | gains `textarea font-mono min-h-0`; its rule loses `font-family: monospace;` (the `field-sizing` rule stays)                    |
| `.row-verdict`         | gains `class:text-success`, `class:text-warning` and `class:text-error` with the conditions of `valid`, `lenient` and `invalid` |
| `.row-lax-input`       | gains `checkbox checkbox-sm`                                                                                                    |
| `.row-up`, `.row-down` | gain `btn btn-sm min-h-9`                                                                                                       |
| `.row-delete`          | gains `btn btn-ghost btn-sm min-h-9 text-error` (its `margin-left: auto` rule stays)                                            |
| `.row-add`             | gains `btn btn-sm`                                                                                                              |

Delete the `.row-controls button` rule (`min-h-9` replaces it) and the three `.row-verdict` color
rules.

- [ ] **Step 3: Run the tests**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/colors.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts`
Expected: PASS, including the `row-` order test and the verdict-class tests
(`RowEditor.svelte.test.ts:171`, `:246`).

- [ ] **Step 4: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 test files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/RowEditor.svelte src/colors.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: restyle the row editor"
```

---

### Task 12: Restyle the play page

**Files:**

- Modify: `src/routes/play/+page.svelte` (markup `:181-277`, `<style>` `:288-355`)
- Test: `src/colors.test.ts` (the ratchet ends), `src/theme.test.ts` (append)

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

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/colors.test.ts src/theme.test.ts`
Expected: FAIL: four raw colors remain and the override is missing.

- [ ] **Step 2: Restyle**

- `.play` and its rule: untouched.
- `.overlay` gains `bg-neutral/85 text-neutral-content`; its rule loses `background` and `color`,
  keeping position, flex layout, padding, the 8 px radius, `transition` and `opacity`; the
  `.overlay.hidden` rule stays.
- `.ctl-playpause`, `.ctl-prev`, `.ctl-next`, `.ctl-restart`, `.ctl-back` gain `btn btn-sm`;
  `.ctl-speed` gains `range range-xs w-[110px]`.
- `.readout` gains `bg-base-100/85 text-base-content`; its rule loses `color` and `background`.
- `.finish-screen` gains `text-2xl` and its rule loses `font-size: 1.5rem;`, keeping
  `background: #fff`; `.finish-restart` gains `btn btn-primary`, `.finish-back` gains `btn`.
- `.finish-status` and its rule: untouched.
- Add to the `<style>`:

```css
/* daisyUI's focus outline is base-content, 2.66:1 on the overlay; neutral-content is 6.38:1. The
   controls in SecondsSlider belong to a child component, hence :global. */
.overlay :global(:focus-visible) {
	outline-color: var(--color-neutral-content);
}
```

- [ ] **Step 3: Run the tests**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx vitest run src/colors.test.ts src/theme.test.ts src/routes/play/page.test.ts`
Expected: PASS, including the overlay-order test and the `hidden` class tests
(`play/page.test.ts:252-261`).

- [ ] **Step 4: Run the whole suite, lint, build and the guard**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 test files.

- [ ] **Step 5: Check the stage against `main`**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm run stage-check; echo "exit $?"`
Expected: `8 PASS, 0 MISMATCH, 0 UNVERIFIED against main`, `exit 0`. A MISMATCH: stop and report.

- [ ] **Step 6: Commit**

```bash
git add src/routes/play/+page.svelte src/colors.test.ts src/theme.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: restyle the play overlay, readout and finish screen"
```

---

### Task 13: The class-name collision audit

**Files:**

- Modify: this plan's _Verification record_ (row A10 and the audit table); `src/styles.css` only if
  a name must be excluded
- Not committed: `class-audit.ts` in your session's scratchpad

**Interfaces:**

- Consumes: `cssRules` from `scripts/check-css.ts` (Task 1); the finished restyle.
- Produces: the audit table that Task 15 copies into the PR body.

- [ ] **Step 1: Build**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npm run build`
Expected: exit 0 with the `check-css:` size line.

- [ ] **Step 2: Write the audit script in your scratchpad**

`class-audit.ts`, run by Node 24, importing `cssRules` from the repository's
`scripts/check-css.ts` by its absolute path with the `.ts` extension. It:

1. lists our own class names as they are at `main`: for each `.svelte` file from
   `git ls-tree -r --name-only main -- src`, read with `git show main:<path>`, every word of a
   static `class="…"` value outside `{…}`, every quoted word inside a `class={…}` expression, and
   every `class:<name>` directive name; plus the DOM names that `src/lib/items.ts`,
   `src/lib/scroller.ts` and `src/lib/stepper.ts` set at `main`: `barcode-item`,
   `barcode-item--2d`, `barcode-item--<id>` for each of the 36 `FormatId`s, `scroller-copy`,
   `scroller-track` and `step-stage`;
2. splits every `.css` file under `dist/` with `cssRules`;
3. for each name lists the selectors holding `.<name>` as a whole class (the next character is
   not `[\w-]`), skipping the rules we wrote: selectors containing `svelte-` (Svelte's scoping),
   `.scroll-column` or `.step-stage-host` (`barcode-caps.css`), and the override and tone
   selectors of `src/styles.css`;
4. prints `<n> names checked`, then one line per name with a hit: `<name>: <first selector> (+<k> more)`.

- [ ] **Step 3: Run it**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && node <your scratchpad>/class-audit.ts`
Expected: more than 100 names checked (the 36 `barcode-item--<id>` names alone), and at least the
hit `file-input` (daisyUI's `.file-input`). A count of 0, no output or no `file-input` hit means
the script is wrong: fix it. Never record an empty audit as a pass.

- [ ] **Step 4: Resolve each hit**

- `file-input`: accepted, deliberate (spec, _Class-name collisions_).
- `hidden`: listed whether or not it has a hit: excluded by `@source not inline('hidden')`;
  `check-css` guards it.
- Any other hit whose rule changes our element's display, visibility, position, size, spacing or
  color: excluded. Add `@source not inline('<name>');` beside the `hidden` line, rebuild, rerun the
  audit (the hit must be gone), and run `npm test`.
- A hit whose rule changes nothing visible on our element: accepted, with the reason.
- A hit that cannot be excluded without losing a utility the restyle uses: recorded as "rename in
  spec 2, with its test change"; nothing is renamed now.

- [ ] **Step 5: Record**

Fill row A10 and the _Class-name collision audit_ table in this plan's _Verification record_: the
name count, then one row per hit and one for `hidden`: class, the rule we did not write (first
selector), resolution, reason.

- [ ] **Step 6: Run the checks and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx prettier --write docs/superpowers/plans/2026-11-04-ui-foundation.md && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 test files.

```bash
git add docs/superpowers/plans/2026-11-04-ui-foundation.md
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "docs: record the class-name collision audit"
```

If Step 4 added an exclusion, add `src/styles.css` too and use the subject
`fix: keep Tailwind from generating rules for our own class names`.

---

### Task 14: Documentation

**Files:**

- Modify: `CONTRIBUTING.md` (`## Stack` at `:17-22`, a new `## Styling` after it),
  `docs/guide.md` (Contents at `:8-17`, a new section before `## Scanner settings and troubleshooting` at `:350`)

**Interfaces:**

- Consumes: the finished behavior of Tasks 1-13. No code, no tests.

- [ ] **Step 1: CONTRIBUTING.md**

`## Stack` gains, after the bwip-js line:
`- **Tailwind CSS** 4.3.4 and **daisyUI** 5.7.50 for styling, with one light theme, Instrument, in \`src/styles.css\``.

After `## Stack`, add:

```markdown
## Styling

Tailwind CSS and daisyUI style the app. `src/styles.css` holds the one theme, **Instrument**, and
the few overrides of daisyUI's defaults.

- Write Tailwind and daisyUI classes only in `.svelte` files. Tailwind scans no other files, so a
  class written in a `.ts` file is never generated.
- Take every color from the theme tokens: `text-success`, `bg-base-200`, `btn-primary` and so on
  in classes, `var(--color-…)` in CSS. `src/colors.test.ts` fails on a raw color in a component.
- Do not add a class that starts with `ctl-` or `row-`. Tests find the play overlay's controls and
  the row editor's controls by those prefixes.
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

Run: `git grep -n -F -e '## Styling' -e 'npm run stage-check' -e 'daisyUI** 5.7.50' -- CONTRIBUTING.md && git grep -n -F -e '## Browser support' -e '(#browser-support)' -e '11. [Scanner settings' -- docs/guide.md && git diff --quiet main -- README.md && echo README unchanged`
Expected: at least one line for each string and `README unchanged`.

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx prettier --write CONTRIBUTING.md docs/guide.md && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as in Task 1, with 40 test files.

- [ ] **Step 4: Commit**

```bash
git add CONTRIBUTING.md docs/guide.md
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "docs: document the styling rules, stage-check and the browser floor"
```

---

### Task 15: Verification that fails closed, the visual review and the PR body

**Files:**

- Modify: this plan's _Verification record_ and _PR body_
- Not committed: `visual-review.ts` in your session's scratchpad; the shots under
  `.superpowers/visual-review/` (ignored by git)

**Interfaces:**

- Consumes: the finished branch; `resolveRoute` from `scripts/stage-check.ts`.

- [ ] **Step 1: The automated rows A1 to A4**

Run: `source ~/.nvm/nvm.sh && nvm use 24 && node --version && npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Record: the Node version; svelte-check's error and warning counts; Vitest's `Test Files` and
`Tests` lines (31 and 737 at `11da147`); lint; the `check-css:` size line beside `main`'s 5,329 B
raw and 1,738 B gzipped (M2); the diff's output (it must be empty).

- [ ] **Step 2: The controls A5 and A7, and the stage A6**

Repeat Task 1 Step 7 (control 1) and Task 2 Step 7 (controls 1 and 3). Control 3 now edits the
first `max-width: min(90vw, 640px);` in `src/lib/components/barcode-caps.css`, where Task 8 moved
the caps, and reverts with `git checkout -- src/lib/components/barcode-caps.css`. Then run `source ~/.nvm/nvm.sh && nvm use 24 && npm run stage-check; echo "exit $?"`. Record each
command's last lines and exit code. A6 passes only on `8 PASS, 0 MISMATCH, 0 UNVERIFIED against main`
and exit 0. `git status --short` must show nothing afterwards but the plan file.

- [ ] **Step 3: Build `main` for the visual review**

Run: `git worktree add --detach <your scratchpad>/vr-main main && cd <your scratchpad>/vr-main && source ~/.nvm/nvm.sh && nvm use 24 && npm ci && npm run build`
Then copy `<your scratchpad>/vr-main/dist` to `<your scratchpad>/vr/main` and the repository's
`dist` (built in Step 1) to `<your scratchpad>/vr/branch`, and run
`git -C /home/nn/Projects/scandible worktree remove --force <your scratchpad>/vr-main`.

- [ ] **Step 4: Write and run `visual-review.ts`**

A throwaway Node 24 script in your scratchpad. It serves each copy as `stage-check` does (import
`resolveRoute` from `scripts/stage-check.ts` by absolute path), and into `index.html` and
`play.html` it injects a script that reads the `view` query parameter, performs the view's action
once its target exists (a `MutationObserver`, as in `stage-check`), and once the view's state
element exists sends
`navigator.sendBeacon('/__view', JSON.stringify({ view, scrollWidth: document.documentElement.scrollWidth, innerWidth }))`.
For each build, view and width it runs
`/usr/bin/firefox --headless --no-remote --profile <fresh dir> --window-size=W,H --screenshot .superpowers/visual-review/<build>/<view>-<W>.png <url>`
with the server's port in the URL, stopping only the Firefox it started, then prints one line per
shot: build, view, width, whether the state element was seen, `scrollWidth` and `innerWidth`.

| View      | URL path and fragment                                                                                            | Action                                                      | State element            | Heights (1280 / 390 wide) |
| --------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ | ------------------------- |
| `setup`   | `/scandible/?view=setup#codes=036000291452%0A012345678905%0A123&fmt=upc&mode=step&dwell=250&loop=1&rot=1&seed=1` | none                                                        | `.validation-list li`    | 2000 / 3000               |
| `empty`   | `/scandible/?view=empty`                                                                                         | none                                                        | `.start`                 | 2000 / 3000               |
| `rows`    | `/scandible/?view=rows#r1=upc_036000291452&r2=qr-H_hello&r3=gs1128_%2801%2909501101530003&fmt=upc&seed=1`        | none                                                        | `li.row`                 | 2000 / 3000               |
| `switch`  | as `rows`, with `view=switch`                                                                                    | set `.editor-input` to `text`, dispatch a bubbling `change` | `.switch-note`           | 2000 / 3000               |
| `share`   | as `setup`, with `view=share`                                                                                    | click `.copy-link`                                          | `.qr-code:not([hidden])` | 2000 / 3000               |
| `overlay` | `/scandible/play?view=overlay#codes=036000291452&fmt=upc&mode=step&seed=1`                                       | none                                                        | `.overlay .ctl-dwell`    | 900 / 844                 |
| `finish`  | as `overlay`, with `view=finish`                                                                                 | click `.ctl-next`                                           | `.finish-screen`         | 900 / 844                 |

Run it. Expected: 28 shots (2 builds, 7 views, 2 widths), each with its state element seen. A shot
whose state was not seen, or whose PNG is missing, is UNVERIFIED for A8.

- [ ] **Step 5: Read the shots (A8) and check the width (A9)**

Open each `main` and branch pair (the Read tool shows PNGs) and write one line per view and width:
control widths and spacing against `main`, as the spec's widths set them; focus is not visible in
static shots (human check 2). A9 passes only when every 390 px line has
`scrollWidth <= innerWidth` on the branch. If a shot shows a regression against `main` that the
spec does not intend (a control far wider or narrower, lost spacing, overflow at 390 px), fix it in
the file that owns it as a `fix:` commit, rerun Steps 1 and 2, and reshoot. If a fix needs a spec
decision, record the row FAILED with the shot paths and stop.

- [ ] **Step 6: Fill the record and the PR body, then commit**

Fill rows A1-A9 below with status and evidence; A10 came from Task 13. H1-H5 stay UNVERIFIED.
Fill the _PR body_ block. Then:

Run: `source ~/.nvm/nvm.sh && nvm use 24 && npx prettier --write docs/superpowers/plans/2026-11-04-ui-foundation.md && npm run lint`

```bash
git add docs/superpowers/plans/2026-11-04-ui-foundation.md
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "docs: record the UI foundation verification"
```

- [ ] **Step 7: Report**

The task report lists every row that is not PASS, by number, and never reports one as passed. The
PR itself is opened by the controller after the owner's review (finishing-a-development-branch),
with the _PR body_ below and the shots attached by hand.

#### Verification record

Status is `UNVERIFIED`, `PASS` or `FAILED`. Every row starts UNVERIFIED and changes only when its
pass rule is met and its evidence is entered. A skipped row, or a checker that dies or prints
nothing, stays UNVERIFIED.

| Row | Check                                                                          | Pass rule                                                             | Status     | Evidence |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ---------- | -------- |
| A1  | `npm test`                                                                     | svelte-check 0 errors and 0 warnings; every test file and test passes | UNVERIFIED |          |
| A2  | `npm run lint`                                                                 | exit 0                                                                | UNVERIFIED |          |
| A3  | `npm run build` with `check-css`                                               | exit 0; size line recorded beside `main`'s 5,329 B / 1,738 B          | UNVERIFIED |          |
| A4  | `git diff --name-only --diff-filter=M main -- '*.test.ts'`                     | prints nothing                                                        | UNVERIFIED |          |
| A5  | `check-css` without `@source not inline('hidden')`                             | `bare .hidden rule: .hidden` and a non-zero exit                      | UNVERIFIED |          |
| A6  | `npm run stage-check` against `main`                                           | `8 PASS, 0 MISMATCH, 0 UNVERIFIED`, exit 0                            | UNVERIFIED |          |
| A7  | `stage-check` controls: unknown ref; 100 px cap                                | exit 2; exit 1 with exactly the three `upc` MISMATCH lines            | UNVERIFIED |          |
| A8  | Visual review, 7 views × 2 widths × 2 builds                                   | 28 shots, every state seen, one note per view and width               | UNVERIFIED |          |
| A9  | No sideways scroll at 390 px (branch)                                          | `scrollWidth <= innerWidth` in all 7 views                            | UNVERIFIED |          |
| A10 | Class-name collision audit (Task 13)                                           | names counted; every hit resolved                                     | UNVERIFIED |          |
| H1  | Chrome and Safari render both pages correctly                                  | a person, in both browsers                                            | UNVERIFIED |          |
| H2  | Focus rings are visible when tabbing through both pages, including the overlay | a person, keyboard only                                               | UNVERIFIED |          |
| H3  | The play overlay fades out after 3 s instead of snapping away                  | a person, watching it                                                 | UNVERIFIED |          |
| H4  | The setup page works on a real phone                                           | a person, on a phone                                                  | UNVERIFIED |          |
| H5  | The GitHub Pages deploy renders under `/scandible`                             | a person, after the merge                                             | UNVERIFIED |          |

##### Class-name collision audit

| Class     | Rule we did not write (first selector) | Resolution | Reason |
| --------- | -------------------------------------- | ---------- | ------ |
| (Task 13) |                                        |            |        |

##### Visual review notes

(Task 15, one line per view and width.)

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

- Note tones are a `data-tone` attribute, so each note's class list stays the caller's (an existing
  test reads it whole).
- The control-border override applies to resting controls only, so daisyUI's focus and checked
  colors stay.
- The share URL field keeps today's width; spec 2's Share panel can change it.

## Verification

(rows A1-A10 with their evidence; CSS size against main)

## Class-name collision audit

(the table from the record)

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

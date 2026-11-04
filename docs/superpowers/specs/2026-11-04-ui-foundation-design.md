# UI foundation: Tailwind, daisyUI and shared components — Design

**Date:** 2026-11-04
**Status:** Design agreed in conversation on 2026-11-04, section by section. Draft for a
multi-lens review on Sonnet subagents before the user's approval.
Spec 1 of the three-spec UI revamp series (see _Series_). Facts measured for this spec are in
_Measurements_ at the end, cited as _M1_ to _M10_.

## Intent

The interface grew one feature at a time. It has no styling layer: one 9-line global stylesheet,
browser-default controls, and status colors hard-coded in each component in about five slightly
different shades. Several pieces exist twice: the dwell and gap slider-plus-seconds pairs (setup
page and play overlay), the format select (page and `RowEditor`), the error-correction select (page
and `RowEditor`), and the barcode size caps (`ScrollColumn` and `StepStage`).

This spec puts a styling foundation under the app **without changing what it does**:

1. Tailwind CSS v4 and daisyUI 5, with one custom light theme, **Instrument**, whose tokens are the
   only source of color.
2. A guard that keeps the barcode stage pure black on white, and a check that proves it.
3. Shared components that replace the duplicated markup and logic.
4. A one-to-one restyle of both pages and all six components: same layout, same order, same text,
   same behavior.

Success: every existing test file is unchanged and all 737 tests pass; the stage is pixel-identical
to `main`; the app looks like one designed tool instead of browser defaults.

## Series

The revamp is **scope B: a redesign, delivered in phases**. It is not a re-skin only, and it adds no
new features. Three specs, each with its own spec, review, plan and merge:

1. **Foundation (this spec).** Toolchain, theme, stage guard, shared components, one-to-one restyle.
   Behavior-neutral, so the unchanged test suite proves nothing broke.
2. **Setup page redesign.** Layout **B2**, chosen in a mockup: two panes (codes wide on the left,
   settings on the right) and a bar pinned to the bottom of the window holding the code count,
   **Share** and **Start**. Share becomes a panel opened from that bar. Also: a `Section` component,
   values shown on the speed, rotation and skew sliders, the Editor and Playback selects as
   segmented buttons, and each hint next to the control it explains. Tests change here, on purpose.
3. **Play screen for any size.** The overlay, the step readout and the finish screen designed for
   phones and tablets as well as monitors: touch targets, small-screen layout, and icons where they
   help.

Decisions that hold for the whole series:

- **Audience:** busy QA professionals, as in the README. The finished screens should be good enough
  for the README screenshots that were deferred until this work.
- **Devices:** setup is desktop-first but stays fully usable on a phone, with nothing hidden or
  blocked at narrow widths. Playback is designed for any screen.
- **Unchanged contracts:** behavior, URL keys and the share-link format stay the same, so existing
  share links keep working. Accessibility does not regress.
- **Theme:** light only, built on semantic tokens so dark mode stays a cheap later addition (one
  more block of token values and a visual pass). Light only was chosen because it is less to
  maintain: jsdom does not render colors, so a dark-only bug could only be caught by eye.
- **Look:** **Instrument** (option A of three drawn with the real toolchain): monochrome zinc grays,
  a near-black primary, tight corners, no shadows. Color appears only for status, so valid, invalid
  and lenient codes stand out.

## Decisions

1. **Library: daisyUI 5 on Tailwind v4.** daisyUI is CSS class names on native elements. The native
   `<select>` (with its 8 option groups), `<input type="range">` and checkboxes stay, so the tests'
   class-selector reads of `.value`, `.checked` and `.disabled` keep working and jsdom keeps working.
   Rejected, from a survey of current releases (M1):
   - **shadcn-svelte** (on Bits UI): its slider, checkbox and switch are custom widgets, so about
     165 test lines would be rewritten. jsdom lacks the ResizeObserver, PointerEvent and popover APIs
     those widgets use, so component tests would move to a real browser.
   - **Flowbite-Svelte:** no default-branch commit since 2026-06-27, its 2.0 prerelease stalled, and
     one author made 78% of commits.
   - **Skeleton:** three major versions in 16 months.
   - **Hand-rolled CSS:** the most design work, and we would keep owning every control's look.
2. **Exact version pins** for `tailwindcss`, `@tailwindcss/vite` and `daisyui`. daisyUI has one main
   author (68% of commits) and can change how things look in a patch release; upgrades are
   deliberate, never incidental.
3. **Tailwind's base stylesheet (preflight) stays on.** It costs about 4 KB raw (M2), it is the setup
   daisyUI's docs assume, and the stage is unaffected by it (M3, M4). Its effects are handled
   explicitly (see _Base stylesheet effects_).
4. **Tailwind scans `.svelte` files only.** Words in our TypeScript (`steps`, `swap`) otherwise pull
   unused daisyUI components into the CSS (M7). The rule that follows: Tailwind and daisyUI classes
   are written only in `.svelte` files.
5. **No size budget.** CSS size is recorded in the PR, raw and gzipped. Nothing fails on size.
6. **The browser floor rises** from Vite 7's default target (Chrome 107, Edge 107, Firefox 104,
   Safari 16) to Tailwind v4's (Chrome 111, Safari 16.4, Firefox 128) (M9). The guide documents it.

## Toolchain and wiring — `package.json`, `vite.config.ts`, `src/styles.css`

- Dev dependencies, exact pins: `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `daisyui@5.7.50`,
  and, for `stage-check` (below), `pngjs@7.0.0` with `@types/pngjs@6.0.5`.
- Scripts: `"postbuild": "node scripts/check-css.ts"` and
  `"stage-check": "node scripts/stage-check.ts"` (see _Verification that fails closed_).
- `vite.config.ts`: `plugins: [tailwindcss(), sveltekit(), svelteTesting()]`.
- `src/styles.css`, already imported by `src/routes/+layout.svelte`, becomes the only stylesheet
  entry:

```css
@import 'tailwindcss' source(none);
@source './**/*.svelte';
@source not inline('hidden'); /* see "Class-name collisions" */
@plugin 'daisyui' {
	themes: false; /* none of daisyUI's built-in themes ship */
}
@plugin 'daisyui/theme' {
	name: 'instrument';
	default: true;
	color-scheme: light;
	/* tokens: see "Theme and tokens" */
}
```

The existing `box-sizing` and `html, body` rules are dropped where preflight already does the same
work, and the `system-ui` font stack gives way to Tailwind's default sans stack, which starts with
the same system fonts.

If `themes: false` does not drop the built-in themes in daisyUI 5.7.50, the plan uses whatever
option does; the requirement is the outcome, checked by `check-css` (below).

## Theme and tokens

The **Instrument** theme, in `src/styles.css`:

| Token               | Value      | Token                       | Value     |
| ------------------- | ---------- | --------------------------- | --------- |
| `--color-base-100`  | `#ffffff`  | `--color-base-content`      | `#18181b` |
| `--color-base-200`  | `#f4f4f5`  | `--color-base-300`          | `#e4e4e7` |
| `--color-primary`   | `#18181b`  | `--color-primary-content`   | `#fafafa` |
| `--color-secondary` | `#52525b`  | `--color-secondary-content` | `#ffffff` |
| `--color-accent`    | `#2563eb`  | `--color-accent-content`    | `#ffffff` |
| `--color-neutral`   | `#3f3f46`  | `--color-neutral-content`   | `#fafafa` |
| `--color-info`      | `#2563eb`  | `--color-info-content`      | `#ffffff` |
| `--color-success`   | `#15803d`  | `--color-success-content`   | `#ffffff` |
| `--color-warning`   | `#a34c08`  | `--color-warning-content`   | `#ffffff` |
| `--color-error`     | `#b91c1c`  | `--color-error-content`     | `#ffffff` |
| `--radius-selector` | `0.25rem`  | `--radius-field`            | `0.25rem` |
| `--radius-box`      | `0.375rem` | `--size-selector`           | `0.25rem` |
| `--size-field`      | `0.25rem`  | `--border`                  | `1px`     |
| `--depth`           | `0`        | `--noise`                   | `0`       |

The warning token is `#a34c08`, a step deeper than the `#b45309` in the approved mockup: `#b45309`
measured 4.52:1 on a soft alert, a pass with no margin; `#a34c08` measures 5.21:1 (M8).

**Rules:**

- Components use daisyUI's semantic names only (`bg-base-100`, `text-base-content`,
  `text-success`, `btn-primary` and so on), never a raw color.
- Status mapping: valid → `success`, invalid → `error`, lenient (drawn despite failing GS1
  validation) → `warning`. The share-QR status message moves from its own orange (`#a04b00`) to
  `warning`.

**Contrast is enforced by a test.** Each pair the UI uses must reach 4.5:1 (WCAG 2.x AA for body
text), computed from the theme block in `src/styles.css`:

| Text                                          | Background                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `success`, `error`, `warning`, `base-content` | `base-100`                                                                                                     |
| `warning`, `error`                            | the soft-alert background: the color mixed 8% into `base-100` in oklab, as daisyUI 5.7.50's `.alert-soft` does |
| `primary-content`                             | `primary`                                                                                                      |
| `neutral-content`                             | `neutral`                                                                                                      |
| `neutral-content`                             | `neutral` at 85% over `#ffffff` (the play overlay over the stage)                                              |

## Stage guard

The barcode stage is what a scanner reads; it must not follow the theme.

- **Literal colors, deliberately:** the `/play` stage background (`.play`), the finish screen
  (`.finish-screen`) and the share-QR box (`.qr-code`) stay literal `#fff`. The engines keep drawing
  `#000`. These are the only raw colors allowed in `.svelte` files (see the guard test).
- **No daisyUI classes** on `ScrollColumn`, `StepStage` or the DOM that `scroller.ts` and
  `stepper.ts` build.
- **Chrome is not stage.** The play overlay and the step readout are controls drawn over the stage;
  they use tokens.
- **Proof:** `stage-check` (see _Verification that fails closed_) compares the stage against `main`
  pixel for pixel.

## Base stylesheet effects

Preflight applies to the whole page. The effects that matter here:

| Effect                                        | Handling                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `h1` shrinks to body size                     | the `scandible` heading gets explicit size and weight (`text-2xl font-bold tracking-tight`)            |
| `button` loses its border and background      | every `<button>` gets `btn` classes; the spike saw stripped overlay buttons (M3)                       |
| `[hidden]` becomes `display: none !important` | useful: `hidden` on `.file-error`, `.qr-code` and the other notes keeps winning over any display class |
| `svg` becomes `display: block`                | no stage change (M3, M4)                                                                               |
| lists lose their markers                      | the validation list and row editor already set `list-style: none`                                      |

## Shared components — `src/lib/components/`

Each unit replaces markup or logic that exists more than once. Each takes the class names the
existing tests look for, so those tests keep finding the same elements, and renders the same
elements in the same order as the markup it replaces. Each gets its own new test file.

### `SecondsSlider.svelte`

Replaces the four dwell and gap pairs and their four near-identical `on…Seconds` handlers.

```ts
interface SecondsSliderProps {
	value: number; // $bindable, milliseconds
	range: { min: number; max: number; step: number }; // DWELL_RANGE or GAP_RANGE
	label: string; // 'Dwell' or 'Gap'; names the seconds field "<label> in seconds"
	rangeAriaLabel?: string; // the overlay sets it; on the setup page the wrapping <label> names the range
	rangeClass: string; // 'dwell-input' | 'gap-input' | 'ctl-dwell' | 'ctl-gap'
	secondsClass: string; // 'dwell-seconds' | 'gap-seconds' | 'ctl-dwell-seconds' | 'ctl-gap-seconds'
	onchange?: (ms: number) => void; // the overlay passes step.setDwell / step.setGap
}
```

Renders the range, then `<span class="seconds">` holding the number field and the unit text `s`.
Behavior, as today:

- The range binds `value`, carries `aria-valuetext={formatSeconds(value)}`, and calls `onchange`
  on `input`.
- The number field shows `(value / 1000).toFixed(2)`, with `inputmode="decimal"`, `step="0.01"` and
  `min`/`max` in seconds. On `change` it runs `parseSeconds`: a number is snapped to the range's
  grid, clamped, written to `value`, and passed to `onchange`; an empty or non-numeric entry is
  ignored. Either way the field then shows the current value to two decimals.
- The caller keeps its wrapper: `<label class="field">` on the setup page, `<div class="ctl-group">`
  with its `Dwell`/`Gap` text in the overlay. The overlay's trailing `<span>s</span>` moves into the
  component's `span.seconds`, the one structural change. If an existing test depended on it, the
  unchanged-tests rule catches it.

### `FormatSelect.svelte`

Replaces the format `<select>` with its 8 `<optgroup>`s built from `FORMAT_GROUPS`, on the page and
in every `RowEditor` row.

```ts
interface FormatSelectProps {
	value: FormatId; // $bindable; callers keep their function bindings, which tidy ecc and lax
	class: string; // 'format-input' | 'row-format', plus daisyUI classes
	'aria-label'?: string; // 'Format of code N' in RowEditor
}
```

### `EccSelect.svelte`

Replaces the error-correction `<select>` and its `'' ↔ default` mapping, on the page and in
`RowEditor`.

```ts
interface EccSelectProps {
	option: EccOption; // the format descriptor's ecc
	value: string; // $bindable; '' means the format's default level
	class: string; // 'ecc-input' | 'row-ecc', plus daisyUI classes
	'aria-label'?: string; // 'Error correction of code N' in RowEditor
}
```

The select shows `value || option.defaultValue`; choosing the default writes `''`. Option text is
`label (note)` when a choice has a note, else `label`.

### `Field.svelte`

Replaces about ten hand-written `<label class="field">` wrappers, which would otherwise each repeat
the same utility classes.

```ts
interface FieldProps {
	label: string; // the visible text, written before the control as today
	class?: string; // keeps 'ecc-field' and 'lax-field'
	children: Snippet;
}
```

Renders `<label class="field …">{label}{@render children()}</label>`.

### `Note.svelte`

Replaces the loose hint and error paragraphs: `editor-hint`, `gs1-hint`, `lax-note`, `flash-note`,
`dup-hint`, `scan-hint`, `dense-hint`, `row-hint`, `file-error` and `qr-status`.

```ts
interface NoteProps {
	tone?: 'info' | 'warning' | 'error'; // default 'info': muted text; warning and error take their tokens
	class: string; // the existing class, e.g. 'flash-note'
	children: Snippet;
	// plus pass-through id, hidden, role and aria-* attributes onto the <p>
}
```

Renders one `<p>`, as today. Tones: `flash-note` and `dup-hint` → `warning`; `file-error` →
`error`; `qr-status` → `warning`; the rest → `info`.

### `barcode-caps.css`

The three `.barcode-item… svg` size caps (default, `--2d`, `--pdf417`), today hand-copied from
`ScrollColumn.svelte` into `StepStage.svelte` with a "change them there, then here" comment. Moved
unchanged into one plain CSS file, written under both hosts as
`:is(.scroll-column, .step-stage-host) .barcode-item svg` and so on, imported by both components
and kept outside Tailwind's layers. Each component keeps its own container and `.barcode-item`
padding rules.

### What stays where it is

- The pages keep all their state and logic: text and row conversions, sharing, the
  repeated-codes check, focus handling, keyboard handling. The new units are presentational, except
  `SecondsSlider`'s parse-and-clamp, which is the duplicated logic.
- Markup used once stays inline: the switch-note alert, the Share row, the overlay buttons.
- `ShareLink`'s QR error-correction select (L/M/Q/H) stays inline: it is a different control.

## The restyle, per screen

### Rules for every file

1. **The existing class names are the test contract.** They stay on the same elements; daisyUI and
   Tailwind classes are added beside them.
2. **No element is moved, removed or renamed; no text or ARIA changes.** The overlay's children keep
   their order: a test reads the first `ctl-…` class of each child, so no added class may start with
   `ctl-`.
3. **Class-name collisions.** Our own class names must not match a Tailwind utility or a daisyUI
   component by accident.
   - `hidden`: the overlay's fade state (`class:hidden`) matches Tailwind's `hidden` utility,
     `display: none`. Unexcluded, the overlay would vanish instead of fading out, and no test would
     notice (M6). Excluded with `@source not inline('hidden')`; `check-css` fails if the rule
     returns.
   - `file-input`: deliberately takes daisyUI's file-input style.
   - The plan includes a one-time audit: every class name in `src/**/*.svelte` and in the DOM built by
     `scroller.ts` and `stepper.ts`, checked against the built CSS for rules we did not intend.
4. **Focus and touch.** Every control keeps a visible focus ring (daisyUI's default outline). The
   row editor's buttons keep their 36 px minimum touch height.
5. **Toggle or checkbox.** `toggle` for settings that switch playback behavior (Loop, Random
   rotation, Random skew); `checkbox` for the two "render it even though it fails validation"
   choices (the page's GS1 option and each row's "Render if invalid").

### Setup page — `src/routes/+page.svelte`

- The `.setup` column: `base-100` background, same width and spacing; the `<h1>` sized explicitly.
- Editor, Format, Error correction, Playback: `select select-sm` in `Field`; format and error
  correction through `FormatSelect` and `EccSelect`.
- The code textarea: `textarea` in `font-mono`, full width.
- The switch note: `alert alert-warning alert-soft`, `role="alert"` kept; **Switch anyway** and
  **Cancel** as small buttons.
- The file input: `file-input file-input-sm`.
- Notes through `Note` with the tones listed above.
- Dwell and Gap through `SecondsSlider`, with small range and input sizes; Speed: `range range-sm`.
- Loop, Random rotation, Random skew: `toggle toggle-sm`; the rotation and skew maximums
  `range range-sm`, disabled while their toggle is off, as today.
- The GS1 validation option: `checkbox checkbox-sm` in `Field class="lax-field"`.
- **Start:** `btn btn-primary btn-lg`, keeping its larger size; disabled styling from daisyUI.

### `ValidationList.svelte`

Keeps `valid`, `invalid` and `lenient` on each `li`, now colored by `text-success`, `text-error` and
`text-warning`; `font-mono text-sm`; scroll height rules unchanged.

### `RowEditor.svelte`

Each row gets a `base-300` divider, a muted row number, a `font-mono` payload textarea (the
`field-sizing: content` rule stays), small selects through `FormatSelect` and `EccSelect`, the
"Render if invalid" checkbox, and small Move up / Move down / Delete buttons at the 36 px minimum.
**Delete** is a ghost button in the error color. **Add code** is a small button. Verdict colors as in
the validation list.

### `ShareLink.svelte`

**Share link** as a small button; the URL field `input input-sm font-mono`, read-only; the QR level
select `select select-sm`; the QR box stays literal white with a hairline `base-300` border; the
status through `Note tone="warning"`.

### `Gs1Breakdown.svelte`

The summary styled as a link-like disclosure; the table `table table-xs`; `color: CanvasText`
becomes `text-base-content`. The `visually-hidden` header spans stay: a test reads them.

### Play page — `src/routes/play/+page.svelte`

- The stage (`.play`) untouched.
- The overlay: `bg-neutral/85 text-neutral-content`, rounded, keeping its position, `opacity`
  fade, auto-hide and `:focus-visible` behavior. Buttons `btn btn-sm`; Speed `range range-xs`;
  Dwell and Gap through `SecondsSlider` in their `ctl-group` wrappers.
- The step readout: `base-100` at 85% and `base-content` text, same position and size.
- The finish screen: literal white kept; text `text-2xl`; **Restart** `btn btn-primary`, **Back**
  `btn`.
- `.finish-status` stays visually hidden with its own rule.

### `ScrollColumn.svelte`, `StepStage.svelte`

Only the size caps move to `barcode-caps.css`. Nothing else changes.

## Testing

### The existing suite

- `git diff --name-only --diff-filter=M main -- '*.test.ts'` prints nothing: no existing test file
  changes. New test files are expected.
- All 737 existing tests pass, with `svelte-check` clean (`npm test`), and `npm run lint` passes.

### New unit tests, written test-first

| Test file               | Covers                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SecondsSlider.test.ts` | shows the value in seconds; a valid entry sets milliseconds (snapped, clamped) and fires `onchange`; an empty or non-numeric entry leaves the value and restores the display; moving the range fires `onchange`; the seconds field is named "<label> in seconds"; the range takes `rangeAriaLabel` when given and no `aria-label` otherwise; the passed classes land on the two inputs |
| `FormatSelect.test.ts`  | 8 groups and every format from `FORMAT_GROUPS`, in order; the binding reads and writes `FormatId`s; class and `aria-label` land on the `<select>`                                                                                                                                                                                                                                      |
| `EccSelect.test.ts`     | `''` shows the default level; choosing the default writes `''`; choosing another level writes it; option text with and without a note                                                                                                                                                                                                                                                  |
| `Field.test.ts`         | the label text comes before the children inside one `<label>`; the class passes through                                                                                                                                                                                                                                                                                                |
| `Note.test.ts`          | each tone's class; `id`, `hidden`, `role` and `aria-*` pass through to the `<p>`                                                                                                                                                                                                                                                                                                       |
| `theme.test.ts`         | every pair in the contrast table reaches 4.5:1, from the theme block parsed out of `src/styles.css`; fails if a token in the table is missing                                                                                                                                                                                                                                          |
| `colors.test.ts`        | no hex, `rgb()`, `rgba()`, `hsl()` or `hsla()` color in `src/**/*.svelte`, except `#fff`/`#ffffff` for `.play`, `.finish-screen` (play page) and `.qr-code` (`ShareLink`)                                                                                                                                                                                                              |

The theme and color tests read source files with `node:fs`; they need no build.

## Verification that fails closed

A checker that errors, returns nothing or is skipped counts as **unverified**, never as a pass.

### `scripts/check-css.ts`, run as `postbuild`

Runs after every `npm run build`, so CI runs it. It reads every `.css` file in `dist/` and fails if:

- there is no CSS at all;
- any rule targets the bare class `.hidden`;
- any `data-theme` value other than `instrument` appears;
- `--color-base-100` or any other token in the theme table is missing.

It prints the total CSS size, raw and gzipped, for the PR.

### `scripts/stage-check.ts`, run as `npm run stage-check -- <ref>`

A TypeScript script run by Node 24 (as `scripts/gs1-ais.ts` is), so it behaves the same in bash and
fish. `<ref>` defaults to `main`. Run by hand, not in CI; specs 2 and 3 reuse it.

1. Creates a detached worktree of `<ref>` in the system temp directory, runs `npm ci` and
   `npm run build` there, and builds the current tree. Copies both `dist/` folders aside.
2. Serves each build with its own static server (mapping `/scandible/`, `/scandible/play` and
   assets as GitHub Pages does). For `play.html` it injects
   `<style>.overlay, .readout { visibility: hidden !important }</style>` into both builds, so only the
   stage is compared.
3. **Step mode** (opens paused, so frames repeat): one UPC-A (`036000291452`), one QR Code and one
   PDF417 deck, fixed seed, random rotation on, at 1280×900 and 390×844. Screenshots with
   `firefox --headless --no-remote --profile <fresh dir> --window-size=W,H --screenshot`. Each pair
   is decoded with `pngjs` and must match pixel for pixel.
4. **Scroll mode** (animated, so geometry instead of pixels): a UPC-A and a PDF417 deck at
   1280×900. An injected script logs, about 1.5 s after load, the width, height and computed
   `display` of the first `.barcode-item` and its `svg`; a `user.js` pref
   (`devtools.console.stdout.content`) mirrors the log to stdout. Both builds must match within
   0.01 px.
5. Removes the worktree and stops only the processes it started. Exits non-zero on any mismatch.
   Fails, and says why, if Firefox is missing, a build fails, a screenshot is empty or missing, or
   the scroll log never arrives.

### Visual review

Before-and-after screenshots at 1280×900 and 390×844: the setup page at full height, the per-row
editor, the switch note, the share QR, the step overlay and the finish screen. The author reads
them; they go in the PR for the user.

### Human checks

Listed in the PR as open, not passed, until the user does them:

1. Chrome and Safari render both pages correctly.
2. Focus rings are visible when tabbing through both pages.
3. The play overlay fades out after 3 s instead of snapping away.
4. The setup page works on a real phone.
5. The GitHub Pages deploy renders under `/scandible`.

## Documentation

- **CONTRIBUTING.md:** the stack gains Tailwind CSS 4 and daisyUI 5; the commands list gains
  `npm run stage-check`; a short "Styling" section states the rules: classes only in `.svelte`
  files; color only through theme tokens; the stage, the finish screen and the share QR stay literal
  black on white; run `stage-check` after any change that could touch the play page.
- **docs/guide.md:** a "Browser support" section (with its Contents entry) before "Scanner settings
  and troubleshooting": Chrome or Edge 111, Safari 16.4, Firefox 128 or later.
- **README.md:** unchanged. Screenshots wait for specs 2 and 3.

## Out of scope

- Everything listed for specs 2 and 3 in _Series_, including `Section`, slider value readouts,
  segmented controls, the pinned bar, the Share panel and icons.
- Dark mode.
- The SvelteKit 3 upgrade (3.0.0 shipped 2026-10-01; this repo is on 2.70) (M1).
- Moving tests to role-based queries.
- A CSS size budget, and visual regression testing in CI.

## Measurements

Measured on 2026-11-04 on this machine unless marked otherwise. The survey and spike reports are
in the brainstorming session's scratchpad and are not committed.

- **M1 — versions** (`npm view`): `tailwindcss` 4.3.4; `daisyui` 5.7.50; `shadcn-svelte` 1.8.0;
  `bits-ui` 2.20.4; `flowbite-svelte` 1.33.1, last published 2026-04-07; `@sveltejs/kit` 3.1.1, with
  3.0.0 published 2026-10-01. Maintenance figures (commit shares, last commits) are quoted from the
  survey agent's reading of each project's GitHub repository, not re-measured.
- **M2 — CSS and JS size** (spike: Tailwind 4.3.4 and daisyUI 5.7.50 added, daisyUI classes on the
  setup page's controls; sums of per-file `gzip -9`):

  | Build             | CSS raw  | CSS gzip | JS raw (gzip)         |
  | ----------------- | -------- | -------- | --------------------- |
  | `main`            | 5,329 B  | 1,738 B  | 698,613 B (214,637 B) |
  | with preflight    | 89,137 B | 14,741 B | 698,938 B (214,691 B) |
  | without preflight | 85,173 B | 13,745 B | 698,938 B (214,701 B) |

- **M3 — stage pixels** (spike, re-run by the author with ImageMagick `compare -metric AE`): Step
  mode, UPC-A, QR Code and PDF417, at 1280×900 and 390×844. Without preflight: 0 differing pixels
  in all six. With preflight: the differing pixels fall only inside the overlay (bounding box
  836×44+222+840 at 1280×900, 303×132+44+686 at 390×844); the barcode and its white field are
  identical.
- **M4 — scroll geometry** (spike): `.barcode-item` and its `svg` have the same width, height and
  display in all three builds for UPC-A and PDF417, within 3×10⁻⁵ px.
- **M5 — tests** (spike): with daisyUI classes added beside the existing ones, `svelte-check` 0
  errors and 0 warnings; Vitest 737 of 737 passed.
- **M6 — the `hidden` collision:** both spike builds contain `.hidden{display:none}`, generated
  from the play page's `class:hidden`. A Tailwind 4.3.4 probe with `@source not inline('hidden')`
  emits no `.hidden` rule and still emits other utilities.
- **M7 — daisyUI emits what it finds:** the spike CSS has no `.modal`, `.collapse` or `.tooltip`
  rules, but has `.steps` and `.swap`, words that appear in our TypeScript.
- **M8 — contrast** (WCAG 2.x relative luminance; the soft-alert background mixed 8% in oklab, read
  from daisyUI 5.7.50's `.alert-soft` rule): on `#ffffff`, success 5.02, error 6.47, warning
  `#a34c08` 5.84, base-content 17.72; on soft alerts, warning `#a34c08` 5.21 (`#b45309`: 4.52),
  error 5.74; primary-content on primary 16.97; neutral-content on neutral 10.01;
  neutral-content on neutral at 85% over white 6.36 (sRGB mix).
- **M9 — browser floor:** Vite 7.3.6's default target is `chrome107, edge107, firefox104, safari16`
  (`ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET` in `node_modules/vite`). Tailwind v4 states it
  depends on Chrome 111, Safari 16.4 and Firefox 128 (tailwindcss.com/docs/compatibility, quoted by
  the survey). The spike CSS uses `oklch(`, `color-mix(`, `@property` and `@layer`.
- **M10 — test inventory:** about 120 `querySelector` calls in the test files locate native controls
  by class name; the overlay-order test reads the first `ctl-` class of each overlay child; tests
  check `classList` for `valid`, `invalid`, `lenient`, `hidden`, `barcode-item`,
  `barcode-item--qr` and `step-stage`.

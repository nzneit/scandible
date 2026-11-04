# UI foundation: Tailwind, daisyUI and shared components — Design

**Date:** 2026-11-04
**Status:** Design agreed in conversation on 2026-11-04, section by section, then revised the same
day after a four-lens review on Sonnet subagents (codebase fit and tests, tooling, UX and
accessibility, internal coherence), judged by the author. Revised again for the accessible test
queries migration, with visual-review checks for the losses it left. Approved by the user on
2026-11-04. Amended after planning, at the user's word: the seconds field's width and text color
(_`SecondsSlider.svelte`_).
Spec 1 of the three-spec UI revamp series (see _Series_). Facts measured for this spec are in
_Measurements_ at the end, cited as _M1_ to _M12_.

**Depends on the test migration.** This spec builds on the accessible test queries migration
(`docs/superpowers/specs/2026-11-04-accessible-test-queries-design.md`), which merges first. Its
tests find elements by role, label and text, not by class name or DOM shape. This spec's first
plan, written before the migration, is rewritten after that merge, because it cites test lines that
move.

## Intent

The interface grew one feature at a time. It has no styling layer: one 9-line global stylesheet,
browser-default controls, and status colors hard-coded per component in four shades (`#007700`,
`#c00`, `#9a6700`, `#a04b00`). Several pieces exist twice: the dwell and gap slider-plus-seconds
pairs (two on the setup page, two in the play overlay), the format select (page and `RowEditor`),
the error-correction select (page and `RowEditor`), and the barcode size caps (`ScrollColumn` and
`StepStage`).

This spec puts a styling foundation under the app **without changing what it does**:

1. Tailwind CSS v4 and daisyUI 5, with one custom light theme, **Instrument**, whose tokens are the
   only source of color.
2. A guard that keeps the barcode stage pure black on white, and a check that proves it.
3. Shared components that replace the duplicated markup and logic.
4. A one-to-one restyle: both pages and four components (`ValidationList`, `RowEditor`,
   `ShareLink`, `Gs1Breakdown`) are restyled with the same layout, order, text and behavior;
   `ScrollColumn` and `StepStage` only lose their duplicated size caps.

**Done means:**

1. No existing test file changes: `git diff --name-only --diff-filter=M main -- '*.test.ts'` prints
   nothing, with `main` taken after the test migration merges. All 737 existing tests and the new
   ones pass, and `npm test` (with `svelte-check`) and
   `npm run lint` are clean.
2. `npm run build` passes, including its `check-css` step.
3. `npm run stage-check` passes against `main`: in Step mode, with the overlay and readout hidden,
   the stage is pixel-identical; in Scroll mode the barcode geometry matches.
4. The finish screen and the share QR, which `stage-check` does not cover, keep their literal
   white, checked by `colors.test.ts` and the visual review.
5. The human checks (see _Verification that fails closed_) are listed in the PR as open.

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
   reads of `.value`, `.checked` and `.disabled` keep working and jsdom keeps working.
   Rejected, from a survey of current releases (M1):
   - **shadcn-svelte** (on Bits UI): its slider, checkbox and switch are custom widgets, so about
     165 test lines (99 on selects, 49 on ranges, 17 on checkboxes, counted by the survey) would be
     rewritten. jsdom lacks the ResizeObserver, PointerEvent and popover APIs those widgets use, so
     component tests would move to a real browser.
   - **Flowbite-Svelte:** no default-branch commit since 2026-06-27, its 2.0 prerelease stalled, and
     one author made 78% of commits (survey).
   - **Skeleton:** three major versions in 16 months (survey).
   - **Hand-rolled CSS:** the most design work, and we would keep owning every control's look.
2. **Exact version pins** for `tailwindcss`, `@tailwindcss/vite` and `daisyui`. daisyUI has one main
   author (68% of commits, survey) and can change how things look in a patch release; upgrades are
   deliberate, never incidental.
3. **Tailwind's base stylesheet (preflight) stays on.** It costs about 4 KB raw (M2), it is the setup
   daisyUI's docs assume, and the stage is unaffected by it (M3, M4). Its effects are handled
   explicitly (see _Base stylesheet effects_).
4. **Tailwind scans `.svelte` files only.** Words in our TypeScript (`steps`, `swap`) otherwise pull
   unused daisyUI components into the CSS (M7). The rule that follows: Tailwind and daisyUI classes
   are written only in `.svelte` files. `scroller.ts` and `stepper.ts` build DOM with our own class
   names only (`barcode-item`, `step-stage` and so on); they are not scanned, but the collision
   audit checks their class names.
5. **daisyUI's defaults are overridden where they would regress accessibility**: control borders,
   placeholder text, the overlay's focus ring and the disabled **Start** button (see _Overrides of
   daisyUI defaults_). Everything else uses daisyUI as shipped.
6. **No size budget.** CSS size is recorded in the PR, raw and gzipped. Nothing fails on size.
7. **The browser floor rises** from Vite 7's default target (Chrome 107, Edge 107, Firefox 104,
   Safari 16) to Tailwind v4's (Chrome 111, Safari 16.4, Firefox 128) (M9). The guide documents it.

## Toolchain and wiring — `package.json`, `vite.config.ts`, `src/styles.css`

- Dev dependencies, exact pins: `tailwindcss@4.3.4`, `@tailwindcss/vite@4.3.4`, `daisyui@5.7.50`,
  and, for `stage-check` (below), `pngjs@7.0.0` with `@types/pngjs@6.0.5`. All exist and fit
  together: `@tailwindcss/vite@4.3.4` accepts Vite `^5.2 || ^6 || ^7 || ^8`, and `pngjs` (CommonJS)
  imports as `import { PNG } from 'pngjs'` under Node 24 (M11).
- Scripts: `"postbuild": "node scripts/check-css.ts"` and
  `"stage-check": "node scripts/stage-check.ts"` (see _Verification that fails closed_). npm runs
  `postbuild` after every `npm run build`, CI's included. Both scripts run under Node 24 as
  `scripts/gs1-ais.ts` already does, and are type-checked, linted and Prettier-formatted by the
  existing configuration (M11).
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
/* then the overrides in "Overrides of daisyUI defaults", unlayered so they win */
```

A probe with these exact versions confirmed the block (M11): `themes: false` emits no built-in
theme; `default: true` puts Instrument on `:where(:root)` with no `prefers-color-scheme` block;
`@source './**/*.svelte'` resolves relative to `src/styles.css`; `@source not inline('hidden')`
removes only the bare `.hidden` utility.

The current rules in `styles.css` are dropped: `box-sizing` and `margin: 0` because preflight sets
them; `height: 100%` on `html, body` on purpose, because nothing depends on it (`.play` is
`position: fixed`); and `font-family: system-ui, sans-serif`, which gives way to Tailwind's default
sans stack, starting with the same system fonts.

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
| `--color-warning`   | `#8a5d00`  | `--color-warning-content`   | `#ffffff` |
| `--color-error`     | `#b91c1c`  | `--color-error-content`     | `#ffffff` |
| `--radius-selector` | `0.25rem`  | `--radius-field`            | `0.25rem` |
| `--radius-box`      | `0.375rem` | `--size-selector`           | `0.25rem` |
| `--size-field`      | `0.25rem`  | `--border`                  | `1px`     |
| `--depth`           | `0`        | `--noise`                   | `0`       |

The warning token is `#8a5d00`, not the `#b45309` of the approved mockup. `#b45309` measured 4.52:1
on a soft alert, a pass with no margin, and review found it close in hue to the error red.
`#8a5d00` keeps the yellow-brown hue lenient codes have today (`#9a6700`) and measures 5.76:1 on
white and 5.14:1 on a soft alert (M8).

**Rules:**

- Components use daisyUI's semantic names only (`bg-base-100`, `text-base-content`,
  `text-success`, `btn-primary` and so on), never a raw color.
- Status mapping: valid → `success`, invalid → `error`, lenient (drawn despite failing GS1
  validation) → `warning`. The share-QR status message moves from its own orange (`#a04b00`) to
  `warning`.
- Muted text is `text-base-content/70`, the only opacity used on text.

**Contrast is enforced by a test** (`theme.test.ts`), computed from the theme block in
`src/styles.css`. A translucent color (`/70`, `/85`, the 55% border) is composited over its
background in sRGB, as the browser does; daisyUI's soft-alert background, a mix of two opaque
colors, is mixed in oklab, as daisyUI 5.7.50's `.alert-soft` does.

Text, at least 4.5:1 (WCAG 2.x AA):

| Text                                                                                                   | Background                                                                  |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `success`, `error`, `warning`, `info`, `base-content`, `base-content/70` (muted text and placeholders) | `base-100` and `base-200`                                                   |
| `warning`, `error`                                                                                     | soft alert: the color mixed 8% into `base-100`                              |
| `primary-content`                                                                                      | `primary`                                                                   |
| `neutral-content`                                                                                      | `neutral`, and `neutral` at 85% over `#ffffff` (the overlay over the stage) |

Controls, at least 3:1 (WCAG 2.x 1.4.11):

| Foreground                               | Background                      |
| ---------------------------------------- | ------------------------------- |
| control border: `base-content` at 55%    | `base-100` and `base-200`       |
| focus outline: `base-content`            | `base-100` and `base-200`       |
| overlay focus outline: `neutral-content` | `neutral` at 85% over `#ffffff` |

The test fails if a token it needs is missing.

## Overrides of daisyUI defaults

Four daisyUI defaults would make today's controls less accessible (M12). Each is overridden once:

| daisyUI default                                                                                   | Override                                                                                                                                                                                                                                                                     | Where                        |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| control borders at `base-content` 20% (`--input-color`): 1.53:1; today's browser borders pass 3:1 | `--input-color: color-mix(in oklab, var(--color-base-content) 55%, #0000)` on `.input`, `.select`, `.textarea`, `.file-input`, `.checkbox` and `.toggle`, only while the control is not focused or checked (`:not(:focus, :focus-within, :checked, :indeterminate)`): 3.95:1 | `src/styles.css`             |
| placeholder text at `base-content` 50%: 3.38:1                                                    | placeholder color `base-content` at 70% on `.input` and `.textarea`: 6.54:1                                                                                                                                                                                                  | `src/styles.css`             |
| focus outline of `btn`, `input`, `select` and `textarea` in `base-content`: 2.66:1 on the overlay | inside `.overlay`, the `:focus-visible` outline color is `neutral-content`: 6.38:1                                                                                                                                                                                           | play page, scoped `<style>`  |
| a disabled `btn` is 20% text on a 10% fill (1.39:1), so a disabled **Start** almost disappears    | `.start:disabled` keeps the primary fill and text at opacity 0.5, as today                                                                                                                                                                                                   | setup page, scoped `<style>` |

Disabled ranges and toggles keep daisyUI's opacity 0.3. Disabled controls are exempt from the
contrast rules; the Start override exists because Start is the primary action and must stay
recognizable while it waits for a valid code.

## Stage guard

The barcode stage is what a scanner reads; it must not follow the theme.

- **Literal colors, deliberately:** the `/play` stage background (`.play`), the finish screen
  (`.finish-screen`) and the share-QR box (`.qr-code`) stay literal `#fff`. The engines keep drawing
  `#000`. These are the only raw colors allowed in `.svelte` files (see `colors.test.ts`).
- **No daisyUI classes** on `ScrollColumn`, `StepStage` or the DOM that `scroller.ts` and
  `stepper.ts` build.
- **Chrome is not stage.** The play overlay and the step readout are controls drawn over the stage;
  they use tokens.
- **daisyUI's base layers do not reach the stage pixels:** `rootcolor` sets the root background to
  `base-100`, which is `#ffffff`, the stage's own color; `scrollbar` colors scrollbars, which the
  play page does not show; `rootscrolllock` and `rootscrollgutter` act only while a modal is open,
  and the app has none (M3, M12).
- **Proof:** `stage-check` compares the stage against `main`, pixel for pixel in Step mode and by
  geometry in Scroll mode. The finish screen and the share QR are covered by `colors.test.ts` and
  the visual review only.

## Base stylesheet effects

Preflight applies to the whole page. The effects that matter here:

| Effect                                                        | Handling                                                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `h1` shrinks to body size                                     | the `scandible` heading gets explicit size and weight (`text-2xl font-bold tracking-tight`)                                                                   |
| `button` loses its border and background                      | every `<button>` gets `btn` classes; the spike saw stripped overlay buttons (M3)                                                                              |
| `p` and other elements lose their default margins             | the pages' flex gaps keep the spacing; the 4 px top margin of `.qr-status` becomes `mt-1` at its call site                                                    |
| the `hidden` **attribute** becomes `display: none !important` | useful: `hidden` on `.file-error` and `.qr-code` keeps winning over any display class. This is the attribute; the `hidden` exclusion below concerns the class |
| `svg` becomes `display: block`                                | no stage change (M3, M4)                                                                                                                                      |
| lists lose their markers                                      | the validation list and row editor already set `list-style: none`                                                                                             |

## Shared components — `src/lib/components/`

Each unit replaces markup or logic that exists more than once. Rules for all of them:

- **Classes.** A unit's `class` prop carries the page's own class (for example `flash-note`) and,
  at a call site, layout utilities such as a margin. The unit applies its own daisyUI classes,
  size and tone; call sites do not pass those.
- **Styles move with the markup.** A page's scoped `<style>` does not reach elements a child
  component renders, so each rule that styles moved markup moves into the unit, as utilities or the
  unit's own `<style>`, and is deleted from the page: `.field` and `.seconds` from the setup page;
  `.ctl-dwell`, `.ctl-gap`, `.ctl-dwell-seconds` and `.ctl-gap-seconds` from the play page;
  `.qr-status`'s margin from `ShareLink`. The setup page's `.start` padding rule is replaced by
  `btn-lg`.
- **Same elements.** Each unit renders the same elements in the same order as the markup it
  replaces, with one named exception in `SecondsSlider`.
- **Tests.** Each unit gets its own new test file, written first.

### `SecondsSlider.svelte`

Replaces the four dwell and gap pairs and their four near-identical `on…Seconds` handlers.

```ts
interface SecondsSliderProps {
	value: number; // $bindable, milliseconds
	range: { min: number; max: number; step: number }; // DWELL_RANGE or GAP_RANGE
	label: string; // 'Dwell' or 'Gap'; names the seconds field "<label> in seconds"
	rangeAriaLabel?: string; // 'Dwell' | 'Gap'; set at every call site, setup page and overlay
	rangeClass: string; // 'dwell-input' | 'gap-input' | 'ctl-dwell' | 'ctl-gap'
	secondsClass: string; // 'dwell-seconds' | 'gap-seconds' | 'ctl-dwell-seconds' | 'ctl-gap-seconds'
	size?: 'sm' | 'xs'; // default 'sm' (setup page); 'xs' in the overlay
	onchange?: (ms: number) => void; // the overlay passes step.setDwell / step.setGap
}
```

Renders the range, then `<span class="seconds">` holding the number field and the unit text `s`.
Sizes: `sm` is `range range-sm w-32` and `input input-sm w-[4.5rem]`; `xs` is
`range range-xs w-[110px]` (today's overlay width) and `input input-xs w-[4.5rem]`. The number
field also takes `text-base-content` at both sizes.

- **Width in `rem`.** `4.5rem` is today's 72 px. At `4.5em` the field follows its own smaller font
  (12 px at `-sm`, 11 px at `-xs`), and daisyUI pads every `.input` by 0.75rem on each side, so the
  value is cut off: the setup page shows `0.` and the overlay shows nothing (measured in Firefox 155
  while planning).
- **Text color.** daisyUI's `.input` paints a `base-100` background without setting a text color,
  and preflight makes inputs inherit theirs. Inside the overlay (`text-neutral-content`) the value
  would be white on white, 1.04:1. `text-base-content` gives 17.72:1, the look the field has today.

Behavior, as today:

- The range binds `value`, carries `aria-valuetext={formatSeconds(value)}`, and calls `onchange`
  on `input`.
- The number field shows `(value / 1000).toFixed(2)`, with `inputmode="decimal"`, `step="0.01"` and
  `min`/`max` in seconds. On `change` it runs `parseSeconds`: a number is snapped to the range's
  grid, clamped, written to `value`, and passed to `onchange`; an empty or non-numeric entry is
  ignored. Either way the field then shows the current value to two decimals.
- The caller keeps its wrapper: `<label class="field">` (through `Field`) on the setup page,
  `<div class="ctl-group">` with its `Dwell`/`Gap` text in the overlay.
- **Names.** The range takes `rangeAriaLabel` at every call site: "Dwell" and "Gap". The seconds
  field is named "<label> in seconds", so the setup page's fields keep "Dwell in seconds" and "Gap
  in seconds".
- **The named exception:** the overlay's trailing `<span>s</span>` becomes the component's
  `span.seconds`, which wraps the number field and `s`, as the setup page's markup already does
  today. No existing test reads that span (M10).

### `FormatSelect.svelte`

Replaces the format `<select>` with its 8 `<optgroup>`s built from `FORMAT_GROUPS`, on the page and
in every `RowEditor` row.

```ts
interface FormatSelectProps {
	value: FormatId; // $bindable
	class: string; // 'format-input' | 'row-format'
	'aria-label'?: string; // 'Format of code N' in RowEditor
}
```

Renders a `<select class="select select-sm w-auto …">`. The component binds its
`<select>` to `value`; callers bind the component with the same function bindings they use today,
which tidy `ecc` and `lax` on a format change.

### `EccSelect.svelte`

Replaces the error-correction `<select>` and its `'' ↔ default` mapping, on the page and in
`RowEditor`.

```ts
interface EccSelectProps {
	option: EccOption; // the format descriptor's ecc
	value: string; // $bindable; '' means the format's default level
	class: string; // 'ecc-input' | 'row-ecc'
	'aria-label'?: string; // 'Error correction of code N' in RowEditor
}
```

Renders a bare `<select class="select select-sm w-auto …">`. It shows `value || option.defaultValue`;
choosing the default writes `''`. Option text is `label (note)` when a choice has a note, else
`label`.

### `Field.svelte`

Replaces the twelve hand-written label wrappers (call sites below), which would otherwise each
repeat the same utility classes.

```ts
interface FieldProps {
	label: string; // the visible text, written before the control as today
	class?: string; // keeps 'ecc-field', 'lax-field' and 'share-ecc-field'
	children: Snippet;
}
```

Renders `<label class="field flex flex-col items-start gap-1 …">{label}{@render children()}</label>`.
`Field` must not change the accessible name of any control it wraps.

### `Note.svelte`

Replaces the loose hint and error paragraphs (call sites below).

```ts
interface NoteProps {
	tone?: 'info' | 'warning' | 'error'; // default 'info'
	class: string; // the existing class, e.g. 'flash-note'
	children: Snippet;
	// plus pass-through id, hidden, role and aria-* attributes onto the <p>
}
```

Renders one `<p>`, as today. Tones: `info` is `text-base-content/70`, `warning` is `text-warning`,
`error` is `text-error`.

### `barcode-caps.css`

The three `.barcode-item… svg` size caps (default, `--2d`, `--pdf417`), today hand-copied from
`ScrollColumn.svelte` into `StepStage.svelte` with a "change them there, then here" comment. Moved
unchanged into one plain CSS file, written under both hosts as
`:is(.scroll-column, .step-stage-host) .barcode-item svg` and so on, in the same order, imported by
both components and kept outside Tailwind's layers. The specificity drops from (0,3,1) to (0,2,1),
which changes nothing because no other rule competes. Each component keeps its own container and
`.barcode-item` padding rules.

### Call sites

| Unit                | Call sites                                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Field` (12)        | setup page: Editor; Format / Format for new rows (with `FormatSelect`); Error correction (`ecc-field`, with `EccSelect`); Render GS1 data that fails validation (`lax-field`); Playback; Dwell and Gap (with `SecondsSlider`); Speed; Loop; Random rotation; Random skew. `ShareLink`: Share QR error correction (`share-ecc-field`)                        |
| `Note` (14)         | setup page: `editor-hint`, `file-error` (`error`, `hidden`), `gs1-hint`, `lax-note` (`id` for `aria-describedby`), `flash-note` (`warning`), `dup-hint` (`warning`). `RowEditor`: `row-hint`, `gs1-hint`, `lax-note`, `scan-hint`, `dense-hint`. `ValidationList`: `scan-hint`, `dense-hint`. `ShareLink`: `qr-status` (`warning`, `role="status"`, `mt-1`) |
| `SecondsSlider` (4) | setup page: Dwell and Gap (`sm`). Play overlay: Dwell and Gap (`xs`, `rangeAriaLabel`, `onchange`)                                                                                                                                                                                                                                                          |
| `FormatSelect` (2)  | setup page (`format-input`); each `RowEditor` row (`row-format`, `aria-label`)                                                                                                                                                                                                                                                                              |
| `EccSelect` (2)     | setup page (`ecc-input`); each `RowEditor` row (`row-ecc`, `aria-label`)                                                                                                                                                                                                                                                                                    |

`RowEditor`'s "Render if invalid" label puts its text after the checkbox, so it stays inline rather
than going through `Field`.

### What stays where it is

- The pages keep all their state and logic: text and row conversions, sharing, the
  repeated-codes check, focus handling, keyboard handling. The new units are presentational, except
  `SecondsSlider`'s parse-and-clamp, which is the duplicated logic.
- Markup used once stays inline: the switch-note alert, the Share row, the overlay buttons.
- `ShareLink`'s QR error-correction select (L/M/Q/H) stays inline: it is a different control.

## The restyle, per screen

### Rules for every file

1. **Classes that code or CSS hooks onto stay.** These are the stage classes (`barcode-item`,
   `barcode-item--qr`, `step-stage` and so on), the overlay's `hidden` class (the migrated play
   test's visual-state fallback reads it) and any class this spec's own CSS hooks onto. They stay on
   the same elements; daisyUI and Tailwind classes are added beside them.
2. **No element is moved, removed or renamed; no text or ARIA changes**, except the one named
   exception in `SecondsSlider`. The setup page's call sites pass `rangeAriaLabel` "Dwell" and
   "Gap", which keeps the names the migration gave the sliders; the seconds fields keep "Dwell in
   seconds" and "Gap in seconds".
3. **Class-name collisions.** Our own class names must not match a Tailwind utility or a daisyUI
   component by accident.
   - `hidden`: the overlay's fade state is the **class** `hidden` (`class:hidden`), which matches
     Tailwind's `hidden` utility, `display: none`. Unexcluded, the overlay would vanish instead of
     fading out (M6), and the migrated play test's fallback reads the class. Excluded with
     `@source not inline('hidden')`; `check-css` fails if the rule returns.
   - `file-input`: deliberately takes daisyUI's file-input style.
   - **One-time audit, in the plan:** every class name in `src/**/*.svelte` and in the DOM built by
     `scroller.ts` and `stepper.ts` is checked against the built CSS. The output is a list, recorded
     in the PR, of each class with a rule we did not write and how it was resolved (excluded,
     accepted with a reason, or renamed in a later spec). There is no ongoing
     check beyond `check-css`'s `.hidden` rule.
4. **Widths.** daisyUI's form controls default to `width: clamp(3rem, 20rem, 100%)` (M12), wider
   than today's. Each control gets an explicit width that keeps today's layout: selects and the file
   input `w-auto`; the code textarea full width, as today; the dwell and gap ranges per
   `SecondsSlider`'s sizes; the speed, rotation and skew ranges `w-32`. The share URL field is the
   exception: it fills its row (see _`ShareLink.svelte`_). The visual review compares widths with
   `main`.
5. **Focus.** Every control keeps a visible focus ring: daisyUI's outline, recolored inside the
   overlay (see _Overrides_). The GS1 breakdown's `<summary>` carries the `link` class, whose
   `:focus-visible` outline daisyUI provides; a bare `<summary>` gets one only inside a `collapse`
   (M12).
6. **Touch.** The row editor's buttons keep their 36 px minimum height with `min-h-9` (`.btn` sets a
   fixed height, which `min-height` overrides). The other controls at `-sm` and `-xs` sizes are no
   smaller than today's browser defaults (M12), and toggles and checkboxes sit inside their labels,
   which are the touch target. The overlay's touch targets are spec 3's.
7. **Toggle or checkbox.** `toggle` for settings that switch playback behavior (Loop, Random
   rotation, Random skew); `checkbox` for the two "render it even though it fails validation"
   choices (the page's GS1 option and each row's "Render if invalid"). Both are native checkboxes,
   announced the same way.

### Setup page — `src/routes/+page.svelte`

- The `.setup` column: `base-100` background, same width and spacing; the `<h1>` sized explicitly.
- Editor, Format, Error correction, Playback: through `Field`; format and error correction through
  `FormatSelect` and `EccSelect`; Editor and Playback as `select select-sm w-auto`.
- The code textarea: `textarea w-full font-mono`.
- The switch note: `alert alert-warning alert-soft`, `role="alert"` kept; **Switch anyway** and
  **Cancel** as small buttons.
- The file input: `file-input file-input-sm w-auto`.
- Notes through `Note` with the tones in _Call sites_.
- Dwell and Gap through `SecondsSlider` (`sm`); Speed: `range range-sm w-32`.
- Loop, Random rotation, Random skew: `toggle toggle-sm`; the rotation and skew maximums
  `range range-sm w-32`, disabled while their toggle is off, as today.
- The GS1 validation option: `checkbox checkbox-sm` in `Field class="lax-field"`.
- **Start:** `btn btn-primary btn-lg`, with the disabled override.

### `ValidationList.svelte`

Keeps `valid`, `invalid` and `lenient` on each `li`, now colored by `text-success`, `text-error` and
`text-warning`; `font-mono text-sm`; scroll height rules unchanged.

### `RowEditor.svelte`

Each row gets a `base-300` divider, a muted row number, a `font-mono` payload textarea (the
`field-sizing: content` rule stays), `FormatSelect` and `EccSelect`, the "Render if invalid"
checkbox (`checkbox checkbox-sm`), and Move up / Move down / Delete as `btn btn-sm min-h-9`.
**Delete** is a ghost button in the error color. **Add code** is a small button. Verdict colors as
in the validation list.

### `ShareLink.svelte`

**Share link** as a small button; the URL field `input input-sm font-mono`, read-only; the
share row becomes a flex row and the field takes `flex-1 min-w-0`, so it fills the row; the QR
level select `select select-sm w-auto` in `Field`; the QR box stays literal white with a hairline
`base-300` border; the status through `Note`.

### `Gs1Breakdown.svelte`

The `<summary>` with the `link` class; the table `table table-xs`; `color: CanvasText` becomes
`text-base-content`.

### Play page — `src/routes/play/+page.svelte`

- The stage (`.play`) untouched.
- The overlay: `bg-neutral/85 text-neutral-content`, rounded, keeping its position, `opacity`
  fade, auto-hide and `:focus-visible` behavior, with the focus-outline override. Buttons
  `btn btn-sm`; Speed `range range-xs w-[110px]`; Dwell and Gap through `SecondsSlider` (`xs`) in
  their `ctl-group` wrappers.
- The step readout: `bg-base-100/85 text-base-content`, same position and size.
- The finish screen: literal white kept; text `text-2xl`; **Restart** `btn btn-primary`, **Back**
  `btn`.
- `.finish-status` stays visually hidden with its own rule.

### `ScrollColumn.svelte`, `StepStage.svelte`

Only the size caps move to `barcode-caps.css`. Nothing else changes.

## Testing

### The existing suite

- `git diff --name-only --diff-filter=M main -- '*.test.ts'` prints nothing: no existing test file
  changes. `main` is taken after the test migration merges, and the guard is stronger there,
  because those tests no longer depend on markup. New test files are expected.
- All 737 existing tests pass, with `svelte-check` clean (`npm test`), and `npm run lint` passes.

### New unit tests, written test-first

| Test file               | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SecondsSlider.test.ts` | shows the value in seconds; a valid entry sets milliseconds (snapped, clamped) and fires `onchange`; an empty or non-numeric entry leaves the value and restores the display; moving the range fires `onchange`; the seconds field is named "<label> in seconds"; the range takes `rangeAriaLabel` when given and no `aria-label` otherwise; the passed classes land on the two inputs; both sizes                                                                                         |
| `FormatSelect.test.ts`  | renders a `<select>`; 8 groups and every format from `FORMAT_GROUPS`, in order; the binding reads and writes `FormatId`s; class and `aria-label` land on the `<select>`                                                                                                                                                                                                                                                                                                                    |
| `EccSelect.test.ts`     | `''` shows the default level; choosing the default writes `''`; choosing another level writes it; option text with and without a note                                                                                                                                                                                                                                                                                                                                                      |
| `Field.test.ts`         | the label text and the children sit inside the same `<label>`; a wrapped control keeps its accessible name; the class passes through                                                                                                                                                                                                                                                                                                                                                       |
| `Note.test.ts`          | each tone's class; `id`, `hidden`, `role` and `aria-*` pass through to the `<p>`                                                                                                                                                                                                                                                                                                                                                                                                           |
| `theme.test.ts`         | every pair in both contrast tables, with the compositing rules above; fails if a token it needs is missing                                                                                                                                                                                                                                                                                                                                                                                 |
| `colors.test.ts`        | parses each `<style>` block in `src/**/*.svelte` into rules (selector plus declarations); a color literal (hex, `rgb()`, `rgba()`, `hsl()`, `hsla()`) is allowed only as `#fff` or `#ffffff` in a rule whose selector is exactly `.play` or `.finish-screen` (play page) or `.qr-code` (`ShareLink`). Any other color literal in a `<style>` block, a `style=` attribute or a class string fails. System colors such as `CanvasText` are replaced by hand; the test does not look for them |
| `check-css.test.ts`     | the pure `checkCss(cssText): string[]` behind `scripts/check-css.ts`, against fixtures: passes `.overlay.hidden.svelte-x{…}`, `.md\:hidden{…}`, `[hidden]:where(…){…}`, bare `[data-theme]`, `[data-theme=instrument]`, `[data-theme="instrument"]` and `theme-controller[value="instrument"]`; fails on a bare `.hidden{…}` (alone or in a selector list), `[data-theme=light]`, two theme blocks, a missing token, and empty input                                                       |

The component tests (`SecondsSlider`, `FormatSelect`, `EccSelect`, `Field`, `Note`) follow the
migration spec's _Query rules_ and fall under its lint block (`eslint-plugin-testing-library`
`flat/svelte`, on `src/routes/**/*.test.ts` and `src/lib/components/**/*.test.ts`). A class read
there needs a fallback marker as that spec's _Fallbacks_ describe.

The theme and color tests read source files with `node:fs`; they need no build.

## Verification that fails closed

A checker that errors, returns nothing or is skipped counts as **unverified**, never as a pass.

### `scripts/check-css.ts`, run as `postbuild`

Reads every `.css` file in `dist/`, runs `checkCss` on the joined text, prints any problems and
exits non-zero if there are any. Problems:

- there is no CSS at all;
- a selector that, after the selector list is split on commas, is exactly `.hidden` (compound
  selectors such as `.overlay.hidden.svelte-…`, variants such as `.md\:hidden` and the `[hidden]`
  attribute selector are fine). This rule also protects the migrated play test's overlay fallback;
- a `[data-theme=…]` selector whose value, quoted or not, is not `instrument` (a bare
  `[data-theme]` is fine);
- not exactly one rule declaring `--color-base-100` (the Instrument theme), or that rule missing a
  token from the theme table.

It also prints the total CSS size, raw and gzipped, for the PR.

### `scripts/stage-check.ts`, run as `npm run stage-check -- <ref>`

A TypeScript script run by Node 24 through npm, so the command is the same in bash and fish (with
Node 24 on the `PATH`, as for every npm command here). `<ref>` defaults to `main`. Run by hand, not
in CI; specs 2 and 3 reuse it. Exit codes: 0 pass, 1 mismatch, 2 unverified (with the reason).

1. **Builds.** Creates a detached worktree of `<ref>` in the system temp directory, runs `npm ci` and
   `npm run build` there, and builds the current tree. Copies both `dist/` folders aside.
2. **Serving.** One static server per build, as GitHub Pages serves it: the `/scandible` prefix is
   stripped, `/scandible/` serves `index.html`, `/scandible/play` serves `play.html`, other paths
   serve files. A 404 for any page or asset makes the run unverified. Into `play.html` it injects
   `<style>.overlay, .readout { visibility: hidden !important }</style>`, so only the stage is
   compared, and a script that, once `.barcode-item svg` exists, POSTs a ready message to the server
   with the width, height and computed `display` of the first `.barcode-item` and its `svg`.
3. **Step mode** (opens paused, so frames repeat). Three decks, each at 1280×900 and 390×844, with
   `mode=step&rot=1&rotmax=20&seed=7` in the fragment: UPC-A `036000291452` (`fmt=upc`), QR Code
   `https://example.com/scandible` (`fmt=qr`), PDF417 `SCANDIBLE STAGE CHECK 0123456789`
   (`fmt=pdf417`). Screenshots with
   `firefox --headless --no-remote --profile <fresh dir> --window-size=W,H --screenshot`. A shot
   counts as unverified if its ready message never arrived or if fewer than 0.5% of its pixels are
   non-white (a blank or 404 page). Each pair is decoded with `pngjs` and must match pixel for pixel.
4. **Scroll mode** (animated, so geometry instead of pixels). The same UPC-A and PDF417 decks
   without `mode=step`, at 1280×900. Firefox runs headless without `--screenshot`; the server waits
   for the ready message, then stops that Firefox by its own process ID. No message within 20 s
   makes the run unverified. Both builds must match within 0.01 px. (Console mirroring was tried
   and dropped: its output arrived in only 3 of 6 runs (M11).)
5. **Cleanup.** Removes the worktree and stops only the processes it started.

### Visual review

Before-and-after screenshots at 1280×900 and 390×844: the setup page at full height, the
validation list with valid, invalid and lenient entries, a GS1 row with its breakdown open (in the
list and in the per-row editor), the per-row editor, the switch note, the share QR, the step overlay
and the finish screen. The author reads them, comparing control widths and spacing with `main`;
they go in the PR for the user.

The migration to accessible test queries left five things to this review, because no test reads
them any more (PR #9, _Deliberate losses_). The author checks each one on the before-and-after
screenshots and says in the PR that it holds:

1. each verdict keeps its status color: valid green, invalid red, lenient amber;
2. an open GS1 breakdown shows no visible header row (its column headers stay visually hidden);
3. in the per-row editor, a GS1 row's breakdown sits directly under that row's controls;
4. in the step overlay, each slider sits beside its seconds field;
5. every control's visible label still shows the text that names it.

### Human checks

Listed in the PR as open, not passed, until the user does them:

1. Chrome and Safari render both pages correctly.
2. Focus rings are visible when tabbing through both pages, including the overlay.
3. The play overlay fades out after 3 s instead of snapping away.
4. The setup page works on a real phone.
5. The GitHub Pages deploy renders under `/scandible`.

## Documentation

- **CONTRIBUTING.md:** the stack gains Tailwind CSS 4 and daisyUI 5; the commands list gains
  `npm run stage-check`; a short "Styling" section states the rules: classes only in `.svelte`
  files; color only through theme tokens; the stage,
  the finish screen and the share QR stay literal black on white; run `stage-check` after any change
  that could touch the play page.
- **docs/guide.md:** a "Browser support" section (with its Contents entry) before "Scanner settings
  and troubleshooting": Chrome or Edge 111, Safari 16.4, Firefox 128 or later.
- **README.md:** unchanged. Screenshots wait for specs 2 and 3.

## Out of scope

- Everything listed for specs 2 and 3 in _Series_, including `Section`, slider value readouts,
  segmented controls, the pinned bar, the Share panel, the overlay's touch targets and icons.
- Dark mode.
- The SvelteKit 3 upgrade (3.0.0 shipped 2026-10-01; this repo is on 2.70) (M1).
- Moving tests to role-based queries.
- A CSS size budget, and visual regression testing in CI.

## Measurements

Measured on 2026-11-04 on this machine unless marked otherwise. The survey, spike and review probes
are in the brainstorming session's scratchpad and are not committed.

- **M1 — versions** (`npm view`): `tailwindcss` 4.3.4; `@tailwindcss/vite` 4.3.4; `daisyui`
  5.7.50; `pngjs` 7.0.0; `@types/pngjs` 6.0.5; `shadcn-svelte` 1.8.0; `bits-ui` 2.20.4;
  `flowbite-svelte` 1.33.1, last published 2026-04-07; `@sveltejs/kit` 3.1.1, with 3.0.0 published
  2026-10-01. Maintenance figures (commit shares, last commits, release history) and the 165-line
  test count are quoted from the survey agent's reading of each project's GitHub repository and of
  the test files, not re-measured.
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
- **M5 — tests** (spike, daisyUI classes on the setup page's controls only; review probe, the full
  wiring): `svelte-check` 0 errors and 0 warnings; Vitest 737 of 737 passed in both.
- **M6 — the `hidden` collision:** both spike builds contain `.hidden{display:none}`, generated
  from the play page's `class:hidden`. A Tailwind 4.3.4 probe with `@source not inline('hidden')`
  emits no `.hidden` rule and still emits other utilities, including `md:hidden`.
- **M7 — daisyUI emits what it finds:** the spike CSS has no `.modal`, `.collapse` or `.tooltip`
  rules, but has `.steps` and `.swap`, words that appear in our TypeScript.
- **M8 — contrast** (WCAG 2.x relative luminance; translucent colors composited in sRGB; the
  soft-alert background mixed 8% in oklab, read from daisyUI 5.7.50's `.alert-soft` rule).
  On `#ffffff` / `#f4f4f5`: success 5.02 / 4.56, error 6.47 / 5.89, warning `#8a5d00` 5.76 / 5.24,
  info 5.17 / 4.70, base-content 17.72 / 16.12, base-content at 70% 6.54 / 6.26, base-content at
  55% 3.95 / 3.84. On soft alerts: warning `#8a5d00` 5.14 (`#b45309`: 4.52), error 5.74.
  Primary-content on primary 16.97; neutral-content on neutral 10.01; on the overlay (`neutral` at
  85% over white, `#5c5c62`): neutral-content 6.38, base-content 2.66.
- **M9 — browser floor:** Vite 7.3.6's default target is `chrome107, edge107, firefox104, safari16`
  (`ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET` in `node_modules/vite`). Tailwind v4 states it
  depends on Chrome 111, Safari 16.4 and Firefox 128 (tailwindcss.com/docs/compatibility, quoted by
  the survey). The spike CSS uses `oklch(`, `color-mix(`, `@property` and `@layer`.
- **M10 — test inventory:** before the migration, about 120 `querySelector` calls in the test
  files located native controls by class name; the migration spec replaces them with role, label
  and text queries. The migrated tests still read the stage classes (`barcode-item`,
  `barcode-item--qr`, `step-stage`) and the overlay's `hidden` class, as its _Fallbacks_ allow. No
  test reads the overlay's `s` span. 737 of 737 pass on the current tree.
- **M11 — tooling probe** (review, a scratch copy of the repo with the exact pins): the
  `styles.css` block builds; `themes: false` emits only `[data-theme="instrument"]`; `default: true`
  puts the theme on `:where(:root)` with no `prefers-color-scheme` block; the minified output
  contains bare `[data-theme]` in `:root,[data-theme]`; `npm run build` runs `postbuild`; Node 24.17
  runs a `.ts` script that imports `pngjs`; `svelte-check` and ESLint cover `scripts/`. Firefox 155
  `--screenshot` gives exact 1280×900 and 390×844 PNGs, byte-identical across 8 runs per deck;
  console mirroring with `devtools.console.stdout.content` printed in 3 of 6 runs, and a log
  scheduled at 1.5 s never arrived because `--screenshot` exits after load; `/scandible/play.html`
  renders SvelteKit's 404, so `/scandible/play` must serve `play.html`.
- **M12 — daisyUI 5.7.50 defaults** (read from its component CSS): `.input`, `.select`,
  `.textarea`, `.file-input` and `.range` are `width: clamp(3rem, 20rem, 100%)`; `--input-color` is
  `base-content` at 20% on input, select, textarea, file input, checkbox and toggle (1.53:1 on
  white); `.btn` focus `outline-color` is `--btn-color`, falling back to `base-content`; placeholder
  text is `base-content` at 50%; a disabled `.btn` is 20% text on a 10% fill (1.39:1); `summary`
  gets a focus outline only inside `.collapse`, and `.link` has its own `:focus-visible` outline.
  Heights: `btn-sm` 32 px, `btn-xs` 24 px, `select-sm` 32 px, `toggle-sm` and `checkbox-sm` 20 px;
  range thumbs 20 px (`-sm`) and 16 px (`-xs`), against today's browser defaults of about 21 to
  25 px. Base layers: `rootcolor`, `scrollbar`, `rootscrolllock`, `rootscrollgutter`, `svg` (a
  noise variable only).

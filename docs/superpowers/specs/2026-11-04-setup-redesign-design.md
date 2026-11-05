# Setup page redesign: two panes, a pinned bar and a Share panel — Design

**Date:** 2026-11-04
**Status:** Design agreed in conversation on 2026-11-04, question by question and then section by
section, with two mockups in the visual companion (the per-row editor's row layout, and the whole
page at 1280 px and 390 px). Revised the same day after a four-lens review on Sonnet subagents
(codebase fit and tests; tooling probes in a throwaway worktree; UX and accessibility; internal
coherence), judged by the author. Awaiting the user's review of this written spec.
Spec 2 of the three-spec UI revamp series. The series, its decisions and spec 1's foundation are in
`docs/superpowers/specs/2026-11-04-ui-foundation-design.md` (merged as `fde5de1`). Facts measured
for this spec are in _Measurements_ at the end, cited as _M1_ to _M12_.

**Builds on:** spec 1's toolchain, Instrument theme and shared units (`Field`, `Note`,
`SecondsSlider`, `FormatSelect`, `EccSelect`); the accessible test queries migration and its rules in
`CONTRIBUTING.md` _Writing tests_; and the test-debt PR #11 (`86e28a5`), so this work starts from a
test run with no warnings. SvelteKit 3 waits until after the series (handoff Q2).

## Intent

The setup page is one 590 px column (M1). On a 1280 px window it leaves wide empty margins. It
stacks about twenty controls and four long hints, so a GS1 deck runs to about 2,000 px tall (M2).
Start and the share controls sit at the very bottom. In the per-row editor, a row's controls wrap
in a different place for each format, and a QR row's error-correction select pushes the move
buttons onto a second line.

This spec redesigns the page **without adding features**:

1. Two panes: **Codes** on the left, **Playback** and **Distortion** on the right.
2. A bar pinned to the window bottom with the code count, **Share** and **Start**.
3. Share becomes a panel opened from that bar.
4. Long hints become disclosures next to the control they explain.
5. The per-row editor gets a fixed row layout.
6. Verdicts gain a word, and every control's accessible name contains its visible label.

The setup logic moves out of the page into one state class that the panes share.

**Done means:**

1. `npm test` (with `svelte-check`) and `npm run lint` are clean, with 0 warnings. Every test
   passes, including the tests this spec changes on purpose (_Testing_).
2. `npm run build` passes, including `check-css`. The PR records the CSS size next to spec 1's
   66,368 B raw and 11,426 B gzipped (M3).
3. `npm run stage-check` passes against `main` (8 PASS). The play page is unchanged, but the
   stylesheet is shared.
4. **The share link stays the same.** `git diff main -- src/lib/shareUrl.ts` prints nothing, and
   the round-trip test in _Testing_ passes.
5. The play page is untouched: `git diff --name-only main -- src/routes/play` prints nothing.
6. `ShareLink` is gone: `grep -rn ShareLink src` prints nothing.
7. The docs name the new controls: `grep -nE 'file picker under|\*\*Editor\*\* select|\*\*Playback\*\* select|\*\*Share link\*\*' docs/guide.md README.md`
   prints nothing.
8. The visual review is done, and its checks are reported in the PR. The human checks are listed in
   the PR as open (_Verification that fails closed_).

## Decisions

Made by the user on 2026-11-04, in this order:

1. **Hints: A, a disclosure under each control.** Each long hint becomes a native `<details>` right
   under the control it explains. A short summary phrase is visible. The full current text is
   inside, word for word. Rejected: B, rewriting each hint to about two lines and moving the rest
   to the guide (it edits reviewed text, and facts would leave the app); C, an ⓘ toggletip per
   control (a custom widget, with focus, Escape, touch and announcement to get right).
2. **Share: A, a panel that does not block the page.** Share is a toggle button in the bar. The
   panel opens above the bar, and the page behind it stays usable. Rejected: B, a modal `<dialog>`,
   because jsdom 24 implements neither `showModal()` nor `popover` (M4), so the modal behavior
   would go untested; C, inline share controls, which the B2 layout ruled out.
3. **Per-row editor: layout A, stacked lines** (mockup `row-editor-layout.html`). Line 1 holds the
   number, the code and three icon actions. Line 2 holds the row's settings. Then the verdict at
   full width, then the GS1 breakdown. Rejected: B, aligned columns with headers (the code column is
   narrow, so GS1 payloads wrap even on a desktop); C, a card per code (the heaviest look, and long
   verdicts crowd the card's header).
4. **Verdicts: A, a visible word after the glyph,** such as "✓ valid" and "✗ invalid: too long for
   QR Code (level H)". Rejected: B, a word that only screen readers hear; C, no change until a screen
   reader shows the glyphs are skipped.
5. **The color guard widens (handoff Q3, option A),** test-first in this spec's plan (_Styling_).
   Rejected: removing Tailwind's palette, which turns a stray palette class into a silent no-op;
   leaving it to review.
6. **State: approach 1, a shared state class.** A `Setup` class in `src/lib/setup.svelte.ts` holds
   the page's state, derived values and actions. The panes are thin markup components that take it
   as a prop. Rejected: splitting only the markup, with about 20 `$bindable` props threaded through
   the panes; one page file of about 600 lines with new small components.
7. **The page layout** in the mockup `page-layout.html` was approved as drawn. That includes the
   proposals it listed:
   - the 1,200 px cap, and one column below 900 px;
   - **Upload file** as a button;
   - the draft summary phrases;
   - "± 8°" slider values and darker range tracks;
   - the count wording;
   - a ✕ close button in the panel;
   - a sticky settings pane.

Inherited from the series (spec 1, _Series_): no new features; behavior, URL keys and the
share-link format stay; accessibility does not regress; light only, built on tokens; the
Instrument look; setup is desktop-first and fully usable on a phone; the result is good enough for
the README screenshots.

**Kept as is after review.** The review proposed these changes; the author kept the design, for the
reason given:

- **The count says "skipped", not "invalid, skipped".** The owner approved the wording in the
  mockup, and the validation list beside it says why each code is skipped.
- **The Share panel keeps the name "Share"** from its visible heading, though the toggle that opens
  it is also "Share". Naming a region away from its visible heading would be worse.
- **Keyboard focus leaving the Share panel does not close it.** Escape closes it from anywhere on
  the page instead (_Components_, `ActionBar`). Content the user opened and can dismiss is outside
  WCAG 2.4.11, and the keyboard and the pointer then behave the same.
- **`interactive-widget` stays at the browser default.** See _Layout_, the phone.
- **The icon buttons keep their `title` tooltips,** although some screen readers then repeat the
  action as the button's description ("Move up, code 2, button, Move up").

## What changes for the user, and what stays

**Deliberate behavior changes:**

1. Hints start collapsed. Their text is unchanged.
2. Share is a panel. Its QR code is drawn as soon as the panel opens. It redraws whenever the link
   or the QR level changes while the panel is open. Today a change clears the QR until "Share link"
   is pressed again.
3. **Copy link** only copies. Today one "Share link" button both copies and draws the QR.
4. Verdicts carry a word (_Copy_).
5. The Editor and Playback selects become segmented switches. The file picker becomes an **Upload
   file** button.
6. Some accessible names change (_Copy_, _Labels and other strings_).

**Unchanged:**

- every setting, its range and default;
- the share link and URL keys; what Start plays;
- the lossy editor switch and its note;
- file upload: replace in Plain text, append in Per row;
- duplicate detection;
- every warning's text and its condition;
- the GS1 breakdown;
- the QR level, which is kept while the page is open, as today;
- the play page.

## Layout — `src/routes/+page.svelte`

- **Page root.** The page is a `<main class="setup-page">` holding the `scandible` heading and the
  two panes. There is no `<main>` today (M8). It is `max-width: 1200px`, centered, with 24 px side
  padding (16 px below 640 px).
- **Panes.** At 900 px and wider: a grid of `1.4fr 1fr` with a 24 px gap. Left: the **Codes**
  section. Right: the **Playback** and **Distortion** sections. Below 900 px: one column in the
  order Codes, Playback, Distortion. The DOM order is the same at every width.
- **Sticky settings.** The right pane is `position: sticky`, with a small top offset, only when
  both of these hold: the window is at least 900 px wide and at least 50 rem tall
  (`min-[900px]:` and a `min-height` media query). Otherwise it scrolls with the page, so a control
  in it can always be scrolled into view. 50 rem is an estimate for the tallest pane (Step mode with
  both warnings), plus the offset and the bar. The plan measures it and adjusts the number.
- **The bar** is `position: fixed` at the window bottom, full width, with a top border on
  `base-100`. Its contents use the page's max width and padding.
  - **Contents:** the count on the left, then **Share** and **Start**. Share and Start never wrap.
    They use daisyUI's default button size (2.5 rem).
  - **Height:** it is one value, `--bar-height`: 3.5 rem, or 4.5 rem below 640 px. The count is
    `text-sm`, and below 640 px it may wrap onto a second line inside that height.
  - **Padding:** the bar's bottom padding adds `env(safe-area-inset-bottom)`.
  - **What uses the height:** the page's bottom padding and the root element's
    `scroll-padding-bottom` both use `--bar-height` plus that inset (_Accessibility_).
  - **On short windows** (`max-height: 30rem`, for example 400 % zoom on a laptop, or a phone held
    sideways), the bar is `position: static` at the end of the page, and the scroll padding is 0.
- **DOM order** in the bar: the count, Share, the Share panel (while open), then Start.
- **The Share panel** opens above the bar, aligned with its right edge, at
  `width: min(24rem, 100vw - 2rem)`.
  - Its height is capped to the window above the bar, or 60 % of the window below 640 px. It
    scrolls inside if needed.
  - At desktop widths it covers part of the right pane. Below 900 px it covers most of the page, so
    you cannot watch the QR while editing there. Both are accepted.
- **On a phone** the header scrolls away, and the bar stays pinned.
  - **The keyboard:** Chrome on Android has, since version 108, let the on-screen keyboard resize
    only the visual viewport by default. So the fixed bar is expected to sit behind the keyboard
    while you type, not ride on top of it as assumed when B2 was chosen. That is from memory and
    unverified; human check 2 settles it.
  - The spec does not set the viewport's `interactive-widget`.

## State — `src/lib/setup.svelte.ts`

One class, `Setup`. The page creates it once from the decoded share URL. It replaces the page's
script and keeps its logic and comments. It is the repo's first `.svelte.ts` module.

- **Constructor:** `new Setup(decoded, seed)`, where `decoded` is `decodeShareUrl(page.url)`. It
  sets the same initial values the page sets today, including `editor = 'rows'` when the link holds
  records. It sets `format` before `ecc` and `lax`.
- **Fields** (`$state`):
  - `text`, `editor`, `rows`, `pending` and `fileError`;
  - the settings `speedPxPerSec`, `loop`, `rotate`, `rotateMaxDeg`, `skew`, `skewMaxDeg`, `ecc`,
    `lax`, `mode`, `dwellMs` and `gapMs`.

  `seed` is a read-only field.

- **`format`** is a getter and a setter over a private `$state` field. The setter first makes the
  current `ecc` and `lax` canonical for the next format (`canonicalEcc`, `canonicalLax`). Then it
  stores the format. This replaces today's `selectFormat`.
  - **Order matters:** whoever sets all three (the constructor, and a switch to Plain text) sets
    `format` first, then `ecc`, then `lax`, so the given values win. A conversion's values are
    already canonical, so the result is today's result.
- **Derived** (`$derived`): `descriptor`, `entries`, `counts`, `canStart`, `placeholder`,
  `settings`, `shareHash`, `dupPairs` and `dupHint`.
  - `counts` is `{ ready, skipped }`: ready counts the valid entries, lenient ones included, and
    skipped counts the invalid ones.
  - Blank lines and blank rows are not entries.
- **Actions:**
  - `selectEditor(next)` returns `'to-text'`, `'to-rows'`, `'pending'` (the lossy note opened) or
    `'unchanged'`. A switch clears `fileError`, as today.
  - `switchAnyway()` keeps today's rule. It switches only if the switch now loses nothing, or loses
    exactly what the note says. Otherwise it refreshes the note. It returns whether it switched.
  - `cancelSwitch()` closes the note. It does not clear `fileError`.
  - `loadFile(file)` returns a promise. It clears `fileError` first, so a repeated failure is
    announced again, then reads the file with `readCodesFile`.
    - Plain text: the file's text replaces `text`.
    - Per row: the file's codes are appended as rows with `rowsFromText(fileText, format, '',
false)`, so an upload never destroys a deck already built.
    - The editor is read after the file is read, as today.
    - On failure it sets `fileError` to "Could not read file" and leaves the codes alone.
- **`fileError` is cleared** by: an editor switch, a switch that applies (Switch anyway), the
  start of a load, a successful load, and typing in the code box. For typing, the component writes
  `setup.fileError = ''`.
- **What stays in components:**
  - focus moves, after `tick()`, decided from what an action returns;
  - clearing the file input's value after a load, in a `finally`;
  - the `hashchange` handler in the page: as today, it calls `location.reload()`, so a new page and
    a new `Setup` follow;
  - the Share panel's open state and the QR level, in `ActionBar`.

## Components

### New shared units — `src/lib/components/`

- **`Section.svelte`**: a `<section>` named by its own visible `<h2>` (`aria-labelledby`), with a
  bordered box from the theme (`border-base-300`, `rounded-box`). It has an optional `actions`
  snippet beside the heading and its content below.
- **`Segmented.svelte`**: a `role="radiogroup"` with an accessible name, holding native radio
  inputs that look like joined buttons.
  - **Props:** `name`, `label` (the group's name), `options` (`{ value, text }[]`), `value`, and
    `onchange(next)`.
  - **Look:** each radio is named by its visible text. The selected one uses the primary color.
    Unselected ones keep a visible border, so the state does not rely on color alone. The focus
    ring shows on the visible button (`has-[:focus-visible]:`).
  - **Snap-back:** after `onchange` returns, the component assigns `input.checked =
(option.value === value)` on every radio element. A `checked={…}` attribute alone does not
    work: it is not re-applied when the parent refuses the change, because the prop did not change
    (M11). So a refused change (a lossy editor switch) snaps back, as the select does today.
  - **Focus on refusal:** when the parent refuses, focus moves to the checked radio. Arrow keys
    select at once, so without this, focus would sit on an unchecked radio while the note
    announces itself.
  - **`focus()`:** an exported function that focuses the checked radio.
- **`Hint.svelte`**: `<details>` with a `<summary>` holding the summary phrase, and a paragraph
  holding the hint.
  - **Props:** `summary: string` and `id?: string` (put on the paragraph, so a control can point
    `aria-describedby` at it). The hint text is the snippet `children`.
  - **Look:** the summary is `text-base-content/70`, the size of spec 1's notes, with a ▸ marker
    that turns when open.
  - **Warnings are never `Hint`s.** The flashing-dwell warning, the duplicate warning, the QR status,
    the file error and the lossy-switch note stay visible.
- **`ValueSlider.svelte`**: a `range range-sm` input with a visible label and a visible value.
  - **Props:** `label`, `value` (bindable), `min`, `max`, `step`, `disabled`, `text(value)` for
    the visible value, and `valuetext(value)` for `aria-valuetext`.
  - **Structure:** the `<label>` holds only the label text and the input. The visible value sits
    outside the label, `aria-hidden`, because `aria-valuetext` already says it. This keeps
    `getByLabelText('Maximum rotation')` exact (M11).

### The panes — `src/lib/components/`

Each takes `setup: Setup` as its only prop, except where noted.

- **`CodesPane.svelte`**: the **Codes** `Section`.
  - **Header actions:**
    - The Editor `Segmented`: group "Editor", options Plain text and Per row.
    - **Upload file**: a `<label>` styled as a small button (`btn-sm`, 32 px), holding the real
      `<input type="file" accept=".txt,.csv">`. The input is hidden only visually (`sr-only`), so it
      stays in the tab order and keeps its keyboard behavior. The label shows the focus ring while
      the input has focus (`has-[:focus-visible]:`).
    - On a phone the switch moves to its own line under the heading.
  - **Below the header**, in order:
    1. the editor hint (Plain text only);
    2. the lossy-switch note, as today (`role="alert"`, Switch anyway, Cancel);
    3. Format, a `Field` with `FormatSelect`, labeled "Format" or, in Per row, "Format for new
       rows", as today. In Plain text it is followed by Error correction (2D formats), or by the
       render-anyway checkbox and the two GS1 hints (GS1 formats);
    4. the code box, named "Codes" by the section heading, or the `RowEditor`;
    5. in Plain text, the `ValidationList`;
    6. the file error: a `Note` with `role="alert"`, `hidden` while empty. That keeps
       `getByRole('alert')` unambiguous while the lossy note shows.
  - **Focus:**
    - After a switch to Plain text, or after Cancel, focus goes to the Editor group's checked
      radio through `Segmented`'s `focus()`. Otherwise it would fall to `body` when the note
      unmounts. Today it goes to the select.
    - After a switch to Per row, focus stays on the radio that was clicked.
- **`SettingsPane.svelte`**: two `Section`s.
  - **Playback:**
    1. a `Segmented`, group "Playback mode", options Scroll and Step;
    2. in Scroll mode, Speed as a `ValueSlider`;
    3. in Step mode, Dwell and Gap as today's `SecondsSlider`s, each followed by its warning;
    4. the Loop toggle.

    When the mode changes, focus stays on the radio, and the swapped controls follow the group in
    the DOM.

  - **Distortion:** the Random rotation toggle, then "Maximum rotation" as a `ValueSlider` (disabled
    while the toggle is off). The same for skew.
- **`ActionBar.svelte`**: the pinned bar.
  - **Count:** the ready and skipped counts (_Copy_).
  - **Share:** a toggle button with `aria-expanded`. While the panel is open, `aria-controls`
    points at it.
  - **Start:** primary, disabled until a code is ready. It calls
    `goto(resolve('/play') + setup.shareHash)`, as today. It keeps spec 1's rule for the disabled
    primary button, which moves here from `+page.svelte`.
  - **State:** it owns the panel's open state and the QR level (`$state('M')`, kept while the page
    is open, as today). It renders `SharePanel` only while open (`{#if open}`), right after the
    Share button, so Tab moves from Share into the panel.
  - **Escape:** while the panel is open, a document-level `keydown` handler closes it on Escape,
    unless the event's `defaultPrevented` is set (so Escape that closes an open `<select>` list
    does not also close the panel). Focus returns to Share only if it was inside the bar or the
    panel.
  - **Clicks** elsewhere do not close it, so you can change a setting and watch the QR follow.
  - **Focus on open** stays on Share, as for a disclosure, whose `aria-expanded` announces the
    change.
- **`SharePanel.svelte`** replaces `ShareLink.svelte`.
  - **Props:** `hash`, `ecc` (bindable, the QR level), `onclose`.
  - **Role:** a `role="region"` named by its "Share" heading, with a ✕ button named "Close".
  - **Inside**, in order:
    1. "Share link address": a read-only field, with **Copy link** beside it;
    2. the copy status: a live region (`role="status"`, named "Copy status") that is rendered
       whenever the panel is, never hidden with `display: none`, and cleared (silently) when the
       link or the level changes;
    3. "QR error correction", with the same four levels;
    4. the QR, drawn from the live link while the panel is open, unless the link is too long;
    5. the QR status note, `role="status"` as today.
  - The QR keeps its literal white background, in a `.qr-code` rule in the component's `<style>`
    block (spec 1, the stage guard's allowances).

### Changed components

- **`RowEditor.svelte`**, layout A. Each `<li>` keeps its list-item role. A `<div role="group">`
  named "Code n" inside it holds the row's lines.
  - **Line 1:** the number, the payload (`field-sizing: content`, as today) and three icon buttons:
    ↑, ↓ and ✕.
    - The icons are inline SVG with `aria-hidden`. Each button is `btn-sm` and square, 32 px, and
      Delete is set apart from the move buttons by a wider gap.
    - The names stay "Move up, code n", "Move down, code n" and "Delete code n". Each button has a
      `title` tooltip: "Move up", "Move down", "Delete".
  - **Line 2:** Format, then Error correction (2D formats) or "Render if invalid" (GS1 formats).
    - The selects show no visible label. Their names are `aria-label`s that start with the field's
      name, as today: "Format of code n", "Error correction of code n".
    - The checkbox's visible text is "Render if invalid". Its name becomes "Render if invalid, code
      n" (today "Render code n if invalid", which does not contain the visible text).
  - **Line 3:** the verdict at full width. The payload's `aria-describedby` still points at it.
  - **Line 4:** the GS1 breakdown.
  - **After the list:**
    1. Add code;
    2. the row hint;
    3. the GS1 hints, shown, as today, when any row or the format for new rows is GS1;
    4. the scan and dense hints, under the same conditions as today.
  - The verdict's state conditions are written once, as a `{@const}` per state (handoff F5 c).
  - **Focus** after move, delete and add is unchanged. After a move that disables the pressed
    button, focus goes to the row's other move button.
- **`ValidationList.svelte`**: the verdict words come through `verdictText`. The scan and dense
  hints become `Hint`s.
- **`src/lib/verdict.ts`**: `verdictText` adds the words (_Copy_). The "rendered anyway" verdicts
  and the per-row " skipped (empty)" are unchanged.
- **`+page.svelte`**: creates the `Setup` and keeps the `hashchange` reload. It lays out `<main>`,
  `CodesPane`, `SettingsPane` and `ActionBar`.
- **`src/styles.css`**: one more unlayered override beside spec 1's (_Accessibility_, Contrast).
- **Retired:** `ShareLink.svelte` and `ShareLink.test.ts`. Their tests move to `SharePanel`.
- **Unchanged:** `Field`, `Note`, `SecondsSlider`, `FormatSelect`, `EccSelect`, `Gs1Breakdown`, the
  stage components and the play page.

## Copy

**Hint summary phrases** (new copy; the hint text inside stays word for word):

| Hint constant | Where                                                                   | Summary phrase                    |
| ------------- | ----------------------------------------------------------------------- | --------------------------------- |
| `EDITOR_HINT` | under the Editor switch, Plain text only                                | What Per row adds                 |
| `GS1_HINT`    | under Format when it is GS1 (Plain text); after the rows (Per row)      | How to write GS1 data             |
| `LAX_NOTE`    | under the render-anyway checkbox (Plain text); after the rows (Per row) | What can never be rendered anyway |
| `SCAN_HINT`   | under the validation list; after the rows                               | What the arrow and GS mark mean   |
| `DENSE_HINT`  | under the validation list; after the rows                               | If dense codes don't scan         |
| `ROW_HINT`    | under Add code                                                          | How rows work                     |

`SCAN_HINT`'s phrase names the → and ␝ marks in words, because screen readers read the glyphs as
"rightwards arrow" and "symbol for group separator". The draft in the mockup used the glyphs.

The render-anyway checkbox keeps `aria-describedby` pointing at `LAX_NOTE`'s paragraph inside the
disclosure. A description is computed from hidden content too, so the checkbox keeps its
description while the disclosure is closed (M11). A screen reader therefore reads the whole note
each time the checkbox gets focus, as it does today.

**Verdicts.** The valid forms gain " valid", and the invalid forms with a reason gain
" invalid:":

| Case                         | Today                               | After                                        |
| ---------------------------- | ----------------------------------- | -------------------------------------------- |
| valid                        | ` ✓`                                | ` ✓ valid`                                   |
| valid, the encoder adds data | ` ✓ → 5901234123457`                | ` ✓ valid → 5901234123457`                   |
| valid 2D                     | ` ✓ · 21×21 modules · 11 bytes`     | ` ✓ valid · 21×21 modules · 11 bytes`        |
| valid GS1                    | ` ✓ · 255 modules wide · …`         | ` ✓ valid · 255 modules wide · …`            |
| too long                     | ` ✗ too long for QR Code (level H)` | ` ✗ invalid: too long for QR Code (level H)` |
| GS1 message                  | see below                           | see below                                    |
| invalid, no reason           | ` ✗ invalid`                        | ` ✗ invalid` (unchanged)                     |
| rendered anyway              | ` ⚠ rendered anyway · …`            | unchanged                                    |

The GS1 message case in full, for the code `hello` in GS1-128:

- today: ` ✗ No GS1 Application Identifier starts at "hello"; GS1 data starts with an Application
Identifier, such as 01 before a GTIN`;
- after: ` ✗ invalid: No GS1 Application Identifier starts at "hello"; GS1 data starts with an
Application Identifier, such as 01 before a GTIN`.

The suffixes ("(parentheses inside a value are not supported)", "(the validation setting cannot
override this)") stay where they are. A valid GS1 code over its format's character limit reads
` ✓ valid · … · over the 48-character GS1-128 limit → …`. That is intended: "valid" says it passed
validation and renders, and the limit stays a note, as today.

**Labels and other strings:**

- **The bar:** "1 code ready", "2 codes ready", then " · 3 skipped" when any are skipped; "0 codes
  ready" with nothing to play. The buttons are "Share" and "Start".
- **The Share panel:**
  - heading "Share"; close button "Close";
  - field label "Share link address"; button "Copy link";
  - statuses "Link copied." and "Could not copy. Select the link address and copy it." (today: "…
    Select the link above and copy it.", but in the panel the field sits beside the button);
  - level label "QR error correction" (today "Share QR error correction"; the panel's heading says
    Share), with options unchanged.
- **Controls:**
  - "Upload file" (today the input's name is "Load codes from a file");
  - the playback group "Playback mode" (it sits in the "Playback" section);
  - each row's checkbox "Render if invalid, code n".
- **Sliders:**
  - Speed shows "60 px/s", with `aria-valuetext` "60 pixels per second".
  - Maximum rotation and Maximum skew show "± 8°", with `aria-valuetext` "8 degrees".
- **Section headings:** "Codes", "Playback" and "Distortion".
- **Unchanged:** every other label, option and warning.

## Accessibility

- **Label in name (WCAG 2.5.3).** Every control's accessible name contains its visible label:
  - the code box is named "Codes" by the section heading (`aria-labelledby`);
  - Upload file is named by its visible label;
  - the maximum sliders are named by their now-visible labels;
  - the share field is named "Share link address";
  - each row's checkbox is "Render if invalid, code n".

  `aria-label`s that duplicate a visible label are removed, for example on the rotation and skew
  toggles. Controls with no visible label keep a descriptive name: the Editor group, and each row's
  Format and Error correction selects. The icon buttons keep their names.

- **Verdict words** come from one function, so the list, the row editor and the payload's
  description say the same thing.
- **Status messages (WCAG 4.1.3):**
  - the file error is `role="alert"`, cleared when a load starts, so a repeated failure is
    announced again;
  - the copy status and the QR status are `role="status"`. Clearing them is silent.
- **Focus not obscured (WCAG 2.4.11).**
  - `scroll-padding-bottom` on the root element, at the bar's height plus the safe-area inset,
    keeps a control reached by Tab clear of the pinned bar.
  - On short windows the bar is static, so there is nothing to obscure (_Layout_).
  - The sticky settings pane is sticky only when it fits the window (_Layout_).
  - The Share panel is content you opened yourself, and Escape closes it from anywhere on the page.
- **Contrast.**
  - The setup page's range tracks take `--range-bg` at base-content 55%, 3.95:1 on white (spec 1's
    M8). It is an unlayered rule in `src/styles.css`, next to spec 1's overrides, scoped to
    `.setup-page .range`, so it beats daisyUI's layered rule (M11). The play overlay's ranges are
    spec 3's.
  - The segmented switches: the selected option is near-black on white, with its text at 16.97:1
    (M10). The unselected options keep a 3.95:1 border.
  - Disabled controls stay exempt, as in spec 1. The first row's ↑ and the last row's ↓ stay faint
    on purpose, and the enabled ones beside them show the pattern.
- **Target size (WCAG 2.5.8):** the row's icon buttons and Upload file are 32 px; Share and Start
  are 40 px.
- **Native semantics only:** radios for the segmented switches, `<details>` for hints, a button with
  `aria-expanded` for Share, named groups for rows, and a named region for the panel. No ARIA widget
  is hand-built.
- **No live region for the count.** It would speak on every keystroke. Start's disabled state and
  the visible count carry it, and the count comes before Start in the DOM.

## Styling

- New markup follows `CONTRIBUTING.md` _Styling_: classes only in `.svelte` files, colors only from
  theme tokens, and Tailwind's bare `hidden` does nothing.
- **The color guard widens** (`src/colors.test.ts`), test-first:
  1. New fixture rows, `class="text-red-600"` and
     `<style>.x { color: oklch(50% 0.1 30) }</style>`, are added as cases that expect a violation.
     They fail against the current guard.
  2. Then the guard widens, and they pass:
     - a palette class is flagged as a whole class:
       `(?:text|bg|border(?:-[xytrbls])?|ring|ring-offset|inset-ring|outline|fill|stroke|from|via|to|accent|caret|decoration|divide|placeholder|shadow|inset-shadow|text-shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}`,
       plus the same prefixes with `-black` and `-white`. The pattern has no trailing word
       boundary, so opacity forms such as `text-red-600/50` are caught too;
     - the function alternation widens to `oklch|oklab|lab|lch|hwb|color`.

  daisyUI's own classes, such as `bg-neutral/85` and `text-neutral-content`, have no shade number
  and do not match. Neither do `color-mix(` or `currentColor`. Over today's files the widened
  guard flags nothing (M11).

  Known gap: named colors in arbitrary values, such as `bg-[red]`, are still not caught.

- **The guard's white allowance moves.** `SHARE` in `src/colors.test.ts` points at
  `src/lib/components/SharePanel.svelte`, and the real-file test's expected list names
  `SharePanel.svelte: .qr-code: #fff`. This changes in the same commit that retires
  `ShareLink.svelte`.
- `CONTRIBUTING.md` _Styling_ is updated: what the guard sees, its known gap, and the new shared
  units.

## Testing

Tests change here on purpose. Every new or changed test follows `CONTRIBUTING.md` _Writing tests_.
New behavior is written test-first. The baseline is 40 test files and 860 tests at `86e28a5`
(M5).

- **New `src/lib/setup.svelte.test.ts`**, without a DOM. It sits outside the Testing Library lint
  block, which covers `src/routes/**` and `src/lib/components/**`. It covers:
  - the format setter, and the order format, then `ecc`, then `lax`;
  - lossless and lossy editor switches, and the return values;
  - Switch anyway after the rows changed (the note refreshes), and Cancel;
  - `loadFile`: replace, append (with `''` and `false` for the new rows), failure, a repeated
    failure, and every rule for clearing `fileError` (with `$lib/fileInput` mocked, as
    `page.test.ts` does);
  - `counts` and `canStart`;
  - duplicate-pair numbering in Per row;
  - **the round trip.** Literal canonical links decode into a `Setup` whose `shareHash` is the same
    link. The fixtures are committed as text, with every key in `appendSettings`' order and a
    `seed`. They are never generated with `encodeShareUrl`, which would prove nothing. There is one
    each for Plain text, Per row, GS1 with render-anyway, Step mode with dwell and gap, and rotation
    with skew.

    Links that are not canonical (default keys missing, comma lists, `?codes=` links, an `ecc` with
    records) still decode to the same state, as today, but re-encode canonically. They are out of
    the round trip's scope.
- **New component tests:**
  - `Section`;
  - `Segmented`: the snap-back, and focus on refusal;
  - `Hint`: asserts the `open` attribute and the toggle, not visibility, because jsdom does not
    hide a closed `<details>` and `getByText` still finds the text;
  - `ValueSlider`.
- **`SharePanel.test.ts`**, from `ShareLink.test.ts`:
  - the field and Copy link, and the copy statuses;
  - the QR drawn on open, and redrawn when the link or the level changes;
  - the QR status messages, as today.
- **`page.test.ts`** stays the integration suite through the real page.
  - **Queries that change (M6):**
    - the editor and playback selects become radios (17 and 3 queries, and the `playback()` helper
      behind many more);
    - the Editor `toHaveValue` checks become `toBeChecked`;
    - the "offers Scroll and Step" test reads radios instead of options;
    - the focus checks after a switch and after Cancel expect the checked radio;
    - the file input is found by "Upload file" (4 lines);
    - the share tests open the panel from the bar (16 lines);
    - the QR visible and hidden tests invert, because the QR is drawn on open;
    - "Render code n if invalid" becomes "Render if invalid, code n";
    - the slider queries move to the new names and values (12 lines).
  - **New tests:**
    - the counts and Start;
    - Escape closing the panel and returning focus to Share;
    - the panel following Share in the DOM. jsdom does not move focus on Tab, so the order is
      asserted, not tabbed;
    - the visible slider values.
- **`RowEditor.svelte.test.ts`:**
  - `getAllByRole('listitem')` still lists the rows;
  - each row holds a group named "Code n";
  - the icon buttons have the same names;
  - the payload descriptions carry the words.
- **`ValidationList.test.ts` and `verdict.test.ts`:** the verdict strings carry the words (M6: about
  90 lines). The hints are disclosures whose text is still asserted exactly through the constants.
- **`src/theme.test.ts`:** the disabled-Start rule is read from `ActionBar.svelte`, not
  `+page.svelte`. A new case reads the `--range-bg` rule from `src/styles.css`, as spec 1's
  override cases do.
- **`src/colors.test.ts`:** _Styling_.
- **Two of the migration's losses are restored:**
  - Loss 3: a GS1 row's breakdown is inside its "Code n" group, after the row's controls
    (`toAppearBefore`).
  - Loss 5: `getByLabelText` asserts the visible labels again for Format, Error correction, the
    render-anyway checkbox, QR error correction, Share link address, Maximum rotation and Maximum
    skew.
- **No new dependency.** `fireEvent` stays; `@testing-library/user-event` is out of scope.
- **Not testable in jsdom** (no layout): the panes, the breakpoints, the sticky pane, the pinned and
  static bar, and the panel's position. These are the visual review's.

## Verification that fails closed

A check that errors, returns nothing or is skipped counts as **unverified**, never as a pass.

- **Commands:** `npm test`, `npm run lint`, `npm run build` (with `check-css`), and
  `npm run stage-check` against `main`, with 8 PASS expected. The greps in _Done means_ 5 to 7.
- **Visual review.** Before-and-after screenshots at 1280×900 and 390×844, in headless Firefox as
  in spec 1:
  1. the default page;
  2. a GS1 deck in Plain text with valid, invalid and lenient verdicts and an open breakdown;
  3. Per row with a UPC-A, a GS1-128 with its breakdown open, a QR at level H and an invalid code;
  4. Step mode with the flash and duplicate warnings showing;
  5. the Share panel open;
  6. the phone view with the bar, also at 320×568;
  7. a 1280×600 window, where the bar is fixed but the settings pane is not sticky;
  8. the play overlay, unchanged.

  The author checks, and says in the PR, that:
  1. each verdict keeps its status color (valid green, invalid red, lenient amber) and shows its
     word;
  2. an open GS1 breakdown shows no visible header row;
  3. in the per-row editor, a GS1 row's breakdown sits inside its row, under the verdict;
  4. the play overlay is unchanged, each slider beside its seconds field;
  5. every visible label in the shots is one that a `getByLabelText` test asserts, or belongs to a
     control listed under _Accessibility_ as having no visible label;
  6. at 390 px and at 320 px, Share and Start stay on one line and the count wraps at most once;
  7. tabbing through the page in a 390×844 window and in a 1280×900 window with the Share panel
     open, no focused control is hidden by the bar.

- **Human checks**, listed in the PR as open, not passed, until the user does them:
  1. a keyboard pass through the page and the Share panel in a desktop browser, including Escape
     from the page behind the panel;
  2. an Android phone: typing in the code box with the on-screen keyboard (does the bar sit behind
     the keyboard or ride on it?), and the Share panel;
  3. optional: Orca reading the verdict words, and the render-anyway checkbox's description with
     its hint closed.

## Documentation

- **`docs/guide.md`:** the passages that name changed controls are updated:
  - "the file picker under the box" (now **Upload file**);
  - "The **Editor** select" and "The **Playback** select" (now switches);
  - _Sharing a test deck_ (the Share panel, **Copy link**, **QR error correction**).

  Hint text stays as it is.

- **`README.md`:** the feature table's "**Share link**" becomes "**Share**". Screenshots wait for
  spec 3, so they are taken once, from finished screens.
- **`CONTRIBUTING.md`:** _Styling_, as above.

## Carry-ins from spec 1 and the migration

| Carry-in                                                              | Answered by                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| The file input is a bordered 261 px box                               | **Upload file** button                                           |
| A long GS1 payload wraps to two lines at 390 px in the per-row editor | Accepted. The payload grows with its content, and nothing is cut |
| `.copy-status` adds an 8 px gap at rest                               | Moves into the panel, still a live region                        |
| Disabled Move up/down at about 1.5:1                                  | Exempt, kept (_Accessibility_)                                   |
| The setup page's range tracks at about 1.2–1.3:1                      | `--range-bg` at 3.95:1, setup page only                          |
| One 590 px column on desktop                                          | Two panes                                                        |
| Row controls wrap; the QR level select pushes the move buttons down   | Layout A                                                         |
| Q3, the color guard's scope                                           | Widened (_Styling_)                                              |
| F5 c, the repeated verdict conditions                                 | A `{@const}` per state                                           |
| Visible labels instead of `aria-label`s                               | _Accessibility_                                                  |
| Words for ✓ and ✗                                                     | _Copy_                                                           |
| `aria-valuetext` in degrees                                           | `ValueSlider`                                                    |
| An announced file error                                               | `role="alert"`                                                   |
| "Share link address"                                                  | _Copy_                                                           |
| Losses 3 and 5                                                        | _Testing_                                                        |

## Notes for the plan

- One plan. Suggested order:
  1. **Extract `Setup` first,** with no change in behavior: the page uses the class, and the
     existing tests pass unchanged.
  2. Then the shared units.
  3. Then the panes and the layout.
  4. Then the bar and the Share panel.
  5. Then the row editor.
  6. Then the verdict words.
  7. Then the color guard.
  8. Then the docs and the verification.
- The plan measures the tallest settings pane, and the bar's height at 390 px and 320 px, and pins
  the `min-height` query and `--bar-height` to those measurements.

## Out of scope

- The play page, its overlay, readout and finish screen (spec 3), including the overlay's ranges
  and touch targets.
- New features, dark mode, the SvelteKit 3 upgrade and `@testing-library/user-event`.
- Rewording any hint or warning, except the copy status and the labels listed under _Copy_.
- README screenshots (after spec 3).

## Measurements

Measured on 2026-11-04 on this machine, at `main` `86e28a5` unless noted.

- **M1 — page width:** `.setup` has `max-width: 640px` with 24 px padding, so the content is about
  590 px wide (spec 1's visual review, PR #10).
- **M2 — page height:** spec 1's screenshot of the setup page with a GS1-128 deck in Plain text and
  Step mode at 1280 px (`.superpowers/visual-review/branch/setup-1280.png`, local) runs past
  2,000 px. The GS1 hint and the render-anyway note fill about 17 lines at that width. The hints are
  `GS1_HINT` 554 characters, `LAX_NOTE` 533, `SCAN_HINT` 248 and `DENSE_HINT` 229.
- **M3 — CSS size after spec 1:** `check-css` printed `3 CSS files, 66368 bytes raw, 11426 bytes
gzipped` at `fde5de1` (handoff, _Session facts after spec 1 merged_).
- **M4 — jsdom:** the installed jsdom is 24.1.3, and the tests run in it (`environment: 'jsdom'` in
  `vite.config.ts`). `HTMLDialogElement.prototype.showModal`, `close` and `showPopover` are all
  `undefined` there (confirmed again by the tooling review).
- **M5 — test baseline:** 40 test files, 860 tests; `svelte-check` 426 files, 0 errors, 0 warnings
  (at PR #11's head `19082b0`, whose tree `86e28a5` matches).
- **M6 — test lines that change** (grep counts by the codebase review, for sizing only):
  - in `src/routes/page.test.ts` (70 tests, 1,002 lines): 17 queries find the combobox "Editor",
    3 the combobox "Playback", 4 lines name "Load codes from a file", 16 name "Share link", and 12
    query sliders;
  - lines with ✓ or ✗: 46 in `verdict.test.ts`, 22 in `ValidationList.test.ts`, 9 in
    `RowEditor.svelte.test.ts` and 12 in `page.test.ts`;
  - `getAllByRole('listitem')` row helpers: `RowEditor.svelte.test.ts:47`, `page.test.ts:561` and
    `:887`.
- **M7 — daisyUI 5.7.50's range track:** `.range` sets `--range-bg: color-mix(in oklab,
currentColor 10%, #0000)` (`node_modules/daisyui/components/range.css`).
- **M8 — files:** `src/routes/+page.svelte` 413 lines (about 180 of script), `RowEditor.svelte`
  199, `ShareLink.svelte` 90, `ValidationList.svelte` 67. `src/routes/+layout.svelte` renders no
  landmark. `src/colors.test.ts:14` names `ShareLink.svelte` as the QR's white allowance, and
  `src/theme.test.ts:239` reads `.start:disabled` from `+page.svelte`.
- **M9 — verdict users:** `verdictText` is imported only by `RowEditor.svelte` and
  `ValidationList.svelte`, so the words do not reach the play page.
- **M10 — segmented contrast**, from spec 1's M8: primary-content on primary 16.97:1; primary
  (`#18181b`) on white 17.72:1; base-content at 55% on white 3.95:1.
- **M11 — tooling probes** (the tooling review, in a throwaway worktree at `52cd2d2`, with Node 24,
  `npm ci` and `svelte-kit sync`):
  1. A `.svelte.ts` class with `$state` fields, `$derived` fields and a getter and setter over a
     private `$state` field works. `bind:value` writes through to both. A `$derived` field read
     in a plain vitest test updates after a write, with no `flushSync`.
  2. Radio snap-back after a refused change fails with a `checked={…}` attribute alone, and passes
     with an imperative `input.checked =` after `onchange`.
  3. `toHaveAccessibleDescription` sees text inside a closed `<details>`, and `getByText` finds it.
  4. `getByLabelText('Upload file')` finds a `sr-only` file input inside a `<label>`, and
     `fireEvent.change` with a file works. The build emits `.sr-only`, and `check-css` passes.
  5. `min-[900px]:grid-cols-[1.4fr_1fr]` and `min-[900px]:sticky` are emitted.
  6. An unlayered `.setup-page .range { --range-bg: … }` in `src/styles.css` survives the build and
     overrides daisyUI's layered value. `check-css` passes.
  7. The widened guard patterns flag nothing in today's 15 `.svelte` files or `src/styles.css`.
  8. The codebase review notes that `getByLabelText` matches a label's whole text content, so a
     value inside the label would break an exact label query.
- **M12 — `<details>` in jsdom** (the tooling review): it has the role `group`, so tests find a
  row's group by its name, never by the role alone.

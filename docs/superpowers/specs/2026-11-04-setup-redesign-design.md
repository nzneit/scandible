# Setup page redesign: two panes, a pinned bar and a Share panel — Design

**Date:** 2026-11-04
**Status:** Design agreed in conversation on 2026-11-04, question by question and then section by
section, with two mockups in the visual companion (the per-row editor's row layout, and the whole
page at 1280 px and 390 px). Awaiting the user's review of this written spec.
Spec 2 of the three-spec UI revamp series. The series, its decisions and spec 1's foundation are in
`docs/superpowers/specs/2026-11-04-ui-foundation-design.md` (merged as `fde5de1`). Facts measured
for this spec are in _Measurements_ at the end, cited as _M1_ to _M9_.

**Builds on:** spec 1's toolchain, Instrument theme and shared units (`Field`, `Note`,
`SecondsSlider`, `FormatSelect`, `EccSelect`); the accessible test queries migration and its rules in
`CONTRIBUTING.md` _Writing tests_; and the test-debt PR #11 (`86e28a5`), so this work starts from a
test run with no warnings. SvelteKit 3 waits until after the series (handoff Q2).

## Intent

The setup page is one 590 px column (M1). On a 1280 px window it leaves wide empty margins, and it
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
   the round-trip test in _Testing_ passes: real links from `main` decode into a `Setup` whose
   `shareHash` is the same link.
5. The play page is untouched: `git diff --name-only main -- src/routes/play` prints nothing.
6. The visual review is done, and its checks are reported in the PR. The human checks are listed in
   the PR as open (_Verification that fails closed_).

## Decisions

Made by the user on 2026-11-04, in this order:

1. **Hints: A, a disclosure under each control.** Each long hint becomes a native `<details>` right
   under the control it explains. A short summary phrase is visible, and the full current text is
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
7. **The page layout** in the mockup `page-layout.html` was approved as drawn, with the proposals it
   listed: the 1,200 px cap, one column below 900 px, **Upload file** as a button, the draft
   summary phrases, "± 8°" slider values, darker range tracks, the count wording, a ✕ close button
   in the panel, and a sticky settings pane.

Inherited from the series (spec 1, _Series_): no new features; behavior, URL keys and the
share-link format stay; accessibility does not regress; light only, built on tokens; the
Instrument look; setup is desktop-first and fully usable on a phone; the result is good enough for
the README screenshots.

## What changes for the user, and what stays

**Deliberate behavior changes:**

1. Hints start collapsed. Their text is unchanged.
2. Share is a panel. Its QR code is drawn as soon as the panel opens and redraws whenever the link
   or the QR level changes while it is open. Today a change clears the QR until "Share link" is
   pressed again.
3. **Copy link** only copies. Today one "Share link" button both copies and draws the QR.
4. Verdicts carry a word (_Copy_).
5. The Editor and Playback selects become segmented switches, and the file picker becomes an
   **Upload file** button.

**Unchanged:** every setting, its range and default; the share link and URL keys; what Start
plays; the lossy editor switch and its note; file upload (replace in Plain text, append in Per
row); duplicate detection; every warning's text and its condition; the GS1 breakdown; the play
page.

## Layout — `src/routes/+page.svelte`

- **Page root.** The page is a `<main>` (there is none today) holding the `scandible` heading and
  the two panes, `max-width: 1200px`, centered, with 24 px side padding (16 px below 640 px).
- **Panes.** At 900 px and wider: a grid of `1.4fr 1fr` with a 24 px gap. Left: the **Codes**
  section. Right: the **Playback** and **Distortion** sections. Below 900 px: one column, Codes
  first.
- **Sticky settings.** At 900 px and wider the right pane is `position: sticky` with a small top
  offset, so it stays in view beside a long code list. If the pane is taller than the window, its
  end comes into view when the page scrolls to the bottom. That is acceptable.
- **The bar** is `position: fixed` at the window bottom, full width, with a top border on
  `base-100`. Its contents use the page's max width and padding: the count on the left, then
  **Share** and **Start**. Share and Start never wrap; the count may wrap onto two lines on a narrow
  phone. Its height is one value, `--bar-height`, which also sets the page's bottom padding and
  `scroll-padding-bottom` on the root element (_Accessibility_).
- **The Share panel** opens above the bar, aligned with its right edge, `width: min(24rem, 100vw -
2rem)`. Its height is capped to the window above the bar, and it scrolls inside if needed.
- **On a phone** the header scrolls away, and the bar stays pinned. On Android it rides on top of
  the on-screen keyboard while you type; the user accepted that when choosing B2.

## State — `src/lib/setup.svelte.ts`

One class, `Setup`, created once by the page from the decoded share URL. It replaces the page's
script, keeping its logic and comments.

- **Constructor:** `new Setup(decoded, seed)`, where `decoded` is `decodeShareUrl(page.url)`. It
  sets the same initial values the page sets today, including `editor = 'rows'` when the link holds
  records.
- **Fields** (`$state`): `text`, `editor`, `rows`, `pending`, `fileError`, and the settings
  `speedPxPerSec`, `loop`, `rotate`, `rotateMaxDeg`, `skew`, `skewMaxDeg`, `ecc`, `lax`, `mode`,
  `dwellMs`, `gapMs`. `seed` is a read-only field.
- **`format`** is a getter and setter over a private `$state` field. The setter makes `ecc` and
  `lax` canonical for the next format (`canonicalEcc`, `canonicalLax`) before it stores the format.
  This replaces today's `selectFormat` and the separate handling in `applyConversion`; the
  conversion's `ecc` is already canonical, so setting it through the setter changes nothing.
- **Derived** (`$derived`): `descriptor`, `entries`, `counts` (`{ ready, skipped }`, where ready is
  the number of valid entries, lenient ones included, and skipped the number of invalid ones; blank
  lines and blank rows are not entries), `canStart`, `placeholder`, `settings`, `shareHash`,
  `dupPairs`, `dupHint`.
- **Actions:**
  - `selectEditor(next)` returns `'switched'`, `'pending'` or `'unchanged'`. It clears
    `fileError`, as today.
  - `switchAnyway()` and `cancelSwitch()`. `switchAnyway` keeps today's rule: switch only if the
    switch now loses nothing or loses what the note says, otherwise refresh the note. It returns
    whether it switched.
  - `loadFile(file)` reads with `readCodesFile`. In Plain text it replaces `text`; in Per row it
    appends rows, so an upload never destroys a deck already built. On failure it sets `fileError`
    to "Could not read file" and leaves the codes alone.
- **What stays in components:** focus moves (after `tick()`, from what an action returns), clearing
  the file input's value, the `hashchange` reload (in the page) and the Share panel's open state
  (in `ActionBar`).

## Components

### New shared units — `src/lib/components/`

- **`Section.svelte`**: a `<section>` named by its own visible `<h2>` (`aria-labelledby`), with a
  bordered box from the theme (`border-base-300`, `rounded-box`). It has an optional `actions`
  snippet beside the heading and its content below.
- **`Segmented.svelte`**: a `role="radiogroup"` with an accessible name, holding native radio
  inputs that look like joined buttons. Each radio is named by its visible text. The selected one
  uses the primary color, and the focus ring shows on the visible button. Props: `name`, `label`
  (the group's name), `options` (`{ value, text }[]`), `value`, and `onchange(next)`. The component
  never trusts the DOM: after calling `onchange`, it sets every radio's `checked` from `value`. So
  when the parent refuses a change (a lossy editor switch), the switch snaps back, as the select
  does today.
- **`Hint.svelte`**: `<details>` with a `<summary>` holding the summary phrase, and a paragraph
  holding the hint. Props: `summary`, the hint text, and an optional `id` on the paragraph, so a
  control can point `aria-describedby` at it. The summary is `text-base-content/70`, the size of
  spec 1's notes, with a ▸ marker that turns when open.
- **`ValueSlider.svelte`**: a `<label>` holding the visible label, a `range range-sm` input and the
  visible value. Props: `label`, `value` (bindable), `min`, `max`, `step`, `disabled`, `text(value)`
  for the visible value, and `valuetext(value)` for `aria-valuetext`. The visible value is
  `aria-hidden`, because `aria-valuetext` already says it.

### The panes — `src/lib/components/`

Each takes `setup: Setup` as its only prop, except where noted.

- **`CodesPane.svelte`**: the **Codes** `Section`.
  - **Header actions:** the Editor `Segmented` (group "Editor": Plain text, Per row) and **Upload
    file**. Upload file is a `<label>` styled as a small button, holding the real
    `<input type="file" accept=".txt,.csv">`, which is hidden only visually (`sr-only`), so it
    stays in the tab order and keeps its keyboard behavior. The label shows the focus ring while
    the input has focus. On a phone the switch moves to its own line under the heading.
  - **Below the header**, in order:
    1. the editor hint (Plain text only);
    2. the lossy-switch note, as today (`role="alert"`, Switch anyway, Cancel);
    3. Format, as today a `Field` with `FormatSelect`, labeled "Format" or, in Per row, "Format for
       new rows". In Plain text it is followed by Error correction (2D formats), or by the
       render-anyway checkbox and the two GS1 hints (GS1 formats);
    4. the code box or the `RowEditor`;
    5. in Plain text, the `ValidationList`;
    6. the file error.
  - **Focus:** after a switch to Plain text, or after Cancel, focus goes to the Editor group's
    checked radio, so it does not fall to `body` when the note unmounts. Today it goes to the
    select.
- **`SettingsPane.svelte`**: two `Section`s.
  - **Playback:** a `Segmented` (group "Playback": Scroll, Step). In Scroll mode, Speed as a
    `ValueSlider`. In Step mode, Dwell and Gap as today's `SecondsSlider`s, each with its warning.
    Then the Loop toggle.
  - **Distortion:** the Random rotation toggle, then "Maximum rotation" as a `ValueSlider` (disabled
    while the toggle is off). The same for skew.
- **`ActionBar.svelte`**: the pinned bar.
  - **Count:** the ready and skipped counts (_Copy_).
  - **Share:** a toggle button with `aria-expanded` and `aria-controls` pointing at the panel.
  - **Start:** primary, disabled until a code is ready. It calls
    `goto(resolve('/play') + setup.shareHash)`, as today. It keeps spec 1's override for the
    disabled primary button.
  - It owns the panel's open state. `SharePanel` follows the Share button in the DOM, so Tab moves
    from Share into the panel. Escape pressed inside the bar or the panel closes it and returns
    focus to Share. Clicking elsewhere does not close it, so you can change a setting and watch the
    QR follow.
- **`SharePanel.svelte`** replaces `ShareLink.svelte`. Props: `hash`, `onclose`. It is a
  `role="region"` named by its "Share" heading, with a ✕ button named "Close". Inside, in order:
  1. "Share link address", a read-only field with **Copy link** beside it;
  2. the copy status, an always-rendered live region (`role="status"`, named "Copy status"), never
     hidden with `display: none`, cleared when the link or the level changes;
  3. "QR error correction", the same four levels;
  4. the QR, drawn from the live link while the panel is open, unless the link is too long;
  5. the QR status note, as today.

  The QR keeps its literal white background (spec 1, the stage guard's allowances).

### Changed components

- **`RowEditor.svelte`**, layout A. Each `<li>` is a `role="group"` named "Code n".
  - **Line 1:** the number, the payload (`field-sizing: content`, as today) and three icon buttons:
    ↑, ↓ and ✕, as inline SVG with `aria-hidden`. Their names stay "Move up, code n", "Move down,
    code n" and "Delete code n", and each has a `title` tooltip: "Move up", "Move down", "Delete".
  - **Line 2:** Format, then Error correction (2D formats) or "Render if invalid" (GS1 formats).
  - **Line 3:** the verdict at full width. The payload's `aria-describedby` still points at it.
  - **Line 4:** the GS1 breakdown.
  - **After the list:** Add code, then the row hint and the GS1 hints as `Hint`s, then the scan and
    dense hints.
  - The verdict's state conditions are written once, as a `{@const}` per state (handoff F5 c).
  - Focus after move, delete and add is unchanged.
- **`ValidationList.svelte`**: the verdict words come through `verdictText`. The scan and dense
  hints become `Hint`s.
- **`src/lib/verdict.ts`**: `verdictText` adds the words (_Copy_). The "rendered anyway" verdicts
  and the per-row " skipped (empty)" are unchanged.
- **`+page.svelte`**: creates the `Setup`, keeps the `hashchange` reload, and lays out `<main>`,
  `CodesPane`, `SettingsPane` and `ActionBar`.
- **Retired:** `ShareLink.svelte` and `ShareLink.test.ts`. Their tests move to `SharePanel`.
- **Unchanged:** `Field`, `Note`, `SecondsSlider`, `FormatSelect`, `EccSelect`, `Gs1Breakdown`, the
  stage components and the play page.

## Copy

**Hint summary phrases** (new copy; the hint text inside stays word for word):

| Hint constant | Where                                        | Summary phrase                    |
| ------------- | -------------------------------------------- | --------------------------------- |
| `EDITOR_HINT` | under the Editor switch, Plain text only     | What Per row adds                 |
| `GS1_HINT`    | under Format (GS1); after the rows (Per row) | How to write GS1 data             |
| `LAX_NOTE`    | under the render-anyway checkbox; after rows | What can never be rendered anyway |
| `SCAN_HINT`   | under the validation list; after the rows    | What → and ␝ show                 |
| `DENSE_HINT`  | under the validation list; after the rows    | If dense codes don't scan         |
| `ROW_HINT`    | under Add code                               | How rows work                     |

The render-anyway checkbox keeps `aria-describedby` pointing at `LAX_NOTE`'s paragraph inside the
disclosure. A description is computed from hidden content too, so the checkbox keeps its
description while the disclosure is closed.

**Verdicts.** The valid forms gain " valid", and the invalid forms with a reason gain
" invalid:", for example:

| Case                         | Today                                       | After                                                |
| ---------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| valid                        | ` ✓`                                        | ` ✓ valid`                                           |
| valid, the encoder adds data | ` ✓ → 5901234123457`                        | ` ✓ valid → 5901234123457`                           |
| valid 2D                     | ` ✓ · 21×21 modules · 11 bytes`             | ` ✓ valid · 21×21 modules · 11 bytes`                |
| valid GS1                    | ` ✓ · 255 modules wide · …`                 | ` ✓ valid · 255 modules wide · …`                    |
| too long                     | ` ✗ too long for QR Code (level H)`         | ` ✗ invalid: too long for QR Code (level H)`         |
| GS1 message                  | ` ✗ No GS1 Application Identifier starts …` | ` ✗ invalid: No GS1 Application Identifier starts …` |
| invalid, no reason           | ` ✗ invalid`                                | ` ✗ invalid` (unchanged)                             |
| rendered anyway              | ` ⚠ rendered anyway · …`                    | unchanged                                            |

The suffixes ("(parentheses inside a value are not supported)", "(the validation setting cannot
override this)") stay where they are.

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
- **Controls:** "Upload file" (today the input's name is "Load codes from a file").
- **Sliders:**
  - Speed shows "60 px/s", with `aria-valuetext` "60 pixels per second".
  - Maximum rotation and Maximum skew show "± 8°", with `aria-valuetext` "8 degrees".
- **Section headings:** "Codes", "Playback" and "Distortion".
- **Unchanged:** every other label, option and warning.

## Accessibility

- **Label in name (WCAG 2.5.3).** Every control's accessible name contains its visible label:
  - the code box is named by the "Codes" heading (`aria-labelledby`);
  - Upload file is named by its visible label;
  - the maximum sliders are named by their now-visible labels;
  - the share field is named "Share link address".

  `aria-label`s that duplicate a visible label are removed, for example on the rotation and skew
  toggles. Controls with no visible label keep a descriptive name: the Editor group, and each row's
  Format and Error correction selects ("Format of code 2"). The icon buttons keep their names and
  gain a matching `title`.

- **Verdict words** come from one function, so the list, the row editor and the payload's
  description say the same thing.
- **The file error** is `role="alert"`, so it is announced when it appears.
- **Focus not obscured (WCAG 2.4.11).** `scroll-padding-bottom: var(--bar-height)` on the root
  element keeps a control reached by Tab clear of the pinned bar. The Share panel is exempt: you open
  it yourself, and Escape, ✕ or Share closes it.
- **Contrast.**
  - The setup page's range tracks take `--range-bg` at base-content 55%, 3.95:1 on white (spec 1's
    M8). This is a scoped rule in `src/styles.css`, next to spec 1's overrides, and applies only
    inside the setup page's root. The play overlay's ranges are spec 3's.
  - Disabled controls stay exempt, as in spec 1. The first row's ↑ and the last row's ↓ stay faint
    on purpose, and the enabled ones beside them show the pattern.
- **Native semantics only:** radios for the segmented switches, `<details>` for hints, a button with
  `aria-expanded` for Share, named groups for rows, and a named region for the panel. No ARIA widget
  is hand-built.
- **No live region for the count.** It would speak on every keystroke. Start's disabled state and
  the visible count carry it.

## Styling

- New markup follows `CONTRIBUTING.md` _Styling_: classes only in `.svelte` files, colors only from
  theme tokens, and Tailwind's bare `hidden` does nothing.
- **The color guard widens** (`src/colors.test.ts`), test-first. Fixture rows with
  `class="text-red-600"` and `<style>.x { color: oklch(50% 0.1 30) }</style>` must each be flagged
  before the code changes. Then:
  - a palette class is flagged as a whole class:
    `(?:text|bg|border|ring|outline|fill|stroke|from|via|to|accent|caret|decoration|divide|placeholder|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}`,
    plus the same prefixes with `-black` and `-white`;
  - the function alternation widens to `oklch|oklab|lab|lch|hwb|color`.

  daisyUI's own classes, such as `bg-neutral/85` and `text-neutral-content`, have no shade number
  and do not match. The real-file test still passes.

- `CONTRIBUTING.md` _Styling_ is updated: what the guard sees, and the new shared units.

## Testing

Tests change here on purpose. Every new or changed test follows `CONTRIBUTING.md` _Writing tests_
and its lint block, and new behavior is written test-first. The baseline is 40 test files and 860
tests at `86e28a5` (M5).

- **New `src/lib/setup.svelte.test.ts`**, without a DOM:
  - the format setter's canonical `ecc` and `lax`;
  - lossless and lossy editor switches, Switch anyway after the rows changed (the note refreshes),
    and Cancel;
  - `loadFile`: replace, append and failure (with `$lib/fileInput` mocked, as `page.test.ts` does);
  - `counts` and `canStart`;
  - duplicate-pair numbering in Per row;
  - **the round trip:** a handful of real links decode into a `Setup` whose `shareHash` is the same
    link (Plain text; Per row; GS1 with render-anyway; Step mode with dwell and gap; rotation and
    skew).
- **New component tests:** `Section`, `Segmented` (including the snap-back), `Hint` and
  `ValueSlider`.
- **`SharePanel.test.ts`**, from `ShareLink.test.ts`: the field and Copy link; the copy statuses;
  the QR drawn on open and redrawn when the link or the level changes; the QR status messages, as
  today.
- **`page.test.ts`** keeps its role as the integration suite through the real page:
  - The editor and playback selects become radios (M6: 17 and 3 queries).
  - The file input is found by "Upload file" (4).
  - The share tests open the panel from the bar (16 lines).
  - New tests: the counts; Start; Escape closing the panel and returning focus to Share; the panel
    following Share in the DOM (jsdom does not move focus on Tab, so the order is asserted, not
    tabbed); the visible slider values.
- **`RowEditor.svelte.test.ts`**: the rows are groups named "Code n", the icon buttons have the same
  names, and the payload descriptions carry the words.
- **`ValidationList.test.ts` and `verdict.test.ts`**: the verdict strings carry the words, and the
  hints are disclosures whose text is still asserted exactly through the constants.
- **Two of the migration's losses are restored:**
  - Loss 3: a GS1 row's breakdown is inside its "Code n" group, after the row's controls
    (`toAppearBefore`).
  - Loss 5: `getByLabelText` asserts the visible labels again for Format, Error correction, the
    render-anyway checkbox, QR error correction, Share link address, Maximum rotation and Maximum
    skew.
- **No new dependency.** `fireEvent` stays; `@testing-library/user-event` is out of scope.
- **Not testable in jsdom** (no layout): the panes, the breakpoint, the sticky pane, the pinned bar
  and the panel's position. These are the visual review's.

## Verification that fails closed

A check that errors, returns nothing or is skipped counts as **unverified**, never as a pass.

- **Commands:** `npm test`, `npm run lint`, `npm run build` (with `check-css`), and
  `npm run stage-check` against `main`, with 8 PASS expected.
- **Visual review.** Before-and-after screenshots at 1280×900 and 390×844, headless Firefox as in
  spec 1:
  1. the default page;
  2. a GS1 deck in Plain text with valid, invalid and lenient verdicts and an open breakdown;
  3. Per row with a UPC-A, a GS1-128 with its breakdown open, a QR at level H and an invalid code;
  4. Step mode with the flash and duplicate warnings showing;
  5. the Share panel open;
  6. the phone view with the bar;
  7. the play overlay, unchanged.

  The author checks, and says in the PR, that:
  1. each verdict keeps its status color (valid green, invalid red, lenient amber) and shows its
     word;
  2. an open GS1 breakdown shows no visible header row;
  3. in the per-row editor, a GS1 row's breakdown sits inside its row, under the verdict;
  4. the play overlay is unchanged, each slider beside its seconds field;
  5. every control's visible label still shows the text that names it;
  6. the pinned bar hides no focused control when tabbing through the page in a 390×844 window.

- **Human checks**, listed in the PR as open, not passed, until the user does them:
  1. a keyboard pass through the page and the Share panel in a desktop browser;
  2. an Android phone: typing with the on-screen keyboard and the pinned bar, and the Share panel;
  3. optional: Orca reading the verdict words.

## Documentation

- **`docs/guide.md`:** the passages that name changed controls are updated: "the file picker under
  the box" (now **Upload file**), "The **Editor** select" and "The **Playback** select" (now
  switches), and _Sharing a test deck_ (the Share panel, **Copy link**, **QR error correction**).
  Hint text stays as it is.
- **`README.md`:** the feature table's "**Share link**" becomes "**Share**". Screenshots wait for
  spec 3, so they are taken once, from finished screens.
- **`CONTRIBUTING.md`:** _Styling_, as above.

## Carry-ins from spec 1 and the migration

| Carry-in                                                              | Answered by                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| The file input is a bordered 261 px box                               | **Upload file** button                                           |
| A long GS1 payload wraps to two lines at 390 px in the per-row editor | Accepted. The payload grows with its content, and nothing is cut |
| `.copy-status` adds an 8 px gap at rest                               | Moves into the panel, still an always-rendered live region       |
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
  `undefined` there.
- **M5 — test baseline:** 40 test files, 860 tests; `svelte-check` 426 files, 0 errors, 0 warnings
  (at PR #11's head `19082b0`, whose tree `86e28a5` matches).
- **M6 — test queries that change:** in `src/routes/page.test.ts` (70 tests, 1,002 lines), 17
  queries find the combobox "Editor", 3 the combobox "Playback", 4 lines name "Load codes from a
  file", 16 lines name "Share link", and 16 lines query sliders. About 38 lines across the test files
  pin exact verdict text or call `verdictText` (a heuristic grep count, for sizing only).
- **M7 — daisyUI 5.7.50's range track:** `.range` sets `--range-bg: color-mix(in oklab,
currentColor 10%, #0000)` (`node_modules/daisyui/components/range.css`).
- **M8 — files:** `src/routes/+page.svelte` 413 lines (about 180 of script), `RowEditor.svelte`
  199, `ShareLink.svelte` 90, `ValidationList.svelte` 67. `src/routes/+layout.svelte` renders no
  landmark.
- **M9 — verdict users:** `verdictText` is imported only by `RowEditor.svelte` and
  `ValidationList.svelte`, so the words do not reach the play page.

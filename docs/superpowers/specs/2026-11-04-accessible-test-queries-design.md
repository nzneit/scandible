# Accessible test queries: the UI tests find what a user finds — Design

**Date:** 2026-11-04
**Status:** Design agreed in conversation on 2026-11-04, in two sections. Revised the same day
after a four-lens review on Sonnet subagents (codebase fit, tooling probes, accessibility,
coherence and soundness of the proof), judged by the author. Awaiting the user's approval. It is
inserted into the UI revamp series before spec 1 (see _Series_). Facts measured for this spec are
in _Measurements_ at the end, cited as _M1_ to _M12_.

## Intent

The UI tests find elements by CSS class and read class lists. No test uses a role, label or text
query (_M2_). The six UI test files hold 334 class-selector lines and 21 class reads (_M1_). This
ties every test to markup:

- Spec 1 (UI foundation) already needed workarounds: Note's tone as a `data-tone` attribute,
  because `RowEditor.svelte.test.ts:185` compares each paragraph's whole `className`, plus an
  "existing class names stay" rule and a `ctl-`/`row-` prefix rule.
- Spec 2 rebuilds the setup page's layout, which the 196 class-coupled lines in
  `src/routes/page.test.ts` would break or hold back.

This spec moves those tests to Testing Library's guiding principle: "The more your tests resemble
the way your software is used, the more confidence they can give you."
([guiding principles](https://testing-library.com/docs/guiding-principles),
[query priority](https://testing-library.com/docs/queries/about)). Tests find controls by role,
label and text, and they assert what a user can observe. **What the tests do does not change.**
The same tests send the same events (with one listed exception) and check the same behavior at
the same strength. Only the way they find elements and read results changes.

**Done means:**

1. `node scripts/verify-test-migration.ts` exits 0. Every check in _Proving equivalence_ reports
   PASS, none reports FAIL or UNVERIFIED, and its full output is in the PR.
2. All tests pass, and `npm test` (with `svelte-check`) and `npm run lint` are clean. Lint runs the
   testing-library rules on the route and component tests, and reports unused disable comments as
   errors everywhere.
3. The only component changes are the attributes in _Accessible-name fixes_. Each is listed in the
   PR, along with any further fix that the migration needed and its evidence.
4. Every fallback (see _Fallbacks_) carries a reason, and the PR lists each place it is used.
5. `npm run build` passes.
6. The six files' test times are reported before and after, per file. They stay within the budget
   in _Proving equivalence_, or the PR reports the excess for the owner to decide.
7. The verification script is deleted in the PR's last commit. The PR names the commit that holds
   it.

## Series

The UI revamp series now runs in this order:

1. **This spec**, on branch `test/accessible-queries` off `main` (797bbad): spec, review, plan,
   implementation, PR, merge.
2. **Spec 1, UI foundation** (11da147, plan c5090e8, branch `feat/ui-foundation`). It changes as
   described in _Effect on spec 1_.
3. **Spec 2**, the setup page redesign (B2), and **spec 3**, the play screen, as before. _Notes for
   later specs_ records what this spec found for them.

## Decisions

All of these were the user's, on 2026-11-04:

- Follow Testing Library's guiding principles. The user called a test that reads a paragraph's
  whole class list "a bad test that cares about a component's implementation details".
- Migrate first, as its own PR before spec 1 (option A). The alternatives were migrating each file
  in the same task that restyles it, which loses the proof that a restyle kept behavior, and
  migrating in spec 2, which keeps spec 1's workarounds alive.
- Scope, query rules and tools as below. `user-event` waits (see _Out of scope_).
- Equivalence is proven by an unchanged inventory, unchanged events and deliberate breaks, as in
  _Proving equivalence_. The review added to these: assertion counts, presence pairing for every
  absence check, and a committed checker that fails closed.

## Scope

**Migrated:** the six UI test files.

| File                                          | Class-selector lines | Class reads | Tests |
| --------------------------------------------- | -------------------: | ----------: | ----: |
| `src/routes/page.test.ts`                     |                  196 |           6 |    70 |
| `src/routes/play/page.test.ts`                |                   70 |           8 |    37 |
| `src/lib/components/ShareLink.test.ts`        |                   25 |           0 |    16 |
| `src/lib/components/ValidationList.test.ts`   |                   20 |           3 |    15 |
| `src/lib/components/RowEditor.svelte.test.ts` |                   19 |           4 |    18 |
| `src/lib/components/Gs1Breakdown.test.ts`     |                    4 |           0 |    13 |

**Also changed:**

- `package.json` and `package-lock.json`, for the new dev dependencies.
- `src/vitest.setup.ts`, for jest-dom.
- `eslint.config.js`, for the testing-library block and a global
  `linterOptions.reportUnusedDisableDirectives: 'error'`.
- Attributes in `src/routes/+page.svelte`, `src/routes/play/+page.svelte` and
  `src/lib/components/{ShareLink,ValidationList,RowEditor}.svelte`, for accessible names only.
- `CONTRIBUTING.md`.
- `scripts/verify-test-migration.ts`, added and then deleted on the branch (see _Proving
  equivalence_).

**Not migrated:** the stage and engine tests. These are `scroller`, `stepper`, `items`, `qr`,
`formats`, the bwip-js engine tests, `ScrollColumn` and `StepStage`. They check classes like
`.barcode-item--2d`, `.scroller-copy` and `.step-stage` on DOM the engine builds. Those classes are
the contract between the engine and the stage CSS. They are not a UI detail, so those tests stay as
they are.

## Query rules

Every migrated test follows these rules.

1. **Find elements in Testing Library's order:**
   1. `getByRole` with a name;
   2. `getByLabelText`;
   3. `getByPlaceholderText`;
   4. `getByText`;
   5. `getByDisplayValue`.

   Then `getByAltText` and `getByTitle`. No test IDs are added. Some elements have no ARIA role and
   are found by `getByLabelText` instead: the file input, and a `<summary>` through its
   `aria-label`.

2. **Use exact names and text.** Use the exported constants where they exist (`GS1_HINT`,
   `LAX_NOTE`, `SCAN_HINT`, `DENSE_HINT`, …). Use a pattern only where the old test matched a
   pattern. When a query matches more than one element, narrow it with `within()` or add a name
   (see _Accessible-name fixes_). Never take `getAllBy…[0]` unless the old test also took the first
   of several.
3. **Use `screen`, not `container`.** A test that renders more than once keeps every render
   mounted, as today, and runs each render's queries inside `within(<that render>.container)`.
   Examples are `ValidationList`'s `hint()` (`:165`), `RowEditor`'s repeated `mount()`, and "generates
   different seeds across sessions" (`page.test.ts:138`). `within(container)` does not trip the
   `no-container` rule (_M10_).
4. **Keep each assertion as strong as it was.** Use jest-dom matchers, with these rules:
   - **Exact text stays exact.** Where the old test compared text with `toBe` or `toEqual`, the new
     one compares the found element's `textContent` with `toBe` or `toEqual`. That keeps leading
     spaces, such as the verdict's. `toHaveTextContent` matches a substring with whitespace
     collapsed, so it is used only where the old test used `toContain` or a pattern.
   - **Number fields use `toHaveDisplayValue`.** For example `toHaveDisplayValue('1.00')`.
     `toHaveValue` returns a number for `type=number`, and `1.00` would read as `1`.
   - **State matchers:**
     - `toBeDisabled` and `toBeEnabled`;
     - `toBeChecked`;
     - `toHaveFocus` in place of `document.activeElement` checks;
     - `toHaveAccessibleDescription` for `aria-describedby`;
     - `toAppearBefore` and `toAppearAfter` for order.
   - **Hidden elements.** Where the old test read the `hidden` attribute, use `toBeVisible` or
     `not.toBeVisible()`. jest-dom treats `hidden` and a closed `<details>` as not visible.
   - **A `<details>` element.** Its open state is the visibility of its content. Its identity is
     kept by holding its `<summary>`. The one direct property write, `d.open = true` at
     `RowEditor.svelte.test.ts:288`, becomes `fireEvent.click(summary)`, the way a user opens it.
     This is the only listed change to events.
5. **Every absence check is paired with a presence check.** An absence check is `queryBy…` with
   `toBeNull`, or `not.toBeInTheDocument`. Its exact query arguments must also appear in a presence
   check in the same file, so a mistyped name cannot pass forever. The checker enforces this, and
   the PR lists and justifies each exception.
6. **A verdict's meaning is its text.** The verdict texts are ` ✓ …`, ` ✗ …` and
   ` ⚠ rendered anyway · …` (_M7_). Tests assert that text, exactly. **The verdict's color is not
   asserted.** The `valid`, `invalid` and `lenient` classes only set color, and color is visual.
   Spec 1's visual review covers it, and one control in _Proving equivalence_ records this
   deliberate loss.
7. **Events stay exactly as they are.** Every `fireEvent` call keeps its method, order and values
   (_M8_). The one exception is the `<details>` click in rule 4. `tick()` calls and mocks stay.

## Fallbacks

There are two cases where a migrated test may still use a selector:

1. **Stage structure.** This covers what the engine rendered on the stage, such as the count of
   `.barcode-item` elements or their `--2d` and `--qr` classes. Examples are "renders the scroll
   column and overlay controls" and "renders a qr list with the 2D item classes". The stage has no
   roles, and adding them is product work for spec 3, if ever.
2. **State and placement that exist only visually.** This covers the play overlay's faded state
   (`.overlay.hidden`, opacity 0), and the readout sitting outside the overlay so it stays visible
   while the overlay fades (`play/page.test.ts:232`). The overlay stays focusable while faded, so
   `aria-hidden` would be wrong (the accessibility review agreed), and jsdom does not render
   opacity. Spec 3 can remove this fallback when it rebuilds the overlay.

Each fallback is marked with a disable comment that gives its reason:

```ts
// eslint-disable-next-line testing-library/no-node-access -- stage structure: the engine's items
```

A file may put a fallback in one marked helper (for example `stageItems()`). The PR then lists
every call site of that helper.

The global `reportUnusedDisableDirectives: 'error'` makes a stale marker fail lint.

Anything else that seems to need a selector is a missing or wrong accessible name. It is fixed
with an attribute and listed in the PR with its evidence. A fix that needs more than an attribute
is out of scope and goes to the owner.

## Accessible-name fixes

These are the only component changes. Each one is an attribute, so nothing changes visually.

**Missing or wrong names (_M4_).** Spec 2 can make these labels visible (see _Notes for later
specs_).

| Control                  | Where                              | Name today | Fix                                   |
| ------------------------ | ---------------------------------- | ---------- | ------------------------------------- |
| Code list textarea       | `src/routes/+page.svelte:260`      | none       | `aria-label="Codes"`                  |
| File input               | `src/routes/+page.svelte:268`      | none       | `aria-label="Load codes from a file"` |
| Dwell slider             | `src/routes/+page.svelte:324`      | "Dwell s"  | `aria-label="Dwell"` (as the overlay) |
| Gap slider               | `src/routes/+page.svelte:356`      | "Gap s"    | `aria-label="Gap"` (as the overlay)   |
| Random rotation checkbox | `src/routes/+page.svelte:400`      | see below  | `aria-label="Random rotation"`        |
| Maximum rotation slider  | `src/routes/+page.svelte:403`      | none       | `aria-label="Maximum rotation"`       |
| Random skew checkbox     | `src/routes/+page.svelte:413`      | see below  | `aria-label="Random skew"`            |
| Maximum skew slider      | `src/routes/+page.svelte:416`      | none       | `aria-label="Maximum skew"`           |
| Overlay speed (Scroll)   | `src/routes/play/+page.svelte:255` | none       | `aria-label="Speed"`                  |

The dwell and gap sliders get "Dwell s" and "Gap s" because their `<label>` also holds the seconds
field and its "s". The rotation and skew labels name only their first control, which is the
checkbox, so the sliders have no name. The checkboxes read correctly in jsdom, but the label also
holds the slider. Under the accessible-name rule for embedded controls, a browser can add the
slider's live value, giving "Random rotation 8" (_M12_). An explicit name settles both.

**Names that tell same-role elements apart (_M11_).** Without these, a query would match more than
one element, or could not tell two lists apart.

| Element                | Where                                         | Clash                                                                   | Fix                                                 |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| Validation list `<ul>` | `src/lib/components/ValidationList.svelte:10` | an unnamed list, as is the row editor's                                 | `aria-label="Validation results"`                   |
| Row editor `<ol>`      | `src/lib/components/RowEditor.svelte:64`      | an unnamed list                                                         | `aria-label="Codes"`                                |
| Copy status            | `src/lib/components/ShareLink.svelte:48`      | two unnamed `role="status"` regions in ShareLink                        | `aria-label="Copy status"`                          |
| Share QR status        | `src/lib/components/ShareLink.svelte:63`      | the same                                                                | `aria-label="QR code status"`                       |
| Overlay                | `src/routes/play/+page.svelte:188`            | its Restart and Back buttons share their names with the finish screen's | `role="group"` and `aria-label="Playback controls"` |
| Finish screen          | `src/routes/play/+page.svelte:270`            | the same, and its text repeats the finish status                        | `role="group"` and `aria-label="Run finished"`      |

The code textarea and the row editor's list are both named "Codes". They have different roles, and
they never show at the same time. They are the two editors for the same codes.

## Test names

Test names stay exactly as they are, except names that cite a class, a selector or markup. Those
eight drop that wording:

| File             | Today                                                                        | Becomes                                                                  |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `page.test.ts`   | builds a share URL into .share-url via ShareLink                             | builds a share URL into the Share link field via ShareLink               |
| `ShareLink`      | shows the live URL before any click and has no .url-warning                  | shows the live URL before any click                                      |
| `ShareLink`      | renders a QR code into .qr-code on click                                     | renders the QR code image on click                                       |
| `ValidationList` | renders one li per entry with valid/invalid classes and copy                 | renders one item per entry with its verdict and copy                     |
| `ValidationList` | splits each row into a raw span and a verdict span that starts with a space  | separates each row's raw text from its verdict with a space              |
| `ValidationList` | classes a lax render lenient and shows the scan hint for GS1 entries         | shows a lax render as rendered anyway, and the scan hint for GS1 entries |
| `RowEditor`      | shows each row's own verdict, with its class                                 | shows each row's own verdict                                             |
| `RowEditor`      | shows the amber verdict with the lenient class for a lax row that fails lint | shows the rendered-anyway verdict for a lax row that fails lint          |

`ShareLink.test.ts:35` asserts that `.url-warning` is absent. That element was removed in c0cd905
(_M9_) and no version since has it, so the assertion cannot fail. It is the one assertion removed,
and the PR lists it.

The stage-structure names stay ("renders a qr list with the 2D item classes", "renders a upc list
with neither 2D class", "renders each entry with its own format classes"), because their assertions
are fallbacks.

## Tools

- **`@testing-library/jest-dom` 7.0.1, added.** `src/vitest.setup.ts` imports
  `@testing-library/jest-dom/vitest`, which adds the matchers and their types. Version 7's breaking
  changes are a required `@testing-library/dom` peer and Node 22 or later (_M5_). CI and this
  machine run Node 24. The full suite and `svelte-check` pass with it (_M10_).
- **`@testing-library/dom` 10.4.1, made explicit.** It is already in the lock through
  `@testing-library/svelte`, as one deduped copy. jest-dom 7 requires it as a peer. Tests do not
  import it, because `no-dom-import` forbids that.
- **`eslint-plugin-testing-library` 7.16.2, added.**
  - Scope: its `flat/svelte` config applies to `src/routes/**/*.test.ts` and
    `src/lib/components/**/*.test.ts`, and ignores `ScrollColumn.test.ts` and `StepStage.test.ts`,
    which are stage tests. New component tests fall under the rules without a config change.
  - Rules it turns on: `no-container`, `no-node-access`, `prefer-screen-queries`,
    `render-result-naming-convention`, `prefer-find-by`, `prefer-presence-queries`,
    `await-async-queries`, `await-async-utils`, `await-async-events`, the `no-wait-for-*` rules,
    `no-dom-import` and `no-debugging-utils` (a warning).
  - Work it adds: on today's files it reports 178 `no-node-access`, 43 `no-container` and 5
    `render-result-naming-convention` problems (_M10_). The last five are the render results
    named `first`, `second`, `result` and `strict`. They are renamed to `view` or destructured;
    `view` names are local, so test names do not change.
- All three are pinned exactly, as spec 1 pins its tools.

## Proving equivalence

`scripts/verify-test-migration.ts` runs every check and is committed on the branch. Run it with
`node scripts/verify-test-migration.ts`, which behaves the same in bash and fish. It compares the
branch with `main`, so after the merge it has nothing left to compare. It is deleted in the PR's
last commit, and the PR body holds its full output and names the commit that has it.

The script fails closed:

- Each check prints PASS, FAIL or UNVERIFIED with its detail.
- A check that reads nothing (no tests, no files, an empty list) is UNVERIFIED.
- So is a step that throws, a patch that is not found exactly once, or a working tree that is not
  clean afterwards.
- The script prints the UNVERIFIED list itself, and it exits 0 only when every check passes.

**The checks:**

1. **Same inventory.** It compares the (file, full name) pairs from `vitest list --json` on `main`
   and on the branch.
   - Files are made repo-relative, and names are compared as raw strings.
   - At least 737 pairs must be read.
   - The sets must be equal after the eight renames. `vitest list` only collects tests, so this
     takes seconds (_M6_).
2. **Same events.** For each migrated file, it reads the sequence of `fireEvent` method names in
   source order. The sequences must be equal on `main` and on the branch, apart from the one
   `<details>` click in _Query rules_ 4.
3. **Assertion counts.** It records each test's runtime assertion count, using
   `expect.getState().assertionCalls` from a temporary setup file, on `main` and on the branch.
   - Every test whose count falls is listed.
   - The PR justifies each one. A typical reason is an old `not.toBeNull()` presence check that a
     throwing `getBy…` now makes.
   - The `.url-warning` removal is one of them.
4. **Presence pairing.** Every absence check's query arguments appear in a presence check in the
   same file (_Query rules_ 5). Exceptions are listed and justified.
5. **The old tests pass on the new components.** `main`'s six test files, run against the branch's
   components, all pass. This proves only that the attribute fixes changed no behavior. It is also
   the baseline that check 6 needs. It is not, on its own, proof that the new tests are equivalent.
6. **Deliberate breaks.** Each break is one exact string replacement in a source file under
   `src/`, never in a test. For each break, the script runs `main`'s six test files and the six
   migrated files, both on the branch. It compares the sets of failing test names, after the
   renames:

   | Old failing set                                              | New failing set                 | Result                                                                 |
   | ------------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------- |
   | not empty                                                    | contains every old failing name | covered                                                                |
   | not empty                                                    | misses an old failing name      | FAIL: coverage lost; fix the migrated test                             |
   | empty                                                        | any                             | not a break the old tests can see: replace it in the plan; not counted |
   | patch not found once, a run errors, or the tree is not clean | any                             | UNVERIFIED                                                             |

   The breaks, which the plan turns into exact patches:

   | Where                          | Breaks                                                                                                                                 |
   | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
   | Setup page                     | Start is enabled with no valid code; the Start URL drops the seed; the GS1 hint shows in Per row; a typed seconds value is not snapped |
   | Play page                      | the step counter reads one low; the Play and Pause labels are swapped; Back drops the live dwell                                       |
   | `ShareLink`                    | "Link copied." never shows; the field ignores a new hash; a rendered QR survives a level change                                        |
   | `ValidationList`, `verdict.ts` | an invalid entry shows ✓; a valid verdict gains trailing text; the dense hint always shows; a breakdown appears under a non-GS1 row    |
   | `RowEditor`                    | Delete removes the next row; a payload is described by another row's verdict; Add code ignores `newRowFormat`                          |
   | `Gs1Breakdown`                 | one AI reads as plural; the stop row is missing; the label prefix is dropped                                                           |

   "A valid verdict gains trailing text" checks that exact text stayed exact (_Query rules_ 4).

   **Controls** expect the old tests to fail and the new tests to pass. They show that the tests no
   longer depend on markup:

   - rename `.gs1-hint` to `.gs1-note` on the setup page;
   - rename `.share-url` to `.share-field` in `ShareLink`;
   - swap the `valid` and `invalid` classes in `ValidationList`. This records the deliberate loss in
     _Query rules_ 6: color is no longer asserted.

7. **Timing.** For each of the six files, the script sums the test durations that `vitest run`
   reports for that file with `--reporter=json`, taking the median of three runs, before and after.
   - The whole suite's wall time is not used: one bwip-js cache test takes about 15 of its 16.6 s
     (_M3_).
   - Role queries cost about 1 to 2 ms each in jsdom, and a query-heavy test measured about 2.3×
     slower (_M10_). The budget is that the six files' summed time stays within 2.5× the baseline.
   - If it is over budget, the hot tests are narrowed first with `within()`, then with
     `getByLabelText` or `getByText` where they express the same thing.
   - `{ hidden: true }` is not used to save time, because it would let queries match hidden
     elements.
   - Any excess left is reported in the PR with its numbers.

## Documentation

`CONTRIBUTING.md` gets a **Writing tests** section after _Stack_. It covers:

- the guiding principle and its link;
- the query order;
- exact names and the constants;
- `screen`, with `within()` for repeated renders;
- the jest-dom matchers, with the exact-text and number-field rules;
- presence pairing;
- the two fallbacks and how to mark them;
- that lint enforces the rules for route and component tests;
- why the stage tests are exempt;
- that `fireEvent` is used until a later spec decides on `user-event`.

## Effect on spec 1

This is done after this spec is approved, not in this PR. Spec 1's text is revised while this spec
is implemented. Its plan is rewritten after this spec merges, because the plan cites test lines
that move.

**Spec 1 drops:**

- the `data-tone` design. Note takes its tone as Tailwind classes, as first intended;
- the "existing class names stay" rule. It keeps the stage classes, the overlay's `.hidden`
  fallback and any class its own CSS hooks onto;
- the `ctl-`/`row-` prefix rule;
- the DOM-shape constraints in its _M10_:
  - the `ctl-` and `row-` class order;
  - `formatLabel` reading the select's parent's first text node;
  - the `.ecc-field` text start;
  - `FormatSelect` rendering a bare select with no wrapper;
- "the `visually-hidden` header spans stay: a test reads them", if the migrated test no longer
  reads them.

**Spec 1 keeps:**

- "No existing test file changes", now measured against `main` after this merge, with the same 737
  tests. It is a stronger guard now, because the tests no longer depend on markup.
- `check-css`'s rule against a `.hidden` utility. It now also protects this spec's overlay
  fallback.

**Spec 1 must carry:**

- The new names: `SecondsSlider`'s `rangeAriaLabel` at the setup page's call sites becomes "Dwell"
  and "Gap". The seconds fields keep "Dwell in seconds" and "Gap in seconds". `Field` must not
  change the name of any control it wraps.
- Its new component tests (SecondsSlider, FormatSelect, EccSelect, Field, Note) follow _Query
  rules_ and fall under the lint block.

## Notes for later specs

These came from the accessibility review. They are product changes, so they are out of scope
here.

**Spec 2:**

- Replace the `aria-label`s on setup controls with visible labels (`<label for>` or
  `aria-labelledby`). An `aria-label` that drifts from changed visible text would break WCAG 2.5.3,
  Label in Name.
- The ✓ and ✗ verdicts have no words, and screen readers may skip the glyphs at some punctuation
  levels. This was checked from recall only, so it is UNVERIFIED. Add a word ("valid", "invalid")
  or a visually hidden prefix. The tests can then assert the word.
- Give the rotation and skew sliders `aria-valuetext` in degrees, as dwell and gap have in
  seconds.
- Announce the file error with `role="alert"` or `role="status"`.
- Consider naming the share field "Share link address".

**Spec 3:**

- The overlay's faded state and the finish screen's semantics. Decide whether the finish screen
  becomes a dialog.
- Roles or names for the barcode items, if wanted.

## Out of scope

- `@testing-library/user-event`, and any change to the events tests send. `fireEvent.input` sets a
  value in one step, while `user.type` types one key at a time, and the seconds fields snap their
  value on `change`. Specs 2 and 3 decide whether their new tests use it.
- The stage and engine tests.
- Visible labels and any layout change (spec 2).
- Test IDs.
- New tests, and asserting verdict colors.

## Measurements

All were taken on 2026-11-04 on this machine, at `main` 797bbad, unless a review probe is named.

- **M1. Class coupling.** A script counted two kinds of line. The first calls a query helper
  (`querySelector`, `querySelectorAll`, `q`, `all`, `v`, `closest`) with a string holding a
  `.class` selector. The second reads `className`, `classList` or `toHaveClass`.

  | File                | Selector lines | Class reads |
  | ------------------- | -------------: | ----------: |
  | `page.test.ts`      |            196 |           6 |
  | `play/page.test.ts` |             70 |           8 |
  | `ShareLink`         |             25 |           0 |
  | `ValidationList`    |             20 |           3 |
  | `RowEditor`         |             19 |           4 |
  | `Gs1Breakdown`      |              4 |           0 |
  | `scroller`          |             11 |           2 |
  | `ScrollColumn`      |              2 |           0 |
  | `StepStage`         |              1 |           0 |
  | `stepper`           |              1 |           3 |
  | `items`             |              1 |           1 |
  | `formats`           |              1 |           0 |

  The total is 351 selector lines and 27 class reads across 31 test files. This is a heuristic
  count, used for sizing only.

- **M2. Query style.** No test file calls `getByRole`, `getByLabelText`, `getByText` or any other
  `*By*` query.
- **M3. Baseline.** `npx vitest run` gives 31 files and 737 tests, all passing, in 16.56 s wall time
  on Node v24.17.0. The tooling review measured `bwipjs.cache.test.ts` alone at 14.9 s, and the sum
  of `page.test.ts`'s test durations at about 1.0 s (1.7 s file duration).
- **M4. Computed accessible names.** A throwaway probe test, since deleted, rendered:
  - the setup page in Plain text under Scroll and under Step, with a `gs1128` list, and in Per row;
  - the play page under Step and under Scroll.

  It called `computeAccessibleName` from `dom-accessibility-api`, the library Testing Library uses,
  on every button, input, select, textarea and summary. The results:
  - Empty names: `.code-input`, `.file-input`, `.rotate-max-input`, `.skew-max-input` and
    `.ctl-speed`.
  - Wrong names: `.dwell-input` is "Dwell s", and `.gap-input` is "Gap s".
  - Every other control has a name, including all of RowEditor's (for example "Move up, code 1"),
    the overlay's and ShareLink's.
  - The Share button and the share field are both named "Share link", with different roles, so they
    do not clash.

- **M5. Versions.**
  - `@testing-library/jest-dom` 7.0.1 (2026-08-09). Its 7.0.0 notes say "`@testing-library/dom` is
    now a required peer dependency. The minimum supported Node.js version is now 22." `toAppearBefore`
    and `toAppearAfter` arrived in 6.9.0.
  - `@testing-library/dom` 10.4.1, in the lock.
  - `@testing-library/user-event` 14.6.8.
  - `eslint-plugin-testing-library` 7.16.2 (2026-03-24). Its peer is eslint ^8.57 || ^9 || ^10,
    and the repository has 10.4.1.
  - CI runs Node 24 (`.github/workflows/deploy.yml`).
- **M6. Inventory.** `npx vitest list --json=vitest-list.json` gives 737 entries with 737 unique
  (file, name) pairs. The `file` field is an absolute path. It collects tests without running them,
  in about 2.4 s.
- **M7. Verdict text.** In `src/lib/verdict.ts`:
  - a valid entry reads ` ✓…`;
  - an invalid one reads ` ✗…`;
  - a GS1 entry rendered under lax with a lint failure reads ` ⚠ rendered anyway · …`.
- **M8. Events.** The `fireEvent.` calls per file:
  - `page.test.ts` 60
  - `play/page.test.ts` 22
  - `ShareLink` 10
  - `RowEditor` 7
  - `ValidationList` 0
  - `Gs1Breakdown` 0
- **M9. The removed warning.** `.url-warning`, a warning for links over 2,000 characters, was
  removed in c0cd905. `ShareLink.test.ts:35` still asserts its absence.
- **M10. Tooling probes** (tooling review, in a throwaway worktree with the three pins).
  - **jest-dom.** The full suite passed with the jest-dom import, and `svelte-check` reported no
    error from it. A scratch test using `toBeDisabled`, `toHaveAccessibleName`,
    `toHaveAccessibleDescription`, `toBeVisible` and `toAppearBefore` type-checked and passed.
    There were no peer warnings.
  - **The plugin under eslint 10.4.1.** It loaded, and the files-and-ignores scoping worked.
    `reportUnusedDisableDirectives` worked both scoped and global.
  - **Lint problems on today's files:**

    | File                | `no-node-access` | `no-container` | `render-result-naming-convention` |
    | ------------------- | ---------------: | -------------: | --------------------------------: |
    | `page.test.ts`      |               50 |             15 |                                 2 |
    | `play/page.test.ts` |               37 |             20 |                                 3 |
    | `ValidationList`    |               32 |              7 |                                 0 |
    | `RowEditor`         |               30 |              0 |                                 0 |
    | `Gs1Breakdown`      |               20 |              0 |                                 0 |
    | `ShareLink`         |                9 |              1 |                                 0 |

    `ScrollColumn` and `StepStage` reported 0.

  - **Rule behavior:**
    - `within(container)` does not trip `no-container`.
    - `document.querySelectorAll`, `.closest()` and `.parentElement` trip `no-node-access`.
    - The `-- reason` disable comment silences it.
  - **Query speed:**

    | Query                            | Time                                |
    | -------------------------------- | ----------------------------------- |
    | `querySelector`                  | about 0.0 ms                        |
    | `getByRole('button', { name })`  | 1.2 ms                              |
    | `getByRole` with a pattern name  | 1.6 ms                              |
    | `getByLabelText`                 | 0.7 ms                              |
    | `getByText`                      | 0.4 ms                              |
    | `{ hidden: true }`               | 0.3 ms                              |
    | A 12-query test, old against new | 8.8 ms against 20.7 ms (about 2.3×) |

- **M11. Same-role clashes** (codebase-fit review, read from the markup):
  - `ShareLink.svelte:48` and `:63` are two `role="status"` regions.
  - `play/+page.svelte:263-264` and `:272-275` hold two Restart buttons and two Back buttons. The
    finish text is in both `.finish-status` and `.finish-text`.
  - `ul.validation-list` and `ol.row-editor` are both unnamed lists.
  - `getByRole('group')` also matches each `<optgroup>`, so a `<details>` is found through its
    summary.
- **M12. The rotation and skew checkboxes with their sliders on.** A second throwaway probe
  rendered the setup page from `#codes=036000291452&seed=7&rot=1&rotmax=8&skew=1&skewmax=5`. The
  checkboxes were checked and their sliders enabled, and the names were still "Random rotation" and
  "Random skew". The codebase-fit review's probe hand-built the same label with a `value` attribute
  on the slider, and got "Random rotation 8". The difference is that Svelte's `bind:value` sets the
  property and no attribute, so jsdom leaves the value out. A browser applies the embedded-control
  rule to the live value, so the probe in jsdom does not settle what browsers announce. Hence the
  two checkbox fixes.

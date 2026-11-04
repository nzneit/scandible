# Accessible test queries: the UI tests find what a user finds — Design

**Date:** 2026-11-04
**Status:** Design agreed in conversation on 2026-11-04, in two sections. Awaiting a review on
Sonnet subagents and then the user's approval. It is inserted into the UI revamp series before
spec 1 (see _Series_). Facts measured for this spec are in _Measurements_ at the end, cited as
_M1_ to _M9_.

## Intent

The UI tests find elements by CSS class and read class lists. No test uses a role, label or text
query (_M2_). The six UI test files hold 334 class-selector lines and 21 class reads (_M1_).
This ties every test to markup:

- Spec 1 (UI foundation) already needed workarounds: Note's tone as a `data-tone` attribute,
  because `RowEditor.svelte.test.ts:185` compares each paragraph's whole `className`, plus an
  "existing class names stay" rule and a `ctl-`/`row-` prefix rule.
- Spec 2 rebuilds the setup page's layout, so its 196 class-coupled lines would break or hold the
  layout back.

This spec moves those tests to Testing Library's guiding principle: "The more your tests resemble
the way your software is used, the more confidence they can give you."
([guiding principles](https://testing-library.com/docs/guiding-principles),
[query priority](https://testing-library.com/docs/queries/about)) Tests find controls by role,
label and text, and they assert what a user can observe. **What the tests do does not change.**
The same tests send the same events and check the same behavior. Only the way they find elements
and read results changes.

**Done means:**

1. `vitest list --json` gives the same 737 file-and-name pairs on `main` and on the branch, except
   the seven renames listed in _Test names_.
2. All tests pass, and `npm test` (with `svelte-check`) and `npm run lint` are clean. Lint runs the
   testing-library rules on the route and component tests.
3. Every deliberate break in _Proving equivalence_ comes out as its row says, and none is
   unverified.
4. The only component changes are the accessible names in _Accessible-name fixes_, each one listed
   in the PR.
5. `npm run build` passes.
6. The suite's wall time is recorded before and after. It stays within 1.5× the baseline, or the
   PR reports the excess for the owner to decide.
7. Every fallback (see _Fallbacks_) carries a reason, and the PR lists them all.

## Series

The UI revamp series now runs in this order:

1. **This spec**, on branch `test/accessible-queries` off `main` (797bbad): spec, review, plan,
   implementation, PR, merge.
2. **Spec 1, UI foundation** (11da147, plan c5090e8, branch `feat/ui-foundation`). It is revised
   while this spec is implemented, then rebased onto `main` and re-planned after this spec merges,
   because its plan cites test lines that move. See _Effect on spec 1_.
3. **Spec 2**, the setup page redesign (B2), and **spec 3**, the play screen, as before.

## Decisions

All of these were the user's, on 2026-11-04:

- Follow Testing Library's guiding principles. The user called a test that reads a paragraph's
  whole class list "a bad test that cares about a component's implementation details".
- Migrate first, as its own PR before spec 1 (option A). The alternatives were migrating each file
  in the same task that restyles it, which loses the proof that a restyle kept behavior, and
  migrating in spec 2, which keeps spec 1's workarounds alive.
- Scope, query rules and tools as in _Scope_, _Query rules_ and _Tools_. `user-event` waits (see
  _Tools_).
- Equivalence is proven by an unchanged test inventory and by deliberate breaks with controls, as in
  _Proving equivalence_.

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
- `eslint.config.js`, for the lint rules.
- `src/routes/+page.svelte` and `src/routes/play/+page.svelte`, for accessible names only.
- `CONTRIBUTING.md`.

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

   Then `getByAltText` and `getByTitle`. Use `queryBy…` to show something is absent. No test IDs
   are added. The two fallbacks below use existing markup.

2. **Use `screen`, not `container`.** When a test renders twice at once (for example "generates
   different seeds across sessions"), scope each render with `within()`.
3. **Assert what a user observes, with jest-dom matchers.** Examples:
   - `toBeDisabled` and `toBeEnabled`;
   - `toHaveValue`, `toBeChecked` and `toHaveTextContent`;
   - `toHaveAccessibleName` and `toHaveAccessibleDescription`. RowEditor's "describes each payload
     by the verdict in its own row" asserts its description this way.
   - `toBeVisible` for the `hidden` attribute;
   - `toAppearBefore` and `toAppearAfter` for order, such as "offers Scroll and Step after Error
     correction and before Speed".
4. **A verdict's meaning is its text.** The three verdict texts are ` ✓ …`, ` ✗ …` and
   ` ⚠ rendered anyway · …` (_M7_). Tests assert that text. **The verdict's color is not asserted.**
   The `valid`, `invalid` and `lenient` classes only set color, and color is visual. The visual
   review in spec 1 covers it, and one control in _Proving equivalence_ records this on purpose.
5. **Events stay exactly as they are.** Every `fireEvent` call keeps its method, order and values
   (_M8_). Only how the call finds its target changes. `tick()` calls and mocks stay as they are.
6. **Copy comes from the exported constants** where tests already use them (`GS1_HINT`, `LAX_NOTE`,
   `SCAN_HINT`, `DENSE_HINT`, …), not from retyped strings.

## Fallbacks

There are two cases where a migrated test may still use a selector:

1. **Stage structure.** This covers what the engine rendered on the stage, such as the count of
   `.barcode-item` elements or their `--2d` and `--qr` classes. Examples are "renders the scroll
   column and overlay controls" and "renders a qr list with the 2D item classes". The stage has no
   roles, and adding them is product work for spec 3, if ever.
2. **State that exists only visually.** The one case today is the play overlay's faded state
   (`.overlay.hidden`, opacity 0). The overlay stays focusable while faded, so `aria-hidden` would
   be wrong, and jsdom does not render opacity. Spec 3 can remove this fallback when it rebuilds
   the overlay.

Each fallback is marked where it happens:

```ts
// eslint-disable-next-line testing-library/no-node-access -- stage structure: the engine's items
```

A file may put the fallback in one helper (for example `stageItems()`), marked once, and then the
PR lists the helper's call sites. `linterOptions.reportUnusedDisableDirectives: 'error'` makes a
stale marker fail lint. Anything else that seems to need a selector is a missing accessible name,
and it is fixed as in the next section.

## Accessible-name fixes

These are the only component changes. They come from each control's computed accessible name
(_M4_). Each fix is an `aria-label`, so nothing changes visually. Spec 2 can make the labels visible.

| Control                 | Where                              | Name today | Fix                                   |
| ----------------------- | ---------------------------------- | ---------- | ------------------------------------- |
| Code list textarea      | `src/routes/+page.svelte:260`      | none       | `aria-label="Codes"`                  |
| File input              | `src/routes/+page.svelte:268`      | none       | `aria-label="Load codes from a file"` |
| Dwell slider            | `src/routes/+page.svelte:324`      | "Dwell s"  | `aria-label="Dwell"` (as the overlay) |
| Gap slider              | `src/routes/+page.svelte:356`      | "Gap s"    | `aria-label="Gap"` (as the overlay)   |
| Maximum rotation slider | `src/routes/+page.svelte:403`      | none       | `aria-label="Maximum rotation"`       |
| Maximum skew slider     | `src/routes/+page.svelte:416`      | none       | `aria-label="Maximum skew"`           |
| Overlay speed (Scroll)  | `src/routes/play/+page.svelte:255` | none       | `aria-label="Speed"`                  |

The dwell and gap sliders get "Dwell s" and "Gap s" because their `<label>` also holds the
seconds field and its "s". The rotation and skew labels name only their first control, which is
the checkbox. If the migration finds another control with no name, or a wrong one, it is fixed
the same way and listed in the PR.

## Test names

Test names stay exactly as they are, except names that cite a class or a selector. Those seven
drop the class wording:

| File             | Today                                                                        | Becomes                                                                  |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `page.test.ts`   | builds a share URL into .share-url via ShareLink                             | builds a share URL into the Share link field via ShareLink               |
| `ShareLink`      | shows the live URL before any click and has no .url-warning                  | shows the live URL before any click and no long-link warning             |
| `ShareLink`      | renders a QR code into .qr-code on click                                     | renders the QR code image on click                                       |
| `ValidationList` | renders one li per entry with valid/invalid classes and copy                 | renders one item per entry with its verdict and copy                     |
| `ValidationList` | classes a lax render lenient and shows the scan hint for GS1 entries         | shows a lax render as rendered anyway, and the scan hint for GS1 entries |
| `RowEditor`      | shows each row's own verdict, with its class                                 | shows each row's own verdict                                             |
| `RowEditor`      | shows the amber verdict with the lenient class for a lax row that fails lint | shows the rendered-anyway verdict for a lax row that fails lint          |

The stage-structure names stay ("renders a qr list with the 2D item classes", "renders a upc list
with neither 2D class", "renders each entry with its own format classes"), because their
assertions are fallbacks.

## Tools

- **`@testing-library/jest-dom` 7.0.1, added.** `src/vitest.setup.ts` imports
  `@testing-library/jest-dom/vitest`, which adds the matchers and their types. Version 7's breaking
  changes are a required `@testing-library/dom` peer and Node 22 or later (_M5_). CI and this
  machine run Node 24.
- **`@testing-library/dom` 10.4.1, made explicit.** It is already in the lock through
  `@testing-library/svelte`. jest-dom 7 requires it as a peer.
- **`eslint-plugin-testing-library` 7.16.2, added.** Its `flat/svelte` config applies to
  `src/routes/**/*.test.ts` and `src/lib/components/**/*.test.ts`. It ignores
  `ScrollColumn.test.ts` and `StepStage.test.ts`, which are stage tests. Its `no-container`,
  `no-node-access` and `prefer-screen-queries` rules stop class-coupled tests coming back, and new
  component tests fall under the rules without a config change.
- All three are pinned exactly, as spec 1 pins its tools.
- **`@testing-library/user-event` waits.** It changes the events a test sends:
  - `fireEvent.input` sets a value in one step, and `user.type` types one key at a time;
  - the seconds fields snap their value on `change`, so the two could behave differently.

  This migration changes only how tests find and read elements, so any failure points at the query
  change. Specs 2 and 3 decide whether their new tests use it.

## Proving equivalence

These are one-time checks. Their results go in the PR, and their scripts are not committed.

1. **Same inventory.** The (file, full name) pairs from `vitest list --json` on `main` and on the
   branch are equal after the seven renames are applied. The baseline is 737 pairs, all unique
   (_M6_).
2. **Same events.** For each migrated file, the sequence of `fireEvent` method names, in source
   order, is the same on `main` and on the branch (_M8_ gives the counts).
3. **The old tests pass on the new components.** `main`'s six test files, run against the branch's
   components, all pass. This shows the accessible-name fixes changed no behavior, and it is the
   baseline for check 4.
4. **Deliberate breaks.** Each break is one exact string replacement in a component file, never in
   a test. It runs against `main`'s version of the affected test file and the migrated version, both
   on the branch. The file is restored after each run, and `git status` must be clean at the end.

   | Old tests                                           | New tests | Result                                                             |
   | --------------------------------------------------- | --------- | ------------------------------------------------------------------ |
   | fail                                                | fail      | covered                                                            |
   | fail                                                | pass      | coverage lost: fix the migrated test and run again                 |
   | pass                                                | any       | not a break the old tests could see: replace it; it does not count |
   | patch not found once, run errors, or tree not clean | any       | UNVERIFIED, which fails the check                                  |

   The breaks, which the plan turns into exact patches:

   | Component        | Breaks                                                                                                                              |
   | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
   | Setup page       | Start enabled with no valid code; the Start URL drops the seed; the GS1 hint shows in Per row; a typed seconds value is not snapped |
   | Play page        | the step counter reads one low; the Play/Pause label inverted; Back drops the live dwell                                            |
   | `ShareLink`      | "Link copied." never shows; the field ignores a new hash; a rendered QR survives a level change                                     |
   | `ValidationList` | an invalid entry shows ✓; the dense hint always shows; a breakdown under a non-GS1 row                                              |
   | `RowEditor`      | Delete removes the next row; a payload described by another row's verdict; Add code ignores `newRowFormat`                          |
   | `Gs1Breakdown`   | the singular used for two AIs; the stop row missing; the label prefix dropped                                                       |

   Three **controls** must come out old fails, new passes:

   - rename `.gs1-hint` to `.gs1-note` on the setup page;
   - rename `.share-url` to `.share-field` in `ShareLink`;
   - swap the `valid` and `invalid` classes in `ValidationList`. This is the deliberate loss in
     _Query rules_ 4: color is no longer asserted.

   The two renames show directly that the tests no longer depend on markup, which is what the
   migration is for.

5. **Timing.** The wall time of `npx vitest run` is the median of three runs, before and after, on
   this machine. The baseline is 16.56 s for one run (_M3_). If the median grows past 1.5×, the hot
   tests are narrowed first with `within()`, then with label or text queries that express the same
   thing. Any excess left is reported in the PR with its numbers.

A check that cannot run, or that returns nothing, counts as UNVERIFIED. The PR lists it, and the
work is not called done.

## Documentation

`CONTRIBUTING.md` gets a **Writing tests** section after _Stack_. It covers:

- the guiding principle and its link;
- the query order;
- `screen`, and the jest-dom matchers;
- the two fallbacks and how to mark them;
- that lint enforces the rules for route and component tests;
- why the stage tests are exempt;
- that `fireEvent` is used until a later spec decides on `user-event`.

## Effect on spec 1

This is done after this spec is approved, not in this PR. Spec 1 drops:

- the `data-tone` design. Note takes its tone as Tailwind classes, as first intended;
- the "existing class names stay" rule, except for the stage classes and CSS hooks;
- the `ctl-`/`row-` prefix rule.

Spec 1 keeps "no existing test file changes", which is now a stronger guard. Its new component
tests (SecondsSlider, FormatSelect, EccSelect, Field, Note) follow _Query rules_. Its plan is
rewritten after this spec merges.

## Out of scope

- `user-event`, and any change to the events tests send.
- The stage and engine tests.
- Visible labels and any layout change (spec 2).
- Roles or names for barcode items on the stage (spec 3, if ever).
- Test IDs.
- New tests, and asserting verdict colors.

## Measurements

All were taken on 2026-11-04 on this machine, at `main` 797bbad.

- **M1. Class coupling.** A script counted lines that call a query helper (`querySelector`,
  `querySelectorAll`, `q`, `all`, `v`, `closest`) with a string holding a `.class` selector, and
  lines that read `className`, `classList` or `toHaveClass`. Per file: `page.test.ts` 196/6,
  `play/page.test.ts` 70/8, `ShareLink` 25/0, `ValidationList` 20/3, `RowEditor` 19/4,
  `Gs1Breakdown` 4/0, `scroller` 11/2, `ScrollColumn` 2/0, `StepStage` 1/0, `stepper` 1/3, `items`
  1/1, `formats` 1/0. In total there are 351 selector lines and 27 class reads in 31 test files.
  This is a heuristic count, used for sizing only.
- **M2. Query style.** No test file calls `getByRole`, `getByLabelText`, `getByText` or any other
  `*By*` query.
- **M3. Baseline.** `npx vitest run` gives 31 files, 737 tests, all passing, in 16.56 s wall time,
  on Node v24.17.0.
- **M4. Computed accessible names.** These came from a throwaway probe test, since deleted. It
  rendered the setup page (Plain text in Scroll and in Step, a `gs1128` list, and Per row) and the
  play page (Step and Scroll), then called `computeAccessibleName` from `dom-accessibility-api`, the
  library Testing Library uses, on every button, input, select, textarea and summary.
  - Empty names: `.code-input`, `.file-input`, `.rotate-max-input`, `.skew-max-input` and
    `.ctl-speed`.
  - Wrong names: `.dwell-input` is "Dwell s" and `.gap-input` is "Gap s".
  - Every other control has a name, including all of RowEditor's (for example "Move up, code 1"),
    the overlay's and ShareLink's. The Share button and the share field are both named "Share
    link", with different roles.
- **M5. Versions.**
  - `@testing-library/jest-dom` 7.0.1 (2026-08-09). Its 7.0.0 notes say "`@testing-library/dom` is
    now a required peer dependency. The minimum supported Node.js version is now 22." Its peers are
    vitest ≥ 0.32 and `@testing-library/dom` ≥ 10 < 11. `toAppearBefore` and `toAppearAfter`
    arrived in 6.9.0.
  - `@testing-library/dom` 10.4.1 is in the lock.
  - `@testing-library/user-event` 14.6.8.
  - `eslint-plugin-testing-library` 7.16.2 (2026-03-24). Its peer is eslint ^8.57 || ^9 || ^10;
    the repository has 10.4.1. It ships `flat/svelte`, whose rules include `no-container`,
    `no-node-access`, `prefer-screen-queries`, `await-async-queries` and `no-await-sync-queries`.
  - CI runs Node 24 (`.github/workflows/deploy.yml`).
- **M6. Inventory.** `npx vitest list --json=<file>` gives 737 entries with 737 unique
  (file, name) pairs.
- **M7. Verdict text.** In `src/lib/verdict.ts`, a valid entry reads ` ✓…`, an invalid one ` ✗…`,
  and a GS1 entry rendered under lax with a lint failure ` ⚠ rendered anyway · …`.
- **M8. Events.** `fireEvent.` calls per file: `page.test.ts` 60, `play/page.test.ts` 22,
  `ShareLink` 10, `RowEditor` 7.
- **M9. The removed warning.** `.url-warning`, a warning for links over 2,000 characters, was
  removed in c0cd905. `ShareLink.test.ts:35` still asserts its absence.

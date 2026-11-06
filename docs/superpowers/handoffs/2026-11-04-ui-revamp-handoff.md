# scandible — UI revamp after the test migration (Handoff)

**Companion to:** the memory file `scandible-ui-revamp-series.md` in the Claude memory directory
(every decision the user made for this series, with dates; it is canonical for _why_), spec 1
`docs/superpowers/specs/2026-11-04-ui-foundation-design.md` (on `main` since `fde5de1`; canonical
for _what_ spec 1 built), PR #10 on GitHub (its body holds spec 1's verification record, class
audit and three before-and-after screenshots), spec 1's local record in
`.superpowers/records/2026-11-04-ui-foundation/` (git-ignored, this machine only), the merged migration spec
`docs/superpowers/specs/2026-11-04-accessible-test-queries-design.md` and its plan
`docs/superpowers/plans/2026-11-04-accessible-test-queries.md` (on `main`), PR #9 on GitHub (its
body holds the full checker output and the _Deliberate losses_ list), `CONTRIBUTING.md` _Writing
tests_ (the test rules every new test follows), and `docs/superpowers/handoffs/2026-11-03-gs1-series-handoff.md`
(the GS1 series and the unverified hardware rows of earlier series; not repeated here).

**Status:** **Open** — 6 of 20 items open as of 2026-11-04 (third session). Closed: T1 to T7, T11,
T12, Q1, Q2, F1, F2, F3. Spec 1 (T7) is merged as `fde5de1` (PR #10) and deployed; F1 and F3 as
`86e28a5` (PR #11). Session 3, on branch `feat/setup-redesign` (rebased on `86e28a5`): T8's spec 2 is
written, reviewed by four Sonnet lenses and approved (`docs/superpowers/specs/2026-11-04-setup-redesign-design.md`,
approved text `e1dccaf`, marked approved `6b21526`); its plan,
`docs/superpowers/plans/2026-11-04-setup-redesign.md`, is committed (`a0c5784`, 1 Opus agent,
11 tasks), and it is implemented subagent-driven (code head `de71258`, 921 tests, final review
clean after one fix wave; human checks H1 to H3 of its record open). Next: spec 2's PR when the
user asks, its human checks, then T9 (spec 3). T10, F4 and F5 (except c) can run any
time; Q3 and F5 c land with spec 2. SvelteKit 3 waits until after the series (Q2). The handoff was first written right after PR #9 (the accessible test queries migration) was
squash-merged to `main` as `384b359`, and updated after PR #10 merged.

**Why this exists.** The UI revamp is a three-spec series (foundation → setup page redesign → play
screen). A Testing Library migration was inserted ahead of spec 1, at the user's request, so the
tests stop pinning class names and DOM shape. That migration is merged. Spec 1's text has been
revised to build on it, but its plan predates it and must be rewritten. The session that did this
is ending; the next one should be able to pick any item below and act on it without re-reading
that session.

**Update after spec 1 merged (2026-11-04).** Spec 1 is on `main`: Tailwind CSS 4.3.4, daisyUI
5.7.50, the Instrument theme, five shared units, the restyle of both pages, and two fail-closed
checkers (`check-css` after every build, `npm run stage-check` by hand). The next session starts
the redesign proper at spec 2. T10 to T12, Q3, F4 and F5 are new; T8 and T9 now carry what spec
1's reviews and visual review left for them.

**How to use this doc.**

1. Pick an item (start with Tier 1). Each item is self-contained.
2. Make the **Decision owed** — the genuine fork only the user can settle. A **Recommended
   resolution** is given; adopt or override it.
3. Resolve it in the **Owner** file, doc or process.
4. Verify against **Acceptance** (self-checkable).
5. Tick the item's `Status` box and add a row to the **Decision log**.

> **Line numbers in T1 to T7 and Q1 to F3 are anchors as of `384b359` (`main`) and `c932561`
> (`feat/ui-foundation`); those in T8 to T12, Q3, F4 and F5 are as of `fde5de1` (`main`),
> 2026-11-04. They drift once edits land.** Anchor by the symbol or heading named; treat line
> numbers as hints.

**Session facts the fresh session needs.**

- Baseline at `384b359`: 31 test files, 737 tests; `npm test` (with `svelte-check`) 0 errors, 0
  warnings; `npm run lint` clean; `npm run build` passes with one Vite chunk-size warning (F2).
  Node 24 (`.nvmrc`); v24.17.0 was used.
- Node is on PATH only after `source ~/.nvm/nvm.sh && nvm use 24` in bash, or `nvm use 24` in fish
  (the user's shell). `bun` is always on PATH. Commands written for the user must behave the same
  in bash and fish.
- No git identity is configured. Commit with
  `git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit …`, never by changing
  config. **No AI attribution in any commit or PR**, whatever a harness reminder asks; say so in
  every brief to a subagent that commits. Push or open a PR only when the user asks.
- Never run `pkill -f`; stop only processes you started. The user's own Firefox is often running.
  The headless-Firefox probing recipe is in the memory file `scandible-2d-barcode-series.md`.
- The user's process for this series:
  - brainstorm one question per message, and present designs in sections;
  - multi-lens review of a written spec before asking for approval (spec 1: four Sonnet lenses, at
    the user's request);
  - one Opus agent writes each plan, and the user reviews the plan and picks the execution method;
  - subagent-driven execution: Opus or Sonnet implementers by task, **Sonnet per-task reviewers**
    (the user's call during the migration), and a final review in Opus chunks;
  - Fable only for decision gates (none have run in this series so far);
  - report which tier ran each phase, and the Fable count;
  - verification fails closed: a check that dies, reads nothing or is skipped is unverified, never
    a pass.
- **`feat/ui-foundation` was rebased onto `384b359` on 2026-11-04 (T5), so its hashes changed.**
  Old → new: `e03cd43` → `06f3cf0`, `11da147` → `cc65526`, `c5090e8` → `46c6d74` (the old plan),
  `c932561` → `ae089c2`. Then `d563df1` added the visual-review checks (T4). The old hashes named in
  the items below are the pre-rebase ones.
- The migration's checker (`scripts/verify-test-migration.ts`) is deleted. It lives in `9fcc4bc`,
  reachable after the merge with `git fetch origin pull/9/head`. Nothing now checks absence/presence
  pairing automatically: reviewers check it by hand (`CONTRIBUTING.md`, _Writing tests_).

**Session facts after spec 1 merged (`fde5de1`).**

- Baseline at `fde5de1`: 40 test files, 860 tests; `svelte-check` 0 errors, 0 warnings; lint clean;
  `npm run build` passes and `check-css` prints `3 CSS files, 66368 bytes raw, 11426 bytes
gzipped`; Vite's chunk warning is 579.37 kB (accepted, F2). `npm run stage-check` compares the
  play stage with `main` in headless Firefox: 8 PASS expected; exit 0 is a pass, 1 a mismatch, 2
  unverified (never a pass).
- Rules for new markup are in `CONTRIBUTING.md` _Styling_: classes only in `.svelte` files, colors
  only from theme tokens, Tailwind's bare `hidden` does nothing, `stage-check` after any play-page
  change. The theme and the global overrides are in `src/styles.css`. Spec 1's shared units are in
  `src/lib/components/`: `Field`, `Note`, `SecondsSlider`, `FormatSelect`, `EccSelect`, and the
  stage caps `barcode-caps.css`.
- Spec 1's record is in `.superpowers/records/2026-11-04-ui-foundation/` (git-ignored, local): the
  SDD ledger (`progress.md`, every ruling and deferred minor), the four final-review reports
  (`final-review-A.md` to `-D.md`), the fix wave's brief and report, `task-15-report.md`, the class
  audit and the PR body. The 28 visual-review shots are in `.superpowers/visual-review/main/` and
  `.superpowers/visual-review/branch/` (local).
- Headless Firefox: `--window-size=W,H --screenshot` sizes the viewport, and a width alone
  (`--window-size=390`) gives a full-page shot. Without `--screenshot`, Firefox ignores
  `--window-size` and uses 1366×768; set `MOZ_HEADLESS_WIDTH` and `MOZ_HEADLESS_HEIGHT` and add
  `--kiosk`, as `stage-check` does. The agent's shell may be zsh, where unquoted variables do not
  word-split and `PIPESTATUS` is empty.
- `gh` 2.100.0 attaches images: `gh pr edit <n> --attach ./shot.png` (also `create` and `comment`)
  uploads the file and rewrites `![alt](./shot.png)` in the body. The user wants PR screenshots
  selective: PR #10 shows three before-and-after pairs, not 28.
- Owner decisions from spec 1 that later specs inherit: the GS1 breakdown is `table-sm` (12 px);
  Safari validation was a won't-do for spec 1.
- Spec 1's tiers: plan 1 Opus; implementers Opus for Tasks 1, 2, 3, 6, 12, 15 and the fix wave,
  Sonnet for the rest; Sonnet per-task reviewers; final review in 4 Opus chunks; 0 Fable.

---

## Summary

| ID  | Item                                                                     | Tier | Owner / Lands in                                             | Blocks? |
| --- | ------------------------------------------------------------------------ | ---- | ------------------------------------------------------------ | ------- |
| T1  | Pull `main`, retire the merged `test/accessible-queries` branch          | 1    | `/home/nn/Projects/scandible` (git)                          | ✅      |
| T2  | Commit this handoff and keep it current                                  | 1    | `docs/superpowers/handoffs/`                                 | ✅      |
| T3  | User reviews spec 1's migration revision (`c932561`)                     | 2    | spec 1 on `feat/ui-foundation`                               | ✅      |
| T4  | Put the migration's deliberate losses into spec 1's visual review        | 2    | spec 1 _Verification that fails closed_ › _Visual review_    | ✅      |
| T5  | Rebase `feat/ui-foundation` onto `main`                                  | 2    | `feat/ui-foundation` (git)                                   | ✅      |
| T6  | Rewrite spec 1's plan with one Opus agent (replaces `c5090e8`)           | 2    | `docs/superpowers/plans/2026-11-04-ui-foundation.md`         | ✅      |
| T7  | User reviews the plan; execute subagent-driven; PR when asked            | 2    | `feat/ui-foundation`                                         | ✅      |
| T8  | Brainstorm and spec spec 2, the setup page redesign (B2)                 | 3    | new `docs/superpowers/specs/<date>-setup-redesign-design.md` | —       |
| T9  | Brainstorm and spec spec 3, the play screen for any size                 | 3    | new `docs/superpowers/specs/<date>-play-screen-design.md`    | —       |
| T10 | Run spec 1's two open human checks (focus rings, overlay fade)           | 2    | a person, on the live site                                   | —       |
| T11 | Retire the merged `feat/ui-foundation` branch                            | 1    | `/home/nn/Projects/scandible` (git)                          | ✅      |
| T12 | Land this handoff update                                                 | 1    | this file, on a `docs/` branch                               | ✅      |
| Q1  | `Gs1Breakdown.test.ts` alone is 3.00× slower (per-file budget 2.5×)      | 4    | decision log only                                            | —       |
| Q2  | When to take SvelteKit 3.0                                               | 4    | a separate upgrade spec or PR                                | —       |
| Q3  | Should the color guard also catch palette classes and other color forms? | 4    | `src/colors.test.ts`, in spec 2's plan                       | —       |
| F1  | Two Svelte `state_referenced_locally` warnings in the RowEditor test run | 4    | `src/lib/components/RowEditor.svelte.test.ts`                | —       |
| F2  | Vite warns that one chunk is 573 kB                                      | 4    | `vite.config.ts` or the bwip-js import                       | —       |
| F3  | Small test-file debt left by the migration                               | 4    | three test files                                             | —       |
| F4  | GitHub Actions: Node 20 actions and the Ubuntu 26 runner move            | 4    | `.github/workflows/deploy.yml`                               | —       |
| F5  | Small debt carried over from spec 1's reviews                            | 4    | the files named per sub-point                                | —       |

---

## Tier 1 — before anything else

### T1 — Pull `main`, retire the merged `test/accessible-queries` branch

- **Where:** main checkout `/home/nn/Projects/scandible`, on branch `test/accessible-queries` at
  `8a7b509`. Local `main` is at `797bbad`; `origin/main` is at `384b359`, the squash merge of
  PR #9. `git diff --stat 8a7b509 384b359` prints nothing (the trees are identical; verified
  2026-11-04). `origin/test/accessible-queries` still exists at `8a7b509`. No linked worktree is
  registered (`git worktree list` shows only the main tree). `.superpowers/` is git-ignored and
  holds two stale brainstorm folders (`.superpowers/brainstorm/`); the companion server is not
  running.
- **Problem:** the next session would branch from a stale `main` or keep working on a merged
  branch.
- **If unaddressed:** spec 1's rebase (T5) targets the wrong base, and a new branch carries the
  migration twice (once squashed, once as 14 commits).
- **Decision owed:** delete `origin/test/accessible-queries` too? The repo's practice so far has
  been to leave merged branches on the remote (`feat/gs1-raw-scan-data`, `fix/aztec-test-timeout`
  and others are still there). PR #9's rerun line uses `pull/9/head`, which survives a branch
  deletion either way. (Recommend: delete the local branch only; leave the remote, as before.)
- **Recommended resolution:**
  ```bash
  git checkout main
  git pull --ff-only
  git diff --stat 8a7b509 HEAD        # must print nothing
  git branch -D test/accessible-queries
  ```
  `-D` is needed because a squash merge does not mark the branch as merged; the empty diff is the
  proof that nothing is lost.
- **Acceptance:** `git rev-parse --short HEAD` prints `384b359` on `main`;
  `git branch --list test/accessible-queries` prints nothing; `git status --short` shows at most
  this handoff file as untracked.
- **Status:** ☑ closed — 2026-11-04; remote branch kept.

### T2 — Commit this handoff and keep it current

- **Where:** this file, `docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md`, written
  untracked into the working tree on 2026-11-04 (the user asked for the handoff, not a commit).
- **Problem:** an untracked file is easy to lose to a `git clean` or a checkout in another tree.
- **If unaddressed:** the next session after this one starts without the tracker.
- **Decision owed:** commit it on `main` (as the GS1 handoff was), or on `feat/ui-foundation` so it
  lands with spec 1's PR? (Recommend: on `main`, after T1, so every branch sees it.)
- **Recommended resolution:** after T1:
  ```bash
  npx prettier --check docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md
  git add docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md
  git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "docs: add the UI revamp handoff"
  ```
  Push only when the user asks. Update the Status line, the ticks and the Decision log as items
  close.
- **Acceptance:** `git log -1 --format=%s -- docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md`
  prints the commit subject; `npm run lint` is clean.
- **Status:** ☑ closed — 2026-11-04; committed on `feat/ui-foundation` (the user's choice), so it reaches `main` with spec 1's PR.

### T11 — Retire the merged `feat/ui-foundation` branch

- **Where:** local branch `feat/ui-foundation` at `ae91793` and `origin/feat/ui-foundation`.
  `main` is at `fde5de1`, the squash merge of PR #10; `git diff --stat feat/ui-foundation main`
  prints nothing (the trees are identical; verified 2026-11-04). Only the main worktree is
  registered.
- **Problem:** a merged branch kept locally invites building spec 2 on it.
- **If unaddressed:** spec 2 branches from the wrong base, or carries spec 1's 28 commits beside
  their squash.
- **Decision owed:** delete `origin/feat/ui-foundation` too? The practice so far is to keep merged
  branches on the remote (T1). (Recommend: delete the local branch only.)
- **Recommended resolution:**
  ```bash
  git checkout main
  git pull --ff-only
  git diff --stat feat/ui-foundation HEAD   # must print nothing
  git branch -D feat/ui-foundation
  ```
- **Acceptance:** `git branch --list feat/ui-foundation` prints nothing; `main` is at or after
  `fde5de1`.
- **Status:** ☑ closed — 2026-11-04 (session 3); trees identical, local branch deleted, remote kept.

### T12 — Land this handoff update

- **Where:** this file, edited in `main`'s working tree after `fde5de1` and not committed
  (2026-11-04).
- **Problem:** the update sits uncommitted on `main`, and the repo's practice is no direct commits
  to `main`.
- **If unaddressed:** the next branch picks it up by accident, or a `git checkout -- .` loses it.
- **Decision owed:** a docs-only PR (recommended: the user squash-merges, so mixing it into the
  F1 and F3 `test:` PR would fold it into a `test:` commit), or a docs commit on that branch.
- **Recommended resolution:**
  ```bash
  git switch -c docs/ui-revamp-handoff-after-spec-1
  git add docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md
  git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "docs: update the UI revamp handoff after spec 1 merged"
  ```
  Push and open the PR only when the user asks; no AI attribution.
- **Acceptance:** `git status --short` on `main` prints nothing; the commit touches only this file;
  `git log -1 --format=%B` has no `Co-Authored-By` or `Generated with` line.
- **Status:** ☑ closed — 2026-11-04 (session 3); committed on `feat/setup-redesign` (the user's
  choice, as for T2), so it reaches `main` with spec 2's PR.

---

## Tier 2 — spec 1, the UI foundation, in order

### T3 — User reviews spec 1's migration revision (`c932561`)

- **Where:** branch `feat/ui-foundation` (local only, never pushed), commits `e03cd43` (spec),
  `11da147` (spec after a four-lens Sonnet review; the user approved this version), `c5090e8` (the
  old plan, superseded by T6), `c932561` (this revision). Review it with
  `git diff 11da147 c932561 -- docs/superpowers/specs/2026-11-04-ui-foundation-design.md` (63
  insertions, 49 deletions).
- **Problem:** `c932561` applies the migration spec's _Effect on spec 1_ section and two owner
  answers. It was drafted by one Sonnet agent and checked by the controller, but the user has not
  read it. It:
  - adds a dependency note under the title;
  - measures "no existing test file changes" against `main` after the migration (Intent, Done
    means 1; _Testing_ › _The existing suite_);
  - states the `--input-color` override applies only while a control is
    `:not(:focus, :focus-within, :checked, :indeterminate)` (_Overrides of daisyUI defaults_);
  - makes the share URL field fill its row: the share row becomes flex, the field gets
    `flex-1 min-w-0` (_`ShareLink.svelte`_; _Rules for every file_ 4);
  - has `SecondsSlider` take `rangeAriaLabel` "Dwell"/"Gap" at every call site, keeping the names
    the migration gave the sliders (_`SecondsSlider.svelte`_; rule 2);
  - drops the class-contract rule, the `ctl-`/`row-` prefix rule, the `visually-hidden` header-spans
    rule, the bare-select and leading-text rules for `FormatSelect` and `Field`, and M10's DOM-shape
    facts; keeps the stage classes, the overlay's `hidden` class and CSS-hook classes (rule 1);
  - says the new component tests follow the migration's _Query rules_ and its lint block
    (_Testing_ › _New unit tests_).

  Spec 1 never had `data-tone` text; only the old plan did.

- **If unaddressed:** T6 writes a plan against a spec the user has not approved.
- **Decision owed:** approve `c932561` as written, or ask for changes.
- **Recommended resolution:** show the user the diff above and the list, and ask for approval. If
  they ask for changes, revise in a worktree outside the repo (or on the branch after T5), run
  Prettier, and amend or add a commit.
- **Acceptance:** a Decision log row records the user's approval of a named commit.
- **Relates to:** T4, T6
- **Status:** ☑ closed — 2026-11-04; approved as written.

### T4 — Put the migration's deliberate losses into spec 1's visual review

- **Where:** spec 1, _Verification that fails closed_ › _Visual review_ (line 587 at `c932561`),
  which lists screenshots of the setup page, the per-row editor, the switch note, the share QR, the
  step overlay and the finish screen. PR #9's body, section _Deliberate losses_, lists what the
  migrated tests no longer guard.
- **Problem:** the migration accepted six losses on the grounds that they are visual or DOM shape,
  and said spec 1's visual review covers two of them. But that section names screens, not checks,
  and spec 1's restyle touches exactly these things. No test fails if the restyle:
  1. changes a verdict's **color** (the `valid`, `invalid` and `lenient` classes);
  2. un-hides the GS1 breakdown's **column headers** (the `visually-hidden` spans in
     `Gs1Breakdown.svelte`), adding an "Application Identifier · Name · Value" row to every open
     breakdown;
  3. moves a row's GS1 **breakdown out of its place** right after the row's controls in
     `RowEditor.svelte`, for example into the controls' flex line;
  4. breaks up the overlay's **`ctl-group` pairs** (each slider beside its seconds field) in
     `play/+page.svelte`;
  5. moves a control's **visible label text** out of its wrapping `<label>`. The names now come
     only from the accessible name, so an `aria-label` that drifts from the visible text passes.
     The labels in question are the error-correction field, the format select, the lax box and the
     share QR level.
- **If unaddressed:** a regression in any of these ships with a green suite and a visual review that
  never looked for it.
- **Decision owed:** add these as visual-review checks (recommended), or as human checks the user
  ticks in the PR?
- **Recommended resolution:** append to _Visual review_, after its first paragraph:
  ```markdown
  The migration to accessible test queries left five things to this review, because no test reads
  them any more (PR #9, _Deliberate losses_). The author checks each one on the before-and-after
  screenshots and says in the PR that it holds:

  1. each verdict keeps its status color: valid green, invalid red, lenient amber;
  2. an open GS1 breakdown shows no visible header row (its column headers stay visually hidden);
  3. in the per-row editor, a GS1 row's breakdown sits directly under that row's controls;
  4. in the step overlay, each slider sits beside its seconds field;
  5. every control's visible label still shows the text that names it.

  The screenshots therefore include the validation list with valid, invalid and lenient entries, and
  a GS1 row with its breakdown open, in both the list and the per-row editor.
  ```
  Then add the open-breakdown and three-verdict screenshots to the list in the first paragraph.
- **Acceptance:** `grep -n 'visually hidden' docs/superpowers/specs/2026-11-04-ui-foundation-design.md`
  finds the new check under _Visual review_; the screenshot list names an open GS1 breakdown; the
  user approves the change (T3's decision covers it if done together).
- **Relates to:** T3, T6, T8 (spec 2 can restore check 5 with visible labels)
- **Status:** ☑ closed — 2026-11-04; `d563df1`.

### T5 — Rebase `feat/ui-foundation` onto `main`

- **Where:** `feat/ui-foundation`, four commits on `797bbad` (`e03cd43`, `11da147`, `c5090e8`,
  `c932561`), touching only `docs/superpowers/specs/2026-11-04-ui-foundation-design.md` and
  `docs/superpowers/plans/2026-11-04-ui-foundation.md`. Never pushed.
- **Problem:** the branch predates the migration on `main`; spec 1's plan and its guard
  (`git diff --name-only --diff-filter=M main -- '*.test.ts'`) must be measured against `384b359`.
- **If unaddressed:** the plan writer (T6) reads the old test files, and Done means 1 compares
  against the wrong `main`.
- **Decision owed:** none — mechanical. The two files do not exist on `main`, so no conflict is
  possible.
- **Recommended resolution:** after T1 (and T4, if T4 is committed on the branch first):
  ```bash
  git checkout feat/ui-foundation
  git rebase main
  ```
  Keep `c5090e8` in history; T6 replaces the file's content in a new commit, and the PR squashes.
- **Acceptance:** `git merge-base feat/ui-foundation main` is `384b359…`;
  `git diff --stat main feat/ui-foundation` names only the two docs files.
- **Status:** ☑ closed — 2026-11-04; merge-base `384b359`, only the two docs files differ from `main`.

### T6 — Rewrite spec 1's plan with one Opus agent (replaces `c5090e8`)

- **Where:** `docs/superpowers/plans/2026-11-04-ui-foundation.md` at `c5090e8` (1,812 lines, 15
  tasks: toolchain + theme + `check-css`; `stage-check`; contrast and color guards; `Field`; `Note`;
  `SecondsSlider`; `FormatSelect` and `EccSelect`; `barcode-caps.css`; restyle the setup page;
  restyle `ValidationList`, `Gs1Breakdown` and `ShareLink`; restyle `RowEditor`; restyle the play
  page; the class-name collision audit; documentation; verification and the PR body).
- **Problem:** the old plan cites test lines and class names that the migration moved or removed
  (for example `RowEditor.svelte.test.ts:185`'s class-list read), and its three owner questions are
  now settled. Q1 (`data-tone`) is obsolete: Note takes its tone as Tailwind classes. Q2 (the
  border override) and Q3 (the share field width) are stated in the revised spec.
- **If unaddressed:** implementers follow stale anchors and constraints, or re-introduce the class
  contract the migration removed.
- **Decision owed:** none beyond T3 and T4, which must close first.
- **Recommended resolution:** dispatch one Opus agent with this brief (adapt the paths):
  ```text
  Write the implementation plan for docs/superpowers/specs/2026-11-04-ui-foundation-design.md on
  branch feat/ui-foundation (rebased on main 384b359). It replaces the plan at
  docs/superpowers/plans/2026-11-04-ui-foundation.md (c5090e8): keep its task shape where it still
  holds, but re-derive every anchor, command and expected output from the current main.
  Follow the writing-plans skill, and the house style of
  docs/superpowers/plans/2026-11-04-accessible-test-queries.md (Global Constraints, Plan decisions,
  Review Focus, per-task Files/Interfaces/Steps with exact expected output).
  Binding: the spec wins over the old plan. New component tests follow CONTRIBUTING.md "Writing
  tests" and fall under the eslint-plugin-testing-library block. No existing *.test.ts changes
  (Done means 1). stage-check uses the sendBeacon ready message (a spike passed 10/10 on
  2026-11-04: Firefox headless --screenshot, fresh profile, detached spawn killed by process
  group). The visual review includes the five checks the spec lists for the migration's losses.
  Verify every command and expected output in a throwaway worktree outside the repository and
  remove it afterwards. Every commit must keep npm test and npm run lint green.
  Commit only the plan file, as "docs: rewrite the UI foundation implementation plan after the test
  migration", with git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit.
  NO AI attribution in the commit. Do not push. Run Prettier on the file. List "Questions for the
  owner" at the top, each with the conservative reading the plan follows. Reply in at most 300
  words: commit hash, task list, questions, cleanup state.
  ```
  Then verify the commit yourself: one commit, the repository author, no attribution, only the plan
  file, `npx prettier --check` passes, `git worktree list` shows only the main tree, and
  `git status --short` is clean.
- **Acceptance:** the checks above pass, and
  `grep -nE 'data-tone|RowEditor.svelte.test.ts:185|ctl-.*prefix' docs/superpowers/plans/2026-11-04-ui-foundation.md`
  prints nothing.
- **Relates to:** T3, T4, T5, T7
- **Status:** ☑ closed — 2026-11-04; plan `88ec9ed` (1 Opus agent), verified; its three owner questions answered in `a2454b9`.

### T7 — User reviews the plan; execute subagent-driven; PR when asked

- **Where:** `feat/ui-foundation` after T6.
- **Problem:** the plan is the last gate before code. The user reviews it and picks the execution
  method; nothing is implemented before that.
- **If unaddressed:** n/a (this is the series' next delivery).
- **Decision owed:** the execution method, and whether to add one Fable final-acceptance judge.
  (Recommend: subagent-driven; Opus implementers for judgment tasks and Sonnet for tasks whose
  code is in the plan; Sonnet per-task reviewers; final review in Opus chunks; no Fable unless the
  user asks.)
- **Recommended resolution:** relay the plan's task list and questions, ask for review, then run the
  `subagent-driven-development` skill with a ledger under `.superpowers/sdd/`. Spec 1's human
  checks (_Verification that fails closed_ › _Human checks_: Chrome and Safari, focus rings, the
  3 s overlay fade, a real phone, the Pages deploy under `/scandible`) go in the PR as open, not
  passed. Push and open the PR only when the user asks.
- **Acceptance:** spec 1's Done means 1–5 are each shown with evidence in the PR body;
  `git diff --name-only --diff-filter=M main -- '*.test.ts'` prints nothing; `npm run build`
  (with `check-css`) and `npm run stage-check` pass.
- **Status:** ☑ closed — 2026-11-04; PR #10 squash-merged as `fde5de1` and deployed (run
  41928013081). All 15 tasks done subagent-driven; the final review (4 Opus chunks) found 0
  Critical and 4 Important, all fixed in one wave (`5bc18dd..a636708`) and re-reviewed. A1 to A10
  and V1 to V5 PASS. H1: Chrome fine at a glance on Android; Safari a won't-do (the user's call).
  H4: fine at a glance on an Android phone. H5: deploy succeeded and the live page renders. H2 and
  H3 move to T10.

### T10 — Run spec 1's two open human checks (focus rings, overlay fade)

- **Where:** PR #10 body, _Verification_ rows H2 and H3 and _Human checks (open)_; the live site
  https://nzneit.github.io/scandible/. The overlay's focus override is
  `.overlay :global(:focus-visible)` in `src/routes/play/+page.svelte`.
- **Problem:** static screenshots cannot show focus or a fade, so both checks are still
  unverified.
- **If unaddressed:** an invisible focus ring on the dark overlay (daisyUI's default ring is
  2.66:1 there; spec 1 recolors it to `neutral-content`) or an overlay that snaps away goes
  unnoticed until spec 3 rebuilds the overlay.
- **Decision owed:** none — a person runs them, on a desktop browser with a keyboard.
- **Recommended resolution:**
  - H2: on the live setup page, press Tab through every control; then open a deck in Step mode
    (for example `https://nzneit.github.io/scandible/play#codes=036000291452&fmt=upc&mode=step`),
    move the mouse to show the overlay and Tab through its controls. Every focused control shows a
    visible ring.
  - H3: on the play page, show the overlay and keep the mouse still. After about 3 s it fades out
    (an opacity transition) rather than vanishing at once.
- **Acceptance:** a Decision log row for each check that names the browser, or a FAILED note with
  what was seen.
- **Relates to:** T9
- **Status:** ☐ open — runs now as spec 3's H2 on the new overlay (`feat/play-screen`): a keyboard
  pass with these two checks; closes when H2 is done.

---

## Tier 3 — specs 2 and 3, not yet brainstormed

### T8 — Brainstorm and spec spec 2, the setup page redesign (B2)

- **Where:** spec 1 _Series_ item 2 holds the user's decisions:
  - two panes, codes wide on the left and settings on the right;
  - a bar pinned to the window bottom with the code count, **Share** and **Start** (the user chose
    the bottom over a top bar, accepting that it rides on the Android keyboard);
  - Share becomes a panel opened from that bar;
  - a `Section` component;
  - values shown on the speed, rotation and skew sliders;
  - the Editor and Playback selects as segmented buttons;
  - each hint next to the control it explains.

  Tests change here, on purpose. The migration spec's _Notes for later specs_ › _Spec 2_ adds:
  - visible labels instead of `aria-label`s (WCAG 2.5.3, Label in Name);
  - words for the ✓/✗ verdicts (screen readers may skip the glyphs; unverified);
  - `aria-valuetext` in degrees for rotation and skew;
  - `role="alert"` or `role="status"` for the file error;
  - consider naming the share field "Share link address".

- **Carry-ins from spec 1** (PR #10 _Screenshots_; `.superpowers/records/2026-11-04-ui-foundation/`
  `task-15-report.md` and `final-review-C.md`), all accepted by spec 1 and spec 2's to revisit:
  - the file input is a bordered daisyUI `file-input-sm`, 261×32 px, where `main` showed about
    173 px of a native control;
  - at 390 px a long GS1 payload wraps to two lines in the per-row editor (14 px mono, was 12 px);
  - `ShareLink`'s `.copy-status` is an always-rendered live region with `basis-full`, so the empty
    status adds an 8 px row gap at rest. The Share panel replaces this row; keep the live region
    and never hide it with `display: none`;
  - disabled Move up and Move down are about 1.5:1 (spec 1 exempted disabled controls), and the
    setup page's range tracks about 1.2 to 1.3:1;
  - at desktop widths the page is one column about 590 px wide with wide empty margins, which B2's
    two panes answer;
  - the row controls wrap at 390 px exactly as on `main` (measured), and the QR row's
    error-correction select pushes the move buttons down at every width;
  - new markup follows `CONTRIBUTING.md` _Styling_; decide Q3 (the color guard's scope) in spec 2's
    plan, and fold F5 c (RowEditor's repeated verdict conditions) into the row editor redesign.
- **Problem:** not started. Two of the migration's losses are spec 2's to settle:
  - Visible labels (`<label for>` or `aria-labelledby`) let tests assert the label text again with
    `getByLabelText`, which restores loss 5 in T4.
  - The row editor redesign decides where the GS1 breakdown sits. Giving each row's controls
    `role="group"` and a name (for example "Controls of code 1") would let a test assert
    `not.toContainElement` again and restore loss 3.
- **If unaddressed:** n/a (future work).
- **Decision owed:** settled. Spec 1 has merged (`fde5de1`), and Q2 puts SvelteKit 3 after the
  series, so spec 2 starts now on the current toolchain (session 3).
- **Recommended resolution:** after spec 1 merges, run the `brainstorming` skill (architectural
  path). Reuse the B2 mockup decision, and offer the visual companion when a layout question comes
  up. Run a multi-lens review before asking for approval.
- **Acceptance:** a spec file under `docs/superpowers/specs/`, reviewed and approved by the user,
  that answers each carry-in above.
- **Status:** ☐ open — spec approved 2026-11-04 (session 3): `e1dccaf`, marked approved in
  `6b21526`, on `feat/setup-redesign`; it answers every carry-in in its _Carry-ins_ table. Plan
  `a0c5784` (1 Opus agent, 11 tasks), accepted with its three readings. Implemented
  2026-11-05, subagent-driven: code head `de71258`; 921 tests, svelte-check 0/0, stage-check 8 PASS;
  final review in three Opus chunks, one fix wave, clean re-review; fail-closed record all PASS but
  the human checks H1 to H3 (open). Run record (ledger, rulings R1 to R14, reports, shots) kept
  local in `.superpowers/records/2026-11-04-setup-redesign/` (git-ignored). PR not opened. Mockups: `.superpowers/brainstorm/2964599-1793836118/content/`
  (`row-editor-layout.html`, `page-layout.html`; git-ignored, local).

### T9 — Brainstorm and spec spec 3, the play screen for any size

- **Where:** spec 1 _Series_ item 3: the overlay, the step readout and the finish screen for
  phones, tablets and monitors; touch targets; small-screen layout; icons where they help.
  The migration spec's _Notes for later specs_ › _Spec 3_ adds:
  - the overlay's faded state, which is today a class only. The play test reads it through the
    marked fallback `faded()` in `src/routes/play/page.test.ts`; spec 3 can remove that fallback.
  - the finish screen's semantics: should it become a dialog?
  - roles or names for the barcode items, if wanted. The stage tests read classes on purpose.
- **Carry-ins from spec 1** (PR #10 _Screenshots_, overlay and finish; `task-15-report.md`):
  - the overlay's range tracks and thumbs follow `currentColor` and are faint on the dark
    `bg-neutral/85` fill, where `main`'s were blue on grey;
  - the overlay grew from about 837×44 to 915×52 px at 1280 px (`btn-sm`, 32 px tall buttons);
    touch targets are spec 3's;
  - the gap from a seconds field to its "s" is 4 px (was 6 px), and Firefox shows the number spin
    buttons in the seconds fields under daisyUI's `appearance: none`;
  - the finish text is `text-2xl` with `mb-6`, which restores `main`'s 40 px gap above Restart;
  - T10's focus-ring and fade results feed the overlay redesign; run `npm run stage-check` after
    every play-page change.
- **Problem:** not started. The overlay-wrapper loss (T4 check 4) is spec 3's to revisit.
- **If unaddressed:** n/a (future work).
- **Decision owed:** order (after spec 2, as the series says) and whether the finish screen becomes
  a dialog.
- **Recommended resolution:** brainstorm after spec 2, as for T8.
- **Acceptance:** an approved spec that decides the overlay's faded state and the finish screen's
  role.
- **Status:** ☐ open — spec approved `01b6b7d` (text `7f4388b`) on `feat/play-screen`. Plan
  `6ac20ed` (12 tasks); its eight readings accepted, spec amended to match (`79c3be6`).
  Implemented 2026-11-05, subagent-driven: code `a9b1b07`..`31a861a`, branch head `a592c7c` after
  the final review's fix wave and spec amendment; 1000 tests, svelte-check 0/0, stage-check
  8 PASS. Fail-closed record (`verification.md`, `pr-body.md`, probe, shots) kept local in
  `.superpowers/records/2026-11-05-play-screen/` (git-ignored); every row PASS but C8 (UNVERIFIED:
  the faded overlay's opacity after focus cannot be measured in headless Firefox; H2 checks it)
  and the human checks H1 to H4 (open). PR not opened.

---

## Tier 4 — small debt and open questions

### Q1 — `Gs1Breakdown.test.ts` alone is 3.00× slower (per-file budget 2.5×)

- **Where:** PR #9 body, _Timing per file_: `Gs1Breakdown.test.ts` went from 0.03 s to 0.08 s
  (3.00×; 2.88× at an earlier run). The six files together went from 2.30 s to 3.36 s (1.46×,
  inside the 2.5× budget). The migration spec's _Done means_ 6 is worded per file.
- **Problem:** the PR left this to the user, who merged without recording a decision.
- **Decision owed:** accept the excess, or narrow that file's queries.
- **Recommended resolution:** accept, and record it. The excess is 0.05 s, the ratio moves between
  runs at this size, and narrowing would mean editing a test file outside a spec.
- **Acceptance:** a Decision log row.
- **Status:** ☑ closed — 2026-11-04; accepted.

### Q2 — When to take SvelteKit 3.0

- **Where:** `package.json` (SvelteKit 2.70; Svelte 5.56). SvelteKit 3.0 shipped on 2026-10-01.
- **Problem:** the UI revamp deliberately does not include the upgrade.
- **Decision owed:** before spec 1, between specs, or after the series. (Recommend: after spec 1
  merges and before spec 2, in its own PR, so spec 2's tests are written once against 3.0.)
- **Recommended resolution:** a separate spec or bounded PR when the user chooses.
- **Acceptance:** a Decision log row with the chosen slot.
- **Status:** ☑ closed — 2026-11-04 (session 3); after the UI series. SvelteKit 3.1.1 (the latest
  on that day) needs Vite 8, `@sveltejs/vite-plugin-svelte` 7 and TypeScript 6, so vitest and
  `@tailwindcss/vite` move too: a toolchain change of its own. The setup-page tests touch SvelteKit
  only through three `vi.mock` lines, so spec 2 gains little from taking it first. Implemented on `build/sveltekit-3` by
  `docs/superpowers/specs/2026-11-06-sveltekit-3-upgrade-design.md`.

### F1 — Two Svelte `state_referenced_locally` warnings in the RowEditor test run

- **Where:** `npm test` output for `src/lib/components/RowEditor.svelte.test.ts` (warnings point at
  about lines 225 and 229 at `384b359`). They come from the test file's runes code and were
  already present before the migration: compiling `main`'s older version of the file gives the same
  two.
- **Problem:** noise in the test output, which this repo's reviews treat as a finding.
- **If unaddressed:** real warnings hide among known ones.
- **Decision owed:** when. Spec 1's Done means 1 forbids changing existing test files in its PR, so
  this lands in its own small PR, either before spec 1's branch is cut from `main` or after spec 1
  merges.
- **Recommended resolution:** run
  `npx vitest run src/lib/components/RowEditor.svelte.test.ts 2>&1 | grep -A5 state_referenced_locally`,
  read the flagged lines, and read the state through a closure or `$derived` as the Svelte message
  suggests, without changing any assertion or event.
- **Acceptance:** that command prints nothing; the file still passes 18 of 18 tests.
- **Status:** ☑ closed — 2026-11-04 (session 3); PR #11, squash-merged as `86e28a5`. The warnings came
  from passing `$state` rows as a plain prop; rows now go through a getter and are read through
  closures. 0 warnings, 18 of 18 pass.

### F2 — Vite warns that one chunk is 573 kB

- **Where:** `npm run build` output: one chunk over Vite's 500 kB limit. It is older than the
  migration, which added no app import; the barcode engine (bwip-js) is the likely source.
- **Problem:** noise in the build output, plus a larger first load on the play page.
- **Decision owed:** accept (raise `build.chunkSizeWarningLimit` with a comment), or split the
  engine with a dynamic `import()`.
- **Recommended resolution:** decide during spec 1, which already measures CSS and JS size (spec 1
  M2). First confirm which module the chunk holds: the warning names the chunk file, and its size
  can be compared with a build of `main`.
- **Acceptance:** the build prints no chunk-size warning, or a Decision log row accepts it.
- **Status:** ☑ closed — 2026-11-04; accepted, listed in spec 1's PR.

### F3 — Small test-file debt left by the migration

- **Where and what:**
  - a. `src/lib/components/ValidationList.test.ts`: most single-render tests query through
    `within(container)` rather than `screen`, as the migration's plan mandated. CONTRIBUTING's
    rule is `screen`.
  - b. `src/routes/play/page.test.ts`, "renders a upc list with neither 2D class": its two absence
    checks (`stage('.barcode-item--2d')`, `stage('.barcode-item--qr')` with length 0) have no
    presence check, so the test passes if nothing renders. `main` had the same gap.
  - c. `src/lib/components/Gs1Breakdown.test.ts`, the `it.each` "AI" check uses
    `not.toHaveTextContent(/\bAIs?\b/)` (and the same pattern on the accessible name). It misses
    "AI" run straight into what follows, such as `AI10`, because there is no word boundary between
    `I` and `1`. `main` had the same gap.
- **Problem:** none weakens what the migration proved; each is a small inconsistency or a gap
  inherited from `main`.
- **Decision owed:** when, for the same reason as F1. (Recommend: bundle a, b and c with F1 in one
  `test:` PR.)
- **Recommended resolution:**
  - a. replace `within(container)` with `screen` in tests that render once;
  - b. add `expect(stage()).toHaveLength(4)` before the two absence checks (the default deck has 2
    valid codes, shown twice each, as the file's first test asserts);
  - c. use `/\bAIs?(?![A-Za-z])/` in both assertions: it also matches `AI10`, and still skips words
    such as `AIM`. Keep it case-sensitive.
- **Acceptance:** the three files pass; `npm run lint` is clean; for b, deleting the deck's codes
  makes the test fail.
- **Relates to:** F1
- **Status:** ☑ closed — 2026-11-04 (session 3); PR #11, squash-merged as `86e28a5` (a, b and c, with
  b's deliberate break and c's pattern probe re-run by the controller).

### Q3 — Should the color guard also catch palette classes and other color forms?

- **Where:** `src/colors.test.ts` (the `COLOR` and `ARBITRARY_COLOR` patterns and `scanColors`);
  `CONTRIBUTING.md` _Styling_, which now says the test sees only hex, `rgb()` and `hsl()`; final
  review chunk A, Minor M3, in `.superpowers/records/2026-11-04-ui-foundation/final-review-A.md`.
- **Problem:** the guard flags hex, `rgb()`/`rgba()` and `hsl()`/`hsla()` literals and
  arbitrary-value classes. Named colors (`white`), `oklch()`, `oklab()`, `lab()`, `lch()`, `hwb()`,
  `color()`, and Tailwind's default palette classes (`text-red-600`, `bg-zinc-100`) pass it.
  Tailwind 4 still ships its palette beside daisyUI, so those classes build. None exist today.
- **If unaddressed:** spec 2 writes a lot of new markup. A palette class can slip in, look right
  in the light theme, and break the token-only rule that dark mode will rely on.
- **Decision owed:** (a) widen `src/colors.test.ts`; (b) remove Tailwind's palette in
  `src/styles.css` (`@theme { --color-*: initial; }`); or (c) leave it to review, as now.
- **Recommended resolution:** (a), in spec 2's plan and test-first: flag a palette class,
  `(?:text|bg|border|ring|outline|fill|stroke|from|via|to|accent|caret|decoration|divide|placeholder|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}`
  as a whole class (daisyUI's `bg-neutral/85` and `text-neutral-content` do not match: they have
  no shade number), plus `-black` and `-white` classes, and widen the function alternation to
  `oklch|oklab|lab|lch|hwb|color`. (b) is less code, but first check that daisyUI's tokens survive
  it: `check-css` fails the build if one goes missing.
- **Acceptance:** for (a), fixture rows with `class="text-red-600"` and
  `<style>.x { color: oklch(50% 0.1 30) }</style>` are each flagged, and the real-file test still
  passes; for (b) or (c), a Decision log row.
- **Relates to:** T8
- **Status:** ☐ open — decided 2026-11-04 (session 3): option (a), widened test-first in spec 2's
  plan; spec 2 _Styling_ holds the exact pattern and its known gap (`bg-[red]`).

### F4 — GitHub Actions: Node 20 actions and the Ubuntu 26 runner move

- **Where:** `.github/workflows/deploy.yml`: `actions/checkout@v4` (:21), `actions/setup-node@v4`
  (:22), `actions/configure-pages@v5` (:30), `actions/upload-pages-artifact@v3` (:31, which runs
  `actions/upload-artifact@v4`), `actions/deploy-pages@v4` (:43), and `runs-on: ubuntu-latest`
  (:19, :37). PR #10's deploy run 41928013081 printed: "Node.js 20 is deprecated. The following
  actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4,
  actions/configure-pages@v5, actions/setup-node@v4, actions/upload-artifact@v4", and "The
  ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026".
- **Problem:** every deploy warns, and the forced Node 24 run or a later runner change can break
  an action.
- **If unaddressed:** one day a merge to `main` fails to deploy, and the site stays on the old
  build.
- **Decision owed:** none — mechanical. (Pinning `ubuntu-24.04` instead of following
  `ubuntu-latest` is a small choice; recommend following `ubuntu-latest`, since the build is plain
  Node.)
- **Recommended resolution:** for each action, read its latest major
  (`gh api repos/actions/checkout/releases/latest --jq .tag_name`, and the same for `setup-node`,
  `configure-pages`, `upload-pages-artifact` and `deploy-pages`), confirm in its release notes that
  it runs on Node 24, and bump the `@vN` refs in one `ci:` PR. The workflow runs only on `main`,
  so it is verified after the merge.
- **Acceptance:** the first deploy run on `main` after the merge succeeds, and `gh run view <id>`
  lists no Node 20 annotation.
- **Status:** ☑ closed on `build/sveltekit-3` — 2026-11-06; the five majors per
  `docs/superpowers/specs/2026-11-06-sveltekit-3-upgrade-design.md` (step 4). Its Acceptance is that
  spec's H1, after the merge.

### F5 — Small debt carried over from spec 1's reviews

- **Where and what** (the `minor (deferred)` lines of
  `.superpowers/records/2026-11-04-ui-foundation/progress.md` and the `final-review-*.md` reports
  beside it):
  - a. `scripts/stage-check.ts`: a SIGTERM that arrives while `spawnSync` runs a build step is
    handled only at the next `await` (the run still ends with exit 2 after cleanup); a
    `git worktree add` that fails midway leaves a prunable registration; `deckUrl` adds and then
    deletes `mode`; `/scandiblex` counts as under the base for the 404 rule.
  - b. `src/colors.test.ts`: all-hex markup anchors (`href="#fade"`, `#add`) and hex-like
    selectors in a `<style>` block (`#abc`, `[href="#abc"]`) would be flagged. These are false
    positives that fail safe, and none exist today.
  - c. `src/lib/components/RowEditor.svelte`: the verdict conditions are written out once per
    state (around :77-82); a `{@const}` per state would be tidier.
  - d. `src/lib/components/barcode-caps.css:1-2`: the comment says "no layered rule can override
    it", but a layered `!important` still could.
  - e. the build ships 11 unused `.steps .step` rules (about 1.5 kB), because `step` is the app's
    own word and Tailwind scans it. `@source not inline('step');` beside the `hidden` line in
    `src/styles.css` removes them (tested on 2026-11-04, then reverted).
  - f. `src/check-css.test.ts`: parser extras are untested: escapes outside strings, the
    `[data-theme]` operators `~=`, `^=` and `*=`, and attribute-name case.
  - g. `docs/superpowers/plans/2026-11-04-ui-foundation.md` (about :1462) still says `table-xs`,
    while the spec records the owner's `table-sm`. The plan is the historical argument; leave it or
    add a note.
- **Problem:** none changes behavior; each is polish or a false positive that fails safe.
- **If unaddressed:** little; e costs about 1.5 kB on every load.
- **Decision owed:** none — mechanical. Pick per sub-point, or fold each into the spec that next
  touches its file (c into spec 2's row editor, b with Q3).
- **Recommended resolution:** as listed per sub-point; e is one line and a rebuild.
- **Acceptance:** per sub-point; for e, after `npm run build`, no CSS file under `dist/` contains
  `.steps` and `npm test` still passes; for c, `npm test` passes with no test change.
- **Status:** ☐ open — c is folded into spec 2 (its `RowEditor` section); a, b, d, e, f and g
  remain.

---

## Cross-cutting note

T3 and T4 are one conversation with the user: show the `c932561` diff, propose T4's paragraph, and
get one approval for both. Then T5 and T6 run back to back. T6 is the highest-leverage item: every
later task builds on its plan, so verify its commit before relaying it (T6 _Recommended
resolution_). F1 and F3 change existing test files, which spec 1's PR must not do. Land them
before spec 1's branch is cut, or after it merges, never inside it. Specs 2 and 3 (T8, T9) depend
on spec 1's shared components, and T8 is where two of the migration's losses can be restored.

**After spec 1 (`fde5de1`).** Clear T11 and T12 first. F1 and F3 are one `test:` PR, now
unblocked; land it before spec 2's branch is cut, so spec 2 starts from a quiet test run. Q2 then
decides whether SvelteKit 3.0 lands before spec 2 (recommended). T8 brings its carry-in list, Q3
and F5 c into the brainstorm. T10 is a short person check that can run any time; T9's overlay work
uses its results. F4 is independent.

## Decision log

_(Append one row per resolved item: ID · decision taken · file(s) patched · resolver · date.)_

| ID          | Decision taken                                                                                                                                                                                                                                                                                                                    | File(s) patched                                                         | Resolver                              | Date       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- | ---------- |
| T1          | Pulled `main` to `384b359`; deleted local `test/accessible-queries` (empty diff against `main`); kept the remote branch, as before                                                                                                                                                                                                | git only                                                                | user (recommended default), session 2 | 2026-11-04 |
| T2          | Commit the handoff on `feat/ui-foundation`, not on `main`                                                                                                                                                                                                                                                                         | this file                                                               | user                                  | 2026-11-04 |
| T3          | Spec 1's migration revision `c932561` (now `ae089c2`) approved as written                                                                                                                                                                                                                                                         | none                                                                    | user                                  | 2026-11-04 |
| T4          | The five losses become author-made visual-review checks; screenshot list gains the three verdicts and an open GS1 breakdown; spec status set to approved                                                                                                                                                                          | `docs/superpowers/specs/2026-11-04-ui-foundation-design.md` (`d563df1`) | user                                  | 2026-11-04 |
| T5          | Rebased `feat/ui-foundation` onto `main` `384b359`; hash map under _Session facts_                                                                                                                                                                                                                                                | git only                                                                | session 2                             | 2026-11-04 |
| Q1          | `Gs1Breakdown.test.ts` at 3.00× (budget 2.5× per file; 0.05 s excess; total 1.46×) accepted                                                                                                                                                                                                                                       | none                                                                    | user                                  | 2026-11-04 |
| F1, F3      | Land in one `test:` PR after spec 1 merges, not before                                                                                                                                                                                                                                                                            | none yet                                                                | user                                  | 2026-11-04 |
| T6          | Plan rewritten by 1 Opus agent as `88ec9ed`; checked: one commit, repo author, no attribution, only the plan file, Prettier, no stale anchors, clean tree                                                                                                                                                                         | `docs/superpowers/plans/2026-11-04-ui-foundation.md`                    | session 2                             | 2026-11-04 |
| T6 Qs       | All three plan readings accepted; spec amended to match: the seconds field is `w-[4.5rem]` (`4.5em` cut the value off) and takes `text-base-content` (white on white in the overlay)                                                                                                                                              | spec and plan (`a2454b9`)                                               | user                                  | 2026-11-04 |
| F2          | The 573 kB chunk (bwip-js ~447 kB, JsBarcode ~68 kB, GS1 table ~32 kB; ~579 kB after spec 1) accepted; the PR lists it                                                                                                                                                                                                            | none                                                                    | user                                  | 2026-11-04 |
| T7          | Subagent-driven: Opus implementers for Tasks 1, 2, 3, 6, 12, 15, Sonnet for the rest; Sonnet per-task reviewers; final review in 4 Opus chunks before Task 15; no Fable judge                                                                                                                                                     | none                                                                    | user                                  | 2026-11-04 |
| T7 run      | Executed: 15 tasks; 4 Opus final-review chunks found 0 Critical, 4 Important (checkers fail open on Node 24.0/24.1; stage-check Scroll ran at 1366×768; colors guard missed at-rule blocks; switch-note layout), all fixed in one wave and re-reviewed                                                                            | branch `beaa24e..a636708`                                               | session 2                             | 2026-11-04 |
| T7 GS1      | The GS1 breakdown uses daisyUI `table-sm` (12 px), not `table-xs` (11 px); the spec records it                                                                                                                                                                                                                                    | spec, `Gs1Breakdown.svelte` (`a636708`)                                 | user                                  | 2026-11-04 |
| T7 merged   | PR #10 squash-merged as `fde5de1`; Pages deploy run 41928013081 succeeded; the live site serves the Instrument theme                                                                                                                                                                                                              | git only                                                                | user                                  | 2026-11-04 |
| T7 H checks | Chrome on Android fine at a glance (H1 Chrome part, H4); Safari validation a won't-do for spec 1 (H1 Safari part, waived, not passed); H5 deploy verified; H2 and H3 move to T10                                                                                                                                                  | none                                                                    | user                                  | 2026-11-04 |
| T11         | Deleted local `feat/ui-foundation` (tree identical to `main`); kept the remote branch                                                                                                                                                                                                                                             | git only                                                                | session 3 (recommended default)       | 2026-11-04 |
| Q2          | SvelteKit 3 after the UI series, in its own upgrade PR                                                                                                                                                                                                                                                                            | none                                                                    | user                                  | 2026-11-04 |
| F1, F3      | One Sonnet agent prepares the `test:` branch in a throwaway worktree while spec 2 is brainstormed; merged before spec 2's code starts                                                                                                                                                                                             | none yet                                                                | user                                  | 2026-11-04 |
| F1, F3 run  | 1 Sonnet agent, one send-back (F3 a missed the container helpers); controller re-ran every commit; PR #11 squash-merged as `86e28a5`                                                                                                                                                                                              | four test files                                                         | session 3, user merged                | 2026-11-04 |
| T12         | This update committed on `feat/setup-redesign`, as T2 was on `feat/ui-foundation`                                                                                                                                                                                                                                                 | this file                                                               | user                                  | 2026-11-04 |
| T8 design   | Hints as `<details>` disclosures (A); Share as a non-modal panel (A); per-row layout A; visible verdict words (A); color guard widened (Q3 a); a shared `Setup` state class (approach 1); full-page mockup approved                                                                                                               | spec 2                                                                  | user                                  | 2026-11-04 |
| T8 review   | Four Sonnet lenses (codebase fit, tooling probes, UX and accessibility, coherence); all findings judged by the author, five kept as is with reasons in the spec                                                                                                                                                                   | spec 2 (`e1dccaf`)                                                      | session 3                             | 2026-11-04 |
| T8 approved | Spec 2 approved ("Proceed"); one Opus agent writes the plan                                                                                                                                                                                                                                                                       | spec 2 (`6b21526`)                                                      | user                                  | 2026-11-04 |
| T8 plan     | Plan `a0c5784` accepted with its three readings (63 rem sticky threshold, the guide's quoted verdicts updated, "1 degree"); slider minimum stays 1; subagent-driven: Opus and Sonnet implementers, Sonnet task reviewers, three Opus final-review chunks, no Fable                                                                | plan (`a0c5784`)                                                        | user                                  | 2026-11-04 |
| T8 build    | Spec 2 implemented subagent-driven (`371c1c8`..`de71258`): Opus and Sonnet implementers, Sonnet task reviewers, three Opus final-review chunks, one Opus fix wave (a long code widened the page; Close focus; forced colors; guard widened to Tailwind 4.3.4's 26 palettes, a spec erratum), Sonnet audit of the record; no Fable | spec 2 code, docs                                                       | session 3                             | 2026-11-05 |
| T9 build    | Spec 3 implemented (`a9b1b07`..`31a861a`), 1000 tests; the record's non-PASS rows: C8 (the faded overlay's opacity after focus, unmeasurable headless) and H1 to H4; H1 to H4 open; Opus and Sonnet implementers, Sonnet task reviewers, three Opus final-review chunks, one Opus fix wave, a Sonnet re-review; 0 Fable           | spec 3 code, docs                                                       | session 3                             | 2026-11-05 |
| Q2 build    | SvelteKit 3.1.1 with Vite 8, vite-plugin-svelte 7, TypeScript 6, Vitest 5 and jsdom 31, in five step commits on `build/sveltekit-3` (spec `2026-11-06-sveltekit-3-upgrade-design.md`)                                                                                                                                             | toolchain, `src/` imports, `vite.config.ts`                             | SvelteKit 3 session                   | 2026-11-06 |
| F4          | `actions/checkout` v7, `setup-node` v7, `configure-pages` v6, `upload-pages-artifact` v5, `deploy-pages` v5; `ubuntu-latest` kept; acceptance is the spec's H1, after the merge                                                                                                                                                   | `.github/workflows/deploy.yml`                                          | SvelteKit 3 session                   | 2026-11-06 |

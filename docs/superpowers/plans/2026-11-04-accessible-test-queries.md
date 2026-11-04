# Accessible Test Queries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The six UI test files find elements by role, label and text and assert what a user can
observe, with the same tests, the same events and the same strength, proven by a committed checker
that fails closed and is deleted in the PR's last commit.

**Architecture:** Task 1 adds jest-dom and the testing-library lint block, which ignores the six
files until each is migrated. Task 2 adds the 15 accessible-name fixes. Task 3 adds
`scripts/verify-test-migration.ts`, which copies `main`'s six test files next to the branch's,
runs both sets through a temporary Vitest config that records assertion counts, and applies 20
deliberate breaks and 3 controls one at a time. Tasks 4 to 10 migrate one file each (the setup page
takes two tasks), each proving itself with a partial checker run. Task 11 documents the rules, and
Task 12 records the acceptance run and deletes the script.

**Tech Stack:** SvelteKit 2.70, Svelte 5.56 runes, TypeScript 5.9 strict with `noUnusedLocals` and
`noUnusedParameters`, Vitest 3.2.7, @testing-library/svelte 5.4.2 on jsdom 24, ESLint 10.4.1 flat
config, Node v24.17.0, which runs the checker by type stripping. New dev dependencies, pinned
exactly: @testing-library/jest-dom 7.0.1, @testing-library/dom 10.4.1,
eslint-plugin-testing-library 7.16.2.

**Spec:** `docs/superpowers/specs/2026-11-04-accessible-test-queries-design.md`, approved in
`e7cd31a`. Section names in _italics_ are the spec's; read the named section before the step that
cites it. Where this plan and the spec disagree, the spec wins, except where _Questions for the
owner_ or _Plan decisions_ below say otherwise; report any other disagreement.

## Questions for the owner

The plan proceeds on the most conservative reading of each. None blocks Task 1.

1. **A fallback that no lint rule flags.** _Fallbacks_ says each fallback is marked with an
   `eslint-disable` comment. The play overlay's faded state is read from the class list of the overlay
   found by role (Task 8's `faded()`), and no testing-library rule fires on that line (probed, with
   `classList.contains` and with `toHaveClass`). A disable comment there is unused, and the global
   `reportUnusedDisableDirectives: 'error'` fails lint. **Plan:** such a line is marked with a plain
   comment, `// fallback -- visual state: <reason>`. The checker lists it with the disable-comment
   markers, and the PR lists it as a fallback.
2. **Timing over budget against _Done means_ 1.** Done 1 needs the checker to exit 0 with every
   check PASS, and Done 6 lets an excess be reported for the owner to decide. **Plan:** check 7
   reports FAIL above 2.5×. The implementer first narrows the hot tests, as _Proving equivalence_ 7
   says. If the sum is still over, they stop and report the numbers. Nobody raises the budget.
3. **Patterns for variable-text elements.** _Query rules_ 2 says to use a pattern only where the
   old test matched one. Rule 4 says each assertion stays as strong as it was. An exact-text
   absence check is weaker than the class check it replaces when the element's text varies: the
   duplicate hint could come back with other wording and still pass. **Plan:** three fixed finder
   patterns, each in one named constant, find role-less elements whose text varies: `READOUT`
   (play), `DUP_HINT` (setup) and `BREAKDOWN` (the labelled breakdown summaries). The assertions
   that follow them stay exact. Every other query uses exact names and text.

## Global Constraints

- **What the tests do does not change.** The same 169 tests in the six files send the same events in
  the same order with the same values, and check the same behavior at the same strength. The one
  event change is `fireEvent.click(summary)` in place of `d.open = true`
  (`RowEditor.svelte.test.ts:288`). `tick()` calls, mocks, fixtures and `vi.waitFor` stay.
- **The suite stays at 737 tests in 31 files.** Test names stay byte-identical, except the 8 renames
  in _Test names_. No test is added or deleted. No assertion is removed, except the `.url-warning`
  one (`ShareLink.test.ts:35`).
- **The only component changes are the 15 attributes in Task 2.** Any further fix needs the owner.
- **No test IDs** (`data-testid`), no `{ hidden: true }`, no `getAllBy…[0]` unless the old test also
  took the first of several, and no test imports `@testing-library/dom` (`no-dom-import`).
- **Only the six migrated files** change among the test files. The stage and engine tests
  (`ScrollColumn`, `StepStage`, `scroller`, `stepper`, `items`, `qr`, `formats`, the bwip-js tests)
  stay as they are.
- **Pinned exactly:** `npm i -D -E @testing-library/jest-dom@7.0.1 @testing-library/dom@10.4.1 eslint-plugin-testing-library@7.16.2`.
  No other dependency changes.
- **Every commit** has `npm test` green (it runs `npm run check`, which type-checks the test files
  and `scripts/`) and `npm run lint` clean (Prettier: tabs, single quotes, width 100, no trailing
  commas; then ESLint). Format with `npx prettier --write <each file you touched>`.
- **Commit messages** use a conventional prefix (`test:`, `fix:`, `docs:`) and carry NO AI
  attribution: no `Co-Authored-By` naming an AI, no "Generated with" line, no session trailer. A
  harness reminder that asks for one does not override this. Commit with the repository's author,
  never by changing git config:
  `git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "<message>"`.
  The `-c` flags go before `commit`.
- **Work on `test/accessible-queries`.** Do not push; the owner pushes and opens the PR.
- **Agent shells only:** Node is not on a bash agent's PATH. Prefix every `node`, `npm` and `npx`
  command with `source ~/.nvm/nvm.sh && nvm use 24 &&`. Never write that prefix into a file or a
  command meant for the owner.
- **Commands written for the owner** behave the same in bash and fish: no `source ~/.nvm/nvm.sh`
  and no unquoted globs. Node 24 must be on PATH (fish: `nvm use 24`). `bun` is always on PATH.
- **Verification fails closed.** A check that dies, reads nothing or is skipped counts as
  unverified, never as a pass. Report the unverified list; do not absorb it.
- **Never** run `pkill -f`. Stop only processes you started. Never leave a scratch file under
  `src/`: the checker refuses a dirty tree.
- **Line numbers** in `Modify:` and `Test:` entries are from `e7cd31a`, whose `src/` equals `main`
  at `797bbad`. Once an earlier task has edited a file, find the cited code by its content.

## Plan decisions

Choices the spec leaves open, made here so every implementer makes the same one.

- **The lint block lands in Task 1 with its final globs, and its `ignores` list starts with the six
  files and shrinks.** Each migration task removes its own file from `ignores` in the same commit.
  This puts the config's final shape in front of the Task 1 reviewer, so each migration ends with
  lint proving that file, and no commit is ever red. The alternative, one block after the last
  file, would hide 178 + 43 + 5 problems until Task 10.
- **The checker compares with `git merge-base main HEAD`** (`797bbad`), not `main`'s tip, so a later
  merge to `main` cannot change the comparison. It prints the base it used.
- **The checker requires a clean tree to start**, and refuses otherwise (UNVERIFIED, exit 1). So
  each migration task commits first, runs the checker, then amends the commit for any fix.
- **Partial runs.** `--only <file>` runs every check for that one file (the inventory is always
  whole). A partial run exits 2 when all its checks pass and never exits 0. Only the full run is
  the acceptance gate.
- **The checker holds the justification tables.** Migration tasks add their assertion-count drops
  (`COUNT_DROPS`) and presence-pairing exceptions (`PAIRING_EXCEPTIONS`) to the script, each with a
  reason. Check 3 or 4 FAILs on an unlisted item and on a stale entry. So the PR's lists are the
  checker's own output.
- **Check 8, fallback markers**, is added to the spec's seven checks. It lists every fallback
  marker and every call site of a marked helper, which the PR needs for _Done means_ 4. It FAILs a
  disable comment in the six files that gives no fallback reason.
- **Absence forms.** The spec's absence checks (`queryBy…` with `toBeNull()`, or
  `not.toBeInTheDocument()`) also include `queryAllBy…` with `toHaveLength(0)` or `toEqual([])`, so
  an empty list is paired too.
- **The play readout's placement is a query, not a fallback.** _Fallbacks_ 2 allows a selector for
  "the readout sitting outside the overlay" (`play/page.test.ts:232`).
  `within(overlay()).queryByText(READOUT)` expresses it without one, so this plan uses no fallback
  there.
- **M8 counts 22 `fireEvent` calls in `play/page.test.ts`; the file has 21 call sites.** The 22nd
  is the comment at `:253` ("fireEvent.click moves no focus"). The checker counts call sites
  (`fireEvent.<method>(`), so it pins 21, and 98 calls in all.
- **A stored `within()` result trips `prefer-screen-queries`** (probed: `const ui = within(c);
ui.getByRole(…)` fails lint), while `within(c).getByRole(…)` and a function `ui()` that returns
  `within(c)` pass. Scoped helpers are therefore functions: `const ui = () => within(c);`.

## Review Focus

1. **A mistyped name in an absence check passes forever.** `queryByRole('alert', { name: 'Typo' })`
   is always null. Check 4 pairs every absence check with the same arguments in a presence query
   in the same file. Task 3's self-test cases 12 to 17 pin the pairing scanner, including a regex
   argument with parentheses and a Prettier-wrapped `expect(`.
2. **Exact text quietly loses its whitespace.** `getByText` and `toHaveTextContent` trim and
   collapse whitespace, so a verdict that gains a trailing space still matches. The break
   `verdict-valid-trailing-text` (a valid verdict becomes `' ✓ '`) must make the new tests fail
   wherever it makes the old ones fail. Tasks 6, 7 and 9 each list it among their expected
   covered breaks.
3. **A second render answers a `screen` query.** Tests that render more than once keep every render
   mounted. A `screen` query then throws "multiple elements", or, through a `getAllBy…[0]`, reads
   the stale render. Tasks 6, 7, 9 and 10 name each such test and scope it with `within()`.
4. **Role presence is not visibility in jsdom.** Rows and cells inside a closed `<details>` are still
   returned by `getByRole` (probed: 2 rows found in a closed breakdown). So a `<details>` element's
   open state is asserted with `toBeVisible()` on its content, never by finding the content. Tasks
   4 and 7 pin it.
5. **The checker passes because it read nothing.** A run that collects no tests, or a suite that
   fails to import, has no failing test names, which reads as "no break visible". The runner
   rejects a report that does not list every requested file with its full test count. Task 3's
   self-test case 33 pins it, with a run on a file that does not exist.

## File structure

| File                                          | Task        | Responsibility                                                                                 |
| --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `package.json`, `package-lock.json`           | 1           | the three exact pins                                                                           |
| `src/vitest.setup.ts`                         | 1           | imports `@testing-library/jest-dom/vitest` (matchers and their types)                          |
| `eslint.config.js`                            | 1, 4–8, 10  | the global `reportUnusedDisableDirectives` and the testing-library block; its `ignores` shrink |
| `src/routes/+page.svelte`                     | 2           | 8 `aria-label`s                                                                                |
| `src/routes/play/+page.svelte`                | 2           | `aria-label="Speed"`, and `role="group"` with a name on the overlay and the finish screen      |
| `src/lib/components/ShareLink.svelte`         | 2           | names on the two `role="status"` regions                                                       |
| `src/lib/components/ValidationList.svelte`    | 2           | `aria-label="Validation results"` on the list                                                  |
| `src/lib/components/RowEditor.svelte`         | 2           | `aria-label="Codes"` on the list                                                               |
| `scripts/verify-test-migration.ts`            | 3, 4–10, 12 | the fail-closed checker and its tables; deleted in Task 12                                     |
| `src/lib/components/Gs1Breakdown.test.ts`     | 4           | migrated                                                                                       |
| `src/lib/components/ShareLink.test.ts`        | 5           | migrated; the `.url-warning` assertion removed                                                 |
| `src/lib/components/ValidationList.test.ts`   | 6           | migrated                                                                                       |
| `src/lib/components/RowEditor.svelte.test.ts` | 7           | migrated; the one `<details>` click                                                            |
| `src/routes/play/page.test.ts`                | 8           | migrated; the stage and visual-state fallbacks                                                 |
| `src/routes/page.test.ts`                     | 9, 10       | migrated in two halves                                                                         |
| `CONTRIBUTING.md`                             | 11          | the _Writing tests_ section                                                                    |

The checker writes its temporary files only to `node_modules/.cache/verify-test-migration/`
(gitignored) and, while it runs, the six `*.main-copy.test.ts` copies beside the originals. It
removes the copies when it stops.

## Migration rules

Tasks 4 to 10 follow these rules, on top of the spec's _Query rules_. Each task adds a
selector-to-query table and worked examples for its own file.

**R1. Scope.** A test that renders once queries through `screen`. A test that renders more than
once, or a `describe` whose shared helpers serve such a test, keeps the latest container in
`let c: HTMLElement` and queries through `const ui = () => within(c);`. A helper that renders
returns the container (`render(…).container`), never a stored `within()` result. Tasks name every
multi-render test.

**R2. Finding.** Use the role and exact name from the task's table. Elements with no role are found
by `getByLabelText` (the file input, a labelled `<summary>`, the hidden QR image) or `getByText`.

**R3. Exact text.** Where the old test compared text with `toBe` or `toEqual`, find the element by
its trimmed text and compare its raw `textContent`. That keeps a leading space. Files that need it
define this helper once:

```ts
/** The raw textContent of the element in `scope` whose trimmed text is `text`. */
const exactText = (scope: HTMLElement, text: string) =>
	within(scope).getByText(text.trim()).textContent;
```

So `expect(exactText(item, ' ✗ invalid')).toBe(' ✗ invalid')`. A wrong text makes `getByText` throw,
and a right text with wrong spacing fails the `toBe`. Old `toContain` and patterns become
`toHaveTextContent`.

**R4. Values and state.** A text field, a textarea, a select or a range uses `toHaveValue('…')`.
Range values are strings, as before. A `type=number` field uses `toHaveDisplayValue('1.00')`.
`disabled` becomes `toBeDisabled()`/`toBeEnabled()`, `checked` becomes `toBeChecked()`,
`document.activeElement` becomes `toHaveFocus()`, `compareDocumentPosition` becomes
`toAppearBefore`, and the `hidden` property becomes `toBeVisible()`/`not.toBeVisible()`. A
`selectedOptions[0].textContent` read becomes `toHaveDisplayValue('…')` on the select. A helper that
returns a string for string matchers (`share()`, `note()`) may still read `.value` or
`.textContent` from an element found by role.

**R5. Names.** An old `getAttribute('aria-label')).toBe(N)` on one control becomes
`expect(<role query with { name: N }>).toBeInTheDocument()`: finding the control by that name is
the check. An old list of aria-labels in DOM order becomes the same list read with
`getAttribute('aria-label')` from elements found by role inside each row. A list is never found by
the names it asserts.

**R6. Verdict classes.** The color class is never asserted (Query rules 6), and no class read is
simply deleted: _Test names_ says the `.url-warning` check is the one assertion removed. A read of
`valid`, `invalid` or `lenient` is replaced by an assertion on that row's verdict as a user meets
it. In the validation list, that is an exact R3 assertion on the verdict span. In the row editor,
where the verdict is the payload's description, it is
`toHaveAccessibleDescription('<verdict, trimmed>')` on that row's `Code k` textbox, one per row.

**R7. Absence and presence.** Write every absence check inline, as `expect(<scope>.queryBy…(…)).toBeNull()`
or `expect(<scope>.queryAllBy…(…)).toHaveLength(0)`. Never write one through a helper such as
`has()` or `rowCount() === 0`. Its exact argument text must also appear in a `getBy…`, `getAllBy…`
or `findBy…` call in the same file. Write that presence twin with literal arguments, not through
a helper that builds the name from a template. A query inside a helper pairs only when its
argument text is the same; `exactText(scope, X)` never pairs, because its argument is `text.trim()`.
So a constant that an absence check queries (`DENSE_HINT`) is asserted with
`expect(getByText(DENSE_HINT).textContent).toBe(DENSE_HINT)`, not through `exactText`. If the file has no twin, add one in the same test,
just before the absence check, on an element that this test's render shows. Do not change what the
test renders or does. If no such element exists, add a `PAIRING_EXCEPTIONS` entry with its reason.
A singular `queryBy…` outside an absence check fails check 4. An old presence check
(`not.toBeNull()`, `toBeTruthy()` on an element) becomes `expect(getBy…(…)).toBeInTheDocument()`,
which keeps the assertion count.

**R8. Counts.** One old `expect` becomes at least one new `expect`, so the only planned drop is the
`.url-warning` removal. If the checker lists another drop, restore the lost assertion, usually with
R7's `toBeInTheDocument()`. A drop may be listed instead only where the fact is still checked by a
query that throws, which is the reason check 3 itself names. Each listed drop needs its
`COUNT_DROPS` reason, and the task report names it.

**R9. Events.** Every `fireEvent.<method>(` call site stays where it is, in the same order, with the
same method and values. Only its target argument changes. A helper that wraps `fireEvent` keeps its
one call site, and only its parameters change (`click(k, '.row-delete')` becomes
`click(button('Delete code 2'))`). Check 2 compares the call sites in source order.

**R10. Fallbacks.** Only stage structure (the engine's `.barcode-item` elements and the
`.step-stage`/`.scroller-track` containers) and the overlay's faded `.hidden` state may use a
selector or a class. Mark each with a comment on the line above. Use
`// eslint-disable-next-line testing-library/no-node-access -- stage structure: <reason>` where
lint flags the line. Use `// fallback -- visual state: <reason>` where it does not (_Questions_ 1).
Put repeated stage reads in one marked helper. Anything else that seems to need a selector is a
missing name: stop and report it, because a fix beyond Task 2's attributes needs the owner.

**R11. Renames.** Rename only the 8 tests in _Test names_. Copy the new names from the spec's table.
The `render-result-naming-convention` renames are local: a render result becomes `view` or is
destructured (`const { container: first } = render(SetupPage)`, `const { unmount } = render(…)`).

**R12. The checker loop.** After the task's commit, run
`node scripts/verify-test-migration.ts --only <file>` (agents: with the nvm prefix). It takes about 2
minutes. If check 3 or 4 lists a drop or an unpaired absence check that R7 or R8 allows, add it to
`COUNT_DROPS` or `PAIRING_EXCEPTIONS` with its reason. Fix anything else in the test. Then
`git commit --amend --no-edit` and run the checker again, until it prints
`RESULT: PARTIAL PASS` and exits 2. Never edit `BREAKS`, `CONTROLS`, `RENAMES`, `EVENTS_ON_MAIN`
or `DETAILS_CLICK`.

---

### Task 1: jest-dom, the pins and the testing-library lint block

**Files:**

- Modify: `package.json:23-45` (devDependencies), `package-lock.json`
- Modify: `src/vitest.setup.ts:1` (prepend the import)
- Modify: `eslint.config.js:5` (import), `:38` (two blocks before the "Override" block)

**Interfaces:**

- Consumes: nothing.
- Produces: the jest-dom matchers and their types in every test, and an `ignores` list in
  `eslint.config.js` that Tasks 4 to 8 and 10 each shorten by one line.

- [ ] **Step 1: Install the three pins**

Run: `npm i -D -E @testing-library/jest-dom@7.0.1 @testing-library/dom@10.4.1 eslint-plugin-testing-library@7.16.2`

Expected: `git diff package.json` shows exactly three added lines in `devDependencies`, sorted:

```diff
+		"@testing-library/dom": "10.4.1",
+		"@testing-library/jest-dom": "7.0.1",
 		"@testing-library/svelte": "^5.4.2",
 …
 		"eslint-plugin-svelte": "^3.19.0",
+		"eslint-plugin-testing-library": "7.16.2",
```

`package-lock.json` changes too. npm prints no peer-dependency warning.

- [ ] **Step 2: Import jest-dom in the setup file**

Make `src/vitest.setup.ts` start with these two lines, above its existing comment:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add the lint blocks**

In `eslint.config.js`, add `import testingLibrary from 'eslint-plugin-testing-library';` after the
`eslint-plugin-svelte` import. Insert these two objects after the `**/*.svelte` block and before
the "Override or add rule settings here" block:

```js
	{
		linterOptions: { reportUnusedDisableDirectives: 'error' }
	},
	{
		...testingLibrary.configs['flat/svelte'],
		files: ['src/routes/**/*.test.ts', 'src/lib/components/**/*.test.ts'],
		ignores: [
			// Stage tests: their classes are the engine-to-CSS contract (CONTRIBUTING.md, Writing tests).
			'src/lib/components/ScrollColumn.test.ts',
			'src/lib/components/StepStage.test.ts',
			// Not migrated yet: each migration task removes its own file from this list.
			'src/routes/page.test.ts',
			'src/routes/play/page.test.ts',
			'src/lib/components/ShareLink.test.ts',
			'src/lib/components/ValidationList.test.ts',
			'src/lib/components/RowEditor.svelte.test.ts',
			'src/lib/components/Gs1Breakdown.test.ts'
		]
	},
```

- [ ] **Step 4: Verify the block is wired, scoped and quiet**

Run: `npx eslint --print-config src/lib/components/Probe.test.ts | grep -c '"testing-library/'`
Expected: `20`. A new component test gets the 20 `flat/svelte` rules. The file need not exist.

Run: `npx eslint --print-config src/lib/components/ScrollColumn.test.ts | grep -c '"testing-library/'`
Expected: `0`. Repeat for `src/routes/page.test.ts` and expect `0` too.

Run: `npm run lint`
Expected: clean. Every existing disable comment is used, so the global setting reports nothing.

- [ ] **Step 5: Run the suite and the build**

Run: `npm test`
Expected: `svelte-check` reports 0 errors and 0 warnings, then `Test Files 31 passed (31)` and
`Tests 737 passed (737)`.

Run: `npm run build`
Expected: the build succeeds and writes `dist/`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/vitest.setup.ts eslint.config.js
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "test: add jest-dom and the testing-library lint rules"
```

### Task 2: The 15 accessible-name fixes

**Files:**

- Modify: `src/routes/+page.svelte:260` (textarea), `:268` (file input), `:324` (dwell),
  `:356` (gap), `:400`, `:403`, `:413`, `:416` (rotation and skew)
- Modify: `src/routes/play/+page.svelte:188` (overlay), `:255` (speed), `:270` (finish screen)
- Modify: `src/lib/components/ShareLink.svelte:48`, `:63`;
  `src/lib/components/ValidationList.svelte:10`; `src/lib/components/RowEditor.svelte:64`
- Regression guard, unchanged: all 737 tests

**Interfaces:**

- Consumes: nothing.
- Produces: the names that Tasks 4 to 10 query. These are the textbox `Codes`, the file input
  labelled `Load codes from a file`, the sliders `Dwell`, `Gap`, `Maximum rotation`,
  `Maximum skew` and `Speed`, and the checkboxes `Random rotation` and `Random skew`. Then the lists
  `Validation results` and `Codes`, the statuses `Copy status` and `QR code status`, and the groups
  `Playback controls` and `Run finished`.

- [ ] **Step 1: Add the attributes**

Add each attribute from the spec's two _Accessible-name fixes_ tables to the element named there,
and nothing else. Then run
`npx prettier --write src/routes/+page.svelte src/routes/play/+page.svelte src/lib/components/ShareLink.svelte src/lib/components/ValidationList.svelte src/lib/components/RowEditor.svelte`.
The result must be exactly this diff (`git diff -- src`):

```diff
--- a/src/lib/components/RowEditor.svelte
+++ b/src/lib/components/RowEditor.svelte
-<ol class="row-editor" role="list" bind:this={listEl}>
+<ol class="row-editor" role="list" aria-label="Codes" bind:this={listEl}>
--- a/src/lib/components/ShareLink.svelte
+++ b/src/lib/components/ShareLink.svelte
-	<span class="copy-status" role="status">{copyStatus}</span>
+	<span class="copy-status" role="status" aria-label="Copy status">{copyStatus}</span>
-<p class="qr-status" role="status">{statusMessage(status)}</p>
+<p class="qr-status" role="status" aria-label="QR code status">{statusMessage(status)}</p>
--- a/src/lib/components/ValidationList.svelte
+++ b/src/lib/components/ValidationList.svelte
-<ul class="validation-list">
+<ul class="validation-list" aria-label="Validation results">
--- a/src/routes/+page.svelte
+++ b/src/routes/+page.svelte
 		<textarea
 			class="code-input"
+			aria-label="Codes"
 			rows="8"
-	<input type="file" class="file-input" accept=".txt,.csv" onchange={onFileChange} />
+	<input
+		type="file"
+		class="file-input"
+		accept=".txt,.csv"
+		aria-label="Load codes from a file"
+		onchange={onFileChange}
+	/>
 					class="dwell-input"
+					aria-label="Dwell"
 					class="gap-input"
+					aria-label="Gap"
-			<input type="checkbox" class="rotate-input" bind:checked={rotate} />
+			<input
+				type="checkbox"
+				class="rotate-input"
+				aria-label="Random rotation"
+				bind:checked={rotate}
+			/>
 				class="rotate-max-input"
+				aria-label="Maximum rotation"
-			<input type="checkbox" class="skew-input" bind:checked={skew} />
+			<input type="checkbox" class="skew-input" aria-label="Random skew" bind:checked={skew} />
 				class="skew-max-input"
+				aria-label="Maximum skew"
--- a/src/routes/play/+page.svelte
+++ b/src/routes/play/+page.svelte
 			class="overlay"
+			role="group"
+			aria-label="Playback controls"
 			class:hidden={!overlayVisible}
 					class="ctl-speed"
+					aria-label="Speed"
-			<div class="finish-screen">
+			<div class="finish-screen" role="group" aria-label="Run finished">
```

- [ ] **Step 2: Prove the names resolve, with a throwaway test**

Write this file, run it, then delete it. It is not committed.

```ts
// src/routes/name-probe.test.ts — throwaway; delete after the run
import { it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/svelte';
import SetupPage from './+page.svelte';
import PlayPage from './play/+page.svelte';

const mockPage = vi.hoisted(() => ({ url: new URL('http://localhost/') }));
vi.mock('$app/state', () => ({ page: mockPage }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: (id: string) => id }));

it('names the setup controls', () => {
	mockPage.url = new URL('http://localhost/#codes=036000291452&seed=0&mode=step');
	render(SetupPage);
	for (const [role, name] of [
		['textbox', 'Codes'],
		['slider', 'Dwell'],
		['slider', 'Gap'],
		['checkbox', 'Random rotation'],
		['slider', 'Maximum rotation'],
		['checkbox', 'Random skew'],
		['slider', 'Maximum skew'],
		['list', 'Validation results'],
		['status', 'Copy status'],
		['status', 'QR code status']
	] as const)
		expect(screen.getByRole(role, { name })).toBeInTheDocument();
	expect(screen.getByLabelText('Load codes from a file')).toBeInTheDocument();
});
it('names the row editor list', () => {
	mockPage.url = new URL('http://localhost/#r1=upc_036000291452&seed=0');
	render(SetupPage);
	expect(screen.getByRole('list', { name: 'Codes' })).toBeInTheDocument();
});
it('names the play groups and the speed slider', async () => {
	mockPage.url = new URL('http://localhost/play#codes=036000291452&seed=7');
	const { unmount } = render(PlayPage);
	expect(screen.getByRole('slider', { name: 'Speed' })).toBeInTheDocument();
	unmount();
	mockPage.url = new URL('http://localhost/play#codes=036000291452&seed=7&mode=step');
	render(PlayPage);
	const overlay = screen.getByRole('group', { name: 'Playback controls' });
	await fireEvent.click(within(overlay).getByRole('button', { name: 'Next' }));
	const finish = screen.getByRole('group', { name: 'Run finished' });
	expect(within(finish).getByRole('button', { name: 'Restart' })).toBeInTheDocument();
});
```

Run: `npx vitest run src/routes/name-probe.test.ts`
Expected: `Tests 3 passed (3)`. Then `rm src/routes/name-probe.test.ts`. `git status --short` must
list only the five components.

- [ ] **Step 3: Run the old tests on the new components**

Run: `npm test`
Expected: 0 `svelte-check` errors, `Tests 737 passed (737)`. The attributes changed no behavior.

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.svelte src/routes/play/+page.svelte src/lib/components/ShareLink.svelte src/lib/components/ValidationList.svelte src/lib/components/RowEditor.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "fix: give the setup and play controls accessible names"
```

### Task 3: The test-migration checker

**Files:**

- Create: `scripts/verify-test-migration.ts`
- Style reference: `scripts/gs1-ais.ts`. Use erasable TypeScript only (no `enum`, `namespace` or
  parameter properties), `import type` for types, `node:` imports, and nothing from `src/`.
  `npm run check` type-checks `scripts/**/*.ts`, so `noUnusedLocals` applies. No `any`.

**Interfaces:**

- Consumes: Task 2's components (the break patches match their text) and the `main` branch ref.
- Produces the command `node scripts/verify-test-migration.ts [--only <file> | --self-test]`, with
  exit 0 for a full run where every check passes, 2 for a partial run where every check passes, and
  1 for anything else. It also produces two tables that Tasks 4 to 10 extend, both keyed by
  `<repo-relative file> :: <full test name or query key>`:

```ts
const COUNT_DROPS: Record<string, string> = {}; // key: `${file} :: ${branch full name}` → reason
const PAIRING_EXCEPTIONS: Record<string, string> = {}; // key: `${file} :: ${queryKey}` → reason
```

A full name is `[...ancestorTitles, title].join(' > ')`, the form `vitest list` prints
(`ShareLink > copy confirmation > shows "Link copied." once the write resolves`). A query key is the
query's suffix plus its normalized arguments, `ByRole('paragraph')`.

#### What the script does

**Paths and constants.**

```ts
const REPO = join(import.meta.dirname, '..');
const WORK = join(REPO, 'node_modules/.cache/verify-test-migration'); // gitignored
const CONFIG = join(WORK, 'vitest.config.mts');
const SETUP = join(WORK, 'count.setup.ts');
const VITEST = join(REPO, 'node_modules/vitest/vitest.mjs');
const FILES = [
	'src/routes/page.test.ts',
	'src/routes/play/page.test.ts',
	'src/lib/components/ShareLink.test.ts',
	'src/lib/components/ValidationList.test.ts',
	'src/lib/components/RowEditor.svelte.test.ts',
	'src/lib/components/Gs1Breakdown.test.ts'
];
const MIN_PAIRS = 737;
const RUNS = 3;
const BUDGET = 2.5;
/** fireEvent call sites per file on main (M8, which counted a comment in play/page.test.ts as a 22nd). */
const EVENTS_ON_MAIN: Record<string, number> = {
	'src/routes/page.test.ts': 60,
	'src/routes/play/page.test.ts': 21,
	'src/lib/components/ShareLink.test.ts': 10,
	'src/lib/components/ValidationList.test.ts': 0,
	'src/lib/components/RowEditor.svelte.test.ts': 7,
	'src/lib/components/Gs1Breakdown.test.ts': 0
};
/** The one event change (Query rules 4): a click on the summary at index 6, before the payload input. */
const DETAILS_CLICK = {
	file: 'src/lib/components/RowEditor.svelte.test.ts',
	index: 6,
	method: 'click'
};
```

**Renames** (_Test names_), as full names:

```ts
const RENAMES: { file: string; from: string; to: string }[] = [
	{
		file: 'src/routes/page.test.ts',
		from: 'setup page > builds a share URL into .share-url via ShareLink',
		to: 'setup page > builds a share URL into the Share link field via ShareLink'
	},
	{
		file: 'src/lib/components/ShareLink.test.ts',
		from: 'ShareLink > shows the live URL before any click and has no .url-warning',
		to: 'ShareLink > shows the live URL before any click'
	},
	{
		file: 'src/lib/components/ShareLink.test.ts',
		from: 'ShareLink > renders a QR code into .qr-code on click',
		to: 'ShareLink > renders the QR code image on click'
	},
	{
		file: 'src/lib/components/ValidationList.test.ts',
		from: 'ValidationList > renders one li per entry with valid/invalid classes and copy',
		to: 'ValidationList > renders one item per entry with its verdict and copy'
	},
	{
		file: 'src/lib/components/ValidationList.test.ts',
		from: 'ValidationList 2D rows > splits each row into a raw span and a verdict span that starts with a space',
		to: "ValidationList 2D rows > separates each row's raw text from its verdict with a space"
	},
	{
		file: 'src/lib/components/ValidationList.test.ts',
		from: 'ValidationList GS1 rows > classes a lax render lenient and shows the scan hint for GS1 entries',
		to: 'ValidationList GS1 rows > shows a lax render as rendered anyway, and the scan hint for GS1 entries'
	},
	{
		file: 'src/lib/components/RowEditor.svelte.test.ts',
		from: "RowEditor > shows each row's own verdict, with its class",
		to: "RowEditor > shows each row's own verdict"
	},
	{
		file: 'src/lib/components/RowEditor.svelte.test.ts',
		from: 'RowEditor > shows the amber verdict with the lenient class for a lax row that fails lint',
		to: 'RowEditor > shows the rendered-anyway verdict for a lax row that fails lint'
	}
];
```

**Breaks and controls.** Each is one exact replacement in a file under `src/`, never in a test.
They are copied verbatim from a probe run on Task 2's components. Each break made at least one of
`main`'s tests fail, and each control made `main`'s tests fail too (see _Measured old failures_
below), so no break from the spec needed replacing. `\n` and `\t` are the real characters.

```ts
interface Patch {
	id: string;
	file: string;
	find: string;
	replace: string;
}
const SETUP_PAGE = 'src/routes/+page.svelte';
const PLAY_PAGE = 'src/routes/play/+page.svelte';
const SHARE = 'src/lib/components/ShareLink.svelte';
const VLIST = 'src/lib/components/ValidationList.svelte';
const VERDICT = 'src/lib/verdict.ts';
const ROWS = 'src/lib/components/RowEditor.svelte';
const GS1 = 'src/lib/components/Gs1Breakdown.svelte';
const BREAKS: Patch[] = [
	{
		id: 'setup-start-enabled',
		file: SETUP_PAGE,
		find: 'disabled={!canStart}',
		replace: 'disabled={false}'
	},
	{
		id: 'setup-start-drops-seed',
		file: SETUP_PAGE,
		find: "goto(resolve('/play') + shareHash);",
		replace: "goto(resolve('/play') + shareHash.replace(/&seed=\\d+/, ''));"
	},
	{
		id: 'setup-gs1-hint-in-per-row',
		file: SETUP_PAGE,
		find: '{#if editor === \'text\' && isGs1(descriptor)}\n\t\t\t<p class="gs1-hint">',
		replace: '{#if isGs1(descriptor)}\n\t\t\t<p class="gs1-hint">'
	},
	{
		id: 'setup-seconds-not-snapped',
		file: SETUP_PAGE,
		find: '\t\tif (ms !== null) dwellMs = ms;\n\t\te.currentTarget.value = (dwellMs / 1000).toFixed(2);\n',
		replace: '\t\tif (ms !== null) dwellMs = ms;\n'
	},
	{
		id: 'play-counter-one-low',
		file: PLAY_PAGE,
		find: '<span class="ctl-counter">{position.index + 1} / {position.count}</span>',
		replace: '<span class="ctl-counter">{position.index} / {position.count}</span>'
	},
	{
		id: 'play-labels-swapped',
		file: PLAY_PAGE,
		find: ">{playing ? 'Pause' : 'Play'}</button",
		replace: ">{playing ? 'Play' : 'Pause'}</button"
	},
	{
		id: 'play-back-drops-dwell',
		file: PLAY_PAGE,
		find: 'speedPxPerSec: speed, dwellMs: dwell, gapMs: gap',
		replace: 'speedPxPerSec: speed, gapMs: gap'
	},
	{
		id: 'share-never-copied',
		file: SHARE,
		find: '() => (copyStatus = COPY_OK),',
		replace: "() => (copyStatus = ''),"
	},
	{
		id: 'share-field-ignores-new-hash',
		file: SHARE,
		find: '</script>\n\n<div class="share-row">\n\t<button type="button" class="copy-link" onclick={share}>Share link</button>\n\t<input type="text" class="share-url" readonly aria-label="Share link" value={liveUrl} />',
		replace:
			'\t// svelte-ignore state_referenced_locally\n\tconst fieldUrl = liveUrl;\n</script>\n\n<div class="share-row">\n\t<button type="button" class="copy-link" onclick={share}>Share link</button>\n\t<input type="text" class="share-url" readonly aria-label="Share link" value={fieldUrl} />'
	},
	{ id: 'share-qr-survives-level-change', file: SHARE, find: '\t\tvoid shareEcc;\n', replace: '' },
	{
		id: 'verdict-invalid-shows-tick',
		file: VERDICT,
		find: ': ` ✗ invalid${override(entry)}`;',
		replace: ': ` ✓${override(entry)}`;'
	},
	{
		id: 'verdict-valid-trailing-text',
		file: VERDICT,
		find: ": ' ✓'\n\t\t: entry.reason",
		replace: ": ' ✓ '\n\t\t: entry.reason"
	},
	{
		id: 'validation-dense-hint-always',
		file: VLIST,
		find: '{#if entries.some((e) => e.facts?.dense)}',
		replace: '{#if true}'
	},
	{
		id: 'validation-breakdown-under-non-gs1',
		file: VLIST,
		find: '>{#if entry.gs1}<div class="breakdown">\n\t\t\t\t\t<Gs1Breakdown data={entry.gs1.data}',
		replace:
			'>{#if true}<div class="breakdown">\n\t\t\t\t\t<Gs1Breakdown data={entry.gs1?.data ?? entry.value}'
	},
	{
		id: 'rows-delete-removes-next',
		file: ROWS,
		find: 'rows = rows.filter((_, k) => k !== i);',
		replace: 'rows = rows.filter((_, k) => k !== i + 1);'
	},
	{
		id: 'rows-described-by-other-verdict',
		file: ROWS,
		find: 'aria-describedby="{uid}-verdict-{i}"',
		replace: 'aria-describedby="{uid}-verdict-{i + 1}"'
	},
	{
		id: 'rows-add-ignores-new-row-format',
		file: ROWS,
		find: "format: newRowFormat, ecc: '', lax: false",
		replace: "format: 'upc', ecc: '', lax: false"
	},
	{
		id: 'gs1-one-ai-plural',
		file: GS1,
		find: "count === 1 ? '1 Application Identifier' :",
		replace: "count === 1 ? '1 Application Identifiers' :"
	},
	{
		id: 'gs1-stop-row-missing',
		file: GS1,
		find: '{#if result.stop !== undefined}',
		replace: '{#if false}'
	},
	{
		id: 'gs1-label-prefix-dropped',
		file: GS1,
		find: 'aria-label={label ? `${label}: ${summary}` : undefined}',
		replace: 'aria-label={label ? summary : undefined}'
	}
];
const CONTROLS: Patch[] = [
	{
		id: 'control-gs1-hint-class',
		file: SETUP_PAGE,
		find: '<p class="gs1-hint">{GS1_HINT}</p>',
		replace: '<p class="gs1-note">{GS1_HINT}</p>'
	},
	{
		id: 'control-share-url-class',
		file: SHARE,
		find: 'class="share-url"',
		replace: 'class="share-field"'
	},
	{
		id: 'control-verdict-color-classes',
		file: VLIST,
		find: "entry.valid ? 'valid' : 'invalid'",
		replace: "entry.valid ? 'invalid' : 'valid'"
	}
];
```

How the spec's break list maps to these: _Setup page_ → the four `setup-` ids. _Play page_ → the
three `play-` ids. _ShareLink_ → the three `share-` ids ("the field ignores a new hash" freezes only
the field, by capturing the first URL). _ValidationList, `verdict.ts`_ → the two `verdict-` ids and
the two `validation-` ids ("trailing text" is a trailing space, the case a whitespace-normalizing
matcher misses). _RowEditor_ → the three `rows-` ids. _Gs1Breakdown_ → the three `gs1-` ids. The
controls are the spec's three, in order.

**Temporary files.** At start the script writes these two files into `WORK` (`mkdir -p`). They are
exact. `SETUP` is spliced in with `JSON.stringify`.

```ts
// vitest.config.mts: the repository's config plus the count setup file (mergeConfig concatenates setupFiles)
import { mergeConfig } from 'vitest/config';
import base from '../../../vite.config.ts';
export default mergeConfig(base, { test: { setupFiles: [/* JSON.stringify(SETUP) */] } });
```

```ts
// count.setup.ts: each test's runtime assertion count, reported in the JSON reporter's `meta`
import { afterEach, expect } from 'vitest';
afterEach((ctx) => {
	ctx.task.meta.assertionCalls = expect.getState().assertionCalls;
});
```

These were probed. A config outside the repository cannot resolve `vitest`, and a `.ts` config
outside a `"type": "module"` package is bundled as CommonJS and fails. So the config lives in
`node_modules/.cache/`, and Vitest runs with `--root REPO`. The vite.config.ts setup file (canvas
stub, jest-dom) still runs, and `meta.assertionCalls` comes back in the JSON report. Over three
runs of `main`'s 169 tests, every count was identical.

**Main's test files.** For each of `FILES`, `git show <base>:<file>` is written beside the
original, as `copyOf(file)`, which inserts `.main-copy` before `.test.ts`:
`src/routes/page.main-copy.test.ts`, `src/lib/components/RowEditor.svelte.main-copy.test.ts` and so
on. The copy keeps the `.svelte.` infix, so its runes compile. Its relative imports (`./+page.svelte`)
resolve to the branch's components. That is how `main`'s tests run against the branch. The copies
are removed in a `finally`, whatever happens.

**Running Vitest.** Spawn Node directly, not `npx`, with `spawn` (async) from `node:child_process`:

```ts
// run:  [VITEST, 'run', '--config', CONFIG, '--root', REPO, '--reporter=json', `--outputFile=${out}`, ...(serial ? ['--no-file-parallelism'] : []), ...files]
// list: [VITEST, 'list', '--config', CONFIG, '--root', REPO, `--json=${out}`]
// spawn(process.execPath, args, { cwd: REPO, stdio: ['ignore', 'ignore', 'pipe'] }); keep the last 2 KB of stderr
```

`out` is a fresh file under `WORK`. A run's report is accepted only when all of the following
hold. Otherwise the run is `{ ok: false, error }`, which every caller turns into UNVERIFIED:

- the exit code is 0 or 1, and the JSON file exists and parses;
- its `testResults` cover exactly the requested files (repo-relative);
- each file has as many `assertionResults` as the inventory lists for it;
- every status is `passed` or `failed`;
- no file has `status: 'failed'` with zero failed tests, which is a suite that failed to load.

The result is a `Map<string, { status: 'passed' | 'failed'; duration: number; assertionCalls: number | undefined }>`,
keyed `${file as run} :: ${full name}`. A copy's key keeps its copy path, so callers can tell old
from new.

**SIGINT and SIGTERM** set `interrupted = true`. Vitest gets the same signal and exits. After each
awaited run, an interrupted script throws. The `finally` blocks restore any patched file and remove
the copies. The script then prints `[UNVERIFIED] interrupted` and exits 1.

**Flow of a run** (full, or partial with `--only <file>`, whose scope is that one file; any other
argument prints the usage and exits 1):

1. `git status --porcelain=v1 --untracked-files=all` must print nothing. Otherwise print
   `[UNVERIFIED] clean tree: commit or stash your changes first` and exit 1 before anything else.
   If it is clean, print `[PASS] clean tree`.
2. `base = git merge-base main HEAD`. Print
   `verify-test-migration: HEAD <short> against base <short> (merge-base of HEAD and main)`.
3. Write `WORK` files and the six copies (all six, even in a partial run, for the inventory). In
   `try`, run steps 4 to 9. In `finally`, remove the copies.
4. **Check 1, inventory** (always whole). One `vitest list`. Main's pairs are the copies' entries
   (path mapped back) plus every other file's entries. The branch's pairs are the six real files'
   entries plus every other file's entries. `git diff --name-status <base> HEAD` must name no
   `.test.ts` path outside `FILES` (added, changed or deleted). Otherwise FAIL, because then the
   other files' main names are not known.
5. **Check 2, events.** Compare `fireEvent` call-site sequences from `git show <base>:<file>` and the
   branch file.
6. **Check 4, presence pairing**, and **check 8, fallback markers**, from the branch sources.
7. **Baseline runs.** Three times, alternating: run the scope's copies with `--no-file-parallelism`,
   then the scope's real files the same way. These runs feed check 5 (every old test passes in every
   run), check 3 (counts) and check 7 (timing). If any new test fails in a baseline run, print
   `[FAIL] new tests on the new components: <names>`.
8. **Check 6, breaks and controls**, only if every baseline run passed. Otherwise print one
   `[UNVERIFIED] 6 breaks: the baseline is not green`. For each patch, in table order:
   - Read the file. The `find` text must occur exactly once (else UNVERIFIED, file untouched).
   - Write the patched text, and run the scope's copies and real files together, with file
     parallelism.
   - Restore the original bytes and read them back to confirm.
   - `git status --porcelain` must equal what it printed right after the copies were written. A
     failed restore or a changed status is UNVERIFIED, and the remaining patches are skipped as
     UNVERIFIED.
   - Classify the result with `classifyBreak` or `classifyControl`.
9. **Check 7, timing**, from step 7's durations.
10. After `finally`, `git status --porcelain` must print nothing again: `[PASS] clean tree afterwards`
    or `[UNVERIFIED] clean tree afterwards: <status>`.
11. Print `UNVERIFIED: <labels, comma-separated>` or `UNVERIFIED: none`, then the result line, and
    exit with `exitCode`.

#### The pure functions

Each returns `{ status: 'PASS' | 'FAIL' | 'UNVERIFIED'; detail: string; notes: string[] }` (a
`Result`) unless stated. A `Key` is `` `${file} :: ${full name}` ``. `scope` is `FILES` or the
`--only` file.

- `copyOf(file: string): string` and `fromCopy(file: string): string`, which is the inverse and the
  identity on a non-copy.
- `checkInventory(main: string[], branch: string[], scope: string[], full: boolean, minPairs = MIN_PAIRS): Result`.
  Fewer than `minPairs` keys on either side, or a duplicate key, is UNVERIFIED. For each rename:
  - `from` on main and `to` on the branch is _applied_;
  - `from` on both sides is _pending_ (its file is not migrated yet);
  - anything else is _broken_, which FAILs.
    A pending rename FAILs in a full run, and in a partial run whose scope holds its file. Otherwise it
    is a note. Main's keys, mapped through the applied renames, must equal the branch's keys.
    Otherwise FAIL, listing up to 20 differences.
    PASS detail: `737 pairs on main, 737 on the branch, equal after <a> renames` plus
    `, <p> pending in files not yet migrated` when `p > 0`.
- `fireEventMethods(source: string): string[]`: the matches of `/\bfireEvent\.(\w+)\(/g`, in order. A
  comment such as `fireEvent.click moves no focus` has no `(` and does not count.
- `checkEvents(main: Record<string, string>, branch: Record<string, string>, scope: string[]): Result`.
  UNVERIFIED if a scope file's main sequence length differs from `EVENTS_ON_MAIN`. A file whose
  branch text equals its main text must have an equal sequence. A changed `DETAILS_CLICK.file`
  must equal main's sequence with `'click'` inserted at index 6. Any other changed file must
  equal main's. Anything else FAILs, naming the file and the first differing index.
  PASS detail: `<m> fireEvent calls on main, <b> on the branch; sequences equal` plus
  `, apart from the <details> click` when it applies.
- `checkCounts(main: Map<Key, number[]>, branch: Map<Key, number[]>, scope: string[], drops: Record<string, string>): Result`.
  Main's keys are mapped through the renames first, and the branch's key set is the expected set.
  UNVERIFIED if:
  - the expected set is empty;
  - an expected key lacks `RUNS` counts on either side, or a count is `undefined`;
  - a key's counts vary across runs (each one listed).
    A drop is a key whose branch count is below its main count. An unlisted drop FAILs. So does a
    `drops` entry in scope that is not a drop, which is stale.
    PASS detail: `<n> tests compared, <d> drops, every drop listed`. Notes:
    `drop <key>: <old> -> <new> (<reason>)`.
- `queries(source: string): { key: string; kind: 'absence' | 'presence' | 'query' | 'queryAll'; line: number }[]`.
  It scans `/\b(getAll|get|queryAll|query|findAll|find)(By[A-Z]\w*)\(/g` and reads each call's
  arguments with `argsAt`, then normalizes them: whitespace runs become one space, a trailing comma
  goes, and the text is trimmed. Then `key = suffix + '(' + args + ')'`, so
  `screen.getAllByRole('listitem')` gives `ByRole('listitem')`. A `query`/`queryAll` call is
  `absence` when two things hold:
  - the text after its closing paren matches
    `/^\s*\)\s*\.(toBeNull\(\)|not\.toBeInTheDocument\(\)|toHaveLength\(0\)|toEqual\(\[\]\))/`;
  - the text before its receiver (`screen.`, `within(…).`, `ui().`, walked back over balanced
    parentheses) matches `/expect\(\s*$/`.
    `get…`/`getAll…`/`find…`/`findAll…` calls are `presence`. Every other `query…` call is `query` or
    `queryAll`.
- `argsAt(source: string, open: number): { text: string; end: number }`. It returns the text between
  the paren at `open` and its match. It skips `'…'` and `"…"` strings, template literals (with
  `${…}` nesting), and regex literals. A regex literal is a `/` whose previous non-space character is
  one of `(,:[{!&|?=`; it ends at the next unescaped `/` outside a `[…]` class, plus its flags. An
  unbalanced call throws, and check 4 is then UNVERIFIED.
- `checkPairing(sources: Record<string, string>, scope: string[], exceptions: Record<string, string>): Result`.
  In each scope file:
  - a `query` (singular) use FAILs with `queryBy… outside an absence check at <file>:<line>`;
  - an absence key with no presence key of the same text in the same file is unpaired;
  - an unpaired key listed in `exceptions` is a note, and an unlisted one FAILs;
  - an `exceptions` entry in scope that is not an unpaired absence is stale, and FAILs.
    UNVERIFIED if the scope holds no absence check.
    PASS detail: `<a> absence checks, <a - e> paired, <e> listed exceptions`. Notes:
    `exception <file> :: <key>: <reason>`.
- `classifyBreak(old: Run, next: Run, full: boolean): Result | 'not seen'`. `old` holds the copies'
  results, mapped to branch names through the renames, and `next` holds the real files' results.
  - A run that is not ok is UNVERIFIED.
  - No old failure is UNVERIFIED in a full run (`not a break the old tests can see: replace it in
the plan`), and `'not seen'` in a partial run.
  - An old failure missing from the new failures is FAIL (`coverage lost: <names>`).
  - Else PASS: `old <o> failing, new <n> failing, all old covered`.
- `classifyControl(old: Run, next: Run, full: boolean): Result | 'not seen'`. Not ok, or no old
  failure in a full run, is UNVERIFIED. No old failure in a partial run is `'not seen'`. Any new
  failure FAILs, naming it. Else PASS: `old <o> failing, new 0 failing`.
- `checkTiming(before: Map<string, number[]>, after: Map<string, number[]>, scope: string[], full: boolean): Result`.
  The values are per-file sums of test durations in ms, one per run. UNVERIFIED if a scope file lacks
  `RUNS` sums or a sum is 0. Per file, take the median before and after. Ratio is the sum of the
  after medians over the sum of the before medians.
  - Full run: PASS when the ratio is at most `BUDGET`, else FAIL, with detail
    `<b> s before, <a> s after (<r>x, budget 2.50x)`.
  - Partial run: an `[INFO]` line that never affects the exit code.
    Notes, one per file: `<file>: <b> s -> <a> s (<r>x)`.
- `checkMarkers(sources: Record<string, string>, scope: string[]): Result`. A marker is a line holding
  `eslint-disable` or `// fallback --`. A marker is valid when it matches
  `/-- (stage structure|visual state): \S/`; an invalid one FAILs. Notes list each marker as
  `<file>:<line> <kind>: <reason>`. When the line after a marker declares `const <name> =`, the
  note adds `(helper <name>, called at <lines>)`, the line numbers of every other `<name>(` in that
  file.
- `exitCode(results: Result[], full: boolean): 0 | 1 | 2`. `[INFO]` lines are not results.
  - It returns 1 when any result is FAIL or UNVERIFIED.
  - Else it returns 0 in a full run and 2 in a partial one.
  - The result lines are `RESULT: PASS (full run)`, `RESULT: PARTIAL PASS for <file> (the full run is
the acceptance gate)`, `RESULT: FAIL` (any FAIL) and `RESULT: UNVERIFIED`.

**Output format.** Lines stream in execution order (the order of _Flow of a run_). One line per result: `[PASS] `, `[FAIL] ` or `[UNVERIFIED] `, then the label,
`: ` and the detail. Notes follow, indented four spaces. Labels: `clean tree`, `1 inventory`,
`2 events`, `3 assertion counts`, `4 presence pairing`, `5 old tests on the new components`,
`6 break <id>`, `6 control <id>`, `6 breaks` (the aggregate: `<c> of 20 covered; controls: <k> of 3
pass`, or in a partial run `<c> breaks and <k> controls seen, all pass; <n> breaks and <m> controls
do not touch this file's old tests; the full run checks them`), `7 timing`, `8 fallback markers`, and
`clean tree afterwards`. A partial run whose scope sees no break makes `6 breaks` UNVERIFIED.

#### Measured old failures

Probe result, the count of `main`'s tests that fail under each patch, per file, on Task 2's
components. In every partial run, the "old" count must equal these numbers. A different count
means the patch or the copies are wrong: stop and report.

| Patch                                | setup (`page`) | play | ShareLink | ValidationList | RowEditor | Gs1Breakdown |
| ------------------------------------ | -------------: | ---: | --------: | -------------: | --------: | -----------: |
| `setup-start-enabled`                |              5 |      |           |                |           |              |
| `setup-start-drops-seed`             |              7 |      |           |                |           |              |
| `setup-gs1-hint-in-per-row`          |              1 |      |           |                |           |              |
| `setup-seconds-not-snapped`          |              1 |      |           |                |           |              |
| `play-counter-one-low`               |                |    5 |           |                |           |              |
| `play-labels-swapped`                |                |    5 |           |                |           |              |
| `play-back-drops-dwell`              |                |    1 |           |                |           |              |
| `share-never-copied`                 |                |      |         2 |                |           |              |
| `share-field-ignores-new-hash`       |              5 |      |           |                |           |              |
| `share-qr-survives-level-change`     |                |      |         2 |                |           |              |
| `verdict-invalid-shows-tick`         |                |      |           |              2 |         1 |              |
| `verdict-valid-trailing-text`        |              1 |      |           |              2 |         1 |              |
| `validation-dense-hint-always`       |                |      |           |              1 |           |              |
| `validation-breakdown-under-non-gs1` |              5 |      |           |              7 |           |              |
| `rows-delete-removes-next`           |              3 |      |           |                |         1 |              |
| `rows-described-by-other-verdict`    |                |      |           |                |         1 |              |
| `rows-add-ignores-new-row-format`    |              2 |      |           |                |         3 |              |
| `gs1-one-ai-plural`                  |                |      |           |              1 |         1 |            2 |
| `gs1-stop-row-missing`               |                |      |           |                |           |            2 |
| `gs1-label-prefix-dropped`           |                |      |           |              1 |         1 |            1 |
| `control-gs1-hint-class`             |              1 |      |           |                |           |              |
| `control-share-url-class`            |             11 |      |         2 |                |           |              |
| `control-verdict-color-classes`      |              4 |      |           |              2 |           |              |

Baselines from the same probe, as the sum of test durations per file, with three identical runs to
within 3%: setup 1.07 s, play 0.48 s, RowEditor 0.50 s, ShareLink 0.12 s, ValidationList 0.05 s,
Gs1Breakdown 0.03 s. That is 2.24 s in all, so the budget is about 5.6 s.

#### Self-test

`--self-test` runs these controls. Each feeds a pure function crafted input, or runs the real
runner on a harmless case, and compares the status. It prints
`self-test <n> <name>: got <STATUS>, expected <STATUS> — ok` (or `— NOT OK`), then
`SELF-TEST: <k> of 37 ok`. It exits 0 only when all 37 are ok. It needs a clean tree before and
after, as a run does.

| #     | Function          | Input                                                                                                       | Expected               |
| ----- | ----------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1     | `checkInventory`  | the same 737 synthetic keys on both sides                                                                   | PASS                   |
| 2     | `checkInventory`  | the branch lacks one key                                                                                    | FAIL                   |
| 3     | `checkInventory`  | 10 keys on each side                                                                                        | UNVERIFIED             |
| 4     | `checkInventory`  | a rename whose `from` and `to` are both absent                                                              | FAIL                   |
| 5     | `checkEvents`     | main sequences of the `EVENTS_ON_MAIN` lengths, branch texts equal                                          | PASS                   |
| 6     | `checkEvents`     | RowEditor's branch text changed, sequence unchanged (no `<details>` click)                                  | FAIL                   |
| 7     | `checkEvents`     | main page sequence of 59                                                                                    | UNVERIFIED             |
| 8     | `checkCounts`     | one test 3 → 2, not listed                                                                                  | FAIL                   |
| 9     | `checkCounts`     | a listed drop whose counts are equal                                                                        | FAIL                   |
| 10    | `checkCounts`     | a test with 2 of 3 counts                                                                                   | UNVERIFIED             |
| 11    | `checkCounts`     | a test counted 3, 3, 4                                                                                      | UNVERIFIED             |
| 12    | `checkPairing`    | `expect(screen.queryByRole('alert')).toBeNull();` alone                                                     | FAIL                   |
| 13    | `checkPairing`    | the same plus `screen.getByRole('alert');`                                                                  | PASS                   |
| 14    | `checkPairing`    | `const x = screen.queryByText('a');` plus a paired absence check                                            | FAIL                   |
| 15    | `checkPairing`    | a file with presence queries only                                                                           | UNVERIFIED             |
| 16    | `checkPairing`    | `expect(screen.queryByText(/\(01\) GTIN/)).toBeNull(); screen.getByText(/\(01\) GTIN/);`                    | PASS                   |
| 17    | `checkPairing`    | `expect(\n\t\twithin(row).queryByLabelText(BREAKDOWN)\n\t).toBeNull();` plus `getAllByLabelText(BREAKDOWN)` | PASS                   |
| 18    | `classifyBreak`   | old {a}, new {a, b}                                                                                         | PASS                   |
| 19    | `classifyBreak`   | old {a, b}, new {a}                                                                                         | FAIL                   |
| 20    | `classifyBreak`   | old {}, full run                                                                                            | UNVERIFIED             |
| 21    | `classifyBreak`   | old run not ok                                                                                              | UNVERIFIED             |
| 22    | `classifyBreak`   | old {a rename's `from`}, new {its `to`}                                                                     | PASS                   |
| 23–25 | `classifyControl` | old {a} new {}; old {a} new {a}; old {} full                                                                | PASS; FAIL; UNVERIFIED |
| 26–28 | `checkTiming`     | ratio 2.0; ratio 3.0; a file missing                                                                        | PASS; FAIL; UNVERIFIED |
| 29    | `checkMarkers`    | `// eslint-disable-next-line testing-library/no-node-access` with no reason                                 | FAIL                   |
| 30    | `checkMarkers`    | the same with `-- stage structure: the engine's items`                                                      | PASS                   |
| 31    | patch application | `{ file: 'src/routes/+page.svelte', find: 'NO SUCH TEXT', replace: '' }`; file bytes unchanged              | UNVERIFIED             |
| 32    | patch application | `find: 'class="field"'`, which occurs more than once; file bytes unchanged                                  | UNVERIFIED             |
| 33    | the Vitest runner | `src/no-such-file.test.ts`                                                                                  | UNVERIFIED             |
| 34–37 | `exitCode`        | [PASS, UNVERIFIED] full → 1; [PASS, FAIL] full → 1; [PASS] full → 0; [PASS] partial → 2                     | ok                     |

- [ ] **Step 1: Write `scripts/verify-test-migration.ts`**

Write the tables verbatim. Write the functions with the signatures and rules above, the runner, the
flow, the self-test, and a `main()` that dispatches on `process.argv.slice(2)`. Start the file with a
doc comment that names the spec section it implements and says the file is deleted in the PR's
last commit. Run `npx prettier --write scripts/verify-test-migration.ts`.

- [ ] **Step 2: Type-check and lint**

Run: `npm run check`
Expected: 0 errors, 0 warnings. `scripts/` is in `svelte-check`'s scope.

Run: `npx eslint scripts/verify-test-migration.ts`
Expected: clean.

- [ ] **Step 3: Commit, then run the self-test**

```bash
git add scripts/verify-test-migration.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "test: add the test-migration checker"
```

Run: `node scripts/verify-test-migration.ts --self-test`
Expected: 37 lines ending `— ok`, then `SELF-TEST: 37 of 37 ok`, exit 0. Then `git status --short`
prints nothing. Fix any `NOT OK`, run `git commit --amend --no-edit`, and run it again.

- [ ] **Step 4: Run a partial check before any migration**

Run: `node scripts/verify-test-migration.ts --only src/lib/components/Gs1Breakdown.test.ts`
Expected, in order, with exit 1:

```text
[PASS] clean tree
verify-test-migration: HEAD <short> against base 797bbad (merge-base of HEAD and main)
[PASS] 1 inventory: 737 pairs on main, 737 on the branch, equal after 0 renames, 8 pending in files not yet migrated
[PASS] 2 events: 0 fireEvent calls on main, 0 on the branch; sequences equal
[UNVERIFIED] 4 presence pairing: no absence check in scope
[PASS] 8 fallback markers: 0 markers
[PASS] 5 old tests on the new components: 13 of 13 pass in each of 3 runs
[PASS] 3 assertion counts: 13 tests compared, 0 drops, every drop listed
[PASS] 6 break gs1-one-ai-plural: old 2 failing, new 2 failing, all old covered
[PASS] 6 break gs1-stop-row-missing: old 2 failing, new 2 failing, all old covered
[PASS] 6 break gs1-label-prefix-dropped: old 1 failing, new 1 failing, all old covered
[PASS] 6 breaks: 3 breaks and 0 controls seen, all pass; 17 breaks and 3 controls do not touch this file's old tests; the full run checks them
[INFO] 7 timing (partial run, not judged): 0.03 s before, 0.03 s after (1.0x)
[PASS] clean tree afterwards
UNVERIFIED: 4 presence pairing
RESULT: UNVERIFIED
```

The exact detail wording may differ, but the statuses, the counts and the order of checks may not.
`main`'s files hold no `queryBy…` call, so check 4 reads nothing, and UNVERIFIED is the correct
result here.

- [ ] **Step 5: Run the full check before any migration**

Run: `node scripts/verify-test-migration.ts`
Expected, after about 4 minutes, with exit 1:

- `[FAIL] 1 inventory`, with 8 pending renames;
- `[PASS] 2 events` with 98 calls;
- `[UNVERIFIED] 4 presence pairing`;
- `[PASS] 5` with 169 of 169;
- `[PASS] 3` with 169 tests and 0 drops;
- 20 `[PASS] 6 break` lines, each with the old count from _Measured old failures_ (summed over
  files) and an equal new count;
- 3 `[FAIL] 6 control` lines, because the unmigrated tests still read the classes;
- `[FAIL] 6 breaks: 20 of 20 covered; controls: 0 of 3 pass`;
- `[PASS] 7 timing` near 1.0x;
- `[PASS] 8 fallback markers: 0 markers`;
- `[PASS] clean tree afterwards`;
- `RESULT: FAIL`.

This proves that every check can report each status on real input. Then `git status --short`
prints nothing, and `git worktree list` shows one tree.

- [ ] **Step 6: Suite and lint**

Run: `npm test` and `npm run lint`
Expected: 737 passed, and lint clean. The copies are gone, so the suite still has 31 files.

### Task 4: Migrate `Gs1Breakdown.test.ts`

**Files:**

- Modify: `src/lib/components/Gs1Breakdown.test.ts` (whole file; 13 tests, 0 `fireEvent` calls)
- Modify: `eslint.config.js` (delete the `'src/lib/components/Gs1Breakdown.test.ts',` line from
  `ignores`)
- Modify: `scripts/verify-test-migration.ts` (`PAIRING_EXCEPTIONS`)

**Interfaces:**

- Consumes: Task 1's matchers, Task 3's checker.
- Produces: nothing other tasks use.

Every test renders once, so all queries go through `screen` (R1). The lint rules report 20
`no-node-access` problems here today.

| Old                                                     | New                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `show(props)` returning the container                   | `show(props)` that calls `render(Gs1Breakdown, props)` and returns nothing                               |
| `c.querySelector('details')!.open` is `false`           | `expect(screen.getByRole('cell', { name: 'GTIN' })).not.toBeVisible()`                                   |
| `c.querySelector('summary')` (no label)                 | `screen.getByText('<summary text>')`                                                                     |
| `c.querySelector('summary')` (with a label)             | `screen.getByLabelText('<full label>')`; in the `it.each`, `screen.getByLabelText(BREAKDOWN)`            |
| `summary.hasAttribute('aria-label')` is `false`         | `expect(summary).toHaveAccessibleName('3 Application Identifiers')`: with no label, the name is the text |
| `summary.getAttribute('aria-label')).toBe(N)`           | `expect(screen.getByLabelText(N)).toBeInTheDocument()` (R5)                                              |
| `rows(c)` (`tbody tr` → cell texts)                     | `rows()`, below                                                                                          |
| `tr.children[0]` is a `TH` with `scope="row"`           | per body row: `getByRole('rowheader')` is in the document and `toAppearBefore` the row's first cell      |
| `thead th span.visually-hidden` texts                   | `screen.getAllByRole('columnheader').map((h) => h.textContent)`                                          |
| `c.querySelector('p')` is null                          | `expect(screen.queryByRole('paragraph')).toBeNull()`                                                     |
| `tbody tr:last-child`                                   | the last of `screen.getAllByRole('row')` (the old test took the last)                                    |
| `last.children.length` 1 and `children[0].tagName` `TD` | `within(last).getAllByRole('cell')` has length 1, and `within(last).queryByRole('rowheader')` is null    |
| `getAttribute('colspan')).toBe('3')`                    | `expect(within(last).getByRole('cell')).toHaveAttribute('colspan', '3')`                                 |
| `c.textContent).not.toMatch(…)`                         | `expect(screen.getByRole('group')).not.toHaveTextContent(…)`: the `<details>` is the one group           |
| `summary.getAttribute('aria-label')).not.toMatch(…)`    | `expect(screen.getByLabelText(BREAKDOWN)).not.toHaveAccessibleName(…)`                                   |

Helpers, replacing `show`, `rows` and `GS`'s neighbors (keep `T` and `GS`):

```ts
const BREAKDOWN = /^Code \d+ breakdown: /; // Questions 3: the labelled summary, whose text varies
const HEADER = 'Application Identifier Name Value'; // the header row's computed name
const show = (props: { data: string; label?: string; today?: Date }) => {
	render(Gs1Breakdown, props);
};
/** The table's body rows: every row but the header row. */
const bodyRows = () => {
	const header = screen.getByRole('row', { name: HEADER });
	return screen.getAllByRole('row').filter((row) => row !== header);
};
/** Each body row as its cells' text: the row header, if any, then the data cells. */
const rows = () =>
	bodyRows().map((row) =>
		[...within(row).queryAllByRole('rowheader'), ...within(row).getAllByRole('cell')].map(
			(cell) => cell.textContent
		)
	);
```

- [ ] **Step 1: Take the file out of `ignores`, and see the problems**

Delete its line from `ignores`. Run: `npx eslint src/lib/components/Gs1Breakdown.test.ts`
Expected: 20 `testing-library/no-node-access` errors.

- [ ] **Step 2: Migrate the file**

Apply the table. The worked example is the first test, whose 12 assertions stay 12:

```ts
it('shows a closed disclosure with one row per AI', () => {
	show({ data: `010950110153000310LOT42${GS}17261231`, today: T });
	expect(screen.getByRole('cell', { name: 'GTIN' })).not.toBeVisible();
	const summary = screen.getByText('3 Application Identifiers');
	expect(summary.textContent).toBe('3 Application Identifiers');
	expect(summary).toHaveAccessibleName('3 Application Identifiers');
	expect(rows()).toEqual([
		['(01)', 'GTIN', '09501101530003'],
		['(10)', 'BATCH/LOT', 'LOT42'],
		['(17)', 'USE BY or EXPIRY', '2026-12-31']
	]);
	for (const row of bodyRows()) {
		const header = within(row).getByRole('rowheader');
		expect(header).toBeInTheDocument();
		expect(header).toAppearBefore(within(row).getAllByRole('cell')[0]);
	}
	expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
		'Application Identifier',
		'Name',
		'Value'
	]);
	expect(screen.queryByRole('paragraph')).toBeNull();
});
```

Each summary text check (`'1 Application Identifier'`, `'… then reading stops'`,
`'No readable Application Identifiers'`) becomes `expect(screen.getByText(S).textContent).toBe(S)`
(R3). In "shows only the stop row when nothing reads", the row count is
`expect(bodyRows()).toHaveLength(1)`, and the `toContain` becomes
`expect(bodyRows()[0]).toHaveTextContent('The bracketed string could not be split into Application Identifiers')`.

- [ ] **Step 3: Run the file and lint it**

Run: `npx vitest run src/lib/components/Gs1Breakdown.test.ts`
Expected: `Tests 13 passed (13)`.

Run: `npx eslint src/lib/components/Gs1Breakdown.test.ts`
Expected: clean.

- [ ] **Step 4: Record the pairing exception**

Nothing in this file renders a paragraph, so the paragraph absence check has no presence twin. Add:

```ts
"src/lib/components/Gs1Breakdown.test.ts :: ByRole('paragraph')":
	'Gs1Breakdown renders no paragraph in any of these tests, so a presence twin would need a new render; page.test.ts finds the paragraph role (the switch note)',
```

- [ ] **Step 5: Suite, lint, commit, checker**

Run: `npm test` and `npm run lint`. Expected: 737 passed, lint clean.

```bash
git add src/lib/components/Gs1Breakdown.test.ts eslint.config.js scripts/verify-test-migration.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "test: query Gs1Breakdown by role and text"
```

Run: `node scripts/verify-test-migration.ts --only src/lib/components/Gs1Breakdown.test.ts` (R12)
Expected, with exit 2:

- `[PASS] 2 events: 0 … 0`;
- `[PASS] 4 presence pairing: 2 absence checks, 1 paired, 1 listed exceptions`;
- `[PASS] 5` with 13 of 13;
- `[PASS] 3 assertion counts: 13 tests compared, 0 drops`;
- `gs1-one-ai-plural`, `gs1-stop-row-missing` and `gs1-label-prefix-dropped` PASS, with old counts
  2, 2 and 1;
- `RESULT: PARTIAL PASS for src/lib/components/Gs1Breakdown.test.ts`.

### Task 5: Migrate `ShareLink.test.ts`

**Files:**

- Modify: `src/lib/components/ShareLink.test.ts` (whole file; 16 tests, 10 `fireEvent` calls)
- Modify: `eslint.config.js` (delete its `ignores` line), `scripts/verify-test-migration.ts`
  (`COUNT_DROPS`)

**Interfaces:**

- Consumes: Task 2's `Copy status` and `QR code status` names, Task 3's checker.
- Produces: nothing other tasks use.

Every test renders once, so all queries go through `screen`. The `rerender` call is destructured
(`const { rerender } = render(…)`), which the naming rule allows. Lint reports 9 `no-node-access`
and 1 `no-container` here today.

| Old                                                             | New                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `.copy-link`                                                    | `screen.getByRole('button', { name: 'Share link' })`                                                   |
| `.share-url` (and its `.value`)                                 | `screen.getByRole('textbox', { name: 'Share link' })`, with `toHaveValue(…)`                           |
| `.share-ecc-input`                                              | `screen.getByRole('combobox', { name: 'Share QR error correction' })`                                  |
| `select.options` texts and values                               | `within(select).getAllByRole('option')`, mapped to `.textContent` and `(o as HTMLOptionElement).value` |
| `select.value).toBe('M')`                                       | `expect(select).toHaveValue('M')`                                                                      |
| `.share-ecc-field` text `toMatch(/^Share QR error correction/)` | `expect(screen.getByRole('combobox', { name: 'Share QR error correction' })).toBeInTheDocument()`      |
| `.qr-status`                                                    | `screen.getByRole('status', { name: 'QR code status' })`                                               |
| `getAttribute('role')).toBe('status')`                          | `expect(status()).toBeInTheDocument()`: found by the role                                              |
| `.copy-status`                                                  | `screen.getByRole('status', { name: 'Copy status' })`                                                  |
| `.qr-code`                                                      | `qrImage()`, below: found by label, because a hidden element has no role to find                       |
| `qr.hidden).toBe(false)` / `toBe(true)`                         | `expect(qrImage()).toBeVisible()` / `.not.toBeVisible()`                                               |
| `qr.querySelector('svg')).not.toBeNull()` / `.toBeNull()`       | `expect(qrImage()).not.toBeEmptyDOMElement()` / `.toBeEmptyDOMElement()`: the image holds only the SVG |
| `container.querySelector('.url-warning')).toBeNull()`           | removed (_Test names_; M9)                                                                             |
| `getAttribute('aria-label')).toBe('Share link')`                | `expect(screen.getByRole('textbox', { name: 'Share link' })).toBeInTheDocument()` (R5)                 |

```ts
const status = () => screen.getByRole('status', { name: 'QR code status' });
const qrImage = () => screen.getByLabelText('QR code for the share link');
const setLevel = (v: string) =>
	fireEvent.change(screen.getByRole('combobox', { name: 'Share QR error correction' }), {
		target: { value: v }
	});
```

Inside `describe('copy confirmation')`,
`const copyStatus = () => screen.getByRole('status', { name: 'Copy status' });`. Exact text checks
stay exact: `expect(status().textContent).toBe(DENSE)`, and
`await vi.waitFor(() => expect(copyStatus().textContent).toBe('Link copied.'))`.

- [ ] **Step 1: Take the file out of `ignores`**, and run `npx eslint` on it. Expected: 10 errors.
- [ ] **Step 2: Migrate.** Rename the two tests from the spec's table:
      `shows the live URL before any click` and `renders the QR code image on click`.
      Delete the `.url-warning` line. Every other assertion maps one to one.
- [ ] **Step 3: Run and lint the file.** `npx vitest run src/lib/components/ShareLink.test.ts`
      Expected: `Tests 16 passed (16)`. Then `npx eslint` on the file. Expected: clean.
- [ ] **Step 4: Record the one drop**

```ts
'src/lib/components/ShareLink.test.ts :: ShareLink > shows the live URL before any click':
	'the .url-warning assertion is removed: c0cd905 removed that element, so the assertion could not fail (spec, Test names; M9)',
```

- [ ] **Step 5: Suite, lint, commit, checker**

Run `npm test` and `npm run lint`. Then commit with the message
`test: query ShareLink by role and label`, adding the test file, `eslint.config.js` and the script.

Run: `node scripts/verify-test-migration.ts --only src/lib/components/ShareLink.test.ts`
Expected, with exit 1:

- `[PASS] 1 inventory`, with 2 renames applied;
- `[PASS] 2 events: 10 … 10`;
- `[UNVERIFIED] 4 presence pairing: no absence check in scope`. ShareLink has none left: the
  `.url-warning` check is removed, and the SVG checks are `toBeEmptyDOMElement`, not queries. The
  full run reads all six files, so this resolves there;
- `[PASS] 3`: 16 tests, 1 drop, listed;
- `share-never-copied` 2 and `share-qr-survives-level-change` 2, both PASS;
- `control-share-url-class: old 2 failing, new 0 failing`, PASS;
- `UNVERIFIED: 4 presence pairing`.

Any other UNVERIFIED or FAIL line is a defect: fix it and amend.

### Task 6: Migrate `ValidationList.test.ts`

**Files:**

- Modify: `src/lib/components/ValidationList.test.ts` (whole file; 15 tests)
- Modify: `eslint.config.js` (delete its `ignores` line)

**Interfaces:**

- Consumes: Task 2's `Validation results` name, Task 3's checker.
- Produces: nothing other tasks use.

**Multi-render tests (R1):** "shows the dense hint only when an entry is dense" (`hint()` twice),
"shows a lax render as rendered anyway…" (`list()` twice), and "shows no scan hint without a GS1
entry" (two renders). Every helper that renders returns the container, and every query in this file
goes through `within(<container>)`. Lint reports 32 `no-node-access` and 7 `no-container` today.

```ts
const BREAKDOWN = /^Code \d+ breakdown: /; // Questions 3
const HEADER = 'Application Identifier Name Value';
const exactText = (scope: HTMLElement, text: string) =>
	within(scope).getByText(text.trim()).textContent; // R3
/** The validation list's items in the render whose container is `c`. */
const items = (c: HTMLElement) =>
	within(within(c).getByRole('list', { name: 'Validation results' })).getAllByRole('listitem');
/** The body rows of the one breakdown table in `scope`, each as its cells' text. */
const bodyRows = (scope: HTMLElement) => {
	const header = within(scope).getByRole('row', { name: HEADER });
	return within(scope)
		.getAllByRole('row')
		.filter((row) => row !== header)
		.map((row) =>
			[...within(row).queryAllByRole('rowheader'), ...within(row).getAllByRole('cell')].map(
				(cell) => cell.textContent
			)
		);
};
const rowTexts = (entries: CodeEntry[]) =>
	items(render(ValidationList, { entries }).container).map((li) => li.textContent);
```

`hint(entries)` and `list(text, lax)` return `render(…).container`. Single-render tests keep
`const { container } = render(…)` and pass `container` to `items`/`within`. That is not
`no-container`, which flags only container methods.

| Old                                                | New                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `.validation-list li` (all / first)                | `items(c)` / `items(c)[0]`: the old took the first                                                                       |
| `querySelectorAll('.validation-list li').length` 0 | `expect(within(within(c).getByRole('list', { name: 'Validation results' })).queryAllByRole('listitem')).toHaveLength(0)` |
| `li .raw` / `li .verdict` text                     | `exactText(<item or container>, '<raw>')` / `exactText(…, '<verdict>')`                                                  |
| `.verdict` spans `not.toContain('→')`              | each item: `expect(item).not.toHaveTextContent('→')`. Those items' raw text holds no arrow                               |
| `.dense-hint` / `.scan-hint`                       | `within(c).getByText(DENSE_HINT)` / `SCAN_HINT`; their absence uses `queryByText`                                        |
| class reads (R6)                                   | see the two cases below                                                                                                  |
| `summary` aria-labels in order                     | `within(c).getAllByLabelText(BREAKDOWN).map((s) => s.getAttribute('aria-label'))`                                        |
| `items[2].querySelector('details')` null           | `expect(within(items(c)[2]).queryByLabelText(BREAKDOWN)).toBeNull()`                                                     |
| `tbody tr` cells of one breakdown                  | `bodyRows(items(c)[0])`, or `bodyRows(container)` for the one-entry test                                                 |

R6 cases:

- **"renders one item per entry with its verdict and copy"** (renamed). Each class read becomes the
  verdict span's exact text, next to the item's whole-text check, so the count stays 5:

  ```ts
  const [first, second] = items(container);
  expect(items(container)).toHaveLength(2);
  expect(exactText(first, ' ✓')).toBe(' ✓');
  expect(first.textContent).toBe('036000291452 ✓');
  expect(exactText(second, ' ✗ invalid')).toBe(' ✗ invalid');
  expect(second.textContent).toBe('bad ✗ invalid');
  ```

- **"shows a lax render as rendered anyway, and the scan hint for GS1 entries"** (renamed). The class
  list `[['valid'], ['lenient']]` becomes the first item's exact verdict, because the second item's
  verdict is already asserted:

  ```ts
  const VALID_S = ' ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42';
  expect(exactText(items(c)[0], VALID_S)).toBe(VALID_S);
  ```

  The last line, `li.invalid` counting 1 in the strict render, becomes
  `expect(exactText(items(strict)[0], ' ✗ (01) GTIN: Bad checksum')).toBe(' ✗ (01) GTIN: Bad checksum')`,
  where `const strict = list('(01)09501101530004', false)`. Its count stays 5.

The third rename, "separates each row's raw text from its verdict with a space", is
`exactText(container, 'hello world')` → `'hello world'`, and
`exactText(container, ' ✓ · 21×21 modules · 11 bytes')` → the same text, with its leading space.

- [ ] **Step 1: Take the file out of `ignores`.** `npx eslint` on it. Expected: 39 errors.
- [ ] **Step 2: Migrate**, with the three renames from the spec's table.
- [ ] **Step 3: Run and lint the file.** Expected: `Tests 15 passed (15)`; lint clean.
- [ ] **Step 4: Suite, lint, commit (`test: query ValidationList by role and text`), checker**

Run: `node scripts/verify-test-migration.ts --only src/lib/components/ValidationList.test.ts`
Expected, with exit 2:

- inventory: 5 renames applied;
- `[PASS] 4 presence pairing`: 5 absence checks, 5 paired, 0 exceptions;
- `[PASS] 3`: 15 tests, 0 drops;
- six breaks PASS, with old counts `verdict-invalid-shows-tick` 2, `verdict-valid-trailing-text` 2,
  `validation-dense-hint-always` 1, `validation-breakdown-under-non-gs1` 7, `gs1-one-ai-plural` 1
  and `gs1-label-prefix-dropped` 1;
- `control-verdict-color-classes: old 2 failing, new 0 failing`;
- `RESULT: PARTIAL PASS …`.

### Task 7: Migrate `RowEditor.svelte.test.ts`

**Files:**

- Modify: `src/lib/components/RowEditor.svelte.test.ts` (whole file; 18 tests, 7 `fireEvent` calls
  that become 8)
- Modify: `eslint.config.js` (delete its `ignores` line)

**Interfaces:**

- Consumes: Task 2's `Codes` list name, Task 3's checker.
- Produces: nothing other tasks use.

**Multi-render tests (R1):**

- "numbers the rows from 1, and shows the row hint with rows and without";
- "shows the dense hint only when a row is dense";
- "shows the GS1 hint and lax note for a GS1 row or new-row format, and the scan hint for a GS1
  entry".

`mount()` keeps setting `let c`, so the whole file queries through `ui()`. Lint reports 30
`no-node-access` today.

```ts
const BREAKDOWN = /^Code \d+ breakdown: /; // Questions 3
const ui = () => within(c);
const exactText = (scope: HTMLElement, text: string) =>
	within(scope).getByText(text.trim()).textContent; // R3
const rowItems = () => within(ui().getByRole('list', { name: 'Codes' })).getAllByRole('listitem');
/** Row k, counting from 1, as the old `at(k, …)` took it. */
const row = (k: number) => rowItems()[k - 1];
const click = (el: HTMLElement) => fireEvent.click(el);
const change = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
/** After a tick, the element that `get` finds has focus. It is found after the tick, because a move renames buttons. */
const focusIs = async (get: () => HTMLElement) => {
	await tick();
	expect(get()).toHaveFocus();
};
```

`all`, `at`, `values`, `labels`, `texts` and `pClasses` go. Find a row's controls by their exact
numbered names: `Code k`, `Format of code k`, `Error correction of code k`,
`Render code k if invalid`, `Move up, code k`, `Move down, code k`, `Delete code k`, and
`Add code`. Use `as HTMLTextAreaElement`/`HTMLSelectElement` only where a `.value` is read into a
list.

| Old                                                        | New                                                                                                                                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `texts('.row-number')` → `['1', '2', '3']`                 | `rowItems().map((item, i) => exactText(item, String(i + 1)))`                                                                                                          |
| `.row-hint` text                                           | `exactText(c, ROW_HINT)`                                                                                                                                               |
| `values('.row-payload')`                                   | ``rowItems().map((_, i) => (ui().getByRole('textbox', { name: `Code ${i + 1}` }) as HTMLTextAreaElement).value)``                                                      |
| `labels('.row-payload')` (R5)                              | `rowItems().map((item) => within(item).getByRole('textbox').getAttribute('aria-label'))`                                                                               |
| `labels('.row-format')`, and optgroup and option counts    | per row, ``within(item).getByRole('combobox', { name: `Format of code ${i + 1}` })``, with `getAllByRole('group')` and `getAllByRole('option')` inside it              |
| `describedby` → `getElementById` is the row's verdict      | `expect(ui().getByRole('textbox', { name: 'Code k' })).toHaveAccessibleDescription(V)`, for `V` = `'✓'`, `'✓ · 25×25 modules · 11 bytes'`, `'skipped (empty)'`         |
| `at(1, '.row-ecc')).toBeNull()`                            | `expect(within(row(1)).getAllByRole('combobox')).toHaveLength(1)`: only the format select. Row 1 is UPC-A in every render, so a named absence check would have no twin |
| `at(k, '.row-ecc')!.value`                                 | `expect(ui().getByRole('combobox', { name: 'Error correction of code k' })).toHaveValue(…)`                                                                            |
| `labels('.row-ecc')`                                       | per row that has one, `getByRole('combobox', { name: 'Error correction of code k' })` is in the document                                                               |
| `li.row` count                                             | `expect(rowItems()).toHaveLength(n)`                                                                                                                                   |
| `.row-up`/`.row-down` `.disabled`                          | `toBeDisabled()` on `Move up, code 1` / `Move down, code 3`                                                                                                            |
| `focusIs(k, sel)` / `focusIs(0, '.row-add')`               | `focusIs(() => ui().getByRole('button', { name: 'Move down, code 2' }))` / `{ name: 'Add code' }`                                                                      |
| `texts('.row-verdict')`                                    | `rowItems().map((item, i) => exactText(item, V[i]))` against the same `V` list                                                                                         |
| verdict class lists                                        | per row, ``expect(ui().getByRole('textbox', { name: `Code ${i + 1}` })).toHaveAccessibleDescription(V[i].trim())`` (R6), replacing the one class-list assertion        |
| `.row-lax` null / `.row-lax-input` checked / label text    | `queryByRole('checkbox', { name: 'Render code 1 if invalid' })` null / `toBeChecked()` / `exactText(row(2), 'Render if invalid')!.trim()`                              |
| row 3's controls in class order                            | worked example below                                                                                                                                                   |
| `.dense-hint` / `.gs1-hint` / `.lax-note` / `.scan-hint`   | `ui().getByText(DENSE_HINT)` and so on; the dense absence uses `ui().queryByText(DENSE_HINT)`                                                                          |
| `pClasses()`                                               | `ui().getAllByRole('paragraph').map((p) => p.textContent)`, against the hint constants in order (`[ROW_HINT]`, `[ROW_HINT, GS1_HINT, LAX_NOTE]`, …)                    |
| `details.gs1-breakdown` count / `summary` labels           | `ui().getAllByLabelText(BREAKDOWN)` has length 2 / `within(row(1)).getByLabelText('Code 1 breakdown: 3 Application Identifiers')` is in the document                   |
| `at(2, 'details')` null; `.row-verdict` holds no `details` | `within(row(2)).queryByLabelText(BREAKDOWN)` null; `within(<verdict span from getByText>).queryByLabelText(BREAKDOWN)` null                                            |
| `.row-controls` `nextElementSibling` is the `details`      | `expect(within(row(1)).getByRole('button', { name: 'Delete code 1' })).toAppearBefore(within(row(1)).getByLabelText('Code 1 breakdown: 3 Application Identifiers'))`   |

**Worked example: row 3's controls in order** ("shows Render if invalid for GS1 rows only, after the
level select, bound to the row"). The class list becomes the order chain plus a count per role. The
count rises from 1 to 10, which is allowed:

```ts
const third = row(3);
const controls = [
	within(third).getByRole('textbox', { name: 'Code 3' }),
	within(third).getByRole('combobox', { name: 'Format of code 3' }),
	within(third).getByRole('combobox', { name: 'Error correction of code 3' }),
	within(third).getByRole('checkbox', { name: 'Render code 3 if invalid' }),
	within(third).getByRole('button', { name: 'Move up, code 3' }),
	within(third).getByRole('button', { name: 'Move down, code 3' }),
	within(third).getByRole('button', { name: 'Delete code 3' })
];
for (let i = 1; i < controls.length; i++) expect(controls[i - 1]).toAppearBefore(controls[i]);
expect(within(third).getAllByRole('textbox')).toHaveLength(1);
expect(within(third).getAllByRole('combobox')).toHaveLength(2);
expect(within(third).getAllByRole('checkbox')).toHaveLength(1);
expect(within(third).getAllByRole('button')).toHaveLength(3);
```

**Worked example: the `<details>` click** ("keeps the same details element, still open, while the
payload is edited"). Its identity is held through its summary, and its open state is the visibility
of its content (Query rules 4). The added `fireEvent.click` is the one listed event change:

```ts
mount(deck(`gs1128_${S}`));
const summary = ui().getByLabelText('Code 1 breakdown: 3 Application Identifiers');
await fireEvent.click(summary);
await fireEvent.input(ui().getByRole('textbox', { name: 'Code 1' }), {
	target: { value: '(01)09501101530003' }
});
await tick();
expect(ui().getByLabelText('Code 1 breakdown: 1 Application Identifier')).toBe(summary);
expect(ui().getByRole('cell', { name: 'GTIN' })).toBeVisible();
expect(summary.textContent).toBe('1 Application Identifier');
```

Every presence twin for this file's absence checks is a literal query in the same file:

- `Render code 1 if invalid` appears in "clears the flag when a row leaves GS1…", where row 1 starts
  as `gs1128-lax`;
- `Error correction of code 2` appears in "canonicalizes the level…", after the change back to `qr`;
- `DENSE_HINT` and `BREAKDOWN` appear in the same tests as their absence checks.

- [ ] **Step 1: Take the file out of `ignores`.** `npx eslint` on it. Expected: 30 errors.
- [ ] **Step 2: Migrate**, with the two renames from the spec's table. Keep every `fireEvent` call
      site in place (R9). The click on the summary goes immediately before the payload input, which
      is index 6 of the file's sequence.
- [ ] **Step 3: Run and lint the file.** Expected: `Tests 18 passed (18)`; lint clean.
- [ ] **Step 4: Suite, lint, commit (`test: query RowEditor by role and name`), checker**

Run: `node scripts/verify-test-migration.ts --only src/lib/components/RowEditor.svelte.test.ts`
Expected, with exit 2:

- inventory: 2 more renames applied;
- `[PASS] 2 events: 7 fireEvent calls on main, 8 on the branch; sequences equal, apart from the
  <details> click`;
- `[PASS] 4`, with every absence check paired;
- `[PASS] 3`: 18 tests, 0 drops;
- seven breaks PASS, with old counts `rows-delete-removes-next` 1,
  `rows-described-by-other-verdict` 1, `rows-add-ignores-new-row-format` 3,
  `verdict-invalid-shows-tick` 1, `verdict-valid-trailing-text` 1, `gs1-one-ai-plural` 1 and
  `gs1-label-prefix-dropped` 1;
- no control seen;
- `RESULT: PARTIAL PASS …`.

### Task 8: Migrate `play/page.test.ts`

**Files:**

- Modify: `src/routes/play/page.test.ts` (whole file; 37 tests, 21 `fireEvent` call sites)
- Modify: `eslint.config.js` (delete its `ignores` line)

**Interfaces:**

- Consumes: Task 2's `Playback controls`, `Run finished` and `Speed` names, Task 3's checker.
- Produces: the file's fallback markers, which the PR lists.

No test keeps two renders mounted: "validates with the URL level…", "reports a dwell set before
Play…" and the GS1-128 test unmount before rendering again. So the whole file uses `screen`, and
`let c` and `q` go. Lint reports 37 `no-node-access`, 20 `no-container` and 3
`render-result-naming-convention` today.

```ts
const READOUT = /^\d+ \/ \d+ · dwell /; // Questions 3: the step readout, whose text varies
const overlay = () => screen.getByRole('group', { name: 'Playback controls' });
const finish = () => screen.getByRole('group', { name: 'Run finished' });
/** A button in the overlay. The finish screen repeats Restart and Back, so the scope matters. */
const control = (name: string) => within(overlay()).getByRole('button', { name });
const readout = () => screen.getByText(READOUT);
const exactText = (scope: HTMLElement, text: string) =>
	within(scope).getByText(text.trim()).textContent; // R3
// eslint-disable-next-line testing-library/no-node-access -- stage structure: the engine's barcode items have no role (spec 3 may add one)
const stage = (selector = '.barcode-item') => [...document.querySelectorAll<HTMLElement>(selector)];
// fallback -- visual state: the faded overlay is opacity 0, which jsdom does not render (spec 3 can remove this)
const faded = () => overlay().classList.contains('hidden');
```

In `describe('play page: step mode')`, `open()` returns `const view = render(PlayPage)` (it was
`result`). `click` becomes `(el: HTMLElement) => fireEvent.click(el)`, and `key` keeps its body.

| Old                                                      | New                                                                                                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.barcode-item` count / classes / `innerHTML`            | `stage()` (fallback); `.step-stage > .barcode-item` → `stage('.step-stage > .barcode-item')`; `.scroller-track` null → `expect(stage('.scroller-track')).toHaveLength(0)`                      |
| `.barcode-item--2d.barcode-item--qr` and so on           | `stage('.barcode-item--2d.barcode-item--qr')` (fallback); `classList.contains` on `stage()` items stays                                                                                        |
| `.ctl-playpause` (held, text toggles)                    | `const btn = control('Pause')`, then `expect(btn.textContent).toBe('Play')` after the click                                                                                                    |
| `txt('.ctl-playpause')).toBe(X)`                         | `expect(control(X).textContent).toBe(X)`                                                                                                                                                       |
| `.ctl-prev` / `.ctl-next` / `.ctl-restart` / `.ctl-back` | `control('Prev')` / `control('Next')` / `control('Restart')` / `control('Back')`                                                                                                               |
| `.finish-restart` / `.finish-back`                       | `within(finish()).getByRole('button', { name: 'Restart' })` / `{ name: 'Back' }`                                                                                                               |
| `.ctl-counter` text                                      | `exactText(overlay(), '1 / 2')`                                                                                                                                                                |
| `.readout` text `toBe` / `toMatch` / `toContain`         | `readout().textContent` with `toBe`, or `expect(readout()).toHaveTextContent(…)`                                                                                                               |
| `.readout` not inside `.overlay`                         | `expect(within(overlay()).queryByText(READOUT)).toBeNull()`, paired by `readout()` (_Plan decisions_)                                                                                          |
| `.readout` `aria-hidden` / no `aria-live`                | `expect(readout()).toHaveAttribute('aria-hidden', 'true')` / `.not.toHaveAttribute('aria-live')`; the counter: `expect(within(overlay()).getByText('2 / 2')).not.toHaveAttribute('aria-live')` |
| `.ctl-speed`                                             | `within(overlay()).getByRole('slider', { name: 'Speed' })`; absent in step mode → `expect(screen.queryByRole('slider', { name: 'Speed' })).toBeNull()`                                         |
| `.ctl-dwell` / `.ctl-gap`                                | `within(overlay()).getByRole('slider', { name: 'Dwell' })` / `{ name: 'Gap' }`, with `toHaveValue('500')`                                                                                      |
| `.ctl-dwell-seconds` / `.ctl-gap-seconds`                | `{ name: 'Dwell in seconds' }` / `{ name: 'Gap in seconds' }` spinbuttons, with `toHaveDisplayValue('0.50')`                                                                                   |
| aria-label reads on the four step fields (R5)            | `expect(<role query with that name>).toBeInTheDocument()`                                                                                                                                      |
| `.overlay` `classList.contains('hidden')`                | `faded()` (fallback)                                                                                                                                                                           |
| `.finish-text` text                                      | `within(finish()).getByRole('paragraph').textContent` with `toBe`, or `toHaveTextContent` for `toContain`                                                                                      |
| `.finish-status` (held across the finish)                | `const status = screen.getByRole('status')`: the page's one status region; role check → `toBeInTheDocument()`                                                                                  |
| `.finish-screen` / `.finish-text` null                   | `expect(screen.queryByRole('group', { name: 'Run finished' })).toBeNull()`                                                                                                                     |
| `.play` null (bounced)                                   | `expect(screen.queryByRole('group', { name: 'Playback controls' })).toBeNull()`                                                                                                                |
| `document.activeElement` is `.finish-restart`            | `expect(within(finish()).getByRole('button', { name: 'Restart' })).toHaveFocus()`                                                                                                              |
| `el.focus()` on a control                                | the same call on the element found by role                                                                                                                                                     |
| `first` / `result` / `strict` render results             | `const { unmount } = render(PlayPage)` at `:112` and `:460`; `view` in `open()`; the `:342` `first` holds `open()`'s return and stays                                                          |

**Worked example: the step controls in order** ("mounts one code with the step controls in order,
and Next and Prev move the counter"). The class list of the overlay's children becomes the order
chain plus exact lists of the overlay's buttons, sliders and spinbuttons:

```ts
open();
expect(stage('.step-stage > .barcode-item')).toHaveLength(1);
expect(stage('.scroller-track')).toHaveLength(0);
expect(screen.queryByRole('slider', { name: 'Speed' })).toBeNull();
const box = overlay();
const order = [
	control('Play'),
	control('Prev'),
	within(box).getByText('1 / 2'),
	control('Next'),
	within(box).getByRole('slider', { name: 'Dwell' }),
	within(box).getByRole('spinbutton', { name: 'Dwell in seconds' }),
	within(box).getByRole('slider', { name: 'Gap' }),
	within(box).getByRole('spinbutton', { name: 'Gap in seconds' }),
	control('Restart'),
	control('Back')
];
for (let i = 1; i < order.length; i++) expect(order[i - 1]).toAppearBefore(order[i]);
expect(
	within(box)
		.getAllByRole('button')
		.map((b) => b.textContent)
).toEqual(['Play', 'Prev', 'Next', 'Restart', 'Back']);
expect(within(box).getAllByRole('slider')).toHaveLength(2);
expect(within(box).getAllByRole('spinbutton')).toHaveLength(2);
expect(exactText(box, '1 / 2')).toBe('1 / 2');
await click(control('Next'));
expect(exactText(overlay(), '2 / 2')).toBe('2 / 2');
await click(control('Prev'));
expect(exactText(overlay(), '1 / 2')).toBe('1 / 2');
```

In "toggles on Space…", the selector loop becomes a loop over getters, so each element is found when
it is used:

```ts
for (const get of [
	() => control('Next'),
	() => within(overlay()).getByRole('spinbutton', { name: 'Dwell in seconds' }),
	() => within(overlay()).getByRole('spinbutton', { name: 'Gap in seconds' }),
	() => within(overlay()).getByRole('slider', { name: 'Dwell' }),
	() => within(overlay()).getByRole('slider', { name: 'Gap' })
]) {
	const el = get();
	el.focus();
	await key(el, { key: ' ' });
	expect(control('Play').textContent).toBe('Play');
}
```

- [ ] **Step 1: Take the file out of `ignores`.** `npx eslint` on it. Expected: 60 errors.
- [ ] **Step 2: Migrate.** No renames. Stage reads go only through `stage()`, and the faded state
      only through `faded()`. Add no other marker.
- [ ] **Step 3: Run and lint the file.** Expected: `Tests 37 passed (37)`; lint clean, with both
      markers used. An unused directive would fail lint.
- [ ] **Step 4: Suite, lint, commit (`test: query the play page by role and name`), checker**

Run: `node scripts/verify-test-migration.ts --only src/routes/play/page.test.ts`
Expected, with exit 2:

- `[PASS] 2 events: 21 … 21`;
- `[PASS] 4`, every absence check paired;
- `[PASS] 3`: 37 tests, 0 drops. If the checker lists a drop, find the assertion the mapping lost,
  and restore it. Do not list it;
- `[PASS] 8 fallback markers: 2 markers`, with notes naming `stage` and `faded` and their call
  sites;
- breaks `play-counter-one-low` 5, `play-labels-swapped` 5 and `play-back-drops-dwell` 1, all PASS;
- `RESULT: PARTIAL PASS …`.

### Task 9: Migrate `page.test.ts`, part 1

**Files:**

- Modify: `src/routes/page.test.ts:17-508`. These are the module helpers and the `describe` blocks
  `setup page` (22 tests), `setup page: error correction` (4), `setup page: fragment URLs and ecc in
the Start URL` (5) and `setup page: step playback` (8). The file stays in `ignores` until Task 10.
- Do not touch `:510-931` (`setup page: per-row editor`, `setup page: GS1 validation setting`).

**Interfaces:**

- Consumes: Task 2's names, Task 3's checker.
- Produces the module-level helpers that Task 10 reuses:

```ts
const EDITOR_HINT =
	'Per row gives each code its own format, error-correction level and GS1 validation setting, and lets a code span several lines.';
const FLASH_NOTE =
	'Dwells under 0.33 s flash the screen more than three times a second. Do not use them near anyone sensitive to flashing lights.';
const DUP_HINT = /^Codes \d+ and \d+ are identical/; // Questions 3: the duplicate hint, whose text varies
const exactText = (scope: HTMLElement, text: string) =>
	within(scope).getByText(text.trim()).textContent; // R3
const items = () =>
	within(screen.getByRole('list', { name: 'Validation results' })).getAllByRole('listitem');
```

`EDITOR_HINT` is a script constant in `+page.svelte`, not an export, so the test keeps the literal,
as `RowEditor`'s test keeps `ROW_HINT`. `FLASH_NOTE` is the markup text with its line break
collapsed. `getByText` normalizes whitespace, so it matches (probed). `q` goes once Task 10 is done.
Until then, the part-2 code still uses it.

**The setup page's map**, which Task 10 uses too:

| Old                                                                  | New                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.code-input`                                                        | `getByRole('textbox', { name: 'Codes' })`; `.placeholder` → `toHaveAttribute('placeholder', '…')`                                                                                        |
| `.file-input`                                                        | `getByLabelText('Load codes from a file')`                                                                                                                                               |
| `.file-error` shown / hidden                                         | `expect(getByText('Could not read file')).toBeVisible()` / `expect(queryByText('Could not read file')).toBeNull()`. The paragraph is empty while hidden, so its text is what a user sees |
| `.start`                                                             | `getByRole('button', { name: 'Start' })`                                                                                                                                                 |
| `.copy-link` / `.share-url` / `.qr-code`                             | button `Share link` / textbox `Share link` / `getByLabelText('QR code for the share link')`, with Task 5's QR matchers                                                                   |
| `.speed-input` / `.loop-input`                                       | slider `Speed` / checkbox `Loop`                                                                                                                                                         |
| `.rotate-input` / `.rotate-max-input`                                | checkbox `Random rotation` / slider `Maximum rotation`                                                                                                                                   |
| `.skew-input` / `.skew-max-input`                                    | checkbox `Random skew` / slider `Maximum skew`                                                                                                                                           |
| `.format-input`                                                      | combobox `Format` in Plain text, `Format for new rows` in Per row                                                                                                                        |
| `.format-input optgroup` / `option` counts                           | `within(select).getAllByRole('group')` / `getAllByRole('option')`                                                                                                                        |
| `.ecc-input`; `.ecc-field` text starts `Error correction`            | combobox `Error correction`; `expect(<it>).toBeInTheDocument()`                                                                                                                          |
| `selectedOptions[0].textContent`                                     | `toHaveDisplayValue('…')` on the select                                                                                                                                                  |
| `.mode-input` and its options                                        | combobox `Playback`; `within(select).getAllByRole('option').map((o) => [(o as HTMLOptionElement).value, (o as HTMLOptionElement).text])`                                                 |
| `.dwell-input` / `.gap-input`                                        | slider `Dwell` / `Gap`; `getAttribute('min')).toBe('50')` → `toHaveAttribute('min', '50')`, and so on                                                                                    |
| `.dwell-seconds` / `.gap-seconds`                                    | spinbutton `Dwell in seconds` / `Gap in seconds`, with `toHaveDisplayValue('1.00')`                                                                                                      |
| `.flash-note`                                                        | `getByText(FLASH_NOTE)`; absent → `queryByText(FLASH_NOTE)`                                                                                                                              |
| `.dup-hint`                                                          | `getByText(DUP_HINT)`: `toBe` on its `.textContent`, or `toHaveTextContent(/…/)`; absent → `queryByText(DUP_HINT)`                                                                       |
| `.editor-input` / `.editor-hint`                                     | combobox `Editor` / `getByText(EDITOR_HINT)`                                                                                                                                             |
| `.switch-note` / its `role` / `.switch-note p`                       | `getByRole('alert')` / `toBeInTheDocument()` / `within(getByRole('alert')).getByRole('paragraph')`                                                                                       |
| `.switch-anyway` / `.switch-cancel`                                  | button `Switch anyway` / `Cancel`                                                                                                                                                        |
| `.row-editor` / `li.row`                                             | list `Codes` / its listitems; a count of 0 → `queryAllByRole('listitem')` with `toHaveLength(0)`, inline                                                                                 |
| `.row-payload` / `.row-format` / `.row-ecc` / `.row-delete` of row k | textbox `Code k` / combobox `Format of code k` / combobox `Error correction of code k` / button `Delete code k`                                                                          |
| `.row-add`                                                           | button `Add code`                                                                                                                                                                        |
| `.row-lax-input` list                                                | per row, checkbox `Render code k if invalid`, read as `.checked`                                                                                                                         |
| `.row-verdict`, `.validation-list .raw`/`.verdict`                   | `exactText(…)`                                                                                                                                                                           |
| `.lax-input`; `.lax-field` text starts `Render…`                     | checkbox `Render GS1 data that fails validation`; `toBeInTheDocument()`                                                                                                                  |
| `.lax-note` / `.gs1-hint` / `.scan-hint`                             | `getByText(LAX_NOTE)` / `GS1_HINT` / `SCAN_HINT`; counts via `getAllByText(…)` with `toHaveLength`                                                                                       |
| `aria-describedby` equals `.lax-note`'s `id`                         | `expect(box()).toHaveAccessibleDescription(LAX_NOTE)`                                                                                                                                    |
| `.validation-list li` / absent                                       | `items()` / `queryByRole('list', { name: 'Validation results' })`                                                                                                                        |
| `compareDocumentPosition` (`follows`, `precedes`)                    | `toAppearBefore`, one assertion per pair                                                                                                                                                 |
| `document.activeElement`                                             | `toHaveFocus()`                                                                                                                                                                          |
| `formatLabel()` is `Format` / `Format for new rows`                  | `expect(getByRole('combobox', { name: 'Format' })).toBeInTheDocument()` / `{ name: 'Format for new rows' }`                                                                              |
| `has(sel)` true / false                                              | the presence / absence form of that row's query, inline (R7)                                                                                                                             |

**Verdict classes (R6).** None of these tests asserts the row's verdict text, so each class read
becomes that row's exact verdict (probed strings):

| Test (line)                                                    | Class     | Becomes `expect(exactText(items()[0], V)).toBe(V)` with `V` =                                              |
| -------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| flags invalid entries and disables Start… (`:49`)              | `invalid` | `' ✗ invalid'`                                                                                             |
| revalidates on format switch: HELLO… (`:228`)                  | `valid`   | `' ✓'`                                                                                                     |
| prefills the box from lax=1… (`:860`), ticks the box… (`:876`) | `lenient` | `' ⚠ rendered anyway · (01) GTIN: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004'` |
| prefills the box from lax=1… (`:868`), ticks the box… (`:874`) | `invalid` | `' ✗ (01) GTIN: Bad checksum'`                                                                             |

**Helpers keep their `fireEvent` call sites (R9).** `setText`, `choose`, `setEcc`, `set`, `slide`,
`start`, `editor` and `upload` keep their bodies' one call each, and take elements or values in
place of selectors. For example: `const choose = (el: HTMLElement, v: string) => fireEvent.change(el, { target: { value: v } });`
and `const setFormat = (v: string) => choose(screen.getByRole('combobox', { name: 'Format' }), v);`.
In `step playback`, `open()` just renders (`let c` becomes unread, so it goes), and `has` and `v`
go.

**The one multi-render test in part 1** is "generates different seeds across sessions when the URL
has none" (`:134`). It destructures each container and scopes each render:

```ts
const { container: first } = render(SetupPage);
await fireEvent.click(within(first).getByRole('button', { name: 'Share link' }));
const url1 = (within(first).getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value;

const { container: second } = render(SetupPage);
await fireEvent.click(within(second).getByRole('button', { name: 'Share link' }));
const url2 = (within(second).getByRole('textbox', { name: 'Share link' }) as HTMLInputElement)
	.value;
```

The rename: `builds a share URL into .share-url via ShareLink` becomes
`builds a share URL into the Share link field via ShareLink`.

- [ ] **Step 1: Migrate `:17-508`.** Leave `q` defined for part 2.
- [ ] **Step 2: Run the file.** `npx vitest run src/routes/page.test.ts`
      Expected: `Tests 70 passed (70)`.
- [ ] **Step 3: Lint part 1 under the rules, without committing the change.** Delete the file's
      `ignores` line, and run `npx eslint src/routes/page.test.ts`. Expected: every reported
      problem is on `q`'s line (`:17`) or inside the two part-2 `describe` blocks. Restore the `ignores` line,
      and confirm `git diff eslint.config.js` is empty.
- [ ] **Step 4: Suite, lint, commit (`test: query the setup page by role and label, part 1`), checker**

Run: `node scripts/verify-test-migration.ts --only src/routes/page.test.ts`
Expected, with exit 1:

- `[PASS] 1 inventory … equal after 8 renames`;
- `[PASS] 2 events: 60 … 60`;
- `[PASS] 4`, `[PASS] 5` with 70 of 70, and `[PASS] 3` with 70 tests and 0 drops;
- nine breaks PASS, with old counts `setup-start-enabled` 5, `setup-start-drops-seed` 7,
  `setup-gs1-hint-in-per-row` 1, `setup-seconds-not-snapped` 1, `share-field-ignores-new-hash` 5,
  `rows-delete-removes-next` 3, `rows-add-ignores-new-row-format` 2,
  `verdict-valid-trailing-text` 1 and `validation-breakdown-under-non-gs1` 5;
- exactly three FAIL lines, the controls. Each names as still failing only tests in
  `setup page: per-row editor` or `setup page: GS1 validation setting`, which Task 10 migrates.
  `control-share-url-class` must no longer list the four part-1 share tests, and
  `control-verdict-color-classes` must no longer list "flags invalid entries…" or "revalidates on
  format switch…".

A FAIL that names a part-1 test is a defect: fix it and amend.

### Task 10: Migrate `page.test.ts`, part 2, and the first full run

**Files:**

- Modify: `src/routes/page.test.ts:510-931` (31 tests), and remove `q` at `:17`
- Modify: `eslint.config.js` (delete the file's `ignores` line; only the two stage tests remain)

**Interfaces:**

- Consumes: Task 9's helpers and map, Task 3's checker.
- Produces: a fully migrated suite.

**`setup page: per-row editor` scopes through `ui()` (R1)**, because "clears the file error in Per
row on a good read or a switch" opens the page three times without unmounting:

```ts
let c: HTMLElement;
const ui = () => within(c);
const open = (url = 'http://localhost/?codes=036000291452&seed=0') => {
	mockPage.url = new URL(url);
	c = render(SetupPage).container;
};
const rows = () => within(ui().getByRole('list', { name: 'Codes' })).getAllByRole('listitem');
const share = () => (ui().getByRole('textbox', { name: 'Share link' }) as HTMLInputElement).value;
const note = () => within(ui().getByRole('alert')).getByRole('paragraph').textContent;
```

`rowCount()` becomes `rows().length` for counts above 0. A count of 0 is written inline as
`expect(within(ui().getByRole('list', { name: 'Codes' })).queryAllByRole('listitem')).toHaveLength(0)`.
`at(k, sel)` becomes the named query for row k. `values(sel)` becomes a map over `rows()` with
those names, for example
``rows().map((_, i) => (ui().getByRole('combobox', { name: `Format of code ${i + 1}` }) as HTMLSelectElement).value)``.
In this block, every query in Task 9's map goes through `ui()`in place of`screen`, including
`items()`, as `within(ui().getByRole('list', { name: 'Validation results' })).getAllByRole('listitem')`.

**`setup page: GS1 validation setting`** renders once per test, so it uses `screen`. Its `box()`
becomes the `Render GS1 data that fails validation` checkbox. `rowBoxes()` maps the per-row
`Render code k if invalid` checkboxes to `.checked`. The three-way `has` list,
`[has('.lax-input'), has('.lax-note'), has('.gs1-hint')]` equal to `[false, false, false]`,
becomes three inline absence checks. The count rises from 1 to 3.

- [ ] **Step 1: Delete the file's `ignores` line.** `npx eslint src/routes/page.test.ts` now
      reports only part-2 lines.
- [ ] **Step 2: Migrate `:510-931`, and delete `q`.**
- [ ] **Step 3: Run and lint the file.** Expected: `Tests 70 passed (70)`; lint clean.
- [ ] **Step 4: Suite, lint, build, commit (`test: query the setup page by role and label, part 2`)**

Run `npm test`, `npm run lint` and `npm run build`. Expected: 737 passed, lint clean, build ok.
`eslint.config.js`'s `ignores` holds only `ScrollColumn.test.ts` and `StepStage.test.ts`.

- [ ] **Step 5: Partial run**

Run: `node scripts/verify-test-migration.ts --only src/routes/page.test.ts`
Expected, with exit 2:

- Task 9's nine breaks PASS;
- `control-gs1-hint-class` (old 1), `control-share-url-class` (old 11) and
  `control-verdict-color-classes` (old 4), each PASS with 0 new failures;
- `[PASS] 3` with 70 tests and 0 drops;
- `RESULT: PARTIAL PASS …`.

- [ ] **Step 6: The first full run**

Run: `node scripts/verify-test-migration.ts`
Expected, after about 4 minutes, with exit 0:

```text
[PASS] clean tree
verify-test-migration: HEAD <short> against base 797bbad (merge-base of HEAD and main)
[PASS] 1 inventory: 737 pairs on main, 737 on the branch, equal after 8 renames
[PASS] 2 events: 98 fireEvent calls on main, 99 on the branch; sequences equal, apart from the <details> click
[PASS] 4 presence pairing: <a> absence checks, <a - 1> paired, 1 listed exceptions
[PASS] 8 fallback markers: 2 markers
[PASS] 5 old tests on the new components: 169 of 169 pass in each of 3 runs
[PASS] 3 assertion counts: 169 tests compared, 1 drop, every drop listed
[PASS] 6 break …        (20 lines)
[PASS] 6 control …      (3 lines)
[PASS] 6 breaks: 20 of 20 covered; controls: 3 of 3 pass
[PASS] 7 timing: 2.24 s before, <a> s after (<r>x, budget 2.50x)
[PASS] clean tree afterwards
UNVERIFIED: none
RESULT: PASS (full run)
```

If `7 timing` FAILs, narrow the hot tests in the slowest file. Scope queries with `within()` first,
then use `getByLabelText` or `getByText` where they express the same thing. Never use
`{ hidden: true }`. Amend each fix into its own commit, or add a `test:` fix commit, and rerun. If
the sum is still over 2.5×, stop and report the per-file numbers to the owner (_Questions_ 2).

### Task 11: Writing tests in CONTRIBUTING

**Files:**

- Modify: `CONTRIBUTING.md` (a new section after _Stack_, before _Deployment_)

**Interfaces:**

- Consumes: the rules as built in Tasks 1 to 10.
- Produces: the rules for spec 1's new component tests.

- [ ] **Step 1: Add the section**, covering each point in the spec's _Documentation_ list:

```markdown
## Writing tests

The route and component tests follow Testing Library's guiding principle: "The more your tests
resemble the way your software is used, the more confidence they can give you."
([guiding principles](https://testing-library.com/docs/guiding-principles),
[query priority](https://testing-library.com/docs/queries/about))

- **Find elements the way a user does**, in this order: `getByRole` with a name, `getByLabelText`,
  `getByPlaceholderText`, `getByText`, `getByDisplayValue`, then `getByAltText` and `getByTitle`.
  Do not add test IDs. A file input and a `<summary>` have no role, so find them by their label.
- **Use exact names and text**, and the exported constants where they exist (`GS1_HINT`,
  `LAX_NOTE`, `SCAN_HINT`, `DENSE_HINT`). When a query matches more than one element, narrow it with
  `within()`, or give the element an accessible name.
- **Query through `screen`.** A test that renders more than once keeps every render mounted, and
  queries each one with `within(<that render>.container)`.
- **Assert what a user can observe**, with the jest-dom matchers: `toBeDisabled`, `toBeChecked`,
  `toHaveFocus`, `toBeVisible`, `toHaveAccessibleDescription`, `toAppearBefore` and the rest.
  - Exact text stays exact: compare `textContent` with `toBe`, which keeps a verdict's leading
    space. `toHaveTextContent` matches a substring, with whitespace collapsed.
  - Number fields use `toHaveDisplayValue('1.00')`, because `toHaveValue` reads `1.00` as `1`.
  - A verdict's meaning is its text, never its color class.
- **Pair every absence check with a presence check.** A `queryBy…` that expects `null`, or
  `not.toBeInTheDocument()`, needs the same query arguments in a `getBy…` in the same file, so a
  mistyped name cannot pass forever.
- **Two fallbacks may still use a selector**, each marked with its reason on the line above:
  - stage structure, which covers the engine's barcode items, since they have no role:
    `// eslint-disable-next-line testing-library/no-node-access -- stage structure: <reason>`;
  - state that exists only visually, such as the play overlay's faded `hidden` class:
    `// fallback -- visual state: <reason>`.

  Anything else that seems to need a selector is a missing accessible name: fix it with an
  attribute.

- **Lint enforces these rules** for `src/routes/**/*.test.ts` and
  `src/lib/components/**/*.test.ts` (eslint-plugin-testing-library), and reports a stale disable
  comment as an error.
- **The stage tests are exempt.** `ScrollColumn`, `StepStage` and the engine tests check the classes
  the engine renders, which are the contract between the engine and the stage CSS.
- **Events use `fireEvent`** until a later spec decides on `@testing-library/user-event`.
```

- [ ] **Step 2: Check and commit**

Run: `npx prettier --check CONTRIBUTING.md` and `npm run lint`. Expected: clean.

```bash
git add CONTRIBUTING.md
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "docs: add Writing tests to CONTRIBUTING"
```

### Task 12: The acceptance run, the deletion and the PR body

Run this task only after the final review is clean. The deletion must be the PR's last commit. If
any fix lands after Step 3, run `git revert --no-edit <deletion commit>`, make the fix, rerun Step 1,
and delete the script again in a new last commit.

**Files:**

- Delete: `scripts/verify-test-migration.ts`
- Create, outside the repository (not committed): the checker output and the PR body, in the
  session's scratchpad.

**Interfaces:**

- Consumes: everything.
- Produces: the branch, ready for the owner to push and open the PR.

- [ ] **Step 1: The acceptance run.** On the reviewed HEAD, with a clean tree:

Run: `node scripts/verify-test-migration.ts 2>&1 | tee <scratchpad>/verify-test-migration.txt`
Expected: Task 10 Step 6's output, `RESULT: PASS (full run)`, and exit 0. `tee` hides the exit
code, so confirm it with the result line. Then run `npm test`, `npm run lint` and `npm run build`,
and keep their summary lines for the PR. Record the commit that holds the script:
`git log -1 --format=%h`.

- [ ] **Step 2: Delete the script**

```bash
git rm scripts/verify-test-migration.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "test: delete the test-migration checker"
rm -rf node_modules/.cache/verify-test-migration
```

- [ ] **Step 3: Verify the last commit**

Run: `npm test` and `npm run lint`
Expected: 737 passed, 0 `svelte-check` errors, lint clean. Then `git status --short` prints nothing,
`ls scripts` prints `gs1-ais.ts` only, and `git log -1 --format=%s` prints
`test: delete the test-migration checker`.

- [ ] **Step 4: Write the PR body** into the scratchpad from this template. Fill every `<…>` from
      Step 1's output. Carry NO AI attribution and no "Generated with" line. Do not push and do not
      open the PR; the owner does.

````markdown
## Accessible test queries: the UI tests find what a user finds

The six UI test files now find elements by role, label and text, and assert what a user can
observe. The tests themselves do not change: the same 737 tests, the same events and the same
strength. Spec: `docs/superpowers/specs/2026-11-04-accessible-test-queries-design.md`. Plan:
`docs/superpowers/plans/2026-11-04-accessible-test-queries.md`.

### Proof of equivalence

`scripts/verify-test-migration.ts` exited 0 on `<hash>`, the commit that holds it. The last commit
deletes it. Run it again with `git checkout <hash>` and `node scripts/verify-test-migration.ts`.

<details><summary>Full checker output</summary>

```text
<the whole of verify-test-migration.txt>
```

</details>

### Component changes: accessible names only

| Control                  | Where                                      | Fix                                                 |
| ------------------------ | ------------------------------------------ | --------------------------------------------------- |
| Code list textarea       | `src/routes/+page.svelte`                  | `aria-label="Codes"`                                |
| File input               | `src/routes/+page.svelte`                  | `aria-label="Load codes from a file"`               |
| Dwell slider             | `src/routes/+page.svelte`                  | `aria-label="Dwell"`                                |
| Gap slider               | `src/routes/+page.svelte`                  | `aria-label="Gap"`                                  |
| Random rotation checkbox | `src/routes/+page.svelte`                  | `aria-label="Random rotation"`                      |
| Maximum rotation slider  | `src/routes/+page.svelte`                  | `aria-label="Maximum rotation"`                     |
| Random skew checkbox     | `src/routes/+page.svelte`                  | `aria-label="Random skew"`                          |
| Maximum skew slider      | `src/routes/+page.svelte`                  | `aria-label="Maximum skew"`                         |
| Overlay speed slider     | `src/routes/play/+page.svelte`             | `aria-label="Speed"`                                |
| Validation list          | `src/lib/components/ValidationList.svelte` | `aria-label="Validation results"`                   |
| Row editor list          | `src/lib/components/RowEditor.svelte`      | `aria-label="Codes"`                                |
| Copy status              | `src/lib/components/ShareLink.svelte`      | `aria-label="Copy status"`                          |
| Share QR status          | `src/lib/components/ShareLink.svelte`      | `aria-label="QR code status"`                       |
| Overlay                  | `src/routes/play/+page.svelte`             | `role="group"` and `aria-label="Playback controls"` |
| Finish screen            | `src/routes/play/+page.svelte`             | `role="group"` and `aria-label="Run finished"`      |

Further fixes the migration needed: <none | each, with its evidence>.

### Fallbacks and where they are used

<check 8's notes: each marker, and each call site of `stage()` and `faded()`>

### Assertion-count drops, with reasons

<check 3's `drop` notes>

### Presence-pairing exceptions, with reasons

<check 4's `exception` notes>

### The one removed assertion

`ShareLink.test.ts:35` asserted that `.url-warning` is absent. c0cd905 removed that element, so the
assertion could not fail.

### Renamed tests

<the 8 rows of the spec's Test names table>

### Timing per file (sum of test durations, median of 3 runs)

<check 7's notes, and the total against the 2.5× budget>

### Verification

- `npm test`: <svelte-check summary>; 31 files, 737 tests passed
- `npm run lint`: clean
- `npm run build`: <summary>
````

## Out of this plan

- Revising spec 1's text, which happens on `feat/ui-foundation` while this plan runs, and rewriting
  its plan after this PR merges (spec, _Effect on spec 1_).
- `@testing-library/user-event`, visible labels, and the product changes in _Notes for later specs_.

## Execution notes

- **Per task:** one implementer subagent, then a Sonnet reviewer. The reviewer checks the task's
  diff against its table and R1 to R12. They run the task's checker command themselves and compare
  it with the expected lines. A checker that did not run, or whose output is missing, is unverified,
  never a pass.
- **Final review**, in Opus chunks, each reading its diff with `git diff 797bbad -- <paths>`:
  1. Tasks 1 to 3: tooling, attributes and the checker, against _Proving equivalence_ and Task 3's
     rules. Run `--self-test`.
  2. Tasks 4 to 7: the four component test files, test by test against `main`'s versions.
  3. Tasks 8 to 10: the play page and the setup page, test by test.
  4. Task 11 and the whole branch: CONTRIBUTING against _Documentation_, and the latest full checker
     output against _Done means_.
- Task 12 runs after the final review.

# Contributing to scandible

## Setup

Requires Node 24.15 or later; `.nvmrc` holds `24`.

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm test         # svelte-check + Vitest suite (jsdom)
npm run lint     # Prettier check + ESLint
npm run build    # production build to dist/
npm run preview  # serve the production build locally
npm run gs1-ais  # regenerate src/lib/gs1-ais.json from the pinned GS1 Syntax Dictionary
npm run stage-check  # compare the play stage with main in headless Firefox
```

After `npm install <package>`, `npm uninstall` or `npm update`, run `npm install` (or `npx svelte-kit sync`) once more. SvelteKit 3 keeps the TypeScript base that `tsconfig.json` extends in `node_modules/$app/`, and those commands delete it; until it is regenerated, `npm run lint` fails with "Unused eslint-disable directive" errors and the editor loses the project's types.

## Stack

- **SvelteKit** and **Svelte 5** (static-adapter SPA, TypeScript)
- **JsBarcode** for the 21 linear formats (inline SVG)
- **bwip-js** 4.11.4 for the 2D and GS1 formats (inline SVG)
- **Tailwind CSS** 4.3.4 and **daisyUI** 5.7.50 for styling, with one light theme, Instrument, in
  `src/styles.css`
- **Vitest** and **@testing-library/svelte** (jsdom) for the unit tests

Import from `src/lib` through the `#lib/*` entry of `package.json`'s `imports`, naming the file with its
real extension: `#lib/shareUrl.ts`, `#lib/setup.svelte.ts`, `#lib/components/ActionBar.svelte`.
The SvelteKit config (adapter, base path, preprocessing) is the `sveltekit()` options in
`vite.config.ts`; there is no `svelte.config.js`.

## Styling

Tailwind CSS and daisyUI style the app. `src/styles.css` holds the one theme, **Instrument**, and
the global overrides of daisyUI's defaults, and also the setup page's and the play overlay's darker
range tracks. The overlay's focus ring is overridden in `src/lib/components/PlayOverlay.svelte`, the
disabled **Start** button in `src/lib/components/ActionBar.svelte`, and the stage's barcode size
caps are in `src/lib/components/barcode-caps.css`.

- Build setup screens from the shared units in `src/lib/components/`: `Section` (a bordered section
  named by its heading), `Segmented` (radio buttons that look like joined buttons), `Hint` (a long
  hint in a disclosure under its control), `ValueSlider` (a slider that shows its value), `Icon` (an
  inline stroke icon, `size-4` unless given a class), `Field`, `Note`, `SecondsSlider`,
  `FormatSelect` and `EccSelect`. The setup page's state is one `Setup` class in
  `src/lib/setup.svelte.ts`, which each pane takes as its `setup` prop.
- Write Tailwind and daisyUI classes only in `.svelte` files. Tailwind scans no other files, so a
  class written in a `.ts` file is not generated unless the same word happens to appear in a
  `.svelte` file.
- Take every color from the theme tokens: `text-success`, `bg-base-200`, `btn-primary` and so on
  in classes, `var(--color-…)` in CSS. `src/colors.test.ts` fails on a raw color in a `.svelte`
  file: a hex color, a color function (`rgb()`, `hsl()`, `oklch()`, `oklab()`, `lab()`, `lch()`,
  `hwb()` or `color()`), or a Tailwind palette class such as `text-red-600`, `text-red-600/50` or
  `bg-white`. Its palettes are those of Tailwind's theme (`node_modules/tailwindcss/theme.css`),
  and it fails when a Tailwind upgrade changes them. It does not see a named color (`red`,
  `white`) in CSS, in a `style` attribute or in an arbitrary value such as `bg-[red]`, nor a hex
  color in a script string outside a class, so review for those.
- The barcode stage and the share QR keep a literal white background (`#fff`) whatever the theme,
  and the engines draw literal black. The finish screen is `bg-base-100`, as the rest of the app.
  Put no daisyUI or Tailwind class on `ScrollColumn`, `StepStage` or the DOM that `scroller.ts` and
  `stepper.ts` build.
- Run `npm run stage-check` after any change that could touch the play page. It builds `main` and
  the current tree and compares the stage in headless Firefox (`firefox` on your `PATH`): pixel for
  pixel in Step mode at 1280×900 and 390×844, by barcode size in Scroll mode at 1280×900. It exits
  0 on a pass, 1 on a mismatch and 2 when it could not verify; an unverified run is not a pass. To
  compare with another branch, tag or commit, name it: `npm run stage-check -- <ref>`.
- `npm run build` runs `scripts/check-css.ts` afterwards. The build fails if Tailwind's `hidden`
  utility returns (a stray class of that name would hide an element outright), if a theme other than
  Instrument ships, or if a theme token is missing. So `hidden` does nothing as a Tailwind class:
  use the `hidden` attribute or a variant such as `max-sm:hidden`.

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
  `within()`, or give the element an accessible name. An element with no role whose text varies is
  found by one named pattern constant, such as `DUP_HINT`, and the assertions on it stay exact.
- **Query through `screen`.** A test that renders more than once scopes its queries to the render it
  means, usually the latest, with `within(<that render>.container)`. A test that unmounts the
  earlier render first may use `screen`.
- **Assert what a user can observe**, with the jest-dom matchers: `toBeDisabled`, `toBeChecked`,
  `toHaveFocus`, `toBeVisible`, `toHaveAccessibleDescription`, `toAppearBefore` and the rest.
  - Exact text stays exact: compare `textContent` with `toBe`, which keeps a verdict's leading
    space. `toHaveTextContent` matches a substring, with whitespace collapsed.
  - Number fields use `toHaveDisplayValue('1.00')`, because `toHaveValue` reads `1.00` as `1`.
  - A verdict's meaning is its text, never its color class.
- **Pair every absence check with a presence check.** A `queryBy…` that expects `null` or
  `not.toBeInTheDocument()`, or a `queryAllBy…` that expects length 0, needs the same query
  arguments in a `getBy…`, `getAllBy…` or `findBy…` in the same file, so a mistyped name cannot
  pass forever. If the test's render shows no such element, say why in a comment above the check.
- **Two fallbacks may still use a selector**, each marked with its reason on the line above:
  - stage structure, which covers the engine's barcode items, since they have no role:
    `// eslint-disable-next-line testing-library/no-node-access -- stage structure: <reason>`;
  - state that only a real browser shows or acts on, such as a size class, a tooltip drawn from
    `data-tip`, or the `inert` attribute: `// fallback -- visual state: <reason>`, or, when reaching
    the element needs node access,
    `// eslint-disable-next-line testing-library/no-node-access -- visual state: <reason>`.

  Put repeated reads in one marked helper, as `stage()` and `behind()` in
  `src/routes/play/page.test.ts` and `tip()` in `src/lib/components/PlayOverlay.test.ts` do.
  Anything else that seems to need a selector is a missing accessible name: fix it with an
  attribute.

- **Lint enforces part of this** for `src/routes/**/*.test.ts` and
  `src/lib/components/**/*.test.ts` (eslint-plugin-testing-library): no node access, no
  `container`, and queries through `screen`. It reports a stale disable comment as an error in every
  file. No tool checks the query order, the exact names or the pairing: review them.
- **The stage tests are exempt.** `ScrollColumn`, `StepStage` and the engine tests check the classes
  the engine renders, which are the contract between the engine and the stage CSS.
- **Events use `fireEvent`** until a later spec decides on `@testing-library/user-event`.

## Pull requests and deployment

- Every change to `main` goes through a pull request: code, docs, specs, plans and handoffs alike.
  Nobody pushes to `main` directly, the owner included; GitHub refuses the push.
- `CI / checks` runs on every pull request: `npm ci`, `npm run lint`, `npm test` and
  `npm run build`, the same commands as locally (see Setup).
- The merge button works only when `checks` passed and the branch is up to date with `main`. Click
  "Update branch" when GitHub offers it, and the check runs again. The merge box merges whatever the head is when you click, so on someone else's pull request check
  that the head commit is still the one you reviewed.
- Merges are squash only.
- A pull request with a merge conflict runs no check until the conflict is resolved.
- **Merging with `gh`:** agents merge only when the owner asks, and the owner names the commit they
  reviewed. A merge outside the merge box by the owner, who is a bypass actor, may skip the rules
  without asking, so go step by step:
  1. Read the head commit with `gh pr view <number> --json headRefOid --jq .headRefOid`. Stop if it
     is not the commit the owner reviewed.
  2. Run `gh pr checks <number> --required --watch`. Go on only if every required check passed.
  3. Run `gh pr view <number> --json mergeStateStatus --jq .mergeStateStatus`. Go on only if it
     prints `CLEAN`. If it prints `UNKNOWN`, GitHub is still working it out, so run it again. If it
     prints `BEHIND`, run `gh pr update-branch <number>`: the head is then a new merge commit, so the
     owner names it again and you start over at step 1.
  4. Run `gh pr merge <number> --squash --match-head-commit <sha>` with the commit the owner
     reviewed, so the merge fails if the head is no longer that commit.
- **Bypass**, for emergencies only: open the pull request as usual, tick the bypass option in the
  merge box, and say in the pull request why. Direct pushes stay refused even then.
- **Renaming the `checks` job** means changing `.github/rulesets/main.json` in the same pull request.
  What GitHub matches is the check name (`name: checks`), so renaming only the job ID changes
  nothing there. `npm test` (`src/ci.test.ts`) fails until the workflow and
  `.github/rulesets/main.json` agree. That pull request needs the bypass, because the old check name
  never reports. Run the PUT command (see Maintainers, below) right after the merge.
- The `checks` job must have no job-level `if:` or `needs:`, because GitHub counts a skipped
  required check as passed. `src/ci.test.ts` fails if either appears.
- The push to `main` that a merge makes runs the checks again and publishes `dist/` to GitHub Pages
  with `actions/deploy-pages`, from `.github/workflows/ci.yml`. Production builds set SvelteKit's
  `paths.base` to `'/scandible'` for the project-site subpath, adapter-static emits the site to
  `dist/`, and the repository's Pages source is set to **GitHub Actions**.

### Maintainers: the `main` gate

Run these commands from anywhere inside the repository. They send the ruleset as it is on
`origin/main`, never your working copy, so whatever branch you have checked out cannot change the
gate.

First time, after the workflow is on `main` and within seven days of its first green run there:

```
git fetch origin
git show origin/main:.github/rulesets/main.json | gh api --method POST repos/nzneit/scandible/rulesets --input -
gh repo edit nzneit/scandible --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false
```

To change the gate later, change the file in a pull request. After the merge, run `git fetch origin`,
read the ruleset's ID with `gh api repos/nzneit/scandible/rulesets`, then run
`git show origin/main:.github/rulesets/main.json | gh api --method PUT repos/nzneit/scandible/rulesets/<id> --input -`
with the ID typed in.

## Documentation

- [README.md](README.md) is the front page for QA readers: what scandible does, what it can test, a
  quick start and the format list. Keep it short.
- [docs/guide.md](docs/guide.md) holds the full reference. Put new behavior, limits and settings
  there, and link to it from the README's "What you can test" table when a feature opens a new kind
  of test.

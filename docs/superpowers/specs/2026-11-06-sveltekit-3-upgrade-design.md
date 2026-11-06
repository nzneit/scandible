# SvelteKit 3 and a current toolchain — Design

**Date:** 2026-11-06
**Status:** Draft for the owner's review. Design agreed in conversation on 2026-11-05 and
2026-11-06, question by question and then section by section. Not yet reviewed by the three lenses
(_Review_).

Handoff items Q2 ("When to take SvelteKit 3.0") and F4 ("GitHub Actions: Node 20 actions and the
Ubuntu 26 runner move") in `docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md` start this
work. Q2 was settled on 2026-11-04 as "SvelteKit 3 after the UI series, in its own upgrade PR". The
UI series is merged (`1d83452`). Facts measured for this spec are in _Measurements_, cited as _M1_
to _M10_. Facts not yet measured are in _Unverified_, cited as _U1_ to _U15_. Each _U_ item becomes
a probe in _Verification_.

## Intent

**Outcome.** The repository runs on SvelteKit 3.1.1 and on the current majors of the tools around
it. Users see no change.

**Who it is for.** The people and agents who work on the code. The site's users (QA testers with
barcode scanners) must not notice anything.

**Success.** All of these, on the final commit:

- `npm test` (svelte-check and Vitest), `npm run lint`, `npm run build` (with check-css) and
  `npm run stage-check` pass.
- The test count is 1000 or more, and no test was deleted.
- No deprecation warning in the dev, build or test output.
- The setup page and the play screen look the same as on `main`, pixel for pixel.
- Share links made on `main` open the same way.
- After the merge, the first deploy to GitHub Pages succeeds with no Node 20 warning.

**What the owner said:** take SvelteKit 3 at its latest version, as handoff Q2 set out; include
jsdom 31 and the F4 Actions bumps ("Everything current"); stage the work (approach A); approved
sections 1 to 4 of the design.

**What the author assumed, and the owner did not correct:** no visible change; the URLs, the share
link format, the `dist/` output folder and the `/scandible` base path stay the same.

## Decisions

1. **Scope: everything current.** These packages move:

   | Package                        | From    | To     | Why                               |
   | ------------------------------ | ------- | ------ | --------------------------------- |
   | `@sveltejs/kit`                | 2.70.1  | 3.1.1  | the goal                          |
   | `@sveltejs/adapter-static`     | 3.0.10  | 4.0.1  | adapter 3 peers Kit `^2.0.0`      |
   | `@sveltejs/vite-plugin-svelte` | 6.2.4   | 7.3.1  | Kit 3.1.1 peers `^7.0.0`          |
   | `vite`                         | 7.3.6   | 8.3.6  | Kit 3.1.1 peers `^8.0.12`         |
   | `svelte`                       | 5.56.7  | 5.57.3 | Kit 3.1.1 peers `^5.57.1`         |
   | `typescript`                   | 5.9.3   | ~6.0.3 | Kit 3.1.1 peers `^6.0.0` (_D2_)   |
   | `vitest`                       | 3.2.7   | 5.1.0  | Vitest 3 bundles Vite 5 to 7 only |
   | `jsdom`                        | 24.1.3  | 31.0.0 | owner's choice                    |
   | `svelte-check`                 | 4.7.3   | 4.7.8  | latest within the TS 6 limit      |
   | `eslint-plugin-svelte`         | 3.22.0  | 3.24.0 | latest                            |
   | `typescript-eslint`            | 8.65.0  | 8.72.1 | latest; peers TypeScript `<6.1.0` |
   | five GitHub Actions            | various | latest | handoff F4 (_Step 4_)             |

   Every other package keeps its version. The exact pins (bwip-js 4.11.4, Tailwind CSS 4.3.4,
   daisyUI 5.7.50, the Testing Library pins, pngjs) stay as they are. Sources: _M3_, _M4_.

2. **TypeScript 6.0.3, not 7.** TypeScript 7.0.2 is published, but Kit 3.1.1 peers `^6.0.0`,
   svelte-check 4.7.8 peers `^5.0.0 || ^6.0.0`, and typescript-eslint 8.72.1 peers `<6.1.0` (_M4_).
   `package.json` pins `~6.0.3`, so a later 6.1 cannot break typescript-eslint.

3. **Approach A: staged, five steps, one commit each.** Each step passes the full gate before the
   next starts. If a step fails, the cause is in that step.

   - **Step 1:** preparation on Kit 2.70.4 (the latest 2.x).
   - **Step 2a:** the toolchain on Kit 2.70.4. Kit 2.70.4 already peers Vite 8,
     vite-plugin-svelte 7 and TypeScript 6 (_M4_), so the tools move before Kit does.
   - **Step 2b:** Kit 3.1.1.
   - **Step 3:** jsdom 31.
   - **Step 4:** the F4 Actions bumps.

   The migration guide recommends the 2.x step: "We recommend upgrading to the most recent 2.x
   version before upgrading to 3.0 so that you can take advantage of targeted deprecation warnings."

4. **`#lib` with real file extensions.** SvelteKit 3 removes the `$lib` alias. The project uses
   Node's package imports instead (`"imports": { "#lib/*": "./src/lib/*" }`). Every import names
   the real file: `#lib/shareUrl.ts`, `#lib/setup.svelte.ts`, `#lib/components/ActionBar.svelte`.
   Real extensions need no extension search by Vite or TypeScript, and Kit 3's tsconfig base turns
   on `allowImportingTsExtensions` (_M5_). Keeping `$lib` through Kit 3's `alias` option was not
   taken: Kit 3 deprecates that option (_M5_).

5. **The config moves into `vite.config.ts`.** SvelteKit 3 does not read `svelte.config.js`
   (_M5_). Kit 2.70.4 already accepts the config as `sveltekit({ … })` options (added in 2.62), so
   the move happens in step 1 and `svelte.config.js` is deleted there.

6. **`version.pollInterval: 0`.** Kit 3's default is one hour (_M5_). Kit 3 also checks
   `_app/version.json` when the window gains focus or the tab becomes visible, and no option turns
   that off (_M5_). The app shows no "new version" prompt, so an hourly timer adds requests for no
   use.

7. **`src/hooks.client.ts` stays.** It repairs a fragment that `decodeURIComponent` rejects (a
   bare `%`) before the router sees it. A probe records whether Kit 3's router still throws on such
   a fragment (_U8_). The hook stays either way, because keeping it changes nothing for a user.

8. **jsdom 31 changes tests only.** Step 3 changes no product code. If a failure points at product
   behavior, the implementer stops and brings it to the owner.

9. **Actions: latest majors, `ubuntu-latest` kept.** The handoff recommended following
   `ubuntu-latest`, because the build is plain Node.

10. **One branch, one PR.** Branch `build/sveltekit-3` from `main` (`1d83452`). The spec, the plan
    and the five step commits go on it. The owner squash-merges. No AI attribution in any commit or
    in the PR.

11. **Review tiers.** Three lenses review this spec: one Opus, two Sonnet. One Opus agent writes
    the plan. No Fable, unless the owner asks for a Fable judge at spec approval or at final
    acceptance.

## What changes for the user, and what stays

**Stays:** every page, control, text and URL; the share link format; the `dist/` folder; the
`/scandible` base path; the browser floor. Vite 8's default build target (Chrome 111, Edge 111,
Firefox 114, Safari 16.4) is still below the floor Tailwind CSS 4 set in spec 1 (Chrome 111,
Safari 16.4, Firefox 128), so no supported browser is dropped (_M6_).

**Changes, invisibly:**

- Kit 3 fetches `/scandible/_app/version.json` (with `cache-control: no-cache`) when the window
  gains focus or the tab becomes visible. If the fetch fails (for example, offline), nothing
  happens (_M5_).
- After a new deploy, if a navigation needs a code chunk that no longer exists, Kit 3 reloads the
  page at the target URL, with the fragment kept. Today that case shows an error (_M5_).

**Changes for maintainers:** imports use `#lib/…` with the file extension; the config is in
`vite.config.ts`; Node 24.15 or later; TypeScript 6.

## Step 1 — preparation on Kit 2.70.4

1. **Kit 2.70.4.** Raise `@sveltejs/kit` to `^2.70.4`. Run dev, build and the tests, and collect
   every deprecation warning they print. Clear each one, unless clearing it needs Kit 3 (for
   example, `goto`'s new `replace` option). List the warnings and what was done about each in the
   run record (_U11_).

2. **Config into `vite.config.ts`.** The `sveltekit()` call takes the Kit options as top-level
   options:

   ```ts
   sveltekit({
   	preprocess: vitePreprocess(),
   	// Emit to dist/ so the GitHub Pages workflow's upload path is unchanged.
   	adapter: adapter({ pages: 'dist', assets: 'dist' }),
   	// Project-site subpath on GitHub Pages; dev and tests serve from root.
   	paths: { base: process.env.NODE_ENV === 'production' ? '/scandible' : '' },
   	// Type-check the scripts too; removed in step 2b, when tsconfig.json gets its own include.
   	typescript: {
   		config: (config) => {
   			config.include.push('../scripts/**/*.ts');
   		}
   	}
   });
   ```

   The comments of today's `svelte.config.js` move with their options. Then `svelte.config.js` is
   deleted.

   - `eslint.config.js` imports `svelte.config.js` to pass `svelteConfig` to the Svelte parser. The
     import and the `svelteConfig` key go. A probe confirms that lint still reports a deliberate
     break of a Kit-aware rule: a `goto('/x')` without `resolve()` must still fail
     `svelte/no-navigation-without-resolve` (_U9_).
   - svelte-check reads `svelte.config.js` too. A probe confirms svelte-check still reports 0
     errors and 0 warnings, and still reports a deliberate type error placed in a `.svelte` file
     (_U9_).

3. **`$lib` to `#lib`.** Add `"imports": { "#lib/*": "./src/lib/*" }` to `package.json`. There is
   no `src/lib/index.ts`, so no bare `#lib` entry. Rewrite all 93 references (_M2_), including the
   two `vi.mock('$lib/fileInput', …)` calls, to `#lib/<path>` with the real extension.

   - A script, `scripts/migrate-lib-imports.ts`, does the rewrite. For each specifier it finds the
     one file on disk that matches (trying the path as written, then `.ts`, then `.svelte.ts`), and
     fails if there is none or more than one. It prints a count of rewrites per file. It is
     committed in step 1, so a reviewer can re-run it on `main` and get the same diff, and
     deleted in step 2b, after which Kit 3 itself rejects any `$lib` import (_M5_).
   - `tsconfig.json` gets `"allowImportingTsExtensions": true` by hand. Kit 3's base sets it in step
     2b.
   - A probe confirms that Vite 7 and TypeScript 5.9 both resolve `#lib/<path>.ts` imports on Kit
     2.70.4: the tests, svelte-check and the build all pass (_U13_).

4. **Step 1 gate**, besides the common gate (_Verification_): no `$lib` left in `src` or `scripts`;
   `svelte.config.js` gone; the built CSS byte-identical to `main`'s (nothing that feeds the CSS
   changes); JS chunk sizes recorded.

## Step 2a — the toolchain on Kit 2.70.4

Raise Vite, vite-plugin-svelte, Svelte, TypeScript, Vitest, svelte-check, eslint-plugin-svelte and
typescript-eslint to the versions in _Decision 1_. Kit stays on 2.70.4.

Known changes, each found by the research and tied to a line in this repository. The research
quotes the Vitest 4 and 5 migration guides, the TypeScript 6.0 release notes and the Vite 8
migration guide; its report is kept in the run record:

- **TypeScript 6 sets `types` to `[]` by default.** That stops `@types/node` from loading. Three
  tests (`src/lib/gs1Ais.test.ts`, `src/theme.test.ts`, `src/colors.test.ts`) and the three
  scripts use `node:` modules, `process` or `import.meta.main`. `tsconfig.json` gets
  `"types": ["node"]`.
- **TypeScript 6 sets `noUncheckedSideEffectImports` to `true` by default.** `src/vitest.setup.ts`
  imports `@testing-library/jest-dom/vitest` for its side effects, and `src/routes/+layout.svelte`
  imports `../styles.css`. A probe confirms svelte-check accepts both (_U12_).
- **Vitest 5 turns `clearMocks` on by default.** Module-level mocks in
  `src/lib/stepper.test.ts`, `src/routes/page.test.ts`, `src/routes/play/page.test.ts` and
  `src/lib/setup.svelte.test.ts` are cleared before each test. If a test asserts calls made in a
  `beforeEach`, and clearing runs after that hook, it fails (_U1_). Fix if needed:
  `clearMocks: false` in `vite.config.ts`, with the reason in a comment.
- **Vitest 5: assignments to `window` globals in jsdom now update the DOM.** This touches
  `vi.stubGlobal('location', …)` at `src/routes/page.test.ts:531` and
  `src/routes/play/page.test.ts:195`, and the direct `globalThis.requestAnimationFrame =`
  assignments in `src/lib/stepper.test.ts` and `src/lib/scroller.test.ts` (_U2_).
- **Vitest 5 changes `Assertion<T>` to `Assertion<R, T>`.** `@testing-library/jest-dom` 7.0.1
  extends the old one-parameter form. If svelte-check then reports matcher type errors, a local
  `src/types/jest-dom-vitest.d.ts` bridges the two (_U3_). `svelteTesting()` from
  `@testing-library/svelte/vite` peers any Vitest; a probe confirms it still works (_U4_).
- **Vitest 5 prints test titles with `pretty-format`.** Titles of `it.each` tests change in the
  output only. No script filters tests by title.
- **Vite 8 minifies CSS with Lightning CSS.** The CSS bytes will change. check-css requires
  exactly one rule that declares `--color-base-100` (`scripts/check-css.ts:182`). If Lightning CSS
  merges or splits that rule, the check fails (_U5_). The fix is `build.cssMinify: 'esbuild'` with
  `esbuild` as a dev dependency, and the reason in a comment. Weakening check-css is not a fix.
- **Vite 8 bundles with Rolldown, which changes CommonJS interop.** bwip-js, jsbarcode and uqr
  reach the production build. The build, stage-check and the visual comparison prove they still
  render (_U6_). The fallback is `legacy.inconsistentCjsInterop: true`, with the reason in a
  comment.
- **`package.json`.** The caret ranges `vite ^7`, `@sveltejs/vite-plugin-svelte ^6` and
  `typescript ^5.4.0` all move in this step.

Any other failure gets a fix, a line in the run record and, if it changes this design, a question to
the owner.

## Step 2b — Kit 3.1.1

1. **Packages.** `@sveltejs/kit` `^3.1.1` and `@sveltejs/adapter-static` `^4.0.1`. Adapter 4 keeps
   the same options (`pages`, `assets`, `fallback`, `precompress`, `strict`); its changes are
   internal (_M5_).

2. **Codemod.** Run `npx sv@1.3.0 migrate sveltekit-3` and review its diff hunk by hunk. Keep what
   is right, revert what is not, and list both in the run record (_U10_). Step 1 has already done
   the config move and the `#lib` rewrite, so the codemod is expected to find little.

3. **`tsconfig.json`:**

   ```json
   {
   	"extends": "$app/tsconfig",
   	"include": ["src", "scripts", "vite.config.ts"],
   	"compilerOptions": {
   		"types": ["$app/types", "node"],
   		"strict": true,
   		"noUnusedLocals": true,
   		"noUnusedParameters": true
   	}
   }
   ```

   - `include` checks the same files as today. The guide's example has `"*"`, which would also put
     `eslint.config.js` and `prettier.config.js` under `checkJs`. Not taken.
   - `types` repeats `$app/types`, because a `types` array replaces the base's array, and Kit warns
     when `$app/types` is missing (_M5_).
   - `allowImportingTsExtensions` and `skipLibCheck` leave `tsconfig.json`; the base sets both
     (_M5_).
   - The `typescript` option leaves `vite.config.ts`, and `scripts/migrate-lib-imports.ts` is
     deleted.

4. **Code.**

   - `goto(…, { replaceState: true })` becomes `goto(…, { replace: true })` at
     `src/routes/play/+page.svelte:63`, the only such call (_M9_). The five expectations in
     `src/routes/play/page.test.ts` (lines 107, 150, 158, 620, 642) change with it.
   - `decodeShareUrl(url: URL)` (`src/lib/shareUrl.ts:131`) reads only `url.hash` and `url.search`
     (_M10_). Its parameter becomes `Pick<URL, 'hash' | 'search'>`, which accepts Kit 3's read-only
     `page.url` and every `URL` the tests pass.
   - `version: { pollInterval: 0 }` goes into the `sveltekit()` options (_Decision 6_), with a
     one-line comment giving the reason.

5. **Probe** for the `%` fragment (_U8_).

## Step 3 — jsdom 31

Raise `jsdom` to `^31.0.0`. No product code changes (_Decision 8_).

**Expected fallout:**

- Focus now moves asynchronously when an element stops being focusable. Six test files check
  focus (`toHaveFocus` or `document.activeElement`) on 18 lines, 10 of them in
  `src/routes/page.test.ts` (_M1_, _U7_).
- A new CSS engine may serialize `style.transform` strings differently
  (`src/lib/items.test.ts:35-42`, `src/lib/scroller.test.ts:65`) (_U7_).
- A new default stylesheet could change what `getByRole` treats as hidden (_U7_).

**Test-fix rule.** A test may change how it waits (for example, `await tick()` or `waitFor`) or
the exact string it expects for behavior that has not changed. It may not lose an assertion or
loosen one. The run record lists every changed assertion with its reason.

**Node.** jsdom 31 needs Node `^22.22.2 || ^24.15.0 || >=26` (_M8_). CI's `node-version: 24`
resolves to the latest 24.x. `CONTRIBUTING.md` says "Node 24.15 or later".

**Not in this step:** jsdom 31 may support `<dialog>` and popover. Spec 2's non-modal Share panel
stays.

## Step 4 — GitHub Actions

`.github/workflows/deploy.yml`:

| Action                          | From | To  |
| ------------------------------- | ---- | --- |
| `actions/checkout`              | v4   | v7  |
| `actions/setup-node`            | v4   | v7  |
| `actions/configure-pages`       | v5   | v6  |
| `actions/upload-pages-artifact` | v3   | v5  |
| `actions/deploy-pages`          | v4   | v5  |

Latest tags on 2026-11-06: checkout v7.0.1, setup-node v7.1.0, configure-pages v6.0.0,
upload-pages-artifact v5.0.0, deploy-pages v5.0.1 (_M7_). The workflow pins the major tag
(`@v7`), as today. `runs-on` stays `ubuntu-latest` (_Decision 9_). None of the release notes read
change an input this workflow uses; checkout v7.0.0's notes were read only in part (_U14_).
upload-pages-artifact has left out dotfiles since v4, and `dist/` has none (_M1_); the common gate
checks that it stays so.

**Before merge:** each `@vN` tag exists (`gh api repos/actions/<name>/git/ref/tags/<tag>`), and
each JavaScript action's `action.yml` says `using: node24`. upload-pages-artifact is a composite
action; its inner `actions/upload-artifact` reference is read and recorded.

**After merge:** see _H1_. A manual `workflow_dispatch` run on the branch is not used, because it
would also deploy the unmerged branch to the live site. If the deploy on `main` fails, the site
stays on the previous build, and a fix-forward PR follows.

## Testing

The upgrade adds no product behavior, so it adds no product tests. Tests change only in three ways:

- **Mechanical:** import paths (`#lib/…`) and the `goto` option name.
- **Tool-driven:** Vitest 5 and jsdom 31 fallout, under step 3's test-fix rule (which applies to
  step 2a too).
- **Type-driven:** a local `.d.ts`, if _U3_ needs one.

The test count stays at 1000 or more (_M1_); no test is deleted or skipped. Probes are run and
recorded, not committed as tests, unless a probe shows a gap that a lasting test should guard. That
case is a question for the owner.

## Verification that fails closed

The run record lives in `.superpowers/records/2026-11-06-sveltekit-3/` (git-ignored). A check that
dies, prints nothing or is skipped counts as unverified, never as a pass. The record lists the
unverified rows; it does not absorb them.

**Common gate, after every step (A rows):**

- **A1** `npm test` passes: svelte-check 0 errors and 0 warnings, and the Vitest count.
- **A2** `npm run lint` passes.
- **A3** `npm run build` passes, with check-css.
- **A4** `npm run stage-check` passes all 8 cases.
- **A5** The test count is 1000 or more, and no test file is gone.
- **A6** From step 2a on: no line matching `/deprecat/i` in the dev server's start-up output, the
  build output or the test output.
- **A7** `dist/` holds no dotfiles.
- **A8** Size table: CSS raw and gzip bytes (from check-css), total client JS bytes, and the
  largest chunk, against _M1_.

**Step gates:**

- **S1** Step 1: no `$lib` in `src` or `scripts`; no `svelte.config.js`; built CSS byte-identical to
  `main`'s.
- **S2** Step 2a: the toolchain versions in `node_modules` match _Decision 1_ (`npm ls`).
- **S3** Step 2b: `npm ls @sveltejs/kit` shows 3.1.1; `scripts/migrate-lib-imports.ts` is gone; no
  `typescript` option in `vite.config.ts`.
- **S4** Step 3: `npm ls jsdom` shows 31.0.0; `git diff` of step 3 touches no file outside tests,
  test setup, `package.json`, `package-lock.json` and `CONTRIBUTING.md`.
- **S5** Step 4: the tag and runtime checks of _Step 4_.

**Probes (P rows), on the final commit unless a step is named:**

- **P1** to **P15:** one per _U_ item, each with its own pass or fail.
- **P16** Share links: the share links used by the stage-check decks, built on `main`, decode to the
  same codes and settings on the final build.
- **P17** Base path: the production build references assets only under `/scandible/`.
- **P18** Version check: in the production build (served by `vite preview` under `/scandible`),
  focusing the window fetches `_app/version.json` once, and no request repeats on a timer.

**Visual (V rows):**

- **V1** Headless Firefox screenshots of the setup page and the play screen, at the six sizes of
  spec 3's visual review (320×568, 360×800, 390×844, 844×390, 768×1024 and 1280×800), from
  `main`'s build and from the final build, compared pixel by pixel. Expected: identical. Any
  difference is shown to the owner with its cause.

**For a person, after the merge (H rows):**

- **H1** The first deploy run on `main` succeeds, and `gh run view <id>` lists no Node 20
  annotation. (A controller can check this one.)
- **H2** Open the deployed site on Android Chrome and on a desktop browser; set up one deck and play
  it.

## Documentation

- **`CONTRIBUTING.md`:** "Requires Node 24.15 or later" (`.nvmrc` keeps `24`, which names the
  major); imports from `src/lib` use `#lib/…` with the file extension; the SvelteKit config lives
  in `vite.config.ts`.
- **The UI revamp handoff:** close Q2 and F4 with decision-log rows, on this branch.
- **README and `docs/guide.md`:** no change. Neither names `$lib`, `svelte.config.js` or a Node
  version.

## Review

_To be filled after the three lenses report: what changed, and what was not taken, with reasons._

## Notes for the plan

- One commit per step, in order: `build: …` messages. The spec and plan commits come first.
- Commit with `git -c user.name=… -c user.email=…`, reusing the repository's author; the shell has
  no git identity. No AI attribution.
- In a worktree, Vitest needs a real `npm ci` and `svelte-kit sync`; a symlinked `node_modules`
  fails to resolve, and `-t` then prints "no tests", which is not a pass.
- `node` is on `PATH` only after `source ~/.nvm/nvm.sh && nvm use 24` in bash.
- Record every probe's command and output in the run record.
- Run Prettier on every changed file; `npm run lint` checks it.

## Out of scope

- TypeScript 7 (_Decision 2_).
- Any new SvelteKit 3 feature: remote functions, `$app/env`, service workers, observability.
- Rewriting the Share panel with `<dialog>` or popover.
- The 585 kB bwip-js chunk (handoff F2, closed).
- Packages not in _Decision 1_.

## Unverified

Each item is a probe (_P1_ to _P15_). It is unverified until its probe passes.

- **U1** Whether Vitest 5 clears mocks before or after `beforeEach` hooks, and whether any test
  depends on it.
- **U2** Whether `vi.stubGlobal('location', …)` still works, and `vi.unstubAllGlobals()` still
  restores it, under Vitest 5 and jsdom.
- **U3** Whether jest-dom 7.0.1's matcher types still check against Vitest 5's `Assertion<R, T>`.
- **U4** Whether `svelteTesting()` works with Vitest 5.
- **U5** Whether Lightning CSS keeps exactly one `--color-base-100` rule in the built CSS.
- **U6** Whether Rolldown's CommonJS interop leaves bwip-js, jsbarcode and uqr working in the
  production build, and whether the chunk-size warning changes.
- **U7** jsdom 31: asynchronous focus moves, `style.transform` serialization, and role visibility
  under the new default stylesheet.
- **U8** Whether Kit 3's router still throws on a fragment with a bare `%`.
- **U9** Whether eslint-plugin-svelte and svelte-check work as before without `svelte.config.js`.
- **U10** What `sv migrate sveltekit-3` changes in this repository.
- **U11** Which deprecation warnings Kit 2.70.4 prints for this repository.
- **U12** Whether TypeScript 6's `noUncheckedSideEffectImports` accepts the two side-effect imports.
- **U13** Whether Vite 7 and TypeScript 5.9 resolve `#lib/<path>.ts` on Kit 2.70.4.
- **U14** The rest of checkout v7.0.0's release notes (the research saw them cut off).
- **U15** Whether the Node 20 annotation is gone after the merge (_H1_).

## Measurements

- **M1 — baseline, `main` at `1d83452`, measured 2026-11-06:** 50 test files, 1000 tests passed.
  check-css: "3 CSS files, 78468 bytes raw, 13761 bytes gzipped". Client JS (chunks, entry and
  nodes): 724,624 bytes in all; largest chunk 585,396 bytes. `dist/` holds `_app`, `index.html` and
  `play.html`, and no dotfiles. Focus checks: `toHaveFocus` or `document.activeElement` on
  18 lines in 6 test files (10 in `src/routes/page.test.ts`, 3 in `src/routes/play/page.test.ts`,
  2 in `Segmented.test.ts`, 1 each in `RowEditor.svelte.test.ts`, `PlayOverlay.test.ts` and
  `FinishScreen.test.ts`).
- **M2 — `$lib`:** 93 lines in 36 files under `src` and `scripts`, 2 of them `vi.mock` calls
  (`src/lib/setup.svelte.test.ts:6`, `src/routes/page.test.ts:15`). No `$lib` in `README.md`,
  `CONTRIBUTING.md`, `docs/guide.md`, `eslint.config.js` or `vite.config.ts`.
- **M3 — versions:** installed versions read from `node_modules`; latest versions from `npm view`
  on 2026-11-05 (table in _Decision 1_). TypeScript 6.x releases: 6.0.2, 6.0.3. Latest Kit 2.x:
  2.70.4. Kit 3 releases: 3.0.0 (2026-10-01), 3.0.1, 3.1.0, 3.1.1 (2026-10-29).
- **M4 — peers (`npm view`):** Kit 3.1.1: vite `^8.0.12`, svelte `^5.57.1`, typescript `^6.0.0`,
  vite-plugin-svelte `^7.0.0`, node `>=22.17`. Kit 2.70.4: vite up to `^8.0.0`, typescript
  `^5.3.3 || ^6.0.0`, vite-plugin-svelte up to `^7.0.0`. adapter-static 3.0.10: kit `^2.0.0`;
  4.0.1: kit `^3.0.0-next.0`. svelte-check 4.7.8: typescript `^5.0.0 || ^6.0.0`.
  typescript-eslint 8.72.1: typescript `>=4.8.4 <6.1.0`. Vitest 3.2.7 depends on vite
  `^5.0.0 || ^6.0.0 || ^7.0.0-0`; Vitest 5.1.0 peers vite `^6.4.0 || ^7.0.0 || ^8.0.0`.
  `@tailwindcss/vite` 4.3.4 peers vite up to `^8`.
- **M5 — Kit 3.1.1 source (npm tarball):** `version.pollInterval` default `3_600_000`
  (`src/core/config/options.js:280`); `alias` and `typescript` options deprecated (`:56`, `:271`);
  `svelte.config.js` not loaded (`configFile: false` in `src/exports/vite/index.js`); version checks
  on `visibilitychange` and `focus` (`src/runtime/client/client.js:3123-3134`); a failed
  navigation after a detected update reloads the page (`client.js:1538`, `:2072`); the
  `$app/tsconfig` base sets `types: ['$app/types']`, `allowImportingTsExtensions`, `noEmit`,
  `skipLibCheck`, `verbatimModuleSyntax` and `isolatedModules`, and warns when a `types` array
  lacks `$app/types` (`src/core/sync/write_tsconfig/`); `$lib` imports fail with "`$lib` has been
  removed. Use `#lib` instead" (`src/messages/build-errors.js:527`). adapter-static 4.0.1 against
  3.0.10: same options, internal changes only (diff of `index.js` and `index.d.ts`). The migration
  guide: https://svelte.dev/docs/kit/migrating-to-sveltekit-3.
- **M6 — browser targets:** Vite 7.3.6's default target is Chrome 107, Edge 107, Firefox 104,
  Safari 16 (spec 1, M9); Vite 8's is Chrome 111, Edge 111, Firefox 114, Safari 16.4 (vite.dev
  migration guide, via the research report). Tailwind CSS 4's floor: Chrome 111, Safari 16.4,
  Firefox 128 (spec 1, M9).
- **M7 — Actions:** latest release tags from `gh api repos/actions/<name>/releases/latest`, and the
  `using:` line of each tag's `action.yml`, read by the author on 2026-11-06 (table in _Step 4_).
  checkout, setup-node, configure-pages and deploy-pages declare `node24`; upload-pages-artifact
  v5.0.0 is `composite`.
- **M8 — Node:** jsdom 31.0.0 engines `^22.22.2 || ^24.15.0 || >=26`; local Node v24.17.0;
  `.nvmrc` holds `24`.
- **M9 — `goto` with `replaceState`:** one call, `src/routes/play/+page.svelte:63`; five
  expectations, `src/routes/play/page.test.ts:107, 150, 158, 620, 642`.
- **M10 — `decodeShareUrl`:** reads `url.hash` (`src/lib/shareUrl.ts:136`) and `url.search`
  (`:140`), nothing else from its argument; 36 call sites outside `shareUrl.ts`.

Research report (Sonnet agent, 2026-11-05, sources and repo hits per tool): kept in the run record
as `toolchain-research.md`.

# SvelteKit 3 and a current toolchain — Design

**Date:** 2026-11-06
**Status:** Approved by the owner on 2026-11-06 (text `9f8596b`). Design agreed in conversation on 2026-11-05 and
2026-11-06, question by question and then section by section. Reviewed on 2026-11-06 by three
lenses (codebase fit with probes in a throwaway worktree, on Opus; completeness against the
official guides, on Sonnet; coherence and plan-readiness, on Sonnet) and revised by the author. The
owner settled the three questions the review raised (_Decisions_ 12 to 14). _Review_ lists what
changed and what was not taken.

Handoff items Q2 ("When to take SvelteKit 3.0") and F4 ("GitHub Actions: Node 20 actions and the
Ubuntu 26 runner move") in `docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md` start this
work. Q2 was settled on 2026-11-04 as "SvelteKit 3 after the UI series, in its own upgrade PR". The
UI series is merged (`1d83452`). Facts measured for this spec are in _Measurements_, cited as _M1_
to _M13_. The questions the review settled by probing are in _Settled in review_, cited as _U1_ to
_U15_; the few still open are in _Unverified_.

## Intent

**Outcome.** The repository runs on SvelteKit 3.1.1 and on the current majors of the tools around
it. Users see no change.

**Who it is for.** The people and agents who work on the code. The site's users (QA testers with
barcode scanners) must not notice anything.

**Success.** All of these, on the final commit:

- `npm test` (svelte-check and Vitest), `npm run lint`, `npm run build` (with check-css) and
  `npm run stage-check` pass.
- No test is lost (_A5_).
- No deprecation warning in the dev, build or test output (_A6_).
- The setup page and the play screen look the same as on `main`, pixel for pixel (_V1_).
- Share links made on `main` open the same way (_P1_).
- After the merge, the first deploy to GitHub Pages succeeds with no Node 20 warning (_H1_).

**What the owner said:** take SvelteKit 3 at its latest version, as handoff Q2 set out; include
jsdom 31 and the F4 Actions bumps ("Everything current"); stage the work (approach A); approved
sections 1 to 4 of the design; after the review, chose the CSS target, the import fix and dropping
the codemod (_Decisions_ 12 to 14).

**What the author assumed, and the owner did not correct:** no visible change; the URLs, the share
link format, the `dist/` output folder and the `/scandible` base path stay the same.

## Decisions

1. **Scope: everything current.** These packages move:

   | Package                        | From    | To     | Range in `package.json` | Why                               |
   | ------------------------------ | ------- | ------ | ----------------------- | --------------------------------- |
   | `@sveltejs/kit`                | 2.70.1  | 3.1.1  | `^3.1.1`                | the goal                          |
   | `@sveltejs/adapter-static`     | 3.0.10  | 4.0.1  | `^4.0.1`                | adapter 3 peers Kit `^2.0.0`      |
   | `@sveltejs/vite-plugin-svelte` | 6.2.4   | 7.3.1  | `^7.3.1`                | Kit 3.1.1 peers `^7.0.0`          |
   | `vite`                         | 7.3.6   | 8.3.6  | `^8.3.6`                | Kit 3.1.1 peers `^8.0.12`         |
   | `svelte`                       | 5.56.7  | 5.57.3 | `^5.57.3`               | Kit 3.1.1 peers `^5.57.1`         |
   | `typescript`                   | 5.9.3   | 6.0.3  | `~6.0.3`                | Kit 3.1.1 peers `^6.0.0` (_D2_)   |
   | `vitest`                       | 3.2.7   | 5.1.0  | `^5.1.0`                | Vitest 3 bundles Vite 5 to 7 only |
   | `jsdom`                        | 24.1.3  | 31.0.0 | `^31.0.0`               | owner's choice                    |
   | `svelte-check`                 | 4.7.3   | 4.7.8  | `^4.7.8`                | latest                            |
   | `eslint-plugin-svelte`         | 3.22.0  | 3.24.0 | `^3.24.0`               | latest                            |
   | `typescript-eslint`            | 8.65.0  | 8.72.1 | `^8.72.1`               | latest; peers TypeScript `<6.1.0` |
   | five GitHub Actions            | various | latest | `@vN` tags              | handoff F4 (_Step 4_)             |

   Every other package keeps its version and its range. The exact pins (bwip-js 4.11.4, Tailwind
   CSS 4.3.4, daisyUI 5.7.50, the Testing Library pins, pngjs) stay as they are. No package is
   added. Sources: _M3_, _M4_.

2. **TypeScript 6.0.3, not 7.** TypeScript 7.0.2 is published (_M3_), but Kit 3.1.1 peers
   `^6.0.0`, svelte-check 4.7.8 peers `^5.0.0 || ^6.0.0`, and typescript-eslint 8.72.1 peers
   `<6.1.0` (_M4_). The range `~6.0.3` keeps a later 6.1 from breaking typescript-eslint.

3. **Approach A: staged, five steps, one commit each.** Each step passes the full gate before the
   next starts. If a step fails, the cause is in that step.

   - **Step 1:** preparation on Kit 2.70.4 (the latest 2.x).
   - **Step 2a:** the toolchain on Kit 2.70.4. Kit 2.70.4 already peers Vite 8,
     vite-plugin-svelte 7 and TypeScript 6 (_M4_), so the tools move before Kit does.
   - **Step 2b:** Kit 3.1.1.
   - **Step 3:** jsdom 31.
   - **Step 4:** the F4 Actions bumps.

   The migration guide recommends the 2.x step: "We recommend upgrading to the most recent 2.x
   version before upgrading to 3.0 so that you can take advantage of targeted deprecation
   warnings." For this repository Kit 2.70.4 prints none (_U11_); the step still isolates the
   config move and the `#lib` rewrite from the version jumps.

4. **`#lib` with real file extensions.** SvelteKit 3 removes the `$lib` alias. The project uses
   Node's package imports instead (`"imports": { "#lib/*": "./src/lib/*" }`). Every import names
   the real file: `#lib/shareUrl.ts`, `#lib/setup.svelte.ts`, `#lib/components/ActionBar.svelte`.
   Real extensions need no extension search by Vite or TypeScript, and Kit 3's tsconfig base turns
   on `allowImportingTsExtensions` (_M5_). It works on Kit 2.70.4 with Vite 7 and TypeScript 5.9
   too (_U13_). Keeping `$lib` through Kit 3's `alias` option was not taken: Kit 3 deprecates that
   option (_M5_).

5. **The config moves into `vite.config.ts`.** SvelteKit 3 does not read `svelte.config.js`
   (_M5_). Kit accepts the config as `sveltekit({ … })` options since 2.62.0, and then warns that a
   leftover `svelte.config.js` "is ignored" (_M11_). So the move happens in step 1, and
   `svelte.config.js` is deleted there.

6. **`version.pollInterval: 0`.** Kit 3's default is one hour (_M5_). Kit 3 also checks
   `_app/version.json` when the window gains focus or the tab becomes visible, and no option turns
   that off (_M5_). The app shows no "new version" prompt, so an hourly timer adds requests for no
   use.

7. **`src/hooks.client.ts` stays.** It repairs a fragment that `decodeURIComponent` rejects (a
   bare `%`) before the router sees it. Kit 3.1.1's client still calls `decodeURIComponent` on the
   hash without a `try` (_U8_), so the repair is still needed.

8. **jsdom 31 changes tests only.** Step 3 changes no product code. If a failure points at product
   behavior, the implementer stops and brings it to the owner.

9. **Actions: latest majors, `ubuntu-latest` kept.** The handoff recommended following
   `ubuntu-latest`, because the build is plain Node.

10. **One branch, one PR.** Branch `build/sveltekit-3`, cut from `main` at `1d83452`. The spec, the
    plan and the five step commits go on it. The owner squash-merges. No AI attribution in any
    commit or in the PR. No CI runs on the PR, because `deploy.yml` triggers only on a push to
    `main`; the local gates and the run record are the evidence before the merge. Adding a PR
    workflow is out of scope.

11. **Review tiers.** Three lenses reviewed this spec: one Opus, two Sonnet. One Opus agent writes
    the plan. No Fable, unless the owner asks for a Fable judge at spec approval or at final
    acceptance.

12. **CSS target at Tailwind's floor (owner, after review).** Vite 8 minifies CSS with Lightning
    CSS, which lowers the CSS to Vite's default target. That target (Firefox 114) predates `:has()`,
    so Lightning CSS splits the theme rule in two and check-css fails (_U5_). `vite.config.ts` sets
    `build.cssTarget: ['chrome111', 'edge111', 'firefox128', 'safari16.4']`, the floor spec 1
    already set through Tailwind CSS 4 (_M6_). The theme rule stays one rule, and check-css passes.
    The CSS grows from 78,468 to about 81,047 bytes raw (+3.3%; +269 bytes gzipped) (_U5_). Not
    taken: a post-enforced plugin forcing esbuild's CSS minifier (Kit sets `build.cssMinify`
    itself, _M12_; it would add esbuild as a package), and relaxing check-css.

13. **Fix the jsbarcode import at its source (owner, after review).** Under Vite 8's Rolldown
    bundler, `import barcodes from 'jsbarcode/bin/barcodes'` (`src/lib/engines/jsbarcode.ts:2`)
    gets the whole CommonJS `module.exports` instead of its `default` export, so the production
    build cannot render the JsBarcode formats. All 1000 tests still pass; only stage-check catches
    it (_U6_). Step 2a changes that one import so it yields the encoder table whichever interop
    shape the bundler gives. A small helper unwraps the module, and a new unit test feeds it both
    shapes. Fallback, used only if the import fix cannot pass the gates:
    `legacy: { inconsistentCjsInterop: true }` in `vite.config.ts`, measured to work (_U6_), with a
    comment naming the import; the run record says why, and the owner is told.

14. **No codemod (owner, after review).** The review ran `npx sv@1.3.0 migrate sveltekit-3`
    (_U10_). Of its changes, only two are wanted: the `tsconfig.json` base and the `ClientInit`
    import. Step 2b makes both by hand. The rest would have to be reverted: `$lib` rewrites in 14
    historical documents under `docs/superpowers/` (this spec among them), a bare `#lib` entry
    pointing at a missing `src/lib/index.js`, `resolve('/play')` rewritten to `resolve('play')`
    (the tests expect `/play`, and `/play` is still a valid route ID), a reprint of
    `ActionBar.svelte`, and a new `MIGRATION_TASKS.md`. The codemod's diff stays in the run record.

## What changes for the user, and what stays

**Stays:** every page, control, text and URL; the share link format; the `dist/` folder; the
`/scandible` base path; the browser floor. The new CSS target (_Decision 12_) equals the floor
Tailwind CSS 4 already sets, and Vite 8's default JS target (Chrome 111, Edge 111, Firefox 114,
Safari 16.4) is below it, so no supported browser is dropped (_M6_).

**Changes, invisibly:** Kit 3 fetches `/scandible/_app/version.json` (request header
`cache-control: no-cache`) when the window gains focus or the tab becomes visible. If the fetch
fails, for example offline, nothing happens (_M5_). Kit 2 makes no such request (_M13_). What Kit
does when it finds a new version is unchanged: a navigation that fails after a deploy reloads the
page, in Kit 2 as in Kit 3 (_M5_, _M13_).

**Changes for maintainers:** imports use `#lib/…` with the file extension; the config is in
`vite.config.ts`; Node 24.15 or later; TypeScript 6.

## Step 1 — preparation on Kit 2.70.4

1. **Kit 2.70.4.** Raise `@sveltejs/kit` to `^2.70.4`. Capture the dev, build and test output
   (_A6_) and record that it holds no deprecation warning (_U11_).

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
   deleted, and `.svelte-kit/` is removed before the next `svelte-kit sync`.

   - `eslint.config.js` imports `svelte.config.js` to pass `svelteConfig` to the Svelte parser. The
     import and the `svelteConfig` key go. Lint still catches a deliberate break of a Kit-aware
     rule, and svelte-check still reports a deliberate type error in a `.svelte` file (_U9_).

3. **`$lib` to `#lib`.** Add `"imports": { "#lib/*": "./src/lib/*" }` to `package.json`. There is
   no `src/lib/index.ts`, so no bare `#lib` entry.

   - A script, `scripts/migrate-lib-imports.ts`, rewrites every quoted `$lib/…` specifier in `src`
     and `scripts`: static imports, `import type`, `export … from`, dynamic `import()` and the two
     `vi.mock('$lib/fileInput', …)` calls. For each specifier it finds the one file on disk that
     matches, trying the path as written, then with `.ts`, then with `.svelte.ts`. It never tries
     `index.ts`. It fails, and writes nothing, if a specifier matches no file or more than one. It
     prints the number of rewrites per file and in total. The total must equal the count of quoted
     `$lib/` specifiers before the rewrite (_S1_). The script is committed in step 1, so a reviewer
     can re-run it on `main` and get the same diff, and deleted in step 2b, after which Kit 3
     itself rejects any `$lib` import (_M5_).
   - One `$lib` is not a specifier: a comment at `src/lib/finish.ts:4` (_M2_). It is edited by hand
     to `#lib`.
   - `tsconfig.json` gets `"allowImportingTsExtensions": true` by hand. Kit 3's base sets it in step
     2b.

4. **Docs in this step:** `CONTRIBUTING.md` says that imports from `src/lib` use `#lib/…` with the
   file extension, and that the SvelteKit config lives in `vite.config.ts` (_Documentation_).

5. **Gate:** the common gate (_A1_ to _A9_) and _S1_.

## Step 2a — the toolchain on Kit 2.70.4

Raise Vite, vite-plugin-svelte, Svelte, TypeScript, Vitest, svelte-check, eslint-plugin-svelte and
typescript-eslint to the ranges in _Decision 1_. Kit stays on 2.70.4. The review ran this step in a
throwaway worktree (_U1_ to _U6_, _U12_); these are its results and what the step does about each.

- **Install.** A plain `npm install` fails with `ERESOLVE` on a stale
  `vite-plugin-svelte-inspector` peer chain. The recipe that worked is in _Notes for the plan_.
- **TypeScript 6 defaults `types` to `[]`.** `@types/node` still loads here, because Vite's own
  type declarations reference it (_U12_). `tsconfig.json` gets `"types": ["node"]` anyway, so the
  three tests and three scripts that use `node:` modules, `process` or `import.meta.main` do not
  depend on that indirect reference.
- **TypeScript 6 defaults `noUncheckedSideEffectImports` to `true`.** The two side-effect imports
  (`src/vitest.setup.ts:1`, `src/routes/+layout.svelte:3`) pass (_U12_). No change.
- **Vitest 5 turns `clearMocks` on.** All tests pass with it (_U1_). No `clearMocks` setting.
- **Vitest 5 makes assignments to jsdom's `window` update the DOM.** The `location` stubs and the
  `requestAnimationFrame` assignments still work (_U2_). No change.
- **Vitest 5 changes `Assertion<T>` to `Assertion<R, T>`.** svelte-check passes with jest-dom
  7.0.1's types as they are (_U3_). No bridge file. `svelteTesting()` works (_U4_).
- **Vitest 5 picks the `minimal` reporter when it detects an AI agent** (_M12_). That reporter
  hides the summary and the output of passing tests. Every gate run passes `--reporter=default`,
  and the test count comes from a JSON report (_A1_, _A5_).
- **Vite 8 and the theme rule.** `build.cssTarget` (_Decision 12_).
- **Vite 8 and the jsbarcode import.** The import fix and its unit test (_Decision 13_). The new
  test raises the count above 1000, which _A5_ allows.

Any other failure gets a fix, a line in the run record and, if it changes this design, a question to
the owner.

**Gate:** the common gate and _S2_.

## Step 2b — Kit 3.1.1

1. **Packages and config, in one edit.** Raise `@sveltejs/kit` to `^3.1.1` and
   `@sveltejs/adapter-static` to `^4.0.1`, and remove the `typescript` option from
   `vite.config.ts` in the same edit. Kit 3's `svelte-kit sync` crashes on that callback ("Cannot
   read properties of undefined (reading 'push')") (_U10_). Adapter 4 keeps the same options
   (`pages`, `assets`, `fallback`, `precompress`, `strict`); its changes are internal (_M5_).

2. **`tsconfig.json`:**

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

   - `include` checks the same files as today: Kit 2's generated config includes `src`, `scripts`
     (through the `typescript` option) and `vite.config.ts`. The guide's example has `"*"`, which
     would also put `eslint.config.js` and `prettier.config.js` under `checkJs`. Not taken.
   - `types` repeats `$app/types`, because a `types` array replaces the base's array, and Kit
     warns ("tsconfig_invalid") when `$app/types` is missing (_M5_, _U10_).
   - `allowImportingTsExtensions` and `skipLibCheck` leave `tsconfig.json`; the base sets both
     (_M5_).

3. **Code.**

   - `src/hooks.client.ts:1`: `import type { ClientInit } from '@sveltejs/kit'` becomes
     `from '@sveltejs/kit/hooks'`. Kit 3.1.1 declares `ClientInit` only there (_M5_).
   - `goto(…, { replaceState: true })` becomes `goto(…, { replace: true })` at
     `src/routes/play/+page.svelte:63`, the only such call (_M9_). The five expectations in
     `src/routes/play/page.test.ts` (lines 107, 150, 158, 620, 642) change with it. Kit 3 warns
     about the old option only in the browser console, which _A6_ cannot see, so _S3_ checks the
     source instead.
   - `decodeShareUrl(url: URL)` (`src/lib/shareUrl.ts:131`) reads only `url.hash` and `url.search`
     (_M10_). Its parameter becomes `Pick<URL, 'hash' | 'search'>`, which accepts Kit 3's read-only
     `page.url` and every `URL` the tests pass.
   - `version: { pollInterval: 0 }` goes into the `sveltekit()` options (_Decision 6_), with a
     one-line comment giving the reason.
   - `scripts/migrate-lib-imports.ts` is deleted.

4. **Gate:** the common gate and _S3_.

## Step 3 — jsdom 31

Raise `jsdom` to `^31.0.0`. No product code changes (_Decision 8_). The review ran this step on top
of step 2b: one expected string changes, at `src/lib/scroller.test.ts:220`, and the focus and role
checks pass (_U7_).

**What can still move:**

- Focus now moves asynchronously when an element stops being focusable. Six test files check focus
  (`toHaveFocus` or `document.activeElement`) on 18 lines, 10 of them in `src/routes/page.test.ts`
  (_M1_).
- A new CSS engine may serialize `style.transform` strings differently.
- A new default stylesheet could change what `getByRole` treats as hidden.
- `src/lib/engines/bwipjs.test.ts:210` and `:216` compare `outerHTML` against 15 committed SVG files
  in `src/lib/engines/__snapshots__/` (_M2_).

**Test-fix rule** (also for step 2a). A test may change how it waits (for example, `await tick()`
or `waitFor`) or the exact string it expects for behavior that has not changed. It may not lose an
assertion or loosen one. Each changed assertion is listed in the run record with its reason: the
release note or the measured serialization difference behind it. The snapshot files must not
change, and Vitest is never run with `-u`. If a snapshot would have to change, the owner decides.

**Node.** jsdom 31 needs Node `^22.22.2 || ^24.15.0 || >=26` (_M8_). CI's `node-version: 24`
resolves to the latest 24.x; local Node is v24.17.0. `.nvmrc` keeps `24`.

**Docs in this step:** `CONTRIBUTING.md` says "Requires Node 24.15 or later".

**Gate:** the common gate and _S4_.

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
(`@v7`), as today. `runs-on` stays `ubuntu-latest` (_Decision 9_). None of the release notes change
an input this workflow uses; checkout v7.0.0's were read in full (_U14_). upload-pages-artifact has
left out dotfiles since v4, and `dist/` has none (_M1_); _A7_ keeps it so.

**Docs in this step:** the UI revamp handoff gets decision-log rows closing Q2 and F4, and its Q2
and F4 entries point at this spec.

**Gate:** the common gate and _S5_. After the merge: _H1_. A manual `workflow_dispatch` run on the
branch is not used, because it would also deploy the unmerged branch to the live site. If the
deploy on `main` fails, the site stays on the previous build, and a fix-forward PR follows.

## Testing

The upgrade adds one test: the unit test of the jsbarcode unwrap helper (_Decision 13_). Other tests
change only in three ways:

- **Mechanical:** import paths (`#lib/…`) and the `goto` option name.
- **Tool-driven:** the one string at `src/lib/scroller.test.ts:220`, and anything else under the
  test-fix rule.
- **None by type:** no bridge file is needed (_U3_).

No test is deleted or skipped (_A5_). Probes are run and recorded, not committed as tests, unless a
probe shows a gap that a lasting test should guard; that case is a question for the owner.

## Verification that fails closed

The run record lives in `.superpowers/records/2026-11-06-sveltekit-3/` (git-ignored; layout in
_Notes for the plan_). A check that dies, prints nothing or is skipped counts as unverified, never
as a pass. The record lists the unverified rows; it does not absorb them.

**Baseline.** Before step 1, the plan's first task captures `main` (`1d83452`) into the record: the
Vitest JSON report (test names, counts), the build log with check-css's size line, the SHA-256 of
each built CSS file, the `dist/` file list and size table, and the _V1_ screenshots. _M1_ holds the
headline numbers.

**Common gate, after every step (A rows):**

- **A1** `npm test -- --reporter=default --reporter=json --outputFile=<record>/<step>/vitest.json`
  exits 0. svelte-check reports 0 errors and 0 warnings.
- **A2** `npm run lint` exits 0.
- **A3** `npm run build` exits 0, and its log ends with check-css's size line.
- **A4** `npm run stage-check` prints `8 PASS, 0 MISMATCH, 0 UNVERIFIED` and exits 0.
- **A5** In the JSON report: 0 failed, 0 skipped or todo, at least 1000 tests, and every test name
  in the baseline report is present. A missing name passes only if the record shows it renamed by
  Vitest 5's title formatting, with both forms.
- **A6** The dev capture, the build log and the test output (A1) are each non-empty: the dev capture
  has Vite's `ready in` line, the build log has check-css's line, and the test output has Vitest's
  `Tests` summary line. Together they hold no line matching `/deprecat/i`. stage-check's own
  output is not part of this check: it installs `main`'s tree, which prints its own deprecation
  line. The dev capture: `npm run dev -- --port 5199 --strictPort`, wait for `ready in`, request
  `/` and `/play` with `curl` (each must return 200), wait 10 seconds, stop the server. A dev
  server that does not start makes A6 unverified.
- **A7** `dist/` holds no dotfiles and no `*.map` files.
- **A8** Size table in the record: CSS raw and gzipped bytes (from check-css), total client JS
  bytes (`dist/_app/immutable/{chunks,entry,nodes}/*.js`), and the largest chunk, against the
  previous step and _M1_. A change of more than 5% in any of the four gets its cause written down.
  Expected: CSS about +3.3% at step 2a (_Decision 12_); largest chunk about −6% at step 2a, from
  Rolldown (_U6_).
- **A9** `npm ci` on the committed lockfile and `npm ls` (whole tree) both exit 0.

**Step gates (S rows):**

- **S1** (step 1):
  - `grep -rnF '$lib' src scripts --exclude=migrate-lib-imports.ts` prints nothing.
  - The script's printed total equals the count of quoted `$lib/` specifiers on `main`.
  - `svelte.config.js` does not exist. `package.json` has `"#lib/*"` under `imports` and no bare
    `"#lib"`.
  - No line containing `is ignored when options are passed via your Vite config` in the dev
    capture or the build log (_M11_).
  - Each built CSS file's SHA-256 equals the baseline's.
  - _U9_'s two deliberate breaks, made and reverted, are caught; output recorded.
- **S2** (step 2a):
  - `npm ls` shows the _Decision 1_ versions of the eight packages of this step.
  - `vite.config.ts` sets `build.cssTarget` to the four browsers of _Decision 12_.
  - check-css passes (one theme rule).
  - `src/lib/engines/jsbarcode.ts` has the import fix, and its unit test exists and passes.
  - `vite.config.ts` has no `legacy` key, unless the fallback of _Decision 13_ was used and the
    record says why.
  - `tsconfig.json` has `"types": ["node"]`.
- **S3** (step 2b):
  - `npm ls` shows `@sveltejs/kit` 3.1.1 and `@sveltejs/adapter-static` 4.0.1.
  - `tsconfig.json` equals the text in _Step 2b_.
  - `vite.config.ts` has no `typescript` key and has `pollInterval: 0`.
  - `scripts/migrate-lib-imports.ts` does not exist.
  - `grep -rn 'replaceState: true' src` prints nothing.
  - `src/hooks.client.ts` imports `ClientInit` from `'@sveltejs/kit/hooks'`.
  - `decodeShareUrl`'s parameter type is `Pick<URL, 'hash' | 'search'>`.
  - `svelte-kit sync` prints no `tsconfig_invalid` warning.
- **S4** (step 3):
  - `npm ls` shows `jsdom` 31.0.0.
  - The step's diff touches only `*.test.ts` files, `src/vitest.setup.ts`, `package.json`,
    `package-lock.json` and `CONTRIBUTING.md`.
  - Nothing under `src/lib/engines/__snapshots__/` changes.
  - The record lists each changed assertion with its reason.
- **S5** (step 4):
  - `deploy.yml` names the five new majors and no old one.
  - Each tag exists: `gh api repos/actions/<name>/git/ref/tags/<tag>` returns it.
  - checkout, setup-node, configure-pages and deploy-pages declare `using: node24` in their
    `action.yml` at that tag.
  - For the composite upload-pages-artifact, the `actions/upload-artifact@<tag>` its `action.yml`
    uses is read, and that tag declares `node24`.
  - The handoff's Q2 and F4 rows are present.

**Probes (P rows), on the final commit:**

- **P1** Share links. Three links built on `main`: a legacy query string (`?codes=…`), a fragment
  with codes and settings (`#codes=…&fmt=…&seed=…`), and a rows link (`#r1=…`). Each opens on the
  final build's setup page (served by `vite preview` under `/scandible`) and is screenshot at
  1280×800. Pass: 0 differing pixels against `main`'s build.
- **P2** Base path. Every `src` and `href` in `dist/*.html` is relative (`./…`) or starts with
  `/scandible/`, and `dist/` holds `index.html` and `play.html`.
- **P3** Poll interval. The built client JS contains no `3600000` or `36e5` literal. A control
  build with the option removed contains one, which proves the check can fail.
- **P4** Dev mode and jsbarcode. In `npm run dev`, a headless Firefox screenshot of the setup page
  loaded with a UPC-A share link shows the verdict "✓ valid". The controller reads the screenshot
  and records it.
- **P5** The `%` fragment. The production build, served under `/scandible`, loads
  `/scandible/play#codes=50%` in headless Firefox. Pass: the screenshot shows a rendered page, not a
  blank one. The record also says, for information, whether Kit 3 throws on that link with the
  hook removed (_U8_).

**Visual (V rows):**

- **V1** Headless Firefox screenshots, with stage-check's recipe (fresh profile,
  `MOZ_HEADLESS_WIDTH` and `MOZ_HEADLESS_HEIGHT`, `--screenshot`), of two views: the setup page
  loaded with each of the three stage-check decks, and the play screen for each deck in Step mode,
  paused, with the overlay showing. Sizes: spec 3's six (320×568, 360×800, 390×844, 844×390,
  768×1024 and 1280×800). Compared with pngjs, pixel by pixel, against `main`'s build. Pass: 0
  differing pixels in every pair. A differing pair fails V1 until the owner rules on it, shown with
  its cause.

**For a person, after the merge (H rows):**

- **H1** The first deploy run on `main` after the merge concludes `success`, and
  `gh run view <id>` lists no annotation containing `Node.js 20`. A re-run of an older commit does
  not count. (A controller can check this one.)
- **H2** Open the deployed site on Android Chrome and on a desktop browser; set up one deck and play
  it.

## Documentation

Each docs change lands in the step that causes it:

- **Step 1, `CONTRIBUTING.md`:** imports from `src/lib` use `#lib/…` with the file extension; the
  SvelteKit config lives in `vite.config.ts`.
- **Step 3, `CONTRIBUTING.md`:** "Requires Node 24.15 or later" (`.nvmrc` keeps `24`).
- **Step 4, the UI revamp handoff:** decision-log rows closing Q2 and F4.
- **README and `docs/guide.md`:** no change. Neither names `$lib`, `svelte.config.js` or a Node
  version.
- **This spec:** its Status line says "Approved" once the owner approves it.

## Settled in review

The review's lens 1 ran steps 1, 2a, 2b and 3 in a throwaway worktree (real `npm ci`, Node
24.17.0), now removed. Its logs, patches and the codemod's diff are in the run record. Each result
is re-checked on the real commits by the gate named.

| U   | Question                                                         | Review result                                                                                                                        | Re-checked by        |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| U1  | Vitest 5's `clearMocks` default                                  | PASS: 1000/1000 with no setting                                                                                                      | A1, A5 (2a)          |
| U2  | `vi.stubGlobal('location', …)` under Vitest 5 and jsdom          | PASS on jsdom 24 and 31                                                                                                              | A1 (2a, 3)           |
| U3  | jest-dom 7.0.1's types against Vitest 5's `Assertion<R, T>`      | PASS: svelte-check 0 errors; a probe shows `Assertion<void, HTMLElement>` typed                                                      | A1 (2a)              |
| U4  | `svelteTesting()` with Vitest 5                                  | PASS: all component tests mount                                                                                                      | A1 (2a)              |
| U5  | One `--color-base-100` rule under Lightning CSS                  | FAIL with Vite's default target ("found 2", 82,397 bytes); PASS with _Decision 12_'s target (81,047 bytes raw, 14,030 gzipped)       | A3, S2               |
| U6  | Rolldown's CommonJS interop for bwip-js, jsbarcode, uqr          | FAIL: stage-check 5 PASS, 3 UNVERIFIED (the UPC cases); 8 PASS with the legacy flag; largest chunk 585,396 → 548,301 bytes           | A4, S2, P4           |
| U7  | jsdom 31: focus, `style.transform`, role visibility              | PASS but one string: `src/lib/scroller.test.ts:220`                                                                                  | A1, S4 (3)           |
| U8  | Does Kit 3's router still throw on a bare `%` fragment?          | Source: `decodeURIComponent(url.hash)` with no `try` (no browser run)                                                                | P5                   |
| U9  | eslint-plugin-svelte and svelte-check without `svelte.config.js` | PASS on Kit 2.70.4 and 3.1.1: `goto('/x')` flagged; a type error in a `.svelte` file reported                                        | S1                   |
| U10 | What `sv migrate sveltekit-3` changes                            | 20 files; see _Decision 14_. Also: the `typescript` callback crashes Kit 3's sync; leaving `$app/types` out warns `tsconfig_invalid` | S3 (codemod dropped) |
| U11 | Kit 2.70.4's deprecation warnings for this repository            | None in dev, build or test output                                                                                                    | A6 (1)               |
| U12 | TypeScript 6's `types` and `noUncheckedSideEffectImports`        | PASS: `@types/node` loads through Vite's types; a missing module errors, the two real imports pass                                   | A1 (2a)              |
| U13 | `#lib/<path>.ts` on Vite 7, TypeScript 5.9 and Kit 2.70.4        | PASS: tests, svelte-check, build, lint, dev and stage-check (8 PASS); `vi.mock('#lib/…')` still mocks                                | A1 to A4 (1)         |
| U14 | checkout v7.0.0's full release notes                             | Read in full by two lenses: no input this workflow uses changes                                                                      | S5                   |
| U15 | The Node 20 annotation after the merge                           | Open                                                                                                                                 | H1                   |

## Unverified

- **U8**, in a browser: whether Kit 3's router throws on a bare `%` without the hook (_P5_,
  information only; the hook stays either way).
- **P4**: dev mode with the jsbarcode import fix. The review checked production only.
- **The import fix itself** (_Decision 13_): the review measured the legacy flag, not the fix. _S2_
  and _A4_ prove it, or the fallback applies.
- **U15**: after the merge (_H1_).

## Review

Three lenses reviewed the draft (`58d3d58`) on 2026-11-06: codebase fit with probes (Opus),
completeness against the official guides (Sonnet), coherence and plan-readiness (Sonnet). The author
checked each Critical and Important finding against the sources before taking it.

**Changed:**

- Two probes failed: the theme rule under Lightning CSS (_U5_) and the jsbarcode import under
  Rolldown (_U6_). The spec's planned CSS fallback (`build.cssMinify: 'esbuild'`) does not work,
  because Kit sets `build.cssMinify` itself (_M12_). The owner chose the CSS target and the import
  fix (_Decisions_ 12, 13).
- The codemod is dropped (_Decision 14_).
- `ClientInit` moves to `@sveltejs/kit/hooks` in step 2b (two lenses).
- Gate runs force Vitest's default reporter, because Vitest 5 picks `minimal` under an AI agent
  (_M12_).
- Step 3 protects the 15 SVG snapshot files; the research had said there were no snapshots.
- The `typescript` option leaves in the same edit as the Kit bump (it crashes Kit 3's sync).
- The `npm install` recipe for step 2a (_Notes for the plan_).
- Corrected: "today that case shows an error" was wrong, since Kit 2 already reloads after a failed
  navigation (_M13_); the reason for `"types": ["node"]`; the citation for the transform assertion
  (`scroller.test.ts:220`); _P2_'s wording (the build uses relative `./_app/` paths); the 93rd
  `$lib` line is a comment.
- Verification rewritten to be mechanical: a baseline from `main`; A5 by test names; A6 with
  non-empty captures and a defined dev capture; A7 adds `*.map`; A9 for `npm ci` and `npm ls`;
  S rows for every code change; probes P1 to P5 with pass criteria; V1 with views, method and a
  0-pixel rule; H1 made precise.
- Each docs change is tied to a step; S4's allowed files include `CONTRIBUTING.md`.
- Added _M11_ to _M13_; TypeScript 7.0.2 added to _M3_; Vite 8's default target read from Vite's
  own package (_M6_).

**Not taken:**

- A Fable judge: the owner did not ask for one (_Decision 11_).
- An `engines.node` field in `package.json`: `.nvmrc` and `CONTRIBUTING.md` already state the
  floor, and CI pins the major.
- Separate research lines for eslint-plugin-svelte, typescript-eslint (minor versions) and
  `@tailwindcss/vite` (unchanged version): _A2_ and _A3_ cover them, and lens 1's runs passed lint
  and build.
- A PR workflow so CI checks the branch: out of scope (_Decision 10_).

## Notes for the plan

- **Commits**, in order, after the spec and plan commits:
  1. `build: configure SvelteKit in vite.config.ts and import src/lib as #lib`
  2. `build: move to Vite 8, vite-plugin-svelte 7, TypeScript 6 and Vitest 5`
  3. `build: upgrade to SvelteKit 3.1.1`
  4. `test: move to jsdom 31`
  5. `ci: move the deploy workflow to the current action majors`
- Commit with `git -c user.name=… -c user.email=…`, reusing the repository's author; the shell has
  no git identity. No AI attribution.
- **Step 2a's install** (measured by the review): set the eight ranges in `package.json`, delete the
  lockfile entries for `vite`, `vitest`, `@vitest/*`, `@sveltejs/vite-plugin-svelte` and
  `@sveltejs/vite-plugin-svelte-inspector`, then run `npm install`. Confirm with the lockfile diff
  and `npm ls` that only the intended packages moved.
- After the config move in step 1, remove `.svelte-kit/` before `svelte-kit sync`.
- In step 2b, remove the `typescript` option before the first `svelte-kit sync` on Kit 3.
- Run Vitest with `--reporter=default`, and with `--reporter=json --outputFile=…` for the counts.
  Never with `-u`.
- In a worktree, Vitest needs a real `npm ci` and `svelte-kit sync`; a symlinked `node_modules`
  fails to resolve, and `-t` then prints "no tests", which is not a pass.
- `node` is on `PATH` only after `source ~/.nvm/nvm.sh && nvm use 24` in bash.
- **Run record layout:** `baseline/`, `step-1/`, `step-2a/`, `step-2b/`, `step-3/`, `step-4/` (each
  with its captures, JSON report, size table and gate results), `probes/P1.md` to `P5.md`,
  `visual/` (V1's shots and diff results), `review/` (the lens reports, the research report, the
  codemod diff), `deviations.md` and `unverified.md`.
- **Tier report:** the record and the final report say which model tier ran each phase and how
  many Fable agents ran.
- Run Prettier on every changed file; `npm run lint` checks it.

## Out of scope

- TypeScript 7 (_Decision 2_).
- Any new SvelteKit 3 feature: remote functions, `$app/env`, service workers, observability.
- Rewriting the Share panel with `<dialog>` or popover, now that jsdom may support them.
- The 585 kB bwip-js chunk (handoff F2, closed).
- Packages not in _Decision 1_; an `engines.node` field.
- A PR workflow.

## Measurements

- **M1 — baseline, `main` at `1d83452`, measured 2026-11-06:** 50 test files, 1000 tests passed.
  check-css: "3 CSS files, 78468 bytes raw, 13761 bytes gzipped". Client JS (chunks, entry and
  nodes): 724,624 bytes in all; largest chunk 585,396 bytes. `dist/` holds `_app`, `index.html` and
  `play.html`, and no dotfiles. Focus checks: `toHaveFocus` or `document.activeElement` on 18 lines
  in 6 test files (10 in `src/routes/page.test.ts`, 3 in `src/routes/play/page.test.ts`, 2 in
  `Segmented.test.ts`, 1 each in `RowEditor.svelte.test.ts`, `PlayOverlay.test.ts` and
  `FinishScreen.test.ts`). `npm ls` exits 0.
- **M2 — `$lib` and snapshots:** 93 lines in 36 files under `src` and `scripts` hold `$lib`; 2 are
  `vi.mock` calls (`src/lib/setup.svelte.test.ts:6`, `src/routes/page.test.ts:15`) and 1 is a
  comment (`src/lib/finish.ts:4`). No `$lib` in `README.md`, `CONTRIBUTING.md`, `docs/guide.md`,
  `eslint.config.js` or `vite.config.ts`. `src/lib/engines/bwipjs.test.ts:210,216` use
  `toMatchFileSnapshot` against 15 files in `src/lib/engines/__snapshots__/`.
- **M3 — versions:** installed versions read from `node_modules`; latest versions from `npm view`
  on 2026-11-05 (table in _Decision 1_). TypeScript: 6.0.2 and 6.0.3 are the 6.x releases; 7.0.2
  is the latest. Latest Kit 2.x: 2.70.4. Kit 3 releases: 3.0.0 (2026-10-01), 3.0.1, 3.1.0, 3.1.1
  (2026-10-29).
- **M4 — peers (`npm view`):** Kit 3.1.1: vite `^8.0.12`, svelte `^5.57.1`, typescript `^6.0.0`,
  vite-plugin-svelte `^7.0.0`, node `>=22.17`. Kit 2.70.4: vite up to `^8.0.0`, typescript
  `^5.3.3 || ^6.0.0`, vite-plugin-svelte up to `^7.0.0`. adapter-static 3.0.10: kit `^2.0.0`;
  4.0.1: kit `^3.0.0-next.0`. svelte-check 4.7.8: typescript `^5.0.0 || ^6.0.0`.
  typescript-eslint 8.72.1: typescript `>=4.8.4 <6.1.0`. Vitest 3.2.7 depends on vite
  `^5.0.0 || ^6.0.0 || ^7.0.0-0`; Vitest 5.1.0 peers vite `^6.4.0 || ^7.0.0 || ^8.0.0`.
  `@tailwindcss/vite` 4.3.4 peers vite up to `^8`.
- **M5 — Kit 3.1.1 source (npm tarball):**
  - `version.pollInterval` defaults to `3_600_000` (`src/core/config/options.js:280`).
  - The `alias` and `typescript` options are deprecated (`:56`, `:271`).
  - `svelte.config.js` is not loaded (`configFile: false` in `src/exports/vite/index.js`).
  - The version check runs on `visibilitychange` and `focus`
    (`src/runtime/client/client.js:3123-3134`). It fetches with `cache-control: no-cache` and
    returns `false` on any error (`src/runtime/app/state/client.svelte.js:163`, `:173`).
  - A failed navigation after a detected update reloads the page (`client.js:1538`, `:2072`).
  - The `$app/tsconfig` base sets `types: ['$app/types']`, `allowImportingTsExtensions`, `noEmit`,
    `skipLibCheck`, `verbatimModuleSyntax` and `isolatedModules`, and warns when a `types` array
    lacks `$app/types` (`src/core/sync/write_tsconfig/`).
  - `$lib` imports fail with "`$lib` has been removed. Use `#lib` instead"
    (`src/messages/build-errors.js:527`).
  - `ClientInit` is declared only in `declare module '@sveltejs/kit/hooks'`
    (`types/index.d.ts:1239`, `:1343`).
  - Sourcemaps default to on for the server build only (`src/exports/vite/index.js:377-378`).
  - adapter-static 4.0.1 against 3.0.10: same options, internal changes only (diff of `index.js`
    and `index.d.ts`).
  - The migration guide: https://svelte.dev/docs/kit/migrating-to-sveltekit-3.
- **M6 — browser targets:** Vite 7.3.6's default target is Chrome 107, Edge 107, Firefox 104,
  Safari 16 (spec 1, M9). Vite 8.3.6's is `chrome111`, `edge111`, `firefox114`, `safari16.4`,
  `ios16.4` (`ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET`, `dist/node/chunks/node.js:722-728` of
  its npm package); Lightning CSS uses it for CSS unless `build.cssTarget` is set (`:29819`).
  Tailwind CSS 4's floor: Chrome 111, Safari 16.4, Firefox 128 (spec 1, M9).
- **M7 — Actions:** latest release tags from `gh api repos/actions/<name>/releases/latest`, and
  the `using:` line of each tag's `action.yml`, read by the author on 2026-11-06 (table in _Step
  4_). checkout, setup-node, configure-pages and deploy-pages declare `node24`;
  upload-pages-artifact v5.0.0 is `composite`.
- **M8 — Node:** jsdom 31.0.0 engines `^22.22.2 || ^24.15.0 || >=26`; local Node v24.17.0;
  `.nvmrc` holds `24`.
- **M9 — `goto` with `replaceState`:** one call, `src/routes/play/+page.svelte:63`; five
  expectations, `src/routes/play/page.test.ts:107, 150, 158, 620, 642`.
- **M10 — `decodeShareUrl`:** reads `url.hash` (`src/lib/shareUrl.ts:136`) and `url.search`
  (`:140`), nothing else from its argument; 36 call sites outside `shareUrl.ts`.
- **M11 — Kit 2 inline config:** Kit 2.70.1's `sveltekit()` documents "Since version 2.62.0 you can
  pass configuration directly, in which case `svelte.config.js` is ignored", and warns
  "`svelte.config.js` is ignored when options are passed via your Vite config"
  (`node_modules/@sveltejs/kit/src/exports/vite/index.js:145`, `:173`).
- **M12 — tool defaults that override ours:** Kit sets `build.cssMinify` to `true` unless
  `build.minify` is set (Kit 2.70.4 `src/exports/vite/index.js:1093`; Kit 3.1.1
  `src/exports/vite/build/index.js:240`). Vitest 5.1.0's defaults hold
  `reporters: [isAgent ? "minimal" : "default", …]`, with `isAgent` from `std-env`
  (`dist/chunks/defaults.B1FCaFfh.js:67` of its npm package).
- **M13 — Kit 2 version checks:** Kit 2.70.1 checks for an update only after a failed navigation,
  then reloads (`node_modules/@sveltejs/kit/src/runtime/client/client.js:1355-1359`, `:1848-1852`).
  Its `visibilitychange` handler only saves state, and it has no `focus` handler (`:2692-2696`).
  `pollInterval` defaults to `0` (`src/core/config/options.js:336`).

# SvelteKit 3 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the repository to SvelteKit 3.1.1 and the current majors around it (Vite 8,
vite-plugin-svelte 7, TypeScript 6, Vitest 5, jsdom 31 and five deploy actions) in five gated
commits, with no change that a user of the site can see.

**Architecture:** Task 1 writes two tools into the git-ignored run record: `gate.ts`, which runs the
spec's common gate (A1 to A9) and fails closed, and `probe.ts`, which takes headless-Firefox shots,
compares them pixel by pixel and drives a production build through its main flows. Task 1 then
captures `main` at `1d83452` with them from a throwaway worktree. Tasks 2 to 6 are the spec's steps
1, 2a, 2b, 3 and 4, one commit each, and each passes the gate and its S row before it commits.
Task 3's jsbarcode import fix is test-first, and stage-check proves it in production. Task 7 runs P1
to P5, V1 and the Review Focus probes on the final commit and writes the unverified list.

**Tech Stack:** SvelteKit 2.70.1 → 3.1.1 (adapter-static 3.0.10 → 4.0.1), Vite 7.3.6 → 8.3.6
(Rolldown bundles, Lightning CSS minifies), vite-plugin-svelte 6.2.4 → 7.3.1, Svelte 5.56.7 →
5.57.3, TypeScript 5.9.3 → 6.0.3, Vitest 3.2.7 → 5.1.0, jsdom 24.1.3 → 31.0.0, svelte-check 4.7.3 →
4.7.8, eslint-plugin-svelte 3.22.0 → 3.24.0, typescript-eslint 8.65.0 → 8.72.1. Node v24.17.0 and
npm 11.13.0 (type stripping runs the record tools), Firefox 155.0.1 headless, `gh`, `jq`, pngjs
7.0.0.

**Spec:** `docs/superpowers/specs/2026-11-06-sveltekit-3-upgrade-design.md`, approved by the owner
on 2026-11-06 (text `9f8596b`; `f9b7a4a` marks it approved). Section names in _italics_ are the
spec's; read the named section before the step that cites it. _D1_ to _D14_ are its _Decisions_,
_M1_ to _M13_ its _Measurements_, _U1_ to _U15_ its _Settled in review_, and A, S, P, V and H rows
its _Verification that fails closed_. Where this plan and the spec disagree, the spec wins, except
on _Owner questions_, where the plan takes the reading stated there. Report any other disagreement.

Line numbers are from `f9b7a4a`, whose `src/`, `scripts/` and configuration equal `main` at
`1d83452`. Once a task has edited a file, find the cited code by its content. Every anchor, count,
version, tag and lockfile key below was checked read-only on `f9b7a4a` on 2026-11-06 (`npm view`,
`gh api`, the tree). Build and test outputs marked "expected" come from the review's throwaway run of
steps 1, 2a, 2b and 3 (`<R>/review/lens1/`). That run used the legacy interop flag where this plan
uses _D13_'s import fix, and from step 2b an esbuild CSS plugin where this plan keeps
`build.cssTarget`, so its CSS sizes after step 2a do not apply.

Every Run line starts in `/home/nn/Projects/scandible`. `<R>` is
`.superpowers/records/2026-11-06-sveltekit-3` (git-ignored). `<scratchpad>` is the executing
session's scratchpad directory.

## Owner questions

The plan goes ahead on the reading given. It does not block Task 1. An answer changes only the task
named.

1. **P3's literal is also in the bwip-js chunk.** P3 says the built client JS "contains no
   `3600000` or `36e5` literal". `main`'s own build already holds the string `"3600000000"`
   (BWIPP's longitude check) in the bwip-js chunk
   (`<R>/review/lens1/base-dist/dist/_app/immutable/chunks/BoTuaz04.js`), and that string contains
   `3600000`. Read literally, P3 fails on every build, `main`'s included, whatever `pollInterval`
   is. **Plan:** P3 looks for the number as a whole token: `3600000`, `36e5` or `3.6e6` with no
   digit or `.` before it and no digit after it,
   `grep -rnoP '(?<![0-9.])(3600000|36e5|3\.6e6)(?![0-9])' dist/_app/immutable`. This finds nothing
   in lens 1's copy of `main`'s build. The control build without the option must match it, which
   proves the check can fail. Changes Task 7.

## Global Constraints

- **Users see no change** (_What changes for the user, and what stays_): every page, control, text
  and URL, the share-link format, the `dist/` folder, the `/scandible` base path and the browser
  floor stay. Product code changes only where a step names it: the `#lib` specifiers and the comment
  at `src/lib/finish.ts:4` (step 1); `src/lib/engines/jsbarcode.ts` (2a); `src/hooks.client.ts:1`,
  `src/lib/shareUrl.ts:131` and `src/routes/play/+page.svelte:63` (2b). `src/hooks.client.ts` stays
  (_D7_).
- **Packages** (_D1_), the only ones that move:

  | Package                        | Installed now | Range in `package.json`  | Installed after | Step  |
  | ------------------------------ | ------------- | ------------------------ | --------------- | ----- |
  | `@sveltejs/kit`                | 2.70.1        | `^2.70.4`, then `^3.1.1` | 2.70.4, 3.1.1   | 1, 2b |
  | `@sveltejs/adapter-static`     | 3.0.10        | `^4.0.1`                 | 4.0.1           | 2b    |
  | `@sveltejs/vite-plugin-svelte` | 6.2.4         | `^7.3.1`                 | 7.3.1           | 2a    |
  | `vite`                         | 7.3.6         | `^8.3.6`                 | 8.3.6           | 2a    |
  | `svelte`                       | 5.56.7        | `^5.57.3`                | 5.57.3          | 2a    |
  | `typescript`                   | 5.9.3         | `~6.0.3`                 | 6.0.3           | 2a    |
  | `vitest`                       | 3.2.7         | `^5.1.0`                 | 5.1.0           | 2a    |
  | `svelte-check`                 | 4.7.3         | `^4.7.8`                 | 4.7.8           | 2a    |
  | `eslint-plugin-svelte`         | 3.22.0        | `^3.24.0`                | 3.24.0          | 2a    |
  | `typescript-eslint`            | 8.65.0        | `^8.72.1`                | 8.72.1          | 2a    |
  | `jsdom`                        | 24.1.3        | `^31.0.0`                | 31.0.0          | 3     |

  Every other dependency keeps its version and its range; no package is added; no `npm update` and
  no `npm audit fix`. On 2026-11-06 every range above resolved to exactly the version in the table
  (`npm view '<package>@<range>' version`). If an install resolves a newer version, stop and ask the
  owner.

- **`#lib`** (_D4_): `package.json` gets `"imports": { "#lib/*": "./src/lib/*" }` and no bare
  `"#lib"`; every import from `src/lib` names the real file (`#lib/shareUrl.ts`,
  `#lib/setup.svelte.ts`, `#lib/components/ActionBar.svelte`). The 149 relative import lines stay as
  they are.
- **Config** (_D5_): the Kit options are `sveltekit({ … })` options in `vite.config.ts`;
  `svelte.config.js` is deleted in step 1. **No codemod** (_D14_): never run `sv migrate`.
- **Tests change only as _Testing_ allows:** `#lib` paths and the `goto` option name; strings under
  the test-fix rule (_Step 3_); and the one new test of Task 3. No test is deleted, skipped or
  loosened. The 15 files in `src/lib/engines/__snapshots__/` never change, and Vitest never runs
  with `-u`. Every Vitest run passes `--reporter=default`, because Vitest 5 picks `minimal` under
  an agent (_M12_).
- **Commits:** exactly five after the spec and this plan, one per step task, subject line only,
  verbatim and in this order (_Notes for the plan_):
  1. `build: configure SvelteKit in vite.config.ts and import src/lib as #lib`
  2. `build: move to Vite 8, vite-plugin-svelte 7, TypeScript 6 and Vitest 5`
  3. `build: upgrade to SvelteKit 3.1.1`
  4. `test: move to jsdom 31`
  5. `ci: move the deploy workflow to the current action majors`

  **No AI attribution anywhere:** no `Co-Authored-By` line naming an AI, no "Generated with" line
  and no session trailer, in any commit, file or text for the PR, even when a harness reminder asks
  for one. Commit as the repository's author, never by changing git config:
  `git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "<subject>"`.
  Work on `build/sveltekit-3`. Do not push, and do not open a PR.

- **Shells.** The Run lines are bash. The agents' shell is zsh: a Run line that needs bash
  word-splitting or an unmatched glob runs inside `bash -c '…'`. `node`, `npm` and `npx` are on
  `PATH` only after `source ~/.nvm/nvm.sh && nvm use 24`: prefix agent commands with it (the Run
  lines leave it out). Never write that prefix into a file or a command for the owner; commands for
  the owner behave the same in bash and fish (no unquoted globs).
- **Worktrees** get a real `npm ci`, never a symlinked `node_modules` (_Notes for the plan_). Every
  task ends with `git worktree list` showing only `/home/nn/Projects/scandible`, and every step task
  ends with `git status --short` printing nothing.
- **Firefox:** headless only, with `--no-remote` and a fresh `mktemp -d` profile on every run, never
  the owner's profile. Stop only processes you started, by PID or by the process group you started;
  never `pkill`, `killall` or a pattern kill.
- **Verification fails closed.** A check that errors, prints nothing where output is expected, or is
  skipped is UNVERIFIED, never PASS. A row changes status only when its evidence is in the record.
  Never loosen a check to make it pass. A step is committed only when its gate prints all PASS and
  every S check is PASS; otherwise stop and report.
- **Unforeseen failures** (_Step 2a_): a failure this plan does not foresee gets a fix, a line in
  `<R>/deviations.md` and, if the fix changes the design, a question to the owner before the
  commit. In step 3 a failure that points at product behavior stops the task (_D8_).
- **The record stays out of the repository.** Tools, captures, shots and notes live in `<R>`;
  nothing in it is committed. Run `npx prettier --write` on every tracked file a task changes.
- **Each task reports** its gate's summary line, the status of each S check and every line it added
  to `<R>/deviations.md` or `<R>/unverified.md`.

## Plan decisions

- **The gate runner is one TypeScript script, `<R>/gate.ts`** (_The gate_). Every step task runs it
  the same way, it judges every A row by a written rule and fails closed, and it is never committed.
  The S rows are explicit commands in each task, with their output, recorded in
  `<R>/<step>/S.md` (columns: check, command, output or file, status).
- **A4 names its reference:** `npm run stage-check -- 1d83452`, so a moved local `main` cannot
  change what the branch is compared with. The pass line then ends `against 1d83452`.
- **A9's "committed lockfile"** is the lockfile the step is about to commit: the gate runs on the
  working tree before the commit.
- **A5 matches tests by file, describe titles and title** (the JSON report's `testResults[].name`
  relative to the tree, `ancestorTitles` and `title`), not by `fullName`, whose joining can change
  between Vitest versions.
- **A8's JS total** is the bytes of every `*.js` file directly in `dist/_app/immutable/chunks/`,
  `entry/` and `nodes/`; the largest chunk is the largest of those files. _M1_ says 724,624 B and
  lens 1 summed 724,620 B: the baseline's number under this rule is the reference.
- **From step 2b, `npm ls --all` lists `$app@ extraneous`:** Kit 3's sync writes its tsconfig base
  to `node_modules/$app/tsconfig.json` (Kit 3.1.1 `src/core/sync/write_tsconfig/index.js:95`). npm
  11.13.0 exits 0 with such a folder (probed on 2026-11-06), and A9 reads the exit status. The gate
  records the line.
- **The direct-dependency check.** Each install step saves `npm ls --depth=0 --json` before and
  after as `<R>/<step>/deps-before.json` and `deps-after.json`, and compares them with
  `diff <(jq -r '.dependencies|to_entries[]|"\(.key) \(.value.version)"' <R>/<step>/deps-before.json) <(jq -r '.dependencies|to_entries[]|"\(.key) \(.value.version)"' <R>/<step>/deps-after.json)`.
  Only the step's packages may differ.
- **The jsbarcode fix is `encoderTable`, typed to the encoder table** (Task 3), not a generic
  `cjsDefault<T>`: a `T | { default: T }` parameter over a `Record<string, …>` argument leaves
  TypeScript's inference of `T` open.
- **Step 2a reproduces _U6_ before the fix.** stage-check runs after the toolchain bump and before
  the import change, and must show the three `upc` cases UNVERIFIED. The fix then turns them PASS,
  so A4 proves the fix rather than chance.
- **_D13_'s fallback stops the run.** It is used only after one diagnosis round (Task 3, Step
  12). The step is then committed with the gate all PASS, and the controller tells the owner before
  Task 4 starts.
- **Step 1's `typescript` comment** is the spec snippet's ("Type-check the scripts too; removed in
  step 2b, when tsconfig.json gets its own include."), not `svelte.config.js`'s; the other two
  comments move unchanged.
- **Text the spec leaves open, written once:**
  - `build.cssTarget`'s comment:
    `// Tailwind CSS 4's browser floor. At Vite 8's default target, Lightning CSS splits the theme`
    and `// rule (its :has() selector) in two, and check-css fails.`
  - `version`'s comment:
    `// No hourly version poll: the app shows no "new version" prompt (Kit 3's default is an hour).`
  - The fallback's comment (only if used):
    `// Rolldown gives src/lib/engines/jsbarcode.ts's default import of jsbarcode/bin/barcodes the`
    and `// whole module.exports; see the SvelteKit 3 run record.`
  - `CONTRIBUTING.md`, step 1, a paragraph after the _Stack_ list (after `:25`): "Import from
    `src/lib` through the `#lib/*` entry of `package.json`'s `imports`, naming the file with its
    real extension: `#lib/shareUrl.ts`, `#lib/setup.svelte.ts`, `#lib/components/ActionBar.svelte`.
    The SvelteKit config (adapter, base path, preprocessing) is the `sveltekit()` options in
    `vite.config.ts`; there is no `svelte.config.js`."
  - `CONTRIBUTING.md:5`, step 3: "Requires Node 24.15 or later; `.nvmrc` holds `24`."
- **Screens are served two ways.** V1, P5 and the Review Focus probes serve a `dist/` folder through
  `probe.ts`'s static server, which maps `/scandible/…` as GitHub Pages does (`resolveRoute`,
  `scripts/stage-check.ts:46`) and injects a beacon. `main`'s build is kept in `<R>/baseline/dist/`,
  so Task 7 shoots both builds in one session. P1 serves with `vite preview`, as the spec says, so
  `main`'s side of P1 is shot in Task 1, from the worktree.
- **V1 noise.** Task 1 shoots `main` twice, and every pair must be identical. Task 7 shoots `main`
  again as the drift control. A final pair that differs while its control pair is identical is
  FAILED until the owner rules on it; a final pair whose control pair also differs is UNVERIFIED
  (noise), not FAILED.
- **U9's deliberate breaks** are made on a saved copy of `ActionBar.svelte` and undone by copying it
  back, because step 1's rewrite of that file is not yet committed.

## Review Focus

1. **Start, Back and the empty-play bounce through the real router.** Every page test mocks
   `$app/navigation` and `$app/paths` (`src/routes/page.test.ts:13-14`,
   `src/routes/play/page.test.ts:12-13`: `resolve` is the identity, `goto` a spy), so Kit 3's `goto`
   with `replace` and `resolve('/play')` under `/scandible` run nowhere before H2. A tester expects
   Start to open the play screen with the deck, Back to return with it, and an empty play link to
   land on setup without an extra history entry. Pinned by R1's `start`, `back` and `bounce` acts in
   Tasks 3 and 4, and again in Task 7.
2. **The Share panel in the production build.** The panel draws its QR with `uqr` and shows the link
   Start uses; no gate opens it (V1 shoots the page with the panel closed). Pinned by R1's `share`
   act (QR drawn, link fragment equal to `main`'s) in Tasks 3 and 4, and again in Task 7.
3. **A tab brought back to the front, online or offline.** Kit 3 fetches
   `/scandible/_app/version.json` on `focus` and `visibilitychange` (_M5_); the spec says nothing
   visible happens, and a failed fetch is ignored. Pinned by R1's `focus-ok` and `focus-down` acts
   in Task 4, and again in Task 7: one page load, the location unchanged, each request sent with
   `cache-control: no-cache`, no error.
4. **A tester's phone in dark mode.** Lightning CSS now minifies the CSS and lowers `color-scheme`
   into `--lightningcss-light` and `--lightningcss-dark` variables (lens 1, the _U5_ run), and V1
   shoots with the light preference only. Pinned by Task 3's `v1-dark` shots against `main`'s (0
   differing pixels, beacon `dark: true`), repeated in Task 7.
5. **A contributor's `npm install` on the committed lockfile.** `CONTRIBUTING.md`'s first command is
   `npm install`, not `npm ci`, and step 2a's lockfile is made by deleting entries by hand. It must
   install and leave `package-lock.json` unchanged. Pinned in Task 3 (against the lockfile it is
   about to commit) and in Task 7.

## The gate

**Run** from `/home/nn/Projects/scandible`: `node <R>/gate.ts <step> [--cwd <dir>] [--evaluate]`.
`<step>` is `baseline`, `step-1`, `step-2a`, `step-2b`, `step-3` or `step-4`. Commands run in
`--cwd` (default: the repository root); captures always go to `<R>/<step>/` in this checkout.
`--evaluate` runs no command and judges the captures already there (after writing a size cause or a
rename). A full run takes 6 to 10 minutes; an agent runs it in the background and reads
`<R>/<step>/gate.md` when it exits. The gate never stages or commits anything.

**Rows, in run order.** `baseline` runs A9, A1, A3, A7 and A8 only; the steps run all nine. Every
row starts UNVERIFIED.

| Row | Runs                                                                                                                                                                                                            | Captures in `<R>/<step>/`                   | PASS when                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A9  | `npm ci`, then `npm ls --all`                                                                                                                                                                                   | `npm-ci.log`, `npm-ls.txt`                  | both exit 0                                                                                                                                                                                                                                                                        |
| A1  | `npm test -- --reporter=default --reporter=json --outputFile=<R>/<step>/vitest.json`, then `git status --porcelain -- src/lib/engines/__snapshots__`                                                            | `test.log`, `vitest.json`, `snapshots.txt`  | exit 0; the log has `COMPLETED <n> FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`; the porcelain output is empty                                                                                                                                                                 |
| A2  | `npm run lint`                                                                                                                                                                                                  | `lint.log`                                  | exit 0                                                                                                                                                                                                                                                                             |
| A3  | `npm run build`                                                                                                                                                                                                 | `build.log`, `dist-files.txt`, `css.sha256` | exit 0, and the log's last non-empty line matches `^check-css: \d+ CSS files, \d+ bytes raw, \d+ bytes gzipped$`                                                                                                                                                                   |
| A7  | walks `dist/`                                                                                                                                                                                                   | (in `gate.md`)                              | no name starting with `.` and no `*.map` file, at any depth                                                                                                                                                                                                                        |
| A8  | reads `dist/` and the check-css line                                                                                                                                                                            | `sizes.json`, `sizes.md`                    | CSS raw and gzipped bytes, JS total and largest chunk recorded beside the previous step's and the baseline's; each change of more than 5% against the previous step has a line `<metric>: <cause>` in `size-causes.md`, metrics `css-raw`, `css-gzip`, `js-total`, `largest-chunk` |
| A6  | `npm run dev -- --port 5199 --strictPort` in its own process group; wait up to 60 s for `ready in`; `curl -s -o /dev/null -w '%{http_code}'` on `http://localhost:5199/` and `/play`; wait 10 s; stop the group | `dev.log`, `curl.txt`                       | `dev.log` has `ready in`; both codes are 200; `build.log` has the check-css line; `test.log` has a Vitest `Tests … (<n>)` summary line; none of the three holds a line matching `/deprecat/i`                                                                                      |
| A4  | `npm run stage-check -- 1d83452`                                                                                                                                                                                | `stage-check.log`                           | exit 0, and the line `stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against 1d83452`                                                                                                                                                                                               |
| A5  | reads `vitest.json` and `<R>/baseline/vitest.json`                                                                                                                                                              | `tests.md`                                  | `numFailedTests`, `numPendingTests` and `numTodoTests` are 0; `numTotalTests` is at least 1000; every baseline test is present, or is mapped in `renames.json` to a present test                                                                                                   |

`renames.json` is written by hand only for a title Vitest 5 prints differently:
`[{ "baseline": "<key>", "now": "<key>", "why": "<the formatting change>" }]`, both keys as
`tests.md` prints them. `tests.md` lists every key (`<file> > <describe> > … > <title>`) and, for a
step, the missing and the new ones.

**FAILED** means the command ran and broke the rule: a non-zero exit, an error or warning count, a
deprecation line, a non-200 code from a dev server that started, a failed or missing test, or a
dotfile.
**UNVERIFIED** means the rule could not be judged: a capture missing or empty, a marker line absent,
a JSON that does not parse, a dev server that never printed `ready in`, a step whose previous step
has no `sizes.json` (the baseline has no previous step), or a size change still without its cause.
A6 never reads `stage-check.log`, whose `npm ci` of `main` prints its own deprecation line (_A6_).

**Output.** The gate also writes `meta.txt` (`git rev-parse HEAD`, `git status --short`, the Node
and npm versions, start and end times) and `gate.md` and `gate.json` (each row with its status and
evidence, a file and a line). It prints one line per row (`A1 PASS`, or
`A6 FAILED: build.log:57: <line>`), then `gate <step>: <p> PASS, <f> FAILED, <u> UNVERIFIED`, and
exits 0 when every row passed, 1 when any failed, and 2 otherwise.

## The probes

`node <R>/probe.ts <command> …`, from `/home/nn/Projects/scandible`. It imports `resolveRoute`
(`scripts/stage-check.ts:46`), `nonWhiteShare` (`:57`) and `diffPixels` (`:69`), and `PNG` from
pngjs.

- `shoot <set> <out-dir> --serve static --dist <dir>` serves `<dir>` on 127.0.0.1 at a free port,
  mapping paths with `resolveRoute`, and injects before `</head>` of every HTML page a script that
  posts a beacon on `load`: `innerWidth`, `innerHeight`,
  `matchMedia('(prefers-color-scheme: dark)').matches`, and the `error` and `unhandledrejection`
  messages seen so far.
- `shoot <set> <out-dir> --serve preview|dev --cwd <dir> --port <n>` starts
  `npm run preview -- --port <n> --strictPort` (or `npm run dev -- …`) in `<dir>` in its own process
  group, waits up to 60 s for its `Local:` line, and stops the group afterwards. It injects nothing,
  so these shots have no beacon.
- A **shot** follows stage-check's recipe (`startFirefox`, `scripts/stage-check.ts:307-327`):
  `firefox --headless --no-remote --profile <fresh mktemp -d> --window-size=W,H --screenshot <png> <url>`
  with `MOZ_HEADLESS_WIDTH=W` and `MOZ_HEADLESS_HEIGHT=H`, detached, stopped by its process group
  once it exits or after 60 s, profile deleted. A shot is ok when Firefox exited in time, the PNG
  decodes with pngjs at W×H and, under `--serve static`, the beacon arrived (waiting up to 2 s after
  Firefox exits, as stage-check's `BEACON_GRACE_MS` does) with W×H, and with `dark: true` in
  `v1-dark`. `shoot` writes `<out-dir>/<name>.png` and `<out-dir>/shots.json`
  (name, URL, size, ok, reason, non-white share, beacon) and exits 0 only when every shot is ok.
- `act <out.json> --dist <dir> [--only <act>,…]` runs each act below in its own headless Firefox
  (`--kiosk`, not `--screenshot`) against the static server, for up to 20 s. Every page load posts a
  `load` beacon (pathname, hash, `history.length`); each act ends with one `done` beacon, which also
  carries the `error` and `unhandledrejection` messages seen since the first load. The server
  records each request for `/scandible/_app/version.json` with its `cache-control` header. `act`
  writes `{ <act>: { loads, done, versionRequests } }` and exits 0 only when every act's `done`
  arrived.
- `diff <dir-a> <dir-b> <out.md>`: every PNG name in either folder is a pair. A name on one side only
  is UNVERIFIED, different sizes are FAILED, otherwise the pair has the count of differing pixels.
  It writes the table to `<out.md>`, prints
  `diff: <n> pairs, <z> identical, <d> differ, <m> unverified`, and exits 0 when every pair is identical, 1 when any differs, and 2 otherwise.

**Decks** are stage-check's (`scripts/stage-check.ts:119-123`), with the fragment `deckUrl` builds
(`:363-374`): `URLSearchParams` of `codes`, `fmt`, `mode=step`, `rot=1`, `rotmax=20`, `seed=7`. The
decks are `upc` (`036000291452`), `qr` (`https://example.com/scandible`) and `pdf417`
(`SCANDIBLE STAGE CHECK 0123456789`).

| Set       | Shot names                                                                                                                               | Path                                                      | Sizes                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `v1`      | `setup-<deck>-<W>x<H>` and `play-<deck>-<W>x<H>`, 36                                                                                     | `/scandible/#<deck>` and `/scandible/play#<deck>`         | 320×568, 360×800, 390×844, 844×390, 768×1024, 1280×800 |
| `v1-dark` | the same six views with `-dark` added; the profile's `user.js` holds `user_pref("layout.css.prefers-color-scheme.content-override", 0);` | as `v1`                                                   | 390×844                                                |
| `p1`      | `p1-legacy`, `p1-fragment`, `p1-rows`                                                                                                    | L1, L2, L3 below                                          | 1280×800                                               |
| `p4`      | `p4-upc`, after one discarded warm-up shot of the same URL (Vite's first visit optimizes deps)                                           | `/#codes=036000291452&fmt=upc` (dev serves from the root) | 1280×800                                               |
| `p5`      | `p5-percent`                                                                                                                             | `/scandible/play#codes=50%`                               | 1280×800                                               |

If a `v1-dark` beacon reports `dark: false`, add `user_pref("ui.systemUsesDarkTheme", 1);` to the
`user.js` and record it in `<R>/deviations.md`. P1's links, built by `main`'s encoder:

- L1 `/scandible/?codes=036000291452%0A012345678905` (a legacy query string);
- L2
  `/scandible/#codes=036000291452%0A012345678905&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=7&fmt=upc`
  (codes and settings, in `encodeShareUrl`'s order);
- L3
  `/scandible/#r1=upc_012345678905&r2=qr-H_WIFI%3AS%3Ahome%3B%0AP%3Asecret&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc`
  (rows; `src/lib/shareUrl.test.ts:268`).

**Acts.** R1 is the first six; P5 uses `percent`. Kit 3 registers both version-check listeners on
`window` (`client.js:3123`, `:3132`), so the events are dispatched there.

| Act          | Loads                                                    | Does                                                                                                                                    | `done` carries                                                                     |
| ------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `start`      | `/scandible/#<upc>`                                      | clicks `button.start` once it is enabled; waits for pathname `/scandible/play` and a `.barcode-item svg`                                | pathname, hash, history length, rendered                                           |
| `back`       | `/scandible/play#<upc>`                                  | clicks the `.overlay` button whose text is `Back`; waits for pathname `/scandible/`                                                     | pathname, hash, history length                                                     |
| `bounce`     | `/scandible/play` (no fragment)                          | waits for pathname `/scandible/`                                                                                                        | pathname, hash, history length                                                     |
| `share`      | `/scandible/#<upc>`                                      | clicks the button whose text is `Share`; waits for a `.qr-code svg` wider than 0                                                        | QR drawn and not `hidden`; the fragment of the field labelled `Share link address` |
| `focus-ok`   | `/scandible/#<upc>`                                      | after 1 s, `window.dispatchEvent(new Event('focus'))`; after 2 s, `window.dispatchEvent(new Event('visibilitychange'))`; done after 2 s | pathname, hash                                                                     |
| `focus-down` | as `focus-ok`; the server answers 503 for `version.json` | as `focus-ok`                                                                                                                           | pathname, hash                                                                     |
| `percent`    | `/scandible/play#codes=50%`                              | done after 3 s                                                                                                                          | pathname, hash, rendered                                                           |

**R1 passes** when, against `<R>/baseline/r1.json`: each act has one load and its `done` with no
error; `start`, `back`, `bounce` and `share` carry the same pathname, hash, history length, rendered
flag, QR flag and link fragment as `main`'s; and the focus acts keep the load's pathname and hash.
On Kit 2 (`main`, step 2a) the focus acts make no version request (_M13_). On Kit 3 (step 2b on)
each makes at least one, every one with `cache-control: no-cache` (_M5_).

## File structure

| Path                                                                                                         | Change                                                                                                    | Tasks   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------- |
| `package.json`, `package-lock.json`                                                                          | `imports`; the ranges in _Global Constraints_                                                             | 2 to 5  |
| `vite.config.ts`                                                                                             | the Kit options (2); `build.cssTarget` (3); `version`, no `typescript` (4); `legacy` only as the fallback | 2, 3, 4 |
| `svelte.config.js`; `eslint.config.js`                                                                       | deleted; no `svelteConfig`                                                                                | 2       |
| `tsconfig.json`                                                                                              | `allowImportingTsExtensions` (2); `types` (3); Kit 3's base (4)                                           | 2, 3, 4 |
| 36 files under `src/`                                                                                        | `#lib` specifiers in 35, the comment in `src/lib/finish.ts`                                               | 2       |
| `scripts/migrate-lib-imports.ts`                                                                             | the `$lib` rewrite; deleted in step 2b                                                                    | 2, 4    |
| `src/lib/engines/jsbarcode.ts`, `src/lib/engines/jsbarcode.test.ts`                                          | `encoderTable` and its test                                                                               | 3       |
| `src/hooks.client.ts`, `src/lib/shareUrl.ts`, `src/routes/play/+page.svelte`, `src/routes/play/page.test.ts` | Kit 3's type and option changes                                                                           | 4       |
| `src/lib/scroller.test.ts`                                                                                   | jsdom 31's serialization                                                                                  | 5       |
| `CONTRIBUTING.md`                                                                                            | `#lib` and the config (2); Node (5)                                                                       | 2, 5    |
| `.github/workflows/deploy.yml`, `docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md`                  | the action majors; Q2 and F4                                                                              | 6       |
| `<R>/` (git-ignored, never committed)                                                                        | `gate.ts`, `probe.ts`, captures, shots, `deviations.md`, `unverified.md`, `tiers.md`                      | 1 to 7  |

### Counts

| After                | Test files | Tests |
| -------------------- | ---------- | ----- |
| `1d83452` (baseline) | 50         | 1000  |
| Task 2 (step 1)      | 50         | 1000  |
| Tasks 3 to 6         | 51         | 1001  |

svelte-check's file count may move by a file or two per step; its pass is 0 errors and 0 warnings.

---

### Task 1: The record's tools, and the baseline from `main`

**Files:**

- Create in `<R>` (not committed): `gate.ts`, `probe.ts`, `deviations.md`, `unverified.md`,
  `baseline/`, and empty `step-1/`, `step-2a/`, `step-2b/`, `step-3/`, `step-4/`, `probes/`,
  `visual/`
- Move: `<R>/toolchain-research.md` to `<R>/review/toolchain-research.md`
- No tracked file changes and no commit.

**Interfaces:**

- Consumes: `scripts/stage-check.ts`'s exports `resolveRoute`, `nonWhiteShare` and `diffPixels`.
- Produces: `gate.ts` and `probe.ts` as _The gate_ and _The probes_ define them; in
  `<R>/baseline/`: the gate's captures (`vitest.json`, `tests.md`, `build.log`, `css.sha256`,
  `dist-files.txt`, `sizes.json`, `npm-ls.txt`, `meta.txt`, `gate.md`), `lib-specifiers.txt`,
  `env.txt`, `dist/` (`main`'s build), `v1/`, `v1-again/`, `v1-dark/`, `p1/` and `r1.json`.

- [ ] **Step 1: Lay out the record**

Create the folders above, `deviations.md` (`# Deviations`) and `unverified.md` (`# Unverified`),
and move the research report into `review/`. The plan's author copied the review's evidence into
`<R>/review/` on 2026-11-06.

Run: `ls <R>/review <R>/review/lens1/codemod.diff`
Expected: `lens1`, `lens1-report.md`, `lens1-scripts`, `lens2-report.md`, `lens3-report.md` and
`toolchain-research.md`, and the codemod's diff (_D14_). A missing file: copy it from
`/tmp/claude-1000/-home-nn-Projects-scandible/824d3366-f0da-4576-b607-3038abc2acef/scratchpad/`,
or, if that is gone, list it in `unverified.md`.

- [ ] **Step 2: Write `<R>/gate.ts` to _The gate_**

- [ ] **Step 3: Prove that the gate fails closed**

Run: `node <R>/gate.ts step-1 --evaluate; echo "exit $?"`
Expected: nine rows UNVERIFIED, `gate step-1: 0 PASS, 0 FAILED, 9 UNVERIFIED`, `exit 2`. Then
`rm -rf <R>/step-1 && mkdir <R>/step-1`.

- [ ] **Step 4: Write `<R>/probe.ts` to _The probes_**

- [ ] **Step 5: Add the worktree of `main`**

Run: `git worktree add --detach <scratchpad>/sk3-main 1d83452`
Expected:
`HEAD is now at 1d83452 feat: redesign the play screen for any size, with finish stats and keep-awake (#13)`.

- [ ] **Step 6: Run the gate on `main`**

Run: `node <R>/gate.ts baseline --cwd <scratchpad>/sk3-main; echo "exit $?"`
Expected (_M1_): `gate baseline: 5 PASS, 0 FAILED, 0 UNVERIFIED`, `exit 0`; `tests.md` 50 files and
1000 tests; `check-css: 3 CSS files, 78468 bytes raw, 13761 bytes gzipped`; `css.sha256` holds
`33f6482e…` (`0.D8OQfxMD.css`), `5c0b5aba…` (`2.BFxopuDk.css`) and `4e4273cb…` (`3.98-SRWYv.css`);
largest chunk 585,396 B; JS total near 724,620 B; `dist/` holds `_app`, `index.html` and
`play.html`. A test count or a check-css line other than _M1_'s: stop and report, because the spec's
baseline is wrong. Any other difference from _M1_: write it to `<R>/baseline/notes.md`.

- [ ] **Step 7: Count `main`'s `$lib` specifiers and record the tools' versions**

Run: `grep -rnoF -e "'\$lib/" -e '"$lib/' <scratchpad>/sk3-main/src <scratchpad>/sk3-main/scripts | wc -l`
Expected: `92`, written to `<R>/baseline/lib-specifiers.txt`.

Run: `firefox --version; node --version; npm --version`
Expected: `Mozilla Firefox 155.0.1`, `v24.17.0`, `11.13.0`, written to `<R>/baseline/env.txt`.

- [ ] **Step 8: Keep `main`'s build**

Run: `cp -r <scratchpad>/sk3-main/dist <R>/baseline/dist`

- [ ] **Step 9: Shoot `main`, and run its acts**

Run each, from the repository root:

- `node <R>/probe.ts shoot v1 <R>/baseline/v1 --serve static --dist <R>/baseline/dist`
- `node <R>/probe.ts shoot v1 <R>/baseline/v1-again --serve static --dist <R>/baseline/dist`
- `node <R>/probe.ts shoot v1-dark <R>/baseline/v1-dark --serve static --dist <R>/baseline/dist`
- `node <R>/probe.ts act <R>/baseline/r1.json --dist <R>/baseline/dist`
- `node <R>/probe.ts shoot p1 <R>/baseline/p1 --serve preview --cwd <scratchpad>/sk3-main --port 4174`

Expected: each exits 0; every `v1` beacon reports its W×H, every `v1-dark` beacon `dark: true`;
every act has one load and its `done` with no error; `focus-ok` and `focus-down` record no version
request (Kit 2, _M13_); `percent` is rendered.

- [ ] **Step 10: Prove the shots repeat, and that `diff` fails closed**

Run: `node <R>/probe.ts diff <R>/baseline/v1 <R>/baseline/v1-again <R>/baseline/v1-repeat.md; echo "exit $?"`
Expected: `diff: 36 pairs, 36 identical, 0 differ, 0 unverified`, `exit 0`.

Run: `mkdir -p <scratchpad>/empty && node <R>/probe.ts diff <R>/baseline/v1 <scratchpad>/empty <scratchpad>/empty.md; echo "exit $?"`
Expected: `diff: 36 pairs, 0 identical, 0 differ, 36 unverified`, `exit 2`.

A pair that differs on the repeat: find what moves (a caret, an animation). If one injected style
can freeze it, add it to the static server for both builds, record it in `deviations.md` and shoot
`v1` and `v1-again` again. If it cannot be frozen, list those views in `unverified.md` as noise that V1
cannot pass, and report it before Task 2.

- [ ] **Step 11: Remove the worktree**

Run: `git worktree remove --force <scratchpad>/sk3-main && git worktree list && git status --short`
Expected: one line, `/home/nn/Projects/scandible  <hash> [build/sveltekit-3]`; no status output.

---

### Task 2: Step 1 — the config in `vite.config.ts`, `$lib` to `#lib`, on Kit 2.70.4

**Files:**

- Modify: `package.json` (`imports`; `@sveltejs/kit`), `package-lock.json`, `vite.config.ts` (the
  whole file), `eslint.config.js:9`, `:34-35`, `tsconfig.json:7`, `src/lib/finish.ts:4`,
  `CONTRIBUTING.md` (after `:25`), and the 35 files that hold a quoted `$lib/` specifier
- Create: `scripts/migrate-lib-imports.ts`
- Delete: `svelte.config.js`

**Interfaces:**

- Consumes: _The gate_; `<R>/baseline/lib-specifiers.txt` and `css.sha256`.
- Produces: imports from `src/lib` as `#lib/<path with extension>`; the Kit options in
  `vite.config.ts`; `scripts/migrate-lib-imports.ts`, run as `node scripts/migrate-lib-imports.ts`
  with no arguments. It prints `<path>: <n>` for each changed file (path from the repository root)
  and `total: <N>` last, and exits 0. Otherwise it exits 1, writes nothing, and names each specifier
  that matched no file or more than one, with its candidates. Task 4 deletes it.

- [ ] **Step 1: Raise Kit to 2.70.4**

Run: `npm ls --depth=0 --json > <R>/step-1/deps-before.json; npm install --save-dev @sveltejs/kit@^2.70.4 && npm ls --depth=0 --json > <R>/step-1/deps-after.json`
Then the direct-dependency check (_Plan decisions_).
Expected: one changed pair, `< @sveltejs/kit 2.70.1` and `> @sveltejs/kit 2.70.4`;
`package.json` has `"@sveltejs/kit": "^2.70.4"`.

- [ ] **Step 2: Move the config**

Write `vite.config.ts` as _Step 1_ item 2 gives it, adding the imports
`import adapter from '@sveltejs/adapter-static';` and
`import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';`, and keeping `svelteTesting()`,
`tailwindcss()` and `test`. Delete `svelte.config.js`. In `eslint.config.js`, delete the import at
`:9` and the `svelteConfig` key at `:35` (with the comma after `parser: ts.parser`).

Run: `rm -rf .svelte-kit && npx svelte-kit sync; echo "exit $?"; grep -c 'scripts/\*\*/\*.ts' .svelte-kit/tsconfig.json`
Expected: no output from sync, `exit 0`, `1`: Kit read the `typescript` option from
`vite.config.ts` (lens 1 measured the same).

- [ ] **Step 3: Write `scripts/migrate-lib-imports.ts`**

It walks `src` and `scripts` for `.ts`, `.svelte` and `.js` files, skipping itself, and finds every
match of `(['"])\$lib\/([^'"]+)\1`. For each specifier it tries, under `src/lib/`, the path as
written, then with `.ts`, then with `.svelte.ts`, never `index.ts`; exactly one must be a file. It
rewrites each match to `#lib/<that file>` in the same quotes, and computes every rewrite before it
writes any file.

- [ ] **Step 4: Prove that it fails closed**

Create `src/lib/zz-probe.ts` holding `import '$lib/nope';`.
Run: `node scripts/migrate-lib-imports.ts; echo "exit $?"; git status --short src`
Expected: a message naming `$lib/nope` with no candidate, `exit 1`, and only
`?? src/lib/zz-probe.ts` in the status. Delete `src/lib/zz-probe.ts`.

- [ ] **Step 5: Rewrite the specifiers**

Run: `node scripts/migrate-lib-imports.ts | tee <R>/step-1/migrate.log`
Expected: 35 `src/…: <n>` lines and `total: 92`, equal to `<R>/baseline/lib-specifiers.txt`.

- [ ] **Step 6: Make the hand edits**

`src/lib/finish.ts:4`: `$lib` becomes `#lib`. `package.json`: `"imports": { "#lib/*": "./src/lib/*" }`
after `"type": "module",`. `tsconfig.json`: `"allowImportingTsExtensions": true` after
`"skipLibCheck": true`. `CONTRIBUTING.md`: the step 1 paragraph from _Plan decisions_.

- [ ] **Step 7: Format**

Run: `npx prettier --write vite.config.ts eslint.config.js package.json tsconfig.json CONTRIBUTING.md scripts/migrate-lib-imports.ts src/lib/finish.ts && npx prettier --check src scripts`
Expected: `All matched files use Prettier code style!` (the 92 rewritten lines need no reflow, as in
lens 1's run).

- [ ] **Step 8: Run the gate**

Run: `node <R>/gate.ts step-1; echo "exit $?"`
Expected: `gate step-1: 9 PASS, 0 FAILED, 0 UNVERIFIED`, `exit 0`: 50 files and 1000 tests; the same
check-css line as the baseline; no deprecation line (_U11_); sizes within 5% (expected: 18 JS files,
725,050 B, largest 585,423 B, since Kit 2.70.4 adds one small chunk).

- [ ] **Step 9: Check S1**

Record each in `<R>/step-1/S.md`:

- `grep -rnF '$lib' src scripts --exclude=migrate-lib-imports.ts; echo "exit $?"` prints only
  `exit 1`.
- `tail -1 <R>/step-1/migrate.log` prints `total: 92`, the number in
  `<R>/baseline/lib-specifiers.txt`.
- `test -e svelte.config.js; echo "exit $?"` prints `exit 1`; `jq -c .imports package.json` prints
  `{"#lib/*":"./src/lib/*"}`.
- `grep -c 'is ignored when options are passed via your Vite config' <R>/step-1/dev.log <R>/step-1/build.log`
  prints `:0` for each (A6 has shown both are non-empty).
- `diff <R>/baseline/css.sha256 <R>/step-1/css.sha256; echo "exit $?"` prints only `exit 0`.
- _U9_: `cp src/lib/components/ActionBar.svelte <R>/step-1/ActionBar.keep`; add `goto('/x');` as a
  new line after `ActionBar.svelte:47`; `npx eslint src/lib/components/ActionBar.svelte` reports
  `svelte/no-navigation-without-resolve` at line 48 and exits 1. Replace that line with
  `const probe: number = 'not a number';`; `npx svelte-check --tsconfig ./tsconfig.json --output human`
  reports `Type 'string' is not assignable to type 'number'` in `ActionBar.svelte` and exits 1. Then
  `cp <R>/step-1/ActionBar.keep src/lib/components/ActionBar.svelte` and
  `cmp src/lib/components/ActionBar.svelte <R>/step-1/ActionBar.keep` prints nothing. Both outputs
  go to `<R>/step-1/u9.log`.

- [ ] **Step 10: Commit**

Run: `git add -A && git diff --cached --name-status`
Expected: 44 paths: `M` for the 36 `src/` files, `CONTRIBUTING.md`, `eslint.config.js`,
`package-lock.json`, `package.json`, `tsconfig.json` and `vite.config.ts`;
`A scripts/migrate-lib-imports.ts`; `D svelte.config.js`. Nothing else.

```bash
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "build: configure SvelteKit in vite.config.ts and import src/lib as #lib"
git log -1 --format=%B && git status --short && git worktree list
```

Expected: the subject alone, no status output, and only the main checkout in the worktree list. The
same holds after every step commit.

---

### Task 3: Step 2a — the toolchain on Kit 2.70.4

**Files:**

- Modify: `package.json` (eight ranges), `package-lock.json`, `tsconfig.json`, `vite.config.ts`,
  `src/lib/engines/jsbarcode.ts:2`
- Create: `src/lib/engines/jsbarcode.test.ts`

**Interfaces:**

- Consumes: _The gate_, _The probes_; `<R>/baseline/dist/`, `v1-dark/` and `r1.json`.
- Produces, in `src/lib/engines/jsbarcode.ts`:

```ts
type EncoderTable = typeof barcodesModule; // Record<string, encoder class> (src/lib/jsbarcode.d.ts)
/** The encoder table, whichever CommonJS interop shape the bundler gave the default import. */
export function encoderTable(mod: EncoderTable | { default: EncoderTable }): EncoderTable;
```

- [ ] **Step 1: Install the eight packages with the spec's recipe** (_Notes for the plan_)

Save `deps-before.json`. Set the ranges of Vite, vite-plugin-svelte, Svelte, TypeScript, Vitest,
svelte-check, eslint-plugin-svelte and typescript-eslint (_Global Constraints_) in `package.json`.
With a `node -e` script, delete every `packages` key of `package-lock.json` that matches
`^node_modules/(vite|vitest|@vitest/[^/]+|@sveltejs/vite-plugin-svelte(-inspector)?)$`; it must
report 11 keys. A plain `npm install <package>@<range>` fails with `ERESOLVE` on the stale
`vite-plugin-svelte-inspector` peer chain (lens 1, `s2a-install.log`).

Run: `npm install && npm ls --depth=0 --json > <R>/step-2a/deps-after.json`, then the
direct-dependency check.
Expected: exactly eight changed pairs, the eight packages from their installed version to the one in
_Global Constraints_; `@sveltejs/kit` stays 2.70.4.

- [ ] **Step 2: Name Node's types**

`tsconfig.json`: `"types": ["node"]` after `"allowImportingTsExtensions": true`.

- [ ] **Step 3: Set the CSS target** (_D12_)

`vite.config.ts`: `build: { cssTarget: ['chrome111', 'edge111', 'firefox128', 'safari16.4'] },`
between `plugins` and `test`, with the comment from _Plan decisions_.

- [ ] **Step 4: Reproduce _U6_ before the fix**

Run: `npm run stage-check -- 1d83452 > <R>/step-2a/stage-check-before-fix.log 2>&1; echo "exit $?"`
Expected: `exit 2`, and the log holds `UNVERIFIED step upc 1280x900: current: no ready message`,
`UNVERIFIED step upc 390x844: current: no ready message`,
`UNVERIFIED scroll upc 1280x900: current: no ready message within 20 s` and
`stage-check: 5 PASS, 0 MISMATCH, 3 UNVERIFIED against 1d83452`. If the build fails with check-css
`found 2`, Step 3 is wrong: fix it first. If all 8 PASS, the bug did not reproduce: record that in
`deviations.md`, keep going (the fix is _D13_'s decision), and add to `unverified.md` "_D13_'s fix:
its production effect is unproven, because _U6_ did not reproduce".

- [ ] **Step 5: Write the failing test**

`src/lib/engines/jsbarcode.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import barcodes from 'jsbarcode/bin/barcodes';
import { encoderTable } from './jsbarcode';

describe('encoderTable', () => {
	it('yields the encoder table from either CommonJS interop shape', () => {
		// Vitest, Vite 7 and the dev server give the default import exports.default: the table.
		expect(encoderTable(barcodes)).toBe(barcodes);
		expect(encoderTable(barcodes).UPC).toBeTypeOf('function');
		// Rolldown (the Vite 8 build) gives it the whole Babel module.exports.
		const wholeModule = Object.defineProperty({ default: barcodes }, '__esModule', { value: true });
		expect(encoderTable(wholeModule)).toBe(barcodes);
	});
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `npx vitest run src/lib/engines/jsbarcode.test.ts --reporter=default`
Expected: FAIL with a `TypeError` saying `encoderTable` is not a function.

- [ ] **Step 7: Write `encoderTable(mod: EncoderTable | { default: EncoderTable }): EncoderTable`**

In `src/lib/engines/jsbarcode.ts`, exported, after the imports, with `EncoderTable` as the
Interfaces block gives it. The import keeps its name `barcodes` until Step 9, so until then the
type reads `typeof barcodes`.

- [ ] **Step 8: Run it to see it pass**

Run: `npx vitest run src/lib/engines/jsbarcode.test.ts --reporter=default`
Expected: PASS, `Tests  1 passed (1)`.

- [ ] **Step 9: Change the import**

`:2` becomes `import barcodesModule from 'jsbarcode/bin/barcodes';`. After `encoderTable`,
`const barcodes = encoderTable(barcodesModule);`, with a one-line comment saying that Rolldown gives
this default import the whole `module.exports`. `check()` keeps reading `barcodes[…]`.
`src/lib/formats.test.ts:2` keeps its plain import: under Vitest it is the table.

- [ ] **Step 10: Format**

Run: `npx prettier --write package.json tsconfig.json vite.config.ts src/lib/engines/jsbarcode.ts src/lib/engines/jsbarcode.test.ts`

- [ ] **Step 11: Run the gate**

Run: `node <R>/gate.ts step-2a; echo "exit $?"`
Expected: 51 files and 1001 tests; check-css `3 CSS files, 81047 bytes raw, 14030 bytes gzipped`
(expected, _U5_); A4 `stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against 1d83452`, which is the
fix's proof; A8 `largest-chunk` about −6% (expected, _U6_): A8 then stays UNVERIFIED, and the gate
exits 2, until its cause is written. Write
`largest-chunk: Rolldown (Vite 8) bundles bwip-js about 6% smaller (spec U6)` and a measured cause
for any other metric over 5% in `<R>/step-2a/size-causes.md`. Then
`node <R>/gate.ts step-2a --evaluate` prints `gate step-2a: 9 PASS, 0 FAILED, 0 UNVERIFIED`. A5
missing names: if Vitest 5 prints a title differently, write `renames.json` with both forms and
evaluate again; any other missing test is FAILED.

- [ ] **Step 12 (only if A4 still reports a `upc` case UNVERIFIED or MISMATCH): the fallback** (_D13_)

1. Keep `stage-check.log`. Find the shape the build gives: read the bundled code around
   `jsbarcode/bin/barcodes` in `dist/_app/immutable/chunks/`. If it is a third shape, add it to the
   test as one more assertion, extend `encoderTable`, and run Steps 8 and 11 again, once.
2. If A4 still fails: add `legacy: { inconsistentCjsInterop: true },` to `vite.config.ts` after
   `build`, with the fallback comment from _Plan decisions_. Keep `encoderTable` and its test. Run
   Step 11 again.
3. Write the cause, both stage-check logs and the shape found to `deviations.md`. Commit (Step 15)
   only with the gate all PASS, then stop: the controller tells the owner that the fallback is in
   before Task 4 starts.

- [ ] **Step 13: Check S2**

Record each in `<R>/step-2a/S.md`:

- `npm ls vite @sveltejs/vite-plugin-svelte svelte typescript vitest svelte-check eslint-plugin-svelte typescript-eslint`
  shows 8.3.6, 7.3.1, 5.57.3, 6.0.3, 5.1.0, 4.7.8, 3.24.0 and 8.72.1 at the top level.
- `grep -c "cssTarget: \['chrome111', 'edge111', 'firefox128', 'safari16.4'\]" vite.config.ts`
  prints `1`; A3 passed with check-css's single theme rule.
- `src/lib/engines/jsbarcode.ts` holds `encoderTable` and the changed import, and
  `src/lib/engines/jsbarcode.test.ts` passed in A1 (it is in `vitest.json`).
- `grep -c 'legacy' vite.config.ts` prints `0`, unless Step 12 ran and `deviations.md` says why.
- `jq -c .compilerOptions.types tsconfig.json` prints `["node"]`.

- [ ] **Step 14: Run the Review Focus checks 1, 2, 4 and 5**

- Dark mode: `node <R>/probe.ts shoot v1-dark <R>/step-2a/v1-dark --serve static --dist dist` exits
  0 with `dark: true` in every beacon; then
  `node <R>/probe.ts diff <R>/baseline/v1-dark <R>/step-2a/v1-dark <R>/step-2a/v1-dark.md` prints
  `diff: 6 pairs, 6 identical, 0 differ, 0 unverified`.
- R1: `node <R>/probe.ts act <R>/step-2a/r1.json --dist dist --only start,back,bounce,share,focus-ok,focus-down`
  passes as _The probes_ says for Kit 2: the same as `main`'s, and no version request.
- `npm install`: `cp package-lock.json <R>/step-2a/lock-to-commit.json && npm install && cmp package-lock.json <R>/step-2a/lock-to-commit.json; echo "exit $?"`
  prints only npm's summary and `exit 0`.

A differing shot or act: stop and report, with both PNGs or both reports.

- [ ] **Step 15: Commit**

Run: `git add -A && git diff --cached --name-status`
Expected: `M package-lock.json`, `M package.json`, `A src/lib/engines/jsbarcode.test.ts`,
`M src/lib/engines/jsbarcode.ts`, `M tsconfig.json`, `M vite.config.ts`, and any file a recorded
deviation names.

```bash
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "build: move to Vite 8, vite-plugin-svelte 7, TypeScript 6 and Vitest 5"
git log -1 --format=%B && git status --short && git worktree list
```

---

### Task 4: Step 2b — Kit 3.1.1

**Files:**

- Modify: `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json` (the whole file),
  `src/hooks.client.ts:1`, `src/lib/shareUrl.ts:131`, `src/routes/play/+page.svelte:63`,
  `src/routes/play/page.test.ts:107`, `:150`, `:158`, `:620`, `:641-643`
- Delete: `scripts/migrate-lib-imports.ts`

**Interfaces:**

- Consumes: _The gate_, _The probes_, `<R>/baseline/r1.json`.
- Produces: `decodeShareUrl(url: Pick<URL, 'hash' | 'search'>)`, accepting Kit 3's read-only
  `page.url` (_M10_).

- [ ] **Step 1: Change the config before the Kit bump** (_Step 2b_ item 1)

In `vite.config.ts`, remove the `typescript` option and its comment, and add
`version: { pollInterval: 0 }` after `paths`, with the comment from _Plan decisions_ (_D6_). Write
`tsconfig.json` as the block in _Step 2b_ item 2. Then `rm -rf .svelte-kit`. Kit 3's sync crashes on
the old callback ("Cannot read properties of undefined (reading 'push')", _U10_), so this comes
before any sync on Kit 3.

- [ ] **Step 2: Install Kit 3.1.1 and adapter-static 4.0.1**

Run: `npm ls --depth=0 --json > <R>/step-2b/deps-before.json; npm install --save-dev @sveltejs/kit@^3.1.1 @sveltejs/adapter-static@^4.0.1 && npm ls --depth=0 --json > <R>/step-2b/deps-after.json`,
then the direct-dependency check.
Expected: npm's `prepare` sync prints no error; exactly two changed pairs, `@sveltejs/kit` 2.70.4 →
3.1.1 and `@sveltejs/adapter-static` 3.0.10 → 4.0.1.

- [ ] **Step 3: See the type errors**

Run: `npm run check; echo "exit $?"`
Expected: `exit 1` with three errors: `src/hooks.client.ts:1`,
`Module '"@sveltejs/kit"' has no exported member 'ClientInit'`; `src/routes/+page.svelte:10:33` and
`src/routes/play/+page.svelte:27:33`, an argument `… is not assignable to parameter of type 'URL'`
(expected, lens 1 `s2b-check.log` and _I2_ of its report).

- [ ] **Step 4: Fix the types**

`src/hooks.client.ts:1`: `import type { ClientInit } from '@sveltejs/kit/hooks';`.
`src/lib/shareUrl.ts:131`: the parameter becomes `url: Pick<URL, 'hash' | 'search'>`.
Run: `npm run check`
Expected: `COMPLETED <n> FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`.

- [ ] **Step 5: Change the `goto` expectations, and see them fail**

In `src/routes/play/page.test.ts`, the five `{ replaceState: true }` (`:107`, `:150`, `:158`,
`:620`, `:641-643`) become `{ replace: true }`.
Run: `npx vitest run src/routes/play/page.test.ts --reporter=default`
Expected: 5 failed, each expecting `{ replace: true }` and receiving `{ replaceState: true }`.

- [ ] **Step 6: Change the call, and see them pass**

`src/routes/play/+page.svelte:63`: `{ replaceState: true }` becomes `{ replace: true }`.
Run: `npx vitest run src/routes/play/page.test.ts --reporter=default`
Expected: 0 failed.

- [ ] **Step 7: Delete the migration script**

Delete `scripts/migrate-lib-imports.ts`.
Run: `grep -rnF '$lib' src scripts; echo "exit $?"`
Expected: only `exit 1`. Kit 3 now rejects any `$lib` import itself (_M5_).

- [ ] **Step 8: Format**

Run: `npx prettier --write package.json vite.config.ts tsconfig.json src/hooks.client.ts src/lib/shareUrl.ts src/routes/play/+page.svelte src/routes/play/page.test.ts`

- [ ] **Step 9: Run the gate**

Run: `node <R>/gate.ts step-2b; echo "exit $?"`
Expected: `gate step-2b: 9 PASS, 0 FAILED, 0 UNVERIFIED` (after any size cause and `--evaluate`);
`npm-ls.txt` holds `$app@ extraneous` (_Plan decisions_); 51 files and 1001 tests; stage-check 8
PASS.

- [ ] **Step 10: Check S3**

Record each in `<R>/step-2b/S.md`:

- `npm ls @sveltejs/kit @sveltejs/adapter-static` shows 3.1.1 and 4.0.1.
- `diff tsconfig.json <(sed -n '262,271p' docs/superpowers/specs/2026-11-06-sveltekit-3-upgrade-design.md | sed 's/^   //'); echo "exit $?"`
  prints only `exit 0`.
- `grep -c 'typescript:' vite.config.ts` prints `0`; `grep -c 'pollInterval: 0' vite.config.ts`
  prints `1`.
- `test -e scripts/migrate-lib-imports.ts; echo "exit $?"` prints `exit 1`.
- `grep -rn 'replaceState: true' src; echo "exit $?"` prints only `exit 1`.
- `sed -n 1p src/hooks.client.ts` prints `import type { ClientInit } from '@sveltejs/kit/hooks';`.
- `grep -n 'export function decodeShareUrl' src/lib/shareUrl.ts` prints
  `131:export function decodeShareUrl(url: Pick<URL, 'hash' | 'search'>): {`.
- `npx svelte-kit sync > <R>/step-2b/sync.log 2>&1; echo "exit $?"; grep -c tsconfig_invalid <R>/step-2b/sync.log`
  prints `exit 0` and `0`. Control, which proves the check can fail: copy `tsconfig.json` to
  `<R>/step-2b/tsconfig.keep`, set its `types` to `["node"]`, run sync into `sync-control.log`, and
  the log holds `tsconfig_invalid` (`"types" was overwritten. It must include "$app/types"`, _U10_).
  Copy the file back and `cmp` it.

- [ ] **Step 11: Run the Review Focus checks 1 to 3**

Run: `node <R>/probe.ts act <R>/step-2b/r1.json --dist dist --only start,back,bounce,share,focus-ok,focus-down`
Expected: exit 0, and R1 passes as _The probes_ says for Kit 3: `start`, `back`, `bounce` and
`share` the same as `main`'s; each focus act has one load, keeps its pathname and hash, and records
at least one version request (expected two, one per event), each with `cache-control: no-cache`;
no error in any `done`. A difference in the first four: stop and report, with both reports.

- [ ] **Step 12: Commit**

Run: `git add -A && git diff --cached --name-status`
Expected: `M package-lock.json`, `M package.json`, `D scripts/migrate-lib-imports.ts`,
`M src/hooks.client.ts`, `M src/lib/shareUrl.ts`, `M src/routes/play/+page.svelte`,
`M src/routes/play/page.test.ts`, `M tsconfig.json`, `M vite.config.ts`.

```bash
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "build: upgrade to SvelteKit 3.1.1"
git log -1 --format=%B && git status --short && git worktree list
```

---

### Task 5: Step 3 — jsdom 31

**Files:**

- Modify: `package.json`, `package-lock.json`, `src/lib/scroller.test.ts:220`, `CONTRIBUTING.md:5`;
  more test files only under the test-fix rule (_Step 3_)

**Interfaces:**

- Consumes: _The gate_.
- Produces: nothing new. No product code changes (_D8_).

- [ ] **Step 1: Install jsdom 31**

Run: `node --version; npm ls --depth=0 --json > <R>/step-3/deps-before.json; npm install --save-dev jsdom@^31.0.0 && npm ls --depth=0 --json > <R>/step-3/deps-after.json`,
then the direct-dependency check.
Expected: `v24.17.0` (jsdom 31 needs `^24.15.0` on 24, _M8_); one changed pair, `jsdom` 24.1.3 →
31.0.0.

- [ ] **Step 2: See what jsdom 31 changes**

Run: `npx vitest run --reporter=default > <R>/step-3/first-run.log 2>&1; echo "exit $?"`
Expected: `exit 1` and one failure, at `src/lib/scroller.test.ts:220`:
`expected 'translate3d(0px, 0px, 0px)' to be 'translate3d(0, 0px, 0)'` (_U7_). Any other failure
follows the test-fix rule: change how the test waits, or the exact string for unchanged behavior,
never an assertion's strength and never a snapshot file. A failure that points at product behavior:
stop and report (_D8_).

- [ ] **Step 3: Update the string, and record it**

`:220` expects `'translate3d(0px, 0px, 0px)'`. Write `<R>/step-3/assertions.md`, one row per changed
assertion: file and line, old, new, reason. Here: "jsdom 31's new CSS serializer writes the zero
lengths with units; the transform is the same 3D translate (measured, spec U7)".

- [ ] **Step 4: Update the Node line**

`CONTRIBUTING.md:5` becomes the step 3 text from _Plan decisions_. `.nvmrc` stays `24`.

- [ ] **Step 5: Format and run the gate**

Run: `npx prettier --write package.json CONTRIBUTING.md src/lib/scroller.test.ts && node <R>/gate.ts step-3; echo "exit $?"`
Expected: `gate step-3: 9 PASS, 0 FAILED, 0 UNVERIFIED`, 51 files and 1001 tests.

- [ ] **Step 6: Check S4**

Record each in `<R>/step-3/S.md`:

- `npm ls jsdom` shows 31.0.0.
- `git diff --name-only HEAD` lists `CONTRIBUTING.md`, `package-lock.json`, `package.json` and
  `src/lib/scroller.test.ts`, and otherwise only `*.test.ts` files or `src/vitest.setup.ts` that
  have a row in `assertions.md`.
- `git status --porcelain -- src/lib/engines/__snapshots__` prints nothing.
- `git diff HEAD -- '*.test.ts' | grep -c '^-.*expect('` equals the number of rows in
  `assertions.md` (expected `1`).

- [ ] **Step 7: Commit**

Run: `git add -A && git diff --cached --name-status`
Expected: the four paths of Step 6, and any test file with a row in `assertions.md`.

```bash
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "test: move to jsdom 31"
git log -1 --format=%B && git status --short && git worktree list
```

---

### Task 6: Step 4 — the deploy workflow's action majors

**Files:**

- Modify: `.github/workflows/deploy.yml:21`, `:22`, `:30`, `:31`, `:43`;
  `docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md` (Q2's Status `:565-568`, F4's Status
  `:681`, the _Decision log_ after its last row)

**Interfaces:**

- Consumes: _The gate_.
- Produces: nothing for later tasks.

- [ ] **Step 1: Bump the five actions** (_Step 4_)

`actions/checkout@v4` → `@v7` (`:21`), `actions/setup-node@v4` → `@v7` (`:22`),
`actions/configure-pages@v5` → `@v6` (`:30`), `actions/upload-pages-artifact@v3` → `@v5` (`:31`),
`actions/deploy-pages@v4` → `@v5` (`:43`). `runs-on: ubuntu-latest` stays (_D9_), and so do
`node-version: 24` and every input.

- [ ] **Step 2: Close Q2 and F4 in the handoff**

- Q2's Status (`:565-568`) gains a last sentence: "Implemented on `build/sveltekit-3` by
  `docs/superpowers/specs/2026-11-06-sveltekit-3-upgrade-design.md`."
- F4's Status (`:681`) becomes: "☑ closed on `build/sveltekit-3` — <date>; the five majors per
  `docs/superpowers/specs/2026-11-06-sveltekit-3-upgrade-design.md` (step 4). Its Acceptance is that
  spec's H1, after the merge."
- Two _Decision log_ rows after the last one, `T9 build` (`<date>` is the commit's day,
  `YYYY-MM-DD`):

```text
| Q2 build | SvelteKit 3.1.1 with Vite 8, vite-plugin-svelte 7, TypeScript 6, Vitest 5 and jsdom 31, in five step commits on `build/sveltekit-3` (spec `2026-11-06-sveltekit-3-upgrade-design.md`) | toolchain, `src/` imports, `vite.config.ts` | SvelteKit 3 session | <date> |
| F4 | `actions/checkout` v7, `setup-node` v7, `configure-pages` v6, `upload-pages-artifact` v5, `deploy-pages` v5; `ubuntu-latest` kept; acceptance is the spec's H1, after the merge | `.github/workflows/deploy.yml` | SvelteKit 3 session | <date> |
```

- [ ] **Step 3: Format and run the gate**

Run: `npx prettier --write .github/workflows/deploy.yml docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md && node <R>/gate.ts step-4; echo "exit $?"`
Expected: `gate step-4: 9 PASS, 0 FAILED, 0 UNVERIFIED`.

- [ ] **Step 4: Check S5**

Record each in `<R>/step-4/S.md` (measured on 2026-11-06):

- `grep -oE 'actions/[a-z-]+@v[0-9]+' .github/workflows/deploy.yml` prints, in order,
  `actions/checkout@v7`, `actions/setup-node@v7`, `actions/configure-pages@v6`,
  `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`, and nothing else.
- For each `<name>/<tag>` of `checkout/v7`, `setup-node/v7`, `configure-pages/v6`,
  `upload-pages-artifact/v5` and `deploy-pages/v5`:
  `gh api repos/actions/<name>/git/ref/tags/<tag> --jq .ref` prints `refs/tags/<tag>`.
- `gh api "repos/actions/<name>/contents/action.yml?ref=<tag>" --jq .content | base64 -d | grep -E '^\s*using:'`
  prints `using: node24` or `using: 'node24'` for checkout, setup-node, configure-pages and
  deploy-pages.
- For upload-pages-artifact v5 the same read prints `using: composite`, and its `uses:` line names
  `actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0`; that ref's
  `action.yml` prints `using: 'node24'`.
- `grep -cE '^\| (Q2 build|F4) .*\| SvelteKit 3 session +\|' docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md`
  prints `2` (the _Summary_ table's own F4 row does not name the session).

A tag that does not resolve, or a runtime other than `node24`: FAILED; stop and report.

- [ ] **Step 5: Commit**

Run: `git add -A && git diff --cached --name-status`
Expected: `M .github/workflows/deploy.yml` and
`M docs/superpowers/handoffs/2026-11-04-ui-revamp-handoff.md`.

```bash
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "ci: move the deploy workflow to the current action majors"
git log -1 --format=%B && git status --short && git worktree list
```

---

### Task 7: The probes, the visual check and the unverified list, on the final commit

**Files:**

- Create in `<R>` (not committed): `probes/P1.md` to `P5.md`, `probes/R1.md`, `visual/V1.md`,
  `tiers.md`; the shots and logs under `probes/` and `visual/`; additions to `deviations.md` and
  `unverified.md`
- Tracked files: none. The two control builds edit a tracked file and restore it.

**Interfaces:**

- Consumes: _The probes_; `<R>/baseline/` (`dist/`, `v1/`, `v1-dark/`, `p1/`, `r1.json`).

- [ ] **Step 1: Start from the final commit**

Run: `git log --oneline 1d83452..HEAD; git status --short; npm run build`
Expected: the spec's three commits, this plan's and the five step commits, in order, and any other
commit only if the owner asked for it and `deviations.md` names it; no status output; the build ends
with check-css's line. `ls dist` prints `_app`, `index.html` and `play.html`.

- [ ] **Step 2: P2, the base path**

Run: `grep -ohE '(src|href)="[^"]*"' dist/index.html dist/play.html | sort -u > <R>/probes/P2-attrs.txt; wc -l < <R>/probes/P2-attrs.txt; grep -vE '^(src|href)="(\./|/scandible/)' <R>/probes/P2-attrs.txt; echo "exit $?"`
Expected: a count above 0, then only `exit 1`. PASS needs both, and Step 1's `ls`.

- [ ] **Step 3: P3, no poll interval** (_Owner questions_ 1)

Run: `grep -rnoP '(?<![0-9.])(3600000|36e5|3\.6e6)(?![0-9])' dist/_app/immutable; echo "exit $?"`
Expected: only `exit 1`. The control runs in Step 9.

- [ ] **Step 4: P1, share links made on `main`**

Run: `node <R>/probe.ts shoot p1 <R>/probes/P1 --serve preview --cwd /home/nn/Projects/scandible --port 4173 && node <R>/probe.ts diff <R>/baseline/p1 <R>/probes/P1 <R>/probes/P1.md`
Expected: `diff: 3 pairs, 3 identical, 0 differ, 0 unverified`.

- [ ] **Step 5: P5, the `%` fragment**

Run: `node <R>/probe.ts shoot p5 <R>/probes/P5 --serve static --dist dist && node <R>/probe.ts act <R>/probes/P5-act.json --dist dist --only percent`
Expected: both exit 0; the shot's non-white share is at least 0.005 (stage-check's floor), the act's
`done` says rendered with no error, and the controller reads the PNG and sees a rendered play page.
PASS needs all three.

- [ ] **Step 6: V1, and the dark-mode and R1 repeats**

Run each:

- `node <R>/probe.ts shoot v1 <R>/visual/final --serve static --dist dist`
- `node <R>/probe.ts shoot v1 <R>/visual/main --serve static --dist <R>/baseline/dist`
- `node <R>/probe.ts diff <R>/visual/main <R>/visual/final <R>/visual/V1.md`
- `node <R>/probe.ts diff <R>/baseline/v1 <R>/visual/main <R>/visual/control.md`
- `node <R>/probe.ts shoot v1-dark <R>/visual/final-dark --serve static --dist dist`, then
  `node <R>/probe.ts diff <R>/baseline/v1-dark <R>/visual/final-dark <R>/visual/dark.md`
- `node <R>/probe.ts act <R>/probes/R1.json --dist dist --only start,back,bounce,share,focus-ok,focus-down`

Expected: `diff: 36 pairs, 36 identical, 0 differ, 0 unverified` for V1 and for the control; 6
identical pairs for dark; R1 as in Task 4. V1 passes only with every pair identical. A differing
pair is FAILED until the owner rules on it, or UNVERIFIED when its control pair differs too (_Plan
decisions_). Each one goes in `V1.md` with both PNGs and its cause.

- [ ] **Step 7: P4, dev mode and jsbarcode**

Run: `node <R>/probe.ts shoot p4 <R>/probes/P4 --serve dev --cwd /home/nn/Projects/scandible --port 5199`
Expected: exit 0. The controller reads `p4-upc.png` and records whether the verdict `✓ valid` shows
for `036000291452`. It is PASS only when the verdict shows.

- [ ] **Step 8: The `npm install` repeat**

Run: `npm install && git diff --exit-code -- package.json package-lock.json; echo "exit $?"`
Expected: `exit 0`.

- [ ] **Step 9: P3's control build**

Remove the `version` option and its comment from `vite.config.ts`, then:
Run: `npm run build > <R>/probes/P3-control-build.log 2>&1; grep -rnoP '(?<![0-9.])(3600000|36e5|3\.6e6)(?![0-9])' dist/_app/immutable; echo "exit $?"`
Expected: at least one match (record its file and form) and `exit 0`. Then
`git checkout -- vite.config.ts`. No match: P3 is UNVERIFIED, because the check cannot be shown to
fail; record which form the control build uses.

- [ ] **Step 10: P5's information run, without the hook**

Move `src/hooks.client.ts` out of the tree (to `<R>/probes/hooks.client.ts.keep`), `npm run build`,
then `node <R>/probe.ts shoot p5 <R>/probes/P5-nohook --serve static --dist dist` and
`node <R>/probe.ts act <R>/probes/P5-nohook-act.json --dist dist --only percent`. Record in `P5.md`,
for information only (_U8_), whether Kit 3 throws (the act's errors) and the shot's non-white
share. Move the file back.
Run: `git status --short; npm run build`
Expected: no status output, and the build is the final commit's again.

- [ ] **Step 11: Write the record**

- `probes/P1.md` to `P5.md`, `probes/R1.md` and `visual/V1.md`: each row's method, evidence files,
  status (PASS, FAILED or UNVERIFIED) and the reason for any status that is not PASS.
- `git diff --exit-code 1d83452 -- README.md docs/guide.md` exits 0 (_Documentation_); record it in
  `P2.md`'s notes.
- `unverified.md`: every row of every step, probe and visual check that is not PASS, one per line,
  `<where> <row>: <status> — <reason> (<evidence file>)`, and these lines, open by design:
  - H1, after the merge: the first deploy run on `main` concludes `success`, and
    `gh run view <id>` lists no annotation containing `Node.js 20`; a re-run of an older commit does
    not count. (`gh run list --workflow deploy.yml --branch main --limit 1` finds the run.)
  - H2, after the merge: a person opens the site on Android Chrome and on a desktop browser, sets up
    one deck and plays it.
- `deviations.md`: the fallback if it was used, the renames, the size causes and the changed
  assertions, each with its evidence file.
- `tiers.md`, filled by the controller: the model tier of each phase (each task's implementer and
  reviewer, the final review) and the number of Fable agents that ran (_D11_).

- [ ] **Step 12: Finish clean, and report**

Run: `git worktree list; git status --short`
Expected: the main checkout only, and no status output. The report lists every row in
`unverified.md` by name and never reports one of them as passed.

## Out of this plan

- Everything in the spec's _Out of scope_: TypeScript 7, new SvelteKit 3 features, a `<dialog>`
  Share panel, the 585 kB bwip-js chunk, packages not in _D1_, an `engines.node` field, a PR
  workflow.
- Pushing, the PR and its text, and the merge: the owner's.
- H1 and H2, after the merge.

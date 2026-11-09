# Pull request checks as a gate for `main` — Design

**Date:** 2026-11-08
**Status:** Draft, for the owner's review. Design agreed in conversation on 2026-11-08, question by
question and then section by section.

Today nothing runs on a pull request, and anyone with push access can push straight to `main`. The
checks run only after a push to `main`, as the first job of the deploy (_M1_, _M2_). This spec
moves the same checks in front of `main`. Facts measured for this spec are in _Measurements_, cited
as _M1_ to _M9_. Claims about GitHub that the author has not yet confirmed are in _Unverified_,
cited as _U1_ to _U11_; each names the row that settles it.

## Intent

**Outcome.** A change reaches `main` only through a pull request whose checks passed on the code
that will land. A broken change is caught on its pull request, not by a failed deploy.

**Who it is for.** The owner and the agents who work on the code. The site's users see no change.

**Success.** All of these:

- Every pull request runs `CI / checks` (lint, tests, build), and a red one cannot be merged
  without the owner's bypass (_P1_, _P5_).
- A direct push to `main` is rejected, the owner's included (_P4_).
- The deploy after the merge still succeeds (_P2_).
- The live ruleset matches the committed file (_P3_).

**Why now.** `main` failed CI on four pushes in a row before anyone fixed it (_M6_). The first of
them was a docs commit pushed straight to `main`; its test failed because the runner was slow, not
because of the change. Under this gate that commit would have needed a pull request, and the
failure would have shown there.

**What the owner said:** every change goes through a pull request, with a bypass for emergencies
(question 1, option C); the gate requires the deploy's three checks and nothing more (question 2,
option A); the bypass works only through a pull request (question 3, option A); squash merges only,
and the branch must be up to date with `main` (question 4, option A); the ruleset lives in a
committed JSON file applied with documented commands (question 5, option B); one workflow serves
both events (approach 1); sections 1 to 4 of the design approved.

**What the author assumed, and the owner did not correct:** the owner merges their own pull
requests, so no approving review is required; the checks are the ones the deploy already runs.

## Decisions

1. **Every change goes through a pull request.** No direct push to `main`, for anyone. This
   includes docs, specs, plans and handoffs, which until now were sometimes pushed straight to
   `main` (_M6_).

2. **The gate requires one check, `checks`.** It runs `npm ci`, `npm run lint` (Prettier and
   ESLint), `npm test` (svelte-check and Vitest) and `npm run build` (which runs
   `scripts/check-css.ts` afterwards): the deploy's checks today, unchanged (_M1_). A green pull
   request therefore means a green deploy. Not added: `npm run stage-check`, which fails on every
   intended change to the play stage and would need an override; a check of the pull request's
   title.

3. **The owner can bypass, through a pull request only.** The ruleset's one bypass actor is the
   repository admin role with `bypass_mode: pull_request`. In an emergency the owner opens a pull
   request and merges it with its checks red or still running. Direct pushes stay blocked for the
   owner too, so every commit on `main` comes from a pull request (_U1_, _U3_).

4. **Squash merges only, from a branch that is up to date with `main`.** Every pull request so far
   was squash-merged (_M2_). The required check is strict: GitHub refuses the merge until the branch
   contains `main`'s latest commit. The owner clicks "Update branch" and the check runs again, about
   two minutes (_M5_). With a squash merge from an up-to-date branch, the tree that lands on `main`
   is the tree the check ran on. Merge commits and rebase merges are turned off in the repository
   settings as well as in the ruleset (_U2_).

5. **No approving review is required.** GitHub does not let the author approve their own pull
   request, so a required review would leave the bypass as the only way to merge.

6. **Two more rules come with the gate:** `main` cannot be deleted (`deletion`) or force-pushed
   (`non_fast_forward`).

7. **The ruleset is a committed file.** `.github/rulesets/main.json` holds it. The owner applies it
   with two documented commands that read the same in bash and fish (_Applying the gate_). A change
   to the gate is a reviewed change to that file. There is no script.

8. **One workflow serves both events.** `.github/workflows/deploy.yml` is renamed to
   `.github/workflows/ci.yml` with `git mv`, named `CI`, and gains a `pull_request` trigger. Its job
   `checks` runs on every pull request and on every push to `main`; the Pages upload and the deploy
   job run only on `main`. Renaming starts a new run history in the Actions tab; the old runs stay
   under the old name.

9. **The required check is pinned to GitHub Actions.** The ruleset names the check with
   `integration_id` 15368, GitHub Actions' app ID (_M3_), so no other app or token can post a
   passing status named `checks`.

10. **No path filters.** A required check that a path filter skips never reports, and the pull
    request waits forever. Every pull request runs the whole job.

11. **A guard test keeps the workflow and the ruleset in step.** `src/ci.test.ts` fails when the
    required check names no job, when that job can be skipped, when the `pull_request` trigger is
    missing or filtered, or when the check is not pinned (_Testing_).

12. **The gate goes on after the workflow is on `main`.** The ruleset requires a check that exists
    only once `ci.yml` is merged. So the order is: merge the pull request, see the deploy succeed,
    then apply the ruleset (_Rollout_).

13. **One branch, one pull request.** Branch `ci/main-gate`, cut from `main` at `44f64dc`. The spec,
    the plan and the implementation commits go on it. The owner squash-merges. No AI attribution in
    any commit or in the pull request.

14. **Review tiers.** Two lenses review this spec before the owner approves it: one Opus agent
    checks every GitHub claim against GitHub's documentation (_U1_ to _U11_); one Sonnet agent
    checks coherence and readiness for a plan. No Fable agent runs; nothing here is a judgement gate
    that needs one.

## What changes for contributors

- A change to `main` needs a pull request, docs included. Agents that used to commit a handoff on
  `main` open a pull request for it instead.
- The pull request shows `CI / checks`. It must pass, and the branch must be up to date with `main`,
  before the merge button works.
- The merge button offers squash only.
- The deploy is unchanged: every push to `main` (each merged pull request) runs the checks again and
  publishes `dist/` to GitHub Pages.

## The workflow

`.github/workflows/ci.yml`, in full:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions: {}

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  checks:
    name: checks
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
        uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    needs: checks
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/configure-pages@v6
      - id: deployment
        uses: actions/deploy-pages@v5
```

What changes from `deploy.yml` (_M1_), and why:

- **Triggers.** `pull_request` is added. A pull request run checks out `refs/pull/<n>/merge`: the
  pull request merged into the current `main` (_U8_).
- **Permissions per job.** The workflow grants nothing. `checks` gets `contents: read` only, which
  is all a pull request run needs. `deploy` keeps the three permissions the whole workflow has today,
  so the deploy runs with exactly what it has now.
- **`configure-pages` moves into the deploy job.** It needs Pages access, and `checks` no longer has
  any. Nothing reads its outputs today: SvelteKit's base path is set in `vite.config.ts` (_U5_).
- **The Pages upload stays in `checks`**, on `main` only. It uploads with the runner's own token and
  needs no `GITHUB_TOKEN` permission (_U6_).
- **Concurrency.** Today the whole workflow is in the `pages` group, which never cancels, so pull
  request runs would queue behind deploys. Now the workflow's group is per ref, and a newer push to a
  pull request cancels its running check (_U9_). The deploy job keeps the `pages` group (_U10_).
- **Timeout.** `checks` stops after 15 minutes. The default is 6 hours, and a hung run would block
  its pull request that long. The slowest run so far took 7.4 minutes, deploy included (_M5_).
- **Unchanged:** the actions and their majors, Node 24 with the npm cache, the commands, the `dist`
  upload path and the `github-pages` environment, whose branch policy already limits deploys
  (_M4_).

## The ruleset

`.github/rulesets/main.json`, in full (Prettier formats it with tabs, as it does every JSON file
here):

```json
{
	"name": "main",
	"target": "branch",
	"enforcement": "active",
	"conditions": {
		"ref_name": {
			"include": ["refs/heads/main"],
			"exclude": []
		}
	},
	"bypass_actors": [
		{
			"actor_id": 5,
			"actor_type": "RepositoryRole",
			"bypass_mode": "pull_request"
		}
	],
	"rules": [
		{ "type": "deletion" },
		{ "type": "non_fast_forward" },
		{
			"type": "pull_request",
			"parameters": {
				"required_approving_review_count": 0,
				"dismiss_stale_reviews_on_push": false,
				"require_code_owner_review": false,
				"require_last_push_approval": false,
				"required_review_thread_resolution": false,
				"allowed_merge_methods": ["squash"]
			}
		},
		{
			"type": "required_status_checks",
			"parameters": {
				"strict_required_status_checks_policy": true,
				"do_not_enforce_on_create": false,
				"required_status_checks": [{ "context": "checks", "integration_id": 15368 }]
			}
		}
	]
}
```

- `actor_id` 5 with `actor_type` `RepositoryRole` is the repository admin role, which the owner has
  (_U3_).
- `bypass_mode: pull_request` lets the admin merge a pull request without the rules met, and blocks
  the admin's direct pushes (_U1_).
- `pull_request` with no required review is what blocks a direct push. `allowed_merge_methods`
  limits merges to squash (_U2_).
- `strict_required_status_checks_policy: true` is the up-to-date rule (_U11_).

### Applying the gate

CONTRIBUTING.md gets these under "Maintainers: the `main` gate". None uses command substitution or
a glob, so each reads the same in bash and fish.

First time, after the workflow is on `main`:

```
gh api --method POST repos/nzneit/scandible/rulesets --input .github/rulesets/main.json
gh repo edit --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false
```

To change the gate later: change the file in a pull request; after the merge, read the ruleset's ID
with `gh api repos/nzneit/scandible/rulesets`, then run
`gh api --method PUT repos/nzneit/scandible/rulesets/<id> --input .github/rulesets/main.json` with
the ID typed in.

## Testing

`src/ci.test.ts`, next to `src/colors.test.ts`, written test first. It reads
`.github/workflows/ci.yml` and `.github/rulesets/main.json`.

No YAML library is installed (_M7_), and none is added. The test reads the workflow line by line,
relying on the two-space layout that Prettier keeps: keys under `on:` and job IDs under `jobs:` at
two spaces, a job's own keys at four. A step's `if:` sits under `steps:` deeper than four spaces and
is not a job's `if:`.

The test fails when:

1. a required check's `context` in the ruleset matches no job's `name:` in the workflow (a job with
   no `name:` reports under its ID);
2. the job that a required check names has a job-level `if:`: GitHub reports a job skipped by its
   condition as a success, so a skippable required check would let a pull request through unchecked
   (_U4_);
3. the workflow has no `pull_request` trigger, or has `paths:` or `paths-ignore:` anywhere;
4. a required check has no `integration_id`, or one other than 15368.

Each rule also runs against a small inline workflow that breaks it, so the test proves it can fail:
a renamed job, a job-level `if:`, a missing trigger, a `paths:` filter and an unpinned check. A
step-level `if:` on the required job must not trip rule 2.

The test checks the files only. The live settings are checked by _P3_.

## Documentation

CONTRIBUTING.md:

- "Deployment" becomes "Pull requests and deployment". It says: every change to `main`, docs
  included, goes through a pull request; `CI / checks` runs `npm ci`, lint, `npm test` and the
  build, the same commands as locally; the branch must be up to date with `main` ("Update branch");
  merges are squash only.
- **Bypass**, for emergencies only: tick "Merge without waiting for requirements to be met", or run
  `gh pr merge <number> --squash --admin`, and say in the pull request why.
- **Renaming the `checks` job** means changing the ruleset file in the same pull request. That pull
  request needs the bypass, because the old check name never reports; run the PUT command right
  after the merge.
- The deployment paragraph stays, pointing at `.github/workflows/ci.yml`.
- A "Maintainers: the `main` gate" subsection holds the commands in _Applying the gate_.

Older specs and plans that name `deploy.yml` are records and stay as written. The comment in
`vite.config.ts` that names "the GitHub Pages workflow's upload path" stays true.

## Rollout

1. The branch carries the spec, the plan and the implementation. The local gates pass (_A1_ to
   _A6_).
2. The owner pushes, or approves the push, and the pull request opens. Its own run is _P1_.
3. The owner squash-merges. The ruleset is not on yet, so nothing blocks the merge.
4. The push run on `main` is _P2_. If it fails, the ruleset stays off until a fix lands, and the fix
   goes through a pull request as usual.
5. The author asks before applying the gate, or the owner runs the two commands. Then _P3_.
6. _P4_ and _P5_ run, each after the owner's go-ahead. _H1_ is the owner's.

## Verification that fails closed

The evidence goes in a git-ignored run record, `.superpowers/records/2026-11-08-main-gate/`: one
file per row with the command and its output, and `unverified.md`. A row whose checker did not run,
died or returned nothing is unverified, never a pass. The final report lists the unverified rows.

**Local, on the branch's last commit:**

- **A1** The guard test fails before `ci.yml` and `main.json` exist in their new form, and passes
  after. The red run's output is kept.
- **A2** `npm run lint` exits 0 (Prettier covers the YAML and the JSON).
- **A3** `npm test -- --reporter=default` exits 0. The count is `main`'s plus the new file's tests;
  no test is lost.
- **A4** `npm run build` exits 0, check-css included.
- **A5** `git diff --stat main...HEAD` names only: the spec, the plan, `.github/workflows/ci.yml`
  (renamed from `deploy.yml`), `.github/rulesets/main.json`, `src/ci.test.ts` and
  `CONTRIBUTING.md`.
- **A6** Every commit on the branch has the repository's author and no AI attribution line.

**On GitHub:**

- **P1** The pull request's own run: `CI / checks` passes; `deploy` is skipped; the run uploads no
  Pages artifact; the check's name in `gh pr checks` is `checks` (_U7_, _U8_, _U9_).
- **P2** The push run after the merge: `checks` and `deploy` pass; the site answers 200; the run
  shows no new annotation (_U5_, _U6_, _U10_).
- **P3** Read-back after applying: every field in `main.json` equals the live ruleset's
  (`gh api repos/nzneit/scandible/rulesets/<id>`); `gh api repos/nzneit/scandible/rules/branches/main`
  lists `deletion`, `non_fast_forward`, `pull_request` and `required_status_checks`;
  `gh repo view --json mergeCommitAllowed,rebaseMergeAllowed,squashMergeAllowed` gives `false`,
  `false`, `true` (_U2_, _U3_, _U11_).
- **P4** A direct push is rejected. On a detached checkout of `origin/main`, an empty commit pushed
  with `git push origin HEAD:main` must be refused with a rule violation. Risk: if it is not
  refused, the empty commit stays on `main` for good; it changes no file. The owner says go first
  (_U1_).
- **P5** A red pull request is blocked. A throwaway draft pull request with one Prettier violation:
  `checks` fails, `gh pr view --json mergeStateStatus` gives `BLOCKED`, and `gh pr merge --squash`
  without `--admin` refuses. Then the pull request is closed and its branch deleted. The owner says
  go first.
- **H1** (owner) On the _P5_ pull request, before it is closed, the merge box offers the owner the
  bypass. Look; do not tick it (_U1_, _U3_).

**Not probed live:** the up-to-date rule and squash only rest on _P3_'s read-back. Probing them
would mean landing something on `main`.

## Unverified

Each item names the row that settles it. The spec review's Opus lens checks each against GitHub's
documentation first.

- **U1** `bypass_mode: pull_request` lets the bypass actor merge a pull request with the rules
  unmet, and does not let it push to `main` directly. → _P4_, _H1_
- **U2** The `pull_request` rule accepts `allowed_merge_methods: ["squash"]`. → _P3_
- **U3** `actor_id` 5 with `actor_type` `RepositoryRole` is the admin role. → _P3_, _H1_
- **U4** A job skipped by its job-level `if:` reports success to a required status check. → the
  documentation only; rule 2 of the guard test is the defence either way.
- **U5** `actions/configure-pages` works in the deploy job without a checkout. → _P2_
- **U6** `actions/upload-pages-artifact` needs no `GITHUB_TOKEN` permission beyond
  `contents: read`. → _P2_
- **U7** A job with `name: checks` reports the status context `checks`. → _P1_
- **U8** A `pull_request` run checks out `refs/pull/<n>/merge`. → _P1_
- **U9** `cancel-in-progress` takes an expression. → _P1_ (the workflow runs at all)
- **U10** A job-level `concurrency` group inside a workflow-level one behaves as described. → _P2_
- **U11** `strict_required_status_checks_policy: true` is the "require branches to be up to date"
  setting. → _P3_ (read-back only)

## Notes for the plan

- **Commits**, after the spec and plan commits:
  1. `ci: run the checks on every pull request and add the ruleset for main`: the guard test first
     (red), then the `git mv` and the workflow edits, then `main.json` (green).
  2. `docs: describe the pull request gate in CONTRIBUTING`.
- **Pull request title:** `ci: run the checks on every pull request and gate main on them`.
- **Vitest under an agent** prints the `minimal` reporter; pass `--reporter=default` for evidence
  (A3).
- **Commit with the repository's author** through per-commit `-c user.name=… -c user.email=…`
  flags; no global git config change.
- **Outward actions wait for the owner:** the push, the pull request, applying the ruleset, _P4_
  and _P5_.

## Out of scope

- `npm run stage-check` in CI, and a pull request title check (_Decision_ 2).
- Required reviews, CODEOWNERS and a merge queue.
- A script that applies or compares the ruleset (question 5, option A).
- Dependabot, actionlint, and deleting branches on merge.
- Deleting the merged branch `build/sveltekit-3`.

## Measurements

Taken on 2026-11-08 from `main` at `44f64dc` and the GitHub API.

- **M1** `.github/workflows/deploy.yml` triggers on a push to `main` and on `workflow_dispatch`.
  Workflow-level permissions: `contents: read`, `pages: write`, `id-token: write`. Workflow-level
  concurrency: group `pages`, `cancel-in-progress: false`. Job `build`: checkout v7, setup-node v7
  (Node 24, npm cache), `npm ci`, `npm run lint`, `npm test`, `npm run build`, configure-pages v6,
  upload-pages-artifact v5 (`dist`). Job `deploy`: deploy-pages v5 in environment `github-pages`.
- **M2** `gh api repos/nzneit/scandible/branches/main/protection` answers 404 "Branch not
  protected"; `gh api repos/nzneit/scandible/rulesets` answers `[]`. The repository is public and
  owned by the personal account `nzneit`. Merge commits, squash and rebase are all allowed;
  `deleteBranchOnMerge` is false. Pull requests #10 to #14 were squash-merged.
- **M3** `gh api /apps/github-actions` gives `id` 15368, slug `github-actions`.
- **M4** The `github-pages` environment has `custom_branch_policies: true` and one `branch_policy`
  protection rule. Pages `build_type` is `workflow`.
- **M5** The last 15 workflow runs took 76 to 444 seconds; the slowest, 41880359859, took 444 s
  (7.4 minutes). The last five took 131 to 172 s.
- **M6** Runs 41684051201, 41764598757, 41783851426 and 41790542802 failed on `main` in a row. The
  first ran on "docs: add the GS1 series handoff", a commit pushed straight to `main`. PR #6
  (`test: give the bwip-js engine tests a 20 s timeout`) turned it green (run 41792814890): the
  failing test had timed out on a slower runner.
- **M7** `node_modules/yaml` does not exist; no YAML parser is a dependency.
- **M8** No pull request was open on 2026-11-08.
- **M9** The `CONTRIBUTING.md` section "Deployment" (lines 121 to 127) names
  `.github/workflows/deploy.yml`; no other contributor document names the workflow file.

# Pull request checks as a gate for `main` — Design

**Date:** 2026-11-08
**Status:** Draft, for the owner's review. Design agreed in conversation on 2026-11-08, question by
question and then section by section. Reviewed on 2026-11-08 by two lenses (GitHub facts against
GitHub's documentation and the actions' source, on Opus; coherence and plan readiness, on Sonnet)
and revised by the author. _Review_ lists what changed and what was not taken. _Decision_ 15 waits
for the owner.

Today nothing runs on a pull request, and anyone with push access can push straight to `main`. The
checks run only after a push to `main`, as the first job of the deploy (_M1_, _M2_). This spec
moves the same checks in front of `main`. Facts measured for this spec are in _Measurements_, cited
as _M1_ to _M11_. Claims about GitHub are in _Settled in review_ (_G1_ to _G11_) when a lens
confirmed them, and in _Unverified_ when no source settles them; each unverified item names the row
that does.

## Intent

**Outcome.** A change reaches `main` only through a pull request whose checks passed on the code
that will land. A broken change is caught on its pull request, not by a failed deploy.

**Who it is for.** The owner and the agents who work on the code. The site's users see no change.

**Success.** All of these:

- Every pull request runs the required check `checks` (lint, tests, build) (_P1_).
- A pull request whose check failed or has not finished cannot be merged from the merge box unless
  the owner ticks the bypass, and cannot be merged at all by anyone without the bypass (_P5_, _H1_).
- A direct push to `main` is rejected, the owner's included (_P4_).
- The deploy after the merge still succeeds (_P2_).
- The live ruleset matches the committed file (_P3_).

**Why now.** `main` failed CI on four pushes in a row before anyone fixed it (_M6_). The first of
them was a docs commit pushed straight to `main`; its test failed because the runner was slow, not
because of the change. Under this gate that commit would have needed a pull request, and the
failure would have shown there.

**What the owner said:** every change goes through a pull request, with a bypass for emergencies
(question 1, option C); the gate requires the deploy's checks (lint, tests, build) and nothing more,
as one required check (question 2, option A); the bypass works only through a pull request
(question 3, option A); squash merges only, and the branch must be up to date with `main`
(question 4, option A); the ruleset lives in a committed JSON file applied with documented commands
(question 5, option B); one workflow serves both events (approach 1); sections 1 to 4 of the design
approved.

**What the author assumed, and the owner did not correct:** the owner merges their own pull
requests, so no approving review is required; the checks are the ones the deploy already runs.

## Decisions

1. **Every change goes through a pull request.** No direct push to `main`, for anyone. This
   includes docs, specs, plans and handoffs, which until now were sometimes pushed straight to
   `main` (_M6_).

2. **The gate requires one check, `checks`.** It is one job that runs `npm ci`, `npm run lint`
   (Prettier and ESLint), `npm test` (svelte-check and Vitest) and `npm run build` (which runs
   `scripts/check-css.ts` afterwards): the deploy's checks today, unchanged (_M1_). A green pull
   request therefore means a green deploy. Not added: `npm run stage-check`, which fails on every
   intended change to the play stage and would need an override; a check of the pull request's
   title.

3. **The owner can bypass, through a pull request only.** The ruleset's one bypass actor is the
   repository admin role with `bypass_mode: pull_request` (_G1_, _U3_). In an emergency the owner
   opens a pull request and merges it with its check red or still running, by ticking the bypass in
   the merge box. Direct pushes stay blocked for the owner too, so every commit on `main` comes from
   a pull request. `exempt`, the third mode, would let the owner push silently and is not used.

4. **Squash merges only, from a branch that is up to date with `main`.** The last five pull
   requests (#10 to #14) were squash-merged (_M2_). The required check is strict (_G11_): GitHub
   refuses the merge until the branch contains `main`'s latest commit. The owner clicks "Update
   branch" (_M10_) and the check runs again, about two minutes (_M5_). With a squash merge from an
   up-to-date branch, the tree that lands on `main` is the tree the check ran on. Merge commits and
   rebase merges are turned off in the repository settings as well as in the ruleset (_G2_). The
   repository setting also holds when the owner bypasses the ruleset.

5. **No approving review is required.** GitHub does not let the author approve their own pull
   request, so a required review would leave the bypass as the only way to merge.

6. **Two more rules come with the gate:** `main` cannot be deleted (`deletion`) or force-pushed
   (`non_fast_forward`). A bypass through a pull request cannot do either.

7. **The ruleset is a committed file.** `.github/rulesets/main.json` holds it. The owner applies it
   with two documented commands that read the same in bash and fish (_Applying the gate_). A change
   to the gate is a reviewed change to that file. There is no script.

8. **One workflow serves both events.** `.github/workflows/deploy.yml` is renamed to
   `.github/workflows/ci.yml` with `git mv`, named `CI`, and gains a `pull_request` trigger. Its job
   `build` becomes `checks`, with `name: checks`. It runs on every pull request and on every push to
   `main`; the Pages upload and the deploy job run only on `main`. Renaming starts a new run history
   in the Actions tab; the old runs stay under the old name.

9. **The required check is pinned to GitHub Actions.** The ruleset names the check with
   `integration_id` 15368, GitHub Actions' app ID (_M3_, _G7_). That shuts out other apps, personal
   tokens and commit statuses. It does not shut out another job named `checks` in this repository,
   because every workflow job reports as that app: the guard test fails on a second one (_Testing_,
   rule 2). Nor does it shut out a pull request that edits `ci.yml` itself, because a pull request
   run uses the pull request's own workflow file; reviewing the pull request is the defence there.

10. **No path filters.** A required check that a path filter skips never reports, and the pull
    request waits forever (_G4_). Every pull request runs the whole job.

11. **A guard test keeps the workflows and the ruleset in step.** `src/ci.test.ts` fails when the
    ruleset requires no check, when a required check is reported by no job or by more than one, when
    that job can be skipped, when its workflow's `pull_request` trigger is missing or filtered, or
    when the check is not pinned (_Testing_).

12. **The gate goes on after the workflow is on `main`.** The ruleset requires a check that exists
    only once `ci.yml` is merged, and GitHub expects a required check to have passed in the
    repository within the last seven days. So the order is: merge the pull request, see the deploy
    succeed, then apply the ruleset within seven days (_Rollout_).

13. **One branch, one pull request.** Branch `ci/main-gate`, cut from `main` at `44f64dc`. The spec,
    the plan and the implementation commits go on it. The owner squash-merges. No AI attribution in
    any commit or in the pull request.

14. **Review tiers.** Two lenses reviewed this spec: GitHub facts on Opus, coherence and plan
    readiness on Sonnet. No Fable agent ran; nothing here is a judgement gate that needs one.

15. **Merging with `gh` waits for the required check.** _Pending the owner._ A merge with the
    owner's login outside the merge box, such as `gh pr merge` or the REST merge endpoint, may
    bypass the rules without asking, because the owner is a bypass actor (_U12_). `gh` itself
    refuses a pull request that GitHub reports as blocked, but not one whose state GitHub has not
    computed yet, as happens just after a push or an "Update branch". So CONTRIBUTING says: before
    `gh pr merge`, run `gh pr checks <number> --required --watch` and go on only if every required
    check passed; then merge with `gh pr merge <number> --squash --match-head-commit <sha>`, so the
    merge fails if the branch moved. Agents merge only when the owner asks. The alternative is no
    bypass actor at all; an emergency then means switching the ruleset's enforcement off and on
    again with `gh api`.

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
  pull request merged into the current `main` (_G8_). A pull request with a merge conflict runs no
  workflow, so its check stays pending until the conflict is resolved.
- **The job `build` becomes `checks`**, with `name: checks`, the name the ruleset requires (_G7_).
  `deploy` now needs `checks`.
- **Permissions per job.** The workflow grants nothing. `checks` gets `contents: read` only, which
  is all a pull request run needs. `deploy` keeps the three permissions the whole workflow has today,
  which are also the ones in GitHub's Pages example (_G5_).
- **`configure-pages` moves into the deploy job.** It needs Pages access, which `checks` no longer
  has, and no checkout. Nothing reads its outputs: SvelteKit's base path is set in `vite.config.ts`
  (_G5_).
- **The Pages upload stays in `checks`**, on `main` only. It takes no token (_G6_).
- **Concurrency.** Today the whole workflow is in the `pages` group. A newer pending run there
  cancels an older pending one, so a pull request run would have cancelled a pending deploy. Now the
  workflow's group is per ref (_G9_). For a pull request, a newer push cancels the running check.
  For `main`, runs go one at a time, never cancel a running one, and a newer pending run replaces an
  older pending one, so the latest commit deploys. The deploy job runs only on `main`, inside that
  group, so it needs no group of its own, and the old `pages` group is dropped.
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
  (_U3_; GitHub's own docs repository uses the same value).
- `bypass_mode: pull_request` lets the admin merge a pull request with the rules unmet, and rejects
  the admin's direct pushes (_G1_).
- Both remaining rules block a direct push: `required_status_checks` refuses a commit whose check has
  not passed on another ref first, and `pull_request` refuses even a commit that has. The five
  `pull_request` parameters are the ones the REST schema requires; `allowed_merge_methods` limits
  merges to squash (_G2_).
- `strict_required_status_checks_policy: true` is the "require branches to be up to date" setting
  (_G11_).

### Applying the gate

CONTRIBUTING.md gets these under "Maintainers: the `main` gate". Both name the repository, so they
work from any directory. Neither uses command substitution or a glob, so each reads the same in bash
and fish.

First time, after the workflow is on `main` and within seven days of its first green run there:

```
gh api --method POST repos/nzneit/scandible/rulesets --input .github/rulesets/main.json
gh repo edit nzneit/scandible --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false
```

To change the gate later: change the file in a pull request; after the merge, read the ruleset's ID
with `gh api repos/nzneit/scandible/rulesets`, then run
`gh api --method PUT repos/nzneit/scandible/rulesets/<id> --input .github/rulesets/main.json` with
the ID typed in.

## Testing

`src/ci.test.ts`, next to `src/colors.test.ts`, written test first. Vitest collects it with the
current configuration. It copies the three-line `here()` helper from `colors.test.ts`, with its
comment about Vite rewriting `new URL('literal', import.meta.url)`, rather than importing from
another test file.

**The checker.** The test file defines one pure function,
`problems(workflows: Record<string, string>, ruleset: unknown): string[]`. `workflows` maps each
file name in `.github/workflows/` to its text. It returns one message per problem, and `[]` when
there is none. The exact messages are fixed in the plan.

**The reader.** No YAML library is installed (_M7_), and none is added. The checker reads each
workflow line by line, in the block form Prettier keeps: `on:` and `jobs:` at column 0, trigger
names and job IDs at two spaces, a job's own keys at four. A step's `if:` sits deeper, under
`steps:`, and is not a job's `if:`. A job reports under its `name:`, or under its ID when it has no
`name:`. Any other form, such as `on: [push, pull_request]` or `on: pull_request`, is reported as a
problem, never passed.

**The rules.** `problems` reports:

1. a ruleset without exactly one `required_status_checks` rule, or with an empty list of checks;
2. a required check's `context` that no job reports, or that more than one job reports across all
   the workflow files;
3. a job-level `if:` on the job that reports a required check: GitHub reports a job skipped by its
   condition as a success, so a skippable required check would let a pull request through unchecked
   (_G4_);
4. a workflow holding that job whose `on:` has no `pull_request:` key, or whose `pull_request:` has
   a value or nested keys (`branches`, `types`, `paths` and the rest);
5. a required check with no `integration_id`, or one other than 15368.

**The tests.**

- A known-good inline workflow and ruleset give `[]`.
- One copy per failure, each changed in one place, gives exactly its one message
  (`toEqual([message])`), so a copy cannot pass by failing for another reason: no
  `required_status_checks` rule; an empty list of checks; the job renamed; a second workflow with a
  job ID `checks`; a second workflow with a job `name: checks`; a job-level `if:`; no `pull_request`
  trigger; `on:` in flow form; `paths:` under `pull_request:`; `types:` under `pull_request:`; no
  `integration_id`; `integration_id` 1.
- Copies that must still give `[]`: the required job with no `name:` and the ID `checks`; a
  step-level `if:` on the required job; `push:` with a `branches:` filter.
- The real files: inside the test, not at module scope, read every file in `.github/workflows/` and
  `.github/rulesets/main.json`, and expect `[]`. A missing file then fails this test with its name,
  and the inline tests still run.

The test checks the files only. The live settings are checked by _P3_.

## Documentation

CONTRIBUTING.md:

- "Deployment" becomes "Pull requests and deployment". It says: every change to `main`, docs
  included, goes through a pull request; `CI / checks` runs `npm ci`, lint, `npm test` and the
  build, the same commands as locally; the branch must be up to date with `main` ("Update branch");
  merges are squash only; a pull request with a merge conflict runs no check until the conflict is
  resolved.
- **Merging with `gh`** (_Decision_ 15): run `gh pr checks <number> --required --watch` first and go
  on only if every required check passed. Then merge with
  `gh pr merge <number> --squash --match-head-commit <sha>`.
- **Bypass**, for emergencies only: tick the bypass option in the merge box, and say in the pull
  request why. The option's label is the one _H1_ records.
- **Renaming the `checks` job** means changing the ruleset file in the same pull request. That pull
  request needs the bypass, because the old check name never reports; run the PUT command right
  after the merge.
- The deployment paragraph stays, reworded: the push to `main` that a merge makes runs the checks
  again and deploys, from `.github/workflows/ci.yml`.
- A `###` subsection under it, "Maintainers: the `main` gate", holds the commands in _Applying the
  gate_. It is the file's first `###` heading.

Older specs and plans that name `deploy.yml` are records and stay as written. The comment in
`vite.config.ts` that names "the GitHub Pages workflow's upload path" stays true.

## Rollout

1. The branch carries the spec, the plan and the implementation. The local gates pass (_A1_ to
   _A6_).
2. The owner pushes, or approves the push, and the pull request opens. Its own run is _P1_.
3. The owner squash-merges. The ruleset is not on yet, so nothing blocks the merge.
4. The push run on `main` is _P2_. If it fails, the ruleset stays off until a fix lands, and the fix
   goes through a pull request as usual.
5. Within seven days of _P2_, the owner runs the two commands in _Applying the gate_, or tells the
   author to. Then _P3_.
6. _P4_ and _P5_ run, each after the owner's go-ahead. _H1_ is the owner's, during _P5_.

## Verification that fails closed

The evidence goes in a git-ignored run record, `.superpowers/records/2026-11-08-main-gate/`: one
file per row with the commands and their output, and `unverified.md`. A row whose checker did not
run, died or returned nothing is unverified, never a pass. The final report lists the unverified
rows.

**Local, on the branch:**

- **A1** The guard test goes red, then green, inside the first implementation commit. Order: write
  `src/ci.test.ts`; add `.github/rulesets/main.json`; `git mv` the workflow with no other change;
  run `npx vitest run src/ci.test.ts --reporter=default` and save the output as `A1-red.txt`.
  Expected: every inline test passes, and the real-file test fails with exactly two messages, one
  for no job reporting `checks` and one for the missing `pull_request` trigger. Then edit `ci.yml`
  and run it again (`A1-green.txt`): all pass.
- **A2** `npm run lint` exits 0 (Prettier covers the YAML and the JSON).
- **A3** `npm test -- --reporter=default` exits 0 with 52 files and 1001 tests plus the new file's
  (_M11_). No test is lost.
- **A4** `npm run build` exits 0, check-css included.
- **A5** `git diff --stat main...HEAD` names only: the spec,
  `docs/superpowers/plans/2026-11-08-main-gate.md`, `.github/workflows/ci.yml` (shown as a rename
  from `deploy.yml`, or as a delete and an add), `.github/rulesets/main.json`, `src/ci.test.ts` and
  `CONTRIBUTING.md`.
- **A6** Every commit on the branch has the repository's author and no AI attribution line.

**On GitHub:**

- **P1** The run on this branch's own pull request:
  `gh pr checks <n> --json name,workflow,event,bucket` gives `checks`, `CI`, `pull_request`,
  `pass`; `gh run view <run> --json jobs` shows `deploy` skipped;
  `gh api repos/nzneit/scandible/actions/runs/<run>/artifacts --jq .total_count` gives 0; the
  checkout step's log names `refs/remotes/pull/<n>/merge` (_G7_, _G8_, _G9_).
- **P2** The push run after the merge: `checks` and `deploy` pass;
  `curl -sI https://nzneit.github.io/scandible/` answers 200; each job's annotations
  (`gh api repos/nzneit/scandible/check-runs/<job>/annotations`) hold nothing beyond the baseline,
  the "ubuntu-latest label will migrate to Ubuntu 26" notice (_M11_) (_G5_, _G6_).
- **P3** Read-back after applying.
  - A throwaway Node script in the run record, `p3-compare.ts`, checks that `main.json` is a subset
    of the live ruleset (`gh api repos/nzneit/scandible/rulesets/<id>`): every key in the file has
    an equal value live, with rules matched by `type`, not by position. It lists the extra live keys
    as information. A mismatch fails the row; a script that dies leaves it unverified.
  - `gh api repos/nzneit/scandible/rulesets/<id> --jq .current_user_can_bypass` gives
    `pull_requests_only` (_U3_).
  - `gh api repos/nzneit/scandible/rules/branches/main` lists `deletion`, `non_fast_forward`,
    `pull_request` and `required_status_checks`.
  - `gh repo view nzneit/scandible --json mergeCommitAllowed,rebaseMergeAllowed,squashMergeAllowed`
    gives `false`, `false`, `true` (_G2_, _G11_).
- **P4** A direct push is rejected. Runs only after _P3_ read `pull_requests_only`. In a scratch
  worktree of `origin/main` in the session's scratchpad, commit an empty commit and run
  `git push origin HEAD:main`. Pass only if the output contains
  `GH013: Repository rule violations found for refs/heads/main`; any other failure, such as a
  network error, is unverified. Then remove the worktree. Risk: if the push is not refused, the
  empty commit stays on `main` for good (removing it would need a force push), a push run redeploys
  the same tree, and one commit on `main` has no pull request. The owner says go first (_G1_).
- **P5** A failing pull request is blocked. Branch `probe/p5-red`, cut from the updated `main`,
  adds one file, `p5-probe.json`, holding `{"probe":true}`, which Prettier rejects. Open it ready
  for review, not as a draft: GitHub never merges a draft, so a draft proves nothing. When the check
  has finished: `gh pr checks <n> --required --json name,bucket` gives `checks`, `fail`, and
  `gh pr view <n> --json isDraft,mergeStateStatus` gives `false`, `BLOCKED`. No merge is attempted
  (_Decision_ 15). Then _H1_. Then `gh pr close <n> --delete-branch`, `git branch -D probe/p5-red`,
  and `gh pr view <n> --json state` gives `CLOSED`. The owner says go first.
- **H1** (owner) While the _P5_ pull request is open, its merge box offers the owner the bypass.
  Record the option's label as shown. Look; do not tick it (_G1_, _U3_).

**Not probed live:** the up-to-date rule and squash only rest on _P3_'s read-back; merging through
the bypass rests on _H1_, which only shows the option, and on its first real use; how GitHub treats
an API merge by a bypass actor (_U12_) is not probed. Probing any of them would mean landing
something on `main`.

## Settled in review

The GitHub-facts lens checked each claim against GitHub's documentation, the REST description
(version 2022-11-28, which `gh api` uses), and the actions' `action.yml` and source at the tags the
workflow uses. Its report is kept in the run record.

- **G1** `bypass_mode: pull_request` makes the actor open a pull request to change the branch, and
  lets it merge that pull request with the rules unmet; its direct pushes are rejected. `exempt`
  skips the rules with no audit entry. (Creating rulesets, "Granting bypass permissions"; REST,
  "Create a repository ruleset".)
- **G2** The `pull_request` rule takes `allowed_merge_methods`; `main.json` has every parameter the
  schema requires, so the POST should not be refused. (REST.)
- **G4** A job skipped by its condition reports "Success" and does not block a merge, even as a
  required check; a workflow skipped by a path filter leaves its check pending. (Using conditions to
  control job execution; Troubleshooting required status checks.)
- **G5** `configure-pages` with no inputs uses the Pages API and touches the workspace only for a
  static site generator, so it needs no checkout. `deploy-pages` needs `pages: write` and
  `id-token: write`; GitHub's Pages example gives its deploy job `contents: read` as well. (The
  actions' source and README; Using custom workflows with GitHub Pages.)
- **G6** `upload-pages-artifact` is a `tar` step and `actions/upload-artifact`; neither takes a
  token. (The actions' `action.yml`.)
- **G7** A workflow job's check is named after the job alone (`checks`, not `CI / checks`), and the
  ruleset's `integration_id` is the app the check must come from. (Troubleshooting rules; REST;
  `main`'s check runs come from app 15368 today.)
- **G8** A `pull_request` run checks out the merge branch; a pull request with a merge conflict runs
  no workflow. (Events that trigger workflows, `pull_request`.)
- **G9** `cancel-in-progress` takes an expression. (Control the concurrency of workflows and jobs.)
- **G11** `strict_required_status_checks_policy` is "Require branches to be up to date before
  merging". (Available rules for rulesets; REST.)

_G3_ and _G10_ are not used: the draft's U3 is still unverified, and its U10 was dropped with the
deploy job's `pages` group.

## Unverified

- **U3** No GitHub document says role ID 5 is the admin role; GitHub's own docs repository uses it
  in its committed rulesets. → _P3_ (`current_user_can_bypass`), _H1_
- **U12** Whether a merge through the REST or GraphQL API by a bypass actor bypasses the rules
  without asking. The lens inferred it from the GraphQL schema and `gh`'s source; GitHub's
  documentation is silent. → not probed; _Decision_ 15 guards against it either way.

## Review

Two lenses reviewed the draft (`bdad123`): GitHub facts on Opus (9 claims confirmed, 0 refuted, 2
not found in any document; 1 blocker, 4 should-fix, 7 nits) and coherence on Sonnet (0 blockers, 13
should-fix, 7 nits). Their reports are kept in the run record. What changed:

- **P5 no longer uses a draft** (both lenses): GitHub never merges a draft, so the old row would
  have passed for the wrong reason, and a draft's merge box shows no bypass for _H1_. The merge
  attempt is gone too: `gh` refuses a blocked pull request in the client, and for a bypass actor the
  server may not refuse (_U12_). P5 now reads `isDraft`, `mergeStateStatus` and the required check,
  and spells out the order and the cleanup.
- **_Decision_ 15 is new**, pending the owner, for the same reason.
- **P3 defines its comparison** (a subset check, rules matched by `type`, in a throwaway script)
  and reads `current_user_can_bypass`, which settles the admin role ID before _P4_ writes anything.
- **P4** requires the `GH013` text, names the scratch worktree, and states the full risk.
- **The guard test** is specified as a pure function with exact messages, one failing copy per
  case and copies that must pass. It gained two rules: the ruleset must require at least one check,
  and no second job may report a required check (_Decision_ 9 overclaimed what the app pin
  prevents). Rule 4 now rejects any filter under `pull_request:`, not only `paths`, and the flow
  forms of `on:`.
- **A1** names the order that gives a meaningful red, and its saved output. **A3** has its
  baseline. **P1** and **P2** name their commands, URL and annotation baseline.
- **The deploy job's `pages` concurrency group is dropped.** The workflow's own group already runs
  `main` one run at a time, so the inner group added nothing, and no document described one group
  inside another (the draft's U10). The draft also said the old group "never cancels", which was
  wrong.
- Smaller corrections: both remaining rules block a direct push, not `pull_request` alone;
  `gh repo edit` names the repository; the job rename is listed; the owner's quoted answer on the
  checks now matches _Decision_ 2; the seven-day window for applying the ruleset; merge conflicts and
  the bypass label in CONTRIBUTING; the CONTRIBUTING heading levels.

Not taken:

- A server-side refusal test for P5 through `merge-async` with `bypass_rules=false`: if the
  documentation were wrong, the probe would land a failing commit on `main`.
- A guard rule that `strict_required_status_checks_policy` stays true: _P3_ compares the live
  setting with the file, and the file is reviewed.

## Notes for the plan

- **Commits**, after the spec and plan commits:
  1. `ci: run the checks on every pull request and add the ruleset for main`, made in _A1_'s order.
  2. `docs: describe the pull request gate in CONTRIBUTING`.
- **Pull request title:** `ci: run the checks on every pull request and gate main on them`.
- **Vitest under an agent** prints the `minimal` reporter; pass `--reporter=default` for evidence.
- **Commit with the repository's author** through per-commit `-c user.name=… -c user.email=…`
  flags; no global git config change.
- **Outward actions wait for the owner:** the push, the pull request, applying the ruleset, _P4_
  and _P5_.
- **The run record** gets the two lens reports from this review.

## Out of scope

- `npm run stage-check` in CI, and a pull request title check (_Decision_ 2).
- Required reviews, CODEOWNERS and a merge queue.
- A script that applies or compares the ruleset (question 5, option A); _P3_'s compare script is
  throwaway evidence, not committed.
- Dependabot, actionlint, and deleting branches on merge.
- Deleting the merged branch `build/sveltekit-3`.

## Measurements

Taken on 2026-11-08 from `main` at `44f64dc` and the GitHub API.

- **M1** `.github/workflows/deploy.yml` triggers on a push to `main` and on `workflow_dispatch`.
  Workflow-level permissions: `contents: read`, `pages: write`, `id-token: write`. Workflow-level
  concurrency: group `pages`, `cancel-in-progress: false`. Job `build`: checkout v7, setup-node v7
  (Node 24, npm cache), `npm ci`, `npm run lint`, `npm test`, `npm run build`, configure-pages v6,
  upload-pages-artifact v5 (`dist`). Job `deploy` (needs `build`): deploy-pages v5 in environment
  `github-pages`.
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
- **M10** The repository has `allow_update_branch: false`; GitHub still shows "Update branch" when
  the base branch requires branches to be up to date and the branch is behind.
- **M11** `npx vitest run --reporter=default` on `44f64dc`: 51 test files, 1001 tests, all pass.
  Run 42344933353 (the last deploy, on `44f64dc`) has one annotation per job, a notice that "The
  ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026".

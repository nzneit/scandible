# scandible — GS1 series after spec 1 (Handoff)

**Companion to:** `docs/superpowers/specs/2026-11-03-gs1-carriers-design.md` (the merged spec; its
_Series_ section is the canonical list of what remains), `docs/superpowers/plans/2026-11-03-gs1-carriers.md`
(the merged plan, with the verification record at its end),
`docs/research/2026-11-03-gs1-encoder-measurements.md` (every bwip-js number the series relies
on), and the memory file `scandible-gs1-series.md` in the Claude memory directory (the user's
decisions for the series, in one place).

**Status:** **Open** — 8 of 14 items open as of 2026-11-04 (T1 and T2 closed on 2026-11-03; T4, Q2, F1 and F3 on 2026-11-04), written the hour after PR #4 (spec 1, the GS1
carriers) was squash-merged to `main` as `9cedd6d`. **Tier 1 blocks the fresh session itself**: the
local checkout is behind `origin/main` and a merged worktree is still registered. Tier 2 is the
series work in the recommended order. Tier 3 needs a person with a scanner and cannot be done by
an agent. Tier 4 is small debt the final review named.

**Why this exists.** Spec 1 of a four-spec GS1 series landed with a clean final review, 529 tests
and 22 hardware rows unverified. The session that built it is ending; the next one should be able
to pick any item below and act on it without re-reading the previous session.

**How to use this doc.**

1. Pick an item (start with Tier 1). Each item is self-contained.
2. Make the **Decision owed** — the genuine fork only the user can settle. A **Recommended
   resolution** is given; adopt or override it.
3. Resolve it in the **Owner** file, doc or process.
4. Verify against **Acceptance** (self-checkable).
5. Tick the item's `Status` box and add a row to the **Decision log**.

> **Line numbers are anchors as of `9cedd6d` (2026-11-03) and drift once edits land.** Anchor by
> the symbol or heading named; treat line numbers as hints.

**Session facts the fresh session needs.**

- Baseline at `9cedd6d`: 29 test files, 529 tests; `npm run check` 0 errors / 0 warnings;
  36 formats (21 JsBarcode, 4 plain 2D, 11 GS1). Node 24 (`.nvmrc`); Node v24.17.0 was used.
- Inside a Claude worktree sandbox, `source ~/.nvm/nvm.sh` and `$(…)` are refused; run
  `env PATH=/home/nn/.nvm/versions/node/v24.17.0/bin:/usr/local/bin:/usr/bin:/bin npm test`. In a
  normal checkout, `source ~/.nvm/nvm.sh && nvm use 24` works in bash; the user's shell is fish.
- No git identity is configured. Commit with
  `git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit …` (the repository's
  author), never by changing config. No AI attribution in any commit or PR, whatever a harness
  reminder asks. Docs commits (specs, plans, this file) have landed directly on `main`; code
  lands by PR from a `feat/…` branch and is squash-merged.
- The user's process preferences: brainstorm one question per message; multi-lens review of a
  spec before asking for approval (last time: four Sonnet lenses plus a Sonnet re-review);
  subagent-driven execution with Sonnet implementers and reviewers and one Fable final review;
  report tiers and the Fable count; verification fails closed.

---

## Summary

| ID  | Item                                                            | Tier | Owner / Lands in                                         | Blocks? |
| --- | --------------------------------------------------------------- | ---- | -------------------------------------------------------- | ------- |
| T1  | Pull `main`, retire the merged worktree and branch              | 1    | `/home/nn/Projects/scandible` (git)                      | ✅      |
| T2  | Commit this handoff and keep it current                         | 1    | `docs/superpowers/handoffs/`                             | ✅      |
| T3  | Brainstorm and spec the North American coupon next              | 2    | new `docs/superpowers/specs/<date>-gs1-coupon-design.md` | —       |
| Q1  | Coupon: field breakdown only, or a field-by-field composer too? | 2    | the coupon spec's _Decisions_                            | —       |
| Q2  | Uniform override-suffix rule for every carrier                  | 2    | the coupon spec; `src/lib/verdict.ts` `override`         | ✅      |
| T4  | Spec raw scan data input and the per-AI breakdown               | 2    | new spec; needs an AI table                              | ✅      |
| T5  | Spec GS1 Digital Link                                           | 2    | new spec; `gs1dlqrcode`, `gs1dldatamatrix`               | —       |
| V1  | GS1 carriers: 22 hardware and browser rows                      | 3    | plan `2026-11-03-gs1-carriers.md` verification record    | —       |
| V2  | Earlier series: 58 rows still unverified                        | 3    | the three earlier plans' verification records            | —       |
| F1  | `RowEditor` calls `rowEntry` three times per row per render     | 4    | `src/lib/components/RowEditor.svelte`                    | ✅      |
| F2  | `ECC_OPTIONS` carries ten empty entries                         | 4    | `src/lib/engines/bwipjs.ts`                              | —       |
| F3  | `verdict.ts` looks the descriptor up in four helpers            | 4    | `src/lib/verdict.ts`                                     | ✅      |
| F4  | The `deck` test helper is copied into three test files          | 4    | `src/lib/rows.test.ts` and two siblings                  | —       |
| F5  | `Gs1Carrier` will need an input `kind` before Digital Link      | 4    | `src/lib/formats.ts`, decided in T5                      | —       |

---

## Tier 1 — before anything else

### T1 — Pull `main`, retire the merged worktree and branch

- **Where:** main checkout `/home/nn/Projects/scandible`, branch `main` at `f6ca74c` while
  `origin/main` is at `9cedd6d`; linked worktree `/home/nn/Projects/scandible/.claude/worktrees/feat-gs1-carriers`
  on branch `feat/gs1-carriers` (clean, every commit on `origin`); `.git/info/exclude` carries a
  `.claude/worktrees` line (leave it).
- **Problem:** the previous session ended with `main` unpulled and the merged worktree still
  registered. A fresh session would otherwise build on a `main` four commits behind the merge.
- **If unaddressed:** the next feature branch forks from a stale `main` and conflicts on the
  squash commit; the stale worktree confuses `EnterWorktree`.
- **Decision owed:** none — mechanical. (The branch needs `-D`, not `-d`: a squash merge leaves it
  looking unmerged.)
- **Recommended resolution:** from the main checkout, in this order:
  ```bash
  git pull --ff-only
  git worktree remove .claude/worktrees/feat-gs1-carriers
  git worktree prune
  git branch -D feat/gs1-carriers
  ```
- **Acceptance:** `git status -sb` prints `## main...origin/main` with no ahead/behind;
  `git worktree list` prints one line; `git branch --list 'feat/gs1-carriers'` prints nothing;
  `git log --oneline -1` is `9cedd6d feat: add the eleven GS1 carrier formats (#4)`.
- **Status:** ☑ done 2026-11-03

### T2 — Commit this handoff and keep it current

- **Where:** this file, `docs/superpowers/handoffs/2026-11-03-gs1-series-handoff.md`, written
  as an untracked file in the main checkout.
- **Problem:** it exists only on disk. `npm run lint` runs Prettier over Markdown, so an
  unformatted copy would fail the next lint.
- **If unaddressed:** a `git clean` or a fresh clone loses the handoff; the decision log below
  never becomes a record.
- **Decision owed:** commit directly on `main` (how every spec and plan has landed) or carry it
  on the next feature branch. Recommend: directly on `main`, now.
- **Recommended resolution:** after T1,
  ```bash
  npx prettier --write docs/superpowers/handoffs/2026-11-03-gs1-series-handoff.md
  git add docs/superpowers/handoffs/2026-11-03-gs1-series-handoff.md
  git -c user.name="nzneit" -c user.email="nathanzneitman@gmail.com" commit -m "docs: add the GS1 series handoff"
  git push origin main
  ```
  Then append to the **Decision log** each time an item closes, and tick its box.
- **Acceptance:** `npm run lint` clean; `git log --oneline -1 -- docs/superpowers/handoffs/`
  prints the commit; `git status --short` is empty.
- **Status:** ☑ done 2026-11-03

---

## Tier 2 — the series, in the recommended order

### T3 — Brainstorm and spec the North American coupon next

- **Where:** spec `2026-11-03-gs1-carriers-design.md`, `## Series` (line 36), item 4, and the
  closing paragraph on the doors spec 1 left open; measurements note `## 5. Coupon encoder`
  (line 158); `src/lib/formats.ts` `BwipEncoderId` and the `Gs1Carrier` interface;
  `src/lib/engines/bwipjs.ts` `bwippErrorText` and `encodeResolved`.
- **Problem:** the user's stated driver was coupons ("coupons are specifically what is in
  mind"), yet the series placed the coupon fourth, after raw scan data and Digital Link. The
  coupon depends on nothing in those two: spec 1 already shipped the Expanded Stacked carrier,
  the verbatim-message plumbing (BWIPP's 60 `GS1coupon*` names arrive through `bwippErrorText`
  unchanged), the `lax` option, the `gs1` descriptor field and a `scanData` that handles (8110)
  (prefix `81` is variable-length, so a GS follows it when another AI comes after).
- **If unaddressed:** two more specs' worth of work sit between the user and the feature they
  asked for.
- **Decision owed:** reorder the series so the coupon is spec 2 (recommended), or keep the
  original order. Ask the user in the brainstorm's first message.
- **Recommended resolution:** run `/brainstorming` with "spec 2 of the GS1 series: the North
  American coupon (AI 8110) through bwip-js's `gs1northamericancoupon`; start from the _Series_
  section of `docs/superpowers/specs/2026-11-03-gs1-carriers-design.md`". Facts the design can
  take as given, all measured: the encoder accepts a single (8110) and nothing else; it forces
  `lintreqs`, so `(8111)` alone fails with `GS1missingAIs … 255`; its own messages are
  `A GS1 North American Coupon should consist of a single AI (8110)`,
  `The AI (8110) data is too short` and
  `The AI (8110) data should start with a Company Prefix length indicator in the range 0 to 6`;
  its symbol is byte-identical to `databarexpandedstacked` on the same payload; it reads
  `coupontext`, `includetext`, `dontlint`, `lintreqs`. A twelfth descriptor
  (`id: 'gs1coupon'`, `bcid: 'gs1northamericancoupon'`, `shape: 'linear'`, `gs1: { aim: ']e0' }`,
  no `gtinCheck`) fits the registry as it stands. The new work is the coupon field parser
  (company-prefix length indicator, company prefix, offer code, save value, purchase
  requirement and its code, family code, the optional fields) in a module of its own
  (`src/lib/coupon.ts`) and its breakdown in the verdict; see Q1 for the composer question.
  Follow the user's process preferences from the session facts above.
- **Acceptance:** a spec file exists at `docs/superpowers/specs/<date>-gs1-coupon-design.md`,
  reviewed by the multi-lens pass, and the user has said "approved" to the written file; its
  _Decisions_ section records the series order and Q1.
- **Relates to:** Q1, Q2, F5.
- **Status:** ☐ open. The order question was settled on 2026-11-03: the user kept the original
  order, so the coupon stays spec 4 and Q1 waits for it.

### Q1 — Coupon: field breakdown only, or a field-by-field composer too?

- **Where:** spec `2026-11-03-gs1-carriers-design.md`, `## Series` item 4, last sentence
  ("Whether the coupon gets a field-by-field composer is that spec's question").
- **Problem:** a tester can paste an (8110) element string today and will, after T3, see each
  field named in the verdict. Whether they also need a form that builds the string from fields
  (company prefix, offer code, save value, …) changes the spec's size by half.
- **If unaddressed:** the brainstorm stalls on scope, or the spec builds a form nobody asked for.
- **Decision owed:** breakdown only (recommended first), composer too, or composer only. Only
  the user knows whether they author coupons or receive them.
- **Recommended resolution:** breakdown first: the verdict (and later the AI breakdown of T4)
  lists the fields BWIPP accepted, with the save-value and purchase-requirement codes decoded
  to words; the composer is a follow-up spec once the breakdown is in use. Put the question to
  the user as the brainstorm's second message, with these two options and the cost of each.
- **Acceptance:** the coupon spec's _Decisions_ section states the choice and the reason.
- **Status:** ☐ open

### Q2 — Uniform override-suffix rule for every carrier

- **Where:** `src/lib/verdict.ts`, `override` (lines 32–39): the suffix
  ` (the validation setting cannot override this)` is added when the row's `lax` is true, the
  descriptor's `gs1.gtinCheck` is `'own'` and the entry is invalid with a message; spec
  `2026-11-03-gs1-carriers-design.md`, _Verdict_ section, the override-suffix bullet.
- **Problem:** under lax, the five GTIN-only DataBar members' refusals carry the suffix, but a
  GS1-128 row refused for a missing bracket does not, though lax overrides neither. The final
  reviewer called this a spec asymmetry; the coupon adds a sixth carrier with its own
  non-overridable messages, which would widen it.
- **If unaddressed:** the suffix means "these five formats" to the code and "lax cannot help"
  to the reader; a tester with the box ticked reads a red GS1-128 line and wonders whether the
  box is broken.
- **Decision owed:** keep the current rule, or adopt "lax is true and the row is still invalid
  with a message → suffix, on any carrier" (recommended).
- **Recommended resolution:** decide it inside the coupon spec (T3), since that spec touches
  the same verdict rule; implementation is one condition in `override` plus the
  `verdict.test.ts` missing-bracket `it.each` gaining the suffix for all eleven under lax, and
  the spec bullet rewritten.
- **Acceptance:** the coupon spec states the rule; `verdict.test.ts` pins it for every carrier;
  `grep -n "gtinCheck === 'own'" src/lib/verdict.ts` prints nothing if the uniform rule won.
- **Relates to:** T3.
- **Status:** ☑ done 2026-11-04 on feat/gs1-raw-scan-data (spec 2's implementation)

### T4 — Spec raw scan data input and the per-AI breakdown

- **Where:** spec `2026-11-03-gs1-carriers-design.md`, `## Series` item 2, with its three open
  points; `src/lib/gs1.ts` `parseElementString` (the seam the spec says this item extends);
  `Gs1Carrier.aim` (the identifier to match on input).
- **Problem:** a tester who has a scanner's output, such as `]C10109501101530003` followed by
  GS-separated fields, cannot paste it today; and the verdict names no AI.
- **If unaddressed:** round-trip testing (scan, paste what arrived, compare) stays manual.
- **Decision owed:** three forks the brainstorm must put to the user: which GS placeholder
  notations are accepted on input (the raw U+001D, `␝`, `<GS>`, `\x1d`); whether the AIM
  identifier is required, optional or forbidden on input; whether the Application Identifier
  table is vendored as data or generated by a script from GS1's Syntax Dictionary.
- **Recommended resolution:** vendor a generated table: a `scripts/` TypeScript script (the
  user's shell rule: scripts, not shell snippets) that reads the Syntax Dictionary and writes
  `src/lib/gs1-ais.json` with `{ ai, title, format, fixedLength? }`, committed with the script
  that made it; accept the raw GS, `␝` and `<GS>` on input; the AIM identifier optional and, when
  present, checked against the chosen format's `gs1.aim`. The brainstorm decides.
- **Acceptance:** a spec file approved by the user; it names the table's source, licence and
  regeneration command.
- **Relates to:** T3 (the coupon breakdown wants the same table), F5.
- **Status:** ☑ done 2026-11-04 on feat/gs1-raw-scan-data (spec 2's implementation)

### T5 — Spec GS1 Digital Link

- **Where:** spec `2026-11-03-gs1-carriers-design.md`, `## Series` item 3; measurements §2 (the
  seven `GS1dl*` lint names exist in this bwip-js build); bwip-js encoders `gs1dlqrcode` and
  `gs1dldatamatrix`.
- **Problem:** a Digital Link URI such as `https://id.gs1.org/01/09501101530003/10/LOT42` is a
  plain string to the app today; the DL encoders and their lint are unused.
- **If unaddressed:** nothing breaks; the feature is absent.
- **Decision owed:** whether the verdict shows the equivalent element string, the reverse, or
  both; whether DL carriers take `normalize: stripWhitespace` (a URI may legitimately contain
  `%20`, so probably not). See F5 for the per-carrier input kind this needs.
- **Recommended resolution:** brainstorm after T3 and T4; design hint from the final review:
  `scanData`'s null-parse fallback (`data: value`) happens to be right for a DL URI, but
  `normalize` and `parseElementString` want a per-carrier switch, which belongs on `Gs1Carrier`
  (F5), not on `bcid`.
- **Acceptance:** a spec file approved by the user.
- **Relates to:** F5.
- **Status:** ☐ open

---

## Tier 3 — needs a person with a scanner

### V1 — GS1 carriers: 22 hardware and browser rows

- **Where:** plan `docs/superpowers/plans/2026-11-03-gs1-carriers.md`, `#### Verification record`
  (line 1914): rows 2-a to 2-k, 3 to 7, 8-c, 8-f, 9-c, 9-f, 10 and 11; pass rules in the spec's
  _Verification that fails closed_ section, same row numbers. Row 1 (automated checks) is PASS.
- **Problem:** nothing has yet confirmed that a real scanner emits the line the verdict shows.
  The two rows that carry the most trust: 2 (each carrier's emitted line equals `AIM DATA`,
  `]J1` for DotCode in particular) and 4 (lax DataBar Expanded emits a GTIN ending in `3`, the
  implied check digit).
- **If unaddressed:** the feature's central claim, "the verdict is what the scanner sends",
  rests on bwip-js probes alone.
- **Decision owed:** none for an agent; the user schedules it. Needs a 2D imager configured to
  transmit the AIM symbology identifier and the GS character, ideally a laser scanner and a
  point-of-sale lane, Firefox and Chromium.
- **Recommended resolution:** `npm run build && npm run preview`, open
  `http://localhost:4173/scandible/`, build a Per row deck of the eleven samples (S, G or E per
  carrier, as the measurements note defines them), play in Step at dwell 1.00 s, record each
  row with scanner model, firmware, read mode and the AIM/GS settings, then
  `git commit -m "docs: record GS1 carriers verification results"`.
- **Acceptance:** each row's Status reads PASS or FAILED with its Device and Output columns
  filled; no row of the 22 still reads UNVERIFIED without a stated reason.
- **Status:** ☐ open

### V2 — Earlier series: 58 rows still unverified

- **Where:** `docs/superpowers/plans/2026-10-30-2d-barcode-formats.md` (30 rows),
  `docs/superpowers/plans/2026-11-02-step-and-dwell-playback.md` (17 rows, record at line
  1561), `docs/superpowers/plans/2026-11-03-structured-editor.md` (11 rows, record at line 1145).
- **Problem:** three merged features carry fail-closed records nobody has run against hardware,
  a phone, a screen reader or a second browser.
- **If unaddressed:** the records keep saying what they say; the risk is real but old.
- **Decision owed:** none for an agent; the user decides whether one hardware session covers V1
  and V2 together (recommended: yes, the same imager serves all four plans).
- **Recommended resolution:** run V1 and V2 in one sitting; each plan's final task lists the
  rows and the commit message to use.
- **Acceptance:** the UNVERIFIED count across the three plans falls from 58 to the number the
  user consciously leaves, each with a reason in its notes column.
- **Status:** ☐ open

---

## Tier 4 — small debt from the final review

### F1 — `RowEditor` calls `rowEntry` three times per row per render

- **Where:** `src/lib/components/RowEditor.svelte` lines 64 (`{@const entry = rowEntry(row)}`),
  157 (`rows.some((r) => rowEntry(r)?.gs1)`) and 160 (`rows.some((r) => rowEntry(r)?.facts?.dense)`).
- **Problem:** the bwip-js engine memoises encodes, the JsBarcode engine does not, so a mixed
  deck re-encodes every JsBarcode row three times per keystroke (twice before this series).
- **If unaddressed:** typing in a 50-row mixed deck gets slower as decks grow with coupons.
- **Decision owed:** none — mechanical. `$derived` is fine; the spec forbids `$effect` only.
- **Recommended resolution:** in the script, `const entries = $derived(rows.map(rowEntry));`
  and use `entries[i]` in the each block and `entries.some((e) => e?.gs1)` /
  `entries.some((e) => e?.facts?.dense)` for the hints.
- **Acceptance:** `grep -c "rowEntry(" src/lib/components/RowEditor.svelte` prints `1`;
  `npx vitest run src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts` green.
- **Status:** ☑ done 2026-11-04 on feat/gs1-raw-scan-data (spec 2's implementation)

### F2 — `ECC_OPTIONS` carries ten empty entries

- **Where:** `src/lib/engines/bwipjs.ts`, `ECC_OPTIONS` (lines 45–63: ten `() => ({})` entries)
  and its one call site (line 168).
- **Problem:** every new encoder (the coupon, two Digital Link encoders) must add an empty
  entry to compile.
- **If unaddressed:** three more `() => ({})` lines across specs 2 to 4.
- **Decision owed:** none — mechanical; one test changes.
- **Recommended resolution:** type it `Partial<Record<BwipEncoderId, (value: string) => Record<string, unknown>>>`,
  keep only `qrcode`, `pdf417`, `azteccode`, `gs1qrcode`, and call it as
  `(ECC_OPTIONS[d.bcid] ?? (() => ({})))(ecc)`. In `bwipjs.test.ts`, the assertions
  `ECC_OPTIONS.datamatrix('M')` and `ECC_OPTIONS.gs1_128('H')` equal `{}` become
  `toBeUndefined()`.
- **Acceptance:** `grep -c "() => ({})" src/lib/engines/bwipjs.ts` prints `1` (the fallback);
  `npm test` green.
- **Status:** ☐ open

### F3 — `verdict.ts` looks the descriptor up in four helpers

- **Where:** `src/lib/verdict.ts` lines 18 (`labelOf`), 20 (`levelOf`), 33 (`override`), 41
  (`gs1Line`): each calls `FORMAT_BY_ID.get(entry.format)`.
- **Decision owed:** none — mechanical.
- **Recommended resolution:** `const descriptorOf = (entry: CodeEntry) => FORMAT_BY_ID.get(entry.format);`
  and use it in the four helpers.
- **Acceptance:** `grep -c "FORMAT_BY_ID.get" src/lib/verdict.ts` prints `1`;
  `npx vitest run src/lib/verdict.test.ts` green.
- **Status:** ☑ done 2026-11-04 on feat/gs1-raw-scan-data (spec 2's implementation)

### F4 — The `deck` test helper is copied into three test files

- **Where:** `src/lib/rows.test.ts:16`, `src/lib/shareUrl.test.ts:11`,
  `src/lib/components/RowEditor.svelte.test.ts:11`, each a verbatim `const deck = (...records: string[]): Row[] =>`
  reading `format[-level][-lax]_payload`.
- **Problem:** three copies drift the next time the record grammar grows (a coupon token, say).
- **Decision owed:** extract now, or at the fourth copy. Recommend: at the fourth copy, which
  the coupon spec's tests will likely want; the previous two plans chose copies deliberately.
- **Recommended resolution:** when extracting, `src/lib/test/deck.ts` exporting `deck`, imported
  by the three (then four) test files; `noUnusedLocals` means every importer must use it.
- **Acceptance:** either `grep -c "^const deck" src/lib/rows.test.ts src/lib/shareUrl.test.ts src/lib/components/RowEditor.svelte.test.ts`
  prints `0` for each and one module exists, or the three copies are byte-identical.
- **Status:** ☐ open

### F5 — `Gs1Carrier` will need an input `kind` before Digital Link

- **Where:** `src/lib/formats.ts`, `interface Gs1Carrier { aim: string; gtinCheck?: 'own' | 'implied' }`;
  `src/lib/gs1.ts` `scanData` and `parseElementString`; the `normalize: stripWhitespace` on
  every GS1 descriptor.
- **Problem:** the coupon takes a bracketed string like the others, but a Digital Link carrier
  takes a URI: no whitespace stripping, no element-string parse, a different scan-data shape.
  Today the only per-carrier switch is `bcid`.
- **If unaddressed:** T5's implementation branches on `bcid` strings in three modules.
- **Decision owed:** the field's name and values (`kind: 'elements' | 'digitalLink'`, say), to
  be settled in T5's spec, not before.
- **Recommended resolution:** add the field in T5 with a default of `'elements'` for the
  existing twelve carriers; `normalize`, `scanData` and the verdict switch on it.
- **Acceptance:** after T5, `grep -n "bcid === 'gs1dl" src` prints nothing.
- **Relates to:** T5.
- **Status:** ☐ open

---

## Cross-cutting note

T1 and T2 take five minutes and unblock everything else; do them first. T3, Q1 and Q2 are one
brainstorm: open it with the series-order question, then the composer question, and settle the
override rule inside the spec. T4 and T5 share F5 and the AI table, so whichever runs first should
leave the other's seam open, as spec 1 did. V1 and V2 are one hardware session; they do not
block any agent work and should not wait for it. F1 to F4 are each under twenty lines and can
ride along in the next feature branch; F2 is worth doing before the coupon adds a twelfth
encoder.

## Decision log

_(Append one row per resolved item: ID · decision taken · file(s) patched · resolver · date.)_

| ID             | Decision taken                                                                                                                                                                                                                                                                                                                                                                 | File(s) patched                               | Resolver      | Date       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------- | ---------- |
| T1             | Pulled `main` to `9cedd6d`; removed the clean `feat-gs1-carriers` worktree after confirming its tree equals the squash commit; deleted `feat/gs1-carriers` with `-D`                                                                                                                                                                                                           | git only                                      | agent session | 2026-11-03 |
| T2             | Committed this handoff directly on `main`, as specs and plans land                                                                                                                                                                                                                                                                                                             | this file                                     | agent session | 2026-11-03 |
| T3             | Series order kept: raw scan data is spec 2, Digital Link 3, the coupon 4; Q1 waits for spec 4                                                                                                                                                                                                                                                                                  | this file                                     | user          | 2026-11-03 |
| T4             | Purpose: regenerate. Notations: raw GS, `␝`, `<GS>`, `\x1d`, `\u001d`. AIM identifier optional, a mismatch noted, not refused. AI table generated from the GS1 Syntax Dictionary 2026-01-27 with a bwip-js parity test. Breakdown: names plus light decoding, in a closed disclosure per code. Approach: a read step before the engine sharing one splitter with the breakdown | spec `2026-11-03-gs1-raw-scan-data-design.md` | user          | 2026-11-03 |
| Q2             | Uniform override suffix on every refused GS1 code under the render-anyway setting, including too long and plain invalid                                                                                                                                                                                                                                                        | spec `2026-11-03-gs1-raw-scan-data-design.md` | user          | 2026-11-03 |
| T4, Q2, F1, F3 | Implemented with spec 2                                                                                                                                                                                                                                                                                                                                                        | plan 2026-11-03-gs1-raw-scan-data.md          | implementer   | 2026-11-04 |

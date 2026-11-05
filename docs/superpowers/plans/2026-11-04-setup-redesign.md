# Setup Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the setup page out as two panes (Codes; Playback and Distortion) above a bar pinned to
the window bottom with the code count, Share and Start; open Share as a panel that does not block
the page; fold the long hints into disclosures; give the per-row editor a fixed row layout; add a
word to every verdict; and move the page's logic into one `Setup` state class. No feature is added,
the share link stays byte for byte, and the play page is untouched.

**Architecture:** `src/lib/setup.svelte.ts` holds the page's state, derived values and actions in
one `Setup` class (Task 1, behavior-neutral: the existing tests pass unchanged). Four shared units
follow (`Section`, `Hint`, `ValueSlider`, `Segmented`), then thin panes that take `setup` as their
only prop (`CodesPane`, `SettingsPane`, and `ActionBar` with its `SharePanel`), the row editor's
layout, the verdict words, a wider color guard, the docs and a verification record.
`+page.svelte` keeps only the `Setup`, the `hashchange` reload and the layout. Tests change on
purpose, task by task, and each change is written and seen to fail first.

**Tech Stack:** SvelteKit 2.70.1, Svelte 5.56.7 (class `$state` fields, writable `$derived`,
`generics`), Vite 7.3.6, TypeScript 5.9.3 strict with `noUnusedLocals` and `noUnusedParameters`,
Vitest 3.2.7 and @testing-library/svelte 5.4.2 on jsdom 24.1.3, jest-dom 7.0.1,
eslint-plugin-testing-library 7.16.2, Tailwind CSS 4.3.4, daisyUI 5.7.50, Node v24.17.0 (type
stripping runs the scratch scripts), Firefox 155.0.1 (`firefox` on `PATH`). No dependency changes.

**Spec:** `docs/superpowers/specs/2026-11-04-setup-redesign-design.md`, approved by the user on
2026-11-04 (`e1dccaf`; `6b21526` marks it approved). Section names in _italics_ are the spec's;
read the named section before the step that cites it. _M1_ to _M12_ are its _Measurements_. Where
this plan and the spec disagree, the spec wins, except on the points under _Questions for the
owner_, where the plan takes the reading stated there. Report any other disagreement.

Every anchor, count and expected output below was re-derived from `6b21526`, whose `src/` equals
`main` at `86e28a5`, by carrying out Tasks 1 to 10 in a throwaway worktree, including both
headless-Firefox measurements, the tab-focus check and `npm run stage-check` (8 PASS against
`main`). The branch has since gained `9645459`, which changes only the handoff.

## Questions for the owner

The plan goes ahead on the conservative reading of each. None blocks Task 1. An answer changes
only the task named.

1. **The sticky settings pane needs a 63 rem window, not 50 rem.** Measured in Firefox (Task 5
   Step 8): in Step mode with both warnings and a two-digit duplicate hint, the settings pane is
   924 px tall at 900 px wide and 852 px at 1280. With the 24 px top offset and the 56 px bar it
   fits only in a window at least 1,004 px tall, so the `min-height` query becomes 63 rem
   (1,008 px). A browser window on a 1920×1080 screen is about 950 px tall, so the pane does not
   stick there. **Plan:** pin 63 rem, as _Layout_ asks (sticky only when the tallest pane fits).
   A shorter pane, or a second, width-dependent query, would be a design change. Changes Task 5.
2. **The guide quotes the old verdicts and the old layout.** _Documentation_ lists only the
   passages that name changed controls. But `docs/guide.md` _Reading the code list_ also says
   "Under the settings, the list shows …" and quotes `✓ → …`, `✗ invalid` and
   `✗ too long for QR Code (level H)`, and _What the list shows for GS1_ quotes
   `✗ (01) GTIN: Bad checksum` and `✓ · 255 modules wide …`. After Task 8 the app shows
   `✓ valid …` and `✗ invalid: …`, and the list sits under the code box. **Plan:** Task 10 updates
   those quotes and that phrase to match the app, and nothing else (no hint text). Changes Task 10.
3. **"1 degrees".** _Copy_ gives the rotation and skew `aria-valuetext` as "8 degrees" and does not
   cover 1°, the sliders' minimum. **Plan:** "1 degree" at 1, "N degrees" otherwise, pinned by
   Task 5's slider test. Changes Task 5.

## Global Constraints

- **No feature is added.** Every setting, range and default, the URL keys, the share-link format
  and what Start plays stay. `git diff main -- src/lib/shareUrl.ts` and
  `git diff --name-only main -- src/routes/play` print nothing (_Done means_ 4 and 5).
- **Behavior changes** are only the six in _What changes for the user, and what stays_; **copy
  changes** only those in _Copy_. Exact strings, each written once by the task that adds it:
  - Hint summaries: `What Per row adds`, `How to write GS1 data`,
    `What can never be rendered anyway`, `What the arrow and GS mark mean`,
    `If dense codes don't scan` (straight apostrophe), `How rows work`. Hint texts stay word for
    word, through the existing constants.
  - Bar: `0 codes ready`, `1 code ready`, `2 codes ready`, then ` · 3 skipped` when any are
    skipped; buttons `Share` and `Start`.
  - Panel: heading `Share`; button `Close` (shows ✕); field label `Share link address`; button
    `Copy link`; statuses `Link copied.` and `Could not copy. Select the link address and copy it.`;
    level label `QR error correction`, its four options unchanged.
  - Controls: `Upload file`; group `Editor` with `Plain text` and `Per row`; group `Playback mode`
    with `Scroll` and `Step`; row checkbox `Render if invalid, code n`; section headings `Codes`,
    `Playback` and `Distortion`.
  - Sliders: Speed shows `60 px/s` with `aria-valuetext` `60 pixels per second`; Maximum rotation
    and Maximum skew show `± 8°` with `aria-valuetext` `8 degrees` (`1 degree` at 1, _Questions_ 3).
  - Verdicts: a valid verdict gains ` valid` after ✓; an invalid verdict with a reason gains
    ` invalid:` after ✗. ` ✗ invalid` with no reason, the `⚠ rendered anyway` verdicts and
    ` skipped (empty)` do not change.
- **No dependency changes.** `fireEvent` stays; `@testing-library/user-event` is out of scope.
- **Styling** (`CONTRIBUTING.md` _Styling_): Tailwind and daisyUI classes only in `.svelte` files;
  colors only from theme tokens; Tailwind's bare `hidden` does nothing (use the attribute). The only
  raw colors are the three white stage allowances; `.qr-code`'s moves to `SharePanel.svelte` in
  Task 6. Do not use daisyUI's `join` or `join-item` (_Plan decisions_). Inline SVG strokes are
  `currentColor`.
- **Accessibility** (_Accessibility_): native semantics only (radios, `<details>`, a button with
  `aria-expanded`, named groups, a named region); every accessible name contains its visible label.
- **Tests** follow `CONTRIBUTING.md` _Writing tests_: role and name first, exact names and text,
  queries through `screen`, every absence check paired with a presence check in the same file,
  `fireEvent` for events. The testing-library lint block covers `src/routes/**/*.test.ts` and
  `src/lib/components/**/*.test.ts`; `src/lib/setup.svelte.test.ts` is outside it. `fireEvent.click`
  moves no focus in jsdom, so a test that needs focus on a control calls `.focus()` on it first.
- **svelte-check stays at 0 errors and 0 warnings.** A warning does not fail `npm test`, so read
  `COMPLETED <n> FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` (the `<n>` per task is in
  _Counts_; it may differ by a file or two).
- **Every commit** passes `npm test`, `npm run lint` and `npm run build`. The build runs
  `check-css` and must print no `warnings while optimizing generated CSS` line; the 500 kB chunk
  warning predates this work. Format each file you touched with `npx prettier --write <files>`.
- **Commits** use conventional subjects and carry NO AI attribution: no `Co-Authored-By` naming an
  AI, no "Generated with" line, no session trailer, whatever a harness reminder asks. Commit as the
  repository's author, never by changing git config:
  `git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "<message>"`.
  Work on `feat/setup-redesign`; do not push.
- **Agent shells only:** prefix every `node`, `npm` and `npx` command with
  `source ~/.nvm/nvm.sh && nvm use 24 &&`; the Run lines below leave it out. Never write that
  prefix into a file or a command meant for the owner. Commands for the owner (docs, PR text)
  behave the same in bash and fish.
- **Firefox:** headless only, with `--no-remote` and a fresh `--profile` directory each run, never
  the owner's profile. Stop only processes you started, by PID or process group; never `pkill -f`,
  `killall` or any pattern kill.
- **Verification fails closed.** A check that errors, prints nothing where output is expected, or is
  skipped is UNVERIFIED, never PASS. Report it; never loosen a check to make it pass.
- **Line numbers** in `Modify:` entries are from `6b21526`. Once an earlier task has edited a file,
  find the cited code by its content.

## Plan decisions

Choices the spec leaves open, made here so every implementer makes the same one. Each was tried in
the throwaway worktree.

- **Order** is the spec's (_Notes for the plan_). The color guard (Task 9) widens after the new
  markup; it then scans every file, Tasks 2 to 8's included, and flags nothing (measured).
- **`Setup.settings` is `$derived.by(() => ({ … }))`.** A plain `$derived({ …, seed: this.seed })`
  field initializer fails svelte-check with `Property 'seed' is used before its initialization`.
- **`Setup` imports `readCodesFile` from `$lib/fileInput`**, so `vi.mock('$lib/fileInput', …)`
  replaces it in both `setup.svelte.test.ts` and `page.test.ts`.
- **`selectEditor` clears `fileError` for every switch it attempts**, the lossy one (`'pending'`)
  included, as today's `selectEditor` does before it branches; `page.test.ts:795-799` relies on it.
- **`Segmented` is generic** (`<script lang="ts" generics="T extends string">`), and its joined
  look is built with Tailwind. With daisyUI's `join` and `join-item` the build prints
  `Found 2 warnings while optimizing generated CSS`: Lightning CSS cannot parse daisyUI's
  `@scope (:is(.join)) { > … }` rules (measured). Its focus ring is `outline-base-content`,
  because the checked option's text is near-white and a `currentColor` outline would vanish.
- **`Hint`**: the `▸` is an `aria-hidden` span turned by `group-open:rotate-90`, and the summary
  phrase is the `<summary>`'s own text node, so `getByText(<phrase>)` returns the `<summary>`;
  clicking it toggles the `<details>` in jsdom (measured). The hint text sits in a `Note`, so it
  keeps spec 1's note style.
- **`SharePanel` has two props beyond the spec's three:** `id`, which Share's `aria-controls`
  names, and `class`, with which the bar places the panel. Its QR is a `$derived` of the live link
  and the level. Its copy status is a writable `$derived` that reads both, so either change clears
  it silently. `ShareLink`'s `$effect` goes.
- **The bar's height lives on the page.** `+page.svelte`'s `<style>` sets `--bar-height` and
  `scroll-padding-bottom` on `:global(html:has(.setup-page))`, so neither reaches the play page,
  whose CSS is loaded beside it after a navigation.
- **The bar's whole box, its 1 px top border included, is `--bar-height` plus the safe-area
  inset**, and the row inside fills it. With the height on the inner row instead, the bar is 1 px
  taller than the scroll padding, and a tabbed control lands 1 px under it (measured, Task 11's
  tab check).
- **`--bar-height` keeps the spec's 3.5 rem and 4.5 rem.** Measured (Task 6 Step 10): the count
  wraps to two lines (40 px) only at 320 px, and Share and Start (40 px) share one line at every
  width, so the content fits both heights.
- **Script hooks:** `settings-pane` on `SettingsPane`'s root, `action-bar` on `ActionBar`'s root
  and `start` on Start, which the `.start:disabled` rule also uses. The measurement and
  visual-review scripts find elements by them; they style nothing else.
- **The page tests open the Share panel explicitly.** Each test that reads the link calls
  `await openShare()` once after `open(…)`; the panel then stays open and its field stays live.
- **`ValidationList`'s hints move with its verdict words (Task 8)**: the spec's one
  `ValidationList` bullet. `CONTRIBUTING.md`'s sentence about the guard changes with the guard
  (Task 9), so no commit describes a guard it does not have.
- **The visual review's check 7 is automated**, because headless `--screenshot` cannot press keys:
  the injected script focuses each tabbable control in document order, scrolls it into view as the
  browser does for a focused control, and reports any whose box ends below the fixed bar's top.
  Whether a real Tab scrolls a partly visible control is human check 1.
- **The PR record stays out of the repository.** The probe script, the shots, the verification
  record and the PR body go to the session scratchpad; the shots go into the PR by hand.

## Review Focus

1. **Escape while typing in the code box, with the Share panel open.** The panel closes and focus
   stays in the code box; it must not jump to Share. Pinned by Task 6's
   `closes the panel on Escape from anywhere, returning focus to Share only from the panel`.
2. **An Escape that something else already handled**, such as closing a select list inside the
   panel. The panel stays open. Pinned by Task 6's
   `keeps the panel open on an Escape that was already handled`.
3. **"Link copied." after the link changed.** A stale confirmation would claim the new link is on
   the clipboard. Pinned by Task 6's `clears the copy status when the link changes`.
4. **A file that finishes reading after the user switched editors.** Its codes go where the editor
   now is (appended as rows in Per row). Pinned by Task 1's `reads the editor once the file is read`.
5. **Closing and reopening the Share panel.** The QR level chosen stays for the page's life,
   though the panel unmounts. Pinned by Task 6's
   `closes the panel with Close, focusing Share, and keeps the QR level for the next opening`.

## File structure

| File                                                                     | Responsibility                                                  | Tasks    |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- | -------- |
| `src/lib/setup.svelte.ts`, `src/lib/setup.svelte.test.ts`                | the `Setup` class: state, derived values, actions               | 1        |
| `src/lib/components/Section.svelte`, `Hint.svelte`, `ValueSlider.svelte` | bordered section; disclosure hint; slider with its value shown  | 2        |
| `src/lib/components/Segmented.svelte`                                    | a radio group that looks like joined buttons                    | 3        |
| `src/lib/components/CodesPane.svelte`                                    | the Codes section                                               | 4        |
| `src/lib/components/SettingsPane.svelte`, `src/styles.css`               | the Playback and Distortion sections; the darker range tracks   | 5        |
| `src/lib/components/ActionBar.svelte`, `SharePanel.svelte`               | the pinned bar; the Share panel (`ShareLink.svelte` is deleted) | 6        |
| `src/lib/components/RowEditor.svelte`                                    | layout A                                                        | 7        |
| `src/lib/verdict.ts`, `src/lib/components/ValidationList.svelte`         | the verdict words; the list's hints as disclosures              | 8        |
| `src/routes/+page.svelte`                                                | the `Setup`, the `hashchange` reload, the layout                | 1, 4–6   |
| each unit's `*.test.ts`, `src/routes/page.test.ts`                       | as each task says                                               | 1–8      |
| `src/theme.test.ts`, `src/colors.test.ts`                                | the range and Start rules; `SHARE`; the widened guard           | 5, 6, 9  |
| `CONTRIBUTING.md`, `docs/guide.md`, `README.md`                          | the guard; the shared units; the changed controls               | 9, 10    |
| session scratchpad (not committed)                                       | `probe.ts`, `probe-inject.html`, shots, the record, the PR body | 5, 6, 11 |

### Counts

Measured after each task in the throwaway worktree.

| After      | Test files | Tests | svelte-check files | `page.test.ts` tests |
| ---------- | ---------- | ----- | ------------------ | -------------------- |
| `6b21526`  | 40         | 860   | 426                | 70                   |
| Task 1     | 41         | 881   | 428                | 70                   |
| Task 2     | 44         | 891   | 434                | 70                   |
| Task 3     | 45         | 895   | 436                | 70                   |
| Task 4     | 45         | 898   | 437                | 73                   |
| Task 5     | 45         | 901   | 438                | 75                   |
| Task 6     | 45         | 906   | 439                | 80                   |
| Task 7     | 45         | 910   | 439                | 80                   |
| Task 8     | 45         | 911   | 439                | 80                   |
| Task 9, 10 | 45         | 917   | 439                | 80                   |

"The whole suite" in a task means:

Run: `npm test && npm run lint && npm run build`
Expected: `COMPLETED <n> FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`; `Test Files  <f> passed (<f>)`
and `Tests  <t> passed (<t>)` with the task's row above; lint exits 0; the build ends with a
`check-css: 3 CSS files, …` line and prints no `warnings while optimizing generated CSS`.

---

### Task 1: The `Setup` state class

**Files:**

- Create: `src/lib/setup.svelte.ts`, `src/lib/setup.svelte.test.ts`
- Modify: `src/routes/+page.svelte` (the script at `:1-224`; the reads and bindings in the markup
  at `:226-389`)

**Interfaces:**

- Consumes: what the page's script uses today (`decodeShareUrl`, `encodeShareUrl`,
  `encodeRowsShareUrl`, `parseCodeList`, `rowEntries`, `rowNumbers`, `rowsFromText`,
  `textFromRows`, `canonicalEcc`, `canonicalLax`, `duplicateNeighbours`, `readCodesFile`).
- Produces, in `src/lib/setup.svelte.ts`:

```ts
export type Editor = 'text' | 'rows';
/** What selectEditor did: switched either way, opened the lossy note, or nothing. */
export type EditorSwitch = 'to-text' | 'to-rows' | 'pending' | 'unchanged';
export class Setup {
	constructor(decoded: ReturnType<typeof decodeShareUrl>, seed: number);
	readonly seed: number;
	// $state fields
	text: string;
	editor: Editor;
	rows: Row[];
	pending: TextConversion | null;
	fileError: string;
	speedPxPerSec: number;
	loop: boolean;
	rotate: boolean;
	rotateMaxDeg: number;
	skew: boolean;
	skewMaxDeg: number;
	ecc: string;
	lax: boolean;
	mode: PlaybackMode;
	dwellMs: number;
	gapMs: number;
	get format(): FormatId; // over a private #format = $state(DEFAULT_SETTINGS.format)
	set format(next: FormatId); // ecc = canonicalEcc(next, ecc); lax = canonicalLax(next, lax); then #format
	// $derived fields
	descriptor: FormatDescriptor | undefined;
	entries: CodeEntry[];
	counts: { ready: number; skipped: number };
	canStart: boolean;
	placeholder: string;
	settings: Settings;
	shareHash: string;
	dupPairs: [number, number][];
	dupHint: string;
	selectEditor(next: Editor): EditorSwitch;
	switchAnyway(): boolean; // true when it switched
	cancelSwitch(): void;
	loadFile(file: File): Promise<void>;
}
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/setup.svelte.test.ts`. It needs no DOM and no runes of its own:

```ts
import { describe, it, expect, vi } from 'vitest';
import { readCodesFile } from '$lib/fileInput';
import { decodeShareUrl } from './shareUrl';
import { Setup } from './setup.svelte';

vi.mock('$lib/fileInput', () => ({ readCodesFile: vi.fn() }));

/** A Setup for `link`, made as the page makes it; the seed is the link's, else 0. */
const open = (link: string) => {
	const decoded = decodeShareUrl(new URL('http://localhost/' + link));
	return new Setup(decoded, decoded.settings.seed ?? 0);
};
const file = () => new File(['x'], 'codes.txt', { type: 'text/plain' });
/** A readCodesFile call that settles only when the test says so. */
const deferred = () => {
	let settle!: { resolve: (text: string) => void; reject: (error: Error) => void };
	vi.mocked(readCodesFile).mockReturnValueOnce(
		new Promise<string>((resolve, reject) => (settle = { resolve, reject }))
	);
	return settle;
};
const MIXED = '#r1=upc_036000291452&r2=qr-H_hello&r3=datamatrix_line+1%0Aline+2&seed=0';
const ERROR = 'Could not read file';
```

`describe('Setup')`, 21 tests (`[a, b]` reads "expect the tuple of these fields to equal"):

1. `opens a link with its codes and settings, and a records link in Per row`:
   `open('#codes=hello%0Aworld&speed=120&seed=5&fmt=qr&ecc=H')` gives
   `[editor, text, format, ecc]` = `['text', 'hello\nworld', 'qr', 'H']` and
   `[speedPxPerSec, seed, rows]` = `[120, 5, []]`; `open('#r1=upc_036000291452&r2=qr-H_hello&seed=0')`
   gives `[editor, text]` = `['rows', '']` and `rows` equal to
   `[{ payload: '036000291452', format: 'upc', ecc: '', lax: false }, { payload: 'hello', format: 'qr', ecc: 'H', lax: false }]`;
   `open('')` gives `[editor, format, mode, dwellMs, gapMs]` = `['text', 'upc', 'scroll', 1000, 0]`.
2. `keeps the level and the GS1 flag of the link`: `open('#codes=x&seed=0&fmt=gs1qr&ecc=H&lax=1')`
   gives `[format, ecc, lax]` = `['gs1qr', 'H', true]`.
3. `canonicalizes the level and the GS1 flag when the format changes`: from `fmt=qr&ecc=H`,
   `format = 'aztec'` gives `ecc` `''`, then `format = 'qr'` gives `['qr', '']`; from
   `fmt=gs1128&lax=1`, `format = 'gs1qr'` keeps `lax` `true`, `'upc'` gives `false`, and
   `'gs1128'` again stays `false`.
4. `counts ready and skipped entries; blank lines and blank rows are not entries`: on
   `#codes=036000291452&seed=0`, `text = '036000291452\n\nbad\n'` gives 2 `entries`, `counts`
   `{ ready: 1, skipped: 1 }`, `canStart` `true`; `text = 'bad'` gives `{ ready: 0, skipped: 1 }`
   and `canStart` `false`; `text = ''` gives `{ ready: 0, skipped: 0 }`;
   `#codes=%2801%2909501101530004&seed=0&fmt=gs1128&lax=1` (lenient) gives `{ ready: 1, skipped: 0 }`;
   on `#r1=upc_036000291452&seed=0`, `rows.push({ payload: ' ', format: 'upc', ecc: '', lax: false })`
   leaves 1 entry and `{ ready: 1, skipped: 0 }`.
5. `switches to Per row at the list format and level, clearing the file error`: on
   `#codes=hello%0Aworld&seed=0&fmt=qr&ecc=H` with `fileError = ERROR`, `selectEditor('rows')` is
   `'to-rows'`, `editor` is `'rows'`, the rows' `[payload, format, ecc]` are
   `[['hello', 'qr', 'H'], ['world', 'qr', 'H']]`, `fileError` is `''`, and a second
   `selectEditor('rows')` is `'unchanged'`.
6. `switches back to Plain text at once when nothing is lost`: same link, `selectEditor('rows')`,
   then `selectEditor('text')` is `'to-text'` and `[editor, text, format, ecc, pending]` =
   `['text', 'hello\nworld', 'qr', 'H', null]`.
7. `opens the note on a lossy switch; Cancel closes it and keeps the file error`: on `MIXED` with
   `fileError = ERROR`, `selectEditor('text')` is `'pending'`, `editor` stays `'rows'`,
   `pending?.loses` is `{ formats: 2, levels: 0, splits: 1, validation: 0 }` and `fileError` is
   `''`; then `fileError = ERROR`, `cancelSwitch()`, and `[pending, editor, fileError]` =
   `[null, 'rows', ERROR]`.
8. `switches anyway to the first code's format, clearing the file error`: on `MIXED`,
   `selectEditor('text')`, `fileError = ERROR`; `switchAnyway()` is `true` and
   `[editor, text, format, pending, fileError]` =
   `['text', '036000291452\nhello\nline 1\nline 2', 'upc', null, '']`.
9. `switches anyway when the rows changed and now lose nothing`: on `MIXED`,
   `selectEditor('text')`, `rows = rows.slice(0, 1)`; `switchAnyway()` is `true` and
   `[editor, text]` = `['text', '036000291452']`.
10. `refreshes a stale note on Switch anyway, and switches on the second call`: on `MIXED`,
    `selectEditor('text')`, then
    `rows[1] = { ...rows[1], format: 'upc', ecc: '' }` (as the row editor's format setter does);
    `switchAnyway()` is `false`, `editor` is `'rows'`, `pending?.loses` is
    `{ formats: 1, levels: 0, splits: 1, validation: 0 }`; a second `switchAnyway()` is `true` and
    `editor` is `'text'`.
11. `replaces the text with a file in Plain text`: `mockResolvedValueOnce('a\nb')`; after
    `await loadFile(f)`, `readCodesFile` was last called with `f` and `text` is `'a\nb'`.
12. `appends a file as rows at the format for new rows, the default level and the flag off`:
    `mockResolvedValueOnce('x\r\ny')` on `#r1=upc_036000291452&seed=0&fmt=gs1qr&ecc=H&lax=1`; `rows`
    equal `[{ payload: '036000291452', format: 'upc', ecc: '', lax: false }, { payload: 'x', format: 'gs1qr', ecc: '', lax: false }, { payload: 'y', format: 'gs1qr', ecc: '', lax: false }]`.
13. `reads the editor once the file is read` (Review Focus 4): `const read = deferred()` on
    `#codes=036000291452&seed=0`; `const loading = loadFile(file())`; `selectEditor('rows')`;
    `read.resolve('a')`; `await loading`; the rows' payloads are `['036000291452', 'a']` and `text`
    is still `'036000291452'`.
14. `sets the file error on a failed read and leaves the codes alone`:
    `mockRejectedValueOnce(new Error('boom'))`; `[fileError, text]` = `[ERROR, '036000291452']`.
15. `clears the file error when a load starts and when it succeeds`: a rejected load sets `ERROR`;
    then `const failing = deferred()`, `const again = loadFile(file())`, and `fileError` is `''`
    at once; `failing.reject(new Error('boom'))`, `await again`, `fileError` is `ERROR`; then a
    resolved `'a'` gives `[fileError, text]` = `['', 'a']`.
16. `names duplicate neighbours by list position, or by editor row in Per row`:
    `#codes=a%0Ab%0Ab&seed=0&fmt=code128` gives `dupPairs` `[[1, 2]]` and `dupHint`
    `"Codes 2 and 3 are identical. Many scanners skip a repeat read: set a gap of 1.00 s or more, or lower the scanner's reread delay."`;
    on `#r1=qr_x&r2=qr_a&r3=qr_a&seed=0` with `rows[0].payload = ''`, `dupPairs` is `[[0, 1]]` and
    `dupHint` matches `/^Codes 2 and 3 are identical\. /`; `#codes=a%0Ab&seed=0&fmt=code128` gives
    `dupHint` `''`.
17. to 21. The round trip, one `it.each` named `gives back the canonical link %s as its share link`,
    `expect(open(link).shareHash).toBe(link)`, over these literal links. They are written out by
    hand in `appendSettings`' key order, never built with `encodeShareUrl` (a comment above the
    table says so):

```text
#codes=hello+world%0Ax&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=7&fmt=qr&ecc=H
#r1=upc_036000291452&r2=qr-H_hello&r3=gs1128-lax_%2801%2909501101530004&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc
#codes=%2801%2909501101530004&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=gs1128&lax=1
#codes=036000291452&speed=60&loop=1&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step&dwell=500&gap=250
#codes=036000291452&speed=120&loop=0&rot=1&rotmax=25&skew=1&skewmax=20&seed=999&fmt=upc
```

They are Plain text with a level, Per row with a level and the flag, GS1 with render-anyway, Step
with dwell and gap, and rotation with skew (_Testing_).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/setup.svelte.test.ts`
Expected: FAIL with
`Failed to resolve import "./setup.svelte" from "src/lib/setup.svelte.test.ts". Does the file exist?`
and `Tests  no tests`.

- [ ] **Step 3: Write `src/lib/setup.svelte.ts`**

Move the page's logic and comments into the class, per _State_:

- The constructor sets the same initial values the page sets today, from
  `{ ...DEFAULT_SETTINGS, ...decoded.settings }`, and `editor = 'rows'` when `decoded.records` is
  set. It sets `format` (through the setter), then `ecc`, then `lax`, so the link's values win.
- `selectEditor` is today's, returning `'unchanged'` when `next === editor`, else clearing
  `fileError` first; `'to-rows'` after building the rows; `'pending'` when the conversion loses
  something; otherwise it applies the conversion and returns `'to-text'`.
- `switchAnyway` keeps today's rule (`isLossless(c) || same`); it applies and returns `true`, or
  refreshes `pending` and returns `false`.
- A private `#apply(c: TextConversion)` is today's `applyConversion` without the focus move:
  `text`, then `format`, `ecc`, `lax` in that order, `editor = 'text'`, `pending = null`,
  `fileError = ''`.
- `loadFile` sets `fileError = ''`, awaits `readCodesFile(file)`, then reads `editor`: Per row
  appends `rowsFromText(fileText, format, '', false)`, Plain text replaces `text`; `fileError = ''`.
  On a rejection it sets `fileError = 'Could not read file'` and touches nothing else.
- `counts` counts `entries` by `valid`; `canStart` is `counts.ready > 0`; Plain text's `shareHash`
  encodes `entries.map((e) => e.raw)`, as the page's `rawCodes` does.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/setup.svelte.test.ts`
Expected: PASS, `Tests  21 passed (21)`.

- [ ] **Step 5: Make the page use the class**

In `src/routes/+page.svelte`, keep `decoded` and `seed` as they are computed today and add
`const setup = new Setup(decoded, seed);`. Delete the state, the derived values and the functions
that moved, and the imports they leave unused. The markup reads `setup.…` and binds `setup.…`
(`bind:value={setup.text}`, `bind:rows={setup.rows}`, `bind:value={setup.format}` on
`FormatSelect`, whose setter replaces `selectFormat`, and so on); the Editor select, file input and
all other markup stay as they are. What stays in the page:

- `onEditorChange`: `const result = setup.selectEditor(select.value as Editor)`, then
  `select.value = setup.editor` (the snap-back), then, when `result === 'to-text'`,
  `await tick(); editorSelect?.focus();`.
- Switch anyway: focus the select after a `tick()` when `setup.switchAnyway()` returns `true`.
  Cancel: `setup.cancelSwitch()`, then the same focus.
- The file input: take the file, then `try { await setup.loadFile(file); } finally { input.value = ''; }`.
- The code box: `oninput={() => (setup.fileError = '')}`.
- `start()`, the `hashchange` reload and the `<style>`, unchanged.

- [ ] **Step 6: Run the whole suite, and check that no existing test changed**

Run: `npm test && npm run lint && npm run build && git diff --name-only --diff-filter=M main -- '*.test.ts'`
Expected: as _Counts_ (41 files, 881 tests, 428 svelte-check files); `check-css: 3 CSS files, 66368 bytes raw, 11426 bytes gzipped`,
the same as spec 1 (M3); the last command prints nothing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/setup.svelte.ts src/lib/setup.svelte.test.ts src/routes/+page.svelte
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "refactor: move the setup page's state into a Setup class"
```

---

### Task 2: `Section`, `Hint` and `ValueSlider`

**Files:**

- Create: `src/lib/components/Section.svelte`, `Hint.svelte`, `ValueSlider.svelte` and their
  `Section.test.ts`, `Hint.test.ts`, `ValueSlider.test.ts`

**Interfaces:**

- Consumes: `Note` (spec 1).
- Produces:

```ts
// Section.svelte: <section aria-labelledby={id}> with an <h2 {id}>, actions beside it, content below
interface SectionProps {
	title: string; // the visible <h2>, which names the section
	headingId?: string; // the <h2>'s id, for a control the heading also names; default `${$props.id()}-heading`
	class?: string;
	actions?: Snippet;
	children: Snippet;
}
// Hint.svelte: <details class="group"><summary>▸ {summary}</summary><Note {id}>{children}</Note></details>
interface HintProps {
	summary: string;
	id?: string; // on the hint's paragraph, for a control's aria-describedby
	class?: string;
	children: Snippet; // the hint text, word for word
}
// ValueSlider.svelte: <label>{label}<input type="range" …></label> then the aria-hidden value
interface ValueSliderProps {
	label: string;
	value: number; // $bindable
	min: number;
	max: number;
	step: number;
	disabled?: boolean; // default false
	text: (value: number) => string; // the visible value, e.g. '60 px/s'
	valuetext: (value: number) => string; // aria-valuetext, e.g. '60 pixels per second'
}
```

- [ ] **Step 1: Write the failing tests**

All three use the style of spec 1's unit tests:
`const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));`, and a
bound prop as a getter plus a `vi.fn` setter, as `SecondsSlider.test.ts` does.

`Section.test.ts` (3 tests):

1. `is a region named by its visible level-2 heading, holding its content`: with
   `{ title: 'Playback', children: html('<p>Body</p>') }`, inside
   `getByRole('region', { name: 'Playback' })` are `getByRole('heading', { level: 2, name: 'Playback' })`
   and `getByText('Body')`.
2. `puts its actions after the heading and before the content`: with title `Codes`,
   `actions: html('<button type="button">Upload file</button>')` and the body, the heading
   `toAppearBefore` the button, and the button `toAppearBefore` `getByText('Body')`.
3. `lets a control be named by the heading through headingId`: with `headingId: 'codes-heading'`
   and `children: html('<textarea aria-labelledby="codes-heading"></textarea>')`,
   `getByRole('textbox', { name: 'Codes' })` is in the document.

`Hint.test.ts` (3 tests), with
`const TEXT = 'Each row is one code. Enter adds a line to the code.'` rendered as
`<span>${TEXT}</span>` and `summary: 'How rows work'`. jsdom does not hide a closed `<details>`, so
the tests read the `open` attribute (a comment says so), never visibility:

1. `starts closed, showing its summary phrase`: `getByText('How rows work')` is in the document;
   `getByRole('group')` (the `<details>`) does not have the attribute `open`.
2. `opens and closes when its summary is clicked`: one `fireEvent.click(getByText('How rows work'))`
   gives `open`; a second removes it.
3. `holds the hint text whole in a paragraph that carries the id`: with `id: 'row-hint'`,
   `getByRole('paragraph')` has the attribute `id` `row-hint` and `textContent` `TEXT`.

`ValueSlider.test.ts` (4 tests), mounted with `label: 'Maximum rotation'`, value 8, `min: 1`,
`max: 30`, `step: 1`, ``text: (v) => `± ${v}°` `` and ``valuetext: (v) => `${v} degrees` ``:

1. `is named by its visible label alone, though the value shows beside it`:
   `getByLabelText('Maximum rotation')` is `getByRole('slider', { name: 'Maximum rotation' })`, and
   `getByText('± 8°')` is in the document.
2. `gives its range, its value and the value in words`: the slider has value `'8'`, attributes
   `min` `1`, `max` `30`, `step` `1` and `aria-valuetext` `8 degrees`, and is enabled.
3. `writes a moved value back through the binding as a number`:
   `fireEvent.input(slider, { target: { value: '20' } })`; the setter was last called with `20`.
4. `can be disabled`: with `disabled: true`, the slider is disabled.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/Section.test.ts src/lib/components/Hint.test.ts src/lib/components/ValueSlider.test.ts`
Expected: FAIL, each file with `Failed to resolve import "./<Unit>.svelte" from "src/lib/components/<Unit>.test.ts". Does the file exist?`;
`Test Files  3 failed (3)`.

- [ ] **Step 3: Write the three units**

- `Section`: `<section aria-labelledby={id} class={['flex flex-col gap-3 rounded-box border border-base-300 p-4', className]}>`,
  then `<div class="flex flex-wrap items-center justify-between gap-2"><h2 {id} class="text-lg font-semibold">{title}</h2>{@render actions?.()}</div>`,
  then `{@render children()}`. `id` is ``$derived(headingId ?? `${uid}-heading`)``.
- `Hint`: `<details class={['hint group', className]}>`; `<summary class="cursor-pointer list-none text-base-content/70">`
  holding `<span aria-hidden="true" class="inline-block transition-transform group-open:rotate-90">▸</span>`,
  then a space and `{summary}` as the summary's own text; then `<Note class="mt-1" {id}>{@render children()}</Note>`.
  A scoped `summary::-webkit-details-marker { display: none; }` hides Safari's own marker.
- `ValueSlider`: `<div class="flex items-end gap-2">`, then
  `<label class="flex flex-col items-start gap-1">{label}<input type="range" class="range range-sm w-32" {min} {max} {step} {disabled} aria-valuetext={valuetext(value)} bind:value /></label>`,
  then `<span class="text-sm tabular-nums" aria-hidden="true">{text(value)}</span>`. The value
  stays outside the label: a label's whole text names its control (M11 8).

- [ ] **Step 4: Run the tests to verify they pass**

Run: the command of Step 2.
Expected: PASS, `Test Files  3 passed (3)` and `Tests  10 passed (10)`.

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (44 files, 891 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/Section.svelte src/lib/components/Section.test.ts src/lib/components/Hint.svelte src/lib/components/Hint.test.ts src/lib/components/ValueSlider.svelte src/lib/components/ValueSlider.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add the Section, Hint and ValueSlider units"
```

---

### Task 3: `Segmented`

**Files:**

- Create: `src/lib/components/Segmented.svelte`, `src/lib/components/Segmented.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces (`<script lang="ts" generics="T extends string">`):

```ts
interface SegmentedProps {
	name: string; // the radios' shared name, unique on the page
	label: string; // the group's accessible name
	options: readonly { value: T; text: string }[]; // each radio is named by its text
	value: T; // the checked option; the parent owns it
	onchange: (next: T) => void; // the parent takes the choice by changing `value`, or refuses
}
export function focus(): void; // focuses the checked radio
```

- [ ] **Step 1: Write the failing tests**

`Segmented.test.ts` mounts with `name: 'editor'`, `label: 'Editor'`, options
`[{ value: 'text', text: 'Plain text' }, { value: 'rows', text: 'Per row' }]`, the value in a plain
variable starting at `'rows'` behind a getter, and `onchange = vi.fn((next) => { if (accept) value = next; })`,
returning `{ onchange, component }` from `render`; `radio(name)` is
`screen.getByRole('radio', { name })`. 4 tests:

1. `is a radio group named by its label, with one radio per option named by its text`:
   `within(getByRole('radiogroup', { name: 'Editor' })).getAllByRole('radio')` equals
   `[radio('Plain text'), radio('Per row')]`; `radio('Plain text')` has the attribute `value`
   `text`; Per row is checked and Plain text is not.
2. `reports a choice, and keeps it when the parent takes it`: accepting,
   `fireEvent.click(radio('Plain text'))`; `onchange` was called exactly once with `'text'`; Plain
   text is checked and Per row is not.
3. `snaps back and focuses the checked radio when the parent refuses`: refusing, the same click;
   `onchange` was called exactly once with `'text'`; Per row is checked, Plain text is not, and Per
   row has focus.
4. `focuses the checked radio through focus()`: `component.focus()`; Per row has focus.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/components/Segmented.test.ts`
Expected: FAIL with `Failed to resolve import "./Segmented.svelte" from "src/lib/components/Segmented.test.ts". Does the file exist?`.

- [ ] **Step 3: Write `Segmented.svelte`**

`<div role="radiogroup" aria-label={label} class="inline-flex">`; per option a `<label>` holding
`<input type="radio" class="sr-only" {name} value={option.value} checked={option.value === value} bind:this={inputs[i]} onchange={() => choose(option.value)} />{option.text}`.
The label's classes:
`btn btn-sm rounded-none border-base-content/55 not-first:-ms-px first:rounded-s-field last:rounded-e-field has-checked:btn-primary has-checked:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-base-content`
(the unchecked border is 3.95:1, M10). `choose(next)` calls `onchange(next)`, then sets
`inputs[i].checked = option.value === value` on every radio (a `checked={…}` attribute alone does
not snap back, M11 2), then calls `focus()` when `value !== next`. `inputs` is
`$state<HTMLInputElement[]>([])`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/components/Segmented.test.ts`
Expected: PASS, `Tests  4 passed (4)`. Deleting the `inputs[i].checked = …` line, or the
`focus()` call, makes test 3 fail (checked in the worktree).

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (45 files, 895 tests), and no `warnings while optimizing generated CSS`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/Segmented.svelte src/lib/components/Segmented.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: add the Segmented radio switch"
```

---

### Task 4: The Codes pane

**Files:**

- Create: `src/lib/components/CodesPane.svelte`
- Modify: `src/routes/+page.svelte` (the markup from the Editor field to the GS1 render-anyway
  hint, the file input and the file error, and the `ValidationList`; the script's editor, switch
  and file handlers), `src/routes/page.test.ts`

**Interfaces:**

- Consumes: `Setup`, `Editor` (Task 1); `Section`, `Hint` (Task 2); `Segmented` (Task 3); `Field`,
  `Note`, `FormatSelect`, `EccSelect`, `RowEditor`, `ValidationList`.
- Produces: `CodesPane.svelte`, props `{ setup: Setup }`.

- [ ] **Step 1: Change the page tests**

In `src/routes/page.test.ts` (each count is the number of places):

| Where                                            | Today                                                                                      | After                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:202`, `:222`, `:590`, `:978` (4)               | `getByLabelText('Load codes from a file')`                                                 | `getByLabelText('Upload file')`                                                                                                                                                     |
| `editor` helper, `:579`                          | `set(ui().getByRole('combobox', { name: 'Editor' }), value)`                               | `const EDITOR = { text: 'Plain text', rows: 'Per row' } as const;` and `editor = (value: keyof typeof EDITOR) => fireEvent.click(ui().getByRole('radio', { name: EDITOR[value] }))` |
| `:603 :650 :656 :680 :695 :714 :793` (7)         | `expect(ui().getByRole('combobox', { name: 'Editor' })).toHaveValue('text')`               | `expect(ui().getByRole('radio', { name: 'Plain text' })).toBeChecked()`                                                                                                             |
| `:610 :668 :692 :727` (4)                        | `… .toHaveValue('rows')`                                                                   | `expect(ui().getByRole('radio', { name: 'Per row' })).toBeChecked()`                                                                                                                |
| `:720`, after Switch anyway                      | `ui().getByRole('combobox', { name: 'Editor' })` `toHaveFocus()`                           | `ui().getByRole('radio', { name: 'Plain text' })` `toHaveFocus()`; the test's name ends `… returns focus to the Editor switch`                                                      |
| `:730`, after Cancel                             | the same                                                                                   | `ui().getByRole('radio', { name: 'Per row' })` `toHaveFocus()`                                                                                                                      |
| `:952`; `:959` and `:969`                        | `await set(screen.getByRole('combobox', { name: 'Editor' }), 'rows' \| 'text')`            | `await fireEvent.click(screen.getByRole('radio', { name: 'Per row' \| 'Plain text' }))`                                                                                             |
| `:668`, lossy switch                             | (new line after it)                                                                        | `expect(ui().getByRole('radio', { name: 'Per row' })).toHaveFocus();`                                                                                                               |
| `:627`, `turns the list into one row per code …` | `await editor('rows');`                                                                    | `ui().getByRole('radio', { name: 'Per row' }).focus();` before it; `await tick();` and `expect(ui().getByRole('radio', { name: 'Per row' })).toHaveFocus();` after it               |
| `:228`, file error                               | `expect(screen.getByText('Could not read file').textContent).toBe('Could not read file');` | `expect(screen.getByRole('alert').textContent).toBe('Could not read file');`                                                                                                        |

That is the spec's 17 Editor lines and 4 file-input lines (M6). Append three tests to
`describe('setup page')`, after `carries a non-default format into the Start URL`, each opening
`http://localhost/#codes=x&seed=0&fmt=gs1qr` unless said:

1. `names the Codes section, its code box and its controls by their visible text`: within
   `getByRole('region', { name: 'Codes' })`: `getByRole('heading', { level: 2, name: 'Codes' })`,
   `getByRole('textbox', { name: 'Codes' })` and `getByRole('radiogroup', { name: 'Editor' })` are
   there; `getByLabelText('Upload file')` has the attribute `accept` `.txt,.csv`; and (loss 5)
   `getByLabelText('Format')`, `getByLabelText('Error correction')` and
   `getByLabelText('Render GS1 data that fails validation')` are the combobox `Format`, the
   combobox `Error correction` and the checkbox of that name.
2. `puts each Plain text hint in a disclosure after the control it explains`: each element
   `toAppearBefore` the next: the radiogroup `Editor`, `getByText('What Per row adds')`, the
   combobox `Format`, `getByText('How to write GS1 data')`, the combobox `Error correction`, the
   checkbox `Render GS1 data that fails validation`, `getByText('What can never be rendered anyway')`,
   the textbox `Codes`.
3. `clears the file error when the code box is typed in` (default URL): a rejected upload through
   `getByLabelText('Upload file')` (as `:221-225` do it), `vi.waitFor` until
   `getByText('Could not read file')` is visible, then `fireEvent.input` on the textbox `Codes`
   with `036000291452`; `queryByText('Could not read file')` is `null`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/routes/page.test.ts`
Expected: FAIL, `Tests  25 failed | 48 passed (73)`.

- [ ] **Step 3: Write `CodesPane.svelte` and use it**

One `Section` titled `Codes` with `headingId="{uid}-codes"`, per _Components_ › `CodesPane`:

- `actions`: `<div class="flex flex-wrap items-center gap-2 max-sm:basis-full">` with the
  `Segmented` (`bind:this={editorSwitch}`, `name="{uid}-editor"`, `label="Editor"`, the options
  Plain text and Per row, `value={setup.editor}`, `onchange={onEditor}`), then
  `<label class="btn btn-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-base-content">Upload file<input type="file" class="sr-only" accept=".txt,.csv" onchange={onFile} /></label>`.
- Then, in order: `<Hint summary="What Per row adds">{EDITOR_HINT}</Hint>` (Plain text only; the
  constant moves here from the page); the lossy-switch note as today (`role="alert"`, Switch
  anyway, Cancel); the Format `Field` (`Format`, or `Format for new rows` in Per row) with
  `bind:value={setup.format}`; in Plain text and a GS1 format,
  `<Hint summary="How to write GS1 data">{GS1_HINT}</Hint>`; in Plain text and a format with
  levels, the Error correction `Field`; in Plain text and a GS1 format, the render-anyway
  checkbox's `Field` (its `aria-describedby="{uid}-lax-note"`) and
  `<Hint summary="What can never be rendered anyway" id="{uid}-lax-note">{LAX_NOTE}</Hint>`; in
  Plain text the code box (`aria-labelledby="{uid}-codes"`, no `aria-label`, `rows="8"`, the
  placeholder, `bind:value={setup.text}`, `oninput` clearing `setup.fileError`) and
  `<ValidationList entries={setup.entries} />`, in Per row
  `<RowEditor bind:rows={setup.rows} newRowFormat={setup.format} />`; last the file error,
  `<Note class="file-error" tone="error" role="alert" hidden={!setup.fileError}>`.
- Focus (`editorSwitch: Segmented<Editor> | undefined = $state()`): `onEditor(next)` awaits
  `tick()` and calls `editorSwitch?.focus()` when `setup.selectEditor(next)` is `'to-text'`; Switch
  anyway does the same when `setup.switchAnyway()` is `true`; Cancel calls `setup.cancelSwitch()`
  and then does it. After a switch to Per row nothing moves focus.
- `onFile` is Task 1's file handler, moved here.

In `+page.svelte`, replace the markup from the Editor `Field` through the render-anyway hint, the
file input, the file error and the `ValidationList` with `<CodesPane {setup} />` where the Editor
field was; the Playback, Dwell, Gap, Speed, Loop, rotation and skew markup stays in its
`settings-row` until Task 5. Delete the moved handlers and the imports they leave unused.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/routes/page.test.ts`
Expected: PASS, `Tests  73 passed (73)`.

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (45 files, 898 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/CodesPane.svelte src/routes/+page.svelte src/routes/page.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: gather the codes and their controls into the Codes pane"
```

---

### Task 5: The settings pane and the two-pane layout

**Files:**

- Create: `src/lib/components/SettingsPane.svelte`
- Modify: `src/routes/+page.svelte` (root element, layout, `<style>`), `src/styles.css` (append),
  `src/theme.test.ts` (append one test to `describe('overrides the tables rely on')`, `:224`),
  `src/routes/page.test.ts`
- Not committed: `probe.ts` and `probe-inject.html` in your session scratchpad

**Interfaces:**

- Consumes: `Setup` (Task 1); `Section`, `ValueSlider` (Task 2); `Segmented` (Task 3); `Field`,
  `Note`, `SecondsSlider`.
- Produces: `SettingsPane.svelte`, props `{ setup: Setup }`, its root carrying `settings-pane`; the
  page root `<main class="setup-page …">`; `src/styles.css`'s `.setup-page .range` rule; the
  scratch `probe.ts` that Tasks 6 and 11 reuse.

- [ ] **Step 1: Change the page tests**

In `describe('setup page: step playback')`:

- `playback` (`:418`) becomes `screen.getByRole('radiogroup', { name: 'Playback mode' })`; add
  `const mode = (name: 'Scroll' | 'Step') => fireEvent.click(within(playback()).getByRole('radio', { name }));`.
- `await set(playback(), 'step')` becomes `await mode('Step')` (7 places) and
  `await set(playback(), 'scroll')` becomes `await mode('Scroll')` (3 places).
- `:433-440` (`offers Scroll and Step …`): `within(playback()).getAllByRole('radio')` equals
  `[getByRole('radio', { name: 'Scroll' }), getByRole('radio', { name: 'Step' })]`, their values
  are `['scroll', 'step']`, and Scroll is checked. The two `toAppearBefore` lines stay.
- `:541`: `expect(playback()).toHaveValue('step')` becomes
  `expect(screen.getByRole('radio', { name: 'Step' })).toBeChecked()`.
- The slider queries keep their names (Speed, Dwell, Gap, Maximum rotation, Maximum skew).

In `describe('setup page: GS1 validation setting')`, `:911` and `:914`:
`getByRole('combobox', { name: 'Playback' })` becomes `getByRole('radiogroup', { name: 'Playback mode' })`.

Add two tests before `prefills Step and the dwell from a step link`:

1. `names the settings sections and their controls by their visible text` (`open()`): the regions
   `Codes`, `Playback` and `Distortion` appear in that order; within `Playback`, the radiogroup
   `Playback mode` is `playback()`, `getByLabelText('Speed')` is `speedSlider()` and
   `getByLabelText('Loop')` is the checkbox `Loop`; within `Distortion`, for `Random rotation` and
   `Random skew`, `getByLabelText(<toggle>)` is the checkbox of that name, and (loss 5)
   `getByLabelText('Maximum rotation')` and `getByLabelText('Maximum skew')` are the sliders of
   those names.
2. `shows each slider value beside it, and in words to a screen reader`
   (`open('http://localhost/#codes=036000291452&rot=1&rotmax=1&seed=0')`): `getByText('60 px/s')`
   is there and Speed's `aria-valuetext` is `60 pixels per second`; after
   `slide(speedSlider(), '120')`, `120 px/s` and `120 pixels per second`; `getByText('± 1°')` and
   Maximum rotation's `aria-valuetext` `1 degree` (_Questions_ 3); after sliding it to `25`,
   `± 25°` and `25 degrees`; `getByText('± 8°')` (Maximum skew at its default) and its
   `aria-valuetext` `8 degrees`.

Append to `src/theme.test.ts`, before `the setup page keeps a disabled Start recognizable`:
`it('styles.css darkens the setup page range tracks to 55%')`: `flat(read('./styles.css'))`
contains
`flat('.setup-page .range { --range-bg: color-mix(in oklab, var(--color-base-content) 55%, #0000); }')`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/routes/page.test.ts src/theme.test.ts`
Expected: FAIL; `page.test.ts` 11 failed of 75, `theme.test.ts` 1 failed of 29 (the new one):
`Tests  12 failed | 92 passed (104)`.

- [ ] **Step 3: Write `SettingsPane.svelte`**

Root: `<div class="settings-pane flex flex-col gap-6 self-start min-[900px]:[@media(min-height:50rem)]:sticky min-[900px]:[@media(min-height:50rem)]:top-6">`
(the number is pinned in Step 8). Then, per _Components_ › `SettingsPane`:

- `<Section title="Playback">`: the `Segmented` (`name="{uid}-mode"`, `label="Playback mode"`,
  options Scroll and Step, `value={setup.mode}`, `onchange={(next) => (setup.mode = next)}`); in
  Step, the Dwell and Gap `Field`s with today's `SecondsSlider`s, each followed by its warning
  (`flash-note` under 330 ms; `dup-hint` while `gapMs < 1000` and `dupPairs` is not empty); in
  Scroll,
  ``<ValueSlider label="Speed" bind:value={setup.speedPxPerSec} min={10} max={5000} step={5} text={(v) => `${v} px/s`} valuetext={(v) => `${v} pixels per second`} />``;
  then the Loop `Field` and toggle.
- `<Section title="Distortion">`: `<Field label="Random rotation">` around a toggle with no
  `aria-label`, then a `ValueSlider` `Maximum rotation` (1 to 30, step 1,
  `disabled={!setup.rotate}`, `text={degrees}`, `valuetext={degreesText}`); the same for `Random
skew` and `Maximum skew`. ``degrees = (v) => `± ${v}°` `` and
  ``degreesText = (v) => (v === 1 ? '1 degree' : `${v} degrees`)``.

- [ ] **Step 4: Lay the page out**

- `+page.svelte`'s markup becomes
  `<main class="setup-page mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pt-6 max-sm:px-4">`
  holding the `h1` (classes unchanged), then
  `<div class="grid gap-6 min-[900px]:grid-cols-[1.4fr_1fr]"><CodesPane {setup} /><SettingsPane {setup} /></div>`,
  then `ShareLink` and Start as they are today (Task 6 replaces both). Delete the `.setup` and
  `.settings-row` rules; add `.setup-page { padding-bottom: 1.5rem; }` (Task 6 replaces it); keep
  `.start:disabled`. Delete the imports the moved markup leaves unused.
- Append to `src/styles.css`, after the placeholder rule:

```css
/* The setup page's range tracks at 3.95:1 (daisyUI draws them at currentColor 10%). The play
   overlay's ranges are left to spec 3. */
.setup-page .range {
	--range-bg: color-mix(in oklab, var(--color-base-content) 55%, #0000);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/routes/page.test.ts src/theme.test.ts`
Expected: PASS, `Tests  104 passed (104)`.

- [ ] **Step 6: Run the whole suite**

Expected: as _Counts_ (45 files, 901 tests).

- [ ] **Step 7: Write the probe script in your scratchpad**

`probe.ts`, run by Node 24, and `probe-inject.html` beside it. Usage:
`node <scratchpad>/probe.ts <dist> <W> <H> <shot.png> '<path?query#fragment>'`.

- It serves `<dist>` on `127.0.0.1` at a free port, mapping paths with `resolveRoute`, imported
  from the repository's `scripts/stage-check.ts` by absolute path, and injects
  `probe-inject.html` before `</head>` of every HTML file.
- It answers `POST /__probe` by keeping the body.
- It runs
  `firefox --headless --no-remote --profile <fresh mkdtemp dir> --window-size=W,H --screenshot <absolute shot.png> <url>`,
  spawned `detached`, with `MOZ_HEADLESS_WIDTH` and `MOZ_HEADLESS_HEIGHT` set to W and H (as
  `stage-check` does). It waits for Firefox to exit (60 s timeout, then `SIGKILL` to its process
  group), then up to 3 s for the beacon. It deletes the profile and prints one line,
  `{"w":…,"h":…,"beacon":<the beacon's JSON, or "UNVERIFIED: no beacon">}`. Firefox resolves a
  relative screenshot path elsewhere, so pass an absolute one.
- The injected script reads `?probe=<name>`, waits with a `MutationObserver` (`childList`,
  `subtree`, `attributes`) until the probe's target exists, then, one `requestAnimationFrame`
  later, sends `navigator.sendBeacon('/__probe', JSON.stringify({ probe, innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, …measured }))`.
  The probe `pane` waits for `.settings-pane .dup-hint` and `.settings-pane .flash-note` and
  measures `pane`, the `.settings-pane`'s `getBoundingClientRect().height`.
- Each Firefox run takes 20 to 60 s here; run a batch in the background.

- [ ] **Step 8: Measure the tallest pane and pin the query**

Run: `npm run build`, then the probe at 900×1000 and at 1280×1000 for each of
`/scandible/?probe=pane#codes=a%0Ab%0Ab&fmt=code128&mode=step&dwell=250&seed=0` and
`/scandible/?probe=pane#codes=c1%0Ac2%0Ac3%0Ac4%0Ac5%0Ac6%0Ac7%0Ac8%0Ac9%0Ax%0Ax%0Ay%0Ay%0Az%0Az&fmt=code128&mode=step&dwell=250&seed=0`
(Step mode with the flash warning and the duplicate warning, short and long: the second names
codes 10 and 11 and "2 more neighboring pairs").
Expected: four beacons, each with `innerWidth` equal to W. Measured here: `pane` 900 and 852 for
the short deck, 924 and 852 for the long one, so the tallest is 924 px at 900 px wide (the
narrowest two-pane width wraps the most).

Pin `ceil((tallest + 24 + 56) / 16)` rem (the `top-6` offset and the 3.5 rem bar): measured,
`ceil(1004 / 16)` = **63**. Replace both `50rem` in `SettingsPane`'s root with `63rem` (or the
number you measured; record it). A missing beacon is UNVERIFIED: do not pin a guess.

Run: `npm run build && grep -o 'min-height:63rem' dist/_app/immutable/assets/*.css | sort -u`
Expected: one line ending in `min-height:63rem`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/components/SettingsPane.svelte src/routes/+page.svelte src/styles.css src/theme.test.ts src/routes/page.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: lay the setup page out as Codes beside Playback and Distortion"
```

---

### Task 6: The action bar and the Share panel

**Files:**

- Create: `src/lib/components/ActionBar.svelte`, `src/lib/components/SharePanel.svelte`
- Move: `git mv src/lib/components/ShareLink.test.ts src/lib/components/SharePanel.test.ts`, then
  rewrite it
- Delete: `src/lib/components/ShareLink.svelte`
- Modify: `src/routes/+page.svelte` (script, markup, `<style>`), `src/routes/page.test.ts`,
  `src/colors.test.ts:14` and `:122`, `src/theme.test.ts:240`

**Interfaces:**

- Consumes: `Setup` (Task 1); `Field`, `Note`; `buildQrSvg`, `qrStatus`, `QR_CAPACITY_BYTES`,
  `QrEcc`, `QrStatus` (`$lib/qr`).
- Produces:

```ts
// ActionBar.svelte: props { setup: Setup }; owns `open` and `ecc: QrEcc = $state('M')`
// SharePanel.svelte:
interface SharePanelProps {
	id: string; // the region's id, which Share's aria-controls names
	class?: string; // the bar places the panel
	hash: string; // the live share fragment
	ecc: QrEcc; // $bindable: the QR level, which the bar keeps while the page is open
	onclose: () => void;
}
```

- [ ] **Step 1: Write `SharePanel.test.ts`**

After the `git mv`, keep the file's constants and helpers (`SETTINGS`, `hashOf`, `liveUrl`, `n`,
`DENSE`, `tooLongAt`, `tooLong`, `status`, `qrImage`) and add
`open = (hash, onclose = vi.fn()) => ({ onclose, ...render(SharePanel, { id: 'share', hash, ecc: 'M', onclose }) })`,
`field = () => screen.getByRole('textbox', { name: 'Share link address' })`, and `setLevel` on the
combobox `QR error correction`. Its 16 tests, against `ShareLink.test.ts`'s 16:

| `ShareLink` test                                           | `SharePanel` test and what changes                                                                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labels the button "Share link"`                           | `is a region named Share by its heading, closed by its Close button`: the region `Share` has `id` `share` and a heading `Share`; clicking its button `Close` calls `onclose` once                           |
| `shows the live URL before any click`                      | `shows the live link in the Share link address field, read-only`: `getByLabelText('Share link address')` is `field()` (loss 5); its value is the live URL; it has `readonly`; it appears before `Copy link` |
| `renders an empty, always-present status …`                | unchanged                                                                                                                                                                                                   |
| `offers the share levels L, M, Q, H with M selected`       | `offers the QR levels L, M, Q, H with the given level selected`: combobox `QR error correction`; `getByLabelText('QR error correction')` is it (loss 5)                                                     |
| `renders the QR code image on click`                       | `draws the QR code as soon as it opens`: visible and not empty, with no click                                                                                                                               |
| `shows the dense text live and still renders the QR`       | `… still draws the QR`, with no click                                                                                                                                                                       |
| `names level L when it would hold the link, …`             | as before, plus: the QR is not visible at M and visible at L                                                                                                                                                |
| `uses the general too-long text beyond level L's capacity` | unchanged                                                                                                                                                                                                   |
| `copies a too-long link on click but renders no QR`        | `copies a too-long link on Copy link but draws no QR`                                                                                                                                                       |
| `clears a rendered QR when the level changes`              | `redraws the QR when the level changes`: `before = qrImage().innerHTML`; after `setLevel('H')` the QR is visible and its `innerHTML` is not `before`                                                        |
| `clears a rendered QR when the hash prop changes`          | `redraws the QR when the link changes`: the same through `rerender({ hash: encodeShareUrl(['012345678905'], SETTINGS) })`; the status is `''`                                                               |
| copy confirmation: the four tests                          | the same, clicking `Copy link`; `FAILED` is `Could not copy. Select the link address and copy it.`; the first also checks the status is `''` before the click                                               |
| `gives the link field an accessible name`                  | `clears the copy status when the link changes` (Review Focus 3): after `Link copied.`, `rerender({ hash: hashOf(2) })`; the copy status is `''`. (The old test's check is in the second row.)               |

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/components/SharePanel.test.ts`
Expected: FAIL with `Failed to resolve import "./SharePanel.svelte" from "src/lib/components/SharePanel.test.ts". Does the file exist?`.

- [ ] **Step 3: Change the page, colour and theme tests**

In `src/routes/page.test.ts`:

- Import `createEvent` from `@testing-library/svelte` beside the others.
- `describe('setup page')`: `getByRole('button', { name: 'Share link' })` becomes
  `getByRole('button', { name: 'Share' })` (8 places) and `getByRole('textbox', { name: 'Share link' })`
  becomes `getByRole('textbox', { name: 'Share link address' })` (5 places). The test at `:112`
  is renamed `builds a share URL into the link field of the Share panel`.
- The three QR tests at `:166`, `:179` and `:188` invert, because the QR is drawn on open. Each is
  renamed `redraws the QR when the code list is edited | a setting is changed | the format is switched while the panel is open`;
  each opens the panel, takes `const qr = screen.getByLabelText('QR code for the share link')` and
  `const before = qr.innerHTML`, makes its change as today, then asserts `qr` is visible and
  `qr.innerHTML` is not `before`.
- In the per-row and GS1 describes, `share` reads
  `getByRole('textbox', { name: 'Share link address' })`, and beside it
  `const openShare = () => fireEvent.click(<ui() | screen>.getByRole('button', { name: 'Share' }));`.
  `await openShare();` goes right after `open(…)` in the seven tests that call `share()`: `:733`,
  `:814`, `:838`, `:852`, `:927`, `:942`, `:950`.

Add five tests to `describe('setup page')`, before Task 4's
`names the Codes section, its code box and its controls by their visible text` (default URL; `share`
is `getByRole('button', { name: 'Share' })`):

1. `counts the ready and skipped codes in the bar, before Share and Start`: `getByText('0 codes ready')`
   appears before `share`; after typing `036000291452`, `1 code ready`; after
   `036000291452\n\nbad\n012345678905`, `2 codes ready · 1 skipped` and Start is enabled; after
   `bad`, `0 codes ready · 1 skipped` and Start is disabled.
2. `opens the Share panel from the bar, between Share and Start, and closes it again`: `share` has
   `aria-expanded` `false` and no `aria-controls`, and `queryByRole('region', { name: 'Share' })`
   is `null`; after a click, `aria-expanded` is `true`, `aria-controls` is the region's `id`,
   `share` appears before the region and the region before Start; a second click removes the
   region and sets `aria-expanded` `false`.
3. `closes the panel on Escape from anywhere, returning focus to Share only from the panel` (Review
   Focus 1): open; `getByRole('button', { name: 'Copy link' }).focus()`;
   `fireEvent.keyDown(document, { key: 'Escape' })`; the region is gone and `share` has focus.
   Open again; focus the textbox `Codes`; `fireEvent.keyDown(<that textbox>, { key: 'Escape' })`;
   the region is gone and the textbox keeps focus.
4. `keeps the panel open on an Escape that was already handled` (Review Focus 2): open;
   `const escape = createEvent.keyDown(document, { key: 'Escape', cancelable: true }); escape.preventDefault(); await fireEvent(document, escape);`;
   the region is still there.
5. `closes the panel with Close, focusing Share, and keeps the QR level for the next opening`
   (Review Focus 5): open; set `QR error correction` to `H`; click the checkbox `Loop`; the region
   is still there; focus `Close`, click it; the region is gone and `share` has focus; open again;
   `QR error correction` has the value `H`.

In `src/colors.test.ts`: `SHARE` (`:14`) becomes `'src/lib/components/SharePanel.svelte'`, and the
expected list (`:122`) names `'src/lib/components/SharePanel.svelte: .qr-code: #fff'`. In
`src/theme.test.ts:240`, `read('./routes/+page.svelte')` becomes
`read('./lib/components/ActionBar.svelte')`.

- [ ] **Step 4: Run them to verify they fail**

Run: `npx vitest run src/routes/page.test.ts src/colors.test.ts src/theme.test.ts`
Expected: FAIL, `Tests  21 failed | 104 passed (125)`: 19 of `page.test.ts`'s 80; in
`colors.test.ts`, `finds no raw color outside the three allowed white backgrounds`
(`ShareLink.svelte`'s white is no longer allowed); in `theme.test.ts`,
`the setup page keeps a disabled Start recognizable`, with `ENOENT` for `ActionBar.svelte`.

- [ ] **Step 5: Write `SharePanel.svelte`**

From `ShareLink.svelte`, per _Components_ › `SharePanel`:
`<section {id} aria-labelledby="{uid}-heading" class={['flex flex-col gap-3 rounded-box border border-base-300 bg-base-100 p-4 shadow-lg', className]}>`,
holding, in order: a row with `<h2 id="{uid}-heading" class="text-lg font-semibold">Share</h2>` and
`<button type="button" class="btn btn-sm btn-square btn-ghost" aria-label="Close" onclick={onclose}>✕</button>`;
`<label for="{uid}-link">Share link address</label>` above a row with the read-only
`<input id="{uid}-link" type="text" class="input input-sm min-w-0 flex-1 font-mono" readonly value={liveUrl} />`
and `<button type="button" class="btn btn-sm" onclick={copy}>Copy link</button>`; the copy status
`<span role="status" aria-label="Copy status">{copyStatus}</span>`, always rendered;
`<Field label="QR error correction">` with today's select and options, `bind:value={ecc}`; the
`.qr-code` image as today (`role="img"`, `hidden={!qrSvg}`, its label, the `{@html}` with its
disable comment); the QR status `Note` as today without `mt-1`. The `<style>` keeps `.qr-code` and
`.qr-code :global(svg)`.

`qrSvg` is `$derived(status.kind === 'too-long' ? '' : (buildQrSvg(liveUrl, ecc) ?? ''))`.
`copyStatus` is `$derived.by(() => { void liveUrl; void ecc; return ''; })`, which `copy()`
assigns `COPY_OK` or `COPY_FAILED` as `share()` does today (it no longer draws the QR).

- [ ] **Step 6: Run its tests to verify they pass**

Run: `npx vitest run src/lib/components/SharePanel.test.ts`
Expected: PASS, `Tests  16 passed (16)`.

- [ ] **Step 7: Write `ActionBar.svelte` and lay out the page**

`ActionBar.svelte`, per _Components_ › `ActionBar`:

- Root
  `<div class="action-bar fixed inset-x-0 bottom-0 z-10 h-[calc(var(--bar-height)+env(safe-area-inset-bottom))] border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)] [@media(max-height:30rem)]:static" bind:this={bar}>`
  (the whole box, border included, is the bar's height: _Plan decisions_), holding
  `<div class="relative mx-auto flex h-full max-w-[1200px] items-center gap-2 px-6 max-sm:px-4">`
  with, in DOM order: `<p class="min-w-0 flex-1 text-sm">{count}</p>`; the Share button
  (`class="btn shrink-0"`, `aria-expanded={open}`, ``aria-controls={open ? `${uid}-share` : undefined}``,
  `bind:this={shareButton}`, toggling `open`); `{#if open}<SharePanel id="{uid}-share" … />{/if}`;
  Start (`class="start btn shrink-0 btn-primary"`, `disabled={!setup.canStart}`, `start()` moved
  from the page with its `eslint-disable-next-line` comment).
- The panel's `class`:
  `absolute right-6 bottom-full mb-2 max-h-[calc(100dvh-var(--bar-height)-env(safe-area-inset-bottom)-1rem)] w-[min(24rem,100vw-2rem)] overflow-y-auto max-sm:right-4 max-sm:max-h-[60dvh]`,
  with `hash={setup.shareHash}`, `bind:ecc` and `onclose={close}`.
- `count` is `$derived`:
  `` `${ready} ${ready === 1 ? 'code' : 'codes'} ready` + (skipped > 0 ? ` · ${skipped} skipped` : '') ``
  over `setup.counts`.
- `close()` notes whether `document.activeElement` is inside `bar` (the panel is), sets
  `open = false`, and then focuses Share only if it was. `<svelte:document {onkeydown} />` calls
  `close()` when `open && e.key === 'Escape' && !e.defaultPrevented`. Clicks elsewhere close
  nothing.
- The `.start:disabled` rule and its comment move here from `+page.svelte`, unchanged.

`+page.svelte`: replace `ShareLink` and Start with `<ActionBar {setup} />` as `<main>`'s last
child; drop `start()`, the `goto` and `resolve` imports and the `.start:disabled` rule; and give the
`<style>`:

```css
/* The pinned bar's height, which the page's bottom padding and the root's scroll padding keep
   clear, so a control reached by Tab is never hidden behind the bar. */
:global(html:has(.setup-page)) {
	--bar-height: 3.5rem;
	scroll-padding-bottom: calc(var(--bar-height) + env(safe-area-inset-bottom));
}
.setup-page {
	padding-bottom: calc(var(--bar-height) + env(safe-area-inset-bottom) + 1.5rem);
}
@media (max-width: 639.98px) {
	:global(html:has(.setup-page)) {
		--bar-height: 4.5rem;
	}
}
/* On short windows the bar is static at the end of the page: nothing to keep clear. */
@media (max-height: 30rem) {
	:global(html:has(.setup-page)) {
		scroll-padding-bottom: 0;
	}
	.setup-page {
		padding-bottom: 1.5rem;
	}
}
```

Then `git rm src/lib/components/ShareLink.svelte`.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/routes/page.test.ts src/theme.test.ts src/colors.test.ts src/lib/components/SharePanel.test.ts`
Expected: PASS, `Tests  141 passed (141)`.

- [ ] **Step 9: Run the whole suite and the retirement check**

Expected: as _Counts_ (45 files, 906 tests). Then
Run: `grep -rn ShareLink src; echo "exit $?"`
Expected: only `exit 1` (_Done means_ 6).

- [ ] **Step 10: Measure the bar**

Add the probe `bar` to `probe-inject.html`: it waits for `.action-bar .start` and reports
`barHeight` (the bar's box), `row` (`height`, `scrollHeight`, `clientHeight` of the bar's first
child), `count` (`text`, `height`, `lines` = height ÷ the `<p>`'s computed `line-height`),
`buttonsOneLine` (Share's and Start's tops equal) and `position` (the bar's computed `position`).
Build, then run it on
`/scandible/?probe=bar#codes=` followed by `036000291452` twelve times and `bad` three times,
joined with `%0A`, then `&seed=0` (the count `12 codes ready · 3 skipped`), at 390×844, 320×568,
640×900, 1280×900 and 1280×400.
Expected, measured here:

| Window   | `barHeight` | count lines | `buttonsOneLine` | `position` | row overflows (`scrollHeight > clientHeight`) |
| -------- | ----------- | ----------- | ---------------- | ---------- | --------------------------------------------- |
| 390×844  | 72          | 1           | true             | fixed      | no                                            |
| 320×568  | 72          | 2           | true             | fixed      | no                                            |
| 640×900  | 56          | 1           | true             | fixed      | no                                            |
| 1280×900 | 56          | 1           | true             | fixed      | no                                            |
| 1280×400 | 56          | 1           | true             | static     | no                                            |

`--bar-height` stays 3.5 rem and 4.5 rem when every row matches: no overflow, Share and Start on
one line, the count at most two lines (_Visual review_ check 6). Otherwise raise the failing
width's value to the next 0.25 rem that holds the content with 8 px above and below, rebuild,
re-measure and record it. A missing beacon is UNVERIFIED.

- [ ] **Step 11: Commit**

```bash
git add src/lib/components/ActionBar.svelte src/lib/components/SharePanel.svelte src/lib/components/SharePanel.test.ts src/routes/+page.svelte src/routes/page.test.ts src/colors.test.ts src/theme.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: pin the count, Share and Start to a bar, and open Share as a panel"
```

`git status --short` then prints nothing (the `git mv` and `git rm` are staged with it).

---

### Task 7: The row editor's layout A

**Files:**

- Modify: `src/lib/components/RowEditor.svelte` (markup `:60-153`, `<style>` `:155-199`),
  `src/lib/components/RowEditor.svelte.test.ts`, `src/routes/page.test.ts:894`

**Interfaces:**

- Consumes: `Hint` (Task 2).
- Produces: nothing other tasks use. The `row`, `row-up`, `row-down` and `row-payload` classes
  stay: `move()` and `remove()` find controls by them.

- [ ] **Step 1: Change the tests**

In `RowEditor.svelte.test.ts`:

- `Render code N if invalid` becomes `Render if invalid, code N` everywhere (11 places; the
  `aria-label` list at `:241` included).
- `:246-254` (the third row's control order) becomes: the textbox `Code 3`, `Move up, code 3`,
  `Move down, code 3`, `Delete code 3`, `Format of code 3`, `Error correction of code 3`, the
  checkbox `Render if invalid, code 3`.
- `:347-353` (loss 3): scope to `const code = within(ui().getByRole('group', { name: 'Code 1' }))`;
  take the breakdown as `code.getByLabelText('Code 1 breakdown: 3 Application Identifiers')` and
  the verdict as today's `getByText(…)` within `code`; keep the `queryByLabelText(BREAKDOWN)`
  check inside the verdict; then `Delete code 1`, `Format of code 1` and the verdict each
  `toAppearBefore` the breakdown.

Add, before `describes each payload by the verdict in its own row`:

1. `holds each row in a group named "Code n" inside its list item`: mapping `rowItems()` to
   ``within(item).getByRole('group', { name: `Code ${i + 1}` })`` gives 3.
2. `lays a row out as number, payload and buttons, then its settings, then its verdict`: within the
   group `Code 2`, each appears before the next: `getByText('2')`, the textbox `Code 2`,
   `Move up, code 2`, `Move down, code 2`, `Delete code 2`, `Format of code 2`,
   `Error correction of code 2`, `getByText('✓ · 25×25 modules · 11 bytes')`.
3. `keeps the icon buttons named, with a tooltip of the action`: `Move up, code 2`,
   `Move down, code 2` and `Delete code 2` have the accessible descriptions `Move up`,
   `Move down` and `Delete` (from `title`).

And before `shows the GS1 hint and lax note for a GS1 row …`:

4. `puts each hint in a disclosure after Add code, with its summary phrase`:
   ``mount(deck(`gs1128_${S}`, 'qr-L_' + X2000), 'upc')``; each appears before the next: the
   button `Add code`, `How rows work`, `How to write GS1 data`, `What can never be rendered anyway`,
   `What the arrow and GS mark mean`, `If dense codes don't scan`.

The paragraph list at `:301-329` stays: each hint's text is still one paragraph (measured).

In `page.test.ts:894`: `` name: `Render code ${i + 1} if invalid` `` becomes
`` name: `Render if invalid, code ${i + 1}` ``.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts`
Expected: FAIL, `Tests  9 failed | 93 passed (102)` (7 in the row editor, 2 in the page).

- [ ] **Step 3: Rewrite the markup**

Per _Components_ › `RowEditor.svelte`. Per row, after `entry` and `opt`, one `{@const}` per state
(handoff F5 c): `valid = entry?.valid === true && entry.lint === undefined`,
`lenient = entry?.lint !== undefined`, `invalid = entry?.valid === false`. The `<li class="row border-b border-base-300 pb-3">`
holds `<div class="flex flex-col gap-2" role="group" aria-label="Code {i + 1}">` with:

- line 1, `flex items-start gap-2`: the number (`row-number w-6 shrink-0 pt-1 text-end text-base-content/70`),
  the payload (`row-payload textarea min-h-0 min-w-0 flex-1 font-mono`, its `aria-label` and
  `aria-describedby` as today), then `<div class="flex shrink-0 gap-1">` with three
  `btn btn-sm btn-square` buttons: `row-up` (`title="Move up"`), `row-down` (`title="Move down"`)
  and Delete (`ms-3 btn-ghost text-error`, `title="Delete"`), their `aria-label`s, `disabled` and
  handlers as today. Each shows
  `<svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path {d} /></svg>`
  from one snippet `icon(d)`, with `M12 19V5M5 12l7-7 7 7`, `M12 5v14M5 12l7 7 7-7` and
  `M6 6l12 12M18 6L6 18`;
- line 2, `flex flex-wrap items-center gap-2 ps-8`: the Format select, the Error correction select
  (if `opt`), and for a GS1 format
  `<label class="flex items-center gap-2"><input type="checkbox" class="checkbox checkbox-sm" aria-label="Render if invalid, code {i + 1}" bind:checked={row.lax} /> Render if invalid</label>`;
- line 3: the verdict span (`row-verdict ps-8`, `class:valid` … and `class:text-success={valid}` …
  from the three constants, its `id` and text as today);
- line 4: `{#if entry?.gs1}<div class="ps-8"><Gs1Breakdown … /></div>{/if}`.

After the list: Add code (`row-add btn btn-sm self-start`), `<Hint summary="How rows work">`,
then under today's conditions `How to write GS1 data` (`GS1_HINT`),
`What can never be rendered anyway` (`LAX_NOTE`), `What the arrow and GS mark mean` (`SCAN_HINT`)
and `If dense codes don't scan` (`DENSE_HINT`), each a `Hint`; `Note` is no longer imported. In
the `<style>`, delete `.row`, `.row-main`, `.row-payload`'s flex rule, `.row-controls` and
`.row-delete`; keep `.row-editor`, the `@supports (field-sizing: content)` rule and `.row-verdict`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: the command of Step 2.
Expected: PASS, `Tests  102 passed (102)`.

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (45 files, 910 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/RowEditor.svelte src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: give each per-row code a fixed layout in a named group"
```

---

### Task 8: The verdict words, and the validation list's hints

**Files:**

- Modify: `src/lib/verdict.ts:44`, `:64-73`; `src/lib/components/ValidationList.svelte:4`,
  `:29-34`; `src/lib/verdict.test.ts`, `src/lib/components/ValidationList.test.ts`,
  `src/lib/components/RowEditor.svelte.test.ts`, `src/routes/page.test.ts`

**Interfaces:**

- Consumes: `Hint` (Task 2).
- Produces: `verdictText(entry: CodeEntry): string`, same signature, with the words of _Copy_.

- [ ] **Step 1: Change the expected verdicts**

In those four test files every ✓ is a verdict's, and every ✗ not followed by `invalid` starts a
reason. So:

Run: `perl -pi -e 's/✓/✓ valid/g; s/✗ (?!invalid)/✗ invalid: /g' src/lib/verdict.test.ts src/lib/components/ValidationList.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts && npx prettier --write src/lib/verdict.test.ts src/lib/components/ValidationList.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts && git diff --numstat`
Expected, as `<added> <deleted> <file>`: `48 42 src/lib/verdict.test.ts`,
`20 19 src/lib/components/ValidationList.test.ts`, `9 9 src/lib/components/RowEditor.svelte.test.ts`
and `11 11 src/routes/page.test.ts` (Prettier re-wraps the few lines the words lengthen). Then read
the diff: ` ✗ invalid` with no reason (`verdict.test.ts:72`, `:140`,
`:150`, `:245` and their peers) is untouched, and nothing reads `valid valid` or `invalid: invalid`.

Add to `describe('ValidationList GS1 rows')` in `ValidationList.test.ts`, before
`shows no scan hint without a GS1 entry …`:
`it('puts the scan and dense hints in disclosures after the list, each with its summary phrase')`:
render `[...parseCodeList(S, 'gs1128'), qrDense]`; the list `Validation results`,
`getByText('What the arrow and GS mark mean')` and `getByText("If dense codes don't scan")` appear
in that order; `getByText(SCAN_HINT).textContent` is `SCAN_HINT` and `getByText(DENSE_HINT).textContent`
is `DENSE_HINT`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/verdict.test.ts src/lib/components/ValidationList.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts`
Expected: FAIL, `Tests  56 failed | 97 passed (153)`.

- [ ] **Step 3: Add the words**

In `verdict.ts`: `gs1Line`'s `' ✓'` (`:44`) becomes `' ✓ valid'`; in `verdictText`, `` ` ✓ · ${…}` ``
(`:64`) becomes `` ` ✓ valid · ${…}` ``, `` ` ✓ → ${entry.encoded}` `` and `' ✓'` (`:66-67`)
become `` ` ✓ valid → ${entry.encoded}` `` and `' ✓ valid'`, both too-long forms (`:70-71`) start
`` ` ✗ invalid: too long for `` and the message form (`:73`) starts `` ` ✗ invalid: ${…}` ``.
`` ` ✗ invalid${override(entry)}` `` (`:74`) stays.

In `ValidationList.svelte`, import `Hint` instead of `Note`;
`<Note class="scan-hint">{SCAN_HINT}</Note>` becomes
`<Hint summary="What the arrow and GS mark mean">{SCAN_HINT}</Hint>` and the dense one
`<Hint summary="If dense codes don't scan">{DENSE_HINT}</Hint>`, under the same conditions.

- [ ] **Step 4: Run the tests to verify they pass**

Run: the command of Step 2.
Expected: PASS, `Tests  153 passed (153)`.

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (45 files, 911 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/verdict.ts src/lib/components/ValidationList.svelte src/lib/verdict.test.ts src/lib/components/ValidationList.test.ts src/lib/components/RowEditor.svelte.test.ts src/routes/page.test.ts
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "feat: say valid or invalid after each verdict's mark"
```

---

### Task 9: The color guard

**Files:**

- Modify: `src/colors.test.ts` (`:22-26` the patterns, `:58-62` the script and markup scans, the
  `it.each` table ending at `:109`), `CONTRIBUTING.md:38-40`

**Interfaces:**

- Consumes: nothing new.
- Produces: the widened `scanColors`, used only in this file.

- [ ] **Step 1: Add the failing fixture rows**

Append to the `scanColors` `it.each` table, after its last row:

| path    | source                                                                                                                                                                           | expected                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `OTHER` | `'<p class="text-red-600">x</p>'`                                                                                                                                                | `[OTHER + ': markup: text-red-600']`                                    |
| `OTHER` | `'<style>.x { color: oklch(50% 0.1 30) }</style>'`                                                                                                                               | `[OTHER + ': .x: oklch(50% 0.1 30)']`                                   |
| `OTHER` | `'<p class="hover:bg-blue-500/50 border-x-white">x</p>'`                                                                                                                         | `[OTHER + ': markup: bg-blue-500', OTHER + ': markup: border-x-white']` |
| `OTHER` | `"<script>const tone = 'text-rose-700';</script>"`                                                                                                                               | `[OTHER + ': script: text-rose-700']`                                   |
| `OTHER` | `'<p class="text-[lab(50%_40_30)]">x</p>'`                                                                                                                                       | `[OTHER + ': markup: lab(50%_40_30)']`                                  |
| `OTHER` | `'<p class="bg-neutral/85 text-neutral-content">x</p><style>.a { color: color-mix(in oklab, var(--color-base-content) 55%, transparent); border-color: currentColor; }</style>'` | `[]`                                                                    |

The first two are the spec's (_Styling_); the last guards daisyUI's names, `color-mix(` and
`currentColor` against false positives.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/colors.test.ts`
Expected: FAIL, `Tests  5 failed | 17 passed (22)`: the first five new rows fail, the sixth passes.

- [ ] **Step 3: Widen the guard**

- `const FUNCTIONS = 'rgba?|hsla?|oklch|oklab|lab|lch|hwb|color';` and build `COLOR` and
  `ARBITRARY_COLOR` from it with `new RegExp(…, 'gi')`, keeping today's hex parts and lookbehind.
- Add, with a comment that it has no trailing boundary so `text-red-600/50` is caught, the spec's
  pattern with a whole-class lookbehind:

```ts
const PALETTE =
	/(?<![\w-])(?:text|bg|border(?:-[xytrbls])?|ring|ring-offset|inset-ring|outline|fill|stroke|from|via|to|accent|caret|decoration|divide|placeholder|shadow|inset-shadow|text-shadow)-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|black|white)/g;
```

- In `scanColors`, add each `PALETTE` match in a `<script>` as `script` and in the markup as
  `markup` (the matched class is the reported text).
- Update the comment above `COLOR` to name the functions.

In `CONTRIBUTING.md` _Styling_, the sentence starting `` `src/colors.test.ts` fails on a hex, ``
becomes: `` `src/colors.test.ts` fails on a raw color in a `.svelte` file: a hex color, a color
function (`rgb()`, `hsl()`, `oklch()`, `oklab()`, `lab()`, `lch()`, `hwb()` or `color()`), or a
Tailwind palette class such as `text-red-600`, `text-red-600/50` or `bg-white`. It does not see
named colors in arbitrary values, such as `bg-[red]`, so review for those. `` (wrapped at 100).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/colors.test.ts`
Expected: PASS, `Tests  22 passed (22)`, including both real-file tests: no file in `src/` holds a
palette class or a new color function.

- [ ] **Step 5: Run the whole suite**

Expected: as _Counts_ (45 files, 917 tests).

- [ ] **Step 6: Commit**

```bash
git add src/colors.test.ts CONTRIBUTING.md
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "test: flag palette classes and modern color functions in the color guard"
```

---

### Task 10: Documentation

**Files:**

- Modify: `docs/guide.md` (`:25-26`, `:48-53`, `:71`, `:117`, `:251`, `:257`, `:314-318`),
  `README.md:19`, `CONTRIBUTING.md` (_Styling_'s first paragraph, `:29-32`)

**Interfaces:**

- Consumes: the finished behavior of Tasks 1 to 9. No code, no tests.

- [ ] **Step 1: The guide**

Prettier keeps prose lines as written, so rewrap each changed paragraph at 100 columns by hand.

- `:25-26`: `with the file picker under the box.` becomes
  `with **Upload file**, at the top of the **Codes** section.`
- `:71`: `The **Editor** select above the code box chooses` becomes
  `The **Editor** switch at the top of the **Codes** section chooses`.
- `:117`: `The **Playback** select chooses` becomes `The **Playback mode** switch chooses`.
- `:251` and `:257` (_Questions_ 2): the two examples become `✗ invalid: (01) GTIN: Bad checksum`
  and `✓ valid · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42`.
- `:48-53` (_Questions_ 2) become:

```markdown
Under the code box, the list shows one line per code, with a verdict:

- **✓ valid** means the code will play. When the encoder adds a check digit or normalizes the
  input, the line shows the exact value the scanner will read after an arrow: `✓ valid → …`.
- **✗ invalid** means the code is skipped. The reason follows when there is one, for example
  `✗ invalid: too long for QR Code (level H)`.
```

- `:314-318` become:

```markdown
**Share**, in the bar at the bottom of the window, opens the Share panel. The panel shows a URL
that reproduces the exact list and settings, and the same link as a QR code, so a phone can open
it. While the panel is open, the link and the QR code follow every change you make. **Copy link**
copies the URL. Close the panel with ✕ or Escape.

- **QR error correction** sets the QR code's level: L (most capacity), M (the default), Q or H.
```

The status-line bullet after it, the rest of the guide and every hint text stay.

- [ ] **Step 2: README and CONTRIBUTING**

- `README.md:19`: `**Share link**: a URL, …` becomes `**Share**: a URL, …`; `npx prettier --write`
  re-pads that table row.
- `CONTRIBUTING.md` _Styling_: the first paragraph says that `src/styles.css` also holds the setup
  page's darker range tracks, and that the disabled **Start** button is overridden in
  `src/lib/components/ActionBar.svelte` (the overlay's focus ring stays "in the play page"). Add as
  the section's first bullet:
  `Build setup screens from the shared units in src/lib/components/: Section (a bordered section named by its heading), Segmented (radio buttons that look like joined buttons), Hint (a long hint in a disclosure under its control), ValueSlider (a slider that shows its value), Field, Note, SecondsSlider, FormatSelect and EccSelect. The setup page's state is one Setup class in src/lib/setup.svelte.ts, which each pane takes as its setup prop.`
  (each name in backticks, wrapped at 100).

- [ ] **Step 3: Verify**

Run: `npx prettier --write docs/guide.md README.md CONTRIBUTING.md && grep -nE 'file picker under|\*\*Editor\*\* select|\*\*Playback\*\* select|\*\*Share link\*\*' docs/guide.md README.md; echo "exit $?"`
Expected: only `exit 1` (_Done means_ 7).

Run: `grep -c 'Share QR error correction\|Under the settings\|✓ →' docs/guide.md`
Expected: `0`.

Then the whole suite: as _Counts_ (45 files, 917 tests).

- [ ] **Step 4: Commit**

```bash
git add docs/guide.md README.md CONTRIBUTING.md
git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -m "docs: describe the redesigned setup page's controls"
```

---

### Task 11: Verification that fails closed, the visual review and the PR body

**Files:**

- Not committed: `<scratchpad>/verification.md` and `<scratchpad>/pr-body.md`; the shots under
  `<scratchpad>/vr/<build>/<view>-<W>x<H>.png`
- Modify: only through `fix:` commits, if a check finds a regression

**Interfaces:**

- Consumes: the finished branch; `probe.ts` and `probe-inject.html` (Tasks 5 and 6); `resolveRoute`.

- [ ] **Step 1: The commands (A1 to A6)**

Run: `node --version && npm test && npm run lint && npm run build`
Record: the Node version; svelte-check's line; `Test Files  45 passed (45)` and
`Tests  917 passed (917)`; lint's exit; the `check-css:` line beside spec 1's 66,368 B raw and
11,426 B gzipped (M3; measured here at the end of Task 10: 69,580 B and 12,592 B); that no
`warnings while optimizing generated CSS` line printed; the 500 kB chunk warning, which predates.

Run: `git diff main -- src/lib/shareUrl.ts | wc -l; git diff --name-only main -- src/routes/play | wc -l; grep -rn ShareLink src | wc -l; grep -nE 'file picker under|\*\*Editor\*\* select|\*\*Playback\*\* select|\*\*Share link\*\*' docs/guide.md README.md | wc -l`
Expected: four lines, each `0` (_Done means_ 4 to 7). A command that errors instead is UNVERIFIED.

Run: `npm run stage-check; echo "exit $?"`
Expected: `stage-check: 8 PASS, 0 MISMATCH, 0 UNVERIFIED against main` and `exit 0` (_Done means_
3). A MISMATCH: stop and report. `git status --short` prints nothing afterwards.

- [ ] **Step 2: Build both copies**

Run: `git worktree add --detach <scratchpad>/vr-main main && cd <scratchpad>/vr-main && npm ci && npm run build`
Then copy `<scratchpad>/vr-main/dist` to `<scratchpad>/vr/main` and the branch's `dist` to
`<scratchpad>/vr/branch`, and run
`git -C /home/nn/Projects/scandible worktree remove --force <scratchpad>/vr-main`.

- [ ] **Step 3: Add the `view` probe**

In `probe-inject.html`, the probe `view` waits for `.start` or `.overlay` (both builds have them),
then runs the action named by `?act=`: `none`; `list-breakdown` clicks the first
`ul[aria-label="Validation results"] summary`; `row-breakdown` clicks
`ol[aria-label="Codes"] li:nth-child(2) summary`; `share` clicks the button whose text is `Share`
or `Share link`. It reports `paneSticky` (`.settings-pane`'s computed `position`) and `bar`
(`.action-bar`'s), when present. With `?tab=1` it also reports the tab check: for each
`a[href], button, input, select, textarea, summary` in document order that is enabled, rendered
(`getClientRects().length > 0`), not an unchecked radio and not inside `.action-bar`, it calls
`el.focus({ preventScroll: true })` and `el.scrollIntoView({ block: 'nearest', inline: 'nearest' })`
(the scroll the browser makes for a focused control, which honors `scroll-padding`), and records
the control when the bar is `fixed` and the control's `getBoundingClientRect().bottom` exceeds the
bar's top by more than 0.5 px. It reports `tabbed` (the count) and `hiddenByBar` (tag, type, name,
top, bottom, the bar's top).

- [ ] **Step 4: Shoot the views**

With `GS1 = codes=%2801%2909501101530003%2817%29261231%2810%29LOT42%0A%2801%2909501101530004%0Ahello&fmt=gs1128&lax=1&seed=1`
(valid, lenient, invalid), `ROWS = r1=upc_036000291452&r2=gs1128_%2801%2909501101530003%2817%29261231%2810%29LOT42&r3=qr-H_hello&r4=upc_bad&fmt=upc&seed=1`
and `STEP = codes=a%0Ab%0Ab&fmt=code128&mode=step&dwell=250&seed=0` (both warnings), run the probe
for each row, on both builds unless noted (_Verification that fails closed_, views 1 to 8):

| View      | Path and fragment                                                        | `act`            | Windows                               |
| --------- | ------------------------------------------------------------------------ | ---------------- | ------------------------------------- |
| 1 default | `/scandible/?probe=view`                                                 | `none`           | 1280×900, 390×844                     |
| 2 gs1     | `/scandible/?probe=view&act=list-breakdown#` + GS1                       | `list-breakdown` | 1280×900, 390×844                     |
| 3 rows    | `/scandible/?probe=view&act=row-breakdown#` + ROWS                       | `row-breakdown`  | 1280×900, 390×844                     |
| 4 step    | `/scandible/?probe=view#` + STEP                                         | `none`           | 1280×900, 390×844                     |
| 5 share   | `/scandible/?probe=view&act=share#codes=hello%0Aworld&fmt=qr&seed=1`     | `share`          | 1280×900, 390×844                     |
| 6 phone   | `/scandible/?probe=view#` + GS1                                          | `none`           | 320×568                               |
| 7 short   | `/scandible/?probe=view#` + STEP                                         | `none`           | 1280×600; branch also 1280×1100       |
| 8 play    | `/scandible/play?probe=view#codes=036000291452&fmt=upc&mode=step&seed=1` | `none`           | 1280×900, 390×844                     |
| tab       | `/scandible/?probe=view&act=share&tab=1#` + STEP; `…&tab=1#` + GS1       | as written       | branch: 1280×900 and 390×844; 390×844 |

Expected (measured here on the branch): every line carries a beacon with `innerWidth` equal to W;
every branch line has `scrollWidth <= innerWidth`; view 7 at 1280×600 reports `bar` `fixed` and
`paneSticky` `static`, and at 1280×1100 `paneSticky` `sticky` (the 63 rem query); the tab lines
report `tabbed` 13 (1280×900, share open), 13 (390×844, share open) and 16 (390×844, GS1) with
`hiddenByBar` `[]`. A line with `UNVERIFIED: no beacon`, or a missing PNG, leaves its row
UNVERIFIED.

- [ ] **Step 5: Read the shots and record the checks**

Open each `main` and branch pair (the Read tool shows PNGs) and write one line per view and
window. Then check, and say in the record (spec _Visual review_):

- **V1**, views 2 and 3: each verdict keeps its color (valid green, invalid red, lenient amber)
  and shows its word.
- **V2**, views 2 and 3: the open GS1 breakdown shows no visible header row.
- **V3**, view 3: row 2's breakdown sits inside its row, under its verdict.
- **V4**, view 8: the play overlay is unchanged, each slider beside its seconds field.
- **V5**, every setup view: every visible label is one a `getByLabelText` test asserts, or belongs
  to a control _Accessibility_ lists as having no visible label (the Editor group's options are
  its radios' names; each row's Format and Error correction selects).
- **V6**, views 1 to 6 at 390 and 320 px: Share and Start on one line, the count wrapped at most
  once (and Task 6 Step 10's table).
- **V7**: the tab lines report no control hidden by the bar.

A shot that shows a regression the spec does not intend: fix it in the file that owns it as a
`fix:` commit, rerun Step 1, reshoot, and record both. A fix that needs a spec decision: record the
row FAILED with the shot paths, and stop.

- [ ] **Step 6: Write the record and the PR body**

`<scratchpad>/verification.md` is the table below with Status and Evidence filled in. Status is
`UNVERIFIED`, `PASS` or `FAILED`; every row starts UNVERIFIED and changes only when its pass rule
is met and its evidence entered. H1 to H3 stay UNVERIFIED (open) until the owner does them.

| Row | Check                                                                   | Pass rule                                                            |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| A1  | `npm test`                                                              | svelte-check 0 errors and 0 warnings; 45 files and 917 tests pass    |
| A2  | `npm run lint`                                                          | exit 0                                                               |
| A3  | `npm run build` with `check-css`                                        | exit 0; no CSS-optimization warning; size beside 66,368 B / 11,426 B |
| A4  | `npm run stage-check` against `main`                                    | `8 PASS, 0 MISMATCH, 0 UNVERIFIED`, exit 0                           |
| A5  | _Done means_ 4: `git diff main -- src/lib/shareUrl.ts`                  | prints nothing; Task 1's round trip passes                           |
| A6  | _Done means_ 5 to 7: the play diff, `ShareLink` and docs greps          | each prints nothing                                                  |
| A7  | The measurements: Task 5 Step 8 and Task 6 Step 10                      | every beacon present; the pinned numbers recorded                    |
| A8  | Visual review, views 1 to 8 on both builds                              | every beacon and PNG present; one note per view and window           |
| A9  | No sideways scroll (branch)                                             | `scrollWidth <= innerWidth` in every branch line                     |
| V1  | Verdict colors and words                                                | holds in views 2 and 3                                               |
| V2  | An open GS1 breakdown shows no header row                               | holds in views 2 and 3                                               |
| V3  | A GS1 row's breakdown inside its row, under its verdict                 | holds in view 3                                                      |
| V4  | The play overlay unchanged                                              | holds in view 8                                                      |
| V5  | Every visible label is asserted or listed as having none                | holds in every setup view                                            |
| V6  | Share and Start on one line, the count wrapped at most once             | holds at 390 and 320 px                                              |
| V7  | No tabbed control hidden by the bar                                     | `hiddenByBar` `[]` in all three tab lines                            |
| H1  | Keyboard pass through the page and the Share panel, Escape from behind  | the owner, in a desktop browser                                      |
| H2  | Android: typing in the code box (bar behind or on the keyboard?), panel | the owner, on a phone                                                |
| H3  | Optional: Orca reads the verdict words and the checkbox's description   | the owner, with Orca                                                 |

`<scratchpad>/pr-body.md`: title `feat: redesign the setup page with two panes, a pinned bar and a Share panel`;
sections _Summary_ (the six user-facing changes; spec and plan paths), _Decisions taken while
planning_ (the three _Questions_ with the owner's answers, the `join` warning, the bar's box),
_Verification_ (the record's rows with their evidence; the CSS size beside spec 1's), _Screenshots_
(attached by hand), _Human checks (open)_ (H1 to H3 as unchecked boxes) and how to look locally:
`npm run build`, then `npm run preview`, then open http://localhost:4173/scandible/. No AI
attribution and no "Generated with" line.

- [ ] **Step 7: Report**

The report lists every row that is not PASS, by number, and never reports one as passed. The
controller opens the PR only when the owner asks (finishing-a-development-branch).

## Out of this plan

- Everything _Out of scope_ lists: the play page, its overlay and ranges (spec 3); new features,
  dark mode, the SvelteKit 3 upgrade, `@testing-library/user-event`; README screenshots.
- The handoff's other F5 items (a, b, d to g); the 500 kB chunk (spec 1, _Questions_ 1).

## Execution notes

- **Per task:** one implementer subagent, then one Sonnet reviewer, who runs the task's commands
  and compares them with the expected lines. A command that did not run, or whose output is
  missing, is unverified, never a pass.
- **Implementer tiers:** Opus for Tasks 1, 4, 5, 6 and 11 (the state extraction, focus handling,
  the Firefox measurements, the bar and panel, the verification); Sonnet for Tasks 2, 3, 7, 8, 9
  and 10.
- **Final review**, after Task 10 and before Task 11, in three Opus chunks, each reading
  `git diff 6b21526 -- <paths>`: Tasks 1 to 3 (state and units), 4 to 7 (panes, bar, row editor),
  8 to 10 (words, guard, docs), against _Done means_ and _Accessibility_. Then one Fable agent as
  the final acceptance judge, on Task 11's record, before the PR: the only Fable agent in the run.
- **Firefox runs** take 20 to 60 s each here, so Task 5 Step 8, Task 6 Step 10 and Task 11 Step 4
  run their batches in the background and read the printed lines afterwards.

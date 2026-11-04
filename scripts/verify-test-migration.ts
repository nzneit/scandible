/**
 * The test-migration checker. It implements "Proving equivalence" (checks 1 to 7) in
 * docs/superpowers/specs/2026-11-04-accessible-test-queries-design.md, plus the plan's check 8
 * (fallback markers), as Task 3 of docs/superpowers/plans/2026-11-04-accessible-test-queries.md
 * specifies them.
 *
 * It copies `main`'s six UI test files beside the originals (`*.main-copy.test.ts`), so that they
 * run against the branch's components, and compares them with the branch's six: the inventory, the
 * fireEvent sequences, the runtime assertion counts, the pairing of absence checks, deliberate
 * breaks and controls applied one at a time, and the timing. It fails closed: a check that dies,
 * reads nothing or is skipped is UNVERIFIED, never PASS.
 *
 *   node scripts/verify-test-migration.ts                 the full run; exit 0 when every check passes
 *   node scripts/verify-test-migration.ts --only <file>   one file; exit 2 when every check passes
 *   node scripts/verify-test-migration.ts --self-test     the checker's own controls; exit 0 when all are ok
 *
 * Anything else exits 1. This file is deleted in the PR's last commit: once the branch is merged,
 * there is nothing left to compare.
 */
import { execFileSync, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// ── Justification tables ─────────────────────────────────────────────────────────────────────
// Tasks 4 to 10 add entries here (migration rule R12), each with the reason the PR prints.
// They never edit RENAMES, EVENTS_ON_MAIN, DETAILS_CLICK, BREAKS or CONTROLS.

/**
 * Check 3: tests whose runtime assertion count falls on the branch. The key is the repo-relative
 * file and the branch's full name, as in
 * 'src/lib/components/ShareLink.test.ts :: ShareLink > shows the live URL before any click'.
 * An unlisted drop FAILs, and so does an entry, for a file in scope, that is not a drop.
 */
const COUNT_DROPS: Record<string, string> = {}; // key: `${file} :: ${branch full name}` → reason

/**
 * Check 4: absence checks with no presence query of the same text in the same file. The key is
 * the repo-relative file and the query key, as in
 * "src/lib/components/ShareLink.test.ts :: ByRole('alert')".
 * An unlisted unpaired check FAILs, and so does an entry, for a file in scope, that is not one.
 */
const PAIRING_EXCEPTIONS: Record<string, string> = {}; // key: `${file} :: ${queryKey}` → reason

// ── Paths and constants ──────────────────────────────────────────────────────────────────────

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

// ── Renames (Test names), as full names ──────────────────────────────────────────────────────

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

// ── Breaks and controls: one exact replacement each, in a file under src/, never in a test ───

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

// ── Results, keys and small helpers ──────────────────────────────────────────────────────────

type Status = 'PASS' | 'FAIL' | 'UNVERIFIED';
interface Result {
	status: Status;
	detail: string;
	notes: string[];
}
/** `${repo-relative file} :: ${full name}`. A copy's key keeps its copy path. */
type Key = string;
interface Outcome {
	status: 'passed' | 'failed';
	duration: number;
	assertionCalls: number | undefined;
}
type Run = { ok: true; results: Map<Key, Outcome> } | { ok: false; error: string };
/** Each test's assertion count in each baseline run; `undefined` where a run reported none. */
type Counts = Map<Key, (number | undefined)[]>;
interface Query {
	key: string;
	kind: 'absence' | 'presence' | 'query' | 'queryAll';
	line: number;
}

const pass = (detail: string, notes: string[] = []): Result => ({ status: 'PASS', detail, notes });
const fail = (detail: string, notes: string[] = []): Result => ({ status: 'FAIL', detail, notes });
const unverified = (detail: string, notes: string[] = []): Result => ({
	status: 'UNVERIFIED',
	detail,
	notes
});
const worst = (statuses: Status[]): Status =>
	statuses.includes('FAIL') ? 'FAIL' : statuses.includes('UNVERIFIED') ? 'UNVERIFIED' : 'PASS';
const keyOf = (file: string, name: string): Key => `${file} :: ${name}`;
const fileOf = (key: Key): string => key.split(' :: ', 1)[0];
const nameOf = (key: Key): string => key.slice(fileOf(key).length + ' :: '.length);
const message = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);
const oneLine = (text: string): string =>
	text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
		.join(' | ');
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fileOrder = (file: string): number =>
	FILES.includes(file) ? FILES.indexOf(file) : FILES.length;

/** A justification that justifies nothing: not a string, or only whitespace. */
const isBlank = (reason: unknown): boolean => typeof reason !== 'string' || reason.trim() === '';

function unique<T>(items: T[]): T[] {
	return [...new Set(items)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

const TEST_EXT = '.test.ts';
const COPY_EXT = '.main-copy.test.ts';

/** `src/routes/page.test.ts` → `src/routes/page.main-copy.test.ts`; the `.svelte.` infix stays. */
function copyOf(file: string): string {
	if (!file.endsWith(TEST_EXT) || file.endsWith(COPY_EXT)) {
		throw new Error(`not an original test file: ${file}`);
	}
	return file.slice(0, -TEST_EXT.length) + COPY_EXT;
}

/** The inverse of copyOf, and the identity on a file that is not a copy. */
function fromCopy(file: string): string {
	return file.endsWith(COPY_EXT) ? file.slice(0, -COPY_EXT.length) + TEST_EXT : file;
}

/**
 * An old key in the branch's terms: a copy's path becomes the original's, and a rename's `from`
 * becomes its `to` where the branch has the `to` (an applied rename).
 */
function toBranchKey(key: Key, branch: { has(key: Key): boolean }): Key {
	const file = fromCopy(fileOf(key));
	const name = nameOf(key);
	const rename = RENAMES.find((r) => r.file === file && r.from === name);
	if (rename && branch.has(keyOf(file, rename.to))) return keyOf(file, rename.to);
	return keyOf(file, name);
}

// ── Check 1: inventory ───────────────────────────────────────────────────────────────────────

function duplicates(keys: Key[]): Key[] {
	const seen = new Set<Key>();
	const twice = new Set<Key>();
	for (const key of keys) {
		if (seen.has(key)) twice.add(key);
		seen.add(key);
	}
	return [...twice];
}

function checkInventory(
	main: Key[],
	branch: Key[],
	scope: string[],
	full: boolean,
	minPairs = MIN_PAIRS
): Result {
	const read = `${main.length} pairs on main, ${branch.length} on the branch`;
	if (main.length < minPairs || branch.length < minPairs) {
		return unverified(`${read}; at least ${minPairs} expected on each side`);
	}
	const twice = [
		...duplicates(main).map((key) => `twice on main: ${key}`),
		...duplicates(branch).map((key) => `twice on the branch: ${key}`)
	];
	if (twice.length > 0) return unverified(`${read}; ${twice.length} duplicate pairs`, twice);
	const onMain = new Set(main);
	const onBranch = new Set(branch);
	const problems: string[] = [];
	const notes: string[] = [];
	let applied = 0;
	let pending = 0;
	let notApplied = 0;
	let broken = 0;
	for (const rename of RENAMES) {
		const from = keyOf(rename.file, rename.from);
		if (onMain.has(from) && onBranch.has(keyOf(rename.file, rename.to))) {
			applied++;
		} else if (onMain.has(from) && onBranch.has(from)) {
			pending++;
			if (full || scope.includes(rename.file)) {
				notApplied++;
				problems.push(`rename pending: ${from}`);
			} else {
				notes.push(`rename pending, its file is not migrated yet: ${from}`);
			}
		} else {
			broken++;
			problems.push(`rename broken (neither applied nor pending): ${from} -> ${rename.to}`);
		}
	}
	const mapped = new Set(main.map((key) => toBranchKey(key, onBranch)));
	const differences = [
		...[...mapped].filter((key) => !onBranch.has(key)).map((key) => `only on main: ${key}`),
		...branch.filter((key) => !mapped.has(key)).map((key) => `only on the branch: ${key}`)
	];
	if (problems.length > 0 || differences.length > 0) {
		return fail(
			`${read}; ${notApplied} renames pending, ${broken} broken, ${differences.length} other differences`,
			[...problems, ...differences.slice(0, 20), ...notes]
		);
	}
	const tail = pending > 0 ? `, ${pending} pending in files not yet migrated` : '';
	return pass(`${read}, equal after ${applied} renames${tail}`, notes);
}

/** The `.test.ts` paths outside FILES that `git diff --name-status` names (added, changed or deleted). */
function testFilesOutside(nameStatus: string): string[] {
	const paths = nameStatus.split('\n').flatMap((line) => line.split('\t').slice(1));
	return unique(paths.filter((path) => path.endsWith(TEST_EXT) && !FILES.includes(path)));
}

// ── Check 2: events ──────────────────────────────────────────────────────────────────────────

/** The fireEvent call sites in source order. A comment such as `fireEvent.click moves no focus` has no `(`. */
function fireEventMethods(source: string): string[] {
	return [...source.matchAll(/\bfireEvent\.(\w+)\(/g)].map((m) => m[1]);
}

function checkEvents(
	main: Record<string, string>,
	branch: Record<string, string>,
	scope: string[]
): Result {
	if (scope.length === 0) return unverified('no file in scope');
	const unreadable: string[] = [];
	const differences: string[] = [];
	let onMain = 0;
	let onBranch = 0;
	let detailsClick = false;
	for (const file of scope) {
		const mainText = main[file];
		const branchText = branch[file];
		if (!mainText || !branchText) {
			unreadable.push(`${file}: its source was not read`);
			continue;
		}
		const was = fireEventMethods(mainText);
		const now = fireEventMethods(branchText);
		onMain += was.length;
		onBranch += now.length;
		if (was.length !== EVENTS_ON_MAIN[file]) {
			unreadable.push(
				`${file}: ${was.length} fireEvent calls on main, ${EVENTS_ON_MAIN[file]} pinned`
			);
			continue;
		}
		let expected = was;
		if (branchText !== mainText && file === DETAILS_CLICK.file) {
			const at = DETAILS_CLICK.index;
			expected = [...was.slice(0, at), DETAILS_CLICK.method, ...was.slice(at)];
			detailsClick = true;
		}
		for (let i = 0; i < Math.max(expected.length, now.length); i++) {
			if (expected[i] !== now[i]) {
				differences.push(
					`${file}: first difference at index ${i}: expected ${expected[i] ?? 'no call'}, the branch has ${now[i] ?? 'no call'}`
				);
				break;
			}
		}
	}
	const read = `${onMain} fireEvent calls on main, ${onBranch} on the branch`;
	if (unreadable.length > 0) {
		return unverified(`${read}; ${unreadable.length} files cannot be compared`, [
			...unreadable,
			...differences
		]);
	}
	if (differences.length > 0)
		return fail(`${read}; ${differences.length} files differ`, differences);
	return pass(`${read}; sequences equal${detailsClick ? ', apart from the <details> click' : ''}`);
}

// ── Check 3: assertion counts ────────────────────────────────────────────────────────────────

function checkCounts(
	main: Counts,
	branch: Counts,
	scope: string[],
	drops: Record<string, string>
): Result {
	const expected = [...branch.keys()].filter((key) => scope.includes(fileOf(key)));
	if (expected.length === 0) return unverified('no test was counted on the branch');
	const old: Counts = new Map();
	for (const [key, counts] of main) old.set(toBranchKey(key, branch), counts);
	const problems: string[] = [];
	for (const key of old.keys()) {
		if (scope.includes(fileOf(key)) && !branch.has(key))
			problems.push(`${key}: counted on main only`);
	}
	const values = new Map<Key, { was: number; now: number }>();
	for (const key of expected) {
		const was = old.get(key) ?? [];
		const now = branch.get(key) ?? [];
		if (was.length !== RUNS || now.length !== RUNS) {
			problems.push(
				`${key}: ${was.length} counts on main and ${now.length} on the branch, not ${RUNS} each`
			);
		} else if (was.includes(undefined) || now.includes(undefined)) {
			problems.push(`${key}: a run reported no count`);
		} else if (new Set(was).size > 1 || new Set(now).size > 1) {
			problems.push(
				`${key}: the count varies across runs: main ${was.join(', ')}, branch ${now.join(', ')}`
			);
		} else {
			values.set(key, { was: was[0] as number, now: now[0] as number });
		}
	}
	if (problems.length > 0) {
		return unverified(
			`${problems.length} of ${expected.length} tests cannot be compared`,
			problems
		);
	}
	// Counts that sum to 0 on a side mean the count setup file reported nothing there.
	const sumWas = [...values.values()].reduce((sum, v) => sum + v.was, 0);
	const sumNow = [...values.values()].reduce((sum, v) => sum + v.now, 0);
	if (sumWas === 0 || sumNow === 0) {
		return unverified(
			`the assertion counts sum to ${sumWas} on main and ${sumNow} on the branch, so nothing was counted`
		);
	}
	const dropped = [...values].filter(([, v]) => v.now < v.was);
	const unlisted = dropped.filter(([key]) => !Object.hasOwn(drops, key));
	const stale = Object.keys(drops).filter(
		(key) => scope.includes(fileOf(key)) && !dropped.some(([d]) => d === key)
	);
	const blank = Object.keys(drops).filter(
		(key) => scope.includes(fileOf(key)) && isBlank(drops[key])
	);
	const notes = dropped
		.filter(([key]) => Object.hasOwn(drops, key))
		.map(([key, v]) => `drop ${key}: ${v.was} -> ${v.now} (${drops[key]})`);
	const read = `${expected.length} tests compared, ${dropped.length} drops`;
	if (unlisted.length > 0 || stale.length > 0 || blank.length > 0) {
		const named = blank.length > 0 ? `; blank reasons: ${blank.join(', ')}` : '';
		return fail(
			`${read}, ${unlisted.length} not listed in COUNT_DROPS, ${stale.length} stale entries, ${blank.length} blank reasons${named}`,
			[
				...unlisted.map(([key, v]) => `unlisted drop ${key}: ${v.was} -> ${v.now}`),
				...stale.map((key) => `stale COUNT_DROPS entry, not a drop: ${key}`),
				...blank.map((key) => `COUNT_DROPS entry with a blank reason: ${key}`),
				...notes
			]
		);
	}
	return pass(`${read}, every drop listed`, notes);
}

// ── Check 4: presence pairing ────────────────────────────────────────────────────────────────

const REGEX_AFTER = new Set(['(', ',', ':', '[', '{', '!', '&', '|', '?', '=']);

function lineAt(source: string, offset: number): number {
	let line = 1;
	for (let i = 0; i < offset && i < source.length; i++) if (source[i] === '\n') line++;
	return line;
}

function previousNonSpace(source: string, offset: number): string {
	let i = offset - 1;
	while (i >= 0 && /\s/.test(source[i])) i--;
	return i >= 0 ? source[i] : '';
}

/** The offset just past the string, template, regex literal or comment at `i`, or `i` when none starts there. */
function skipLiteral(source: string, i: number): number {
	const c = source[i];
	if (c === "'" || c === '"') {
		for (let j = i + 1; j < source.length; j++) {
			if (source[j] === '\\') j++;
			else if (source[j] === c) return j + 1;
		}
		throw new Error(`an unterminated string at line ${lineAt(source, i)}`);
	}
	if (c === '`') {
		for (let j = i + 1; j < source.length; j++) {
			if (source[j] === '\\') j++;
			else if (source[j] === '`') return j + 1;
			else if (source[j] === '$' && source[j + 1] === '{') j = closing(source, j + 2, '{', '}');
		}
		throw new Error(`an unterminated template literal at line ${lineAt(source, i)}`);
	}
	if (c === '/' && source[i + 1] === '/') {
		const end = source.indexOf('\n', i);
		return end === -1 ? source.length : end;
	}
	if (c === '/' && source[i + 1] === '*') {
		const end = source.indexOf('*/', i + 2);
		if (end === -1) throw new Error(`an unterminated comment at line ${lineAt(source, i)}`);
		return end + 2;
	}
	if (c === '/' && REGEX_AFTER.has(previousNonSpace(source, i))) {
		let inClass = false;
		for (let j = i + 1; j < source.length; j++) {
			const d = source[j];
			if (d === '\\') j++;
			else if (d === '\n') break;
			else if (inClass) inClass = d !== ']';
			else if (d === '[') inClass = true;
			else if (d === '/') {
				let end = j + 1;
				while (end < source.length && /[a-z]/i.test(source[end])) end++;
				return end;
			}
		}
		throw new Error(`an unterminated regex literal at line ${lineAt(source, i)}`);
	}
	return i;
}

/** The offset of the bracket that closes an `open` bracket opened just before `from`. */
function closing(source: string, from: number, open: string, close: string): number {
	let depth = 1;
	let i = from;
	while (i < source.length) {
		const next = skipLiteral(source, i);
		if (next !== i) {
			i = next;
			continue;
		}
		if (source[i] === open) depth++;
		else if (source[i] === close) {
			depth--;
			if (depth === 0) return i;
		}
		i++;
	}
	throw new Error(`an unbalanced ${open} at line ${lineAt(source, from)}`);
}

/** The text between the paren at `open` and its match, skipping literals and comments. Throws when unbalanced. */
function argsAt(source: string, open: number): { text: string; end: number } {
	if (source[open] !== '(') throw new Error(`no ( at line ${lineAt(source, open)}`);
	const end = closing(source, open + 1, '(', ')');
	return { text: source.slice(open + 1, end), end };
}

/** The paren that `close` closes: the nearest earlier `(` whose arguments end at `close`. */
function openingParen(source: string, close: number): number {
	for (let p = close - 1; p >= 0 && close - p <= 4000; p--) {
		if (source[p] !== '(') continue;
		try {
			if (argsAt(source, p).end === close) return p;
		} catch {
			// a ( inside a literal: try the one before it
		}
	}
	throw new Error(`no ( matches the ) at line ${lineAt(source, close)}`);
}

/** Where the receiver of the call at `start` begins (`screen.`, `within(…).`, `ui().`), or `start` when it has none. */
function receiverStart(source: string, start: number): number {
	let at = start;
	for (;;) {
		let j = at - 1;
		while (j >= 0 && /\s/.test(source[j])) j--;
		if (j < 0 || source[j] !== '.') return at;
		j--;
		while (j >= 0 && /\s/.test(source[j])) j--;
		let k = j;
		if (k >= 0 && source[k] === ')') k = openingParen(source, k) - 1;
		while (k >= 0 && /[\w$]/.test(source[k])) k--;
		if (k === j) return at;
		at = k + 1;
	}
}

const QUERY_CALL = /\b(getAll|get|queryAll|query|findAll|find)(By[A-Z]\w*)\(/g;
const ABSENCE_AFTER =
	/^\s*\)\s*\.(toBeNull\(\)|not\.toBeInTheDocument\(\)|toHaveLength\(0\)|toEqual\(\[\]\))/;
/** `queryAllBy…(…).length` compared with 0 is an absence check too (fix round 1, F2). */
const LENGTH_ZERO_AFTER = /^\s*\.\s*length\s*\)\s*\.(toBe|toEqual|toStrictEqual)\(\s*0\s*\)/;
const EXPECT_BEFORE = /expect\(\s*$/;

/**
 * The [start, end) ranges of the comments, strings, regex literals and template text in `source`.
 * The code inside a template's `${…}` is not one. Throws when a literal is unterminated.
 */
function literalRanges(source: string): [number, number][] {
	const ranges: [number, number][] = [];
	const template = (start: number): number => {
		let text = start;
		for (let j = start + 1; j < source.length; j++) {
			if (source[j] === '\\') {
				j++;
			} else if (source[j] === '`') {
				ranges.push([text, j + 1]);
				return j + 1;
			} else if (source[j] === '$' && source[j + 1] === '{') {
				ranges.push([text, j + 2]);
				j = code(j + 2, true); // the } that closes the expression, which is template text again
				text = j;
			}
		}
		throw new Error(`an unterminated template literal at line ${lineAt(source, start)}`);
	};
	const code = (from: number, inTemplate: boolean): number => {
		let depth = 0;
		let i = from;
		while (i < source.length) {
			if (source[i] === '`') {
				i = template(i);
				continue;
			}
			const next = skipLiteral(source, i);
			if (next !== i) {
				ranges.push([i, next]);
				i = next;
				continue;
			}
			if (inTemplate && source[i] === '{') depth++;
			else if (inTemplate && source[i] === '}') {
				if (depth === 0) return i;
				depth--;
			}
			i++;
		}
		if (inTemplate) {
			throw new Error(`an unterminated template expression at line ${lineAt(source, from)}`);
		}
		return i;
	};
	code(0, false);
	return ranges;
}

/**
 * Every Testing Library query call in `source`, with its key (`ByRole('listitem')`) and kind. A match
 * that starts inside a comment, a string or template text is not a call; it goes to `ignored`.
 */
function queries(source: string, ignored: { line: number; text: string }[] = []): Query[] {
	const literals = literalRanges(source);
	const inLiteral = (offset: number): boolean =>
		literals.some(([start, end]) => offset >= start && offset < end);
	const found: Query[] = [];
	for (const m of source.matchAll(QUERY_CALL)) {
		if (inLiteral(m.index)) {
			ignored.push({ line: lineAt(source, m.index), text: m[0] });
			continue;
		}
		const open = m.index + m[0].length - 1;
		const { text, end } = argsAt(source, open);
		const args = text.replace(/\s+/g, ' ').trim().replace(/,$/, '').trim();
		const key = `${m[2]}(${args})`;
		const line = lineAt(source, m.index);
		const variant = m[1];
		if (variant !== 'query' && variant !== 'queryAll') {
			found.push({ key, kind: 'presence', line });
			continue;
		}
		const receiver = receiverStart(source, m.index);
		const after = source.slice(end + 1, end + 200);
		const absence =
			(ABSENCE_AFTER.test(after) || (variant === 'queryAll' && LENGTH_ZERO_AFTER.test(after))) &&
			EXPECT_BEFORE.test(source.slice(Math.max(0, receiver - 200), receiver));
		found.push({ key, kind: absence ? 'absence' : variant, line });
	}
	return found;
}

function checkPairing(
	sources: Record<string, string>,
	scope: string[],
	exceptions: Record<string, string>
): Result {
	if (scope.length === 0) return unverified('no file in scope');
	const problems: string[] = [];
	const excused = new Set<string>();
	const skipped: string[] = [];
	let absences = 0;
	let paired = 0;
	for (const file of scope) {
		const source = sources[file];
		if (!source) return unverified(`${file}: its source was not read`);
		let found: Query[];
		const ignored: { line: number; text: string }[] = [];
		try {
			found = queries(source, ignored);
			for (const i of ignored)
				skipped.push(`ignored, in a comment or string: ${file}:${i.line} ${i.text}`);
		} catch (error) {
			return unverified(`${file}: ${message(error)}`);
		}
		const present = new Set(found.filter((q) => q.kind === 'presence').map((q) => q.key));
		for (const q of found) {
			if (q.kind === 'query')
				problems.push(`queryBy… outside an absence check at ${file}:${q.line}`);
			if (q.kind !== 'absence') continue;
			absences++;
			const exception = keyOf(file, q.key);
			if (present.has(q.key)) paired++;
			else if (Object.hasOwn(exceptions, exception)) excused.add(exception);
			else problems.push(`unpaired absence check at ${file}:${q.line}: ${q.key}`);
		}
	}
	for (const key of Object.keys(exceptions)) {
		if (scope.includes(fileOf(key)) && !excused.has(key)) {
			problems.push(`stale PAIRING_EXCEPTIONS entry, not an unpaired absence check: ${key}`);
		}
	}
	const blank = Object.keys(exceptions).filter(
		(key) => scope.includes(fileOf(key)) && isBlank(exceptions[key])
	);
	for (const key of blank) problems.push(`PAIRING_EXCEPTIONS entry with a blank reason: ${key}`);
	const notes = [...[...excused].map((key) => `exception ${key}: ${exceptions[key]}`), ...skipped];
	if (problems.length > 0) {
		const named = blank.length > 0 ? `; blank reasons: ${blank.join(', ')}` : '';
		return fail(`${absences} absence checks, ${problems.length} problems${named}`, [
			...problems,
			...notes
		]);
	}
	if (absences === 0) return unverified('no absence check in scope');
	return pass(
		`${absences} absence checks, ${paired} paired, ${absences - paired} listed exceptions`,
		notes
	);
}

// ── Check 5: the old tests on the new components ─────────────────────────────────────────────

function failingKeys(results: Map<Key, Outcome>): Key[] {
	return [...results].filter(([, outcome]) => outcome.status === 'failed').map(([key]) => key);
}

function checkOldTests(runs: Run[]): Result {
	const errors = runs.flatMap((run, i) => (run.ok ? [] : [`run ${i + 1}: ${run.error}`]));
	if (errors.length > 0) return unverified(errors.join('; '));
	if (runs.length !== RUNS) return unverified(`${runs.length} of ${RUNS} runs made`);
	const sizes = runs.map((run) => (run.ok ? run.results.size : 0));
	const n = sizes[0];
	if (n === 0 || sizes.some((size) => size !== n)) {
		return unverified(`tests per run: ${sizes.join(', ')}`);
	}
	const failing = unique(runs.flatMap((run) => (run.ok ? failingKeys(run.results) : [])));
	if (failing.length > 0) {
		return fail(`${failing.length} of ${n} fail in at least one of ${RUNS} runs`, failing);
	}
	return pass(`${n} of ${n} pass in each of ${RUNS} runs`);
}

// ── Check 6: breaks and controls ─────────────────────────────────────────────────────────────

function failingSets(old: Map<Key, Outcome>, next: Map<Key, Outcome>) {
	return {
		was: new Set(failingKeys(old).map((key) => toBranchKey(key, next))),
		now: new Set(failingKeys(next))
	};
}

function byFile(was: Set<Key>, now: Set<Key>): string {
	const files = unique([...was, ...now].map(fileOf)).sort((a, b) => fileOrder(a) - fileOrder(b));
	const count = (set: Set<Key>, file: string) =>
		[...set].filter((key) => fileOf(key) === file).length;
	const parts = files.map((file) => `${file} ${count(was, file)}/${count(now, file)}`);
	return `failing by file, old/new: ${parts.join(', ')}`;
}

function classifyBreak(old: Run, next: Run, full: boolean): Result | 'not seen' {
	if (!old.ok) return unverified(`the run failed: ${old.error}`);
	if (!next.ok) return unverified(`the run failed: ${next.error}`);
	const { was, now } = failingSets(old.results, next.results);
	if (was.size === 0) {
		return full
			? unverified('not a break the old tests can see: replace it in the plan')
			: 'not seen';
	}
	const lost = [...was].filter((key) => !now.has(key));
	if (lost.length > 0) return fail(`coverage lost: ${lost.join('; ')}`, [byFile(was, now)]);
	return pass(`old ${was.size} failing, new ${now.size} failing, all old covered`, [
		byFile(was, now)
	]);
}

function classifyControl(old: Run, next: Run, full: boolean): Result | 'not seen' {
	if (!old.ok) return unverified(`the run failed: ${old.error}`);
	if (!next.ok) return unverified(`the run failed: ${next.error}`);
	const { was, now } = failingSets(old.results, next.results);
	if (was.size === 0) {
		return full
			? unverified('not a control the old tests can see: replace it in the plan')
			: 'not seen';
	}
	if (now.size > 0) {
		return fail(
			`old ${was.size} failing, new ${now.size} failing: the new tests still read this markup`,
			[byFile(was, now), ...[...now].map((key) => `new failure: ${key}`)]
		);
	}
	return pass(`old ${was.size} failing, new 0 failing`, [byFile(was, now)]);
}

// ── Check 7: timing ──────────────────────────────────────────────────────────────────────────

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const seconds = (ms: number): string => (ms / 1000).toFixed(2);

/** `before` and `after` hold, per file, the sum of its test durations in ms, one per run. */
function checkTiming(
	before: Map<string, number[]>,
	after: Map<string, number[]>,
	scope: string[],
	full: boolean
): Result {
	if (scope.length === 0) return unverified('no file in scope');
	const missing: string[] = [];
	const notes: string[] = [];
	let was = 0;
	let now = 0;
	for (const file of scope) {
		const b = before.get(file) ?? [];
		const a = after.get(file) ?? [];
		if (b.length !== RUNS || a.length !== RUNS || ![...b, ...a].every((ms) => ms > 0)) {
			missing.push(
				`${file}: ${b.length} sums before and ${a.length} after; ${RUNS} each, above 0, expected`
			);
			continue;
		}
		const mb = median(b);
		const ma = median(a);
		was += mb;
		now += ma;
		notes.push(`${file}: ${seconds(mb)} s -> ${seconds(ma)} s (${(ma / mb).toFixed(2)}x)`);
	}
	if (missing.length > 0) return unverified(`${missing.length} files lack durations`, missing);
	const ratio = now / was;
	const budget = full ? `, budget ${BUDGET.toFixed(2)}x` : '';
	const detail = `${seconds(was)} s before, ${seconds(now)} s after (${ratio.toFixed(2)}x${budget})`;
	return !full || ratio <= BUDGET ? pass(detail, notes) : fail(detail, notes);
}

// ── Check 8: fallback markers ────────────────────────────────────────────────────────────────

const MARKER_REASON = /-- (stage structure|visual state): (\S.*)$/;
const HELPER_DECLARATION = /^\s*(?:export\s+)?const\s+([\w$]+)\s*=/;

function checkMarkers(sources: Record<string, string>, scope: string[]): Result {
	if (scope.length === 0) return unverified('no file in scope');
	const notes: string[] = [];
	const invalid: string[] = [];
	for (const file of scope) {
		const source = sources[file];
		if (!source) return unverified(`${file}: its source was not read`);
		const lines = source.split('\n');
		lines.forEach((text, i) => {
			if (!text.includes('eslint-disable') && !text.includes('// fallback --')) return;
			const reason = MARKER_REASON.exec(text);
			if (!reason) {
				invalid.push(`${file}:${i + 1} gives no fallback reason: ${text.trim()}`);
				return;
			}
			let note = `${file}:${i + 1} ${reason[1]}: ${reason[2].trim()}`;
			const helper = HELPER_DECLARATION.exec(lines[i + 1] ?? '');
			if (helper) {
				const call = new RegExp(`\\b${escapeRegExp(helper[1])}\\(`);
				const at = lines.flatMap((line, j) => (j !== i + 1 && call.test(line) ? [j + 1] : []));
				note += ` (helper ${helper[1]}, called at ${at.length > 0 ? at.join(', ') : 'no line'})`;
			}
			notes.push(note);
		});
	}
	const count = notes.length + invalid.length;
	if (invalid.length > 0) {
		return fail(`${invalid.length} of ${count} markers give no fallback reason`, [
			...invalid,
			...notes
		]);
	}
	return pass(`${count} markers`, notes);
}

// ── Exit code and result line ────────────────────────────────────────────────────────────────

/** [INFO] lines are not results. No result at all is not a pass. */
function exitCode(results: Result[], full: boolean): 0 | 1 | 2 {
	if (results.length === 0 || results.some((r) => r.status !== 'PASS')) return 1;
	return full ? 0 : 2;
}

function resultLine(results: Result[], full: boolean, file: string): string {
	if (results.some((r) => r.status === 'FAIL')) return 'RESULT: FAIL';
	if (exitCode(results, full) === 1) return 'RESULT: UNVERIFIED';
	if (full) return 'RESULT: PASS (full run)';
	return `RESULT: PARTIAL PASS for ${file} (the full run is the acceptance gate)`;
}

// ── Git, temporary files and patches ─────────────────────────────────────────────────────────

function git(args: string[]): string {
	return execFileSync('git', args, {
		cwd: REPO,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
		stdio: ['ignore', 'pipe', 'pipe']
	});
}

function treeStatus(): string {
	return git(['status', '--porcelain=v1', '--untracked-files=all']);
}

/** The status, or a line naming the failure (which is never equal to a real status). */
function statusOrError(): string {
	try {
		return treeStatus();
	} catch (error) {
		return `git status failed: ${message(error)}`;
	}
}

const CONFIG_TEXT = [
	"// vitest.config.mts: the repository's config plus the count setup file (mergeConfig concatenates setupFiles)",
	"import { mergeConfig } from 'vitest/config';",
	"import base from '../../../vite.config.ts';",
	`export default mergeConfig(base, { test: { setupFiles: [${JSON.stringify(SETUP)}] } });`,
	''
].join('\n');

const SETUP_TEXT = [
	"// count.setup.ts: each test's runtime assertion count, reported in the JSON reporter's `meta`",
	"import { afterEach, expect } from 'vitest';",
	'afterEach((ctx) => {',
	'\tctx.task.meta.assertionCalls = expect.getState().assertionCalls;',
	'});',
	''
].join('\n');

function prepareWork(): void {
	rmSync(WORK, { recursive: true, force: true });
	mkdirSync(WORK, { recursive: true });
	writeFileSync(CONFIG, CONFIG_TEXT);
	writeFileSync(SETUP, SETUP_TEXT);
}

function occurrences(text: string, find: string): number {
	if (find === '') return 0;
	let count = 0;
	for (let at = text.indexOf(find); at !== -1; at = text.indexOf(find, at + find.length)) count++;
	return count;
}

type PatchOutcome =
	| { kind: 'not applied'; error: string }
	| { kind: 'restore failed'; error: string }
	| { kind: 'ran'; run: Run };

/** The file a patch changed, until its original bytes are back and read back. */
let pendingRestore: { path: string; bytes: Buffer } | undefined;

/** Writes the pending original bytes back and reads them back. Never throws. */
function restorePending(): boolean {
	const pending = pendingRestore;
	if (pending === undefined) return true;
	try {
		writeFileSync(pending.path, pending.bytes);
		if (readFileSync(pending.path).equals(pending.bytes)) pendingRestore = undefined;
	} catch {
		// still pending: the caller reports it, and so does the final clean-tree check
	}
	return pendingRestore === undefined;
}

/** Applies `patch` when its find text occurs exactly once, calls `run`, and restores the file whatever happens. */
async function applyPatch(patch: Patch, run: () => Promise<Run>): Promise<PatchOutcome> {
	const path = join(REPO, patch.file);
	const original = readFileSync(path);
	const text = original.toString('utf8');
	const count = occurrences(text, patch.find);
	if (count !== 1) {
		return {
			kind: 'not applied',
			error: `the find text occurs ${count} times in ${patch.file}, not once; the file is untouched`
		};
	}
	const at = text.indexOf(patch.find);
	pendingRestore = { path, bytes: original };
	let result: Run;
	let restored: boolean;
	try {
		writeFileSync(path, text.slice(0, at) + patch.replace + text.slice(at + patch.find.length));
		result = await run();
	} finally {
		restored = restorePending();
	}
	if (!restored) {
		return {
			kind: 'restore failed',
			error: `${patch.file} was not restored to its original bytes`
		};
	}
	return { kind: 'ran', run: result };
}

// ── Running Vitest ───────────────────────────────────────────────────────────────────────────

class Interrupted extends Error {
	constructor() {
		super('interrupted');
	}
}

let interrupted = false;
let child: ChildProcess | undefined;

function onSignal(signal: NodeJS.Signals): void {
	interrupted = true;
	child?.kill(signal);
}

interface Exit {
	code: number | null;
	signal: string | null;
	stderr: string;
	error: string | undefined;
}

const withStderr = (why: string, stderr: string): string =>
	stderr.trim() === '' ? why : `${why}; stderr ends: ${oneLine(stderr).slice(-600)}`;

/** Spawns Node on Vitest directly, keeps the last 2 KB of stderr, and throws once interrupted. */
async function spawnVitest(args: string[]): Promise<Exit> {
	if (interrupted) throw new Interrupted();
	const exit = await new Promise<Exit>((resolve) => {
		let stderr = '';
		const proc = spawn(process.execPath, args, { cwd: REPO, stdio: ['ignore', 'ignore', 'pipe'] });
		child = proc;
		proc.stderr?.setEncoding('utf8');
		proc.stderr?.on('data', (chunk: string) => {
			stderr = (stderr + chunk).slice(-2048);
		});
		proc.on('error', (error) => {
			child = undefined;
			resolve({ code: null, signal: null, stderr, error: error.message });
		});
		proc.on('close', (code, signal) => {
			child = undefined;
			resolve({ code, signal, stderr, error: undefined });
		});
	});
	if (interrupted) throw new Interrupted();
	return exit;
}

type Listing =
	{ ok: true; entries: { file: string; name: string }[] } | { ok: false; error: string };

/** One `vitest list` over the whole suite; the files come back repo-relative. */
async function listTests(): Promise<Listing> {
	const out = join(WORK, 'list.json');
	rmSync(out, { force: true });
	const exit = await spawnVitest([
		VITEST,
		'list',
		'--config',
		CONFIG,
		'--root',
		REPO,
		`--json=${out}`
	]);
	const bad = (why: string): Listing => ({ ok: false, error: withStderr(why, exit.stderr) });
	if (exit.error !== undefined) return bad(`vitest did not start: ${exit.error}`);
	if (exit.code !== 0) return bad(`vitest list exited with ${exit.code ?? exit.signal}`);
	if (!existsSync(out)) return bad('vitest list wrote no JSON');
	let json: unknown;
	try {
		json = JSON.parse(readFileSync(out, 'utf8'));
	} catch (error) {
		return bad(`the list JSON does not parse: ${message(error)}`);
	}
	if (!Array.isArray(json)) return bad('the list JSON is not an array');
	const entries: { file: string; name: string }[] = [];
	for (const entry of json as unknown[]) {
		if (!isRecord(entry) || typeof entry.file !== 'string' || typeof entry.name !== 'string') {
			return bad('the list JSON holds a malformed entry');
		}
		entries.push({ file: relative(REPO, entry.file), name: entry.name });
	}
	return { ok: true, entries };
}

interface ReportTest {
	names: string[];
	status: string;
	duration: unknown;
	meta: unknown;
}
interface ReportFile {
	file: string;
	status: string;
	tests: ReportTest[];
}

function asReport(json: unknown): ReportFile[] {
	if (!isRecord(json) || !Array.isArray(json.testResults)) throw new Error('no testResults array');
	return (json.testResults as unknown[]).map((entry) => {
		if (!isRecord(entry) || typeof entry.name !== 'string' || typeof entry.status !== 'string') {
			throw new Error('a malformed file entry');
		}
		if (!Array.isArray(entry.assertionResults))
			throw new Error(`${entry.name}: no assertionResults`);
		const file = relative(REPO, entry.name);
		const tests = (entry.assertionResults as unknown[]).map((t): ReportTest => {
			const titles = isRecord(t) ? t.ancestorTitles : undefined;
			if (
				!isRecord(t) ||
				!Array.isArray(titles) ||
				!titles.every((title: unknown) => typeof title === 'string') ||
				typeof t.title !== 'string' ||
				typeof t.status !== 'string'
			) {
				throw new Error(`${file}: a malformed test entry`);
			}
			return {
				names: [...(titles as string[]), t.title],
				status: t.status,
				duration: t.duration,
				meta: t.meta
			};
		});
		return { file, status: entry.status, tests };
	});
}

/** Accepts a report only when it covers exactly the requested files, each with its full inventory count. */
function readRun(out: string, exit: Exit, files: string[], listed: Record<string, number>): Run {
	const bad = (why: string): Run => ({ ok: false, error: withStderr(why, exit.stderr) });
	if (exit.error !== undefined) return bad(`vitest did not start: ${exit.error}`);
	if (exit.code !== 0 && exit.code !== 1)
		return bad(`vitest exited with ${exit.code ?? exit.signal}`);
	if (!existsSync(out)) return bad('vitest wrote no JSON report');
	let report: ReportFile[];
	try {
		report = asReport(JSON.parse(readFileSync(out, 'utf8')));
	} catch (error) {
		return bad(`the JSON report is unreadable: ${message(error)}`);
	}
	const got = report.map((f) => f.file).sort();
	const want = [...files].sort();
	if (got.join('\n') !== want.join('\n')) {
		return bad(`the report covers ${got.join(', ') || 'no file'}, not ${want.join(', ')}`);
	}
	const results = new Map<Key, Outcome>();
	let failed = 0;
	for (const f of report) {
		if (f.tests.length !== listed[f.file]) {
			return bad(`${f.file}: ${f.tests.length} tests reported, ${listed[f.file]} in the inventory`);
		}
		let failedHere = 0;
		for (const t of f.tests) {
			const status =
				t.status === 'passed' ? 'passed' : t.status === 'failed' ? 'failed' : undefined;
			if (status === undefined) return bad(`${f.file}: a test is ${t.status}`);
			const key = keyOf(f.file, t.names.join(' > '));
			if (results.has(key)) return bad(`two tests are named ${key}`);
			results.set(key, {
				status,
				duration: typeof t.duration === 'number' ? t.duration : Number.NaN,
				assertionCalls:
					isRecord(t.meta) && typeof t.meta.assertionCalls === 'number'
						? t.meta.assertionCalls
						: undefined
			});
			if (status === 'failed') failedHere++;
		}
		if (f.status === 'failed' && failedHere === 0) {
			return bad(`${f.file} failed with no failing test: a suite that failed to load`);
		}
		failed += failedHere;
	}
	if ((exit.code === 1) !== failed > 0) {
		return bad(
			`vitest exited with ${exit.code} and ${failed} failing tests: an error outside the tests?`
		);
	}
	return { ok: true, results };
}

let runCount = 0;

/** One `vitest run` over `files`; `listed` holds the inventory's test count per file as listed. */
async function runTests(
	files: string[],
	serial: boolean,
	listed: Record<string, number>
): Promise<Run> {
	if (files.length === 0) return { ok: false, error: 'no file to run' };
	const unlisted = files.filter((file) => !(listed[file] > 0));
	if (unlisted.length > 0) {
		return { ok: false, error: `the inventory lists no tests for ${unlisted.join(', ')}` };
	}
	runCount++;
	const out = join(WORK, `run-${runCount}.json`);
	rmSync(out, { force: true });
	const exit = await spawnVitest([
		VITEST,
		'run',
		'--config',
		CONFIG,
		'--root',
		REPO,
		'--reporter=json',
		`--outputFile=${out}`,
		...(serial ? ['--no-file-parallelism'] : []),
		...files
	]);
	return readRun(out, exit, files, listed);
}

// ── Output ───────────────────────────────────────────────────────────────────────────────────

function print(label: string, r: Result): void {
	console.log(`[${r.status}] ${label}${r.detail === '' ? '' : `: ${r.detail}`}`);
	for (const note of r.notes) console.log(`    ${note}`);
}

function info(label: string, r: Result): void {
	console.log(`[INFO] ${label}: ${r.status === 'PASS' ? '' : `${r.status}: `}${r.detail}`);
	for (const note of r.notes) console.log(`    ${note}`);
}

function guard(check: () => Result): Result {
	try {
		return check();
	} catch (error) {
		return unverified(`the check threw: ${message(error)}`);
	}
}

type Recorder = (label: string, r: Result) => void;

// ── The run ──────────────────────────────────────────────────────────────────────────────────

/** Step 4: one `vitest list`; main's pairs are the copies' (mapped back) plus every other file's. */
async function inventory(
	base: string,
	scope: string[],
	full: boolean
): Promise<{ result: Result; listed: Record<string, number> }> {
	const listing = await listTests();
	if (!listing.ok)
		return { result: unverified(`vitest list failed: ${listing.error}`), listed: {} };
	const listed: Record<string, number> = {};
	const copies = FILES.map(copyOf);
	const main: Key[] = [];
	const branch: Key[] = [];
	for (const { file, name } of listing.entries) {
		listed[file] = (listed[file] ?? 0) + 1;
		const key = keyOf(fromCopy(file), name);
		if (copies.includes(file)) main.push(key);
		else if (FILES.includes(file)) branch.push(key);
		else {
			main.push(key);
			branch.push(key);
		}
	}
	const result = checkInventory(main, branch, scope, full);
	const outside = testFilesOutside(git(['diff', '--name-status', base, 'HEAD']));
	if (outside.length === 0) return { result, listed };
	return {
		result: fail(
			`${outside.length} test files changed outside the six, so their names on main are unknown; ${result.detail}`,
			[...outside.map((path) => `changed: ${path}`), ...result.notes]
		),
		listed
	};
}

interface Baseline {
	green: boolean;
	oldCounts: Counts;
	newCounts: Counts;
	before: Map<string, number[]>;
	after: Map<string, number[]>;
}

function collect(run: Run, counts: Counts, sums: Map<string, number[]>): void {
	if (!run.ok) return;
	const perFile = new Map<string, number>();
	for (const [key, outcome] of run.results) {
		counts.set(key, [...(counts.get(key) ?? []), outcome.assertionCalls]);
		const file = fromCopy(fileOf(key));
		perFile.set(file, (perFile.get(file) ?? 0) + outcome.duration);
	}
	for (const [file, sum] of perFile) sums.set(file, [...(sums.get(file) ?? []), sum]);
}

/** Step 7: three alternating serial runs of the copies and the real files; records check 5. */
async function baseline(
	scope: string[],
	listed: Record<string, number>,
	record: Recorder
): Promise<Baseline> {
	const b: Baseline = {
		green: false,
		oldCounts: new Map(),
		newCounts: new Map(),
		before: new Map(),
		after: new Map()
	};
	const oldRuns: Run[] = [];
	const newRuns: Run[] = [];
	for (let i = 0; i < RUNS; i++) {
		const was = await runTests(scope.map(copyOf), true, listed);
		oldRuns.push(was);
		collect(was, b.oldCounts, b.before);
		if (!was.ok) break;
		const now = await runTests(scope, true, listed);
		newRuns.push(now);
		collect(now, b.newCounts, b.after);
		if (!now.ok) break;
	}
	const old = checkOldTests(oldRuns);
	record('5 old tests on the new components', old);
	const newFailing = unique(newRuns.flatMap((run) => (run.ok ? failingKeys(run.results) : [])));
	const newErrors = newRuns.flatMap((run, i) => (run.ok ? [] : [`run ${i + 1}: ${run.error}`]));
	if (newFailing.length > 0) {
		record('new tests on the new components', fail(newFailing.join('; ')));
	} else if (newErrors.length > 0) {
		record('new tests on the new components', unverified(newErrors.join('; ')));
	}
	b.green =
		old.status === 'PASS' &&
		newRuns.length === RUNS &&
		newFailing.length === 0 &&
		newErrors.length === 0;
	return b;
}

function splitRun(run: Run): { old: Run; next: Run } {
	if (!run.ok) return { old: run, next: run };
	const old = new Map<Key, Outcome>();
	const next = new Map<Key, Outcome>();
	for (const [key, outcome] of run.results) {
		if (fileOf(key).endsWith(COPY_EXT)) old.set(key, outcome);
		else next.set(key, outcome);
	}
	return { old: { ok: true, results: old }, next: { ok: true, results: next } };
}

/** Step 8: each patch in table order, then the `6 breaks` aggregate. */
async function breaksAndControls(
	scope: string[],
	full: boolean,
	listed: Record<string, number>,
	withCopies: string,
	record: Recorder
): Promise<void> {
	const files = [...scope.map(copyOf), ...scope];
	const patches = [
		...BREAKS.map((patch) => ({ kind: 'break' as const, patch })),
		...CONTROLS.map((patch) => ({ kind: 'control' as const, patch }))
	];
	const tally = {
		break: { PASS: 0, FAIL: 0, UNVERIFIED: 0, unseen: 0 },
		control: { PASS: 0, FAIL: 0, UNVERIFIED: 0, unseen: 0 }
	};
	const statuses: Status[] = [];
	let skip = '';
	for (const { kind, patch } of patches) {
		let r: Result | 'not seen';
		if (skip !== '') {
			r = unverified(`skipped: ${skip}`);
		} else {
			const outcome = await applyPatch(patch, () => runTests(files, false, listed));
			if (outcome.kind === 'not applied') {
				r = unverified(outcome.error);
			} else if (outcome.kind === 'restore failed') {
				skip = 'an earlier patch was not restored';
				r = unverified(outcome.error);
			} else {
				const now = statusOrError();
				if (now !== withCopies) {
					skip = 'git status changed after an earlier patch';
					r = unverified(`git status changed after the patch: ${oneLine(now) || 'clean'}`);
				} else {
					const { old, next } = splitRun(outcome.run);
					r = kind === 'break' ? classifyBreak(old, next, full) : classifyControl(old, next, full);
				}
			}
		}
		if (r === 'not seen') {
			tally[kind].unseen++;
			continue;
		}
		record(`6 ${kind} ${patch.id}`, r);
		statuses.push(r.status);
		tally[kind][r.status]++;
	}
	if (full) {
		const status = statuses.length === patches.length ? worst(statuses) : 'UNVERIFIED';
		const detail = `${tally.break.PASS} of ${BREAKS.length} covered; controls: ${tally.control.PASS} of ${CONTROLS.length} pass`;
		record('6 breaks', { status, detail, notes: [] });
		return;
	}
	// Seen: the old tests failed under the patch (PASS or FAIL). UNVERIFIED ones are counted apart.
	const seenBreaks = tally.break.PASS + tally.break.FAIL;
	const seenControls = tally.control.PASS + tally.control.FAIL;
	const failed = tally.break.FAIL + tally.control.FAIL;
	const open = tally.break.UNVERIFIED + tally.control.UNVERIFIED;
	const verdict =
		(failed === 0 ? 'all pass' : `${failed} fail`) + (open > 0 ? `; ${open} unverified` : '');
	const detail =
		`${seenBreaks} breaks and ${seenControls} controls seen, ${verdict}; ` +
		`${tally.break.unseen} breaks and ${tally.control.unseen} controls do not touch this file's old tests; the full run checks them`;
	if (seenBreaks === 0) {
		record('6 breaks', {
			status: worst([...statuses, 'UNVERIFIED']),
			detail,
			notes: ["no break touches this file's old tests"]
		});
		return;
	}
	record('6 breaks', { status: worst(statuses), detail, notes: [] });
}

const CHECKS_IN_ORDER = [
	'1 inventory',
	'2 events',
	'4 presence pairing',
	'8 fallback markers',
	'5 old tests on the new components',
	'3 assertion counts',
	'6 breaks',
	'7 timing'
];

/** A full run (`only` undefined) or a partial run for one file. */
async function verify(only: string | undefined): Promise<0 | 1 | 2> {
	const full = only === undefined;
	const scope = only === undefined ? FILES : [only];
	const results: Result[] = [];
	const recorded = new Set<string>();
	const unverifiedLabels: string[] = [];
	const record: Recorder = (label, r) => {
		print(label, r);
		results.push(r);
		recorded.add(label);
		if (r.status === 'UNVERIFIED') unverifiedLabels.push(label);
	};
	const finish = (): 0 | 1 | 2 => {
		const list = unverifiedLabels.length > 0 ? unverifiedLabels.join(', ') : 'none';
		console.log(`UNVERIFIED: ${list}`);
		console.log(resultLine(results, full, only ?? ''));
		return exitCode(results, full);
	};

	// 1. A clean tree, or nothing else happens.
	const start = statusOrError();
	if (start !== '') {
		record(
			'clean tree',
			unverified(
				'commit or stash your changes first',
				start.split('\n').filter((line) => line !== '')
			)
		);
		return finish();
	}
	record('clean tree', pass(''));

	// 2. The base.
	let base: string;
	try {
		base = git(['merge-base', 'main', 'HEAD']).trim();
		const head = git(['rev-parse', '--short', 'HEAD']).trim();
		const short = git(['rev-parse', '--short', base]).trim();
		console.log(
			`verify-test-migration: HEAD ${head} against base ${short} (merge-base of HEAD and main)`
		);
	} catch (error) {
		record('base', unverified(`git merge-base main HEAD failed: ${message(error)}`));
		return finish();
	}

	// 3. The temporary files and main's six files beside the originals; `finally` removes the copies.
	const written: string[] = [];
	let stopped = false;
	let aborted = false;
	try {
		prepareWork();
		const mainSources: Record<string, string> = {};
		for (const file of FILES) {
			const bytes = execFileSync('git', ['show', `${base}:${file}`], {
				cwd: REPO,
				maxBuffer: 64 * 1024 * 1024,
				stdio: ['ignore', 'pipe', 'pipe']
			});
			const copy = copyOf(file);
			if (existsSync(join(REPO, copy))) throw new Error(`${copy} exists already`);
			written.push(copy);
			writeFileSync(join(REPO, copy), bytes);
			mainSources[file] = bytes.toString('utf8');
		}
		const withCopies = treeStatus();

		// 4. Check 1, inventory (always whole).
		let listed: Record<string, number> = {};
		try {
			const found = await inventory(base, scope, full);
			listed = found.listed;
			record('1 inventory', found.result);
		} catch (error) {
			if (error instanceof Interrupted) throw error;
			record('1 inventory', unverified(`the check threw: ${message(error)}`));
		}

		// 5 and 6. Checks 2, 4 and 8, from the sources.
		const branchSources: Record<string, string> = {};
		for (const file of FILES) branchSources[file] = readFileSync(join(REPO, file), 'utf8');
		record(
			'2 events',
			guard(() => checkEvents(mainSources, branchSources, scope))
		);
		record(
			'4 presence pairing',
			guard(() => checkPairing(branchSources, scope, PAIRING_EXCEPTIONS))
		);
		record(
			'8 fallback markers',
			guard(() => checkMarkers(branchSources, scope))
		);

		// 7. The baseline runs: check 5 here, check 3 next, and the durations for check 7.
		const runs = await baseline(scope, listed, record);
		record(
			'3 assertion counts',
			guard(() => checkCounts(runs.oldCounts, runs.newCounts, scope, COUNT_DROPS))
		);

		// 8. Check 6, breaks and controls, only on a green baseline.
		if (runs.green) await breaksAndControls(scope, full, listed, withCopies, record);
		else record('6 breaks', unverified('the baseline is not green'));

		// 9. Check 7, timing.
		const timing = guard(() => checkTiming(runs.before, runs.after, scope, full));
		if (full) record('7 timing', timing);
		else info('7 timing (partial run, not judged)', timing);
		// A signal after the last Vitest run still makes the run UNVERIFIED.
		if (interrupted) throw new Interrupted();
	} catch (error) {
		aborted = true;
		if (error instanceof Interrupted) stopped = true;
		else record('checker', unverified(`stopped by an error: ${message(error)}`));
	} finally {
		const restored = restorePending();
		const left: string[] = [];
		for (const copy of written) {
			try {
				rmSync(join(REPO, copy), { force: true });
			} catch (error) {
				left.push(`${copy}: ${message(error)}`);
			}
		}
		if (!restored) record('restore', unverified('a patched file was not restored'));
		if (left.length > 0) record('copies removed', unverified(left.join('; ')));
	}
	if (stopped) record('interrupted', unverified(''));
	if (aborted) {
		for (const label of CHECKS_IN_ORDER) {
			if (recorded.has(label) || (label === '7 timing' && !full)) continue;
			record(label, unverified('skipped: the run stopped early'));
		}
	}

	// 10. The tree is clean again.
	const end = statusOrError();
	record('clean tree afterwards', end === '' ? pass('') : unverified(oneLine(end)));

	// 11. The UNVERIFIED list and the result line.
	return finish();
}

// ── Self-test ────────────────────────────────────────────────────────────────────────────────

interface SelfTestCase {
	name: string;
	expected: string;
	run: () => string | Promise<string>;
}

const statusOf = (r: Result | 'not seen'): string => (r === 'not seen' ? r : r.status);

/** Applies a patch that must not apply, and checks the file's bytes stay the same. */
async function patchCase(patch: Patch): Promise<string> {
	const path = join(REPO, patch.file);
	const before = readFileSync(path);
	let ran = false;
	const outcome = await applyPatch(patch, async () => {
		ran = true;
		return { ok: false, error: 'the runner should not run' };
	});
	if (!readFileSync(path).equals(before)) {
		writeFileSync(path, before);
		return 'the file changed';
	}
	if (ran) return 'the runner ran';
	return outcome.kind === 'not applied' ? 'UNVERIFIED' : outcome.kind;
}

function selfTestCases(): SelfTestCase[] {
	const GS1_TEST = 'src/lib/components/Gs1Breakdown.test.ts';
	const SHARE_TEST = 'src/lib/components/ShareLink.test.ts';
	const PAGE_TEST = 'src/routes/page.test.ts';
	const SELF = 'src/lib/components/SelfTest.test.ts';
	const synthetic = (n: number, tag: string): Key[] =>
		Array.from({ length: n }, (_, i) =>
			keyOf('src/lib/synthetic.test.ts', `synthetic > ${tag} ${i + 1}`)
		);
	const froms = RENAMES.map((r) => keyOf(r.file, r.from));
	const keys = [...froms, ...synthetic(MIN_PAIRS - froms.length, 'test')];
	const events = (n: number): string =>
		'fireEvent.click(button);\n'.repeat(n) + '// fireEvent.click moves no focus\n';
	const sources = (changes: Record<string, string> = {}): Record<string, string> => ({
		...Object.fromEntries(FILES.map((file) => [file, events(EVENTS_ON_MAIN[file])])),
		...changes
	});
	const counted = (key: Key, values: (number | undefined)[]): Counts => new Map([[key, values]]);
	const was = (name: string): Key => keyOf(copyOf(SHARE_TEST), name);
	const now = (name: string): Key => keyOf(SHARE_TEST, name);
	const run = (entries: [Key, 'passed' | 'failed'][]): Run => ({
		ok: true,
		results: new Map(
			entries.map(([key, status]) => [key, { status, duration: 1, assertionCalls: 1 }])
		)
	});
	const sums = (files: string[], ms: number): Map<string, number[]> =>
		new Map(files.map((file) => [file, [ms, ms, ms]]));
	const pairing = (source: string, exceptions: Record<string, string> = {}): string =>
		checkPairing({ [SELF]: source }, [SELF], exceptions).status;
	const markers = (source: string): string => checkMarkers({ [SELF]: source }, [SELF]).status;
	const rename = RENAMES[1];
	return [
		{
			name: 'checkInventory, the same 737 synthetic keys on both sides',
			expected: 'PASS',
			run: () => checkInventory(keys, keys, [GS1_TEST], false).status
		},
		{
			name: 'checkInventory, the branch lacks one key',
			expected: 'FAIL',
			run: () => checkInventory([...keys, ...synthetic(1, 'extra')], keys, [GS1_TEST], false).status
		},
		{
			name: 'checkInventory, 10 keys on each side',
			expected: 'UNVERIFIED',
			run: () => checkInventory(synthetic(10, 'test'), synthetic(10, 'test'), FILES, true).status
		},
		{
			name: 'checkInventory, a rename whose from and to are both absent',
			expected: 'FAIL',
			run: () => {
				const without = [...froms.slice(1), ...synthetic(MIN_PAIRS - froms.length + 1, 'test')];
				return checkInventory(without, without, [GS1_TEST], false).status;
			}
		},
		{
			name: 'checkEvents, main sequences of the EVENTS_ON_MAIN lengths, branch texts equal',
			expected: 'PASS',
			run: () => checkEvents(sources(), sources(), FILES).status
		},
		{
			name: "checkEvents, RowEditor's branch text changed, sequence unchanged (no <details> click)",
			expected: 'FAIL',
			run: () => {
				const changed = events(EVENTS_ON_MAIN[DETAILS_CLICK.file]) + '// migrated\n';
				return checkEvents(sources(), sources({ [DETAILS_CLICK.file]: changed }), FILES).status;
			}
		},
		{
			name: 'checkEvents, main page sequence of 59',
			expected: 'UNVERIFIED',
			run: () => {
				const short = sources({ [PAGE_TEST]: events(59) });
				return checkEvents(short, short, FILES).status;
			}
		},
		{
			name: 'checkCounts, one test 3 -> 2, not listed',
			expected: 'FAIL',
			run: () =>
				checkCounts(counted(was('a'), [3, 3, 3]), counted(now('a'), [2, 2, 2]), [SHARE_TEST], {})
					.status
		},
		{
			name: 'checkCounts, a listed drop whose counts are equal',
			expected: 'FAIL',
			run: () =>
				checkCounts(counted(was('a'), [3, 3, 3]), counted(now('a'), [3, 3, 3]), [SHARE_TEST], {
					[now('a')]: 'a reason'
				}).status
		},
		{
			name: 'checkCounts, a test with 2 of 3 counts',
			expected: 'UNVERIFIED',
			run: () =>
				checkCounts(counted(was('a'), [3, 3]), counted(now('a'), [3, 3, 3]), [SHARE_TEST], {})
					.status
		},
		{
			name: 'checkCounts, a test counted 3, 3, 4',
			expected: 'UNVERIFIED',
			run: () =>
				checkCounts(counted(was('a'), [3, 3, 4]), counted(now('a'), [3, 3, 3]), [SHARE_TEST], {})
					.status
		},
		{
			name: "checkPairing, expect(screen.queryByRole('alert')).toBeNull(); alone",
			expected: 'FAIL',
			run: () => pairing("\texpect(screen.queryByRole('alert')).toBeNull();\n")
		},
		{
			name: "checkPairing, the same plus screen.getByRole('alert');",
			expected: 'PASS',
			run: () =>
				pairing("\texpect(screen.queryByRole('alert')).toBeNull();\n\tscreen.getByRole('alert');\n")
		},
		{
			name: "checkPairing, const x = screen.queryByText('a'); plus a paired absence check",
			expected: 'FAIL',
			run: () =>
				pairing(
					"\tconst x = screen.queryByText('a');\n\texpect(screen.queryByRole('alert')).toBeNull();\n\tscreen.getByRole('alert');\n"
				)
		},
		{
			name: 'checkPairing, a file with presence queries only',
			expected: 'UNVERIFIED',
			run: () =>
				pairing(
					"\tscreen.getByRole('button', { name: 'Start' });\n\tscreen.getAllByRole('listitem');\n"
				)
		},
		{
			name: 'checkPairing, a regex argument holding an unbalanced \\( on both sides',
			expected: 'PASS',
			run: () =>
				pairing(
					'\texpect(screen.queryByText(/\\(01\\) GTIN|\\(/)).toBeNull();\n\tscreen.getByText(/\\(01\\) GTIN|\\(/);\n'
				)
		},
		{
			name: 'checkPairing, a Prettier-wrapped expect( with within(row) and getAllByLabelText(BREAKDOWN)',
			expected: 'PASS',
			run: () =>
				pairing(
					'\texpect(\n\t\twithin(row).queryByLabelText(BREAKDOWN)\n\t).toBeNull();\n\tscreen.getAllByLabelText(BREAKDOWN);\n'
				)
		},
		{
			name: 'classifyBreak, old {a}, new {a, b}',
			expected: 'PASS',
			run: () =>
				statusOf(
					classifyBreak(
						run([
							[was('a'), 'failed'],
							[was('b'), 'passed']
						]),
						run([
							[now('a'), 'failed'],
							[now('b'), 'failed']
						]),
						true
					)
				)
		},
		{
			name: 'classifyBreak, old {a, b}, new {a}',
			expected: 'FAIL',
			run: () =>
				statusOf(
					classifyBreak(
						run([
							[was('a'), 'failed'],
							[was('b'), 'failed']
						]),
						run([
							[now('a'), 'failed'],
							[now('b'), 'passed']
						]),
						true
					)
				)
		},
		{
			name: 'classifyBreak, old {}, full run',
			expected: 'UNVERIFIED',
			run: () =>
				statusOf(classifyBreak(run([[was('a'), 'passed']]), run([[now('a'), 'failed']]), true))
		},
		{
			name: 'classifyBreak, old run not ok',
			expected: 'UNVERIFIED',
			run: () =>
				statusOf(
					classifyBreak(
						{ ok: false, error: 'vitest exited with 2' },
						run([[now('a'), 'failed']]),
						true
					)
				)
		},
		{
			name: "classifyBreak, old {a rename's from}, new {its to}",
			expected: 'PASS',
			run: () =>
				statusOf(
					classifyBreak(
						run([[keyOf(copyOf(rename.file), rename.from), 'failed']]),
						run([[keyOf(rename.file, rename.to), 'failed']]),
						true
					)
				)
		},
		{
			name: 'classifyControl, old {a}, new {}',
			expected: 'PASS',
			run: () =>
				statusOf(classifyControl(run([[was('a'), 'failed']]), run([[now('a'), 'passed']]), true))
		},
		{
			name: 'classifyControl, old {a}, new {a}',
			expected: 'FAIL',
			run: () =>
				statusOf(classifyControl(run([[was('a'), 'failed']]), run([[now('a'), 'failed']]), true))
		},
		{
			name: 'classifyControl, old {}, full run',
			expected: 'UNVERIFIED',
			run: () =>
				statusOf(classifyControl(run([[was('a'), 'passed']]), run([[now('a'), 'passed']]), true))
		},
		{
			name: 'checkTiming, ratio 2.0',
			expected: 'PASS',
			run: () => checkTiming(sums(FILES, 100), sums(FILES, 200), FILES, true).status
		},
		{
			name: 'checkTiming, ratio 3.0',
			expected: 'FAIL',
			run: () => checkTiming(sums(FILES, 100), sums(FILES, 300), FILES, true).status
		},
		{
			name: 'checkTiming, a file missing',
			expected: 'UNVERIFIED',
			run: () => checkTiming(sums(FILES, 100), sums(FILES.slice(1), 200), FILES, true).status
		},
		{
			name: 'checkMarkers, eslint-disable-next-line testing-library/no-node-access with no reason',
			expected: 'FAIL',
			run: () =>
				markers(
					'\t// eslint-disable-next-line testing-library/no-node-access\n\tconst items = () => c.querySelectorAll(ITEM);\n'
				)
		},
		{
			name: "checkMarkers, the same with -- stage structure: the engine's items",
			expected: 'PASS',
			run: () =>
				markers(
					"\t// eslint-disable-next-line testing-library/no-node-access -- stage structure: the engine's items\n\tconst items = () => c.querySelectorAll(ITEM);\n\titems();\n"
				)
		},
		{
			name: "patch application, find 'NO SUCH TEXT' in src/routes/+page.svelte; bytes unchanged",
			expected: 'UNVERIFIED',
			run: () =>
				patchCase({ id: 'self-test-absent', file: SETUP_PAGE, find: 'NO SUCH TEXT', replace: '' })
		},
		{
			name: 'patch application, find class="field", which occurs more than once; bytes unchanged',
			expected: 'UNVERIFIED',
			run: () =>
				patchCase({
					id: 'self-test-repeated',
					file: SETUP_PAGE,
					find: 'class="field"',
					replace: ''
				})
		},
		{
			name: 'the Vitest runner, src/no-such-file.test.ts',
			expected: 'UNVERIFIED',
			run: async () => {
				const file = 'src/no-such-file.test.ts';
				const r = await runTests([file], true, { [file]: 1 });
				return r.ok ? 'PASS' : 'UNVERIFIED';
			}
		},
		{
			name: 'exitCode, [PASS, UNVERIFIED] full',
			expected: '1',
			run: () => String(exitCode([pass(''), unverified('')], true))
		},
		{
			name: 'exitCode, [PASS, FAIL] full',
			expected: '1',
			run: () => String(exitCode([pass(''), fail('')], true))
		},
		{
			name: 'exitCode, [PASS] full',
			expected: '0',
			run: () => String(exitCode([pass('')], true))
		},
		{
			name: 'exitCode, [PASS] partial',
			expected: '2',
			run: () => String(exitCode([pass('')], false))
		},
		// Fix round 1 (F2 to F4): each case flips if its fix regresses.
		{
			name: "checkPairing, expect(screen.queryAllByRole('x').length).toBe(0); alone",
			expected: 'FAIL',
			run: () => pairing("\texpect(screen.queryAllByRole('x').length).toBe(0);\n")
		},
		{
			name: "checkPairing, expect(screen.queryAllByRole('row').length).toStrictEqual(0); plus screen.getAllByRole('row');",
			expected: 'PASS',
			run: () =>
				pairing(
					"\texpect(screen.queryAllByRole('row').length).toStrictEqual(0);\n\tscreen.getAllByRole('row');\n"
				)
		},
		{
			name: "checkPairing, expect(screen.queryByText('x')).not.toBeInTheDocument(); alone",
			expected: 'FAIL',
			run: () => pairing("\texpect(screen.queryByText('x')).not.toBeInTheDocument();\n")
		},
		{
			name: 'checkPairing, the presence twin only in a comment',
			expected: 'FAIL',
			run: () =>
				pairing(
					"\texpect(screen.queryByRole('alert', { name: 'Typo' })).toBeNull();\n\t// screen.getByRole('alert', { name: 'Typo' });\n"
				)
		},
		{
			name: 'checkPairing, the presence twin only in a string and in template text',
			expected: 'FAIL',
			run: () =>
				pairing(
					"\texpect(screen.queryByRole('alert')).toBeNull();\n\tconst a = \"screen.getByRole('alert')\";\n\tconst b = `screen.getByRole('alert')`;\n"
				)
		},
		{
			name: "checkPairing, the presence twin in a template's ${…} code still pairs",
			expected: 'PASS',
			run: () =>
				pairing(
					"\texpect(screen.queryByText('a')).toBeNull();\n\tconst t = `${screen.getByText('a').textContent}`;\n"
				)
		},
		{
			name: 'checkCounts, a listed drop whose reason is blank',
			expected: 'FAIL',
			run: () =>
				checkCounts(counted(was('a'), [3, 3, 3]), counted(now('a'), [2, 2, 2]), [SHARE_TEST], {
					[now('a')]: '  '
				}).status
		},
		{
			name: 'checkPairing, a listed exception whose reason is blank',
			expected: 'FAIL',
			run: () =>
				pairing("\texpect(screen.queryByRole('alert')).toBeNull();\n", {
					[keyOf(SELF, "ByRole('alert')")]: ''
				})
		},
		{
			name: 'checkCounts, every count 0 on both sides',
			expected: 'UNVERIFIED',
			run: () =>
				checkCounts(counted(was('a'), [0, 0, 0]), counted(now('a'), [0, 0, 0]), [SHARE_TEST], {})
					.status
		}
	];
}

/** The plan's 37 cases plus the 9 that fix round 1 added for F2 to F4. */
const SELF_TEST_CASES = 46;

async function selfTest(): Promise<0 | 1> {
	const start = statusOrError();
	if (start !== '') {
		print(
			'clean tree',
			unverified(
				'commit or stash your changes first',
				start.split('\n').filter((line) => line !== '')
			)
		);
		return 1;
	}
	print('clean tree', pass(''));
	const cases = selfTestCases();
	let ok = 0;
	let stopped = false;
	try {
		prepareWork();
		for (const [i, c] of cases.entries()) {
			let got: string;
			try {
				got = await c.run();
			} catch (error) {
				if (error instanceof Interrupted) throw error;
				got = `an error (${message(error)})`;
			}
			const good = got === c.expected;
			if (good) ok++;
			console.log(
				`self-test ${i + 1} ${c.name}: got ${got}, expected ${c.expected} — ${good ? 'ok' : 'NOT OK'}`
			);
		}
		if (interrupted) throw new Interrupted();
	} catch (error) {
		if (!(error instanceof Interrupted)) throw error;
		stopped = true;
	} finally {
		restorePending();
	}
	if (stopped) print('interrupted', unverified(''));
	const end = statusOrError();
	print('clean tree afterwards', end === '' ? pass('') : unverified(oneLine(end)));
	console.log(`SELF-TEST: ${ok} of ${cases.length} ok`);
	return ok === cases.length && cases.length === SELF_TEST_CASES && end === '' && !stopped ? 0 : 1;
}

// ── Entry point ──────────────────────────────────────────────────────────────────────────────

const USAGE = [
	'usage: node scripts/verify-test-migration.ts [--only <file> | --self-test]',
	`  <file> is one of: ${FILES.join(', ')}`
].join('\n');

async function main(): Promise<void> {
	process.on('SIGINT', onSignal);
	process.on('SIGTERM', onSignal);
	const args = process.argv.slice(2);
	if (args.length === 0) {
		process.exitCode = await verify(undefined);
	} else if (args.length === 1 && args[0] === '--self-test') {
		process.exitCode = await selfTest();
	} else if (args.length === 2 && args[0] === '--only' && FILES.includes(args[1])) {
		process.exitCode = await verify(args[1]);
	} else {
		console.error(USAGE);
		process.exitCode = 1;
	}
}

// Called unconditionally: nothing imports this file, and a guard on `import.meta.main` (Node 24.2
// and later) would let an older Node exit 0 having run nothing.
main().catch((error: unknown) => {
	console.log(`[UNVERIFIED] checker: ${message(error)}`);
	console.log('RESULT: UNVERIFIED');
	process.exitCode = 1;
});

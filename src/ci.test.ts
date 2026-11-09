import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

// Takes a variable: Vite rewrites `new URL('literal', import.meta.url)` into an asset URL.
const here = (relative: string) => new URL(relative, import.meta.url);

/** A workflow line that is neither blank nor a comment. */
interface Line {
	/** Its count of leading spaces. */
	indent: number;
	/** Its key, without matching quotes around it, when it is a key line. */
	key: string | undefined;
	/** A key line's text after the colon, comment included. */
	rest: string;
}

/** A job as the reader sees it. */
interface Job {
	file: string;
	id: string;
	/** The check name the job reports, or undefined when the checker cannot know it. */
	reports: string | undefined;
	/** Its `name:` holds `${{`. */
	expression: boolean;
	/** It has a job-level `if:`. */
	conditional: boolean;
	/** It has a job-level `needs:`. */
	needs: boolean;
}

/** Spaces, a key maybe in matching quotes, `:`, then nothing or a space and the rest. */
const KEY_LINE = /^( *)(['"]?)([A-Za-z0-9_-]+)\2:((?: .*)?)$/;
/** A value in matching quotes, maybe followed by a comment; a `#` inside the quotes is text. */
const QUOTED = /^(['"])(.*?)\1(?:[ \t]+#.*)?$/;

/** The lines that are not blank and not comments, so that neither ends a block or is a key. */
const linesOf = (text: string): Line[] =>
	text
		.split(/\r?\n/)
		.filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
		.map((line) => {
			const match = KEY_LINE.exec(line);
			return {
				indent: line.length - line.replace(/^ +/, '').length,
				key: match?.[3],
				rest: match?.[4] ?? ''
			};
		});

/** A value without its trailing comment and outer spaces. */
const valueOf = (rest: string) => rest.replace(/[ \t]#.*$/, '').trim();

/** A `name:` value: the text between matching quotes, else the value. */
const nameOf = (rest: string) => QUOTED.exec(rest.trim())?.[2] ?? valueOf(rest);

/** The body of the indent-0 key line `key` with an empty value, up to the next indent-0 line. */
const blockOf = (lines: Line[], key: string): Line[] | undefined => {
	const start = lines.findIndex(
		(line) => line.indent === 0 && line.key === key && valueOf(line.rest) === ''
	);
	if (start < 0) return undefined;
	const end = lines.findIndex((line, i) => i > start && line.indent === 0);
	return lines.slice(start + 1, end < 0 ? lines.length : end);
};

/** A block's body cut at its indent-2 lines: each with the lines under it, up to the next one. */
const entriesOf = (body: Line[]) => {
	const entries: { head: Line; under: Line[] }[] = [];
	for (const line of body) {
		if (line.indent === 2) entries.push({ head: line, under: [] });
		else entries.at(-1)?.under.push(line);
	}
	return entries;
};

/**
 * The workflow's jobs in file order, or undefined (R1) when it has no block-form `jobs:`, or a line
 * directly under it that is not a key or is a job in flow form.
 */
const jobsOf = (file: string, lines: Line[]): Job[] | undefined => {
	const body = blockOf(lines, 'jobs');
	if (!body) return undefined;
	const heads = entriesOf(body);
	const entries = heads.flatMap(({ head, under }) =>
		head.key === undefined ? [] : [{ id: head.key, value: valueOf(head.rest), under }]
	);
	if (entries.length < heads.length || entries.some(({ value }) => value !== '')) return undefined;
	return entries.map(({ id, under }) => {
		const own = under.filter((line) => line.indent === 4);
		const nameLine = own.find((line) => line.key === 'name');
		const name = nameLine && nameOf(nameLine.rest);
		const expression = name?.includes('${{') ?? false;
		// A matrix job reports `<name> (<values>)`, a reusable-workflow call `<name> / <called job>`.
		const renamed = own.some((line) => line.key === 'strategy' || line.key === 'uses');
		return {
			file,
			id,
			reports: expression || renamed ? undefined : (name ?? id),
			expression,
			conditional: own.some((line) => line.key === 'if'),
			needs: own.some((line) => line.key === 'needs')
		};
	});
};

/** Rule 4 for one target: M4a, M4b or M4c, in that order of precedence, or undefined. */
const triggerProblem = (file: string, lines: Line[]): string | undefined => {
	const on = blockOf(lines, 'on');
	if (!on) return `${file}: on: is missing or not in block form`;
	const trigger = entriesOf(on).find(({ head }) => head.key === 'pull_request');
	if (!trigger) return `${file}: on: has no pull_request: trigger`;
	if (valueOf(trigger.head.rest) !== '' || trigger.under.some((line) => line.indent > 2))
		return `${file}: pull_request: has a value or nested keys`;
	return undefined;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

/** The ruleset's `required_status_checks` rules. */
const statusRules = (ruleset: unknown): Record<string, unknown>[] => {
	const rules: unknown = isObject(ruleset) ? ruleset.rules : undefined;
	const list: unknown[] = Array.isArray(rules) ? rules : [];
	return list.filter(
		(rule): rule is Record<string, unknown> =>
			isObject(rule) && rule.type === 'required_status_checks'
	);
};

/** A `required_status_checks` rule's checks; an empty list when they are not an array. */
const checksOf = (rule: Record<string, unknown>): unknown[] => {
	const checks: unknown = isObject(rule.parameters)
		? rule.parameters.required_status_checks
		: undefined;
	return Array.isArray(checks) ? checks : [];
};

/** Every problem with the workflows (file name → text) and the ruleset; [] when there is none. */
function problems(workflows: Record<string, string>, ruleset: unknown): string[] {
	const found: string[] = [];
	const rules = statusRules(ruleset);
	const checks = rules.length === 1 ? checksOf(rules[0]) : [];
	if (rules.length !== 1)
		found.push(`ruleset: expected exactly one required_status_checks rule, found ${rules.length}`);
	else if (checks.length === 0)
		found.push('ruleset: the required_status_checks rule lists no checks');

	const files = Object.keys(workflows)
		.sort()
		.map((file) => ({ file, lines: linesOf(workflows[file]) }));
	const jobs: Job[] = [];
	for (const { file, lines } of files) {
		const read = jobsOf(file, lines);
		if (!read) found.push(`${file}: jobs: is missing or not in block form`);
		for (const job of read ?? []) {
			if (job.expression)
				found.push(
					`${file}: job ${job.id} has an expression in name:, which the checker cannot read`
				);
			jobs.push(job);
		}
	}

	for (const check of checks) {
		const context = isObject(check) && typeof check.context === 'string' ? check.context : '';
		const reporting = jobs.filter((job) => job.reports === context);
		if (reporting.length === 0) found.push(`required check '${context}' is reported by no job`);
		if (reporting.length > 1) {
			const list = reporting.map((job) => `${job.file} job ${job.id}`).join(', ');
			found.push(`required check '${context}' is reported by ${reporting.length} jobs: ${list}`);
		}
		// A job-level if: or needs: lets GitHub skip the job, and a skipped required check passes.
		for (const job of reporting) {
			if (job.conditional)
				found.push(
					`${job.file}: job ${job.id} reports required check '${context}' and has a job-level if:`
				);
			if (job.needs)
				found.push(
					`${job.file}: job ${job.id} reports required check '${context}' and has a job-level needs:`
				);
		}
		// Every workflow when no job reports the check (the plan's Open questions 1).
		const targets =
			reporting.length === 0
				? files
				: files.filter(({ file }) => reporting.some((job) => job.file === file));
		for (const { file, lines } of targets) {
			const problem = triggerProblem(file, lines);
			if (problem) found.push(problem);
		}
		const id = isObject(check) ? check.integration_id : undefined;
		if (id === undefined) found.push(`required check '${context}' has no integration_id`);
		else if (id !== 15368)
			found.push(`required check '${context}' has integration_id ${JSON.stringify(id)}, not 15368`);
	}
	return [...new Set(found)];
}

/** Replaces the one occurrence of `from`; throws when it occurs zero times or more than once. */
const edit = (text: string, from: string, to: string): string => {
	const at = text.indexOf(from);
	if (at < 0 || text.indexOf(from, at + 1) >= 0)
		throw new Error(`edit: ${JSON.stringify(from)} must occur exactly once`);
	return text.slice(0, at) + to + text.slice(at + from.length);
};
const ruleset = (checks: unknown[]) => ({
	rules: [
		{ type: 'deletion' },
		{
			type: 'required_status_checks',
			parameters: { strict_required_status_checks_policy: true, required_status_checks: checks }
		}
	]
});
const RULESET = ruleset([{ context: 'checks', integration_id: 15368 }]);
const GOOD = `name: CI

on:
  pull_request:
  workflow_dispatch:

jobs:
  checks:
    name: checks
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - name: Lint
        run: npm run lint

  deploy:
    needs: checks
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - run: echo deploy
`;
const EXTRA = `on:
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
`;
const REUSABLE = edit(EXTRA, 'on:\n  pull_request:\n', 'on: workflow_call\n');
const IF = edit(
	GOOD,
	'    name: checks\n',
	"    name: checks\n    if: github.event_name == 'push'\n"
);
const check = (workflow: string) => problems({ 'ci.yml': workflow }, RULESET);
const withRuleset = (r: unknown) => problems({ 'ci.yml': GOOD }, r);
const withSecond = (name: string, text: string) =>
	problems({ 'ci.yml': GOOD, [name]: text }, RULESET);
const NO_JOB = "required check 'checks' is reported by no job";
const JOB_IF = "ci.yml: job checks reports required check 'checks' and has a job-level if:";
const NO_TRIGGER = 'ci.yml: on: has no pull_request: trigger';
const PR_FILTER = 'ci.yml: pull_request: has a value or nested keys';

describe('problems', () => {
	it('passes a known-good workflow and ruleset', () => expect(check(GOOD)).toEqual([]));

	// Testing: one copy per failure, each giving exactly its one message.
	it('reports a ruleset with no required_status_checks rule', () =>
		expect(withRuleset({ rules: [{ type: 'deletion' }] })).toEqual([
			'ruleset: expected exactly one required_status_checks rule, found 0'
		]));
	it('reports an empty list of checks', () =>
		expect(withRuleset(ruleset([]))).toEqual([
			'ruleset: the required_status_checks rule lists no checks'
		]));
	it('reports a renamed job', () =>
		expect(check(edit(GOOD, '    name: checks\n', '    name: check\n'))).toEqual([NO_JOB]));
	it('reports a second workflow with a job ID checks', () =>
		expect(withSecond('extra.yml', edit(EXTRA, '  lint:', '  checks:'))).toEqual([
			"required check 'checks' is reported by 2 jobs: ci.yml job checks, extra.yml job checks"
		]));
	it('reports a second workflow with a job named checks', () =>
		expect(
			withSecond('extra.yml', edit(EXTRA, '  lint:\n', '  lint:\n    name: checks\n'))
		).toEqual([
			"required check 'checks' is reported by 2 jobs: ci.yml job checks, extra.yml job lint"
		]));
	it('reports a job-level if: on the required job', () => expect(check(IF)).toEqual([JOB_IF]));
	it('reports a missing pull_request trigger', () =>
		expect(check(edit(GOOD, '  pull_request:\n', ''))).toEqual([NO_TRIGGER]));
	it('reports on: in flow form', () =>
		expect(
			check(
				edit(
					GOOD,
					'on:\n  pull_request:\n  workflow_dispatch:\n',
					'on: [pull_request, workflow_dispatch]\n'
				)
			)
		).toEqual(['ci.yml: on: is missing or not in block form']));
	it('reports paths: under pull_request:', () =>
		expect(
			check(edit(GOOD, '  pull_request:\n', "  pull_request:\n    paths: ['src/**']\n"))
		).toEqual([PR_FILTER]));
	it('reports types: under pull_request:', () =>
		expect(
			check(edit(GOOD, '  pull_request:\n', '  pull_request:\n    types: [opened]\n'))
		).toEqual([PR_FILTER]));
	it('reports a required check with no integration_id', () =>
		expect(withRuleset(ruleset([{ context: 'checks' }]))).toEqual([
			"required check 'checks' has no integration_id"
		]));
	it('reports integration_id 1', () =>
		expect(withRuleset(ruleset([{ context: 'checks', integration_id: 1 }]))).toEqual([
			"required check 'checks' has integration_id 1, not 15368"
		]));

	// Testing: copies that must still give [].
	it('reads the job ID when the required job has no name:', () =>
		expect(check(edit(GOOD, '    name: checks\n', ''))).toEqual([]));
	it('ignores a step-level if: on the required job', () =>
		expect(
			check(
				edit(
					GOOD,
					'      - name: Lint\n',
					"      - if: github.event_name == 'push'\n        run: echo push\n      - name: Lint\n"
				)
			)
		).toEqual([]));
	it('accepts push: with a branches: filter', () =>
		expect(
			check(
				edit(
					GOOD,
					'  workflow_dispatch:\n',
					'  push:\n    branches: [main]\n  workflow_dispatch:\n'
				)
			)
		).toEqual([]));

	// Review Focus 1 to 5, in order.
	it('skips comment and blank lines at any indent', () => {
		let text = edit(
			GOOD,
			'on:\n  pull_request:\n',
			'on:\n# Every pull request runs the gate.\n\n  pull_request: # no filters\n'
		);
		text = edit(text, 'jobs:\n', 'jobs:\n# The ruleset requires this job.\n\n');
		text = edit(
			text,
			'    name: checks\n',
			'    # Must match .github/rulesets/main.json.\n\n    name: checks\n    # if: always()\n'
		);
		expect(check(text)).toEqual([]);
	});
	it('does not read a commented-out trigger', () =>
		expect(check(edit(GOOD, '  pull_request:\n', '  # pull_request:\n'))).toEqual([NO_TRIGGER]));
	it.each(["name: 'checks'", 'name: "checks"', 'name: checks # required by the ruleset'])(
		'reads %s as checks',
		(line) => expect(check(edit(GOOD, 'name: checks\n', `${line}\n`))).toEqual([])
	);
	it('reads the jobs of a second workflow whose on: is not a block', () =>
		expect(withSecond('reusable.yml', REUSABLE)).toEqual([]));
	it('still counts a required job in that workflow', () =>
		expect(withSecond('reusable.yml', edit(REUSABLE, '  lint:', '  checks:'))).toEqual([
			"required check 'checks' is reported by 2 jobs: ci.yml job checks, reusable.yml job checks",
			'reusable.yml: on: is missing or not in block form'
		]));
	it('reports a workflow whose jobs it cannot read', () =>
		expect(
			problems(
				{
					'ci.yml': GOOD,
					'empty.yml': '',
					'flow.yml': 'on:\n  push:\n\njobs: { checks: { runs-on: ubuntu-latest } }\n'
				},
				RULESET
			)
		).toEqual([
			'empty.yml: jobs: is missing or not in block form',
			'flow.yml: jobs: is missing or not in block form'
		]));
	it('reports a job name it cannot evaluate', () =>
		expect(check(edit(GOOD, 'name: checks\n', 'name: ${{ matrix.name }}\n'))).toEqual([
			'ci.yml: job checks has an expression in name:, which the checker cannot read',
			NO_JOB
		]));
	it('does not count a matrix job as reporting its plain name', () =>
		expect(
			check(
				edit(
					GOOD,
					'    name: checks\n',
					'    name: checks\n    strategy:\n      matrix:\n        node: [22, 24]\n'
				)
			)
		).toEqual([NO_JOB]));
	it('reads CRLF line endings', () => expect(check(GOOD.replaceAll('\n', '\r\n'))).toEqual([]));
	it('finds a job-level if: in CRLF text', () =>
		expect(check(IF.replaceAll('\n', '\r\n'))).toEqual([JOB_IF]));

	// Final review findings.
	it('reports a job-level needs: on the required job', () =>
		expect(check(edit(GOOD, '    name: checks\n', '    name: checks\n    needs: lint\n'))).toEqual([
			"ci.yml: job checks reports required check 'checks' and has a job-level needs:"
		]));
	it('reads a quoted job-level if: key', () =>
		expect(check(edit(GOOD, '    name: checks\n', "    name: checks\n    'if': false\n"))).toEqual([
			JOB_IF
		]));
	it('counts a quoted job ID in a second workflow', () =>
		expect(withSecond('extra.yml', edit(EXTRA, '  lint:', "  'checks':"))).toEqual([
			"required check 'checks' is reported by 2 jobs: ci.yml job checks, extra.yml job checks"
		]));
	it('reports a line in jobs: that is not a key', () =>
		expect(check(edit(GOOD, 'jobs:\n', 'jobs:\n  - stray\n'))).toEqual([
			'ci.yml: jobs: is missing or not in block form',
			NO_JOB
		]));
	it('does not count a reusable-workflow call as reporting its plain name', () =>
		expect(
			check(
				edit(
					GOOD,
					'    name: checks\n',
					'    name: checks\n    uses: ./.github/workflows/build.yml\n'
				)
			)
		).toEqual([NO_JOB]));
	it('reports a flow-form job', () =>
		expect(
			withSecond(
				'extra.yml',
				'on:\n  pull_request:\n\njobs:\n  checks: { runs-on: ubuntu-latest, if: false }\n'
			)
		).toEqual(['extra.yml: jobs: is missing or not in block form']));
	it('reports pull_request: with a flow-form value', () =>
		expect(
			check(edit(GOOD, '  pull_request:\n', "  pull_request: { paths: ['src/**'] }\n"))
		).toEqual([PR_FILTER]));
	it('reports two required_status_checks rules', () =>
		expect(
			withRuleset({
				rules: [
					...ruleset([{ context: 'checks', integration_id: 15368 }]).rules,
					{ type: 'required_status_checks', parameters: { required_status_checks: [] } }
				]
			})
		).toEqual(['ruleset: expected exactly one required_status_checks rule, found 2']));
});

describe('the committed files', () => {
	it('have no problem', () => {
		// Read inside the test: a missing file fails here with its path, and the inline tests still run.
		const workflows = Object.fromEntries(
			readdirSync(fileURLToPath(here('../.github/workflows/'))).map((name) => [
				name,
				readFileSync(here('../.github/workflows/' + name), 'utf8')
			])
		);
		const committed: unknown = JSON.parse(
			readFileSync(here('../.github/rulesets/main.json'), 'utf8')
		);
		expect(problems(workflows, committed)).toEqual([]);
	});
});

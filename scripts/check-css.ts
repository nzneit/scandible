import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

/** The 28 names of the spec's theme table ("Theme and tokens"), row by row, left pair then right
 *  pair. */
export const THEME_TOKENS: readonly string[] = [
	'--color-base-100',
	'--color-base-content',
	'--color-base-200',
	'--color-base-300',
	'--color-primary',
	'--color-primary-content',
	'--color-secondary',
	'--color-secondary-content',
	'--color-accent',
	'--color-accent-content',
	'--color-neutral',
	'--color-neutral-content',
	'--color-info',
	'--color-info-content',
	'--color-success',
	'--color-success-content',
	'--color-warning',
	'--color-warning-content',
	'--color-error',
	'--color-error-content',
	'--radius-selector',
	'--radius-field',
	'--radius-box',
	'--size-selector',
	'--size-field',
	'--border',
	'--depth',
	'--noise'
];

export interface CssRule {
	selector: string; // the prelude: comments removed, whitespace collapsed to one space, trimmed
	declarations: string; // the block's own text, comments and nested blocks removed, trimmed
}

/** At-rules whose blocks hold style rules; the blocks of every other at-rule are skipped whole. */
const GROUPING_AT_RULES = new Set([
	'media',
	'supports',
	'layer',
	'container',
	'scope',
	'starting-style'
]);

interface Block {
	kind: 'group' | 'style' | 'skip';
	rule?: CssRule; // set when kind is 'style'
	own: string; // the block's own text so far
	segment: string; // the text since the last {, } or ; at this depth
}

/** Every style rule, in order of its opening brace, including rules nested in @media, @supports,
 *  @layer, @container, @scope, @starting-style and in other style rules. Comments, the insides of
 *  strings and of parentheses are plain text; the blocks of every other at-rule (@font-face,
 *  @keyframes, @property, …) are skipped whole. */
export function cssRules(cssText: string): CssRule[] {
	const rules: CssRule[] = [];
	const stack: Block[] = [{ kind: 'group', own: '', segment: '' }];
	let parens = 0;
	let i = 0;
	while (i < cssText.length) {
		const block = stack[stack.length - 1];
		const c = cssText[i];
		if (c === '/' && cssText[i + 1] === '*') {
			const end = cssText.indexOf('*/', i + 2);
			i = end === -1 ? cssText.length : end + 2;
			continue;
		}
		if (c === '"' || c === "'") {
			let j = i + 1;
			while (j < cssText.length && cssText[j] !== c) j += cssText[j] === '\\' ? 2 : 1;
			block.segment += cssText.slice(i, j + 1);
			i = j + 1;
			continue;
		}
		if (c === '\\') {
			block.segment += cssText.slice(i, i + 2);
			i += 2;
			continue;
		}
		i++;
		if (parens === 0 && c === '{') stack.push(openBlock(block, rules));
		else if (parens === 0 && c === '}') {
			if (stack.length > 1) closeBlock(stack.pop() as Block);
			else block.segment = '';
		} else if (parens === 0 && c === ';') {
			block.own += block.segment + c;
			block.segment = '';
		} else {
			if (c === '(') parens++;
			else if (c === ')' && parens > 0) parens--;
			block.segment += c;
		}
	}
	while (stack.length > 1) closeBlock(stack.pop() as Block);
	return rules;
}

/** The block a `{` opens inside `parent`, whose pending text is the block's prelude. */
function openBlock(parent: Block, rules: CssRule[]): Block {
	const prelude = parent.segment.trim();
	parent.segment = '';
	if (parent.kind === 'skip') return { kind: 'skip', own: '', segment: '' };
	if (prelude.startsWith('@')) {
		const name = /^@([\w-]+)/.exec(prelude)?.[1].toLowerCase() ?? '';
		return { kind: GROUPING_AT_RULES.has(name) ? 'group' : 'skip', own: '', segment: '' };
	}
	const rule: CssRule = { selector: prelude.replace(/\s+/g, ' '), declarations: '' };
	rules.push(rule);
	return { kind: 'style', rule, own: '', segment: '' };
}

function closeBlock(block: Block): void {
	if (block.rule) block.rule.declarations = (block.own + block.segment).trim();
}

/** `text` split on `separator` where it stands outside parentheses, brackets and quotes. */
function splitTopLevel(text: string, separator: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let quote = '';
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (c === '\\') i++;
		else if (quote) {
			if (c === quote) quote = '';
		} else if (c === '"' || c === "'") quote = c;
		else if (c === '(' || c === '[') depth++;
		else if ((c === ')' || c === ']') && depth > 0) depth--;
		else if (c === separator && depth === 0) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(text.slice(start));
	return parts;
}

function declaredProperties(rule: CssRule): Set<string> {
	return new Set(
		splitTopLevel(rule.declarations, ';').map((declaration) => {
			const colon = declaration.indexOf(':');
			return colon === -1 ? '' : declaration.slice(0, colon).trim();
		})
	);
}

/** A `[data-theme=…]` attribute selector; the value is group 1, 2 or 3 (double, single, unquoted). */
const THEME_ATTRIBUTE = /\[\s*data-theme\s*[~|^$*]?=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/gi;

const THEME_PROPERTY = '--color-base-100';

/** The problems of a build's CSS, in the order below; [] when it passes. */
export function checkCss(cssText: string): string[] {
	if (cssText.trim() === '') return ['no CSS'];
	const rules = cssRules(cssText);
	const bareHidden = rules
		.filter((rule) => splitTopLevel(rule.selector, ',').some((item) => item.trim() === '.hidden'))
		.map((rule) => `bare .hidden rule: ${rule.selector}`);
	const foreignTheme = rules
		.filter((rule) =>
			[...rule.selector.matchAll(THEME_ATTRIBUTE)].some(
				(match) => (match[1] ?? match[2] ?? match[3]) !== 'instrument'
			)
		)
		.map((rule) => `foreign theme selector: ${rule.selector}`);
	return [...bareHidden, ...foreignTheme, ...themeProblems(rules)];
}

function themeProblems(rules: CssRule[]): string[] {
	const themeRules = rules.filter((rule) => declaredProperties(rule).has(THEME_PROPERTY));
	if (themeRules.length !== 1) {
		return [
			`expected one Instrument theme rule (the rule declaring ${THEME_PROPERTY}), found ${themeRules.length}`
		];
	}
	const declared = declaredProperties(themeRules[0]);
	return THEME_TOKENS.filter((token) => !declared.has(token)).map(
		(token) => `Instrument theme rule lacks ${token}`
	);
}

function main(): void {
	const dist = new URL('../dist/', import.meta.url);
	let files: Buffer[];
	try {
		files = readdirSync(dist, { recursive: true, encoding: 'utf8' })
			.filter((name) => name.endsWith('.css'))
			.sort()
			.map((name) => readFileSync(join(fileURLToPath(dist), name)));
	} catch (error) {
		console.error(
			`check-css: cannot read dist/: ${error instanceof Error ? error.message : String(error)}`
		);
		process.exitCode = 1;
		return;
	}
	const problems = checkCss(files.map((file) => file.toString('utf8')).join('\n'));
	for (const problem of problems) console.error(`check-css: ${problem}`);
	const raw = files.reduce((sum, file) => sum + file.length, 0);
	const gzipped = files.reduce((sum, file) => sum + gzipSync(file, { level: 9 }).length, 0);
	console.log(`check-css: ${files.length} CSS files, ${raw} bytes raw, ${gzipped} bytes gzipped`);
	if (problems.length > 0) process.exitCode = 1;
}

/** Node 24.0 and 24.1 lack `import.meta.main`: there, compare the entry script with this file. */
const isMain =
	import.meta.main ??
	(process.argv[1] !== undefined &&
		realpathSync(process.argv[1]) === fileURLToPath(import.meta.url));

if (isMain) main();

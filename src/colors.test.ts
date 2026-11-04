import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { cssRules } from '../scripts/check-css';

// Takes a variable: Vite rewrites `new URL('literal', import.meta.url)` into an asset URL.
const here = (relative: string) => new URL(relative, import.meta.url);

const violations = (path: string, source: string) =>
	scanColors(path, source)
		.filter((e) => !e.allowed)
		.map((e) => e.text);
const PLAY = 'src/routes/play/+page.svelte';
const SHARE = 'src/lib/components/ShareLink.svelte';
const OTHER = 'src/lib/components/Other.svelte';

const STYLE = /<style[^>]*>([\s\S]*?)<\/style>/g;
const SCRIPT = /<script[^>]*>([\s\S]*?)<\/script>/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
/** A color literal: hex (not an entity's `&#…` or a Svelte `{#…}` block), rgb(a) or hsl(a). */
const COLOR =
	/(?<![\w&{])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:rgba?|hsla?)\([^)]*\)/gi;
/** A color in a Tailwind arbitrary value, such as `bg-[#123456]`; the color is group 1. */
const ARBITRARY_COLOR = /\[(#[0-9a-f]{3,8}|(?:rgba?|hsla?)\([^)\]]*\))\]/gi;

/** The stage allowances (spec, "Stage guard"): white in the stage's own rules, nowhere else. */
const isStageWhite = (path: string, selector: string, literal: string) =>
	/^#(?:fff|ffffff)$/i.test(literal) &&
	((path === PLAY && (selector === '.play' || selector === '.finish-screen')) ||
		(path === SHARE && selector === '.qr-code'));

/** Every color literal in one .svelte file. `text` is `<path>: <where>: <literal>`, where `where` is
 *  the rule's selector (from cssRules), `markup` or `script`; `allowed` only for the stage allowances. */
function scanColors(path: string, source: string): { text: string; allowed: boolean }[] {
	const found: { text: string; allowed: boolean }[] = [];
	const add = (where: string, literal: string, allowed = false) =>
		found.push({ text: `${path}: ${where}: ${literal}`, allowed });
	for (const [, css] of source.matchAll(STYLE)) {
		for (const rule of cssRules(css)) {
			for (const [literal] of rule.declarations.matchAll(COLOR)) {
				add(rule.selector, literal, isStageWhite(path, rule.selector, literal));
			}
		}
	}
	for (const [, script] of source.matchAll(SCRIPT)) {
		for (const [, literal] of script.matchAll(ARBITRARY_COLOR)) add('script', literal);
	}
	const markup = source.replace(STYLE, '').replace(SCRIPT, '').replace(HTML_COMMENT, '');
	for (const [literal] of markup.matchAll(COLOR)) add('markup', literal);
	return found;
}

/** Raw colors the restyle has not removed yet. A task that removes one deletes its line first. */
const NOT_YET_RESTYLED: readonly string[] = [
	'src/lib/components/RowEditor.svelte: .row-verdict.valid: #007700',
	'src/lib/components/RowEditor.svelte: .row-verdict.invalid: #c00',
	'src/lib/components/RowEditor.svelte: .row-verdict.lenient: #9a6700',
	'src/lib/components/ValidationList.svelte: .validation-list .valid: #007700',
	'src/lib/components/ValidationList.svelte: .validation-list .invalid: #c00',
	'src/lib/components/ValidationList.svelte: .validation-list .lenient: #9a6700',
	'src/routes/play/+page.svelte: .overlay: rgba(0, 0, 0, 0.7)',
	'src/routes/play/+page.svelte: .overlay: #fff',
	'src/routes/play/+page.svelte: .readout: #333',
	'src/routes/play/+page.svelte: .readout: rgba(255, 255, 255, 0.85)'
];

/** Every .svelte file under src/, as [path, source], the path written `src/…` with forward
 *  slashes; sorted by path. */
const SOURCES = readdirSync(fileURLToPath(here('.')), { recursive: true, encoding: 'utf8' })
	.filter((name) => name.endsWith('.svelte'))
	.map((name) => 'src/' + name.replace(/\\/g, '/'))
	.sort()
	.map((path): [string, string] => [path, readFileSync(here('../' + path), 'utf8')]);

describe('scanColors', () => {
	it.each([
		[PLAY, '<style>.play { background: #fff; }</style>', []],
		[SHARE, '<style>.qr-code { background: #FFFFFF; }</style>', []],
		[OTHER, '<style>.play { background: #fff; }</style>', [OTHER + ': .play: #fff']],
		[PLAY, '<style>.play { background: #000; }</style>', [PLAY + ': .play: #000']],
		[PLAY, '<style>.play, .x { background: #fff; }</style>', [PLAY + ': .play, .x: #fff']],
		[
			OTHER,
			'<style>.a { color: rgb(0 0 0); border-color: hsla(0, 0%, 0%, 0.5); }</style>',
			[OTHER + ': .a: rgb(0 0 0)', OTHER + ': .a: hsla(0, 0%, 0%, 0.5)']
		],
		[OTHER, '<style>@supports (x: y) { .a { color: #c00; } }</style>', [OTHER + ': .a: #c00']],
		[
			OTHER,
			'<style>/* was #c00 */ .a { color: CanvasText; }</style><!-- #fff --><p>{#each xs as x}{x}{/each}</p>',
			[]
		],
		[
			OTHER,
			'<p style="color: #333">x</p><p class="bg-[#123456]">y</p>',
			[OTHER + ': markup: #333', OTHER + ': markup: #123456']
		],
		[OTHER, "<script>const c = 'text-[rgb(1,2,3)]';</script>", [OTHER + ': script: rgb(1,2,3)']]
	])('%s with %s reports %j', (path, source, expected) => {
		expect(violations(path, source)).toEqual(expected);
	});
});

describe('the real components', () => {
	it('reads the real components', () => {
		const allowed = SOURCES.flatMap(([path, source]) => scanColors(path, source))
			.filter((e) => e.allowed)
			.map((e) => e.text)
			.sort();
		expect(allowed).toEqual([
			'src/lib/components/ShareLink.svelte: .qr-code: #fff',
			'src/routes/play/+page.svelte: .finish-screen: #fff',
			'src/routes/play/+page.svelte: .play: #fff'
		]);
	});

	it('finds no raw color but the ones not yet restyled', () => {
		const found = SOURCES.flatMap(([path, source]) => violations(path, source)).sort();
		expect(found).toEqual([...NOT_YET_RESTYLED].sort());
	});
});

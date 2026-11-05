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
const SHARE = 'src/lib/components/SharePanel.svelte';
const OTHER = 'src/lib/components/Other.svelte';

const STYLE = /<style[^>]*>([\s\S]*?)<\/style>/g;
const SCRIPT = /<script[^>]*>([\s\S]*?)<\/script>/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
/** A CSS comment, or a string (group 1), kept whole so that a `/*` inside it starts no comment. */
const CSS_COMMENT = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\/\*[\s\S]*?\*\//g;
const FUNCTIONS = 'rgba?|hsla?|oklch|oklab|lab|lch|hwb|color';
/** A color literal: hex (not an entity's `&#…` or a Svelte `{#…}` block), or a color function:
 *  rgb(a), hsl(a), oklch, oklab, lab, lch, hwb or color. */
const COLOR = new RegExp(
	String.raw`(?<![\w&{])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:${FUNCTIONS})\([^)]*\)`,
	'gi'
);
/** A color in a Tailwind arbitrary value, such as `bg-[#123456]`; the color is group 1. */
const ARBITRARY_COLOR = new RegExp(
	String.raw`\[(#[0-9a-f]{3,8}|(?:${FUNCTIONS})\([^)\]]*\))\]`,
	'gi'
);
/** Tailwind's palettes, each a `--color-<name>-50` … `-950` scale in its `theme.css`; a test below
 *  fails when this list and the installed Tailwind's differ. */
const PALETTES = [
	'slate',
	'gray',
	'zinc',
	'neutral',
	'stone',
	'red',
	'orange',
	'amber',
	'yellow',
	'lime',
	'green',
	'emerald',
	'teal',
	'cyan',
	'sky',
	'blue',
	'indigo',
	'violet',
	'purple',
	'fuchsia',
	'pink',
	'rose',
	'mauve',
	'olive',
	'mist',
	'taupe'
];
/** A Tailwind palette class, such as `text-red-600` or `bg-white`. It has no trailing boundary, so
 *  `text-red-600/50` is caught; the lookbehind keeps it to a whole class (`hover:` is allowed). */
const PALETTE = new RegExp(
	String.raw`(?<![\w-])(?:text|bg|border(?:-(?:[xytrblse]|bs|be))?|ring|ring-offset|inset-ring|outline|fill|stroke|from|via|to|accent|caret|decoration|divide|placeholder|shadow|inset-shadow|text-shadow|drop-shadow|scrollbar-thumb|scrollbar-track|mask-(?:[xytrbl]|linear|radial|conic)-(?:from|to))-(?:(?:${PALETTES.join('|')})-\d{2,3}|black|white)`,
	'g'
);

/** The stage allowances (spec, "Stage guard"): white in the stage's own rules, nowhere else. */
const isStageWhite = (path: string, selector: string, literal: string) =>
	/^#(?:fff|ffffff)$/i.test(literal) &&
	((path === PLAY && selector === '.play') || (path === SHARE && selector === '.qr-code'));

/** Every color literal in one .svelte file. `text` is `<path>: <where>: <literal>`, where `where` is
 *  the rule's selector (from cssRules), `style` (outside every style rule, as in `@keyframes`),
 *  `markup` or `script`; `allowed` only for the stage allowances. */
function scanColors(path: string, source: string): { text: string; allowed: boolean }[] {
	const found: { text: string; allowed: boolean }[] = [];
	const add = (where: string, literal: string, allowed = false) =>
		found.push({ text: `${path}: ${where}: ${literal}`, allowed });
	for (const [, css] of source.matchAll(STYLE)) {
		const inRules: string[] = [];
		for (const rule of cssRules(css)) {
			for (const [literal] of rule.declarations.matchAll(COLOR)) {
				inRules.push(literal);
				add(rule.selector, literal, isStageWhite(path, rule.selector, literal));
			}
		}
		// cssRules skips @keyframes, @property and the other non-grouping at-rules: every literal
		// of the block beyond those the rules hold (a multiset difference) is reported as `style`.
		const uncommented = css.replace(CSS_COMMENT, (_, string: string | undefined) => string ?? '');
		for (const [literal] of uncommented.matchAll(COLOR)) {
			const i = inRules.indexOf(literal);
			if (i === -1) add('style', literal);
			else inRules.splice(i, 1);
		}
	}
	for (const [, script] of source.matchAll(SCRIPT)) {
		for (const [, literal] of script.matchAll(ARBITRARY_COLOR)) add('script', literal);
		for (const [literal] of script.matchAll(PALETTE)) add('script', literal);
	}
	const markup = source.replace(STYLE, '').replace(SCRIPT, '').replace(HTML_COMMENT, '');
	for (const [literal] of markup.matchAll(COLOR)) add('markup', literal);
	for (const [literal] of markup.matchAll(PALETTE)) add('markup', literal);
	return found;
}

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
		[OTHER, "<script>const c = 'text-[rgb(1,2,3)]';</script>", [OTHER + ': script: rgb(1,2,3)']],
		[OTHER, '<style>@keyframes k { from { color: #c00 } }</style>', [OTHER + ': style: #c00']],
		[
			OTHER,
			"<style>@property --x { syntax: '<color>'; inherits: false; initial-value: rgb(0 0 0) }</style>",
			[OTHER + ': style: rgb(0 0 0)']
		],
		[
			PLAY,
			'<style>.play { background: #fff; } .finish-screen { background: #fff; }</style>',
			[PLAY + ': .finish-screen: #fff']
		],
		[
			PLAY,
			'<style>.play { background: #fff; } @keyframes k { to { background: #fff } }</style>',
			[PLAY + ': style: #fff']
		],
		[OTHER, '<p class="text-red-600">x</p>', [OTHER + ': markup: text-red-600']],
		[OTHER, '<style>.x { color: oklch(50% 0.1 30) }</style>', [OTHER + ': .x: oklch(50% 0.1 30)']],
		[
			OTHER,
			'<p class="hover:bg-blue-500/50 border-x-white">x</p>',
			[OTHER + ': markup: bg-blue-500', OTHER + ': markup: border-x-white']
		],
		[OTHER, "<script>const tone = 'text-rose-700';</script>", [OTHER + ': script: text-rose-700']],
		[OTHER, '<p class="text-[lab(50%_40_30)]">x</p>', [OTHER + ': markup: lab(50%_40_30)']],
		[
			OTHER,
			'<p class="bg-neutral/85 text-neutral-content">x</p><style>.a { color: color-mix(in oklab, var(--color-base-content) 55%, transparent); border-color: currentColor; }</style>',
			[]
		],
		[OTHER, '<p class="text-taupe-500">x</p>', [OTHER + ': markup: text-taupe-500']],
		[OTHER, '<p class="border-e-red-500">x</p>', [OTHER + ': markup: border-e-red-500']],
		[OTHER, '<p class="drop-shadow-black/50">x</p>', [OTHER + ': markup: drop-shadow-black']]
	])('%s with %s reports %j', (path, source, expected) => {
		expect(violations(path, source)).toEqual(expected);
	});
});

describe('PALETTES', () => {
	it("lists exactly the palettes of the installed Tailwind's theme", () => {
		const theme = readFileSync(here('../node_modules/tailwindcss/theme.css'), 'utf8');
		const installed = [...theme.matchAll(/--color-([a-z]+)-50:/g)].map(([, name]) => name);
		expect([...PALETTES].sort()).toEqual(installed.sort());
	});
});

describe('the real components', () => {
	it('reads the real components', () => {
		const allowed = SOURCES.flatMap(([path, source]) => scanColors(path, source))
			.filter((e) => e.allowed)
			.map((e) => e.text)
			.sort();
		expect(allowed).toEqual([
			'src/lib/components/SharePanel.svelte: .qr-code: #fff',
			'src/routes/play/+page.svelte: .play: #fff'
		]);
	});

	it('finds no raw color outside the two allowed white backgrounds', () => {
		const found = SOURCES.flatMap(([path, source]) => violations(path, source)).sort();
		expect(found).toEqual([]);
	});
});

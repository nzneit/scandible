import { describe, it, expect } from 'vitest';
import { THEME_TOKENS, checkCss, cssRules } from '../scripts/check-css';

const theme = (tokens: readonly string[] = THEME_TOKENS) =>
	`:where(:root),[data-theme=instrument]{${tokens.map((t) => `${t}:0`).join(';')}}`;
const THEME = theme();

describe('THEME_TOKENS', () => {
	it('names the 28 tokens of the theme table, row by row', () => {
		expect(THEME_TOKENS).toHaveLength(28);
		expect(new Set(THEME_TOKENS).size).toBe(28);
		expect(THEME_TOKENS[0]).toBe('--color-base-100');
		expect(THEME_TOKENS[THEME_TOKENS.length - 1]).toBe('--noise');
	});
});

describe('cssRules', () => {
	it.each([
		['@layer a{@media (x){.b{c:d}}}', [{ selector: '.b', declarations: 'c:d' }]],
		['/* .hidden{} */.a{content:"}{"}', [{ selector: '.a', declarations: 'content:"}{"' }]],
		['.a{b:c;/* #c00 */d:e}', [{ selector: '.a', declarations: 'b:c;d:e' }]],
		[
			'.a{color:red;&:focus{color:blue}}',
			[
				{ selector: '.a', declarations: 'color:red;' },
				{ selector: '&:focus', declarations: 'color:blue' }
			]
		],
		[
			"@font-face{font-family:x}@keyframes k{from{a:b}}@property --p{syntax:'*'}.c{d:e}",
			[{ selector: '.c', declarations: 'd:e' }]
		],
		['.a ,\n  .b{x:url(data:a;b)}', [{ selector: '.a , .b', declarations: 'x:url(data:a;b)' }]]
	])('reads the style rules of %j', (input, output) => {
		expect(cssRules(input)).toEqual(output);
	});
});

describe('checkCss', () => {
	it('passes a lone Instrument theme', () => {
		expect(checkCss(THEME)).toEqual([]);
	});

	it.each([
		'.overlay.hidden.svelte-x{opacity:0}',
		'@media (width>=48rem){.md\\:hidden{display:none}}',
		'[hidden]:where(:not([hidden=until-found])){display:none!important}',
		':root,[data-theme]{color:red}',
		'[data-theme=instrument] .x{color:red}',
		'[data-theme="instrument"] .x{color:red}',
		':root:has(input.theme-controller[value="instrument"]:checked){color:red}'
	])('passes the theme beside %j', (s) => {
		expect(checkCss(THEME + s)).toEqual([]);
	});

	it.each([
		[THEME + '.hidden{display:none}', /^bare \.hidden rule: \.hidden$/],
		[THEME + '.x,.hidden{display:none}', /^bare \.hidden rule: \.x,\.hidden$/],
		[THEME + '@media print{.hidden{display:none}}', /^bare \.hidden rule: \.hidden$/],
		[THEME + '[data-theme=light]{color:red}', /^foreign theme selector: \[data-theme=light\]$/],
		[
			THEME + "[data-theme='dark'] .x{color:red}",
			/^foreign theme selector: \[data-theme='dark'\] \.x$/
		],
		[THEME + THEME, /found 2$/],
		['.a{b:c}', /found 0$/],
		[theme(THEME_TOKENS.filter((t) => t !== '--noise')), /^Instrument theme rule lacks --noise$/]
	])('reports one problem in %j', (css, pattern) => {
		expect(checkCss(css)).toEqual([expect.stringMatching(pattern)]);
	});

	it('reports no CSS for empty input', () => {
		expect(checkCss('')).toEqual(['no CSS']);
		expect(checkCss(' \n')).toEqual(['no CSS']);
	});
});

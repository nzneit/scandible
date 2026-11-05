import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { THEME_TOKENS } from '../scripts/check-css';

// Takes a variable: Vite rewrites `new URL('literal', import.meta.url)` into an asset URL.
const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const flat = (s: string) => s.replace(/\s+/g, ' ').replace(/\s*([(),:;{}])\s*/g, '$1');

/** The `--` declarations of the `@plugin 'daisyui/theme' { … }` block. */
function readTheme(css: string): Map<string, string> {
	const block = /@plugin\s+(['"])daisyui\/theme\1\s*\{([^}]*)\}/.exec(
		css.replace(/\/\*[\s\S]*?\*\//g, '')
	);
	if (!block) throw new Error('no daisyui/theme block');
	const theme = new Map<string, string>();
	for (const declaration of block[2].split(';')) {
		const match = /^\s*(--[\w-]+)\s*:([\s\S]*)$/.exec(declaration);
		if (match) theme.set(match[1], match[2].trim());
	}
	return theme;
}

function token(theme: Map<string, string>, name: string): string {
	const value = theme.get(name);
	if (value === undefined) throw new Error(`missing token ${name}`);
	return value;
}

/** Gamma-encoded sRGB channels from 0 to 1, unrounded. */
type RGB = [number, number, number];
type Matrix = [RGB, RGB, RGB];

function rgb(hex: string): RGB {
	const digits = /^#([0-9a-f]{6})$/i.exec(hex)?.[1];
	if (!digits) throw new Error(`not a #rrggbb color: ${hex}`);
	return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255) as RGB;
}

/** Each channel rounded to 8 bits. */
function toHex(c: RGB): string {
	const byte = (v: number) =>
		Math.round(v * 255)
			.toString(16)
			.padStart(2, '0');
	return '#' + c.map(byte).join('');
}

/** A gamma-encoded sRGB channel to linear light, and back. */
const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** WCAG 2.x: relative luminance, then (L1 + 0.05) / (L2 + 0.05) with L1 the lighter. */
function contrast(a: RGB, b: RGB): number {
	const luminance = (c: RGB) =>
		0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
	const [la, lb] = [luminance(a), luminance(b)];
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `fg` at `alpha` composited on `bg`, per channel in gamma-encoded sRGB, as the browser does. */
function over(fg: RGB, alpha: number, bg: RGB): RGB {
	return fg.map((v, i) => v * alpha + bg[i] * (1 - alpha)) as RGB;
}

// Björn Ottosson's published matrices ("A perceptual color space for image processing", 2020):
// linear sRGB → LMS → (cube root) → oklab, and back.
const RGB_TO_LMS: Matrix = [
	[0.4122214708, 0.5363325363, 0.0514459929],
	[0.2119034982, 0.6806995451, 0.1073969566],
	[0.0883024619, 0.2817188376, 0.6299787005]
];
const LMS_TO_LAB: Matrix = [
	[0.2104542553, 0.793617785, -0.0040720468],
	[1.9779984951, -2.428592205, 0.4505937099],
	[0.0259040371, 0.7827717662, -0.808675766]
];
const LAB_TO_LMS: Matrix = [
	[1, 0.3963377774, 0.2158037573],
	[1, -0.1055613458, -0.0638541728],
	[1, -0.0894841775, -1.291485548]
];
const LMS_TO_RGB: Matrix = [
	[4.0767416621, -3.3077115913, 0.2309699292],
	[-1.2684380046, 2.6097574011, -0.3413193965],
	[-0.0041960863, -0.7034186147, 1.707614701]
];
const times = (m: Matrix, v: RGB) =>
	m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as RGB;
const toOklab = (c: RGB) =>
	times(LMS_TO_LAB, times(RGB_TO_LMS, c.map(linear) as RGB).map(Math.cbrt) as RGB);
const fromOklab = (lab: RGB) =>
	times(LMS_TO_RGB, times(LAB_TO_LMS, lab).map((v) => v ** 3) as RGB).map(encode) as RGB;

/** `color-mix(in oklab, a weight, b)`, as daisyUI 5.7.50's `.alert-soft` mixes its background. */
function mixOklab(a: RGB, weight: number, b: RGB): RGB {
	const [labA, labB] = [toOklab(a), toOklab(b)];
	return fromOklab(labA.map((v, i) => v * weight + labB[i] * (1 - weight)) as RGB);
}

const T = readTheme(read('./styles.css'));
const c = (n: string) => rgb(token(T, '--color-' + n));
/** The play overlay over the stage: `neutral` at 85% over the stage's white. */
const overlay = over(c('neutral'), 0.85, rgb('#ffffff'));
/** daisyUI's soft-alert background: the color mixed 8% into base-100, in oklab. */
const softAlert = (color: RGB) => mixOklab(color, 0.08, c('base-100'));
/** base-content at `alpha`, composited over the token `bg`. */
const translucent = (alpha: number, bg: string) => over(c('base-content'), alpha, c(bg));

type Pair = [label: string, fg: RGB, bg: RGB];
const BACKGROUNDS = ['base-100', 'base-200'];

/** Text, at least 4.5:1 (spec, "Theme and tokens"). */
const TEXT: Pair[] = [
	...BACKGROUNDS.flatMap((bg): Pair[] => [
		...['success', 'error', 'warning', 'info', 'base-content'].map((fg): Pair => [
			`${fg} on ${bg}`,
			c(fg),
			c(bg)
		]),
		[`muted text (base-content at 70%) on ${bg}`, translucent(0.7, bg), c(bg)]
	]),
	['warning on its soft alert', c('warning'), softAlert(c('warning'))],
	['error on its soft alert', c('error'), softAlert(c('error'))],
	['primary-content on primary', c('primary-content'), c('primary')],
	['neutral-content on neutral', c('neutral-content'), c('neutral')],
	['neutral-content on the overlay', c('neutral-content'), overlay],
	[
		'stat titles and descriptions (base-content at 60%) on base-100',
		translucent(0.6, 'base-100'),
		c('base-100')
	]
];

/** Controls, at least 3:1 (spec, "Theme and tokens"). */
const CONTROLS: Pair[] = [
	...BACKGROUNDS.map((bg): Pair => [
		`resting border (base-content at 55%) on ${bg}`,
		translucent(0.55, bg),
		c(bg)
	]),
	...BACKGROUNDS.map((bg): Pair => [
		`focus outline (base-content) on ${bg}`,
		c('base-content'),
		c(bg)
	]),
	['overlay focus outline (neutral-content) on the overlay', c('neutral-content'), overlay],
	[
		'overlay range track (neutral-content at 55%) on the overlay',
		over(c('neutral-content'), 0.55, overlay),
		overlay
	]
];

it('declares exactly the spec tokens', () => {
	expect(Object.fromEntries(T)).toEqual({
		'--color-base-100': '#ffffff',
		'--color-base-content': '#18181b',
		'--color-base-200': '#f4f4f5',
		'--color-base-300': '#e4e4e7',
		'--color-primary': '#18181b',
		'--color-primary-content': '#fafafa',
		'--color-secondary': '#52525b',
		'--color-secondary-content': '#ffffff',
		'--color-accent': '#2563eb',
		'--color-accent-content': '#ffffff',
		'--color-neutral': '#3f3f46',
		'--color-neutral-content': '#fafafa',
		'--color-info': '#2563eb',
		'--color-info-content': '#ffffff',
		'--color-success': '#15803d',
		'--color-success-content': '#ffffff',
		'--color-warning': '#8a5d00',
		'--color-warning-content': '#ffffff',
		'--color-error': '#b91c1c',
		'--color-error-content': '#ffffff',
		'--radius-selector': '0.25rem',
		'--radius-field': '0.25rem',
		'--radius-box': '0.375rem',
		'--size-selector': '0.25rem',
		'--size-field': '0.25rem',
		'--border': '1px',
		'--depth': '0',
		'--noise': '0'
	});
	expect([...T.keys()].sort()).toEqual([...THEME_TOKENS].sort());
	const css = read('./styles.css');
	expect(css).toContain("name: 'instrument'");
	expect(css).toContain('default: true');
	expect(css).toContain('color-scheme: light');
});

it('reproduces the measured contrasts of M8', () => {
	const measured: [label: string, fg: RGB, bg: RGB, expected: number][] = [
		['base-content on base-100', c('base-content'), c('base-100'), 17.72],
		['base-content on base-200', c('base-content'), c('base-200'), 16.12],
		['success on base-100', c('success'), c('base-100'), 5.02],
		['success on base-200', c('success'), c('base-200'), 4.56],
		['error on base-100', c('error'), c('base-100'), 6.47],
		['error on base-200', c('error'), c('base-200'), 5.89],
		['warning on base-100', c('warning'), c('base-100'), 5.76],
		['warning on base-200', c('warning'), c('base-200'), 5.24],
		['info on base-100', c('info'), c('base-100'), 5.17],
		['info on base-200', c('info'), c('base-200'), 4.7],
		['base-content at 70% on base-100', translucent(0.7, 'base-100'), c('base-100'), 6.54],
		['base-content at 70% on base-200', translucent(0.7, 'base-200'), c('base-200'), 6.26],
		['base-content at 55% on base-100', translucent(0.55, 'base-100'), c('base-100'), 3.95],
		['base-content at 55% on base-200', translucent(0.55, 'base-200'), c('base-200'), 3.84],
		['warning on its soft alert', c('warning'), softAlert(c('warning')), 5.14],
		['error on its soft alert', c('error'), softAlert(c('error')), 5.74],
		['#b45309 on its soft alert', rgb('#b45309'), softAlert(rgb('#b45309')), 4.52],
		['primary-content on primary', c('primary-content'), c('primary'), 16.97],
		['neutral-content on neutral', c('neutral-content'), c('neutral'), 10.01],
		['neutral-content on the overlay', c('neutral-content'), overlay, 6.38],
		['base-content on the overlay', c('base-content'), overlay, 2.66]
	];
	for (const [label, fg, bg, expected] of measured) {
		expect(contrast(fg, bg), label).toBeCloseTo(expected, 1);
	}
	expect(toHex(overlay)).toBe('#5c5c62');
});

it.each(TEXT)('%s is at least 4.5:1', (_label, fg, bg) => {
	expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
});

it.each(CONTROLS)('%s is at least 3:1', (_label, fg, bg) => {
	expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
});

it('names a missing token', () => {
	expect(() => token(new Map(), '--color-success')).toThrow('missing token --color-success');
});

describe('overrides the tables rely on', () => {
	it('styles.css keeps resting borders at 55% and placeholders at 70%', () => {
		const css = flat(read('./styles.css'));
		expect(css).toContain(
			flat(
				':is(.input, .select, .textarea, .file-input, .checkbox, .toggle):not(:focus, :focus-within, :checked, :indeterminate) { --input-color: color-mix(in oklab, var(--color-base-content) 55%, #0000); }'
			)
		);
		expect(css).toContain(
			flat(
				':is(.input, .textarea)::placeholder { color: color-mix(in oklab, var(--color-base-content) 70%, #0000); }'
			)
		);
	});

	it('styles.css darkens the setup page range tracks to 55%', () => {
		expect(flat(read('./styles.css'))).toContain(
			flat(
				'.setup-page .range { --range-bg: color-mix(in oklab, var(--color-base-content) 55%, #0000); }'
			)
		);
	});

	it('styles.css darkens the play overlay range tracks to 55%', () => {
		expect(flat(read('./styles.css'))).toContain(
			flat(
				'.overlay .range { --range-bg: color-mix(in oklab, var(--color-neutral-content) 55%, #0000); }'
			)
		);
	});

	it('the setup page keeps a disabled Start recognizable', () => {
		expect(flat(read('./lib/components/ActionBar.svelte'))).toContain(
			flat(
				'.start:disabled { background-color: var(--color-primary); color: var(--color-primary-content); opacity: 0.5; }'
			)
		);
	});

	it('the play page recolors focus rings on the overlay', () => {
		expect(flat(read('./lib/components/PlayOverlay.svelte'))).toContain(
			flat('.overlay :global(:focus-visible) { outline-color: var(--color-neutral-content); }')
		);
	});
});

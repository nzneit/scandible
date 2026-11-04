import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ValidationList from './ValidationList.svelte';
import type { CodeEntry, SymbolFacts } from '$lib/types';
import type { FormatId } from '$lib/formats';
import { parseCodeList } from '$lib/codes';
import { SCAN_HINT } from '$lib/verdict';

const entry = (raw: string, valid: boolean): CodeEntry => ({
	raw,
	value: raw,
	format: 'upc',
	options: {},
	valid
});

describe('ValidationList', () => {
	it('renders one li per entry with valid/invalid classes and copy', () => {
		const { container } = render(ValidationList, {
			entries: [entry('036000291452', true), entry('bad', false)]
		});
		const items = container.querySelectorAll('.validation-list li');
		expect(items.length).toBe(2);
		expect(items[0].classList.contains('valid')).toBe(true);
		expect(items[0].textContent).toBe('036000291452 ✓');
		expect(items[1].classList.contains('invalid')).toBe(true);
		expect(items[1].textContent).toBe('bad ✗ invalid');
	});

	it('renders no items for an empty list', () => {
		const { container } = render(ValidationList, { entries: [] });
		expect(container.querySelectorAll('.validation-list li').length).toBe(0);
	});

	it('shows the exact arrow row when the encoder mutates the value', () => {
		const { container } = render(ValidationList, {
			entries: [
				{
					raw: '590123412345',
					value: '590123412345',
					format: 'upc',
					options: {},
					valid: true,
					encoded: '5901234123457'
				}
			]
		});
		expect(container.querySelector('.validation-list li')?.textContent).toBe(
			'590123412345 ✓ → 5901234123457'
		);
	});

	it('keeps entries without encoded arrow-free (undefined guard)', () => {
		const { container } = render(ValidationList, {
			entries: [
				{ raw: '036000291452', value: '036000291452', format: 'upc', options: {}, valid: true }
			]
		});
		expect(container.querySelector('.validation-list li')?.textContent).toBe('036000291452 ✓');
	});
});

type F = [bytes: number, cols: number, rows: number, summary: string, dense?: boolean];
const facts = ([bytes, cols, rows, summary, dense = false]: F): SymbolFacts => ({
	bytes,
	cols,
	rows,
	summary,
	dense
});
/** A valid 2D entry; options carry `ecc` only when given. */
const ok = (raw: string, format: FormatId, ecc: string | undefined, f: F): CodeEntry => ({
	raw,
	value: raw,
	format,
	options: ecc === undefined ? {} : { ecc },
	valid: true,
	facts: facts(f)
});
const tooLong = (raw: string, format: FormatId, ecc?: string): CodeEntry => ({
	raw,
	value: raw,
	format,
	options: ecc === undefined ? {} : { ecc },
	valid: false,
	reason: 'too-long'
});
const rowTexts = (entries: CodeEntry[]) =>
	[...render(ValidationList, { entries }).container.querySelectorAll('.validation-list li')].map(
		(li) => li.textContent
	);
const X2000 = 'x'.repeat(2000);
const DENSE_HINT =
	'Dense: more than 100 modules across (PDF417 and the linear GS1 formats: 300), so each module is small on screen. If the scanner misses these, shorten the payload, lower error correction if the format offers it, or go full screen.';
const qrHello = ok('hello world', 'qr', 'M', [11, 21, 21, '21×21 modules']);
const qrDense = ok(X2000, 'qr', 'L', [2000, 149, 149, '149×149 modules', true]);

describe('ValidationList 2D rows', () => {
	it('prints facts rows exactly, with 1 byte, no grouping and both suffixes in order', () => {
		const E = 'é'.repeat(1000);
		expect(
			rowTexts([
				qrHello,
				ok('hello world', 'pdf417', 'auto', [11, 103, 8, '2 columns × 8 rows']),
				ok('héllo → 日本', 'qr', 'M', [17, 25, 25, '25×25 modules']),
				ok('x', 'qr', 'M', [1, 21, 21, '21×21 modules']),
				qrDense,
				ok(E, 'qr', 'L', [2000, 149, 149, '149×149 modules', true])
			])
		).toEqual([
			'hello world ✓ · 21×21 modules · 11 bytes',
			'hello world ✓ · 2 columns × 8 rows · 11 bytes',
			'héllo → 日本 ✓ · 25×25 modules · 17 bytes · UTF-8, no ECI',
			'x ✓ · 21×21 modules · 1 byte',
			`${X2000} ✓ · 149×149 modules · 2000 bytes · dense`,
			`${E} ✓ · 149×149 modules · 2000 bytes · UTF-8, no ECI · dense`
		]);
	});

	it('prints too-long rows with the level only when the entry carries an accepted one', () => {
		const [X5000, X3000] = ['x'.repeat(5000), 'x'.repeat(3000)];
		const invalid: CodeEntry = {
			raw: 'x',
			value: 'x',
			format: 'qr',
			options: { ecc: 'M' },
			valid: false
		};
		expect(
			rowTexts([
				tooLong(X2000, 'qr', 'H'),
				tooLong(X5000, 'aztec', '23'),
				tooLong(X3000, 'datamatrix'),
				invalid
			])
		).toEqual([
			`${X2000} ✗ too long for QR Code (level H)`,
			`${X5000} ✗ too long for Aztec (≥23% error correction)`,
			`${X3000} ✗ too long for Data Matrix`,
			'x ✗ invalid'
		]);
	});

	it('falls back to the unlevelled too-long row when options.ecc is unset', () => {
		expect(rowTexts([tooLong(X2000, 'qr')])).toEqual([`${X2000} ✗ too long for QR Code`]);
	});

	it('splits each row into a raw span and a verdict span that starts with a space', () => {
		const { container } = render(ValidationList, { entries: [qrHello] });
		expect(container.querySelector('li .raw')?.textContent).toBe('hello world');
		expect(container.querySelector('li .verdict')?.textContent).toBe(
			' ✓ · 21×21 modules · 11 bytes'
		);
	});

	it('renders no arrow for entries without encoded', () => {
		const entries = [qrHello, qrDense, entry('036000291452', true)];
		const { container } = render(ValidationList, { entries });
		for (const v of container.querySelectorAll('.verdict'))
			expect(v.textContent).not.toContain('→');
	});

	it('shows the dense hint only when an entry is dense', () => {
		const hint = (entries: CodeEntry[]) =>
			render(ValidationList, { entries }).container.querySelector('.dense-hint');
		expect(hint([qrHello, qrDense])?.textContent).toBe(DENSE_HINT);
		expect(hint([qrHello])).toBeNull();
	});
});

describe('ValidationList GS1 rows', () => {
	const S = '(01)09501101530003(17)261231(10)LOT42';
	const list = (text: string, lax: boolean) =>
		render(ValidationList, { entries: parseCodeList(text, 'gs1128', '', lax) }).container;

	it('classes a lax render lenient and shows the scan hint for GS1 entries', () => {
		const c = list(`${S}\n(01)09501101530004`, true);
		const items = [...c.querySelectorAll('.validation-list li')];
		expect(
			items.map((li) =>
				[...li.classList].filter((c) => ['valid', 'invalid', 'lenient'].includes(c))
			)
		).toEqual([['valid'], ['lenient']]);
		expect(items[1].textContent).toBe(
			'(01)09501101530004 ⚠ rendered anyway · AI 01: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004'
		);
		expect(c.querySelector('.scan-hint')?.textContent).toBe(SCAN_HINT);
		expect(list('(01)09501101530004', false).querySelectorAll('li.invalid').length).toBe(1);
	});

	it('shows no scan hint without a GS1 entry, invalid GS1 rows included', () => {
		expect(
			render(ValidationList, { entries: [qrHello] }).container.querySelector('.scan-hint')
		).toBeNull();
		expect(list('(01)09501101530003(10', false).querySelector('.scan-hint')).toBeNull();
	});
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import ValidationList from './ValidationList.svelte';
import type { CodeEntry, SymbolFacts } from '$lib/types';
import type { FormatId } from '$lib/formats';
import { parseCodeList } from '$lib/codes';
import { SCAN_HINT } from '$lib/verdict';
import { GS } from '$lib/gs1';

const BREAKDOWN = /^Code \d+ breakdown: /; // the labelled summary, whose text varies
const HEADER = 'Application Identifier Name Value'; // the breakdown header row's computed name
/** Queries within an element, or through `screen` by default: a test that renders once uses the default. */
type Scope = HTMLElement | typeof screen;
const q = (scope: Scope = screen) => (scope instanceof HTMLElement ? within(scope) : scope);
/** The raw textContent of the element in `scope` whose trimmed text is `text`. */
const exactText = (scope: Scope, text: string) => q(scope).getByText(text.trim()).textContent;
/** The validation list's items in the render whose container is `c`. */
const items = (c?: Scope) =>
	within(q(c).getByRole('list', { name: 'Validation results' })).getAllByRole('listitem');
/** The body rows of the one breakdown table in `scope`, each as its cells' text. */
const bodyRows = (scope?: Scope) => {
	const header = q(scope).getByRole('row', { name: HEADER });
	return q(scope)
		.getAllByRole('row')
		.filter((row) => row !== header)
		.map((row) =>
			[...within(row).queryAllByRole('rowheader'), ...within(row).getAllByRole('cell')].map(
				(cell) => cell.textContent
			)
		);
};

const entry = (raw: string, valid: boolean): CodeEntry => ({
	raw,
	value: raw,
	format: 'upc',
	options: {},
	valid
});

describe('ValidationList', () => {
	it('renders one item per entry with its verdict and copy', () => {
		render(ValidationList, {
			entries: [entry('036000291452', true), entry('bad', false)]
		});
		const [first, second] = items();
		expect(items()).toHaveLength(2);
		expect(exactText(first, ' ✓')).toBe(' ✓');
		expect(first.textContent).toBe('036000291452 ✓');
		expect(exactText(second, ' ✗ invalid')).toBe(' ✗ invalid');
		expect(second.textContent).toBe('bad ✗ invalid');
	});

	it('renders no items for an empty list', () => {
		render(ValidationList, { entries: [] });
		expect(
			within(screen.getByRole('list', { name: 'Validation results' })).queryAllByRole('listitem')
		).toHaveLength(0);
	});

	it('shows the exact arrow row when the encoder mutates the value', () => {
		render(ValidationList, {
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
		expect(items()[0].textContent).toBe('590123412345 ✓ → 5901234123457');
	});

	it('keeps entries without encoded arrow-free (undefined guard)', () => {
		render(ValidationList, {
			entries: [
				{ raw: '036000291452', value: '036000291452', format: 'upc', options: {}, valid: true }
			]
		});
		expect(items()[0].textContent).toBe('036000291452 ✓');
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
const rowTexts = (entries: CodeEntry[]) => {
	render(ValidationList, { entries });
	return items().map((li) => li.textContent);
};
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

	it("separates each row's raw text from its verdict with a space", () => {
		render(ValidationList, { entries: [qrHello] });
		expect(exactText(screen, 'hello world')).toBe('hello world');
		expect(exactText(screen, ' ✓ · 21×21 modules · 11 bytes')).toBe(
			' ✓ · 21×21 modules · 11 bytes'
		);
	});

	it('renders no arrow for entries without encoded', () => {
		const entries = [qrHello, qrDense, entry('036000291452', true)];
		render(ValidationList, { entries });
		// The raw texts hold no arrow, so an arrow in an item is an arrow in its verdict.
		for (const item of items()) expect(item).not.toHaveTextContent('→');
	});

	it('shows the dense hint only when an entry is dense', () => {
		const hint = (entries: CodeEntry[]) => render(ValidationList, { entries }).container;
		expect(within(hint([qrHello, qrDense])).getByText(DENSE_HINT).textContent).toBe(DENSE_HINT);
		expect(within(hint([qrHello])).queryByText(DENSE_HINT)).toBeNull();
	});
});

describe('ValidationList GS1 rows', () => {
	beforeEach(() => vi.setSystemTime(new Date(2026, 10, 3, 12)));
	afterEach(() => vi.useRealTimers());
	const S = '(01)09501101530003(17)261231(10)LOT42';
	const list = (text: string, lax: boolean) =>
		render(ValidationList, { entries: parseCodeList(text, 'gs1128', '', lax) }).container;

	it('shows a lax render as rendered anyway, and the scan hint for GS1 entries', () => {
		const c = list(`${S}\n(01)09501101530004`, true);
		const VALID_S = ' ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42';
		const LENIENT =
			' ⚠ rendered anyway · (01) GTIN: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004';
		expect(items(c)).toHaveLength(2);
		expect(exactText(items(c)[0], VALID_S)).toBe(VALID_S);
		expect(exactText(items(c)[1], '(01)09501101530004')).toBe('(01)09501101530004');
		expect(exactText(items(c)[1], LENIENT)).toBe(LENIENT);
		expect(within(c).getByText(SCAN_HINT).textContent).toBe(SCAN_HINT);
		const strict = list('(01)09501101530004', false);
		expect(exactText(items(strict)[0], ' ✗ (01) GTIN: Bad checksum')).toBe(
			' ✗ (01) GTIN: Bad checksum'
		);
	});

	it('shows no scan hint without a GS1 entry, invalid GS1 rows included', () => {
		expect(
			within(render(ValidationList, { entries: [qrHello] }).container).queryByText(SCAN_HINT)
		).toBeNull();
		expect(within(list('(01)09501101530003(10', false)).queryByText(SCAN_HINT)).toBeNull();
	});

	it('shows a GS character as the mark in the raw text, and the textual notation as typed', () => {
		list(`10LOT42${GS}0109501101530003\n10LOT42<GS>0109501101530003`, false);
		const [first, second] = items();
		expect(items()).toHaveLength(2);
		expect(exactText(first, '10LOT42␝0109501101530003')).toBe('10LOT42␝0109501101530003');
		expect(exactText(second, '10LOT42<GS>0109501101530003')).toBe('10LOT42<GS>0109501101530003');
	});

	it('puts a labelled breakdown under each GS1 entry and none under other rows', () => {
		list(`${S}\n(01)09501101530004\nbad`, true);
		expect(screen.getAllByLabelText(BREAKDOWN).map((s) => s.getAttribute('aria-label'))).toEqual([
			'Code 1 breakdown: 3 Application Identifiers',
			'Code 2 breakdown: 1 Application Identifier'
		]);
		expect(within(items()[2]).queryByLabelText(BREAKDOWN)).toBeNull();
		expect(bodyRows(items()[0])).toContainEqual(['(17)', 'USE BY or EXPIRY', '2026-12-31']);
	});

	it('breaks down the scanned 14-digit GTIN for a 13-digit DataBar value', () => {
		render(ValidationList, {
			entries: parseCodeList('(01)0950110153000', 'databaromni')
		});
		expect(bodyRows()[0]).toEqual(['(01)', 'GTIN', '09501101530003']);
	});
});

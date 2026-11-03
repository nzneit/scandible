import { describe, it, expect } from 'vitest';
import {
	describeLoss,
	rowEntries,
	rowEntry,
	rowNumbers,
	rowsFromText,
	textFromRows,
	type Row
} from './rows';
import { parseCodeList } from './codes';
import type { FormatId } from './formats';

/** Rows in the spec's record form, `format[-level][-lax]_payload`, tokens in either order; the
 *  payload is everything after the first `_`. */
const deck = (...records: string[]): Row[] =>
	records.map((record) => {
		const tag = record.slice(0, record.indexOf('_'));
		const [format, ...tokens] = tag.split('-');
		return {
			payload: record.slice(tag.length + 1),
			format: format as FormatId,
			ecc: tokens.find((t) => t !== 'lax') ?? '',
			lax: tokens.includes('lax')
		};
	});
const row = (record: string) => deck(record)[0];
const n = (formats: number, levels: number, splits: number, validation = 0) => ({
	formats,
	levels,
	splits,
	validation
});
const NONE = n(0, 0, 0);
const lossless = (text: string, format: FormatId, ecc = '', lax = false) => ({
	text,
	format,
	ecc,
	lax,
	loses: NONE
});
const FALLBACK = { format: 'upc', ecc: '', lax: false } as const;
const loses = (...records: string[]) => textFromRows(deck(...records), FALLBACK).loses;
const text = (...records: string[]) => textFromRows(deck(...records), FALLBACK).text;
const words = (counts: ReturnType<typeof n>, format: FormatId, ecc = '', lax = false) =>
	describeLoss(counts, { format, ecc, lax });
const LIMIT =
	'Plain text keeps one format and one error-correction level for the whole list, and one code per line.';

describe('rowsFromText', () => {
	it('makes one row per token at the list format and level, after CR normalization', () => {
		expect(rowsFromText('036000291452,012345678905', 'upc', '', false)).toEqual(
			deck('upc_036000291452', 'upc_012345678905')
		);
		expect(rowsFromText('hello\nworld', 'qr', 'H', false)).toEqual(
			deck('qr-H_hello', 'qr-H_world')
		);
		expect(rowsFromText('a\rb', 'qr', '', false)).toEqual(deck('qr_a', 'qr_b'));
	});
});

describe('rowEntry, rowEntries and rowNumbers', () => {
	it("gives no entry for a blank row, and resolves a row's level through the override", () => {
		expect(rowEntry(row('qr_'))).toBeNull();
		expect(rowEntry(row('qr_ \n\t '))).toBeNull();
		expect(rowEntry(row('qr-H_hello world'))?.options.ecc).toBe('H');
		expect(rowEntry(row('qr_hello world'))?.options.ecc).toBe('M');
	});

	it('normalizes CR, strips a newline from a numeric value only, and never splits a row', () => {
		expect(rowEntry(row('qr_a\r\nb\rc'))).toMatchObject({ raw: 'a\nb\nc', value: 'a\nb\nc' });
		expect(rowEntry(row('upc_036000\n291452'))).toMatchObject({
			raw: '036000\n291452',
			value: '036000291452',
			valid: true
		});
		expect(rowEntry(row('upc_012345678905,036000291452'))?.valid).toBe(false);
		// The recorded Pharmacode leniency: its encoder reads only the leading digits.
		expect(rowEntry(row('pharmacode_12,34'))).toMatchObject({ valid: true, encoded: '12,34' });
		expect(rowEntry(row('code128_a\nb'))).toMatchObject({ valid: true, value: 'a\nb' });
	});

	it('drops blank rows from the entries and numbers the others by editor place', () => {
		const entries = rowEntries(deck('qr_a', 'qr_', 'upc_036000291452'));
		expect(entries.map((e) => e.value)).toEqual(['a', '036000291452']);
		expect(rowNumbers(deck('qr_ ', 'qr_a', 'qr_', 'qr_b'))).toEqual([2, 4]);
		expect(rowNumbers([])).toEqual([]);
	});
});

describe('textFromRows', () => {
	it('is lossless at one format and level, taking both from the first row', () => {
		expect(textFromRows(deck('qr-H_a', 'qr-H_b'), FALLBACK)).toEqual(lossless('a\nb', 'qr', 'H'));
	});

	it('counts rows, never pieces, and joins whole tokens', () => {
		expect(loses('upc_036000291452', 'qr_hello', 'datamatrix_world')).toEqual(n(2, 0, 0));
		expect(loses('qr-H_a', 'qr_b', 'qr-L_c')).toEqual(n(0, 2, 0));
		expect(loses('qr-H_a', 'aztec-50_b')).toEqual(n(1, 0, 0)); // another format counts once
		expect(loses('upc_036000291452', 'upc_012345678905,036000291452')).toEqual(n(0, 0, 1));
		expect(loses('upc_036000291452', 'qr_a,b')).toEqual(n(1, 0, 1));
		expect(loses('qr_a,b')).toEqual(n(0, 0, 0)); // a comma under a text format is data
		expect(loses('qr_line 1\nline 2', 'qr_x')).toEqual(n(0, 0, 1));
		expect(loses('upc_036000291452', 'upc_,')).toEqual(n(0, 0, 1)); // zero pieces
		expect(loses('upc_036000291452', 'upc_036000291452,')).toEqual(n(0, 0, 1)); // one, changed
		// Whole tokens are joined, and the edge-comma row, ✗ as a row, would become a ✓ code.
		expect(text('upc_036000291452', 'qr_hello', 'datamatrix_world')).toBe(
			'036000291452\nhello\nworld'
		);
		expect(text('qr_line 1\nline 2', 'qr_x')).toBe('line 1\nline 2\nx');
		expect(rowEntry(row('upc_036000291452,'))?.valid).toBe(false);
		const after = parseCodeList(text('upc_036000291452', 'upc_036000291452,'), 'upc');
		expect(after.map((e) => e.valid)).toEqual([true, true]);
	});

	it('ignores blank rows, and falls back when no row is non-blank', () => {
		const blanks = deck('datamatrix_', 'qr-H_a', 'upc_ ', 'qr-H_b');
		expect(textFromRows(blanks, FALLBACK)).toEqual(lossless('a\nb', 'qr', 'H'));
		const qrH = { format: 'qr', ecc: 'H', lax: false } as const;
		expect(textFromRows([], qrH)).toEqual(lossless('', 'qr', 'H'));
		expect(textFromRows(deck('upc_ '), qrH)).toEqual(lossless('', 'qr', 'H'));
	});
});

describe('describeLoss', () => {
	it('words the five examples of the loss note', () => {
		expect(words(n(3, 1, 2), 'qr', 'H')).toBe(
			`${LIMIT} Switching now drops the format of 3 rows, the level of 1 row, and cuts 2 payloads at line breaks. Every code will take the format of the first code, QR Code, and level H.`
		);
		expect(words(n(0, 0, 1), 'upc')).toBe(
			`${LIMIT} Switching now cuts 1 payload at line breaks or commas. Every code will take the format of the first code, UPC-A.`
		);
		expect(words(n(2, 0, 0), 'datamatrix')).toBe(
			`${LIMIT} Switching now drops the format of 2 rows. Every code will take the format of the first code, Data Matrix.`
		);
		expect(words(n(0, 1, 1), 'qr')).toBe(
			`${LIMIT} Switching now drops the level of 1 row and cuts 1 payload at line breaks. Every code will take the format of the first code, QR Code, and the format's default level.`
		);
		expect(words(n(1, 2, 0), 'aztec', '50')).toBe(
			`${LIMIT} Switching now drops the format of 1 row and the level of 2 rows. Every code will take the format of the first code, Aztec, and ≥50% error correction.`
		);
	});

	it('is empty when nothing would be lost, whatever the result', () => {
		expect(words(n(0, 0, 0), 'qr', 'H')).toBe('');
		expect(words(n(0, 0, 0), 'upc')).toBe('');
	});
});

describe('lax rows', () => {
	const G = '(01)09501101530003';
	const GS1_LIMIT =
		'Plain text keeps one format, one error-correction level and one render-if-invalid setting for the whole list, and one code per line.';

	it('rowsFromText gives every row the list flag, and rowEntry resolves it through the override', () => {
		expect(rowsFromText(`${G}\n(01)09501101530004`, 'gs1128', '', true)).toEqual(
			deck(`gs1128-lax_${G}`, 'gs1128-lax_(01)09501101530004')
		);
		expect(rowEntry(row(`gs1128-lax_${G}`))?.options).toEqual({ lax: true });
		expect(rowEntry(row(`gs1128_${G}`))?.options).toEqual({ lax: false });
		expect(rowEntry(row('gs1128-lax_(01)09501101530004'))).toMatchObject({
			valid: true,
			lint: 'AI 01: Bad checksum'
		});
		expect(rowEntry(row('gs1128_(01)09501101\n530003'))).toMatchObject({
			valid: true,
			value: G,
			gs1: { data: '0109501101530003' }
		});
	});

	it('textFromRows counts a row once, under formats, then levels, then validation; lax is the first row’s', () => {
		expect(loses(`gs1128_${G}`, `gs1128-lax_${G}`)).toEqual(n(0, 0, 0, 1));
		expect(loses(`gs1128-lax_${G}`, `gs1qr-lax_${G}`)).toEqual(n(1, 0, 0, 0));
		expect(loses(`gs1qr-H_${G}`, `gs1qr-H-lax_${G}`)).toEqual(n(0, 0, 0, 1));
		expect(loses(`gs1qr-H_${G}`, `gs1qr-L-lax_${G}`)).toEqual(n(0, 1, 0, 0));
		expect(loses('gs1128_(01)09501101\n530003', `gs1128_${G}`)).toEqual(n(0, 0, 1, 0));
		expect(textFromRows(deck(`gs1128-lax_${G}`, `gs1128_${G}`), FALLBACK)).toEqual({
			text: `${G}\n${G}`,
			format: 'gs1128',
			ecc: '',
			lax: true,
			loses: n(0, 0, 0, 1)
		});
		expect(textFromRows(deck(`gs1128_${G}`), FALLBACK)).toEqual(lossless(G, 'gs1128'));
	});

	it('words the render-if-invalid clause and the GS1 result tails', () => {
		expect(words(n(0, 0, 0, 1), 'gs1128')).toBe(
			`${GS1_LIMIT} Switching now drops the render-if-invalid setting of 1 row. Every code will take the format of the first code, GS1-128, with invalid GS1 data skipped.`
		);
		expect(words(n(1, 1, 1, 1), 'gs1qr', 'H', true)).toBe(
			`${GS1_LIMIT} Switching now drops the format of 1 row, the level of 1 row, the render-if-invalid setting of 1 row, and cuts 1 payload at line breaks. Every code will take the format of the first code, GS1 QR Code, and level H, with invalid GS1 data rendered.`
		);
		expect(words(n(1, 0, 0, 0), 'gs1128', '', true)).toBe(
			`${LIMIT} Switching now drops the format of 1 row. Every code will take the format of the first code, GS1-128, with invalid GS1 data rendered.`
		);
		expect(words(n(0, 0, 2, 0), 'gs1128')).toBe(
			`${LIMIT} Switching now cuts 2 payloads at line breaks. Every code will take the format of the first code, GS1-128, with invalid GS1 data skipped.`
		);
		expect(words(n(0, 0, 0, 0), 'gs1128', '', true)).toBe('');
	});
});

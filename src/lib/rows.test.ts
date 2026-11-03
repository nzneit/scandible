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

/** Rows in the spec's record form, `format[-level]_payload`; the payload is everything after
 *  the first `_`. */
const deck = (...records: string[]): Row[] =>
	records.map((record) => {
		const tag = record.slice(0, record.indexOf('_'));
		const [format, ecc = ''] = tag.split('-');
		return { payload: record.slice(tag.length + 1), format: format as FormatId, ecc };
	});
const row = (record: string) => deck(record)[0];
const n = (formats: number, levels: number, splits: number) => ({ formats, levels, splits });
const NONE = n(0, 0, 0);
const lossless = (text: string, format: FormatId, ecc = '') => ({ text, format, ecc, loses: NONE });
const FALLBACK = { format: 'upc', ecc: '' } as const;
const loses = (...records: string[]) => textFromRows(deck(...records), FALLBACK).loses;
const text = (...records: string[]) => textFromRows(deck(...records), FALLBACK).text;
const LIMIT =
	'Plain text keeps one format and one error-correction level for the whole list, and one code per line.';

describe('rowsFromText', () => {
	it('makes one row per token at the list format and level, after CR normalization', () => {
		expect(rowsFromText('036000291452,012345678905', 'upc', '')).toEqual(
			deck('upc_036000291452', 'upc_012345678905')
		);
		expect(rowsFromText('hello\nworld', 'qr', 'H')).toEqual(deck('qr-H_hello', 'qr-H_world'));
		expect(rowsFromText('a\rb', 'qr', '')).toEqual(deck('qr_a', 'qr_b'));
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
		const qrH = { format: 'qr', ecc: 'H' } as const;
		expect(textFromRows([], qrH)).toEqual(lossless('', 'qr', 'H'));
		expect(textFromRows(deck('upc_ '), qrH)).toEqual(lossless('', 'qr', 'H'));
	});
});

describe('describeLoss', () => {
	const words = (counts: ReturnType<typeof n>, format: FormatId, ecc = '') =>
		describeLoss(counts, { format, ecc });

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

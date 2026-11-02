import { describe, it, expect } from 'vitest';
import barcodes from 'jsbarcode/bin/barcodes';
import * as bwip from 'bwip-js/browser';
import {
	DEFAULT_FORMAT,
	FORMATS,
	FORMAT_BY_ID,
	FORMAT_GROUPS,
	eccChoice,
	isEccChoice,
	isFormatId,
	type FormatId
} from './formats';
import { checkCode } from './codes';

const EXCLUDED = ['GenericBarcode', 'CODE93FullASCII'];

describe('format registry integrity', () => {
	const JSB = FORMATS.filter((f) => f.engine === 'jsbarcode');

	it('has 25 unique ids across seven groups in README order, 2D last', () => {
		expect(FORMATS.length).toBe(25);
		expect(new Set(FORMATS.map((f) => f.id)).size).toBe(25);
		expect(FORMAT_GROUPS.map((g) => g.group)).toEqual([
			'CODE128',
			'EAN / UPC',
			'CODE39',
			'ITF',
			'MSI',
			'Other',
			'2D'
		]);
		expect(FORMAT_GROUPS.flatMap((g) => g.formats)).toEqual([...FORMATS]);
		expect(FORMAT_GROUPS[6].formats.map((f) => f.id)).toEqual([
			'qr',
			'datamatrix',
			'pdf417',
			'aztec'
		]);
	});

	it('resolves every descriptor in JsBarcode’s registry', () => {
		for (const f of JSB) {
			expect(barcodes[f.jsbarcodeFormat], f.id).toBeDefined();
		}
	});

	it('covers every JsBarcode registry key as a descriptor or an explicit exclusion', () => {
		const covered = new Set([...JSB.map((f) => f.jsbarcodeFormat), ...EXCLUDED]);
		for (const key of Object.keys(barcodes)) {
			expect(covered.has(key), key).toBe(true);
		}
	});

	it('defaults to upc and type-guards ids', () => {
		expect(DEFAULT_FORMAT).toBe('upc');
		expect(FORMAT_BY_ID.get('upc')).toMatchObject({ engine: 'jsbarcode', jsbarcodeFormat: 'UPC' });
		expect(isFormatId('code39')).toBe(true);
		expect(isFormatId('CODE39')).toBe(false);
		expect(isFormatId('')).toBe(false);
	});

	it('defines no day-one behavior hooks (the seam stays data-only)', () => {
		for (const f of FORMATS) {
			expect(f.normalize, f.id).toBeUndefined();
		}
		for (const f of JSB) {
			expect(f.renderOptions, f.id).toBeUndefined();
		}
	});
});

/** [input, valid, encoded-if-different] — probed against jsbarcode 3.12.3. */
const MATRIX: Partial<Record<FormatId, [string, boolean, string?][]>> = {
	code128: [
		['Hello World!', true],
		['with,comma', true],
		['ab1234', true]
	],
	code128a: [
		['HELLO', true],
		['hello', false]
	],
	code128b: [['Hello b!', true]],
	code128c: [
		['1234', true],
		['123', false],
		['AB', false]
	],
	ean13: [
		['5901234123457', true],
		['5901234123450', false],
		['590123412345', true, '5901234123457'],
		['59012', false]
	],
	ean8: [
		['96385074', true],
		['9638507', true, '96385074'],
		['96385075', false]
	],
	ean5: [
		['54495', true],
		['5449', false]
	],
	ean2: [
		['53', true],
		['5', false]
	],
	upc: [
		['036000291452', true],
		['03600029145', true, '036000291452'],
		['036000291453', false]
	],
	upce: [
		['654321', true],
		['01245714', true],
		['0124571', false]
	],
	code39: [
		['HELLO 123', true],
		['hello', true, 'HELLO'],
		['A-B.C/D+E$F%G', true]
	],
	itf: [
		['1234', true],
		['123', false]
	],
	itf14: [
		['10012345678902', true],
		['10012345678903', false],
		['1001234567890', true, '10012345678902']
	],
	msi: [
		['1234', true],
		['12a4', false]
	],
	msi10: [['1234', true, '12344']],
	msi11: [['1234', true, '12343']],
	msi1010: [['1234', true, '123448']],
	msi1110: [['1234', true, '123430']],
	pharmacode: [
		['3', true],
		['131070', true],
		['2', false],
		['131071', false]
	],
	codabar: [
		['A1234B', true],
		['1234', true, 'A1234A'],
		['E1234F', false]
	],
	code93: [
		['HELLO 93', true],
		['hello', false]
	]
};

describe('checkCode matrix (probed encoder facts)', () => {
	for (const [format, cases] of Object.entries(MATRIX) as [
		FormatId,
		[string, boolean, string?][]
	][]) {
		it(`covers every format: ${format}`, () => {
			for (const [input, valid, mutated] of cases) {
				const res = checkCode(input, format);
				expect(res.valid, `${format} '${input}'`).toBe(valid);
				if (res.valid) expect(res.encoded, `${format} '${input}'`).toBe(mutated ?? input);
				else expect('encoded' in res, `${format} '${input}'`).toBe(false);
			}
		});
	}

	it('treats the empty string as invalid, without throwing, in every format', () => {
		for (const f of FORMATS) {
			expect(checkCode('', f.id)).toEqual({ valid: false });
		}
	});
});

describe('2D rows and error-correction choices', () => {
	const row = (id: FormatId) => FORMAT_BY_ID.get(id)!;
	const values = (id: FormatId) => row(id).ecc?.choices.map((c) => c.value);
	const optionText = (id: FormatId) =>
		row(id).ecc?.choices.map((c) => (c.note ? `${c.label} (${c.note})` : c.label));

	it.each([
		['qr', 'qrcode', 'QR Code', 2, 2, 100],
		['datamatrix', 'datamatrix', 'Data Matrix', 2, 2, 100],
		['pdf417', 'pdf417', 'PDF417', 1, 3, 300],
		['aztec', 'azteccode', 'Aztec', 2, 2, 100]
	] as const)('defines the %s row from the spec table', (id, bcid, label, x, y, denseAbove) => {
		const common = { engine: 'bwipjs', group: '2D', numeric: false };
		expect(row(id)).toMatchObject({ ...common, bcid, label, modulePx: { x, y }, denseAbove });
	});

	it('names a function export of bwip-js/browser in every bcid', () => {
		for (const f of FORMATS)
			if (f.engine === 'bwipjs') expect(typeof bwip[f.bcid], f.id).toBe('function');
	});

	it('declares ecc only on qr, pdf417 and aztec, with the spec copy in order', () => {
		expect(FORMATS.filter((f) => f.ecc).map((f) => f.id)).toEqual(['qr', 'pdf417', 'aztec']);
		expect(values('qr')).toEqual(['L', 'M', 'Q', 'H']);
		expect(optionText('qr')).toEqual([
			'level L (~7% recovery)',
			'level M (~15% recovery, default)',
			'level Q (~25% recovery)',
			'level H (~30% recovery)'
		]);
		expect(values('pdf417')).toEqual(['auto', '0', '1', '2', '3', '4', '5', '6', '7', '8']);
		expect(optionText('pdf417')).toEqual([
			'automatic level (recommended, default)',
			'level 0 (detection only)',
			...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `level ${n}`)
		]);
		expect(values('aztec')).toEqual(['10', '23', '36', '50']);
		expect(optionText('aztec')).toEqual([
			'≥10% error correction',
			'≥23% error correction (default)',
			'≥36% error correction',
			'≥50% error correction'
		]);
		expect([row('qr'), row('pdf417'), row('aztec')].map((d) => d.ecc?.defaultValue)).toEqual([
			'M',
			'auto',
			'23'
		]);
	});

	it('isEccChoice accepts every declared value and default, and rejects "", "X", undefined and other formats’ values', () => {
		for (const f of FORMATS) if (f.ecc) expect(isEccChoice(f, f.ecc.defaultValue), f.id).toBe(true);
		for (const f of FORMATS)
			for (const c of f.ecc?.choices ?? [])
				expect(isEccChoice(f, c.value), `${f.id} ${c.value}`).toBe(true);
		expect(isEccChoice(row('qr'), '')).toBe(false);
		expect(isEccChoice(row('qr'), 'X')).toBe(false);
		expect(isEccChoice(row('qr'), undefined)).toBe(false);
		expect(isEccChoice(row('qr'), '23')).toBe(false);
		expect(isEccChoice(row('aztec'), 'H')).toBe(false);
		expect(isEccChoice(row('pdf417'), 'M')).toBe(false);
		expect(isEccChoice(row('datamatrix'), 'M')).toBe(false);
		expect(isEccChoice(row('upc'), 'M')).toBe(false);
	});

	it('eccChoice returns the labelled choice', () => {
		expect(eccChoice(row('qr'), 'H')).toEqual({
			value: 'H',
			label: 'level H',
			note: '~30% recovery'
		});
		expect(eccChoice(row('aztec'), '23')).toEqual({
			value: '23',
			label: '≥23% error correction',
			note: 'default'
		});
		expect(eccChoice(row('qr'), undefined)).toBeUndefined();
		expect(eccChoice(row('qr'), 'Z')).toBeUndefined();
		expect(eccChoice(row('datamatrix'), 'M')).toBeUndefined();
	});
});

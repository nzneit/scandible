import { describe, it, expect } from 'vitest';
import barcodes from 'jsbarcode/bin/barcodes';
import { DEFAULT_FORMAT, FORMATS, FORMAT_BY_ID, FORMAT_GROUPS, isFormatId } from './formats';
import { checkCode } from './codes';

const EXCLUDED = ['GenericBarcode', 'CODE93FullASCII'];

describe('format registry integrity', () => {
	it('has 21 unique ids across six groups in README order', () => {
		expect(FORMATS.length).toBe(21);
		expect(new Set(FORMATS.map((f) => f.id)).size).toBe(21);
		expect(FORMAT_GROUPS.map((g) => g.group)).toEqual([
			'CODE128',
			'EAN / UPC',
			'CODE39',
			'ITF',
			'MSI',
			'Other'
		]);
		expect(FORMAT_GROUPS.flatMap((g) => g.formats)).toEqual([...FORMATS]);
	});

	it('resolves every descriptor in JsBarcode’s registry', () => {
		for (const f of FORMATS) {
			expect(barcodes[f.jsbarcodeFormat], f.id).toBeDefined();
		}
	});

	it('covers every JsBarcode registry key as a descriptor or an explicit exclusion', () => {
		const covered = new Set([...FORMATS.map((f) => f.jsbarcodeFormat), ...EXCLUDED]);
		for (const key of Object.keys(barcodes)) {
			expect(covered.has(key), key).toBe(true);
		}
	});

	it('defaults to upc and type-guards ids', () => {
		expect(DEFAULT_FORMAT).toBe('upc');
		expect(FORMAT_BY_ID.get('upc')?.jsbarcodeFormat).toBe('UPC');
		expect(isFormatId('code39')).toBe(true);
		expect(isFormatId('CODE39')).toBe(false);
		expect(isFormatId('')).toBe(false);
	});

	it('defines no day-one behavior hooks (the seam stays data-only)', () => {
		for (const f of FORMATS) {
			expect(f.normalize, f.id).toBeUndefined();
			expect(f.renderOptions, f.id).toBeUndefined();
		}
	});
});

/** [input, valid, encoded-if-different] — probed against jsbarcode 3.12.3. */
const MATRIX: Record<import('./formats').FormatId, [string, boolean, string?][]> = {
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
		import('./formats').FormatId,
		[string, boolean, string?][]
	][]) {
		it(`covers every format: ${format}`, () => {
			for (const [input, valid, mutated] of cases) {
				const res = checkCode(input, format);
				expect(res.valid, `${format} '${input}'`).toBe(valid);
				if (valid) expect(res.encoded, `${format} '${input}'`).toBe(mutated ?? input);
				else expect(res.encoded).toBeUndefined();
			}
		});
	}

	it('treats the empty string as invalid, without throwing, in every format', () => {
		for (const f of FORMATS) {
			expect(checkCode('', f.id)).toEqual({ valid: false });
		}
	});
});

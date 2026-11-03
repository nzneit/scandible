import { describe, it, expect } from 'vitest';
import barcodes from 'jsbarcode/bin/barcodes';
import * as bwip from 'bwip-js/browser';
import {
	DEFAULT_FORMAT,
	FORMATS,
	FORMAT_BY_ID,
	FORMAT_GROUPS,
	canonicalEcc,
	canonicalLax,
	eccChoice,
	isEccChoice,
	isFormatId,
	isGs1,
	type FormatId
} from './formats';
import { checkCode } from './codes';

const EXCLUDED = ['GenericBarcode', 'CODE93FullASCII'];

const GS1_IDS: FormatId[] = [
	'gs1128',
	'databaromni',
	'databartruncated',
	'databarstacked',
	'databarstackedomni',
	'databarlimited',
	'databarexpanded',
	'databarexpandedstacked',
	'gs1datamatrix',
	'gs1qr',
	'gs1dotcode'
];

describe('format registry integrity', () => {
	const JSB = FORMATS.filter((f) => f.engine === 'jsbarcode');

	it('has 36 unique ids across eight groups in README order, 2D then GS1 last', () => {
		expect(FORMATS.length).toBe(36);
		expect(new Set(FORMATS.map((f) => f.id)).size).toBe(36);
		expect(FORMAT_GROUPS.map((g) => g.group)).toEqual([
			'CODE128',
			'EAN / UPC',
			'CODE39',
			'ITF',
			'MSI',
			'Other',
			'2D',
			'GS1'
		]);
		expect(FORMAT_GROUPS.flatMap((g) => g.formats)).toEqual([...FORMATS]);
		expect(FORMAT_GROUPS[6].formats.map((f) => f.id)).toEqual([
			'qr',
			'datamatrix',
			'pdf417',
			'aztec'
		]);
		expect(FORMAT_GROUPS[7].formats.map((f) => f.id)).toEqual(GS1_IDS);
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

	it('defines normalize on every GS1 descriptor and on no other (the seam stays data-only)', () => {
		for (const f of FORMATS) {
			if (f.engine === 'bwipjs' && f.gs1)
				expect(f.normalize?.(' (01) 0950 '), f.id).toBe('(01)0950');
			else expect(f.normalize, f.id).toBeUndefined();
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

	it('declares no ecc on any JsBarcode descriptor, because only bwip-js reads it', () => {
		for (const f of FORMATS) if (f.engine === 'jsbarcode') expect(f.ecc, f.id).toBeUndefined();
	});

	it('declares ecc only on qr, pdf417, aztec and gs1qr, with the spec copy in order', () => {
		expect(FORMATS.filter((f) => f.ecc).map((f) => f.id)).toEqual([
			'qr',
			'pdf417',
			'aztec',
			'gs1qr'
		]);
		expect(row('gs1qr').ecc).toBe(row('qr').ecc);
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

describe('canonicalEcc', () => {
	it('keeps only a level the format accepts that is not its default', () => {
		expect(canonicalEcc('nope' as FormatId, 'H')).toBe('');
		expect(canonicalEcc('datamatrix', 'H')).toBe('');
		expect(canonicalEcc('qr', 'auto')).toBe('');
		expect(canonicalEcc('qr', 'M')).toBe('');
		expect(canonicalEcc('qr', 'H')).toBe('H');
	});
});

describe('GS1 rows', () => {
	const bw = (id: FormatId) => {
		const d = FORMAT_BY_ID.get(id);
		if (d?.engine !== 'bwipjs') throw new Error(`${id} is not a bwip-js row`);
		return d;
	};

	it('names the eleven encoders and labels in table order', () => {
		expect(GS1_IDS.map((id) => [bw(id).bcid, bw(id).label])).toEqual([
			['gs1_128', 'GS1-128'],
			['databaromni', 'GS1 DataBar Omnidirectional'],
			['databartruncated', 'GS1 DataBar Truncated'],
			['databarstacked', 'GS1 DataBar Stacked'],
			['databarstackedomni', 'GS1 DataBar Stacked Omnidirectional'],
			['databarlimited', 'GS1 DataBar Limited'],
			['databarexpanded', 'GS1 DataBar Expanded'],
			['databarexpandedstacked', 'GS1 DataBar Expanded Stacked'],
			['gs1datamatrix', 'GS1 DataMatrix'],
			['gs1qrcode', 'GS1 QR Code'],
			['gs1dotcode', 'GS1 DotCode']
		]);
	});

	it('carries the AIM identifier and the GTIN rule of each carrier', () => {
		expect(GS1_IDS.map((id) => [bw(id).gs1?.aim, bw(id).gs1?.gtinCheck])).toEqual([
			[']C1', undefined],
			[']e0', 'own'],
			[']e0', 'own'],
			[']e0', 'own'],
			[']e0', 'own'],
			[']e0', 'own'],
			[']e0', 'implied'],
			[']e0', 'implied'],
			[']d2', undefined],
			[']Q3', undefined],
			[']J1', undefined]
		]);
	});

	it('shapes eight linear carriers (1 px, quiet zone 10, dense above 300) and three 2D ones (2 px, 4, 100)', () => {
		const geometry = (id: FormatId) => {
			const d = bw(id);
			expect(d).toMatchObject({ engine: 'bwipjs', group: 'GS1', numeric: false });
			return [d.shape, d.modulePx.x, d.modulePx.y, d.quietZone, d.denseAbove].join(' ');
		};
		expect(GS1_IDS.map(geometry)).toEqual([
			...Array<string>(8).fill('linear 1 1 10 300'),
			...Array<string>(3).fill('2d 2 2 4 100')
		]);
	});

	it('sets the GS1-128 height and ceiling and the DotCode offset, and nothing else of the kind', () => {
		const withField = <K extends 'heightMm' | 'maxChars' | 'moduleOffsetPx'>(key: K) =>
			FORMATS.flatMap((f) =>
				f.engine === 'bwipjs' && f[key] !== undefined ? [[f.id, f[key]]] : []
			);
		expect(withField('heightMm')).toEqual([['gs1128', 18.3]]);
		expect(withField('maxChars')).toEqual([['gs1128', 48]]);
		expect(withField('moduleOffsetPx')).toEqual([['gs1dotcode', { x: 1, y: 1 }]]);
	});

	it('gives the four 2D rows their shape and quiet zone', () => {
		expect(
			(['qr', 'datamatrix', 'pdf417', 'aztec'] as const).map((id) => [
				bw(id).shape,
				bw(id).quietZone
			])
		).toEqual([
			['2d', 4],
			['2d', 4],
			['2d', 8],
			['2d', 4]
		]);
	});

	it('isGs1 narrows the eleven and nothing else; canonicalLax keeps lax only on them', () => {
		expect(FORMATS.filter((f) => isGs1(f)).map((f) => f.id)).toEqual(GS1_IDS);
		expect(isGs1(undefined)).toBe(false);
		expect(isGs1(FORMAT_BY_ID.get('qr'))).toBe(false);
		expect(canonicalLax('gs1128', true)).toBe(true);
		expect(canonicalLax('upc', true)).toBe(false);
		expect(canonicalLax('gs1qr', false)).toBe(false);
		expect(canonicalLax('nope' as FormatId, true)).toBe(false);
	});
});

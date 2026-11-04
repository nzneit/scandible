import { describe, it, expect } from 'vitest';
import { FORMAT_BY_ID, isGs1, type FormatId } from './formats';
import {
	GS,
	GS1_AIMS,
	GS_MARK,
	PREDEFINED_LENGTH_PREFIXES,
	dataCharacters,
	breakdown,
	displayData,
	gtinCheckDigit,
	parseElementString,
	readGs1Input,
	scanData,
	splitScanData
} from './gs1';

const carrier = (id: FormatId) => {
	const d = FORMAT_BY_ID.get(id);
	if (!isGs1(d)) throw new Error(`${id} is not a GS1 carrier`);
	return d;
};
const S = '(01)09501101530003(17)261231(10)LOT42';

describe('constants', () => {
	it('lists GS1 Figure 7.8.5-2, BWIPP’s aifixed, and names the GS character', () => {
		expect([...PREDEFINED_LENGTH_PREFIXES]).toEqual(
			'00 01 02 03 04 11 12 13 14 15 16 17 18 19 20 31 32 33 34 35 36 41'.split(' ')
		);
		expect(GS).toBe('\u001d');
		expect(GS_MARK).toBe('␝');
	});
});

describe('parseElementString', () => {
	it('splits bracketed pairs, drops one trailing (, and is null when brackets do not cover the string', () => {
		expect(parseElementString(S)).toEqual([
			{ ai: '01', value: '09501101530003' },
			{ ai: '17', value: '261231' },
			{ ai: '10', value: 'LOT42' }
		]);
		expect(parseElementString('(99999)123')).toEqual([{ ai: '99999', value: '123' }]);
		expect(parseElementString('(10)A(B)C')).toEqual([
			{ ai: '10', value: 'A' },
			{ ai: 'B', value: 'C' }
		]);
		expect(parseElementString('(10)A(')).toEqual([{ ai: '10', value: 'A' }]);
		expect(parseElementString('')).toEqual([]);
		expect(parseElementString('(')).toEqual([]);
		expect(parseElementString('0109')).toBeNull();
		expect(parseElementString('(10)A((')).toBeNull();
		expect(parseElementString('(10)A)B')).toEqual([{ ai: '10', value: 'A)B' }]);
	});
});

describe('gtinCheckDigit', () => {
	it('is the GS1 mod-10 digit over 13 digits', () => {
		expect(gtinCheckDigit('0950110153000')).toBe('3');
		expect(gtinCheckDigit('1001234567890')).toBe('2');
	});
});

describe('scanData', () => {
	const gs1128 = carrier('gs1128');

	it('joins AI and value and puts a GS after a variable-length AI that is not last', () => {
		expect(scanData(gs1128, S)).toEqual({ aim: ']C1', data: '01095011015300031726123110LOT42' });
		expect(scanData(gs1128, '(10)LOT42(01)09501101530003')).toEqual({
			aim: ']C1',
			data: '10LOT42\u001d0109501101530003'
		});
		expect(scanData(gs1128, '(3103)000123(10)X')).toEqual({ aim: ']C1', data: '310300012310X' });
		expect(scanData(gs1128, '(8110)106141416543213500110000310123196000(10)X')).toEqual({
			aim: ']C1',
			data: '8110106141416543213500110000310123196000\u001d10X'
		});
		expect(scanData(gs1128, '(10)A(')).toEqual({ aim: ']C1', data: '10A' });
		expect(scanData(gs1128, '(01)09501101530004')).toEqual({
			aim: ']C1',
			data: '0109501101530004'
		});
	});

	it('follows the carrier’s GTIN rule', () => {
		const omni = carrier('databaromni');
		const expanded = carrier('databarexpanded');
		expect(scanData(omni, '(01)0950110153000')).toEqual({ aim: ']e0', data: '0109501101530003' });
		expect(scanData(omni, '(01)09501101530003')).toEqual({ aim: ']e0', data: '0109501101530003' });
		expect(scanData(expanded, '(01)09501101530004(17)261231(10)LOT42')).toEqual({
			aim: ']e0',
			data: '01095011015300031726123110LOT42'
		});
		expect(scanData(expanded, '(10)A(01)09501101530004')).toEqual({
			aim: ']e0',
			data: '10A\u001d0109501101530004'
		});
	});

	it('falls back to the value itself when the string does not parse', () => {
		expect(scanData(gs1128, '0109')).toEqual({ aim: ']C1', data: '0109' });
	});
});

describe('displayData and dataCharacters', () => {
	it('shows ␝ for each GS and counts code points without it', () => {
		const data = '10LOT42\u001d0109501101530003';
		expect(displayData(data)).toBe('10LOT42␝0109501101530003');
		expect(dataCharacters(data)).toBe(23);
		expect(dataCharacters('10A\u001d10B')).toBe(6);
		expect(dataCharacters('10Aé')).toBe(4);
	});
});

describe('readGs1Input', () => {
	const ok = (value: string, fromScan?: { aim?: string }) =>
		fromScan ? { ok: true, value, fromScan } : { ok: true, value };
	const no = (message: string) => ({ ok: false, message });
	const NON_GS1 =
		'is not a GS1 symbology identifier; GS1 scan data starts with ]C1, ]e0, ]d2, ]Q3 or ]J1, or with its first AI';

	it('passes bracketed text untouched', () => {
		expect(readGs1Input(`(01)09501101530003(10)A${GS}`)).toStrictEqual(
			ok(`(01)09501101530003(10)A${GS}`)
		);
		expect(readGs1Input('(')).toStrictEqual(ok('('));
	});

	it.each([GS, '␝', '<GS>', '<gs>', '\\x1d', '\\X1D', '\\u001d', '\\U001D'])(
		'reads the separator notation %j',
		(n) => {
			expect(readGs1Input(`10LOT42${n}17261231`)).toStrictEqual(ok('(10)LOT42(17)261231', {}));
		}
	);

	it.each([...GS1_AIMS.keys()])('reads the identifier %s', (aim) => {
		expect(readGs1Input(`${aim}0109501101530003`)).toStrictEqual(ok('(01)09501101530003', { aim }));
	});

	it('refuses identifiers of the wrong case', () => {
		const msg = (id: string, use: string) =>
			no(`${id} is not a GS1 symbology identifier; identifiers are case-sensitive, use ${use}`);
		expect(readGs1Input(']c10109501101530003')).toStrictEqual(msg(']c1', ']C1'));
		expect(readGs1Input(']E00109501101530003')).toStrictEqual(msg(']E0', ']e0'));
		expect(readGs1Input(']q30109501101530003')).toStrictEqual(msg(']q3', ']Q3'));
	});

	it('refuses non-GS1 identifiers', () => {
		expect(readGs1Input(']d1ABC')).toStrictEqual(no(`]d1 ${NON_GS1}`));
		expect(readGs1Input(']C')).toStrictEqual(no(`]C ${NON_GS1}`));
		expect(readGs1Input(']')).toStrictEqual(no(`] ${NON_GS1}`));
	});

	it('skips separators where no value is open', () => {
		expect(readGs1Input(`${GS}0109501101530003`)).toStrictEqual(ok('(01)09501101530003', {}));
		expect(readGs1Input(`10A${GS}${GS}17261231`)).toStrictEqual(ok('(10)A(17)261231', {}));
		expect(readGs1Input(`0109501101530003${GS}10A`)).toStrictEqual(
			ok('(01)09501101530003(10)A', {})
		);
		expect(readGs1Input(`10A${GS}`)).toStrictEqual(ok('(10)A', {}));
	});

	it.each([
		[
			'0109501101530003(10)LOT42',
			'Brackets and scan data cannot be mixed; put every AI in brackets or none (stopped at "(10)LOT4…" after (01))'
		],
		[
			']C1(01)09501101530003',
			'Brackets and scan data cannot be mixed; put every AI in brackets or none (stopped at "(01)0950…")'
		],
		[
			'09501101530003',
			'No GS1 AI starts at "09501101…"; GS1 data starts with an AI, such as 01 before a GTIN'
		],
		['01095011015300039Z45', 'No GS1 AI starts at "9Z45" after (01)'],
		[`01095011015300039Z${GS}10A`, 'No GS1 AI starts at "9Z␝10A" after (01)'],
		['010950110153', '(01) takes 14 characters; only 10 follow'],
		['010950110153000', '(01) takes 14 characters; only 13 follow'],
		['011', '(01) takes 14 characters; only 1 follows'],
		['01', '(01) takes 14 characters; none follow'],
		[`01${GS}10A`, '(01) takes 14 characters; none follow'],
		[`10${GS}17261231`, '(10) has no value'],
		['10', '(10) has no value'],
		['10A(B)C', '(10) contains a parenthesis; parentheses inside a value are not supported'],
		['10A)B', '(10) contains a parenthesis; parentheses inside a value are not supported'],
		[']C1', 'No AIs in the scan data'],
		['<GS>', 'No AIs in the scan data'],
		[']C1<GS>', 'No AIs in the scan data']
	])('refuses %j', (input, message) => {
		expect(readGs1Input(input)).toStrictEqual(no(message));
	});
});

describe('splitScanData', () => {
	it('splits predefined and variable AIs', () => {
		expect(splitScanData('01095011015300031726123110LOT42')).toStrictEqual({
			elements: [
				{ ai: '01', value: '09501101530003' },
				{ ai: '17', value: '261231' },
				{ ai: '10', value: 'LOT42' }
			]
		});
	});

	it('returns the elements read before a stop', () => {
		expect(splitScanData(`010950110153000310LOT42${GS}9Z`)).toStrictEqual({
			elements: [
				{ ai: '01', value: '09501101530003' },
				{ ai: '10', value: 'LOT42' }
			],
			stop: 'No GS1 AI starts at "9Z" after (10)'
		});
	});
});

describe('breakdown', () => {
	const T = new Date(2026, 10, 3);

	it('builds a line per element', () => {
		expect(breakdown(`010950110153000310LOT42${GS}17261231`, T)).toStrictEqual({
			lines: [
				{ ai: '01', title: 'GTIN', text: '09501101530003' },
				{ ai: '10', title: 'BATCH/LOT', text: 'LOT42' },
				{ ai: '17', title: 'USE BY or EXPIRY', text: '2026-12-31' }
			]
		});
	});

	it('omits the title of an AI without one', () => {
		expect(breakdown('8110106141416543213500110000310123196000', T)).toStrictEqual({
			lines: [{ ai: '8110', text: '106141416543213500110000310123196000' }]
		});
	});

	it('returns the lines read before a stop', () => {
		expect(breakdown('01095011015300039Z', T)).toStrictEqual({
			lines: [{ ai: '01', title: 'GTIN', text: '09501101530003' }],
			stop: 'No GS1 AI starts at "9Z" after (01)'
		});
	});

	it('does not split a bracketed fallback', () => {
		expect(breakdown('(01)0950110153000(', T)).toStrictEqual({
			lines: [],
			stop: 'The bracketed string could not be split into AIs'
		});
	});
});

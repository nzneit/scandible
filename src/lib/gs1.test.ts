import { describe, it, expect } from 'vitest';
import { FORMAT_BY_ID, isGs1, type FormatId } from './formats';
import {
	GS,
	GS_MARK,
	PREDEFINED_LENGTH_PREFIXES,
	dataCharacters,
	displayData,
	gtinCheckDigit,
	parseElementString,
	scanData
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

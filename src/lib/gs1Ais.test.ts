import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import table from './gs1-ais.json';
import { AIS, aiAt, aiEntry, describeValue, type AiPart } from './gs1Ais';
import { PREDEFINED_LENGTH_PREFIXES } from './gs1';
import {
	RELEASE,
	SHA256,
	SOURCE,
	assertStructure,
	parseDictionary,
	type DictPart,
	type DictRecord
} from '../../scripts/gs1-ais';

const fixed = (n: number, cset: DictPart['cset'] = 'N', linters: string[] = []): DictPart => ({
	cset,
	min: n,
	max: n,
	opt: false,
	linters
});
const variable = (max: number, cset: DictPart['cset'] = 'X'): DictPart => ({
	cset,
	min: 1,
	max,
	opt: false,
	linters: []
});
const optional = (part: DictPart): DictPart => ({ ...part, opt: true });
const rec = (ai: string, parts: DictPart[], predefined = false): DictRecord => ({
	ai,
	predefined,
	parts
});

const LINE_01 = '01         *?  N14,csum,gcppos2   ex=255,37 dlpkey=22,10,21   # GTIN';

describe('parseDictionary', () => {
	it('reads a fixed field with linters and a predefined flag, ignoring attributes', () => {
		expect(parseDictionary(LINE_01)).toEqual([
			{
				ai: '01',
				title: 'GTIN',
				predefined: true,
				parts: [fixed(14, 'N', ['csum', 'gcppos2'])]
			}
		]);
	});
	it('treats ? alone as not predefined and reads a variable field', () => {
		expect(parseDictionary('10          ?  X..20   req=01,02,03,8006,8026   # BATCH/LOT')).toEqual([
			{ ai: '10', title: 'BATCH/LOT', predefined: false, parts: [variable(20)] }
		]);
	});
	it('reads a line with no flags column', () => {
		expect(parseDictionary('21             X..20   req=01,03,8006 ex=235   # SERIAL')).toEqual([
			{ ai: '21', title: 'SERIAL', predefined: false, parts: [variable(20)] }
		]);
	});
	it('keeps a range as written', () => {
		expect(parseDictionary('3100-3105  *?  N6   req=01,02 ex=310n   # NET WEIGHT (kg)')).toEqual([
			{ ai: '3100-3105', title: 'NET WEIGHT (kg)', predefined: true, parts: [fixed(6)] }
		]);
	});
	it('reads optional fields and several linters', () => {
		expect(
			parseDictionary('8008        ?  N6,yymmdd N2,hh [N2],mi [N2],ss   req=01,02   # PROD TIME')
		).toEqual([
			{
				ai: '8008',
				title: 'PROD TIME',
				predefined: false,
				parts: [
					fixed(6, 'N', ['yymmdd']),
					fixed(2, 'N', ['hh']),
					optional(fixed(2, 'N', ['mi'])),
					optional(fixed(2, 'N', ['ss']))
				]
			}
		]);
	});
	it('keeps a # inside the title', () => {
		expect(
			parseDictionary('7030        ?  N3,iso3166999 X..27   req=01,02   # PROCESSOR # 0')
		).toEqual([
			{
				ai: '7030',
				title: 'PROCESSOR # 0',
				predefined: false,
				parts: [fixed(3, 'N', ['iso3166999']), variable(27)]
			}
		]);
	});
	it('reads a non-ASCII title', () => {
		expect(parseDictionary('3140-3145  *?  N6   req=01,02 ex=314n   # AREA (m²)')).toEqual([
			{ ai: '3140-3145', title: 'AREA (m²)', predefined: true, parts: [fixed(6)] }
		]);
	});
	it('reads an untitled line without a title key', () => {
		const [record] = parseDictionary('8110        ?  X..70,couponcode');
		expect(record).toEqual({
			ai: '8110',
			predefined: false,
			parts: [{ ...variable(70), linters: ['couponcode'] }]
		});
		expect('title' in record).toBe(false);
	});
	it('reads the Y and Z sets and an optional variable field', () => {
		expect(parseDictionary('9999  ?  Y..30 [Z..90]   # TEST')).toEqual([
			{
				ai: '9999',
				title: 'TEST',
				predefined: false,
				parts: [variable(30, 'Y'), optional(variable(90, 'Z'))]
			}
		]);
	});
	it('skips comments and blank lines', () => {
		expect(parseDictionary('# comment\n\n' + LINE_01 + '\n')).toHaveLength(1);
	});
	it('throws, quoting the line, when a line has no component', () => {
		expect(() => parseDictionary('01  *?  # GTIN')).toThrow('01  *?  # GTIN');
	});
});

describe('assertStructure', () => {
	it('accepts a sound table', () => {
		expect(() =>
			assertStructure([
				rec('01', [fixed(14)], true),
				rec('10', [variable(20)]),
				rec('8008', [fixed(6), fixed(2), optional(fixed(2)), optional(fixed(2))])
			])
		).not.toThrow();
	});
	it.each([
		['an AI of five digits', [rec('12345', [fixed(1)])], /12345/],
		['an AI of one digit', [rec('5', [fixed(1)])], /5/],
		['an AI that is a prefix of another', [rec('12', [fixed(1)]), rec('123', [fixed(1)])], /12/],
		[
			'a range member that collides',
			[rec('3100-3105', [fixed(6)], true), rec('310', [fixed(1)])],
			/310/
		],
		['a variable predefined AI', [rec('01', [variable(14)], true)], /01/],
		[
			'an optional field on a predefined AI',
			[rec('01', [fixed(6), optional(fixed(2))], true)],
			/01/
		],
		['a non-numeric predefined AI', [rec('01', [fixed(14, 'X')], true)], /01/],
		['a variable field before the last', [rec('7030', [variable(27), fixed(3)])], /7030/],
		[
			'an optional field before a required one',
			[rec('8008', [fixed(6), optional(fixed(2)), fixed(2)])],
			/8008/
		]
	])('throws for %s', (_name, records, message) => {
		expect(() => assertStructure(records)).toThrow(message);
	});
});

describe('the committed table', () => {
	it('passes assertStructure and holds 224 records', () => {
		expect(table.ais).toHaveLength(224);
		expect(() => assertStructure(table.ais as DictRecord[])).not.toThrow();
	});
	it('carries the pins of the script that wrote it', () => {
		expect(table).toMatchObject({
			source: SOURCE,
			release: RELEASE,
			sha256: SHA256,
			licence: 'Apache-2.0'
		});
	});
});

describe('lookup', () => {
	it('returns the entry for one AI', () => {
		expect(aiEntry('01')).toEqual({
			ai: '01',
			title: 'GTIN',
			predefined: true,
			parts: [{ cset: 'N', min: 14, max: 14, opt: false, linters: ['csum', 'gcppos2'] }]
		});
		expect(aiEntry('235')).toMatchObject({
			ai: '235',
			title: 'TPX',
			predefined: false,
			parts: [{ cset: 'X', min: 1, max: 28 }]
		});
		expect(aiEntry('3103')).toMatchObject({
			ai: '3103',
			title: 'NET WEIGHT (kg)',
			predefined: true
		});
		expect(aiEntry('8008')?.parts).toHaveLength(4);
	});

	it('returns undefined for an AI GS1 does not assign', () => {
		for (const ai of ['3944', '04', '0a', '']) expect(aiEntry(ai)).toBeUndefined();
	});

	it('finds the AI starting at an index', () => {
		expect(aiAt('0109501101530003', 0)?.ai).toBe('01');
		expect(aiAt('x2351', 1)?.ai).toBe('235');
		expect(aiAt('3103000123', 0)?.ai).toBe('3103');
		expect(aiAt('9Z45', 0)).toBeUndefined();
		expect(aiAt('01', 1)).toBeUndefined();
		expect(aiAt('(10)', 0)).toBeUndefined();
	});

	it('expands the 224 records into 541 entries', () => {
		expect(AIS.size).toBe(541);
	});
});

/** BWIPP's gs1syntax dictionary from bwip-js's barcode.ps: AI → parts, linter names without `lint`. */
function bwippSyntax(): Map<string, AiPart[]> {
	const ps = readFileSync('node_modules/bwip-js/barcode.ps', 'latin1');
	const start = ps.indexOf('/gs1syntax <<');
	const end = ps.indexOf('\n    >> readonly def', start);
	const map = new Map<string, AiPart[]>();
	if (start < 0 || end < 0) return map;
	for (const block of ps.slice(start, end).split(/\n\s*pop\n/)) {
		const parts = [
			...block.matchAll(
				/<< \/cset \/(\w)\s+\/min\s+(\d+)\s+\/max\s+(\d+)\s+\/opt (true|false)\s+\/linters \[([^\]]*)\] >>/g
			)
		].map((m) => ({
			cset: m[1] as AiPart['cset'],
			min: Number(m[2]),
			max: Number(m[3]),
			opt: m[4] === 'true',
			linters: [...m[5].matchAll(/\/lint(\w+)/g)].map((l) => l[1])
		}));
		for (const m of block.matchAll(/^\s*\((\d+)\) exch dup$/gm)) map.set(m[1], parts);
	}
	return map;
}

describe('BWIPP parity', () => {
	const bwipp = bwippSyntax();

	it('has the same AI set as BWIPP', () => {
		expect(bwipp.size).toBe(541);
		expect([...AIS.keys()].sort()).toEqual([...bwipp.keys()].sort());
	});

	it('has the same fields as BWIPP for every AI', () => {
		for (const [ai, parts] of bwipp) expect(AIS.get(ai)?.parts, ai).toEqual(parts);
	});

	it('flags predefined exactly for the scan-data prefixes', () => {
		for (const entry of AIS.values())
			expect(entry.predefined, entry.ai).toBe(PREDEFINED_LENGTH_PREFIXES.has(entry.ai.slice(0, 2)));
	});

	it('carries the dictionary titles', () => {
		expect(aiEntry('01')?.title).toBe('GTIN');
		expect(aiEntry('10')?.title).toBe('BATCH/LOT');
		expect(aiEntry('17')?.title).toBe('USE BY or EXPIRY');
		expect(aiEntry('3103')?.title).toBe('NET WEIGHT (kg)');
		expect(aiEntry('3140')?.title).toBe('AREA (m²)');
		expect(aiEntry('7030')?.title).toBe('PROCESSOR # 0');
		expect(aiEntry('8110')?.title).toBeUndefined();
	});
});

describe('describeValue', () => {
	const T = new Date(2026, 10, 3);

	it.each<[string, string, string]>([
		['17', '261231', '2026-12-31'],
		['17', '261200', '2026-12-31 (day 00: end of month)'],
		['17', '260200', '2026-02-28 (day 00: end of month)'],
		['17', '240200', '2024-02-29 (day 00: end of month)'],
		['17', '991231', '1999-12-31'],
		['17', '761231', '2076-12-31'],
		['17', '771231', '1977-12-31'],
		['17', '261331', '261331 (not a date)'],
		['17', '240229', '2024-02-29'],
		['17', '260229', '260229 (not a date)'],
		['17', '26AB31', '26AB31 (not a date)'],
		['7006', '260230', '260230 (not a date)'],
		['7006', '261200', '261200 (not a date)'],
		['7250', '19800101', '1980-01-01'],
		['7250', '20261200', '20261200 (not a date)'],
		['7250', '20000229', '2000-02-29'],
		['7250', '21000229', '21000229 (not a date)'],
		['7003', '2612311430', '2026-12-31 14:30'],
		['7003', '2612312430', '2026-12-31 2430 (not a time)'],
		['7003', '2612311460', '2026-12-31 1460 (not a time)'],
		['8008', '26123114', '2026-12-31 14h'],
		['8008', '2612311430', '2026-12-31 14:30'],
		['8008', '261231143005', '2026-12-31 14:30:05'],
		['8008', '26123124', '2026-12-31 24 (not a time)'],
		['8008', '261231143', '261231143'],
		['7007', '261231', '2026-12-31'],
		['7007', '261201261231', '2026-12-01 2026-12-31'],
		['3100', '000123', '123'],
		['3103', '000123', '0.123'],
		['3103', '001234', '1.234'],
		['3103', '000050', '0.050'],
		['3105', '000050', '0.00050'],
		['3103', '00A123', '00A123'],
		['3912', '97801234', '978 12.34'],
		['7030', '276ABC', '276 ABC'],
		['10', 'LOT42', 'LOT42'],
		['01', '123', '123'],
		['3944', '1234', '1234']
	])('(%s)%s reads %s', (ai, value, expected) => {
		expect(describeValue(ai, value, T)).toBe(expected);
	});

	it.each<[string, string]>([
		['3912', '978' + '1'.repeat(16)],
		['8110', '106141416543213500110000310123196000']
	])('shows (%s)%s as written', (ai, value) => {
		expect(describeValue(ai, value, T)).toBe(value);
	});

	it('reads two-digit years against the clock', () => {
		const later = new Date(2090, 0, 1);
		expect(describeValue('17', '400101', later)).toBe('2140-01-01');
		expect(describeValue('17', '391231', later)).toBe('2139-12-31');
	});
});

import { describe, it, expect } from 'vitest';
import table from './gs1-ais.json';
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

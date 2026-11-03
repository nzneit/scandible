import { describe, it, expect, vi } from 'vitest';
import { encode } from 'uqr';
import { qrcode } from 'bwip-js/browser';
import { FORMAT_BY_ID, type BwipDescriptor, type FormatId } from '$lib/formats';
import { resolveOptions } from '$lib/codes';
import type { SymbolFacts } from '$lib/types';
import type { CheckResult } from './types';
import { bwippErrorName, bwippErrorText, check, ECC_OPTIONS, render, TOO_LONG } from './bwipjs';

vi.mock('bwip-js/browser', async (importOriginal) => {
	const mod = await importOriginal<typeof import('bwip-js/browser')>();
	return {
		...mod,
		qrcode: vi.fn(mod.qrcode),
		datamatrix: vi.fn(mod.datamatrix),
		pdf417: vi.fn(mod.pdf417),
		azteccode: vi.fn(mod.azteccode)
	};
});

function row(id: FormatId): BwipDescriptor {
	const d = FORMAT_BY_ID.get(id);
	if (d?.engine !== 'bwipjs') throw new Error(`${id} is not a bwip-js row`);
	return d;
}
const opts = (ecc: string | undefined) => (ecc === undefined ? {} : { ecc });
const x = (n: number) => 'x'.repeat(n);
const IDS = ['qr', 'datamatrix', 'pdf417', 'aztec'] as const;
const S = '(01)09501101530003(17)261231(10)LOT42';
const G = '(01)09501101530003';
const E = '(01)09501101530003(3103)000123';
/** [id, sample, cols, rows, summary], measurements §1; GS1-128 at heightMm 18.3 (53 px). */
const GS1_SIZES: [FormatId, string, number, number, string][] = [
	['gs1128', S, 255, 53, '255 modules wide'],
	['databaromni', G, 96, 34, '96 modules wide'],
	['databartruncated', G, 96, 14, '96 modules wide'],
	['databarstacked', G, 50, 13, '50 modules wide'],
	['databarstackedomni', G, 50, 69, '50 modules wide'],
	['databarlimited', G, 74, 11, '74 modules wide'],
	['databarexpanded', E, 200, 35, '200 modules wide'],
	['databarexpandedstacked', E, 102, 71, '102 modules wide'],
	['gs1datamatrix', S, 18, 18, '18×18 modules'],
	['gs1qr', S, 25, 25, '25×25 modules'],
	['gs1dotcode', S, 29, 20, '29×20 modules']
];

/** Measured at bwip-js 4.11.4 (spec _Testing_; measurements file section 2 and Appendices A–D). Never edit
 *  an expected value to match the code. [format, ecc, payload, facts] */
const HW = 'hello world';
const VALID: [FormatId, string | undefined, string, Partial<SymbolFacts>][] = [
	['qr', 'M', HW, { bytes: 11, cols: 21, rows: 21, summary: '21×21 modules', dense: false }],
	['qr', 'H', HW, { cols: 25, rows: 25 }],
	['datamatrix', undefined, HW, { cols: 16, rows: 16, summary: '16×16 modules' }],
	['aztec', '23', HW, { cols: 19, rows: 19 }],
	['pdf417', 'auto', HW, { cols: 103, rows: 8, summary: '2 columns × 8 rows' }],
	['qr', 'L', x(16), { cols: 21 }],
	['qr', 'M', x(16), { cols: 25 }],
	['qr', 'Q', x(16), { cols: 25 }],
	['qr', 'H', x(16), { cols: 29 }],
	['qr', 'M', 'héllo → 日本', { bytes: 17, cols: 25 }],
	['qr', 'M', 'line1\nline2', { cols: 21 }],
	// fixedeclevel honoured: level 8 stays 8
	['pdf417', '8', x(900), { cols: 375, rows: 54, summary: '18 columns × 54 rows', dense: true }],
	['pdf417', '0', x(900), { cols: 273, rows: 38 }],
	['qr', 'L', x(2000), { cols: 149 }],
	// lower-case text compacts in Aztec; not over capacity
	['aztec', '23', x(2000), {}]
];

const TOO_LONG_RESULT: CheckResult = { valid: false, reason: 'too-long' };
const INVALID: [string, FormatId, string | undefined, string, CheckResult][] = [
	['empty (ReferenceError; check called directly)', 'qr', 'M', '', { valid: false }],
	['x × 2000 (qrcodeNoValidSymbol)', 'qr', 'H', x(2000), TOO_LONG_RESULT],
	['x × 5000', 'qr', 'M', x(5000), TOO_LONG_RESULT],
	['x × 8000', 'qr', 'M', x(8000), TOO_LONG_RESULT],
	['x × 3000', 'datamatrix', undefined, x(3000), TOO_LONG_RESULT],
	['x × 3200', 'datamatrix', undefined, x(3200), TOO_LONG_RESULT],
	['x × 1900', 'pdf417', 'auto', x(1900), TOO_LONG_RESULT],
	['x × 3000', 'pdf417', 'auto', x(3000), TOO_LONG_RESULT],
	['x × 3500', 'aztec', '23', x(3500), TOO_LONG_RESULT],
	['x × 5000', 'aztec', '23', x(5000), TOO_LONG_RESULT],
	['ecc X passed directly (qrcodeInvalidEClevel)', 'qr', 'X', 'x', { valid: false }],
	['lone surrogate (URIError)', 'qr', 'M', 'a\uD800b', { valid: false }]
];

describe('check: measured fixtures', () => {
	it.each(VALID)('%s at ecc %s is valid (row %#)', (id, ecc, payload, facts) => {
		expect(check(row(id), payload, opts(ecc))).toMatchObject({ valid: true, facts });
	});
	it.each(INVALID)('%s as %s at ecc %s', (_name, id, ecc, payload, expected) => {
		expect(check(row(id), payload, opts(ecc))).toStrictEqual(expected);
	});
});

const BAD_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 58 58"><path fill=rule="evenodd" d="M0 0h2v2H0z"/></svg>';

describe('render', () => {
	it.each(IDS)('draws %s hello world as an svg, 1024 px on its longer side, with a path', (id) => {
		const d = row(id);
		const el = render(d, 'hello world', resolveOptions(d, { format: id, ecc: '' }));
		expect(el.nodeName).toBe('svg');
		const [w, h] = [el.getAttribute('width'), el.getAttribute('height')].map(Number);
		expect(Math.max(w, h)).toBe(1024);
		expect(el.querySelector('path')).not.toBeNull();
	});

	it('keeps the quiet zone inside the QR viewBox', () => {
		const el = render(row('qr'), 'hello world', { ecc: 'M' });
		expect(el.getAttribute('viewBox')).toBe('0 0 58 58');
		expect([el.getAttribute('width'), el.getAttribute('height')]).toEqual(['1024', '1024']);
	});

	it('throws when the output does not parse as svg (the 4.11.3 fill-rule failure)', () => {
		vi.mocked(qrcode).mockImplementationOnce((() => BAD_SVG) as unknown as typeof qrcode);
		expect(() => render(row('qr'), 'parsererror-probe-payload', { ecc: 'M' })).toThrow(
			'bwip-js produced invalid SVG'
		);
	});
});

describe('bwippErrorName', () => {
	it('returns the stable name without the #NNNNN line number', () => {
		const qr = 'bwipp.qrcodeNoValidSymbol#27542: Maximum length exceeded or invalid content';
		expect(bwippErrorName(qr)).toBe('qrcodeNoValidSymbol');
		const pdf = 'bwipp.pdf417inputTooLong#22902: The input data is too long';
		expect(bwippErrorName(pdf)).toBe('pdf417inputTooLong');
	});
	it('returns undefined for a non-BWIPP message', () => {
		expect(bwippErrorName('bwip-js: bar code text not specified.')).toBeUndefined();
		expect(bwippErrorName('URI malformed')).toBeUndefined();
	});
});

describe('TOO_LONG', () => {
	it('holds exactly the twenty over-capacity names', () => {
		const names = [
			'qrcodeNoValidSymbol qrcodeInputTooLong qrcodeInputTooLarge',
			'datamatrixTooMuchData datamatrixInputTooLong datamatrixNoValidSymbol',
			'pdf417inputTooLong pdf417dataTooLong pdf417insufficientCapacity',
			'azteccodeInputTooLong azteccodeInputTooLarge aztecNoValidSymbol',
			'gs1128inputTooLong gs1datamatrixinputTooLong gs1qrcodeinputTooLong gs1dotcodeinputTooLong',
			'gs1databarexpandedTooLong dotcodeinputTooLong dotcodeTooLong dotcodeSymbolTooLarge'
		].flatMap((group) => group.split(' '));
		expect([...TOO_LONG].sort()).toEqual(names.sort());
	});
});

describe('memoisation', () => {
	it('encodes once for check then render of the same input', () => {
		vi.mocked(qrcode).mockClear();
		check(row('qr'), 'memo-success-payload', { ecc: 'M' });
		render(row('qr'), 'memo-success-payload', { ecc: 'M' });
		expect(qrcode).toHaveBeenCalledTimes(1);
	});
	it('caches a failure: two checks of an over-capacity input encode once', () => {
		vi.mocked(qrcode).mockClear();
		const payload = 'memo-failure-' + 'y'.repeat(5000);
		expect(check(row('qr'), payload, { ecc: 'M' }).valid).toBe(false);
		expect(check(row('qr'), payload, { ecc: 'M' }).valid).toBe(false);
		expect(qrcode).toHaveBeenCalledTimes(1);
	});
});

describe('uqr cross-check', () => {
	const PAYLOADS = ['hello world', 'https://example.com/p/1234567890abcdef', x(100), '1234567890'];
	const CASES = PAYLOADS.flatMap((p) =>
		(['L', 'M', 'Q', 'H'] as const).map((ecc) => [ecc, p] as const)
	);
	it.each(CASES)('at level %s, bwip-js is no larger than uqr for %s', (ecc, payload) => {
		const res = check(row('qr'), payload, { ecc });
		expect(res.valid).toBe(true);
		const cols = res.valid ? res.facts?.cols : undefined;
		expect(cols).toBeGreaterThanOrEqual(21);
		expect(cols).toBeLessThanOrEqual(encode(payload, { ecc, border: 0 }).size);
	});
});

describe('ECC_OPTIONS', () => {
	it('fixes the chosen level for QR and numeric PDF417 and passes it plain for Aztec', () => {
		expect(ECC_OPTIONS.qrcode('H')).toEqual({ eclevel: 'H', fixedeclevel: true });
		expect(ECC_OPTIONS.datamatrix('M')).toEqual({});
		expect(ECC_OPTIONS.pdf417('auto')).toEqual({});
		expect(ECC_OPTIONS.pdf417('8')).toEqual({ eclevel: 8, fixedeclevel: true });
		expect(ECC_OPTIONS.azteccode('50')).toEqual({ eclevel: 50 });
		expect(ECC_OPTIONS.gs1qrcode('H')).toEqual({ eclevel: 'H', fixedeclevel: true });
		expect(ECC_OPTIONS.gs1_128('H')).toEqual({});
	});
	it('reaches the encoder: check passes the mapped options to bwip-js', () => {
		check(row('qr'), 'level reaches the encoder', { ecc: 'H' }); // unique payload, so no cache hit
		expect(vi.mocked(qrcode).mock.lastCall?.[0]).toMatchObject({
			eclevel: 'H',
			fixedeclevel: true
		});
	});
});

describe('file snapshots', () => {
	it.each(GS1_SIZES)('%s sample at the default level', async (id, sample) => {
		const d = row(id);
		const el = render(d, sample, resolveOptions(d, { format: id, ecc: '' }));
		await expect(el.outerHTML).toMatchFileSnapshot(`./__snapshots__/bwipjs.${id}.svg`);
	});

	it.each(IDS)('%s hello world at the default level', async (id) => {
		const d = row(id);
		const el = render(d, 'hello world', resolveOptions(d, { format: id, ecc: '' }));
		await expect(el.outerHTML).toMatchFileSnapshot(`./__snapshots__/bwipjs.${id}.svg`);
	});
});

describe('GS1 carriers: measured geometry', () => {
	it.each(GS1_SIZES)('%s encodes %s at its measured size', (id, sample, cols, rows, summary) => {
		expect(check(row(id), sample, {})).toMatchObject({
			valid: true,
			facts: { cols, rows, summary, dense: false }
		});
	});

	it('rejects a wrong check digit and a missing bracket', () => {
		expect(check(row('gs1128'), '(01)09501101530004', {}).valid).toBe(false);
		expect(check(row('gs1128'), '0109501101530003', {}).valid).toBe(false);
	});

	it('scales GS1 QR Code with its level', () => {
		const cols = (ecc: string) => {
			const res = check(row('gs1qr'), S, { ecc });
			return res.valid ? res.facts?.cols : undefined;
		};
		expect(['L', 'M', 'H'].map(cols)).toEqual([21, 25, 29]);
	});

	it('renders linear carriers at 3 px per module inside a 10-module quiet zone, 2D ones at 1024 px', () => {
		const size = (el: SVGElement) =>
			[el.getAttribute('width'), el.getAttribute('height')].map(Number);
		expect(render(row('gs1128'), S, {}).getAttribute('viewBox')).toBe('0 0 275 73');
		expect(size(render(row('gs1128'), S, {}))).toEqual([825, 219]);
		expect(size(render(row('databaromni'), G, {}))).toEqual([348, 162]);
		expect(render(row('gs1qr'), S, {}).getAttribute('viewBox')).toBe('0 0 66 66');
		expect(Math.max(...size(render(row('gs1qr'), S, {})))).toBe(1024);
	});
});

const LAX = { lax: true };
const BAD = '(01)09501101530004';
const CHECKSUM = 'AI 01: Bad checksum';
const GTIN_ONLY = [
	'databaromni',
	'databartruncated',
	'databarstacked',
	'databarstackedomni',
	'databarlimited'
] as const;
const LINTED = [
	'gs1128',
	'databarexpanded',
	'databarexpandedstacked',
	'gs1datamatrix',
	'gs1qr',
	'gs1dotcode'
] as const;
const MEMBER: Record<(typeof GTIN_ONLY)[number], string> = {
	databaromni: 'Omnidirectional',
	databartruncated: 'Truncated',
	databarstacked: 'Stacked',
	databarstackedomni: 'Stacked Omnidirectional',
	databarlimited: 'Limited'
};

describe('GS1 carriers: lint, lax and messages', () => {
	it.each(LINTED)('%s reports a bad checksum strictly and renders it anyway under lax', (id) => {
		expect(check(row(id), BAD, {})).toStrictEqual({ valid: false, message: CHECKSUM });
		expect(check(row(id), BAD, LAX)).toMatchObject({
			valid: true,
			lint: CHECKSUM,
			gs1: { data: id.startsWith('databarexpanded') ? '0109501101530003' : '0109501101530004' }
		});
	});

	it('reports scan-data bytes, the lax width, and no lint on a valid row', () => {
		expect(check(row('gs1128'), BAD, LAX)).toMatchObject({
			facts: { cols: 134, bytes: 16 },
			gs1: { aim: ']C1', data: '0109501101530004' }
		});
		const ok = check(row('gs1128'), S, {});
		expect(ok).toMatchObject({ facts: { bytes: 31 }, gs1: { aim: ']C1' } });
		expect('lint' in ok).toBe(false);
	});

	it.each(GTIN_ONLY)('%s keeps its own GTIN checks under lax and accepts 13 digits', (id) => {
		const digit = {
			valid: false,
			message: `Incorrect GS1 DataBar ${MEMBER[id]} check digit provided`
		};
		const length = { valid: false, message: `GS1 DataBar ${MEMBER[id]} must be 13 or 14 digits` };
		expect(check(row(id), BAD, {})).toStrictEqual(digit);
		expect(check(row(id), BAD, LAX)).toStrictEqual(digit);
		expect(check(row(id), '0109501101530003', {})).toStrictEqual(length);
		expect(check(row(id), '0109501101530003', LAX)).toStrictEqual(length);
		expect(check(row(id), '(01)', {})).toStrictEqual(length);
		expect(check(row(id), '(01)0950110153000', {})).toMatchObject({
			valid: true,
			gs1: { aim: ']e0', data: '0109501101530003' }
		});
	});

	it.each(LINTED)('%s refuses a missing bracket, strict and lax', (id) => {
		const expected = { valid: false, message: "AIs must start with '('" };
		expect(check(row(id), '0109501101530003', {})).toStrictEqual(expected);
		expect(check(row(id), '0109501101530003', LAX)).toStrictEqual(expected);
	});

	it('surfaces the other lint messages verbatim and renders them under lax', () => {
		const d = row('gs1128');
		expect(check(d, '(01)', {})).toStrictEqual({ valid: false, message: 'AI 01: Too short' });
		expect(check(d, '(01)09501101530003(17)261345', {})).toStrictEqual({
			valid: false,
			message: 'AI 17: Invalid month'
		});
		expect(check(d, '(99999)123', {})).toStrictEqual({
			valid: false,
			message: 'AI 99999: Unrecognised AI'
		});
		expect(check(d, '(99999)123', LAX)).toMatchObject({
			valid: true,
			lint: 'AI 99999: Unrecognised AI',
			gs1: { data: '99999123' }
		});
		expect(check(d, '(10)A(10)B', {})).toStrictEqual({
			valid: false,
			message: 'Repeated AIs (10) must have the same value'
		});
		expect(check(d, '(10)A(10)B', LAX)).toMatchObject({
			valid: true,
			gs1: { data: '10A\u001d10B' }
		});
		expect(check(d, '(10)A(', {})).toMatchObject({ valid: true, gs1: { data: '10A' } });
		expect(check(d, '(01)09501101530003(10)A(B)C', {})).toStrictEqual({
			valid: false,
			message: 'AI B: Unrecognised AI'
		});
	});

	it('reports capacity failures as too-long without a message, and a nameless lax death with the strict message', () => {
		const overflow =
			'(01)09501101530003(10)' +
			'A'.repeat(20) +
			'(21)' +
			'B'.repeat(20) +
			'(240)' +
			'C'.repeat(30);
		expect(check(row('databarexpanded'), overflow, {})).toStrictEqual(TOO_LONG_RESULT);
		expect(check(row('gs1dotcode'), '(90)' + x(1994), LAX)).toStrictEqual(TOO_LONG_RESULT);
		expect(check(row('gs1dotcode'), '(90)' + x(2096), LAX)).toStrictEqual(TOO_LONG_RESULT);
		expect(check(row('gs1qr'), '(90)' + x(3000), { ecc: 'H', lax: true })).toStrictEqual(
			TOO_LONG_RESULT
		);
		expect(check(row('databarexpanded'), '(01)09501101530003(10)Aé', LAX)).toStrictEqual({
			valid: false,
			message: 'AI 10: Invalid CSET 82 character'
		});
	});

	it('keeps strict and lax encodes in separate cache entries', () => {
		expect(check(row('gs1128'), BAD, {}).valid).toBe(false);
		expect(check(row('gs1128'), BAD, LAX).valid).toBe(true);
		expect(check(row('gs1128'), BAD, {}).valid).toBe(false);
	});

	it('renders the lint-off symbol for a lax row and throws for the strict one', () => {
		const el = render(row('gs1128'), BAD, LAX);
		expect([el.getAttribute('width'), el.getAttribute('height')]).toEqual(['462', '219']);
		expect(() => render(row('gs1128'), BAD, {})).toThrow();
	});

	it('leaves the plain 2D formats without messages', () => {
		expect(check(row('qr'), x(5000), { ecc: 'M' })).toStrictEqual(TOO_LONG_RESULT);
		expect(check(row('qr'), 'x', { ecc: 'X' })).toStrictEqual({ valid: false });
	});
});

describe('bwippErrorText', () => {
	it('returns the text after the name and line number, else undefined', () => {
		expect(bwippErrorText('bwipp.GS1badChecksum#3251: AI 01: Bad checksum')).toBe(
			'AI 01: Bad checksum'
		);
		expect(bwippErrorText('boom')).toBeUndefined();
		expect(bwippErrorText('bwip-js: bar code text not specified.')).toBeUndefined();
	});
});

import { describe, it, expect } from 'vitest';
import { buildEntry, parseCodeList, resolveOptions, tokenize } from './codes';
import { FORMAT_BY_ID, type FormatId } from './formats';

describe('parseCodeList tokenization', () => {
	it('numeric formats split on newlines AND commas, trim, drop empties, keep order + duplicates', () => {
		const entries = parseCodeList(' a , b\n\nc ,,\nb ', 'upc');
		expect(entries.map((e) => e.raw)).toEqual(['a', 'b', 'c', 'b']);
	});

	it('numeric formats strip internal whitespace into value', () => {
		const entries = parseCodeList('0360 0029 1452\n12345', 'upc');
		expect(entries).toHaveLength(2);
		expect(entries[0].raw).toBe('0360 0029 1452');
		expect(entries[0].value).toBe('036000291452');
		expect(entries[0].valid).toBe(true);
		expect(entries[0].encoded).toBe('036000291452');
		expect(entries[1].valid).toBe(false);
		expect(entries[1].encoded).toBeUndefined();
	});

	it('text formats treat commas and internal spaces as data', () => {
		const entries = parseCodeList('Hello, World\nsecond line', 'code128');
		expect(entries.map((e) => e.raw)).toEqual(['Hello, World', 'second line']);
		expect(entries[0].value).toBe('Hello, World');
		expect(entries[0].valid).toBe(true);
	});

	it('drops whitespace-only tokens before validation — no blank rows ever', () => {
		expect(parseCodeList('  , 123', 'upc').map((e) => e.raw)).toEqual(['123']);
		expect(parseCodeList('   \n\t\n', 'code128')).toEqual([]);
	});

	it('flips validity by format: HELLO is invalid upc, valid code39', () => {
		expect(parseCodeList('HELLO', 'upc')[0].valid).toBe(false);
		expect(parseCodeList('HELLO', 'code39')[0].valid).toBe(true);
	});
});

const row = (id: FormatId) => FORMAT_BY_ID.get(id)!;

describe('resolveOptions: override → list → default', () => {
	it('returns {} for formats without ecc', () => {
		expect(
			resolveOptions(row('upc'), { format: 'upc', ecc: 'H', lax: false }, { ecc: 'H' })
		).toEqual({});
		expect(
			resolveOptions(
				row('datamatrix'),
				{ format: 'datamatrix', ecc: 'H', lax: false },
				{ ecc: 'H' }
			)
		).toEqual({});
	});

	it('takes the first accepted layer and skips invalid ones', () => {
		const qr = row('qr');
		expect(resolveOptions(qr, { format: 'qr', ecc: '', lax: false })).toEqual({ ecc: 'M' });
		expect(resolveOptions(qr, { format: 'qr', ecc: 'H', lax: false })).toEqual({ ecc: 'H' });
		expect(resolveOptions(qr, { format: 'qr', ecc: 'H', lax: false }, { ecc: 'L' })).toEqual({
			ecc: 'L'
		});
		expect(resolveOptions(qr, { format: 'qr', ecc: 'H', lax: false }, { ecc: 'X' })).toEqual({
			ecc: 'H'
		});
		expect(resolveOptions(qr, { format: 'qr', ecc: 'Z', lax: false }, { ecc: '23' })).toEqual({
			ecc: 'M'
		});
	});

	it('never applies the list level to another format', () => {
		expect(resolveOptions(row('aztec'), { format: 'qr', ecc: 'H', lax: false })).toEqual({
			ecc: '23'
		});
		// '10' is an Aztec value, but the list format is qr, so it is not inherited.
		expect(resolveOptions(row('aztec'), { format: 'qr', ecc: '10', lax: false })).toEqual({
			ecc: '23'
		});
	});
});

describe('buildEntry', () => {
	it('keeps raw, cleans value and stamps format and options', () => {
		expect(buildEntry('0360 00291452', 'upc', { format: 'upc', ecc: '', lax: false })).toEqual({
			raw: '0360 00291452',
			value: '036000291452',
			format: 'upc',
			options: {},
			valid: true,
			encoded: '036000291452'
		});
	});
});

describe('parseCodeList stamps every entry', () => {
	it('with the list format and the resolved options', () => {
		for (const e of parseCodeList('036000291452\nbad', 'upc'))
			expect(e).toMatchObject({ format: 'upc', options: {} });
		for (const e of parseCodeList('a\nb', 'qr', 'H'))
			expect(e).toMatchObject({ format: 'qr', options: { ecc: 'H' } });
		expect(parseCodeList('a', 'qr')[0].options).toEqual({ ecc: 'M' });
	});
});

describe('2D formats through parseCodeList', () => {
	it('x × 2000 under qr is valid at L and too long at H', () => {
		expect(parseCodeList('x'.repeat(2000), 'qr', 'L')[0]).toMatchObject({
			valid: true,
			facts: { cols: 149 }
		});
		expect(parseCodeList('x'.repeat(2000), 'qr', 'H')[0]).toMatchObject({
			valid: false,
			reason: 'too-long'
		});
	});

	it('splits 2D lists on newlines only and keeps commas as data', () => {
		const entries = parseCodeList('a,b\nc, d', 'qr');
		expect(entries.map((e) => e.raw)).toEqual(['a,b', 'c, d']);
		expect(entries.map((e) => e.value)).toEqual(['a,b', 'c, d']);
		expect(entries.every((e) => e.valid)).toBe(true);
	});

	it('strips Windows line endings from 2D tokens', () => {
		const entries = parseCodeList('hello world\r\nline two\r\n', 'qr');
		expect(entries.map((e) => e.raw)).toEqual(['hello world', 'line two']);
		expect(entries.map((e) => e.value)).toEqual(['hello world', 'line two']);
		// 11 bytes, not 12: no trailing \r reached the encoder.
		expect(entries[0]).toMatchObject({ valid: true, facts: { bytes: 11, cols: 21 } });
	});
});

describe('tokenize', () => {
	it('splits exactly as parseCodeList does, for a numeric and a text format', () => {
		const upc = ' 036000291452, 012345678905\n\n4006381333931 ';
		const qr = 'a, b\n\n c ';
		expect(tokenize(upc, 'upc')).toEqual(['036000291452', '012345678905', '4006381333931']);
		expect(tokenize(qr, 'qr')).toEqual(['a, b', 'c']);
		expect(tokenize(upc, 'upc')).toEqual(parseCodeList(upc, 'upc').map((e) => e.raw));
		expect(tokenize(qr, 'qr')).toEqual(parseCodeList(qr, 'qr').map((e) => e.raw));
	});
});

describe('resolveOptions: lax', () => {
	const list = { format: 'gs1128', ecc: '', lax: true } as const;

	it('resolves lax for GS1 formats only: override, then the list format’s flag, then false', () => {
		expect(resolveOptions(row('gs1128'), list)).toEqual({ lax: true });
		expect(resolveOptions(row('gs1128'), list, { lax: false })).toEqual({ lax: false });
		expect(resolveOptions(row('gs1qr'), list)).toEqual({ ecc: 'M', lax: false });
		expect(
			resolveOptions(row('gs1qr'), { format: 'gs1qr', ecc: 'H', lax: true }, { ecc: 'L' })
		).toEqual({ ecc: 'L', lax: true });
		expect(
			resolveOptions(row('upc'), { format: 'upc', ecc: '', lax: true }, { lax: true })
		).toEqual({});
		expect(resolveOptions(row('qr'), { format: 'qr', ecc: '', lax: true })).toEqual({ ecc: 'M' });
	});
});

describe('GS1 formats through parseCodeList and buildEntry', () => {
	const S = '(01)09501101530003(17)261231(10)LOT42';

	it('passes the list lax into every entry', () => {
		for (const e of parseCodeList(`${S}\n(01)09501101530004`, 'gs1128', '', true))
			expect(e.options).toEqual({ lax: true });
		expect(parseCodeList(S, 'gs1128')[0].options).toEqual({ lax: false });
	});

	it('strips whitespace into value, keeps raw, and keeps a comma as data', () => {
		expect(
			buildEntry('(01) 0950 1101 5300 03', 'gs1128', { format: 'gs1128', ecc: '', lax: false })
		).toMatchObject({
			raw: '(01) 0950 1101 5300 03',
			value: '(01)09501101530003',
			valid: true,
			gs1: { aim: ']C1', data: '0109501101530003' }
		});
		const comma = parseCodeList('(01)09501101530003(10)A,B', 'gs1128');
		expect(comma).toHaveLength(1);
		expect(comma[0]).toMatchObject({ valid: true, gs1: { data: '010950110153000310A,B' } });
	});
});

import { describe, it, expect } from 'vitest';
import { decodeShareUrl, encodeRowsShareUrl, encodeShareUrl } from './shareUrl';
import { DEFAULT_SETTINGS, type Settings } from './types';
import type { FormatId } from './formats';
import type { Row } from './rows';

const at = (s: string) => new URL('http://localhost/' + s);

/** Rows in the spec's record form, `format[-level][-lax]_payload`, tokens in either order; the
 *  payload is everything after the first `_`. */
const deck = (...records: string[]): Row[] =>
	records.map((record) => {
		const tag = record.slice(0, record.indexOf('_'));
		const [format, ...tokens] = tag.split('-');
		return {
			payload: record.slice(tag.length + 1),
			format: format as FormatId,
			ecc: tokens.find((t) => t !== 'lax') ?? '',
			lax: tokens.includes('lax')
		};
	});

describe('shareUrl', () => {
	it('round-trips codes and settings', () => {
		const search = encodeShareUrl(['036000291452', '012345678905'], {
			speedPxPerSec: 120,
			loop: true,
			rotate: false,
			rotateMaxDeg: 8,
			skew: false,
			skewMaxDeg: 8,
			seed: 0,
			format: 'upc',
			ecc: '',
			lax: false,
			mode: 'scroll',
			dwellMs: 1000,
			gapMs: 0
		});
		expect(decodeShareUrl(at(search))).toEqual({
			codes: ['036000291452', '012345678905'],
			settings: {
				speedPxPerSec: 120,
				loop: true,
				rotate: false,
				rotateMaxDeg: 8,
				skew: false,
				skewMaxDeg: 8,
				seed: 0,
				format: 'upc'
			}
		});
	});

	it('is lenient per parameter and never throws', () => {
		expect(decodeShareUrl(at(''))).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl(at('?speed=abc&loop=2'))).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl(at('?speed=99999'))).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl(at('?loop=1'))).toEqual({ codes: [], settings: { loop: true } });
	});

	it('accepts speed up to the max (5000) and rejects above it', () => {
		expect(decodeShareUrl(at('?speed=5000'))).toEqual({
			codes: [],
			settings: { speedPxPerSec: 5000 }
		});
		expect(decodeShareUrl(at('?speed=5001'))).toEqual({ codes: [], settings: {} });
	});

	it('round-trips rotation and skew settings', () => {
		const search = encodeShareUrl(['036000291452'], {
			speedPxPerSec: 60,
			loop: false,
			rotate: true,
			rotateMaxDeg: 15,
			skew: true,
			skewMaxDeg: 12,
			seed: 123456,
			format: 'upc',
			ecc: '',
			lax: false,
			mode: 'scroll',
			dwellMs: 1000,
			gapMs: 0
		});
		expect(decodeShareUrl(at(search))).toEqual({
			codes: ['036000291452'],
			settings: {
				speedPxPerSec: 60,
				loop: false,
				rotate: true,
				rotateMaxDeg: 15,
				skew: true,
				skewMaxDeg: 12,
				seed: 123456,
				format: 'upc'
			}
		});
	});

	it('is lenient on rotation, skew, and seed params', () => {
		expect(decodeShareUrl(at('?rot=2'))).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl(at('?rotmax=99'))).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl(at('?skew=2'))).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl(at('?skewmax=0'))).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl(at('?seed=-1'))).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl(at('?rot=1&rotmax=20&skew=1&skewmax=30&seed=0'))).toEqual({
			codes: [],
			settings: { rotate: true, rotateMaxDeg: 20, skew: true, skewMaxDeg: 30, seed: 0 }
		});
	});
});

describe('fmt param', () => {
	it('always emits fmt after seed, including the default', () => {
		const url = encodeShareUrl(['036000291452'], { ...DEFAULT_SETTINGS, seed: 7 });
		expect(url).toContain('&seed=7&fmt=upc');
	});

	it('round-trips a non-default format', () => {
		const url = encodeShareUrl(['HELLO'], { ...DEFAULT_SETTINGS, format: 'code39' });
		expect(decodeShareUrl(at(url)).settings.format).toBe('code39');
	});

	it('ignores unknown fmt values and emits no format key', () => {
		expect(decodeShareUrl(at('?codes=1&fmt=CODE39')).settings.format).toBeUndefined();
		expect(decodeShareUrl(at('?codes=1&fmt=nope')).settings.format).toBeUndefined();
	});

	it('emits no format key when fmt is absent (legacy URLs)', () => {
		expect('format' in decodeShareUrl(at('?codes=036000291452')).settings).toBe(false);
	});
});

describe('fragment', () => {
	it('encodes to a fragment with the params in today’s order', () => {
		expect(encodeShareUrl(['1'], DEFAULT_SETTINGS)).toBe(
			'#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
	});

	it('reads the fragment when it has codes, else the query', () => {
		expect(decodeShareUrl(new URL('http://localhost/?codes=1#top')).codes).toEqual(['1']);
		expect(decodeShareUrl(new URL('http://localhost/?codes=a#codes=b')).codes).toEqual(['b']);
		expect(decodeShareUrl(new URL('http://localhost/?codes=1#')).codes).toEqual(['1']);
	});

	it('round-trips payloads containing # & % + , and spaces', () => {
		const codes = ['a#b&c%d+e,f g', '50% off + tax, #1 & more'];
		expect(
			decodeShareUrl(at(encodeShareUrl(codes, { ...DEFAULT_SETTINGS, format: 'code128' }))).codes
		).toEqual(codes);
	});

	it('encodes a non-ASCII payload as an all-ASCII fragment, so length equals bytes', () => {
		const hash = encodeShareUrl(['héllo → 日本'], { ...DEFAULT_SETTINGS, format: 'qr' });
		expect(hash).toMatch(/^[\x21-\x7e]*$/);
		expect(decodeShareUrl(at(hash)).codes).toEqual(['héllo → 日本']);
	});

	it('does not throw on a hand-mangled fragment', () => {
		expect(decodeShareUrl(new URL('http://localhost/play#codes=50%')).codes).toEqual(['50%']);
	});
});

describe('ecc param', () => {
	const enc = (over: Partial<Settings>) => encodeShareUrl(['1'], { ...DEFAULT_SETTINGS, ...over });
	const dec = (hash: string) => decodeShareUrl(at(hash)).settings;

	it('follows fmt only for an accepted, non-default level', () => {
		expect(enc({ format: 'qr', ecc: 'H' })).toMatch(/&fmt=qr&ecc=H$/);
		expect(enc({ format: 'qr', ecc: 'M' })).not.toContain('ecc=');
		expect(enc({ format: 'aztec', ecc: 'H' })).not.toContain('ecc=');
		expect(enc({ format: 'upc', ecc: 'H' })).not.toContain('ecc=');
	});

	it('decodes ecc after resolving fmt, in either param order', () => {
		expect(dec('#codes=1&ecc=H&fmt=qr')).toEqual({ format: 'qr', ecc: 'H' });
		expect(dec(enc({ format: 'qr', ecc: 'H' })).ecc).toBe('H');
	});

	it('emits no ecc key for a default, foreign or unknown level', () => {
		expect('ecc' in dec('#codes=1&ecc=M&fmt=qr')).toBe(false);
		expect('ecc' in dec('#codes=1&ecc=auto&fmt=pdf417')).toBe(false);
		expect('ecc' in dec('#codes=1&ecc=H&fmt=upc')).toBe(false);
		expect('ecc' in dec('#codes=1&ecc=Z&fmt=qr')).toBe(false);
	});

	it('drops ecc when fmt is absent or unknown, without throwing', () => {
		expect(dec('#codes=1&ecc=H')).toEqual({});
		expect(dec('#codes=1&fmt=nope&ecc=H')).toEqual({});
	});
});

describe('step params', () => {
	const enc = (over: Partial<Settings>) => encodeShareUrl(['1'], { ...DEFAULT_SETTINGS, ...over });
	const dec = (hash: string) => decodeShareUrl(at(hash)).settings;
	const GROUP = '#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0';

	it('encodes step links exactly, each step param on its own, and scroll links unchanged', () => {
		expect(enc({ mode: 'step' })).toBe(
			'#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step'
		);
		expect(enc({ format: 'qr', ecc: 'H', mode: 'step', dwellMs: 500, gapMs: 250 })).toBe(
			'#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=qr&ecc=H&mode=step&dwell=500&gap=250'
		);
		expect(enc({ mode: 'step', dwellMs: 500 })).toBe(`${GROUP}&fmt=upc&mode=step&dwell=500`);
		expect(enc({ mode: 'step', gapMs: 250 })).toBe(`${GROUP}&fmt=upc&mode=step&gap=250`);
		expect(enc({ dwellMs: 500, gapMs: 250 })).toBe(
			'#codes=1&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
	});

	it('round-trips step mode with dwell 500 and gap 250', () => {
		const settings = dec(enc({ mode: 'step', dwellMs: 500, gapMs: 250 }));
		expect(settings).toMatchObject({ mode: 'step', dwellMs: 500, gapMs: 250 });
	});

	it('decodes each step param on its own: exact mode, integer 10 ms grid, inclusive range', () => {
		expect(dec('#codes=1&mode=step')).toEqual({ mode: 'step' });
		expect(dec('#codes=1&dwell=500')).toEqual({ dwellMs: 500 }); // no mode key
		for (const v of ['Step', 'scroll', '1']) expect(dec(`#codes=1&mode=${v}`), v).toEqual({});
		for (const v of ['49', '5001', '500.5', '55', 'abc', ''])
			expect(dec(`#codes=1&dwell=${v}`), v).toEqual({});
		for (const v of ['-10', '2001', '1.5', '15']) expect(dec(`#codes=1&gap=${v}`), v).toEqual({});
		expect(dec('#codes=1&dwell=50')).toEqual({ dwellMs: 50 });
		expect(dec('#codes=1&dwell=5000')).toEqual({ dwellMs: 5000 });
		expect(dec('#codes=1&gap=0')).toEqual({ gapMs: 0 });
		expect(dec('#codes=1&gap=2000')).toEqual({ gapMs: 2000 });
		expect(dec('#codes=1&gap=')).toEqual({ gapMs: 0 }); // as seed= decodes to 0
	});
});

describe('lax param', () => {
	const enc = (over: Partial<Settings>) => encodeShareUrl(['1'], { ...DEFAULT_SETTINGS, ...over });
	const dec = (hash: string) => decodeShareUrl(at(hash)).settings;

	it('follows ecc, before mode, for a lax GS1 list only', () => {
		expect(enc({ format: 'gs1128', lax: true })).toMatch(/&fmt=gs1128&lax=1$/);
		expect(enc({ format: 'gs1qr', ecc: 'H', lax: true })).toMatch(/&fmt=gs1qr&ecc=H&lax=1$/);
		expect(enc({ format: 'gs1128', lax: true, mode: 'step', dwellMs: 500 })).toMatch(
			/&fmt=gs1128&lax=1&mode=step&dwell=500$/
		);
		expect(enc({ format: 'upc', lax: true })).not.toContain('lax=');
		expect(enc({ format: 'gs1128', lax: false })).not.toContain('lax=');
	});

	it('decodes lax=1 for a GS1 fmt only, in either param order', () => {
		expect(dec('#codes=1&fmt=gs1128&lax=1').lax).toBe(true);
		expect(dec('#codes=1&lax=1&fmt=gs1128').lax).toBe(true);
		expect('lax' in dec('#codes=1&fmt=upc&lax=1')).toBe(false);
		expect('lax' in dec('#codes=1&fmt=gs1128&lax=0')).toBe(false);
		expect('lax' in dec('#codes=1&fmt=gs1128&lax=yes')).toBe(false);
		expect('lax' in dec('#codes=1&lax=1')).toBe(false);
	});
});

describe('rows links', () => {
	const TAIL = '&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc';
	const enc = (rows: Row[], over: Partial<Settings> = {}) =>
		encodeRowsShareUrl(rows, { ...DEFAULT_SETTINGS, ...over });
	const recs = (hash: string) => decodeShareUrl(at(hash)).records;
	const from = (url: string) => decodeShareUrl(new URL(url));

	it('writes one record per non-blank row, numbered densely, then the tail without ecc', () => {
		const pair = deck('upc_012345678905', 'qr-H_WIFI:S:home;\nP:secret');
		expect(enc(pair)).toBe(
			'#r1=upc_012345678905&r2=qr-H_WIFI%3AS%3Ahome%3B%0AP%3Asecret&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc'
		);
		expect(enc(pair, { format: 'qr', ecc: 'H' })).toMatch(/&fmt=qr$/);
		expect(enc(pair, { format: 'qr', ecc: 'H' })).not.toContain('ecc=');
		expect(enc(deck('qr_a', 'qr_', 'qr_b'))).toBe(`#r1=qr_a&r2=qr_b${TAIL}`);
		expect(enc(deck('qr_ a\r\nb '))).toBe(`#r1=qr_a%0Ab${TAIL}`);
		// No non-blank row: an empty codes=, as an empty list writes it.
		expect(enc(deck('qr_'))).toBe(`#codes=${TAIL}`);
		expect(encodeShareUrl([], DEFAULT_SETTINGS)).toBe(`#codes=${TAIL}`);
		expect(enc(deck('qr_a'), { mode: 'step', dwellMs: 500, gapMs: 250 })).toBe(
			'#r1=qr_a&speed=60&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=0&fmt=upc&mode=step&dwell=500&gap=250'
		);
	});

	it.each<[string, Row[] | undefined]>([
		['#r1=upc_036000291452&r3=qr_hello', deck('upc_036000291452', 'qr_hello')], // gap compacted
		['#r10=qr_ten&r2=qr_two', deck('qr_two', 'qr_ten')], // numeric key order
		['#r3=qr_c&r12=qr_l&r2=qr_b', deck('qr_b', 'qr_c', 'qr_l')], // digit count first
		['#r1=qr_first&r1=qr_second', deck('qr_first')], // a repeated key keeps its first value
		['#r1=qrhello&r2=qr_ok', deck('qr_ok')], // no `_`: dropped on its own
		['#r1=foo_bar', []], // unknown format
		['#r1=qr_+++', []], // blank payload
		['#r1=qr_%0A', []],
		['#r1=qr-auto_x', deck('qr_x')], // a foreign level
		['#r1=qr-M_x', deck('qr_x')], // the default level
		['#r1=qr-_x', deck('qr_x')], // an empty level
		['#r1=datamatrix-H_x', deck('datamatrix_x')], // a format with no levels
		['#r1=qr-H_x', deck('qr-H_x')],
		['#r1=qr_a%0D%0Ab', deck('qr_a\nb')], // a hand-edited CRLF arrives as LF
		['#r1=&r1=qr_x', undefined], // a key counts by its first value
		['#r0=qr_a&rx=qr_b&r01=qr_c&r1=qr_d', deck('qr_d')],
		['#r0=qr_a', undefined],
		['#codes=036000291452&speed=60', undefined],
		['#R1=qr_x', undefined], // an uppercase key is not a record key
		['#r1=QR_x', []], // an uppercase format tag is dropped
		['#r1=qr_a-b_c', deck('qr_a-b_c')], // `-` and `_` in the payload survive
		['#r1=gs1128-lax_x', deck('gs1128-lax_x')],
		['#r1=gs1qr-lax-H_x', deck('gs1qr-H-lax_x')], // tokens in either order
		['#r1=gs1qr-foo-H_x', deck('gs1qr-H_x')], // an unknown token beside a level
		['#r1=gs1qr--H_x', deck('gs1qr-H_x')], // an empty token
		['#r1=upc-lax_036000291452', deck('upc_036000291452')], // lax on a non-GS1 format
		['#r1=gs1128-LAX_x', deck('gs1128_x')], // tokens are case-sensitive
		['#r1=gs1128-foo_x', deck('gs1128_x')], // an unknown token alone
		['#r1=foo_bar&r1=qr_x', []] // a repeated key keeps its first value, even if invalid
	])('decodes the records of %s', (hash, records) => {
		expect(recs(hash)).toEqual(records);
	});

	it('writes the lax token after the level, never the lax param, and reads the spec’s two-record link', () => {
		const BAD = '(01)09501101530004';
		expect(enc(deck(`gs1128-lax_${BAD}`))).toBe(`#r1=gs1128-lax_%2801%2909501101530004${TAIL}`);
		expect(enc(deck(`gs1qr-H-lax_${BAD}`))).toBe(`#r1=gs1qr-H-lax_%2801%2909501101530004${TAIL}`);
		expect(enc(deck(`gs1128-lax_${BAD}`), { format: 'gs1128', lax: true })).toMatch(/&fmt=gs1128$/);
		expect(recs('#r1=gs1128-lax_%2801%2909501101530004&r2=gs1qr-H_%2801%2909501101530003')).toEqual(
			[
				{ payload: BAD, format: 'gs1128', ecc: '', lax: true },
				{ payload: '(01)09501101530003', format: 'gs1qr', ecc: 'H', lax: false }
			]
		);
		expect(decodeShareUrl(at('#r1=upc_1&fmt=gs1128&lax=1')).settings.lax).toBe(true); // read whatever the mode
	});

	it('leaves a list ecc at the list level, and round-trips reserved characters', () => {
		const listEcc = decodeShareUrl(at('#r1=qr_x&fmt=qr&ecc=H'));
		expect(listEcc.settings.ecc).toBe('H');
		expect(listEcc.records).toEqual([{ payload: 'x', format: 'qr', ecc: '', lax: false }]);
		const roundTrip = deck('qr_a b\n#1 & 50% x_y+z');
		expect(recs(enc(roundTrip))).toEqual(roundTrip);
	});

	it('picks the source by the extended rule, and ignores codes beside records', () => {
		const pick = (url: string) => [from(url).codes, from(url).records];
		expect(pick('http://localhost/#codes=036000291452&r1=qr_x')).toEqual([[], deck('qr_x')]);
		expect(pick('http://localhost/?codes=1#r1=qr_x')).toEqual([[], deck('qr_x')]);
		expect(pick('http://localhost/?codes=036000291452#r1')).toEqual([['036000291452'], undefined]);
		expect(pick('http://localhost/#codes=x&r1=')).toEqual([['x'], undefined]);
		expect(from('http://localhost/?r1=qr_x').records).toEqual(deck('qr_x'));
		expect(from('http://localhost/?r1=qr_x#top').records).toEqual(deck('qr_x'));
	});
});

describe('raw GS1 scan data in share links', () => {
	it('keeps a real GS in list mode and in a row record', () => {
		const code = `]C110LOT42${'\u001d'}0109501101530003${'\u001d'}`;
		expect(
			decodeShareUrl(at(encodeShareUrl([code], { ...DEFAULT_SETTINGS, format: 'gs1128' }))).codes
		).toEqual([code]);
		const row = { payload: code, format: 'gs1128' as const, ecc: '', lax: false };
		expect(decodeShareUrl(at(encodeRowsShareUrl([row], DEFAULT_SETTINGS))).records).toEqual([row]);
	});
});

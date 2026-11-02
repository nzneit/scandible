import { describe, it, expect } from 'vitest';
import { encodeShareUrl, decodeShareUrl } from './shareUrl';
import { DEFAULT_SETTINGS, type Settings } from './types';

const at = (s: string) => new URL('http://localhost/' + s);

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
			ecc: ''
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
			ecc: ''
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

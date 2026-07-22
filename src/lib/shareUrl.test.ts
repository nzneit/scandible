import { describe, it, expect } from 'vitest';
import { encodeShareUrl, decodeShareUrl } from './shareUrl';
import { DEFAULT_SETTINGS } from './types';

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
			format: 'upc'
		});
		expect(decodeShareUrl(search)).toEqual({
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
		expect(decodeShareUrl('')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?speed=abc&loop=2')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?speed=99999')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?loop=1')).toEqual({ codes: [], settings: { loop: true } });
	});

	it('accepts speed up to the max (5000) and rejects above it', () => {
		expect(decodeShareUrl('?speed=5000')).toEqual({ codes: [], settings: { speedPxPerSec: 5000 } });
		expect(decodeShareUrl('?speed=5001')).toEqual({ codes: [], settings: {} });
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
			format: 'upc'
		});
		expect(decodeShareUrl(search)).toEqual({
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
		expect(decodeShareUrl('?rot=2')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?rotmax=99')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?skew=2')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?skewmax=0')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?seed=-1')).toEqual({ codes: [], settings: {} });
		expect(decodeShareUrl('?rot=1&rotmax=20&skew=1&skewmax=30&seed=0')).toEqual({
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
		expect(decodeShareUrl(url).settings.format).toBe('code39');
	});

	it('ignores unknown fmt values and emits no format key', () => {
		expect(decodeShareUrl('?codes=1&fmt=CODE39').settings.format).toBeUndefined();
		expect(decodeShareUrl('?codes=1&fmt=nope').settings.format).toBeUndefined();
	});

	it('emits no format key when fmt is absent (legacy URLs)', () => {
		expect('format' in decodeShareUrl('?codes=036000291452').settings).toBe(false);
	});
});

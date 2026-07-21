import { describe, it, expect } from 'vitest';
import { buildTransforms } from './transforms';

const BOTH = { rotate: true, rotateMaxDeg: 10, skew: true, skewMaxDeg: 10 };

describe('buildTransforms', () => {
	it('returns one transform per barcode', () => {
		expect(buildTransforms(5, BOTH, 1)).toHaveLength(5);
		expect(buildTransforms(0, BOTH, 1)).toEqual([]);
	});

	it('is deterministic for a given seed and seed-sensitive', () => {
		expect(buildTransforms(4, BOTH, 42)).toEqual(buildTransforms(4, BOTH, 42));
		expect(buildTransforms(4, BOTH, 42)).not.toEqual(buildTransforms(4, BOTH, 43));
	});

	it('emits rotate()+skewX() within ±maxDeg when both axes are on', () => {
		const out = buildTransforms(
			50,
			{ rotate: true, rotateMaxDeg: 10, skew: true, skewMaxDeg: 6 },
			7
		);
		for (const t of out) {
			const m = t.match(/^rotate\((-?\d+(?:\.\d+)?)deg\) skewX\((-?\d+(?:\.\d+)?)deg\)$/);
			expect(m).not.toBeNull();
			expect(Math.abs(Number(m![1]))).toBeLessThanOrEqual(10);
			expect(Math.abs(Number(m![2]))).toBeLessThanOrEqual(6);
		}
	});

	it('emits only rotate() when skew is off', () => {
		const out = buildTransforms(
			10,
			{ rotate: true, rotateMaxDeg: 8, skew: false, skewMaxDeg: 8 },
			3
		);
		for (const t of out) expect(t).toMatch(/^rotate\(-?\d+(?:\.\d+)?deg\)$/);
	});

	it('emits only skewX() when rotation is off', () => {
		const out = buildTransforms(
			10,
			{ rotate: false, rotateMaxDeg: 8, skew: true, skewMaxDeg: 8 },
			3
		);
		for (const t of out) expect(t).toMatch(/^skewX\(-?\d+(?:\.\d+)?deg\)$/);
	});

	it('emits empty strings when both axes are off', () => {
		expect(
			buildTransforms(3, { rotate: false, rotateMaxDeg: 8, skew: false, skewMaxDeg: 8 }, 3)
		).toEqual(['', '', '']);
	});

	it('keeps rotation values identical whether or not skew is enabled (positional draws)', () => {
		const seed = 99;
		const withSkew = buildTransforms(
			6,
			{ rotate: true, rotateMaxDeg: 10, skew: true, skewMaxDeg: 10 },
			seed
		);
		const noSkew = buildTransforms(
			6,
			{ rotate: true, rotateMaxDeg: 10, skew: false, skewMaxDeg: 10 },
			seed
		);
		// The rotate(...) part of the "both on" output must equal the rotation-only output.
		const rotOnly = withSkew.map((t) => t.split(' ')[0]);
		expect(rotOnly).toEqual(noSkew);
	});
});

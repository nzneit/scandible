import { describe, it, expect } from 'vitest';
import { buildSkewTransforms } from './skew';

describe('buildSkewTransforms', () => {
  it('returns one transform per barcode', () => {
    expect(buildSkewTransforms(5, 10, 1)).toHaveLength(5);
    expect(buildSkewTransforms(0, 10, 1)).toEqual([]);
  });

  it('is deterministic for a given seed and seed-sensitive', () => {
    expect(buildSkewTransforms(4, 10, 42)).toEqual(buildSkewTransforms(4, 10, 42));
    expect(buildSkewTransforms(4, 10, 42)).not.toEqual(buildSkewTransforms(4, 10, 43));
  });

  it('emits rotate()+skewX() within ±maxDeg', () => {
    const out = buildSkewTransforms(50, 10, 7);
    for (const t of out) {
      const m = t.match(/^rotate\((-?\d+(?:\.\d+)?)deg\) skewX\((-?\d+(?:\.\d+)?)deg\)$/);
      expect(m).not.toBeNull();
      expect(Math.abs(Number(m![1]))).toBeLessThanOrEqual(10);
      expect(Math.abs(Number(m![2]))).toBeLessThanOrEqual(10);
    }
  });
});

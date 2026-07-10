import { describe, it, expect } from 'vitest';
import { encodeShareUrl, decodeShareUrl } from './shareUrl';

describe('shareUrl', () => {
  it('round-trips codes and settings', () => {
    const search = encodeShareUrl(['036000291452', '012345678905'], {
      speedPxPerSec: 120, loop: true, skew: false, skewMaxDeg: 8, skewSeed: 0,
    });
    expect(decodeShareUrl(search)).toEqual({
      codes: ['036000291452', '012345678905'],
      settings: { speedPxPerSec: 120, loop: true, skew: false, skewMaxDeg: 8, skewSeed: 0 },
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

  it('round-trips skew settings', () => {
    const search = encodeShareUrl(['036000291452'], {
      speedPxPerSec: 60, loop: false, skew: true, skewMaxDeg: 12, skewSeed: 123456,
    });
    expect(decodeShareUrl(search)).toEqual({
      codes: ['036000291452'],
      settings: { speedPxPerSec: 60, loop: false, skew: true, skewMaxDeg: 12, skewSeed: 123456 },
    });
  });

  it('is lenient on skew params', () => {
    expect(decodeShareUrl('?skew=2')).toEqual({ codes: [], settings: {} });
    expect(decodeShareUrl('?skewmax=99')).toEqual({ codes: [], settings: {} });
    expect(decodeShareUrl('?skewseed=-1')).toEqual({ codes: [], settings: {} });
    expect(decodeShareUrl('?skew=1&skewmax=30&skewseed=0')).toEqual({
      codes: [], settings: { skew: true, skewMaxDeg: 30, skewSeed: 0 },
    });
  });
});

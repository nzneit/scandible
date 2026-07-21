import { describe, it, expect } from 'vitest';
import { buildQrSvg } from './qr';

describe('buildQrSvg', () => {
  it('returns an SVG for a short string and is not dense', () => {
    const r = buildQrSvg('https://nzneit.github.io/scandible/?codes=036000291452');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dense).toBe(false);
      expect(r.svg).toContain('<svg');
      expect(r.svg).toMatch(/<(path|rect)/);
    }
  });

  it('flags a long-but-valid string as dense', () => {
    // 1000 chars pushes the selected version past QR_DENSE_VERSION (20).
    const r = buildQrSvg('A'.repeat(1000));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dense).toBe(true);
  });

  it('reports tooLong when the text exceeds QR capacity', () => {
    // 4000 chars is beyond the max QR capacity at ecc M (~2331 bytes).
    const r = buildQrSvg('A'.repeat(4000));
    expect(r).toEqual({ ok: false, tooLong: true });
  });

  it('is deterministic for the same text', () => {
    const t = 'https://example.com/scandible/?codes=036000291452&speed=60';
    expect(buildQrSvg(t)).toEqual(buildQrSvg(t));
  });
});

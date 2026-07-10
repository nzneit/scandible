import { describe, it, expect } from 'vitest';
import { isRenderableUpc, renderBarcodeSvg } from './barcode';

describe('isRenderableUpc', () => {
  it('accepts a valid 12-digit UPC-A', () => {
    expect(isRenderableUpc('036000291452')).toBe(true);
  });
  it('rejects too-short and non-numeric input', () => {
    expect(isRenderableUpc('12345')).toBe(false);
    expect(isRenderableUpc('notacode')).toBe(false);
  });
});

describe('renderBarcodeSvg', () => {
  it('returns an SVG element containing bar rects for a valid entry', () => {
    const svg = renderBarcodeSvg({ raw: '036000291452', value: '036000291452', valid: true });
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
  });
});

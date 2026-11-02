import { describe, it, expect } from 'vitest';
import { buildQrSvg, qrStatus, QR_CAPACITY_BYTES } from './qr';

// uqr 0.1.3 values: ISO/IEC 18004 version-40 byte capacities, plus the measurements file Appendix D.

describe('qrStatus', () => {
	it('fits a short link', () => {
		expect(qrStatus('https://nzneit.github.io/scandible/#codes=036000291452', 'M')).toEqual({
			kind: 'fits'
		});
	});
	it('flags a version above QR_DENSE_VERSION (20) as dense', () => {
		expect(qrStatus('A'.repeat(1000), 'M')).toEqual({ kind: 'dense' });
	});
	it('uses the ISO/IEC 18004 version-40 byte capacities', () => {
		expect(QR_CAPACITY_BYTES).toEqual({ L: 2953, M: 2331, Q: 1663, H: 1273 });
	});
	it.each(['L', 'M', 'Q', 'H'] as const)(
		'holds exactly the capacity at %s and reports one more as too long',
		(ecc) => {
			const cap = QR_CAPACITY_BYTES[ecc];
			expect(qrStatus('x'.repeat(cap), ecc).kind).not.toBe('too-long');
			expect(qrStatus('x'.repeat(cap + 1), ecc)).toEqual({
				kind: 'too-long',
				ecc,
				length: cap + 1,
				capacity: cap
			});
		}
	);
});

describe('buildQrSvg', () => {
	it('returns an SVG for a short link', () => {
		const svg = buildQrSvg('https://nzneit.github.io/scandible/#codes=036000291452', 'M');
		expect(svg).toContain('<svg');
		expect(svg).toMatch(/<(path|rect)/);
	});
	it('renders at the level it is given', () => {
		// x × 16: 29 modules at H, 21 at L. uqr's border: 2 adds 4 (33 and 25); its default pixelSize is 10.
		expect(buildQrSvg('x'.repeat(16), 'H')).toContain('viewBox="0 0 330 330"');
		expect(buildQrSvg('x'.repeat(16), 'L')).toContain('viewBox="0 0 250 250"');
	});
	it('returns null over capacity', () => {
		expect(buildQrSvg('A'.repeat(4000), 'M')).toBeNull();
	});
	it('is deterministic for the same text', () => {
		const t = 'https://example.com/scandible/#codes=036000291452&speed=60';
		expect(buildQrSvg(t, 'M')).toEqual(buildQrSvg(t, 'M'));
	});
});

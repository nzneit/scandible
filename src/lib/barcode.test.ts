import { describe, it, expect } from 'vitest';
import { renderBarcodeSvg } from './barcode';

describe('renderBarcodeSvg', () => {
	it('returns an SVG element containing bar rects for a valid UPC entry', () => {
		const svg = renderBarcodeSvg(
			{ raw: '036000291452', value: '036000291452', valid: true },
			'upc'
		);
		expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
	});

	it('renders a non-UPC format', () => {
		const svg = renderBarcodeSvg({ raw: 'Hello!', value: 'Hello!', valid: true }, 'code128');
		expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
	});
});

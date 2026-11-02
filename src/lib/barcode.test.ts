import { describe, it, expect } from 'vitest';
import { renderBarcodeSvg } from './barcode';
import { parseCodeList } from './codes';

describe('renderBarcodeSvg', () => {
	it('returns an SVG element containing bar rects for a valid UPC entry', () => {
		const svg = renderBarcodeSvg({
			raw: '036000291452',
			value: '036000291452',
			format: 'upc',
			options: {},
			valid: true
		});
		expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
	});

	it('renders a non-UPC format', () => {
		const svg = renderBarcodeSvg({
			raw: 'Hello!',
			value: 'Hello!',
			format: 'code128',
			options: {},
			valid: true
		});
		expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
	});

	it('dispatches a qr entry to bwip-js', () => {
		const svg = renderBarcodeSvg(parseCodeList('hello world', 'qr')[0]); // valid, options { ecc: 'M' }
		expect(svg.nodeName).toBe('svg');
		expect(svg.getAttribute('viewBox')).toBe('0 0 58 58');
		expect(svg.querySelector('path')).not.toBeNull();
	});

	it('passes the entry’s options to the engine', () => {
		// Level M is also BWIPP's default, so only a non-default level proves options reach the encoder.
		const svg = renderBarcodeSvg(parseCodeList('hello world', 'qr', 'H')[0]); // 25 modules at H
		expect(svg.getAttribute('viewBox')).toBe('0 0 66 66');
	});
});

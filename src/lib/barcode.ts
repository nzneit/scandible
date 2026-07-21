import JsBarcode from 'jsbarcode';
import type { UpcEntry } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Does JsBarcode accept this value as UPC? Renders into a detached SVG with
 *  displayValue:false (a bare JsBarcode call throws on invalid input). Returns
 *  false on throw. displayValue:false avoids the text-measurement path. */
export function isRenderableUpc(value: string): boolean {
	const svg = document.createElementNS(SVG_NS, 'svg');
	try {
		JsBarcode(svg, value, { format: 'upc', displayValue: false });
		return true;
	} catch {
		return false;
	}
}

/** Render one VALID entry into a fresh SVG element (createElementNS, not
 *  createElement, to get the correct namespace). Draws the barcode with the
 *  human-readable number. Only ever called for entries where entry.valid === true. */
export function renderBarcodeSvg(entry: UpcEntry): SVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	JsBarcode(svg, entry.value, {
		format: 'upc',
		displayValue: true,
		lineColor: '#000',
		background: '#fff',
		width: 3,
		height: 160,
		margin: 16
	});
	return svg;
}

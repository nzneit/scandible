import JsBarcode from 'jsbarcode';
import type { CodeEntry } from './types';
import { FORMAT_BY_ID, type FormatId } from './formats';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Render one VALID entry into a fresh SVG element (createElementNS, not
 *  createElement, to get the correct namespace). Draws the barcode with the
 *  human-readable text. Only ever called for entries where entry.valid === true. */
export function renderBarcodeSvg(entry: CodeEntry, format: FormatId): SVGElement {
	const descriptor = FORMAT_BY_ID.get(format);
	const svg = document.createElementNS(SVG_NS, 'svg');
	JsBarcode(svg, entry.value, {
		format: descriptor?.jsbarcodeFormat ?? 'UPC',
		displayValue: true,
		lineColor: '#000',
		background: '#fff',
		width: 3,
		height: 160,
		margin: 16,
		...descriptor?.renderOptions?.()
	});
	return svg;
}

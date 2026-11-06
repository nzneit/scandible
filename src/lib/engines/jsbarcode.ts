import JsBarcode from 'jsbarcode';
import barcodes from 'jsbarcode/bin/barcodes';
import type { JsBarcodeDescriptor } from '#lib/formats.ts';
import type { CheckResult, Engine } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Validate a cleaned value against a format using JsBarcode's own encoder classes —
 *  the same code the public render API runs. `encoded` is the value the barcode will
 *  actually carry after encoder normalization (check digits, checksums, uppercasing,
 *  codabar guards). Never throws. */
export function check(d: JsBarcodeDescriptor, value: string): CheckResult {
	try {
		const Encoder = barcodes[d.jsbarcodeFormat];
		const encoder = new Encoder(value, { displayValue: false });
		if (!encoder.valid()) return { valid: false };
		const data = typeof encoder.data === 'string' ? encoder.data : value;
		// CODE128-auto injects mode-switch sentinels (chars outside printable ASCII) into
		// `data`; they are symbology internals, not scanned content — fall back to the input.
		return { valid: true, encoded: /^[\x20-\x7e]*$/.test(data) ? data : value };
	} catch {
		return { valid: false };
	}
}

/** Draw a valid value into a fresh SVG element (createElementNS, not createElement, to get
 *  the correct namespace), with the human-readable text. */
export function render(d: JsBarcodeDescriptor, value: string): SVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	JsBarcode(svg, value, {
		format: d.jsbarcodeFormat,
		displayValue: true,
		lineColor: '#000',
		background: '#fff',
		width: 3,
		height: 160,
		margin: 16,
		...d.renderOptions?.()
	});
	return svg;
}

export const engine: Engine<JsBarcodeDescriptor> = { check, render };

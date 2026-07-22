import barcodes from 'jsbarcode/bin/barcodes';
import { FORMAT_BY_ID, type FormatId } from './formats';
import type { CodeEntry } from './types';

/** Validate a cleaned value against a format using JsBarcode's own encoder classes —
 *  the same code the public render API runs. `encoded` is the value the barcode will
 *  actually carry after encoder normalization (check digits, checksums, uppercasing,
 *  codabar guards). Never throws. */
export function checkCode(value: string, format: FormatId): { valid: boolean; encoded?: string } {
	const descriptor = FORMAT_BY_ID.get(format);
	if (!descriptor) return { valid: false };
	// Explicit guard: MSI checksum encoders would checksum '' into '0'/'00' and accept it.
	if (value === '') return { valid: false };
	try {
		const Encoder = barcodes[descriptor.jsbarcodeFormat];
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

/** Tokenize + clean + validate a raw text blob for one format. Numeric formats split
 *  on newlines AND commas and strip internal whitespace (the pre-existing UPC
 *  behavior); text formats split on newlines only — internal spaces and commas are
 *  data. Drop-empties runs on the trimmed token BEFORE cleanup/validation, so no
 *  CodeEntry ever has an empty value. */
export function parseCodeList(raw: string, format: FormatId): CodeEntry[] {
	const descriptor = FORMAT_BY_ID.get(format);
	const numeric = descriptor?.numeric ?? true;
	return raw
		.split(numeric ? /[\n,]/ : /\n/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0)
		.map((token) => {
			const defaultClean = numeric ? token.replace(/\s+/g, '') : token;
			const value = descriptor?.normalize ? descriptor.normalize(token) : defaultClean;
			const res = checkCode(value, format);
			return res.valid
				? { raw: token, value, valid: true, encoded: res.encoded }
				: { raw: token, value, valid: false };
		});
}

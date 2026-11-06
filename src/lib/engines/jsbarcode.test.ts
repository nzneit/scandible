import { describe, expect, it } from 'vitest';
import barcodes from 'jsbarcode/bin/barcodes';
import { encoderTable } from './jsbarcode';

describe('encoderTable', () => {
	it('yields the encoder table from either CommonJS interop shape', () => {
		// Vitest, Vite 7 and the dev server give the default import exports.default: the table.
		expect(encoderTable(barcodes)).toBe(barcodes);
		expect(encoderTable(barcodes).UPC).toBeTypeOf('function');
		// Rolldown (the Vite 8 build) gives it the whole Babel module.exports.
		const wholeModule = Object.defineProperty({ default: barcodes }, '__esModule', { value: true });
		expect(encoderTable(wholeModule)).toBe(barcodes);
	});
});

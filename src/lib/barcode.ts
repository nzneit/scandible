import { engine as jsbarcodeEngine } from './engines/jsbarcode';
import { FORMAT_BY_ID, type FormatId } from './formats';
import type { CodeEntry } from './types';

/** Render one VALID entry into a fresh SVG element. Only ever called for entries where
 *  entry.valid === true. */
export function renderBarcodeSvg(entry: CodeEntry, format: FormatId): SVGElement {
	const d = FORMAT_BY_ID.get(format);
	// temporary: Task 4 dispatches on engine. Unlike Task 1's `=== 'bwipjs'` guard this also
	// throws for an unknown format, replacing the old UPC fallback; Task 4's one-argument test
	// calls rely on the throw.
	if (d?.engine !== 'jsbarcode') throw new Error('unsupported engine');
	return jsbarcodeEngine.render(d, entry.value, entry.options);
}

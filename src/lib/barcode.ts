import { engine as bwipEngine } from './engines/bwipjs';
import { engine as jsbarcodeEngine } from './engines/jsbarcode';
import { FORMAT_BY_ID } from './formats';
import type { CodeEntry } from './types';

/** Render one VALID entry into a fresh SVG element, dispatching on the entry's own format.
 *  Only ever called for entries where entry.valid === true. The bwip-js path reuses
 *  validation's encode cache. */
export function renderBarcodeSvg(entry: CodeEntry): SVGElement {
	const d = FORMAT_BY_ID.get(entry.format);
	if (!d) throw new Error(`unknown format: ${entry.format}`);
	if (d.engine === 'jsbarcode') return jsbarcodeEngine.render(d, entry.value, entry.options);
	return bwipEngine.render(d, entry.value, entry.options);
}

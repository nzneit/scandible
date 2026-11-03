import { FORMAT_BY_ID, eccChoice } from './formats';
import type { CodeEntry } from './types';

export const DENSE_HINT =
	'Dense: more than 100 modules across (PDF417: 300), so each module is small on screen. If the scanner misses these, shorten the payload, lower error correction if the format offers it, or go full screen.';

const labelOf = (entry: CodeEntry) => FORMAT_BY_ID.get(entry.format)?.label;
const levelOf = (entry: CodeEntry) => {
	const d = FORMAT_BY_ID.get(entry.format);
	return d && eccChoice(d, entry.options.ecc);
};

/** The verdict for one entry, with its leading space. Single expression so exact-textContent
 *  tests stay byte-stable. */
export function verdictText(entry: CodeEntry): string {
	return entry.valid
		? entry.facts
			? ` ✓ · ${entry.facts.summary} · ${entry.facts.bytes === 1 ? '1 byte' : `${entry.facts.bytes} bytes`}${entry.facts.bytes !== entry.value.length ? ' · UTF-8, no ECI' : ''}${entry.facts.dense ? ' · dense' : ''}`
			: entry.encoded !== undefined && entry.encoded !== entry.value
				? ` ✓ → ${entry.encoded}`
				: ' ✓'
		: entry.reason === 'too-long'
			? levelOf(entry)
				? ` ✗ too long for ${labelOf(entry)} (${levelOf(entry)?.label})`
				: ` ✗ too long for ${labelOf(entry)}`
			: ' ✗ invalid';
}

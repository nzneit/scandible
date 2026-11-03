import { FORMAT_BY_ID, eccChoice, isGs1 } from './formats';
import { dataCharacters, displayData, parseElementString } from './gs1';
import type { Gs1Data } from './gs1';
import type { CodeEntry } from './types';

export const DENSE_HINT =
	'Dense: more than 100 modules across (PDF417 and the linear GS1 formats: 300), so each module is small on screen. If the scanner misses these, shorten the payload, lower error correction if the format offers it, or go full screen.';

export const SCAN_HINT =
	'After → is what a scanner sends when it transmits its symbology identifier (]C1, ]e0, ]d2, ]Q3 or ]J1); ␝ marks a GS separator. Keyboard-wedge scanners usually omit the identifier and may drop or change the separator. Character counts exclude both.';

export const LAX_NOTE =
	'Ticked, a code that fails GS1 validation is drawn anyway, flagged amber with the reason. It cannot help with missing brackets or a code too long for its symbol; GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional and Limited still refuse a wrong GTIN; and GS1 DataBar Expanded and Expanded Stacked carry the corrected check digit of a leading GTIN.';

export const GS1_HINT =
	'GS1 formats take bracketed element strings, such as (01)09501101530003(10)LOT42, one code per line. Spaces and line breaks are removed, commas are data, and parentheses inside a value are not supported.';

const labelOf = (entry: CodeEntry) => FORMAT_BY_ID.get(entry.format)?.label;
const levelOf = (entry: CodeEntry) => {
	const d = FORMAT_BY_ID.get(entry.format);
	return d && eccChoice(d, entry.options.ecc);
};

/** A suffix when a value holds a non-numeric "AI", which is how nested parentheses read. */
const parentheses = (entry: CodeEntry) =>
	parseElementString(entry.value)?.some((e) => /\D/.test(e.ai))
		? ' (parentheses inside a value are not supported)'
		: '';

/** A suffix when the lax flag is set on a carrier that checks the GTIN itself. Not for a value
 *  without brackets: the setting could not help there on any carrier. */
const override = (entry: CodeEntry) => {
	const d = FORMAT_BY_ID.get(entry.format);
	return entry.options.lax === true &&
		d &&
		isGs1(d) &&
		d.gs1.gtinCheck === 'own' &&
		parseElementString(entry.value) !== null
		? ' (the validation setting cannot override this)'
		: '';
};

/** The verdict of a valid GS1 entry: ✓ or the amber lint, size, count, and the scan data. */
function gs1Line(entry: CodeEntry, gs1: Gs1Data): string {
	const d = FORMAT_BY_ID.get(entry.format);
	const n = dataCharacters(gs1.data);
	const head =
		entry.lint !== undefined ? ` ⚠ rendered anyway · ${entry.lint}${parentheses(entry)}` : ' ✓';
	const count = n === 1 ? '1 character' : `${n} characters`;
	const dense = entry.facts?.dense ? ' · dense' : '';
	const over =
		d && isGs1(d) && d.maxChars !== undefined && d.maxChars < n
			? ` · over the ${d.maxChars}-character ${d.label} limit`
			: '';
	return `${head} · ${entry.facts?.summary} · ${count}${dense}${over} → ${gs1.aim} ${displayData(gs1.data)}`;
}

/** The verdict for one entry, with its leading space. Single expression so exact-textContent
 *  tests stay byte-stable. */
export function verdictText(entry: CodeEntry): string {
	return entry.valid
		? entry.gs1
			? gs1Line(entry, entry.gs1)
			: entry.facts
				? ` ✓ · ${entry.facts.summary} · ${entry.facts.bytes === 1 ? '1 byte' : `${entry.facts.bytes} bytes`}${entry.facts.bytes !== entry.value.length ? ' · UTF-8, no ECI' : ''}${entry.facts.dense ? ' · dense' : ''}`
				: entry.encoded !== undefined && entry.encoded !== entry.value
					? ` ✓ → ${entry.encoded}`
					: ' ✓'
		: entry.reason === 'too-long'
			? levelOf(entry)
				? ` ✗ too long for ${labelOf(entry)} (${levelOf(entry)?.label})`
				: ` ✗ too long for ${labelOf(entry)}`
			: entry.message !== undefined
				? ` ✗ ${entry.message}${parentheses(entry)}${override(entry)}`
				: ' ✗ invalid';
}

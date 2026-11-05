import { FORMAT_BY_ID, eccChoice, isGs1 } from './formats';
import { GS1_AIMS, dataCharacters, displayData, parseElementString, plainGs1Message } from './gs1';
import type { Gs1Data } from './gs1';
import type { CodeEntry } from './types';

export const DENSE_HINT =
	'Dense: more than 100 modules across (PDF417 and the linear GS1 formats: 300), so each module is small on screen. If the scanner misses these, shorten the payload, lower error correction if the format offers it, or go full screen.';

export const SCAN_HINT =
	'After → is what a scanner sends when it transmits its symbology identifier (]C1, ]e0, ]d2, ]Q3 or ]J1); ␝ marks a GS separator. Keyboard-wedge scanners usually omit the identifier and may drop or change the separator. Character counts exclude both.';

export const LAX_NOTE =
	'Ticked, a code that fails GS1 validation is drawn anyway, flagged amber with the reason. Three kinds of failure can never be overridden: malformed brackets, scan data that cannot be read (an unknown Application Identifier or symbology identifier, or a parenthesis in a value), and a code too long for its symbol. Separately, GS1 DataBar Omnidirectional, Truncated, Stacked, Stacked Omnidirectional and Limited still refuse a wrong GTIN, and GS1 DataBar Expanded and Expanded Stacked carry the corrected check digit of a leading GTIN.';

export const GS1_HINT =
	'GS1 formats take bracketed element strings, such as (01)09501101530003(10)LOT42, or scanner output, such as ]C1010950110153000310LOT42<GS>17261231; the ]C1-style symbology identifier is optional. Each bracketed number is a GS1 Application Identifier, which names the value after it: (01) marks a GTIN. Write a separator as the GS character, ␝, <GS>, \\x1d or \\u001d. If a keyboard-wedge scanner drops separators, set it to send <GS>. One code per line; spaces and line breaks are removed, commas are data, and parentheses inside a value are not supported.';

const descriptorOf = (entry: CodeEntry) => FORMAT_BY_ID.get(entry.format);
const labelOf = (entry: CodeEntry) => descriptorOf(entry)?.label;
const levelOf = (entry: CodeEntry) => {
	const d = descriptorOf(entry);
	return d && eccChoice(d, entry.options.ecc);
};

/** A suffix when a pair after the first holds a non-numeric "AI", which is how nested
 *  parentheses read. */
const parentheses = (entry: CodeEntry) =>
	parseElementString(entry.value)?.some((e, i) => i > 0 && /\D/.test(e.ai))
		? ' (parentheses inside a value are not supported)'
		: '';

/** A suffix when the render-anyway flag is set, which only GS1 formats resolve to true: every
 *  refusal left under it is one the flag cannot override. */
const override = (entry: CodeEntry) =>
	entry.options.lax === true ? ' (the validation setting cannot override this)' : '';

/** The verdict of a valid GS1 entry: ✓ or the amber lint, size, count, and the scan data. */
function gs1Line(entry: CodeEntry, gs1: Gs1Data): string {
	const d = descriptorOf(entry);
	const n = dataCharacters(gs1.data);
	const head =
		entry.lint !== undefined
			? ` ⚠ rendered anyway · ${plainGs1Message(entry.lint)}${parentheses(entry)}`
			: ' ✓ valid';
	const count = n === 1 ? '1 character' : `${n} characters`;
	const dense = entry.facts?.dense ? ' · dense' : '';
	const over =
		d && isGs1(d) && d.maxChars !== undefined && d.maxChars < n
			? ` · over the ${d.maxChars}-character ${d.label} limit`
			: '';
	const aim = entry.fromScan?.aim;
	const scan =
		aim !== undefined && aim !== gs1.aim ? ` · scan data from ${GS1_AIMS.get(aim)} (${aim})` : '';
	return `${head} · ${entry.facts?.summary} · ${count}${dense}${over}${scan} → ${gs1.aim} ${displayData(gs1.data)}`;
}

/** The verdict for one entry, with its leading space. Single expression so exact-textContent
 *  tests stay byte-stable. */
export function verdictText(entry: CodeEntry): string {
	return entry.valid
		? entry.gs1
			? gs1Line(entry, entry.gs1)
			: entry.facts
				? ` ✓ valid · ${entry.facts.summary} · ${entry.facts.bytes === 1 ? '1 byte' : `${entry.facts.bytes} bytes`}${entry.facts.bytes !== entry.value.length ? ' · UTF-8, no ECI' : ''}${entry.facts.dense ? ' · dense' : ''}`
				: entry.encoded !== undefined && entry.encoded !== entry.value
					? ` ✓ valid → ${entry.encoded}`
					: ' ✓ valid'
		: entry.reason === 'too-long'
			? levelOf(entry)
				? ` ✗ invalid: too long for ${labelOf(entry)} (${levelOf(entry)?.label})${override(entry)}`
				: ` ✗ invalid: too long for ${labelOf(entry)}${override(entry)}`
			: entry.message !== undefined
				? ` ✗ invalid: ${plainGs1Message(entry.message)}${parentheses(entry)}${override(entry)}`
				: ` ✗ invalid${override(entry)}`;
}

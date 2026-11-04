import type { BwipDescriptor, Gs1Carrier } from './formats';
import { aiAt, aiEntry, describeValue } from './gs1Ais';

export const GS = '\u001d';
export const GS_MARK = '␝'; // ␝, what the verdict shows for GS

/** GS1 General Specifications Figure 7.8.5-2; identical to BWIPP's `aifixed` (measurements §4). */
export const PREDEFINED_LENGTH_PREFIXES: ReadonlySet<string> = new Set([
	'00',
	'01',
	'02',
	'03',
	'04',
	'11',
	'12',
	'13',
	'14',
	'15',
	'16',
	'17',
	'18',
	'19',
	'20',
	'31',
	'32',
	'33',
	'34',
	'35',
	'36',
	'41'
]);

export interface Gs1Data {
	aim: string;
	data: string;
} // data holds real GS characters

/**
 * Splits a bracketed element string into AI/value pairs. One trailing `(` is ignored, as BWIPP
 * does; null when the bracketed pairs do not cover the whole string. The AI is taken as written.
 */
export function parseElementString(text: string): { ai: string; value: string }[] | null {
	const s = text.endsWith('(') ? text.slice(0, -1) : text;
	const pairs: { ai: string; value: string }[] = [];
	let end = 0;
	for (const m of s.matchAll(/\(([^()]*)\)([^(]*)/g)) {
		if (m.index !== end) return null;
		pairs.push({ ai: m[1], value: m[2] });
		end = m.index + m[0].length;
	}
	return end === s.length ? pairs : null;
}

/** GS1 mod-10 check digit over 13 digits, weights 3, 1, 3, 1, … from the left. */
export function gtinCheckDigit(digits: string): string {
	let sum = 0;
	for (let i = 0; i < digits.length; i++) sum += Number(digits[i]) * (i % 2 === 0 ? 3 : 1);
	return String((10 - (sum % 10)) % 10);
}

/**
 * What a scanner emits for a GS1 carrier: the AIM identifier plus the AIs and values joined, with
 * GS after a non-last pair whose AI is not predefined-length. Falls back to the value itself
 * when it does not parse.
 */
export function scanData(d: BwipDescriptor & { gs1: Gs1Carrier }, value: string): Gs1Data {
	const { aim, gtinCheck } = d.gs1;
	const parsed = parseElementString(value);
	if (!parsed) return { aim, data: value };
	const pairs = parsed.map((p) => ({ ...p }));
	if (gtinCheck === 'own') {
		for (const p of pairs) {
			if (p.ai === '01' && /^\d{13}$/.test(p.value)) p.value += gtinCheckDigit(p.value);
		}
	} else if (gtinCheck === 'implied') {
		const first = pairs[0];
		if (first && first.ai === '01' && /^\d{14}$/.test(first.value)) {
			first.value = first.value.slice(0, 13) + gtinCheckDigit(first.value.slice(0, 13));
		}
	}
	const data = pairs
		.map((p, i) => {
			const sep = i < pairs.length - 1 && !PREDEFINED_LENGTH_PREFIXES.has(p.ai.slice(0, 2));
			return p.ai + p.value + (sep ? GS : '');
		})
		.join('');
	return { aim, data };
}

/** GS → ␝ */
export function displayData(data: string): string {
	return data.replaceAll(GS, GS_MARK);
}

/** Code points of data without GS. */
export function dataCharacters(data: string): number {
	return [...data.replaceAll(GS, '')].length;
}

/** The five GS1 AIM identifiers and the carrier each names, in this order. */
export const GS1_AIMS: ReadonlyMap<string, string> = new Map([
	[']C1', 'GS1-128'],
	[']e0', 'GS1 DataBar'],
	[']d2', 'GS1 DataMatrix'],
	[']Q3', 'GS1 QR Code'],
	[']J1', 'GS1 DotCode']
]);

export interface Gs1Element {
	ai: string;
	value: string;
}

/** Up to eight characters from i, GS shown as ␝, then … when more remain. */
function excerpt(data: string, i: number): string {
	const chars = [...data.slice(i)];
	const text = displayData(chars.slice(0, 8).join(''));
	return chars.length > 8 ? text + '…' : text;
}

/** Splits scan data (real GS characters, no identifier) into elements, stopping at the first
 *  structural failure; elements read before it are returned with the stop. */
export function splitScanData(data: string): { elements: Gs1Element[]; stop?: string } {
	const elements: Gs1Element[] = [];
	let i = 0;
	for (;;) {
		while (data[i] === GS) i++;
		if (i >= data.length) return { elements };
		const entry = aiAt(data, i);
		const last = elements[elements.length - 1];
		if (!entry) {
			const text = excerpt(data, i);
			const after = last ? ` after (${last.ai})` : '';
			if (data[i] === '(') {
				return {
					elements,
					stop: `Brackets and scan data cannot be mixed; put every AI in brackets or none (stopped at "${text}"${after})`
				};
			}
			return {
				elements,
				stop: last
					? `No GS1 AI starts at "${text}"${after}`
					: `No GS1 AI starts at "${text}"; GS1 data starts with an AI, such as 01 before a GTIN`
			};
		}
		const start = i + entry.ai.length;
		let end = data.indexOf(GS, start);
		if (end === -1) end = data.length;
		if (entry.predefined) {
			const length = entry.parts.reduce((sum, part) => sum + part.max, 0);
			const available = end - start;
			if (available < length) {
				const only =
					available === 0 ? 'none follow' : `only ${available} follow${available === 1 ? 's' : ''}`;
				return { elements, stop: `(${entry.ai}) takes ${length} characters; ${only}` };
			}
			end = start + length;
		} else if (end === start) {
			return { elements, stop: `(${entry.ai}) has no value` };
		}
		elements.push({ ai: entry.ai, value: data.slice(start, end) });
		i = end;
	}
}

export type Gs1Read =
	{ ok: true; value: string; fromScan?: { aim?: string } } | { ok: false; message: string };

/** Turns raw scanner output into a bracketed string; bracketed text passes untouched. */
export function readGs1Input(text: string): Gs1Read {
	if (text.startsWith('(')) return { ok: true, value: text };
	let rest = text.replace(/<gs>|\\x1d|\\u001d/gi, GS).replaceAll(GS_MARK, GS);
	let aim: string | undefined;
	if (rest.startsWith(']')) {
		const id = rest.slice(0, 3);
		if (GS1_AIMS.has(id)) {
			aim = id;
		} else {
			const match = [...GS1_AIMS.keys()].find((key) => key.toLowerCase() === id.toLowerCase());
			return {
				ok: false,
				message: match
					? `${displayData(id)} is not a GS1 symbology identifier; identifiers are case-sensitive, use ${match}`
					: `${displayData(id)} is not a GS1 symbology identifier; GS1 scan data starts with ]C1, ]e0, ]d2, ]Q3 or ]J1, or with its first AI`
			};
		}
		rest = rest.slice(3);
	}
	const { elements, stop } = splitScanData(rest);
	if (stop) return { ok: false, message: stop };
	if (elements.length === 0) return { ok: false, message: 'No AIs in the scan data' };
	for (const { ai, value } of elements) {
		if (/[()]/.test(value)) {
			return {
				ok: false,
				message: `(${ai}) contains a parenthesis; parentheses inside a value are not supported`
			};
		}
	}
	const value = elements.map((e) => `(${e.ai})${e.value}`).join('');
	return { ok: true, value, fromScan: aim ? { aim } : {} };
}

export interface BreakdownLine {
	ai: string;
	title?: string;
	text: string;
}

/** The per-AI lines of drawn scan data, split as a receiving system would split it. */
export function breakdown(data: string, today: Date): { lines: BreakdownLine[]; stop?: string } {
	if (data.startsWith('(')) {
		return { lines: [], stop: 'The bracketed string could not be split into AIs' };
	}
	const { elements, stop } = splitScanData(data);
	const lines = elements.map(({ ai, value }): BreakdownLine => {
		const title = aiEntry(ai)?.title;
		const text = describeValue(ai, value, today);
		return title === undefined ? { ai, text } : { ai, title, text };
	});
	return stop ? { lines, stop } : { lines };
}

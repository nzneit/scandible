import type { BwipDescriptor, Gs1Carrier } from './formats';

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

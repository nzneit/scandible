import table from './gs1-ais.json';

export interface AiPart {
	cset: 'N' | 'X' | 'Y' | 'Z';
	min: number;
	max: number;
	opt: boolean;
	linters: string[];
}
export interface AiEntry {
	ai: string; // one AI; ranges are expanded at load
	title?: string;
	predefined: boolean; // the dictionary's `*` flag: no GS follows it
	parts: AiPart[];
}

/** `3100-3105` becomes every AI in the range, zero-padded to the first bound's width. */
function expand(ai: string): string[] {
	const m = /^(\d+)-(\d+)$/.exec(ai);
	if (!m) return [ai];
	const out: string[] = [];
	for (let n = Number(m[1]); n <= Number(m[2]); n++) out.push(String(n).padStart(m[1].length, '0'));
	return out;
}

/** Every assigned AI in dictionary order; each member is a copy with its own `ai`. */
export const AIS: ReadonlyMap<string, AiEntry> = new Map(
	(table.ais as AiEntry[]).flatMap((record) =>
		expand(record.ai).map((ai): [string, AiEntry] => [ai, { ...record, ai }])
	)
);

/** The entry for one AI, or undefined when GS1 assigns none. */
export function aiEntry(ai: string): AiEntry | undefined {
	return AIS.get(ai);
}

/** The AI starting at text[i]: tries 2, 3, then 4 characters. AIs are prefix-free (M5). */
export function aiAt(text: string, i: number): AiEntry | undefined {
	for (const length of [2, 3, 4]) {
		const entry = AIS.get(text.slice(i, i + length));
		if (entry) return entry;
	}
	return undefined;
}

const DATE_LINTERS = new Set(['yymmdd', 'yymmd0', 'yyyymmdd']);
const TIME_LINTERS = new Set(['hhmi', 'hh', 'mi', 'ss']);

/** Cuts a value into its AI's fields, or returns undefined when it does not fit them. */
function cutFields(parts: AiPart[], value: string): string[] | undefined {
	const fields: string[] = [];
	let pos = 0;
	for (const part of parts) {
		const left = value.length - pos;
		if (left === 0 && part.opt) break;
		const take = Math.min(part.max, left);
		if (take < part.min) return undefined;
		fields.push(value.slice(pos, pos + take));
		pos += take;
	}
	return pos === value.length ? fields : undefined;
}

function daysInMonth(year: number, month: number): number {
	if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
	return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function describeDate(field: string, linter: string, today: Date): string {
	const bad = `${field} (not a date)`;
	const wide = linter === 'yyyymmdd';
	if (!/^\d+$/.test(field) || field.length !== (wide ? 8 : 6)) return bad;
	let year: number;
	if (wide) year = Number(field.slice(0, 4));
	else {
		const thisYear = today.getFullYear();
		const diff = Number(field.slice(0, 2)) - (thisYear % 100);
		const century = Math.floor(thisYear / 100) * 100;
		year = century + Number(field.slice(0, 2));
		if (diff >= 51) year -= 100;
		else if (diff <= -50) year += 100;
	}
	const rest = wide ? 4 : 2;
	const month = Number(field.slice(rest, rest + 2));
	const day = Number(field.slice(rest + 2, rest + 4));
	if (month < 1 || month > 12) return bad;
	const last = daysInMonth(year, month);
	const stamp = `${String(year).padStart(4, '0')}-${pad2(month)}`;
	if (day === 0 && linter === 'yymmd0') return `${stamp}-${pad2(last)} (day 00: end of month)`;
	if (day < 1 || day > last) return bad;
	return `${stamp}-${pad2(day)}`;
}

function describeTime(fields: string[]): string {
	const digits = fields.join('');
	if (!/^\d+$/.test(digits) || digits.length % 2 !== 0 || digits.length > 6)
		return `${digits} (not a time)`;
	const [h, m, s] = [0, 2, 4].map((i) => (i < digits.length ? Number(digits.slice(i, i + 2)) : 0));
	if (h > 23 || m > 59 || s > 59) return `${digits} (not a time)`;
	if (digits.length === 2) return `${pad2(h)}h`;
	return digits.length === 4 ? `${pad2(h)}:${pad2(m)}` : `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function describeDecimal(digits: string, places: number): string {
	if (!/^\d+$/.test(digits)) return digits;
	const padded = digits.padStart(places + 1, '0');
	const whole = padded.slice(0, padded.length - places).replace(/^0+(?=\d)/, '');
	return places === 0 ? whole : `${whole}.${padded.slice(padded.length - places)}`;
}

/** One AI's value as the breakdown shows it: dates, times and decimals decoded, else as written. */
export function describeValue(ai: string, value: string, today: Date): string {
	const entry = aiEntry(ai);
	if (!entry) return value;
	const fields = cutFields(entry.parts, value);
	if (!fields) return value;
	const n = Number(ai);
	const measure = ai.length === 4 && ((n >= 3100 && n <= 3699) || (n >= 3900 && n <= 3959));
	const units: string[] = [];
	for (let i = 0; i < fields.length; i++) {
		const linter = entry.parts[i].linters.find((l) => DATE_LINTERS.has(l) || TIME_LINTERS.has(l));
		if (linter && DATE_LINTERS.has(linter)) units.push(describeDate(fields[i], linter, today));
		else if (linter) {
			const group = [fields[i]];
			while (i + 1 < fields.length) {
				const next = entry.parts[i + 1].linters.find((l) => TIME_LINTERS.has(l));
				if (!next) break;
				group.push(fields[++i]);
			}
			units.push(describeTime(group));
		} else if (measure && i === fields.length - 1) {
			units.push(describeDecimal(fields[i], Number(ai[3])));
		} else units.push(fields[i]);
	}
	return units.join(' ');
}

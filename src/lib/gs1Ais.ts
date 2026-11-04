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

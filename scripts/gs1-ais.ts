import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

export const RELEASE = '2026-01-27';
export const SHA256 = '6461ece7c03420fb27a3f18163ef9a08694aa4bb2491dea25f63bcdf22451a99';
export const SOURCE = 'https://github.com/gs1/gs1-syntax-dictionary';
export const DICTIONARY_URL = `https://raw.githubusercontent.com/gs1/gs1-syntax-dictionary/${RELEASE}/gs1-syntax-dictionary.txt`;

export interface DictPart {
	cset: 'N' | 'X' | 'Y' | 'Z';
	min: number;
	max: number;
	opt: boolean;
	linters: string[];
}
export interface DictRecord {
	ai: string; // one AI or a range as written, such as '3100-3105'
	title?: string; // absent when the line has none
	predefined: boolean; // the flags token contains '*'
	parts: DictPart[];
}
export interface AiTable {
	source: string;
	release: string;
	sha256: string;
	licence: string; // 'Apache-2.0'
	ais: DictRecord[];
}

const COMPONENT = /^\[?([NXYZ])(\d+|\.\.\d+)\]?(,.*)?$/;

/** One record per entry line; throws an Error quoting the line when it has no component. */
export function parseDictionary(text: string): DictRecord[] {
	const records: DictRecord[] = [];
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed === '' || trimmed.startsWith('#')) continue;
		const hash = line.indexOf('#');
		const head = hash === -1 ? line : line.slice(0, hash);
		const title = hash === -1 ? '' : line.slice(hash + 1).trim();
		const tokens = head.split(/\s+/).filter((t) => t !== '');
		const ai = tokens[0];
		let rest = tokens.slice(1);
		let predefined = false;
		if (rest.length > 0 && !/^[NXYZ[]/.test(rest[0])) {
			predefined = rest[0].includes('*');
			rest = rest.slice(1);
		}
		const parts: DictPart[] = [];
		for (const token of rest) {
			const m = COMPONENT.exec(token);
			if (!m) continue; // an attribute such as req= or ex=
			const size = m[2];
			const fixedLength = !size.startsWith('..');
			const n = Number(fixedLength ? size : size.slice(2));
			parts.push({
				cset: m[1] as DictPart['cset'],
				min: fixedLength ? n : 1,
				max: n,
				opt: token.startsWith('['),
				linters: m[3] ? m[3].slice(1).split(',') : []
			});
		}
		if (parts.length === 0) throw new Error(`no component in the dictionary line "${line}"`);
		records.push(title === '' ? { ai, predefined, parts } : { ai, title, predefined, parts });
	}
	return records;
}

function expand(ai: string): string[] {
	const m = /^(\d+)-(\d+)$/.exec(ai);
	if (!m) return [ai];
	const out: string[] = [];
	for (let n = Number(m[1]); n <= Number(m[2]); n++) out.push(String(n).padStart(m[1].length, '0'));
	return out;
}

/** Throws an Error naming the AI when a structural rule of the spec's _Generator_ step 4 fails. */
export function assertStructure(records: DictRecord[]): void {
	const fail = (ai: string, rule: string): never => {
		throw new Error(`AI ${ai}: ${rule}`);
	};
	const all = records.map((r) => ({ record: r, ais: expand(r.ai) }));
	for (const { ais } of all) {
		for (const ai of ais) {
			if (!/^\d{2,4}$/.test(ai)) fail(ai, 'an AI has two to four digits');
		}
	}
	const seen = new Set<string>();
	for (const { ais } of all) for (const ai of ais) seen.add(ai);
	const counted = new Set<string>();
	for (const { ais } of all) {
		for (const ai of ais) {
			if (counted.has(ai)) fail(ai, 'the AI is listed twice');
			counted.add(ai);
			for (let len = 2; len < ai.length; len++) {
				if (seen.has(ai.slice(0, len))) {
					fail(ai, `the AI starts with another AI, ${ai.slice(0, len)}`);
				}
			}
		}
	}
	for (const { record } of all) {
		if (!record.predefined) continue;
		for (const p of record.parts) {
			if (p.min !== p.max || p.opt || p.cset !== 'N') {
				fail(record.ai, 'a predefined AI has only fixed, required, numeric fields');
			}
		}
	}
	for (const { record } of all) {
		record.parts.forEach((p, i) => {
			if (p.min !== p.max && i < record.parts.length - 1) {
				fail(record.ai, 'only the last field may be variable');
			}
		});
	}
	for (const { record } of all) {
		let optionalSeen = false;
		for (const p of record.parts) {
			if (p.opt) optionalSeen = true;
			else if (optionalSeen) fail(record.ai, 'no optional field may come before a required one');
		}
	}
}

async function main(): Promise<void> {
	const response = await fetch(DICTIONARY_URL);
	if (response.status !== 200) {
		throw new Error(`fetching ${DICTIONARY_URL} returned status ${response.status}`);
	}
	const bytes = new Uint8Array(await response.arrayBuffer());
	const hash = createHash('sha256').update(bytes).digest('hex');
	if (hash !== SHA256) throw new Error(`hash mismatch: expected ${SHA256}, got ${hash}`);
	const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	const ais = parseDictionary(text);
	assertStructure(ais);
	const table: AiTable = {
		source: SOURCE,
		release: RELEASE,
		sha256: SHA256,
		licence: 'Apache-2.0',
		ais
	};
	writeFileSync(
		new URL('../src/lib/gs1-ais.json', import.meta.url),
		JSON.stringify(table, null, '\t') + '\n'
	);
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(`gs1-ais: ${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 1;
	});
}

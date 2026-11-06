// One-off rewrite of every quoted `$lib/…` specifier in src and scripts to
// `#lib/<real file>`. Fails closed: if any specifier matches no file or more
// than one, nothing is written. Run: node scripts/migrate-lib-imports.ts
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const self = resolve(import.meta.filename);
const libDir = join(root, 'src', 'lib');
const SPECIFIER = /(['"])\$lib\/([^'"]+)\1/g;
const SUFFIXES = ['', '.ts', '.svelte.ts'];

function walk(dir: string, out: string[]): string[] {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (/\.(ts|svelte|js)$/.test(entry.name) && resolve(full) !== self) out.push(full);
	}
	return out;
}

function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}

const problems: string[] = [];
const rewrites = new Map<string, { text: string; count: number }>();
let total = 0;

for (const dir of ['src', 'scripts']) {
	for (const file of walk(join(root, dir), []).sort()) {
		const source = readFileSync(file, 'utf8');
		let count = 0;
		const text = source.replace(SPECIFIER, (_match, quote: string, spec: string) => {
			const candidates = SUFFIXES.map((s) => spec + s).filter((p) => isFile(join(libDir, p)));
			if (candidates.length !== 1) {
				problems.push(
					`${relative(root, file)}: $lib/${spec} matches ${candidates.length} files` +
						(candidates.length ? `: ${candidates.join(', ')}` : ' (no candidate)')
				);
				return _match;
			}
			count++;
			return `${quote}#lib/${candidates[0]}${quote}`;
		});
		if (count > 0) rewrites.set(file, { text, count });
		total += count;
	}
}

if (problems.length > 0) {
	for (const p of problems) console.error(p);
	process.exit(1);
}

for (const [file, { text, count }] of rewrites) {
	writeFileSync(file, text);
	console.log(`${relative(root, file)}: ${count}`);
}
console.log(`total: ${total}`);

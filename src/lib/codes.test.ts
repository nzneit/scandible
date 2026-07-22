import { describe, it, expect } from 'vitest';
import { parseCodeList } from './codes';

describe('parseCodeList tokenization', () => {
	it('numeric formats split on newlines AND commas, trim, drop empties, keep order + duplicates', () => {
		const entries = parseCodeList(' a , b\n\nc ,,\nb ', 'upc');
		expect(entries.map((e) => e.raw)).toEqual(['a', 'b', 'c', 'b']);
	});

	it('numeric formats strip internal whitespace into value', () => {
		const entries = parseCodeList('0360 0029 1452\n12345', 'upc');
		expect(entries).toHaveLength(2);
		expect(entries[0].raw).toBe('0360 0029 1452');
		expect(entries[0].value).toBe('036000291452');
		expect(entries[0].valid).toBe(true);
		expect(entries[0].encoded).toBe('036000291452');
		expect(entries[1].valid).toBe(false);
		expect(entries[1].encoded).toBeUndefined();
	});

	it('text formats treat commas and internal spaces as data', () => {
		const entries = parseCodeList('Hello, World\nsecond line', 'code128');
		expect(entries.map((e) => e.raw)).toEqual(['Hello, World', 'second line']);
		expect(entries[0].value).toBe('Hello, World');
		expect(entries[0].valid).toBe(true);
	});

	it('drops whitespace-only tokens before validation — no blank rows ever', () => {
		expect(parseCodeList('  , 123', 'upc').map((e) => e.raw)).toEqual(['123']);
		expect(parseCodeList('   \n\t\n', 'code128')).toEqual([]);
	});

	it('flips validity by format: HELLO is invalid upc, valid code39', () => {
		expect(parseCodeList('HELLO', 'upc')[0].valid).toBe(false);
		expect(parseCodeList('HELLO', 'code39')[0].valid).toBe(true);
	});
});

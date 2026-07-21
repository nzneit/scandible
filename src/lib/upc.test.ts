import { describe, it, expect } from 'vitest';
import { tokenizeUpcInput, parseUpcList } from './upc';

describe('tokenizeUpcInput', () => {
	it('splits on newlines and commas, trims, drops empties, keeps order + duplicates', () => {
		expect(tokenizeUpcInput(' a , b\n\nc ,,\nb ')).toEqual(['a', 'b', 'c', 'b']);
	});
});

describe('parseUpcList', () => {
	it('normalizes internal whitespace into value and flags validity', () => {
		const entries = parseUpcList('0360 0029 1452\n12345');
		expect(entries).toHaveLength(2);
		expect(entries[0]).toEqual({ raw: '0360 0029 1452', value: '036000291452', valid: true });
		expect(entries[1].valid).toBe(false);
	});
});

import { describe, it, expect } from 'vitest';
import { duplicateNeighbours } from './duplicates';
import { parseCodeList } from './codes';

/** Valid code128 entries from space-separated values. */
const list = (values: string) => parseCodeList(values.replaceAll(' ', '\n'), 'code128');

describe('duplicateNeighbours', () => {
	it('pairs identical neighbours in order, and the last with the first only with loop on', () => {
		expect(duplicateNeighbours(list('a b c'), false)).toEqual([]);
		expect(duplicateNeighbours(list('a b b c'), false)).toEqual([[1, 2]]);
		expect(duplicateNeighbours(list('a a b b'), false)).toEqual([
			[0, 1],
			[2, 3]
		]);
		expect(duplicateNeighbours(list('a b a'), true)).toEqual([[2, 0]]);
		expect(duplicateNeighbours(list('a b a'), false)).toEqual([]);
		expect(duplicateNeighbours(list('a'), true)).toEqual([]);
	});
});

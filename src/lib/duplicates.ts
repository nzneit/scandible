import type { CodeEntry } from './types';

/**
 * Index pairs of identical neighbouring values, in order, plus the last-with-first pair when
 * looping. Callers pass only valid entries, so the numbers in the hint match the counter.
 */
export function duplicateNeighbours(valid: CodeEntry[], loop: boolean): [number, number][] {
	const pairs: [number, number][] = [];
	for (let i = 0; i < valid.length - 1; i++) {
		if (valid[i].value === valid[i + 1].value) pairs.push([i, i + 1]);
	}
	const last = valid.length - 1;
	if (loop && valid.length >= 2 && valid[last].value === valid[0].value) pairs.push([last, 0]);
	return pairs;
}

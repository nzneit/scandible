import { describe, it, expect } from 'vitest';
import { formatSeconds, parseSeconds } from './seconds';
import { DWELL_RANGE, GAP_RANGE } from './types';

describe('seconds', () => {
	it('formats milliseconds as seconds to two decimals', () => {
		const shown = [1000, 250, 50, 0, 5000].map((ms) => formatSeconds(ms));
		expect(shown).toEqual(['1.00 s', '0.25 s', '0.05 s', '0.00 s', '5.00 s']);
	});

	it('parses typed seconds, snapped to the 10 ms grid and clamped, or null', () => {
		const dwell = (text: string) => parseSeconds(text, DWELL_RANGE);
		expect(['0.4', '0.405', '0.404', '9', '0', '-1', ' 1 '].map(dwell)).toEqual([
			400, 410, 400, 5000, 50, 50, 1000
		]);
		expect(['abc', ''].map(dwell)).toEqual([null, null]);
		expect(['0', '2.5'].map((text) => parseSeconds(text, GAP_RANGE))).toEqual([0, 2000]);
	});
});

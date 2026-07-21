import { describe, it, expect } from 'vitest';
import { formatFinishMessage } from './format';

describe('formatFinishMessage', () => {
	it('formats the finish copy exactly', () => {
		expect(formatFinishMessage(3, 12.4)).toBe('Finished scrolling 3 barcodes in 12.4 seconds');
	});
});

import { describe, expect, it } from 'vitest';
import { speedText, speedValuetext } from './speed';

describe('speed strings', () => {
	it('shows a speed in px/s', () => {
		expect(speedText(60)).toBe('60 px/s');
		expect(speedText(5000)).toBe('5000 px/s');
	});
	it('says a speed in words', () => {
		expect(speedValuetext(60)).toBe('60 pixels per second');
		expect(speedValuetext(10)).toBe('10 pixels per second');
	});
});

import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './types';

describe('DEFAULT_SETTINGS', () => {
	it('defaults to 60 px/s, loop off, rotation off, skew off', () => {
		expect(DEFAULT_SETTINGS.speedPxPerSec).toBe(60);
		expect(DEFAULT_SETTINGS.loop).toBe(false);
		expect(DEFAULT_SETTINGS.rotate).toBe(false);
		expect(DEFAULT_SETTINGS.rotateMaxDeg).toBe(8);
		expect(DEFAULT_SETTINGS.skew).toBe(false);
		expect(DEFAULT_SETTINGS.skewMaxDeg).toBe(8);
		expect(DEFAULT_SETTINGS.seed).toBe(0);
	});
});

import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, DWELL_RANGE, GAP_RANGE, SPEED_RANGE } from './types';

describe('DEFAULT_SETTINGS', () => {
	it('defaults lax to false: GS1 data that fails validation is skipped', () => {
		expect(DEFAULT_SETTINGS.lax).toBe(false);
	});

	it('defaults to 60 px/s, loop off, rotation off, skew off', () => {
		expect(DEFAULT_SETTINGS.speedPxPerSec).toBe(60);
		expect(DEFAULT_SETTINGS.loop).toBe(false);
		expect(DEFAULT_SETTINGS.rotate).toBe(false);
		expect(DEFAULT_SETTINGS.rotateMaxDeg).toBe(8);
		expect(DEFAULT_SETTINGS.skew).toBe(false);
		expect(DEFAULT_SETTINGS.skewMaxDeg).toBe(8);
		expect(DEFAULT_SETTINGS.seed).toBe(0);
	});

	it('defaults ecc to the empty string, meaning the format default', () => {
		expect(DEFAULT_SETTINGS.ecc).toBe('');
	});
});

describe('playback settings', () => {
	const onGrid = (ms: number, r: { min: number; max: number; step: number }) =>
		ms >= r.min && ms <= r.max && (ms - r.min) % r.step === 0;

	it('defaults to scroll, a 1000 ms dwell and no gap, each on its range grid', () => {
		expect(DEFAULT_SETTINGS).toMatchObject({ mode: 'scroll', dwellMs: 1000, gapMs: 0 });
		expect(DWELL_RANGE).toEqual({ min: 50, max: 5000, step: 10 });
		expect(GAP_RANGE).toEqual({ min: 0, max: 2000, step: 10 });
		expect(onGrid(DEFAULT_SETTINGS.dwellMs, DWELL_RANGE)).toBe(true);
		expect(onGrid(DEFAULT_SETTINGS.gapMs, GAP_RANGE)).toBe(true);
	});

	it('ranges the speed from 10 to 5000 px/s in steps of 5, with the default on its grid', () => {
		expect(SPEED_RANGE).toEqual({ min: 10, max: 5000, step: 5 });
		expect(onGrid(DEFAULT_SETTINGS.speedPxPerSec, SPEED_RANGE)).toBe(true);
	});
});

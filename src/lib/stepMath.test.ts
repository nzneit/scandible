import { describe, it, expect } from 'vitest';
import { advanceStep, INITIAL_STEP_STATE, type StepPhase, type StepState } from './stepMath';

const st = (index: number, phase: StepPhase, phaseElapsedMs: number): StepState => ({
	index,
	phase,
	phaseElapsedMs
});
type Row = [row: number, args: Parameters<typeof advanceStep>, out: StepState, finished: boolean];
const TABLE: Row[] = [
	[1, [st(0, 'dwell', 0), 70, 50, 0, 3, false], st(1, 'dwell', 0), false],
	[2, [st(0, 'dwell', 0), 100, 50, 30, 3, false], st(0, 'gap', 0), false],
	[3, [st(0, 'gap', 20), 16, 50, 30, 3, false], st(1, 'dwell', 0), false],
	[4, [st(1, 'dwell', 10), 16, 50, 0, 3, false], st(1, 'dwell', 26), false],
	[5, [st(2, 'dwell', 40), 16, 50, 30, 3, false], st(2, 'dwell', 50), true],
	[6, [st(2, 'dwell', 40), 16, 50, 0, 3, true], st(0, 'dwell', 0), false],
	[7, [st(2, 'gap', 20), 16, 50, 30, 3, false], st(2, 'gap', 30), true],
	[8, [st(0, 'dwell', 990), 16, 1000, 0, 1, false], st(0, 'dwell', 1000), true],
	[9, [st(0, 'dwell', 990), 16, 1000, 0, 1, true], st(0, 'dwell', 0), false],
	[10, [st(0, 'dwell', 990), 16, 1000, 250, 1, true], st(0, 'gap', 0), false],
	[11, [st(0, 'dwell', 200), 0, 50, 0, 3, false], st(1, 'dwell', 0), false],
	[12, [st(0, 'gap', 200), 0, 50, 30, 3, false], st(1, 'dwell', 0), false]
];

describe('advanceStep', () => {
	it('holds all 12 rows of the worked table', () => {
		expect(TABLE.map((r) => r[0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
	});

	it.each(TABLE)('row %i of the worked table', (_row, args, state, finished) => {
		expect(advanceStep(...args)).toEqual({ state, finished });
	});

	it('starts at code 0 and never mutates a frozen input state', () => {
		expect(INITIAL_STEP_STATE).toEqual({ index: 0, phase: 'dwell', phaseElapsedMs: 0 });
		const frozen = Object.freeze(st(0, 'dwell', 990));
		expect(() => advanceStep(frozen, 16, 1000, 0, 1, true)).not.toThrow();
		expect(frozen).toEqual(st(0, 'dwell', 990));
	});

	it('gives every code 7 frames at dwell 100 with 16 ms frames and gap 0', () => {
		let state = INITIAL_STEP_STATE;
		const changes: number[] = [];
		for (let call = 1; call <= 60; call++) {
			const next = advanceStep(state, 16, 100, 0, 10, true).state;
			if (next.index !== state.index) changes.push(call);
			state = next;
		}
		expect(changes).toEqual([7, 14, 21, 28, 35, 42, 49, 56]); // Math.ceil(100 / 16) = 7
	});

	it('enters a gap only when gapMs > 0, and makes at most one transition per call', () => {
		const out = (s: StepState, deltaMs: number, gapMs = 30) =>
			advanceStep(s, deltaMs, 50, gapMs, 3, true).state;
		expect(out(st(0, 'dwell', 40), 16, 0)).toEqual(st(1, 'dwell', 0));
		expect(out(st(0, 'dwell', 40), 16, 10)).toEqual(st(0, 'gap', 0));
		expect(out(st(0, 'dwell', 0), 1000)).toEqual(st(0, 'gap', 0)); // the function does not clamp
		expect(out(st(0, 'gap', 0), 1000)).toEqual(st(1, 'dwell', 0));
		expect(out(st(0, 'dwell', 50), 0, 0)).toEqual(st(1, 'dwell', 0)); // delta 0 at the length
		for (const deltaMs of [0, 1, 16, 50, 100, 1000])
			for (const phase of ['dwell', 'gap'] as const)
				for (const i of [0, 1, 2])
					expect([i, (i + 1) % 3]).toContain(out(st(i, phase, 40), deltaMs).index);
	});
});

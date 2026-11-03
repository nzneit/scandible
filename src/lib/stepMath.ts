export type StepPhase = 'dwell' | 'gap';

export interface StepState {
	index: number; // the code shown (dwell) or just shown (gap); 0 ≤ index < count
	phase: StepPhase;
	phaseElapsedMs: number; // time spent in this phase; every phase starts at 0
}

export const INITIAL_STEP_STATE: StepState = { index: 0, phase: 'dwell', phaseElapsedMs: 0 };

/** Advance the schedule by one frame. deltaMs is MILLISECONDS, already clamped by the caller.
 *  At most one transition per call. Never mutates `state`. */
export function advanceStep(
	state: StepState,
	deltaMs: number,
	dwellMs: number,
	gapMs: number,
	count: number,
	loop: boolean
): { state: StepState; finished: boolean } {
	const { index, phase } = state;
	const elapsed = state.phaseElapsedMs + deltaMs;
	const len = phase === 'dwell' ? dwellMs : gapMs;
	if (elapsed < len) return { state: { index, phase, phaseElapsedMs: elapsed }, finished: false };

	const isLast = index === count - 1;
	const next = isLast ? 0 : index + 1;
	if (isLast && !loop) return { state: { index, phase, phaseElapsedMs: len }, finished: true };
	if (phase === 'dwell' && gapMs > 0)
		return { state: { index, phase: 'gap', phaseElapsedMs: 0 }, finished: false };
	return { state: { index: next, phase: 'dwell', phaseElapsedMs: 0 }, finished: false };
}

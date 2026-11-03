import { MAX_DELTA_MS } from './scrollMath';
import { buildItems } from './items';
import { advanceStep, INITIAL_STEP_STATE, type StepState } from './stepMath';
import type { Player } from './player';
import type { CodeEntry, Settings } from './types';

export interface Stepper extends Player {
	setDwell(ms: number): void;
	setGap(ms: number): void;
	next(): void;
	prev(): void;
}

export interface StepSummary {
	count: number; // valid entries in the list
	seconds: number; // playback clock: clamped frame deltas while playing, in s to the hundredth
	frameMs: number; // mean interval of the unclamped frames while playing; 0 before the first
	stalls: number; // frames whose interval exceeded MAX_DELTA_MS (counted as 100 ms each)
	dwell: { first: number; last: number; changed: boolean }; // ms; see "run record"
	gap: { first: number; last: number; changed: boolean };
}

export function createStepper(
	container: HTMLElement,
	entries: CodeEntry[],
	settings: Settings,
	onFinish?: (summary: StepSummary) => void,
	onIndex?: (index: number, count: number) => void
): Stepper {
	const valid = entries.filter((e) => e.valid);
	const count = valid.length; // at least 1: the play page guarantees it
	// Built once and re-appended on every visit, never re-rendered.
	const items = buildItems(valid, settings);

	const stage = document.createElement('div');
	stage.className = 'step-stage';
	container.innerHTML = '';
	container.appendChild(stage);

	let dwell = settings.dwellMs;
	let gap = settings.gapMs;
	const loop = settings.loop; // fixed for the stepper's life
	let state: StepState = INITIAL_STEP_STATE;
	let elapsedMs = 0;
	let frameCount = 0;
	let frameSumMs = 0;
	let stalls = 0;
	let playing = false;
	let finished = false;
	let runStarted = false;
	let dwellFirst = dwell;
	let gapFirst = gap;
	let dwellChanged = false;
	let gapChanged = false;
	let rafId: number | null = null;
	let lastTs: number | null = null;

	/** The stage holds exactly one item in a dwell phase and nothing in a gap phase. */
	const show = () => {
		if (state.phase === 'dwell') stage.replaceChildren(items[state.index]);
		else stage.replaceChildren();
	};

	const summary = (): StepSummary => ({
		count,
		seconds: Math.round(elapsedMs / 10) / 100,
		frameMs: frameCount ? frameSumMs / frameCount : 0,
		stalls,
		dwell: { first: runStarted ? dwellFirst : dwell, last: dwell, changed: dwellChanged },
		gap: { first: runStarted ? gapFirst : gap, last: gap, changed: gapChanged }
	});

	const stop = () => {
		playing = false;
		if (rafId !== null) cancelAnimationFrame(rafId);
		rafId = null;
	};
	const finish = () => {
		stop();
		finished = true;
		onFinish?.(summary());
	};
	const frame = (ts: number) => {
		if (!playing) return;
		rafId = null;
		// The first frame after play() or a go-to has no previous timestamp: it counts no time and
		// is not an interval, so it counts toward neither frameCount nor stalls.
		let deltaMs = 0;
		if (lastTs !== null) {
			const raw = ts - lastTs;
			if (raw > MAX_DELTA_MS) {
				deltaMs = MAX_DELTA_MS;
				stalls += 1;
			} else {
				deltaMs = raw;
				frameCount += 1;
				frameSumMs += raw;
			}
		}
		lastTs = ts;
		elapsedMs += deltaMs;
		const before = state;
		const result = advanceStep(before, deltaMs, dwell, gap, count, loop);
		state = result.state;
		if (result.finished) {
			finish();
			return;
		}
		if (state.index !== before.index || state.phase !== before.phase) show();
		if (state.index !== before.index) onIndex?.(state.index, count);
		if (playing && rafId === null) rafId = requestAnimationFrame(frame);
	};
	const start = () => {
		if (playing || finished) return;
		// A run's record starts at the first start() after construction or restart().
		if (!runStarted) {
			runStarted = true;
			dwellFirst = dwell;
			gapFirst = gap;
			dwellChanged = false;
			gapChanged = false;
		}
		playing = true;
		lastTs = null; // paused time is excluded
		rafId = requestAnimationFrame(frame);
	};
	/** Go to `i`: its dwell is measured from its first painted frame, since lastTs is cleared. */
	const goTo = (i: number) => {
		state = { index: i, phase: 'dwell', phaseElapsedMs: 0 };
		lastTs = null;
		show();
		onIndex?.(i, count);
	};

	show();
	onIndex?.(0, count);

	return {
		play: start,
		pause: stop,
		toggle() {
			if (playing) stop();
			else start();
		},
		isPlaying() {
			return playing;
		},
		setDwell(ms) {
			if (runStarted && ms !== dwell) dwellChanged = true;
			dwell = ms;
		},
		setGap(ms) {
			if (runStarted && ms !== gap) gapChanged = true;
			gap = ms;
		},
		// In a gap, state.index is the code just shown, so both are relative to it.
		next() {
			if (finished) return;
			if (state.index < count - 1) goTo(state.index + 1);
			else if (loop) goTo(0);
			else finish();
		},
		prev() {
			if (finished) return;
			if (state.index > 0) goTo(state.index - 1);
			else goTo(loop ? count - 1 : 0);
		},
		restart() {
			const wasPlaying = playing;
			stop();
			state = INITIAL_STEP_STATE;
			elapsedMs = 0;
			finished = false;
			frameCount = 0;
			frameSumMs = 0;
			stalls = 0;
			runStarted = false;
			dwellChanged = false;
			gapChanged = false;
			show();
			onIndex?.(0, count);
			if (wasPlaying) start();
		},
		destroy() {
			stop();
		}
	};
}

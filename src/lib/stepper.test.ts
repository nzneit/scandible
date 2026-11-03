import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStepper, type Stepper, type StepSummary } from './stepper';
import { DEFAULT_SETTINGS, type CodeEntry, type Settings } from './types';

const entry = (value: string, valid: boolean): CodeEntry => ({
	raw: value,
	value,
	format: 'upc',
	options: {},
	valid
});
const entries: CodeEntry[] = [
	entry('036000291452', true),
	entry('bad', false),
	entry('012345678905', true)
];
const one: CodeEntry[] = [entry('036000291452', true)];

let container: HTMLElement;
let pending: FrameRequestCallback | null = null;
let nextId = 0;
const cancel = vi.fn();
const [realRaf, realCaf] = [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame];
beforeEach(() => {
	container = document.body.appendChild(document.createElement('div'));
	[pending, nextId] = [null, 0];
	cancel.mockClear();
	globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
		pending = cb;
		return ++nextId;
	};
	globalThis.cancelAnimationFrame = cancel;
});
afterEach(() => {
	globalThis.requestAnimationFrame = realRaf;
	globalThis.cancelAnimationFrame = realCaf;
	container.remove();
});

/** Run the stored frame callback at `ts`; nothing happens when none is pending. */
const tick = (ts: number) => {
	const cb = pending;
	pending = null;
	cb?.(ts);
};
const ticks = (...ts: number[]) => ts.forEach((t) => tick(t));
const stage = () => container.querySelector('.step-stage')!;
const shown = () => stage().firstElementChild;
const kids = () => stage().children.length;
/** A stepper with step settings plus `over`, its spies, and the item shown at construction. */
const make = (over: Partial<Settings> = {}, list = entries) => {
	const onFinish = vi.fn<(summary: StepSummary) => void>();
	const onIndex = vi.fn<(index: number, count: number) => void>();
	const settings = { ...DEFAULT_SETTINGS, mode: 'step' as const, ...over };
	const s = createStepper(container, list, settings, onFinish, onIndex);
	return { s, onFinish, onIndex, item0: shown(), summary: () => onFinish.mock.calls[0][0] };
};

/** `→ item`: the stage holds exactly that element. */
const showing = (item: Element | null) => {
	expect(kids()).toBe(1);
	expect(shown()).toBe(item);
};
/** The first `→ item1`: the stage holds one `.barcode-item` that is not `item0`; returns it. */
const other = (item0: Element | null) => {
	expect(kids()).toBe(1);
	const item1 = shown();
	expect(item1).not.toBe(item0);
	expect(item1?.classList.contains('barcode-item')).toBe(true);
	return item1;
};
/** `→ blank`: the stage holds nothing. */
const blank = () => expect(kids()).toBe(0);
/** Run `script` on a `{}` stepper, finish it with `next(); next()`, and return its summary. */
const record = (script: (s: Stepper) => void) => {
	const { s, summary } = make();
	script(s);
	s.next();
	s.next();
	return summary();
};

describe('createStepper', () => {
	// Stage and schedule

	it('builds one .step-stage holding item 0, reports (0, 2) and starts paused', () => {
		const { s, onIndex, item0 } = make();
		expect(container.children).toHaveLength(1);
		expect(container.firstElementChild!.classList.contains('step-stage')).toBe(true);
		showing(item0);
		expect(item0!.classList.contains('barcode-item')).toBe(true);
		expect(onIndex.mock.calls).toEqual([[0, 2]]);
		expect(s.isPlaying()).toBe(false);
		expect(pending).toBeNull();
	});

	it('swaps to item 1 once the counted ticks reach the dwell, at gap 0', () => {
		const { s, onIndex, item0 } = make({ dwellMs: 50 });
		s.play();
		ticks(0, 16, 32, 48);
		showing(item0);
		tick(64);
		other(item0);
		expect(onIndex).toHaveBeenLastCalledWith(1, 2);
	});

	it('blanks the stage for the gap, then shows item 1 and fires onIndex once', () => {
		const { s, onIndex, item0 } = make({ dwellMs: 50, gapMs: 30 });
		onIndex.mockClear();
		s.play();
		ticks(0, 16, 32, 48, 64);
		blank();
		expect(onIndex.mock.calls).toEqual([]);
		ticks(80, 96);
		other(item0);
		expect(onIndex.mock.calls).toEqual([[1, 2]]);
	});

	// Next and prev

	it('loop off: next() moves on, prev() stays on item 0, next() on the last code finishes once', () => {
		const { s, onFinish, onIndex, item0 } = make();
		onIndex.mockClear();
		s.prev();
		showing(item0);
		expect(onIndex.mock.calls).toEqual([[0, 2]]);
		s.next();
		const item1 = other(item0);
		expect(onIndex).toHaveBeenLastCalledWith(1, 2);
		expect(s.isPlaying()).toBe(false);
		s.play();
		s.next();
		expect(onFinish).toHaveBeenCalledTimes(1);
		expect(s.isPlaying()).toBe(false);
		onIndex.mockClear();
		s.next();
		s.prev();
		s.play();
		ticks(0, 16, 2000);
		showing(item1);
		expect(onIndex.mock.calls).toEqual([]);
		expect(onFinish).toHaveBeenCalledTimes(1);
		expect(s.isPlaying()).toBe(false);
	});

	it('loop on: next() on item 1 shows item 0, prev() on item 0 shows item 1, playing state kept', () => {
		const { s, item0 } = make({ loop: true });
		s.next();
		const item1 = other(item0);
		s.next();
		showing(item0);
		s.prev();
		showing(item1);
		expect(s.isPlaying()).toBe(false);
		s.play();
		s.next();
		s.prev();
		expect(s.isPlaying()).toBe(true);
	});

	it('in a gap, next() and prev() are relative to the code just shown', () => {
		const first = make({ dwellMs: 50, gapMs: 30 });
		first.s.play();
		ticks(0, 16, 32, 48, 64);
		blank();
		first.s.next();
		other(first.item0);
		expect(first.onIndex).toHaveBeenLastCalledWith(1, 2);
		first.s.destroy();

		const { s, item0 } = make({ dwellMs: 50, gapMs: 30, loop: true });
		s.next();
		s.play();
		ticks(0, 16, 32, 48, 64);
		blank();
		s.prev();
		showing(item0);
	});

	it('counts no time on the tick after next(), whatever its interval', () => {
		const { s, item0 } = make({ dwellMs: 50, loop: true });
		s.play();
		ticks(0, 16);
		s.next();
		const item1 = other(item0);
		ticks(116, 140, 165);
		showing(item1);
		tick(166);
		showing(item0);
	});

	// One valid code (Review Focus 1)

	it('loop off: finishes after one dwell, and next() finishes at once', () => {
		const first = make({ dwellMs: 50 }, one);
		first.s.play();
		ticks(0, 16, 32, 48);
		expect(first.onFinish).toHaveBeenCalledTimes(0);
		tick(64);
		expect(first.onFinish).toHaveBeenCalledTimes(1);
		expect(first.summary()).toMatchObject({ count: 1 });

		const { s, onFinish } = make({}, one);
		s.next();
		expect(onFinish).toHaveBeenCalledTimes(1);
	});

	it('loop on: never finishes, and next() shows the same code again', () => {
		const { s, onFinish, onIndex, item0 } = make({ dwellMs: 50, loop: true }, one);
		s.play();
		for (let t = 0; t <= 1600; t += 16) tick(t);
		s.next();
		showing(item0);
		expect(onIndex.mock.calls).toEqual([
			[0, 1],
			[0, 1]
		]);
		expect(onFinish).toHaveBeenCalledTimes(0);
		expect(s.isPlaying()).toBe(true);
	});

	// Finish and summary

	it('finishes once after the last dwell with loop off; restart() opens a second run, paused', () => {
		const { s, onFinish, onIndex, item0, summary } = make({ dwellMs: 50 });
		const nine = [0, 16, 32, 48, 64, 80, 96, 112, 128];
		s.play();
		ticks(...nine);
		expect(summary()).toEqual({
			count: 2,
			seconds: 0.13,
			frameMs: 16,
			stalls: 0,
			dwell: { first: 50, last: 50, changed: false },
			gap: { first: 0, last: 0, changed: false }
		});
		ticks(144, 160);
		s.play();
		s.next();
		s.prev();
		other(item0);
		expect(onFinish).toHaveBeenCalledTimes(1);
		onIndex.mockClear();
		s.restart();
		showing(item0);
		expect(onIndex.mock.calls).toEqual([[0, 2]]);
		expect(s.isPlaying()).toBe(false);
		s.play();
		ticks(...nine);
		expect(onFinish).toHaveBeenCalledTimes(2);
	});

	it('counts a 250 ms frame as 100 ms and a stall, outside frameMs, keeping the code', () => {
		const { s, item0, summary } = make();
		s.play();
		ticks(0, 16, 32, 48, 298);
		showing(item0);
		s.next();
		s.next();
		expect(summary()).toMatchObject({ seconds: 0.15, frameMs: 16, stalls: 1 });
	});

	it('counts a 10 000 ms frame as 100 ms and a stall, outside frameMs, keeping the code', () => {
		const { s, item0, summary } = make();
		s.play();
		ticks(0, 16, 32, 10032);
		showing(item0);
		s.next();
		s.next();
		expect(summary()).toMatchObject({ seconds: 0.13, frameMs: 16, stalls: 1 });
	});

	it('counts only clamped deltas while playing: a 1000 ms jump as 100, a paused span as nothing', () => {
		const { s, summary } = make();
		s.play();
		ticks(0, 16, 1016);
		s.pause();
		s.play();
		ticks(60000, 60016);
		s.next();
		s.next();
		expect(summary()).toMatchObject({ seconds: 0.13 });
	});

	// Run record, each from {} (dwell 1000, gap 0) and finished with next; next

	it('takes edits before the first play() as the start, and later ones as changes', () => {
		const dwellFirst = record((s) => {
			s.setDwell(300);
			s.play();
		});
		expect(dwellFirst.dwell).toEqual({ first: 300, last: 300, changed: false });
		const dwellLater = record((s) => {
			s.play();
			s.setDwell(300);
		});
		expect(dwellLater.dwell).toEqual({ first: 1000, last: 300, changed: true });
		const gapFirst = record((s) => {
			s.setGap(250);
			s.play();
		});
		expect(gapFirst.gap).toEqual({ first: 250, last: 250, changed: false });
		const gapLater = record((s) => {
			s.play();
			s.setGap(250);
		});
		expect(gapLater.gap).toEqual({ first: 0, last: 250, changed: true });
	});

	it('reports first === last and no change for a run finished by next() before any play()', () => {
		const { dwell, gap } = record((s) => {
			s.setDwell(300);
			s.setGap(100);
		});
		expect(dwell).toEqual({ first: 300, last: 300, changed: false });
		expect(gap).toEqual({ first: 100, last: 100, changed: false });
	});

	it('marks no change for setDwell or setGap to the value already set', () => {
		const { dwell, gap } = record((s) => {
			s.play();
			s.setDwell(1000);
			s.setGap(0);
		});
		expect(dwell).toEqual({ first: 1000, last: 1000, changed: false });
		expect(gap).toEqual({ first: 0, last: 0, changed: false });
	});

	// Live edits

	it('defers the swap when setDwell raises the dwell mid-dwell', () => {
		const { s, item0 } = make({ dwellMs: 50, loop: true });
		s.play();
		ticks(0, 16, 32);
		s.setDwell(100);
		ticks(48, 64, 96);
		showing(item0);
		tick(112);
		other(item0);
	});

	it('swaps on the next frame when setDwell lowers the dwell below the time spent', () => {
		const { s, item0 } = make({ loop: true });
		s.play();
		ticks(0, 100, 200);
		s.setDwell(50);
		tick(216);
		const item1 = other(item0);
		tick(265);
		showing(item1);
		tick(266);
		showing(item0);
	});

	it('shows the next code on the next frame after setGap(0) mid-gap', () => {
		const { s, item0 } = make({ dwellMs: 50, gapMs: 1000 });
		s.play();
		ticks(0, 16, 32, 48, 64, 80);
		blank();
		s.setGap(0);
		tick(96);
		other(item0);
	});

	it('ends a dwell lowered while paused below the time spent on the first frame after play()', () => {
		const { s, item0 } = make({ loop: true });
		s.play();
		ticks(0, 100, 200);
		s.pause();
		s.setDwell(50);
		s.play();
		tick(5000);
		other(item0);
	});

	it('applies setGap made during a dwell from the next gap; the dwell keeps its length', () => {
		const { s, item0 } = make({ dwellMs: 50, gapMs: 30, loop: true });
		s.play();
		ticks(0, 20);
		s.setGap(100);
		tick(40);
		showing(item0);
		tick(50);
		blank();
		tick(140);
		blank();
		tick(150);
		other(item0);
	});

	it('applies setDwell made during a gap from the next dwell; the gap keeps its length', () => {
		const { s, item0 } = make({ dwellMs: 50, gapMs: 30, loop: true });
		s.play();
		ticks(0, 50, 60);
		blank();
		s.setDwell(200);
		tick(70);
		blank();
		tick(80);
		const item1 = other(item0);
		ticks(180, 279);
		showing(item1);
		tick(280);
		blank();
	});

	// Restart, pause and destroy

	it('restart() keeps the playing state and the live dwell and gap', () => {
		const { s, item0 } = make({ loop: true });
		s.setDwell(300);
		s.setGap(100);
		s.play();
		ticks(0, 100);
		s.next();
		s.restart();
		showing(item0);
		expect(s.isPlaying()).toBe(true);
		ticks(1000, 1100, 1200, 1299);
		showing(item0);
		tick(1300);
		blank();
		ticks(1350, 1399);
		blank();
		tick(1400);
		other(item0);
		s.pause();
		s.restart();
		showing(item0);
		expect(s.isPlaying()).toBe(false);
	});

	it('pause() cancels the pending frame and keeps the stage; play() resumes the same phase', () => {
		const { s, item0 } = make({ dwellMs: 200 });
		s.play();
		ticks(0, 100);
		s.pause();
		expect(cancel).toHaveBeenLastCalledWith(nextId);
		showing(item0);
		expect(s.isPlaying()).toBe(false);
		s.play();
		ticks(5000, 5099);
		showing(item0);
		tick(5100);
		other(item0);
	});

	it('destroy() cancels the pending frame, and nothing fires afterwards', () => {
		const { s, onFinish, onIndex, item0 } = make({ dwellMs: 50 });
		s.play();
		tick(0);
		s.destroy();
		expect(cancel).toHaveBeenLastCalledWith(nextId);
		onIndex.mockClear();
		ticks(100, 200, 300);
		showing(item0);
		expect(onIndex.mock.calls).toEqual([]);
		expect(onFinish).toHaveBeenCalledTimes(0);
	});
});

describe('createStepper frame requests', () => {
	// A counting fake: every request is kept, so a doubled request shows as two pending callbacks.
	let pending: FrameRequestCallback[];
	const caf = vi.fn();
	beforeEach(() => {
		pending = [];
		caf.mockClear();
		globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => pending.push(cb); // index + 1
		globalThis.cancelAnimationFrame = caf;
	});
	afterEach(() => {
		globalThis.requestAnimationFrame = realRaf;
		globalThis.cancelAnimationFrame = realCaf;
	});
	/** Run the oldest pending callback at each `ts`, one per tick. */
	const run = (...ts: number[]) => ts.forEach((t) => pending.shift()?.(t));

	it('requests one frame for play() called twice and none while paused', () => {
		const { s } = make();
		expect(pending).toHaveLength(0);
		s.play();
		s.play();
		expect(pending).toHaveLength(1);
		s.pause();
		expect(caf).toHaveBeenCalledTimes(1);
		expect(caf).toHaveBeenCalledWith(1);
		run(0); // a frame that fires after pause() requests nothing
		expect(pending).toHaveLength(0);
	});

	it('toggle() flips isPlaying()', () => {
		const { s } = make();
		s.toggle();
		expect(s.isPlaying()).toBe(true);
		expect(pending).toHaveLength(1);
		s.toggle();
		expect(s.isPlaying()).toBe(false);
		expect(caf).toHaveBeenLastCalledWith(1);
	});

	it('requests exactly one next frame when an onIndex handler pauses and plays during a frame', () => {
		const { s, onIndex } = make({ dwellMs: 50 });
		onIndex.mockImplementation((index) => {
			if (index !== 1) return;
			s.pause();
			s.play();
		});
		s.play();
		run(0, 16, 32, 48, 64);
		expect(onIndex).toHaveBeenLastCalledWith(1, 2);
		expect(pending).toHaveLength(1);
		expect(s.isPlaying()).toBe(true);
	});

	it('requests no frame when an onIndex handler pauses during a frame', () => {
		const { s, onIndex } = make({ dwellMs: 50 });
		onIndex.mockImplementation((index) => {
			if (index === 1) s.pause();
		});
		s.play();
		run(0, 16, 32, 48, 64);
		expect(onIndex).toHaveBeenLastCalledWith(1, 2);
		expect(pending).toHaveLength(0);
		expect(s.isPlaying()).toBe(false);
	});
});

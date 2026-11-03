import { describe, it, expect } from 'vitest';
import { formatFinishMessage, formatStepFinishMessage } from './finish';
import type { StepSummary } from './stepper';

describe('formatFinishMessage', () => {
	it('formats the finish copy exactly', () => {
		expect(formatFinishMessage(3, 12.4)).toBe('Finished scrolling 3 barcodes in 12.4 seconds');
	});
});

describe('formatStepFinishMessage', () => {
	const once = (ms: number) => ({ first: ms, last: ms, changed: false });
	const changed = (first: number, last: number) => ({ first, last, changed: true });

	it.each<[StepSummary, string]>([
		[
			{ count: 20, seconds: 24.75, frameMs: 16.667, stalls: 0, dwell: once(1000), gap: once(250) },
			'Finished stepping 20 barcodes in 24.75 seconds at 1.00 s dwell, 0.25 s gap. Display about 60 Hz.'
		],
		[
			{
				count: 20,
				seconds: 13,
				frameMs: 16.667,
				stalls: 2,
				dwell: changed(1000, 300),
				gap: once(0)
			},
			'Finished stepping 20 barcodes in 13.00 seconds at dwell changed from 1.00 s to 0.30 s. Display about 60 Hz, 2 frames over 100 ms.'
		],
		[
			{ count: 3, seconds: 3, frameMs: 20, stalls: 1, dwell: once(1000), gap: changed(0, 250) },
			'Finished stepping 3 barcodes in 3.00 seconds at 1.00 s dwell, gap changed from 0.00 s to 0.25 s. Display about 50 Hz, 1 frame over 100 ms.'
		],
		[
			{ count: 2, seconds: 0, frameMs: 0, stalls: 0, dwell: once(500), gap: once(250) },
			'Finished stepping 2 barcodes in 0.00 seconds at 0.50 s dwell, 0.25 s gap.'
		]
	])('formats summary %#', (summary, message) => {
		expect(formatStepFinishMessage(summary)).toBe(message);
	});

	it('reports a change even when the dwell ends where it started (1000, 300, then 1000)', () => {
		const summary: StepSummary = {
			...{ count: 20, seconds: 20, frameMs: 16.667, stalls: 0 },
			...{ dwell: changed(1000, 1000), gap: once(0) }
		};
		expect(formatStepFinishMessage(summary)).toContain('at dwell changed from 1.00 s to 1.00 s');
	});
});

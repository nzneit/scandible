import { describe, it, expect } from 'vitest';
import { finishStats, formatFinishMessage, formatStepFinishMessage } from './finish';
import type { Stat } from './finish';
import type { StepSummary } from './stepper';

const once = (ms: number) => ({ first: ms, last: ms, changed: false });
const changed = (first: number, last: number) => ({ first, last, changed: true });

describe('formatFinishMessage', () => {
	it('formats the finish copy exactly', () => {
		expect(formatFinishMessage(3, 12.4)).toBe('Finished scrolling 3 barcodes in 12.4 seconds');
	});
});

describe('formatStepFinishMessage', () => {
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

describe('finishStats', () => {
	const step = (over: Partial<StepSummary> = {}) =>
		finishStats({
			mode: 'step',
			summary: {
				count: 5,
				seconds: 9.51,
				frameMs: 15.625,
				stalls: 0,
				dwell: once(1000),
				gap: once(0),
				...over
			}
		});
	const stat = (stats: Stat[], title: string) => stats.find((s) => s.title === title);

	it.each([
		[9.5, '9.5 s'],
		[10, '10 s']
	])(
		'gives a Scroll run of %s s its count and playback time, and no conditions',
		(seconds, text) => {
			expect(finishStats({ mode: 'scroll', count: 5, seconds })).toEqual({
				result: [
					{ title: 'Barcodes', value: '5' },
					{ title: 'Playback time', value: text }
				],
				conditions: []
			});
		}
	);

	it('gives a Step run its count and its time to the hundredth', () => {
		expect(step({ count: 20, seconds: 13 }).result).toEqual([
			{ title: 'Barcodes', value: '20' },
			{ title: 'Playback time', value: '13.00 s' }
		]);
	});

	it.each<[string, Partial<StepSummary>, Stat]>([
		['an unchanged dwell', { dwell: once(1000) }, { title: 'Dwell', value: '1.00 s' }],
		[
			'a changed dwell',
			{ dwell: changed(1000, 1750) },
			{ title: 'Dwell', value: '1.75 s', desc: 'changed from 1.00 s' }
		],
		['a 0 gap', { gap: once(0) }, { title: 'Gap', value: '0.00 s' }],
		[
			'a changed gap',
			{ gap: changed(0, 170) },
			{ title: 'Gap', value: '0.17 s', desc: 'changed from 0.00 s' }
		]
	])('shows %s', (_name, over, expected) => {
		expect(stat(step(over).conditions, expected.title)).toEqual(expected);
	});

	it.each<[number, number, Stat | undefined]>([
		[0, 0, undefined],
		[15.625, 0, { title: 'Refresh rate', value: '64 Hz' }],
		[15.625, 1, { title: 'Refresh rate', value: '64 Hz', desc: '1 frame took over 100 ms' }],
		[15.625, 2, { title: 'Refresh rate', value: '64 Hz', desc: '2 frames took over 100 ms' }]
	])('with frameMs %s and %s stalls gives the refresh rate %j', (frameMs, stalls, refresh) => {
		const { conditions } = step({ frameMs, stalls });
		expect(stat(conditions, 'Refresh rate')).toEqual(refresh);
		expect(conditions.map((s) => s.title)).toEqual(
			refresh ? ['Dwell', 'Gap', 'Refresh rate'] : ['Dwell', 'Gap']
		);
	});

	it('puts every Step stat value in the status sentence too', () => {
		const summary: StepSummary = {
			count: 5,
			seconds: 9.51,
			frameMs: 15.625,
			stalls: 2,
			dwell: changed(1000, 1750),
			gap: changed(0, 170)
		};
		const { result, conditions } = finishStats({ mode: 'step', summary });
		expect(result).toEqual([
			{ title: 'Barcodes', value: '5' },
			{ title: 'Playback time', value: '9.51 s' }
		]);
		expect(conditions).toEqual([
			{ title: 'Dwell', value: '1.75 s', desc: 'changed from 1.00 s' },
			{ title: 'Gap', value: '0.17 s', desc: 'changed from 0.00 s' },
			{ title: 'Refresh rate', value: '64 Hz', desc: '2 frames took over 100 ms' }
		]);
		const message = formatStepFinishMessage(summary);
		for (const s of [...result, ...conditions]) expect(message).toContain(s.value);
	});
});

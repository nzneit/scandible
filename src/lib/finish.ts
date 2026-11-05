import { formatSeconds } from './seconds';
import type { StepSummary } from './stepper';

/** Finish-screen copy. Kept in $lib so the play route and tests share one source. */
export function formatFinishMessage(count: number, seconds: number): string {
	return `Finished scrolling ${count} barcodes in ${seconds} seconds`;
}

/** Step-mode finish copy: the run record. "barcodes" is not pluralised, as in the scroll copy. */
export function formatStepFinishMessage(summary: StepSummary): string {
	const { count, seconds, frameMs, stalls, dwell, gap } = summary;
	const f = formatSeconds;
	const dwellClause = dwell.changed
		? ` at dwell changed from ${f(dwell.first)} to ${f(dwell.last)}`
		: ` at ${f(dwell.last)} dwell`;
	const gapClause = gap.changed
		? `, gap changed from ${f(gap.first)} to ${f(gap.last)}`
		: gap.last > 0
			? `, ${f(gap.last)} gap`
			: '';
	let message =
		`Finished stepping ${count} barcodes in ${seconds.toFixed(2)} seconds` +
		`${dwellClause}${gapClause}.`;
	if (frameMs > 0) {
		message += ` Display about ${Math.round(1000 / frameMs)} Hz`;
		if (stalls > 0) message += `, ${stalls} ${stalls === 1 ? 'frame' : 'frames'} over 100 ms`;
		message += '.';
	}
	return message;
}

export interface Stat {
	title: string;
	value: string;
	desc?: string;
}

export type FinishedRun =
	{ mode: 'scroll'; count: number; seconds: number } | { mode: 'step'; summary: StepSummary };

/** The finish screen's stats: `result` is tier 1, `conditions` tier 2 (empty for Scroll). */
export function finishStats(run: FinishedRun): { result: Stat[]; conditions: Stat[] } {
	if (run.mode === 'scroll') {
		return {
			result: [
				{ title: 'Barcodes', value: String(run.count) },
				{ title: 'Playback time', value: `${run.seconds} s` }
			],
			conditions: []
		};
	}
	const { count, seconds, frameMs, stalls, dwell, gap } = run.summary;
	const timed = (title: string, t: { first: number; last: number; changed: boolean }): Stat => {
		const stat: Stat = { title, value: formatSeconds(t.last) };
		if (t.changed) stat.desc = `changed from ${formatSeconds(t.first)}`;
		return stat;
	};
	const conditions = [timed('Dwell', dwell), timed('Gap', gap)];
	if (frameMs > 0) {
		const refresh: Stat = { title: 'Refresh rate', value: `${Math.round(1000 / frameMs)} Hz` };
		if (stalls > 0) {
			refresh.desc = `${stalls} ${stalls === 1 ? 'frame' : 'frames'} took over 100 ms`;
		}
		conditions.push(refresh);
	}
	return {
		result: [
			{ title: 'Barcodes', value: String(count) },
			{ title: 'Playback time', value: `${seconds.toFixed(2)} s` }
		],
		conditions
	};
}

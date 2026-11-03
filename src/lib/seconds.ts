/** Shows milliseconds as seconds to two decimals, e.g. 250 as `0.25 s`. */
export function formatSeconds(ms: number): string {
	return (ms / 1000).toFixed(2) + ' s';
}

/** Parses typed seconds to milliseconds snapped to the range grid and clamped, or null. */
export function parseSeconds(
	text: string,
	range: { min: number; max: number; step: number }
): number | null {
	const trimmed = text.trim();
	if (trimmed === '') return null;
	const n = Number(trimmed);
	if (!Number.isFinite(n)) return null;
	const ms = Math.round(n * 1000);
	const snapped = Math.round((ms - range.min) / range.step) * range.step + range.min;
	return Math.min(range.max, Math.max(range.min, snapped));
}

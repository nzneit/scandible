/** Advance the scroll offset by one frame. Pure — no DOM, no time source.
 *  deltaMs is MILLISECONDS (already clamped by the caller). */
export function advanceOffset(
	offset: number,
	speedPxPerSec: number,
	deltaMs: number,
	contentHeight: number,
	loop: boolean
): number {
	const delta = speedPxPerSec * (deltaMs / 1000);
	const next = offset + delta;
	if (loop) {
		return contentHeight > 0 ? next % contentHeight : 0;
	}
	return Math.min(next, contentHeight);
}

/** True when a non-looping scroll has reached the end (offset >= contentHeight). */
export function isAtEnd(offset: number, contentHeight: number, loop: boolean): boolean {
	return !loop && offset >= contentHeight;
}

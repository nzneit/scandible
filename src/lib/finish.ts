/** Finish-screen copy. Kept in $lib so the play route and tests share one source. */
export function formatFinishMessage(count: number, seconds: number): string {
	return `Finished scrolling ${count} barcodes in ${seconds} seconds`;
}

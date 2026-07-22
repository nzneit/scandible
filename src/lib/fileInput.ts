/** Read an uploaded .txt/.csv File as text via FileReader. Rejects on read error.
 *  The text simply fills the setup textarea; tokenization is then whatever the
 *  selected format dictates (for text formats, commas in a .csv are data, not
 *  separators — no column semantics either way). */
export function readCodesFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
		reader.readAsText(file);
	});
}

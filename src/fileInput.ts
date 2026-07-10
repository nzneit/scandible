/** Read an uploaded .txt/.csv File as text via FileReader. Rejects on read error.
 *  The returned text is fed to upc.tokenizeUpcInput — CSV is treated as plain
 *  comma/newline-separated tokens (no column semantics). */
export function readUpcFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsText(file);
  });
}

import { isRenderableUpc } from './barcode';
import type { UpcEntry } from './types';

/** Split raw text into cleaned tokens: split on newlines AND commas, trim each,
 *  drop empties. Order and duplicates preserved. */
export function tokenizeUpcInput(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function normalize(token: string): string {
  return token.trim().replace(/\s+/g, '');
}

/** Tokenize + normalize + validate each token. */
export function parseUpcList(raw: string): UpcEntry[] {
  return tokenizeUpcInput(raw).map((token) => {
    const value = normalize(token);
    return { raw: token, value, valid: isRenderableUpc(value) };
  });
}

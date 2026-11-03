import { engine as bwipEngine } from './engines/bwipjs';
import { engine as jsbarcodeEngine } from './engines/jsbarcode';
import type { CheckResult } from './engines/types';
import { FORMAT_BY_ID, isEccChoice, type FormatDescriptor, type FormatId } from './formats';
import type { CodeEntry, SymbolOptions } from './types';

export interface ListOptions {
	format: FormatId;
	ecc: string;
}

/** Three layers. The list-level ecc applies only when the entry's format IS the list format.
 *  Formats without `ecc` resolve to {}. Each layer is used only if isEccChoice accepts it. */
export function resolveOptions(
	d: FormatDescriptor,
	list: ListOptions,
	override?: SymbolOptions
): SymbolOptions {
	if (!d.ecc) return {};
	const layers = [override?.ecc, d.id === list.format ? list.ecc : undefined, d.ecc.defaultValue];
	return { ecc: layers.find((v) => isEccChoice(d, v)) };
}

/** Dispatch on engine. Unknown format or '' → { valid: false } (existing guards). Does NOT
 *  resolve options: callers pass resolved options. */
export function checkCode(
	value: string,
	format: FormatId,
	options: SymbolOptions = {}
): CheckResult {
	const d = FORMAT_BY_ID.get(format);
	if (!d) return { valid: false };
	// Explicit guard: MSI checksum encoders would checksum '' into '0'/'00' and accept it.
	if (value === '') return { valid: false };
	if (d.engine === 'jsbarcode') return jsbarcodeEngine.check(d, value, options);
	return bwipEngine.check(d, value, options);
}

/** The per-row seam. `token` is one trimmed, non-empty, UNCLEANED token. Sets raw = token;
 *  value = descriptor.normalize?.(token) ?? (numeric ? strip all whitespace : token);
 *  options = resolveOptions(...); then checkCode. */
export function buildEntry(
	token: string,
	format: FormatId,
	list: ListOptions,
	override?: SymbolOptions
): CodeEntry {
	const d = FORMAT_BY_ID.get(format);
	const numeric = d?.numeric ?? true;
	const value = d?.normalize?.(token) ?? (numeric ? token.replace(/\s+/g, '') : token);
	const options = d ? resolveOptions(d, list, override) : {};
	// The CheckResult spreads in whole: `valid`, plus `encoded` and `facts` when valid or
	// `reason` when not, so a field the engine leaves out stays absent on the entry.
	return { raw: token, value, format, options, ...checkCode(value, format, options) };
}

/** Split (newline; plus comma for numeric formats) → trim → drop empties. An unknown format
 *  splits as numeric, as parseCodeList always has. Text formats split on newlines only:
 *  internal spaces and commas are data. */
export function tokenize(text: string, format: FormatId): string[] {
	const numeric = FORMAT_BY_ID.get(format)?.numeric ?? true;
	return text
		.split(numeric ? /[\n,]/ : /\n/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
}

/** One entry per `tokenize` token, cleaned and validated for one format (numeric formats
 *  strip internal whitespace). Empty tokens are dropped before cleanup, so no CodeEntry ever
 *  has an empty value. */
export function parseCodeList(raw: string, format: FormatId, ecc = ''): CodeEntry[] {
	return tokenize(raw, format).map((token) => buildEntry(token, format, { format, ecc }));
}

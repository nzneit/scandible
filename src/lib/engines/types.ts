import type { FormatDescriptor } from '$lib/formats';
import type { SymbolFacts, SymbolOptions } from '$lib/types'; // see _Entries, options and facts_

export type CheckResult =
	{ valid: true; encoded?: string; facts?: SymbolFacts } | { valid: false; reason?: 'too-long' };

/** What every engine module exports, for its own descriptor type. */
export interface Engine<D extends FormatDescriptor> {
	check(d: D, value: string, options: SymbolOptions): CheckResult;
	render(d: D, value: string, options: SymbolOptions): SVGElement;
}

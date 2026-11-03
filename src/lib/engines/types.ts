import type { FormatDescriptor } from '$lib/formats';
import type { Gs1Data } from '$lib/gs1';
import type { SymbolFacts, SymbolOptions } from '$lib/types'; // see _Entries, options and facts_

export type CheckResult =
	| { valid: true; encoded?: string; facts?: SymbolFacts; gs1?: Gs1Data; lint?: string }
	| { valid: false; reason?: 'too-long'; message?: string };

/** What every engine module exports, for its own descriptor type. */
export interface Engine<D extends FormatDescriptor> {
	check(d: D, value: string, options: SymbolOptions): CheckResult;
	render(d: D, value: string, options: SymbolOptions): SVGElement;
}

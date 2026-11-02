import { DEFAULT_FORMAT, type FormatId } from './formats';

export interface SymbolOptions {
	ecc?: string; // present only for formats whose descriptor declares `ecc`
}

export interface SymbolFacts {
	bytes: number; // UTF-8 byte length of `value`
	cols: number; // symbol width in modules (PDF417: X-modules)
	rows: number; // symbol height in modules (PDF417: rows)
	summary: string; // "21×21 modules" or "2 columns × 8 rows" (PDF417)
	dense: boolean; // cols > descriptor.denseAbove
}

/** One parsed input entry. */
export interface CodeEntry {
	raw: string; // original token exactly as entered (post-trim)
	value: string; // cleaned per format (numeric: whitespace stripped; text: raw)
	format: FormatId; // the format this entry validates and renders with
	options: SymbolOptions; // resolved: override → list setting → descriptor default
	valid: boolean; // whether this entry's format accepts `value`
	encoded?: string; // 1D only, present when valid: the value the barcode actually carries
	facts?: SymbolFacts; // 2D only, present when valid; absent on invalid entries
	reason?: 'too-long'; // present when invalid because the payload exceeds symbol capacity
}

/** Playback settings, round-tripped through the share URL. */
export interface Settings {
	speedPxPerSec: number; // scroll speed in CSS px per second
	loop: boolean; // wrap at end vs. stop
	rotate: boolean; // random per-barcode rotation on/off
	rotateMaxDeg: number; // max |degrees| for rotation (slider 1–30)
	skew: boolean; // random per-barcode skewX (slant) on/off
	skewMaxDeg: number; // max |degrees| for slant (slider 1–30)
	seed: number; // uint32 PRNG seed — shared by both axes; makes the arrangement reproducible
	format: FormatId; // barcode symbology applied to the whole list
	ecc: string; // list-level error-correction choice value for `format`; '' = the format's default
}

/** Single source of truth for defaults; used to fill Partial<Settings>. */
export const DEFAULT_SETTINGS: Settings = {
	speedPxPerSec: 60,
	loop: false,
	rotate: false,
	rotateMaxDeg: 8,
	skew: false,
	skewMaxDeg: 8,
	seed: 0,
	format: DEFAULT_FORMAT,
	ecc: ''
};

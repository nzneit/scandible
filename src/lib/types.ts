import { DEFAULT_FORMAT, type FormatId } from './formats';

/** One parsed input entry. */
export interface CodeEntry {
	raw: string; // original token exactly as entered (post-trim)
	value: string; // cleaned per format (numeric: whitespace stripped; text: raw)
	valid: boolean; // whether the selected format's encoder accepts `value`
	encoded?: string; // present when valid: the value the barcode actually carries
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
	format: DEFAULT_FORMAT
};

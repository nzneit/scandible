import { DEFAULT_FORMAT, type FormatId } from './formats';
import type { Gs1Data } from './gs1';

export interface SymbolOptions {
	ecc?: string; // present only for formats whose descriptor declares `ecc`
	lax?: boolean; // present only for GS1 formats; true renders data that fails lint
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
	gs1?: Gs1Data; // GS1 only, present when valid: the AIM identifier and the data the symbol carries
	lint?: string; // GS1 only: the BWIPP lint text when the row renders anyway under lax
	fromScan?: { aim?: string }; // GS1 only: the token was read as raw scan data; aim is the identifier it began with
	message?: string; // GS1 only, present when invalid with a BWIPP text or a read-step refusal
}

export type PlaybackMode = 'scroll' | 'step';

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
	lax: boolean; // render GS1 data that fails validation; canonical: true only for a GS1 format
	mode: PlaybackMode; // 'scroll' moves the column; 'step' shows one code at a time
	dwellMs: number; // step mode: ms each code stays on screen, within DWELL_RANGE
	gapMs: number; // step mode: ms of blank screen between codes, within GAP_RANGE; 0 = instant
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
	ecc: '',
	lax: false,
	mode: 'scroll',
	dwellMs: 1000,
	gapMs: 0
};

// The only statement of the step ranges: the codec, the setup page and the play page read them.
export const DWELL_RANGE = { min: 50, max: 5000, step: 10 } as const;
export const GAP_RANGE = { min: 0, max: 2000, step: 10 } as const;

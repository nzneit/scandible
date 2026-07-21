/** One parsed input entry. */
export interface UpcEntry {
	raw: string; // original token exactly as entered (post-trim)
	value: string; // normalized: raw.trim() with all internal whitespace removed
	valid: boolean; // isRenderableUpc(value) — whether JsBarcode renders it as UPC
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
}

/** Single source of truth for defaults; used to fill Partial<Settings>. */
export const DEFAULT_SETTINGS: Settings = {
	speedPxPerSec: 60,
	loop: false,
	rotate: false,
	rotateMaxDeg: 8,
	skew: false,
	skewMaxDeg: 8,
	seed: 0
};

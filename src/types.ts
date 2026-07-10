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
  skew: boolean; // random per-barcode rotation + shear
  skewMaxDeg: number; // max |degrees| for rotation and shear (slider 1–30)
  skewSeed: number; // uint32 PRNG seed — makes the skew arrangement reproducible
}

/** Single source of truth for defaults; used to fill Partial<Settings>. */
export const DEFAULT_SETTINGS: Settings = {
  speedPxPerSec: 60,
  loop: false,
  skew: false,
  skewMaxDeg: 8,
  skewSeed: 0,
};

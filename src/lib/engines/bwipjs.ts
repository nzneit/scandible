import { qrcode, datamatrix, pdf417, azteccode, drawingSVG } from 'bwip-js/browser';
import type { BwipDescriptor } from '$lib/formats';
import type { SymbolOptions } from '$lib/types';
import type { CheckResult, Engine } from './types';

export const ENCODERS = { qrcode, datamatrix, pdf417, azteccode } as const;

/** Maps a descriptor's ecc choice value to BWIPP options. fixedeclevel stops BWIPP from
 *  raising (QR) or adjusting (PDF417) the level behind the user's back. */
export const ECC_OPTIONS: Record<
	keyof typeof ENCODERS,
	(value: string) => Record<string, unknown>
> = {
	qrcode: (v) => ({ eclevel: v, fixedeclevel: true }),
	datamatrix: () => ({}),
	pdf417: (v) => (v === 'auto' ? {} : { eclevel: Number(v), fixedeclevel: true }),
	azteccode: (v) => ({ eclevel: Number(v) })
};

const QUIET_ZONE_PX = 8; // 4 modules at 2 px/module for matrix codes; 8 X-modules for PDF417 (≥ 2 required)
const NATURAL_PX = 1024; // longer side of the SVG's natural size; CSS max-* only ever shrink it

/** Every BWIPP name that means "the payload does not fit". The name depends on the payload's
 *  length band, so each symbology has several (measurements file, Appendix B). */
export const TOO_LONG: ReadonlySet<string> = new Set([
	'qrcodeNoValidSymbol',
	'qrcodeInputTooLong',
	'qrcodeInputTooLarge',
	'datamatrixTooMuchData',
	'datamatrixInputTooLong',
	'datamatrixNoValidSymbol',
	'pdf417inputTooLong',
	'pdf417dataTooLong',
	'pdf417insufficientCapacity',
	'azteccodeInputTooLong',
	'azteccodeInputTooLarge',
	'aztecNoValidSymbol'
]);

/** Stable part of a BWIPP error: `bwipp.<errorName>`. The `#NNNNN` suffix is a source line
 *  number that changes between bwip-js versions. */
export function bwippErrorName(message: string): string | undefined {
	return /^bwipp\.([A-Za-z0-9]+)/.exec(message)?.[1];
}

interface Encoded {
	svg: string;
	cols: number;
	rows: number;
}

type CacheEntry = { ok: true; result: Encoded } | { ok: false; error: unknown };

/** The cache keeps whole SVG strings, so the bound is on retained characters (key plus SVG
 *  text), not entries: a list has to retain more than this before a clear can thrash, and
 *  encoding such a list already takes longer per keystroke than any cache saves. */
export const CACHE_BUDGET_CHARS = 32 * 1024 * 1024;

const cache = new Map<string, CacheEntry>();
let cacheChars = 0;

/** One encode, memoised by bcid + ecc + value, failures included: an over-capacity line must
 *  not re-encode on every keystroke. Rethrows the cached error on a hit. The cache is cleared
 *  when the retained text would pass CACHE_BUDGET_CHARS; below the budget a keystroke
 *  re-encodes only the edited line. */
function encode(d: BwipDescriptor, value: string, options: SymbolOptions): Encoded {
	const key = `${d.bcid}\u0000${options.ecc ?? ''}\u0000${value}`;
	let entry = cache.get(key);
	if (entry === undefined) {
		entry = tryEncode(d, value, options);
		const cost = key.length + (entry.ok ? entry.result.svg.length : 0);
		if (cacheChars + cost > CACHE_BUDGET_CHARS) {
			cache.clear();
			cacheChars = 0;
		}
		cache.set(key, entry);
		cacheChars += cost;
	}
	if (entry.ok) return entry.result;
	throw entry.error;
}

/** `init(width, height)` on the drawing receives the symbol's pixel size WITHOUT padding
 *  (measured), so module counts are width/modulePx.x and height/modulePx.y. Spreading
 *  drawingSVG() and overriding init is the measured, tree-shake-friendly way to learn the size;
 *  the default export's raw() would pull in every encoder. drawingSVG's methods are own closure
 *  properties, so the spread keeps them working. Captures whatever bwip-js throws. */
function tryEncode(d: BwipDescriptor, value: string, options: SymbolOptions): CacheEntry {
	let w = 0;
	let h = 0;
	const base = drawingSVG();
	const drawing = {
		...base,
		init(W: number, H: number) {
			w = W;
			h = H;
			base.init(W, H); // runtime also passes two text-scale args; they are unused for these symbologies
		}
	};
	const extra: Record<string, unknown> =
		d.ecc && options.ecc !== undefined ? ECC_OPTIONS[d.bcid](options.ecc) : {};
	try {
		// `...extra` first: the fixed keys below must win over anything the ecc mapping returns.
		const svg = ENCODERS[d.bcid](
			{ ...extra, bcid: d.bcid, text: value, scale: 1, padding: QUIET_ZONE_PX },
			drawing
		);
		return { ok: true, result: { svg, cols: w / d.modulePx.x, rows: h / d.modulePx.y } };
	} catch (error) {
		return { ok: false, error };
	}
}

function summary(d: BwipDescriptor, cols: number, rows: number): string {
	// PDF417 width is 17 × (dataColumns + 4) + 1 X-modules, so dataColumns = (cols − 69) / 17.
	return d.bcid === 'pdf417'
		? `${(cols - 69) / 17} columns × ${rows} rows`
		: `${cols}×${rows} modules`;
}

export function check(d: BwipDescriptor, value: string, options: SymbolOptions): CheckResult {
	try {
		const { cols, rows } = encode(d, value, options);
		const bytes = new TextEncoder().encode(value).length;
		return {
			valid: true,
			facts: { bytes, cols, rows, summary: summary(d, cols, rows), dense: cols > d.denseAbove }
		};
	} catch (e) {
		const name = e instanceof Error ? bwippErrorName(e.message) : undefined;
		return name !== undefined && TOO_LONG.has(name)
			? { valid: false, reason: 'too-long' }
			: { valid: false };
	}
}

export function render(d: BwipDescriptor, value: string, options: SymbolOptions): SVGElement {
	const { svg } = encode(d, value, options);
	const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
	const el = document.importNode(doc.documentElement, true) as unknown as SVGElement;
	if (el.nodeName !== 'svg') throw new Error('bwip-js produced invalid SVG'); // e.g. 4.11.3's malformed fill-rule
	// viewBox is always exactly "0 0 W H" and INCLUDES the padding (QR hello world: 58×58).
	const [vw, vh] = (el.getAttribute('viewBox') ?? '0 0 1 1').split(' ').slice(2).map(Number);
	const k = NATURAL_PX / Math.max(vw, vh);
	el.setAttribute('width', String(Math.round(vw * k)));
	el.setAttribute('height', String(Math.round(vh * k)));
	return el;
}

export const engine: Engine<BwipDescriptor> = { check, render };

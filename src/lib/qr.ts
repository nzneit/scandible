import { encode, renderSVG } from 'uqr';

const QR_DENSE_VERSION = 20; // tunable; higher version = denser = harder to scan phone-to-phone

export type QrEcc = 'L' | 'M' | 'Q' | 'H';

/** ISO/IEC 18004 version 40, byte mode. */
export const QR_CAPACITY_BYTES: Record<QrEcc, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };

export type QrStatus =
	| { kind: 'fits' }
	| { kind: 'dense' }
	| { kind: 'too-long'; ecc: QrEcc; length: number; capacity: number };

/** How `text` fares as a QR at error-correction level `ecc`: `dense` when the selected
 *  version is above QR_DENSE_VERSION (hard to scan phone-to-phone), `too-long` when the
 *  text exceeds the level's capacity, else `fits`. Never throws. */
export function qrStatus(text: string, ecc: QrEcc): QrStatus {
	try {
		const { version } = encode(text, { ecc }); // where over-capacity surfaces
		return version > QR_DENSE_VERSION ? { kind: 'dense' } : { kind: 'fits' };
	} catch {
		return { kind: 'too-long', ecc, length: text.length, capacity: QR_CAPACITY_BYTES[ecc] };
	}
}

/** Encode `text` as a QR SVG string at error-correction level `ecc`, or `null` when it does
 *  not fit. Density is `qrStatus`'s job. Deterministic and pure. */
export function buildQrSvg(text: string, ecc: QrEcc): string | null {
	try {
		return renderSVG(text, { ecc, border: 2 }); // quiet zone = 2 modules; default white background
	} catch {
		return null;
	}
}

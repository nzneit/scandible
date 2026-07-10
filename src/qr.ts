import { encode, renderSVG } from 'uqr';

const QR_DENSE_VERSION = 20; // tunable; higher version = denser = harder to scan phone-to-phone

export type QrResult =
  | { ok: true; svg: string; dense: boolean }
  | { ok: false; tooLong: true };

/** Encode `text` as a QR SVG string. Error-correction level M balances capacity
 *  against robustness to screen glare. Returns `dense: true` when the selected
 *  version is very high (hard to scan phone-to-phone), and `{ ok: false,
 *  tooLong: true }` when the text exceeds QR capacity. Deterministic and pure. */
export function buildQrSvg(text: string): QrResult {
  try {
    const { version } = encode(text, { ecc: 'M' });       // where over-capacity surfaces
    const svg = renderSVG(text, { ecc: 'M', border: 2 }); // quiet zone = 2 modules; default white background
    return { ok: true, svg, dense: version > QR_DENSE_VERSION };
  } catch {
    return { ok: false, tooLong: true };
  }
}

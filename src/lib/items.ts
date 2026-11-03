import { renderBarcodeSvg } from './barcode';
import { FORMAT_BY_ID } from './formats';
import { buildTransforms } from './transforms';
import type { CodeEntry, Settings } from './types';

/** One `div.barcode-item` per entry, in order. Callers pass only valid entries. */
export function buildItems(valid: CodeEntry[], settings: Settings): HTMLElement[] {
	const transforms =
		settings.rotate || settings.skew
			? buildTransforms(
					valid.length,
					{
						rotate: settings.rotate,
						rotateMaxDeg: settings.rotateMaxDeg,
						skew: settings.skew,
						skewMaxDeg: settings.skewMaxDeg
					},
					settings.seed
				)
			: null;

	return valid.map((e, i) => {
		const item = document.createElement('div');
		item.className = 'barcode-item';
		const d = FORMAT_BY_ID.get(e.format);
		if (d?.engine === 'bwipjs') {
			if (d.shape === '2d') item.classList.add('barcode-item--2d');
			item.classList.add(`barcode-item--${e.format}`);
		}
		if (transforms) item.style.transform = transforms[i];
		item.appendChild(renderBarcodeSvg(e));
		return item;
	});
}

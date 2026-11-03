import { DEFAULT_SETTINGS, DWELL_RANGE, GAP_RANGE, type Settings } from './types';
import { DEFAULT_FORMAT, FORMAT_BY_ID, isEccChoice, isFormatId } from './formats';

const SPEED_MIN = 10;
const SPEED_MAX = 5000;
const DEG_MIN = 1;
const DEG_MAX = 30;
const SEED_MAX = 0xffffffff;

/** A step duration in whole ms inside `range` and on its grid, else undefined. */
function stepMs(
	raw: string | null,
	range: { min: number; max: number; step: number }
): number | undefined {
	if (raw === null) return undefined;
	const v = Number(raw);
	return Number.isInteger(v) &&
		v >= range.min &&
		v <= range.max &&
		(v - range.min) % range.step === 0
		? v
		: undefined;
}

/** Build the share fragment "#codes=…&speed=…&…&fmt=…" from raw code strings + settings.
 *  Params after `fmt` (`ecc`, `mode`, `dwell`, `gap`) appear only when they differ from their default, in a
 *  fixed order; `dwell` and `gap` appear only in step links. Codes are joined with "\n" so commas and spaces survive URLSearchParams
 *  encoding. */
export function encodeShareUrl(codes: string[], settings: Settings): string {
	const params = new URLSearchParams();
	params.set('codes', codes.join('\n'));
	params.set('speed', String(settings.speedPxPerSec));
	params.set('loop', settings.loop ? '1' : '0');
	params.set('rot', settings.rotate ? '1' : '0');
	params.set('rotmax', String(settings.rotateMaxDeg));
	params.set('skew', settings.skew ? '1' : '0');
	params.set('skewmax', String(settings.skewMaxDeg));
	params.set('seed', String(settings.seed));
	params.set('fmt', settings.format);
	const descriptor = FORMAT_BY_ID.get(settings.format);
	if (
		descriptor?.ecc &&
		isEccChoice(descriptor, settings.ecc) &&
		settings.ecc !== descriptor.ecc.defaultValue
	) {
		params.set('ecc', settings.ecc);
	}
	if (settings.mode === 'step') {
		params.set('mode', 'step');
		if (settings.dwellMs !== DEFAULT_SETTINGS.dwellMs)
			params.set('dwell', String(settings.dwellMs));
		if (settings.gapMs !== DEFAULT_SETTINGS.gapMs) params.set('gap', String(settings.gapMs));
	}
	return '#' + params.toString();
}

/** Parse a page URL into codes + partial settings. The fragment is the source when it
 *  carries `codes`, else the legacy query string is, so old links keep working.
 *  Per-parameter leniency, never throws. */
export function decodeShareUrl(url: URL): { codes: string[]; settings: Partial<Settings> } {
	const hashParams = new URLSearchParams(url.hash.slice(1));
	const params = hashParams.has('codes') ? hashParams : new URLSearchParams(url.search.slice(1));
	const codesRaw = params.get('codes');
	const codes = codesRaw
		? codesRaw
				.split('\n')
				.map((c) => c.trim())
				.filter((c) => c.length > 0)
		: [];

	const settings: Partial<Settings> = {};
	const speedRaw = params.get('speed');
	if (speedRaw !== null) {
		const speed = Number(speedRaw);
		if (Number.isFinite(speed) && speed >= SPEED_MIN && speed <= SPEED_MAX) {
			settings.speedPxPerSec = speed;
		}
	}
	const loopRaw = params.get('loop');
	if (loopRaw === '0' || loopRaw === '1') {
		settings.loop = loopRaw === '1';
	}
	const rotRaw = params.get('rot');
	if (rotRaw === '0' || rotRaw === '1') {
		settings.rotate = rotRaw === '1';
	}
	const rotMaxRaw = params.get('rotmax');
	if (rotMaxRaw !== null) {
		const v = Number(rotMaxRaw);
		if (Number.isFinite(v) && v >= DEG_MIN && v <= DEG_MAX) {
			settings.rotateMaxDeg = v;
		}
	}
	const skewRaw = params.get('skew');
	if (skewRaw === '0' || skewRaw === '1') {
		settings.skew = skewRaw === '1';
	}
	const skewMaxRaw = params.get('skewmax');
	if (skewMaxRaw !== null) {
		const v = Number(skewMaxRaw);
		if (Number.isFinite(v) && v >= DEG_MIN && v <= DEG_MAX) {
			settings.skewMaxDeg = v;
		}
	}
	const seedRaw = params.get('seed');
	if (seedRaw !== null) {
		const v = Number(seedRaw);
		if (Number.isInteger(v) && v >= 0 && v <= SEED_MAX) {
			settings.seed = v;
		}
	}
	const fmtRaw = params.get('fmt');
	if (fmtRaw !== null && isFormatId(fmtRaw)) {
		settings.format = fmtRaw;
	}
	// `ecc` is judged against the resolved format, so its position in the URL does not matter.
	const eccRaw = params.get('ecc');
	const descriptor = FORMAT_BY_ID.get(settings.format ?? DEFAULT_FORMAT);
	if (
		eccRaw !== null &&
		descriptor?.ecc &&
		isEccChoice(descriptor, eccRaw) &&
		eccRaw !== descriptor.ecc.defaultValue
	) {
		settings.ecc = eccRaw;
	}
	if (params.get('mode') === 'step') settings.mode = 'step';
	const dwellMs = stepMs(params.get('dwell'), DWELL_RANGE);
	if (dwellMs !== undefined) settings.dwellMs = dwellMs;
	const gapMs = stepMs(params.get('gap'), GAP_RANGE);
	if (gapMs !== undefined) settings.gapMs = gapMs;
	return { codes, settings };
}

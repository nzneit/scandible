import { DEFAULT_SETTINGS, DWELL_RANGE, GAP_RANGE, type Settings } from './types';
import { DEFAULT_FORMAT, FORMAT_BY_ID, canonicalEcc, isEccChoice, isFormatId } from './formats';
import { rowToken, type Row } from './rows';

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
	appendSettings(params, settings, true);
	return '#' + params.toString();
}

/** Build a per-row share fragment "#r1=…&r2=…&speed=…&…&fmt=…": one record per non-blank row,
 *  numbered from 1 in editor order (an empty `codes` when there is none), then the settings tail
 *  of encodeShareUrl without `ecc`. */
export function encodeRowsShareUrl(rows: Row[], settings: Settings): string {
	const params = new URLSearchParams();
	let n = 0;
	for (const row of rows) {
		const token = rowToken(row.payload);
		if (token === '') continue;
		n += 1;
		params.set(`r${n}`, `${row.format}${row.ecc ? '-' + row.ecc : ''}_${token}`);
	}
	if (n === 0) params.set('codes', '');
	appendSettings(params, settings, false);
	return '#' + params.toString();
}

/** Module-private. Writes speed, loop, rot, rotmax, skew, skewmax, seed and fmt; then ecc under
 *  today's rule, only when withEcc holds; then mode, dwell and gap under today's rules. */
function appendSettings(params: URLSearchParams, settings: Settings, withEcc: boolean): void {
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
		withEcc &&
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
}

/** The distinct `r<n>` keys of `params` whose first value is non-empty, in numeric order. */
function recordKeys(params: URLSearchParams): string[] {
	return [...new Set(params.keys())]
		.filter((key) => /^r([1-9][0-9]*)$/.test(key) && params.get(key) !== '')
		.sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
}

/** One record value, `format[-level]_payload`, as a row; null when it is unusable. */
function parseRecord(value: string): Row | null {
	const match = /^([a-z0-9]+)(?:-([A-Za-z0-9]*))?_([\s\S]*)$/.exec(value);
	if (!match) return null;
	const [, format, level, payload] = match;
	if (!isFormatId(format)) return null;
	const token = rowToken(payload);
	if (token === '') return null;
	return { payload: token, format, ecc: canonicalEcc(format, level ?? '') };
}

/** Parse a page URL into codes or records, plus partial settings. The fragment is the source
 *  when it carries `codes` or an `r<n>` key with a non-empty value, else the legacy query string
 *  is, so old links keep working. Per-parameter leniency, never throws. */
export function decodeShareUrl(url: URL): {
	codes: string[];
	settings: Partial<Settings>;
	records: Row[] | undefined;
} {
	const hashParams = new URLSearchParams(url.hash.slice(1));
	const params =
		hashParams.has('codes') || recordKeys(hashParams).length > 0
			? hashParams
			: new URLSearchParams(url.search.slice(1));
	const keys = recordKeys(params);
	const records =
		keys.length === 0
			? undefined
			: keys
					.map((key) => parseRecord(params.get(key) ?? ''))
					.filter((row): row is Row => row !== null);
	const codesRaw = records !== undefined ? null : params.get('codes');
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
	return { codes, settings, records };
}

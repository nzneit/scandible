import type { Settings } from './types';

const SPEED_MIN = 10;
const SPEED_MAX = 5000;
const SKEW_MIN = 1;
const SKEW_MAX = 30;
const SEED_MAX = 0xffffffff;

/** Build "?codes=...&speed=...&loop=..." from raw code strings + settings. codes are
 *  joined with "\n" so internal commas/whitespace survive URLSearchParams encoding. */
export function encodeShareUrl(codes: string[], settings: Settings): string {
  const params = new URLSearchParams();
  params.set('codes', codes.join('\n'));
  params.set('speed', String(settings.speedPxPerSec));
  params.set('loop', settings.loop ? '1' : '0');
  params.set('skew', settings.skew ? '1' : '0');
  params.set('skewmax', String(settings.skewMaxDeg));
  params.set('skewseed', String(settings.skewSeed));
  return '?' + params.toString();
}

/** Parse location.search into codes + partial settings. Per-parameter leniency,
 *  never throws. */
export function decodeShareUrl(search: string): { codes: string[]; settings: Partial<Settings> } {
  const params = new URLSearchParams(search);
  const codesRaw = params.get('codes');
  const codes = codesRaw
    ? codesRaw.split('\n').map((c) => c.trim()).filter((c) => c.length > 0)
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
  const skewRaw = params.get('skew');
  if (skewRaw === '0' || skewRaw === '1') {
    settings.skew = skewRaw === '1';
  }
  const skewMaxRaw = params.get('skewmax');
  if (skewMaxRaw !== null) {
    const v = Number(skewMaxRaw);
    if (Number.isFinite(v) && v >= SKEW_MIN && v <= SKEW_MAX) {
      settings.skewMaxDeg = v;
    }
  }
  const seedRaw = params.get('skewseed');
  if (seedRaw !== null) {
    const v = Number(seedRaw);
    if (Number.isInteger(v) && v >= 0 && v <= SEED_MAX) {
      settings.skewSeed = v;
    }
  }
  return { codes, settings };
}

import type { Settings } from './types';

const SPEED_MIN = 10;
const SPEED_MAX = 5000;

/** Build "?codes=...&speed=...&loop=..." from raw code strings + settings. codes are
 *  joined with "\n" so internal commas/whitespace survive URLSearchParams encoding. */
export function encodeShareUrl(codes: string[], settings: Settings): string {
  const params = new URLSearchParams();
  params.set('codes', codes.join('\n'));
  params.set('speed', String(settings.speedPxPerSec));
  params.set('loop', settings.loop ? '1' : '0');
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
  return { codes, settings };
}

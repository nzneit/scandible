import { advanceOffset, isAtEnd } from './scrollMath';
import { renderBarcodeSvg } from './barcode';
import { buildTransforms } from './transforms';
import type { Settings, UpcEntry } from './types';

const MAX_DELTA_MS = 100;

export interface Scroller {
  play(): void;
  pause(): void;
  toggle(): void;
  restart(): void;
  setSpeed(pxPerSec: number): void;
  setLoop(loop: boolean): void;
  isPlaying(): boolean;
  destroy(): void;
}

export function createScroller(
  container: HTMLElement,
  entries: UpcEntry[],
  settings: Settings,
  onFinish?: (summary: { count: number; seconds: number }) => void,
): Scroller {
  const valid = entries.filter((e) => e.valid);
  const count = valid.length;

  const transforms =
    settings.rotate || settings.skew
      ? buildTransforms(
          count,
          {
            rotate: settings.rotate,
            rotateMaxDeg: settings.rotateMaxDeg,
            skew: settings.skew,
            skewMaxDeg: settings.skewMaxDeg,
          },
          settings.seed,
        )
      : null;

  const buildCopy = (): HTMLElement => {
    const copy = document.createElement('div');
    copy.className = 'scroller-copy';
    valid.forEach((e, i) => {
      const item = document.createElement('div');
      item.className = 'barcode-item';
      if (transforms) item.style.transform = transforms[i];
      item.appendChild(renderBarcodeSvg(e));
      copy.appendChild(item);
    });
    return copy;
  };

  const track = document.createElement('div');
  track.className = 'scroller-track';
  const copy1 = buildCopy();
  const copy2 = buildCopy();
  track.appendChild(copy1);
  track.appendChild(copy2);
  container.innerHTML = '';
  container.appendChild(track);

  let speed = settings.speedPxPerSec;
  let loop = settings.loop;
  let offset = 0;
  let elapsedMs = 0;
  let playing = false;
  let rafId: number | null = null;
  let lastTs: number | null = null;
  let contentHeight = 0;

  const applyLoopVisibility = () => {
    copy2.style.display = loop ? '' : 'none';
  };
  const render = () => {
    track.style.transform = `translate3d(0, ${-offset}px, 0)`;
  };
  const measure = () => {
    // The repeat period is copy 1's own height: copy 2 immediately follows copy 1 in the
    // flex-column track with no inter-copy gap (seam-uniform padding per barcode, no
    // last-item margin, no collapsing margins), so translating by copy1's height maps
    // copy 2 onto copy 1's original position. Reading copy 2's rect is unsafe because it is
    // display:none whenever loop is off (the default) — a hidden element's rect is all
    // zeros, which would make contentHeight <= 0 and fire onFinish on the first frame.
    contentHeight = copy1.getBoundingClientRect().height;
  };

  const stop = () => {
    playing = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  };
  const frame = (ts: number) => {
    if (!playing) return;
    let deltaMs = lastTs === null ? 0 : ts - lastTs;
    lastTs = ts;
    if (deltaMs > MAX_DELTA_MS) deltaMs = MAX_DELTA_MS;
    if (deltaMs > 0) {
      offset = advanceOffset(offset, speed, deltaMs, contentHeight, loop);
      elapsedMs += deltaMs;
      render();
    }
    if (isAtEnd(offset, contentHeight, loop)) {
      stop();
      onFinish?.({ count, seconds: Math.round((elapsedMs / 1000) * 10) / 10 });
      return;
    }
    rafId = requestAnimationFrame(frame);
  };
  const start = () => {
    if (playing) return;
    playing = true;
    lastTs = null;
    rafId = requestAnimationFrame(frame);
  };

  const onResize = () => {
    measure();
    offset = loop
      ? contentHeight > 0
        ? offset % contentHeight
        : 0
      : Math.min(offset, contentHeight);
    render();
  };
  window.addEventListener('resize', onResize);

  applyLoopVisibility();
  measure();
  render();

  return {
    play: start,
    pause: stop,
    toggle() {
      if (playing) stop();
      else start();
    },
    restart() {
      offset = 0;
      elapsedMs = 0;
      render();
      stop();
      start();
    },
    setSpeed(pxPerSec) {
      speed = pxPerSec;
    },
    setLoop(next) {
      loop = next;
      applyLoopVisibility();
      if (loop && contentHeight > 0) offset = offset % contentHeight;
      render();
    },
    isPlaying() {
      return playing;
    },
    destroy() {
      stop();
      window.removeEventListener('resize', onResize);
    },
  };
}

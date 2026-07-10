import { createScroller } from './scroller';
import type { Settings, UpcEntry } from './types';

const OVERLAY_IDLE_MS = 3000;

export function formatFinishMessage(count: number, seconds: number): string {
  return `Finished scrolling ${count} barcodes in ${seconds} seconds`;
}

export function mountPlayView(
  root: HTMLElement,
  entries: UpcEntry[],
  settings: Settings,
  onBack: () => void,
): void {
  root.innerHTML = `
    <div class="play">
      <div class="scroll-column"></div>
      <div class="overlay">
        <button type="button" class="ctl-playpause">Pause</button>
        <input type="range" class="ctl-speed" min="10" max="5000" step="5" />
        <button type="button" class="ctl-restart">Restart</button>
        <button type="button" class="ctl-back">Back</button>
      </div>
      <div class="finish-screen" hidden>
        <p class="finish-text"></p>
        <button type="button" class="finish-restart">Restart</button>
        <button type="button" class="finish-back">Back</button>
      </div>
    </div>
  `;

  const column = root.querySelector('.scroll-column') as HTMLElement;
  const overlay = root.querySelector('.overlay') as HTMLElement;
  const playpause = root.querySelector('.ctl-playpause') as HTMLButtonElement;
  const speed = root.querySelector('.ctl-speed') as HTMLInputElement;
  const restart = root.querySelector('.ctl-restart') as HTMLButtonElement;
  const back = root.querySelector('.ctl-back') as HTMLButtonElement;
  const finish = root.querySelector('.finish-screen') as HTMLElement;
  const finishText = root.querySelector('.finish-text') as HTMLElement;
  const finishRestart = root.querySelector('.finish-restart') as HTMLButtonElement;
  const finishBack = root.querySelector('.finish-back') as HTMLButtonElement;

  speed.value = String(settings.speedPxPerSec);

  const scroller = createScroller(column, entries, settings, ({ count, seconds }) => {
    finishText.textContent = formatFinishMessage(count, seconds);
    finish.hidden = false;
  });

  const syncPlayLabel = () => {
    playpause.textContent = scroller.isPlaying() ? 'Pause' : 'Play';
  };

  playpause.addEventListener('click', () => {
    scroller.toggle();
    syncPlayLabel();
  });
  speed.addEventListener('input', () => scroller.setSpeed(Number(speed.value)));
  const doRestart = () => {
    finish.hidden = true;
    scroller.restart();
    syncPlayLabel();
  };
  restart.addEventListener('click', doRestart);
  finishRestart.addEventListener('click', doRestart);
  back.addEventListener('click', onBack);
  finishBack.addEventListener('click', onBack);

  // Auto-hide overlay after idle; reappear on interaction.
  let idleTimer: ReturnType<typeof setTimeout>;
  const showOverlay = () => {
    overlay.classList.remove('hidden');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => overlay.classList.add('hidden'), OVERLAY_IDLE_MS);
  };
  root.addEventListener('pointermove', showOverlay);
  root.addEventListener('pointerdown', showOverlay);

  scroller.play();
  syncPlayLabel();
  showOverlay();
}

import { parseUpcList } from './upc';
import { readUpcFile } from './fileInput';
import { encodeShareUrl } from './shareUrl';
import { buildQrSvg } from './qr';
import { DEFAULT_SETTINGS, type Settings, type UpcEntry } from './types';

const URL_WARN_LENGTH = 2000;
const QR_DENSE_MSG = 'QR is dense — hold the phone steady, or use the copied link.';
const QR_TOO_LONG_MSG = 'Too many codes for a QR — share the copied link instead.';

export function mountSetupView(
  root: HTMLElement,
  initial: { codes: string[]; settings: Partial<Settings> },
  onStart: (entries: UpcEntry[], settings: Settings) => void,
): void {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...initial.settings };

  root.innerHTML = `
    <div class="setup">
      <h1>scandible</h1>
      <textarea class="upc-input" rows="8" placeholder="Paste UPC codes, one per line"></textarea>
      <input type="file" class="file-input" accept=".txt,.csv" />
      <p class="file-error" hidden></p>
      <div class="settings-row">
        <label class="field">Speed
          <input type="range" class="speed-input" min="10" max="5000" step="5" />
        </label>
        <label class="field">Loop
          <input type="checkbox" class="loop-input" />
        </label>
        <label class="field">Random rotation
          <input type="checkbox" class="rotate-input" />
          <input type="range" class="rotate-max-input" min="1" max="30" step="1" />
        </label>
        <label class="field">Random skew
          <input type="checkbox" class="skew-input" />
          <input type="range" class="skew-max-input" min="1" max="30" step="1" />
        </label>
      </div>
      <ul class="validation-list"></ul>
      <div class="share-row">
        <button type="button" class="copy-link">Share link</button>
        <input type="text" class="share-url" readonly />
        <span class="url-warning" hidden>Link is long; it may be truncated by some browsers.</span>
      </div>
      <div class="qr-code" hidden aria-label="QR code for the share link"></div>
      <p class="qr-status" hidden></p>
      <button type="button" class="start" disabled>Start</button>
    </div>
  `;

  const input = root.querySelector('.upc-input') as HTMLTextAreaElement;
  const fileInput = root.querySelector('.file-input') as HTMLInputElement;
  const speedInput = root.querySelector('.speed-input') as HTMLInputElement;
  const loopInput = root.querySelector('.loop-input') as HTMLInputElement;
  const rotateInput = root.querySelector('.rotate-input') as HTMLInputElement;
  const rotateMaxInput = root.querySelector('.rotate-max-input') as HTMLInputElement;
  const skewInput = root.querySelector('.skew-input') as HTMLInputElement;
  const skewMaxInput = root.querySelector('.skew-max-input') as HTMLInputElement;
  const list = root.querySelector('.validation-list') as HTMLUListElement;
  const fileError = root.querySelector('.file-error') as HTMLElement;
  const copyLink = root.querySelector('.copy-link') as HTMLButtonElement;
  const shareUrl = root.querySelector('.share-url') as HTMLInputElement;
  const urlWarning = root.querySelector('.url-warning') as HTMLElement;
  const start = root.querySelector('.start') as HTMLButtonElement;
  const qrCode = root.querySelector('.qr-code') as HTMLElement;
  const qrStatus = root.querySelector('.qr-status') as HTMLElement;

  const clearQr = () => {
    qrCode.innerHTML = '';
    qrCode.hidden = true;
    qrStatus.textContent = '';
    qrStatus.hidden = true;
  };

  input.value = initial.codes.join('\n');
  speedInput.value = String(settings.speedPxPerSec);
  loopInput.checked = settings.loop;
  rotateInput.checked = settings.rotate;
  rotateMaxInput.value = String(settings.rotateMaxDeg);
  skewInput.checked = settings.skew;
  skewMaxInput.value = String(settings.skewMaxDeg);
  const syncRotateEnabled = () => {
    rotateMaxInput.disabled = !rotateInput.checked;
  };
  const syncSkewEnabled = () => {
    skewMaxInput.disabled = !skewInput.checked;
  };
  syncRotateEnabled();
  syncSkewEnabled();
  rotateInput.addEventListener('change', syncRotateEnabled);
  skewInput.addEventListener('change', syncSkewEnabled);

  [speedInput, loopInput, rotateInput, rotateMaxInput, skewInput, skewMaxInput].forEach((el) =>
    el.addEventListener('change', clearQr),
  );

  let entries: UpcEntry[] = [];

  const currentSettings = (): Settings => ({
    speedPxPerSec: Number(speedInput.value),
    loop: loopInput.checked,
    rotate: rotateInput.checked,
    rotateMaxDeg: Number(rotateMaxInput.value),
    skew: skewInput.checked,
    skewMaxDeg: Number(skewMaxInput.value),
    seed: settings.seed,
  });

  const refresh = () => {
    clearQr();
    fileError.hidden = true;
    fileError.textContent = '';
    entries = parseUpcList(input.value);
    list.innerHTML = '';
    for (const e of entries) {
      const li = document.createElement('li');
      li.className = e.valid ? 'valid' : 'invalid';
      li.textContent = `${e.raw} ${e.valid ? '✓' : '✗ invalid'}`;
      list.appendChild(li);
    }
    start.disabled = !entries.some((e) => e.valid);
  };

  input.addEventListener('input', refresh);

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      input.value = await readUpcFile(file);
      refresh();
    } catch {
      // Inline error only; the existing validation list is left untouched.
      fileError.textContent = 'Could not read file';
      fileError.hidden = false;
    }
  });

  copyLink.addEventListener('click', () => {
    const url =
      location.origin + location.pathname + encodeShareUrl(entries.map((e) => e.raw), currentSettings());
    shareUrl.value = url;
    urlWarning.hidden = url.length <= URL_WARN_LENGTH;
    void navigator.clipboard?.writeText(url).catch(() => {});

    const qr = buildQrSvg(url);
    if (qr.ok) {
      qrCode.innerHTML = qr.svg;
      qrCode.hidden = false;
      qrStatus.textContent = qr.dense ? QR_DENSE_MSG : '';
      qrStatus.hidden = !qr.dense;
    } else {
      qrCode.innerHTML = '';
      qrCode.hidden = true;
      qrStatus.textContent = QR_TOO_LONG_MSG;
      qrStatus.hidden = false;
    }
  });

  start.addEventListener('click', () => {
    if (start.disabled) return;
    onStart(entries, currentSettings());
  });

  refresh();
}

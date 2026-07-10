import { parseUpcList } from './upc';
import { readUpcFile } from './fileInput';
import { encodeShareUrl } from './shareUrl';
import { DEFAULT_SETTINGS, type Settings, type UpcEntry } from './types';

const URL_WARN_LENGTH = 2000;

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
        <label>Speed
          <input type="range" class="speed-input" min="10" max="5000" step="5" />
        </label>
        <label><input type="checkbox" class="loop-input" /> Loop</label>
      </div>
      <ul class="validation-list"></ul>
      <div class="share-row">
        <button type="button" class="copy-link">Copy link</button>
        <input type="text" class="share-url" readonly />
        <span class="url-warning" hidden>Link is long; it may be truncated by some browsers.</span>
      </div>
      <button type="button" class="start" disabled>Start</button>
    </div>
  `;

  const input = root.querySelector('.upc-input') as HTMLTextAreaElement;
  const fileInput = root.querySelector('.file-input') as HTMLInputElement;
  const speedInput = root.querySelector('.speed-input') as HTMLInputElement;
  const loopInput = root.querySelector('.loop-input') as HTMLInputElement;
  const list = root.querySelector('.validation-list') as HTMLUListElement;
  const fileError = root.querySelector('.file-error') as HTMLElement;
  const copyLink = root.querySelector('.copy-link') as HTMLButtonElement;
  const shareUrl = root.querySelector('.share-url') as HTMLInputElement;
  const urlWarning = root.querySelector('.url-warning') as HTMLElement;
  const start = root.querySelector('.start') as HTMLButtonElement;

  input.value = initial.codes.join('\n');
  speedInput.value = String(settings.speedPxPerSec);
  loopInput.checked = settings.loop;

  let entries: UpcEntry[] = [];

  const currentSettings = (): Settings => ({
    speedPxPerSec: Number(speedInput.value),
    loop: loopInput.checked,
  });

  const refresh = () => {
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
  });

  start.addEventListener('click', () => {
    if (start.disabled) return;
    onStart(entries, currentSettings());
  });

  refresh();
}

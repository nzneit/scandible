<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { parseUpcList } from '$lib/upc';
  import { readUpcFile } from '$lib/fileInput';
  import { decodeShareUrl, encodeShareUrl } from '$lib/shareUrl';
  import { DEFAULT_SETTINGS, type Settings, type UpcEntry } from '$lib/types';
  import ValidationList from '$lib/components/ValidationList.svelte';
  import ShareLink from '$lib/components/ShareLink.svelte';

  const decoded = decodeShareUrl(page.url.search);
  const initial: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
  const seed = decoded.settings.seed ?? Math.floor(Math.random() * 0x100000000) >>> 0;

  let text = $state(decoded.codes.join('\n'));
  let speedPxPerSec = $state(initial.speedPxPerSec);
  let loop = $state(initial.loop);
  let rotate = $state(initial.rotate);
  let rotateMaxDeg = $state(initial.rotateMaxDeg);
  let skew = $state(initial.skew);
  let skewMaxDeg = $state(initial.skewMaxDeg);
  let fileError = $state('');

  const entries: UpcEntry[] = $derived(parseUpcList(text));
  const rawCodes: string[] = $derived(entries.map((e) => e.raw));
  const canStart: boolean = $derived(entries.some((e) => e.valid));
  const settings: Settings = $derived({
    speedPxPerSec,
    loop,
    rotate,
    rotateMaxDeg,
    skew,
    skewMaxDeg,
    seed,
  });

  async function onFileChange(e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      text = await readUpcFile(file);
      fileError = '';
    } catch {
      // Inline error only; the existing validation list is left untouched.
      fileError = 'Could not read file';
    }
  }

  function start(): void {
    goto(`${base}/play${encodeShareUrl(rawCodes, settings)}`);
  }
</script>

<div class="setup">
  <h1>scandible</h1>
  <textarea
    class="upc-input"
    rows="8"
    placeholder="Paste UPC codes, one per line"
    bind:value={text}
    oninput={() => (fileError = '')}
  ></textarea>
  <input type="file" class="file-input" accept=".txt,.csv" onchange={onFileChange} />
  <p class="file-error" hidden={!fileError}>{fileError}</p>
  <div class="settings-row">
    <label class="field">Speed
      <input type="range" class="speed-input" min="10" max="5000" step="5" bind:value={speedPxPerSec} />
    </label>
    <label class="field">Loop
      <input type="checkbox" class="loop-input" bind:checked={loop} />
    </label>
    <label class="field">Random rotation
      <input type="checkbox" class="rotate-input" bind:checked={rotate} />
      <input type="range" class="rotate-max-input" min="1" max="30" step="1" bind:value={rotateMaxDeg} disabled={!rotate} />
    </label>
    <label class="field">Random skew
      <input type="checkbox" class="skew-input" bind:checked={skew} />
      <input type="range" class="skew-max-input" min="1" max="30" step="1" bind:value={skewMaxDeg} disabled={!skew} />
    </label>
  </div>
  <ValidationList {entries} />
  <ShareLink codes={rawCodes} {settings} />
  <button type="button" class="start" disabled={!canStart} onclick={start}>Start</button>
</div>

<style>
  .setup { max-width: 640px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
  .upc-input { width: 100%; font-family: monospace; }
  /* Each setting on its own line: label text on top, input(s) below, spaced apart. */
  .settings-row { display: flex; flex-direction: column; gap: 16px; }
  .field { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
  .start { padding: 12px; font-size: 1.1rem; }
  .start:disabled { opacity: 0.5; }
</style>

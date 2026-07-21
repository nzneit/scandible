<script lang="ts" module>
  export interface ScrollColumnHandle {
    toggle(): void;
    restart(): void;
    setSpeed(pxPerSec: number): void;
    isPlaying(): boolean;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { createScroller, type Scroller } from '$lib/scroller';
  import type { Settings, UpcEntry } from '$lib/types';

  let {
    entries,
    settings,
    onFinish,
  }: {
    entries: UpcEntry[];
    settings: Settings;
    onFinish?: (summary: { count: number; seconds: number }) => void;
  } = $props();

  let container: HTMLDivElement | undefined;
  let scroller: Scroller | undefined;

  onMount(() => {
    if (!container) return;
    scroller = createScroller(container, entries, settings, onFinish);
    scroller.play();
    return () => scroller?.destroy();
  });

  export function toggle(): void {
    scroller?.toggle();
  }
  export function restart(): void {
    scroller?.restart();
  }
  export function setSpeed(pxPerSec: number): void {
    scroller?.setSpeed(pxPerSec);
  }
  export function isPlaying(): boolean {
    return scroller?.isPlaying() ?? false;
  }
</script>

<div class="scroll-column" bind:this={container}></div>

<style>
  .scroll-column { position: absolute; inset: 0; display: flex; justify-content: center; }
  /* The scroller builds its DOM imperatively, invisible to Svelte's scoping —
     every descendant selector must be :global. Seam-uniform rhythm: equal
     top+bottom padding per barcode, no last-item margin, no collapsing margins —
     so the copy1/copy2 gap equals the internal gap. */
  .scroll-column :global(.scroller-track) { display: flex; flex-direction: column; will-change: transform; }
  .scroll-column :global(.scroller-copy) { display: flex; flex-direction: column; }
  .scroll-column :global(.barcode-item) {
    display: flex;
    justify-content: center;
    padding: 40vh 0; /* generous: isolates one barcode in the scan zone */
  }
  .scroll-column :global(.barcode-item svg) { max-width: min(90vw, 640px); height: auto; }
</style>

<script lang="ts" module>
	export interface StepStageHandle {
		toggle(): void;
		restart(): void;
		setDwell(ms: number): void;
		setGap(ms: number): void;
		next(): void;
		prev(): void;
		isPlaying(): boolean;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { createStepper, type Stepper, type StepSummary } from '$lib/stepper';
	import type { Settings, CodeEntry } from '$lib/types';

	let {
		entries,
		settings,
		onFinish,
		onIndex
	}: {
		entries: CodeEntry[];
		settings: Settings;
		onFinish?: (summary: StepSummary) => void;
		onIndex?: (index: number, count: number) => void;
	} = $props();

	let container: HTMLDivElement | undefined;
	let stepper: Stepper | undefined;

	// The stepper snapshots entries and settings at mount, as the scroller does. It opens paused:
	// play() is not called here.
	onMount(() => {
		if (!container) return;
		stepper = createStepper(container, entries, settings, onFinish, onIndex);
		return () => stepper?.destroy();
	});

	export function toggle(): void {
		stepper?.toggle();
	}
	export function restart(): void {
		stepper?.restart();
	}
	export function setDwell(ms: number): void {
		stepper?.setDwell(ms);
	}
	export function setGap(ms: number): void {
		stepper?.setGap(ms);
	}
	export function next(): void {
		stepper?.next();
	}
	export function prev(): void {
		stepper?.prev();
	}
	export function isPlaying(): boolean {
		return stepper?.isPlaying() ?? false;
	}
</script>

<div class="step-stage-host" bind:this={container}></div>

<style>
	.step-stage-host {
		position: absolute;
		inset: 0;
	}
	/* The stepper builds its DOM imperatively, invisible to Svelte's scoping, so every
	   descendant selector must be :global. */
	.step-stage-host :global(.step-stage) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}
	.step-stage-host :global(.barcode-item) {
		display: flex;
		justify-content: center;
		padding: 0; /* no scroll rhythm: the stage centres its one item */
	}
	/* Copied from ScrollColumn.svelte, which holds the canonical caps: change them there, then here. */
	.step-stage-host :global(.barcode-item svg) {
		max-width: min(90vw, 640px);
		height: auto;
	}
	.step-stage-host :global(.barcode-item--2d svg) {
		max-width: min(90vw, 640px);
		max-height: 60vh;
		width: auto;
		height: auto;
	}
	.step-stage-host :global(.barcode-item--pdf417 svg) {
		max-width: min(95vw, 960px);
	}
</style>

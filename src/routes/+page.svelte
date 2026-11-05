<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { decodeShareUrl } from '$lib/shareUrl';
	import { DWELL_RANGE, GAP_RANGE } from '$lib/types';
	import { Setup } from '$lib/setup.svelte';
	import CodesPane from '$lib/components/CodesPane.svelte';
	import ShareLink from '$lib/components/ShareLink.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';
	import SecondsSlider from '$lib/components/SecondsSlider.svelte';

	const decoded = decodeShareUrl(page.url);
	const seed = decoded.settings.seed ?? Math.floor(Math.random() * 0x100000000) >>> 0;
	const setup = new Setup(decoded, seed);

	// A pasted share link or an edited fragment on the same path is a same-document navigation,
	// so SvelteKit updates `page.url` without remounting and this page (which decodes once) must
	// reload. Our own `goto` calls use pushState/replaceState, which never fire `hashchange`.
	onMount(() => {
		const reload = () => location.reload();
		window.addEventListener('hashchange', reload);
		return () => window.removeEventListener('hashchange', reload);
	});

	function start(): void {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pathname IS resolve()-based; the rule cannot see through the fragment concatenation
		goto(resolve('/play') + setup.shareHash);
	}
</script>

<div class="setup bg-base-100">
	<h1 class="text-2xl font-bold tracking-tight">scandible</h1>
	<CodesPane {setup} />
	<div class="settings-row">
		<Field label="Playback">
			<select class="mode-input select select-sm w-auto" bind:value={setup.mode}>
				<option value="scroll">Scroll</option>
				<option value="step">Step</option>
			</select>
		</Field>
		{#if setup.mode === 'step'}
			<Field label="Dwell">
				<SecondsSlider
					bind:value={setup.dwellMs}
					range={DWELL_RANGE}
					label="Dwell"
					rangeAriaLabel="Dwell"
					rangeClass="dwell-input"
					secondsClass="dwell-seconds"
				/>
			</Field>
			{#if setup.dwellMs < 330}
				<Note class="flash-note" tone="warning">
					Dwells under 0.33 s flash the screen more than three times a second. Do not use them near
					anyone sensitive to flashing lights.
				</Note>
			{/if}
			<Field label="Gap">
				<SecondsSlider
					bind:value={setup.gapMs}
					range={GAP_RANGE}
					label="Gap"
					rangeAriaLabel="Gap"
					rangeClass="gap-input"
					secondsClass="gap-seconds"
				/>
			</Field>
			{#if setup.gapMs < 1000 && setup.dupPairs.length > 0}
				<Note class="dup-hint" tone="warning">{setup.dupHint}</Note>
			{/if}
		{:else}
			<Field label="Speed">
				<input
					type="range"
					class="speed-input range range-sm w-32"
					min="10"
					max="5000"
					step="5"
					bind:value={setup.speedPxPerSec}
				/>
			</Field>
		{/if}
		<Field label="Loop">
			<input type="checkbox" class="loop-input toggle toggle-sm" bind:checked={setup.loop} />
		</Field>
		<Field label="Random rotation">
			<input
				type="checkbox"
				class="rotate-input toggle toggle-sm"
				aria-label="Random rotation"
				bind:checked={setup.rotate}
			/>
			<input
				type="range"
				class="rotate-max-input range range-sm w-32"
				aria-label="Maximum rotation"
				min="1"
				max="30"
				step="1"
				bind:value={setup.rotateMaxDeg}
				disabled={!setup.rotate}
			/>
		</Field>
		<Field label="Random skew">
			<input
				type="checkbox"
				class="skew-input toggle toggle-sm"
				aria-label="Random skew"
				bind:checked={setup.skew}
			/>
			<input
				type="range"
				class="skew-max-input range range-sm w-32"
				aria-label="Maximum skew"
				min="1"
				max="30"
				step="1"
				bind:value={setup.skewMaxDeg}
				disabled={!setup.skew}
			/>
		</Field>
	</div>
	<ShareLink hash={setup.shareHash} />
	<button
		type="button"
		class="start btn btn-primary btn-lg"
		disabled={!setup.canStart}
		onclick={start}>Start</button
	>
</div>

<style>
	.setup {
		max-width: 640px;
		margin: 0 auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	/* Each setting on its own line: label text on top, input(s) below, spaced apart. */
	.settings-row {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	/* daisyUI dims a disabled btn to 1.39:1. Start keeps its primary look at half opacity, as
	   before, so it stays recognizable while it waits for a valid code. */
	.start:disabled {
		background-color: var(--color-primary);
		color: var(--color-primary-content);
		opacity: 0.5;
	}
</style>

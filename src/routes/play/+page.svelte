<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { parseCodeList } from '$lib/codes';
	import { rowEntries } from '$lib/rows';
	import { decodeShareUrl, encodeRowsShareUrl, encodeShareUrl } from '$lib/shareUrl';
	import { formatFinishMessage, formatStepFinishMessage } from '$lib/finish';
	import { formatSeconds, parseSeconds } from '$lib/seconds';
	import { DEFAULT_SETTINGS, DWELL_RANGE, GAP_RANGE, type Settings } from '$lib/types';
	import type { Player } from '$lib/player';
	import type { StepSummary } from '$lib/stepper';
	import ScrollColumn, { type ScrollColumnHandle } from '$lib/components/ScrollColumn.svelte';
	import StepStage, { type StepStageHandle } from '$lib/components/StepStage.svelte';

	const OVERLAY_IDLE_MS = 3000;

	const decoded = decodeShareUrl(page.url);
	const settings: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
	if (decoded.settings.seed === undefined) {
		settings.seed = Math.floor(Math.random() * 0x100000000) >>> 0;
	}
	const entries = decoded.records
		? rowEntries(decoded.records)
		: parseCodeList(decoded.codes.join('\n'), settings.format, settings.ecc);
	const hasValid = entries.some((e) => e.valid);
	const count = entries.filter((e) => e.valid).length;

	let scroll: ScrollColumnHandle | undefined = $state();
	let step: StepStageHandle | undefined = $state();
	let playing = $state(settings.mode !== 'step');
	let speed = $state(settings.speedPxPerSec);
	let finish: { count: number; seconds: number } | null = $state(null);
	let stepFinish: StepSummary | null = $state(null);
	let overlayVisible = $state(true);
	let overlayEl: HTMLDivElement | undefined = $state();
	let finishRestartEl: HTMLButtonElement | undefined = $state();
	let dwell = $state(settings.dwellMs);
	let gap = $state(settings.gapMs);
	let position = $state({ index: 0, count });
	let idleTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		if (!hasValid) {
			// Nothing scannable — bounce to setup, keeping whichever form it received (fragment or
			// legacy query string).
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- pathname IS resolve()-based; the rule cannot see through the fragment concatenation
			goto(resolve('/') + page.url.search + page.url.hash, { replaceState: true });
			return;
		}
		showOverlay();
		return () => clearTimeout(idleTimer);
	});

	// A pasted share link or an edited fragment on the same path is a same-document navigation,
	// so SvelteKit updates `page.url` without remounting and this page (which decodes once) must
	// reload. Our own `goto` calls use pushState/replaceState, which never fire `hashchange`.
	// Kept apart from the onMount above, whose early return would skip it.
	onMount(() => {
		const reload = () => location.reload();
		window.addEventListener('hashchange', reload);
		return () => window.removeEventListener('hashchange', reload);
	});

	function currentSettings(): Settings {
		return { ...settings, speedPxPerSec: speed, dwellMs: dwell, gapMs: gap };
	}
	function back(): void {
		// The decoded share state plus the live speed, dwell and gap, never the parsed entries.
		const url =
			resolve('/') +
			(decoded.records
				? encodeRowsShareUrl(decoded.records, currentSettings())
				: encodeShareUrl(decoded.codes, currentSettings()));
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pathname IS resolve()-based; the rule cannot see through the fragment concatenation
		goto(url);
	}
	/** Only one engine is ever bound: the mode is fixed for the page's life. */
	function player(): Pick<Player, 'toggle' | 'restart' | 'isPlaying'> | undefined {
		return scroll ?? step;
	}
	function toggle(): void {
		player()?.toggle();
		playing = player()?.isPlaying() ?? false;
		showOverlay();
	}
	function restart(): void {
		finish = null;
		stepFinish = null;
		player()?.restart();
		playing = player()?.isPlaying() ?? true;
		showOverlay();
	}
	function showOverlay(): void {
		if (!hasValid) return;
		overlayVisible = true;
		clearTimeout(idleTimer);
		idleTimer = setTimeout(hideOverlay, OVERLAY_IDLE_MS);
	}
	function hideOverlay(): void {
		// The overlay stays while playback is paused or while one of its controls has keyboard focus.
		if (!playing || overlayEl?.querySelector(':focus-visible')) return;
		overlayVisible = false;
	}
	function onKey(event: KeyboardEvent): void {
		if (settings.mode !== 'step') return;
		if (event.altKey || event.ctrlKey || event.metaKey) return; // Alt+Arrow is browser Back
		showOverlay();
		if (event.repeat) return; // a held key steps once
		const t = event.target;
		const field =
			t instanceof HTMLInputElement ||
			t instanceof HTMLSelectElement ||
			t instanceof HTMLTextAreaElement;
		if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
			if (field) return; // a focused slider or field keeps its arrows
			if (event.key === 'ArrowRight') step?.next();
			else step?.prev();
		} else if (event.key === ' ') {
			if (field || t instanceof HTMLButtonElement) return; // the button handles Space itself
			event.preventDefault();
			toggle();
		}
	}
	function onDwellSeconds(e: Event & { currentTarget: HTMLInputElement }): void {
		const ms = parseSeconds(e.currentTarget.value, DWELL_RANGE);
		if (ms !== null) {
			dwell = ms;
			step?.setDwell(dwell);
		}
		e.currentTarget.value = (dwell / 1000).toFixed(2);
	}
	function onGapSeconds(e: Event & { currentTarget: HTMLInputElement }): void {
		const ms = parseSeconds(e.currentTarget.value, GAP_RANGE);
		if (ms !== null) {
			gap = ms;
			step?.setGap(gap);
		}
		e.currentTarget.value = (gap / 1000).toFixed(2);
	}
	// $derived.by, not $derived: at the top level TypeScript narrows `finish` and `stepFinish` to
	// their initial null, and only a closure sees their declared types.
	const finishText = $derived.by(() =>
		stepFinish
			? formatStepFinishMessage(stepFinish)
			: finish
				? formatFinishMessage(finish.count, finish.seconds)
				: null
	);
</script>

<svelte:window onpointermove={showOverlay} onpointerdown={showOverlay} onkeydown={onKey} />

{#if hasValid}
	<div class="play">
		{#if settings.mode === 'step'}
			<StepStage
				bind:this={step}
				{entries}
				{settings}
				onFinish={(s) => {
					stepFinish = s;
					playing = false;
					tick().then(() => finishRestartEl?.focus());
				}}
				onIndex={(index, count) => (position = { index, count })}
			/>
		{:else}
			<ScrollColumn
				bind:this={scroll}
				{entries}
				{settings}
				onFinish={(s) => {
					finish = s;
					tick().then(() => finishRestartEl?.focus());
				}}
			/>
		{/if}
		{#if settings.mode === 'step'}
			<p class="readout" aria-hidden="true">
				{position.index + 1} / {position.count} · dwell {formatSeconds(dwell)} · gap {formatSeconds(
					gap
				)}{playing ? '' : ' · paused'}
			</p>
		{/if}
		<div
			class="overlay"
			class:hidden={!overlayVisible}
			bind:this={overlayEl}
			onfocusout={showOverlay}
		>
			<button type="button" class="ctl-playpause" onclick={toggle}
				>{playing ? 'Pause' : 'Play'}</button
			>
			{#if settings.mode === 'step'}
				<button type="button" class="ctl-prev" onclick={() => step?.prev()}>Prev</button>
				<span class="ctl-counter">{position.index + 1} / {position.count}</span>
				<button type="button" class="ctl-next" onclick={() => step?.next()}>Next</button>
				<div class="ctl-group">
					<span>Dwell</span>
					<input
						type="range"
						class="ctl-dwell"
						min={DWELL_RANGE.min}
						max={DWELL_RANGE.max}
						step={DWELL_RANGE.step}
						aria-label="Dwell"
						aria-valuetext={formatSeconds(dwell)}
						bind:value={dwell}
						oninput={() => step?.setDwell(dwell)}
					/>
					<input
						type="number"
						class="ctl-dwell-seconds"
						inputmode="decimal"
						min={DWELL_RANGE.min / 1000}
						max={DWELL_RANGE.max / 1000}
						step="0.01"
						aria-label="Dwell in seconds"
						value={(dwell / 1000).toFixed(2)}
						onchange={onDwellSeconds}
					/>
					<span>s</span>
				</div>
				<div class="ctl-group">
					<span>Gap</span>
					<input
						type="range"
						class="ctl-gap"
						min={GAP_RANGE.min}
						max={GAP_RANGE.max}
						step={GAP_RANGE.step}
						aria-label="Gap"
						aria-valuetext={formatSeconds(gap)}
						bind:value={gap}
						oninput={() => step?.setGap(gap)}
					/>
					<input
						type="number"
						class="ctl-gap-seconds"
						inputmode="decimal"
						min={GAP_RANGE.min / 1000}
						max={GAP_RANGE.max / 1000}
						step="0.01"
						aria-label="Gap in seconds"
						value={(gap / 1000).toFixed(2)}
						onchange={onGapSeconds}
					/>
					<span>s</span>
				</div>
			{:else}
				<input
					type="range"
					class="ctl-speed"
					min="10"
					max="5000"
					step="5"
					bind:value={speed}
					oninput={() => scroll?.setSpeed(speed)}
				/>
			{/if}
			<button type="button" class="ctl-restart" onclick={restart}>Restart</button>
			<button type="button" class="ctl-back" onclick={back}>Back</button>
		</div>
		<!-- Mounted for the page's life, so the summary is announced as a change to an existing live
		     region: a status region inserted already holding its text is announced inconsistently. -->
		<p class="finish-status" role="status">{finishText ?? ''}</p>
		{#if finishText !== null}
			<div class="finish-screen">
				<p class="finish-text">{finishText}</p>
				<button type="button" class="finish-restart" bind:this={finishRestartEl} onclick={restart}
					>Restart</button
				>
				<button type="button" class="finish-back" onclick={back}>Back</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.play {
		position: fixed;
		inset: 0;
		background: #fff;
		overflow: hidden;
	}
	.overlay {
		position: fixed;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 12px;
		align-items: center;
		background: rgba(0, 0, 0, 0.7);
		color: #fff;
		padding: 10px 16px;
		border-radius: 8px;
		transition: opacity 0.3s;
		opacity: 1;
		flex-wrap: wrap;
		justify-content: center;
		width: max-content;
		max-width: calc(100vw - 32px);
	}
	.overlay.hidden {
		opacity: 0;
		pointer-events: none;
	}
	.ctl-group {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.ctl-dwell,
	.ctl-gap {
		width: 110px;
	}
	.ctl-dwell-seconds,
	.ctl-gap-seconds {
		width: 4.5em;
	}
	.readout {
		position: fixed;
		top: 8px;
		left: 8px;
		margin: 0;
		padding: 2px 8px;
		font-size: 13px;
		line-height: 1.4;
		color: #333;
		background: rgba(255, 255, 255, 0.85);
		border-radius: 4px;
		pointer-events: none;
	}
	.finish-status {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	.finish-screen {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		background: #fff;
		font-size: 1.5rem;
	}
</style>

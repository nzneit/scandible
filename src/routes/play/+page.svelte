<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { parseCodeList } from '$lib/codes';
	import { rowEntries } from '$lib/rows';
	import { decodeShareUrl, encodeRowsShareUrl, encodeShareUrl } from '$lib/shareUrl';
	import { formatFinishMessage, formatStepFinishMessage, type FinishedRun } from '$lib/finish';
	import { formatSeconds } from '$lib/seconds';
	import { DEFAULT_SETTINGS, type Settings } from '$lib/types';
	import type { Player } from '$lib/player';
	import type { StepSummary } from '$lib/stepper';
	import ScrollColumn, { type ScrollColumnHandle } from '$lib/components/ScrollColumn.svelte';
	import StepStage, { type StepStageHandle } from '$lib/components/StepStage.svelte';
	import PlayOverlay from '$lib/components/PlayOverlay.svelte';
	import FinishScreen from '$lib/components/FinishScreen.svelte';

	const OVERLAY_IDLE_MS = 3000;

	const decoded = decodeShareUrl(page.url);
	const settings: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
	if (decoded.settings.seed === undefined) {
		settings.seed = Math.floor(Math.random() * 0x100000000) >>> 0;
	}
	const entries = decoded.records
		? rowEntries(decoded.records)
		: parseCodeList(decoded.codes.join('\n'), settings.format, settings.ecc, settings.lax);
	const hasValid = entries.some((e) => e.valid);
	const count = entries.filter((e) => e.valid).length;

	let scroll: ScrollColumnHandle | undefined = $state();
	let step: StepStageHandle | undefined = $state();
	let playing = $state(settings.mode !== 'step');
	let speed = $state(settings.speedPxPerSec);
	let finish: { count: number; seconds: number } | null = $state(null);
	let stepFinish: StepSummary | null = $state(null);
	const finished = $derived.by(() => finish !== null || stepFinish !== null);
	let overlayVisible = $state(true);
	let overlay: ReturnType<typeof PlayOverlay> | undefined = $state();
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
		if (!playing || overlay?.hasKeyboardFocus()) return;
		overlayVisible = false;
	}
	function onKey(event: KeyboardEvent): void {
		if (finished) return; // the finish screen shows: no key steps, toggles or shows the overlay
		if (settings.mode !== 'step') return;
		if (event.altKey || event.ctrlKey || event.metaKey) return; // Alt+Arrow is browser Back
		showOverlay();
		if (event.repeat) return; // a held key moves once
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
	// $derived.by, not $derived: at the top level TypeScript narrows `finish` and `stepFinish` to
	// their initial null, and only a closure sees their declared types.
	const finishText = $derived.by(() =>
		stepFinish
			? formatStepFinishMessage(stepFinish)
			: finish
				? formatFinishMessage(finish.count, finish.seconds)
				: null
	);
	const run = $derived.by((): FinishedRun | null =>
		stepFinish
			? { mode: 'step', summary: stepFinish }
			: finish
				? { mode: 'scroll', ...finish }
				: null
	);
</script>

<svelte:window onpointermove={showOverlay} onpointerdown={showOverlay} onkeydown={onKey} />

{#if hasValid}
	<div class="play">
		<!-- Rendered for the page's life, so the stage never remounts; inert while the finish screen
		     shows. A spread, because inert={finished} renders no attribute in jsdom (M11). -->
		<div class="contents" {...finished ? { inert: true } : {}}>
			{#if settings.mode === 'step'}
				<StepStage
					bind:this={step}
					{entries}
					{settings}
					onFinish={(s) => {
						stepFinish = s;
						playing = false;
					}}
					onIndex={(index, count) => (position = { index, count })}
				/>
			{:else}
				<ScrollColumn bind:this={scroll} {entries} {settings} onFinish={(s) => (finish = s)} />
			{/if}
			{#if settings.mode === 'step'}
				<p
					class="readout pointer-events-none fixed top-2 left-2 m-0 max-w-[calc(100%-1rem)] rounded bg-base-100/85 px-2.5 py-1 text-base text-base-content forced-colors:border"
					aria-hidden="true"
				>
					{position.index + 1} / {position.count} · dwell {formatSeconds(dwell)} · gap {formatSeconds(
						gap
					)}{playing ? '' : ' · paused'}
				</p>
			{/if}
			<PlayOverlay
				bind:this={overlay}
				mode={settings.mode}
				visible={overlayVisible}
				{playing}
				{position}
				bind:dwell
				bind:gap
				bind:speed
				note={null}
				onToggle={toggle}
				onPrev={() => step?.prev()}
				onNext={() => step?.next()}
				onRestart={restart}
				onBack={back}
				onDwell={(ms) => step?.setDwell(ms)}
				onGap={(ms) => step?.setGap(ms)}
				onSpeed={(v) => scroll?.setSpeed(v)}
				onfocusin={showOverlay}
				onfocusout={showOverlay}
			/>
		</div>
		<!-- Mounted for the page's life, so the summary is announced as a change to an existing live
		     region: a status region inserted already holding its text is announced inconsistently.
		     Outside the inert wrapper, which would silence it. -->
		<p class="sr-only" role="status" aria-label="Run summary">{finishText ?? ''}</p>
		{#if run}<FinishScreen {run} onBack={back} onRestart={restart} />{/if}
	</div>
{/if}

<style>
	.play {
		position: fixed;
		inset: 0;
		background: #fff;
		overflow: hidden;
	}
</style>

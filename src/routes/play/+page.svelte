<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { parseCodeList } from '$lib/codes';
	import { decodeShareUrl, encodeShareUrl } from '$lib/shareUrl';
	import { formatFinishMessage } from '$lib/finish';
	import { DEFAULT_SETTINGS, type Settings } from '$lib/types';
	import ScrollColumn, { type ScrollColumnHandle } from '$lib/components/ScrollColumn.svelte';

	const OVERLAY_IDLE_MS = 3000;

	const decoded = decodeShareUrl(page.url);
	const settings: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
	if (decoded.settings.seed === undefined) {
		settings.seed = Math.floor(Math.random() * 0x100000000) >>> 0;
	}
	const entries = parseCodeList(decoded.codes.join('\n'), settings.format, settings.ecc);
	const hasValid = entries.some((e) => e.valid);

	let column: ScrollColumnHandle | undefined = $state();
	let playing = $state(true);
	let speed = $state(settings.speedPxPerSec);
	let finish: { count: number; seconds: number } | null = $state(null);
	let overlayVisible = $state(true);
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
		return { ...settings, speedPxPerSec: speed };
	}
	function back(): void {
		// The decoded share state plus the live speed, never the parsed entries.
		const url = resolve('/') + encodeShareUrl(decoded.codes, currentSettings());
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pathname IS resolve()-based; the rule cannot see through the fragment concatenation
		goto(url);
	}
	function toggle(): void {
		column?.toggle();
		playing = column?.isPlaying() ?? false;
	}
	function restart(): void {
		finish = null;
		column?.restart();
		playing = true;
	}
	function showOverlay(): void {
		if (!hasValid) return;
		overlayVisible = true;
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => (overlayVisible = false), OVERLAY_IDLE_MS);
	}
</script>

<svelte:window onpointermove={showOverlay} onpointerdown={showOverlay} />

{#if hasValid}
	<div class="play">
		<ScrollColumn bind:this={column} {entries} {settings} onFinish={(s) => (finish = s)} />
		<div class="overlay" class:hidden={!overlayVisible}>
			<button type="button" class="ctl-playpause" onclick={toggle}
				>{playing ? 'Pause' : 'Play'}</button
			>
			<input
				type="range"
				class="ctl-speed"
				min="10"
				max="5000"
				step="5"
				bind:value={speed}
				oninput={() => column?.setSpeed(speed)}
			/>
			<button type="button" class="ctl-restart" onclick={restart}>Restart</button>
			<button type="button" class="ctl-back" onclick={back}>Back</button>
		</div>
		{#if finish}
			<div class="finish-screen">
				<p class="finish-text">{formatFinishMessage(finish.count, finish.seconds)}</p>
				<button type="button" class="finish-restart" onclick={restart}>Restart</button>
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
	}
	.overlay.hidden {
		opacity: 0;
		pointer-events: none;
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

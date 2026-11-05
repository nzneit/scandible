<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { decodeShareUrl } from '$lib/shareUrl';
	import { Setup } from '$lib/setup.svelte';
	import CodesPane from '$lib/components/CodesPane.svelte';
	import SettingsPane from '$lib/components/SettingsPane.svelte';
	import ShareLink from '$lib/components/ShareLink.svelte';

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

<main class="setup-page mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pt-6 max-sm:px-4">
	<h1 class="text-2xl font-bold tracking-tight">scandible</h1>
	<div class="grid items-start gap-6 min-[900px]:grid-cols-[1.4fr_1fr]">
		<CodesPane {setup} />
		<SettingsPane {setup} />
	</div>
	<ShareLink hash={setup.shareHash} />
	<button
		type="button"
		class="start btn btn-primary btn-lg"
		disabled={!setup.canStart}
		onclick={start}>Start</button
	>
</main>

<style>
	.setup-page {
		padding-bottom: 1.5rem;
	}
	/* daisyUI dims a disabled btn to 1.39:1. Start keeps its primary look at half opacity, as
	   before, so it stays recognizable while it waits for a valid code. */
	.start:disabled {
		background-color: var(--color-primary);
		color: var(--color-primary-content);
		opacity: 0.5;
	}
</style>

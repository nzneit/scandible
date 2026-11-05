<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { decodeShareUrl } from '$lib/shareUrl';
	import { Setup } from '$lib/setup.svelte';
	import CodesPane from '$lib/components/CodesPane.svelte';
	import SettingsPane from '$lib/components/SettingsPane.svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';

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
</script>

<main class="setup-page mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pt-6 max-sm:px-4">
	<h1 class="text-2xl font-bold tracking-tight">scandible</h1>
	<div class="grid items-start gap-6 min-[900px]:grid-cols-[1.4fr_1fr]">
		<CodesPane {setup} />
		<SettingsPane {setup} />
	</div>
	<ActionBar {setup} />
</main>

<style>
	/* The pinned bar's height, which the page's bottom padding and the root's scroll padding keep
	   clear, so a control reached by Tab is never hidden behind the bar. */
	:global(html:has(.setup-page)) {
		--bar-height: 3.5rem;
		scroll-padding-bottom: calc(var(--bar-height) + env(safe-area-inset-bottom));
	}
	.setup-page {
		padding-bottom: calc(var(--bar-height) + env(safe-area-inset-bottom) + 1.5rem);
	}
	@media (max-width: 639.98px) {
		:global(html:has(.setup-page)) {
			--bar-height: 4.5rem;
		}
	}
	/* On short windows the bar is static at the end of the page: nothing to keep clear. */
	@media (max-height: 30rem) {
		:global(html:has(.setup-page)) {
			scroll-padding-bottom: 0;
		}
		.setup-page {
			padding-bottom: 1.5rem;
		}
	}
</style>

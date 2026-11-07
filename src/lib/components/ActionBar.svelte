<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { QrEcc } from '#lib/qr.ts';
	import type { Setup } from '#lib/setup.svelte.ts';
	import SharePanel from './SharePanel.svelte';

	interface ActionBarProps {
		setup: Setup;
	}

	let { setup }: ActionBarProps = $props();
	const uid = $props.id();

	let open = $state(false);
	// The QR level stays for the page's life, though the panel unmounts when it closes.
	let ecc: QrEcc = $state('M');
	let bar: HTMLElement | undefined = $state();
	let shareButton: HTMLElement | undefined = $state();

	const count = $derived.by(() => {
		const { ready, skipped } = setup.counts;
		return (
			`${ready} ${ready === 1 ? 'code' : 'codes'} ready` +
			(skipped > 0 ? ` · ${skipped} skipped` : '')
		);
	});

	// Close always returns focus to Share: Safari, macOS Firefox and iOS do not focus a clicked
	// button, so focus may be on <body> when Close is clicked.
	function close(): void {
		open = false;
		shareButton?.focus();
	}

	// Escape returns focus to Share only from inside the bar (the panel is in it), never from the
	// page. An Escape that something else already handled, such as closing a select's list, is left
	// alone.
	function onkeydown(e: KeyboardEvent): void {
		if (!open || e.key !== 'Escape' || e.defaultPrevented) return;
		if (bar?.contains(document.activeElement)) close();
		else open = false;
	}

	function start(): void {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pathname IS resolve()-based; the rule cannot see through the fragment concatenation
		goto(resolve('/play') + setup.shareHash);
	}
</script>

<svelte:document {onkeydown} />

<!-- The whole box, its top border included, is the bar's height plus the safe-area inset, so the
     page's scroll padding keeps a tabbed control exactly clear of it. -->
<div
	class="action-bar fixed inset-x-0 bottom-0 z-10 h-[calc(var(--bar-height)+env(safe-area-inset-bottom))] border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)] [@media(max-height:30rem)]:static"
	bind:this={bar}
>
	<div class="relative mx-auto flex h-full max-w-[1200px] items-center gap-2 px-6 max-sm:px-4">
		<p class="min-w-0 flex-1 text-sm">{count}</p>
		<button
			type="button"
			class="btn shrink-0"
			aria-expanded={open}
			aria-controls={open ? `${uid}-share` : undefined}
			bind:this={shareButton}
			onclick={() => (open = !open)}>Share</button
		>
		{#if open}
			<SharePanel
				id="{uid}-share"
				class="absolute right-6 bottom-full mb-2 max-h-[calc(100dvh-var(--bar-height)-env(safe-area-inset-bottom)-1rem)] w-[min(24rem,100vw-2rem)] overflow-y-auto max-sm:right-4 max-sm:max-h-[60dvh]"
				hash={setup.shareHash}
				bind:ecc
				onclose={close}
			/>
		{/if}
		<button
			type="button"
			class="start btn shrink-0 btn-primary"
			disabled={!setup.canStart}
			onclick={start}>Start</button
		>
	</div>
</div>

<style>
	/* daisyUI dims a disabled btn to 1.39:1. Start keeps its primary look at half opacity, as
	   before, so it stays recognizable while it waits for a valid code. */
	.start:disabled {
		background-color: var(--color-primary);
		color: var(--color-primary-content);
		opacity: 0.5;
	}
</style>

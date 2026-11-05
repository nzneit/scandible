<script lang="ts">
	import type { Snippet } from 'svelte';
	import Note from './Note.svelte';

	interface HintProps {
		summary: string;
		id?: string; // on the hint's paragraph, for a control's aria-describedby
		class?: string;
		children: Snippet; // the hint text, word for word
	}

	let { summary, id, class: className, children }: HintProps = $props();
</script>

<details class={['hint group', className]}>
	<summary class="cursor-pointer list-none text-base-content/70"
		><span aria-hidden="true" class="inline-block transition-transform group-open:rotate-90">▸</span
		>
		{summary}</summary
	>
	<Note class="mt-1" {id}>{@render children()}</Note>
</details>

<style>
	summary::-webkit-details-marker {
		display: none;
	}
</style>

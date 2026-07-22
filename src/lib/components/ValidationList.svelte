<script lang="ts">
	import type { CodeEntry } from '$lib/types';

	let { entries }: { entries: CodeEntry[] } = $props();

	// Single expression per row so exact-textContent tests stay byte-stable.
	const rowText = (entry: CodeEntry): string =>
		entry.valid
			? entry.encoded !== undefined && entry.encoded !== entry.value
				? `${entry.raw} ✓ → ${entry.encoded}`
				: `${entry.raw} ✓`
			: `${entry.raw} ✗ invalid`;
</script>

<ul class="validation-list">
	{#each entries as entry, i (i)}
		<li class={entry.valid ? 'valid' : 'invalid'}>{rowText(entry)}</li>
	{/each}
</ul>

<style>
	.validation-list {
		list-style: none;
		padding: 0;
		margin: 0;
		max-height: 200px;
		overflow: auto;
	}
	.validation-list .valid {
		color: #0a0;
	}
	.validation-list .invalid {
		color: #c00;
	}
</style>

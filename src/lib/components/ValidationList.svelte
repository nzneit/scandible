<script lang="ts">
	import type { UpcEntry } from '$lib/types';

	let { entries }: { entries: UpcEntry[] } = $props();
</script>

<ul class="validation-list">
	{#each entries as entry, i (i)}
		<li class={entry.valid ? 'valid' : 'invalid'}>{entry.raw} {entry.valid ? '✓' : '✗ invalid'}</li>
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

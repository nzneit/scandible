<script lang="ts">
	import type { CodeEntry } from '$lib/types';
	import { DENSE_HINT, verdictText } from '$lib/verdict';

	let { entries }: { entries: CodeEntry[] } = $props();
</script>

<ul class="validation-list">
	{#each entries as entry, i (i)}
		<li class={entry.valid ? 'valid' : 'invalid'}>
			<span class="raw">{entry.raw}</span><span class="verdict">{verdictText(entry)}</span>
		</li>
	{/each}
</ul>
{#if entries.some((e) => e.facts?.dense)}
	<p class="dense-hint">{DENSE_HINT}</p>
{/if}

<style>
	.validation-list {
		list-style: none;
		padding: 0;
		margin: 0;
		max-height: 200px;
		overflow: auto;
	}
	/* The verdict drops below the payload when both do not fit. */
	.validation-list li {
		display: flex;
		flex-wrap: wrap;
	}
	.validation-list .raw {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.validation-list .verdict {
		white-space: pre-wrap;
	}
	.validation-list .valid {
		color: #007700;
	}
	.validation-list .invalid {
		color: #c00;
	}
</style>

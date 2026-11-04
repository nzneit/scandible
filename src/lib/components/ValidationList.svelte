<script lang="ts">
	import type { CodeEntry } from '$lib/types';
	import Gs1Breakdown from './Gs1Breakdown.svelte';
	import Note from './Note.svelte';
	import { displayData } from '$lib/gs1';
	import { DENSE_HINT, SCAN_HINT, verdictText } from '$lib/verdict';

	let { entries }: { entries: CodeEntry[] } = $props();
</script>

<ul class="validation-list font-mono text-sm" aria-label="Validation results">
	{#each entries as entry, i (i)}
		<!-- No whitespace between the verdict and the breakdown: the li text stays as it was. -->
		<li
			class={entry.lint !== undefined
				? 'lenient text-warning'
				: entry.valid
					? 'valid text-success'
					: 'invalid text-error'}
		>
			<span class="raw">{displayData(entry.raw)}</span><span class="verdict"
				>{verdictText(entry)}</span
			>{#if entry.gs1}<div class="breakdown">
					<Gs1Breakdown data={entry.gs1.data} label="Code {i + 1} breakdown" />
				</div>{/if}
		</li>
	{/each}
</ul>
{#if entries.some((e) => e.gs1)}
	<Note class="scan-hint">{SCAN_HINT}</Note>
{/if}
{#if entries.some((e) => e.facts?.dense)}
	<Note class="dense-hint">{DENSE_HINT}</Note>
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
	.validation-list .breakdown {
		flex-basis: 100%;
		min-width: 0;
	}
	/* The details element belongs to the child component, hence :global. */
	.validation-list:has(:global(details[open])) {
		max-height: 60vh;
	}
	.validation-list .raw {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.validation-list .verdict {
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}
</style>

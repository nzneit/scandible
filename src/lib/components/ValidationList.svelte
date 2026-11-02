<script lang="ts">
	import type { CodeEntry } from '$lib/types';
	import { FORMAT_BY_ID, eccChoice } from '$lib/formats';

	let { entries }: { entries: CodeEntry[] } = $props();

	const DENSE_HINT =
		'Dense: more than 100 modules across (PDF417: 300), so each module is small on screen. If the scanner misses these, shorten the payload, lower error correction if the format offers it, or go full screen.';

	const labelOf = (entry: CodeEntry) => FORMAT_BY_ID.get(entry.format)?.label;
	const levelOf = (entry: CodeEntry) => {
		const d = FORMAT_BY_ID.get(entry.format);
		return d && eccChoice(d, entry.options.ecc);
	};

	// Single expression per row so exact-textContent tests stay byte-stable.
	const verdict = (entry: CodeEntry): string =>
		entry.valid
			? entry.facts
				? ` ✓ · ${entry.facts.summary} · ${entry.facts.bytes === 1 ? '1 byte' : `${entry.facts.bytes} bytes`}${entry.facts.bytes !== entry.value.length ? ' · UTF-8, no ECI' : ''}${entry.facts.dense ? ' · dense' : ''}`
				: entry.encoded !== undefined && entry.encoded !== entry.value
					? ` ✓ → ${entry.encoded}`
					: ' ✓'
			: entry.reason === 'too-long'
				? levelOf(entry)
					? ` ✗ too long for ${labelOf(entry)} (${levelOf(entry)?.label})`
					: ` ✗ too long for ${labelOf(entry)}`
				: ' ✗ invalid';
</script>

<ul class="validation-list">
	{#each entries as entry, i (i)}
		<li class={entry.valid ? 'valid' : 'invalid'}>
			<span class="raw">{entry.raw}</span><span class="verdict">{verdict(entry)}</span>
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
	.validation-list li {
		display: flex;
	}
	.validation-list .raw {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.validation-list .verdict {
		flex: none;
		white-space: pre;
	}
	.validation-list .valid {
		color: #007700;
	}
	.validation-list .invalid {
		color: #c00;
	}
</style>

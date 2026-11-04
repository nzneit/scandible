<script lang="ts">
	import { breakdown } from '$lib/gs1';

	let { data, label, today }: { data: string; label?: string; today?: Date } = $props();

	const now = new Date();
	const result = $derived(breakdown(data, today ?? now));
	const count = $derived(result.lines.length);
	const summary = $derived(
		count === 0 && result.stop !== undefined
			? 'No readable Application Identifiers'
			: `${count === 1 ? '1 Application Identifier' : `${count} Application Identifiers`}${result.stop !== undefined ? ', then reading stops' : ''}`
	);
</script>

<details class="gs1-breakdown">
	<summary aria-label={label ? `${label}: ${summary}` : undefined}>{summary}</summary>
	<table>
		<thead>
			<tr>
				<th><span class="visually-hidden">Application Identifier</span></th>
				<th><span class="visually-hidden">Name</span></th>
				<th><span class="visually-hidden">Value</span></th>
			</tr>
		</thead>
		<tbody>
			{#each result.lines as line, i (i)}
				<tr>
					<th scope="row">({line.ai})</th>
					<td>{line.title ?? '—'}</td>
					<td>{line.text}</td>
				</tr>
			{/each}
			{#if result.stop !== undefined}
				<tr>
					<td colspan="3"
						>⚠ Reading stops here: {result.stop}. A receiving system may stop here too.</td
					>
				</tr>
			{/if}
		</tbody>
	</table>
</details>

<style>
	.gs1-breakdown {
		position: relative;
		color: CanvasText;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		text-align: start;
		vertical-align: top;
	}
	th[scope='row'] {
		white-space: nowrap;
	}
	td:last-child {
		overflow-wrap: anywhere;
	}
	thead th {
		padding: 0;
		border: 0;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
		padding: 0;
	}
</style>

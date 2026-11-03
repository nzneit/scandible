<script lang="ts">
	import { tick } from 'svelte';
	import { FORMAT_BY_ID, FORMAT_GROUPS, canonicalEcc, type FormatId } from '$lib/formats';
	import { rowEntry, type Row } from '$lib/rows';
	import { DENSE_HINT, verdictText } from '$lib/verdict';

	interface RowEditorProps {
		rows: Row[]; // bound by the page to its deep $state rows; the editor mutates and reassigns it
		newRowFormat: FormatId; // the format Add code gives a new row: the page's list format
	}

	let { rows = $bindable(), newRowFormat }: RowEditorProps = $props();
	const uid = $props.id();

	const ROW_HINT =
		'Each row is one code. Enter adds a line to the code. To enter many codes at once, use Plain text or upload a file.';

	let listEl: HTMLElement | undefined = $state();
	let addEl: HTMLElement | undefined = $state();

	/** The control matching `selector` in the row at index k, or null when there is none. */
	function controlOf(k: number, selector: string): HTMLElement | null {
		return listEl?.querySelectorAll('li.row')[k]?.querySelector<HTMLElement>(selector) ?? null;
	}

	/** Swap row i with its neighbor, then refocus the moved row: the keyed each detaches a node to
	 *  move it, which drops focus. Focus goes to the button just pressed, or to the row's other
	 *  move button when the move has disabled the pressed one. */
	async function move(i: number, by: -1 | 1): Promise<void> {
		const j = i + by;
		const next = [...rows];
		[next[i], next[j]] = [next[j], next[i]];
		rows = next;
		await tick();
		const [pressed, other] = by < 0 ? ['.row-up', '.row-down'] : ['.row-down', '.row-up'];
		const disabled = by < 0 ? j === 0 : j === rows.length - 1;
		controlOf(j, disabled ? other : pressed)?.focus();
	}

	/** Remove row i, then focus the next row's payload, or Add code when row i was the last. */
	async function remove(i: number): Promise<void> {
		rows = rows.filter((_, k) => k !== i);
		await tick();
		(controlOf(i, '.row-payload') ?? addEl)?.focus();
	}

	/** Append a blank row at the format for new rows, then focus its payload. */
	async function add(): Promise<void> {
		rows = [...rows, { payload: '', format: newRowFormat, ecc: '', lax: false }];
		await tick();
		controlOf(rows.length - 1, '.row-payload')?.focus();
	}
</script>

<ol class="row-editor" role="list" bind:this={listEl}>
	{#each rows as row, i (row)}
		{@const entry = rowEntry(row)}
		{@const opt = FORMAT_BY_ID.get(row.format)?.ecc}
		<li class="row">
			<div class="row-main">
				<span class="row-number">{i + 1}</span>
				<textarea
					class="row-payload"
					rows="2"
					aria-label="Code {i + 1}"
					aria-describedby="{uid}-verdict-{i}"
					bind:value={row.payload}></textarea>
			</div>
			<div class="row-controls">
				<span
					class="row-verdict"
					class:valid={entry?.valid === true}
					class:invalid={entry?.valid === false}
					id="{uid}-verdict-{i}">{entry ? verdictText(entry) : ' skipped (empty)'}</span
				>
				<select
					class="row-format"
					aria-label="Format of code {i + 1}"
					bind:value={
						() => row.format,
						(next) => {
							row.ecc = canonicalEcc(next, row.ecc);
							row.format = next;
						}
					}
				>
					{#each FORMAT_GROUPS as { group, formats } (group)}
						<optgroup label={group}>
							{#each formats as f (f.id)}
								<option value={f.id}>{f.label}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
				{#if opt}
					<select
						class="row-ecc"
						aria-label="Error correction of code {i + 1}"
						bind:value={
							() => row.ecc || opt.defaultValue, (v) => (row.ecc = v === opt.defaultValue ? '' : v)
						}
					>
						{#each opt.choices as c (c.value)}
							<option value={c.value}>{c.note ? `${c.label} (${c.note})` : c.label}</option>
						{/each}
					</select>
				{/if}
				<button
					type="button"
					class="row-up"
					aria-label="Move up, code {i + 1}"
					disabled={i === 0}
					onclick={() => move(i, -1)}>Move up</button
				>
				<button
					type="button"
					class="row-down"
					aria-label="Move down, code {i + 1}"
					disabled={i === rows.length - 1}
					onclick={() => move(i, 1)}>Move down</button
				>
				<button
					type="button"
					class="row-delete"
					aria-label="Delete code {i + 1}"
					onclick={() => remove(i)}>Delete</button
				>
			</div>
		</li>
	{/each}
</ol>
<button type="button" class="row-add" bind:this={addEl} onclick={add}>Add code</button>
<p class="row-hint">{ROW_HINT}</p>
{#if rows.some((r) => rowEntry(r)?.facts?.dense)}
	<p class="dense-hint">{DENSE_HINT}</p>
{/if}

<style>
	.row-editor {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	/* The number and the payload; the verdict and the controls go on the line beneath. */
	.row-main {
		display: flex;
		gap: 6px;
		align-items: flex-start;
	}
	.row-payload {
		flex: 1;
		min-width: 0;
		font-family: monospace;
	}
	/* Grow the payload with its content where the browser supports it. */
	@supports (field-sizing: content) {
		.row-payload {
			field-sizing: content;
			min-height: 2lh;
		}
	}
	.row-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}
	/* A touch target. */
	.row-controls button {
		min-height: 36px;
	}
	/* Sets Delete apart from the Move buttons, at the end of its line. */
	.row-delete {
		margin-left: auto;
	}
	.row-verdict.valid {
		color: #007700;
	}
	.row-verdict.invalid {
		color: #c00;
	}
</style>

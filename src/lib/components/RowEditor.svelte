<script lang="ts">
	import { tick } from 'svelte';
	import Gs1Breakdown from './Gs1Breakdown.svelte';
	import Hint from './Hint.svelte';
	import FormatSelect from './FormatSelect.svelte';
	import EccSelect from './EccSelect.svelte';
	import { FORMAT_BY_ID, canonicalEcc, canonicalLax, isGs1, type FormatId } from '$lib/formats';
	import { rowEntry, type Row } from '$lib/rows';
	import { DENSE_HINT, GS1_HINT, LAX_NOTE, SCAN_HINT, verdictText } from '$lib/verdict';

	interface RowEditorProps {
		rows: Row[]; // bound by the page to its deep $state rows; the editor mutates and reassigns it
		newRowFormat: FormatId; // the format Add code gives a new row: the page's list format
	}

	let { rows = $bindable(), newRowFormat }: RowEditorProps = $props();
	const uid = $props.id();
	const entries = $derived(rows.map((row) => rowEntry(row)));

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

{#snippet icon(d: string)}
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		class="size-4"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"><path {d} /></svg
	>
{/snippet}

<ol class="row-editor" role="list" aria-label="Codes" bind:this={listEl}>
	{#each rows as row, i (row)}
		{@const entry = entries[i]}
		{@const opt = FORMAT_BY_ID.get(row.format)?.ecc}
		{@const valid = entry?.valid === true && entry.lint === undefined}
		{@const lenient = entry?.lint !== undefined}
		{@const invalid = entry?.valid === false}
		<li class="row border-b border-base-300 pb-3">
			<div class="flex flex-col gap-2" role="group" aria-label="Code {i + 1}">
				<div class="flex items-start gap-2">
					<span class="row-number w-6 shrink-0 pt-1 text-end text-base-content/70">{i + 1}</span>
					<textarea
						class="row-payload textarea min-h-0 min-w-0 flex-1 font-mono"
						rows="2"
						aria-label="Code {i + 1}"
						aria-describedby="{uid}-verdict-{i}"
						bind:value={row.payload}></textarea>
					<div class="flex shrink-0 gap-1">
						<button
							type="button"
							class="row-up btn btn-square btn-sm"
							aria-label="Move up, code {i + 1}"
							title="Move up"
							disabled={i === 0}
							onclick={() => move(i, -1)}>{@render icon('M12 19V5M5 12l7-7 7 7')}</button
						>
						<button
							type="button"
							class="row-down btn btn-square btn-sm"
							aria-label="Move down, code {i + 1}"
							title="Move down"
							disabled={i === rows.length - 1}
							onclick={() => move(i, 1)}>{@render icon('M12 5v14M5 12l7 7 7-7')}</button
						>
						<button
							type="button"
							class="row-delete btn ms-3 btn-ghost btn-square text-error btn-sm"
							aria-label="Delete code {i + 1}"
							title="Delete"
							onclick={() => remove(i)}>{@render icon('M6 6l12 12M18 6L6 18')}</button
						>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-2 ps-8">
					<FormatSelect
						class="row-format"
						aria-label="Format of code {i + 1}"
						bind:value={
							() => row.format,
							(next) => {
								row.ecc = canonicalEcc(next, row.ecc);
								row.lax = canonicalLax(next, row.lax);
								row.format = next;
							}
						}
					/>
					{#if opt}
						<EccSelect
							class="row-ecc"
							aria-label="Error correction of code {i + 1}"
							option={opt}
							bind:value={row.ecc}
						/>
					{/if}
					{#if isGs1(FORMAT_BY_ID.get(row.format))}
						<label class="flex items-center gap-2"
							><input
								type="checkbox"
								class="checkbox checkbox-sm"
								aria-label="Render if invalid, code {i + 1}"
								bind:checked={row.lax}
							/> Render if invalid</label
						>
					{/if}
				</div>
				<span
					class="row-verdict ps-8"
					class:valid
					class:lenient
					class:invalid
					class:text-success={valid}
					class:text-warning={lenient}
					class:text-error={invalid}
					id="{uid}-verdict-{i}">{entry ? verdictText(entry) : ' skipped (empty)'}</span
				>
				{#if entry?.gs1}
					<div class="ps-8">
						<Gs1Breakdown data={entry.gs1.data} label="Code {i + 1} breakdown" />
					</div>
				{/if}
			</div>
		</li>
	{/each}
</ol>
<button type="button" class="row-add btn self-start btn-sm" bind:this={addEl} onclick={add}
	>Add code</button
>
<Hint summary="How rows work" class="row-hint">{ROW_HINT}</Hint>
{#if rows.some((r) => isGs1(FORMAT_BY_ID.get(r.format))) || isGs1(FORMAT_BY_ID.get(newRowFormat))}
	<Hint summary="How to write GS1 data" class="gs1-hint">{GS1_HINT}</Hint>
	<Hint summary="What can never be rendered anyway" class="lax-note">{LAX_NOTE}</Hint>
{/if}
{#if entries.some((e) => e?.gs1)}
	<Hint summary="What the arrow and GS mark mean" class="scan-hint">{SCAN_HINT}</Hint>
{/if}
{#if entries.some((e) => e?.facts?.dense)}
	<Hint summary="If dense codes don't scan" class="dense-hint">{DENSE_HINT}</Hint>
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
	/* Grow the payload with its content where the browser supports it. */
	@supports (field-sizing: content) {
		.row-payload {
			field-sizing: content;
			min-height: 2lh;
		}
	}
	.row-verdict {
		overflow-wrap: anywhere;
	}
</style>

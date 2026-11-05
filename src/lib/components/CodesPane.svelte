<script lang="ts">
	import { tick } from 'svelte';
	import { describeLoss } from '$lib/rows';
	import { isGs1 } from '$lib/formats';
	import { GS1_HINT, LAX_NOTE } from '$lib/verdict';
	import type { Editor, Setup } from '$lib/setup.svelte';
	import Section from './Section.svelte';
	import Hint from './Hint.svelte';
	import Segmented from './Segmented.svelte';
	import Field from './Field.svelte';
	import Note from './Note.svelte';
	import FormatSelect from './FormatSelect.svelte';
	import EccSelect from './EccSelect.svelte';
	import RowEditor from './RowEditor.svelte';
	import ValidationList from './ValidationList.svelte';

	interface CodesPaneProps {
		setup: Setup;
	}

	let { setup }: CodesPaneProps = $props();
	const uid = $props.id();

	const EDITORS: { value: Editor; text: string }[] = [
		{ value: 'text', text: 'Plain text' },
		{ value: 'rows', text: 'Per row' }
	];
	const EDITOR_HINT =
		'Per row gives each code its own format, error-correction level and GS1 validation setting, and lets a code span several lines.';

	let editorSwitch: Segmented<Editor> | undefined = $state();

	// After a switch to Plain text, Switch anyway or Cancel, focus goes to the switch's checked
	// radio, so it does not fall to body when the note unmounts. selectEditor runs before any
	// await: Segmented snaps a refused choice back as soon as onchange returns.
	async function onEditor(next: Editor): Promise<void> {
		if (setup.selectEditor(next) !== 'to-text') return;
		await tick();
		editorSwitch?.focus();
	}

	async function onSwitchAnyway(): Promise<void> {
		if (!setup.switchAnyway()) return;
		await tick();
		editorSwitch?.focus();
	}

	async function onCancelSwitch(): Promise<void> {
		setup.cancelSwitch();
		await tick();
		editorSwitch?.focus();
	}

	async function onFile(e: Event): Promise<void> {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			await setup.loadFile(file);
		} finally {
			input.value = '';
		}
	}
</script>

<Section title="Codes" headingId="{uid}-codes">
	{#snippet actions()}
		<div class="flex flex-wrap items-center gap-2 max-sm:basis-full">
			<Segmented
				bind:this={editorSwitch}
				name="{uid}-editor"
				label="Editor"
				options={EDITORS}
				value={setup.editor}
				onchange={onEditor}
			/>
			<label
				class="btn btn-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-base-content"
				>Upload file<input
					type="file"
					class="sr-only"
					accept=".txt,.csv"
					onchange={onFile}
				/></label
			>
		</div>
	{/snippet}
	{#if setup.editor === 'text'}
		<Hint summary="What Per row adds">{EDITOR_HINT}</Hint>
	{/if}
	{#if setup.pending}
		<div class="switch-note alert alert-warning alert-soft flex flex-wrap gap-2" role="alert">
			<p>{describeLoss(setup.pending.loses, setup.pending)}</p>
			<button type="button" class="switch-anyway btn btn-sm" onclick={onSwitchAnyway}
				>Switch anyway</button
			>
			<button type="button" class="switch-cancel btn btn-sm" onclick={onCancelSwitch}>Cancel</button
			>
		</div>
	{/if}
	<Field label={setup.editor === 'rows' ? 'Format for new rows' : 'Format'}>
		<FormatSelect class="format-input" bind:value={setup.format} />
	</Field>
	{#if setup.editor === 'text' && isGs1(setup.descriptor)}
		<Hint summary="How to write GS1 data">{GS1_HINT}</Hint>
	{/if}
	{#if setup.editor === 'text' && setup.descriptor?.ecc}
		{@const opt = setup.descriptor.ecc}
		<Field label="Error correction" class="ecc-field">
			<EccSelect class="ecc-input" option={opt} bind:value={setup.ecc} />
		</Field>
	{/if}
	{#if setup.editor === 'text' && isGs1(setup.descriptor)}
		<Field label="Render GS1 data that fails validation" class="lax-field">
			<input
				type="checkbox"
				class="lax-input checkbox checkbox-sm"
				bind:checked={setup.lax}
				aria-describedby="{uid}-lax-note"
			/>
		</Field>
		<Hint summary="What can never be rendered anyway" id="{uid}-lax-note">{LAX_NOTE}</Hint>
	{/if}
	{#if setup.editor === 'text'}
		<textarea
			class="code-input textarea w-full font-mono"
			aria-labelledby="{uid}-codes"
			rows="8"
			placeholder={setup.placeholder}
			bind:value={setup.text}
			oninput={() => (setup.fileError = '')}></textarea>
		<ValidationList entries={setup.entries} />
	{:else}
		<!-- A function binding: with bind:rows={setup.rows}, Svelte warns (ownership_invalid_binding)
		     that the page passes `setup` without bind:. The Setup owns its rows; each pane acts on it. -->
		<RowEditor
			bind:rows={() => setup.rows, (next) => (setup.rows = next)}
			newRowFormat={setup.format}
		/>
	{/if}
	<Note class="file-error" tone="error" role="alert" hidden={!setup.fileError}
		>{setup.fileError}</Note
	>
</Section>

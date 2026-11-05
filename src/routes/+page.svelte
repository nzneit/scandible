<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { describeLoss } from '$lib/rows';
	import { isGs1 } from '$lib/formats';
	import { GS1_HINT, LAX_NOTE } from '$lib/verdict';
	import { decodeShareUrl } from '$lib/shareUrl';
	import { DWELL_RANGE, GAP_RANGE } from '$lib/types';
	import { Setup, type Editor } from '$lib/setup.svelte';
	import ValidationList from '$lib/components/ValidationList.svelte';
	import RowEditor from '$lib/components/RowEditor.svelte';
	import ShareLink from '$lib/components/ShareLink.svelte';
	import Field from '$lib/components/Field.svelte';
	import FormatSelect from '$lib/components/FormatSelect.svelte';
	import EccSelect from '$lib/components/EccSelect.svelte';
	import Note from '$lib/components/Note.svelte';
	import SecondsSlider from '$lib/components/SecondsSlider.svelte';

	const decoded = decodeShareUrl(page.url);
	const seed = decoded.settings.seed ?? Math.floor(Math.random() * 0x100000000) >>> 0;
	const setup = new Setup(decoded, seed);

	let editorSelect: HTMLSelectElement | undefined = $state();
	const EDITOR_HINT =
		'Per row gives each code its own format, error-correction level and GS1 validation setting, and lets a code span several lines.';
	const uid = $props.id();

	// The select is not bound: after a lossy attempt `setup.editor` is still 'rows', and only this
	// write snaps the select back to Per row.
	async function onEditorChange(e: Event & { currentTarget: HTMLSelectElement }): Promise<void> {
		const select = e.currentTarget;
		const result = setup.selectEditor(select.value as Editor);
		select.value = setup.editor;
		if (result === 'to-text') {
			await tick();
			editorSelect?.focus();
		}
	}

	// Focus returns to the select, so it does not fall to body when the note unmounts.
	async function onSwitchAnyway(): Promise<void> {
		if (!setup.switchAnyway()) return;
		await tick();
		editorSelect?.focus();
	}

	async function onCancelSwitch(): Promise<void> {
		setup.cancelSwitch();
		await tick();
		editorSelect?.focus();
	}

	// A pasted share link or an edited fragment on the same path is a same-document navigation,
	// so SvelteKit updates `page.url` without remounting and this page (which decodes once) must
	// reload. Our own `goto` calls use pushState/replaceState, which never fire `hashchange`.
	onMount(() => {
		const reload = () => location.reload();
		window.addEventListener('hashchange', reload);
		return () => window.removeEventListener('hashchange', reload);
	});

	async function onFileChange(e: Event): Promise<void> {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			await setup.loadFile(file);
		} finally {
			input.value = '';
		}
	}

	function start(): void {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pathname IS resolve()-based; the rule cannot see through the fragment concatenation
		goto(resolve('/play') + setup.shareHash);
	}
</script>

<div class="setup bg-base-100">
	<h1 class="text-2xl font-bold tracking-tight">scandible</h1>
	<Field label="Editor">
		<select
			class="editor-input select select-sm w-auto"
			bind:this={editorSelect}
			value={setup.editor}
			onchange={onEditorChange}
		>
			<option value="text">Plain text</option>
			<option value="rows">Per row</option>
		</select>
	</Field>
	{#if setup.editor === 'text'}
		<Note class="editor-hint">{EDITOR_HINT}</Note>
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
	{#if setup.editor === 'text'}
		<textarea
			class="code-input textarea w-full font-mono"
			aria-label="Codes"
			rows="8"
			placeholder={setup.placeholder}
			bind:value={setup.text}
			oninput={() => (setup.fileError = '')}></textarea>
	{:else}
		<RowEditor bind:rows={setup.rows} newRowFormat={setup.format} />
	{/if}
	<input
		type="file"
		class="file-input file-input-sm w-auto self-start"
		accept=".txt,.csv"
		aria-label="Load codes from a file"
		onchange={onFileChange}
	/>
	<Note class="file-error" tone="error" hidden={!setup.fileError}>{setup.fileError}</Note>
	<div class="settings-row">
		<Field label={setup.editor === 'rows' ? 'Format for new rows' : 'Format'}>
			<FormatSelect class="format-input" bind:value={setup.format} />
		</Field>
		{#if setup.editor === 'text' && isGs1(setup.descriptor)}
			<Note class="gs1-hint">{GS1_HINT}</Note>
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
			<Note class="lax-note" id="{uid}-lax-note">{LAX_NOTE}</Note>
		{/if}
		<Field label="Playback">
			<select class="mode-input select select-sm w-auto" bind:value={setup.mode}>
				<option value="scroll">Scroll</option>
				<option value="step">Step</option>
			</select>
		</Field>
		{#if setup.mode === 'step'}
			<Field label="Dwell">
				<SecondsSlider
					bind:value={setup.dwellMs}
					range={DWELL_RANGE}
					label="Dwell"
					rangeAriaLabel="Dwell"
					rangeClass="dwell-input"
					secondsClass="dwell-seconds"
				/>
			</Field>
			{#if setup.dwellMs < 330}
				<Note class="flash-note" tone="warning">
					Dwells under 0.33 s flash the screen more than three times a second. Do not use them near
					anyone sensitive to flashing lights.
				</Note>
			{/if}
			<Field label="Gap">
				<SecondsSlider
					bind:value={setup.gapMs}
					range={GAP_RANGE}
					label="Gap"
					rangeAriaLabel="Gap"
					rangeClass="gap-input"
					secondsClass="gap-seconds"
				/>
			</Field>
			{#if setup.gapMs < 1000 && setup.dupPairs.length > 0}
				<Note class="dup-hint" tone="warning">{setup.dupHint}</Note>
			{/if}
		{:else}
			<Field label="Speed">
				<input
					type="range"
					class="speed-input range range-sm w-32"
					min="10"
					max="5000"
					step="5"
					bind:value={setup.speedPxPerSec}
				/>
			</Field>
		{/if}
		<Field label="Loop">
			<input type="checkbox" class="loop-input toggle toggle-sm" bind:checked={setup.loop} />
		</Field>
		<Field label="Random rotation">
			<input
				type="checkbox"
				class="rotate-input toggle toggle-sm"
				aria-label="Random rotation"
				bind:checked={setup.rotate}
			/>
			<input
				type="range"
				class="rotate-max-input range range-sm w-32"
				aria-label="Maximum rotation"
				min="1"
				max="30"
				step="1"
				bind:value={setup.rotateMaxDeg}
				disabled={!setup.rotate}
			/>
		</Field>
		<Field label="Random skew">
			<input
				type="checkbox"
				class="skew-input toggle toggle-sm"
				aria-label="Random skew"
				bind:checked={setup.skew}
			/>
			<input
				type="range"
				class="skew-max-input range range-sm w-32"
				aria-label="Maximum skew"
				min="1"
				max="30"
				step="1"
				bind:value={setup.skewMaxDeg}
				disabled={!setup.skew}
			/>
		</Field>
	</div>
	{#if setup.editor === 'text'}
		<ValidationList entries={setup.entries} />
	{/if}
	<ShareLink hash={setup.shareHash} />
	<button
		type="button"
		class="start btn btn-primary btn-lg"
		disabled={!setup.canStart}
		onclick={start}>Start</button
	>
</div>

<style>
	.setup {
		max-width: 640px;
		margin: 0 auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	/* Each setting on its own line: label text on top, input(s) below, spaced apart. */
	.settings-row {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	/* daisyUI dims a disabled btn to 1.39:1. Start keeps its primary look at half opacity, as
	   before, so it stays recognizable while it waits for a valid code. */
	.start:disabled {
		background-color: var(--color-primary);
		color: var(--color-primary-content);
		opacity: 0.5;
	}
</style>

<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { parseCodeList } from '$lib/codes';
	import {
		describeLoss,
		rowEntries,
		rowNumbers,
		rowsFromText,
		textFromRows,
		type Row,
		type TextConversion
	} from '$lib/rows';
	import {
		FORMAT_BY_ID,
		FORMAT_GROUPS,
		canonicalEcc,
		canonicalLax,
		isGs1,
		type FormatId
	} from '$lib/formats';
	import { GS1_HINT, LAX_NOTE } from '$lib/verdict';
	import { readCodesFile } from '$lib/fileInput';
	import { decodeShareUrl, encodeRowsShareUrl, encodeShareUrl } from '$lib/shareUrl';
	import {
		DEFAULT_SETTINGS,
		DWELL_RANGE,
		GAP_RANGE,
		type Settings,
		type CodeEntry
	} from '$lib/types';
	import { formatSeconds, parseSeconds } from '$lib/seconds';
	import { duplicateNeighbours } from '$lib/duplicates';
	import ValidationList from '$lib/components/ValidationList.svelte';
	import RowEditor from '$lib/components/RowEditor.svelte';
	import ShareLink from '$lib/components/ShareLink.svelte';

	const decoded = decodeShareUrl(page.url);
	const initial: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
	const seed = decoded.settings.seed ?? Math.floor(Math.random() * 0x100000000) >>> 0;

	let text = $state(decoded.codes.join('\n'));
	let editor: 'text' | 'rows' = $state(decoded.records ? 'rows' : 'text');
	let rows: Row[] = $state(decoded.records ?? []);
	let pending: TextConversion | null = $state(null);
	let editorSelect: HTMLSelectElement | undefined = $state();
	const EDITOR_HINT =
		'Per row gives each code its own format, error-correction level and GS1 validation setting, and lets a code span several lines.';
	let speedPxPerSec = $state(initial.speedPxPerSec);
	let loop = $state(initial.loop);
	let rotate = $state(initial.rotate);
	let rotateMaxDeg = $state(initial.rotateMaxDeg);
	let skew = $state(initial.skew);
	let skewMaxDeg = $state(initial.skewMaxDeg);
	let format = $state(initial.format);
	let ecc = $state(initial.ecc);
	let lax = $state(initial.lax);
	let mode = $state(initial.mode);
	let dwellMs = $state(initial.dwellMs);
	let gapMs = $state(initial.gapMs);
	const descriptor = $derived(FORMAT_BY_ID.get(format));
	const uid = $props.id();
	let fileError = $state('');

	const entries: CodeEntry[] = $derived(
		editor === 'rows' ? rowEntries(rows) : parseCodeList(text, format, ecc, lax)
	);
	const rawCodes: string[] = $derived(entries.map((e) => e.raw));
	const canStart: boolean = $derived(entries.some((e) => e.valid));
	const placeholder: string = $derived(
		isGs1(descriptor)
			? 'Paste GS1 element strings — one per line'
			: descriptor?.numeric
				? 'Paste codes — one per line, or comma-separated'
				: 'Paste codes — one per line'
	);
	const settings: Settings = $derived({
		speedPxPerSec,
		loop,
		rotate,
		rotateMaxDeg,
		skew,
		skewMaxDeg,
		seed,
		format,
		ecc,
		lax,
		mode,
		dwellMs,
		gapMs
	});
	const shareHash = $derived(
		editor === 'rows' ? encodeRowsShareUrl(rows, settings) : encodeShareUrl(rawCodes, settings)
	);

	function onDwellSeconds(e: Event & { currentTarget: HTMLInputElement }): void {
		const ms = parseSeconds(e.currentTarget.value, DWELL_RANGE);
		if (ms !== null) dwellMs = ms;
		e.currentTarget.value = (dwellMs / 1000).toFixed(2);
	}
	function onGapSeconds(e: Event & { currentTarget: HTMLInputElement }): void {
		const ms = parseSeconds(e.currentTarget.value, GAP_RANGE);
		if (ms !== null) gapMs = ms;
		e.currentTarget.value = (gapMs / 1000).toFixed(2);
	}
	const dupPairs = $derived(
		duplicateNeighbours(
			entries.filter((e) => e.valid),
			loop
		)
	);
	const dupHint = $derived.by(() => {
		if (dupPairs.length === 0) return '';
		const [a, b] = dupPairs[0];
		// In Per row the pair names the editor's rows, whose numbers count blank and invalid rows.
		let [first, second] = [a + 1, b + 1];
		if (editor === 'rows') {
			const valid = rowNumbers(rows).filter((_, k) => entries[k].valid);
			[first, second] = [valid[a], valid[b]];
		}
		const extra = dupPairs.length - 1;
		const more =
			extra === 0 ? '' : `, and ${extra} more neighboring ${extra === 1 ? 'pair' : 'pairs'}`;
		return (
			`Codes ${first} and ${second} are identical${more}. Many scanners skip a repeat read: ` +
			`set a gap of 1.00 s or more, or lower the scanner's reread delay.`
		);
	});

	// Keep `ecc` canonical across a format switch: drop a level the next format does not offer,
	// or one that is its default. Done in the binding's setter, never an $effect.
	function selectFormat(next: FormatId): void {
		ecc = canonicalEcc(next, ecc);
		lax = canonicalLax(next, lax);
		format = next;
	}

	// The select is not bound: after a lossy attempt `editor` is still 'rows', and only this write
	// snaps the select back to Per row.
	function onEditorChange(e: Event & { currentTarget: HTMLSelectElement }): void {
		selectEditor(e.currentTarget.value as 'text' | 'rows');
		e.currentTarget.value = editor;
	}

	function isLossless(c: TextConversion): boolean {
		return (
			c.loses.formats === 0 &&
			c.loses.levels === 0 &&
			c.loses.splits === 0 &&
			c.loses.validation === 0
		);
	}

	function selectEditor(next: 'text' | 'rows'): void {
		if (next === editor) return;
		fileError = '';
		if (next === 'rows') {
			rows = rowsFromText(text, format, ecc, lax);
			editor = 'rows';
			return;
		}
		const c = textFromRows(rows, { format, ecc, lax });
		if (isLossless(c)) applyConversion(c);
		else pending = c;
	}

	// The note shows the snapshot taken when Plain text was chosen; the rows may have changed
	// since. Switch only when the switch now does what the note says, else refresh the note.
	function switchAnyway(): void {
		const c = textFromRows(rows, { format, ecc, lax });
		const same =
			pending !== null &&
			c.loses.formats === pending.loses.formats &&
			c.loses.levels === pending.loses.levels &&
			c.loses.splits === pending.loses.splits &&
			c.loses.validation === pending.loses.validation &&
			c.format === pending.format &&
			c.ecc === pending.ecc &&
			c.lax === pending.lax;
		if (isLossless(c) || same) applyConversion(c);
		else pending = c;
	}

	// `c.ecc` is already canonical for `c.format`, so `format` is set directly, not through
	// selectFormat. Focus returns to the select, so it does not fall to body when the note unmounts.
	async function applyConversion(c: TextConversion): Promise<void> {
		text = c.text;
		format = c.format;
		ecc = c.ecc;
		lax = c.lax;
		editor = 'text';
		pending = null;
		fileError = '';
		await tick();
		editorSelect?.focus();
	}

	async function cancelSwitch(): Promise<void> {
		pending = null;
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
			const fileText = await readCodesFile(file);
			// Per row appends, so an upload never destroys a deck already built.
			if (editor === 'rows') rows = [...rows, ...rowsFromText(fileText, format, '', false)];
			else text = fileText;
			fileError = '';
		} catch {
			// Inline error only; the existing validation list is left untouched.
			fileError = 'Could not read file';
		} finally {
			input.value = '';
		}
	}

	function start(): void {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pathname IS resolve()-based; the rule cannot see through the fragment concatenation
		goto(resolve('/play') + shareHash);
	}
</script>

<div class="setup">
	<h1>scandible</h1>
	<label class="field"
		>Editor
		<select class="editor-input" bind:this={editorSelect} value={editor} onchange={onEditorChange}>
			<option value="text">Plain text</option>
			<option value="rows">Per row</option>
		</select>
	</label>
	{#if editor === 'text'}
		<p class="editor-hint">{EDITOR_HINT}</p>
	{/if}
	{#if pending}
		<div class="switch-note" role="alert">
			<p>{describeLoss(pending.loses, pending)}</p>
			<button type="button" class="switch-anyway" onclick={switchAnyway}>Switch anyway</button>
			<button type="button" class="switch-cancel" onclick={cancelSwitch}>Cancel</button>
		</div>
	{/if}
	{#if editor === 'text'}
		<textarea
			class="code-input"
			rows="8"
			{placeholder}
			bind:value={text}
			oninput={() => (fileError = '')}></textarea>
	{:else}
		<RowEditor bind:rows newRowFormat={format} />
	{/if}
	<input type="file" class="file-input" accept=".txt,.csv" onchange={onFileChange} />
	<p class="file-error" hidden={!fileError}>{fileError}</p>
	<div class="settings-row">
		<label class="field"
			>{editor === 'rows' ? 'Format for new rows' : 'Format'}
			<select class="format-input" bind:value={() => format, (v) => selectFormat(v)}>
				{#each FORMAT_GROUPS as { group, formats } (group)}
					<optgroup label={group}>
						{#each formats as f (f.id)}
							<option value={f.id}>{f.label}</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</label>
		{#if editor === 'text' && isGs1(descriptor)}
			<p class="gs1-hint">{GS1_HINT}</p>
		{/if}
		{#if editor === 'text' && descriptor?.ecc}
			{@const opt = descriptor.ecc}
			<label class="field ecc-field"
				>Error correction
				<select
					class="ecc-input"
					bind:value={() => ecc || opt.defaultValue, (v) => (ecc = v === opt.defaultValue ? '' : v)}
				>
					{#each opt.choices as c (c.value)}
						<option value={c.value}>{c.note ? `${c.label} (${c.note})` : c.label}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if editor === 'text' && isGs1(descriptor)}
			<label class="field lax-field"
				>Render GS1 data that fails validation
				<input
					type="checkbox"
					class="lax-input"
					bind:checked={lax}
					aria-describedby="{uid}-lax-note"
				/>
			</label>
			<p class="lax-note" id="{uid}-lax-note">{LAX_NOTE}</p>
		{/if}
		<label class="field"
			>Playback
			<select class="mode-input" bind:value={mode}>
				<option value="scroll">Scroll</option>
				<option value="step">Step</option>
			</select>
		</label>
		{#if mode === 'step'}
			<label class="field"
				>Dwell
				<input
					type="range"
					class="dwell-input"
					min={DWELL_RANGE.min}
					max={DWELL_RANGE.max}
					step={DWELL_RANGE.step}
					aria-valuetext={formatSeconds(dwellMs)}
					bind:value={dwellMs}
				/>
				<span class="seconds">
					<input
						type="number"
						class="dwell-seconds"
						inputmode="decimal"
						min={DWELL_RANGE.min / 1000}
						max={DWELL_RANGE.max / 1000}
						step="0.01"
						aria-label="Dwell in seconds"
						value={(dwellMs / 1000).toFixed(2)}
						onchange={onDwellSeconds}
					/>
					s
				</span>
			</label>
			{#if dwellMs < 330}
				<p class="flash-note">
					Dwells under 0.33 s flash the screen more than three times a second. Do not use them near
					anyone sensitive to flashing lights.
				</p>
			{/if}
			<label class="field"
				>Gap
				<input
					type="range"
					class="gap-input"
					min={GAP_RANGE.min}
					max={GAP_RANGE.max}
					step={GAP_RANGE.step}
					aria-valuetext={formatSeconds(gapMs)}
					bind:value={gapMs}
				/>
				<span class="seconds">
					<input
						type="number"
						class="gap-seconds"
						inputmode="decimal"
						min={GAP_RANGE.min / 1000}
						max={GAP_RANGE.max / 1000}
						step="0.01"
						aria-label="Gap in seconds"
						value={(gapMs / 1000).toFixed(2)}
						onchange={onGapSeconds}
					/>
					s
				</span>
			</label>
			{#if gapMs < 1000 && dupPairs.length > 0}
				<p class="dup-hint">{dupHint}</p>
			{/if}
		{:else}
			<label class="field"
				>Speed
				<input
					type="range"
					class="speed-input"
					min="10"
					max="5000"
					step="5"
					bind:value={speedPxPerSec}
				/>
			</label>
		{/if}
		<label class="field"
			>Loop
			<input type="checkbox" class="loop-input" bind:checked={loop} />
		</label>
		<label class="field"
			>Random rotation
			<input type="checkbox" class="rotate-input" bind:checked={rotate} />
			<input
				type="range"
				class="rotate-max-input"
				min="1"
				max="30"
				step="1"
				bind:value={rotateMaxDeg}
				disabled={!rotate}
			/>
		</label>
		<label class="field"
			>Random skew
			<input type="checkbox" class="skew-input" bind:checked={skew} />
			<input
				type="range"
				class="skew-max-input"
				min="1"
				max="30"
				step="1"
				bind:value={skewMaxDeg}
				disabled={!skew}
			/>
		</label>
	</div>
	{#if editor === 'text'}
		<ValidationList {entries} />
	{/if}
	<ShareLink hash={shareHash} />
	<button type="button" class="start" disabled={!canStart} onclick={start}>Start</button>
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
	.code-input {
		width: 100%;
		font-family: monospace;
	}
	/* Each setting on its own line: label text on top, input(s) below, spaced apart. */
	.settings-row {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.field {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}
	.seconds {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.start {
		padding: 12px;
		font-size: 1.1rem;
	}
	.start:disabled {
		opacity: 0.5;
	}
</style>

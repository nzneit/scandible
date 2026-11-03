<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { parseCodeList } from '$lib/codes';
	import { FORMAT_BY_ID, FORMAT_GROUPS, canonicalEcc, type FormatId } from '$lib/formats';
	import { readCodesFile } from '$lib/fileInput';
	import { decodeShareUrl, encodeShareUrl } from '$lib/shareUrl';
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
	import ShareLink from '$lib/components/ShareLink.svelte';

	const decoded = decodeShareUrl(page.url);
	const initial: Settings = { ...DEFAULT_SETTINGS, ...decoded.settings };
	const seed = decoded.settings.seed ?? Math.floor(Math.random() * 0x100000000) >>> 0;

	let text = $state(decoded.codes.join('\n'));
	let speedPxPerSec = $state(initial.speedPxPerSec);
	let loop = $state(initial.loop);
	let rotate = $state(initial.rotate);
	let rotateMaxDeg = $state(initial.rotateMaxDeg);
	let skew = $state(initial.skew);
	let skewMaxDeg = $state(initial.skewMaxDeg);
	let format = $state(initial.format);
	let ecc = $state(initial.ecc);
	let mode = $state(initial.mode);
	let dwellMs = $state(initial.dwellMs);
	let gapMs = $state(initial.gapMs);
	const descriptor = $derived(FORMAT_BY_ID.get(format));
	let fileError = $state('');

	const entries: CodeEntry[] = $derived(parseCodeList(text, format, ecc));
	const rawCodes: string[] = $derived(entries.map((e) => e.raw));
	const canStart: boolean = $derived(entries.some((e) => e.valid));
	const placeholder: string = $derived(
		descriptor?.numeric
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
		mode,
		dwellMs,
		gapMs
	});
	const shareHash = $derived(encodeShareUrl(rawCodes, settings));

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
		const extra = dupPairs.length - 1;
		const more =
			extra === 0 ? '' : `, and ${extra} more neighboring ${extra === 1 ? 'pair' : 'pairs'}`;
		return (
			`Codes ${a + 1} and ${b + 1} are identical${more}. Many scanners skip a repeat read: ` +
			`set a gap of 1.00 s or more, or lower the scanner's reread delay.`
		);
	});

	// Keep `ecc` canonical across a format switch: drop a level the next format does not offer,
	// or one that is its default. Done in the binding's setter, never an $effect.
	function selectFormat(next: FormatId): void {
		ecc = canonicalEcc(next, ecc);
		format = next;
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
			text = await readCodesFile(file);
			fileError = '';
		} catch {
			// Inline error only; the existing validation list is left untouched.
			fileError = 'Could not read file';
		}
	}

	function start(): void {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pathname IS resolve()-based; the rule cannot see through the fragment concatenation
		goto(resolve('/play') + shareHash);
	}
</script>

<div class="setup">
	<h1>scandible</h1>
	<textarea
		class="code-input"
		rows="8"
		{placeholder}
		bind:value={text}
		oninput={() => (fileError = '')}></textarea>
	<input type="file" class="file-input" accept=".txt,.csv" onchange={onFileChange} />
	<p class="file-error" hidden={!fileError}>{fileError}</p>
	<div class="settings-row">
		<label class="field"
			>Format
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
		{#if descriptor?.ecc}
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
	<ValidationList {entries} />
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

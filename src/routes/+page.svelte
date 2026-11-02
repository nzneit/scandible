<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { parseCodeList } from '$lib/codes';
	import { FORMAT_BY_ID, FORMAT_GROUPS, isEccChoice, type FormatId } from '$lib/formats';
	import { readCodesFile } from '$lib/fileInput';
	import { decodeShareUrl, encodeShareUrl } from '$lib/shareUrl';
	import { DEFAULT_SETTINGS, type Settings, type CodeEntry } from '$lib/types';
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
		ecc
	});
	const shareHash = $derived(encodeShareUrl(rawCodes, settings));

	// Keep `ecc` canonical across a format switch: drop a level the next format does not offer,
	// or one that is its default. Done in the binding's setter, never an $effect.
	function selectFormat(next: FormatId): void {
		const nextDescriptor = FORMAT_BY_ID.get(next);
		if (
			!nextDescriptor ||
			!isEccChoice(nextDescriptor, ecc) ||
			ecc === nextDescriptor.ecc?.defaultValue
		) {
			ecc = '';
		}
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
	.start {
		padding: 12px;
		font-size: 1.1rem;
	}
	.start:disabled {
		opacity: 0.5;
	}
</style>

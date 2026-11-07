<script lang="ts">
	import Field from './Field.svelte';
	import Note from './Note.svelte';
	import { buildQrSvg, qrStatus, QR_CAPACITY_BYTES, type QrEcc, type QrStatus } from '#lib/qr.ts';

	interface SharePanelProps {
		id: string; // the region's id, which Share's aria-controls names
		class?: string; // the bar places the panel
		hash: string; // the live share fragment
		ecc: QrEcc; // $bindable: the QR level, which the bar keeps while the page is open
		onclose: () => void;
	}

	const COPY_OK = 'Link copied.';
	const COPY_FAILED = 'Could not copy. Select the link address and copy it.';

	let { id, class: className, hash, ecc = $bindable(), onclose }: SharePanelProps = $props();
	const uid = $props.id();

	const liveUrl = $derived(location.origin + location.pathname + hash);
	const status = $derived(qrStatus(liveUrl, ecc));
	// The QR follows the live link and the level while the panel is open.
	const qrSvg = $derived(status.kind === 'too-long' ? '' : (buildQrSvg(liveUrl, ecc) ?? ''));
	// A new link or a new level clears the copy status, silently; copy() sets it.
	let copyStatus = $derived.by(() => {
		void liveUrl;
		void ecc;
		return '';
	});

	const count = new Intl.NumberFormat('en-US');
	function statusMessage(s: QrStatus): string {
		if (s.kind === 'fits') return '';
		if (s.kind === 'dense')
			return 'This link makes a dense QR code. Hold the phone steady, or share the link itself.';
		if (s.ecc !== 'L' && s.length <= QR_CAPACITY_BYTES.L)
			return `Too long for a QR code at level ${s.ecc}: this link is ${count.format(s.length)} characters and level ${s.ecc} holds at most ${count.format(s.capacity)}. Choose level L, or shorten the list. The link itself still works.`;
		return `Too long for a QR code: this link is ${count.format(s.length)} characters and a QR holds at most 2,953. Shorten the list to share it as a QR. The link itself still works.`;
	}

	function copy(): void {
		if (navigator.clipboard === undefined) copyStatus = COPY_FAILED;
		else
			navigator.clipboard.writeText(liveUrl).then(
				() => (copyStatus = COPY_OK),
				() => (copyStatus = COPY_FAILED)
			);
	}
</script>

<section
	{id}
	aria-labelledby="{uid}-heading"
	class={[
		'flex flex-col gap-3 rounded-box border border-base-300 bg-base-100 p-4 shadow-lg shadow-base-content/10',
		className
	]}
>
	<div class="flex items-center justify-between gap-2">
		<h2 id="{uid}-heading" class="text-lg font-semibold">Share</h2>
		<button
			type="button"
			class="btn btn-sm btn-square btn-ghost"
			aria-label="Close"
			onclick={onclose}>✕</button
		>
	</div>
	<div class="flex flex-col gap-1">
		<label for="{uid}-link">Share link address</label>
		<div class="flex items-center gap-2">
			<input
				id="{uid}-link"
				type="text"
				class="input input-sm min-w-0 flex-1 font-mono"
				readonly
				value={liveUrl}
			/>
			<button type="button" class="btn btn-sm" onclick={copy}>Copy link</button>
		</div>
	</div>
	<!-- The line is kept when empty, so "Link copied." does not make the panel grow. -->
	<span role="status" aria-label="Copy status" class="min-h-[1lh]">{copyStatus}</span>
	<Field label="QR error correction">
		<select class="select w-auto select-sm" bind:value={ecc}>
			<option value="L">L (most capacity)</option>
			<option value="M">M (default)</option>
			<option value="Q">Q</option>
			<option value="H">H</option>
		</select>
	</Field>
	<div
		class="qr-code border border-base-300"
		role="img"
		hidden={!qrSvg}
		aria-label="QR code for the share link"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- qrSvg comes only from uqr's renderSVG, which never reflects its input into markup (security-reviewed) -->
		{@html qrSvg}
	</div>
	<Note tone="warning" class="qr-status" role="status" aria-label="QR code status"
		>{statusMessage(status)}</Note
	>
</section>

<style>
	.qr-code {
		background: #fff;
		padding: 12px;
		max-width: 240px;
	}
	.qr-code :global(svg) {
		width: 100%;
		height: auto;
		display: block;
	}
</style>

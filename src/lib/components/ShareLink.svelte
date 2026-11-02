<script lang="ts">
	import { buildQrSvg, qrStatus, QR_CAPACITY_BYTES, type QrEcc, type QrStatus } from '$lib/qr';

	const COPY_OK = 'Link copied.';
	const COPY_FAILED = 'Could not copy. Select the link above and copy it.';

	let { hash }: { hash: string } = $props();

	let shareEcc: QrEcc = $state('M');
	let qrSvg = $state('');
	let copyStatus = $state('');

	const liveUrl = $derived(location.origin + location.pathname + hash);
	const status = $derived(qrStatus(liveUrl, shareEcc));

	const count = new Intl.NumberFormat('en-US');
	function statusMessage(s: QrStatus): string {
		if (s.kind === 'fits') return '';
		if (s.kind === 'dense')
			return 'This link makes a dense QR code. Hold the phone steady, or share the link itself.';
		if (s.ecc !== 'L' && s.length <= QR_CAPACITY_BYTES.L)
			return `Too long for a QR code at level ${s.ecc}: this link is ${count.format(s.length)} characters and level ${s.ecc} holds at most ${count.format(s.capacity)}. Choose level L, or shorten the list. The link itself still works.`;
		return `Too long for a QR code: this link is ${count.format(s.length)} characters and a QR holds at most 2,953. Shorten the list to share it as a QR. The link itself still works.`;
	}

	// A new link or a new level invalidates a rendered QR; the URL field and the status are live.
	$effect(() => {
		void hash;
		void shareEcc;
		qrSvg = '';
		copyStatus = '';
	});

	function share(): void {
		if (navigator.clipboard === undefined) copyStatus = COPY_FAILED;
		else
			navigator.clipboard.writeText(liveUrl).then(
				() => (copyStatus = COPY_OK),
				() => (copyStatus = COPY_FAILED)
			);
		if (status.kind !== 'too-long') qrSvg = buildQrSvg(liveUrl, shareEcc) ?? '';
	}
</script>

<div class="share-row">
	<button type="button" class="copy-link" onclick={share}>Share link</button>
	<input type="text" class="share-url" readonly aria-label="Share link" value={liveUrl} />
	<span class="copy-status" role="status">{copyStatus}</span>
</div>
<label class="share-ecc-field"
	>Share QR error correction
	<select class="share-ecc-input" bind:value={shareEcc}>
		<option value="L">L (most capacity)</option>
		<option value="M">M (default)</option>
		<option value="Q">Q</option>
		<option value="H">H</option>
	</select>
</label>
<!-- eslint-disable-next-line svelte/no-at-html-tags -- qrSvg comes only from uqr's renderSVG, which never reflects its input into markup (security-reviewed) -->
<div class="qr-code" role="img" hidden={!qrSvg} aria-label="QR code for the share link">
	{@html qrSvg}
</div>
<p class="qr-status" role="status">{statusMessage(status)}</p>

<style>
	.share-url {
		flex: 1;
		font-family: monospace;
	}
	.copy-status {
		margin-left: 8px;
	}
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
	.qr-status {
		color: #a04b00;
		margin: 4px 0 0;
	}
</style>

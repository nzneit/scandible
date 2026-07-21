<script lang="ts">
	import { encodeShareUrl } from '$lib/shareUrl';
	import { buildQrSvg } from '$lib/qr';
	import type { Settings } from '$lib/types';

	const URL_WARN_LENGTH = 2000;
	const QR_DENSE_MSG = 'QR is dense — hold the phone steady, or use the copied link.';
	const QR_TOO_LONG_MSG = 'Too many codes for a QR — share the copied link instead.';

	let { codes, settings }: { codes: string[]; settings: Settings } = $props();

	let url = $state('');
	let warnLong = $state(false);
	let qrSvg = $state('');
	let qrStatus = $state('');

	// Any change to the shared content invalidates a rendered QR (the URL field and
	// warning persist until the next click, matching the old view).
	$effect(() => {
		void codes;
		void settings;
		qrSvg = '';
		qrStatus = '';
	});

	function share(): void {
		const u = location.origin + location.pathname + encodeShareUrl(codes, settings);
		url = u;
		warnLong = u.length > URL_WARN_LENGTH;
		void navigator.clipboard?.writeText(u).catch(() => {});

		const qr = buildQrSvg(u);
		if (qr.ok) {
			qrSvg = qr.svg;
			qrStatus = qr.dense ? QR_DENSE_MSG : '';
		} else {
			qrSvg = '';
			qrStatus = QR_TOO_LONG_MSG;
		}
	}
</script>

<div class="share-row">
	<button type="button" class="copy-link" onclick={share}>Share link</button>
	<input type="text" class="share-url" readonly value={url} />
	<span class="url-warning" hidden={!warnLong}
		>Link is long; it may be truncated by some browsers.</span
	>
</div>
<!-- eslint-disable-next-line svelte/no-at-html-tags -- qrSvg comes only from uqr's renderSVG, which never reflects its input into markup (security-reviewed) -->
<div class="qr-code" hidden={!qrSvg} aria-label="QR code for the share link">{@html qrSvg}</div>
<p class="qr-status" hidden={!qrStatus}>{qrStatus}</p>

<style>
	.share-url {
		flex: 1;
		font-family: monospace;
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
		color: #c60;
		margin: 4px 0 0;
	}
</style>

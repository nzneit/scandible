import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/svelte';
import SharePanel from './SharePanel.svelte';
import { encodeShareUrl } from '$lib/shareUrl';
import { QR_CAPACITY_BYTES } from '$lib/qr';
import { DEFAULT_SETTINGS, type Settings } from '$lib/types';

const SETTINGS: Settings = { ...DEFAULT_SETTINGS };
const hashOf = (n: number) =>
	encodeShareUrl(
		Array.from({ length: n }, () => '036000291452'),
		SETTINGS
	);
const liveUrl = (hash: string) => location.origin + location.pathname + hash;
const n = (v: number) => new Intl.NumberFormat('en-US').format(v);
const DENSE = 'This link makes a dense QR code. Hold the phone steady, or share the link itself.';
const tooLongAt = (ecc: string, length: number, capacity: number) =>
	`Too long for a QR code at level ${ecc}: this link is ${n(length)} characters and level ${ecc} holds at most ${n(capacity)}. Choose level L, or shorten the list. The link itself still works.`;
const tooLong = (length: number) =>
	`Too long for a QR code: this link is ${n(length)} characters and a QR holds at most 2,953. Shorten the list to share it as a QR. The link itself still works.`;
const status = () => screen.getByRole('status', { name: 'QR code status' });
/** Found by label, because a hidden element has no role to find. */
const qrImage = () => screen.getByLabelText('QR code for the share link');
const open = (hash: string, onclose = vi.fn()) => ({
	onclose,
	...render(SharePanel, { id: 'share', hash, ecc: 'M', onclose })
});
const field = () => screen.getByRole('textbox', { name: 'Share link address' });
const setLevel = (v: string) =>
	fireEvent.change(screen.getByRole('combobox', { name: 'QR error correction' }), {
		target: { value: v }
	});

describe('SharePanel', () => {
	it('is a region named Share by its heading, closed by its Close button', async () => {
		const { onclose } = open(hashOf(1));
		const region = screen.getByRole('region', { name: 'Share' });
		expect(region).toHaveAttribute('id', 'share');
		expect(within(region).getByRole('heading', { level: 2, name: 'Share' })).toBeInTheDocument();
		await fireEvent.click(within(region).getByRole('button', { name: 'Close' }));
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('shows the live link in the Share link address field, read-only', () => {
		open(hashOf(1));
		expect(screen.getByLabelText('Share link address')).toBe(field());
		expect(field()).toHaveValue(liveUrl(hashOf(1)));
		expect(field()).toHaveAttribute('readonly');
		expect(field()).toAppearBefore(screen.getByRole('button', { name: 'Copy link' }));
	});

	it('renders an empty, always-present status with role="status" for a one-code list', () => {
		open(hashOf(1));
		expect(status()).toBeInTheDocument();
		expect(status().textContent).toBe('');
	});

	it('offers the QR levels L, M, Q, H with the given level selected', () => {
		render(SharePanel, { id: 'share', hash: hashOf(1), ecc: 'Q', onclose: vi.fn() });
		const select = screen.getByRole('combobox', { name: 'QR error correction' });
		const options = within(select).getAllByRole('option');
		expect(options.map((o) => o.textContent)).toEqual([
			'L (most capacity)',
			'M (default)',
			'Q',
			'H'
		]);
		expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual(['L', 'M', 'Q', 'H']);
		expect(select).toHaveValue('Q');
		expect(screen.getByLabelText('QR error correction')).toBe(select);
	});

	it('draws the QR code as soon as it opens', () => {
		open(hashOf(1));
		expect(qrImage()).toBeVisible();
		expect(qrImage()).not.toBeEmptyDOMElement();
	});

	it('shows the dense text live and still draws the QR', () => {
		open(hashOf(80));
		expect(status().textContent).toBe(DENSE);
		expect(qrImage()).toBeVisible();
		expect(qrImage()).not.toBeEmptyDOMElement();
	});

	it('names level L when it would hold the link, and updates as the level changes', async () => {
		const hash = hashOf(160);
		const len = liveUrl(hash).length;
		expect(len).toBeGreaterThan(QR_CAPACITY_BYTES.M);
		expect(len).toBeLessThanOrEqual(QR_CAPACITY_BYTES.L);
		open(hash);
		expect(status().textContent).toBe(tooLongAt('M', len, 2331));
		expect(qrImage()).not.toBeVisible();
		await setLevel('H');
		expect(status().textContent).toBe(tooLongAt('H', len, 1273));
		await setLevel('L');
		expect(status().textContent).toBe(DENSE);
		expect(status()).not.toHaveTextContent('Choose level L');
		expect(qrImage()).toBeVisible();
	});

	it("uses the general too-long text beyond level L's capacity", async () => {
		const hash = hashOf(300);
		const len = liveUrl(hash).length;
		open(hash);
		expect(status().textContent).toBe(tooLong(len));
		await setLevel('L');
		expect(status().textContent).toBe(tooLong(len));
	});

	it('copies a too-long link on Copy link but draws no QR', async () => {
		const writeText = vi.fn(() => Promise.resolve());
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		try {
			const hash = hashOf(300);
			open(hash);
			await fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
			expect(writeText).toHaveBeenCalledWith(liveUrl(hash));
			expect(qrImage()).not.toBeVisible();
			expect(qrImage()).toBeEmptyDOMElement();
		} finally {
			Reflect.deleteProperty(navigator, 'clipboard');
		}
	});

	it('redraws the QR when the level changes', async () => {
		open(hashOf(1));
		const before = qrImage().innerHTML;
		await setLevel('H');
		expect(qrImage()).toBeVisible();
		expect(qrImage().innerHTML).not.toBe(before);
	});

	it('redraws the QR when the link changes', async () => {
		const { rerender } = open(hashOf(1));
		const before = qrImage().innerHTML;
		await rerender({ hash: encodeShareUrl(['012345678905'], SETTINGS) });
		expect(qrImage()).toBeVisible();
		expect(qrImage().innerHTML).not.toBe(before);
		expect(status().textContent).toBe('');
	});

	describe('copy confirmation', () => {
		const copyStatus = () => screen.getByRole('status', { name: 'Copy status' });
		const FAILED = 'Could not copy. Select the link address and copy it.';
		const stub = (value: unknown) =>
			Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
		afterEach(() => Reflect.deleteProperty(navigator, 'clipboard'));

		it('shows "Link copied." once the write resolves', async () => {
			stub({ writeText: vi.fn(() => Promise.resolve()) });
			open(hashOf(1));
			expect(copyStatus().textContent).toBe('');
			await fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
			await vi.waitFor(() => expect(copyStatus().textContent).toBe('Link copied.'));
		});

		it('shows the failure text when the write rejects', async () => {
			stub({ writeText: vi.fn(() => Promise.reject(new Error('denied'))) });
			open(hashOf(1));
			await fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
			await vi.waitFor(() => expect(copyStatus().textContent).toBe(FAILED));
		});

		it('shows the failure text when the Clipboard API is absent', async () => {
			stub(undefined);
			open(hashOf(1));
			await fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
			expect(copyStatus().textContent).toBe(FAILED);
		});

		it('clears the copy status when the level changes', async () => {
			stub({ writeText: vi.fn(() => Promise.resolve()) });
			open(hashOf(1));
			await fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
			await vi.waitFor(() => expect(copyStatus().textContent).toBe('Link copied.'));
			await setLevel('H');
			expect(copyStatus().textContent).toBe('');
		});

		it('clears the copy status when the link changes', async () => {
			stub({ writeText: vi.fn(() => Promise.resolve()) });
			const { rerender } = open(hashOf(1));
			await fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
			await vi.waitFor(() => expect(copyStatus().textContent).toBe('Link copied.'));
			await rerender({ hash: hashOf(2) });
			expect(copyStatus().textContent).toBe('');
		});
	});
});

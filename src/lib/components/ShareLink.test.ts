import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/svelte';
import ShareLink from './ShareLink.svelte';
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
const setLevel = (v: string) =>
	fireEvent.change(screen.getByRole('combobox', { name: 'Share QR error correction' }), {
		target: { value: v }
	});

describe('ShareLink', () => {
	it('labels the button "Share link"', () => {
		render(ShareLink, { hash: hashOf(1) });
		expect(screen.getByRole('button', { name: 'Share link' }).textContent).toBe('Share link');
	});

	it('shows the live URL before any click', () => {
		render(ShareLink, { hash: hashOf(1) });
		expect(screen.getByRole('textbox', { name: 'Share link' })).toHaveValue(liveUrl(hashOf(1)));
	});

	it('renders an empty, always-present status with role="status" for a one-code list', () => {
		render(ShareLink, { hash: hashOf(1) });
		expect(status()).toBeInTheDocument();
		expect(status().textContent).toBe('');
	});

	it('offers the share levels L, M, Q, H with M selected', () => {
		render(ShareLink, { hash: hashOf(1) });
		const select = screen.getByRole('combobox', { name: 'Share QR error correction' });
		const options = within(select).getAllByRole('option');
		expect(options.map((o) => o.textContent)).toEqual([
			'L (most capacity)',
			'M (default)',
			'Q',
			'H'
		]);
		expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual(['L', 'M', 'Q', 'H']);
		expect(select).toHaveValue('M');
		expect(screen.getByRole('combobox', { name: 'Share QR error correction' })).toBeInTheDocument();
	});

	it('renders the QR code image on click', async () => {
		render(ShareLink, { hash: hashOf(1) });
		await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
		expect(qrImage()).toBeVisible();
		expect(qrImage()).not.toBeEmptyDOMElement();
	});

	it('shows the dense text live and still renders the QR', async () => {
		render(ShareLink, { hash: hashOf(80) });
		expect(status().textContent).toBe(DENSE);
		await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
		expect(qrImage()).not.toBeEmptyDOMElement();
	});

	it('names level L when it would hold the link, and updates as the level changes', async () => {
		const hash = hashOf(160);
		const len = liveUrl(hash).length;
		expect(len).toBeGreaterThan(QR_CAPACITY_BYTES.M);
		expect(len).toBeLessThanOrEqual(QR_CAPACITY_BYTES.L);
		render(ShareLink, { hash });
		expect(status().textContent).toBe(tooLongAt('M', len, 2331));
		await setLevel('H');
		expect(status().textContent).toBe(tooLongAt('H', len, 1273));
		await setLevel('L');
		expect(status().textContent).toBe(DENSE);
		expect(status()).not.toHaveTextContent('Choose level L');
	});

	it("uses the general too-long text beyond level L's capacity", async () => {
		const hash = hashOf(300);
		const len = liveUrl(hash).length;
		render(ShareLink, { hash });
		expect(status().textContent).toBe(tooLong(len));
		await setLevel('L');
		expect(status().textContent).toBe(tooLong(len));
	});

	it('copies a too-long link on click but renders no QR', async () => {
		const writeText = vi.fn(() => Promise.resolve());
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		try {
			const hash = hashOf(300);
			render(ShareLink, { hash });
			await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
			expect(writeText).toHaveBeenCalledWith(liveUrl(hash));
			expect(qrImage()).not.toBeVisible();
			expect(qrImage()).toBeEmptyDOMElement();
		} finally {
			Reflect.deleteProperty(navigator, 'clipboard');
		}
	});

	it('clears a rendered QR when the level changes', async () => {
		render(ShareLink, { hash: hashOf(1) });
		await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
		expect(qrImage()).not.toBeEmptyDOMElement();
		await setLevel('H');
		expect(qrImage()).not.toBeVisible();
		expect(qrImage()).toBeEmptyDOMElement();
	});

	it('clears a rendered QR when the hash prop changes', async () => {
		const { rerender } = render(ShareLink, { hash: hashOf(1) });
		await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
		expect(qrImage()).not.toBeEmptyDOMElement();
		await rerender({ hash: encodeShareUrl(['012345678905'], SETTINGS) });
		expect(qrImage()).not.toBeVisible();
		expect(qrImage()).toBeEmptyDOMElement();
		expect(status().textContent).toBe('');
	});

	describe('copy confirmation', () => {
		const copyStatus = () => screen.getByRole('status', { name: 'Copy status' });
		const FAILED = 'Could not copy. Select the link above and copy it.';
		const stub = (value: unknown) =>
			Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
		afterEach(() => Reflect.deleteProperty(navigator, 'clipboard'));

		it('shows "Link copied." once the write resolves', async () => {
			stub({ writeText: vi.fn(() => Promise.resolve()) });
			render(ShareLink, { hash: hashOf(1) });
			await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
			await vi.waitFor(() => expect(copyStatus().textContent).toBe('Link copied.'));
		});

		it('shows the failure text when the write rejects', async () => {
			stub({ writeText: vi.fn(() => Promise.reject(new Error('denied'))) });
			render(ShareLink, { hash: hashOf(1) });
			await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
			await vi.waitFor(() => expect(copyStatus().textContent).toBe(FAILED));
		});

		it('shows the failure text when the Clipboard API is absent', async () => {
			stub(undefined);
			render(ShareLink, { hash: hashOf(1) });
			await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
			expect(copyStatus().textContent).toBe(FAILED);
		});

		it('clears the copy status when the level changes', async () => {
			stub({ writeText: vi.fn(() => Promise.resolve()) });
			render(ShareLink, { hash: hashOf(1) });
			await fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
			await vi.waitFor(() => expect(copyStatus().textContent).toBe('Link copied.'));
			await setLevel('H');
			expect(copyStatus().textContent).toBe('');
		});

		it('gives the link field an accessible name', () => {
			render(ShareLink, { hash: hashOf(1) });
			expect(screen.getByRole('textbox', { name: 'Share link' })).toBeInTheDocument();
		});
	});
});

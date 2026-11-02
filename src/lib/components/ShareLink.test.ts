import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ShareLink from './ShareLink.svelte';
import { encodeShareUrl } from '$lib/shareUrl';
import { QR_CAPACITY_BYTES } from '$lib/qr';
import { DEFAULT_SETTINGS, type Settings } from '$lib/types';

const SETTINGS: Settings = { ...DEFAULT_SETTINGS };
const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;
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
const status = (c: Element) => q<HTMLElement>(c, '.qr-status');
const setLevel = (c: Element, v: string) =>
	fireEvent.change(q(c, '.share-ecc-input'), { target: { value: v } });

describe('ShareLink', () => {
	it('labels the button "Share link"', () => {
		const { container } = render(ShareLink, { hash: hashOf(1) });
		expect(q<HTMLButtonElement>(container, '.copy-link').textContent).toBe('Share link');
	});

	it('shows the live URL before any click and has no .url-warning', () => {
		const { container } = render(ShareLink, { hash: hashOf(1) });
		expect(q<HTMLInputElement>(container, '.share-url').value).toBe(liveUrl(hashOf(1)));
		expect(container.querySelector('.url-warning')).toBeNull();
	});

	it('renders an empty, always-present status with role="status" for a one-code list', () => {
		const { container } = render(ShareLink, { hash: hashOf(1) });
		expect(status(container).getAttribute('role')).toBe('status');
		expect(status(container).textContent).toBe('');
	});

	it('offers the share levels L, M, Q, H with M selected', () => {
		const { container } = render(ShareLink, { hash: hashOf(1) });
		const select = q<HTMLSelectElement>(container, '.share-ecc-input');
		const options = Array.from(select.options);
		expect(options.map((o) => o.textContent)).toEqual([
			'L (most capacity)',
			'M (default)',
			'Q',
			'H'
		]);
		expect(options.map((o) => o.value)).toEqual(['L', 'M', 'Q', 'H']);
		expect(select.value).toBe('M');
		expect(q(container, '.share-ecc-field').textContent).toMatch(/^Share QR error correction/);
	});

	it('renders a QR code into .qr-code on click', async () => {
		const { container } = render(ShareLink, { hash: hashOf(1) });
		await fireEvent.click(q(container, '.copy-link'));
		const qr = q<HTMLElement>(container, '.qr-code');
		expect(qr.hidden).toBe(false);
		expect(qr.querySelector('svg')).not.toBeNull();
	});

	it('shows the dense text live and still renders the QR', async () => {
		const { container } = render(ShareLink, { hash: hashOf(80) });
		expect(status(container).textContent).toBe(DENSE);
		await fireEvent.click(q(container, '.copy-link'));
		expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
	});

	it('names level L when it would hold the link, and updates as the level changes', async () => {
		const hash = hashOf(160);
		const len = liveUrl(hash).length;
		expect(len).toBeGreaterThan(QR_CAPACITY_BYTES.M);
		expect(len).toBeLessThanOrEqual(QR_CAPACITY_BYTES.L);
		const { container } = render(ShareLink, { hash });
		expect(status(container).textContent).toBe(tooLongAt('M', len, 2331));
		await setLevel(container, 'H');
		expect(status(container).textContent).toBe(tooLongAt('H', len, 1273));
		await setLevel(container, 'L');
		expect(status(container).textContent).toBe(DENSE);
		expect(status(container).textContent).not.toContain('Choose level L');
	});

	it("uses the general too-long text beyond level L's capacity", async () => {
		const hash = hashOf(300);
		const len = liveUrl(hash).length;
		const { container } = render(ShareLink, { hash });
		expect(status(container).textContent).toBe(tooLong(len));
		await setLevel(container, 'L');
		expect(status(container).textContent).toBe(tooLong(len));
	});

	it('copies a too-long link on click but renders no QR', async () => {
		const writeText = vi.fn(() => Promise.resolve());
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		try {
			const hash = hashOf(300);
			const { container } = render(ShareLink, { hash });
			await fireEvent.click(q(container, '.copy-link'));
			expect(writeText).toHaveBeenCalledWith(liveUrl(hash));
			const qr = q<HTMLElement>(container, '.qr-code');
			expect(qr.hidden).toBe(true);
			expect(qr.querySelector('svg')).toBeNull();
		} finally {
			Reflect.deleteProperty(navigator, 'clipboard');
		}
	});

	it('clears a rendered QR when the level changes', async () => {
		const { container } = render(ShareLink, { hash: hashOf(1) });
		await fireEvent.click(q(container, '.copy-link'));
		expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
		await setLevel(container, 'H');
		const qr = q<HTMLElement>(container, '.qr-code');
		expect(qr.hidden).toBe(true);
		expect(qr.querySelector('svg')).toBeNull();
	});

	it('clears a rendered QR when the hash prop changes', async () => {
		const { container, rerender } = render(ShareLink, { hash: hashOf(1) });
		await fireEvent.click(q(container, '.copy-link'));
		expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
		await rerender({ hash: encodeShareUrl(['012345678905'], SETTINGS) });
		const qr = q<HTMLElement>(container, '.qr-code');
		expect(qr.hidden).toBe(true);
		expect(qr.querySelector('svg')).toBeNull();
		expect(status(container).textContent).toBe('');
	});

	describe('copy confirmation', () => {
		const copyStatus = (c: Element) => q<HTMLElement>(c, '.copy-status');
		const FAILED = 'Could not copy. Select the link above and copy it.';
		const stub = (value: unknown) =>
			Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
		afterEach(() => Reflect.deleteProperty(navigator, 'clipboard'));

		it('shows "Link copied." once the write resolves', async () => {
			stub({ writeText: vi.fn(() => Promise.resolve()) });
			const { container } = render(ShareLink, { hash: hashOf(1) });
			await fireEvent.click(q(container, '.copy-link'));
			await vi.waitFor(() => expect(copyStatus(container).textContent).toBe('Link copied.'));
		});

		it('shows the failure text when the write rejects', async () => {
			stub({ writeText: vi.fn(() => Promise.reject(new Error('denied'))) });
			const { container } = render(ShareLink, { hash: hashOf(1) });
			await fireEvent.click(q(container, '.copy-link'));
			await vi.waitFor(() => expect(copyStatus(container).textContent).toBe(FAILED));
		});

		it('shows the failure text when the Clipboard API is absent', async () => {
			stub(undefined);
			const { container } = render(ShareLink, { hash: hashOf(1) });
			await fireEvent.click(q(container, '.copy-link'));
			expect(copyStatus(container).textContent).toBe(FAILED);
		});

		it('clears the copy status when the level changes', async () => {
			stub({ writeText: vi.fn(() => Promise.resolve()) });
			const { container } = render(ShareLink, { hash: hashOf(1) });
			await fireEvent.click(q(container, '.copy-link'));
			await vi.waitFor(() => expect(copyStatus(container).textContent).toBe('Link copied.'));
			await setLevel(container, 'H');
			expect(copyStatus(container).textContent).toBe('');
		});

		it('gives the link field an accessible name', () => {
			const { container } = render(ShareLink, { hash: hashOf(1) });
			expect(q(container, '.share-url').getAttribute('aria-label')).toBe('Share link');
		});
	});
});

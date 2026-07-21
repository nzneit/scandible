import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ShareLink from './ShareLink.svelte';
import { DEFAULT_SETTINGS, type Settings } from '$lib/types';

const SETTINGS: Settings = { ...DEFAULT_SETTINGS };
const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;

describe('ShareLink', () => {
	it('labels the button "Share link"', () => {
		const { container } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
		expect(q<HTMLButtonElement>(container, '.copy-link').textContent).toBe('Share link');
	});

	it('builds the share URL into .share-url on click', async () => {
		const { container } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
		await fireEvent.click(q(container, '.copy-link'));
		const url = q<HTMLInputElement>(container, '.share-url').value;
		expect(url).toContain('codes=036000291452');
		expect(url).toContain('seed=0');
	});

	it('shows the long-URL warning when the share URL exceeds ~2000 chars', async () => {
		const codes = Array.from({ length: 200 }, () => '036000291452');
		const { container } = render(ShareLink, { codes, settings: SETTINGS });
		await fireEvent.click(q(container, '.copy-link'));
		expect(q<HTMLInputElement>(container, '.share-url').value.length).toBeGreaterThan(2000);
		expect(q<HTMLElement>(container, '.url-warning').hidden).toBe(false);
	});

	it('keeps the long-URL warning hidden for a short share URL', async () => {
		const { container } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
		await fireEvent.click(q(container, '.copy-link'));
		expect(q<HTMLInputElement>(container, '.share-url').value.length).toBeLessThanOrEqual(2000);
		expect(q<HTMLElement>(container, '.url-warning').hidden).toBe(true);
	});

	it('renders a QR code into .qr-code on click', async () => {
		const { container } = render(ShareLink, { codes: ['036000291452'], settings: SETTINGS });
		await fireEvent.click(q(container, '.copy-link'));
		const qr = q<HTMLElement>(container, '.qr-code');
		expect(qr.hidden).toBe(false);
		expect(qr.querySelector('svg')).not.toBeNull();
	});

	it('shows the dense warning for a long code list', async () => {
		const codes = Array.from({ length: 80 }, () => '036000291452');
		const { container } = render(ShareLink, { codes, settings: SETTINGS });
		await fireEvent.click(q(container, '.copy-link'));
		const status = q<HTMLElement>(container, '.qr-status');
		expect(status.hidden).toBe(false);
		expect(status.textContent).toContain('dense');
		expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
	});

	it('shows the too-long fallback and no QR for an over-capacity code list', async () => {
		const codes = Array.from({ length: 300 }, () => '036000291452');
		const { container } = render(ShareLink, { codes, settings: SETTINGS });
		await fireEvent.click(q(container, '.copy-link'));
		const status = q<HTMLElement>(container, '.qr-status');
		expect(status.hidden).toBe(false);
		expect(status.textContent).toContain('Too many codes');
		const qr = q<HTMLElement>(container, '.qr-code');
		expect(qr.hidden).toBe(true);
		expect(qr.querySelector('svg')).toBeNull();
	});

	it('clears a rendered QR when the codes prop changes', async () => {
		const { container, rerender } = render(ShareLink, {
			codes: ['036000291452'],
			settings: SETTINGS
		});
		await fireEvent.click(q(container, '.copy-link'));
		expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
		await rerender({ codes: ['012345678905'] });
		const qr = q<HTMLElement>(container, '.qr-code');
		expect(qr.hidden).toBe(true);
		expect(qr.querySelector('svg')).toBeNull();
		expect(q<HTMLElement>(container, '.qr-status').hidden).toBe(true);
	});

	it('clears a rendered QR when the settings prop changes', async () => {
		const { container, rerender } = render(ShareLink, {
			codes: ['036000291452'],
			settings: SETTINGS
		});
		await fireEvent.click(q(container, '.copy-link'));
		expect(q<HTMLElement>(container, '.qr-code').querySelector('svg')).not.toBeNull();
		await rerender({ settings: { ...SETTINGS, loop: true } });
		expect(q<HTMLElement>(container, '.qr-code').hidden).toBe(true);
	});
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PlayPage from './+page.svelte';
import { encodeShareUrl } from '$lib/shareUrl';
import { DEFAULT_SETTINGS } from '$lib/types';

const mockPage = vi.hoisted(() => ({ url: new URL('http://localhost/play') }));
const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => ({ page: mockPage }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ resolve: (id: string) => id }));

const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;
const CODES = ['036000291452', 'bad', '012345678905'];
const PLAY_URL = 'http://localhost/play#codes=036000291452%0Abad%0A012345678905&seed=7';

beforeEach(() => {
	mockPage.url = new URL(PLAY_URL);
	goto.mockReset();
});

describe('play page', () => {
	it('renders the scroll column and overlay controls, with no finish screen', () => {
		const { container } = render(PlayPage);
		expect(container.querySelectorAll('.barcode-item').length).toBe(4); // 2 valid × 2 copies
		expect(container.querySelector('.ctl-playpause')).not.toBeNull();
		expect(container.querySelector('.ctl-speed')).not.toBeNull();
		expect(container.querySelector('.finish-screen')).toBeNull();
	});

	it('toggles the play/pause label', async () => {
		const { container } = render(PlayPage);
		const btn = q<HTMLButtonElement>(container, '.ctl-playpause');
		expect(btn.textContent).toBe('Pause');
		await fireEvent.click(btn);
		expect(btn.textContent).toBe('Play');
		await fireEvent.click(btn);
		expect(btn.textContent).toBe('Pause');
	});

	it('navigates back to setup carrying the decoded state', async () => {
		const { container } = render(PlayPage);
		await fireEvent.click(q(container, '.ctl-back'));
		expect(goto.mock.calls[0][0]).toMatch(/^\/#codes=/);
		expect(goto).toHaveBeenCalledWith(
			'/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, seed: 7 })
		);
	});

	it('carries a mid-play speed edit back to setup', async () => {
		const { container } = render(PlayPage);
		await fireEvent.input(q(container, '.ctl-speed'), { target: { value: '300' } });
		await fireEvent.click(q(container, '.ctl-back'));
		expect(goto).toHaveBeenCalledWith(
			'/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, speedPxPerSec: 300, seed: 7 })
		);
	});

	it('redirects to setup when the URL has no valid codes', () => {
		mockPage.url = new URL('http://localhost/play?codes=bad');
		const { container } = render(PlayPage);
		expect(container.querySelector('.play')).toBeNull();
		expect(goto).toHaveBeenCalledWith('/?codes=bad', { replaceState: true });
	});

	it('decodes fmt and renders that format', () => {
		mockPage.url = new URL('http://localhost/play?codes=HELLO&fmt=code39&seed=7');
		const { container } = render(PlayPage);
		expect(container.querySelectorAll('.barcode-item').length).toBe(2); // 1 valid × 2 copies
	});

	it('carries fmt in the Back URL', async () => {
		mockPage.url = new URL('http://localhost/play?codes=HELLO&fmt=code39&seed=7');
		const { container } = render(PlayPage);
		await fireEvent.click(q(container, '.ctl-back'));
		expect(goto.mock.calls[0][0]).toContain('fmt=code39');
	});
});

it('renders a qr list with the 2D item classes', () => {
	mockPage.url = new URL('http://localhost/play?codes=hello%20world&fmt=qr&seed=7');
	const { container } = render(PlayPage);
	expect(container.querySelectorAll('.barcode-item').length).toBe(2);
	expect(container.querySelectorAll('.barcode-item--2d.barcode-item--qr').length).toBe(2);
});

it('renders a upc list with neither 2D class', () => {
	const { container } = render(PlayPage);
	expect(container.querySelector('.barcode-item--2d')).toBeNull();
	expect(container.querySelector('.barcode-item--qr')).toBeNull();
});

it('bounces a fragment URL with no valid codes to the setup fragment', () => {
	mockPage.url = new URL('http://localhost/play#codes=bad');
	const { container } = render(PlayPage);
	expect(container.querySelector('.play')).toBeNull();
	expect(goto).toHaveBeenCalledWith('/#codes=bad', { replaceState: true });
});

it('validates with the URL level: x × 2000 bounces at H and plays at L', () => {
	const X2000 = 'x'.repeat(2000);
	mockPage.url = new URL(`http://localhost/play#codes=${X2000}&fmt=qr&ecc=H&seed=7`);
	const first = render(PlayPage);
	expect(first.container.querySelector('.play')).toBeNull();
	expect(goto).toHaveBeenCalledWith(`/#codes=${X2000}&fmt=qr&ecc=H&seed=7`, { replaceState: true });
	first.unmount();
	mockPage.url = new URL(`http://localhost/play#codes=${X2000}&fmt=qr&ecc=L&seed=7`);
	expect(render(PlayPage).container.querySelectorAll('.barcode-item').length).toBe(2);
});

it('still plays a legacy ?codes= URL', () => {
	mockPage.url = new URL('http://localhost/play?codes=036000291452%0Abad%0A012345678905&seed=7');
	expect(render(PlayPage).container.querySelectorAll('.barcode-item').length).toBe(4);
});

it('builds Back from the decoded codes, not the parsed entries', async () => {
	// Under upc one decoded code "a,b" parses into two entries; Back must keep "a,b".
	mockPage.url = new URL('http://localhost/play#codes=036000291452%2C012345678905&seed=7');
	const { container } = render(PlayPage);
	await fireEvent.click(q(container, '.ctl-back'));
	expect(goto).toHaveBeenCalledWith(
		'/' + encodeShareUrl(['036000291452,012345678905'], { ...DEFAULT_SETTINGS, seed: 7 })
	);
});

it('carries a payload with # & % + , and spaces through Back unchanged', async () => {
	const codes = ['a#b&c%d+e,f g'];
	const s = { ...DEFAULT_SETTINGS, format: 'code128' as const, seed: 7 };
	mockPage.url = new URL('http://localhost/play' + encodeShareUrl(codes, s));
	const { container } = render(PlayPage);
	expect(container.querySelectorAll('.barcode-item').length).toBe(2);
	await fireEvent.click(q(container, '.ctl-back'));
	expect(goto.mock.calls[0][0]).toMatch(/^\/#codes=/);
	expect(goto).toHaveBeenCalledWith('/' + encodeShareUrl(codes, s));
});

it('reloads on hashchange, and not after unmount', () => {
	const reload = vi.fn();
	const { origin, pathname } = location;
	vi.stubGlobal('location', { origin, pathname, reload });
	try {
		const { unmount } = render(PlayPage);
		window.dispatchEvent(new Event('hashchange'));
		expect(reload).toHaveBeenCalledTimes(1);
		unmount();
		window.dispatchEvent(new Event('hashchange'));
		expect(reload).toHaveBeenCalledTimes(1);
	} finally {
		vi.unstubAllGlobals();
	}
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PlayPage from './+page.svelte';
import { encodeShareUrl } from '$lib/shareUrl';
import { DEFAULT_SETTINGS } from '$lib/types';
import { tick } from 'svelte';

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

describe('play page: step mode', () => {
	let c: HTMLElement;
	let frames: FrameRequestCallback[];
	/** Render the play page for PLAY_URL (two valid codes, loop off) in step mode, plus `extra`. */
	const open = (extra = '', base = PLAY_URL + '&mode=step') => {
		mockPage.url = new URL(base + extra);
		const result = render(PlayPage);
		c = result.container;
		return result;
	};
	const txt = (sel: string) => q(c, sel).textContent;
	const v = (sel: string) => q<HTMLInputElement>(c, sel).value;
	const click = (sel: string) => fireEvent.click(q(c, sel));
	const key = (target: Window | Element, init: KeyboardEventInit) =>
		fireEvent.keyDown(target, init);
	beforeEach(() => {
		frames = [];
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('mounts one code with the step controls in order, and Next and Prev move the counter', async () => {
		open();
		expect(c.querySelectorAll('.step-stage > .barcode-item').length).toBe(1);
		expect(c.querySelector('.scroller-track')).toBeNull();
		expect(c.querySelector('.ctl-speed')).toBeNull();
		const kids = Array.from(q(c, '.overlay').children);
		expect(kids.map((el) => [...el.classList].find((n) => n.startsWith('ctl-')))).toEqual([
			'ctl-playpause',
			'ctl-prev',
			'ctl-counter',
			'ctl-next',
			'ctl-group',
			'ctl-group',
			'ctl-restart',
			'ctl-back'
		]);
		expect(kids[4].querySelector('.ctl-dwell')).not.toBeNull();
		expect(kids[5].querySelector('.ctl-gap')).not.toBeNull();
		expect(txt('.ctl-counter')).toBe('1 / 2');
		await click('.ctl-next');
		expect(txt('.ctl-counter')).toBe('2 / 2');
		await click('.ctl-prev');
		expect(txt('.ctl-counter')).toBe('1 / 2');
	});

	it('opens paused with Play, requests no frame, and steps once played', async () => {
		open();
		expect(txt('.ctl-playpause')).toBe('Play');
		expect(frames).toEqual([]);
		await click('.ctl-playpause');
		expect(txt('.ctl-playpause')).toBe('Pause');
		for (let ts = 0; ts <= 1000; ts += 100) frames.shift()?.(ts);
		await tick();
		expect(txt('.ctl-counter')).toBe('2 / 2');
	});

	it('shows a readout outside the overlay that follows Play, Next and the dwell slider', async () => {
		open();
		expect(txt('.readout')).toBe('1 / 2 · dwell 1.00 s · gap 0.00 s · paused');
		await click('.ctl-playpause');
		expect(txt('.readout')).toBe('1 / 2 · dwell 1.00 s · gap 0.00 s');
		await click('.ctl-next');
		expect(txt('.readout')).toMatch(/^2 \/ 2 · dwell /);
		await fireEvent.input(q(c, '.ctl-dwell'), { target: { value: '300' } });
		expect(txt('.readout')).toContain('dwell 0.30 s');
		expect(q(c, '.overlay').querySelector('.readout')).toBeNull();
		expect(q(c, '.readout').getAttribute('aria-hidden')).toBe('true');
		expect(q(c, '.readout').hasAttribute('aria-live')).toBe(false);
		expect(q(c, '.ctl-counter').hasAttribute('aria-live')).toBe(false);
	});

	it('reads 1 / 1 for a one-code link', () => {
		open('', 'http://localhost/play#codes=036000291452&seed=7&mode=step');
		expect(txt('.ctl-counter')).toBe('1 / 1');
		expect(txt('.readout')).toBe('1 / 1 · dwell 1.00 s · gap 0.00 s · paused');
	});

	it('keeps the overlay while paused or while a control has keyboard focus', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		open();
		const settle = async () => {
			vi.advanceTimersByTime(3000);
			await tick();
		};
		await settle();
		expect(q(c, '.overlay').classList.contains('hidden')).toBe(false);
		// fireEvent.click moves no focus in jsdom, and nwsapi's :focus-visible is :focus; this pins
		// "playing, nothing focused, so it hides". The mouse case is verification row 6d.
		await click('.ctl-playpause');
		await settle();
		expect(q(c, '.overlay').classList.contains('hidden')).toBe(true);
		await fireEvent.pointerMove(window);
		q<HTMLInputElement>(c, '.ctl-dwell').focus(); // matches :focus-visible in jsdom
		await settle();
		expect(q(c, '.overlay').classList.contains('hidden')).toBe(false);
	});

	it('loads dwell and gap from the link into the labelled sliders and seconds fields', async () => {
		open('&dwell=500&gap=250');
		expect(v('.ctl-dwell')).toBe('500');
		expect(v('.ctl-dwell-seconds')).toBe('0.50');
		expect(v('.ctl-gap')).toBe('250');
		expect(v('.ctl-gap-seconds')).toBe('0.25');
		expect(q(c, '.ctl-dwell').getAttribute('aria-label')).toBe('Dwell');
		expect(q(c, '.ctl-dwell-seconds').getAttribute('aria-label')).toBe('Dwell in seconds');
		expect(q(c, '.ctl-gap').getAttribute('aria-label')).toBe('Gap');
		expect(q(c, '.ctl-gap-seconds').getAttribute('aria-label')).toBe('Gap in seconds');
		await fireEvent.change(q(c, '.ctl-dwell-seconds'), { target: { value: '0.3' } });
		expect(v('.ctl-dwell')).toBe('300');
		expect(txt('.readout')).toContain('dwell 0.30 s');
	});

	it('re-renders 1.00 for a seconds field set to its value, with no change recorded', async () => {
		open();
		await click('.ctl-playpause');
		await fireEvent.change(q(c, '.ctl-dwell-seconds'), { target: { value: '1' } });
		expect(v('.ctl-dwell-seconds')).toBe('1.00');
		expect(v('.ctl-dwell')).toBe('1000');
		await click('.ctl-next');
		await click('.ctl-next');
		expect(txt('.finish-text')).toBe(
			'Finished stepping 2 barcodes in 0.00 seconds at 1.00 s dwell.'
		);
	});

	it('steps with the arrow keys unless a field has them, ignoring repeats and modifiers', async () => {
		open();
		await key(window, { key: 'ArrowRight' });
		expect(txt('.ctl-counter')).toBe('2 / 2');
		await key(window, { key: 'ArrowLeft' });
		expect(txt('.ctl-counter')).toBe('1 / 2');
		await key(q(c, '.ctl-dwell'), { key: 'ArrowRight' });
		await key(window, { key: 'ArrowRight', repeat: true });
		await key(window, { key: 'ArrowRight', altKey: true });
		expect(txt('.ctl-counter')).toBe('1 / 2');
	});

	it('toggles on Space from the window or body, never from a button, field or slider', async () => {
		open();
		await key(window, { key: ' ' });
		expect(txt('.ctl-playpause')).toBe('Pause');
		await key(window, { key: ' ' });
		expect(txt('.ctl-playpause')).toBe('Play');
		for (const sel of [
			'.ctl-next',
			'.ctl-dwell-seconds',
			'.ctl-gap-seconds',
			'.ctl-dwell',
			'.ctl-gap'
		]) {
			const el = q<HTMLElement>(c, sel);
			el.focus();
			await key(el, { key: ' ' });
			expect(txt('.ctl-playpause')).toBe('Play');
		}
		await key(document.body, { key: ' ' });
		expect(txt('.ctl-playpause')).toBe('Pause');
	});

	it('finishes on Next at the last code with the run record as a status, then ignores keys', async () => {
		open('&dwell=500&gap=250');
		// Held across the finish: the live region must be the same node before and after.
		const status = q(c, '.finish-status');
		expect(status.getAttribute('role')).toBe('status');
		expect(status.textContent).toBe('');
		await click('.ctl-next');
		await click('.ctl-next');
		const text = 'Finished stepping 2 barcodes in 0.00 seconds at 0.50 s dwell, 0.25 s gap.';
		expect(txt('.finish-text')).toBe(text);
		expect(status.textContent).toBe(text);
		await key(window, { key: 'ArrowRight' });
		expect(txt('.finish-text')).toBe(text);
	});

	it('reports a dwell set before Play as the dwell, and one changed after Play as a change', async () => {
		const first = open('&dwell=500&gap=250');
		await fireEvent.input(q(c, '.ctl-dwell'), { target: { value: '300' } });
		await click('.ctl-next');
		await click('.ctl-next');
		expect(txt('.finish-text')).toContain('at 0.30 s dwell');
		first.unmount();
		open('&dwell=500&gap=250');
		await click('.ctl-playpause');
		await fireEvent.change(q(c, '.ctl-dwell-seconds'), { target: { value: '0.3' } });
		await click('.ctl-next');
		await click('.ctl-next');
		expect(txt('.finish-text')).toContain('dwell changed from 0.50 s to 0.30 s');
	});

	it('shows Play and a paused readout behind the finish screen when the run ends while playing', async () => {
		open();
		await click('.ctl-playpause');
		// The 0 frame counts nothing; then twenty 100 ms intervals: the swap at 1000, the finish at 2000.
		for (let ts = 0; ts <= 2000; ts += 100) frames.shift()?.(ts);
		await tick();
		expect(txt('.finish-text')).toBe(
			'Finished stepping 2 barcodes in 2.00 seconds at 1.00 s dwell. Display about 10 Hz.'
		);
		expect(txt('.ctl-playpause')).toBe('Play');
		expect(txt('.readout')).toMatch(/ · paused$/);
	});

	it("moves focus to the finish screen's Restart when a run finishes", async () => {
		open();
		q<HTMLButtonElement>(c, '.ctl-next').focus();
		await click('.ctl-next');
		await click('.ctl-next');
		await tick();
		expect(document.activeElement).toBe(q(c, '.finish-restart'));
	});

	it("returns to code 1 on Restart, and the finish screen's Restart lands paused", async () => {
		open();
		await click('.ctl-next');
		await click('.ctl-next'); // finishes: PLAY_URL has loop off
		await click('.ctl-restart');
		expect(c.querySelector('.finish-text')).toBeNull();
		expect(txt('.ctl-counter')).toBe('1 / 2');
		await click('.ctl-next');
		await click('.ctl-next');
		await click('.finish-restart');
		expect(c.querySelector('.finish-screen')).toBeNull();
		expect(txt('.ctl-counter')).toBe('1 / 2');
		expect(txt('.ctl-playpause')).toBe('Play');
		expect(txt('.readout')).toMatch(/ · paused$/);
	});

	it('carries the live dwell and gap back to setup', async () => {
		open();
		await fireEvent.input(q(c, '.ctl-dwell'), { target: { value: '300' } });
		await fireEvent.input(q(c, '.ctl-gap'), { target: { value: '100' } });
		await click('.ctl-back');
		expect(goto).toHaveBeenCalledWith(
			'/' +
				encodeShareUrl(CODES, {
					...DEFAULT_SETTINGS,
					seed: 7,
					mode: 'step',
					dwellMs: 300,
					gapMs: 100
				})
		);
	});
});

describe('play page: records links', () => {
	const DECK_URL = 'http://localhost/play#r1=upc_036000291452&r2=qr_hello&seed=7';

	it('renders each entry with its own format classes', () => {
		mockPage.url = new URL(DECK_URL);
		const { container } = render(PlayPage);
		const items = container.querySelectorAll('.barcode-item');
		expect(items.length).toBe(4); // 2 valid × 2 copies
		expect(items[0].classList.contains('barcode-item--2d')).toBe(false);
		expect(items[0].classList.contains('barcode-item--qr')).toBe(false);
		expect(items[1].classList.contains('barcode-item--2d')).toBe(true);
		expect(items[1].classList.contains('barcode-item--qr')).toBe(true);
	});

	it('plays each row at its own level', () => {
		mockPage.url = new URL('http://localhost/play#r1=qr-H_hello&r2=qr_hello&seed=7');
		const { container } = render(PlayPage);
		const items = container.querySelectorAll('.barcode-item');
		expect(items[0].innerHTML).not.toBe(items[1].innerHTML);
	});

	it('renders equal rows alike when the levels match', () => {
		mockPage.url = new URL('http://localhost/play#r1=qr_hello&r2=qr_hello&seed=7');
		const { container } = render(PlayPage);
		const items = container.querySelectorAll('.barcode-item');
		expect(items[0].innerHTML).toBe(items[1].innerHTML);
	});

	it('bounces a records link whose every record is dropped', () => {
		mockPage.url = new URL('http://localhost/play#r1=foo_bar&seed=7');
		render(PlayPage);
		expect(goto).toHaveBeenCalledWith('/#r1=foo_bar&seed=7', { replaceState: true });
	});

	it('carries the records and the live speed back to setup', async () => {
		mockPage.url = new URL(DECK_URL);
		const { container } = render(PlayPage);
		await fireEvent.input(q(container, '.ctl-speed'), { target: { value: '120' } });
		await fireEvent.click(q(container, '.ctl-back'));
		expect(goto).toHaveBeenCalledWith(
			'/#r1=upc_036000291452&r2=qr_hello&speed=120&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=7&fmt=upc'
		);
	});
});

it('plays a GS1-128 list link that renders invalid data only with lax=1, and carries it Back', async () => {
	const link = 'http://localhost/play#codes=%2801%2909501101530004&fmt=gs1128&seed=7';
	mockPage.url = new URL(link);
	const strict = render(PlayPage);
	expect(strict.container.querySelector('.play')).toBeNull();
	expect(goto).toHaveBeenCalledWith('/#codes=%2801%2909501101530004&fmt=gs1128&seed=7', {
		replaceState: true
	});
	strict.unmount();
	goto.mockReset();
	mockPage.url = new URL(link.replace('&seed=7', '&lax=1&seed=7'));
	const { container } = render(PlayPage);
	expect(container.querySelectorAll('.barcode-item.barcode-item--gs1128').length).toBe(2);
	expect(container.querySelector('.barcode-item--2d')).toBeNull();
	await fireEvent.click(q(container, '.ctl-back'));
	expect(goto.mock.calls[0][0]).toMatch(/&fmt=gs1128&lax=1$/);
});

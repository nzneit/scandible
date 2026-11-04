import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/svelte';
import PlayPage from './+page.svelte';
import { encodeShareUrl } from '$lib/shareUrl';
import { DEFAULT_SETTINGS } from '$lib/types';
import { tick } from 'svelte';

const mockPage = vi.hoisted(() => ({ url: new URL('http://localhost/play') }));
const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => ({ page: mockPage }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ resolve: (id: string) => id }));

const CODES = ['036000291452', 'bad', '012345678905'];
const PLAY_URL = 'http://localhost/play#codes=036000291452%0Abad%0A012345678905&seed=7';
const READOUT = /^\d+ \/ \d+ · dwell /; // Questions 3: the step readout, whose text varies
const overlay = () => screen.getByRole('group', { name: 'Playback controls' });
const finish = () => screen.getByRole('group', { name: 'Run finished' });
/** A button in the overlay. The finish screen repeats Restart and Back, so the scope matters. */
const control = (name: string) => within(overlay()).getByRole('button', { name });
const readout = () => screen.getByText(READOUT);
/** The raw textContent of the element in `scope` whose trimmed text is `text`. */
const exactText = (scope: HTMLElement, text: string) =>
	within(scope).getByText(text.trim()).textContent; // R3
// eslint-disable-next-line testing-library/no-node-access -- stage structure: the engine's barcode items have no role (spec 3 may add one)
const stage = (selector = '.barcode-item') => [...document.querySelectorAll<HTMLElement>(selector)];
// fallback -- visual state: the faded overlay is opacity 0, which jsdom does not render (spec 3 can remove this)
const faded = () => overlay().classList.contains('hidden');

beforeEach(() => {
	mockPage.url = new URL(PLAY_URL);
	goto.mockReset();
});

describe('play page', () => {
	it('renders the scroll column and overlay controls, with no finish screen', () => {
		render(PlayPage);
		expect(stage()).toHaveLength(4); // 2 valid × 2 copies
		expect(control('Pause')).toBeInTheDocument();
		expect(within(overlay()).getByRole('slider', { name: 'Speed' })).toBeInTheDocument();
		expect(screen.queryByRole('group', { name: 'Run finished' })).toBeNull();
	});

	it('toggles the play/pause label', async () => {
		render(PlayPage);
		const btn = control('Pause');
		expect(btn.textContent).toBe('Pause');
		await fireEvent.click(btn);
		expect(btn.textContent).toBe('Play');
		await fireEvent.click(btn);
		expect(btn.textContent).toBe('Pause');
	});

	it('navigates back to setup carrying the decoded state', async () => {
		render(PlayPage);
		await fireEvent.click(control('Back'));
		expect(goto.mock.calls[0][0]).toMatch(/^\/#codes=/);
		expect(goto).toHaveBeenCalledWith(
			'/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, seed: 7 })
		);
	});

	it('carries a mid-play speed edit back to setup', async () => {
		render(PlayPage);
		await fireEvent.input(within(overlay()).getByRole('slider', { name: 'Speed' }), {
			target: { value: '300' }
		});
		await fireEvent.click(control('Back'));
		expect(goto).toHaveBeenCalledWith(
			'/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, speedPxPerSec: 300, seed: 7 })
		);
	});

	it('redirects to setup when the URL has no valid codes', () => {
		mockPage.url = new URL('http://localhost/play?codes=bad');
		render(PlayPage);
		expect(screen.queryByRole('group', { name: 'Playback controls' })).toBeNull();
		expect(goto).toHaveBeenCalledWith('/?codes=bad', { replaceState: true });
	});

	it('decodes fmt and renders that format', () => {
		mockPage.url = new URL('http://localhost/play?codes=HELLO&fmt=code39&seed=7');
		render(PlayPage);
		expect(stage()).toHaveLength(2); // 1 valid × 2 copies
	});

	it('carries fmt in the Back URL', async () => {
		mockPage.url = new URL('http://localhost/play?codes=HELLO&fmt=code39&seed=7');
		render(PlayPage);
		await fireEvent.click(control('Back'));
		expect(goto.mock.calls[0][0]).toContain('fmt=code39');
	});

	it('plays a raw GS1 code from a list link', () => {
		mockPage.url = new URL(
			'http://localhost/play#codes=%5DC110LOT42%1D0109501101530003&fmt=gs1128&seed=7'
		);
		render(PlayPage);
		expect(stage()).toHaveLength(2); // 1 valid × 2 copies
	});
});

it('renders a qr list with the 2D item classes', () => {
	mockPage.url = new URL('http://localhost/play?codes=hello%20world&fmt=qr&seed=7');
	render(PlayPage);
	expect(stage()).toHaveLength(2);
	expect(stage('.barcode-item--2d.barcode-item--qr')).toHaveLength(2);
});

it('renders a upc list with neither 2D class', () => {
	render(PlayPage);
	expect(stage('.barcode-item--2d')).toHaveLength(0);
	expect(stage('.barcode-item--qr')).toHaveLength(0);
});

it('bounces a fragment URL with no valid codes to the setup fragment', () => {
	mockPage.url = new URL('http://localhost/play#codes=bad');
	render(PlayPage);
	expect(screen.queryByRole('group', { name: 'Playback controls' })).toBeNull();
	expect(goto).toHaveBeenCalledWith('/#codes=bad', { replaceState: true });
});

it('validates with the URL level: x × 2000 bounces at H and plays at L', () => {
	const X2000 = 'x'.repeat(2000);
	mockPage.url = new URL(`http://localhost/play#codes=${X2000}&fmt=qr&ecc=H&seed=7`);
	const { unmount } = render(PlayPage);
	expect(screen.queryByRole('group', { name: 'Playback controls' })).toBeNull();
	expect(goto).toHaveBeenCalledWith(`/#codes=${X2000}&fmt=qr&ecc=H&seed=7`, { replaceState: true });
	unmount();
	mockPage.url = new URL(`http://localhost/play#codes=${X2000}&fmt=qr&ecc=L&seed=7`);
	render(PlayPage);
	expect(stage()).toHaveLength(2);
});

it('still plays a legacy ?codes= URL', () => {
	mockPage.url = new URL('http://localhost/play?codes=036000291452%0Abad%0A012345678905&seed=7');
	render(PlayPage);
	expect(stage()).toHaveLength(4);
});

it('builds Back from the decoded codes, not the parsed entries', async () => {
	// Under upc one decoded code "a,b" parses into two entries; Back must keep "a,b".
	mockPage.url = new URL('http://localhost/play#codes=036000291452%2C012345678905&seed=7');
	render(PlayPage);
	await fireEvent.click(control('Back'));
	expect(goto).toHaveBeenCalledWith(
		'/' + encodeShareUrl(['036000291452,012345678905'], { ...DEFAULT_SETTINGS, seed: 7 })
	);
});

it('carries a payload with # & % + , and spaces through Back unchanged', async () => {
	const codes = ['a#b&c%d+e,f g'];
	const s = { ...DEFAULT_SETTINGS, format: 'code128' as const, seed: 7 };
	mockPage.url = new URL('http://localhost/play' + encodeShareUrl(codes, s));
	render(PlayPage);
	expect(stage()).toHaveLength(2);
	await fireEvent.click(control('Back'));
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
	let frames: FrameRequestCallback[];
	/** Render the play page for PLAY_URL (two valid codes, loop off) in step mode, plus `extra`. */
	const open = (extra = '', base = PLAY_URL + '&mode=step') => {
		mockPage.url = new URL(base + extra);
		const view = render(PlayPage);
		return view;
	};
	const click = (el: HTMLElement) => fireEvent.click(el);
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
		expect(stage('.step-stage > .barcode-item')).toHaveLength(1);
		expect(stage('.scroller-track')).toHaveLength(0);
		expect(screen.queryByRole('slider', { name: 'Speed' })).toBeNull();
		const box = overlay();
		const order = [
			control('Play'),
			control('Prev'),
			within(box).getByText('1 / 2'),
			control('Next'),
			within(box).getByRole('slider', { name: 'Dwell' }),
			within(box).getByRole('spinbutton', { name: 'Dwell in seconds' }),
			within(box).getByRole('slider', { name: 'Gap' }),
			within(box).getByRole('spinbutton', { name: 'Gap in seconds' }),
			control('Restart'),
			control('Back')
		];
		for (let i = 1; i < order.length; i++) expect(order[i - 1]).toAppearBefore(order[i]);
		expect(
			within(box)
				.getAllByRole('button')
				.map((b) => b.textContent)
		).toEqual(['Play', 'Prev', 'Next', 'Restart', 'Back']);
		expect(within(box).getAllByRole('slider')).toHaveLength(2);
		expect(within(box).getAllByRole('spinbutton')).toHaveLength(2);
		expect(exactText(box, '1 / 2')).toBe('1 / 2');
		await click(control('Next'));
		expect(exactText(overlay(), '2 / 2')).toBe('2 / 2');
		await click(control('Prev'));
		expect(exactText(overlay(), '1 / 2')).toBe('1 / 2');
	});

	it('opens paused with Play, requests no frame, and steps once played', async () => {
		open();
		expect(control('Play').textContent).toBe('Play');
		expect(frames).toEqual([]);
		await click(control('Play'));
		expect(control('Pause').textContent).toBe('Pause');
		for (let ts = 0; ts <= 1000; ts += 100) frames.shift()?.(ts);
		await tick();
		expect(exactText(overlay(), '2 / 2')).toBe('2 / 2');
	});

	it('shows a readout outside the overlay that follows Play, Next and the dwell slider', async () => {
		open();
		expect(readout().textContent).toBe('1 / 2 · dwell 1.00 s · gap 0.00 s · paused');
		await click(control('Play'));
		expect(readout().textContent).toBe('1 / 2 · dwell 1.00 s · gap 0.00 s');
		await click(control('Next'));
		expect(readout()).toHaveTextContent(/^2 \/ 2 · dwell /);
		await fireEvent.input(within(overlay()).getByRole('slider', { name: 'Dwell' }), {
			target: { value: '300' }
		});
		expect(readout()).toHaveTextContent('dwell 0.30 s');
		expect(within(overlay()).queryByText(READOUT)).toBeNull();
		expect(readout()).toHaveAttribute('aria-hidden', 'true');
		expect(readout()).not.toHaveAttribute('aria-live');
		expect(within(overlay()).getByText('2 / 2')).not.toHaveAttribute('aria-live');
	});

	it('reads 1 / 1 for a one-code link', () => {
		open('', 'http://localhost/play#codes=036000291452&seed=7&mode=step');
		expect(exactText(overlay(), '1 / 1')).toBe('1 / 1');
		expect(readout().textContent).toBe('1 / 1 · dwell 1.00 s · gap 0.00 s · paused');
	});

	it('keeps the overlay while paused or while a control has keyboard focus', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		open();
		const settle = async () => {
			vi.advanceTimersByTime(3000);
			await tick();
		};
		await settle();
		expect(faded()).toBe(false);
		// fireEvent.click moves no focus in jsdom, and nwsapi's :focus-visible is :focus; this pins
		// "playing, nothing focused, so it hides". The mouse case is verification row 6d.
		await click(control('Play'));
		await settle();
		expect(faded()).toBe(true);
		await fireEvent.pointerMove(window);
		within(overlay()).getByRole('slider', { name: 'Dwell' }).focus(); // matches :focus-visible in jsdom
		await settle();
		expect(faded()).toBe(false);
	});

	it('loads dwell and gap from the link into the labelled sliders and seconds fields', async () => {
		open('&dwell=500&gap=250');
		expect(within(overlay()).getByRole('slider', { name: 'Dwell' })).toHaveValue('500');
		expect(
			within(overlay()).getByRole('spinbutton', { name: 'Dwell in seconds' })
		).toHaveDisplayValue('0.50');
		expect(within(overlay()).getByRole('slider', { name: 'Gap' })).toHaveValue('250');
		expect(
			within(overlay()).getByRole('spinbutton', { name: 'Gap in seconds' })
		).toHaveDisplayValue('0.25');
		expect(within(overlay()).getByRole('slider', { name: 'Dwell' })).toBeInTheDocument();
		expect(
			within(overlay()).getByRole('spinbutton', { name: 'Dwell in seconds' })
		).toBeInTheDocument();
		expect(within(overlay()).getByRole('slider', { name: 'Gap' })).toBeInTheDocument();
		expect(
			within(overlay()).getByRole('spinbutton', { name: 'Gap in seconds' })
		).toBeInTheDocument();
		await fireEvent.change(
			within(overlay()).getByRole('spinbutton', { name: 'Dwell in seconds' }),
			{
				target: { value: '0.3' }
			}
		);
		expect(within(overlay()).getByRole('slider', { name: 'Dwell' })).toHaveValue('300');
		expect(readout()).toHaveTextContent('dwell 0.30 s');
	});

	it('re-renders 1.00 for a seconds field set to its value, with no change recorded', async () => {
		open();
		await click(control('Play'));
		await fireEvent.change(
			within(overlay()).getByRole('spinbutton', { name: 'Dwell in seconds' }),
			{
				target: { value: '1' }
			}
		);
		expect(
			within(overlay()).getByRole('spinbutton', { name: 'Dwell in seconds' })
		).toHaveDisplayValue('1.00');
		expect(within(overlay()).getByRole('slider', { name: 'Dwell' })).toHaveValue('1000');
		await click(control('Next'));
		await click(control('Next'));
		expect(within(finish()).getByRole('paragraph').textContent).toBe(
			'Finished stepping 2 barcodes in 0.00 seconds at 1.00 s dwell.'
		);
	});

	it('steps with the arrow keys unless a field has them, ignoring repeats and modifiers', async () => {
		open();
		await key(window, { key: 'ArrowRight' });
		expect(exactText(overlay(), '2 / 2')).toBe('2 / 2');
		await key(window, { key: 'ArrowLeft' });
		expect(exactText(overlay(), '1 / 2')).toBe('1 / 2');
		await key(within(overlay()).getByRole('slider', { name: 'Dwell' }), { key: 'ArrowRight' });
		await key(window, { key: 'ArrowRight', repeat: true });
		await key(window, { key: 'ArrowRight', altKey: true });
		expect(exactText(overlay(), '1 / 2')).toBe('1 / 2');
	});

	it('toggles on Space from the window or body, never from a button, field or slider', async () => {
		open();
		await key(window, { key: ' ' });
		expect(control('Pause').textContent).toBe('Pause');
		await key(window, { key: ' ' });
		expect(control('Play').textContent).toBe('Play');
		for (const get of [
			() => control('Next'),
			() => within(overlay()).getByRole('spinbutton', { name: 'Dwell in seconds' }),
			() => within(overlay()).getByRole('spinbutton', { name: 'Gap in seconds' }),
			() => within(overlay()).getByRole('slider', { name: 'Dwell' }),
			() => within(overlay()).getByRole('slider', { name: 'Gap' })
		]) {
			const el = get();
			el.focus();
			await key(el, { key: ' ' });
			expect(control('Play').textContent).toBe('Play');
		}
		await key(document.body, { key: ' ' });
		expect(control('Pause').textContent).toBe('Pause');
	});

	it('finishes on Next at the last code with the run record as a status, then ignores keys', async () => {
		open('&dwell=500&gap=250');
		// Held across the finish: the live region must be the same node before and after.
		const status = screen.getByRole('status');
		expect(status).toBeInTheDocument();
		expect(status.textContent).toBe('');
		await click(control('Next'));
		await click(control('Next'));
		const text = 'Finished stepping 2 barcodes in 0.00 seconds at 0.50 s dwell, 0.25 s gap.';
		expect(within(finish()).getByRole('paragraph').textContent).toBe(text);
		expect(status.textContent).toBe(text);
		await key(window, { key: 'ArrowRight' });
		expect(within(finish()).getByRole('paragraph').textContent).toBe(text);
	});

	it('reports a dwell set before Play as the dwell, and one changed after Play as a change', async () => {
		const first = open('&dwell=500&gap=250');
		await fireEvent.input(within(overlay()).getByRole('slider', { name: 'Dwell' }), {
			target: { value: '300' }
		});
		await click(control('Next'));
		await click(control('Next'));
		expect(within(finish()).getByRole('paragraph')).toHaveTextContent('at 0.30 s dwell');
		first.unmount();
		open('&dwell=500&gap=250');
		await click(control('Play'));
		await fireEvent.change(
			within(overlay()).getByRole('spinbutton', { name: 'Dwell in seconds' }),
			{
				target: { value: '0.3' }
			}
		);
		await click(control('Next'));
		await click(control('Next'));
		expect(within(finish()).getByRole('paragraph')).toHaveTextContent(
			'dwell changed from 0.50 s to 0.30 s'
		);
	});

	it('shows Play and a paused readout behind the finish screen when the run ends while playing', async () => {
		open();
		await click(control('Play'));
		// The 0 frame counts nothing; then twenty 100 ms intervals: the swap at 1000, the finish at 2000.
		for (let ts = 0; ts <= 2000; ts += 100) frames.shift()?.(ts);
		await tick();
		expect(within(finish()).getByRole('paragraph').textContent).toBe(
			'Finished stepping 2 barcodes in 2.00 seconds at 1.00 s dwell. Display about 10 Hz.'
		);
		expect(control('Play').textContent).toBe('Play');
		expect(readout()).toHaveTextContent(/ · paused$/);
	});

	it("moves focus to the finish screen's Restart when a run finishes", async () => {
		open();
		control('Next').focus();
		await click(control('Next'));
		await click(control('Next'));
		await tick();
		expect(within(finish()).getByRole('button', { name: 'Restart' })).toHaveFocus();
	});

	it("returns to code 1 on Restart, and the finish screen's Restart lands paused", async () => {
		open();
		await click(control('Next'));
		await click(control('Next')); // finishes: PLAY_URL has loop off
		await click(control('Restart'));
		expect(screen.queryByRole('group', { name: 'Run finished' })).toBeNull();
		expect(exactText(overlay(), '1 / 2')).toBe('1 / 2');
		await click(control('Next'));
		await click(control('Next'));
		await click(within(finish()).getByRole('button', { name: 'Restart' }));
		expect(screen.queryByRole('group', { name: 'Run finished' })).toBeNull();
		expect(exactText(overlay(), '1 / 2')).toBe('1 / 2');
		expect(control('Play').textContent).toBe('Play');
		expect(readout()).toHaveTextContent(/ · paused$/);
	});

	it('carries the live dwell and gap back to setup', async () => {
		open();
		await fireEvent.input(within(overlay()).getByRole('slider', { name: 'Dwell' }), {
			target: { value: '300' }
		});
		await fireEvent.input(within(overlay()).getByRole('slider', { name: 'Gap' }), {
			target: { value: '100' }
		});
		await click(control('Back'));
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
		render(PlayPage);
		const items = stage();
		expect(items).toHaveLength(4); // 2 valid × 2 copies
		expect(items[0].classList.contains('barcode-item--2d')).toBe(false);
		expect(items[0].classList.contains('barcode-item--qr')).toBe(false);
		expect(items[1].classList.contains('barcode-item--2d')).toBe(true);
		expect(items[1].classList.contains('barcode-item--qr')).toBe(true);
	});

	it('plays each row at its own level', () => {
		mockPage.url = new URL('http://localhost/play#r1=qr-H_hello&r2=qr_hello&seed=7');
		render(PlayPage);
		const items = stage();
		expect(items[0].innerHTML).not.toBe(items[1].innerHTML);
	});

	it('renders equal rows alike when the levels match', () => {
		mockPage.url = new URL('http://localhost/play#r1=qr_hello&r2=qr_hello&seed=7');
		render(PlayPage);
		const items = stage();
		expect(items[0].innerHTML).toBe(items[1].innerHTML);
	});

	it('bounces a records link whose every record is dropped', () => {
		mockPage.url = new URL('http://localhost/play#r1=foo_bar&seed=7');
		render(PlayPage);
		expect(goto).toHaveBeenCalledWith('/#r1=foo_bar&seed=7', { replaceState: true });
	});

	it('carries the records and the live speed back to setup', async () => {
		mockPage.url = new URL(DECK_URL);
		render(PlayPage);
		await fireEvent.input(within(overlay()).getByRole('slider', { name: 'Speed' }), {
			target: { value: '120' }
		});
		await fireEvent.click(control('Back'));
		expect(goto).toHaveBeenCalledWith(
			'/#r1=upc_036000291452&r2=qr_hello&speed=120&loop=0&rot=0&rotmax=8&skew=0&skewmax=8&seed=7&fmt=upc'
		);
	});
});

it('plays a GS1-128 list link that renders invalid data only with lax=1, and carries it Back', async () => {
	const link = 'http://localhost/play#codes=%2801%2909501101530004&fmt=gs1128&seed=7';
	mockPage.url = new URL(link);
	const { unmount } = render(PlayPage);
	expect(screen.queryByRole('group', { name: 'Playback controls' })).toBeNull();
	expect(goto).toHaveBeenCalledWith('/#codes=%2801%2909501101530004&fmt=gs1128&seed=7', {
		replaceState: true
	});
	unmount();
	goto.mockReset();
	mockPage.url = new URL(link.replace('&seed=7', '&lax=1&seed=7'));
	render(PlayPage);
	expect(stage('.barcode-item.barcode-item--gs1128')).toHaveLength(2);
	expect(stage('.barcode-item--2d')).toHaveLength(0);
	await fireEvent.click(control('Back'));
	expect(goto.mock.calls[0][0]).toMatch(/&fmt=gs1128&lax=1$/);
});

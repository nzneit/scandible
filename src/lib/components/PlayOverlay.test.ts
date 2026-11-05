import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import PlayOverlay from './PlayOverlay.svelte';
import { KEEP_AWAKE_NOTE } from '$lib/keepAwake';

const UNAVAILABLE = KEEP_AWAKE_NOTE.unavailable;
const REFUSED = KEEP_AWAKE_NOTE.refused;

/** Render a paused Step overlay bound to plain parent values: `set` records every write it makes. */
function mount(extra: Record<string, unknown> = {}) {
	const values = { dwell: 1000, gap: 0, speed: 60 };
	const set = {
		dwell: vi.fn((v: number) => (values.dwell = v)),
		gap: vi.fn((v: number) => (values.gap = v)),
		speed: vi.fn((v: number) => (values.speed = v))
	};
	const callbacks = {
		onToggle: vi.fn(),
		onPrev: vi.fn(),
		onNext: vi.fn(),
		onRestart: vi.fn(),
		onBack: vi.fn(),
		onDwell: vi.fn(),
		onGap: vi.fn(),
		onSpeed: vi.fn(),
		onfocusin: vi.fn(),
		onfocusout: vi.fn()
	};
	const { rerender, component } = render(PlayOverlay, {
		props: {
			mode: 'step',
			visible: true,
			playing: false,
			position: { index: 0, count: 2 },
			note: null,
			...callbacks,
			get dwell() {
				return values.dwell;
			},
			set dwell(v: number) {
				set.dwell(v);
			},
			get gap() {
				return values.gap;
			},
			set gap(v: number) {
				set.gap(v);
			},
			get speed() {
				return values.speed;
			},
			set speed(v: number) {
				set.speed(v);
			},
			...extra
		}
	});
	return { ...callbacks, set, rerender, component };
}
const group = () => screen.getByRole('group', { name: 'Playback controls' });
const button = (name: string) => within(group()).getByRole('button', { name });
// eslint-disable-next-line testing-library/no-node-access -- visual state: the tooltip is drawn by CSS from data-tip on the button's wrapper, which has no role
const tip = (name: string) => button(name).parentElement;
const note = () => screen.getByRole('status', { name: 'Keep-awake status' });

describe('PlayOverlay', () => {
	it('names the Step controls in order: Back, Restart, Prev, Play, Next, the counter, then Dwell and Gap', () => {
		mount();
		const buttons = within(group()).getAllByRole('button');
		const names = ['Back', 'Restart', 'Prev', 'Play', 'Next'];
		expect(buttons).toHaveLength(names.length);
		buttons.forEach((b, i) => expect(b).toHaveAccessibleName(names[i]));
		const order = [
			...names.map(button),
			within(group()).getByText('1 / 2'),
			within(group()).getByRole('slider', { name: 'Dwell' }),
			within(group()).getByRole('spinbutton', { name: 'Dwell in seconds' }),
			within(group()).getByRole('slider', { name: 'Gap' }),
			within(group()).getByRole('spinbutton', { name: 'Gap in seconds' })
		];
		for (let i = 1; i < order.length; i++) expect(order[i - 1]).toAppearBefore(order[i]);
		// Step has no Speed slider; the Scroll tests find it by this name.
		expect(screen.queryByRole('slider', { name: 'Speed' })).toBeNull();
	});

	it('names the Scroll controls in order: Back, Restart, Pause, then Speed', () => {
		mount({ mode: 'scroll', playing: true });
		const buttons = within(group()).getAllByRole('button');
		const names = ['Back', 'Restart', 'Pause'];
		expect(buttons).toHaveLength(names.length);
		buttons.forEach((b, i) => expect(b).toHaveAccessibleName(names[i]));
		const order = [...names.map(button), within(group()).getByRole('slider', { name: 'Speed' })];
		for (let i = 1; i < order.length; i++) expect(order[i - 1]).toAppearBefore(order[i]);
		// Scroll has no Prev, Next or counter; the Step tests find each by these arguments.
		expect(screen.queryByRole('button', { name: 'Prev' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
		expect(screen.queryByText('1 / 2')).toBeNull();
	});

	it('swaps Play and Pause with their tooltip, and gives each icon button a tooltip of its name', async () => {
		const { rerender } = mount();
		expect(tip('Play')).toHaveAttribute('data-tip', 'Play');
		await rerender({ playing: true });
		expect(button('Pause')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
		expect(tip('Pause')).toHaveAttribute('data-tip', 'Pause');
		for (const name of ['Restart', 'Prev', 'Next']) {
			expect(tip(name)).toHaveAttribute('data-tip', name);
		}
		expect(tip('Back')).not.toHaveAttribute('data-tip');
	});

	it('calls back for each button', async () => {
		const callbacks = mount();
		const pairs = [
			['Back', callbacks.onBack],
			['Restart', callbacks.onRestart],
			['Prev', callbacks.onPrev],
			['Play', callbacks.onToggle],
			['Next', callbacks.onNext]
		] as const;
		for (const [name] of pairs) await fireEvent.click(button(name));
		for (const [, callback] of pairs) expect(callback).toHaveBeenCalledOnce();
	});

	it('holds each seconds slider and its field in a group named by its visible label, and reports a change', async () => {
		const { onDwell, onGap, set } = mount();
		const dwell = screen.getByRole('group', { name: 'Dwell' });
		expect(dwell).toContainElement(screen.getByRole('slider', { name: 'Dwell' }));
		expect(dwell).toContainElement(screen.getByRole('spinbutton', { name: 'Dwell in seconds' }));
		const gap = screen.getByRole('group', { name: 'Gap' });
		expect(gap).toContainElement(screen.getByRole('slider', { name: 'Gap' }));
		expect(gap).toContainElement(screen.getByRole('spinbutton', { name: 'Gap in seconds' }));
		await fireEvent.input(screen.getByRole('slider', { name: 'Dwell' }), {
			target: { value: '300' }
		});
		expect(onDwell).toHaveBeenLastCalledWith(300);
		expect(set.dwell).toHaveBeenLastCalledWith(300);
		await fireEvent.change(screen.getByRole('spinbutton', { name: 'Gap in seconds' }), {
			target: { value: '0.5' }
		});
		expect(onGap).toHaveBeenLastCalledWith(500);
		expect(set.gap).toHaveBeenLastCalledWith(500);
	});

	it('shows Speed by its visible label, with its value in px/s and in words, and reports a move', async () => {
		const { onSpeed, set } = mount({ mode: 'scroll' });
		const speed = screen.getByRole('slider', { name: 'Speed' });
		expect(screen.getByLabelText('Speed')).toBe(speed);
		expect(speed).toHaveAttribute('aria-valuetext', '60 pixels per second');
		expect(speed).toHaveAttribute('min', '10');
		expect(speed).toHaveAttribute('max', '5000');
		expect(speed).toHaveAttribute('step', '5');
		expect(screen.getByText('60 px/s')).toHaveAttribute('aria-hidden', 'true');
		await fireEvent.input(speed, { target: { value: '300' } });
		expect(onSpeed).toHaveBeenLastCalledWith(300);
		expect(set.speed).toHaveBeenLastCalledWith(300);
	});

	it('shows the position in the counter', async () => {
		const { rerender } = mount();
		expect(within(group()).getByText('1 / 2').textContent).toBe('1 / 2');
		await rerender({ position: { index: 1, count: 2 } });
		expect(within(group()).getByText('2 / 2').textContent).toBe('2 / 2');
	});

	it('fades when not visible, and stays focusable', async () => {
		const { rerender } = mount({ visible: false });
		expect(group()).not.toBeVisible();
		button('Back').focus();
		expect(button('Back')).toHaveFocus();
		await rerender({ visible: true });
		expect(group()).toBeVisible();
	});

	it('reports focus entering and leaving it', () => {
		const { onfocusin, onfocusout } = mount();
		button('Back').focus();
		expect(onfocusin).toHaveBeenCalledOnce();
		button('Back').blur();
		expect(onfocusout).toHaveBeenCalledOnce();
	});

	it('says whether a control in it has keyboard focus', () => {
		const { component } = mount();
		expect(component.hasKeyboardFocus()).toBe(false);
		screen.getByRole('slider', { name: 'Dwell' }).focus(); // matches :focus-visible in jsdom
		expect(component.hasKeyboardFocus()).toBe(true);
	});

	it('shows the keep-awake note only when given one, as its first line, in a named status region', async () => {
		const { rerender } = mount();
		expect(note().textContent).toBe('');
		expect(note()).not.toBeVisible();
		await rerender({ note: UNAVAILABLE });
		expect(note().textContent).toBe(UNAVAILABLE);
		expect(note()).toBeVisible();
		expect(note()).toAppearBefore(button('Back'));
		await rerender({ note: null });
		expect(note()).not.toBeVisible();
	});

	it('does not rewrite a note it has announced', async () => {
		const { rerender } = mount();
		await rerender({ note: UNAVAILABLE });
		const records: MutationRecord[] = [];
		const observer = new MutationObserver((batch) => records.push(...batch));
		observer.observe(note(), { childList: true, characterData: true, subtree: true });
		const seen = () => [...records, ...observer.takeRecords()];
		await rerender({ note: null });
		await rerender({ note: UNAVAILABLE });
		await tick();
		expect(seen()).toEqual([]);
		expect(note().textContent).toBe(UNAVAILABLE);
		await rerender({ note: REFUSED });
		await tick();
		expect(seen()).not.toEqual([]);
		expect(note().textContent).toBe(REFUSED);
		observer.disconnect();
	});
});

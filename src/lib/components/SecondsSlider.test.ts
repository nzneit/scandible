import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SecondsSlider from './SecondsSlider.svelte';
import { DWELL_RANGE, GAP_RANGE } from '$lib/types';

/** Render bound to a plain parent value: `set` records every write the slider makes. */
function mount(extra: Record<string, unknown> = {}, start = 1000) {
	let value = start;
	const set = vi.fn((v: number) => (value = v));
	const onchange = vi.fn();
	render(SecondsSlider, {
		props: {
			get value() {
				return value;
			},
			set value(v: number) {
				set(v);
			},
			range: DWELL_RANGE,
			label: 'Dwell',
			rangeAriaLabel: 'Dwell',
			rangeClass: 'dwell-input',
			secondsClass: 'dwell-seconds',
			onchange,
			...extra
		}
	});
	return { set, onchange };
}
const seconds = () => screen.getByRole('spinbutton', { name: 'Dwell in seconds' });
const slider = () => screen.getByRole('slider', { name: 'Dwell' });

describe('SecondsSlider', () => {
	it('shows the value in seconds on the field and the slider', () => {
		mount();
		expect(seconds()).toHaveDisplayValue('1.00');
		expect(seconds()).toHaveAttribute('inputmode', 'decimal');
		expect(seconds()).toHaveAttribute('step', '0.01');
		expect(seconds()).toHaveAttribute('min', '0.05');
		expect(seconds()).toHaveAttribute('max', '5');
		expect(slider()).toHaveValue('1000');
		expect(slider()).toHaveAttribute('aria-valuetext', '1.00 s');
	});

	it('stores a typed number snapped to the grid and clamped, and reports it', async () => {
		const { set, onchange } = mount();
		await fireEvent.change(seconds(), { target: { value: '0.404' } });
		expect(set).toHaveBeenLastCalledWith(400);
		expect(onchange).toHaveBeenLastCalledWith(400);
		expect(seconds()).toHaveDisplayValue('0.40');
		await fireEvent.change(seconds(), { target: { value: '9' } });
		expect(set).toHaveBeenLastCalledWith(5000);
		expect(onchange).toHaveBeenLastCalledWith(5000);
		expect(seconds()).toHaveDisplayValue('5.00');
	});

	it.each(['', 'abc', '0,5'])('ignores %j and shows the current value again', async (typed) => {
		const { set, onchange } = mount({}, 400);
		await fireEvent.change(seconds(), { target: { value: typed } });
		expect(set).not.toHaveBeenCalled();
		expect(onchange).not.toHaveBeenCalled();
		expect(seconds()).toHaveDisplayValue('0.40');
	});

	it('stores and reports a slider move', async () => {
		const { set, onchange } = mount();
		await fireEvent.input(slider(), { target: { value: '300' } });
		expect(set).toHaveBeenLastCalledWith(300);
		expect(onchange).toHaveBeenLastCalledWith(300);
	});

	it('names the seconds field after its label', () => {
		mount({ label: 'Gap', rangeAriaLabel: 'Gap', range: GAP_RANGE }, 0);
		expect(screen.getByRole('spinbutton', { name: 'Gap in seconds' })).toHaveDisplayValue('0.00');
		expect(screen.getByRole('slider', { name: 'Gap' })).toHaveAttribute('max', '2000');
	});

	it('names the slider only when asked', () => {
		mount({ rangeAriaLabel: undefined });
		const only = screen.getByRole('slider');
		expect(only).not.toHaveAttribute('aria-label');
		expect(only).toHaveAccessibleName('');
	});

	it.each([
		[
			undefined,
			['range', 'range-sm', 'w-32'],
			['input', 'input-sm', 'w-[4.5rem]', 'text-base-content']
		],
		['sm', ['range', 'range-sm', 'w-32'], ['input', 'input-sm', 'w-[4.5rem]', 'text-base-content']],
		[
			'lg',
			['range', 'range-lg', 'h-12', 'min-w-24', 'flex-1', 'md:w-40', 'md:flex-none'],
			['input', 'input-lg', 'w-20', 'text-base-content']
		]
	])(
		'size %s styles both inputs and keeps the passed classes',
		(size, rangeClasses, fieldClasses) => {
			mount({ size, rangeClass: 'ctl-dwell', secondsClass: 'ctl-dwell-seconds' });
			// fallback -- visual state: size and width classes, which jsdom does not render
			expect(slider()).toHaveClass(...rangeClasses, 'ctl-dwell');
			// fallback -- visual state: size and width classes, which jsdom does not render
			expect(seconds()).toHaveClass(...fieldClasses, 'ctl-dwell-seconds');
		}
	);

	it('puts the slider first, then one element holding the seconds field and its unit', () => {
		mount();
		expect(slider()).toAppearBefore(screen.getByText('s'));
		expect(screen.getByText('s')).toContainElement(seconds());
	});

	it.each([
		[undefined, 'gap-1'],
		['sm', 'gap-1'],
		['lg', 'gap-2']
	])('size %s sets the seconds field %s from its unit', (size, gap) => {
		mount({ size });
		// fallback -- visual state: the spacing class, which jsdom does not render
		expect(screen.getByText('s')).toHaveClass('seconds', gap);
	});
});

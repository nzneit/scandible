import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ValueSlider from './ValueSlider.svelte';

/** Render bound to a plain parent value: `set` records every write the slider makes. */
function mount(extra: Record<string, unknown> = {}) {
	let value = 8;
	const set = vi.fn((v: number) => (value = v));
	render(ValueSlider, {
		props: {
			label: 'Maximum rotation',
			get value() {
				return value;
			},
			set value(v: number) {
				set(v);
			},
			min: 1,
			max: 30,
			step: 1,
			text: (v: number) => `± ${v}°`,
			valuetext: (v: number) => `${v} degrees`,
			...extra
		}
	});
	return { set };
}
const slider = () => screen.getByRole('slider', { name: 'Maximum rotation' });

describe('ValueSlider', () => {
	it('is named by its visible label alone, though the value shows beside it', () => {
		mount();
		expect(screen.getByLabelText('Maximum rotation')).toBe(slider());
		expect(screen.getByText('± 8°')).toBeInTheDocument();
		expect(screen.getByText('± 8°')).toHaveAttribute('aria-hidden', 'true');
	});

	it('gives its range, its value and the value in words', () => {
		mount();
		expect(slider()).toHaveValue('8');
		expect(slider()).toHaveAttribute('min', '1');
		expect(slider()).toHaveAttribute('max', '30');
		expect(slider()).toHaveAttribute('step', '1');
		expect(slider()).toHaveAttribute('aria-valuetext', '8 degrees');
		expect(slider()).toBeEnabled();
	});

	it('writes a moved value back through the binding as a number', async () => {
		const { set } = mount();
		await fireEvent.input(slider(), { target: { value: '20' } });
		expect(set).toHaveBeenLastCalledWith(20);
	});

	it('can be disabled', () => {
		mount({ disabled: true });
		expect(slider()).toBeDisabled();
	});
});

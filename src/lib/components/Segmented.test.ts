import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import Segmented from './Segmented.svelte';

type Choice = 'text' | 'rows';

/** Render bound to a plain parent value; `accept` decides whether the parent takes a choice. */
function mount(accept: boolean) {
	let value: Choice = 'rows';
	const onchange = vi.fn((next: Choice) => {
		if (accept) value = next;
	});
	const { component } = render(Segmented<Choice>, {
		props: {
			name: 'editor',
			label: 'Editor',
			options: [
				{ value: 'text', text: 'Plain text' },
				{ value: 'rows', text: 'Per row' }
			],
			get value() {
				return value;
			},
			onchange
		}
	});
	return { onchange, component };
}
const radio = (name: string) => screen.getByRole('radio', { name });

describe('Segmented', () => {
	it('is a radio group named by its label, with one radio per option named by its text', () => {
		mount(true);
		const group = screen.getByRole('radiogroup', { name: 'Editor' });
		expect(within(group).getAllByRole('radio')).toEqual([radio('Plain text'), radio('Per row')]);
		expect(radio('Plain text')).toHaveAttribute('value', 'text');
		expect(radio('Per row')).toBeChecked();
		expect(radio('Plain text')).not.toBeChecked();
	});

	it('reports a choice, and keeps it when the parent takes it', async () => {
		const { onchange } = mount(true);
		await fireEvent.click(radio('Plain text'));
		expect(onchange).toHaveBeenCalledTimes(1);
		expect(onchange).toHaveBeenCalledWith('text');
		expect(radio('Plain text')).toBeChecked();
		expect(radio('Per row')).not.toBeChecked();
	});

	it('snaps back and focuses the checked radio when the parent refuses', async () => {
		const { onchange } = mount(false);
		await fireEvent.click(radio('Plain text'));
		expect(onchange).toHaveBeenCalledTimes(1);
		expect(onchange).toHaveBeenCalledWith('text');
		expect(radio('Per row')).toBeChecked();
		expect(radio('Plain text')).not.toBeChecked();
		expect(radio('Per row')).toHaveFocus();
	});

	it('focuses the checked radio through focus()', () => {
		const { component } = mount(true);
		component.focus();
		expect(radio('Per row')).toHaveFocus();
	});
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import FormatSelect from './FormatSelect.svelte';
import { FORMAT_GROUPS, type FormatId } from '$lib/formats';

/** Render bound to a plain parent value: `set` records every write the select makes. */
function mount(extra: Record<string, unknown> = {}, start: FormatId = 'qr') {
	let value = start;
	const set = vi.fn((v: FormatId) => (value = v));
	render(FormatSelect, {
		props: {
			get value() {
				return value;
			},
			set value(v: FormatId) {
				set(v);
			},
			class: 'row-format',
			...extra
		}
	});
	return { set };
}

describe('FormatSelect', () => {
	it('renders a native select', () => {
		mount();
		expect(screen.getByRole('combobox')).toBeInstanceOf(HTMLSelectElement);
	});

	it('lists the 8 groups and every format in FORMAT_GROUPS order', () => {
		mount();
		const select = screen.getByRole('combobox');
		const groups = within(select).getAllByRole('group');
		expect(groups).toHaveLength(8);
		expect(groups.map((g) => g.getAttribute('label'))).toEqual(FORMAT_GROUPS.map((g) => g.group));
		const options = within(select).getAllByRole('option');
		const formats = FORMAT_GROUPS.flatMap((g) => g.formats);
		expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual(formats.map((f) => f.id));
		expect(options.map((o) => o.textContent)).toEqual(formats.map((f) => f.label));
	});

	it('reads and writes the bound FormatId', async () => {
		const { set } = mount();
		expect(screen.getByRole('combobox')).toHaveValue('qr');
		await fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pdf417' } });
		expect(set).toHaveBeenLastCalledWith('pdf417');
	});

	it('carries the class and the aria-label', () => {
		mount({ 'aria-label': 'Format of code 2' });
		const select = screen.getByRole('combobox', { name: 'Format of code 2' });
		// fallback -- visual state: the classes are the unit's styling contract; no role or text shows them
		expect(select).toHaveClass('row-format', 'select', 'select-sm', 'w-auto');
	});

	it('has no aria-label unless given one', () => {
		mount();
		expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-label');
	});
});

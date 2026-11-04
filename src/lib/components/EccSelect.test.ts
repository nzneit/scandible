import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import EccSelect from './EccSelect.svelte';
import { FORMAT_BY_ID, type EccOption } from '$lib/formats';

const QR = FORMAT_BY_ID.get('qr')!.ecc!;
const AZTEC = FORMAT_BY_ID.get('aztec')!.ecc!;

/** Render bound to a plain parent value: `set` records every write the select makes. */
function mount(start: string, option: EccOption = QR, extra: Record<string, unknown> = {}) {
	let value = start;
	const set = vi.fn((v: string) => (value = v));
	const { unmount } = render(EccSelect, {
		props: {
			get value() {
				return value;
			},
			set value(v: string) {
				set(v);
			},
			option,
			class: 'row-ecc',
			...extra
		}
	});
	return { set, unmount };
}
const texts = () =>
	within(screen.getByRole('combobox'))
		.getAllByRole('option')
		.map((o) => o.textContent);

describe('EccSelect', () => {
	it("shows the default level for ''", () => {
		mount('');
		expect(screen.getByRole('combobox')).toHaveValue('M');
		expect(screen.getByRole('combobox')).toHaveDisplayValue('level M (~15% recovery, default)');
	});

	it("writes '' when the default is chosen", async () => {
		const { set } = mount('H');
		expect(screen.getByRole('combobox')).toHaveValue('H');
		await fireEvent.change(screen.getByRole('combobox'), { target: { value: 'M' } });
		expect(set).toHaveBeenLastCalledWith('');
	});

	it('writes any other level as chosen', async () => {
		const { set } = mount('');
		await fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Q' } });
		expect(set).toHaveBeenLastCalledWith('Q');
	});

	it('writes label (note), or the label alone', () => {
		const { unmount } = mount('');
		expect(texts()).toEqual([
			'level L (~7% recovery)',
			'level M (~15% recovery, default)',
			'level Q (~25% recovery)',
			'level H (~30% recovery)'
		]);
		unmount();
		mount('', AZTEC);
		expect(texts()).toEqual([
			'≥10% error correction',
			'≥23% error correction (default)',
			'≥36% error correction',
			'≥50% error correction'
		]);
	});

	it('carries the class and the aria-label', () => {
		mount('', AZTEC, { 'aria-label': 'Error correction of code 2' });
		const select = screen.getByRole('combobox', { name: 'Error correction of code 2' });
		// fallback -- visual state: the classes are the unit's styling contract; no role or text shows them
		expect(select).toHaveClass('row-ecc', 'select', 'select-sm', 'w-auto');
	});
});

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import RowEditor from './RowEditor.svelte';
import { DENSE_HINT, GS1_HINT, LAX_NOTE, SCAN_HINT } from '$lib/verdict';
import type { FormatId } from '$lib/formats';
import type { Row } from '$lib/rows';

/** Rows in the spec's record form, `format[-level][-lax]_payload`, tokens in either order; the
 *  payload is everything after the first `_`. */
const deck = (...records: string[]): Row[] =>
	records.map((record) => {
		const tag = record.slice(0, record.indexOf('_'));
		const [format, ...tokens] = tag.split('-');
		return {
			payload: record.slice(tag.length + 1),
			format: format as FormatId,
			ecc: tokens.find((t) => t !== 'lax') ?? '',
			lax: tokens.includes('lax')
		};
	});
const ROW_HINT =
	'Each row is one code. Enter adds a line to the code. To enter many codes at once, use Plain text or upload a file.';
const X2000 = 'x'.repeat(2000);
const BREAKDOWN = /^Code \d+ breakdown: /; // the labelled summary, whose text varies
let c: HTMLElement;
/** Mount over deep-state rows, as the page binds them; the spec's default rows unless given. */
const mount = (
	initial = deck('upc_036000291452', 'qr-H_hello world', 'qr_'),
	newRowFormat: FormatId = 'datamatrix'
) => {
	const rows = $state(initial);
	c = render(RowEditor, {
		props: {
			get rows() {
				return rows;
			},
			newRowFormat
		}
	}).container;
};
/** Queries in the latest render: a test may mount more than once. */
const ui = () => within(c);
/** The raw textContent of the element in `scope` whose trimmed text is `text`. */
const exactText = (scope: HTMLElement, text: string) =>
	within(scope).getByText(text.trim()).textContent;
const rowItems = () => within(ui().getByRole('list', { name: 'Codes' })).getAllByRole('listitem');
/** Row k, counting from 1, as the old `at(k, …)` took it. */
const row = (k: number) => rowItems()[k - 1];
/** Each row's payload, in row order, read from its `Code k` textbox. */
const payloads = () =>
	rowItems().map(
		(_, i) => (ui().getByRole('textbox', { name: `Code ${i + 1}` }) as HTMLTextAreaElement).value
	);
const click = (el: HTMLElement) => fireEvent.click(el);
const change = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
/** After a tick, the element that `get` finds has focus. It is found after the tick, because a move renames buttons. */
const focusIs = async (get: () => HTMLElement) => {
	await tick();
	expect(get()).toHaveFocus();
};

describe('RowEditor', () => {
	it('numbers the rows from 1, and shows the row hint with rows and without', () => {
		mount();
		expect(rowItems().map((item, i) => exactText(item, String(i + 1)))).toEqual(['1', '2', '3']);
		expect(exactText(c, ROW_HINT)).toBe(ROW_HINT);
		mount([]);
		expect(exactText(c, ROW_HINT)).toBe(ROW_HINT);
	});

	it('labels each payload and format control with its code number', () => {
		mount();
		expect(payloads()).toEqual(['036000291452', 'hello world', '']);
		expect(
			rowItems().map((item) => within(item).getByRole('textbox').getAttribute('aria-label'))
		).toEqual(['Code 1', 'Code 2', 'Code 3']);
		// Rows 2 and 3 also hold a level select, so each row's format select is found by its name.
		const formats = rowItems().map((item, i) =>
			within(item).getByRole('combobox', { name: `Format of code ${i + 1}` })
		);
		expect(formats.map((select) => (select as HTMLSelectElement).value)).toEqual([
			'upc',
			'qr',
			'qr'
		]);
		expect(formats.map((select) => select.getAttribute('aria-label'))).toEqual([
			'Format of code 1',
			'Format of code 2',
			'Format of code 3'
		]);
		expect(
			formats.map((select) => [
				within(select).getAllByRole('group').length,
				within(select).getAllByRole('option').length
			])
		).toEqual([
			[8, 36],
			[8, 36],
			[8, 36]
		]);
	});

	it('holds each row in a group named "Code n" inside its list item', () => {
		mount();
		const groups = rowItems().map((item, i) =>
			within(item).getByRole('group', { name: `Code ${i + 1}` })
		);
		expect(groups).toHaveLength(3);
	});

	it('lays a row out as number, payload and buttons, then its settings, then its verdict', () => {
		mount();
		const code = within(ui().getByRole('group', { name: 'Code 2' }));
		const parts = [
			code.getByText('2'),
			code.getByRole('textbox', { name: 'Code 2' }),
			code.getByRole('button', { name: 'Move up, code 2' }),
			code.getByRole('button', { name: 'Move down, code 2' }),
			code.getByRole('button', { name: 'Delete code 2' }),
			code.getByRole('combobox', { name: 'Format of code 2' }),
			code.getByRole('combobox', { name: 'Error correction of code 2' }),
			code.getByText('✓ · 25×25 modules · 11 bytes')
		];
		for (let i = 1; i < parts.length; i++) expect(parts[i - 1]).toAppearBefore(parts[i]);
	});

	it('keeps the icon buttons named, with a tooltip of the action', () => {
		mount();
		expect(ui().getByRole('button', { name: 'Move up, code 2' })).toHaveAccessibleDescription(
			'Move up'
		);
		expect(ui().getByRole('button', { name: 'Move down, code 2' })).toHaveAccessibleDescription(
			'Move down'
		);
		expect(ui().getByRole('button', { name: 'Delete code 2' })).toHaveAccessibleDescription(
			'Delete'
		);
	});

	it('describes each payload by the verdict in its own row', () => {
		mount();
		expect(ui().getByRole('textbox', { name: 'Code 1' })).toHaveAccessibleDescription('✓');
		expect(ui().getByRole('textbox', { name: 'Code 2' })).toHaveAccessibleDescription(
			'✓ · 25×25 modules · 11 bytes'
		);
		expect(ui().getByRole('textbox', { name: 'Code 3' })).toHaveAccessibleDescription(
			'skipped (empty)'
		);
	});

	it('shows a level select only for formats with levels', () => {
		mount();
		expect(within(row(1)).getAllByRole('combobox')).toHaveLength(1);
		expect(ui().getByRole('combobox', { name: 'Error correction of code 2' })).toHaveValue('H');
		expect(ui().getByRole('combobox', { name: 'Error correction of code 3' })).toHaveValue('M');
		expect(
			within(row(2)).getByRole('combobox', { name: 'Error correction of code 2' })
		).toBeInTheDocument();
		expect(
			within(row(3)).getByRole('combobox', { name: 'Error correction of code 3' })
		).toBeInTheDocument();
		expect(ui().getAllByRole('combobox')).toHaveLength(5); // 3 format selects and these 2 only
	});

	it('adds a row at newRowFormat and focuses its payload', async () => {
		mount();
		await fireEvent.click(ui().getByRole('button', { name: 'Add code' }));
		expect(rowItems()).toHaveLength(4);
		expect(ui().getByRole('textbox', { name: 'Code 4' })).toHaveValue('');
		expect(ui().getByRole('combobox', { name: 'Format of code 4' })).toHaveValue('datamatrix');
		await focusIs(() => ui().getByRole('textbox', { name: 'Code 4' }));
	});

	it('opens a row added under a format with levels at its default level', async () => {
		mount(undefined, 'qr');
		await fireEvent.click(ui().getByRole('button', { name: 'Add code' }));
		expect(ui().getByRole('combobox', { name: 'Format of code 4' })).toHaveValue('qr');
		expect(ui().getByRole('combobox', { name: 'Error correction of code 4' })).toHaveValue('M');
	});

	it("deletes a row, focusing the next row's payload, or Add code after the last", async () => {
		mount();
		await click(ui().getByRole('button', { name: 'Delete code 2' }));
		expect(payloads()).toEqual(['036000291452', '']);
		await focusIs(() => ui().getByRole('textbox', { name: 'Code 2' }));
		await click(ui().getByRole('button', { name: 'Delete code 2' }));
		await focusIs(() => ui().getByRole('button', { name: 'Add code' }));
	});

	it('moves a row down and back, keeping focus in the moved row', async () => {
		mount();
		expect(ui().getByRole('button', { name: 'Move up, code 1' })).toBeDisabled();
		expect(ui().getByRole('button', { name: 'Move down, code 3' })).toBeDisabled();
		await click(ui().getByRole('button', { name: 'Move down, code 1' }));
		expect(payloads()).toEqual(['hello world', '036000291452', '']);
		expect(rowItems().map((item, i) => exactText(item, String(i + 1)))).toEqual(['1', '2', '3']);
		await focusIs(() => ui().getByRole('button', { name: 'Move down, code 2' }));
		await click(ui().getByRole('button', { name: 'Move up, code 2' }));
		expect(payloads()).toEqual(['036000291452', 'hello world', '']);
		await click(ui().getByRole('button', { name: 'Move down, code 2' }));
		expect(payloads()).toEqual(['036000291452', '', 'hello world']);
		await focusIs(() => ui().getByRole('button', { name: 'Move up, code 3' }));
		await click(ui().getByRole('button', { name: 'Move up, code 3' }));
		await focusIs(() => ui().getByRole('button', { name: 'Move up, code 2' }));
	});

	it('moves a row into the first place, focusing its Move down', async () => {
		mount();
		await click(ui().getByRole('button', { name: 'Move up, code 2' }));
		expect(payloads()).toEqual(['hello world', '036000291452', '']);
		await focusIs(() => ui().getByRole('button', { name: 'Move down, code 1' }));
		expect(
			within(row(1))
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label'))
		).toEqual(['Move up, code 1', 'Move down, code 1', 'Delete code 1']);
	});

	it("canonicalizes the level when a row's format changes", async () => {
		mount();
		await change(ui().getByRole('combobox', { name: 'Format of code 2' }), 'datamatrix');
		expect(
			within(row(2)).queryByRole('combobox', { name: 'Error correction of code 2' })
		).toBeNull();
		await change(ui().getByRole('combobox', { name: 'Format of code 2' }), 'qr');
		expect(ui().getByRole('combobox', { name: 'Error correction of code 2' })).toHaveValue('M');
	});

	it("shows each row's own verdict", () => {
		mount(deck('upc_036000291452', 'qr_hello world', 'qr_', 'upc_bad', 'qr-H_' + X2000));
		const V = [
			' ✓',
			' ✓ · 21×21 modules · 11 bytes',
			' skipped (empty)',
			' ✗ invalid',
			' ✗ too long for QR Code (level H)'
		];
		expect(rowItems().map((item, i) => exactText(item, V[i]))).toEqual(V);
		for (const [i, verdict] of V.entries()) {
			expect(ui().getByRole('textbox', { name: `Code ${i + 1}` })).toHaveAccessibleDescription(
				verdict.trim()
			);
		}
	});

	it('shows the dense hint only when a row is dense', () => {
		mount();
		expect(ui().queryByText(DENSE_HINT)).toBeNull();
		mount(deck('upc_036000291452', 'qr-H_hello world', 'qr_', 'qr-L_' + X2000));
		expect(ui().getByText(DENSE_HINT).textContent).toBe(DENSE_HINT);
	});

	const S = '(01)09501101530003(17)261231(10)LOT42';
	const BAD = '(01)09501101530004';

	it('shows Render if invalid for GS1 rows only, after the level select, bound to the row', async () => {
		const rows = $state(deck('upc_036000291452', `gs1128_${S}`, `gs1qr-H_${S}`));
		const current = () => rows;
		c = render(RowEditor, {
			props: {
				get rows() {
					return rows;
				},
				newRowFormat: 'upc'
			}
		}).container;
		expect(
			within(row(1)).queryByRole('checkbox', { name: 'Render if invalid, code 1' })
		).toBeNull();
		expect(ui().getByRole('checkbox', { name: 'Render if invalid, code 2' })).not.toBeChecked();
		expect(exactText(row(2), 'Render if invalid')!.trim()).toBe('Render if invalid');
		expect(within(row(2)).getByLabelText('Render if invalid')).toBe(
			ui().getByRole('checkbox', { name: 'Render if invalid, code 2' })
		);
		expect(
			ui()
				.getAllByRole('checkbox')
				.map((box) => box.getAttribute('aria-label'))
		).toEqual(['Render if invalid, code 2', 'Render if invalid, code 3']);
		await fireEvent.click(ui().getByRole('checkbox', { name: 'Render if invalid, code 2' }));
		expect(current()[1].lax).toBe(true);
		expect(ui().getByRole('checkbox', { name: 'Render if invalid, code 2' })).toBeChecked();
		const third = row(3);
		const controls = [
			within(third).getByRole('textbox', { name: 'Code 3' }),
			within(third).getByRole('button', { name: 'Move up, code 3' }),
			within(third).getByRole('button', { name: 'Move down, code 3' }),
			within(third).getByRole('button', { name: 'Delete code 3' }),
			within(third).getByRole('combobox', { name: 'Format of code 3' }),
			within(third).getByRole('combobox', { name: 'Error correction of code 3' }),
			within(third).getByRole('checkbox', { name: 'Render if invalid, code 3' })
		];
		for (let i = 1; i < controls.length; i++) expect(controls[i - 1]).toAppearBefore(controls[i]);
		expect(within(third).getAllByRole('textbox')).toHaveLength(1);
		expect(within(third).getAllByRole('combobox')).toHaveLength(2);
		expect(within(third).getAllByRole('checkbox')).toHaveLength(1);
		expect(within(third).getAllByRole('button')).toHaveLength(3);
	});

	it('clears the flag when a row leaves GS1, and Add code starts a row with it off', async () => {
		let rows = $state(deck(`gs1128-lax_${BAD}`));
		const current = () => rows;
		c = render(RowEditor, {
			props: {
				get rows() {
					return rows;
				},
				set rows(next: Row[]) {
					rows = next;
				},
				newRowFormat: 'gs1128'
			}
		}).container;
		expect(ui().getByRole('checkbox', { name: 'Render if invalid, code 1' })).toBeChecked();
		await change(ui().getByRole('combobox', { name: 'Format of code 1' }), 'upc');
		expect(
			within(row(1)).queryByRole('checkbox', { name: 'Render if invalid, code 1' })
		).toBeNull();
		expect(current()[0].lax).toBe(false);
		await change(ui().getByRole('combobox', { name: 'Format of code 1' }), 'gs1128');
		expect(ui().getByRole('checkbox', { name: 'Render if invalid, code 1' })).not.toBeChecked();
		await fireEvent.click(ui().getByRole('button', { name: 'Add code' }));
		expect(current()[1]).toEqual({ payload: '', format: 'gs1128', ecc: '', lax: false });
	});

	it('shows the rendered-anyway verdict for a lax row that fails lint', () => {
		mount(deck(`gs1128-lax_${BAD}`, `gs1128_${BAD}`, `gs1128_${S}`));
		const V = [
			' ⚠ rendered anyway · (01) GTIN: Bad checksum · 134 modules wide · 16 characters → ]C1 0109501101530004',
			' ✗ (01) GTIN: Bad checksum',
			' ✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42'
		];
		expect(rowItems().map((item, i) => exactText(item, V[i]))).toEqual(V);
		for (const [i, verdict] of V.entries()) {
			expect(ui().getByRole('textbox', { name: `Code ${i + 1}` })).toHaveAccessibleDescription(
				verdict.trim()
			);
		}
	});

	it('puts each hint in a disclosure after Add code, with its summary phrase', () => {
		mount(deck(`gs1128_${S}`, 'qr-L_' + X2000), 'upc');
		const parts = [
			ui().getByRole('button', { name: 'Add code' }),
			ui().getByText('How rows work'),
			ui().getByText('How to write GS1 data'),
			ui().getByText('What can never be rendered anyway'),
			ui().getByText('What the arrow and GS mark mean'),
			ui().getByText("If dense codes don't scan")
		];
		for (let i = 1; i < parts.length; i++) expect(parts[i - 1]).toAppearBefore(parts[i]);
	});

	it('shows the GS1 hint and lax note for a GS1 row or new-row format, and the scan hint for a GS1 entry', () => {
		mount();
		expect(
			ui()
				.getAllByRole('paragraph')
				.map((p) => p.textContent)
		).toEqual([ROW_HINT]);
		mount(deck('upc_036000291452'), 'gs1128');
		expect(ui().getByText(GS1_HINT).textContent).toBe(GS1_HINT);
		expect(ui().getByText(LAX_NOTE).textContent).toBe(LAX_NOTE);
		expect(
			ui()
				.getAllByRole('paragraph')
				.map((p) => p.textContent)
		).toEqual([ROW_HINT, GS1_HINT, LAX_NOTE]);
		mount(deck('gs1128_'), 'upc');
		expect(
			ui()
				.getAllByRole('paragraph')
				.map((p) => p.textContent)
		).toEqual([ROW_HINT, GS1_HINT, LAX_NOTE]);
		mount(deck(`gs1128_${S}`, 'qr-L_' + X2000), 'upc');
		expect(ui().getByText(SCAN_HINT).textContent).toBe(SCAN_HINT);
		expect(
			ui()
				.getAllByRole('paragraph')
				.map((p) => p.textContent)
		).toEqual([ROW_HINT, GS1_HINT, LAX_NOTE, SCAN_HINT, DENSE_HINT]);
	});
});

describe('RowEditor GS1 breakdown', () => {
	const S = '(01)09501101530003(17)261231(10)LOT42';
	beforeEach(() => vi.setSystemTime(new Date(2026, 10, 3, 12)));
	afterEach(() => vi.useRealTimers());

	it('puts a labelled breakdown after the controls of each GS1 row only', () => {
		mount(deck(`gs1128_${S}`, 'upc_036000291452', 'gs1qr_]C1010950110153000310LOT42<GS>17261231'));
		expect(ui().getAllByLabelText(BREAKDOWN)).toHaveLength(2);
		expect(
			within(row(1)).getByLabelText('Code 1 breakdown: 3 Application Identifiers')
		).toBeInTheDocument();
		expect(
			within(row(3)).getByLabelText('Code 3 breakdown: 3 Application Identifiers')
		).toBeInTheDocument();
		expect(within(row(2)).queryByLabelText(BREAKDOWN)).toBeNull();
		const code = within(ui().getByRole('group', { name: 'Code 1' }));
		const verdict = code.getByText(
			'✓ · 255 modules wide · 31 characters → ]C1 01095011015300031726123110LOT42'
		);
		expect(within(verdict).queryByLabelText(BREAKDOWN)).toBeNull();
		const breakdown = code.getByLabelText('Code 1 breakdown: 3 Application Identifiers');
		expect(code.getByRole('button', { name: 'Delete code 1' })).toAppearBefore(breakdown);
		expect(code.getByRole('combobox', { name: 'Format of code 1' })).toAppearBefore(breakdown);
		expect(verdict).toAppearBefore(breakdown);
	});

	it('keeps the same details element, still open, while the payload is edited', async () => {
		mount(deck(`gs1128_${S}`));
		const summary = ui().getByLabelText('Code 1 breakdown: 3 Application Identifiers');
		await fireEvent.click(summary);
		await fireEvent.input(ui().getByRole('textbox', { name: 'Code 1' }), {
			target: { value: '(01)09501101530003' }
		});
		await tick();
		expect(ui().getByLabelText('Code 1 breakdown: 1 Application Identifier')).toBe(summary);
		expect(ui().getByRole('cell', { name: 'GTIN' })).toBeVisible();
		expect(summary.textContent).toBe('1 Application Identifier');
	});
});

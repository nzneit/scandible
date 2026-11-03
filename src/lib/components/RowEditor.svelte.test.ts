import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import RowEditor from './RowEditor.svelte';
import { DENSE_HINT } from '$lib/verdict';
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
let c: HTMLElement;
/** Mount over deep-state rows, as the page binds them; the spec's default rows unless given. */
const mount = (
	initial = deck('upc_036000291452', 'qr-H_hello world', 'qr_'),
	newRowFormat: FormatId = 'datamatrix'
) => {
	const rows = $state(initial);
	c = render(RowEditor, { props: { rows, newRowFormat } }).container;
};
const all = (sel: string) => [...c.querySelectorAll<HTMLInputElement>(sel)];
const at = (k: number, sel: string) =>
	c.querySelectorAll('li.row')[k - 1]?.querySelector<HTMLInputElement>(sel) ?? null;
const values = (sel: string) => all(sel).map((el) => el.value);
const labels = (sel: string) => all(sel).map((el) => el.getAttribute('aria-label'));
const texts = (sel: string) => all(sel).map((el) => el.textContent);
const click = (k: number, sel: string) => fireEvent.click(at(k, sel)!);
const change = (k: number, sel: string, value: string) =>
	fireEvent.change(at(k, sel)!, { target: { value } });
/** After a tick, focus is on row k's control, or on the editor's own `sel` when k is 0. */
const focusIs = async (k: number, sel: string) => {
	await tick();
	expect(document.activeElement).toBe(k === 0 ? c.querySelector(sel) : at(k, sel));
};

describe('RowEditor', () => {
	it('numbers the rows from 1, and shows the row hint with rows and without', () => {
		mount();
		expect(texts('.row-number')).toEqual(['1', '2', '3']);
		expect(c.querySelector('.row-hint')!.textContent).toBe(ROW_HINT);
		mount([]);
		expect(c.querySelector('.row-hint')!.textContent).toBe(ROW_HINT);
	});

	it('labels each payload and format control with its code number', () => {
		mount();
		expect(values('.row-payload')).toEqual(['036000291452', 'hello world', '']);
		expect(labels('.row-payload')).toEqual(['Code 1', 'Code 2', 'Code 3']);
		expect(values('.row-format')).toEqual(['upc', 'qr', 'qr']);
		expect(labels('.row-format')).toEqual([
			'Format of code 1',
			'Format of code 2',
			'Format of code 3'
		]);
		expect(
			all('.row-format').map((el) => [
				el.querySelectorAll('optgroup').length,
				el.querySelectorAll('option').length
			])
		).toEqual([
			[8, 36],
			[8, 36],
			[8, 36]
		]);
	});

	it('describes each payload by the verdict in its own row', () => {
		mount();
		for (const k of [1, 2, 3]) {
			expect(
				document.getElementById(at(k, '.row-payload')!.getAttribute('aria-describedby')!)
			).toBe(at(k, '.row-verdict'));
		}
	});

	it('shows a level select only for formats with levels', () => {
		mount();
		expect(at(1, '.row-ecc')).toBeNull();
		expect(at(2, '.row-ecc')!.value).toBe('H');
		expect(at(3, '.row-ecc')!.value).toBe('M');
		expect(labels('.row-ecc')).toEqual([
			'Error correction of code 2',
			'Error correction of code 3'
		]);
	});

	it('adds a row at newRowFormat and focuses its payload', async () => {
		mount();
		await fireEvent.click(c.querySelector('.row-add')!);
		expect(c.querySelectorAll('li.row').length).toBe(4);
		expect(at(4, '.row-payload')!.value).toBe('');
		expect(at(4, '.row-format')!.value).toBe('datamatrix');
		await focusIs(4, '.row-payload');
	});

	it('opens a row added under a format with levels at its default level', async () => {
		mount(undefined, 'qr');
		await fireEvent.click(c.querySelector('.row-add')!);
		expect(at(4, '.row-format')!.value).toBe('qr');
		expect(at(4, '.row-ecc')!.value).toBe('M');
	});

	it("deletes a row, focusing the next row's payload, or Add code after the last", async () => {
		mount();
		await click(2, '.row-delete');
		expect(values('.row-payload')).toEqual(['036000291452', '']);
		await focusIs(2, '.row-payload');
		await click(2, '.row-delete');
		await focusIs(0, '.row-add');
	});

	it('moves a row down and back, keeping focus in the moved row', async () => {
		mount();
		expect(at(1, '.row-up')!.disabled).toBe(true);
		expect(at(3, '.row-down')!.disabled).toBe(true);
		await click(1, '.row-down');
		expect(values('.row-payload')).toEqual(['hello world', '036000291452', '']);
		expect(texts('.row-number')).toEqual(['1', '2', '3']);
		await focusIs(2, '.row-down');
		await click(2, '.row-up');
		expect(values('.row-payload')).toEqual(['036000291452', 'hello world', '']);
		await click(2, '.row-down');
		expect(values('.row-payload')).toEqual(['036000291452', '', 'hello world']);
		await focusIs(3, '.row-up');
		await click(3, '.row-up');
		await focusIs(2, '.row-up');
	});

	it('moves a row into the first place, focusing its Move down', async () => {
		mount();
		await click(2, '.row-up');
		expect(values('.row-payload')).toEqual(['hello world', '036000291452', '']);
		await focusIs(1, '.row-down');
		expect(
			['.row-up', '.row-down', '.row-delete'].map((sel) => at(1, sel)!.getAttribute('aria-label'))
		).toEqual(['Move up, code 1', 'Move down, code 1', 'Delete code 1']);
	});

	it("canonicalizes the level when a row's format changes", async () => {
		mount();
		await change(2, '.row-format', 'datamatrix');
		expect(at(2, '.row-ecc')).toBeNull();
		await change(2, '.row-format', 'qr');
		expect(at(2, '.row-ecc')!.value).toBe('M');
	});

	it("shows each row's own verdict, with its class", () => {
		mount(deck('upc_036000291452', 'qr_hello world', 'qr_', 'upc_bad', 'qr-H_' + X2000));
		expect(texts('.row-verdict')).toEqual([
			' ✓',
			' ✓ · 21×21 modules · 11 bytes',
			' skipped (empty)',
			' ✗ invalid',
			' ✗ too long for QR Code (level H)'
		]);
		expect(
			all('.row-verdict').map((el) =>
				[...el.classList].filter((name) => name === 'valid' || name === 'invalid')
			)
		).toEqual([['valid'], ['valid'], [], ['invalid'], ['invalid']]);
	});

	it('shows the dense hint only when a row is dense', () => {
		mount();
		expect(c.querySelector('.dense-hint')).toBeNull();
		mount(deck('upc_036000291452', 'qr-H_hello world', 'qr_', 'qr-L_' + X2000));
		expect(c.querySelector('.dense-hint')!.textContent).toBe(DENSE_HINT);
	});
});

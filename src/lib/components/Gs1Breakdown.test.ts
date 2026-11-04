import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Gs1Breakdown from './Gs1Breakdown.svelte';

const T = new Date(2026, 10, 3);
const GS = '\u001d';
const BREAKDOWN = /^Code \d+ breakdown: /; // the labelled summary, whose text varies
const HEADER = 'Application Identifier Name Value'; // the header row's computed name
const show = (props: { data: string; label?: string; today?: Date }) => {
	render(Gs1Breakdown, props);
};
/** The table's body rows: every row but the header row. */
const bodyRows = () => {
	const header = screen.getByRole('row', { name: HEADER });
	return screen.getAllByRole('row').filter((row) => row !== header);
};
/** Each body row as its cells' text: the row header, if any, then the data cells. */
const rows = () =>
	bodyRows().map((row) =>
		[...within(row).queryAllByRole('rowheader'), ...within(row).getAllByRole('cell')].map(
			(cell) => cell.textContent
		)
	);

describe('Gs1Breakdown', () => {
	it('shows a closed disclosure with one row per AI', () => {
		show({ data: `010950110153000310LOT42${GS}17261231`, today: T });
		expect(screen.getByRole('cell', { name: 'GTIN' })).not.toBeVisible();
		const summary = screen.getByText('3 Application Identifiers');
		expect(summary.textContent).toBe('3 Application Identifiers');
		expect(summary).toHaveAccessibleName('3 Application Identifiers');
		expect(rows()).toEqual([
			['(01)', 'GTIN', '09501101530003'],
			['(10)', 'BATCH/LOT', 'LOT42'],
			['(17)', 'USE BY or EXPIRY', '2026-12-31']
		]);
		for (const row of bodyRows()) {
			const header = within(row).getByRole('rowheader');
			expect(header).toBeInTheDocument();
			expect(header).toAppearBefore(within(row).getAllByRole('cell')[0]);
		}
		expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
			'Application Identifier',
			'Name',
			'Value'
		]);
		// The breakdown renders no paragraph, so this file has no element to pair this absence check
		// with. The paragraph role does resolve for <p>: the setup page's tests find the switch
		// note's paragraph.
		expect(screen.queryByRole('paragraph')).toBeNull();
	});

	it('prefixes the accessible name with the label', () => {
		show({
			data: `010950110153000310LOT42${GS}17261231`,
			label: 'Code 3 breakdown',
			today: T
		});
		const summary = screen.getByLabelText('Code 3 breakdown: 3 Application Identifiers');
		expect(summary).toBeInTheDocument();
		expect(summary.textContent).toBe('3 Application Identifiers');
	});

	it('uses the singular for one AI', () => {
		show({ data: '0109501101530003', today: T });
		expect(screen.getByText('1 Application Identifier').textContent).toBe(
			'1 Application Identifier'
		);
	});

	it('ends with a stop row after the lines', () => {
		show({ data: '01095011015300039Z', today: T });
		expect(screen.getByText('1 Application Identifier, then reading stops').textContent).toBe(
			'1 Application Identifier, then reading stops'
		);
		const last = screen.getAllByRole('row').at(-1)!;
		expect(within(last).getAllByRole('cell')).toHaveLength(1);
		expect(within(last).queryByRole('rowheader')).toBeNull();
		expect(within(last).getByRole('cell')).toHaveAttribute('colspan', '3');
		expect(last.textContent).toBe(
			'⚠ Reading stops here: No GS1 Application Identifier starts at "9Z" after (01). A receiving system may stop here too.'
		);
	});

	it('shows only the stop row when nothing reads', () => {
		show({ data: '(01)0950110153000(', today: T });
		expect(screen.getByText('No readable Application Identifiers').textContent).toBe(
			'No readable Application Identifiers'
		);
		expect(bodyRows()).toHaveLength(1);
		expect(bodyRows()[0]).toHaveTextContent(
			'The bracketed string could not be split into Application Identifiers'
		);
	});

	it.each([
		`010950110153000310LOT42${GS}17261231`,
		'0109501101530003',
		'01095011015300039Z',
		'(01)0950110153000(',
		'09501101530003',
		'0109501101530003(10)LOT42',
		'8110106141416543213500110000310123196000'
	])('never shows a bare "AI" for %j', (data) => {
		show({ data, label: 'Code 1 breakdown', today: T });
		expect(screen.getByRole('group')).not.toHaveTextContent(/\bAIs?(?![A-Za-z])/);
		expect(screen.getByLabelText(BREAKDOWN)).not.toHaveAccessibleName(/\bAIs?(?![A-Za-z])/);
	});

	it('shows a dash for an untitled AI', () => {
		show({ data: '8110106141416543213500110000310123196000', today: T });
		expect(rows()[0][1]).toBe('—');
	});
});

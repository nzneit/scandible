import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Gs1Breakdown from './Gs1Breakdown.svelte';

const T = new Date(2026, 10, 3);
const GS = '\u001d';
const show = (props: { data: string; label?: string; today?: Date }) =>
	render(Gs1Breakdown, props).container;
const rows = (c: HTMLElement) =>
	[...c.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => x.textContent));

describe('Gs1Breakdown', () => {
	it('shows a closed disclosure with one row per AI', () => {
		const c = show({ data: `010950110153000310LOT42${GS}17261231`, today: T });
		expect(c.querySelector('details')!.open).toBe(false);
		const summary = c.querySelector('summary')!;
		expect(summary.textContent).toBe('3 Application Identifiers');
		expect(summary.hasAttribute('aria-label')).toBe(false);
		expect(rows(c)).toEqual([
			['(01)', 'GTIN', '09501101530003'],
			['(10)', 'BATCH/LOT', 'LOT42'],
			['(17)', 'USE BY or EXPIRY', '2026-12-31']
		]);
		for (const tr of c.querySelectorAll('tbody tr')) {
			expect(tr.children[0].tagName).toBe('TH');
			expect(tr.children[0].getAttribute('scope')).toBe('row');
		}
		const heads = [...c.querySelectorAll('thead th')];
		expect(heads.map((h) => h.querySelector('span.visually-hidden')?.textContent)).toEqual([
			'Application Identifier',
			'Name',
			'Value'
		]);
		expect(c.querySelector('p')).toBeNull();
	});

	it('prefixes the accessible name with the label', () => {
		const c = show({
			data: `010950110153000310LOT42${GS}17261231`,
			label: 'Code 3 breakdown',
			today: T
		});
		const summary = c.querySelector('summary')!;
		expect(summary.getAttribute('aria-label')).toBe('Code 3 breakdown: 3 Application Identifiers');
		expect(summary.textContent).toBe('3 Application Identifiers');
	});

	it('uses the singular for one AI', () => {
		expect(show({ data: '0109501101530003', today: T }).querySelector('summary')!.textContent).toBe(
			'1 Application Identifier'
		);
	});

	it('ends with a stop row after the lines', () => {
		const c = show({ data: '01095011015300039Z', today: T });
		expect(c.querySelector('summary')!.textContent).toBe(
			'1 Application Identifier, then reading stops'
		);
		const last = c.querySelector('tbody tr:last-child')!;
		expect(last.children.length).toBe(1);
		expect(last.children[0].tagName).toBe('TD');
		expect(last.children[0].getAttribute('colspan')).toBe('3');
		expect(last.textContent).toBe(
			'⚠ Reading stops here: No GS1 Application Identifier starts at "9Z" after (01). A receiving system may stop here too.'
		);
	});

	it('shows only the stop row when nothing reads', () => {
		const c = show({ data: '(01)0950110153000(', today: T });
		expect(c.querySelector('summary')!.textContent).toBe('No readable Application Identifiers');
		expect(c.querySelectorAll('tbody tr').length).toBe(1);
		expect(c.querySelector('tbody')!.textContent).toContain(
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
		const c = show({ data, label: 'Code 1 breakdown', today: T });
		expect(c.textContent).not.toMatch(/\bAIs?\b/);
		expect(c.querySelector('summary')!.getAttribute('aria-label')).not.toMatch(/\bAIs?\b/);
	});

	it('shows a dash for an untitled AI', () => {
		const c = show({ data: '8110106141416543213500110000310123196000', today: T });
		expect(rows(c)[0][1]).toBe('—');
	});
});

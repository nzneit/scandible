import { describe, it, expect } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import Field from './Field.svelte';

const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

describe('Field', () => {
	it('labels the control it wraps with its text', () => {
		render(Field, { label: 'Loop', children: html('<input type="checkbox" />') });
		expect(screen.getByLabelText('Loop')).toBe(screen.getByRole('checkbox', { name: 'Loop' }));
		expect(screen.getByText('Loop').tagName).toBe('LABEL');
	});

	it.each([
		['Editor', '<select><option>Plain text</option></select>', 'combobox', 'Editor'],
		['Speed', '<input type="range" />', 'slider', 'Speed'],
		['Dwell', '<input type="range" aria-label="Dwell" />', 'slider', 'Dwell'],
		[
			'Random rotation',
			'<span><input type="checkbox" aria-label="Random rotation" /><input type="range" aria-label="Maximum rotation" /></span>',
			'slider',
			'Maximum rotation'
		]
	])('keeps the name of a control in "%s"', (label, markup, role, name) => {
		render(Field, { label, children: html(markup) });
		expect(screen.getByRole(role, { name })).toBeInTheDocument();
	});

	it('adds the class beside its own', () => {
		render(Field, {
			label: 'Error correction',
			class: 'ecc-field',
			children: html('<select></select>')
		});
		// fallback -- visual state: the classes only lay out the label, which jsdom does not render
		expect(screen.getByText('Error correction')).toHaveClass(
			'field',
			'ecc-field',
			'flex',
			'flex-col',
			'items-start',
			'gap-1'
		);
	});
});

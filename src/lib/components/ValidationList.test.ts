import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ValidationList from './ValidationList.svelte';
import type { CodeEntry } from '$lib/types';

const entry = (raw: string, valid: boolean): CodeEntry => ({ raw, value: raw, valid });

describe('ValidationList', () => {
	it('renders one li per entry with valid/invalid classes and copy', () => {
		const { container } = render(ValidationList, {
			entries: [entry('036000291452', true), entry('bad', false)]
		});
		const items = container.querySelectorAll('.validation-list li');
		expect(items.length).toBe(2);
		expect(items[0].classList.contains('valid')).toBe(true);
		expect(items[0].textContent).toBe('036000291452 ✓');
		expect(items[1].classList.contains('invalid')).toBe(true);
		expect(items[1].textContent).toBe('bad ✗ invalid');
	});

	it('renders no items for an empty list', () => {
		const { container } = render(ValidationList, { entries: [] });
		expect(container.querySelectorAll('.validation-list li').length).toBe(0);
	});

	it('shows the exact arrow row when the encoder mutates the value', () => {
		const { container } = render(ValidationList, {
			entries: [
				{ raw: '590123412345', value: '590123412345', valid: true, encoded: '5901234123457' }
			]
		});
		expect(container.querySelector('.validation-list li')?.textContent).toBe(
			'590123412345 ✓ → 5901234123457'
		);
	});

	it('keeps entries without encoded arrow-free (undefined guard)', () => {
		const { container } = render(ValidationList, {
			entries: [{ raw: '036000291452', value: '036000291452', valid: true }]
		});
		expect(container.querySelector('.validation-list li')?.textContent).toBe('036000291452 ✓');
	});
});

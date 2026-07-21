import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ValidationList from './ValidationList.svelte';
import type { UpcEntry } from '$lib/types';

const entry = (raw: string, valid: boolean): UpcEntry => ({ raw, value: raw, valid });

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
});

import { describe, it, expect } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import Note from './Note.svelte';

const hello = createRawSnippet(() => ({ render: () => '<span>Hello</span>' }));

describe('Note', () => {
	it('renders one paragraph holding its children', () => {
		render(Note, { class: 'flash-note', children: hello });
		expect(screen.getByRole('paragraph').textContent).toBe('Hello');
	});

	it.each([
		[undefined, 'text-base-content/70'],
		['info', 'text-base-content/70'],
		['warning', 'text-warning'],
		['error', 'text-error']
	] as const)('tone %s colors the text with %s', (tone, color) => {
		render(Note, { tone, class: 'flash-note', children: hello });
		// fallback -- visual state: the tone is a text color, which jsdom does not render
		expect(screen.getByRole('paragraph')).toHaveClass(color, 'flash-note');
	});

	it('passes id, role, hidden and aria-* to the paragraph', () => {
		const { unmount } = render(Note, {
			class: 'qr-status mt-1',
			id: 'n1',
			role: 'status',
			'aria-label': 'QR code status',
			children: hello
		});
		const status = screen.getByRole('status', { name: 'QR code status' });
		expect(status).toHaveAttribute('id', 'n1');
		// fallback -- visual state: the call site's margin is a utility, which jsdom does not render
		expect(status).toHaveClass('qr-status', 'mt-1');
		unmount();

		render(Note, { class: 'file-error', tone: 'error', hidden: true, children: hello });
		expect(screen.getByText('Hello')).not.toBeVisible();
	});
});

import { describe, it, expect } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Hint from './Hint.svelte';

const TEXT = 'Each row is one code. Enter adds a line to the code.';
const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

function mount(extra: Record<string, unknown> = {}) {
	render(Hint, {
		props: { summary: 'How rows work', children: html(`<span>${TEXT}</span>`), ...extra }
	});
}

// jsdom does not hide a closed <details>, so these tests read the `open` attribute, never visibility.
describe('Hint', () => {
	it('starts closed, showing its summary phrase', () => {
		mount();
		expect(screen.getByText('How rows work')).toBeInTheDocument();
		expect(screen.getByRole('group')).not.toHaveAttribute('open');
	});

	it('opens and closes when its summary is clicked', async () => {
		mount();
		await fireEvent.click(screen.getByText('How rows work'));
		expect(screen.getByRole('group')).toHaveAttribute('open');
		await fireEvent.click(screen.getByText('How rows work'));
		expect(screen.getByRole('group')).not.toHaveAttribute('open');
	});

	it('holds the hint text whole in a paragraph that carries the id', () => {
		mount({ id: 'row-hint' });
		const paragraph = screen.getByRole('paragraph');
		expect(paragraph).toHaveAttribute('id', 'row-hint');
		expect(paragraph).toHaveTextContent(TEXT);
		expect(paragraph.textContent).toBe(TEXT);
	});
});

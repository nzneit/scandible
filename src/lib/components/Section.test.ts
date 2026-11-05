import { describe, it, expect } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen, within } from '@testing-library/svelte';
import Section from './Section.svelte';

const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

describe('Section', () => {
	it('is a region named by its visible level-2 heading, holding its content', () => {
		render(Section, { props: { title: 'Playback', children: html('<p>Body</p>') } });
		const region = screen.getByRole('region', { name: 'Playback' });
		expect(within(region).getByRole('heading', { level: 2, name: 'Playback' })).toBeInTheDocument();
		expect(within(region).getByText('Body')).toBeInTheDocument();
	});

	it('puts its actions after the heading and before the content', () => {
		render(Section, {
			props: {
				title: 'Codes',
				actions: html('<button type="button">Upload file</button>'),
				children: html('<p>Body</p>')
			}
		});
		const heading = screen.getByRole('heading', { name: 'Codes' });
		const button = screen.getByRole('button', { name: 'Upload file' });
		expect(heading).toAppearBefore(button);
		expect(button).toAppearBefore(screen.getByText('Body'));
	});

	it('lets a control be named by the heading through headingId', () => {
		render(Section, {
			props: {
				title: 'Codes',
				headingId: 'codes-heading',
				children: html('<textarea aria-labelledby="codes-heading"></textarea>')
			}
		});
		expect(screen.getByRole('textbox', { name: 'Codes' })).toBeInTheDocument();
	});
});

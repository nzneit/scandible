import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Icon from './Icon.svelte';

// fallback -- visual state: an icon is a drawing with no role, name or text; its markup is read
const markup = () => document.body.innerHTML;

describe('Icon', () => {
	it("draws one stroked path in a 16 px box by default, as the row editor's snippet did", () => {
		render(Icon, { props: { d: 'M6 6l12 12M18 6L6 18' } });
		expect(markup()).toContain(
			'<svg aria-hidden="true" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>'
		);
	});

	it('fills its shape when filled', () => {
		render(Icon, { props: { d: 'M7 4v16l13-8z', filled: true } });
		expect(markup()).toContain('fill="currentColor"');
		expect(markup()).not.toContain('fill="none"');
	});

	it('draws one path per entry, at the size class given', () => {
		render(Icon, { props: { d: ['M19 20 9 12l10-8z', 'M5 19V5'], class: 'size-[22px]' } });
		expect(markup()).toContain('class="size-[22px]"');
		expect(markup()).toContain('<path d="M19 20 9 12l10-8z"></path><path d="M5 19V5"></path>');
		expect(markup()).not.toContain('size-4');
	});
});

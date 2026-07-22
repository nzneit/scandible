import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PlayPage from './+page.svelte';
import { encodeShareUrl } from '$lib/shareUrl';
import { DEFAULT_SETTINGS } from '$lib/types';

const mockPage = vi.hoisted(() => ({ url: new URL('http://localhost/play') }));
const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => ({ page: mockPage }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ resolve: (id: string) => id }));

const q = <T extends Element>(c: Element, sel: string) => c.querySelector(sel) as T;
const CODES = ['036000291452', 'bad', '012345678905'];
const PLAY_URL = 'http://localhost/play?codes=036000291452%0Abad%0A012345678905&seed=7';

beforeEach(() => {
	mockPage.url = new URL(PLAY_URL);
	goto.mockReset();
});

describe('play page', () => {
	it('renders the scroll column and overlay controls, with no finish screen', () => {
		const { container } = render(PlayPage);
		expect(container.querySelectorAll('.barcode-item').length).toBe(4); // 2 valid × 2 copies
		expect(container.querySelector('.ctl-playpause')).not.toBeNull();
		expect(container.querySelector('.ctl-speed')).not.toBeNull();
		expect(container.querySelector('.finish-screen')).toBeNull();
	});

	it('toggles the play/pause label', async () => {
		const { container } = render(PlayPage);
		const btn = q<HTMLButtonElement>(container, '.ctl-playpause');
		expect(btn.textContent).toBe('Pause');
		await fireEvent.click(btn);
		expect(btn.textContent).toBe('Play');
		await fireEvent.click(btn);
		expect(btn.textContent).toBe('Pause');
	});

	it('navigates back to setup carrying the decoded state', async () => {
		const { container } = render(PlayPage);
		await fireEvent.click(q(container, '.ctl-back'));
		expect(goto).toHaveBeenCalledWith(
			'/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, seed: 7 })
		);
	});

	it('carries a mid-play speed edit back to setup', async () => {
		const { container } = render(PlayPage);
		await fireEvent.input(q(container, '.ctl-speed'), { target: { value: '300' } });
		await fireEvent.click(q(container, '.ctl-back'));
		expect(goto).toHaveBeenCalledWith(
			'/' + encodeShareUrl(CODES, { ...DEFAULT_SETTINGS, speedPxPerSec: 300, seed: 7 })
		);
	});

	it('redirects to setup when the URL has no valid codes', () => {
		mockPage.url = new URL('http://localhost/play?codes=bad');
		const { container } = render(PlayPage);
		expect(container.querySelector('.play')).toBeNull();
		expect(goto).toHaveBeenCalledWith('/?codes=bad', { replaceState: true });
	});

	it('decodes fmt and renders that format', () => {
		mockPage.url = new URL('http://localhost/play?codes=HELLO&fmt=code39&seed=7');
		const { container } = render(PlayPage);
		expect(container.querySelectorAll('.barcode-item').length).toBe(2); // 1 valid × 2 copies
	});

	it('carries fmt in the Back URL', async () => {
		mockPage.url = new URL('http://localhost/play?codes=HELLO&fmt=code39&seed=7');
		const { container } = render(PlayPage);
		await fireEvent.click(q(container, '.ctl-back'));
		expect(goto.mock.calls[0][0]).toContain('fmt=code39');
	});
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { init } from './hooks.client';

describe('hooks.client init', () => {
	beforeEach(() => {
		history.replaceState(null, '', '/');
	});

	it('percent-encodes a bare % in the fragment', async () => {
		history.replaceState(null, '', '/play#codes=50%');
		await init();
		expect(location.hash).toBe('#codes=50%25');
	});

	it('leaves a clean fragment unchanged', async () => {
		history.replaceState(null, '', '/play#codes=1&seed=0');
		await init();
		expect(location.hash).toBe('#codes=1&seed=0');
	});

	it('leaves a plain anchor untouched and does not call replaceState', async () => {
		history.replaceState(null, '', '/play#top');
		const spy = vi.spyOn(history, 'replaceState');
		try {
			await init();
			expect(location.hash).toBe('#top');
			expect(spy).not.toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});

	it('leaves a well-formed percent-encoded fragment untouched', async () => {
		history.replaceState(null, '', '/play#codes=a%20b');
		await init();
		expect(location.hash).toBe('#codes=a%20b');
	});
});

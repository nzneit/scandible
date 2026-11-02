import { beforeEach, describe, expect, it } from 'vitest';
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
});

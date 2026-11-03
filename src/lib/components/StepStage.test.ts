import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import StepStage from './StepStage.svelte';
import { DEFAULT_SETTINGS, type Settings, type CodeEntry } from '$lib/types';

const entry = (value: string, valid: boolean): CodeEntry => ({
	raw: value,
	value,
	format: 'upc',
	options: {},
	valid
});
const entries: CodeEntry[] = [
	entry('036000291452', true),
	entry('bad', false),
	entry('012345678905', true)
];
const settings: Settings = { ...DEFAULT_SETTINGS, mode: 'step' };

describe('StepStage', () => {
	it('mounts one code on the stage and opens paused', () => {
		const onIndex = vi.fn();
		const { container, component } = render(StepStage, { entries, settings, onIndex });
		expect(
			container.querySelectorAll('.step-stage-host > .step-stage > .barcode-item').length
		).toBe(1);
		expect(component.isPlaying()).toBe(false);
	});

	it('forwards toggle, next, prev, restart, setDwell and setGap to the stepper', () => {
		const onIndex = vi.fn();
		const { component } = render(StepStage, { entries, settings, onIndex });
		component.toggle();
		expect(component.isPlaying()).toBe(true);
		component.toggle();
		expect(component.isPlaying()).toBe(false);
		component.next();
		expect(onIndex).toHaveBeenLastCalledWith(1, 2);
		expect(() => {
			component.prev();
			component.setDwell(300);
			component.setGap(100);
			component.next();
		}).not.toThrow();
		component.restart();
		expect(onIndex).toHaveBeenLastCalledWith(0, 2);
	});

	it('cancels the pending frame on unmount after toggle()', () => {
		const onIndex = vi.fn();
		const spy = vi.spyOn(globalThis, 'cancelAnimationFrame');
		try {
			const { component, unmount } = render(StepStage, { entries, settings, onIndex });
			component.toggle();
			unmount();
			expect(spy).toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});
});

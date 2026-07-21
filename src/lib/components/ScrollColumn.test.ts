import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import ScrollColumn from './ScrollColumn.svelte';
import { DEFAULT_SETTINGS, type Settings, type UpcEntry } from '$lib/types';

const entry = (value: string, valid: boolean): UpcEntry => ({ raw: value, value, valid });
const entries: UpcEntry[] = [entry('036000291452', true), entry('bad', false), entry('012345678905', true)];
const SETTINGS: Settings = { ...DEFAULT_SETTINGS };

describe('ScrollColumn', () => {
  it('mounts the scroller (2 valid entries × 2 copies) and starts playing', () => {
    const { container, component } = render(ScrollColumn, { entries, settings: SETTINGS });
    expect(container.querySelectorAll('.barcode-item').length).toBe(4);
    expect(component.isPlaying()).toBe(true);
  });

  it('forwards toggle() to the scroller', () => {
    const { component } = render(ScrollColumn, { entries, settings: SETTINGS });
    expect(component.isPlaying()).toBe(true);
    component.toggle();
    expect(component.isPlaying()).toBe(false);
    component.toggle();
    expect(component.isPlaying()).toBe(true);
  });

  it('destroys the scroller on unmount (removes the resize listener)', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(ScrollColumn, { entries, settings: SETTINGS });
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });
});

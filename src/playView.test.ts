import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountPlayView, formatFinishMessage } from './playView';
import type { UpcEntry } from './types';

const entry = (value: string, valid: boolean): UpcEntry => ({ raw: value, value, valid });
const entries: UpcEntry[] = [entry('036000291452', true), entry('bad', false), entry('012345678905', true)];

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('formatFinishMessage', () => {
  it('formats the finish copy exactly', () => {
    expect(formatFinishMessage(3, 12.4)).toBe('Finished scrolling 3 barcodes in 12.4 seconds');
  });
});

describe('mountPlayView', () => {
  it('renders the scroller column and overlay controls, finish hidden', () => {
    mountPlayView(root, entries, { speedPxPerSec: 60, loop: false, rotate: false, rotateMaxDeg: 8, skew: false, skewMaxDeg: 8, seed: 0 }, () => {});
    expect(root.querySelectorAll('.barcode-item').length).toBe(4); // 2 valid × 2 copies
    expect(root.querySelector('.ctl-playpause')).not.toBeNull();
    expect(root.querySelector('.ctl-speed')).not.toBeNull();
    expect((root.querySelector('.finish-screen') as HTMLElement).hidden).toBe(true);
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    mountPlayView(root, entries, { speedPxPerSec: 60, loop: false, rotate: false, rotateMaxDeg: 8, skew: false, skewMaxDeg: 8, seed: 0 }, onBack);
    (root.querySelector('.ctl-back') as HTMLButtonElement).click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

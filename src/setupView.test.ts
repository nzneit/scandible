import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountSetupView } from './setupView';
import { readUpcFile } from './fileInput';

vi.mock('./fileInput', () => ({ readUpcFile: vi.fn() }));

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;

describe('mountSetupView', () => {
  it('prefills the textarea and settings from initial state', () => {
    mountSetupView(root, { codes: ['036000291452'], settings: { speedPxPerSec: 120, loop: true } }, () => {});
    expect(q<HTMLTextAreaElement>('.upc-input').value).toBe('036000291452');
    expect(q<HTMLInputElement>('.speed-input').value).toBe('120');
    expect(q<HTMLInputElement>('.loop-input').checked).toBe(true);
  });

  it('flags invalid entries and disables Start until there is a valid one', () => {
    mountSetupView(root, { codes: [], settings: {} }, () => {});
    const input = q<HTMLTextAreaElement>('.upc-input');
    const start = q<HTMLButtonElement>('.start');
    expect(start.disabled).toBe(true);

    input.value = 'bad';
    input.dispatchEvent(new Event('input'));
    expect(root.querySelectorAll('.validation-list li').length).toBe(1);
    expect(root.querySelector('.validation-list li')?.classList.contains('invalid')).toBe(true);
    expect(start.disabled).toBe(true);

    input.value = 'bad\n036000291452';
    input.dispatchEvent(new Event('input'));
    expect(start.disabled).toBe(false);
  });

  it('calls onStart with parsed entries and current settings', () => {
    const onStart = vi.fn();
    mountSetupView(root, { codes: ['036000291452'], settings: { speedPxPerSec: 60, loop: false } }, onStart);
    q<HTMLButtonElement>('.start').click();
    expect(onStart).toHaveBeenCalledTimes(1);
    const [entries, settings] = onStart.mock.calls[0];
    expect(entries).toHaveLength(1);
    expect(entries[0].valid).toBe(true);
    expect(settings).toEqual({ speedPxPerSec: 60, loop: false });
  });

  it('builds a share URL into .share-url on Copy link', () => {
    mountSetupView(root, { codes: ['036000291452'], settings: { speedPxPerSec: 60, loop: false } }, () => {});
    q<HTMLButtonElement>('.copy-link').click();
    expect(q<HTMLInputElement>('.share-url').value).toContain('codes=036000291452');
  });

  it('shows an inline file error and leaves the existing validation list untouched on read failure', async () => {
    mountSetupView(root, { codes: ['036000291452'], settings: {} }, () => {});
    const originalCount = root.querySelectorAll('.validation-list li').length;
    const originalFirst = root.querySelector('.validation-list li')?.textContent;
    expect(originalCount).toBeGreaterThan(0);

    vi.mocked(readUpcFile).mockRejectedValueOnce(new Error('boom'));
    const fileInput = q<HTMLInputElement>('.file-input');
    const file = new File(['x'], 'codes.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change'));

    const fileError = q<HTMLElement>('.file-error');
    await vi.waitFor(() => expect(fileError.hidden).toBe(false));

    // Inline error is shown...
    expect(fileError.textContent).toBeTruthy();
    // ...and the existing validation list is untouched.
    expect(root.querySelectorAll('.validation-list li').length).toBe(originalCount);
    expect(root.querySelector('.validation-list li')?.textContent).toBe(originalFirst);
  });

  it('shows the long-URL warning when the share URL exceeds ~2000 chars', () => {
    const codes = Array.from({ length: 200 }, () => '036000291452');
    mountSetupView(root, { codes, settings: { speedPxPerSec: 60, loop: false } }, () => {});
    q<HTMLButtonElement>('.copy-link').click();
    expect(q<HTMLInputElement>('.share-url').value.length).toBeGreaterThan(2000);
    expect(q<HTMLElement>('.url-warning').hidden).toBe(false);
  });

  it('keeps the long-URL warning hidden for a short share URL', () => {
    mountSetupView(root, { codes: ['036000291452'], settings: { speedPxPerSec: 60, loop: false } }, () => {});
    q<HTMLButtonElement>('.copy-link').click();
    expect(q<HTMLInputElement>('.share-url').value.length).toBeLessThanOrEqual(2000);
    expect(q<HTMLElement>('.url-warning').hidden).toBe(true);
  });
});

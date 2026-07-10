import { describe, it, expect, beforeEach, vi } from 'vitest';
import { startApp } from './main';

let root: HTMLElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('startApp', () => {
  it('opens setup prefilled from the URL', () => {
    startApp(root, '?codes=036000291452&speed=120&loop=1');
    const ta = root.querySelector('.upc-input') as HTMLTextAreaElement;
    expect(ta.value).toBe('036000291452');
    expect((root.querySelector('.speed-input') as HTMLInputElement).value).toBe('120');
  });

  it('switches to play mode on Start and back on Back', () => {
    startApp(root, '?codes=036000291452');
    (root.querySelector('.start') as HTMLButtonElement).click();
    expect(root.querySelector('.play')).not.toBeNull();
    (root.querySelector('.ctl-back') as HTMLButtonElement).click();
    expect(root.querySelector('.setup')).not.toBeNull();
  });

  it('preserves a URL-provided skew seed in the Copy-link URL', () => {
    startApp(root, '?codes=036000291452&skew=1&skewseed=424242');
    (root.querySelector('.copy-link') as HTMLButtonElement).click();
    expect((root.querySelector('.share-url') as HTMLInputElement).value).toContain('skewseed=424242');
  });

  it('generates a session seed from Math.random when the URL has none', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);
    try {
      startApp(root, '?codes=036000291452');
      (root.querySelector('.copy-link') as HTMLButtonElement).click();
      const url = (root.querySelector('.share-url') as HTMLInputElement).value;
      const expectedSeed = Math.floor(0.42 * 0x100000000) >>> 0;
      expect(randomSpy).toHaveBeenCalled();
      expect(url).toContain(`skewseed=${expectedSeed}`);
      expect(expectedSeed).not.toBe(0);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('generates different seeds across sessions when the URL has none', () => {
    startApp(root, '?codes=036000291452');
    (root.querySelector('.copy-link') as HTMLButtonElement).click();
    const url1 = (root.querySelector('.share-url') as HTMLInputElement).value;

    const root2 = document.createElement('div');
    document.body.appendChild(root2);
    startApp(root2, '?codes=036000291452');
    (root2.querySelector('.copy-link') as HTMLButtonElement).click();
    const url2 = (root2.querySelector('.share-url') as HTMLInputElement).value;

    expect(url1.match(/skewseed=(\d+)/)![1]).not.toBe(url2.match(/skewseed=(\d+)/)![1]);
  });
});

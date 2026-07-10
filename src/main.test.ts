import { describe, it, expect, beforeEach } from 'vitest';
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
});

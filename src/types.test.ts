import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './types';

describe('DEFAULT_SETTINGS', () => {
  it('defaults to 60 px/s and loop off', () => {
    expect(DEFAULT_SETTINGS.speedPxPerSec).toBe(60);
    expect(DEFAULT_SETTINGS.loop).toBe(false);
  });
});

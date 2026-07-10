import { describe, it, expect } from 'vitest';
import { advanceOffset, isAtEnd } from './scrollMath';

describe('advanceOffset', () => {
  it('advances by speed × seconds', () => {
    expect(advanceOffset(0, 100, 500, 1000, false)).toBe(50); // 100px/s * 0.5s
  });
  it('does not move when deltaMs is 0 (paused)', () => {
    expect(advanceOffset(42, 100, 0, 1000, false)).toBe(42);
  });
  it('wraps modulo contentHeight when looping', () => {
    expect(advanceOffset(450, 100, 1000, 500, true)).toBe(50); // 550 % 500
  });
  it('clamps at contentHeight when not looping', () => {
    expect(advanceOffset(450, 100, 1000, 500, false)).toBe(500); // min(550, 500)
  });
});

describe('isAtEnd', () => {
  it('is true only for a non-looping scroll at/after contentHeight', () => {
    expect(isAtEnd(500, 500, false)).toBe(true);
    expect(isAtEnd(499, 500, false)).toBe(false);
    expect(isAtEnd(500, 500, true)).toBe(false);
  });
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/scandible/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});

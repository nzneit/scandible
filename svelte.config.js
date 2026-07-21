import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Emit to dist/ so the GitHub Pages workflow's upload path is unchanged.
    adapter: adapter({ pages: 'dist', assets: 'dist' }),
    // Project-site subpath on GitHub Pages; dev and tests serve from root.
    paths: { base: process.env.NODE_ENV === 'production' ? '/scandible' : '' },
  },
};

export default config;

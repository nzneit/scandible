import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			// Emit to dist/ so the GitHub Pages workflow's upload path is unchanged.
			adapter: adapter({ pages: 'dist', assets: 'dist' }),
			// Project-site subpath on GitHub Pages; dev and tests serve from root.
			paths: { base: process.env.NODE_ENV === 'production' ? '/scandible' : '' },
			// No hourly version poll: the app shows no "new version" prompt (Kit 3's default is an hour).
			version: { pollInterval: 0 }
		}),
		svelteTesting()
	],
	// Tailwind CSS 4's browser floor. At Vite 8's default target, Lightning CSS splits the theme
	// rule (its :has() selector) in two, and check-css fails.
	build: { cssTarget: ['chrome111', 'edge111', 'firefox128', 'safari16.4'] },
	test: {
		environment: 'jsdom',
		setupFiles: ['./src/vitest.setup.ts']
	}
});

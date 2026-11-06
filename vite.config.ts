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
			// Type-check the scripts too; removed in step 2b, when tsconfig.json gets its own include.
			typescript: {
				config: (config) => {
					config.include.push('../scripts/**/*.ts');
				}
			}
		}),
		svelteTesting()
	],
	test: {
		environment: 'jsdom',
		setupFiles: ['./src/vitest.setup.ts']
	}
});

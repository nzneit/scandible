import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import testingLibrary from 'eslint-plugin-testing-library';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		linterOptions: { reportUnusedDisableDirectives: 'error' }
	},
	{
		...testingLibrary.configs['flat/svelte'],
		files: ['src/routes/**/*.test.ts', 'src/lib/components/**/*.test.ts'],
		ignores: [
			// Stage tests: their classes are the engine-to-CSS contract (CONTRIBUTING.md, Writing tests).
			'src/lib/components/ScrollColumn.test.ts',
			'src/lib/components/StepStage.test.ts',
			// Not migrated yet: each migration task removes its own file from this list.
			'src/routes/page.test.ts',
			'src/routes/play/page.test.ts',
			'src/lib/components/ShareLink.test.ts',
			'src/lib/components/ValidationList.test.ts',
			'src/lib/components/RowEditor.svelte.test.ts',
			'src/lib/components/Gs1Breakdown.test.ts'
		]
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {}
	}
);

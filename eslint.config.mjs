import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'coverage',
		'reports',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'vitest.config.ts',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
		'.dependency-cruiser.cjs',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mjs', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// KD2: the adapter is the only module allowed to reach undocumented Obsidian internals.
		files: ['src/**/*.ts'],
		ignores: ['src/platform/obsidianInternals.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: "MemberExpression[property.name='mobileNavbar']",
					message: 'Access Obsidian internals only through src/platform/obsidianInternals.ts.',
				},
				{
					selector: "MemberExpression[property.name='commands'][object.property.name='app']",
					message: 'Access Obsidian internals only through src/platform/obsidianInternals.ts.',
				},
				{
					selector: "MemberExpression[property.name='commands'][object.name='app']",
					message: 'Access Obsidian internals only through src/platform/obsidianInternals.ts.',
				},
			],
		},
	},
);

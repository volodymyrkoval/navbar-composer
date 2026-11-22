import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const obsidianMock = fileURLToPath(new URL('./tests/__mocks__/obsidian/index.ts', import.meta.url));

export default defineConfig({
	resolve: {
		alias: [{ find: /^obsidian$/, replacement: obsidianMock }],
	},
	test: {
		environment: 'jsdom',
		include: ['tests/**/*.test.ts'],
		setupFiles: ['tests/setup/obsidianDom.ts'],
	},
});

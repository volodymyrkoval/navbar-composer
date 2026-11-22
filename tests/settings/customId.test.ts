import { describe, expect, it } from 'vitest';
import { createCustomId } from '../../src/settings/customId';

describe('createCustomId', () => {
	it('creates an id in the custom-<time>-<random> format', () => {
		expect(createCustomId()).toMatch(/^custom-[0-9a-z]+-[0-9a-z]{1,6}$/);
	});

	it('creates a different id on every call', () => {
		const ids = Array.from({ length: 100 }, () => createCustomId());

		expect(new Set(ids).size).toBe(100);
	});
});

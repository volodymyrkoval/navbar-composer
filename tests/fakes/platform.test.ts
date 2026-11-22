import { afterEach, describe, expect, it } from 'vitest';
import { Platform } from '../__mocks__/obsidian';

describe('Platform fake', () => {
	afterEach(() => {
		Platform.__reset();
	});

	it('restores the desktop defaults on reset after a test switches device', () => {
		Platform.isPhone = true;
		Platform.isDesktop = false;

		Platform.__reset();

		expect(Platform.isPhone).toBe(false);
		expect(Platform.isDesktop).toBe(true);
	});
});

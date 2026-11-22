import { describe, expect, it } from 'vitest';
import { displayIconName } from '../../../src/settings/pickers/iconName';

describe('displayIconName', () => {
	it('drops the lucide- prefix from an icon id', () => {
		expect(displayIconName('lucide-search')).toBe('search');
	});

	it('keeps an icon id without the prefix unchanged', () => {
		expect(displayIconName('search')).toBe('search');
	});
});

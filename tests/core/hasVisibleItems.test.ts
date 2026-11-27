import { describe, expect, it } from 'vitest';
import { hasVisibleItems } from '../../src/core/hasVisibleItems';
import { createDefaultSettings, type CustomItem, type NavItem } from '../../src/core/settingsModel';

const HIDDEN_CUSTOM: CustomItem = { kind: 'custom', id: 'custom-1', commandId: 'app:help', icon: 'help', label: 'Help', visible: false };

describe('hasVisibleItems', () => {
	it('reports no visible items for an empty list', () => {
		expect(hasVisibleItems([])).toBe(false);
	});

	it('reports no visible items when every native and custom item is hidden', () => {
		const items: NavItem[] = [
			{ kind: 'native', id: 'back', visible: false },
			{ kind: 'native', id: 'menu', visible: false },
			HIDDEN_CUSTOM,
		];

		expect(hasVisibleItems(items)).toBe(false);
	});

	it('reports visible items when one native item is visible', () => {
		const items: NavItem[] = [
			{ kind: 'native', id: 'back', visible: false },
			{ kind: 'native', id: 'forward', visible: true },
		];

		expect(hasVisibleItems(items)).toBe(true);
	});

	it('reports visible items when one custom item is visible among hidden natives', () => {
		const visibleCustom: CustomItem = { ...HIDDEN_CUSTOM, id: 'custom-2', visible: true };
		const items: NavItem[] = [...createDefaultSettings().tablet, visibleCustom];

		expect(hasVisibleItems(items)).toBe(true);
	});

	it('reports no visible items for the fresh-install tablet defaults', () => {
		expect(hasVisibleItems(createDefaultSettings().tablet)).toBe(false);
	});
});

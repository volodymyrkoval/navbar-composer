import { describe, expect, it } from 'vitest';
import { createDefaultSettings, isCustomItem, isNativeId, type NavItem } from '../../src/core/settingsModel';

const NATIVE_ORDER = ['back', 'forward', 'quick-switcher', 'new-tab', 'tabs', 'menu'];

const CUSTOM: NavItem = {
	kind: 'custom',
	id: 'custom-1',
	commandId: 'app:go-back',
	icon: 'arrow-left',
	label: 'Back',
	visible: true,
};

describe('isNativeId', () => {
	it('accepts each native id and rejects anything else', () => {
		expect(NATIVE_ORDER.every(isNativeId)).toBe(true);
		expect(isNativeId('share')).toBe(false);
		expect(isNativeId(undefined)).toBe(false);
	});
});

describe('isCustomItem', () => {
	it('is true for custom items and false for natives', () => {
		expect(isCustomItem(CUSTOM)).toBe(true);
		expect(isCustomItem({ kind: 'native', id: 'back', visible: true })).toBe(false);
	});
});

describe('createDefaultSettings', () => {
	it('gives the phone six visible natives in the Obsidian DOM order', () => {
		const { phone } = createDefaultSettings();

		expect(phone).toEqual(
			NATIVE_ORDER.map((id) => ({ kind: 'native', id, visible: true })),
		);
	});

	it('gives the tablet six hidden natives in the Obsidian DOM order', () => {
		const { tablet } = createDefaultSettings();

		expect(tablet).toEqual(
			NATIVE_ORDER.map((id) => ({ kind: 'native', id, visible: false })),
		);
	});
});

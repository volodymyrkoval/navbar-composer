import { describe, expect, it } from 'vitest';
import { NATIVE_META } from '../../src/core/nativeMeta';
import { NATIVE_IDS } from '../../src/core/settingsModel';

describe('NATIVE_META', () => {
	it('has exactly one entry for every native id', () => {
		expect(Object.keys(NATIVE_META).sort()).toEqual([...NATIVE_IDS].sort());
	});

	it('gives each native its sentence-case label and icon', () => {
		expect(NATIVE_META).toEqual({
			back: { label: 'Back', icon: 'arrow-left' },
			forward: { label: 'Forward', icon: 'arrow-right' },
			'quick-switcher': { label: 'Quick switcher', icon: 'search' },
			'new-tab': { label: 'New tab', icon: 'plus' },
			tabs: { label: 'Tabs', icon: 'copy' },
			menu: { label: 'Menu', icon: 'menu' },
		});
	});
});

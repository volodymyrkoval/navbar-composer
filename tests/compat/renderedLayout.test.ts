import { describe, expect, it } from 'vitest';
import { NATIVE_IDS, type CustomItem, type NativeId, type NavItem } from '../../src/core/settingsModel';
import { NavbarRenderer } from '../../src/navbar/navbarRenderer';
import { buildNavbar } from '../fixtures/navbarFixture';
import { expectedLayout, renderedLayout } from './renderedLayout';

/** Native items in Obsidian's order, with the listed ids hidden. */
function nativeItems(hidden: readonly NativeId[] = []): NavItem[] {
	return NATIVE_IDS.map((id) => ({ kind: 'native', id, visible: !hidden.includes(id) }));
}

function customItem(overrides: Partial<CustomItem> = {}): CustomItem {
	return { kind: 'custom', id: 'c1', commandId: 'app:go', icon: 'star', label: 'Go', visible: true, ...overrides };
}

describe('renderedLayout', () => {
	it('lists a pristine navbar as its six natives in Obsidian order, all shown', () => {
		expect(renderedLayout(buildNavbar())).toStrictEqual(
			NATIVE_IDS.map((id) => ({ kind: 'native', id, hidden: false })),
		);
	});

	it('lists natives in the order the renderer assigned, not in DOM order', () => {
		const navbar = buildNavbar();
		new NavbarRenderer().apply(navbar, [...nativeItems()].reverse());

		expect(renderedLayout(navbar)).toStrictEqual(
			[...NATIVE_IDS].reverse().map((id) => ({ kind: 'native', id, hidden: false })),
		);
	});

	it('matches expectedLayout after the renderer applies a mixed layout, and never shows a hidden custom', () => {
		const navbar = buildNavbar();
		const items: NavItem[] = [
			customItem({ id: 'c1' }),
			{ kind: 'native', id: 'back', visible: false },
			{ kind: 'native', id: 'forward', visible: true },
			customItem({ id: 'c2', visible: false }),
			...nativeItems().slice(2),
		];
		new NavbarRenderer().apply(navbar, items);

		expect(renderedLayout(navbar)).toStrictEqual(expectedLayout(items));
		expect(renderedLayout(navbar).some((item) => item.kind === 'custom' && item.id === 'c2')).toBe(false);
	});

	it('throws on an action that is neither a native nor one of our custom buttons', () => {
		const navbar = buildNavbar();
		const stray = document.createElement('div');
		stray.className = 'mobile-navbar-action';
		navbar.appendChild(stray);

		expect(() => renderedLayout(navbar)).toThrow('neither a native nor a custom button');
	});
});

describe('expectedLayout', () => {
	it('keeps all six natives, each hidden, when every native is hidden', () => {
		expect(expectedLayout(nativeItems(NATIVE_IDS))).toStrictEqual(
			NATIVE_IDS.map((id) => ({ kind: 'native', id, hidden: true })),
		);
	});

	it('maps a visible custom to its fields and drops a hidden one', () => {
		const items: NavItem[] = [customItem(), customItem({ id: 'c2', visible: false })];

		expect(expectedLayout(items)).toStrictEqual([
			{ kind: 'custom', id: 'c1', commandId: 'app:go', icon: 'star', label: 'Go' },
		]);
	});
});

import { describe, expect, it } from 'vitest';
import { type CustomItem, NATIVE_IDS, type NavItem, type NativeId } from '../../src/core/settingsModel';
import { NavbarRenderer } from '../../src/navbar/navbarRenderer';
import { buildNavbar } from '../fixtures/navbarFixture';

/** Native items in Obsidian's order, with the listed ids hidden. */
function nativeItems(hidden: readonly NativeId[] = []): NavItem[] {
	return NATIVE_IDS.map((id) => ({ kind: 'native', id, visible: !hidden.includes(id) }));
}

function customItem(overrides: Partial<CustomItem> = {}): CustomItem {
	return { kind: 'custom', id: 'custom-1', commandId: 'app:go-back', icon: 'arrow-left', label: 'Go back', visible: true, ...overrides };
}

function nativeAction(navbar: HTMLElement, id: NativeId): HTMLElement {
	const action = navbar.querySelector<HTMLElement>(`.mobile-navbar-action-${id}`);
	if (action === null) throw new Error(`fixture has no native action ${id}`);
	return action;
}

describe('NavbarRenderer', () => {
	describe('apply: natives', () => {
		it('hides a native whose item is not visible', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems(['back']));

			expect(nativeAction(navbar, 'back').classList.contains('navbar-composer-hidden')).toBe(true);
		});

		it('shows a native again when its item becomes visible', () => {
			const navbar = buildNavbar();
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, nativeItems(['back']));

			renderer.apply(navbar, nativeItems());

			expect(nativeAction(navbar, 'back').classList.contains('navbar-composer-hidden')).toBe(false);
		});

		it('sets each native order variable to its index in the item list', () => {
			const navbar = buildNavbar();
			const reversed = [...nativeItems()].reverse();

			new NavbarRenderer().apply(navbar, reversed);

			expect(nativeAction(navbar, 'menu').style.getPropertyValue('--navbar-composer-order')).toBe('0');
			expect(nativeAction(navbar, 'back').style.getPropertyValue('--navbar-composer-order')).toBe('5');
		});

		it('marks each native as ordered so the order variable takes effect', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems());

			expect(nativeAction(navbar, 'tabs').classList.contains('navbar-composer-ordered')).toBe(true);
		});

		it('leaves each native inner element and its other attributes untouched', () => {
			const navbar = buildNavbar();
			const innerBefore = nativeAction(navbar, 'menu').innerHTML;
			const attrsBefore = nativeAction(navbar, 'menu').getAttribute('aria-label');

			new NavbarRenderer().apply(navbar, nativeItems(['menu']));

			expect(nativeAction(navbar, 'menu').innerHTML).toBe(innerBefore);
			expect(nativeAction(navbar, 'menu').getAttribute('aria-label')).toBe(attrsBefore);
		});
	});

	describe('apply: custom buttons', () => {
		it('renders a visible custom button in the natives row', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, [...nativeItems(), customItem()]);

			const button = navbar.querySelector<HTMLElement>('.navbar-composer-action');
			expect(button?.parentElement).toBe(navbar.querySelector('.mobile-navbar-actions'));
		});

		it('builds a custom button with the native action classes and one inner icon span', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, [...nativeItems(), customItem()]);

			const button = navbar.querySelector<HTMLElement>('.navbar-composer-action');
			expect(button?.matches('.mobile-navbar-action.navbar-composer-action.navbar-composer-ordered')).toBe(true);
			expect(button?.querySelectorAll(':scope > span.clickable-icon')).toHaveLength(1);
		});

		it('removes a custom button once its item is hidden', () => {
			const navbar = buildNavbar();
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, [...nativeItems(), customItem()]);

			renderer.apply(navbar, [...nativeItems(), customItem({ visible: false })]);

			expect(navbar.querySelector('.navbar-composer-action')).toBeNull();
		});

		it('removes a custom button whose item has been deleted', () => {
			const navbar = buildNavbar();
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, [...nativeItems(), customItem()]);

			renderer.apply(navbar, nativeItems());

			expect(navbar.querySelector('.navbar-composer-action')).toBeNull();
		});

		it('updates an existing custom button in place instead of adding another', () => {
			const navbar = buildNavbar();
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, [...nativeItems(), customItem()]);
			const original = navbar.querySelector<HTMLElement>('.navbar-composer-action');

			renderer.apply(navbar, [...nativeItems(), customItem({ commandId: 'app:forward', label: 'Forward' })]);

			const buttons = navbar.querySelectorAll('.navbar-composer-action');
			expect(buttons).toHaveLength(1);
			expect(buttons[0]).toBe(original);
			expect(original?.getAttribute('data-navbar-composer-command')).toBe('app:forward');
		});

		it('sets each custom button order variable to its index in the item list', () => {
			const navbar = buildNavbar();
			const items: NavItem[] = [customItem({ id: 'first' }), ...nativeItems(), customItem({ id: 'second' })];

			new NavbarRenderer().apply(navbar, items);

			const orderOf = (id: string): string =>
				navbar.querySelector<HTMLElement>(`[data-navbar-composer-id="${id}"]`)?.style.getPropertyValue('--navbar-composer-order') ?? '';
			expect(orderOf('first')).toBe('0');
			expect(orderOf('second')).toBe('7');
		});
	});

	describe('restore', () => {
		it('returns the container outerHTML to its pre-apply value', () => {
			const navbar = buildNavbar();
			const before = navbar.outerHTML;
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, [customItem({ id: 'first' }), ...nativeItems(['back', 'menu']), customItem({ id: 'second' })]);

			renderer.restore(navbar);

			expect(navbar.outerHTML).toBe(before);
		});
	});

	describe('apply: idempotence', () => {
		it('produces zero mutation records when re-applied to unchanged items', () => {
			const navbar = buildNavbar();
			const items: NavItem[] = [customItem(), ...nativeItems(['back'])];
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, items);
			const observer = new MutationObserver(() => undefined);
			observer.observe(navbar, { attributes: true, childList: true, characterData: true, subtree: true });

			renderer.apply(navbar, items);

			const records = observer.takeRecords();
			observer.disconnect();
			expect(records).toHaveLength(0);
		});
	});

	describe('apply: edge cases', () => {
		it('leaves the navbar unchanged when the item list is empty', () => {
			const navbar = buildNavbar();
			const before = navbar.outerHTML;

			new NavbarRenderer().apply(navbar, []);

			expect(navbar.outerHTML).toBe(before);
		});

		it('leaves natives absent from the item list untouched', () => {
			const navbar = buildNavbar();
			const menuBefore = nativeAction(navbar, 'menu').outerHTML;
			const items: NavItem[] = [
				{ kind: 'native', id: 'back', visible: true },
				{ kind: 'native', id: 'forward', visible: true },
			];

			new NavbarRenderer().apply(navbar, items);

			expect(nativeAction(navbar, 'menu').outerHTML).toBe(menuBefore);
		});

		it('ignores a listed native that is not located in the container', () => {
			const navbar = buildNavbar({ count: 2 });
			const items: NavItem[] = [
				{ kind: 'native', id: 'menu', visible: false },
				{ kind: 'native', id: 'back', visible: true },
			];

			new NavbarRenderer().apply(navbar, items);

			expect(navbar.querySelectorAll('.navbar-composer-hidden')).toHaveLength(0);
			expect(nativeAction(navbar, 'back').style.getPropertyValue('--navbar-composer-order')).toBe('1');
		});
	});
});

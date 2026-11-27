import { describe, expect, it } from 'vitest';
import { type CustomItem, NATIVE_IDS, type NavItem, type NativeId } from '../../src/core/settingsModel';
import { NO_PINS } from '../../src/core/pins';
import { locateActionsRow, locateNatives } from '../../src/navbar/nativeLocator';
import { NavbarRenderer, ORDER_VAR } from '../../src/navbar/navbarRenderer';
import { SCROLL_THUMB_CLASS, SCROLL_TRACK_CLASS } from '../../src/navbar/scrollTrack';
import { buildNavbar } from '../fixtures/navbarFixture';

/** Native items in Obsidian's order, with the listed ids hidden. */
function nativeItems(hidden: readonly NativeId[] = []): NavItem[] {
	return NATIVE_IDS.map((id) => ({ kind: 'native', id, visible: !hidden.includes(id) }));
}

function customItem(overrides: Partial<CustomItem> = {}): CustomItem {
	return { kind: 'custom', id: 'custom-1', commandId: 'app:go-back', icon: 'arrow-left', label: 'Go back', visible: true, ...overrides };
}

/** The pill as `ScrollTrack` leaves it: a track with one thumb, built by hand, appended after the row. */
function buildNavbarWithTrack(): HTMLElement {
	const navbar = buildNavbar();
	navbar.createDiv({ cls: SCROLL_TRACK_CLASS }).createDiv({ cls: SCROLL_THUMB_CLASS });
	return navbar;
}

function scrollTrack(navbar: HTMLElement): HTMLElement {
	const track = navbar.querySelector<HTMLElement>(`.${SCROLL_TRACK_CLASS}`);
	if (track === null) throw new Error('fixture has no scroll track');
	return track;
}

/** The order variable of every child of the natives row, in DOM order. */
function orderVars(row: HTMLElement): string[] {
	return Array.from(row.children, (el) => (el as HTMLElement).style.getPropertyValue(ORDER_VAR));
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

		it('removes both pin classes so a pinned layout restores to the pre-apply container', () => {
			const navbar = buildNavbar();
			const before = navbar.outerHTML;
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, [...nativeItems(), customItem()], { pinStart: true, pinEnd: true });

			renderer.restore(navbar);

			expect(navbar.outerHTML).toBe(before);
		});

		it('removes the empty marker so an all-hidden layout restores to the pre-apply container', () => {
			const navbar = buildNavbar();
			const before = navbar.outerHTML;
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, nativeItems(NATIVE_IDS));

			renderer.restore(navbar);

			expect(navbar.outerHTML).toBe(before);
		});
	});

	describe('apply: empty state', () => {
		it('marks the container when every native is hidden and no custom is visible', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems(NATIVE_IDS));

			expect(navbar.classList.contains('navbar-composer-empty')).toBe(true);
		});

		it('does not mark the container when one native is visible', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems(NATIVE_IDS.filter((id) => id !== 'back')));

			expect(navbar.classList.contains('navbar-composer-empty')).toBe(false);
		});

		it('removes the marker when a hidden native becomes visible again', () => {
			const navbar = buildNavbar();
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, nativeItems(NATIVE_IDS));

			renderer.apply(navbar, nativeItems(NATIVE_IDS.filter((id) => id !== 'back')));

			expect(navbar.classList.contains('navbar-composer-empty')).toBe(false);
		});

		it('does not mark the container when only a custom button is visible', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, [...nativeItems(NATIVE_IDS), customItem()]);

			expect(navbar.classList.contains('navbar-composer-empty')).toBe(false);
		});
	});

	describe('apply: pinned edges', () => {
		it('marks only the first visible action with the start pin class when pinStart is on', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems(), { pinStart: true });

			expect(nativeAction(navbar, 'back').classList.contains('navbar-composer-pinned-start')).toBe(true);
			expect(navbar.querySelectorAll('.navbar-composer-pinned-start')).toHaveLength(1);
		});

		it('marks only the last visible action with the end pin class when pinEnd is on', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems(), { pinEnd: true });

			expect(nativeAction(navbar, 'menu').classList.contains('navbar-composer-pinned-end')).toBe(true);
			expect(navbar.querySelectorAll('.navbar-composer-pinned-end')).toHaveLength(1);
		});

		it('pins both edges when both pins are on', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems(), { pinStart: true, pinEnd: true });

			expect(nativeAction(navbar, 'back').classList.contains('navbar-composer-pinned-start')).toBe(true);
			expect(nativeAction(navbar, 'menu').classList.contains('navbar-composer-pinned-end')).toBe(true);
		});

		it('pins a visible custom button that is first in the list, not the native in its DOM place', () => {
			const navbar = buildNavbar();
			const items: NavItem[] = [customItem({ id: 'first' }), ...nativeItems()];

			new NavbarRenderer().apply(navbar, items, { pinStart: true });

			const custom = navbar.querySelector<HTMLElement>('[data-navbar-composer-id="first"]');
			expect(custom?.classList.contains('navbar-composer-pinned-start')).toBe(true);
			expect(nativeAction(navbar, 'back').classList.contains('navbar-composer-pinned-start')).toBe(false);
		});

		it('removes both pin classes when re-applied with no pins', () => {
			const navbar = buildNavbar();
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, nativeItems(), { pinStart: true, pinEnd: true });

			renderer.apply(navbar, nativeItems(), NO_PINS);

			expect(navbar.querySelectorAll('.navbar-composer-pinned-start, .navbar-composer-pinned-end')).toHaveLength(0);
		});
	});

	describe('apply: pinned edge cases', () => {
		it('pins the first visible native when the first native is hidden and pinStart is on', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems(['back']), { pinStart: true });

			expect(nativeAction(navbar, 'forward').classList.contains('navbar-composer-pinned-start')).toBe(true);
			expect(navbar.querySelectorAll('.navbar-composer-pinned-start')).toHaveLength(1);
		});

		it('pins the menu when the last custom button is hidden and pinEnd is on', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, [...nativeItems(), customItem({ visible: false })], { pinEnd: true });

			expect(nativeAction(navbar, 'menu').classList.contains('navbar-composer-pinned-end')).toBe(true);
		});

		it('gives a single visible item only the start pin when both pins are on', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems(NATIVE_IDS.filter((id) => id !== 'back')), { pinStart: true, pinEnd: true });

			expect(nativeAction(navbar, 'back').classList.contains('navbar-composer-pinned-start')).toBe(true);
			expect(navbar.querySelectorAll('.navbar-composer-pinned-end')).toHaveLength(0);
		});

		it('pins no action when no item is visible and both pins are on', () => {
			const navbar = buildNavbar();

			new NavbarRenderer().apply(navbar, nativeItems(NATIVE_IDS), { pinStart: true, pinEnd: true });

			expect(navbar.querySelectorAll('.navbar-composer-pinned-start, .navbar-composer-pinned-end')).toHaveLength(0);
		});

		it('never pins a visible native that cannot be identified', () => {
			const navbar = buildNavbar({ perActionClasses: false, count: 1 });

			new NavbarRenderer().apply(navbar, nativeItems(), { pinStart: true, pinEnd: true });

			expect(navbar.querySelectorAll('.navbar-composer-pinned-start, .navbar-composer-pinned-end')).toHaveLength(0);
		});

		it('skips an unidentified visible native and pins the last identified one at the end', () => {
			const navbar = buildNavbar({ count: 2 });

			new NavbarRenderer().apply(navbar, nativeItems(), { pinEnd: true });

			expect(nativeAction(navbar, 'forward').classList.contains('navbar-composer-pinned-end')).toBe(true);
			expect(navbar.querySelectorAll('.navbar-composer-pinned-end')).toHaveLength(1);
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

		it('produces zero mutation records when re-applied to unchanged items with both pins', () => {
			const navbar = buildNavbar();
			const items: NavItem[] = [customItem(), ...nativeItems(['back'])];
			const pins = { pinStart: true, pinEnd: true };
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, items, pins);
			const observer = new MutationObserver(() => undefined);
			observer.observe(navbar, { attributes: true, childList: true, characterData: true, subtree: true });

			renderer.apply(navbar, items, pins);

			const records = observer.takeRecords();
			observer.disconnect();
			expect(records).toHaveLength(0);
		});

		it('produces zero mutation records when re-applied to an unchanged all-hidden list', () => {
			const navbar = buildNavbar();
			const items = nativeItems(NATIVE_IDS);
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
		it('marks the container and leaves the natives row unchanged when the item list is empty', () => {
			const navbar = buildNavbar();
			const actionsBefore = navbar.querySelector('.mobile-navbar-actions')?.outerHTML;

			new NavbarRenderer().apply(navbar, []);

			expect(navbar.classList.contains('navbar-composer-empty')).toBe(true);
			expect(navbar.querySelector('.mobile-navbar-actions')?.outerHTML).toBe(actionsBefore);
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

	describe('scroll track is invisible to the renderer and locator', () => {
		it('locates all six natives and the natives row, not the track', () => {
			const navbar = buildNavbarWithTrack();

			expect(locateNatives(navbar).size).toBe(6);
			expect(locateActionsRow(navbar)).toBe(navbar.querySelector('.mobile-navbar-actions'));
		});

		it('pins the start native and the trailing visible custom, ignoring the track', () => {
			const navbar = buildNavbarWithTrack();

			new NavbarRenderer().apply(navbar, [...nativeItems(), customItem()], { pinStart: true, pinEnd: true });

			expect(nativeAction(navbar, 'back').classList.contains('navbar-composer-pinned-start')).toBe(true);
			expect(navbar.querySelector<HTMLElement>('[data-navbar-composer-id="custom-1"]')?.classList.contains('navbar-composer-pinned-end')).toBe(true);
		});

		it('writes the same order variables as the same apply on a navbar without the track', () => {
			const items = [...nativeItems(), customItem()];
			const withTrack = buildNavbarWithTrack();
			const withoutTrack = buildNavbar();

			new NavbarRenderer().apply(withTrack, items, { pinStart: true, pinEnd: true });
			new NavbarRenderer().apply(withoutTrack, items, { pinStart: true, pinEnd: true });

			expect(orderVars(locateActionsRow(withTrack))).toEqual(orderVars(locateActionsRow(withoutTrack)));
		});

		it('leaves the track and its thumb outerHTML unchanged by apply', () => {
			const navbar = buildNavbarWithTrack();
			const trackBefore = scrollTrack(navbar).outerHTML;
			const thumbBefore = scrollTrack(navbar).firstElementChild?.outerHTML;

			new NavbarRenderer().apply(navbar, [...nativeItems(), customItem()], { pinStart: true, pinEnd: true });

			expect(scrollTrack(navbar).outerHTML).toBe(trackBefore);
			expect(scrollTrack(navbar).firstElementChild?.outerHTML).toBe(thumbBefore);
		});

		it('produces zero mutation records when re-applied to unchanged items with the track present', () => {
			const navbar = buildNavbarWithTrack();
			const items = [...nativeItems(), customItem()];
			const pins = { pinStart: true, pinEnd: true };
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, items, pins);
			const observer = new MutationObserver(() => undefined);
			observer.observe(navbar, { attributes: true, childList: true, characterData: true, subtree: true });

			renderer.apply(navbar, items, pins);

			const records = observer.takeRecords();
			observer.disconnect();
			expect(records).toHaveLength(0);
		});

		it('keeps the track and its thumb unchanged after restore', () => {
			const navbar = buildNavbarWithTrack();
			const trackBefore = scrollTrack(navbar).outerHTML;
			const renderer = new NavbarRenderer();
			renderer.apply(navbar, [...nativeItems(), customItem()], { pinStart: true, pinEnd: true });

			renderer.restore(navbar);

			expect(scrollTrack(navbar).outerHTML).toBe(trackBefore);
		});
	});
});

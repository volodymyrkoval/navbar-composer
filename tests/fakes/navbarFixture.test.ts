import { describe, expect, it } from 'vitest';
import { buildNavbar } from '../fixtures/navbarFixture';

const NATIVE_ORDER = ['back', 'forward', 'quick-switcher', 'new-tab', 'tabs', 'menu'];

describe('buildNavbar fixture', () => {
	it('builds only the first count natives when count is below six', () => {
		const navbar = buildNavbar({ count: 5 });

		expect(navbar.querySelectorAll('.mobile-navbar-action')).toHaveLength(5);
		expect(navbar.querySelector('.mobile-navbar-action-tabs')).not.toBeNull();
		expect(navbar.querySelector('.mobile-navbar-action-menu')).toBeNull();
	});

	it('leaves every native action without an aria-label, as Obsidian does', () => {
		const actions = Array.from(buildNavbar().querySelectorAll('.mobile-navbar-action'));

		expect(actions.some((action) => action.hasAttribute('aria-label'))).toBe(false);
	});

	it('drops the per-action classes when perActionClasses is false', () => {
		const actions = Array.from(buildNavbar({ perActionClasses: false }).querySelectorAll('.mobile-navbar-action'));

		expect(actions).toHaveLength(6);
		expect(actions.some((action) => Array.from(action.classList).some((cls) => cls.startsWith('mobile-navbar-action-')))).toBe(false);
	});

	it('gives the menu action its long-press classes and a flair element after the icon', () => {
		const menu = buildNavbar().querySelector('.mobile-navbar-action-menu');

		expect(menu?.classList.contains('has-longpress-menu')).toBe(true);
		expect(menu?.classList.contains('tappable')).toBe(true);
		expect(menu?.children[1]?.matches('div.navbar-action-flair')).toBe(true);
	});

	it('wraps each action in the inner clickable element Obsidian uses for it', () => {
		const actions = Array.from(buildNavbar().querySelectorAll('.mobile-navbar-action'));

		const innerTags = actions.map((action) => action.firstElementChild?.tagName.toLowerCase());
		expect(innerTags).toEqual(['button', 'button', 'span', 'span', 'div', 'span']);
		expect(actions.every((action) => action.firstElementChild?.classList.contains('clickable-icon'))).toBe(true);
	});

	it('builds the navbar container with one row of six per-action native buttons', () => {
		const container = buildNavbar();

		const row = container.querySelector('.mobile-navbar-actions');
		const actions = Array.from(row?.children ?? []);

		expect(container.matches('.mobile-navbar.mod-raised')).toBe(true);
		const perActionClasses = actions.map((action) =>
			Array.from(action.classList).filter((cls) => cls.startsWith('mobile-navbar-action-')),
		);
		expect(perActionClasses).toEqual(NATIVE_ORDER.map((id) => [`mobile-navbar-action-${id}`]));
	});
});

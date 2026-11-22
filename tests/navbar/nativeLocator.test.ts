import { describe, expect, it } from 'vitest';
import { buildNavbar } from '../fixtures/navbarFixture';
import { locateActionsRow, locateNatives } from '../../src/navbar/nativeLocator';

describe('nativeLocator', () => {
	describe('locateNatives', () => {
		it('maps each native id to its action element found by the per-action class', () => {
			const navbar = buildNavbar();

			const natives = locateNatives(navbar);

			expect(natives.size).toBe(6);
			expect(natives.get('tabs')).toBe(navbar.querySelector('.mobile-navbar-action-tabs'));
			expect(natives.get('menu')).toBe(navbar.querySelector('.mobile-navbar-action-menu'));
		});

		it('falls back to DOM position when the per-action classes are absent', () => {
			const navbar = buildNavbar({ perActionClasses: false });
			const actions = Array.from(navbar.querySelectorAll<HTMLElement>('.mobile-navbar-action'));

			const natives = locateNatives(navbar);

			expect(natives.get('back')).toBe(actions[0]);
			expect(natives.get('menu')).toBe(actions[5]);
		});

		it('ignores a custom button already in the row, so the position fallback still applies', () => {
			const navbar = buildNavbar({ perActionClasses: false });
			const row = navbar.querySelector<HTMLElement>('.mobile-navbar-actions')!;
			row.createDiv({ cls: ['mobile-navbar-action', 'navbar-composer-action'] });
			const actions = Array.from(row.querySelectorAll<HTMLElement>('.mobile-navbar-action:not(.navbar-composer-action)'));

			const natives = locateNatives(navbar);

			expect(natives.size).toBe(6);
			expect(natives.get('forward')).toBe(actions[1]);
		});
	});

	describe('locateActionsRow', () => {
		it('returns the row holding the native actions', () => {
			const navbar = buildNavbar();

			expect(locateActionsRow(navbar)).toBe(navbar.querySelector('.mobile-navbar-actions'));
		});

		it('returns the container when there are no native actions to anchor on', () => {
			const navbar = document.createElement('div');

			expect(locateActionsRow(navbar)).toBe(navbar);
		});
	});
});

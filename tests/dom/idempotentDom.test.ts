import { describe, expect, it, vi } from 'vitest';
import { ensureAttr, ensureClassAdded, ensureClassRemoved, ensureCssVar, ensureCssVarRemoved } from '../../src/dom/idempotentDom';

/** Counts the DOM mutation records `action` produces under `target`, as a MutationObserver would see them. */
function countMutations(target: Node, action: () => void): number {
	const observer = new MutationObserver(() => undefined);
	observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
	action();
	const count = observer.takeRecords().length;
	observer.disconnect();
	return count;
}

describe('idempotentDom', () => {
	describe('ensureClassAdded', () => {
		it('adds the class when it is missing', () => {
			const el = document.createElement('div');

			ensureClassAdded(el, 'navbar-composer-hidden');

			expect(el.classList.contains('navbar-composer-hidden')).toBe(true);
		});

		it('writes nothing when the class is already present', () => {
			const el = document.createElement('div');
			ensureClassAdded(el, 'navbar-composer-hidden');

			const mutations = countMutations(el, () => ensureClassAdded(el, 'navbar-composer-hidden'));

			expect(mutations).toBe(0);
		});
	});

	describe('ensureClassRemoved', () => {
		it('removes the class when it is present', () => {
			const el = document.createElement('div');
			el.classList.add('navbar-composer-hidden');

			ensureClassRemoved(el, 'navbar-composer-hidden');

			expect(el.classList.contains('navbar-composer-hidden')).toBe(false);
		});

		it('writes nothing when the class is already absent', () => {
			const el = document.createElement('div');
			el.classList.add('theme-dark');

			const mutations = countMutations(el, () => ensureClassRemoved(el, 'navbar-composer-hidden'));

			expect(mutations).toBe(0);
		});
	});

	describe('ensureAttr', () => {
		it('sets the attribute when its value differs', () => {
			const el = document.createElement('div');

			ensureAttr(el, 'aria-label', 'Go back');

			expect(el.getAttribute('aria-label')).toBe('Go back');
		});

		it('writes nothing when the attribute already holds the value', () => {
			const el = document.createElement('div');
			ensureAttr(el, 'aria-label', 'Go back');

			const mutations = countMutations(el, () => ensureAttr(el, 'aria-label', 'Go back'));

			expect(mutations).toBe(0);
		});
	});

	describe('ensureCssVar', () => {
		it('sets the custom property when its value differs', () => {
			const el = document.createElement('div');

			ensureCssVar(el, '--navbar-composer-order', '3');

			expect(el.style.getPropertyValue('--navbar-composer-order')).toBe('3');
		});

		it('does not call setCssProps when the custom property already holds the value', () => {
			const el = document.createElement('div');
			ensureCssVar(el, '--navbar-composer-order', '3');
			const setCssProps = vi.spyOn(el, 'setCssProps');

			ensureCssVar(el, '--navbar-composer-order', '3');

			expect(setCssProps).not.toHaveBeenCalled();
		});
	});

	describe('ensureCssVarRemoved', () => {
		it('removes the custom property when it is set', () => {
			const el = document.createElement('div');
			ensureCssVar(el, '--navbar-composer-order', '3');

			ensureCssVarRemoved(el, '--navbar-composer-order');

			expect(el.style.getPropertyValue('--navbar-composer-order')).toBe('');
		});

		it('removes the style attribute when the removed variable was the last declaration', () => {
			const el = document.createElement('div');
			ensureCssVar(el, '--navbar-composer-order', '3');

			ensureCssVarRemoved(el, '--navbar-composer-order');

			expect(el.hasAttribute('style')).toBe(false);
		});

		it('keeps the style attribute when other declarations remain', () => {
			const el = document.createElement('div');
			ensureCssVar(el, '--navbar-composer-order', '3');
			ensureCssVar(el, '--navbar-composer-other', 'x');

			ensureCssVarRemoved(el, '--navbar-composer-order');

			expect(el.getAttribute('style')).toContain('--navbar-composer-other');
			expect(el.style.getPropertyValue('--navbar-composer-order')).toBe('');
		});

		it('does not call removeProperty when the custom property is already absent', () => {
			const el = document.createElement('div');
			const removeProperty = vi.spyOn(el.style, 'removeProperty');

			ensureCssVarRemoved(el, '--navbar-composer-order');

			expect(removeProperty).not.toHaveBeenCalled();
		});
	});
});

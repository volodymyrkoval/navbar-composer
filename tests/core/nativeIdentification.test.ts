import { describe, expect, it } from 'vitest';
import { type ActionDescriptor, identifyNatives, NATIVE_ACTION_CLASS } from '../../src/core/nativeIdentification';
import { NATIVE_IDS } from '../../src/core/settingsModel';

function action(...classes: string[]): ActionDescriptor {
	return { classes };
}

function classless(count: number): ActionDescriptor[] {
	return Array.from({ length: count }, () => action());
}

describe('identifyNatives', () => {
	it('falls back to DOM position when six actions carry no classes', () => {
		const result = identifyNatives(classless(NATIVE_IDS.length));

		expect(result).toEqual(new Map(NATIVE_IDS.map((id, index) => [id, index])));
	});

	it.each([0, 5, 7])('does not fall back to position with %i actions', (count) => {
		expect(identifyNatives(classless(count)).size).toBe(0);
	});

	it('lets the first of two actions carrying the same class win', () => {
		const result = identifyNatives([action(NATIVE_ACTION_CLASS.tabs), action(NATIVE_ACTION_CLASS.tabs)]);

		expect(result.get('tabs')).toBe(0);
	});

	it('does not let one action satisfy two natives', () => {
		const result = identifyNatives([action(NATIVE_ACTION_CLASS.back, NATIVE_ACTION_CLASS.forward)]);

		expect(result.get('back')).toBe(0);
		expect(result.has('forward')).toBe(false);
	});

	it('does not let the position fallback reuse an index a class already claimed', () => {
		const result = identifyNatives([action(NATIVE_ACTION_CLASS.forward), ...classless(NATIVE_IDS.length - 1)]);

		expect(result.get('forward')).toBe(0);
		expect(result.has('back')).toBe(false);
		expect(result.get('quick-switcher')).toBe(2);
		expect(result.get('menu')).toBe(5);
	});

	it('identifies a native by its per-action class', () => {
		const result = identifyNatives([action(NATIVE_ACTION_CLASS.forward), action(NATIVE_ACTION_CLASS.back)]);

		expect(result.get('forward')).toBe(0);
		expect(result.get('back')).toBe(1);
	});

	it('identifies all six natives regardless of DOM order', () => {
		const reversed = ['menu', 'tabs', 'new-tab', 'quick-switcher', 'forward', 'back'] as const;

		const result = identifyNatives(reversed.map((id) => action(NATIVE_ACTION_CLASS[id])));

		reversed.forEach((id, index) => expect(result.get(id)).toBe(index));
	});

	it('ignores extra classes on an action', () => {
		const result = identifyNatives([action('mobile-navbar-action', NATIVE_ACTION_CLASS.menu, 'has-longpress-menu', 'tappable')]);

		expect(result.get('menu')).toBe(0);
	});
});

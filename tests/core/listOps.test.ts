import { describe, expect, it } from 'vitest';
import { addCustom, moveDown, moveUp, removeCustom, restoreCustom, toggleVisible, updateCustom, withDevice } from '../../src/core/listOps';
import { createDefaultSettings } from '../../src/core/settingsModel';
import type { CustomItem, NavItem } from '../../src/core/settingsModel';

const HELP: CustomItem = { kind: 'custom', id: 'custom-1', commandId: 'app:open-help', icon: 'help', label: 'Help', visible: true };

function natives(...ids: string[]): NavItem[] {
	return ids.map((id) => ({ kind: 'native', id, visible: true }) as NavItem);
}

function idsOf(items: readonly NavItem[]): string[] {
	return items.map((item) => item.id);
}

describe('moveUp', () => {
	it('swaps an item with the one before it', () => {
		const result = moveUp(natives('back', 'forward', 'tabs'), 'forward');

		expect(idsOf(result)).toEqual(['forward', 'back', 'tabs']);
	});
});

describe('moveDown', () => {
	it('swaps an item with the one after it', () => {
		const result = moveDown(natives('back', 'forward', 'tabs'), 'forward');

		expect(idsOf(result)).toEqual(['back', 'tabs', 'forward']);
	});
});

describe('toggleVisible', () => {
	it('flips the visibility of the item with the given id only', () => {
		const result = toggleVisible(natives('back', 'forward'), 'forward');

		expect(result).toEqual([
			{ kind: 'native', id: 'back', visible: true },
			{ kind: 'native', id: 'forward', visible: false },
		]);
	});
});

describe('removeCustom', () => {
	const custom = { kind: 'custom', id: 'custom-1', commandId: 'app:open-help', icon: 'help', label: 'Help', visible: true } as const;

	it('removes the custom item with the given id', () => {
		const result = removeCustom([...natives('back'), custom], 'custom-1');

		expect(result).toEqual(natives('back'));
	});

	it('leaves a native with the same id untouched', () => {
		const items = natives('back', 'forward');

		expect(removeCustom(items, 'back')).toEqual(items);
	});
});

describe('restoreCustom', () => {
	const ITEMS = natives('back', 'forward', 'menu');

	it('inserts the item at its original index', () => {
		expect(idsOf(restoreCustom(ITEMS, HELP, 1))).toEqual(['back', 'custom-1', 'forward', 'menu']);
	});

	it('inserts at the start for index 0', () => {
		expect(idsOf(restoreCustom(ITEMS, HELP, 0))).toEqual(['custom-1', 'back', 'forward', 'menu']);
	});

	it('inserts at the end when the index equals the length', () => {
		expect(idsOf(restoreCustom(ITEMS, HELP, 3))).toEqual(['back', 'forward', 'menu', 'custom-1']);
	});

	it('clamps an index beyond the length to the end', () => {
		expect(idsOf(restoreCustom(ITEMS, HELP, 99))).toEqual(['back', 'forward', 'menu', 'custom-1']);
	});

	it('clamps a negative index to the start', () => {
		expect(idsOf(restoreCustom(ITEMS, HELP, -1))).toEqual(['custom-1', 'back', 'forward', 'menu']);
	});

	it('restores into an empty list', () => {
		expect(restoreCustom([], HELP, 4)).toEqual([HELP]);
	});

	it('does nothing when an item with that id already exists', () => {
		const items = [...ITEMS, HELP];

		expect(restoreCustom(items, HELP, 0)).toEqual(items);
	});

	it('never mutates the input', () => {
		const items = [...ITEMS];

		restoreCustom(items, HELP, 1);

		expect(items).toEqual(ITEMS);
	});
});

describe('addCustom', () => {
	it('appends the custom item after the existing items', () => {
		const result = addCustom(natives('back'), HELP);

		expect(result).toEqual([...natives('back'), HELP]);
	});

	it('throws when the id is already in the list', () => {
		expect(() => addCustom([...natives('back'), HELP], HELP)).toThrow('Duplicate nav item id: custom-1');
	});
});

describe('updateCustom', () => {
	it('merges the edit into the custom item with the given id', () => {
		const result = updateCustom([HELP], 'custom-1', { label: 'Support', icon: 'life-buoy' });

		expect(result).toEqual([{ ...HELP, label: 'Support', icon: 'life-buoy' }]);
	});

	it('leaves a native with the same id unchanged', () => {
		const items = natives('back');

		expect(updateCustom(items, 'back', { label: 'Renamed' })).toEqual(items);
	});
});

describe('withDevice', () => {
	it('replaces only the given device list and leaves the other device untouched', () => {
		const settings = createDefaultSettings();

		const result = withDevice(settings, 'tablet', (items) => toggleVisible(items, 'back'));

		expect(result.tablet[0]).toEqual({ kind: 'native', id: 'back', visible: true });
		expect(result.phone).toEqual(settings.phone);
	});
});

describe('list operation edge cases', () => {
	const ITEMS = natives('back', 'forward', 'tabs');

	it('does nothing when moving the first item up or the last item down', () => {
		expect(moveUp(ITEMS, 'back')).toEqual(ITEMS);
		expect(moveDown(ITEMS, 'tabs')).toEqual(ITEMS);
	});

	it('does nothing when moving a single-item list in either direction', () => {
		const single = natives('back');

		expect(moveUp(single, 'back')).toEqual(single);
		expect(moveDown(single, 'back')).toEqual(single);
	});

	it('does nothing for an id that is not in the list', () => {
		expect(moveUp(ITEMS, 'missing')).toEqual(ITEMS);
		expect(moveDown(ITEMS, 'missing')).toEqual(ITEMS);
		expect(toggleVisible(ITEMS, 'missing')).toEqual(ITEMS);
		expect(removeCustom(ITEMS, 'missing')).toEqual(ITEMS);
		expect(updateCustom(ITEMS, 'missing', { label: 'x' })).toEqual(ITEMS);
	});

	it('returns an empty list for an empty input', () => {
		expect(moveUp([], 'back')).toEqual([]);
		expect(moveDown([], 'back')).toEqual([]);
		expect(toggleVisible([], 'back')).toEqual([]);
		expect(removeCustom([], 'back')).toEqual([]);
		expect(updateCustom([], 'back', { label: 'x' })).toEqual([]);
	});

	it('never mutates the input array or its items', () => {
		const before = structuredClone(ITEMS);
		const frozen = Object.freeze(ITEMS.map((item) => Object.freeze({ ...item })));

		moveUp(frozen, 'forward');
		moveDown(frozen, 'forward');
		toggleVisible(frozen, 'forward');
		removeCustom(frozen, 'forward');
		updateCustom(frozen, 'forward', { label: 'x' });

		expect(frozen).toEqual(before);
	});
});

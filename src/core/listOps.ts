/**
 * Immutable edits to one device list. Every function returns a new array and never mutates its input.
 */

import { type CustomItem, type Device, isCustomItem, type NavItem, type Settings } from './settingsModel';

/** Swaps the item with its previous neighbour. No-op at the first position or for an unknown id. */
export function moveUp(items: readonly NavItem[], id: string): NavItem[] {
	return swapWithNeighbour(items, id, -1);
}

/** Swaps the item with its next neighbour. No-op at the last position or for an unknown id. */
export function moveDown(items: readonly NavItem[], id: string): NavItem[] {
	return swapWithNeighbour(items, id, 1);
}

/** Flips the `visible` flag of the item with the given id. Natives and customs are both toggled. */
export function toggleVisible(items: readonly NavItem[], id: string): NavItem[] {
	return items.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item));
}

/** Removes the custom item with the given id. Natives are never removed, so they come back unchanged. */
export function removeCustom(items: readonly NavItem[], id: string): NavItem[] {
	return items.filter((item) => !(isCustomItem(item) && item.id === id));
}

/** Appends a custom item. Throws on a duplicate id, which is a programming error because generated ids are random. */
export function addCustom(items: readonly NavItem[], item: CustomItem): NavItem[] {
	if (items.some((existing) => existing.id === item.id)) {
		throw new Error(`Duplicate nav item id: ${item.id}`);
	}
	return [...items, item];
}

/** Puts a deleted custom item back at its original index (clamped to the list). Undo helper; a no-op if the id is already present. */
export function restoreCustom(items: readonly NavItem[], item: CustomItem, index: number): NavItem[] {
	if (items.some((existing) => existing.id === item.id)) return [...items];
	const at = Math.min(Math.max(index, 0), items.length);
	return [...items.slice(0, at), item, ...items.slice(at)];
}

/** Editable fields of a custom item. The id and kind never change. */
export type CustomEdit = Partial<Pick<CustomItem, 'commandId' | 'icon' | 'label'>>;

/** Merges an edit into the custom item with the given id. Natives and unknown ids are left unchanged. */
export function updateCustom(items: readonly NavItem[], id: string, edit: CustomEdit): NavItem[] {
	return items.map((item) => (isCustomItem(item) && item.id === id ? { ...item, ...edit } : item));
}

/** Returns settings with one device's list replaced by `change`'s result. The other device is kept as is. */
export function withDevice(
	settings: Settings,
	device: Device,
	change: (items: readonly NavItem[]) => NavItem[],
): Settings {
	return device === 'phone'
		? { ...settings, phone: change(settings.phone) }
		: { ...settings, tablet: change(settings.tablet) };
}

function swapWithNeighbour(items: readonly NavItem[], id: string, step: 1 | -1): NavItem[] {
	const from = items.findIndex((item) => item.id === id);
	const to = from + step;
	const next = [...items];
	const moved = items[from];
	const neighbour = items[to];
	if (moved === undefined || neighbour === undefined) return next;
	next[from] = neighbour;
	next[to] = moved;
	return next;
}

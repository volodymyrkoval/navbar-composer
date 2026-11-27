/**
 * Pin rules: reads and immutably writes the per-device pin flags (KD7). Plain data only.
 */

import type { Device, LayoutPins, PinEdge, Pins, Settings } from './settingsModel';

/** The pins of a layout that has none stored. */
export const NO_PINS: Readonly<LayoutPins> = Object.freeze({});

/** The layout pins of one device (`NO_PINS` when none are stored). */
export function pinsFor(settings: Settings, device: Device): LayoutPins {
	return settings.pins?.[device] ?? NO_PINS;
}

/** True only for a stored `true`. */
export function isPinned(pins: LayoutPins, edge: PinEdge): boolean {
	return pins[fieldOf(edge)] === true;
}

/** The ids a pin attaches to: a pinned start takes the first id, a pinned end the last. */
export interface PinnedEdgeIds { start: string | null; end: string | null }

/**
 * First / last of `ids` (visible, located, in visual order) for each pinned edge; one id with both pins → start only.
 */
export function pinnedEdgeIds(ids: readonly string[], pins: LayoutPins): PinnedEdgeIds {
	const start = isPinned(pins, 'start') ? (ids[0] ?? null) : null;
	const last = ids[ids.length - 1] ?? null;
	const end = isPinned(pins, 'end') && last !== start ? last : null;
	return { start, end };
}

/**
 * Returns new settings with one pin switched on or off. Never mutates the input.
 * Off deletes the field; an empty device entry and an empty `pins` key are removed, never left as `{}`.
 */
export function setPin(settings: Settings, device: Device, edge: PinEdge, on: boolean): Settings {
	const layout = withPinField(pinsFor(settings, device), fieldOf(edge), on);
	return withPins(settings, withDevicePins(settings.pins ?? {}, device, layout));
}

function fieldOf(edge: PinEdge): keyof LayoutPins {
	return edge === 'start' ? 'pinStart' : 'pinEnd';
}

function withPinField(layout: LayoutPins, field: keyof LayoutPins, on: boolean): LayoutPins {
	const next: LayoutPins = { ...layout };
	if (on) next[field] = true;
	else delete next[field];
	return next;
}

function withDevicePins(pins: Pins, device: Device, layout: LayoutPins): Pins {
	const next: Pins = { ...pins };
	if (Object.keys(layout).length === 0) delete next[device];
	else next[device] = layout;
	return next;
}

function withPins(settings: Settings, pins: Pins): Settings {
	const next: Settings = { ...settings };
	delete next.pins;
	if (Object.keys(pins).length > 0) next.pins = pins;
	return next;
}

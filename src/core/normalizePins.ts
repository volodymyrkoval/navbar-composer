/**
 * Turns the untrusted `pins` key of data.json into valid Pins (KD7 persistence boundary).
 */

import { isRecord } from './isRecord';
import { DEVICES, type LayoutPins, type Pins } from './settingsModel';

/** Untrusted `data.json.pins` → valid pins, or `undefined` when nothing valid remains. Never throws. */
export function normalizePins(raw: unknown): Pins | undefined {
	if (!isRecord(raw)) return undefined;
	const pins: Pins = {};
	for (const device of DEVICES) {
		const layout = normalizeLayoutPins(raw[device]);
		if (layout !== undefined) pins[device] = layout;
	}
	return Object.keys(pins).length > 0 ? pins : undefined;
}

function normalizeLayoutPins(raw: unknown): LayoutPins | undefined {
	if (!isRecord(raw)) return undefined;
	const layout: LayoutPins = {};
	if (typeof raw.pinStart === 'boolean') layout.pinStart = raw.pinStart;
	if (typeof raw.pinEnd === 'boolean') layout.pinEnd = raw.pinEnd;
	return Object.keys(layout).length > 0 ? layout : undefined;
}

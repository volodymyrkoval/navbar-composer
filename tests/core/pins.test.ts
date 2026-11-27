import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../../src/core/settingsModel';
import { isPinned, NO_PINS, pinnedEdgeIds, pinsFor, setPin } from '../../src/core/pins';

describe('pinsFor', () => {
	it('returns NO_PINS when the settings hold no pins', () => {
		expect(pinsFor(createDefaultSettings(), 'phone')).toBe(NO_PINS);
	});
});

describe('isPinned', () => {
	it('is false for a stored false', () => {
		expect(isPinned({ pinStart: false }, 'start')).toBe(false);
	});
});

describe('setPin', () => {
	it('turns a pin on for one device and keeps the item arrays by reference', () => {
		const defaults = createDefaultSettings();
		const result = setPin(defaults, 'phone', 'start', true);
		expect(result.pins).toStrictEqual({ phone: { pinStart: true } });
		expect(result.phone).toBe(defaults.phone);
		expect(result.tablet).toBe(defaults.tablet);
	});

	it('removes the pins key when the only pin is turned off again', () => {
		const defaults = createDefaultSettings();
		const pinned = setPin(defaults, 'phone', 'start', true);
		expect(setPin(pinned, 'phone', 'start', false)).toStrictEqual(defaults);
	});

	it('turning one pin off keeps the other pin of the same layout', () => {
		const both = setPin(setPin(createDefaultSettings(), 'phone', 'start', true), 'phone', 'end', true);
		expect(setPin(both, 'phone', 'start', false).pins).toStrictEqual({ phone: { pinEnd: true } });
	});

	it('turning a pin off when it is already absent leaves no pins key', () => {
		const defaults = createDefaultSettings();
		expect(setPin(defaults, 'phone', 'end', false)).toStrictEqual(defaults);
	});

	it('editing the tablet leaves the phone pins untouched', () => {
		const phonePinned = setPin(createDefaultSettings(), 'phone', 'start', true);
		const result = setPin(phonePinned, 'tablet', 'end', true);
		expect(result.pins).toStrictEqual({ phone: { pinStart: true }, tablet: { pinEnd: true } });
	});

	it('never mutates the input settings', () => {
		const input = setPin(createDefaultSettings(), 'phone', 'start', true);
		const snapshot = structuredClone(input);
		setPin(input, 'phone', 'start', false);
		setPin(input, 'tablet', 'end', true);
		expect(input).toStrictEqual(snapshot);
	});
});

describe('pinnedEdgeIds', () => {
	it('picks the first id for a pinned start edge', () => {
		expect(pinnedEdgeIds(['a', 'b', 'c'], { pinStart: true })).toStrictEqual({ start: 'a', end: null });
	});

	it('picks the last id for a pinned end edge', () => {
		expect(pinnedEdgeIds(['a', 'b', 'c'], { pinEnd: true })).toStrictEqual({ start: null, end: 'c' });
	});

	it('applies both pins to the first and last id', () => {
		expect(pinnedEdgeIds(['a', 'b', 'c'], { pinStart: true, pinEnd: true })).toStrictEqual({ start: 'a', end: 'c' });
	});

	it('keeps only the start pin when one visible id carries both', () => {
		expect(pinnedEdgeIds(['a'], { pinStart: true, pinEnd: true })).toStrictEqual({ start: 'a', end: null });
	});

	it('returns no ids when nothing is pinned', () => {
		expect(pinnedEdgeIds(['a', 'b', 'c'], NO_PINS)).toStrictEqual({ start: null, end: null });
	});

	it('returns no ids when there are no visible ids', () => {
		expect(pinnedEdgeIds([], { pinStart: true, pinEnd: true })).toStrictEqual({ start: null, end: null });
	});

	it('returns no start id for a stored false pin', () => {
		expect(pinnedEdgeIds(['a', 'b'], { pinStart: false })).toStrictEqual({ start: null, end: null });
	});
});

import { describe, expect, it } from 'vitest';
import { splitStored, toStoredData } from '../../src/core/storedData';
import { createDefaultSettings } from '../../src/core/settingsModel';
import { normalizeSettings } from '../../src/core/normalizeSettings';

describe('splitStored', () => {
	it.each([
		['null', null],
		['an array', []],
		['a string', 'x'],
	])('returns default settings and no extras for %s', (_label, raw) => {
		const { settings, extras } = splitStored(raw);
		expect(settings).toStrictEqual(createDefaultSettings());
		expect(extras).toStrictEqual({});
	});

	it('returns unknown top-level keys as extras and keeps them out of settings', () => {
		const extraValues = {
			'x-future-object': { nested: [1, { a: null }] },
			'x-future-flag': false,
			'x-future-null': null,
		};
		const raw = { ...createDefaultSettings(), ...extraValues };

		const { settings, extras } = splitStored(raw);

		expect(extras).toStrictEqual(extraValues);
		expect(settings).toStrictEqual(normalizeSettings(raw));
	});

	it('treats pins as a known key, not an extra', () => {
		const raw = { ...createDefaultSettings(), pins: { phone: { pinStart: true } }, 'x-future-a': 1 };

		const { extras } = splitStored(raw);

		expect(extras).toStrictEqual({ 'x-future-a': 1 });
	});

	it('never treats a known key with a garbage value as an extra', () => {
		const { extras } = splitStored({ version: 'x', phone: 3 });
		expect(extras).toStrictEqual({});
	});

	it('keeps a __proto__ key as an own extra without polluting the prototype', () => {
		const raw: unknown = JSON.parse('{"__proto__": {"polluted": true}}');

		const { extras } = splitStored(raw);

		expect(Object.prototype.hasOwnProperty.call(extras, '__proto__')).toBe(true);
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});
});

describe('toStoredData', () => {
	it('saves extras alongside the settings keys', () => {
		const settings = createDefaultSettings();
		const extras = { 'x-future-flag': true };

		expect(toStoredData(settings, extras)).toStrictEqual({ ...settings, 'x-future-flag': true });
	});

	it('saves exactly the settings when there are no extras', () => {
		const settings = createDefaultSettings();

		expect(toStoredData(settings, {})).toStrictEqual(settings);
	});

	it('lets settings win over extras that reuse a known key', () => {
		const settings = createDefaultSettings();
		const extras = { version: 99, phone: 'junk', tablet: [] };

		const saved = toStoredData(settings, extras);

		expect(saved.version).toBe(settings.version);
		expect(saved.phone).toStrictEqual(settings.phone);
		expect(saved.tablet).toStrictEqual(settings.tablet);
	});

	it('does not mutate its inputs', () => {
		const settings = createDefaultSettings();
		const extras = { 'x-future-flag': true };
		const settingsBefore = structuredClone(settings);
		const extrasBefore = structuredClone(extras);

		toStoredData(settings, extras);

		expect(settings).toStrictEqual(settingsBefore);
		expect(extras).toStrictEqual(extrasBefore);
	});

	it('round-trips the extras of a split back beside the settings', () => {
		const extraValues = {
			'x-future-object': { nested: [1, { a: null }] },
			'x-future-flag': false,
			'x-future-null': null,
		};
		const raw = { ...createDefaultSettings(), ...extraValues };
		const { settings, extras } = splitStored(raw);

		expect(toStoredData(settings, extras)).toStrictEqual({ ...extraValues, ...settings });
	});
});

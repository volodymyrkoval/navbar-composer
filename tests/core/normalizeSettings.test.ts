import { describe, expect, it } from 'vitest';
import { createDefaultSettings, type NavItem } from '../../src/core/settingsModel';
import { normalizeSettings } from '../../src/core/normalizeSettings';

const NATIVE_ORDER = ['back', 'forward', 'quick-switcher', 'new-tab', 'tabs', 'menu'] as const;

function natives(visible: boolean): NavItem[] {
	return NATIVE_ORDER.map((id) => ({ kind: 'native', id, visible }));
}

function stored(phone: unknown, tablet: unknown = []): unknown {
	return { version: 1, phone, tablet };
}

describe('normalizeSettings', () => {
	it('keeps valid stored settings unchanged', () => {
		const valid = {
			version: 1,
			phone: [
				{ kind: 'native', id: 'back', visible: false },
				{ kind: 'custom', id: 'custom-1', commandId: 'app:open-help', icon: 'help', label: 'Help', visible: true },
				{ kind: 'native', id: 'forward', visible: true },
				{ kind: 'native', id: 'quick-switcher', visible: true },
				{ kind: 'native', id: 'new-tab', visible: true },
				{ kind: 'native', id: 'tabs', visible: true },
				{ kind: 'native', id: 'menu', visible: true },
			],
			tablet: [
				{ kind: 'native', id: 'back', visible: true },
				{ kind: 'native', id: 'forward', visible: false },
				{ kind: 'native', id: 'quick-switcher', visible: false },
				{ kind: 'native', id: 'new-tab', visible: false },
				{ kind: 'native', id: 'tabs', visible: false },
				{ kind: 'native', id: 'menu', visible: false },
			],
		};

		expect(normalizeSettings(valid)).toEqual(valid);
	});

	it('falls back to the defaults when the stored value is not an object', () => {
		expect(normalizeSettings(undefined)).toEqual(createDefaultSettings());
		expect(normalizeSettings(null)).toEqual(createDefaultSettings());
		expect(normalizeSettings('x')).toEqual(createDefaultSettings());
	});

	it('restores the defaults for both devices when their lists are empty', () => {
		expect(normalizeSettings(stored([], []))).toEqual(createDefaultSettings());
	});

	it('drops entries that are not objects or have an unknown kind', () => {
		const result = normalizeSettings(stored([null, 42, { kind: 'bogus', id: 'x' }]));

		expect(result.phone).toEqual(natives(true));
	});

	it('drops native entries whose id is not a known native', () => {
		const result = normalizeSettings(stored([{ kind: 'native', id: 'share', visible: true }]));

		expect(result.phone).toEqual(natives(true));
	});

	it('keeps only the first entry for a repeated id', () => {
		const result = normalizeSettings(
			stored([
				{ kind: 'native', id: 'back', visible: false },
				{ kind: 'native', id: 'back', visible: true },
			]),
		);

		expect(result.phone[0]).toEqual({ kind: 'native', id: 'back', visible: false });
		expect(result.phone).toHaveLength(NATIVE_ORDER.length);
	});

	it('treats a native without a visible flag as visible', () => {
		const result = normalizeSettings(stored([{ kind: 'native', id: 'back' }]));

		expect(result.phone[0]).toEqual({ kind: 'native', id: 'back', visible: true });
	});

	it('uses the command id as the label of a custom item that has none', () => {
		const result = normalizeSettings(
			stored([{ kind: 'custom', id: 'custom-1', commandId: 'app:open-help', icon: 'help' }]),
		);

		expect(result.phone[0]).toEqual({
			kind: 'custom',
			id: 'custom-1',
			commandId: 'app:open-help',
			icon: 'help',
			label: 'app:open-help',
			visible: true,
		});
	});

	it('drops a custom item whose command id is not a string', () => {
		const result = normalizeSettings(
			stored([{ kind: 'custom', id: 'custom-1', commandId: 42, icon: 'help', label: 'Help' }]),
		);

		expect(result.phone).toEqual(natives(true));
	});

	it('drops a custom item whose icon is not a string', () => {
		const result = normalizeSettings(
			stored([{ kind: 'custom', id: 'custom-1', commandId: 'app:open-help', icon: 7, label: 'Help' }]),
		);

		expect(result.phone).toEqual(natives(true));
	});

	it('appends missing phone natives after the stored items, visible', () => {
		const result = normalizeSettings(stored([{ kind: 'native', id: 'menu', visible: false }]));

		expect(result.phone).toEqual([
			{ kind: 'native', id: 'menu', visible: false },
			...natives(true).slice(0, 5),
		]);
	});

	it('appends missing tablet natives hidden, after customs kept first', () => {
		const custom = { kind: 'custom', id: 'custom-1', commandId: 'app:open-help', icon: 'help', label: 'Help', visible: true };
		const result = normalizeSettings(stored([], [custom]));

		expect(result.tablet).toEqual([custom, ...natives(false)]);
	});

	it('keeps a stored tablet native visible when the user made it visible', () => {
		const result = normalizeSettings(stored([], [{ kind: 'native', id: 'tabs', visible: true }]));

		expect(result.tablet[0]).toEqual({ kind: 'native', id: 'tabs', visible: true });
	});

	it('forces the version to 1 and treats a non-array device list as empty', () => {
		const result = normalizeSettings({ version: 9, phone: 'x', tablet: {} });

		expect(result.version).toBe(1);
		expect(result.phone).toEqual(natives(true));
		expect(result.tablet).toEqual(natives(false));
	});

	it('passes valid stored pins through', () => {
		const result = normalizeSettings({ version: 1, phone: [], tablet: [], pins: { phone: { pinStart: true } } });

		expect(result).toStrictEqual({ ...createDefaultSettings(), pins: { phone: { pinStart: true } } });
	});

	it('omits the pins key when the stored pins hold nothing valid', () => {
		expect(normalizeSettings({ version: 1, phone: [], tablet: [], pins: 'x' })).toStrictEqual(createDefaultSettings());
		expect(normalizeSettings({ version: 1, phone: [], tablet: [], pins: {} })).toStrictEqual(createDefaultSettings());
	});

	it('omits the pins key for defaults', () => {
		expect(normalizeSettings(undefined)).toStrictEqual(createDefaultSettings());
	});
});

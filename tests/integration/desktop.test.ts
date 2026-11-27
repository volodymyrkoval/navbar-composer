import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSettings } from '../../src/core/settingsModel';
import { Notice } from '../__mocks__/obsidian';
import { buildNavbar } from '../fixtures/navbarFixture';
import { customItem, lastId, loadPlugin, resetEnvironment, savedSettings, withCustom } from './harness';

afterEach(() => {
	vi.restoreAllMocks();
	resetEnvironment();
});

describe('plugin on desktop', () => {
	it('registers the settings tab and renders nothing', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const navbar = buildNavbar();
		const pristine = navbar.outerHTML;

		const { plugin, settingTabs } = await loadPlugin({
			device: 'desktop',
			navbar,
			stored: withCustom(createDefaultSettings(), 'phone', customItem()),
		});
		await plugin.store.update((s) => withCustom(s, 'tablet', customItem({ id: 'c2' })));

		expect(settingTabs).toHaveLength(1);
		expect(navbar.outerHTML).toBe(pristine);
		expect(document.body.className).toBe('');
		expect(warn).not.toHaveBeenCalled();
	});

	it('still keeps and persists settings', async () => {
		const { plugin } = await loadPlugin({ device: 'desktop' });

		await plugin.store.update((s) => withCustom(s, 'phone', customItem()));

		expect(lastId(savedSettings(plugin), 'phone')).toBe('c1');
	});

	it('keeps unknown top-level keys when saving', async () => {
		const futureFlag = true;
		const futureObject = { a: [1, null] };
		const stored = { ...createDefaultSettings(), 'x-future-flag': futureFlag, 'x-future-object': futureObject };
		const { plugin } = await loadPlugin({ device: 'desktop', stored });

		await plugin.store.update((s) => withCustom(s, 'phone', customItem()));

		const saved = savedSettings(plugin) as unknown as Record<string, unknown>;
		expect(saved['x-future-flag']).toStrictEqual(futureFlag);
		expect(saved['x-future-object']).toStrictEqual(futureObject);
		expect(lastId(savedSettings(plugin), 'phone')).toBe('c1');
	});

	it('saves only the known keys when stored data is not an object', async () => {
		const { plugin } = await loadPlugin({ device: 'desktop', stored: [1, 2] });

		await plugin.store.update((s) => withCustom(s, 'phone', customItem()));

		expect(Object.keys(savedSettings(plugin) as unknown as Record<string, unknown>).sort()).toStrictEqual([
			'phone',
			'tablet',
			'version',
		]);
	});

	it('keeps the in-memory state and shows a Notice when saving fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { plugin } = await loadPlugin({ device: 'desktop' });
		(plugin as unknown as { __failSave: boolean }).__failSave = true;

		await plugin.store.update((s) => withCustom(s, 'phone', customItem()));

		expect(lastId(plugin.store.current, 'phone')).toBe('c1');
		expect(Notice.instances.map((n) => n.message)).toEqual(['Could not save the navbar layout.']);
	});

	it('unloads without error', async () => {
		const { plugin } = await loadPlugin({ device: 'desktop' });

		expect(() => plugin.unload()).not.toThrow();
	});
});

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

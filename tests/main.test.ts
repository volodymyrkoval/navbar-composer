import type { App, PluginManifest } from 'obsidian';
import { afterEach, describe, expect, it } from 'vitest';
import NavbarComposerPlugin from '../src/main';
import { Platform } from './__mocks__/obsidian';
import { createFakeApp } from './fakes/fakeApp';

afterEach(() => Platform.__reset());

function createPlugin(): NavbarComposerPlugin {
	const { app } = createFakeApp();
	return new NavbarComposerPlugin(app as unknown as App, {} as PluginManifest);
}

describe('NavbarComposerPlugin on desktop', () => {
	it('loads with default settings, registers the settings tab and unloads cleanly', async () => {
		const plugin = createPlugin();

		await plugin.onload();

		expect(plugin.store.current.phone).toHaveLength(6);
		expect((plugin as unknown as { settingTabs: unknown[] }).settingTabs).toHaveLength(1);
		expect(() => plugin.unload()).not.toThrow();
	});
});

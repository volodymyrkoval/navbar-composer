/**
 * Shared setup for the plugin integration tests: the real plugin on a fake app and the real navbar DOM fixture,
 * with only the Obsidian runtime replaced by the test mock.
 */
import type { App, PluginManifest } from 'obsidian';
import NavbarComposerPlugin from '../../src/main';
import { addCustom, withDevice } from '../../src/core/listOps';
import type { CustomItem, Device, Settings } from '../../src/core/settingsModel';
import { Notice, Platform } from '../__mocks__/obsidian';
import { createFakeApp, type FakeAppOptions } from '../fakes/fakeApp';

export type TestDevice = Device | 'desktop';

export interface LoadOptions extends FakeAppOptions {
	device: TestDevice;
	stored?: unknown;
}

export interface Loaded {
	plugin: NavbarComposerPlugin;
	harness: ReturnType<typeof createFakeApp>;
	/** Settings tabs registered through `addSettingTab` (a mock-only record). */
	settingTabs: unknown[];
}

export function setPlatform(device: TestDevice): void {
	Platform.__reset();
	if (device === 'phone') Object.assign(Platform, { isMobile: true, isPhone: true, isDesktop: false });
	if (device === 'tablet') Object.assign(Platform, { isMobile: true, isTablet: true, isDesktop: false });
}

/** Loads the plugin the way Obsidian does and waits for its async `onload` to finish. */
export async function loadPlugin({ device, stored = null, ...appOptions }: LoadOptions): Promise<Loaded> {
	setPlatform(device);
	const harness = createFakeApp(appOptions);
	// A note is open: on an empty tab the tablet bar never hides on scroll.
	harness.workspace.setActiveViewType('markdown');
	const plugin = new NavbarComposerPlugin(harness.app as unknown as App, {} as PluginManifest);
	(plugin as unknown as { __data: unknown }).__data = stored;
	plugin.load();
	await new Promise((resolve) => setTimeout(resolve, 0));
	return { plugin, harness, settingTabs: (plugin as unknown as { settingTabs: unknown[] }).settingTabs };
}

export function resetEnvironment(): void {
	Platform.__reset();
	Notice.reset();
	document.body.className = '';
	document.body.empty();
}

export function customItem(overrides: Partial<CustomItem> = {}): CustomItem {
	return { kind: 'custom', id: 'c1', commandId: 'app:go', icon: 'star', label: 'Go', visible: true, ...overrides };
}

export function withCustom(settings: Settings, device: Device, item: CustomItem): Settings {
	return withDevice(settings, device, (items) => addCustom(items, item));
}

/** What the plugin last wrote through `saveData` (the Plugin mock keeps it in `__data`). */
export function savedSettings(plugin: NavbarComposerPlugin): Settings {
	return (plugin as unknown as { __data: Settings }).__data;
}

export function lastId(settings: Settings, device: Device): string | undefined {
	return settings[device][settings[device].length - 1]?.id;
}

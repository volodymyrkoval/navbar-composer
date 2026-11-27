/**
 * Shared setup for the plugin integration tests: the real plugin on a fake app and the real navbar DOM fixture,
 * with only the Obsidian runtime replaced by the test mock.
 */
import { vi } from 'vitest';
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

/**
 * Replaces `requestAnimationFrame` with a queue the test drains by hand, so frames happen when the test says so.
 * Cancelled frames are dropped. The caller unstubs globals in `afterEach`.
 */
export function stubFrames(): { flush(): void; pending(): number } {
	const frames = new Map<number, FrameRequestCallback>();
	let nextId = 1;
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		const id = nextId++;
		frames.set(id, callback);
		return id;
	});
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		frames.delete(id);
	});
	return {
		flush() {
			for (const [id, callback] of [...frames]) {
				frames.delete(id);
				callback(0);
			}
		},
		pending: () => frames.size,
	};
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

/** The row holds 600px of buttons in a 300px box: jsdom lays nothing out, so the metrics are fixed here. */
export function overflowingRow(navbar: HTMLElement): HTMLElement {
	return rowWithMetrics(navbar, 600, 300);
}

/** Fixes the action row's `scrollWidth` and `clientWidth`, since jsdom has no layout. */
export function rowWithMetrics(navbar: HTMLElement, scrollWidth: number, clientWidth: number): HTMLElement {
	const row = navbar.querySelector<HTMLElement>('.mobile-navbar-actions')!;
	Object.defineProperty(row, 'scrollWidth', { value: scrollWidth, configurable: true });
	Object.defineProperty(row, 'clientWidth', { value: clientWidth, configurable: true });
	return row;
}

/** Keeps the last observer so a test can fire its callback, as the browser does after a layout change. */
export class FakeResizeObserver {
	static latest: FakeResizeObserver | undefined;

	constructor(readonly callback: ResizeObserverCallback) {
		FakeResizeObserver.latest = this;
	}

	observe(): void {
		// Nothing to record: the test only fires the callback.
	}

	disconnect(): void {
		// Nothing to release in the fake.
	}

	fire(): void {
		this.callback([], this as unknown as ResizeObserver);
	}
}

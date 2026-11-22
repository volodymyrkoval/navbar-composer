import { afterEach, describe, expect, it, vi } from 'vitest';
import { toggleVisible, withDevice } from '../../src/core/listOps';
import { createDefaultSettings, NATIVE_IDS } from '../../src/core/settingsModel';
import { buildNavbar } from '../fixtures/navbarFixture';
import { customItem, loadPlugin, resetEnvironment, withCustom } from './harness';

const SHOWN = 'navbar-composer-tablet-bar-shown';
const BAR_HIDDEN = 'navbar-composer-bar-hidden';

afterEach(() => {
	vi.restoreAllMocks();
	resetEnvironment();
});

const action = (navbar: HTMLElement, id: string) => navbar.querySelector<HTMLElement>(`.mobile-navbar-action-${id}`)!;
const showBack = (s: ReturnType<typeof createDefaultSettings>) => withDevice(s, 'tablet', (items) => toggleVisible(items, 'back'));
const flushObservers = async () => {
	await Promise.resolve();
	await Promise.resolve();
};

/** jsdom lays nothing out: fix the metrics so the scroller is tall and its bottom is far away. */
function rootScroller(): HTMLElement {
	const scroller = document.body.createDiv({ cls: ['workspace-split', 'mod-root'] }).createDiv();
	Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true });
	Object.defineProperty(scroller, 'clientHeight', { value: 100, configurable: true });
	return scroller;
}

function scrollTo(scroller: HTMLElement, top: number): void {
	scroller.scrollTop = top;
	scroller.dispatchEvent(new Event('scroll'));
}

/** The tracker treats a scroller's first event as an anchor without direction, so anchor first. */
async function tabletWithVisibleItem() {
	const navbar = buildNavbar();
	const scroller = rootScroller();
	const loaded = await loadPlugin({ device: 'tablet', navbar, stored: showBack(createDefaultSettings()) });
	scrollTo(scroller, 0);
	return { ...loaded, navbar, scroller };
}

describe('plugin on tablet', () => {
	it('leaves the iPad unchanged with default settings: natives hidden, no body class', async () => {
		const navbar = buildNavbar();

		await loadPlugin({ device: 'tablet', navbar });

		expect(NATIVE_IDS.every((id) => action(navbar, id).classList.contains('navbar-composer-hidden'))).toBe(true);
		expect(document.body.classList.contains(SHOWN)).toBe(false);
	});

	it('uses the tablet list, not the phone list', async () => {
		const navbar = buildNavbar();
		const phoneOnly = withDevice(createDefaultSettings(), 'phone', (items) => toggleVisible(items, 'back'));

		await loadPlugin({ device: 'tablet', navbar, stored: phoneOnly });

		expect(action(navbar, 'back').classList.contains('navbar-composer-hidden')).toBe(true);
		expect(document.body.classList.contains(SHOWN)).toBe(false);
	});

	it('shows the bar and unhides the item live when a native is made visible', async () => {
		const navbar = buildNavbar();
		const { plugin } = await loadPlugin({ device: 'tablet', navbar });

		await plugin.store.update(showBack);

		expect(document.body.classList.contains(SHOWN)).toBe(true);
		expect(action(navbar, 'back').classList.contains('navbar-composer-hidden')).toBe(false);
	});

	it('shows the bar and renders the button live when a custom button is added', async () => {
		const navbar = buildNavbar();
		const { plugin } = await loadPlugin({ device: 'tablet', navbar });

		await plugin.store.update((s) => withCustom(s, 'tablet', customItem()));

		expect(document.body.classList.contains(SHOWN)).toBe(true);
		expect(navbar.querySelectorAll('.navbar-composer-action')).toHaveLength(1);
	});

	it('hides the bar on scroll down and shows it again on scroll up', async () => {
		const { navbar, scroller } = await tabletWithVisibleItem();

		scrollTo(scroller, 300);
		expect(navbar.classList.contains(BAR_HIDDEN)).toBe(true);

		scrollTo(scroller, 200);
		expect(navbar.classList.contains(BAR_HIDDEN)).toBe(false);
	});

	it('shows the bar when the scroller reaches the bottom', async () => {
		const { navbar, scroller } = await tabletWithVisibleItem();
		scrollTo(scroller, 300);

		scrollTo(scroller, 900);

		expect(navbar.classList.contains(BAR_HIDDEN)).toBe(false);
	});

	it('hides the bar while the editing toolbar is open and shows it after', async () => {
		const { navbar } = await tabletWithVisibleItem();

		document.body.classList.add('mod-toolbar-open');
		await flushObservers();
		expect(navbar.classList.contains(BAR_HIDDEN)).toBe(true);

		document.body.classList.remove('mod-toolbar-open');
		await flushObservers();
		expect(navbar.classList.contains(BAR_HIDDEN)).toBe(false);
	});

	it('ignores scrolling outside the main editor area', async () => {
		const { navbar } = await tabletWithVisibleItem();
		const sidebar = document.body.createDiv({ cls: ['workspace-split', 'mod-left-split'] }).createDiv();

		scrollTo(sidebar, 0);
		scrollTo(sidebar, 300);

		expect(navbar.classList.contains(BAR_HIDDEN)).toBe(false);
	});

	it('removes both classes and restores the navbar on unload', async () => {
		const { plugin, navbar, scroller } = await tabletWithVisibleItem();
		scrollTo(scroller, 300);
		expect(navbar.classList.contains(BAR_HIDDEN)).toBe(true);

		plugin.unload();

		expect(document.body.classList.contains(SHOWN)).toBe(false);
		expect(navbar.classList.contains(BAR_HIDDEN)).toBe(false);
		expect(navbar.querySelector('.navbar-composer-hidden, .navbar-composer-action')).toBeNull();
	});

	it('warns once and does nothing when Obsidian exposes no navbar', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const { plugin } = await loadPlugin({ device: 'tablet', navbar: null, stored: showBack(createDefaultSettings()) });
		await plugin.store.update((s) => withCustom(s, 'tablet', customItem()));

		expect(warn).toHaveBeenCalledTimes(1);
		expect(document.body.classList.contains(SHOWN)).toBe(false);
	});

	it('registers the settings tab', async () => {
		const { settingTabs } = await loadPlugin({ device: 'tablet' });

		expect(settingTabs).toHaveLength(1);
	});
});

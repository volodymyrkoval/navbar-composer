import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSettings, NATIVE_IDS, type Settings } from '../../src/core/settingsModel';
import { toggleVisible, withDevice } from '../../src/core/listOps';
import { setPin } from '../../src/core/pins';
import { NAVBAR_EMPTY_CLASS, ORDER_VAR, PINNED_END_CLASS, PINNED_START_CLASS } from '../../src/navbar/navbarRenderer';
import { OVERFLOW_END_CLASS, SCROLL_MODE_CLASS } from '../../src/navbar/overflowIndicator';
import { SCROLL_TRACK_CLASS, THUMB_RATIO_VAR } from '../../src/navbar/scrollTrack';
import { Notice } from '../__mocks__/obsidian';
import { buildNavbar } from '../fixtures/navbarFixture';
import {
	customItem,
	FakeResizeObserver,
	lastId,
	loadPlugin,
	overflowingRow,
	resetEnvironment,
	rowWithMetrics,
	savedSettings,
	stubFrames,
	withCustom,
} from './harness';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	resetEnvironment();
});

const action = (navbar: HTMLElement, id: string) => navbar.querySelector<HTMLElement>(`.mobile-navbar-action-${id}`)!;
const customs = (navbar: HTMLElement): HTMLElement[] => Array.from(navbar.querySelectorAll<HTMLElement>('.navbar-composer-action'));

function storedWithBackHiddenAndCustom() {
	const hidden = withDevice(createDefaultSettings(), 'phone', (items) => toggleVisible(items, 'back'));
	return withCustom(hidden, 'phone', customItem());
}

function storedAllNativesHidden(): Settings {
	return NATIVE_IDS.reduce((settings, id) => withDevice(settings, 'phone', (items) => toggleVisible(items, id)), createDefaultSettings());
}

describe('plugin on phone', () => {
	it('applies stored settings on load: hides the right natives and inserts customs', async () => {
		const navbar = buildNavbar();

		await loadPlugin({ device: 'phone', navbar, stored: storedWithBackHiddenAndCustom() });

		expect(action(navbar, 'back').classList.contains('navbar-composer-hidden')).toBe(true);
		expect(action(navbar, 'forward').classList.contains('navbar-composer-hidden')).toBe(false);
		expect(customs(navbar).map((el) => el.dataset.navbarComposerCommand)).toEqual(['app:go']);
	});

	it('re-applies live when the store changes', async () => {
		const navbar = buildNavbar();
		const { plugin } = await loadPlugin({ device: 'phone', navbar });

		await plugin.store.update((s) => withCustom(withDevice(s, 'phone', (items) => toggleVisible(items, 'menu')), 'phone', customItem()));

		expect(action(navbar, 'menu').classList.contains('navbar-composer-hidden')).toBe(true);
		expect(customs(navbar)).toHaveLength(1);
	});

	it('persists store changes through saveData', async () => {
		const { plugin } = await loadPlugin({ device: 'phone' });

		await plugin.store.update((s) => withCustom(s, 'phone', customItem()));

		expect(lastId(savedSettings(plugin), 'phone')).toBe('c1');
	});

	it('runs the command of a tapped custom button', async () => {
		const navbar = buildNavbar();
		const { harness } = await loadPlugin({
			device: 'phone',
			navbar,
			commands: [{ id: 'app:go', name: 'Go' }],
			stored: withCustom(createDefaultSettings(), 'phone', customItem()),
		});

		customs(navbar)[0]!.click();

		expect(harness.commands!.executeCommandById).toHaveBeenCalledWith('app:go');
		expect(Notice.instances).toHaveLength(0);
	});

	it('shows a Notice when the tapped command does not exist', async () => {
		const navbar = buildNavbar();
		await loadPlugin({ device: 'phone', navbar, stored: withCustom(createDefaultSettings(), 'phone', customItem()) });

		customs(navbar)[0]!.click();

		expect(Notice.instances.map((n) => n.message)).toEqual(['Command not available: app:go']);
	});

	it('never intercepts taps on native buttons', async () => {
		const navbar = buildNavbar();
		const { harness } = await loadPlugin({ device: 'phone', navbar, commands: [{ id: 'app:go', name: 'Go' }] });
		const onClick = vi.fn((event: Event) => event.defaultPrevented);
		navbar.addEventListener('click', (event) => onClick(event));

		action(navbar, 'back').querySelector<HTMLElement>('.clickable-icon')!.click();

		expect(harness.commands!.executeCommandById).not.toHaveBeenCalled();
		expect(onClick).toHaveReturnedWith(false);
	});

	it('warns once and does not throw when Obsidian exposes no navbar', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const { plugin } = await loadPlugin({ device: 'phone', navbar: null });
		await plugin.store.update((s) => withCustom(s, 'phone', customItem()));

		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('restores the navbar on unload', async () => {
		const navbar = buildNavbar();
		const pristine = navbar.outerHTML;
		const { plugin } = await loadPlugin({ device: 'phone', navbar, stored: storedWithBackHiddenAndCustom() });
		expect(navbar.outerHTML).not.toBe(pristine);

		plugin.unload();

		expect(navbar.outerHTML).toBe(pristine);
	});

	it('never touches the tablet classes', async () => {
		const navbar = buildNavbar();
		const root = document.body.createDiv({ cls: ['workspace-split', 'mod-root'] });
		const scroller = root.createDiv();
		const { plugin } = await loadPlugin({ device: 'phone', navbar, stored: storedWithBackHiddenAndCustom() });
		await plugin.store.update((s) => withDevice(s, 'tablet', (items) => toggleVisible(items, 'back')));

		for (const top of [0, 50, 200]) {
			scroller.scrollTop = top;
			scroller.dispatchEvent(new Event('scroll'));
		}

		expect(document.body.classList.contains('navbar-composer-tablet-bar-shown')).toBe(false);
		expect(navbar.classList.contains('navbar-composer-bar-hidden')).toBe(false);
	});

	it('does not save on load', async () => {
		const stored = { ...createDefaultSettings(), 'x-future-flag': true };
		const { plugin } = await loadPlugin({ device: 'phone', stored });

		expect((plugin as unknown as { __data: unknown }).__data).toBe(stored);
	});

	it('registers the settings tab', async () => {
		const { settingTabs } = await loadPlugin({ device: 'phone' });

		expect(settingTabs).toHaveLength(1);
	});

	it('hides the bar on load when every phone item is hidden', async () => {
		const navbar = buildNavbar();

		await loadPlugin({ device: 'phone', navbar, stored: storedAllNativesHidden() });

		expect(navbar.classList.contains(NAVBAR_EMPTY_CLASS)).toBe(true);
	});

	it('shows the bar again when a hidden native is toggled back on', async () => {
		const navbar = buildNavbar();
		const { plugin } = await loadPlugin({ device: 'phone', navbar, stored: storedAllNativesHidden() });

		await plugin.store.update((s) => withDevice(s, 'phone', (items) => toggleVisible(items, 'back')));

		expect(navbar.classList.contains(NAVBAR_EMPTY_CLASS)).toBe(false);
	});

	it('keeps the bar shown when every native is hidden but one custom is visible', async () => {
		const navbar = buildNavbar();
		const stored = withCustom(storedAllNativesHidden(), 'phone', customItem());

		await loadPlugin({ device: 'phone', navbar, stored });

		expect(navbar.classList.contains(NAVBAR_EMPTY_CLASS)).toBe(false);
	});

	it('restores the pristine navbar on unload when the bar was hidden', async () => {
		const navbar = buildNavbar();
		const pristine = navbar.outerHTML;
		const { plugin } = await loadPlugin({ device: 'phone', navbar, stored: storedAllNativesHidden() });
		expect(navbar.classList.contains(NAVBAR_EMPTY_CLASS)).toBe(true);

		plugin.unload();

		expect(navbar.outerHTML).toBe(pristine);
	});

	describe('body.is-hidden-nav (owned by Obsidian)', () => {
		const HIDE_ON_SCROLL = 'is-hidden-nav';

		it('leaves a pre-set is-hidden-nav in place through load, toggle and unload', async () => {
			document.body.classList.add(HIDE_ON_SCROLL);
			const navbar = buildNavbar();
			const { plugin } = await loadPlugin({ device: 'phone', navbar, stored: storedAllNativesHidden() });
			expect(document.body.classList.contains(HIDE_ON_SCROLL)).toBe(true);

			await plugin.store.update((s) => withDevice(s, 'phone', (items) => toggleVisible(items, 'back')));
			expect(document.body.classList.contains(HIDE_ON_SCROLL)).toBe(true);

			plugin.unload();
			expect(document.body.classList.contains(HIDE_ON_SCROLL)).toBe(true);
		});

		it('never adds is-hidden-nav while hiding the bar', async () => {
			const navbar = buildNavbar();
			const { plugin } = await loadPlugin({ device: 'phone', navbar, stored: storedAllNativesHidden() });
			expect(navbar.classList.contains(NAVBAR_EMPTY_CLASS)).toBe(true);

			await plugin.store.update((s) => withDevice(s, 'phone', (items) => toggleVisible(items, 'back')));
			plugin.unload();

			expect(document.body.classList.contains(HIDE_ON_SCROLL)).toBe(false);
		});
	});

	describe('pinned edge buttons', () => {
		it('applies a stored start pin on load', async () => {
			const navbar = buildNavbar();
			const stored = setPin(createDefaultSettings(), 'phone', 'start', true);

			await loadPlugin({ device: 'phone', navbar, stored });

			expect(action(navbar, 'back').classList.contains(PINNED_START_CLASS)).toBe(true);
		});

		it('pins the last button live when the end pin is switched on', async () => {
			const navbar = buildNavbar();
			const { plugin } = await loadPlugin({ device: 'phone', navbar });

			await plugin.store.update((s) => setPin(s, 'phone', 'end', true));

			expect(action(navbar, 'menu').classList.contains(PINNED_END_CLASS)).toBe(true);
		});

		it('unpins live and drops the pins key from saved data when the last pin is switched off', async () => {
			const navbar = buildNavbar();
			const stored = setPin(createDefaultSettings(), 'phone', 'end', true);
			const { plugin } = await loadPlugin({ device: 'phone', navbar, stored });

			await plugin.store.update((s) => setPin(s, 'phone', 'end', false));

			expect(action(navbar, 'menu').classList.contains(PINNED_END_CLASS)).toBe(false);
			expect('pins' in savedSettings(plugin)).toBe(false);
		});
	});

	describe('overflow fade', () => {
		it('fades the row end once the resize observer reports the row', async () => {
			vi.stubGlobal('ResizeObserver', FakeResizeObserver);
			const navbar = buildNavbar();
			const row = overflowingRow(navbar);

			await loadPlugin({ device: 'phone', navbar });
			expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(false);

			FakeResizeObserver.latest!.fire();

			expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(true);
		});

		it('restores the pristine navbar on unload after the fade and both pins were applied', async () => {
			vi.stubGlobal('ResizeObserver', FakeResizeObserver);
			const navbar = buildNavbar();
			const pristine = navbar.outerHTML;
			const row = overflowingRow(navbar);
			const stored = setPin(setPin(createDefaultSettings(), 'phone', 'start', true), 'phone', 'end', true);
			const { plugin } = await loadPlugin({ device: 'phone', navbar, stored });
			FakeResizeObserver.latest!.fire();
			expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(true);

			plugin.unload();

			expect(navbar.outerHTML).toBe(pristine);
		});
	});

	describe('scroll track', () => {
		it('shows one track in the pill while the row overflows, never inside the row', async () => {
			vi.stubGlobal('ResizeObserver', FakeResizeObserver);
			stubFrames();
			const navbar = buildNavbar();
			const row = overflowingRow(navbar);
			await loadPlugin({ device: 'phone', navbar });

			FakeResizeObserver.latest!.fire();

			const tracks = navbar.querySelectorAll(`:scope > .${SCROLL_TRACK_CLASS}`);
			expect(tracks).toHaveLength(1);
			expect(row.querySelector(`.${SCROLL_TRACK_CLASS}`)).toBeNull();
			expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(true);
			expect((tracks[0] as HTMLElement).style.getPropertyValue(THUMB_RATIO_VAR)).toBe('0.5');
		});

		it('hides the fade and the thumb when the row fits', async () => {
			vi.stubGlobal('ResizeObserver', FakeResizeObserver);
			stubFrames();
			const navbar = buildNavbar();
			const row = rowWithMetrics(navbar, 300, 300);
			await loadPlugin({ device: 'phone', navbar });

			FakeResizeObserver.latest!.fire();

			const track = navbar.querySelector<HTMLElement>(`:scope > .${SCROLL_TRACK_CLASS}`)!;
			expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(false);
			expect(track.style.getPropertyValue(THUMB_RATIO_VAR)).toBe('');
		});

		it('leaves pins, order and the row untouched by the track', async () => {
			vi.stubGlobal('ResizeObserver', FakeResizeObserver);
			stubFrames();
			const navbar = buildNavbar();
			overflowingRow(navbar);
			const stored = withCustom(
				setPin(setPin(createDefaultSettings(), 'phone', 'start', true), 'phone', 'end', true),
				'phone',
				customItem(),
			);
			await loadPlugin({ device: 'phone', navbar, stored });

			FakeResizeObserver.latest!.fire();

			const track = navbar.querySelector<HTMLElement>(`:scope > .${SCROLL_TRACK_CLASS}`)!;
			expect(action(navbar, 'back').classList.contains(PINNED_START_CLASS)).toBe(true);
			expect(customs(navbar)[0]!.classList.contains(PINNED_END_CLASS)).toBe(true);
			expect(track.classList.contains(PINNED_START_CLASS)).toBe(false);
			expect(track.classList.contains(PINNED_END_CLASS)).toBe(false);
			for (const [index, item] of stored.phone.entries()) {
				if (!item.visible) continue;
				const el = item.kind === 'native' ? action(navbar, item.id) : customs(navbar)[0]!;
				expect(el.style.getPropertyValue(ORDER_VAR)).toBe(String(index));
			}
		});

		it('restores the pristine navbar on unload with pins, a scrolled row and a pending frame', async () => {
			vi.stubGlobal('ResizeObserver', FakeResizeObserver);
			const frames = stubFrames();
			const navbar = buildNavbar();
			const pristine = navbar.outerHTML;
			const row = overflowingRow(navbar);
			const stored = setPin(setPin(createDefaultSettings(), 'phone', 'start', true), 'phone', 'end', true);
			const { plugin } = await loadPlugin({ device: 'phone', navbar, stored });
			FakeResizeObserver.latest!.fire();
			frames.flush();
			row.scrollLeft = 150;
			row.dispatchEvent(new Event('scroll'));
			expect(frames.pending()).toBe(1);

			plugin.unload();

			expect(navbar.outerHTML).toBe(pristine);
			expect(frames.pending()).toBe(0);
		});
	});
});

describe('plugin on phone: scroll mode', () => {
	it('marks the row when eight visible items cannot fit a 300px row, and restores the navbar on unload', async () => {
		vi.stubGlobal('ResizeObserver', FakeResizeObserver);
		const navbar = buildNavbar();
		const pristine = navbar.outerHTML;
		const row = rowWithMetrics(navbar, 300, 300);
		const stored = withCustom(withCustom(createDefaultSettings(), 'phone', customItem({ id: 'c1' })), 'phone', customItem({ id: 'c2' }));
		const { plugin } = await loadPlugin({ device: 'phone', navbar, stored });

		FakeResizeObserver.latest!.fire();
		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(true);

		plugin.unload();

		expect(navbar.outerHTML).toBe(pristine);
	});
});

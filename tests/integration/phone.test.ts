import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSettings } from '../../src/core/settingsModel';
import { toggleVisible, withDevice } from '../../src/core/listOps';
import { Notice } from '../__mocks__/obsidian';
import { buildNavbar } from '../fixtures/navbarFixture';
import { customItem, lastId, loadPlugin, resetEnvironment, savedSettings, withCustom } from './harness';

afterEach(() => {
	vi.restoreAllMocks();
	resetEnvironment();
});

const action = (navbar: HTMLElement, id: string) => navbar.querySelector<HTMLElement>(`.mobile-navbar-action-${id}`)!;
const customs = (navbar: HTMLElement): HTMLElement[] => Array.from(navbar.querySelectorAll<HTMLElement>('.navbar-composer-action'));

function storedWithBackHiddenAndCustom() {
	const hidden = withDevice(createDefaultSettings(), 'phone', (items) => toggleVisible(items, 'back'));
	return withCustom(hidden, 'phone', customItem());
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

	it('registers the settings tab', async () => {
		const { settingTabs } = await loadPlugin({ device: 'phone' });

		expect(settingTabs).toHaveLength(1);
	});
});

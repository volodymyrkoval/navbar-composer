import type { App } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { NATIVE_IDS, type NavItem } from '../../src/core/settingsModel';
import { NavbarController } from '../../src/navbar/navbarController';
import { NavbarRenderer } from '../../src/navbar/navbarRenderer';
import { CommandRunner } from '../../src/platform/commandRunner';
import { createObsidianInternals } from '../../src/platform/obsidianInternals';
import { createFakeApp } from '../fakes/fakeApp';
import { buildNavbar } from '../fixtures/navbarFixture';

function nativeItems(hidden: readonly string[] = []): NavItem[] {
	return NATIVE_IDS.map((id) => ({ kind: 'native', id, visible: !hidden.includes(id) }));
}

/** A controller wired to a fake app whose navbar is `navbar` (`null` = Obsidian exposes none). */
function setup(navbar: HTMLElement | null, items: readonly NavItem[] = nativeItems()) {
	const { app, commands } = createFakeApp({ navbar, commands: [{ id: 'app:go-back', name: 'Go back' }] });
	const internals = createObsidianInternals(app as unknown as App);
	const warn = vi.fn<(message: string) => void>();
	const renderer = new NavbarRenderer();
	const runner = new CommandRunner(internals.commands);
	const controller = new NavbarController({ internals, renderer, runner, warn }, items);
	return { controller, warn, renderer, runner, commands };
}

describe('NavbarController lifecycle', () => {
	it('applies the items to the navbar when loaded', () => {
		const navbar = buildNavbar();
		const { controller } = setup(navbar, nativeItems(['back']));

		controller.load();

		expect(navbar.querySelector('.mobile-navbar-action-back')?.classList.contains('navbar-composer-hidden')).toBe(true);
	});

	it('does nothing and warns exactly once when Obsidian exposes no navbar (AC12)', () => {
		const { controller, warn, renderer } = setup(null);
		const apply = vi.spyOn(renderer, 'apply');

		controller.load();
		controller.unload();

		expect(apply).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('Navbar Composer: mobile navbar not found; layout disabled.');
	});

	it('restores the navbar to its original markup when unloaded', () => {
		const navbar = buildNavbar();
		const original = navbar.outerHTML;
		const custom: NavItem = { kind: 'custom', id: 'c1', commandId: 'app:go-back', icon: 'arrow-left', label: 'Go back', visible: true };
		const { controller } = setup(navbar, [...nativeItems(['back']), custom]);
		controller.load();
		expect(navbar.outerHTML).not.toBe(original);

		controller.unload();

		expect(navbar.outerHTML).toBe(original);
	});

	it('does not warn when every native is identified', () => {
		const { controller, warn } = setup(buildNavbar());

		controller.load();

		expect(warn).not.toHaveBeenCalled();
	});

	it('warns once, listing the natives it could not identify, even across reloads', () => {
		const { controller, warn } = setup(buildNavbar({ count: 5 }));

		controller.load();
		controller.unload();
		controller.load();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('Navbar Composer: could not identify native buttons: menu.');
	});
});

/** MutationObserver callbacks are delivered as microtasks; let them (and anything they trigger) run. */
async function flushObserver(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

function actionsRow(navbar: HTMLElement): HTMLElement {
	const row = navbar.querySelector<HTMLElement>('.mobile-navbar-actions');
	if (row === null) throw new Error('fixture has no actions row');
	return row;
}

describe('NavbarController observer', () => {
	it('re-applies the layout when Obsidian rebuilds the native actions', async () => {
		const navbar = buildNavbar();
		const { controller } = setup(navbar, nativeItems(['back']));
		controller.load();

		actionsRow(navbar).replaceChildren(...Array.from(actionsRow(buildNavbar()).children));
		await flushObserver();

		expect(navbar.querySelector('.mobile-navbar-action-back')?.classList.contains('navbar-composer-hidden')).toBe(true);
	});

	it('re-applies the hidden class after Obsidian wipes the className of a native', async () => {
		const navbar = buildNavbar();
		const { controller } = setup(navbar, nativeItems(['back']));
		controller.load();
		const back = navbar.querySelector<HTMLElement>('.mobile-navbar-action-back')!;

		back.className = 'mobile-navbar-action mobile-navbar-action-back';
		await flushObserver();

		expect(back.classList.contains('navbar-composer-hidden')).toBe(true);
	});

	it('renders once and writes nothing when a foreign class is added to the container', async () => {
		const navbar = buildNavbar();
		const { controller, renderer } = setup(navbar, nativeItems(['back']));
		controller.load();
		const apply = vi.spyOn(renderer, 'apply');
		const records: MutationRecord[] = [];
		const writes = new MutationObserver((batch) => records.push(...batch));
		writes.observe(navbar, { attributes: true, childList: true, subtree: true });

		navbar.classList.add('some-foreign-class');
		await flushObserver();

		expect(apply).toHaveBeenCalledTimes(1);
		// The foreign class itself is the only mutation: the re-render added none of its own.
		expect(records).toHaveLength(1);
	});

	it('renders a bounded number of times per external mutation, without looping', async () => {
		const navbar = buildNavbar();
		const custom: NavItem = { kind: 'custom', id: 'c1', commandId: 'app:go-back', icon: 'arrow-left', label: 'Go back', visible: true };
		const { controller, renderer } = setup(navbar, [...nativeItems(['back']), custom]);
		controller.load();
		const apply = vi.spyOn(renderer, 'apply');

		actionsRow(navbar).replaceChildren(...Array.from(actionsRow(buildNavbar()).children));
		await flushObserver();
		await flushObserver();

		// The render's own writes are discarded by takeRecords, so they must not queue a second render.
		expect(apply).toHaveBeenCalledTimes(1);
	});

	it('stops re-applying once unloaded', async () => {
		const navbar = buildNavbar();
		const { controller, renderer } = setup(navbar, nativeItems(['back']));
		controller.load();
		controller.unload();
		const apply = vi.spyOn(renderer, 'apply');

		navbar.classList.add('late-change');
		await flushObserver();

		expect(apply).not.toHaveBeenCalled();
		expect(navbar.querySelector('.mobile-navbar-action-back')?.classList.contains('navbar-composer-hidden')).toBe(false);
	});
});

const CUSTOM: NavItem = { kind: 'custom', id: 'c1', commandId: 'app:go-back', icon: 'arrow-left', label: 'Go back', visible: true };

function customInner(navbar: HTMLElement): HTMLElement {
	const inner = navbar.querySelector<HTMLElement>('.navbar-composer-action > .clickable-icon');
	if (inner === null) throw new Error('no custom button rendered');
	return inner;
}

function tap(target: Element): MouseEvent {
	const event = new MouseEvent('click', { bubbles: true, cancelable: true });
	target.dispatchEvent(event);
	return event;
}

describe('NavbarController taps', () => {
	it('runs the command of a custom button tapped on its inner icon and prevents the default action', () => {
		const navbar = buildNavbar();
		const { controller, commands } = setup(navbar, [...nativeItems(), CUSTOM]);
		controller.load();

		const event = tap(customInner(navbar));

		expect(commands?.executeCommandById).toHaveBeenCalledExactlyOnceWith('app:go-back');
		expect(event.defaultPrevented).toBe(true);
	});

	it('does nothing of its own when a native button is tapped, inner icon included', () => {
		const navbar = buildNavbar();
		const { controller, commands, runner } = setup(navbar, [...nativeItems(), CUSTOM]);
		const run = vi.spyOn(runner, 'run');
		controller.load();
		const back = navbar.querySelector<HTMLElement>('.mobile-navbar-action-back')!;

		const events = [tap(back), tap(back.querySelector('.clickable-icon')!)];

		expect(run).not.toHaveBeenCalled();
		expect(commands?.executeCommandById).not.toHaveBeenCalled();
		expect(events.map((event) => event.defaultPrevented)).toEqual([false, false]);
	});

	it('lets the tap keep propagating to ancestors', () => {
		const host = document.createElement('div');
		const navbar = buildNavbar();
		host.append(navbar);
		const { controller } = setup(navbar, [...nativeItems(), CUSTOM]);
		controller.load();
		const ancestorListener = vi.fn();
		host.addEventListener('click', ancestorListener);

		tap(customInner(navbar));

		expect(ancestorListener).toHaveBeenCalledTimes(1);
	});

	it('stops listening for taps once unloaded', () => {
		const navbar = buildNavbar();
		const { controller, commands } = setup(navbar, [...nativeItems(), CUSTOM]);
		controller.load();
		const inner = customInner(navbar);
		controller.unload();
		navbar.querySelector('.mobile-navbar-actions')!.append(inner.parentElement!);

		tap(inner);

		expect(commands?.executeCommandById).not.toHaveBeenCalled();
	});
});

describe('NavbarController setItems', () => {
	it('re-renders the navbar live with the new items (AC10)', () => {
		const navbar = buildNavbar();
		const { controller } = setup(navbar, nativeItems(['back']));
		controller.load();

		controller.setItems([...nativeItems(['forward']), CUSTOM]);

		expect(navbar.querySelector('.mobile-navbar-action-back')?.classList.contains('navbar-composer-hidden')).toBe(false);
		expect(navbar.querySelector('.mobile-navbar-action-forward')?.classList.contains('navbar-composer-hidden')).toBe(true);
		expect(navbar.querySelectorAll('.navbar-composer-action')).toHaveLength(1);
	});

	it('uses the new items for later external re-renders', async () => {
		const navbar = buildNavbar();
		const { controller } = setup(navbar, nativeItems(['back']));
		controller.load();
		controller.setItems(nativeItems(['forward']));

		navbar.querySelector<HTMLElement>('.mobile-navbar-action-forward')!.className = 'mobile-navbar-action mobile-navbar-action-forward';
		await flushObserver();

		expect(navbar.querySelector('.mobile-navbar-action-forward')?.classList.contains('navbar-composer-hidden')).toBe(true);
	});

	it('applies items set before load once loaded', () => {
		const navbar = buildNavbar();
		const { controller } = setup(navbar, nativeItems());

		controller.setItems(nativeItems(['menu']));
		controller.load();

		expect(navbar.querySelector('.mobile-navbar-action-menu')?.classList.contains('navbar-composer-hidden')).toBe(true);
	});

	it('is a harmless no-op when the navbar is missing', () => {
		const { controller, renderer } = setup(null);
		const apply = vi.spyOn(renderer, 'apply');
		controller.load();

		controller.setItems(nativeItems(['back']));

		expect(apply).not.toHaveBeenCalled();
	});

	it('does not render after unload', () => {
		const navbar = buildNavbar();
		const original = navbar.outerHTML;
		const { controller } = setup(navbar, nativeItems());
		controller.load();
		controller.unload();

		controller.setItems(nativeItems(['back']));

		expect(navbar.outerHTML).toBe(original);
	});
});

import type { App, Workspace } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NATIVE_IDS, type NavItem } from '../../src/core/settingsModel';
import { ScrollDeltaTracker } from '../../src/core/scrollTracker';
import { createObsidianInternals } from '../../src/platform/obsidianInternals';
import { BAR_HIDDEN_CLASS, TABLET_BAR_SHOWN_CLASS, TabletVisibilityController } from '../../src/tablet/tabletVisibilityController';
import { ToolbarOpenWatcher } from '../../src/tablet/toolbarOpenWatcher';
import { createFakeApp } from '../fakes/fakeApp';
import { buildNavbar } from '../fixtures/navbarFixture';

function nativeItems(visible: readonly string[] = NATIVE_IDS): NavItem[] {
	return NATIVE_IDS.map((id) => ({ kind: 'native', id, visible: visible.includes(id) }));
}

const controllers: TabletVisibilityController[] = [];

afterEach(() => {
	controllers.splice(0).forEach((controller) => controller.unload());
});

/** A controller on a fake app with a note open (not an empty tab) whose navbar is `navbar` (`null` = Obsidian exposes none); loading is left to the test. */
function setup(navbar: HTMLElement | null, items: readonly NavItem[] = nativeItems()) {
	const { app, workspace } = createFakeApp({ navbar });
	workspace.setActiveViewType('markdown');
	const internals = createObsidianInternals(app as unknown as App);
	const controller = new TabletVisibilityController(
		{
			internals,
			workspace: workspace as unknown as Workspace,
			doc: document,
			tracker: new ScrollDeltaTracker(),
			toolbar: new ToolbarOpenWatcher(document.body),
		},
		items,
	);
	controllers.push(controller);
	return { controller, workspace };
}

/** A scrollable element in jsdom, which lays nothing out: its metrics are fixed here so the bottom is far away. */
function addScroller(parent: HTMLElement): HTMLElement {
	const scroller = parent.createDiv();
	Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true });
	Object.defineProperty(scroller, 'clientHeight', { value: 100, configurable: true });
	return scroller;
}

function rootScroller(): HTMLElement {
	const split = document.body.createDiv({ cls: ['workspace-split', 'mod-root'] });
	return addScroller(split);
}

function scrollTo(scroller: HTMLElement, top: number): void {
	scroller.scrollTop = top;
	scroller.dispatchEvent(new Event('scroll'));
}

describe('TabletVisibilityController scrolling', () => {
	afterEach(() => {
		document.body.className = '';
		document.body.empty();
	});

	it('hides the bar on a downward scroll in the main editor area', () => {
		const navbar = buildNavbar();
		const scroller = rootScroller();
		setup(navbar).controller.load();
		scrollTo(scroller, 0);

		scrollTo(scroller, 20);

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(true);
	});
});

describe('TabletVisibilityController scrolling (more)', () => {
	afterEach(() => {
		document.body.className = '';
		document.body.empty();
	});

	function loadedOnScrolledAwayBar() {
		const navbar = buildNavbar();
		const scroller = rootScroller();
		setup(navbar).controller.load();
		scrollTo(scroller, 0);
		scrollTo(scroller, 20);
		return { navbar, scroller };
	}

	it('shows the bar again on an upward scroll', () => {
		const { navbar, scroller } = loadedOnScrolledAwayBar();

		scrollTo(scroller, 0);

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});

	it('shows the bar when the scroll reaches the bottom, even moving down', () => {
		const { navbar, scroller } = loadedOnScrolledAwayBar();

		scrollTo(scroller, 900);

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});

	it('ignores scrolling outside the main editor area', () => {
		const navbar = buildNavbar();
		const sidebar = addScroller(document.body.createDiv({ cls: ['workspace-split', 'mod-left-split'] }));
		setup(navbar).controller.load();
		scrollTo(sidebar, 0);

		scrollTo(sidebar, 50);

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});

	it('ignores scroll movement below the jitter threshold', () => {
		const navbar = buildNavbar();
		const scroller = rootScroller();
		setup(navbar).controller.load();
		scrollTo(scroller, 0);

		scrollTo(scroller, 5);

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});

	it('removes the hidden class when unloaded', () => {
		const { navbar } = loadedOnScrolledAwayBar();
		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(true);
		controllers[0]?.unload();

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});

	it('stops reacting to scrolling after unload', () => {
		const { navbar, scroller } = loadedOnScrolledAwayBar();
		controllers[0]?.unload();

		scrollTo(scroller, 200);

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});
});

describe('TabletVisibilityController initial state', () => {
	afterEach(() => {
		document.body.className = '';
		document.body.empty();
	});

	it('starts hidden when the editing toolbar is already open', () => {
		const navbar = buildNavbar();
		document.body.classList.add('mod-toolbar-open');

		setup(navbar).controller.load();

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(true);
	});

	it('keeps the bar shown while scrolling on an empty tab', () => {
		const navbar = buildNavbar();
		const scroller = rootScroller();
		const { controller, workspace } = setup(navbar);
		workspace.setActiveViewType('empty');
		controller.load();
		scrollTo(scroller, 0);

		scrollTo(scroller, 20);

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});
});

describe('TabletVisibilityController shown class', () => {
	afterEach(() => {
		document.body.className = '';
	});

	it('adds the shown class to body when an item is visible', () => {
		const { controller } = setup(buildNavbar(), nativeItems(['back']));

		controller.load();

		expect(document.body.classList.contains(TABLET_BAR_SHOWN_CLASS)).toBe(true);
	});

	it('leaves body alone when every item is hidden (tablet defaults)', () => {
		const { controller } = setup(buildNavbar(), nativeItems([]));

		controller.load();

		expect(document.body.classList.contains(TABLET_BAR_SHOWN_CLASS)).toBe(false);
	});

	it('removes the shown class when unloaded', () => {
		const { controller } = setup(buildNavbar(), nativeItems(['back']));
		controller.load();

		controller.unload();

		expect(document.body.classList.contains(TABLET_BAR_SHOWN_CLASS)).toBe(false);
	});

	it('does nothing and stays silent when Obsidian exposes no navbar (AC12)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { controller } = setup(null, nativeItems(['back']));

		expect(() => {
			controller.load();
			controller.unload();
		}).not.toThrow();

		expect(document.body.classList.contains(TABLET_BAR_SHOWN_CLASS)).toBe(false);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

/** Lets the body MutationObserver deliver its records; jsdom delivers them asynchronously. */
async function flushObserver(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

describe('TabletVisibilityController editing toolbar', () => {
	afterEach(() => {
		document.body.className = '';
		document.body.empty();
	});

	it('hides the bar while the editing toolbar is open, even on an empty tab, and shows it again on close', async () => {
		const navbar = buildNavbar();
		const { controller, workspace } = setup(navbar);
		workspace.setActiveViewType('empty');
		controller.load();

		document.body.classList.add('mod-toolbar-open');
		await flushObserver();
		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(true);

		document.body.classList.remove('mod-toolbar-open');
		await flushObserver();
		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});

	it('changes nothing when the toolbar opens after unload', async () => {
		const navbar = buildNavbar();
		const { controller } = setup(navbar);
		controller.load();
		controller.unload();

		document.body.classList.add('mod-toolbar-open');
		await flushObserver();

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});
});

describe('TabletVisibilityController context changes', () => {
	afterEach(() => {
		document.body.className = '';
		document.body.empty();
	});

	it.each(['active-leaf-change', 'file-open'])('shows the bar again when %s opens an empty tab', (eventName) => {
		const navbar = buildNavbar();
		const scroller = rootScroller();
		const { controller, workspace } = setup(navbar);
		controller.load();
		scrollTo(scroller, 0);
		scrollTo(scroller, 20);
		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(true);

		workspace.setActiveViewType('empty');
		workspace.trigger(eventName);

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});

	it('starts scroll tracking afresh after a context change', () => {
		const navbar = buildNavbar();
		const scroller = rootScroller();
		const { controller, workspace } = setup(navbar);
		controller.load();
		scrollTo(scroller, 500);
		workspace.trigger('active-leaf-change');

		scrollTo(scroller, 520);

		expect(navbar.classList.contains(BAR_HIDDEN_CLASS)).toBe(false);
	});
});

describe('TabletVisibilityController setItems', () => {
	afterEach(() => {
		document.body.className = '';
	});

	it('adds and removes the shown class live as items become visible and hidden (AC10)', () => {
		const { controller } = setup(buildNavbar(), nativeItems([]));
		controller.load();

		controller.setItems(nativeItems(['back']));
		expect(document.body.classList.contains(TABLET_BAR_SHOWN_CLASS)).toBe(true);

		controller.setItems(nativeItems([]));
		expect(document.body.classList.contains(TABLET_BAR_SHOWN_CLASS)).toBe(false);
	});

	it('applies the latest items on load when set before it', () => {
		const { controller } = setup(buildNavbar(), nativeItems([]));
		controller.setItems(nativeItems(['back']));

		controller.load();

		expect(document.body.classList.contains(TABLET_BAR_SHOWN_CLASS)).toBe(true);
	});

	it('does nothing after unload or without a navbar', () => {
		const unloaded = setup(buildNavbar(), nativeItems([])).controller;
		unloaded.load();
		unloaded.unload();
		const missing = setup(null, nativeItems([])).controller;
		missing.load();

		unloaded.setItems(nativeItems(['back']));
		missing.setItems(nativeItems(['back']));

		expect(document.body.classList.contains(TABLET_BAR_SHOWN_CLASS)).toBe(false);
	});
});

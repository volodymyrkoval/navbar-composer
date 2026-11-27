import type { App } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { NATIVE_IDS, type LayoutPins, type NavItem } from '../../src/core/settingsModel';
import { NavbarController } from '../../src/navbar/navbarController';
import { NavbarRenderer } from '../../src/navbar/navbarRenderer';
import type { RequestFrame } from '../../src/dom/requestFrame';
import type { ObserveResize } from '../../src/dom/observeResize';
import { OverflowIndicator } from '../../src/navbar/overflowIndicator';
import { SCROLL_TRACK_CLASS, ScrollTrack, THUMB_PROGRESS_VAR } from '../../src/navbar/scrollTrack';
import { CommandRunner } from '../../src/platform/commandRunner';
import { createObsidianInternals } from '../../src/platform/obsidianInternals';
import { createFakeApp } from '../fakes/fakeApp';
import { buildNavbar } from '../fixtures/navbarFixture';

function nativeItems(hidden: readonly string[] = []): NavItem[] {
	return NATIVE_IDS.map((id) => ({ kind: 'native', id, visible: !hidden.includes(id) }));
}

interface SetupOptions {
	pins?: LayoutPins;
	overflow?: OverflowIndicator;
}

/** A controller wired to a fake app whose navbar is `navbar` (`null` = Obsidian exposes none). */
function setup(navbar: HTMLElement | null, items: readonly NavItem[] = nativeItems(), options: SetupOptions = {}) {
	const { app, commands } = createFakeApp({ navbar, commands: [{ id: 'app:go-back', name: 'Go back' }] });
	const internals = createObsidianInternals(app as unknown as App);
	const warn = vi.fn<(message: string) => void>();
	const renderer = new NavbarRenderer();
	const runner = new CommandRunner(internals.commands);
	const overflow = options.overflow ?? new OverflowIndicator(() => () => {});
	const controller = new NavbarController({ internals, renderer, runner, overflow, warn }, items, options.pins);
	return { controller, warn, renderer, runner, commands, overflow };
}

describe('NavbarController pins', () => {
	it('passes the pins to the renderer when loaded', () => {
		const navbar = buildNavbar();
		const items = nativeItems();
		const pins = { pinStart: true };
		const { controller, renderer } = setup(navbar, items, { pins });
		const apply = vi.spyOn(renderer, 'apply');

		controller.load();

		expect(apply).toHaveBeenCalledWith(navbar, items, pins);
	});

	it('passes the new pins to the renderer on every setItems', () => {
		const navbar = buildNavbar();
		const { controller, renderer } = setup(navbar, nativeItems());
		controller.load();
		const apply = vi.spyOn(renderer, 'apply');
		const items = nativeItems(['back']);
		const pins = { pinEnd: true };

		controller.setItems(items, pins);

		expect(apply).toHaveBeenCalledWith(navbar, items, pins);
	});
});

/** Stores the resize callback so a test can fire it, as ResizeObserver would after a layout change. */
function recordingResize(): { observeResize: ObserveResize; fire(): void } {
	let callback: (() => void) | null = null;
	return {
		observeResize: (_el, onResize) => {
			callback = onResize;
			return () => {
				callback = null;
			};
		},
		fire: () => callback?.(),
	};
}

/** jsdom has no layout: give the row a 600px content box in a 300px viewport, scrolled to `scrollLeft`. */
function overflowingRow(row: HTMLElement, scrollLeft = 0): void {
	Object.defineProperties(row, {
		scrollWidth: { value: 600 },
		clientWidth: { value: 300 },
		scrollLeft: { value: scrollLeft, writable: true },
	});
}

describe('NavbarController overflow', () => {
	it('tracks the actions row once loaded', () => {
		const navbar = buildNavbar();
		const overflow = new OverflowIndicator(() => () => {});
		const track = vi.spyOn(overflow, 'track');
		const { controller } = setup(navbar, nativeItems(), { overflow });

		controller.load();

		expect(track).toHaveBeenLastCalledWith(actionsRow(navbar), navbar);
	});

	it('tracks the actions row again after every setItems', () => {
		const navbar = buildNavbar();
		const overflow = new OverflowIndicator(() => () => {});
		const track = vi.spyOn(overflow, 'track');
		const { controller } = setup(navbar, nativeItems(), { overflow });
		controller.load();

		controller.setItems(nativeItems(['back']));

		expect(track).toHaveBeenCalledTimes(2);
		expect(track).toHaveBeenLastCalledWith(actionsRow(navbar), navbar);
	});

	it('re-renders once for a scroll-driven overflow class, then settles (KD-5)', async () => {
		const navbar = buildNavbar();
		const row = actionsRow(navbar);
		overflowingRow(row);
		const resize = recordingResize();
		const overflow = new OverflowIndicator(resize.observeResize);
		const { controller, renderer } = setup(navbar, nativeItems(), { overflow });
		controller.load();
		resize.fire();
		const apply = vi.spyOn(renderer, 'apply');

		row.scrollLeft = 150;
		row.dispatchEvent(new Event('scroll'));
		await flushObserver();
		await flushObserver();
		expect(apply).toHaveBeenCalledTimes(1);

		await flushObserver();
		await flushObserver();
		expect(apply).toHaveBeenCalledTimes(1);
	});

	it('discards the overflow classes its own render writes, so an external render does not re-render (KD-5)', async () => {
		const navbar = buildNavbar();
		const row = actionsRow(navbar);
		overflowingRow(row);
		const resize = recordingResize();
		const overflow = new OverflowIndicator(resize.observeResize);
		const { controller, renderer } = setup(navbar, nativeItems(), { overflow });
		controller.load();
		const apply = vi.spyOn(renderer, 'apply');

		navbar.classList.add('some-foreign-class');
		await flushObserver();
		await flushObserver();
		expect(row.classList.contains('navbar-composer-has-overflow-end')).toBe(true);
		expect(apply).toHaveBeenCalledTimes(1);

		await flushObserver();
		await flushObserver();
		expect(apply).toHaveBeenCalledTimes(1);
	});

	it('restores the navbar to its pristine markup on unload, with pins and a fired resize', () => {
		const navbar = buildNavbar();
		const original = navbar.outerHTML;
		overflowingRow(actionsRow(navbar));
		const resize = recordingResize();
		const overflow = new OverflowIndicator(resize.observeResize);
		const { controller } = setup(navbar, nativeItems(), { overflow, pins: { pinStart: true, pinEnd: true } });
		controller.load();
		resize.fire();
		expect(navbar.outerHTML).not.toBe(original);

		controller.unload();

		expect(navbar.outerHTML).toBe(original);
	});

	it('never tracks and warns once when Obsidian exposes no navbar', () => {
		const overflow = new OverflowIndicator(() => () => {});
		const track = vi.spyOn(overflow, 'track');
		const { controller, warn } = setup(null, nativeItems(), { overflow });

		controller.load();
		controller.setItems(nativeItems(['back']));
		controller.unload();

		expect(track).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledTimes(1);
	});
});

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

	it('re-applies the empty marker after Obsidian rewrites the container className', async () => {
		const navbar = buildNavbar();
		const { controller } = setup(navbar, nativeItems(NATIVE_IDS));
		controller.load();

		navbar.className = 'mobile-navbar mod-raised';
		await flushObserver();

		expect(navbar.classList.contains('navbar-composer-empty')).toBe(true);
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

interface ManualFrames {
	requestFrame: RequestFrame;
	flush(): void;
	pending(): number;
}

/** Queues frame callbacks until a test flushes them, so each frame runs exactly when the test says. */
function manualFrames(): ManualFrames {
	const queued: { callback: () => void; cancelled: boolean }[] = [];
	return {
		requestFrame: (callback) => {
			const frame = { callback, cancelled: false };
			queued.push(frame);
			return () => {
				frame.cancelled = true;
			};
		},
		flush: () => {
			for (const frame of queued.splice(0)) {
				if (!frame.cancelled) frame.callback();
			}
		},
		pending: () => queued.filter((frame) => !frame.cancelled).length,
	};
}

/** Runs the queued frames and the observer callbacks they cause, twice over, so chained writes settle. */
async function settle(frames: ManualFrames): Promise<void> {
	frames.flush();
	await flushObserver();
	frames.flush();
	await flushObserver();
}

/** An indicator with the scroll track injected, its resize callback recorded and its frames queued by hand. */
function trackedIndicator() {
	const resize = recordingResize();
	const frames = manualFrames();
	const overflow = new OverflowIndicator(resize.observeResize, new ScrollTrack(frames.requestFrame));
	return { overflow, resize, frames };
}

function trackIn(navbar: HTMLElement): HTMLElement {
	const track = navbar.querySelector<HTMLElement>(`.${SCROLL_TRACK_CLASS}`);
	if (track === null) throw new Error('no scroll track rendered');
	return track;
}

describe('NavbarController scroll track', () => {
	it('attaches exactly one scroll track as a direct child of the navbar on load, without looping', async () => {
		const navbar = buildNavbar();
		const { overflow, frames } = trackedIndicator();
		const { controller, renderer } = setup(navbar, nativeItems(), { overflow });
		const apply = vi.spyOn(renderer, 'apply');

		controller.load();
		await settle(frames);

		expect(navbar.querySelectorAll(`:scope > .${SCROLL_TRACK_CLASS}`)).toHaveLength(1);
		expect(navbar.querySelectorAll(`.${SCROLL_TRACK_CLASS}`)).toHaveLength(1);
		expect(apply).toHaveBeenCalledTimes(1);
	});

	it('creates no scroll track and warns once when Obsidian exposes no navbar', () => {
		const { overflow } = trackedIndicator();
		const { controller, warn } = setup(null, nativeItems(), { overflow });

		controller.load();
		controller.setItems(nativeItems(['back']));
		controller.unload();

		expect(document.querySelectorAll(`.${SCROLL_TRACK_CLASS}`)).toHaveLength(0);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('does not re-render on a scroll frame that only moves the thumb (KD-11)', async () => {
		const navbar = buildNavbar();
		overflowingRow(actionsRow(navbar));
		const { overflow, resize, frames } = trackedIndicator();
		const { controller, renderer } = setup(navbar, nativeItems(), { overflow });
		controller.load();
		resize.fire();
		const row = actionsRow(navbar);
		row.scrollLeft = 150;
		row.dispatchEvent(new Event('scroll'));
		await settle(frames);
		const offsetBefore = trackIn(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR);
		const apply = vi.spyOn(renderer, 'apply');

		row.scrollLeft = 160;
		row.dispatchEvent(new Event('scroll'));
		await settle(frames);

		expect(trackIn(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR)).not.toBe(offsetBefore);
		expect(apply).not.toHaveBeenCalled();
	});

	it('renders once for a batch that mixes a thumb write with a foreign class', async () => {
		const navbar = buildNavbar();
		overflowingRow(actionsRow(navbar));
		const { overflow, resize, frames } = trackedIndicator();
		const { controller, renderer } = setup(navbar, nativeItems(), { overflow });
		controller.load();
		resize.fire();
		const row = actionsRow(navbar);
		row.scrollLeft = 150;
		row.dispatchEvent(new Event('scroll'));
		await settle(frames);
		const apply = vi.spyOn(renderer, 'apply');

		const offsetBefore = trackIn(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR);
		row.scrollLeft = 160;
		row.dispatchEvent(new Event('scroll'));
		frames.flush();
		navbar.classList.add('some-foreign-class');
		await flushObserver();
		await settle(frames);

		expect(trackIn(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR)).not.toBe(offsetBefore);
		expect(apply).toHaveBeenCalledTimes(1);
	});

	it('restores the navbar to its pristine markup on unload, with the track, a pending frame and a fired resize', () => {
		const navbar = buildNavbar();
		const original = navbar.outerHTML;
		const row = actionsRow(navbar);
		overflowingRow(row);
		const { overflow, resize, frames } = trackedIndicator();
		const { controller } = setup(navbar, nativeItems(), { overflow });
		controller.load();
		resize.fire();
		row.scrollLeft = 150;
		row.dispatchEvent(new Event('scroll'));
		expect(frames.pending()).toBe(1);

		controller.unload();

		expect(navbar.outerHTML).toBe(original);
		expect(frames.pending()).toBe(0);
	});
});

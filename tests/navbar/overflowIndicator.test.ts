import { describe, expect, it } from 'vitest';
import { OverflowIndicator, OVERFLOW_END_CLASS, OVERFLOW_START_CLASS, PIN_START_WIDTH_VAR, SCROLL_MODE_CLASS } from '../../src/navbar/overflowIndicator';
import { PINNED_START_CLASS } from '../../src/navbar/navbarRenderer';
import { ScrollTrack, SCROLL_TRACK_CLASS, THUMB_RATIO_VAR } from '../../src/navbar/scrollTrack';
import type { ObserveResize } from '../../src/dom/observeResize';
import type { RequestFrame } from '../../src/dom/requestFrame';
import { buildNavbar } from '../fixtures/navbarFixture';

const NO_OBSERVE = () => () => undefined;

/** One `observeResize` call: the observed element, its resize callback, and whether it was disconnected. */
interface Observation {
	el: HTMLElement;
	onResize: () => void;
	disconnected: boolean;
}

/** An `ObserveResize` that records every call and lets a test fire the resize callback by hand. */
function recordingObserve(): { observe: ObserveResize; observations: Observation[] } {
	const observations: Observation[] = [];
	const observe: ObserveResize = (el, onResize) => {
		const observation: Observation = { el, onResize, disconnected: false };
		observations.push(observation);
		return () => {
			observation.disconnected = true;
		};
	};
	return { observe, observations };
}

/** A row of `scrollWidth` 600 in a 300px viewport, scrolled to `scrollLeft`. */
function scrollableRow(scrollLeft: number): HTMLElement {
	const row = document.createElement('div');
	row.classList.add('mobile-navbar-actions');
	Object.defineProperties(row, {
		scrollWidth: { value: 600, configurable: true },
		clientWidth: { value: 300, configurable: true },
		scrollLeft: { value: scrollLeft, writable: true, configurable: true },
	});
	return row;
}

/** A pinned start button with a measured width. */
function pinnedStart(row: HTMLElement, width: number): HTMLElement {
	const pinned = document.createElement('button');
	pinned.classList.add(PINNED_START_CLASS);
	Object.defineProperty(pinned, 'offsetWidth', { value: width, configurable: true });
	row.appendChild(pinned);
	return pinned;
}

/** Counts the DOM mutation records `action` produces under `target`, as a MutationObserver would see them. */
function countMutations(target: Node, action: () => void): number {
	const observer = new MutationObserver(() => undefined);
	observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
	action();
	const count = observer.takeRecords().length;
	observer.disconnect();
	return count;
}

describe('OverflowIndicator', () => {
	describe('edge classes', () => {
		it('marks only the end edge at rest', () => {
			const row = scrollableRow(0);
			const indicator = new OverflowIndicator(NO_OBSERVE);
			indicator.track(row);

			indicator.refresh();

			expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(true);
			expect(row.classList.contains(OVERFLOW_START_CLASS)).toBe(false);
		});

		it('marks both edges when scrolled into the middle', () => {
			const row = scrollableRow(150);
			const indicator = new OverflowIndicator(NO_OBSERVE);
			indicator.track(row);

			indicator.refresh();

			expect(row.classList.contains(OVERFLOW_START_CLASS)).toBe(true);
			expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(true);
		});

		it('marks only the start edge when scrolled to the end', () => {
			const row = scrollableRow(300);
			const indicator = new OverflowIndicator(NO_OBSERVE);
			indicator.track(row);

			indicator.refresh();

			expect(row.classList.contains(OVERFLOW_START_CLASS)).toBe(true);
			expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(false);
		});
	});

	describe('pin widths', () => {
		it('sets the start pin width variable from the pinned button', () => {
			const row = scrollableRow(0);
			pinnedStart(row, 52);
			const indicator = new OverflowIndicator(NO_OBSERVE);
			indicator.track(row);

			indicator.refresh();

			expect(row.style.getPropertyValue(PIN_START_WIDTH_VAR)).toBe('52px');
		});

		it('removes the variable and the style attribute when no button is pinned', () => {
			const row = scrollableRow(0);
			const pinned = pinnedStart(row, 52);
			const indicator = new OverflowIndicator(NO_OBSERVE);
			indicator.track(row);
			indicator.refresh();
			pinned.classList.remove(PINNED_START_CLASS);

			indicator.refresh();

			expect(row.style.getPropertyValue(PIN_START_WIDTH_VAR)).toBe('');
			expect(row.hasAttribute('style')).toBe(false);
		});
	});

	describe('idempotence', () => {
		it('writes nothing on a second refresh with unchanged metrics', () => {
			const row = scrollableRow(150);
			pinnedStart(row, 52);
			const indicator = new OverflowIndicator(NO_OBSERVE);
			indicator.track(row);
			indicator.refresh();

			const mutations = countMutations(row, () => indicator.refresh());

			expect(mutations).toBe(0);
		});
	});

	describe('without a tracked row', () => {
		it('does not throw and writes nothing when refreshed before track', () => {
			const row = scrollableRow(0);
			const indicator = new OverflowIndicator(NO_OBSERVE);

			const mutations = countMutations(row, () => {
				expect(() => indicator.refresh()).not.toThrow();
			});

			expect(mutations).toBe(0);
			expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(false);
		});
	});
});

describe('OverflowIndicator row binding', () => {
	it('observes the tracked row once and writes nothing until the first resize', () => {
		const row = scrollableRow(0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();

		indicator.track(row);

		expect(observations).toHaveLength(1);
		expect(observations[0]?.el).toBe(row);
		expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(false);
		expect(row.hasAttribute('style')).toBe(false);
	});

	it('writes the edge classes when the row reports a resize', () => {
		const row = scrollableRow(0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);

		observations[0]?.onResize();

		expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(true);
	});

	it('refreshes the row on its scroll event', () => {
		const row = scrollableRow(0);
		const { observe } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		row.scrollLeft = 150;

		row.dispatchEvent(new Event('scroll'));

		expect(row.classList.contains(OVERFLOW_START_CLASS)).toBe(true);
	});

	it('refreshes instead of observing again when tracking the same row', () => {
		const row = scrollableRow(0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		row.scrollLeft = 150;

		indicator.track(row);

		expect(observations).toHaveLength(1);
		expect(row.classList.contains(OVERFLOW_START_CLASS)).toBe(true);
	});

	it('disconnects the old row and clears it when a new row is tracked', () => {
		const oldRow = scrollableRow(0);
		pinnedStart(oldRow, 52);
		const newRow = scrollableRow(0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(oldRow);
		observations[0]?.onResize();

		indicator.track(newRow);

		expect(observations[0]?.disconnected).toBe(true);
		expect(oldRow.classList.contains(OVERFLOW_END_CLASS)).toBe(false);
		expect(oldRow.style.getPropertyValue(PIN_START_WIDTH_VAR)).toBe('');
		expect(oldRow.hasAttribute('style')).toBe(false);
		expect(observations[1]?.el).toBe(newRow);
	});

	it('disconnects, drops the scroll listener and leaves the row pristine on unload', () => {
		const row = scrollableRow(0);
		const pristine = row.outerHTML;
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		observations[0]?.onResize();

		indicator.unload();
		row.scrollLeft = 150;
		const mutations = countMutations(row, () => row.dispatchEvent(new Event('scroll')));

		expect(observations[0]?.disconnected).toBe(true);
		expect(row.outerHTML).toBe(pristine);
		expect(mutations).toBe(0);
	});

	it('forgets the row on unload so a later refresh writes nothing', () => {
		const row = scrollableRow(0);
		const { observe } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		indicator.unload();

		const mutations = countMutations(row, () => indicator.refresh());

		expect(mutations).toBe(0);
	});
});

/** The actions row of `navbar` with 600px of content in a 300px viewport, scrolled to `scrollLeft`. */
function navbarRow(navbar: HTMLElement, scrollLeft: number): HTMLElement {
	const row = navbar.querySelector<HTMLElement>('.mobile-navbar-actions');
	if (row === null) throw new Error('fixture has no actions row');
	Object.defineProperties(row, {
		scrollWidth: { value: 600, configurable: true },
		clientWidth: { value: 300, configurable: true },
		scrollLeft: { value: scrollLeft, writable: true, configurable: true },
	});
	return row;
}

/** A `RequestFrame` that records each frame and never runs it, so a test can count the requests. */
function recordingFrames(): { requestFrame: RequestFrame; frames: Array<() => void> } {
	const frames: Array<() => void> = [];
	const requestFrame: RequestFrame = (callback) => {
		frames.push(callback);
		return () => undefined;
	};
	return { requestFrame, frames };
}

describe('OverflowIndicator scroll track', () => {
	it('attaches the track to the pill on track and writes no thumb width before a resize', () => {
		const navbar = buildNavbar();
		const row = navbarRow(navbar, 0);
		const { observe } = recordingObserve();
		const { requestFrame } = recordingFrames();
		const indicator = new OverflowIndicator(observe, new ScrollTrack(requestFrame));
		indicator.load();

		indicator.track(row, navbar);

		const track = navbar.querySelector<HTMLElement>(`.${SCROLL_TRACK_CLASS}`);
		expect(track?.parentElement).toBe(navbar);
		expect(track?.style.getPropertyValue(THUMB_RATIO_VAR)).toBe('');
	});

	it('writes the thumb width when the row reports a resize', () => {
		const navbar = buildNavbar();
		const row = navbarRow(navbar, 0);
		const { observe, observations } = recordingObserve();
		const { requestFrame } = recordingFrames();
		const indicator = new OverflowIndicator(observe, new ScrollTrack(requestFrame));
		indicator.load();
		indicator.track(row, navbar);

		observations[0]?.onResize();

		const track = navbar.querySelector<HTMLElement>(`.${SCROLL_TRACK_CLASS}`);
		expect(track?.style.getPropertyValue(THUMB_RATIO_VAR)).toBe('0.5');
	});

	it('syncs the track on the row scroll event, requesting one frame for the offset', () => {
		const navbar = buildNavbar();
		const row = navbarRow(navbar, 0);
		const { observe } = recordingObserve();
		const { requestFrame, frames } = recordingFrames();
		const indicator = new OverflowIndicator(observe, new ScrollTrack(requestFrame));
		indicator.load();
		indicator.track(row, navbar);
		row.scrollLeft = 150;

		row.dispatchEvent(new Event('scroll'));

		expect(frames).toHaveLength(1);
	});

	it('creates no track when tracking a row without a pill', () => {
		const navbar = buildNavbar();
		const row = navbarRow(navbar, 0);
		const { observe } = recordingObserve();
		const { requestFrame } = recordingFrames();
		const indicator = new OverflowIndicator(observe, new ScrollTrack(requestFrame));
		indicator.load();

		indicator.track(row);

		expect(navbar.querySelector(`.${SCROLL_TRACK_CLASS}`)).toBeNull();
	});

	it('restores the pill and the row on unload, removing the track', () => {
		const navbar = buildNavbar();
		const row = navbarRow(navbar, 0);
		const pristine = navbar.outerHTML;
		const { observe, observations } = recordingObserve();
		const { requestFrame } = recordingFrames();
		const indicator = new OverflowIndicator(observe, new ScrollTrack(requestFrame));
		indicator.load();
		indicator.track(row, navbar);
		observations[0]?.onResize();

		indicator.unload();

		expect(navbar.outerHTML).toBe(pristine);
	});
});

/** The fixture's six natives plus two custom actions: eight visible actions in the row. */
function eightActionNavbar(): HTMLElement {
	const navbar = buildNavbar();
	const row = navbar.querySelector<HTMLElement>('.mobile-navbar-actions')!;
	row.createDiv({ cls: 'mobile-navbar-action' });
	row.createDiv({ cls: 'mobile-navbar-action' });
	return navbar;
}

/** The fixture's six natives (the menu among them) plus four custom actions: ten visible actions in the row. */
function tenActionNavbar(): HTMLElement {
	const navbar = eightActionNavbar();
	const row = navbar.querySelector<HTMLElement>('.mobile-navbar-actions')!;
	row.createDiv({ cls: 'mobile-navbar-action' });
	row.createDiv({ cls: 'mobile-navbar-action' });
	return navbar;
}

function setClientWidth(row: HTMLElement, width: number): void {
	Object.defineProperty(row, 'clientWidth', { value: width, configurable: true });
}

describe('OverflowIndicator scroll mode', () => {
	it('writes no scroll-mode class on track and waits for the first resize callback', () => {
		const row = navbarRow(eightActionNavbar(), 0);
		const { observe } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();

		indicator.track(row);

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(false);
	});

	it('marks the row when eight buttons cannot fit a 300px row', () => {
		const row = navbarRow(eightActionNavbar(), 0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);

		observations[0]?.onResize();

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(true);
	});

	it('unmarks the row on the next refresh after it widens to 400px', () => {
		const row = navbarRow(eightActionNavbar(), 0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		observations[0]?.onResize();

		setClientWidth(row, 400);
		indicator.refresh();

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(false);
	});

	it('unmarks the row when two buttons are hidden and six fit', () => {
		const navbar = eightActionNavbar();
		const row = navbarRow(navbar, 0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		observations[0]?.onResize();
		const visible = row.querySelectorAll<HTMLElement>('.mobile-navbar-action');
		visible[0]!.classList.add('navbar-composer-hidden');
		visible[1]!.classList.add('navbar-composer-hidden');

		indicator.refresh();

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(false);
	});

	it('unmarks the row when the bar has zero width', () => {
		const row = navbarRow(eightActionNavbar(), 0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		observations[0]?.onResize();

		setClientWidth(row, 0);
		indicator.refresh();

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(false);
	});

	it('marks the row when the menu margin pushes ten buttons past a 386px row', () => {
		const row = navbarRow(tenActionNavbar(), 0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		setClientWidth(row, 386);

		observations[0]?.onResize();

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(true);
	});

	it('does not mark ten buttons at 386px when no action carries the menu class', () => {
		const navbar = tenActionNavbar();
		const row = navbarRow(navbar, 0);
		row.querySelector('.has-longpress-menu')!.classList.remove('has-longpress-menu');
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		setClientWidth(row, 386);

		observations[0]?.onResize();

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(false);
	});

	it('does not count the menu margin when the menu button is hidden', () => {
		const navbar = tenActionNavbar();
		const row = navbarRow(navbar, 0);
		row.querySelector('.has-longpress-menu')!.classList.add('navbar-composer-hidden');
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		setClientWidth(row, 386);

		observations[0]?.onResize();

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(false);
	});

	it('writes nothing on an unchanged second refresh', () => {
		const row = navbarRow(eightActionNavbar(), 0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		observations[0]?.onResize();

		const mutations = countMutations(row, () => indicator.refresh());

		expect(mutations).toBe(0);
	});

	it('writes the class before the edges are read', () => {
		const row = navbarRow(eightActionNavbar(), 0);
		Object.defineProperty(row, 'scrollWidth', {
			get: () => (row.classList.contains(SCROLL_MODE_CLASS) ? 600 : 300),
			configurable: true,
		});
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);

		observations[0]?.onResize();

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(true);
		expect(row.classList.contains(OVERFLOW_END_CLASS)).toBe(true);
	});

	it('removes the class on unload', () => {
		const row = navbarRow(eightActionNavbar(), 0);
		const { observe, observations } = recordingObserve();
		const indicator = new OverflowIndicator(observe);
		indicator.load();
		indicator.track(row);
		observations[0]?.onResize();

		indicator.unload();

		expect(row.classList.contains(SCROLL_MODE_CLASS)).toBe(false);
	});
});

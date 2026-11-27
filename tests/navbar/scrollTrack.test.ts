import { describe, expect, it } from 'vitest';
import type { RequestFrame } from '../../src/dom/requestFrame';
import {
	isScrollTrackMutation,
	ScrollTrack,
	SCROLL_THUMB_CLASS,
	SCROLL_TRACK_CLASS,
	THUMB_PROGRESS_VAR,
	THUMB_RATIO_VAR,
} from '../../src/navbar/scrollTrack';
import { buildNavbar } from '../fixtures/navbarFixture';

const NO_FRAME = () => () => undefined;

/** Captures the DOM mutation records `action` produces under `target`, as the controller's MutationObserver would see them. */
function recordsOf(target: Node, action: () => void): MutationRecord[] {
	const observer = new MutationObserver(() => undefined);
	observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
	action();
	const records = observer.takeRecords();
	observer.disconnect();
	return records;
}

/** Counts the DOM mutation records `action` produces under `target`. */
function countMutations(target: Node, action: () => void): number {
	return recordsOf(target, action).length;
}

/** A frame queue the test drives by hand: `requestFrame` records each frame, `flush()` runs the ones not cancelled. */
function manualFrames(): { requestFrame: RequestFrame; frames: Array<{ cancelled: boolean }>; flush: () => void } {
	const frames: Array<{ callback: () => void; cancelled: boolean }> = [];
	const requestFrame: RequestFrame = (callback) => {
		const frame = { callback, cancelled: false };
		frames.push(frame);
		return () => {
			frame.cancelled = true;
		};
	};
	const flush = (): void => {
		for (const frame of frames.splice(0)) {
			if (!frame.cancelled) frame.callback();
		}
	};
	return { requestFrame, frames, flush };
}

/** The row of `navbar` with the given metrics; defaults to a 600px scroll width in a 300px viewport, at rest. */
function rowWithMetrics(navbar: HTMLElement, scrollWidth: number, clientWidth: number, scrollLeft = 0): HTMLElement {
	const row = navbar.querySelector<HTMLElement>('.mobile-navbar-actions');
	if (row === null) throw new Error('fixture has no actions row');
	Object.defineProperties(row, {
		scrollWidth: { value: scrollWidth, configurable: true },
		clientWidth: { value: clientWidth, configurable: true },
		scrollLeft: { value: scrollLeft, writable: true, configurable: true },
	});
	return row;
}

function trackEl(navbar: HTMLElement): HTMLElement {
	const track = navbar.querySelector<HTMLElement>(`.${SCROLL_TRACK_CLASS}`);
	if (track === null) throw new Error('no track in the pill');
	return track;
}

function thumbEl(navbar: HTMLElement): HTMLElement {
	const thumb = trackEl(navbar).querySelector<HTMLElement>(`.${SCROLL_THUMB_CLASS}`);
	if (thumb === null) throw new Error('no thumb in the track');
	return thumb;
}

/** The first record of a non-empty batch; throws when the action produced none. */
function firstRecord(records: MutationRecord[]): MutationRecord {
	const [record] = records;
	if (record === undefined) throw new Error('no mutation record');
	return record;
}

describe('ScrollTrack', () => {
	describe('attach', () => {
		it('appends the track as the last child of the pill, with one thumb and aria-hidden', () => {
			const navbar = buildNavbar();
			const track = new ScrollTrack(NO_FRAME);

			track.attach(navbar);

			const last = navbar.lastElementChild;
			expect(last?.classList.contains(SCROLL_TRACK_CLASS)).toBe(true);
			expect(last?.getAttribute('aria-hidden')).toBe('true');
			expect(last?.children).toHaveLength(1);
			expect(last?.children[0]?.classList.contains(SCROLL_THUMB_CLASS)).toBe(true);
		});

		it('leaves the actions row markup unchanged', () => {
			const navbar = buildNavbar();
			const row = navbar.querySelector('.mobile-navbar-actions');
			const before = row?.innerHTML;

			new ScrollTrack(NO_FRAME).attach(navbar);

			expect(row?.innerHTML).toBe(before);
		});

		it('writes nothing when the track is already attached to the pill', () => {
			const navbar = buildNavbar();
			const track = new ScrollTrack(NO_FRAME);
			track.attach(navbar);

			const mutations = countMutations(navbar, () => track.attach(navbar));

			expect(mutations).toBe(0);
		});

		it('moves the track to another pill and leaves the first pill as it was', () => {
			const first = buildNavbar();
			const second = buildNavbar();
			const firstBefore = first.outerHTML;
			const track = new ScrollTrack(NO_FRAME);
			track.attach(first);

			track.attach(second);

			expect(first.outerHTML).toBe(firstBefore);
			expect(second.lastElementChild?.classList.contains(SCROLL_TRACK_CLASS)).toBe(true);
		});

		it('re-creates the track when it was removed from the pill', () => {
			const navbar = buildNavbar();
			const track = new ScrollTrack(NO_FRAME);
			track.attach(navbar);
			navbar.querySelector(`.${SCROLL_TRACK_CLASS}`)?.remove();

			track.attach(navbar);

			expect(navbar.querySelectorAll(`.${SCROLL_TRACK_CLASS}`)).toHaveLength(1);
			expect(navbar.lastElementChild?.classList.contains(SCROLL_TRACK_CLASS)).toBe(true);
		});

		it('moves the track back to the end when the pill gained a child after it', () => {
			const navbar = buildNavbar();
			const track = new ScrollTrack(NO_FRAME);
			track.attach(navbar);
			navbar.createDiv({ cls: 'obsidian-added' });

			track.attach(navbar);

			expect(navbar.querySelectorAll(`.${SCROLL_TRACK_CLASS}`)).toHaveLength(1);
			expect(navbar.lastElementChild?.classList.contains(SCROLL_TRACK_CLASS)).toBe(true);
		});
	});

	describe('sync', () => {
		it("writes the thumb's width ratio on the track for an overflowing row", () => {
			const navbar = buildNavbar();
			const track = new ScrollTrack(NO_FRAME);
			track.attach(navbar);
			const row = rowWithMetrics(navbar, 600, 300);

			track.sync(row);

			expect(navbar.querySelector<HTMLElement>(`.${SCROLL_TRACK_CLASS}`)?.style.getPropertyValue(THUMB_RATIO_VAR)).toBe('0.5');
		});

		it('writes nothing when the metrics have not changed', () => {
			const navbar = buildNavbar();
			const track = new ScrollTrack(NO_FRAME);
			track.attach(navbar);
			const row = rowWithMetrics(navbar, 600, 300);
			track.sync(row);

			const mutations = countMutations(navbar, () => track.sync(row));

			expect(mutations).toBe(0);
		});

		it('removes the thumb width and the style attribute when the row fits', () => {
			const navbar = buildNavbar();
			const track = new ScrollTrack(NO_FRAME);
			track.attach(navbar);
			track.sync(rowWithMetrics(navbar, 600, 300));

			track.sync(rowWithMetrics(navbar, 300, 300));

			const trackEl = navbar.querySelector<HTMLElement>(`.${SCROLL_TRACK_CLASS}`);
			expect(trackEl?.style.getPropertyValue(THUMB_RATIO_VAR)).toBe('');
			expect(trackEl?.hasAttribute('style')).toBe(false);
		});

		it('does nothing before the track is attached', () => {
			const navbar = buildNavbar();
			const before = navbar.outerHTML;
			const track = new ScrollTrack(NO_FRAME);

			expect(() => track.sync(rowWithMetrics(navbar, 600, 300))).not.toThrow();
			expect(navbar.outerHTML).toBe(before);
		});
	});

	describe('thumb progress (per frame)', () => {
		it('writes the progress on the track only when the frame runs', () => {
			const navbar = buildNavbar();
			const frames = manualFrames();
			const track = new ScrollTrack(frames.requestFrame);
			track.attach(navbar);

			track.sync(rowWithMetrics(navbar, 600, 300, 150));
			expect(trackEl(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR)).toBe('');

			frames.flush();
			expect(trackEl(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR)).toBe('0.5');
		});

		it('requests one frame for several syncs before the frame runs', () => {
			const navbar = buildNavbar();
			const frames = manualFrames();
			const track = new ScrollTrack(frames.requestFrame);
			track.attach(navbar);
			const row = rowWithMetrics(navbar, 600, 300, 150);

			track.sync(row);
			track.sync(row);
			track.sync(row);

			expect(frames.frames).toHaveLength(1);
		});

		it('measures the row when the frame runs, not when it was synced', () => {
			const navbar = buildNavbar();
			const frames = manualFrames();
			const track = new ScrollTrack(frames.requestFrame);
			track.attach(navbar);
			const row = rowWithMetrics(navbar, 600, 300, 150);
			track.sync(row);

			row.scrollLeft = 300;
			frames.flush();

			expect(trackEl(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR)).toBe('1');
		});

		it('clamps the progress to 0 when the row is rubber-banded past its start', () => {
			const navbar = buildNavbar();
			const frames = manualFrames();
			const track = new ScrollTrack(frames.requestFrame);
			track.attach(navbar);
			const row = rowWithMetrics(navbar, 600, 300, -20);
			track.sync(row);

			frames.flush();

			expect(trackEl(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR)).toBe('0');
		});

		it('measures the most recently synced row when a frame is already pending', () => {
			const navbar = buildNavbar();
			const frames = manualFrames();
			const track = new ScrollTrack(frames.requestFrame);
			track.attach(navbar);
			track.sync(rowWithMetrics(navbar, 600, 300, 150));
			const rebound = rowWithMetrics(buildNavbar(), 600, 300, 300);
			track.sync(rebound);

			frames.flush();

			expect(trackEl(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR)).toBe('1');
		});

		it('removes the offset when the row fits by the time the frame runs', () => {
			const navbar = buildNavbar();
			const frames = manualFrames();
			const track = new ScrollTrack(frames.requestFrame);
			track.attach(navbar);
			track.sync(rowWithMetrics(navbar, 600, 300, 150));
			frames.flush();
			const row = rowWithMetrics(navbar, 600, 300, 150);
			track.sync(row);

			rowWithMetrics(navbar, 300, 300);
			frames.flush();

			expect(trackEl(navbar).style.getPropertyValue(THUMB_PROGRESS_VAR)).toBe('');
		});
	});

	describe('isScrollTrackMutation', () => {
		it('is true for an attribute change on the track', () => {
			const navbar = buildNavbar();
			new ScrollTrack(NO_FRAME).attach(navbar);
			const track = trackEl(navbar);

			const records = recordsOf(navbar, () => track.setAttribute('data-probe', '1'));

			expect(records).toHaveLength(1);
			expect(isScrollTrackMutation(firstRecord(records))).toBe(true);
		});

		it('is true for an attribute change on the thumb', () => {
			const navbar = buildNavbar();
			new ScrollTrack(NO_FRAME).attach(navbar);
			const thumb = thumbEl(navbar);

			const records = recordsOf(navbar, () => thumb.setAttribute('data-probe', '1'));

			expect(isScrollTrackMutation(firstRecord(records))).toBe(true);
		});

		it('is false for the childList record that adds the track to the pill', () => {
			const navbar = buildNavbar();
			const track = new ScrollTrack(NO_FRAME);

			const records = recordsOf(navbar, () => track.attach(navbar));
			const pillRecord = records.find((record) => record.target === navbar);

			expect(pillRecord?.type).toBe('childList');
			expect(isScrollTrackMutation(pillRecord as MutationRecord)).toBe(false);
		});

		it('is false for an attribute change on the actions row', () => {
			const navbar = buildNavbar();
			new ScrollTrack(NO_FRAME).attach(navbar);
			const row = rowWithMetrics(navbar, 600, 300);

			const records = recordsOf(navbar, () => row.setAttribute('data-probe', '1'));

			expect(isScrollTrackMutation(firstRecord(records))).toBe(false);
		});
	});

	describe('unload', () => {
		it('cancels a pending frame so a later flush writes nothing', () => {
			const navbar = buildNavbar();
			const frames = manualFrames();
			const track = new ScrollTrack(frames.requestFrame);
			track.load();
			track.attach(navbar);
			const trackBefore = trackEl(navbar);
			track.sync(rowWithMetrics(navbar, 600, 300, 150));

			track.unload();
			const cancelled = frames.frames[0]?.cancelled;
			frames.flush();

			expect(cancelled).toBe(true);
			expect(trackBefore.style.getPropertyValue(THUMB_PROGRESS_VAR)).toBe('');
		});

		it('removes the track so the pill is as it was before attach', () => {
			const navbar = buildNavbar();
			const before = navbar.outerHTML;
			const track = new ScrollTrack(NO_FRAME);
			track.load();
			track.attach(navbar);
			track.sync(rowWithMetrics(navbar, 600, 300));

			track.unload();

			expect(navbar.outerHTML).toBe(before);
		});
	});
});

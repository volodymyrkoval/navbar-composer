/**
 * Scroll track view: one thin element in the navbar pill that shows how far the action row is scrolled. Owns the
 * track element's lifecycle, its thumb width ratio and its thumb progress; the overflow indicator decides when to measure.
 */

import { Component } from 'obsidian';
import { scrollThumb, type ScrollThumb } from '../core/scrollThumb';
import { ensureCssVar, ensureCssVarRemoved } from '../dom/idempotentDom';
import type { RequestFrame } from '../dom/requestFrame';

/** Class of the track element, appended to the pill. */
export const SCROLL_TRACK_CLASS = 'navbar-composer-scroll-track';
/** Class of the thumb, the track's only child. */
export const SCROLL_THUMB_CLASS = 'navbar-composer-scroll-thumb';
/** Thumb width as a share of the track (unitless, 0 … 1), written on the track element only. CSS turns it into px. */
export const THUMB_RATIO_VAR = '--navbar-composer-scroll-thumb-ratio';
/** Thumb position (unitless, 0 … 1), written on the track element only, once per frame. */
export const THUMB_PROGRESS_VAR = '--navbar-composer-scroll-thumb-progress';

/**
 * True for an attribute mutation on the track or its thumb. The navbar observer skips a batch made only
 * of these, because the per-frame progress write would otherwise re-render the navbar on every scroll frame.
 */
export function isScrollTrackMutation(record: MutationRecord): boolean {
	if (record.type !== 'attributes') return false;
	return (record.target as Element).closest(`.${SCROLL_TRACK_CLASS}`) !== null;
}

/**
 * The track is a child of the pill (`.mobile-navbar`), after the action row, and not inside it. It never carries the
 * action button class, so the renderer, the ordering and the pinned-edge logic never pick it up. It is
 * `position: absolute`, so it takes no space in the pill's layout. Every variable is written on the track element,
 * never on the row or the pill, so `renderer.restore` does not need to know about it.
 */
export class ScrollTrack extends Component {
	#track: HTMLElement | null = null;
	readonly #requestFrame: RequestFrame;
	/** Cancel function of the frame that will write the progress, or `null` when none is pending. */
	#pendingFrame: (() => void) | null = null;
	/** The row last passed to `sync`; the pending frame measures it, so a rebind is picked up. */
	#row: HTMLElement | null = null;

	constructor(requestFrame: RequestFrame) {
		super();
		this.#requestFrame = requestFrame;
	}

	/** Ensures exactly one track is the last child of `pill`, creating it when it is missing. */
	attach(pill: HTMLElement): void {
		if (this.#isAttachedTo(pill)) {
			this.#moveToEnd(pill);
			return;
		}
		this.#detach();
		this.#track = this.#createTrack(pill);
	}

	/** Measures `row` and writes the thumb width ratio now and the progress on the next frame. No-op when not attached. */
	sync(row: HTMLElement): void {
		const track = this.#track;
		if (track === null) return;
		this.#row = row;
		this.#writeRatio(track, scrollThumb(row));
		this.#scheduleProgress();
	}

	/** Requests one frame for the progress write unless one is already pending. */
	#scheduleProgress(): void {
		if (this.#pendingFrame !== null) return;
		this.#pendingFrame = this.#requestFrame(() => this.#writeProgress());
	}

	#writeRatio(track: HTMLElement, thumb: ScrollThumb): void {
		if (thumb.visible) {
			ensureCssVar(track, THUMB_RATIO_VAR, String(thumb.widthRatio));
		} else {
			ensureCssVarRemoved(track, THUMB_RATIO_VAR);
		}
	}

	/** Frame callback: measures the last synced row at frame time and writes the thumb progress. */
	#writeProgress(): void {
		this.#pendingFrame = null;
		const track = this.#track;
		const row = this.#row;
		if (track === null || row === null) return;
		const thumb = scrollThumb(row);
		if (thumb.visible) {
			ensureCssVar(track, THUMB_PROGRESS_VAR, String(thumb.progress));
		} else {
			ensureCssVarRemoved(track, THUMB_PROGRESS_VAR);
		}
	}

	#isAttachedTo(pill: HTMLElement): boolean {
		return this.#track !== null && this.#track.parentElement === pill;
	}

	/** Re-appends the track only when something was added after it; an in-place append would still be a mutation. */
	#moveToEnd(pill: HTMLElement): void {
		const track = this.#track;
		if (track !== null && pill.lastElementChild !== track) pill.append(track);
	}

	/** Cancels the pending progress frame, forgets the row, and removes the track element. */
	#detach(): void {
		this.#pendingFrame?.();
		this.#pendingFrame = null;
		this.#row = null;
		this.#track?.remove();
		this.#track = null;
	}

	onunload(): void {
		this.#detach();
	}

	#createTrack(pill: HTMLElement): HTMLElement {
		const track = pill.createDiv({ cls: SCROLL_TRACK_CLASS, attr: { 'aria-hidden': 'true' } });
		track.createDiv({ cls: SCROLL_THUMB_CLASS });
		return track;
	}
}

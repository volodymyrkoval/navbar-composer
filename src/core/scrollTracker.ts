/**
 * Per-scroller direction of travel, ignoring jitter below a threshold. Pure: the scroll position is passed in and no DOM is read (KD1).
 */

/** Movement below this many pixels is ignored: large enough to skip iOS momentum jitter, small enough to feel responsive. */
export const SCROLL_JITTER_PX = 10;

export type ScrollDirection = 'up' | 'down';

export class ScrollDeltaTracker {
	readonly #thresholdPx: number;
	#anchors = new WeakMap<object, number>();

	constructor(thresholdPx = SCROLL_JITTER_PX) {
		this.#thresholdPx = thresholdPx;
	}

	/** Reports a direction only once the scroller has moved at least the threshold from its last reported position. */
	track(scroller: object, scrollTop: number): ScrollDirection | null {
		const anchor = this.#anchors.get(scroller);
		if (anchor === undefined) {
			this.#anchors.set(scroller, scrollTop);
			return null;
		}
		const delta = scrollTop - anchor;
		if (Math.abs(delta) < this.#thresholdPx) {
			return null;
		}
		this.#anchors.set(scroller, scrollTop);
		return delta > 0 ? 'down' : 'up';
	}

	/** Forgets every scroller, so the next sighting of each starts a fresh anchor. */
	reset(): void {
		this.#anchors = new WeakMap();
	}
}

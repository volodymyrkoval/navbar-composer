/**
 * Overflow rule: which horizontal edges of the bar hide buttons, so the fade masks show only where needed. Plain data only.
 */

/** Sub-pixel slack: an overflow of this many pixels or less counts as no overflow. */
export const OVERFLOW_TOLERANCE_PX = 1;
export interface HorizontalScroll { scrollLeft: number; scrollWidth: number; clientWidth: number }
export interface OverflowEdges { start: boolean; end: boolean }
/** Which edges hide content. scrollLeft is clamped to [0, scrollWidth - clientWidth] (iOS rubber band). LTR only. */
export function overflowEdges(box: HorizontalScroll, tolerancePx = OVERFLOW_TOLERANCE_PX): OverflowEdges {
	const max = maxOffset(box);
	const offset = clampOffset(box);
	return {
		start: offset > tolerancePx,
		end: offset < max - tolerancePx,
	};
}

/** scrollWidth − clientWidth, never negative. */
export function maxOffset(box: HorizontalScroll): number {
	return Math.max(box.scrollWidth - box.clientWidth, 0);
}

/** scrollLeft clamped to [0, maxOffset] (iOS rubber band). */
export function clampOffset(box: HorizontalScroll): number {
	return Math.min(Math.max(box.scrollLeft, 0), maxOffset(box));
}

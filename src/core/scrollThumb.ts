/**
 * Scroll track geometry: where the thumb sits and how wide it is for a horizontally scrolling row, as unitless ratios.
 * CSS turns them into px against the track's own width. Plain data only.
 */

import { clampOffset, type HorizontalScroll, maxOffset, overflowEdges } from './overflowEdges';

export interface ScrollThumb { visible: boolean; widthRatio: number; progress: number }

/** The thumb of a row that does not overflow. */
export const HIDDEN_THUMB: Readonly<ScrollThumb> = { visible: false, widthRatio: 0, progress: 0 };

/**
 * Thumb geometry for a horizontally scrolling row. Visible exactly when `overflowEdges(box)` reports an edge (same
 * tolerance as the fade). widthRatio = clientWidth / scrollWidth, clamped to [0, 1]; progress = clampOffset /
 * maxOffset (0 at the start, 1 at the end). Both rounded to four decimals. LTR only.
 */
export function scrollThumb(box: HorizontalScroll): ScrollThumb {
	const edges = overflowEdges(box);
	if (!edges.start && !edges.end) return HIDDEN_THUMB;
	return {
		visible: true,
		widthRatio: roundRatio(widthRatio(box)),
		progress: roundRatio(progress(box)),
	};
}

function widthRatio(box: HorizontalScroll): number {
	return Math.min(Math.max(box.clientWidth / box.scrollWidth, 0), 1);
}

function progress(box: HorizontalScroll): number {
	return clampOffset(box) / maxOffset(box);
}

function roundRatio(value: number): number {
	return Math.round(value * 10000) / 10000;
}

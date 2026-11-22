/**
 * Bottom detection and overscroll clamping for a scroll container. Pure: callers pass the numbers in (KD1).
 */

/** Sub-pixel rounding allowance when deciding whether a scroll has reached the bottom. */
export const BOTTOM_TOLERANCE_PX = 2;

export interface ScrollMetrics {
	scrollTop: number;
	scrollHeight: number;
	clientHeight: number;
}

/** Keeps a scroll offset inside the scrollable range, so iOS rubber-band overscroll reads as the edge. */
export function clampScrollTop(metrics: ScrollMetrics): number {
	const maxScrollTop = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
	return Math.min(Math.max(metrics.scrollTop, 0), maxScrollTop);
}

/** True when the clamped scroll offset is within `tolerancePx` of the bottom. */
export function isAtBottom(metrics: ScrollMetrics, tolerancePx = BOTTOM_TOLERANCE_PX): boolean {
	return clampScrollTop(metrics) + metrics.clientHeight >= metrics.scrollHeight - tolerancePx;
}

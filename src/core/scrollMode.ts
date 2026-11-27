/**
 * Decides whether the non-floating phone bar must scroll. Pure, no history: the answer depends only on the visible
 * button count and the row's width.
 */

/**
 * The width Obsidian's phone buttons shrink to on the full-width bar (flex-shrink 1, min-content). Measured on device
 * (plan N3). A theme that changes this floor makes the rule switch to scroll mode earlier or later.
 */
export const MIN_SHRUNK_BUTTON_PX = 38;

/**
 * Extra width of the menu button: Obsidian's `margin-inline-start: var(--size-4-2)` on `.mobile-navbar-action.has-longpress-menu`,
 * measured on device 2026-11-25 (N3). It stays on the non-floating bar. A theme that changes it moves the boundary by that
 * difference.
 */
export const LONGPRESS_MENU_MARGIN_PX = 8;

/**
 * True when `visibleCount` buttons cannot fit `rowInnerWidthPx` even at their shrunk minimum, so the bar must scroll.
 * Zero or negative width, and zero buttons, never need scroll mode.
 */
export function needsScrollMode(
	visibleCount: number,
	rowInnerWidthPx: number,
	minButtonPx = MIN_SHRUNK_BUTTON_PX,
	extraPx = 0,
): boolean {
	return visibleCount > 0 && rowInnerWidthPx > 0 && visibleCount * minButtonPx + extraPx > rowInnerWidthPx;
}

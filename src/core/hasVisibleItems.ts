import type { NavItem } from './settingsModel';

/** True when at least one item (native or custom) is visible; the bar is shown only then, on phone and tablet (AC1). */
export function hasVisibleItems(items: readonly NavItem[]): boolean {
	return items.some((item) => item.visible);
}

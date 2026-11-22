/**
 * Behavioural fake of Obsidian's icon helpers. `setIcon` renders a lucide-style
 * svg; ids listed in `__unknownIcons` render nothing, as Obsidian does for a
 * missing icon. `__setIconIds` seeds the list returned by `getIconIds`.
 */

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export const __unknownIcons = new Set<string>();

let iconIds: string[] = [];

export function __setIconIds(ids: string[]): void {
	iconIds = ids;
}

export function getIconIds(): string[] {
	return iconIds;
}

export function setIcon(el: HTMLElement, iconId: string): void {
	el.replaceChildren();
	if (__unknownIcons.has(iconId)) return;

	const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
	svg.setAttribute('class', `svg-icon lucide-${iconId}`);
	svg.setAttribute('data-icon', iconId);
	el.appendChild(svg);
}

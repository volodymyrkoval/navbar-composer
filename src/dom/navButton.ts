import { setIcon } from 'obsidian';
import { ensureAttr } from './idempotentDom';

/** Data attributes on the outer element; the tap handler reads the command from `NAV_BUTTON_COMMAND_ATTR`. */
export const NAV_BUTTON_ID_ATTR = 'data-navbar-composer-id';
export const NAV_BUTTON_COMMAND_ATTR = 'data-navbar-composer-command';
export const NAV_BUTTON_ICON_ATTR = 'data-navbar-composer-icon';
/** Class of the inner element, the same one Obsidian's native buttons use for their icon. */
export const NAV_BUTTON_INNER_CLASS = 'clickable-icon';

/** What one custom button shows and runs. */
export interface NavButtonSpec {
	id: string;
	commandId: string;
	icon: string;
	label: string;
}

/**
 * Creates one custom navbar button under `parent`: an outer element with `classes` holding one inner
 * `span.clickable-icon` with the icon (KD5). Obsidian's own buttons have the same two-level shape.
 */
export function createNavButton(parent: HTMLElement, spec: NavButtonSpec, classes: readonly string[]): HTMLElement {
	const el = parent.createDiv({ cls: [...classes] });
	syncNavButton(el, spec);
	return el;
}

/** Brings an existing custom button in line with `spec`, writing only what differs (KD4). */
export function syncNavButton(el: HTMLElement, spec: NavButtonSpec): void {
	syncAttributes(el, spec);
	syncIcon(el, spec);
}

function syncAttributes(el: HTMLElement, spec: NavButtonSpec): void {
	ensureAttr(el, 'role', 'button');
	ensureAttr(el, NAV_BUTTON_ID_ATTR, spec.id);
	ensureAttr(el, NAV_BUTTON_COMMAND_ATTR, spec.commandId);
	ensureAttr(el, 'aria-label', spec.label);
}

/** Re-renders the icon only when it changed or its inner span is missing (KD4). */
function syncIcon(el: HTMLElement, spec: NavButtonSpec): void {
	const existing = findIconHost(el);
	if (existing !== null && el.getAttribute(NAV_BUTTON_ICON_ATTR) === spec.icon) {
		return;
	}
	renderIcon(existing ?? createIconHost(el), spec);
	ensureAttr(el, NAV_BUTTON_ICON_ATTR, spec.icon);
}

function renderIcon(host: HTMLElement, spec: NavButtonSpec): void {
	host.empty();
	setIcon(host, spec.icon);
	if (host.querySelector('svg') === null) {
		renderIconFallback(host, spec.label);
	}
}

/** Shows the label's first letter when the icon id has no svg (for example, after an Obsidian icon rename). */
function renderIconFallback(host: HTMLElement, label: string): void {
	host.setText(label.charAt(0).toUpperCase());
}

function findIconHost(el: HTMLElement): HTMLElement | null {
	return el.querySelector<HTMLElement>(`:scope > span.${NAV_BUTTON_INNER_CLASS}`);
}

function createIconHost(el: HTMLElement): HTMLElement {
	return el.createSpan({ cls: NAV_BUTTON_INNER_CLASS });
}

/** The command of the custom button a tap landed on, or `null` when the tap was not on one (KD6). */
export function commandIdFromEvent(event: Event): string | null {
	const target = event.target;
	if (!(target instanceof Element)) {
		return null;
	}
	return target.closest(`[${NAV_BUTTON_COMMAND_ATTR}]`)?.getAttribute(NAV_BUTTON_COMMAND_ATTR) ?? null;
}

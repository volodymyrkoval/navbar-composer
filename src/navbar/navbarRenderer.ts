/**
 * Applies a navbar layout to Obsidian's native navbar DOM, on phone and tablet alike. Natives are touched only by a
 * hidden class and the order variable (KD5); custom buttons are our own elements in the natives' row.
 */

import { ensureClassAdded, ensureClassRemoved, ensureCssVar, ensureCssVarRemoved } from '../dom/idempotentDom';
import { createNavButton, NAV_BUTTON_ID_ATTR, syncNavButton } from '../dom/navButton';
import { hasVisibleItems } from '../core/hasVisibleItems';
import { NO_PINS, pinnedEdgeIds } from '../core/pins';
import type { CustomItem, LayoutPins, NativeItem, NavItem } from '../core/settingsModel';
import { NAVBAR_ACTION_SELECTOR } from '../platform/domSelectors';
import { CUSTOM_ACTION_CLASS, locateActionsRow, locateNatives } from './nativeLocator';

export { CUSTOM_ACTION_CLASS } from './nativeLocator';

/** Hides a native action. */
export const HIDDEN_CLASS = 'navbar-composer-hidden';
/** Turns on CSS `order` for an action, so the order variable takes effect. */
export const ORDERED_CLASS = 'navbar-composer-ordered';
/** Custom property holding an action's position in the item list. */
export const ORDER_VAR = '--navbar-composer-order';
/** On the `.mobile-navbar` container while the layout has no visible items. CSS hides the phone bar with it. */
export const NAVBAR_EMPTY_CLASS = 'navbar-composer-empty';
/** On the action pinned at the start edge; CSS holds it there while the row overflows. */
export const PINNED_START_CLASS = 'navbar-composer-pinned-start';
/** On the action pinned at the end edge; CSS holds it there while the row overflows. */
export const PINNED_END_CLASS = 'navbar-composer-pinned-end';

/** Obsidian's shared action class, so our buttons get the native button styling. */
const ACTION_CLASS = 'mobile-navbar-action';
const CUSTOM_CLASSES = [ACTION_CLASS, CUSTOM_ACTION_CLASS, ORDERED_CLASS];

/** Writes only what differs, so a second `apply` on unchanged items produces no DOM mutations (KD4). */
export class NavbarRenderer {
	/** Lays `items` out on `container`: natives are hidden or ordered, visible customs are rendered in the row. */
	apply(container: HTMLElement, items: readonly NavItem[], pins: LayoutPins = NO_PINS): void {
		this.#applyNatives(container, items);
		this.#syncCustoms(container, items);
		this.#syncEmptyState(container, items);
		this.#syncPins(container, items, pins);
	}

	/** Puts the navbar back as `apply` found it: natives lose our classes and variable, our custom buttons are removed. */
	restore(container: HTMLElement): void {
		this.#restoreNatives(container);
		this.#removeCustoms(container);
		this.#clearEmptyState(container);
	}

	#applyNatives(container: HTMLElement, items: readonly NavItem[]): void {
		const natives = locateNatives(container);
		for (const [order, item] of items.entries()) {
			if (item.kind !== 'native') continue;
			const el = natives.get(item.id);
			if (el !== undefined) {
				this.#placeNative(el, item, order);
			}
		}
	}

	#restoreNatives(container: HTMLElement): void {
		for (const el of locateNatives(container).values()) {
			ensureClassRemoved(el, HIDDEN_CLASS);
			ensureClassRemoved(el, ORDERED_CLASS);
			ensureCssVarRemoved(el, ORDER_VAR);
			ensureClassRemoved(el, PINNED_START_CLASS);
			ensureClassRemoved(el, PINNED_END_CLASS);
		}
	}

	#removeCustoms(container: HTMLElement): void {
		for (const el of customButtons(container)) {
			el.remove();
		}
	}

	#clearEmptyState(container: HTMLElement): void {
		ensureClassRemoved(container, NAVBAR_EMPTY_CLASS);
	}

	#syncEmptyState(container: HTMLElement, items: readonly NavItem[]): void {
		if (hasVisibleItems(items)) {
			ensureClassRemoved(container, NAVBAR_EMPTY_CLASS);
		} else {
			ensureClassAdded(container, NAVBAR_EMPTY_CLASS);
		}
	}

	#syncPins(container: HTMLElement, items: readonly NavItem[], pins: LayoutPins): void {
		const visible = this.#visibleActions(container, items);
		const edges = pinnedEdgeIds(visible.map(({ id }) => id), pins);
		this.#markPinned(container, PINNED_START_CLASS, actionElement(visible, edges.start));
		this.#markPinned(container, PINNED_END_CLASS, actionElement(visible, edges.end));
	}

	/** Visible items in list order that have an element in the navbar, with that element. */
	#visibleActions(container: HTMLElement, items: readonly NavItem[]): VisibleAction[] {
		const natives = locateNatives(container);
		const row = locateActionsRow(container);
		const actions: VisibleAction[] = [];
		for (const item of items) {
			if (!item.visible) continue;
			const el = item.kind === 'native' ? natives.get(item.id) : findCustomButton(row, item.id);
			if (el !== undefined) actions.push({ id: item.id, el });
		}
		return actions;
	}

	#markPinned(container: HTMLElement, cls: string, target: HTMLElement | undefined): void {
		for (const el of Array.from(container.querySelectorAll<HTMLElement>(NAVBAR_ACTION_SELECTOR))) {
			if (el === target) ensureClassAdded(el, cls);
			else ensureClassRemoved(el, cls);
		}
	}

	#placeNative(el: HTMLElement, item: NativeItem, order: number): void {
		ensureClassAdded(el, ORDERED_CLASS);
		ensureCssVar(el, ORDER_VAR, String(order));
		if (item.visible) {
			ensureClassRemoved(el, HIDDEN_CLASS);
		} else {
			ensureClassAdded(el, HIDDEN_CLASS);
		}
	}

	#syncCustoms(container: HTMLElement, items: readonly NavItem[]): void {
		const row = locateActionsRow(container);
		const visible = visibleCustomsWithOrder(items);
		this.#removeStaleCustoms(row, new Set(visible.map(({ item }) => item.id)));
		for (const { item, order } of visible) {
			this.#upsertCustom(row, item, order);
		}
	}

	#removeStaleCustoms(row: HTMLElement, keepIds: ReadonlySet<string>): void {
		for (const el of customButtons(row)) {
			if (!keepIds.has(el.getAttribute(NAV_BUTTON_ID_ATTR) ?? '')) {
				el.remove();
			}
		}
	}

	#upsertCustom(row: HTMLElement, item: CustomItem, order: number): void {
		const el = findCustomButton(row, item.id) ?? createNavButton(row, item, CUSTOM_CLASSES);
		syncNavButton(el, item);
		ensureCssVar(el, ORDER_VAR, String(order));
	}
}

interface VisibleAction {
	id: string;
	el: HTMLElement;
}

function actionElement(actions: readonly VisibleAction[], id: string | null): HTMLElement | undefined {
	return actions.find((action) => action.id === id)?.el;
}

/** Visible custom items with their index in the full list, which is the order they are laid out at. */
function visibleCustomsWithOrder(items: readonly NavItem[]): Array<{ item: CustomItem; order: number }> {
	const visible: Array<{ item: CustomItem; order: number }> = [];
	for (const [order, item] of items.entries()) {
		if (item.kind === 'custom' && item.visible) {
			visible.push({ item, order });
		}
	}
	return visible;
}

function customButtons(row: HTMLElement): HTMLElement[] {
	return Array.from(row.querySelectorAll<HTMLElement>(`.${CUSTOM_ACTION_CLASS}`));
}

function findCustomButton(row: HTMLElement, id: string): HTMLElement | undefined {
	return customButtons(row).find((el) => el.getAttribute(NAV_BUTTON_ID_ATTR) === id);
}

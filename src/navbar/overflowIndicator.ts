/**
 * Overflow indicator: marks the navbar row with the edges that hide buttons, and mirrors the pinned buttons' widths so
 * the fade can start after them.
 */

import { Component } from 'obsidian';
import { LONGPRESS_MENU_MARGIN_PX, MIN_SHRUNK_BUTTON_PX, needsScrollMode } from '../core/scrollMode';
import { overflowEdges } from '../core/overflowEdges';
import type { ObserveResize } from '../dom/observeResize';
import { ensureClassAdded, ensureClassRemoved, ensureCssVar, ensureCssVarRemoved } from '../dom/idempotentDom';
import { HIDDEN_CLASS, PINNED_END_CLASS, PINNED_START_CLASS } from './navbarRenderer';
import type { ScrollTrack } from './scrollTrack';

/** Obsidian's marker on the menu (long-press) action; its margin is what `LONGPRESS_MENU_MARGIN_PX` measures. */
const LONGPRESS_MENU_CLASS = 'has-longpress-menu';

/** On the row while its visible buttons cannot fit even shrunk (needsScrollMode). CSS uses it for the non-floating phone bar only. */
export const SCROLL_MODE_CLASS = 'navbar-composer-scroll-mode';
/** On the row while content hides past its start edge. */
export const OVERFLOW_START_CLASS = 'navbar-composer-has-overflow-start';
/** On the row while content hides past its end edge. */
export const OVERFLOW_END_CLASS = 'navbar-composer-has-overflow-end';
/** Width of the start-pinned button, read by the fade mask. */
export const PIN_START_WIDTH_VAR = '--navbar-composer-pin-start-w';
/** Width of the end-pinned button, read by the fade mask. */
export const PIN_END_WIDTH_VAR = '--navbar-composer-pin-end-w';

export class OverflowIndicator extends Component {
	#row: HTMLElement | null = null;
	#binding: RowBinding | null = null;
	readonly #observeResize: ObserveResize;
	readonly #scrollTrack: ScrollTrack | null;

	constructor(observeResize: ObserveResize, scrollTrack: ScrollTrack | null = null) {
		super();
		this.#observeResize = observeResize;
		this.#scrollTrack = scrollTrack;
	}

	onload(): void {
		if (this.#scrollTrack !== null) this.addChild(this.#scrollTrack);
	}

	/**
	 * Tracks `row`, replacing the previous row. When `pill` is given, the scroll track is attached to it first. A new
	 * row is measured by its first resize callback, not here; the same row is refreshed in place.
	 */
	track(row: HTMLElement, pill: HTMLElement | null = null): void {
		this.#attachTrack(pill);
		if (row === this.#row) {
			this.refresh();
			return;
		}
		this.#bind(row);
	}

	#attachTrack(pill: HTMLElement | null): void {
		if (pill !== null) this.#scrollTrack?.attach(pill);
	}

	#bind(row: HTMLElement): void {
		this.#unbind();
		this.#row = row;
		const binding = new RowBinding(row, () => this.refresh(), this.#observeResize, (cleared) => this.#clear(cleared));
		this.#binding = this.addChild(binding);
	}

	#unbind(): void {
		if (this.#binding !== null) this.removeChild(this.#binding);
		this.#binding = null;
	}

	/** Forgets the row and binding. The child `RowBinding` has already cleared the row by now. */
	onunload(): void {
		this.#row = null;
		this.#binding = null;
	}

	/** Measures the tracked row and writes classes and pin widths (idempotent). No-op when nothing is tracked. */
	refresh(): void {
		if (this.#row === null) return;
		this.#syncScrollMode(this.#row);
		this.#syncEdges(this.#row);
		this.#syncPinWidths(this.#row);
		this.#syncTrack(this.#row);
	}

	/** Runs first in `refresh`: the edges are read after this class is set, so a scrolling row is measured as one. */
	#syncScrollMode(row: HTMLElement): void {
		const needed = needsScrollMode(
			this.#visibleButtonCount(row),
			row.clientWidth,
			MIN_SHRUNK_BUTTON_PX,
			this.#menuMarginPx(row),
		);
		setClass(row, SCROLL_MODE_CLASS, needed);
	}

	#visibleButtonCount(row: HTMLElement): number {
		return row.querySelectorAll(`:scope > .mobile-navbar-action:not(.${HIDDEN_CLASS})`).length;
	}

	/** The menu button's margin counts only while a visible menu button is in the row (a class query, no layout read). */
	#menuMarginPx(row: HTMLElement): number {
		const visibleMenu = row.querySelector(`:scope > .mobile-navbar-action.${LONGPRESS_MENU_CLASS}:not(.${HIDDEN_CLASS})`);
		return visibleMenu === null ? 0 : LONGPRESS_MENU_MARGIN_PX;
	}

	#syncTrack(row: HTMLElement): void {
		this.#scrollTrack?.sync(row);
	}

	/** Removes every class and variable this indicator writes, so the row is as it was before tracking. */
	#clear(row: HTMLElement): void {
		ensureClassRemoved(row, SCROLL_MODE_CLASS);
		ensureClassRemoved(row, OVERFLOW_START_CLASS);
		ensureClassRemoved(row, OVERFLOW_END_CLASS);
		ensureCssVarRemoved(row, PIN_START_WIDTH_VAR);
		ensureCssVarRemoved(row, PIN_END_WIDTH_VAR);
	}

	#syncEdges(row: HTMLElement): void {
		const edges = overflowEdges(row);
		setClass(row, OVERFLOW_START_CLASS, edges.start);
		setClass(row, OVERFLOW_END_CLASS, edges.end);
	}

	#syncPinWidths(row: HTMLElement): void {
		this.#syncPinWidth(row, PINNED_START_CLASS, PIN_START_WIDTH_VAR);
		this.#syncPinWidth(row, PINNED_END_CLASS, PIN_END_WIDTH_VAR);
	}

	#syncPinWidth(row: HTMLElement, cls: string, name: `--${string}`): void {
		const pinned = row.querySelector<HTMLElement>(`.${cls}`);
		if (pinned === null) {
			ensureCssVarRemoved(row, name);
		} else {
			ensureCssVar(row, name, `${pinned.offsetWidth}px`);
		}
	}
}

/** Observes one row's size for as long as it is loaded. Module-private: only `OverflowIndicator` creates it. */
class RowBinding extends Component {
	constructor(
		private readonly row: HTMLElement,
		private readonly onChange: () => void,
		private readonly observeResize: ObserveResize,
		private readonly clear: (row: HTMLElement) => void,
	) {
		super();
	}

	onload(): void {
		this.registerDomEvent(this.row, 'scroll', this.onChange, { passive: true });
		this.register(this.observeResize(this.row, this.onChange));
	}

	onunload(): void {
		this.clear(this.row);
	}
}

/** Adds `cls` when `on`, removes it otherwise; both paths are write-only-if-different. */
function setClass(el: Element, cls: string, on: boolean): void {
	if (on) ensureClassAdded(el, cls);
	else ensureClassRemoved(el, cls);
}

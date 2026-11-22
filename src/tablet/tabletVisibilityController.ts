import { Component, type Workspace } from 'obsidian';
import { isAtBottom } from '../core/scrollMetrics';
import {
	initialVisibility,
	isBarVisible,
	reduceVisibility,
	shouldShowTabletBar,
	type VisibilityEvent,
	type VisibilityState,
} from '../core/tabletVisibility';
import { ensureClassAdded, ensureClassRemoved } from '../dom/idempotentDom';
import type { ScrollDeltaTracker } from '../core/scrollTracker';
import type { NavItem } from '../core/settingsModel';
import { ROOT_SPLIT_SELECTOR } from '../platform/domSelectors';
import type { ObsidianInternals } from '../platform/obsidianInternals';
import { isActiveTabEmpty } from './activeTabProbe';
import type { ToolbarOpenWatcher } from './toolbarOpenWatcher';

/** On `body`: our CSS uses it to make Obsidian's hidden tablet navbar visible; present only while an item is visible. */
export const TABLET_BAR_SHOWN_CLASS = 'navbar-composer-tablet-bar-shown';
/** On the `.mobile-navbar` container: present while scrolling or the editing toolbar hide the bar. */
export const BAR_HIDDEN_CLASS = 'navbar-composer-bar-hidden';

/** Collaborators of the tablet visibility controller, injected so tests can supply fakes. */
export interface TabletVisibilityDeps {
	internals: ObsidianInternals;
	workspace: Workspace;
	doc: Document;
	tracker: ScrollDeltaTracker;
	toolbar: ToolbarOpenWatcher;
}

/**
 * Lifecycle owner of tablet bar visibility: turns scroll, toolbar and tab-change signals into the two classes we own
 * (KD8, KD11). Tablet only. Does nothing when Obsidian exposes no navbar (KD12); removes every class on unload.
 */
export class TabletVisibilityController extends Component {
	readonly #deps: TabletVisibilityDeps;
	#items: readonly NavItem[];
	#container: HTMLElement | null = null;
	#state: VisibilityState = initialVisibility({ toolbarOpen: false, emptyTab: false });

	constructor(deps: TabletVisibilityDeps, items: readonly NavItem[]) {
		super();
		this.#deps = deps;
		this.#items = items;
	}

	onload(): void {
		this.#container = this.#resolveContainer();
		if (this.#container === null) return;
		this.#syncShown();
		this.#initState();
		this.#listenForScroll();
		this.#listenForToolbar();
		this.#listenForContextChanges();
		this.#syncVisibility(this.#container);
	}

	/** Replaces the items and updates the shown class right away when attached (AC10); otherwise it applies on load. */
	setItems(items: readonly NavItem[]): void {
		this.#items = items;
		if (this.#container !== null) this.#syncShown();
	}

	onunload(): void {
		if (this.#container === null) return;
		this.#clearClasses(this.#container);
		this.#container = null;
	}

	/** Stays silent when the navbar is missing: the shared navbar controller already warned (KD12). */
	#resolveContainer(): HTMLElement | null {
		return this.#deps.internals.navbarContainer();
	}

	#clearClasses(container: HTMLElement): void {
		ensureClassRemoved(this.#deps.doc.body, TABLET_BAR_SHOWN_CLASS);
		ensureClassRemoved(container, BAR_HIDDEN_CLASS);
	}

	#initState(): void {
		const { toolbar, workspace } = this.#deps;
		this.#state = initialVisibility({ toolbarOpen: toolbar.isOpen(), emptyTab: isActiveTabEmpty(workspace) });
	}

	/** Capture phase, because `scroll` does not bubble from the editor's inner scrollers. */
	#listenForScroll(): void {
		this.registerDomEvent(this.#deps.doc, 'scroll', (event) => this.#onScroll(event), { capture: true, passive: true });
	}

	#onScroll(event: Event): void {
		const scroller = this.#scrollerOf(event);
		if (scroller === null) return;
		const { scrollTop, scrollHeight, clientHeight } = scroller;
		this.#dispatch({
			type: 'scrolled',
			direction: this.#deps.tracker.track(scroller, scrollTop),
			atBottom: isAtBottom({ scrollTop, scrollHeight, clientHeight }),
		});
	}

	/** Only scrolling in the main editor area counts; sidebars and popovers are ignored. */
	#scrollerOf(event: Event): HTMLElement | null {
		const target = event.target;
		return target instanceof HTMLElement && target.closest(ROOT_SPLIT_SELECTOR) !== null ? target : null;
	}

	#listenForToolbar(): void {
		this.#deps.toolbar.watch(this, (open) => this.#onToolbarChange(open));
	}

	#onToolbarChange(open: boolean): void {
		this.#dispatch({ type: 'toolbar-changed', toolbarOpen: open });
	}

	#listenForContextChanges(): void {
		const { workspace } = this.#deps;
		this.registerEvent(workspace.on('active-leaf-change', () => this.#onContextChange()));
		this.registerEvent(workspace.on('file-open', () => this.#onContextChange()));
	}

	/** A new tab or note is a fresh scroll context: forget the old anchors and show the bar again. */
	#onContextChange(): void {
		this.#deps.tracker.reset();
		this.#dispatch({ type: 'context-changed', emptyTab: isActiveTabEmpty(this.#deps.workspace) });
	}

	#dispatch(event: VisibilityEvent): void {
		this.#state = reduceVisibility(this.#state, event);
		if (this.#container !== null) this.#syncVisibility(this.#container);
	}

	#syncVisibility(container: HTMLElement): void {
		if (isBarVisible(this.#state)) {
			ensureClassRemoved(container, BAR_HIDDEN_CLASS);
		} else {
			ensureClassAdded(container, BAR_HIDDEN_CLASS);
		}
	}

	#syncShown(): void {
		const body = this.#deps.doc.body;
		if (shouldShowTabletBar(this.#items)) {
			ensureClassAdded(body, TABLET_BAR_SHOWN_CLASS);
		} else {
			ensureClassRemoved(body, TABLET_BAR_SHOWN_CLASS);
		}
	}
}

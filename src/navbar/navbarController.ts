import { Component } from 'obsidian';
import { NO_PINS } from '../core/pins';
import { NATIVE_IDS, type LayoutPins, type NavItem } from '../core/settingsModel';
import { commandIdFromEvent } from '../dom/navButton';
import type { CommandRunner } from '../platform/commandRunner';
import type { ObsidianInternals } from '../platform/obsidianInternals';
import { locateActionsRow, locateNatives } from './nativeLocator';
import type { NavbarRenderer } from './navbarRenderer';
import type { OverflowIndicator } from './overflowIndicator';
import { isScrollTrackMutation } from './scrollTrack';

/** Collaborators of the navbar controller; `warn` is injected so the single AC12 warning is observable in tests. */
export interface NavbarDeps {
	internals: ObsidianInternals;
	renderer: NavbarRenderer;
	overflow: OverflowIndicator;
	runner: CommandRunner;
	warn(message: string): void;
}

const MISSING_NAVBAR_WARNING = 'Navbar Composer: mobile navbar not found; layout disabled.';

/**
 * Lifecycle owner of the composed navbar, on phone (phone list) and tablet (tablet list) alike. Renders the items
 * onto Obsidian's navbar when loaded and restores it when unloaded. Does nothing, with one warning, when Obsidian
 * exposes no navbar (AC12, KD12).
 */
export class NavbarController extends Component {
	readonly #deps: NavbarDeps;
	#items: readonly NavItem[];
	#pins: LayoutPins;
	#container: HTMLElement | null = null;
	#warnedUnresolved = false;
	#observer: MutationObserver | null = null;

	constructor(deps: NavbarDeps, items: readonly NavItem[], pins: LayoutPins = NO_PINS) {
		super();
		this.#deps = deps;
		this.#items = items;
		this.#pins = pins;
	}

	onload(): void {
		this.#container = this.#resolveContainer();
		if (this.#container === null) return;
		this.addChild(this.#deps.overflow);
		this.#render(this.#container);
		this.#observe(this.#container);
		this.#listenForTaps(this.#container);
	}

	/** Replaces the layout and applies it right away when the navbar is attached (AC10); otherwise it applies on load. */
	setItems(items: readonly NavItem[], pins: LayoutPins = NO_PINS): void {
		this.#items = items;
		this.#pins = pins;
		if (this.#container !== null) {
			this.#render(this.#container);
		}
	}

	onunload(): void {
		if (this.#container === null) return;
		this.#deps.renderer.restore(this.#container);
		this.#container = null;
		this.#observer = null;
	}

	#resolveContainer(): HTMLElement | null {
		const container = this.#deps.internals.navbarContainer();
		if (container === null) {
			this.#deps.warn(MISSING_NAVBAR_WARNING);
		}
		return container;
	}

	#render(container: HTMLElement): void {
		this.#deps.renderer.apply(container, this.#items, this.#pins);
		this.#syncOverflow(container);
		// Discard the records our own writes just queued, or every render would trigger the next one.
		this.#observer?.takeRecords();
		this.#warnUnresolvedNatives(container);
	}

	#syncOverflow(container: HTMLElement): void {
		this.#deps.overflow.track(locateActionsRow(container), container);
	}

	/** One delegated listener on the container; native taps never match a custom button and are left alone (KD6). */
	#listenForTaps(container: HTMLElement): void {
		this.registerDomEvent(container, 'click', (event) => this.#onTap(event));
	}

	#onTap(event: Event): void {
		const commandId = commandIdFromEvent(event);
		if (commandId === null) return;
		event.preventDefault();
		this.#deps.runner.run(commandId);
	}

	/** Obsidian rebuilds or rewrites the navbar on its own; watch the container so the layout is re-applied (KD4). */
	#observe(container: HTMLElement): void {
		const observer = new MutationObserver((records) => this.#onMutations(records, container));
		observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
		this.register(() => observer.disconnect());
		this.#observer = observer;
	}

	/** A batch made only of scroll track writes is the thumb moving, not a layout change, so it does not re-render (KD-11). */
	#onMutations(records: MutationRecord[], container: HTMLElement): void {
		if (records.every(isScrollTrackMutation)) return;
		this.#render(container);
	}

	/** Natives we cannot identify are left untouched; say so once per session rather than on every render. */
	#warnUnresolvedNatives(container: HTMLElement): void {
		if (this.#warnedUnresolved) return;
		const located = locateNatives(container);
		const unresolved = NATIVE_IDS.filter((id) => !located.has(id));
		if (unresolved.length === 0) return;
		this.#warnedUnresolved = true;
		this.#deps.warn(`Navbar Composer: could not identify native buttons: ${unresolved.join(', ')}.`);
	}
}

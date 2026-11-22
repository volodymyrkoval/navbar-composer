import type { Component } from 'obsidian';
import { TOOLBAR_OPEN_CLASS } from '../platform/domSelectors';

/**
 * Reports transitions of Obsidian's editing toolbar, signalled by `mod-toolbar-open` on `body`. Body classes change
 * often for unrelated reasons, so callers hear only open/close transitions, never every class change.
 */
export class ToolbarOpenWatcher {
	readonly #body: HTMLElement;
	#last = false;

	constructor(body: HTMLElement) {
		this.#body = body;
	}

	isOpen(): boolean {
		return this.#body.classList.contains(TOOLBAR_OPEN_CLASS);
	}

	/** Calls `onChange` on each open/close transition until `owner` unloads. */
	watch(owner: Component, onChange: (open: boolean) => void): void {
		owner.register(this.#observe(onChange));
	}

	/** Starts observing and returns the function that stops it. */
	#observe(onChange: (open: boolean) => void): () => void {
		this.#last = this.isOpen();
		const observer = new MutationObserver(() => this.#onMutations(onChange));
		observer.observe(this.#body, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	}

	#onMutations(onChange: (open: boolean) => void): void {
		const open = this.isOpen();
		if (open === this.#last) return;
		this.#last = open;
		onChange(open);
	}
}

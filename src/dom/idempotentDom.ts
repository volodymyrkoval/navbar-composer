/**
 * Write-only-if-different DOM helpers. Obsidian's navbar is observed by our own MutationObserver (KD4), so an
 * unchanged write still produces a mutation record and would re-trigger the observer.
 */

/** Adds `cls` only when the element lacks it. */
export function ensureClassAdded(el: Element, cls: string): void {
	if (!el.classList.contains(cls)) {
		el.classList.add(cls);
	}
}

/** Removes `cls` only when the element has it. */
export function ensureClassRemoved(el: Element, cls: string): void {
	if (el.classList.contains(cls)) {
		el.classList.remove(cls);
	}
}

/** Sets the attribute only when its value differs. */
export function ensureAttr(el: Element, name: string, value: string): void {
	if (el.getAttribute(name) !== value) {
		el.setAttribute(name, value);
	}
}

/** Sets a custom property through Obsidian's `setCssProps`. Reads only the inline value, never computed styles. */
export function ensureCssVar(el: HTMLElement, name: `--${string}`, value: string): void {
	if (el.style.getPropertyValue(name) !== value) {
		el.setCssProps({ [name]: value });
	}
}

/**
 * Removes a custom property only when it is set. Drops the `style` attribute too when that leaves it empty, so an
 * element that had no inline style before we touched it is restored to exactly that.
 */
export function ensureCssVarRemoved(el: HTMLElement, name: `--${string}`): void {
	if (el.style.getPropertyValue(name) === '') return;
	el.style.removeProperty(name);
	if (el.style.length === 0) {
		el.removeAttribute('style');
	}
}

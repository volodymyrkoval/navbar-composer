/**
 * Resize adapter: wraps the browser's ResizeObserver so the overflow indicator can be tested without layout (jsdom has
 * none).
 */

/** Calls `onResize` on every size change of `el` (and once after observing); returns the disconnect function. */
export type ObserveResize = (el: HTMLElement, onResize: () => void) => () => void;

/** `activeWindow.ResizeObserver`-backed; returns a no-op disconnect when the constructor is missing (jsdom). */
export const observeResize: ObserveResize = (el, onResize) => {
	// Obsidian types `activeWindow` as `Window`, which omits the constructors that live on `typeof globalThis`.
	const Observer = (activeWindow as Window & typeof globalThis).ResizeObserver;
	if (typeof Observer === 'undefined') return () => undefined;
	const observer = new Observer(() => onResize());
	observer.observe(el);
	return () => observer.disconnect();
};

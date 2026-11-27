/**
 * Frame adapter: wraps the browser's requestAnimationFrame so the scroll track can be tested without a real animation
 * loop (jsdom has none).
 */

/** Schedules `callback` for the next animation frame; returns the cancel function. */
export type RequestFrame = (callback: () => void) => () => void;

/** `activeWindow.requestAnimationFrame`-backed; the returned cancel function calls `cancelAnimationFrame` for that frame. */
export const requestFrame: RequestFrame = (callback) => {
	// Same cast as observeResize.ts: `activeWindow` is typed narrower than the global window.
	const win = activeWindow as Window & typeof globalThis;
	const id = win.requestAnimationFrame(() => callback());
	return () => win.cancelAnimationFrame(id);
};

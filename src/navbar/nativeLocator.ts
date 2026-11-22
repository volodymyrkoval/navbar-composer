/**
 * Finds Obsidian's native navbar action elements inside a navbar container. Reads only class lists and the DOM
 * structure, never computed styles (plan: Technical notes → Never read computed styles).
 */

import { identifyNatives } from '../core/nativeIdentification';
import type { NativeId } from '../core/settingsModel';
import { NAVBAR_ACTION_SELECTOR } from '../platform/domSelectors';

/** Class of our own custom buttons. They also carry the native action class, so queries exclude them by this class. */
export const CUSTOM_ACTION_CLASS = 'navbar-composer-action';

function nativeActions(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(`${NAVBAR_ACTION_SELECTOR}:not(.${CUSTOM_ACTION_CLASS})`));
}

/** Maps each identifiable native to its action element. Natives that cannot be identified are absent. */
export function locateNatives(container: HTMLElement): Map<NativeId, HTMLElement> {
	const actions = nativeActions(container);
	const indexById = identifyNatives(actions.map((action) => ({ classes: Array.from(action.classList) })));
	const natives = new Map<NativeId, HTMLElement>();
	for (const [id, index] of indexById) {
		natives.set(id, actions[index]!);
	}
	return natives;
}

/** The element that holds the native actions (their parent), or the container when there are none. */
export function locateActionsRow(container: HTMLElement): HTMLElement {
	return nativeActions(container)[0]?.parentElement ?? container;
}

/**
 * Maps Obsidian's native navbar actions to our `NativeId`s from their DOM classes and position. Pure: takes plain
 * class lists, never touches the DOM (KD1).
 */

import { type NativeId, NATIVE_IDS } from './settingsModel';

/** Per-action class Obsidian puts on each native action. Confirmed on iPhone and iPad (Spike results, item 1). */
export const NATIVE_ACTION_CLASS: Readonly<Record<NativeId, string>> = {
	back: 'mobile-navbar-action-back',
	forward: 'mobile-navbar-action-forward',
	'quick-switcher': 'mobile-navbar-action-quick-switcher',
	'new-tab': 'mobile-navbar-action-new-tab',
	tabs: 'mobile-navbar-action-tabs',
	menu: 'mobile-navbar-action-menu',
};

/** Index of each native in Obsidian's DOM order. Confirmed on iPhone and iPad (Spike results, item 1). */
export const NATIVE_POSITION: Readonly<Record<NativeId, number>> = {
	back: 0,
	forward: 1,
	'quick-switcher': 2,
	'new-tab': 3,
	tabs: 4,
	menu: 5,
};

/** Plain description of one native action element: the only thing identification needs. */
export interface ActionDescriptor {
	classes: readonly string[];
}

/** Returns each identified native mapped to the index of its action. Unidentified natives are absent. */
export function identifyNatives(actions: readonly ActionDescriptor[]): Map<NativeId, number> {
	return claimByPosition(actions, claimByClass(actions));
}

/** Pass 2: only when exactly six actions exist, each unclaimed native takes its DOM-order index. */
function claimByPosition(actions: readonly ActionDescriptor[], claimed: Map<NativeId, number>): Map<NativeId, number> {
	const identified = new Map(claimed);
	if (actions.length !== NATIVE_IDS.length) {
		return identified;
	}
	const takenIndices = new Set(identified.values());
	for (const id of NATIVE_IDS) {
		if (!identified.has(id) && !takenIndices.has(NATIVE_POSITION[id])) {
			identified.set(id, NATIVE_POSITION[id]);
		}
	}
	return identified;
}

/** Pass 1: a native is claimed by the first action carrying its per-action class. */
function claimByClass(actions: readonly ActionDescriptor[]): Map<NativeId, number> {
	const claimed = new Map<NativeId, number>();
	for (const id of NATIVE_IDS) {
		const takenIndices = new Set(claimed.values());
		const actionClass = NATIVE_ACTION_CLASS[id];
			const index = actions.findIndex((action, actionIndex) => !takenIndices.has(actionIndex) && action.classes.includes(actionClass));
		if (index !== -1) {
			claimed.set(id, index);
		}
	}
	return claimed;
}

/**
 * Tablet show/hide rules for Obsidian's navbar. Pure reducer over plain events; the controller feeds it scroll,
 * toolbar and context changes (KD1, KD8).
 */

import { type ScrollDirection } from './scrollTracker';

export interface VisibilityState {
	scrolledAway: boolean;
	toolbarOpen: boolean;
	emptyTab: boolean;
}

export type VisibilityEvent =
	| { type: 'scrolled'; direction: ScrollDirection | null; atBottom: boolean }
	| { type: 'toolbar-changed'; toolbarOpen: boolean }
	| { type: 'context-changed'; emptyTab: boolean };

export function initialVisibility(input: { toolbarOpen: boolean; emptyTab: boolean }): VisibilityState {
	return { scrolledAway: false, ...input };
}

/** Applies one event and returns the next state. Never mutates the input state. */
export function reduceVisibility(state: VisibilityState, event: VisibilityEvent): VisibilityState {
	switch (event.type) {
		case 'scrolled':
			return onScrolled(state, event);
		case 'toolbar-changed':
			return onToolbarChanged(state, event.toolbarOpen);
		case 'context-changed':
			return onContextChanged(state, event.emptyTab);
	}
}

/** The bar is hidden by the editing toolbar always, and by scrolling away unless the tab is empty. */
export function isBarVisible(state: VisibilityState): boolean {
	return !state.toolbarOpen && (state.emptyTab || !state.scrolledAway);
}

/** Reaching the bottom beats a downward move; a move past the threshold in either direction updates the flag. */
function onScrolled(state: VisibilityState, event: Extract<VisibilityEvent, { type: 'scrolled' }>): VisibilityState {
	if (event.atBottom) {
		return { ...state, scrolledAway: false };
	}
	if (event.direction === 'down') {
		return { ...state, scrolledAway: true };
	}
	if (event.direction === 'up') {
		return { ...state, scrolledAway: false };
	}
	return state;
}

function onToolbarChanged(state: VisibilityState, toolbarOpen: boolean): VisibilityState {
	return { ...state, toolbarOpen };
}

/** A new context starts with the bar shown again; the toolbar flag belongs to the editor, not the tab, so it stays. */
function onContextChanged(state: VisibilityState, emptyTab: boolean): VisibilityState {
	return { ...state, emptyTab, scrolledAway: false };
}

import { describe, expect, it } from 'vitest';
import { createDefaultSettings, type CustomItem, type NavItem } from '../../src/core/settingsModel';
import { initialVisibility, isBarVisible, reduceVisibility, shouldShowTabletBar, type VisibilityState } from '../../src/core/tabletVisibility';

const FRESH_TAB = initialVisibility({ toolbarOpen: false, emptyTab: false });
const EMPTY_TAB = initialVisibility({ toolbarOpen: false, emptyTab: true });

const HIDDEN_CUSTOM: CustomItem = { kind: 'custom', id: 'custom-1', commandId: 'app:help', icon: 'help', label: 'Help', visible: false };
const VISIBLE_CUSTOM: CustomItem = { ...HIDDEN_CUSTOM, id: 'custom-2', visible: true };

function scroll(state: VisibilityState, direction: 'up' | 'down' | null, atBottom = false): VisibilityState {
	return reduceVisibility(state, { type: 'scrolled', direction, atBottom });
}

describe('tablet bar visibility', () => {
	it('shows the bar on a fresh tab', () => {
		expect(isBarVisible(FRESH_TAB)).toBe(true);
	});

	it('hides the bar after the user scrolls down past the threshold', () => {
		expect(isBarVisible(scroll(FRESH_TAB, 'down'))).toBe(false);
	});

	it('shows the bar again when the user scrolls back up', () => {
		expect(isBarVisible(scroll(scroll(FRESH_TAB, 'down'), 'up'))).toBe(true);
	});

	it('shows the bar again when the user reaches the bottom', () => {
		expect(isBarVisible(scroll(scroll(FRESH_TAB, 'down'), null, true))).toBe(true);
	});

	it('hides the bar while the editing toolbar is open and restores it when closed', () => {
		const opened = reduceVisibility(FRESH_TAB, { type: 'toolbar-changed', toolbarOpen: true });
		const closed = reduceVisibility(opened, { type: 'toolbar-changed', toolbarOpen: false });

		expect(isBarVisible(opened)).toBe(false);
		expect(isBarVisible(closed)).toBe(true);
	});

	it('shows the bar again when the context changes after scrolling away', () => {
		const changed = reduceVisibility(scroll(FRESH_TAB, 'down'), { type: 'context-changed', emptyTab: false });

		expect(isBarVisible(changed)).toBe(true);
	});

	it('keeps the bar visible on an empty tab even after scrolling down', () => {
		expect(isBarVisible(scroll(EMPTY_TAB, 'down'))).toBe(true);
	});

	it('shows the bar at the bottom even when the same event reports a downward move', () => {
		expect(isBarVisible(scroll(FRESH_TAB, 'down', true))).toBe(true);
	});

	it('hides the bar while the toolbar is open even on an empty tab', () => {
		const opened = reduceVisibility(EMPTY_TAB, { type: 'toolbar-changed', toolbarOpen: true });

		expect(isBarVisible(opened)).toBe(false);
	});

	it('clears a scroll-away on context change without clearing the open toolbar', () => {
		const scrolledWhileEditing = reduceVisibility(scroll(FRESH_TAB, 'down'), { type: 'toolbar-changed', toolbarOpen: true });
		const contextChanged = reduceVisibility(scrolledWhileEditing, { type: 'context-changed', emptyTab: false });

		expect(isBarVisible(contextChanged)).toBe(false);
		expect(isBarVisible(reduceVisibility(contextChanged, { type: 'toolbar-changed', toolbarOpen: false }))).toBe(true);
	});

	it('leaves the state unchanged when the scroll direction is null', () => {
		const scrolledAway = scroll(FRESH_TAB, 'down');

		expect(scroll(scrolledAway, null)).toEqual(scrolledAway);
	});

	it('never mutates the input state', () => {
		const state: VisibilityState = { ...FRESH_TAB };
		const snapshot = { ...state };

		reduceVisibility(state, { type: 'scrolled', direction: 'down', atBottom: false });
		reduceVisibility(state, { type: 'toolbar-changed', toolbarOpen: true });
		reduceVisibility(state, { type: 'context-changed', emptyTab: true });

		expect(state).toEqual(snapshot);
	});
});

describe('shouldShowTabletBar', () => {
	it('shows the tablet bar when at least one item is visible', () => {
		const items: NavItem[] = [{ kind: 'native', id: 'back', visible: true }];

		expect(shouldShowTabletBar(items)).toBe(true);
	});

	it('hides the tablet bar for an empty list', () => {
		expect(shouldShowTabletBar([])).toBe(false);
	});

	it('hides the tablet bar for the fresh-install tablet defaults (all natives hidden)', () => {
		expect(shouldShowTabletBar(createDefaultSettings().tablet)).toBe(false);
	});

	it('hides the tablet bar when every custom item is hidden', () => {
		expect(shouldShowTabletBar([HIDDEN_CUSTOM])).toBe(false);
	});

	it('shows the tablet bar when a single custom item is visible among hidden natives', () => {
		const items: NavItem[] = [...createDefaultSettings().tablet, VISIBLE_CUSTOM];

		expect(shouldShowTabletBar(items)).toBe(true);
	});
});

import { describe, expect, it } from 'vitest';
import { NAVBAR_ACTION_SELECTOR, ROOT_SPLIT_SELECTOR, TOOLBAR_OPEN_CLASS } from '../../src/platform/domSelectors';

describe('domSelectors', () => {
	it('pins the undocumented Obsidian markup names confirmed by the spikes', () => {
		expect(NAVBAR_ACTION_SELECTOR).toBe('.mobile-navbar-action');
		expect(ROOT_SPLIT_SELECTOR).toBe('.workspace-split.mod-root');
		expect(TOOLBAR_OPEN_CLASS).toBe('mod-toolbar-open');
	});
});

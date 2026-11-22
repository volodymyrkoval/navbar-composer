import type { Workspace } from 'obsidian';
import { describe, expect, it } from 'vitest';
import { isActiveTabEmpty } from '../../src/tablet/activeTabProbe';
import { createFakeApp } from '../fakes/fakeApp';

function workspaceWith(viewType: string | null) {
	const { app } = createFakeApp({ navbar: null, omitCommands: true });
	app.workspace.setActiveViewType(viewType);
	return app.workspace as unknown as Pick<Workspace, 'getMostRecentLeaf'>;
}

describe('isActiveTabEmpty', () => {
	it('reports an empty tab when there is no recent leaf', () => {
		expect(isActiveTabEmpty(workspaceWith(null))).toBe(true);
	});

	it('reports an empty tab when the recent leaf shows the empty view', () => {
		expect(isActiveTabEmpty(workspaceWith('empty'))).toBe(true);
	});

	it('reports a non-empty tab when the recent leaf shows a note', () => {
		expect(isActiveTabEmpty(workspaceWith('markdown'))).toBe(false);
	});
});

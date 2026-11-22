import type { Workspace } from 'obsidian';

/**
 * Whether the tab the user is looking at has no note in it: no recent leaf, or one showing the empty view.
 * Uses the public `getMostRecentLeaf` rather than `activeLeaf`.
 */
export function isActiveTabEmpty(workspace: Pick<Workspace, 'getMostRecentLeaf'>): boolean {
	const leaf = workspace.getMostRecentLeaf();
	return leaf === null || leaf.view.getViewType() === 'empty';
}

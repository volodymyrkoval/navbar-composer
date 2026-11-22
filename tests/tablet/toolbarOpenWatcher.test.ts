import { Component } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOLBAR_OPEN_CLASS } from '../../src/platform/domSelectors';
import { ToolbarOpenWatcher } from '../../src/tablet/toolbarOpenWatcher';

/** Lets the body MutationObserver deliver its records; jsdom delivers them asynchronously. */
async function flushObserver(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

describe('ToolbarOpenWatcher', () => {
	let owner: Component;

	beforeEach(() => {
		owner = new Component();
		owner.load();
	});

	afterEach(() => {
		owner.unload();
		document.body.className = '';
	});

	it('reports open while the body carries the toolbar class', () => {
		document.body.classList.add(TOOLBAR_OPEN_CLASS);

		expect(new ToolbarOpenWatcher(document.body).isOpen()).toBe(true);
	});

	it('reports the transition when the toolbar opens', async () => {
		const onChange = vi.fn<(open: boolean) => void>();
		new ToolbarOpenWatcher(document.body).watch(owner, onChange);

		document.body.classList.add(TOOLBAR_OPEN_CLASS);
		await flushObserver();

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith(true);
	});

	it('reports the transition when the toolbar closes', async () => {
		document.body.classList.add(TOOLBAR_OPEN_CLASS);
		const onChange = vi.fn<(open: boolean) => void>();
		new ToolbarOpenWatcher(document.body).watch(owner, onChange);

		document.body.classList.remove(TOOLBAR_OPEN_CLASS);
		await flushObserver();

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith(false);
	});

	it('stays silent for unrelated body class changes', async () => {
		const onChange = vi.fn<(open: boolean) => void>();
		new ToolbarOpenWatcher(document.body).watch(owner, onChange);

		document.body.classList.add('hide-cursor');
		document.body.classList.add('keyboard-animating');
		await flushObserver();

		expect(onChange).not.toHaveBeenCalled();
	});

	it('reports nothing when the toolbar class is set again while already open', async () => {
		document.body.classList.add(TOOLBAR_OPEN_CLASS);
		const onChange = vi.fn<(open: boolean) => void>();
		new ToolbarOpenWatcher(document.body).watch(owner, onChange);

		document.body.classList.add('hide-cursor');
		await flushObserver();

		expect(onChange).not.toHaveBeenCalled();
	});

	it('stops reporting once its owner unloads', async () => {
		const onChange = vi.fn<(open: boolean) => void>();
		new ToolbarOpenWatcher(document.body).watch(owner, onChange);
		owner.unload();

		document.body.classList.add(TOOLBAR_OPEN_CLASS);
		await flushObserver();

		expect(onChange).not.toHaveBeenCalled();
	});
});

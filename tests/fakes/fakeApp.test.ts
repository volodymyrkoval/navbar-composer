import { describe, expect, it, vi } from 'vitest';
import { createFakeApp } from './fakeApp';

describe('createFakeApp', () => {
	it('exposes the navbar container as app.mobileNavbar.containerEl by default', () => {
		const { app } = createFakeApp();

		expect(app.mobileNavbar?.containerEl.matches('.mobile-navbar.mod-raised')).toBe(true);
	});

	it('lists and finds the commands it was given', () => {
		const goBack = { id: 'app:go-back', name: 'Go back' };
		const { app } = createFakeApp({ commands: [goBack] });

		expect(app.commands?.listCommands()).toEqual([goBack]);
		expect(app.commands?.findCommand('app:go-back')).toEqual(goBack);
		expect(app.commands?.findCommand('app:missing')).toBeNull();
	});

	it('executes known command ids, reports unknown ones, and records every call', () => {
		const { app } = createFakeApp({ commands: [{ id: 'app:go-back', name: 'Go back' }] });

		expect(app.commands?.executeCommandById('app:go-back')).toBe(true);
		expect(app.commands?.executeCommandById('app:missing')).toBe(false);
		expect(app.commands?.executeCommandById).toHaveBeenCalledWith('app:go-back');
	});

	it('runs onLayoutReady callbacks immediately, since the layout is already ready', () => {
		const { workspace } = createFakeApp();
		const onReady = vi.fn();

		workspace.onLayoutReady(onReady);

		expect(onReady).toHaveBeenCalledTimes(1);
	});

	it('reports the view type set as the most recent leaf, and no leaf once cleared', () => {
		const { workspace } = createFakeApp();

		workspace.setActiveViewType('markdown');
		expect(workspace.getMostRecentLeaf()?.view.getViewType()).toBe('markdown');

		workspace.setActiveViewType(null);
		expect(workspace.getMostRecentLeaf()).toBeNull();
	});

	it('gives the workspace a container element to attach listeners to', () => {
		const { workspace } = createFakeApp();

		expect(workspace.containerEl).toBeInstanceOf(HTMLElement);
	});

	it('returns the same commands fake that app.commands holds, for direct assertions', () => {
		const { app, commands } = createFakeApp();

		expect(commands).toBe(app.commands);
	});

	it('omits app.commands when omitCommands is set', () => {
		const { app } = createFakeApp({ omitCommands: true });

		expect(app.commands).toBeUndefined();
	});

	it('omits app.mobileNavbar when the navbar option is null', () => {
		const { app } = createFakeApp({ navbar: null });

		expect(app.mobileNavbar).toBeUndefined();
	});
});

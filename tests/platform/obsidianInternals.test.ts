import { describe, expect, it } from 'vitest';
import type { App } from 'obsidian';
import { createObsidianInternals } from '../../src/platform/obsidianInternals';
import { createFakeApp } from '../fakes/fakeApp';

function internalsFor(harness: ReturnType<typeof createFakeApp>) {
	return createObsidianInternals(harness.app as unknown as App);
}

describe('createObsidianInternals', () => {
	describe('navbarContainer', () => {
		it('returns the native navbar container element', () => {
			const harness = createFakeApp();

			expect(internalsFor(harness).navbarContainer()).toBe(harness.app.mobileNavbar?.containerEl);
		});

		it('returns null when Obsidian exposes no navbar', () => {
			const harness = createFakeApp({ navbar: null });

			expect(internalsFor(harness).navbarContainer()).toBeNull();
		});
	});

	describe('commands.list', () => {
		it('lists every command the app knows as id and name', () => {
			const harness = createFakeApp({ commands: [{ id: 'app:go-back', name: 'Go back' }] });

			expect(internalsFor(harness).commands.list()).toEqual([{ id: 'app:go-back', name: 'Go back' }]);
		});

		it('lists nothing when Obsidian exposes no command registry', () => {
			const harness = createFakeApp({ omitCommands: true });

			expect(internalsFor(harness).commands.list()).toEqual([]);
		});
	});

	describe('commands.find', () => {
		it('returns the command with the given id', () => {
			const goBack = { id: 'app:go-back', name: 'Go back' };
			const harness = createFakeApp({ commands: [goBack] });

			expect(internalsFor(harness).commands.find('app:go-back')).toEqual(goBack);
		});

		it('returns null for an unknown id', () => {
			const harness = createFakeApp({ commands: [{ id: 'app:go-back', name: 'Go back' }] });

			expect(internalsFor(harness).commands.find('app:missing')).toBeNull();
		});

		it('returns null when Obsidian exposes no command registry', () => {
			const harness = createFakeApp({ omitCommands: true });

			expect(internalsFor(harness).commands.find('app:go-back')).toBeNull();
		});
	});

	describe('commands.execute', () => {
		it('runs the command and reports success', () => {
			const harness = createFakeApp({ commands: [{ id: 'app:go-back', name: 'Go back' }] });

			expect(internalsFor(harness).commands.execute('app:go-back')).toBe(true);
			expect(harness.commands?.executeCommandById).toHaveBeenCalledWith('app:go-back');
		});

		it('reports failure for an id Obsidian does not know', () => {
			const harness = createFakeApp({ commands: [{ id: 'app:go-back', name: 'Go back' }] });

			expect(internalsFor(harness).commands.execute('app:missing')).toBe(false);
		});

		it('reports failure when Obsidian exposes no command registry', () => {
			const harness = createFakeApp({ omitCommands: true });

			expect(internalsFor(harness).commands.execute('app:go-back')).toBe(false);
		});
	});
});

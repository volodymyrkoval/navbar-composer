import { describe, expect, it, vi } from 'vitest';
import { AddButtonFlow } from '../../src/settings/addButtonFlow';
import type { Pickers } from '../../src/settings/pickers/pickers';
import type { CommandInfo } from '../../src/platform/obsidianInternals';
import { SettingsStore } from '../../src/core/settingsStore';
import { createDefaultSettings, type NavItem } from '../../src/core/settingsModel';

const SAVE = { id: 'app:save', name: 'Save file' };

function lastOf(items: readonly NavItem[]): NavItem | undefined {
	return items[items.length - 1];
}

/** A picker fake that answers with the given choices; a `null` choice is a cancel (the callback never runs). */
function pickersChoosing(command: CommandInfo | null, icon: string | null): Pickers {
	return {
		pickCommand: (onChoose) => {
			if (command !== null) onChoose(command);
		},
		pickIcon: (onChoose) => {
			if (icon !== null) onChoose(icon);
		},
	};
}

function createStore(): SettingsStore {
	return new SettingsStore(createDefaultSettings(), {
		persist: vi.fn(async () => {}),
		onPersistError: vi.fn(),
	});
}

describe('AddButtonFlow', () => {
	it('appends a visible custom button labelled with the command name to the chosen device', () => {
		const store = createStore();
		const flow = new AddButtonFlow({ pickers: pickersChoosing(SAVE, 'save'), store, newId: () => 'custom-1' });

		flow.start('phone');

		const added = lastOf(store.current.phone);
		expect(added).toEqual({ kind: 'custom', id: 'custom-1', commandId: 'app:save', icon: 'save', label: 'Save file', visible: true });
	});

	it('adds nothing when the icon picker is cancelled', () => {
		const store = createStore();
		const flow = new AddButtonFlow({ pickers: pickersChoosing(SAVE, null), store, newId: () => 'custom-1' });

		flow.start('phone');

		expect(store.current).toEqual(createDefaultSettings());
	});

	it('adds nothing and never opens the icon picker when the command picker is cancelled', () => {
		const store = createStore();
		const pickIcon = vi.fn();
		const pickers: Pickers = { pickCommand: () => {}, pickIcon };
		const flow = new AddButtonFlow({ pickers, store, newId: () => 'custom-1' });

		flow.start('phone');

		expect(pickIcon).not.toHaveBeenCalled();
		expect(store.current).toEqual(createDefaultSettings());
	});

	it('leaves the other device list untouched', () => {
		const store = createStore();
		const flow = new AddButtonFlow({ pickers: pickersChoosing(SAVE, 'save'), store, newId: () => 'custom-1' });

		flow.start('tablet');

		expect(store.current.phone).toEqual(createDefaultSettings().phone);
		expect(lastOf(store.current.tablet)).toMatchObject({ kind: 'custom', label: 'Save file' });
	});
});

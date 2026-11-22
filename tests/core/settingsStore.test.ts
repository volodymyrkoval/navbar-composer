import { describe, expect, it, vi } from 'vitest';
import { SettingsStore, type SettingsStoreDeps } from '../../src/core/settingsStore';
import { toggleVisible, withDevice } from '../../src/core/listOps';
import { createDefaultSettings, type Settings } from '../../src/core/settingsModel';

function createDeps(overrides: Partial<SettingsStoreDeps> = {}): SettingsStoreDeps {
	return {
		persist: vi.fn(async () => {}),
		onPersistError: vi.fn(),
		...overrides,
	};
}

function showTabletBack(settings: Settings): Settings {
	return withDevice(settings, 'tablet', (items) => toggleVisible(items, 'back'));
}

describe('SettingsStore', () => {
	it('exposes the initial settings as current', () => {
		const initial = createDefaultSettings();
		const store = new SettingsStore(initial, createDeps());

		expect(store.current).toBe(initial);
	});

	it('applies an update to the current settings', async () => {
		const store = new SettingsStore(createDefaultSettings(), createDeps());

		await store.update(showTabletBack);

		expect(store.current.tablet[0]).toEqual({ kind: 'native', id: 'back', visible: true });
	});

	it('persists the full updated snapshot', async () => {
		const persist = vi.fn(async () => {});
		const store = new SettingsStore(createDefaultSettings(), createDeps({ persist }));

		await store.update(showTabletBack);

		expect(persist).toHaveBeenCalledWith(store.current);
	});

	it('notifies subscribers with the new settings synchronously, before persisting', () => {
		const calls: string[] = [];
		const deps = createDeps({
			persist: vi.fn(async () => {
				calls.push('persist');
			}),
		});
		const store = new SettingsStore(createDefaultSettings(), deps);
		store.subscribe((settings) => {
			calls.push(`notify:${settings.tablet[0]?.id}:${String(settings.tablet[0]?.visible)}`);
		});

		void store.update(showTabletBack);

		expect(calls).toEqual(['notify:back:true', 'persist']);
	});

	it('stops notifying a listener after its unsubscribe function is called', async () => {
		const store = new SettingsStore(createDefaultSettings(), createDeps());
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);

		unsubscribe();
		await store.update(showTabletBack);

		expect(listener).not.toHaveBeenCalled();
	});

	it('persists rapid updates one at a time, in call order', async () => {
		const persisted: Settings[] = [];
		const resolvers: Array<() => void> = [];
		const deps = createDeps({
			persist: vi.fn(
				(settings: Settings) =>
					new Promise<void>((resolve) => {
						persisted.push(settings);
						resolvers.push(resolve);
					}),
			),
		});
		const store = new SettingsStore(createDefaultSettings(), deps);

		const first = store.update(showTabletBack);
		const second = store.update((settings) => withDevice(settings, 'phone', (items) => toggleVisible(items, 'back')));

		expect(persisted).toHaveLength(1);
		resolvers[0]?.();
		await first;
		expect(persisted).toHaveLength(2);
		resolvers[1]?.();
		await second;
		expect(persisted[1]).toBe(store.current);
	});

	it('keeps the new state and reports a failed save once to onPersistError', async () => {
		const error = new Error('disk full');
		const onPersistError = vi.fn();
		const store = new SettingsStore(
			createDefaultSettings(),
			createDeps({
				persist: vi.fn(async () => {
					throw error;
				}),
				onPersistError,
			}),
		);

		await store.update(showTabletBack);

		expect(store.current.tablet[0]?.visible).toBe(true);
		expect(onPersistError).toHaveBeenCalledTimes(1);
		expect(onPersistError).toHaveBeenCalledWith(error);
	});

	it('keeps persisting later updates after a failed save', async () => {
		const persisted: Settings[] = [];
		const persist = vi.fn(async (settings: Settings) => {
			persisted.push(settings);
			if (persisted.length === 1) throw new Error('disk full');
		});
		const store = new SettingsStore(createDefaultSettings(), createDeps({ persist }));

		await store.update(showTabletBack);
		await store.update((settings) => withDevice(settings, 'phone', (items) => toggleVisible(items, 'back')));

		expect(persisted).toHaveLength(2);
		expect(persisted[1]).toBe(store.current);
	});
});

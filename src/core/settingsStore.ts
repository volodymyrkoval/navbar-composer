/**
 * Holds the current settings, notifies subscribers and persists snapshots in call order (KD10).
 */

import type { Settings } from './settingsModel';

export interface SettingsStoreDeps {
	persist(settings: Settings): Promise<void>;
	onPersistError(error: unknown): void;
}

export type SettingsListener = (settings: Settings) => void;

/**
 * Single source of truth for the navbar layout. `update` applies a change synchronously, then
 * persists the snapshot after every earlier write has finished.
 */
export class SettingsStore {
	readonly #deps: SettingsStoreDeps;
	readonly #listeners = new Set<SettingsListener>();
	#state: Settings;
	#persistChain: Promise<void> | null = null;

	constructor(initial: Settings, deps: SettingsStoreDeps) {
		this.#state = initial;
		this.#deps = deps;
	}

	get current(): Settings {
		return this.#state;
	}

	/** Registers a listener; the returned function removes it. */
	subscribe(listener: SettingsListener): () => void {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}

	/** Applies `change`, notifies listeners, then persists. The promise settles when this write is saved. */
	update(change: (settings: Settings) => Settings): Promise<void> {
		this.#apply(change(this.#state));
		this.#notify();
		return this.#persist(this.#state);
	}

	#apply(next: Settings): void {
		this.#state = next;
	}

	#notify(): void {
		for (const listener of this.#listeners) listener(this.#state);
	}

	#persist(snapshot: Settings): Promise<void> {
		const write = () => this.#save(snapshot);
		const persisted = this.#persistChain ? this.#persistChain.then(write) : write();
		this.#persistChain = persisted;
		return persisted;
	}

	/** One write. A failure goes to `onPersistError` and never breaks the chain. */
	#save(snapshot: Settings): Promise<void> {
		return this.#deps.persist(snapshot).catch((error: unknown) => {
			this.#deps.onPersistError(error);
		});
	}
}

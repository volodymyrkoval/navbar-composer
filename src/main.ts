import { Notice, Platform, Plugin } from 'obsidian';
import { resolveDeviceMode, type DeviceMode } from './core/deviceMode';
import { pinsFor } from './core/pins';
import { ScrollDeltaTracker } from './core/scrollTracker';
import type { Device, Settings } from './core/settingsModel';
import { SettingsStore } from './core/settingsStore';
import { splitStored, toStoredData, type StoredExtras, type StoredSplit } from './core/storedData';
import { observeResize } from './dom/observeResize';
import { requestFrame } from './dom/requestFrame';
import { NavbarController } from './navbar/navbarController';
import { NavbarRenderer } from './navbar/navbarRenderer';
import { OverflowIndicator } from './navbar/overflowIndicator';
import { ScrollTrack } from './navbar/scrollTrack';
import { CommandRunner } from './platform/commandRunner';
import { createObsidianInternals, type ObsidianInternals } from './platform/obsidianInternals';
import { AddButtonFlow } from './settings/addButtonFlow';
import { createCustomId } from './settings/customId';
import { EditButtonModal } from './settings/editButtonModal';
import { NavbarSettingTab } from './settings/navbarSettingTab';
import { ModalPickers } from './settings/pickers/modalPickers';
import { TabletVisibilityController } from './tablet/tabletVisibilityController';
import { ToolbarOpenWatcher } from './tablet/toolbarOpenWatcher';

/**
 * Composition root: loads settings, builds the store and settings tab, and starts the controllers for the device
 * the plugin was loaded on (KD9). Desktop gets the settings tab and nothing else (AC13).
 */
export default class NavbarComposerPlugin extends Plugin {
	#store: SettingsStore | null = null;
	readonly #internals: ObsidianInternals = createObsidianInternals(this.app);

	/** Composition seam: integration tests drive live updates through it without any settings UI. */
	get store(): SettingsStore {
		if (this.#store === null) throw new Error('Navbar Composer: settings are not loaded yet.');
		return this.#store;
	}

	async onload(): Promise<void> {
		const { settings, extras } = await this.#loadStored();
		const store = this.#createStore(settings, extras);
		this.#store = store;
		const mode = resolveDeviceMode(Platform);
		this.#registerSettingTab(store, mode);
		this.#startDeviceController(store, mode);
	}

	async #loadStored(): Promise<StoredSplit> {
		return splitStored(await this.loadData());
	}

	#createStore(initial: Settings, extras: StoredExtras): SettingsStore {
		return new SettingsStore(initial, {
			persist: (settings) => this.saveData(toStoredData(settings, extras)),
			onPersistError: (error) => this.#reportSaveError(error),
		});
	}

	#reportSaveError(error: unknown): void {
		new Notice('Could not save the navbar layout.');
		console.error(error);
	}

	#registerSettingTab(store: SettingsStore, mode: DeviceMode): void {
		const commands = this.#internals.commands;
		const pickers = new ModalPickers(this.app, commands);
		const editorDeps = { pickers, store, commands };
		this.addSettingTab(
			new NavbarSettingTab(this.app, this, {
				store,
				commands,
				addFlow: new AddButtonFlow({ pickers, store, newId: createCustomId }),
				openEditor: (device, item) => new EditButtonModal(this.app, editorDeps, device, item).open(),
				initialDevice: mode === 'tablet' ? 'tablet' : 'phone',
			}),
		);
	}

	#startDeviceController(store: SettingsStore, mode: DeviceMode): void {
		if (mode === 'phone') this.app.workspace.onLayoutReady(() => this.#startNavbar(store, 'phone'));
		if (mode === 'tablet') this.app.workspace.onLayoutReady(() => this.#startTablet(store));
	}

	#startTablet(store: SettingsStore): void {
		this.#startNavbar(store, 'tablet');
		this.#startTabletVisibility(store);
	}

	#startNavbar(store: SettingsStore, device: Device): void {
		const internals = this.#internals;
		const controller = this.addChild(
			new NavbarController(
				{
					internals,
					renderer: new NavbarRenderer(),
					overflow: new OverflowIndicator(observeResize, new ScrollTrack(requestFrame)),
					runner: new CommandRunner(internals.commands),
					warn: (message) => console.warn(message),
				},
				store.current[device],
				pinsFor(store.current, device),
			),
		);
		this.register(store.subscribe((settings) => controller.setItems(settings[device], pinsFor(settings, device))));
	}

	#startTabletVisibility(store: SettingsStore): void {
		const controller = this.addChild(
			new TabletVisibilityController(
				{
					internals: this.#internals,
					workspace: this.app.workspace,
					doc: activeDocument,
					tracker: new ScrollDeltaTracker(),
					toolbar: new ToolbarOpenWatcher(activeDocument.body),
				},
				store.current.tablet,
			),
		);
		this.register(store.subscribe((settings) => controller.setItems(settings.tablet)));
	}
}

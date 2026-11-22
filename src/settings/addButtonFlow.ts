import { addCustom, withDevice } from '../core/listOps';
import type { Device } from '../core/settingsModel';
import type { SettingsStore } from '../core/settingsStore';
import type { CommandInfo } from '../platform/obsidianInternals';
import type { Pickers } from './pickers/pickers';

/** Collaborators of the add sequence: where choices come from, where the result goes, and how ids are made. */
export interface AddButtonFlowDeps {
	pickers: Pickers;
	store: SettingsStore;
	newId: () => string;
}

/**
 * The add sequence: command, then icon, then one visible custom button appended to the device's list. Cancelling
 * either picker adds nothing (KD13).
 */
export class AddButtonFlow {
	readonly #deps: AddButtonFlowDeps;

	constructor(deps: AddButtonFlowDeps) {
		this.#deps = deps;
	}

	start(device: Device): void {
		this.#deps.pickers.pickCommand((command) => this.#pickIconFor(device, command));
	}

	#pickIconFor(device: Device, command: CommandInfo): void {
		this.#deps.pickers.pickIcon((icon) => this.#add(device, command, icon));
	}

	#add(device: Device, command: CommandInfo, icon: string): void {
		void this.#deps.store.update((settings) =>
			withDevice(settings, device, (items) =>
				addCustom(items, {
					kind: 'custom',
					id: this.#deps.newId(),
					commandId: command.id,
					icon,
					label: command.name,
					visible: true,
				}),
			),
		);
	}
}

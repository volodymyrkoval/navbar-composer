import type { App } from 'obsidian';
import type { CommandInfo, CommandRegistry } from '../../platform/obsidianInternals';
import { CommandPickerModal } from './commandPickerModal';
import { IconPickerModal } from './iconPickerModal';
import type { Pickers } from './pickers';

/** `Pickers` backed by the real fuzzy modals (thin UI, verified in J3). */
export class ModalPickers implements Pickers {
	readonly #app: App;
	readonly #commands: CommandRegistry;

	constructor(app: App, commands: CommandRegistry) {
		this.#app = app;
		this.#commands = commands;
	}

	pickCommand(onChoose: (command: CommandInfo) => void): void {
		new CommandPickerModal(this.#app, this.#commands.list(), onChoose).open();
	}

	pickIcon(onChoose: (icon: string) => void): void {
		new IconPickerModal(this.#app, onChoose).open();
	}
}

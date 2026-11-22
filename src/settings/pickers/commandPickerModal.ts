import { type App, FuzzySuggestModal } from 'obsidian';
import type { CommandInfo } from '../../platform/obsidianInternals';

/**
 * Fuzzy list of Obsidian commands for choosing a button's command. Obsidian closes the modal before it calls
 * `onChooseItem`, so `onChoose` runs only on a choice; cancelling never calls it (thin UI, verified in J3).
 */
export class CommandPickerModal extends FuzzySuggestModal<CommandInfo> {
	readonly #commands: readonly CommandInfo[];
	readonly #onChoose: (command: CommandInfo) => void;

	constructor(app: App, commands: readonly CommandInfo[], onChoose: (command: CommandInfo) => void) {
		super(app);
		this.#commands = commands;
		this.#onChoose = onChoose;
		this.setPlaceholder('Choose a command');
	}

	getItems(): CommandInfo[] {
		return [...this.#commands];
	}

	getItemText(command: CommandInfo): string {
		return command.name;
	}

	onChooseItem(command: CommandInfo): void {
		this.#onChoose(command);
	}
}

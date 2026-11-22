import { Notice } from 'obsidian';
import type { CommandRegistry } from './obsidianInternals';

/** Runs a command by id from a tap, telling the user when it cannot run (AC11). */
export class CommandRunner {
	readonly #commands: CommandRegistry;

	constructor(commands: CommandRegistry) {
		this.#commands = commands;
	}

	run(commandId: string): void {
		if (!this.#isAvailable(commandId)) {
			this.#notifyUnavailable(commandId);
			return;
		}
		this.#execute(commandId);
	}

	#isAvailable(commandId: string): boolean {
		return this.#commands.find(commandId) !== null;
	}

	#execute(commandId: string): void {
		try {
			if (!this.#commands.execute(commandId)) {
				this.#notifyUnavailable(commandId);
			}
		} catch (error) {
			this.#notifyFailure(commandId, error);
		}
	}

	#notifyUnavailable(commandId: string): void {
		new Notice(`Command not available: ${commandId}`);
	}

	#notifyFailure(commandId: string, error: unknown): void {
		console.error(error);
		new Notice(`Command failed: ${commandId}`);
	}
}

import type { CommandInfo } from '../../platform/obsidianInternals';

/**
 * The two choices the add and edit flows need. Each callback runs only when the user picks something, so a
 * cancelled picker never calls it. Tests supply a plain-object fake.
 */
export interface Pickers {
	pickCommand(onChoose: (command: CommandInfo) => void): void;
	pickIcon(onChoose: (icon: string) => void): void;
}

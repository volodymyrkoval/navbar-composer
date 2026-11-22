import type { App } from 'obsidian';

/** A command as the plugin sees it: enough to pick it in settings and to report it. */
export interface CommandInfo {
	id: string;
	name: string;
}

/**
 * Read and execute access to Obsidian's command registry. Every method degrades to an empty result when the
 * undocumented methods are missing, so callers never need to guard.
 */
export interface CommandRegistry {
	list(): CommandInfo[];
	find(id: string): CommandInfo | null;
	execute(id: string): boolean;
}

/**
 * Typed access to the undocumented parts of Obsidian that the plugin depends on. Only this module touches them (KD2).
 */
export interface ObsidianInternals {
	navbarContainer(): HTMLElement | null;
	readonly commands: CommandRegistry;
}

interface InternalCommand {
	id: string;
	name: string;
}

interface InternalCommands {
	listCommands?: () => InternalCommand[];
	findCommand?: (id: string) => InternalCommand | null;
	executeCommandById?: (id: string) => boolean;
}

interface InternalApp {
	mobileNavbar?: { containerEl?: unknown };
	commands?: InternalCommands;
}

/** Reads the native navbar container, or `null` when Obsidian does not expose it (AC12, KD12). */
function readNavbarContainer(app: InternalApp): HTMLElement | null {
	const container = app.mobileNavbar?.containerEl;
	return container instanceof HTMLElement ? container : null;
}

/** Adapts Obsidian's command methods to `CommandRegistry`, using the defaults when they are absent. */
function createCommandRegistry(app: InternalApp): CommandRegistry {
	return {
		list: () => (app.commands?.listCommands?.() ?? []).map(({ id, name }) => ({ id, name })),
		find: (id) => {
			const found = app.commands?.findCommand?.(id);
			return found ? { id: found.id, name: found.name } : null;
		},
		execute: (id) => (app.commands?.executeCommandById ? app.commands.executeCommandById(id) !== false : false),
	};
}

/** Wraps the undocumented `App` internals behind the typed `ObsidianInternals` interface. */
export function createObsidianInternals(app: App): ObsidianInternals {
	const internalApp = app as unknown as InternalApp;
	return {
		navbarContainer: () => readNavbarContainer(internalApp),
		commands: createCommandRegistry(internalApp),
	};
}

import { vi, type Mock } from 'vitest';
import { Events } from '../__mocks__/obsidian';
import { buildNavbar } from '../fixtures/navbarFixture';

export interface FakeCommand {
	id: string;
	name: string;
}

export interface FakeCommands {
	commands: Record<string, FakeCommand>;
	listCommands(): FakeCommand[];
	findCommand(id: string): FakeCommand | null;
	executeCommandById: Mock<(id: string) => boolean>;
}

export interface FakeLeaf {
	view: { getViewType(): string };
}

export interface FakeWorkspace extends Events {
	containerEl: HTMLElement;
	onLayoutReady(callback: () => unknown): void;
	getMostRecentLeaf(): FakeLeaf | null;
	setActiveViewType(type: string | null): void;
}

export interface FakeApp {
	mobileNavbar?: { containerEl: HTMLElement };
	commands?: FakeCommands;
	workspace: FakeWorkspace;
}

export interface FakeAppOptions {
	navbar?: HTMLElement | null;
	commands?: FakeCommand[];
	omitCommands?: boolean;
}

export interface FakeHarness {
	app: FakeApp;
	workspace: FakeWorkspace;
	commands: FakeCommands | undefined;
}

function leafOf(viewType: string | null): FakeLeaf | null {
	return viewType === null ? null : { view: { getViewType: () => viewType } };
}

function createFakeCommands(commands: FakeCommand[]): FakeCommands {
	const byId: Record<string, FakeCommand> = Object.fromEntries(commands.map((command) => [command.id, command]));
	return {
		commands: byId,
		listCommands: () => [...commands],
		findCommand: (id) => byId[id] ?? null,
		executeCommandById: vi.fn((id: string) => id in byId),
	};
}

function createFakeWorkspace(): FakeWorkspace {
	let activeViewType: string | null = null;
	return Object.assign(new Events(), {
		containerEl: document.createElement('div'),
		onLayoutReady: (callback: () => unknown) => {
			callback();
		},
		getMostRecentLeaf: () => leafOf(activeViewType),
		setActiveViewType: (type: string | null) => {
			activeViewType = type;
		},
	});
}

export function createFakeApp(options: FakeAppOptions = {}): FakeHarness {
	const workspace = createFakeWorkspace();
	const app: FakeApp = { workspace };
	if (!options.omitCommands) {
		app.commands = createFakeCommands(options.commands ?? []);
	}
	if (options.navbar !== null) {
		app.mobileNavbar = { containerEl: options.navbar ?? buildNavbar() };
	}
	return { app, workspace, commands: app.commands };
}

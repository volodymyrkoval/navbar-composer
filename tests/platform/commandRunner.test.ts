import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { CommandInfo, CommandRegistry } from '../../src/platform/obsidianInternals';
import { CommandRunner } from '../../src/platform/commandRunner';
import { Notice } from '../__mocks__/obsidian';

interface RegistryOverrides {
	find?: (id: string) => CommandInfo | null;
	execute?: (id: string) => boolean;
}

interface FakeRegistry {
	commands: CommandRegistry;
	execute: Mock<(id: string) => boolean>;
}

function registryWith(overrides: RegistryOverrides = {}): FakeRegistry {
	const execute = vi.fn(overrides.execute ?? (() => true));
	return {
		commands: {
			list: () => [],
			find: overrides.find ?? (() => ({ id: 'app:go-back', name: 'Go back' })),
			execute,
		},
		execute,
	};
}

function noticeMessages(): string[] {
	return Notice.instances.map((notice) => notice.message);
}

describe('CommandRunner', () => {
	beforeEach(() => {
		Notice.reset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('runs the command with the given id', () => {
		const { commands, execute } = registryWith();

		new CommandRunner(commands).run('app:go-back');

		expect(execute).toHaveBeenCalledWith('app:go-back');
	});

	it('shows no Notice when the command runs', () => {
		const { commands } = registryWith();

		new CommandRunner(commands).run('app:go-back');

		expect(noticeMessages()).toEqual([]);
	});

	it('tells the user when the command is not available and does not run it', () => {
		const { commands, execute } = registryWith({ find: () => null });

		new CommandRunner(commands).run('app:missing');

		expect(execute).not.toHaveBeenCalled();
		expect(noticeMessages()).toEqual(['Command not available: app:missing']);
	});

	it('tells the user when Obsidian reports that the command did not run', () => {
		const { commands } = registryWith({ execute: () => false });

		new CommandRunner(commands).run('app:go-back');

		expect(noticeMessages()).toEqual(['Command not available: app:go-back']);
	});

	it('reports a throwing command to the user and the console without letting the error escape', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { commands } = registryWith({
			execute: () => {
				throw new Error('boom');
			},
		});

		expect(() => new CommandRunner(commands).run('app:go-back')).not.toThrow();
		expect(noticeMessages()).toEqual(['Command failed: app:go-back']);
		expect(errorSpy).toHaveBeenCalled();
	});
});

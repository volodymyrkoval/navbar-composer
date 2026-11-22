import { afterEach, describe, expect, it } from 'vitest';
import { Notice } from '../__mocks__/obsidian';

describe('Notice fake', () => {
	afterEach(() => {
		Notice.reset();
	});

	it('records every notice shown, in order', () => {
		new Notice('Command not found');
		new Notice('Settings saved');

		expect(Notice.instances.map((notice) => notice.message)).toEqual([
			'Command not found',
			'Settings saved',
		]);
	});

	it('forgets recorded notices on reset', () => {
		new Notice('Command not found');

		Notice.reset();

		expect(Notice.instances).toEqual([]);
	});
});

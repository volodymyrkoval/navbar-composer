import { describe, expect, it } from 'vitest';
import { Plugin } from '../__mocks__/obsidian';

describe('Plugin fake', () => {
	it('loads back the data it last saved', async () => {
		const plugin = new Plugin({}, {});

		await plugin.saveData({ version: 1 });

		await expect(plugin.loadData()).resolves.toEqual({ version: 1 });
	});

	it('records each setting tab added to the plugin', () => {
		const plugin = new Plugin({}, {});
		const tab = { id: 'navbar-composer' };

		plugin.addSettingTab(tab);

		expect(plugin.settingTabs).toEqual([tab]);
	});

	it('rejects saveData while a save failure is forced', async () => {
		const plugin = new Plugin({}, {});
		plugin.__failSave = true;

		await expect(plugin.saveData({ version: 1 })).rejects.toThrow('save failed');
	});
});

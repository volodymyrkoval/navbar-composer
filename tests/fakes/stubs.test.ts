import { describe, expect, it } from 'vitest';
import { FuzzySuggestModal, Modal, PluginSettingTab, Setting } from '../__mocks__/obsidian';

class SettingsTab extends PluginSettingTab {
	getSettingDefinitions(): unknown[] {
		return [];
	}
}
class CommandPicker extends FuzzySuggestModal<string> {}
class EditorModal extends Modal {}

describe('inert UI stubs', () => {
	it('answer the lifecycle and setter calls that UI code makes, without effect', () => {
		const tab = new SettingsTab({}, {});
		const modal = new EditorModal({});
		const picker = new CommandPicker({});

		expect(() => tab.update()).not.toThrow();
		expect(tab.getSettingDefinitions()).toEqual([]);
		expect(() => modal.open()).not.toThrow();
		expect(() => modal.setTitle('Edit button')).not.toThrow();
		expect(() => modal.close()).not.toThrow();
		expect(() => picker.setPlaceholder('Pick a command')).not.toThrow();
	});


	it('let subclasses of the settings, modal and picker classes be constructed', () => {
		const app = {};
		const plugin = {};
		const container = document.createElement('div');

		expect(() => new SettingsTab(app, plugin)).not.toThrow();
		expect(() => new EditorModal(app)).not.toThrow();
		expect(() => new CommandPicker(app)).not.toThrow();
		expect(() => new Setting(container)).not.toThrow();
	});
});

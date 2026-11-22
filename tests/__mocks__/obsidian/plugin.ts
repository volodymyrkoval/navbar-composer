/**
 * Behavioural fake of Obsidian's `Plugin`: a `Component` that owns the plugin
 * data store. Data lives in memory on the instance, so tests can seed it
 * through `__data` and force a failed save through `__failSave`.
 */

import { Component } from './component';

export class Plugin extends Component {
	app: unknown;
	manifest: unknown;
	__data: unknown = null;
	__failSave = false;
	settingTabs: unknown[] = [];

	constructor(app: unknown, manifest: unknown) {
		super();
		this.app = app;
		this.manifest = manifest;
	}

	addSettingTab(tab: unknown): void {
		this.settingTabs.push(tab);
	}

	async loadData(): Promise<unknown> {
		return this.__data;
	}

	async saveData(data: unknown): Promise<void> {
		if (this.__failSave) throw new Error('save failed');
		this.__data = data;
	}
}

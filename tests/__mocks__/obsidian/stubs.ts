/**
 * Inert stand-ins for Obsidian's UI classes. They exist only so modules that
 * extend or import them load in tests. They hold no behaviour and are never
 * asserted on: UI logic belongs in pure view-models (KD15).
 */

export class PluginSettingTab {
	app: unknown;
	plugin: unknown;
	containerEl: HTMLElement = document.createElement('div');

	constructor(app: unknown, plugin: unknown) {
		this.app = app;
		this.plugin = plugin;
	}

	update(): void {}

	getSettingDefinitions(): unknown[] {
		return [];
	}
}

export class Modal {
	app: unknown;
	contentEl: HTMLElement = document.createElement('div');
	titleEl: HTMLElement = document.createElement('div');

	constructor(app: unknown) {
		this.app = app;
	}

	open(): void {}

	close(): void {}

	setTitle(title: string): void {
		void title;
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- T mirrors Obsidian's FuzzySuggestModal<T> so subclasses type-check
export class FuzzySuggestModal<T> extends Modal {
	setPlaceholder(placeholder: string): void {
		void placeholder;
	}
}

export class Setting {
	readonly containerEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}
}

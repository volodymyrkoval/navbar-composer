import {
	type App,
	Notice,
	Platform,
	type Plugin,
	PluginSettingTab,
	type SettingDefinition,
	type SettingDefinitionItem,
} from 'obsidian';
import type { CustomItem, Device, NavItem } from '../core/settingsModel';
import type { SettingsStore } from '../core/settingsStore';
import { moveUp, moveDown, removeCustom, restoreCustom, toggleVisible, withDevice } from '../core/listOps';
import { isPinned, pinsFor, setPin } from '../core/pins';
import type { CommandRegistry } from '../platform/obsidianInternals';
import type { AddButtonFlow } from './addButtonFlow';
import { type RowHandlers, renderItemRow } from './itemRow';
import { buildPreviewModel, emptyPreviewText, type PreviewButton, previewPins } from './previewModel';
import { type PreviewHint, renderPreview } from './previewRenderer';
import { buildRowModel, itemLabel } from './rowModel';
import { PIN_TOGGLES, pinEdgeOfKey } from './pinToggles';

const DEVICE_KEY = 'device';
const HINT_DURATION_MS = 2000;
const UNDO_DURATION_MS = 6000;

/**
 * Touch devices (phones and tablets) get a Notice per tap. Each call returns a fresh replacer, so a Notice
 * is replaced by the next tap but never carried over to a later render.
 */
function replaceableNoticeHint(): PreviewHint {
	let current: Notice | null = null;
	return {
		mode: 'notice',
		show: (text) => {
			current?.hide();
			current = new Notice(text, HINT_DURATION_MS);
		},
	};
}

/** Desktop shows a hover tooltip; touch devices show a single replaceable Notice per tap. */
function previewHint(): PreviewHint {
	return Platform.isMobile ? replaceableNoticeHint() : { mode: 'tooltip' };
}

/** What the settings tab needs from the composition root. */
export interface NavbarSettingTabDeps {
	store: SettingsStore;
	commands: CommandRegistry;
	addFlow: AddButtonFlow;
	/** Opens the edit modal; supplied by the composition root so this tab never builds modals itself. */
	openEditor(device: Device, item: CustomItem): void;
	initialDevice: Device;
}

function isDevice(value: unknown): value is Device {
	return value === 'phone' || value === 'tablet';
}

/**
 * The plugin's settings tab (thin UI, verified in J3): maps the store to declarative setting definitions and
 * forwards row handlers to store operations. The selected device is UI state only, never persisted.
 */
export class NavbarSettingTab extends PluginSettingTab {
	readonly #deps: NavbarSettingTabDeps;
	#device: Device;
	/** The Notice of the latest deletion; only its Undo stays live, so a new deletion hides the previous one. */
	#undoNotice: Notice | null = null;

	constructor(app: App, plugin: Plugin, deps: NavbarSettingTabDeps) {
		super(app, plugin);
		this.#deps = deps;
		this.#device = deps.initialDevice;
		plugin.register(deps.store.subscribe(() => this.#onSettingsChanged()));
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			this.#deviceDefinition(),
			this.#previewDefinition(),
			...this.#pinDefinitions(),
			this.#buttonsDefinition(),
		];
	}

	getControlValue(key: string): unknown {
		return key === DEVICE_KEY ? this.#device : this.#pinValue(key);
	}

	setControlValue(key: string, value: unknown): void {
		if (key === DEVICE_KEY) this.#setDevice(value);
		else this.#setPin(key, value);
	}

	#setDevice(value: unknown): void {
		if (!isDevice(value)) return;
		this.#device = value;
		this.update();
	}

	#pinValue(key: string): unknown {
		const edge = pinEdgeOfKey(key);
		if (edge === null) return undefined;
		return isPinned(pinsFor(this.#deps.store.current, this.#device), edge);
	}

	#setPin(key: string, value: unknown): void {
		const edge = pinEdgeOfKey(key);
		if (edge === null || typeof value !== 'boolean') return;
		void this.#deps.store.update((settings) => setPin(settings, this.#device, edge, value));
	}

	#onSettingsChanged(): void {
		this.update();
	}

	#deviceDefinition(): SettingDefinition {
		return {
			name: 'Device',
			desc: 'Each device has its own layout. The device is detected when Obsidian starts.',
			control: { type: 'dropdown', key: DEVICE_KEY, options: { phone: 'Phone', tablet: 'Tablet' } },
		};
	}

	#previewDefinition(): SettingDefinition {
		return {
			name: 'Preview',
			render: (setting) => this.#renderPreviewInto(setting.controlEl.createDiv({ cls: 'navbar-composer-preview' })),
		};
	}

	#renderPreviewInto(el: HTMLElement): void {
		const buttons = this.#previewButtons();
		const pinned = previewPins(this.#deps.store.current, this.#device, buttons);
		renderPreview(el, buttons, emptyPreviewText(this.#device), previewHint(), pinned);
	}

	#previewButtons(): PreviewButton[] {
		return buildPreviewModel(this.#items(), (id) => this.#deps.commands.find(id) === null);
	}

	#pinDefinitions(): SettingDefinition[] {
		return PIN_TOGGLES.map((toggle) => ({
			name: toggle.name,
			desc: toggle.desc,
			control: { type: 'toggle', key: toggle.key },
		}));
	}

	// No onReorder (drag handles are a no-go) and no onDelete (natives must not be deletable).
	#buttonsDefinition(): SettingDefinitionItem {
		return {
			type: 'list',
			heading: 'Buttons',
			emptyState: 'No buttons.',
			addItem: { name: 'Add button', action: () => this.#deps.addFlow.start(this.#device) },
			items: this.#items().map((item, index, all) => this.#rowDefinition(item, index, all)),
		};
	}

	#rowDefinition(item: NavItem, index: number, all: readonly NavItem[]): SettingDefinition {
		return {
			name: itemLabel(item),
			render: (setting) =>
				renderItemRow(
					setting,
					buildRowModel(item, { index, count: all.length }, this.#commandName(item)),
					this.#rowHandlers(item),
				),
		};
	}

	#commandName(item: NavItem): string | null {
		return item.kind === 'custom' ? (this.#deps.commands.find(item.commandId)?.name ?? null) : null;
	}

	#rowHandlers(item: NavItem): RowHandlers {
		return {
			onMoveUp: () => this.#change((items) => moveUp(items, item.id)),
			onMoveDown: () => this.#change((items) => moveDown(items, item.id)),
			onToggleVisible: () => this.#change((items) => toggleVisible(items, item.id)),
			onEdit: () => {
				if (item.kind === 'custom') this.#deps.openEditor(this.#device, item);
			},
			onDelete: () => {
				if (item.kind === 'custom') this.#deleteWithUndo(item);
			},
		};
	}

	/** Deletes at once, then offers Undo, which puts the button back at its old position on the same device. */
	#deleteWithUndo(item: CustomItem): void {
		const device = this.#device;
		const index = this.#items().findIndex((existing) => existing.id === item.id);
		this.#change((items) => removeCustom(items, item.id));
		this.#showUndo(item, () => {
			void this.#deps.store.update((settings) =>
				withDevice(settings, device, (items) => restoreCustom(items, item, index)),
			);
		});
	}

	#showUndo(item: CustomItem, undo: () => void): void {
		this.#undoNotice?.hide();
		const fragment = createFragment();
		fragment.append(`Deleted "${item.label}". `);
		const button = fragment.createEl('button', { text: 'Undo', attr: { type: 'button' } });
		const notice = new Notice(fragment, UNDO_DURATION_MS);
		button.addEventListener('click', () => {
			undo();
			notice.hide();
		});
		this.#undoNotice = notice;
	}

	#change(op: (items: readonly NavItem[]) => NavItem[]): void {
		void this.#deps.store.update((settings) => withDevice(settings, this.#device, op));
	}

	#items(): readonly NavItem[] {
		return this.#deps.store.current[this.#device];
	}
}

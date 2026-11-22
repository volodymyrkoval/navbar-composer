import { type App, Modal, Setting, setIcon } from 'obsidian';
import { updateCustom, withDevice } from '../core/listOps';
import type { CustomItem, Device } from '../core/settingsModel';
import type { SettingsStore } from '../core/settingsStore';
import type { CommandInfo, CommandRegistry } from '../platform/obsidianInternals';
import { createDraft, type EditDraft, finalizeEdit, withCommand, withIcon } from './editDraft';
import { displayIconName } from './pickers/iconName';
import type { Pickers } from './pickers/pickers';

export interface EditButtonDeps {
	pickers: Pickers;
	store: SettingsStore;
	commands: CommandRegistry;
}

/**
 * Edits one custom button: command and icon. The label always follows the command name (see `finalizeEdit`). Changes stay in a draft until Save, so Cancel discards them
 * (thin UI, verified in J3; the rules live in `editDraft.ts`).
 */
export class EditButtonModal extends Modal {
	readonly #deps: EditButtonDeps;
	readonly #device: Device;
	readonly #item: CustomItem;
	#draft: EditDraft;
	#commandField: Setting | null = null;
	#iconField: Setting | null = null;

	constructor(app: App, deps: EditButtonDeps, device: Device, item: CustomItem) {
		super(app);
		this.#deps = deps;
		this.#device = device;
		this.#item = item;
		this.#draft = createDraft(item);
	}

	onOpen(): void {
		this.setTitle('Edit button');
		// On the `.modal` element (not the container): Obsidian's phone rules target `.modal .setting-item`.
		this.modalEl.addClass('navbar-composer-edit-modal');
		this.#renderCommandField();
		this.#renderIconField();
		this.#renderActions();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	#renderCommandField(): void {
		this.#commandField = new Setting(this.contentEl)
			.setName('Command')
			.setDesc(this.#commandDescription())
			.addButton((button) =>
				button.setButtonText('Change').onClick(() => {
					this.#deps.pickers.pickCommand((command) => this.#setCommand(command));
				}),
			);
	}

	#setCommand(command: CommandInfo): void {
		this.#draft = withCommand(this.#draft, command);
		this.#commandField?.setDesc(this.#commandDescription());
	}

	#renderIconField(): void {
		this.#iconField = new Setting(this.contentEl).setName('Icon').addButton((button) =>
			button.setButtonText('Change').onClick(() => {
				this.#deps.pickers.pickIcon((icon) => this.#setIcon(icon));
			}),
		);
		this.#iconField.descEl.addClass('navbar-composer-icon-value');
		this.#renderIconValue();
	}

	#setIcon(icon: string): void {
		this.#draft = withIcon(this.#draft, icon);
		this.#renderIconValue();
	}

	/** Value line of the Icon row: the icon preview followed by its display name. */
	#renderIconValue(): void {
		const valueEl = this.#iconField?.descEl;
		if (!valueEl) return;
		valueEl.empty();
		setIcon(valueEl.createSpan({ cls: 'navbar-composer-icon-preview' }), this.#draft.icon);
		valueEl.createSpan({ cls: 'navbar-composer-icon-name', text: displayIconName(this.#draft.icon) });
	}

	#renderActions(): void {
		new Setting(this.contentEl)
			.setClass('navbar-composer-edit-actions')
			.addButton((button) => button.setButtonText('Save').setCta().onClick(() => this.#save()))
			.addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()));
	}

	#save(): void {
		const commandName = this.#deps.commands.find(this.#draft.commandId)?.name ?? null;
		const edit = finalizeEdit(this.#draft, commandName);
		void this.#deps.store.update((settings) =>
			withDevice(settings, this.#device, (items) => updateCustom(items, this.#item.id, edit)),
		);
		this.close();
	}

	#commandDescription(): string {
		return this.#deps.commands.find(this.#draft.commandId)?.name ?? 'Command not found';
	}
}

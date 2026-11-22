import { type Setting, setIcon, setTooltip } from 'obsidian';
import type { RowModel } from './rowModel';

/** What the row's controls do. The settings tab maps each one to a store change. */
export interface RowHandlers {
	onMoveUp(): void;
	onMoveDown(): void;
	onToggleVisible(): void;
	onEdit(): void;
	onDelete(): void;
}

/**
 * Draws one settings row from its model (thin UI, verified in J3). Adds controls and text; decides nothing.
 * Layout is CSS grid (styles.css): name line on top, then description (plus edit and delete) left and the controls right.
 * A hidden row gets `navbar-composer-row-off` so CSS can dim its title and description.
 * The control area holds up, down, toggle on every row, so built-in and custom rows line up by construction.
 * Custom rows also get edit and delete buttons after the description text.
 */
export function renderItemRow(setting: Setting, row: RowModel, handlers: RowHandlers): void {
	setting.settingEl.addClass('navbar-composer-row');
	setting.settingEl.toggleClass('navbar-composer-row-off', !row.visible);
	renderRowName(setting, row);
	renderRowDescription(setting, row.description);
	if (row.isCustom) {
		renderCustomActions(setting, handlers);
	}
	renderMissingBadge(setting, row);
	renderMoveButtons(setting, row, handlers);
	renderVisibilityToggle(setting, row, handlers);
}

/** Icon and name share one line; the name sits in its own span so CSS can wrap it next to the icon. */
function renderRowName(setting: Setting, row: RowModel): void {
	setting.nameEl.empty();
	setIcon(setting.nameEl.createSpan({ cls: 'navbar-composer-row-icon' }), row.icon);
	setting.nameEl.createSpan({ cls: 'navbar-composer-row-name', text: row.label });
}

function renderRowDescription(setting: Setting, description: string): void {
	setting.setDesc(description);
}

function renderMissingBadge(setting: Setting, row: RowModel): void {
	if (row.missing) {
		setting.nameEl.createSpan({ cls: 'navbar-composer-warning', text: 'Command not found' });
	}
}

function renderMoveButtons(setting: Setting, row: RowModel, handlers: RowHandlers): void {
	setting
		.addExtraButton((button) =>
			button
				.setIcon('arrow-up')
				.setTooltip('Move up')
				.setDisabled(!row.canMoveUp)
				.onClick(() => handlers.onMoveUp()),
		)
		.addExtraButton((button) =>
			button
				.setIcon('arrow-down')
				.setTooltip('Move down')
				.setDisabled(!row.canMoveDown)
				.onClick(() => handlers.onMoveDown()),
		);
}

function renderVisibilityToggle(setting: Setting, row: RowModel, handlers: RowHandlers): void {
	setting.addToggle((toggle) =>
		toggle.setValue(row.visible).onChange(() => handlers.onToggleVisible()),
	);
}

/** Edit and delete sit on the description line as real buttons, so the control area stays the same on every row. */
function renderCustomActions(setting: Setting, handlers: RowHandlers): void {
	setting.descEl.addClass('navbar-composer-row-desc');
	renderActionButton(setting.descEl, 'pencil', 'Edit button', () => handlers.onEdit());
	renderActionButton(setting.descEl, 'trash', 'Delete button', () => handlers.onDelete());
}

function renderActionButton(parent: HTMLElement, icon: string, label: string, onClick: () => void): void {
	const button = parent.createEl('button', {
		cls: 'clickable-icon navbar-composer-row-action',
		attr: { type: 'button', 'aria-label': label },
	});
	setIcon(button, icon);
	setTooltip(button, label);
	button.addEventListener('click', onClick);
}

import { NATIVE_META } from '../core/nativeMeta';
import { isCustomItem, type NavItem } from '../core/settingsModel';

/** What one settings row shows and allows. Built by `buildRowModel`; the Obsidian row only maps it onto controls. */
export interface RowModel {
	id: string;
	label: string;
	description: string;
	icon: string;
	isCustom: boolean;
	missing: boolean;
	canMoveUp: boolean;
	canMoveDown: boolean;
	visible: boolean;
}

/** Row label: the custom label, or the built-in label of a native button. */
export function itemLabel(item: NavItem): string {
	return isCustomItem(item) ? item.label : NATIVE_META[item.id].label;
}

/** Builds the row for one item. `commandName` is the command's current name, or `null` when it no longer exists. */
export function buildRowModel(
	item: NavItem,
	position: { index: number; count: number },
	commandName: string | null,
): RowModel {
	const custom = isCustomItem(item);
	return {
		id: item.id,
		label: itemLabel(item),
		description: rowDescription(item, commandName),
		icon: rowIcon(item),
		isCustom: custom,
		missing: custom && commandName === null,
		canMoveUp: position.index > 0,
		canMoveDown: position.index < position.count - 1,
		visible: item.visible,
	};
}

function rowIcon(item: NavItem): string {
	return isCustomItem(item) ? item.icon : NATIVE_META[item.id].icon;
}

/** Short and fixed so it never repeats the title (a custom title is the command name). A missing command shows its id. */
function rowDescription(item: NavItem, commandName: string | null): string {
	if (!isCustomItem(item)) return 'Built-in';
	return commandName === null ? item.commandId : 'Custom';
}

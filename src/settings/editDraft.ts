import type { CustomEdit } from '../core/listOps';
import type { CustomItem } from '../core/settingsModel';
import type { CommandInfo } from '../platform/obsidianInternals';

/** The editable fields of one custom button while the edit modal is open. The label is not editable: it follows the command. */
export interface EditDraft {
	commandId: string;
	icon: string;
}

/** Starts an edit from the item's current values, so Cancel can simply discard the draft. */
export function createDraft(item: CustomItem): EditDraft {
	return { commandId: item.commandId, icon: item.icon };
}

/** Changes the command only. */
export function withCommand(draft: EditDraft, command: CommandInfo): EditDraft {
	return { ...draft, commandId: command.id };
}

/** Changes the icon only. */
export function withIcon(draft: EditDraft, icon: string): EditDraft {
	return { ...draft, icon };
}

/** The edit to save: the label is always the command name, or the command id if that is unknown. */
export function finalizeEdit(draft: EditDraft, commandName: string | null): CustomEdit {
	return { commandId: draft.commandId, icon: draft.icon, label: commandName ?? draft.commandId };
}

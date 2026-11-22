import { NATIVE_META } from '../core/nativeMeta';
import { type Device, isCustomItem, type NavItem } from '../core/settingsModel';

const PHONE_EMPTY_TEXT = 'No visible buttons. The navbar is empty.';
const TABLET_EMPTY_TEXT = 'The bar is hidden on tablet until you show at least one button.';

/** One button of the live preview. `missing` marks a custom button whose command no longer exists (AC11). */
export interface PreviewButton {
	id: string;
	icon: string;
	label: string;
	missing: boolean;
}

/** The visible items in order, as preview buttons. `isMissing` reports whether a command id is unknown. */
export function buildPreviewModel(items: readonly NavItem[], isMissing: (commandId: string) => boolean): PreviewButton[] {
	return items.filter((item) => item.visible).map((item) => toPreviewButton(item, isMissing));
}

/** Text shown in place of the preview when no button is visible. Tablet explains why its bar is hidden. */
export function emptyPreviewText(device: Device): string {
	return device === 'phone' ? PHONE_EMPTY_TEXT : TABLET_EMPTY_TEXT;
}

function toPreviewButton(item: NavItem, isMissing: (commandId: string) => boolean): PreviewButton {
	if (isCustomItem(item)) {
		return { id: item.id, icon: item.icon, label: item.label, missing: isMissing(item.commandId) };
	}
	const meta = NATIVE_META[item.id];
	return { id: item.id, icon: meta.icon, label: meta.label, missing: false };
}

/** What a tap or hover on a preview button shows: its label, plus a warning when the command is gone. */
export function hintText(button: PreviewButton): string {
	return button.missing ? `${button.label} (command not found)` : button.label;
}

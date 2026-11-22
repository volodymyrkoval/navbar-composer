/**
 * Shape of the persisted navbar layout and its defaults. Plain data only: no Obsidian or DOM imports (KD1).
 */

/** Native buttons in the order Obsidian renders them. Confirmed on device; used as the position fallback. */
export const NATIVE_IDS = ['back', 'forward', 'quick-switcher', 'new-tab', 'tabs', 'menu'] as const;
export type NativeId = (typeof NATIVE_IDS)[number];

export type Device = 'phone' | 'tablet';

export interface NativeItem {
	kind: 'native';
	id: NativeId;
	visible: boolean;
}

export interface CustomItem {
	kind: 'custom';
	id: string;
	commandId: string;
	icon: string;
	label: string;
	visible: boolean;
}

export type NavItem = NativeItem | CustomItem;

export interface Settings {
	version: 1;
	phone: NavItem[];
	tablet: NavItem[];
}

/** Tablet natives start hidden so installing the plugin leaves an iPad unchanged (KD11). */
export const NATIVE_DEFAULT_VISIBLE: Readonly<Record<Device, boolean>> = { phone: true, tablet: false };

/** Version-1 settings: each device holds all six natives in `NATIVE_IDS` order, with the device's default visibility. */
export function createDefaultSettings(): Settings {
	return {
		version: 1,
		phone: createNativeItems('phone'),
		tablet: createNativeItems('tablet'),
	};
}

export function isCustomItem(item: NavItem): item is CustomItem {
	return item.kind === 'custom';
}

export function isNativeId(value: unknown): value is NativeId {
	return typeof value === 'string' && (NATIVE_IDS as readonly string[]).includes(value);
}

function createNativeItems(device: Device): NavItem[] {
	return NATIVE_IDS.map((id) => ({ kind: 'native', id, visible: NATIVE_DEFAULT_VISIBLE[device] }));
}

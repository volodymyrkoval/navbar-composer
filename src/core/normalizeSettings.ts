/**
 * Turns untrusted stored data into valid Settings (KD10 persistence boundary).
 */

import { isRecord } from './isRecord';
import { normalizePins } from './normalizePins';
import {
	createDefaultSettings,
	type CustomItem,
	type Device,
	isNativeId,
	NATIVE_DEFAULT_VISIBLE,
	NATIVE_IDS,
	type NavItem,
	type NativeItem,
	type Settings,
} from './settingsModel';

/** Accepts whatever `data.json` holds and returns settings the rest of the plugin can trust. */
export function normalizeSettings(raw: unknown): Settings {
	if (!isRecord(raw)) return createDefaultSettings();
	const pins = normalizePins(raw.pins);
	return {
		version: 1,
		phone: normalizeDevice(raw.phone, 'phone'),
		tablet: normalizeDevice(raw.tablet, 'tablet'),
		...(pins === undefined ? {} : { pins }),
	};
}

function normalizeDevice(raw: unknown, device: Device): NavItem[] {
	return ensureAllNatives(dedupeById(normalizeList(raw)), NATIVE_DEFAULT_VISIBLE[device]);
}

function dedupeById(items: NavItem[]): NavItem[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		if (seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
}

function normalizeList(raw: unknown): NavItem[] {
	if (!Array.isArray(raw)) return [];
	return raw.map(normalizeItem).filter((item): item is NavItem => item !== null);
}

function normalizeItem(raw: unknown): NavItem | null {
	if (!isRecord(raw)) return null;
	if (raw.kind === 'native') return normalizeNative(raw);
	return raw.kind === 'custom' ? normalizeCustom(raw) : null;
}

function normalizeCustom(raw: Record<string, unknown>): CustomItem | null {
	const { id, commandId, icon } = raw;
	if (typeof id !== 'string' || typeof commandId !== 'string' || typeof icon !== 'string') return null;
	const label = typeof raw.label === 'string' ? raw.label : commandId;
	return { kind: 'custom', id, commandId, icon, label, visible: readVisible(raw) };
}

function normalizeNative(raw: Record<string, unknown>): NativeItem | null {
	if (!isNativeId(raw.id)) return null;
	return { kind: 'native', id: raw.id, visible: readVisible(raw) };
}

function readVisible(raw: Record<string, unknown>): boolean {
	return typeof raw.visible === 'boolean' ? raw.visible : true;
}

function ensureAllNatives(items: NavItem[], missingVisible: boolean): NavItem[] {
	const present = new Set(items.map((item) => item.id));
	const missing = NATIVE_IDS.filter((id) => !present.has(id)).map(
		(id): NativeItem => ({ kind: 'native', id, visible: missingVisible }),
	);
	return [...items, ...missing];
}

/**
 * Splits stored `data.json` into trusted settings and the top-level keys this version does not know, so later releases' keys survive a save (AC6).
 */

import { isRecord } from './isRecord';
import { normalizeSettings } from './normalizeSettings';
import type { Settings } from './settingsModel';

/** Top-level keys of data.json this version does not know. Carried through untouched on save (AC6). */
export type StoredExtras = Readonly<Record<string, unknown>>;

/** Trusted settings plus the extras that must survive the next save. */
export interface StoredSplit {
	settings: Settings;
	extras: StoredExtras;
}

// Typed against Settings, so a key added to Settings without an entry here is a compile error.
const KNOWN_KEYS: Readonly<Record<keyof Settings, true>> = { version: true, phone: true, tablet: true, pins: true };
const KNOWN_KEY_NAMES = new Set<string>(Object.keys(KNOWN_KEYS));

/** Splits raw data.json into trusted settings and the keys this version does not know. */
export function splitStored(raw: unknown): StoredSplit {
	return { settings: normalizeSettings(raw), extras: extractExtras(raw) };
}

/** What to save: extras first, then settings, so a known key always wins over an extra with the same name. */
export function toStoredData(settings: Settings, extras: StoredExtras): Record<string, unknown> {
	return { ...extras, ...settings };
}

function extractExtras(raw: unknown): StoredExtras {
	if (!isRecord(raw)) return {};
	return Object.fromEntries(Object.entries(raw).filter(([key]) => !KNOWN_KEY_NAMES.has(key)));
}

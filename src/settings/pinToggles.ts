import type { PinEdge } from '../core/settingsModel';

/** One Settings toggle that pins a bar edge. `key` is the settings control key (the value is stored in `pins`), `edge` the pinned side. */
export interface PinToggle {
	key: string;
	edge: PinEdge;
	name: string;
	desc: string;
}

/** The pin toggles in the order the Settings tab shows them. Each description says the pin only applies on overflow. */
export const PIN_TOGGLES: readonly PinToggle[] = [
	{
		key: 'pin-start',
		edge: 'start',
		name: 'Pin first button',
		desc: 'Keep the first visible button in place while the rest of the bar scrolls. Only takes effect when the bar overflows.',
	},
	{
		key: 'pin-end',
		edge: 'end',
		name: 'Pin last button',
		desc: 'Keep the last visible button in place while the rest of the bar scrolls. Only takes effect when the bar overflows.',
	},
];

/** The pinned edge for a toggle key, or null when the key is not a pin toggle. */
export function pinEdgeOfKey(key: string): PinEdge | null {
	return PIN_TOGGLES.find((toggle) => toggle.key === key)?.edge ?? null;
}

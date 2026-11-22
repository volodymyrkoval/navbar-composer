/**
 * Display labels and icons for the native buttons, used by the settings rows and the preview.
 */

import type { NativeId } from './settingsModel';


/** Preview approximations: natives carry no aria-label, so these labels and icons are ours. */
export const NATIVE_META: Readonly<Record<NativeId, { label: string; icon: string }>> = {
	back: { label: 'Back', icon: 'arrow-left' },
	forward: { label: 'Forward', icon: 'arrow-right' },
	'quick-switcher': { label: 'Quick switcher', icon: 'search' },
	'new-tab': { label: 'New tab', icon: 'plus' },
	tabs: { label: 'Tabs', icon: 'copy' },
	menu: { label: 'Menu', icon: 'menu' },
};

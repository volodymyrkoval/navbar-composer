/**
 * Maps platform flags to the device mode, decided once at load (KD9).
 */

import type { Device } from './settingsModel';

export type DeviceMode = Device | 'none';

/** Tablet wins over phone when both flags are set. A platform with neither flag (desktop) renders nothing. */
export function resolveDeviceMode(platform: { isPhone: boolean; isTablet: boolean }): DeviceMode {
	if (platform.isTablet) return 'tablet';
	return platform.isPhone ? 'phone' : 'none';
}

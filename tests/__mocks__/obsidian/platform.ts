/**
 * Behavioural fake of Obsidian's `Platform` flags. Tests flip the flags to pick
 * a device and call `__reset()` to return to the desktop defaults.
 */

const defaultFlags = {
	isMobile: false,
	isTablet: false,
	isPhone: false,
	isDesktop: true,
};

export const Platform = {
	...defaultFlags,
	__reset(): void {
		Object.assign(Platform, defaultFlags);
	},
};

import { describe, expect, it } from 'vitest';
import { resolveDeviceMode } from '../../src/core/deviceMode';

describe('resolveDeviceMode', () => {
	it('resolves a phone-only platform to phone', () => {
		expect(resolveDeviceMode({ isPhone: true, isTablet: false })).toBe('phone');
	});

	it('resolves a tablet-only platform to tablet', () => {
		expect(resolveDeviceMode({ isPhone: false, isTablet: true })).toBe('tablet');
	});

	it('prefers tablet when both flags are set', () => {
		expect(resolveDeviceMode({ isPhone: true, isTablet: true })).toBe('tablet');
	});

	it('resolves a platform with neither flag to none', () => {
		expect(resolveDeviceMode({ isPhone: false, isTablet: false })).toBe('none');
	});
});

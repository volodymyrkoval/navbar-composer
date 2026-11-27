import { describe, expect, it } from 'vitest';
import { PIN_TOGGLES, pinEdgeOfKey } from '../../src/settings/pinToggles';

describe('pinEdgeOfKey', () => {
	it('maps the pin-start key to the start edge', () => {
		expect(pinEdgeOfKey('pin-start')).toBe('start');
	});

	it('maps the pin-end key to the end edge', () => {
		expect(pinEdgeOfKey('pin-end')).toBe('end');
	});

	it.each(['device', '', 'pin-middle'])('returns null for the non-pin key %j', (key) => {
		expect(pinEdgeOfKey(key)).toBeNull();
	});
});

describe('PIN_TOGGLES', () => {
	it('uses sentence case for every name and never says "settings"', () => {
		for (const toggle of PIN_TOGGLES) {
			expect(toggle.name).toMatch(/^[A-Z][a-z]*( [a-z]+)*$/);
			expect(toggle.name.toLowerCase()).not.toContain('settings');
		}
	});

	it('gives every toggle a unique key', () => {
		const keys = PIN_TOGGLES.map((toggle) => toggle.key);

		expect(new Set(keys).size).toBe(keys.length);
	});

	it('says in every description that the pin only takes effect when the bar overflows', () => {
		for (const toggle of PIN_TOGGLES) {
			expect(toggle.desc).toContain('Only takes effect when the bar overflows');
		}
	});

	it('never mentions the preview, and ends with the overflow sentence', () => {
		for (const toggle of PIN_TOGGLES) {
			expect(toggle.desc.toLowerCase()).not.toContain('preview');
			expect(toggle.desc).toMatch(/Only takes effect when the bar overflows\.$/);
		}
	});
});

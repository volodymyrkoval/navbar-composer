import { describe, expect, it } from 'vitest';
import { compareVersions, knownTo } from './knownKeys';

describe('knownTo', () => {
	it('drops pins from settings a 1.0.0 release would not have known', () => {
		expect(knownTo('1.0.0', { version: 1, phone: [], tablet: [], pins: {} })).toStrictEqual({
			version: 1,
			phone: [],
			tablet: [],
		});
	});

	it('keeps pins for the release that introduced it', () => {
		expect(knownTo('1.1.0', { version: 1, phone: [], tablet: [], pins: {} })).toStrictEqual({
			version: 1,
			phone: [],
			tablet: [],
			pins: {},
		});
	});

	it('keeps pins for every release after the one that introduced it', () => {
		expect(knownTo('1.2.0', { version: 1, phone: [], tablet: [], pins: {} })).toStrictEqual({
			version: 1,
			phone: [],
			tablet: [],
			pins: {},
		});
	});

	it('keeps a key the table does not list, even for 1.0.0', () => {
		expect(knownTo('1.0.0', { version: 1, phone: [], tablet: [], 'x-future-theme': 'dark' })).toStrictEqual({
			version: 1,
			phone: [],
			tablet: [],
			'x-future-theme': 'dark',
		});
	});

	it('leaves the settings it was given unchanged', () => {
		const settings = { version: 1, phone: [], tablet: [], pins: {} };
		knownTo('1.0.0', settings);
		expect(settings).toHaveProperty('pins', {});
	});
});

describe('compareVersions', () => {
	it('orders releases numerically, so 1.10.0 is newer than 1.9.0', () => {
		expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
	});

	it('returns 0 for equal releases', () => {
		expect(compareVersions('1.1.0', '1.1.0')).toBe(0);
	});
});

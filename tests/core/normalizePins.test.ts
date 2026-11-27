import { describe, expect, it } from 'vitest';
import { normalizePins } from '../../src/core/normalizePins';

describe('normalizePins', () => {
	it('keeps a stored pinStart for a device', () => {
		expect(normalizePins({ phone: { pinStart: true } })).toStrictEqual({ phone: { pinStart: true } });
	});

	it('keeps a stored false, so the device layout is explicit', () => {
		expect(normalizePins({ phone: { pinStart: false } })).toStrictEqual({ phone: { pinStart: false } });
	});

	it('keeps each device layout that holds a valid pin and drops unknown devices and malformed layouts', () => {
		expect(
			normalizePins({ phone: [], tablet: { pinEnd: true }, desktop: { pinStart: true } }),
		).toStrictEqual({ tablet: { pinEnd: true } });
	});

	it('drops a device layout whose pins are all non-boolean', () => {
		expect(normalizePins({ phone: { pinStart: 'yes', pinEnd: 1 } })).toBeUndefined();
	});

	it('drops unknown keys inside a device layout', () => {
		expect(normalizePins({ phone: { pinStart: true, 'x-future-k': true } })).toStrictEqual({
			phone: { pinStart: true },
		});
	});

	it.each([undefined, null, 'x', [], {}])('returns undefined for %j', (raw) => {
		expect(normalizePins(raw)).toBeUndefined();
	});
});

import { describe, expect, it } from 'vitest';
import { isRecord } from '../../src/core/isRecord';

describe('isRecord', () => {
	it('accepts a plain object', () => {
		expect(isRecord({})).toBe(true);
	});

	it.each([
		['null', null],
		['an array', []],
		['a string', 'x'],
		['a number', 1],
		['undefined', undefined],
	])('rejects %s', (_label, value) => {
		expect(isRecord(value)).toBe(false);
	});
});

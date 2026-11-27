import { describe, expect, it } from 'vitest';
import { formatLock, mergeLock, parseLock, sha256 } from '../../../scripts/compat/lock';

const ABC_HASH = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('sha256', () => {
	it('returns the hex SHA-256 of a string', () => {
		expect(sha256('abc')).toBe(ABC_HASH);
	});
});

describe('parseLock', () => {
	it('maps each sha256sum line to its path and hash', () => {
		const text = `${ABC_HASH}  fixtures/1.0.0/defaults.input.json\n`;

		expect(parseLock(text)).toStrictEqual(new Map([['fixtures/1.0.0/defaults.input.json', ABC_HASH]]));
	});

	it('ignores blank lines', () => {
		const text = `\n${ABC_HASH}  a.json\n\n${ABC_HASH}  b.json\n\n`;

		expect([...parseLock(text).keys()]).toStrictEqual(['a.json', 'b.json']);
	});

	it('throws on a line that is not <64 hex>  <path>', () => {
		expect(() => parseLock('not a lock line\n')).toThrow();
	});
});

describe('formatLock', () => {
	it('renders entries sorted by path, one sha256sum line each', () => {
		const entries = new Map([
			['b.json', ABC_HASH],
			['a.json', ABC_HASH],
		]);

		expect(formatLock(entries)).toBe(`${ABC_HASH}  a.json\n${ABC_HASH}  b.json\n`);
	});

	it('returns an empty string when there are no entries', () => {
		expect(formatLock(new Map())).toBe('');
	});
});

describe('parseLock and formatLock', () => {
	it('round-trip: parseLock(formatLock(x)) equals x', () => {
		const entries = new Map([
			['fixtures/1.0.0/a.input.json', ABC_HASH],
			['fixtures/1.0.0/a.expected.json', ABC_HASH],
		]);

		expect(parseLock(formatLock(entries))).toStrictEqual(entries);
	});
});

describe('mergeLock', () => {
	it('adds new paths and keeps existing ones', () => {
		const existing = new Map([['a.json', ABC_HASH]]);
		const added = new Map([['b.json', ABC_HASH]]);

		expect(mergeLock(existing, added)).toStrictEqual(
			new Map([
				['a.json', ABC_HASH],
				['b.json', ABC_HASH],
			]),
		);
	});

	it('accepts the same path with the same hash', () => {
		const entries = new Map([['a.json', ABC_HASH]]);

		expect(mergeLock(entries, new Map([['a.json', ABC_HASH]]))).toStrictEqual(entries);
	});

	it('throws when an existing path would change hash', () => {
		const existing = new Map([['a.json', ABC_HASH]]);
		const other = 'f'.repeat(64);

		expect(() => mergeLock(existing, new Map([['a.json', other]]))).toThrow(
			'compat.lock is append-only: a.json',
		);
	});
});

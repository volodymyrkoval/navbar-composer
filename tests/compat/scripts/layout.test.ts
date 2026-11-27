import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	fixtureFilesOnDisk,
	fixturePath,
	listCases,
	listFixtureVersions,
	missingFixtures,
	readFixtures,
	readLockFile,
	writeLockFile,
} from '../../../scripts/compat/layout';

let root: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'compat-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

function write(relativePath: string, content: string): void {
	const full = join(root, relativePath);
	mkdirSync(join(full, '..'), { recursive: true });
	writeFileSync(full, content);
}

describe('listCases', () => {
	it('returns sorted case names without the .json extension, ignoring other files', () => {
		write('cases/zeta.json', '{}');
		write('cases/alpha.json', '{}');
		write('cases/README.md', 'notes');

		expect(listCases(root)).toStrictEqual(['alpha', 'zeta']);
	});
});

describe('listFixtureVersions', () => {
	it('returns an empty list when there is no fixtures directory', () => {
		expect(listFixtureVersions(root)).toStrictEqual([]);
	});

	it('returns sorted version directory names, ignoring plain files', () => {
		write('fixtures/1.1.0/.keep', '');
		write('fixtures/1.0.0/.keep', '');
		write('fixtures/notes.txt', 'not a version');

		expect(listFixtureVersions(root)).toStrictEqual(['1.0.0', '1.1.0']);
	});
});

describe('fixtureFilesOnDisk', () => {
	it('lists every file under fixtures/ as a sorted root-relative path', () => {
		write('fixtures/1.1.0/defaults.input.json', '{}');
		write('fixtures/1.0.0/defaults.expected.json', '{}');
		write('fixtures/1.0.0/absent.input.json', '{}');
		write('cases/defaults.json', '{}');

		expect(fixtureFilesOnDisk(root)).toStrictEqual([
			'fixtures/1.0.0/absent.input.json',
			'fixtures/1.0.0/defaults.expected.json',
			'fixtures/1.1.0/defaults.input.json',
		]);
	});

	it('returns an empty list when there is no fixtures directory', () => {
		expect(fixtureFilesOnDisk(root)).toStrictEqual([]);
	});
});

describe('fixturePath', () => {
	it('builds the relative path of a case fixture for a role', () => {
		expect(fixturePath('1.0.0', 'defaults', 'input')).toBe('fixtures/1.0.0/defaults.input.json');
	});
});

describe('missingFixtures', () => {
	it('lists both fixture files of a case with no fixtures yet', () => {
		expect(missingFixtures(root, '1.0.0', ['defaults'])).toStrictEqual([
			'fixtures/1.0.0/defaults.input.json',
			'fixtures/1.0.0/defaults.expected.json',
		]);
	});

	it('lists only the missing file of a case with one fixture present', () => {
		write('fixtures/1.0.0/defaults.input.json', 'null');

		expect(missingFixtures(root, '1.0.0', ['defaults'])).toStrictEqual(['fixtures/1.0.0/defaults.expected.json']);
	});
});

describe('readFixtures', () => {
	it('parses a present fixture pair into a CompatFixture record', () => {
		write('fixtures/1.0.0/defaults.input.json', '{"phone":{"items":[]}}');
		write('fixtures/1.0.0/defaults.expected.json', '{"version":1}');

		expect(readFixtures(root)).toStrictEqual([
			{ version: '1.0.0', caseName: 'defaults', input: { phone: { items: [] } }, expected: { version: 1 } },
		]);
	});

	it('keeps a null input as null', () => {
		write('fixtures/1.0.0/defaults.input.json', 'null');
		write('fixtures/1.0.0/defaults.expected.json', '{"version":1}');

		expect(readFixtures(root)).toStrictEqual([
			{ version: '1.0.0', caseName: 'defaults', input: null, expected: { version: 1 } },
		]);
	});
});

describe('readLockFile', () => {
	it('returns an empty map when compat.lock does not exist', () => {
		expect(readLockFile(root)).toStrictEqual(new Map());
	});
});

describe('writeLockFile', () => {
	it('writes entries that readLockFile reads back unchanged', () => {
		const entries = new Map([['fixtures/1.0.0/defaults.input.json', 'a'.repeat(64)]]);

		writeLockFile(root, entries);

		expect(readLockFile(root)).toStrictEqual(entries);
	});
});

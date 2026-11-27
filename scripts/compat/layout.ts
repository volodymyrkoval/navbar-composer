/**
 * Layout of the compat suite under tests/compat: which cases exist, which fixture files are on disk, and the
 * compat.lock file. Every path returned here is relative to `root` and '/'-separated.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Settings } from '../../src/core/settingsModel';
import { formatLock, type LockEntries, parseLock } from './lock';

export type FixtureRole = 'input' | 'expected';

/** One version × case pair as stored on disk. */
export interface CompatFixture {
	version: string;
	caseName: string;
	input: unknown;
	expected: Settings;
}

/** Sorted case names: the file names in cases/ ending in .json, without the extension. */
export function listCases(root: string): string[] {
	return namesEndingWith(join(root, 'cases'), '.json');
}

/** Sorted version directory names under fixtures/; empty when fixtures/ does not exist. */
export function listFixtureVersions(root: string): string[] {
	const fixturesDir = join(root, 'fixtures');
	if (!existsSync(fixturesDir)) return [];
	return readdirSync(fixturesDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

/** Sorted root-relative paths of every file under fixtures/, '/'-separated; empty when fixtures/ does not exist. */
export function fixtureFilesOnDisk(root: string): string[] {
	const fixturesDir = join(root, 'fixtures');
	if (!existsSync(fixturesDir)) return [];
	return filesUnder(fixturesDir, 'fixtures/').sort();
}

/** Relative path of one fixture file: fixtures/<version>/<case>.<role>.json. */
export function fixturePath(version: string, caseName: string, role: FixtureRole): string {
	return `fixtures/${version}/${caseName}.${role}.json`;
}

/** Relative paths of the fixture files that are absent for the given cases, in case order. */
export function missingFixtures(root: string, version: string, cases: readonly string[]): string[] {
	return cases.flatMap((caseName) =>
		(['input', 'expected'] as const)
			.map((role) => fixturePath(version, caseName, role))
			.filter((relativePath) => !existsSync(join(root, relativePath))),
	);
}

/**
 * Every fixture pair present on disk, parsed. Cases whose expected file is absent are skipped here;
 * missingFixtures reports them.
 */
export function readFixtures(root: string): CompatFixture[] {
	return listFixtureVersions(root).flatMap((version) =>
		listInputCases(root, version)
			.filter((caseName) => existsSync(join(root, fixturePath(version, caseName, 'expected'))))
			.map((caseName) => readFixturePair(root, version, caseName)),
	);
}

/** Entries of compat.lock under root; an empty map when the file does not exist yet. */
export function readLockFile(root: string): LockEntries {
	const lockPath = join(root, 'compat.lock');
	if (!existsSync(lockPath)) return new Map();
	return parseLock(readFileSync(lockPath, 'utf8'));
}

/** Replaces compat.lock under root with the given entries, in sha256sum format. */
export function writeLockFile(root: string, entries: LockEntries): void {
	writeFileSync(join(root, 'compat.lock'), formatLock(entries));
}

function listInputCases(root: string, version: string): string[] {
	return namesEndingWith(join(root, 'fixtures', version), '.input.json');
}

function readFixturePair(root: string, version: string, caseName: string): CompatFixture {
	return {
		version,
		caseName,
		input: readJson(root, fixturePath(version, caseName, 'input')),
		expected: readJson(root, fixturePath(version, caseName, 'expected')) as Settings,
	};
}

function readJson(root: string, relativePath: string): unknown {
	return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

/** Every file under dir, each prefixed with prefix; recurses into subdirectories. */
function filesUnder(dir: string, prefix: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory() ? filesUnder(join(dir, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`],
	);
}

/** Sorted file names in dir that end with suffix, with the suffix removed. */
function namesEndingWith(dir: string, suffix: string): string[] {
	return readdirSync(dir)
		.filter((name) => name.endsWith(suffix))
		.map((name) => name.slice(0, -suffix.length))
		.sort();
}

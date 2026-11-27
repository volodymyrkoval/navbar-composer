/**
 * Freezes one release's compat snapshot: for every case in cases/ that has no fixture pair yet, writes the input
 * (a byte copy of the case) and the expected output (the release's normalizeSettings applied to the input).
 * Freezing is add-only (KD-3): existing fixture files are never overwritten.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fixturePath, listCases, missingFixtures, type FixtureRole, readLockFile, writeLockFile } from './layout';
import { mergeLock, sha256 } from './lock';

/** The release's normalizeSettings, applied to the parsed case input. */
export type Normalize = (raw: unknown) => unknown;

export interface FreezeOptions {
	/** The tests/compat directory. */
	root: string;
	/** Release version whose fixtures directory is written, e.g. `1.0.0`. */
	version: string;
	normalize: Normalize;
}

export interface FreezeResult {
	/** Relative paths of the files written, sorted. */
	written: string[];
}

const ROLES: readonly FixtureRole[] = ['input', 'expected'];

/** Freezes every case of `version` under `root` and returns the relative paths written, sorted. */
export function freezeVersion({ root, version, normalize }: FreezeOptions): FreezeResult {
	const cases = casesToFreeze(root, version);
	for (const caseName of cases) assertValidCase(root, caseName); // every case is checked before the first write
	const written = cases.flatMap((caseName) => writeFixturePair(root, version, caseName, normalize));
	lockWrittenFiles(root, written);
	return { written: written.sort() };
}

/**
 * Cases of `version` with neither fixture file on disk yet. Throws on a half-present pair, before anything is
 * written, because freezing never repairs a pair.
 */
function casesToFreeze(root: string, version: string): string[] {
	const cases = listCases(root);
	const missing = new Set(missingFixtures(root, version, cases));
	return cases.filter((caseName) => {
		const absent = ROLES.filter((role) => missing.has(fixturePath(version, caseName, role))).length;
		if (absent === 1) {
			throw new Error(`fixture pair for ${caseName} is half present in ${version}: restore or remove the lone file`);
		}
		return absent === ROLES.length;
	});
}

/** Writes the input and expected files of one case; returns their relative paths. */
function writeFixturePair(root: string, version: string, caseName: string, normalize: Normalize): string[] {
	const caseBytes = readCaseBytes(root, caseName);
	const inputPath = fixturePath(version, caseName, 'input');
	const expectedPath = fixturePath(version, caseName, 'expected');
	const expected = normalize(parseCase(caseName, caseBytes));

	writeNewFile(root, inputPath, caseBytes);
	writeNewFile(root, expectedPath, serializeExpected(expected));
	return [inputPath, expectedPath];
}

/** Adds the SHA-256 of each written file to compat.lock; throws if an existing line would change. */
function lockWrittenFiles(root: string, written: readonly string[]): void {
	const added = new Map(written.map((relativePath) => [relativePath, hashFile(root, relativePath)]));
	writeLockFile(root, mergeLock(readLockFile(root), added));
}

function serializeExpected(value: unknown): string {
	return JSON.stringify(value, null, 2) + '\n';
}

function assertValidCase(root: string, caseName: string): void {
	parseCase(caseName, readCaseBytes(root, caseName));
}

function readCaseBytes(root: string, caseName: string): Buffer {
	return readFileSync(join(root, 'cases', `${caseName}.json`));
}

function parseCase(caseName: string, bytes: Buffer): unknown {
	const text = bytes.toString('utf8');
	if (!isValidJson(text)) throw new Error(`case ${caseName} is not valid JSON`);
	return JSON.parse(text);
}

function isValidJson(text: string): boolean {
	try {
		JSON.parse(text);
		return true;
	} catch {
		return false;
	}
}

function hashFile(root: string, relativePath: string): string {
	return sha256(readFileSync(join(root, relativePath)));
}

/** Creates a file and its directories; flag `wx` makes an existing file an error rather than an overwrite. */
function writeNewFile(root: string, relativePath: string, content: string | Buffer): void {
	const full = join(root, relativePath);
	mkdirSync(dirname(full), { recursive: true });
	writeFileSync(full, content, { flag: 'wx' });
}

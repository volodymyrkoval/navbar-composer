import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freezeVersion } from '../../../scripts/compat/freeze';
import { readLockFile } from '../../../scripts/compat/layout';
import { sha256 } from '../../../scripts/compat/lock';

const wrapInSeen = (raw: unknown): unknown => ({ seen: raw });

let root: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'compat-'));
	mkdirSync(join(root, 'cases'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

function writeCase(caseName: string, content: string): void {
	writeFileSync(join(root, 'cases', `${caseName}.json`), content);
}

function readText(relativePath: string): string {
	return readFileSync(join(root, relativePath), 'utf8');
}

/** Every file under dir (relative to root) → its content, so a test can detect any rewrite. */
function snapshotFiles(dir = ''): Record<string, string> {
	return Object.fromEntries(listFilesUnder(dir).map((relativePath) => [relativePath, readText(relativePath)]));
}

function listFilesUnder(dir: string): string[] {
	return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
		const relativePath = join(dir, entry.name);
		return entry.isDirectory() ? listFilesUnder(relativePath) : [relativePath];
	});
}

describe('freezeVersion', () => {
	it('writes the case bytes as input and the normalised output as expected', () => {
		writeCase('defaults', '{ "phone": [] }\n');

		const result = freezeVersion({ root, version: '1.0.0', normalize: wrapInSeen });

		expect(result.written).toStrictEqual([
			'fixtures/1.0.0/defaults.expected.json',
			'fixtures/1.0.0/defaults.input.json',
		]);
		expect(readText('fixtures/1.0.0/defaults.input.json')).toBe('{ "phone": [] }\n');
		expect(JSON.parse(readText('fixtures/1.0.0/defaults.expected.json'))).toStrictEqual({ seen: { phone: [] } });
	});

	it('adds one compat.lock line per written file, hashed from the bytes on disk', () => {
		writeCase('defaults', '{ "phone": [] }\n');

		const { written } = freezeVersion({ root, version: '1.0.0', normalize: wrapInSeen });

		const lock = readLockFile(root);
		expect([...lock.keys()]).toStrictEqual(written);
		for (const relativePath of written) {
			expect(lock.get(relativePath)).toBe(sha256(readFileSync(join(root, relativePath))));
		}
	});

	it('writes nothing on a second call and leaves every file and compat.lock byte-identical', () => {
		writeCase('defaults', '{ "phone": [] }\n');
		freezeVersion({ root, version: '1.0.0', normalize: wrapInSeen });
		const before = snapshotFiles();

		const { written } = freezeVersion({ root, version: '1.0.0', normalize: wrapInSeen });

		expect(written).toStrictEqual([]);
		expect(snapshotFiles()).toStrictEqual(before);
	});

	it('freezes only a case added later and leaves older fixtures alone, even if normalize has changed', () => {
		writeCase('defaults', '{ "phone": [] }\n');
		freezeVersion({ root, version: '1.0.0', normalize: wrapInSeen });
		const olderFixtures = snapshotFiles('fixtures');
		const olderLock = readLockFile(root);
		writeCase('unknown-keys', '{ "x-future": 1 }\n');

		const { written } = freezeVersion({ root, version: '1.0.0', normalize: () => 'changed' });

		expect(written).toStrictEqual([
			'fixtures/1.0.0/unknown-keys.expected.json',
			'fixtures/1.0.0/unknown-keys.input.json',
		]);
		const newFixtures = Object.fromEntries(written.map((relativePath) => [relativePath, readText(relativePath)]));
		expect(snapshotFiles('fixtures')).toStrictEqual({ ...olderFixtures, ...newFixtures });
		const newLock = readLockFile(root);
		for (const [relativePath, hash] of olderLock) expect(newLock.get(relativePath)).toBe(hash);
		expect([...newLock.keys()].sort()).toStrictEqual([...olderLock.keys(), ...written].sort());
	});

	it('throws naming an invalid case and writes nothing, not even for earlier valid cases', () => {
		writeCase('a-valid', '{}\n');
		writeCase('b-broken', '{ nope');
		const before = snapshotFiles();

		expect(() => freezeVersion({ root, version: '1.0.0', normalize: wrapInSeen })).toThrow(/b-broken/);

		expect(snapshotFiles()).toStrictEqual(before);
	});

	it('passes a null case through to normalize', () => {
		writeCase('null', 'null\n');

		freezeVersion({ root, version: '1.0.0', normalize: wrapInSeen });

		expect(JSON.parse(readText('fixtures/1.0.0/null.expected.json'))).toStrictEqual({ seen: null });
	});

	it('throws naming the case and writes nothing when a fixture pair is half present', () => {
		writeCase('defaults', '{ "phone": [] }\n');
		writeCase('unknown-keys', '{ "x-future": 1 }\n');
		mkdirSync(join(root, 'fixtures', '1.0.0'), { recursive: true });
		writeFileSync(join(root, 'fixtures', '1.0.0', 'defaults.input.json'), '{ "phone": [] }\n');
		const before = snapshotFiles();

		expect(() => freezeVersion({ root, version: '1.0.0', normalize: wrapInSeen })).toThrow(/defaults/);

		expect(snapshotFiles()).toStrictEqual(before);
	});
});

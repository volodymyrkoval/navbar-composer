/**
 * compat.lock: sha256 hashes of the frozen compat fixtures, in sha256sum format so that
 * `cd tests/compat && sha256sum -c compat.lock` works by hand. Entries are append-only.
 */
import { createHash } from 'node:crypto';

/** path (relative to tests/compat) → hex SHA-256 of that file. */
export type LockEntries = ReadonlyMap<string, string>;

const LOCK_LINE = /^([0-9a-f]{64}) {2}(.+)$/;

/** Hex SHA-256 digest of content. Strings are hashed as UTF-8. */
export function sha256(content: string | Uint8Array): string {
	return createHash('sha256').update(content).digest('hex');
}

/** Parses sha256sum-format text. Blank lines are ignored; any other malformed line throws. */
export function parseLock(text: string): LockEntries {
	const entries = new Map<string, string>();
	for (const line of text.split('\n')) {
		if (line.trim() === '') continue;
		const match = LOCK_LINE.exec(line);
		if (!match) throw new Error(`malformed compat.lock line: ${line}`);
		const [, hash, path] = match;
		entries.set(path!, hash!);
	}
	return entries;
}

/** Renders entries as sha256sum-format text, sorted by path. Empty string when there are none. */
export function formatLock(entries: LockEntries): string {
	return [...entries]
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([path, hash]) => `${hash}  ${path}\n`)
		.join('');
}

/** Union of existing and added entries. Throws rather than change an existing line. */
export function mergeLock(existing: LockEntries, added: LockEntries): LockEntries {
	const merged = new Map(existing);
	for (const [path, hash] of added) {
		const current = merged.get(path);
		if (current !== undefined && current !== hash) {
			throw new Error(`compat.lock is append-only: ${path}`);
		}
		merged.set(path, hash);
	}
	return merged;
}

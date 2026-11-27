/**
 * CLI that freezes one release's compat snapshot (`npm run compat:freeze [-- <x.y.z>] [--core <path>]`).
 * Run by `npm version` (version from npm_package_version) and by hand for retro-freezing from a worktree.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type FreezeResult, freezeVersion } from './compat/freeze';

/** Parsed command line: the version to freeze and the absolute path of the core that defines normalizeSettings. */
export interface FreezeArgs {
	version: string;
	corePath: string;
}

interface RawArgs {
	positional: string | undefined;
	core: string;
}

const USAGE = 'usage: compat-freeze [<x.y.z>] [--core <path>]';
const VERSION = /^\d+\.\d+\.\d+$/;
const DEFAULT_CORE = 'src/core/normalizeSettings.ts';
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'compat');

/**
 * Reads the command line. The version is the positional argument, else npm_package_version; `--core` is resolved
 * against the working directory. Throws the usage line when the version is missing or not x.y.z.
 */
export function parseFreezeArgs(argv: readonly string[], env: Readonly<Record<string, string | undefined>>): FreezeArgs {
	const { positional, core } = splitArgv(argv);
	const version = positional ?? env.npm_package_version;
	if (!version || !VERSION.test(version)) throw new Error(USAGE);
	return { version, corePath: resolve(core) };
}

/** Separates the one optional positional version from `--core <path>`; anything else is a usage error. */
function splitArgv(argv: readonly string[]): RawArgs {
	const parsed: RawArgs = { positional: undefined, core: DEFAULT_CORE };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;
		if (arg === '--core') {
			const value = argv[++i];
			if (value === undefined) throw new Error(USAGE);
			parsed.core = value;
		} else if (parsed.positional === undefined && !arg.startsWith('--')) {
			parsed.positional = arg;
		} else {
			throw new Error(USAGE);
		}
	}
	return parsed;
}

/**
 * Imports the core at corePath and returns its normalizeSettings. Any import failure or a missing export throws the
 * purity remedy: the core at that tag is not loadable, so stop and flag it rather than working around it.
 */
export async function loadNormalize(corePath: string): Promise<(raw: unknown) => unknown> {
	const remedy = `could not load normalizeSettings from ${corePath}: the core at that tag may not be pure; stop and flag it`;
	let core: { normalizeSettings?: unknown };
	try {
		// eslint-disable-next-line no-unsanitized/method -- path comes from the maintainer's --core flag, never user data
		core = (await import(pathToFileURL(corePath).href)) as { normalizeSettings?: unknown };
	} catch {
		throw new Error(remedy);
	}
	if (typeof core.normalizeSettings !== 'function') throw new Error(remedy);
	return core.normalizeSettings as (raw: unknown) => unknown;
}

/**
 * Freezes `version` under `root` (default: tests/compat) using the core at `--core`. Any failure prints one line and
 * sets exit code 1, so `npm version` aborts before the commit and tag. Runs only when this file is the entry point.
 */
export async function main(
	argv: readonly string[],
	env: Readonly<Record<string, string | undefined>>,
	root = DEFAULT_ROOT,
): Promise<void> {
	try {
		const { version, corePath } = parseFreezeArgs(argv, env);
		const normalize = await loadNormalize(corePath);
		reportFreeze(freezeVersion({ root, version, normalize }));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}

function reportFreeze(result: FreezeResult): void {
	if (result.written.length === 0) console.log('already frozen');
	for (const relativePath of result.written) console.log(`wrote ${relativePath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	void main(process.argv.slice(2), process.env);
}

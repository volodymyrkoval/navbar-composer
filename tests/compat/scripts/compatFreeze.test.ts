import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadNormalize, main, parseFreezeArgs } from '../../../scripts/compat-freeze';
import { createDefaultSettings } from '../../../src/core/settingsModel';
// Static imports keep arch:check from reporting the fake cores as orphans; loadNormalize reaches them by path.
import './cores/identity';
import './cores/withoutExport';

// Vitest cannot import files outside the project, so the fake cores live in the repo next to this test.
const CORES = resolve('tests/compat/scripts/cores');
const USAGE = 'usage: compat-freeze [<x.y.z>] [--core <path>]';

describe('parseFreezeArgs', () => {
	it('uses the positional version over npm_package_version', () => {
		const args = parseFreezeArgs(['1.0.0'], { npm_package_version: '1.1.0' });
		expect(args.version).toBe('1.0.0');
	});

	it('uses npm_package_version when no positional version is given', () => {
		const args = parseFreezeArgs([], { npm_package_version: '1.1.0' });
		expect(args.version).toBe('1.1.0');
	});

	it('throws the usage line when there is no version at all', () => {
		expect(() => parseFreezeArgs([], {})).toThrow(USAGE);
	});

	it('rejects a version that is not x.y.z', () => {
		expect(() => parseFreezeArgs(['1.0'], {})).toThrow(USAGE);
	});

	it('rejects --core without a path and any extra positional argument', () => {
		expect(() => parseFreezeArgs(['1.0.0', '--core'], {})).toThrow(USAGE);
		expect(() => parseFreezeArgs(['1.0.0', '1.0.1'], {})).toThrow(USAGE);
	});

	it('defaults --core to src/core/normalizeSettings.ts under the working directory', () => {
		const args = parseFreezeArgs(['1.0.0'], {});
		expect(args.corePath).toBe(resolve('src/core/normalizeSettings.ts'));
	});

	it('resolves an explicit --core path against the working directory', () => {
		const args = parseFreezeArgs(['1.0.0', '--core', 'old/normalizeSettings.ts'], {});
		expect(args.corePath).toBe(resolve('old/normalizeSettings.ts'));
	});
});

describe('loadNormalize', () => {
	it('rejects with the purity remedy when the core has no normalizeSettings export', async () => {
		const corePath = resolve(CORES, 'withoutExport.ts');
		await expect(loadNormalize(corePath)).rejects.toThrow('could not load normalizeSettings from');
	});

	it('returns the normalizeSettings of the given core file', async () => {
		const normalize = await loadNormalize(resolve('src/core/normalizeSettings.ts'));
		expect(normalize(null)).toEqual(createDefaultSettings());
	});

	it('rejects with the purity remedy when the core cannot be imported', async () => {
		await expect(loadNormalize(resolve('does/not/exist.ts'))).rejects.toThrow(
			'could not load normalizeSettings from',
		);
	});
});

describe('main', () => {
	afterEach(() => {
		process.exitCode = undefined;
		vi.restoreAllMocks();
	});

	it('prints the usage line and exits 1 when there is no version', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		await main([], {});
		expect(process.exitCode).toBe(1);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy).toHaveBeenCalledWith(USAGE);
	});
});

describe('main freezing into a root', () => {
	let root: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'compat-'));
		mkdirSync(join(root, 'cases'));
		writeFileSync(join(root, 'cases', 'defaults.json'), 'null\n');
	});

	afterEach(() => {
		process.exitCode = undefined;
		vi.restoreAllMocks();
		rmSync(root, { recursive: true, force: true });
	});

	it('writes the fixture pair for the version and reports each file', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		await main(['1.0.0', '--core', resolve(CORES, 'identity.ts')], {}, root);
		expect(readFileSync(join(root, 'fixtures/1.0.0/defaults.expected.json'), 'utf8')).toBe('{\n  "seen": null\n}\n');
		expect(process.exitCode).toBeUndefined();
		expect(logSpy).toHaveBeenCalledWith('wrote fixtures/1.0.0/defaults.expected.json');
		expect(logSpy).toHaveBeenCalledWith('wrote fixtures/1.0.0/defaults.input.json');
	});

	it('reports already frozen on a second run', async () => {
		const core = resolve(CORES, 'identity.ts');
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		await main(['1.0.0', '--core', core], {}, root);
		await main(['1.0.0', '--core', core], {}, root);
		expect(logSpy).toHaveBeenCalledWith('already frozen');
		expect(process.exitCode).toBeUndefined();
	});
});

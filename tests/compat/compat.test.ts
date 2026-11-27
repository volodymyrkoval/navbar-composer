import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasVisibleItems } from '../../src/core/hasVisibleItems';
import { toggleVisible, withDevice } from '../../src/core/listOps';
import { normalizeSettings } from '../../src/core/normalizeSettings';
import type { Settings } from '../../src/core/settingsModel';
import { NAVBAR_EMPTY_CLASS } from '../../src/navbar/navbarRenderer';
import { TABLET_BAR_SHOWN_CLASS } from '../../src/tablet/tabletVisibilityController';
import { sha256 } from '../../scripts/compat/lock';
import { fixtureFilesOnDisk, listCases, missingFixtures, readFixtures, readLockFile } from '../../scripts/compat/layout';
import { Notice, Plugin } from '../__mocks__/obsidian';
import { buildNavbar } from '../fixtures/navbarFixture';
import { loadPlugin, resetEnvironment, savedSettings } from '../integration/harness';
import { knownTo } from './knownKeys';
import { expectedLayout, renderedLayout } from './renderedLayout';

// Resolved from the working directory (the repo root under `npm test`): import.meta.url is an http URL under jsdom.
const COMPAT_ROOT = resolve(process.cwd(), 'tests', 'compat');

/** Every release listed in the repo-root versions.json. */
function releasedVersions(): string[] {
	const versions = JSON.parse(readFileSync(resolve(process.cwd(), 'versions.json'), 'utf8')) as Record<string, string>;
	return Object.keys(versions);
}

/**
 * Top-level entries other than the keys `normalizeSettings` returns (`version`, `phone`, `tablet`, `pins`). Those are
 * compared through the normaliser, so `pins` is skipped here: otherwise `pinned-malformed` would compare the raw input
 * `pins` with the normalised saved `pins`. Written here rather than imported from src/core/storedData.ts, so the
 * round-trip does not test the code with itself.
 */
function extrasOf(value: unknown): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter(([key]) => !['version', 'phone', 'tablet', 'pins'].includes(key)),
	);
}

describe('release gate', () => {
	it('has at least one case', () => {
		expect(listCases(COMPAT_ROOT).length).toBeGreaterThan(0);
	});

	it.each(releasedVersions())('has a complete snapshot for %s', (version) => {
		const missing = missingFixtures(COMPAT_ROOT, version, listCases(COMPAT_ROOT));
		expect(
			missing,
			`missing fixtures for ${version}: run npm run compat:freeze -- ${version} from that release's code`,
		).toStrictEqual([]);
	});
});

describe('compat.lock', () => {
	const lock = readLockFile(COMPAT_ROOT);

	it('lists exactly the fixture files on disk', () => {
		const onDisk = new Set(fixtureFilesOnDisk(COMPAT_ROOT));
		expect({
			extra: [...onDisk].filter((path) => !lock.has(path)),
			missing: [...lock.keys()].filter((path) => !onDisk.has(path)),
		}).toStrictEqual({ extra: [], missing: [] });
	});

	it.each([...lock])('%s matches its locked sha256', (path, hash) => {
		expect(sha256(readFileSync(resolve(COMPAT_ROOT, path)))).toBe(hash);
	});
});

describe('data layer', () => {
	it.each(readFixtures(COMPAT_ROOT))('$version/$caseName', ({ version, input, expected }) => {
		expect(knownTo(version, normalizeSettings(input))).toStrictEqual(expected);
	});
});

describe('live plugin on phone and tablet', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		resetEnvironment();
	});

	describe.each(['phone', 'tablet'] as const)('on %s', (device) => {
		it.each(readFixtures(COMPAT_ROOT))('$version/$caseName', async ({ input, expected }) => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const navbar = buildNavbar();

			await loadPlugin({ device, navbar, stored: structuredClone(input) });

			expect(renderedLayout(navbar)).toStrictEqual(expectedLayout(expected[device]));
			expect(navbar.classList.contains(NAVBAR_EMPTY_CLASS)).toBe(!hasVisibleItems(expected[device]));
			expect(document.body.classList.contains(TABLET_BAR_SHOWN_CLASS)).toBe(
				device === 'tablet' && hasVisibleItems(expected.tablet),
			);
			expect(error).not.toHaveBeenCalled();
			expect(warn).not.toHaveBeenCalled();
			expect(Notice.instances).toStrictEqual([]);
		});
	});
});

describe('live plugin on desktop', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		resetEnvironment();
	});

	it.each(readFixtures(COMPAT_ROOT))('$version/$caseName', async ({ input }) => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const navbar = buildNavbar();
		const pristine = navbar.outerHTML;

		const { settingTabs } = await loadPlugin({ device: 'desktop', navbar, stored: structuredClone(input) });

		expect(navbar.outerHTML).toBe(pristine);
		expect(document.body.className).toBe('');
		expect(settingTabs).toHaveLength(1);
		expect(error).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
		expect(Notice.instances).toStrictEqual([]);
	});
});

describe('no write on load', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		resetEnvironment();
	});

	describe.each(['phone', 'tablet', 'desktop'] as const)('on %s', (device) => {
		it.each(readFixtures(COMPAT_ROOT))('$version/$caseName', async ({ input }) => {
			const saveData = vi.spyOn(Plugin.prototype, 'saveData');

			await loadPlugin({ device, stored: structuredClone(input) });

			expect(saveData).not.toHaveBeenCalled();
		});
	});
});

describe('round-trip and pass-through', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		resetEnvironment();
	});

	it.each(readFixtures(COMPAT_ROOT))('$version/$caseName', async ({ version, input, expected, caseName }) => {
		const saveData = vi.spyOn(Plugin.prototype, 'saveData');
		const { plugin } = await loadPlugin({ device: 'desktop', stored: structuredClone(input) });
		const id = expected.phone[0]!.id;

		// A no-op edit: toggling one item twice leaves the layout as loaded but still saves each time.
		const toggle = (settings: Settings): Settings => withDevice(settings, 'phone', (items) => toggleVisible(items, id));
		await plugin.store.update(toggle);
		await plugin.store.update(toggle);

		// Without this check the mock's __data would still be the loaded input and the asserts would pass vacuously.
		expect(saveData).toHaveBeenCalledTimes(2);
		const saved: unknown = JSON.parse(JSON.stringify(savedSettings(plugin)));
		expect(knownTo(version, normalizeSettings(saved))).toStrictEqual(expected);
		expect(extrasOf(saved)).toStrictEqual(extrasOf(input));
		if (caseName === 'unknown-keys') {
			const futureKeys = Object.keys(extrasOf(input)).filter((key) => key.startsWith('x-future-'));
			expect(futureKeys).not.toHaveLength(0);
			for (const key of futureKeys) expect(extrasOf(saved)[key]).toStrictEqual(extrasOf(input)[key]);
		}
	});
});

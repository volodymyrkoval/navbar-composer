/**
 * Per-version view of the top-level keys. A released compat fixture is compared only on the keys its release knew,
 * so a key added later does not turn an older snapshot red.
 *
 * Rules (Q1 option B, decision record 001 and AGENTS.md):
 * - A key is gated strictly from its first release on. Releases before it never see it, and every later release must.
 * - KEY_INTRODUCED_IN is append-only. An entry's version never changes once written.
 * - A key may only be registered for an unreleased version.
 */

/** First release that knows each top-level key added after 1.0.0. A feature adding a top-level key registers it here. */
export const KEY_INTRODUCED_IN: Readonly<Record<string, string>> = { pins: '1.1.0' };

/** `settings` without the top-level keys `version` did not know yet. The input is not mutated. */
export function knownTo(version: string, settings: object): Record<string, unknown> {
	const introducedIn = new Map(Object.entries(KEY_INTRODUCED_IN));
	return Object.fromEntries(
		Object.entries(settings).filter(([key]) => {
			const introduced = introducedIn.get(key);
			return introduced === undefined || compareVersions(version, introduced) >= 0;
		}),
	);
}

/** Numeric x.y.z comparison: negative, 0 or positive. */
export function compareVersions(a: string, b: string): number {
	const left = a.split('.').map(Number);
	const right = b.split('.').map(Number);
	for (let part = 0; part < 3; part++) {
		const difference = (left[part] ?? 0) - (right[part] ?? 0);
		if (difference !== 0) return difference;
	}
	return 0;
}

# AGENTS.md

Guidance for AI coding agents (and humans) working on **Navbar Composer**, an Obsidian community plugin that composes the mobile navigation bar: any command, any icon, any order, separately for phone and tablet.

## Stack and commands

TypeScript, the `obsidian` package (types only, no runtime JS), esbuild, vitest + jsdom, ESLint (flat config) with `eslint-plugin-obsidianmd`, dependency-cruiser. Package manager: npm.

| Task | Command |
|------|---------|
| Watch build (writes `main.js` at the repo root) | `npm run dev` |
| Type check + production build | `npm run build` |
| Unit and integration tests | `npm test` |
| Integration tests only | `npx vitest run tests/integration/` |
| Lint (ESLint + architecture check) | `npm run lint` |
| Architecture check only | `npm run arch:check` |
| WebKit layout check, before every device round (Mac only; see below) | `npm run check:webkit` |
| Freeze a release's compat snapshot (`--core` points at that release's `normalizeSettings.ts`) | `npm run compat:freeze -- <x.y.z> [--core <path>]` |
| Check released compat fixtures and lock lines are unchanged | `npm run compat:immutable` |

`main.js` and `data.json` are build and runtime artifacts and are gitignored. Run `npm run lint`, `npm run build` and `npm test` before every commit; all three must pass. Commit messages follow Conventional Commits.

## Layout

- `src/main.ts` is the composition root. It loads and normalises settings, creates the store, registers the settings tab, decides the device mode once at load, and starts the controllers.
- `src/core/` holds pure logic: settings model, normaliser, list operations, the settings store, native-button identification, the scroll tracker and metrics, the tablet visibility reducer and device-mode resolution. It must not import `obsidian` or the DOM.
- `src/platform/` holds the Obsidian adapters. `obsidianInternals.ts` is the only file that may touch the undocumented `app.mobileNavbar` and `app.commands`.
- `src/dom/` holds shared DOM helpers (idempotent writes, the custom button builder).
- `src/navbar/` is the shared renderer and controller for phone and tablet.
- `src/tablet/` is the tablet visibility controller (scroll and editing-toolbar handling).
- `src/settings/` is the settings UI: pure view-models plus thin Obsidian UI classes.
- `styles.css` holds all plugin styles. `manifest.json` and `versions.json` hold the plugin metadata. `CHANGELOG.md` records user-facing changes per release.
- `tests/` mirrors `src/`, plus `tests/integration/` (full plugin flows), `tests/fakes/`, `tests/fixtures/`, `tests/setup/` and `tests/__mocks__/obsidian/`.

## Architecture rules (enforced by `npm run lint`)

- `core-is-pure`: `src/core` imports nothing from `obsidian` or other layers.
- `platform-is-leaf`, `dom-is-shared-leaf`, `features-are-independent`: the feature folders (`navbar`, `tablet`, `settings`) must not import each other.
- An ESLint rule forbids `app.mobileNavbar` and `app.commands` outside `src/platform/obsidianInternals.ts`, so an Obsidian update breaks one file.
- No circular or orphaned modules.

## Design invariants

- Phone and tablet use the same renderer. Native buttons are never intercepted: hidden ones get a CSS class, order comes from a CSS variable. Custom buttons are our own elements that mirror the native structure (an outer `.mobile-navbar-action` plus an inner `.clickable-icon`), and taps are handled by one delegated listener.
- Every DOM write goes through the write-only-if-different helpers in `src/dom/idempotentDom.ts`. A second apply must produce zero mutation records. The observer re-applies the layout and uses `takeRecords()` to avoid render loops.
- Never read computed styles at load time; Obsidian has not laid the bar out yet.
- The device mode (phone, tablet or none) is decided once at load. On tablets the plugin shows Obsidian's own floating navbar with a body class, and hides or shows it from our own scroll and editing-toolbar logic.
- Settings logic lives in pure, tested view-models; the Obsidian UI classes stay thin and are checked by hand.
- The overflow fade and the scroll indicator measure layout (scroll metrics, `offsetWidth`) only in ResizeObserver, scroll and post-render callbacks, never on the first bind at load.
- The scroll track is the plugin's own element in the pill, outside the actions row. It never carries `.mobile-navbar-action`, so the renderer, the locator and ordering never see it; its CSS variables are written on the track element only; it is removed on unload.
- The navbar observer skips mutation batches made only of attribute changes inside the track.
- The scroll track is sized in CSS (a third of the pill, at most 160px; the thumb's 8px minimum is CSS too). The code writes only unitless ratios on the track element and never reads the track's size.
- The pill's `::before` belongs to the plugin only while a pinned button is active and the row overflows (it paints the end caps); otherwise it has no content. The pill's `::after` belongs to Obsidian and is never used.
- While the row overflows, a pinned button is `position: absolute` against the pill, outside the scrolled content, so the bounce does not move it. The row stays `position: static`, and its `::before` / `::after` are spacers for the pins. Pinning must change neither the row's scroll width, including the menu button's margin, nor the pill's width, or the overflow classes hold themselves on. On the non-floating phone bar the pin rules apply only in scroll mode, because shrunk buttons leave a rigid spacer no room. Size a spacer with `width`, not `flex-basis`: WebKit leaves a flex-basis out of the content-sized pill's width, and Chrome does not show the difference.
- On the phone without floating navigation the bar scrolls only in scroll mode, a class derived from the visible button count and the row's width (`needsScrollMode`), never from the live overflow classes, so the mode does not depend on history.

## Config compatibility (release gate)

Released compat fixtures are immutable, and `normalizeSettings` must keep reproducing every frozen snapshot. On push events CI also compares against the commit before the push (skipped for a new branch), so fixtures are immutable once pushed, not only once tagged. Obsidian updates plugins automatically, and Sync can run different plugin versions against the same `data.json` on different devices.

Rules:

- Every release has a frozen compat snapshot, and the release is blocked without it.
- Never edit or delete released fixtures or existing `compat.lock` lines. A failing compat test means the code is wrong: fix the code, or stop and ask.
- Schema changes are additive and optional. `version` stays `1`, and "never set up" is the absence of a key, never a default value written on load.
- A non-additive change requires an explicit migration, a decision record and the maintainer's approval first.
- A feature that changes the schema adds its own inputs to `tests/compat/cases/` in the same cycle.
- Each fixture is compared on the top-level keys its release knew. Keys added later are listed with their first release in `KEY_INTRODUCED_IN` (`tests/compat/knownKeys.ts`). A feature that adds a top-level key registers it there in the same cycle. Keys are gated strictly from their first release on. `KEY_INTRODUCED_IN` is append-only and an entry's version never changes. A key may only be registered for an unreleased version.
- Case keys that must stay unknown start with `x-future-`, so a later release that adopts the key cannot turn a released fixture red.
- A release whose code behaves differently from its snapshot is a bug in that release. Never edit a frozen fixture to match the new behaviour.

How it works (`tests/compat/`):

- `cases/` holds the living inputs (`absent`, `defaults`, `real-world`, `all-hidden`, `malformed`, `unknown-keys`, `pinned`, `pinned-malformed`). Case files must not contain personal data: anonymise them, as `real-world.json` is.
- `fixtures/<x.y.z>/` holds one `<case>.input.json` and `<case>.expected.json` per case, frozen from that release's own code. `compat.lock` holds a SHA-256 line per fixture file, in `sha256sum` format.
- `compat.test.ts` checks every fixture against the data layer (`normalizeSettings` deep-equals `expected`) and the live plugin on phone, tablet and desktop. It also checks that loading never writes. `npm test` fails when any version in `versions.json` has no complete `fixtures/<x.y.z>/`.
- `compat:freeze` is add-only. It writes only missing fixture files and never changes an existing lock line.
- Unknown top-level keys are carried through on save. `splitStored` and `toStoredData` in `src/core/storedData.ts` keep them beside `Settings`, and known keys always win. A new top-level key must be declared in `Settings`; the compiler then requires it in `KNOWN_KEYS`.

Immutability check (`npm run compat:immutable`, run in CI and in the release workflow): it fails when a file under `tests/compat/fixtures/` was modified or deleted since the previous release tag, or when an existing `compat.lock` line was changed or removed. The base is the nearest release tag (`x.y.z`) before `HEAD^`, because on a release-tag build `HEAD` carries the new tag. `dev/*` tags are ignored. For a local check, set `COMPAT_BASE=<ref>`, for example `COMPAT_BASE=HEAD` on a clean tree. Checkouts need `fetch-depth: 0` so the tags are visible.

Adding a case: the gate fails for every released version until the case is frozen from each release's own code. For each released tag, run:

```
git worktree add --detach <tmp> <tag>
npm run compat:freeze -- <tag> --core <tmp>/src/core/normalizeSettings.ts
git worktree remove <tmp>
```

Then commit the new fixture files and lock lines. Never freeze a release from the current code.

## Conventions

- Test first for logic. Behavioural fakes exist only for `Component`, `Plugin`, `Events`, `Notice`, `setIcon`/`getIconIds` and `Platform`; `PluginSettingTab`, `Modal`, `FuzzySuggestModal` and `Setting` are inert stubs and must not grow into fakes.
- `npm run build` type-checks `tests/`. Tests that use fake-only members of the obsidian mock must import it by relative path (`../__mocks__/obsidian`), not from `obsidian`.
- jsdom quirks: MutationObserver callbacks are asynchronous (await a couple of microtasks); `scrollHeight` and `clientHeight` are 0 unless defined; the scroll tracker treats the first scroll event of a scroller as its anchor.
- Obsidian guidelines apply: sentence-case UI text, headings through `setHeading()`, no `innerHTML`, no inline styles (use CSS classes in `styles.css` and Obsidian CSS variables), register events and listeners through the plugin or component, release everything on unload, no default hotkeys, use `Platform` instead of user-agent sniffing, use `this.app` and never the global `app`.
- CSS classes are prefixed `navbar-composer-`. Obsidian's mobile rules (`.is-phone`, `.is-mobile`, container queries) can out-rank plain selectors, so scope overrides explicitly and avoid `!important` unless Obsidian's own rule uses it.
- The plugin relies on undocumented Obsidian internals and CSS classes. Treat that as an accepted risk and keep it isolated behind the adapter.
- `styles.css` starts with a `--navbar-composer-css-rev` marker; bump it at the start of each on-device test round.

## WebKit layout check

Run `npm run check:webkit` before every device round, after the last change to `styles.css` or the pin and overflow rules. It is Mac only (system WebKit and `swift`) and is not part of `npm test` or CI.

It lays `styles.css` over a mock of the three bars (iPhone floating, iPhone non-floating, iPad) at several widths, drives it with the plugin's pin, overflow and scroll-mode rules, and fails when pinning changes the pill's width, the row's widths or whether the row scrolls. While the row scrolls it also fails when a pin is part of the scrolled content, covers a button at either end, or the row cannot be scrolled. Each count is reached three ways: pins switched on, going up and coming down. A stuck overflow state only shows coming down. Pass a path to check another stylesheet: `npm run check:webkit -- <file>`.

The mock's base styles (`scripts/webkit-check/obsidian-base.css`) are a hand copy of Obsidian's rules and can go stale: a pass says nothing about an Obsidian update. It also cannot show bounce or touch behaviour, so it does not replace the device round.

## Releasing

Obsidian reads `manifest.json` from the default branch and installs `main.js`, `manifest.json` and `styles.css` from the GitHub release whose tag equals the manifest version. The tag has no `v` prefix (`.npmrc` sets `tag-version-prefix=""`).

1. Update `CHANGELOG.md` first, and commit it. Move the `[Unreleased]` entries under a new `## [<x.y.z>]` (version only, no date) heading, leave an empty `[Unreleased]` section above it, and update the compare links at the bottom. Group entries as Added, Changed, Deprecated, Removed, Fixed, Security (Keep a Changelog), plus Internal for changes users cannot see. Write for users, not for commit archaeology. The changelog is part of the release: do not run `npm version` without the entry for that version. Add entries to `[Unreleased]` as part of each user-visible change, not at release time.
2. Bump the version with `npm version <x.y.z>`. npm runs the `version` hook in this order: it updates `package.json`, `manifest.json` and `versions.json` (via `version-bump.mjs`), freezes `tests/compat/fixtures/<x.y.z>/` with new `compat.lock` lines (`compat:freeze`), and stages those files. Then npm commits and creates the tag. Only change `minAppVersion` in `manifest.json` when the release needs a newer Obsidian; `versions.json` maps each plugin version to its `minAppVersion`. The very first release (1.0.0) has its version files already set, so just create the tag by hand: `git tag -a 1.0.0 -m "1.0.0"`.
   - Check that the version commit contains `tests/compat/fixtures/<x.y.z>/` and the new `compat.lock` lines (`git show --stat HEAD`). If it does not, stop before pushing.
   - If the hook fails, nothing is committed or tagged, but npm does not revert the bump. Run `git checkout -- package.json package-lock.json manifest.json versions.json`, also `git checkout -- tests/compat/compat.lock` and remove a new `tests/compat/fixtures/<x.y.z>/` if the freeze wrote them, fix the cause, and run `npm version <x.y.z>` again. If a tag exists, delete it with `git tag -d <x.y.z>` first.
3. Push the tag. The `Release Obsidian plugin` workflow (`.github/workflows/release.yml`) checks that the tag matches `manifest.json`, runs lint, tests and the build, attests the build provenance, and creates a **draft** GitHub release with the three assets.
4. Open the draft release on GitHub, paste the `CHANGELOG.md` section for this version as the notes, and click **Publish release**. A draft is not installable.
5. The first submission goes through the Obsidian Community dashboard (community.obsidian.md, sign in with an Obsidian account and connect GitHub). Later releases are scanned automatically. A version that fails the automated review is removed from search within 24 hours: fix it and publish a new, higher version. The dashboard can run a preview scan on any branch, tag or commit before you release.
6. Before running `npm version`, check that `CHANGELOG.md` has the entry for this version, that `npm run lint`, `npm run build` and `npm test` pass and that the manifest still follows the submission rules: the description is at most 250 characters, starts with a verb and ends with a period; the `id` and `name` contain neither "obsidian" nor "plugin".

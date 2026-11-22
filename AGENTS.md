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

`main.js` and `data.json` are build and runtime artifacts and are gitignored. Run `npm run lint`, `npm run build` and `npm test` before every commit; all three must pass. Commit messages follow Conventional Commits.

## Layout

- `src/main.ts` is the composition root. It loads and normalises settings, creates the store, registers the settings tab, decides the device mode once at load, and starts the controllers.
- `src/core/` holds pure logic: settings model, normaliser, list operations, the settings store, native-button identification, the scroll tracker and metrics, the tablet visibility reducer and device-mode resolution. It must not import `obsidian` or the DOM.
- `src/platform/` holds the Obsidian adapters. `obsidianInternals.ts` is the only file that may touch the undocumented `app.mobileNavbar` and `app.commands`.
- `src/dom/` holds shared DOM helpers (idempotent writes, the custom button builder).
- `src/navbar/` is the shared renderer and controller for phone and tablet.
- `src/tablet/` is the tablet visibility controller (scroll and editing-toolbar handling).
- `src/settings/` is the settings UI: pure view-models plus thin Obsidian UI classes.
- `styles.css` holds all plugin styles. `manifest.json` and `versions.json` hold the plugin metadata.
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

## Conventions

- Test first for logic. Behavioural fakes exist only for `Component`, `Plugin`, `Events`, `Notice`, `setIcon`/`getIconIds` and `Platform`; `PluginSettingTab`, `Modal`, `FuzzySuggestModal` and `Setting` are inert stubs and must not grow into fakes.
- `npm run build` type-checks `tests/`. Tests that use fake-only members of the obsidian mock must import it by relative path (`../__mocks__/obsidian`), not from `obsidian`.
- jsdom quirks: MutationObserver callbacks are asynchronous (await a couple of microtasks); `scrollHeight` and `clientHeight` are 0 unless defined; the scroll tracker treats the first scroll event of a scroller as its anchor.
- Obsidian guidelines apply: sentence-case UI text, headings through `setHeading()`, no `innerHTML`, no inline styles (use CSS classes in `styles.css` and Obsidian CSS variables), register events and listeners through the plugin or component, release everything on unload, no default hotkeys, use `Platform` instead of user-agent sniffing, use `this.app` and never the global `app`.
- CSS classes are prefixed `navbar-composer-`. Obsidian's mobile rules (`.is-phone`, `.is-mobile`, container queries) can out-rank plain selectors, so scope overrides explicitly and avoid `!important` unless Obsidian's own rule uses it.
- The plugin relies on undocumented Obsidian internals and CSS classes. Treat that as an accepted risk and keep it isolated behind the adapter.

## Releasing

Obsidian reads `manifest.json` from the default branch and installs `main.js`, `manifest.json` and `styles.css` from the GitHub release whose tag equals the manifest version. The tag has no `v` prefix (`.npmrc` sets `tag-version-prefix=""`).

1. Bump the version with `npm version <x.y.z>`. It updates `package.json`, `manifest.json` and `versions.json` (via `version-bump.mjs`) and creates the tag. Only change `minAppVersion` in `manifest.json` when the release needs a newer Obsidian; `versions.json` maps each plugin version to its `minAppVersion`. The very first release (1.0.0) has its version files already set, so just create the tag by hand: `git tag -a 1.0.0 -m "1.0.0"`.
2. Push the tag. The `Release Obsidian plugin` workflow (`.github/workflows/release.yml`) checks that the tag matches `manifest.json`, runs lint, tests and the build, attests the build provenance, and creates a **draft** GitHub release with the three assets.
3. Open the draft release on GitHub, write the notes and click **Publish release**. A draft is not installable.
4. The first submission goes through the Obsidian Community dashboard (community.obsidian.md, sign in with an Obsidian account and connect GitHub). Later releases are scanned automatically. A version that fails the automated review is removed from search within 24 hours: fix it and publish a new, higher version. The dashboard can run a preview scan on any branch, tag or commit before you release.
5. Before tagging, check that `npm run lint`, `npm run build` and `npm test` pass and that the manifest still follows the submission rules: the description is at most 250 characters, starts with a verb and ends with a period; the `id` and `name` contain neither "obsidian" nor "plugin".

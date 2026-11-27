# Changelog

All notable changes to Navbar Composer are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0]

### Added

- The navigation bar is hidden completely when a device's layout has no visible buttons. This now applies on phone as well as tablet.
- The settings preview explains why the phone bar is hidden.
- The navigation bar fades at the edge that has more buttons when they do not all fit.
- While the navigation bar scrolls, a line under the buttons, about a third of the bar's width, shows which part of the bar is visible and how far it is scrolled.
- Pin first button and Pin last button keep the first or last button in place while the rest of the bar scrolls, separately for phone and tablet.
- The settings preview shows which buttons are pinned.

### Changed

- The settings preview keeps many buttons on one scrolling line instead of wrapping them into a tall pill.
- The empty-state notice in the settings preview stays centred.

### Fixed

- Settings written by other plugin versions are no longer lost. Unknown top-level keys in `data.json` are kept and written back on save, which matters when Obsidian auto-updates the plugin or Sync runs different versions against the same data.
- On a phone with floating navigation turned off, the bar now scrolls when its buttons cannot fit, so every button can be reached.

### Internal

- Added a config compatibility suite: frozen per-release fixtures, a `compat.lock` with a SHA-256 per file, a release gate, and data-layer, live-plugin, no-write-on-load and round-trip tests.
- Added the `compat:freeze` and `compat:immutable` scripts. CI and the release workflow run the immutability check, and `npm version` freezes and stages the new snapshot.

## [1.0.0]

### Added

- Compose Obsidian's mobile navigation bar separately for phone and tablet: add buttons for any command with any icon, hide built-in buttons and reorder them.

[Unreleased]: https://github.com/volodymyrkoval/navbar-composer/compare/1.1.0...HEAD
[1.1.0]: https://github.com/volodymyrkoval/navbar-composer/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/volodymyrkoval/navbar-composer/releases/tag/1.0.0

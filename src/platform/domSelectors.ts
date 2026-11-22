/**
 * Undocumented Obsidian markup this plugin depends on. Confirmed on iPhone and iPad (plan: Spike results).
 * When an Obsidian update changes one of these, this file is the only place to fix.
 */

/** Every native navbar action; custom buttons carry this class too, so queries exclude ours explicitly. */
export const NAVBAR_ACTION_SELECTOR = '.mobile-navbar-action';

/** The main editor split. Scroll events count only inside it, so sidebar scrolling does not hide the bar. */
export const ROOT_SPLIT_SELECTOR = '.workspace-split.mod-root';

/** Set on `body` while Obsidian's editing toolbar is shown (the Markdown editor has focus). */
export const TOOLBAR_OPEN_CLASS = 'mod-toolbar-open';

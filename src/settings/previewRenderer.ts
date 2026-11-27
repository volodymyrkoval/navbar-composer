import { setTooltip } from 'obsidian';
import { createNavButton } from '../dom/navButton';
import type { PinnedEdgeIds } from '../core/pins';
import { hintText, type PreviewButton } from './previewModel';

const PREVIEW_ITEM_CLASS = 'navbar-composer-preview-item';
const MISSING_CLASS = 'is-missing';
const PREVIEW_PINNED_START_CLASS = 'navbar-composer-preview-pinned-start';
const PREVIEW_PINNED_END_CLASS = 'navbar-composer-preview-pinned-end';

/**
 * How a preview button shows its hint. `tooltip` is for hover-capable desktops; `notice` is for touch devices,
 * where `show` receives the hint text on each tap.
 */
export type PreviewHint = { mode: 'tooltip' } | { mode: 'notice'; show: (text: string) => void };

/**
 * Draws the preview into `el`, or the empty text when there are no buttons (thin UI, verified in J3).
 * Each button shows exactly one hint, chosen by `hint`.
 * `pinned` names the buttons that get the pinned look.
 */
export function renderPreview(
	el: HTMLElement,
	buttons: readonly PreviewButton[],
	emptyText: string,
	hint: PreviewHint,
	pinned: PinnedEdgeIds,
): void {
	el.empty();
	if (buttons.length > 0) {
		for (const button of buttons) renderPreviewItem(el, button, hint, pinned);
	} else {
		renderEmptyPreview(el, emptyText);
	}
}

function renderPreviewItem(el: HTMLElement, button: PreviewButton, hint: PreviewHint, pinned: PinnedEdgeIds): void {
	// Preview buttons never run a command, so the command id stays empty.
	const item = createNavButton(
		el,
		{ id: button.id, commandId: '', icon: button.icon, label: button.label },
		itemClasses(button, pinned),
	);
	attachHint(item, button, hint);
}

function itemClasses(button: PreviewButton, pinned: PinnedEdgeIds): string[] {
	const classes = [PREVIEW_ITEM_CLASS];
	if (button.missing) classes.push(MISSING_CLASS);
	if (button.id === pinned.start) classes.push(PREVIEW_PINNED_START_CLASS);
	if (button.id === pinned.end) classes.push(PREVIEW_PINNED_END_CLASS);
	return classes;
}

function attachHint(item: HTMLElement, button: PreviewButton, hint: PreviewHint): void {
	if (hint.mode === 'tooltip') {
		setTooltip(item, hintText(button));
		return;
	}
	// Obsidian turns `aria-label` into a tooltip that also fires on touch, so touch items must not carry it.
	item.removeAttribute('aria-label');
	// The preview is rebuilt on every update and the old items are discarded, so a plain listener cannot leak.
	item.addEventListener('click', () => hint.show(hintText(button)));
}

function renderEmptyPreview(el: HTMLElement, emptyText: string): void {
	el.setText(emptyText);
}

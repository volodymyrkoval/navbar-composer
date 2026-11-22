import { setTooltip } from 'obsidian';
import { createNavButton } from '../dom/navButton';
import { hintText, type PreviewButton } from './previewModel';

const PREVIEW_ITEM_CLASS = 'navbar-composer-preview-item';
const MISSING_CLASS = 'is-missing';

/**
 * How a preview button shows its hint. `tooltip` is for hover-capable desktops; `notice` is for touch devices,
 * where `show` receives the hint text on each tap.
 */
export type PreviewHint = { mode: 'tooltip' } | { mode: 'notice'; show: (text: string) => void };

/**
 * Draws the preview into `el`, or the empty text when there are no buttons (thin UI, verified in J3).
 * Each button shows exactly one hint, chosen by `hint`.
 */
export function renderPreview(
	el: HTMLElement,
	buttons: readonly PreviewButton[],
	emptyText: string,
	hint: PreviewHint,
): void {
	el.empty();
	if (buttons.length > 0) {
		for (const button of buttons) renderPreviewItem(el, button, hint);
	} else {
		renderEmptyPreview(el, emptyText);
	}
}

function renderPreviewItem(el: HTMLElement, button: PreviewButton, hint: PreviewHint): void {
	const classes = button.missing ? [PREVIEW_ITEM_CLASS, MISSING_CLASS] : [PREVIEW_ITEM_CLASS];
	// Preview buttons never run a command, so the command id stays empty.
	const item = createNavButton(el, { id: button.id, commandId: '', icon: button.icon, label: button.label }, classes);
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

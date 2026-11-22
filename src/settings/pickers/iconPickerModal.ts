import { type App, type FuzzyMatch, FuzzySuggestModal, getIconIds, setIcon } from 'obsidian';
import { displayIconName } from './iconName';

/**
 * Fuzzy list of Obsidian icons, each shown with its preview. Like the command picker, `onChoose` runs only when
 * an icon is chosen (thin UI, verified in J3).
 */
export class IconPickerModal extends FuzzySuggestModal<string> {
	readonly #onChoose: (icon: string) => void;

	constructor(app: App, onChoose: (icon: string) => void) {
		super(app);
		this.#onChoose = onChoose;
		this.setPlaceholder('Choose an icon');
	}

	getItems(): string[] {
		return getIconIds();
	}

	getItemText(icon: string): string {
		return displayIconName(icon);
	}

	renderSuggestion(match: FuzzyMatch<string>, el: HTMLElement): void {
		this.#renderIconPreview(el, match.item);
	}

	onChooseItem(icon: string): void {
		this.#onChoose(icon);
	}

	#renderIconPreview(el: HTMLElement, icon: string): void {
		setIcon(el.createSpan({ cls: 'navbar-composer-icon-preview' }), icon);
		el.createSpan({ text: displayIconName(icon) });
	}
}

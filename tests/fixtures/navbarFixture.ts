/**
 * Fixture of Obsidian's native mobile navbar DOM, as captured on iPhone and iPad
 * (docs/plans/001-navbar-composer-v1.md, Technical notes → Spike results).
 * Deliberately independent of src/ so a wrong constant in src shows up in tests.
 */

interface NativeActionSpec {
	id: string;
	innerTag: 'button' | 'span' | 'div';
	extraClasses?: readonly string[];
	hasFlair?: boolean;
}

const NATIVE_ACTIONS: readonly NativeActionSpec[] = [
	{ id: 'back', innerTag: 'button' },
	{ id: 'forward', innerTag: 'button' },
	{ id: 'quick-switcher', innerTag: 'span' },
	{ id: 'new-tab', innerTag: 'span' },
	{ id: 'tabs', innerTag: 'div' },
	{ id: 'menu', innerTag: 'span', extraClasses: ['has-longpress-menu', 'tappable'], hasFlair: true },
];

export interface NavbarOptions {
	perActionClasses?: boolean;
	count?: number;
}

function appendAction(row: HTMLElement, spec: NativeActionSpec, perActionClasses: boolean): void {
	const actionClasses = perActionClasses ? [`mobile-navbar-action-${spec.id}`] : [];
	const action = row.createDiv({
		cls: ['mobile-navbar-action', ...actionClasses, ...(spec.extraClasses ?? [])],
	});
	action.createEl(spec.innerTag, { cls: 'clickable-icon' });
	if (spec.hasFlair) action.createDiv({ cls: 'navbar-action-flair' });
}

export function buildNavbar({ perActionClasses = true, count = NATIVE_ACTIONS.length }: NavbarOptions = {}): HTMLElement {
	const container = document.createElement('div');
	container.addClass('mobile-navbar', 'mod-raised');
	const row = container.createDiv({ cls: 'mobile-navbar-actions' });

	for (const spec of NATIVE_ACTIONS.slice(0, count)) {
		appendAction(row, spec, perActionClasses);
	}
	return container;
}

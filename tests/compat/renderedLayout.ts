import { NATIVE_ACTION_CLASS } from '../../src/core/nativeIdentification';
import { NATIVE_IDS, type NavItem, type NativeId } from '../../src/core/settingsModel';
import { NAV_BUTTON_COMMAND_ATTR, NAV_BUTTON_ICON_ATTR, NAV_BUTTON_ID_ATTR } from '../../src/dom/navButton';
import { HIDDEN_CLASS, ORDER_VAR } from '../../src/navbar/navbarRenderer';
import { NAVBAR_ACTION_SELECTOR } from '../../src/platform/domSelectors';

/** One navbar action as the user sees it: a native (with its hidden flag) or one of our custom buttons. */
export type RenderedItem =
	| { kind: 'native'; id: NativeId; hidden: boolean }
	| { kind: 'custom'; id: string; commandId: string; icon: string; label: string };

/** The navbar as the user sees it: every action, in visual order. */
export function renderedLayout(navbar: HTMLElement): RenderedItem[] {
	return byVisualOrder(Array.from(navbar.querySelectorAll<HTMLElement>(NAVBAR_ACTION_SELECTOR))).map(readAction);
}

/** The same view, derived from the settings: natives always, visible customs only. */
export function expectedLayout(items: readonly NavItem[]): RenderedItem[] {
	return items.flatMap((item): RenderedItem[] => {
		if (item.kind === 'native') return [{ kind: 'native', id: item.id, hidden: !item.visible }];
		if (!item.visible) return [];
		return [{ kind: 'custom', id: item.id, commandId: item.commandId, icon: item.icon, label: item.label }];
	});
}

/** Stable sort by the order variable. An action without one keeps its DOM index. */
function byVisualOrder(elements: HTMLElement[]): HTMLElement[] {
	const keyed = elements.map((el, domIndex) => {
		const raw = el.style.getPropertyValue(ORDER_VAR);
		return { el, key: raw === '' ? domIndex : Number(raw) };
	});
	return keyed.sort((a, b) => a.key - b.key).map(({ el }) => el);
}

function readAction(el: HTMLElement): RenderedItem {
	const id = nativeIdOf(el);
	if (id === undefined) return readCustom(el);
	return { kind: 'native', id, hidden: el.classList.contains(HIDDEN_CLASS) };
}

function nativeIdOf(el: HTMLElement): NativeId | undefined {
	return NATIVE_IDS.find((candidate) => el.classList.contains(NATIVE_ACTION_CLASS[candidate]));
}

/** Our custom buttons are the only actions that carry an id attribute; any other unknown action is an error. */
function readCustom(el: HTMLElement): RenderedItem {
	const id = el.getAttribute(NAV_BUTTON_ID_ATTR);
	if (id === null) throw new Error('action is neither a native nor a custom button');
	return {
		kind: 'custom',
		id,
		commandId: el.getAttribute(NAV_BUTTON_COMMAND_ATTR) ?? '',
		icon: el.getAttribute(NAV_BUTTON_ICON_ATTR) ?? '',
		label: el.getAttribute('aria-label') ?? '',
	};
}

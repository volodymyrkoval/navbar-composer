import { afterEach, describe, expect, it } from 'vitest';
import { __unknownIcons } from '../__mocks__/obsidian';
import { commandIdFromEvent, createNavButton, syncNavButton, type NavButtonSpec } from '../../src/dom/navButton';

/** Counts the DOM mutation records `action` produces under `target`, as a MutationObserver would see them. */
function countMutations(target: Node, action: () => void): number {
	const observer = new MutationObserver(() => undefined);
	observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
	action();
	const count = observer.takeRecords().length;
	observer.disconnect();
	return count;
}

const spec: NavButtonSpec = { id: 'custom-1', commandId: 'app:go-back', icon: 'arrow-left', label: 'Go back' };
const OUTER_CLASSES = ['mobile-navbar-action', 'navbar-composer-action', 'navbar-composer-ordered'];

describe('navButton', () => {
	describe('createNavButton', () => {
		it('appends an outer element carrying the given classes to the parent', () => {
			const parent = document.createElement('div');

			const button = createNavButton(parent, spec, OUTER_CLASSES);

			expect(parent.contains(button)).toBe(true);
			expect(button.matches('.mobile-navbar-action.navbar-composer-action.navbar-composer-ordered')).toBe(true);
		});

		it('marks the outer element as a labelled button wired to its id, command and icon', () => {
			const button = createNavButton(document.createElement('div'), spec, OUTER_CLASSES);

			expect(button.getAttribute('role')).toBe('button');
			expect(button.getAttribute('aria-label')).toBe('Go back');
			expect(button.getAttribute('data-navbar-composer-id')).toBe('custom-1');
			expect(button.getAttribute('data-navbar-composer-command')).toBe('app:go-back');
			expect(button.getAttribute('data-navbar-composer-icon')).toBe('arrow-left');
		});

		it('renders the icon inside exactly one direct inner span.clickable-icon', () => {
			const button = createNavButton(document.createElement('div'), spec, OUTER_CLASSES);

			const hosts = Array.from(button.querySelectorAll(':scope > span.clickable-icon'));
			expect(hosts).toHaveLength(1);
			expect(hosts[0]?.querySelector('svg')).not.toBeNull();
		});
	});

	describe('icon fallback', () => {
		afterEach(() => {
			__unknownIcons.clear();
		});

		it('shows the first letter of the label, uppercased, when Obsidian has no svg for the icon', () => {
			__unknownIcons.add('renamed-icon');
			const button = createNavButton(document.createElement('div'), { ...spec, icon: 'renamed-icon', label: 'go back' }, OUTER_CLASSES);

			expect(button.querySelector('span.clickable-icon')?.textContent).toBe('G');
		});
	});

	describe('syncNavButton', () => {
		it('writes nothing when the spec is unchanged', () => {
			const button = createNavButton(document.createElement('div'), spec, OUTER_CLASSES);

			const mutations = countMutations(button, () => syncNavButton(button, spec));

			expect(mutations).toBe(0);
		});

		it('updates the command and label on the outer element when they change', () => {
			const button = createNavButton(document.createElement('div'), spec, OUTER_CLASSES);

			syncNavButton(button, { ...spec, commandId: 'app:forward', label: 'Forward' });

			expect(button.getAttribute('data-navbar-composer-command')).toBe('app:forward');
			expect(button.getAttribute('aria-label')).toBe('Forward');
		});

		it('re-renders the icon when the icon id changes', () => {
			const button = createNavButton(document.createElement('div'), spec, OUTER_CLASSES);

			syncNavButton(button, { ...spec, icon: 'arrow-right' });

			expect(button.querySelector('span.clickable-icon svg')?.getAttribute('data-icon')).toBe('arrow-right');
		});

		it('re-creates the inner span with its icon when it has been removed', () => {
			const button = createNavButton(document.createElement('div'), spec, OUTER_CLASSES);
			button.querySelector('span.clickable-icon')?.remove();

			syncNavButton(button, spec);

			const hosts = Array.from(button.querySelectorAll(':scope > span.clickable-icon'));
			expect(hosts).toHaveLength(1);
			expect(hosts[0]?.querySelector('svg')).not.toBeNull();
		});
	});

	describe('commandIdFromEvent', () => {
		it('resolves the command of a tap on the icon inside a custom button', () => {
			const parent = document.createElement('div');
			const button = createNavButton(parent, spec, OUTER_CLASSES);
			const tap = new MouseEvent('click', { bubbles: true });

			button.querySelector('svg')?.dispatchEvent(tap);

			expect(commandIdFromEvent(tap)).toBe('app:go-back');
		});

		it('resolves nothing for a tap outside any custom button', () => {
			const tap = new MouseEvent('click', { bubbles: true });

			document.createElement('div').dispatchEvent(tap);

			expect(commandIdFromEvent(tap)).toBeNull();
		});
	});
});

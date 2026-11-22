import { describe, expect, it } from 'vitest';
import { buildPreviewModel, emptyPreviewText, hintText } from '../../src/settings/previewModel';
import type { CustomItem, NavItem } from '../../src/core/settingsModel';

const NOTHING_MISSING = (): boolean => false;
const SAVE_BUTTON: CustomItem = { kind: 'custom', id: 'custom-1', commandId: 'app:save', icon: 'save', label: 'Quick save', visible: true };

describe('buildPreviewModel', () => {
	it('shows a visible native button with its built-in label and icon', () => {
		const items: NavItem[] = [{ kind: 'native', id: 'back', visible: true }];

		expect(buildPreviewModel(items, NOTHING_MISSING)).toEqual([
			{ id: 'back', icon: 'arrow-left', label: 'Back', missing: false },
		]);
	});

	it('shows a visible custom button with its own icon and label, flagged missing when its command is unknown', () => {
		const isMissing = (commandId: string) => commandId === 'app:save';

		expect(buildPreviewModel([SAVE_BUTTON], isMissing)).toEqual([
			{ id: 'custom-1', icon: 'save', label: 'Quick save', missing: true },
		]);
	});

	it('leaves out hidden buttons and keeps the order of the rest', () => {
		const items: NavItem[] = [
			{ kind: 'native', id: 'back', visible: true },
			{ kind: 'native', id: 'forward', visible: false },
			{ kind: 'native', id: 'tabs', visible: true },
		];

		expect(buildPreviewModel(items, NOTHING_MISSING).map((button) => button.id)).toEqual(['back', 'tabs']);
	});

	it('is empty when no item is visible, as with the tablet defaults', () => {
		const items: NavItem[] = [{ kind: 'native', id: 'back', visible: false }];

		expect(buildPreviewModel(items, NOTHING_MISSING)).toEqual([]);
	});
});

describe('emptyPreviewText', () => {
	it('explains an empty phone navbar', () => {
		expect(emptyPreviewText('phone')).toBe('No visible buttons. The navbar is empty.');
	});

	it('explains why the tablet bar is hidden', () => {
		expect(emptyPreviewText('tablet')).toBe('The bar is hidden on tablet until you show at least one button.');
	});
});

describe('hintText', () => {
	it('is the button label', () => {
		expect(hintText({ id: 'back', icon: 'arrow-left', label: 'Back', missing: false })).toBe('Back');
	});

	it('says when the command of a custom button is not found', () => {
		expect(hintText({ id: 'custom-1', icon: 'save', label: 'Quick save', missing: true })).toBe(
			'Quick save (command not found)',
		);
	});
});

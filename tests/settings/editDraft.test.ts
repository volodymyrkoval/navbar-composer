import { describe, expect, it } from 'vitest';
import { createDraft, finalizeEdit, withCommand, withIcon } from '../../src/settings/editDraft';
import type { CustomItem } from '../../src/core/settingsModel';

const SAVE_BUTTON: CustomItem = { kind: 'custom', id: 'custom-1', commandId: 'app:save', icon: 'save', label: 'Quick save', visible: true };

describe('createDraft', () => {
	it('copies the command and icon of the item being edited, without its label', () => {
		expect(createDraft(SAVE_BUTTON)).toEqual({ commandId: 'app:save', icon: 'save' });
	});
});

describe('withCommand', () => {
	it('replaces the command and keeps the icon', () => {
		const draft = { commandId: 'app:save', icon: 'save' };

		expect(withCommand(draft, { id: 'app:open-help', name: 'Open help' })).toEqual({
			commandId: 'app:open-help',
			icon: 'save',
		});
	});
});

describe('withIcon', () => {
	it('replaces the icon and keeps the command', () => {
		const draft = { commandId: 'app:save', icon: 'save' };

		expect(withIcon(draft, 'star')).toEqual({ commandId: 'app:save', icon: 'star' });
	});
});

describe('finalizeEdit', () => {
	it('derives the label from the command name', () => {
		const draft = { commandId: 'app:save', icon: 'save' };

		expect(finalizeEdit(draft, 'Save file')).toEqual({ commandId: 'app:save', icon: 'save', label: 'Save file' });
	});

	it('falls back to the command id when the command name is unknown', () => {
		const draft = { commandId: 'plugin:gone', icon: 'star' };

		expect(finalizeEdit(draft, null)).toEqual({ commandId: 'plugin:gone', icon: 'star', label: 'plugin:gone' });
	});
});

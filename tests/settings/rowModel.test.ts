import { describe, expect, it } from 'vitest';
import { buildRowModel, itemLabel } from '../../src/settings/rowModel';
import type { CustomItem, NativeItem } from '../../src/core/settingsModel';

const BACK: NativeItem = { kind: 'native', id: 'back', visible: true };
const SAVE_BUTTON: CustomItem = { kind: 'custom', id: 'custom-1', commandId: 'app:save', icon: 'save', label: 'Quick save', visible: true };
const ONLY_POSITION = { index: 0, count: 1 };

describe('itemLabel', () => {
	it('uses the custom label of a custom button', () => {
		expect(itemLabel(SAVE_BUTTON)).toBe('Quick save');
	});
});

describe('buildRowModel', () => {
	it('describes a native button by its built-in label, icon and description, without edit controls', () => {
		expect(buildRowModel(BACK, { index: 0, count: 6 }, null)).toMatchObject({
			label: 'Back',
			icon: 'arrow-left',
			description: 'Built-in',
			isCustom: false,
			missing: false,
		});
	});

	it('describes a custom button by its own label and icon, with a short fixed description that does not repeat the title', () => {
		expect(buildRowModel(SAVE_BUTTON, ONLY_POSITION, 'Save file')).toMatchObject({
			label: 'Quick save',
			icon: 'save',
			description: 'Custom',
			isCustom: true,
			missing: false,
		});
	});

	it('flags a custom button whose command no longer exists as missing, described by its command id', () => {
		expect(buildRowModel(SAVE_BUTTON, ONLY_POSITION, null)).toMatchObject({
			description: 'app:save',
			missing: true,
		});
	});

	it('forbids moving up from the first position and moving down from the last', () => {
		expect(buildRowModel(BACK, { index: 0, count: 3 }, null)).toMatchObject({ canMoveUp: false, canMoveDown: true });
		expect(buildRowModel(BACK, { index: 1, count: 3 }, null)).toMatchObject({ canMoveUp: true, canMoveDown: true });
		expect(buildRowModel(BACK, { index: 2, count: 3 }, null)).toMatchObject({ canMoveUp: true, canMoveDown: false });
	});

	it('reports the visibility of the item', () => {
		expect(buildRowModel({ ...BACK, visible: false }, ONLY_POSITION, null)).toMatchObject({ visible: false });
	});
});

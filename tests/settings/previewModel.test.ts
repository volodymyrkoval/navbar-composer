import { describe, expect, it } from 'vitest';
import { buildPreviewModel, emptyPreviewText, hintText, previewPins } from '../../src/settings/previewModel';
import { createDefaultSettings, type CustomItem, type NavItem, type Settings } from '../../src/core/settingsModel';
import { setPin } from '../../src/core/pins';

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
		expect(emptyPreviewText('phone')).toBe('The navigation bar is hidden. Use the sidebar to reach settings and tabs.');
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

describe('previewPins', () => {
	const phoneButtons = (settings: Settings) => buildPreviewModel(settings.phone, NOTHING_MISSING);
	const hide = (items: NavItem[], id: string): NavItem[] =>
		items.map((item) => (item.id === id ? { ...item, visible: false } : item));
	const onlyVisible = (items: NavItem[], id: string): NavItem[] =>
		items.map((item) => ({ ...item, visible: item.id === id }));

	it('pins nothing when no pin is set', () => {
		const settings = createDefaultSettings();

		expect(previewPins(settings, 'phone', phoneButtons(settings))).toStrictEqual({ start: null, end: null });
	});

	it('pins the first visible button to the start', () => {
		const settings = setPin(createDefaultSettings(), 'phone', 'start', true);

		expect(previewPins(settings, 'phone', phoneButtons(settings))).toStrictEqual({ start: 'back', end: null });
	});

	it('pins the last visible button to the end', () => {
		const settings = setPin(createDefaultSettings(), 'phone', 'end', true);

		expect(previewPins(settings, 'phone', phoneButtons(settings))).toStrictEqual({ start: null, end: 'menu' });
	});

	it('pins both edges when both pins are set', () => {
		const settings = setPin(setPin(createDefaultSettings(), 'phone', 'start', true), 'phone', 'end', true);

		expect(previewPins(settings, 'phone', phoneButtons(settings))).toStrictEqual({ start: 'back', end: 'menu' });
	});

	it('gives one visible button only the start pin when both pins are set (Q6)', () => {
		const onlyTabs = { ...createDefaultSettings(), phone: onlyVisible(createDefaultSettings().phone, 'tabs') };
		const settings = setPin(setPin(onlyTabs, 'phone', 'start', true), 'phone', 'end', true);

		expect(previewPins(settings, 'phone', phoneButtons(settings))).toStrictEqual({ start: 'tabs', end: null });
	});

	it('skips a hidden first button when pinning the start', () => {
		let settings = createDefaultSettings();
		settings = { ...settings, phone: hide(settings.phone, 'back') };
		settings = setPin(settings, 'phone', 'start', true);

		expect(previewPins(settings, 'phone', phoneButtons(settings))).toStrictEqual({ start: 'forward', end: null });
	});

	it('skips a hidden last button when pinning the end', () => {
		let settings = createDefaultSettings();
		settings = { ...settings, phone: hide(settings.phone, 'menu') };
		settings = setPin(settings, 'phone', 'end', true);

		expect(previewPins(settings, 'phone', phoneButtons(settings))).toStrictEqual({ start: null, end: 'tabs' });
	});

	it('follows the visual order when the list is reordered', () => {
		const menuFirst: NavItem[] = [
			{ kind: 'native', id: 'menu', visible: true },
			{ kind: 'native', id: 'back', visible: true },
			{ kind: 'native', id: 'forward', visible: true },
			{ kind: 'native', id: 'quick-switcher', visible: true },
			{ kind: 'native', id: 'new-tab', visible: true },
			{ kind: 'native', id: 'tabs', visible: true },
		];
		const settings = setPin({ ...createDefaultSettings(), phone: menuFirst }, 'phone', 'start', true);

		expect(previewPins(settings, 'phone', phoneButtons(settings))).toStrictEqual({ start: 'menu', end: null });
	});

	it('pins a visible custom button whose command is missing, by its id', () => {
		const settings = setPin(
			{ ...createDefaultSettings(), phone: [...createDefaultSettings().phone, SAVE_BUTTON] },
			'phone',
			'end',
			true,
		);
		const buttons = buildPreviewModel(settings.phone, () => true);

		expect(previewPins(settings, 'phone', buttons)).toStrictEqual({ start: null, end: 'custom-1' });
	});

	it('reads only the pins of the device it is asked about', () => {
		const tabletItems: NavItem[] = [
			{ kind: 'native', id: 'tabs', visible: true },
			{ kind: 'native', id: 'menu', visible: true },
		];
		let settings: Settings = { ...createDefaultSettings(), tablet: tabletItems };
		settings = setPin(settings, 'phone', 'start', true);
		const tabletButtons = buildPreviewModel(settings.tablet, NOTHING_MISSING);

		expect(previewPins(settings, 'tablet', tabletButtons)).toStrictEqual({ start: null, end: null });

		settings = setPin(settings, 'tablet', 'end', true);

		expect(previewPins(settings, 'tablet', tabletButtons)).toStrictEqual({ start: null, end: 'menu' });
		expect(previewPins(settings, 'phone', phoneButtons(settings))).toStrictEqual({ start: 'back', end: null });
	});

	it('pins nothing on the tablet defaults, even with both tablet pins set', () => {
		let settings = setPin(createDefaultSettings(), 'tablet', 'start', true);
		settings = setPin(settings, 'tablet', 'end', true);

		expect(previewPins(settings, 'tablet', buildPreviewModel(settings.tablet, NOTHING_MISSING))).toStrictEqual({
			start: null,
			end: null,
		});
	});
});

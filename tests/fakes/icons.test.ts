import { afterEach, describe, expect, it } from 'vitest';
import { __setIconIds, __unknownIcons, getIconIds, setIcon } from '../__mocks__/obsidian';

describe('icon fakes', () => {
	afterEach(() => {
		__unknownIcons.clear();
		__setIconIds([]);
	});

	it('setIcon renders an svg tagged with the icon id', () => {
		const el = document.createElement('div');

		setIcon(el, 'arrow-left');

		const svg = el.querySelector('svg');
		expect(svg?.getAttribute('data-icon')).toBe('arrow-left');
		expect(svg?.classList.contains('lucide-arrow-left')).toBe(true);
	});

	it('setIcon replaces what the element previously showed', () => {
		const el = document.createElement('div');
		el.createSpan({ text: 'old label' });

		setIcon(el, 'copy');

		expect(el.textContent).toBe('');
		expect(el.querySelector('svg')).not.toBeNull();
	});

	it('setIcon renders nothing for an icon id marked unknown', () => {
		const el = document.createElement('div');
		__unknownIcons.add('missing-icon');

		setIcon(el, 'missing-icon');

		expect(el.querySelector('svg')).toBeNull();
	});

	it('getIconIds returns the ids seeded by __setIconIds', () => {
		__setIconIds(['arrow-left', 'copy']);

		expect(getIconIds()).toEqual(['arrow-left', 'copy']);
	});
});

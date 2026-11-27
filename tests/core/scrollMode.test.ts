import { describe, expect, it } from 'vitest';
import { LONGPRESS_MENU_MARGIN_PX, MIN_SHRUNK_BUTTON_PX, needsScrollMode } from '../../src/core/scrollMode';

describe('needsScrollMode', () => {
	describe('default floor (MIN_SHRUNK_BUTTON_PX)', () => {
		it('uses the measured shrunk button width of 38px', () => {
			expect(MIN_SHRUNK_BUTTON_PX).toBe(38);
		});

		it('scrolls when eleven shrunk buttons overflow a 414px row', () => {
			expect(needsScrollMode(11, 414)).toBe(true);
		});

		it('does not scroll when ten shrunk buttons fit a 414px row', () => {
			expect(needsScrollMode(10, 414)).toBe(false);
		});

		it('does not scroll when the buttons exactly fill the row', () => {
			expect(needsScrollMode(9, 342)).toBe(false);
		});

		it('scrolls when the buttons overflow the row by one pixel', () => {
			expect(needsScrollMode(9, 341)).toBe(true);
		});
	});

	describe('rotation', () => {
		it('scrolls fifteen buttons on the narrow phone row', () => {
			expect(needsScrollMode(15, 414)).toBe(true);
		});

		it('does not scroll fifteen buttons on a wide bar', () => {
			expect(needsScrollMode(15, 900)).toBe(false);
		});
	});

	describe('empty input', () => {
		it('does not scroll when the row has zero width', () => {
			expect(needsScrollMode(15, 0)).toBe(false);
		});

		it('does not scroll when there are no visible buttons', () => {
			expect(needsScrollMode(0, 414)).toBe(false);
		});
	});

	describe('custom floor', () => {
		it('does not scroll eight buttons at 30px in a 300px row', () => {
			expect(needsScrollMode(8, 300, 30)).toBe(false);
		});

		it('scrolls eight buttons at 40px in a 300px row', () => {
			expect(needsScrollMode(8, 300, 40)).toBe(true);
		});
	});

	describe('extra width (menu button margin)', () => {
		it('scrolls when the menu margin pushes ten buttons past a 386px row', () => {
			expect(needsScrollMode(10, 386, 38, 8)).toBe(true);
		});

		it('does not scroll ten buttons in a 386px row without the menu margin', () => {
			expect(needsScrollMode(10, 386, 38, 0)).toBe(false);
		});

		it('does not scroll when the margin-adjusted buttons exactly fill the row', () => {
			expect(needsScrollMode(10, 388, 38, 8)).toBe(false);
		});

		it('scrolls eleven buttons in a 414px row with no margin', () => {
			expect(needsScrollMode(11, 414, 38, 0)).toBe(true);
		});
	});

	describe('menu button margin constant', () => {
		it('is 8px, Obsidian margin-inline-start on the menu button', () => {
			expect(LONGPRESS_MENU_MARGIN_PX).toBe(8);
		});
	});
});

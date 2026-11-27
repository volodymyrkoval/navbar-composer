import { describe, expect, it } from 'vitest';
import { HIDDEN_THUMB, scrollThumb } from '../../src/core/scrollThumb';

describe('scrollThumb', () => {
	describe('hidden', () => {
		it('hides the thumb when the content fits the row exactly', () => {
			expect(scrollThumb({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 })).toStrictEqual(HIDDEN_THUMB);
		});

		it('ignores an overflow of exactly one pixel, like the fade', () => {
			expect(scrollThumb({ scrollLeft: 0, scrollWidth: 301, clientWidth: 300 })).toStrictEqual(HIDDEN_THUMB);
		});

		it('hides the thumb for a hidden bar with zero widths', () => {
			expect(scrollThumb({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 })).toStrictEqual(HIDDEN_THUMB);
		});
	});

	describe('position', () => {
		it('sizes the thumb to the visible share of the row when the row is at rest', () => {
			expect(scrollThumb({ scrollLeft: 0, scrollWidth: 600, clientWidth: 300 })).toStrictEqual({ visible: true, widthRatio: 0.5, progress: 0 });
		});

		it('moves the thumb proportionally to the scroll position mid-row', () => {
			expect(scrollThumb({ scrollLeft: 150, scrollWidth: 600, clientWidth: 300 })).toStrictEqual({ visible: true, widthRatio: 0.5, progress: 0.5 });
		});

		it('puts the thumb at the end of the track when the row is scrolled to the end', () => {
			expect(scrollThumb({ scrollLeft: 300, scrollWidth: 600, clientWidth: 300 })).toStrictEqual({ visible: true, widthRatio: 0.5, progress: 1 });
		});

		it('keeps the thumb at the start during a rubber-band overscroll at the start', () => {
			expect(scrollThumb({ scrollLeft: -20, scrollWidth: 600, clientWidth: 300 })).toStrictEqual({ visible: true, widthRatio: 0.5, progress: 0 });
		});

		it('keeps the thumb at the end during a rubber-band overscroll past the end', () => {
			expect(scrollThumb({ scrollLeft: 330, scrollWidth: 600, clientWidth: 300 })).toStrictEqual({ visible: true, widthRatio: 0.5, progress: 1 });
		});
	});

	describe('width', () => {
		it('keeps the unfloored width ratio on a very long row (the minimum is CSS work)', () => {
			expect(scrollThumb({ scrollLeft: 0, scrollWidth: 1000, clientWidth: 100 })).toStrictEqual({ visible: true, widthRatio: 0.1, progress: 0 });
		});

		it('moves the unfloored thumb to the end of the row', () => {
			expect(scrollThumb({ scrollLeft: 900, scrollWidth: 1000, clientWidth: 100 })).toStrictEqual({ visible: true, widthRatio: 0.1, progress: 1 });
		});

		it('rounds to four decimals and computes the progress from the scroll position', () => {
			expect(scrollThumb({ scrollLeft: 130, scrollWidth: 700, clientWidth: 300 })).toStrictEqual({ visible: true, widthRatio: 0.4286, progress: 0.325 });
		});

		it('gives the device ratio for eight phone buttons in a 381px viewport', () => {
			expect(scrollThumb({ scrollLeft: 0, scrollWidth: 416, clientWidth: 381 })).toStrictEqual({ visible: true, widthRatio: 0.9159, progress: 0 });
		});
	});
});

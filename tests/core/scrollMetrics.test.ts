import { describe, expect, it } from 'vitest';
import { BOTTOM_TOLERANCE_PX, clampScrollTop, isAtBottom, type ScrollMetrics } from '../../src/core/scrollMetrics';

const LONG_NOTE: ScrollMetrics = { scrollTop: 900, scrollHeight: 1000, clientHeight: 100 };

function at(scrollTop: number, base: ScrollMetrics = LONG_NOTE): ScrollMetrics {
	return { ...base, scrollTop };
}

describe('isAtBottom', () => {
	it('reports the bottom when the scroll is at its maximum', () => {
		expect(isAtBottom(LONG_NOTE)).toBe(true);
	});

	it('accepts a scroll within the bottom tolerance and rejects one just beyond it', () => {
		const edge = 1000 - 100 - BOTTOM_TOLERANCE_PX;

		expect(isAtBottom(at(edge))).toBe(true);
		expect(isAtBottom(at(edge - 1))).toBe(false);
	});

	it('reports the bottom when the scroll overshoots the end (rubber-band)', () => {
		expect(isAtBottom(at(950))).toBe(true);
	});

	it('is not at the bottom when scrolled to the top, even with overscroll above', () => {
		expect(isAtBottom(at(-30))).toBe(false);
	});

	it('is always at the bottom when the content is shorter than the viewport', () => {
		expect(isAtBottom({ scrollTop: 0, scrollHeight: 80, clientHeight: 100 })).toBe(true);
	});
});

describe('clampScrollTop', () => {
	it('clamps a negative offset (overscroll above the top) to zero', () => {
		expect(clampScrollTop(at(-30))).toBe(0);
	});

	it('clamps an offset past the maximum to the maximum', () => {
		expect(clampScrollTop(at(950))).toBe(900);
	});

	it('clamps to zero when the content is shorter than the viewport', () => {
		expect(clampScrollTop({ scrollTop: 40, scrollHeight: 80, clientHeight: 100 })).toBe(0);
	});
});

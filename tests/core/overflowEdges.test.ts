import { describe, expect, it } from 'vitest';
import { overflowEdges } from '../../src/core/overflowEdges';

describe('overflowEdges', () => {
	it('reports no edges when the content fits the row exactly', () => {
		expect(overflowEdges({ scrollLeft: 0, scrollWidth: 200, clientWidth: 200 })).toStrictEqual({ start: false, end: false });
	});

	it('ignores an overflow of exactly one pixel', () => {
		expect(overflowEdges({ scrollLeft: 0, scrollWidth: 201, clientWidth: 200 })).toStrictEqual({ start: false, end: false });
	});

	it('reports only the end edge when the row is at rest with hidden content to the right', () => {
		expect(overflowEdges({ scrollLeft: 0, scrollWidth: 300, clientWidth: 200 })).toStrictEqual({ start: false, end: true });
	});

	it('reports both edges when the row is scrolled into the middle', () => {
		expect(overflowEdges({ scrollLeft: 50, scrollWidth: 300, clientWidth: 200 })).toStrictEqual({ start: true, end: true });
	});

	it('reports only the start edge when the row is scrolled to the end', () => {
		expect(overflowEdges({ scrollLeft: 100, scrollWidth: 300, clientWidth: 200 })).toStrictEqual({ start: true, end: false });
	});

	it('treats a sub-pixel gap at the end as the end', () => {
		expect(overflowEdges({ scrollLeft: 99.5, scrollWidth: 300, clientWidth: 200 })).toStrictEqual({ start: true, end: false });
	});

	it('clamps a negative scrollLeft (rubber band at the start) to no start edge', () => {
		expect(overflowEdges({ scrollLeft: -20, scrollWidth: 300, clientWidth: 200 })).toStrictEqual({ start: false, end: true });
	});

	it('clamps a scrollLeft past the end (rubber band at the end) to no end edge', () => {
		expect(overflowEdges({ scrollLeft: 130, scrollWidth: 300, clientWidth: 200 })).toStrictEqual({ start: true, end: false });
	});

	it('reports no edges for a hidden bar with zero widths', () => {
		expect(overflowEdges({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 })).toStrictEqual({ start: false, end: false });
	});
});

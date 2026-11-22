import { describe, expect, it } from 'vitest';
import { ScrollDeltaTracker } from '../../src/core/scrollTracker';

describe('ScrollDeltaTracker', () => {
	it('reports a downward move once the scroll passes the jitter threshold', () => {
		const tracker = new ScrollDeltaTracker();
		const scroller = {};
		tracker.track(scroller, 0);

		expect(tracker.track(scroller, 10)).toBe('down');
	});

	it('reports nothing on the first sighting of a scroller', () => {
		const tracker = new ScrollDeltaTracker();

		expect(tracker.track({}, 500)).toBeNull();
	});

	it('ignores movement below the jitter threshold', () => {
		const tracker = new ScrollDeltaTracker();
		const scroller = {};
		tracker.track(scroller, 0);

		expect(tracker.track(scroller, 9)).toBeNull();
	});

	it('measures movement cumulatively from the last reported position', () => {
		const tracker = new ScrollDeltaTracker();
		const scroller = {};
		tracker.track(scroller, 0);
		tracker.track(scroller, 4);
		tracker.track(scroller, 8);

		expect(tracker.track(scroller, 12)).toBe('down');
	});

	it('reports an upward move when the scroll reverses', () => {
		const tracker = new ScrollDeltaTracker();
		const scroller = {};
		tracker.track(scroller, 50);

		expect(tracker.track(scroller, 40)).toBe('up');
	});

	it('tracks each scroller independently', () => {
		const tracker = new ScrollDeltaTracker();
		const sidebar = {};
		const editor = {};
		tracker.track(sidebar, 0);
		tracker.track(editor, 100);

		expect(tracker.track(sidebar, 10)).toBe('down');
		expect(tracker.track(editor, 95)).toBeNull();
	});

	it('forgets every anchor on reset', () => {
		const tracker = new ScrollDeltaTracker();
		const scroller = {};
		tracker.track(scroller, 0);
		tracker.track(scroller, 20);
		tracker.reset();

		expect(tracker.track(scroller, 40)).toBeNull();
	});
});

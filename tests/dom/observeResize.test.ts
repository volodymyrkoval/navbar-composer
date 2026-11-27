import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeResize } from '../../src/dom/observeResize';

/** Records what it observes and lets a test fire the callback by hand. */
class FakeResizeObserver {
	static instances: FakeResizeObserver[] = [];
	readonly observed: Element[] = [];
	disconnected = false;

	constructor(readonly callback: ResizeObserverCallback) {
		FakeResizeObserver.instances.push(this);
	}

	observe(target: Element): void {
		this.observed.push(target);
	}

	disconnect(): void {
		this.disconnected = true;
	}

	/** Simulates the browser reporting a size change. */
	fire(): void {
		this.callback([], this as unknown as ResizeObserver);
	}
}

function lastObserver(): FakeResizeObserver {
	const observer = FakeResizeObserver.instances[FakeResizeObserver.instances.length - 1];
	if (observer === undefined) throw new Error('no ResizeObserver was created');
	return observer;
}

describe('observeResize', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		FakeResizeObserver.instances = [];
	});

	it('observes the element and forwards every resize to the callback', () => {
		vi.stubGlobal('ResizeObserver', FakeResizeObserver);
		const el = document.createElement('div');
		const onResize = vi.fn();

		observeResize(el, onResize);
		lastObserver().fire();

		expect(lastObserver().observed).toEqual([el]);
		expect(onResize).toHaveBeenCalledTimes(1);
	});

	it('returns a disconnect function that disconnects the observer', () => {
		vi.stubGlobal('ResizeObserver', FakeResizeObserver);

		const disconnect = observeResize(document.createElement('div'), () => undefined);
		disconnect();

		expect(lastObserver().disconnected).toBe(true);
	});

	it('returns a no-op disconnect and does not throw without ResizeObserver', () => {
		vi.stubGlobal('ResizeObserver', undefined);

		let disconnect: (() => void) | undefined;
		expect(() => {
			disconnect = observeResize(document.createElement('div'), () => undefined);
		}).not.toThrow();
		expect(typeof disconnect).toBe('function');
		expect(() => disconnect!()).not.toThrow();
	});
});

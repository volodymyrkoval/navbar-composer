import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestFrame } from '../../src/dom/requestFrame';

describe('requestFrame', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('forwards the callback to requestAnimationFrame', () => {
		const raf = vi.fn((_callback: FrameRequestCallback) => 7);
		vi.stubGlobal('requestAnimationFrame', raf);
		const callback = vi.fn();

		requestFrame(callback);
		raf.mock.calls[0]?.[0](0);

		expect(raf).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('returns a cancel function that cancels the frame by its id', () => {
		vi.stubGlobal('requestAnimationFrame', vi.fn(() => 7));
		const cancel = vi.fn();
		vi.stubGlobal('cancelAnimationFrame', cancel);

		const stop = requestFrame(() => undefined);
		stop();

		expect(cancel).toHaveBeenCalledWith(7);
	});
});

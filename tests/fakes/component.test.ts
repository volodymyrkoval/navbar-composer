import { afterEach, describe, expect, it, vi } from 'vitest';
import { Component, Events } from '../__mocks__/obsidian';

describe('Component fake', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('clears a registered interval when the component unloads', () => {
		vi.useFakeTimers();
		const component = new Component();
		const tick = vi.fn();
		component.registerInterval(setInterval(tick, 10));

		component.load();
		component.unload();
		vi.advanceTimersByTime(50);

		expect(tick).not.toHaveBeenCalled();
	});

	it('unsubscribes a registered event when the component unloads', () => {
		const component = new Component();
		const events = new Events();
		const onSave = vi.fn();
		component.registerEvent(events.on('save', onSave));

		component.load();
		component.unload();
		events.trigger('save');

		expect(onSave).not.toHaveBeenCalled();
	});

	it('stops a child DOM listener from firing once the parent unloads', () => {
		const parent = new Component();
		const child = new Component();
		const target = document.createElement('button');
		const onClick = vi.fn();
		parent.addChild(child);
		child.registerDomEvent(target, 'click', onClick);

		parent.load();
		target.click();
		parent.unload();
		target.click();

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

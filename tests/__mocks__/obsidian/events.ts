/**
 * Behavioural fake of Obsidian's `Events` bus. `on` returns a reference that
 * `offref` (or `Component.registerEvent`) uses to unsubscribe.
 */

export type EventCallback = (...data: unknown[]) => unknown;

export interface EventRef {
	e: Events;
	name: string;
	fn: EventCallback;
}

export class Events {
	private readonly listeners = new Map<string, EventCallback[]>();

	on(name: string, callback: EventCallback): EventRef {
		this.listeners.set(name, [...(this.listeners.get(name) ?? []), callback]);
		return { e: this, name, fn: callback };
	}

	off(name: string, callback: EventCallback): void {
		const remaining = (this.listeners.get(name) ?? []).filter((fn) => fn !== callback);
		this.listeners.set(name, remaining);
	}

	offref(ref: EventRef): void {
		this.off(ref.name, ref.fn);
	}

	trigger(name: string, ...data: unknown[]): void {
		(this.listeners.get(name) ?? []).forEach((fn) => fn(...data));
	}
}

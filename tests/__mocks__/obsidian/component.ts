/**
 * Behavioural fake of Obsidian's `Component`: a lifecycle owner that loads its
 * children and runs every cleanup registered through the `register*` helpers.
 */

import type { EventRef } from './events';

export type Cleanup = () => void;

export class Component {
	private loaded = false;
	private readonly children: Component[] = [];
	private readonly cleanups: Cleanup[] = [];

	load(): void {
		if (this.loaded) return;
		this.loaded = true;
		this.onload();
		this.children.forEach((child) => child.load());
	}

	unload(): void {
		if (!this.loaded) return;
		this.loaded = false;
		this.cleanups.splice(0).forEach((cleanup) => cleanup());
		this.children.forEach((child) => child.unload());
		this.onunload();
	}

	addChild<T extends Component>(child: T): T {
		this.children.push(child);
		if (this.loaded) child.load();
		return child;
	}

	register(cleanup: Cleanup): void {
		this.cleanups.push(cleanup);
	}

	registerEvent(ref: EventRef): void {
		this.register(() => ref.e.offref(ref));
	}

	registerDomEvent(
		target: EventTarget,
		type: string,
		callback: (evt: Event) => unknown,
		options?: AddEventListenerOptions | boolean,
	): void {
		target.addEventListener(type, callback, options);
		this.register(() => target.removeEventListener(type, callback, options));
	}

	registerInterval(id: number): number {
		this.register(() => globalThis.clearInterval(id));
		return id;
	}

	onload(): void {}

	onunload(): void {}
}

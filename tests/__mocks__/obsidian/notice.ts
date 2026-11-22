/**
 * Behavioural fake of Obsidian's `Notice`. Every instance is recorded in the
 * static `instances` list so tests can assert what the user would have seen.
 */
export class Notice {
	static instances: Notice[] = [];

	static reset(): void {
		Notice.instances = [];
	}

	message: string;

	constructor(message: string) {
		this.message = message;
		Notice.instances.push(this);
	}
}

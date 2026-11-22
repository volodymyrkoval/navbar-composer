/** Creates an id for a new custom item: a time stamp plus a short random part, so ids do not collide in practice. */
export function createCustomId(): string {
	return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

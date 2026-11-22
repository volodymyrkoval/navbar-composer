/** Lucide ids carry this prefix; the picker shows the name without it. */
const LUCIDE_PREFIX = 'lucide-';

/** Display name of an icon id: the id without a leading `lucide-`. */
export function displayIconName(iconId: string): string {
	return iconId.startsWith(LUCIDE_PREFIX) ? iconId.slice(LUCIDE_PREFIX.length) : iconId;
}

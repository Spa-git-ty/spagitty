// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Author avatars, computed from the name alone.
 *
 * GitKraken fetches a picture from the hosting provider. GitLord does not, and
 * that is a decision rather than a shortcut: the graph would otherwise make a
 * network request per distinct author on a screen that is already the app's
 * most performance-sensitive surface, and it would leak the repository's
 * committer list to a third party to do it. A repository is also frequently
 * opened with no network at all.
 *
 * What an avatar is actually for here is scanning — "which of these rows are
 * the same person" answered without reading the names. Initials on a stable
 * colour do that, and they do it identically on every machine and every launch,
 * which a fetched picture does not.
 *
 * The colours are the lane palette, so an avatar never introduces a hue the
 * theme has not already agreed to.
 */

import { LANE_COLOR_COUNT, laneColorVar } from '$lib/metrics';

/**
 * A stable bucket for a name.
 *
 * FNV-1a: short, has no dependencies, and spreads similar strings — "Ada L" and
 * "Ada M" want different colours far more than they want adjacent ones.
 */
function hash(text: string): number {
	let value = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		value ^= text.charCodeAt(i);
		// The FNV prime, by shifts, because a plain multiply overflows to a
		// float and stops being deterministic across engines.
		value = (value + (value << 1) + (value << 4) + (value << 7) + (value << 8) + (value << 24)) >>> 0;
	}
	return value;
}

/** The CSS variable holding this author's colour. */
export function avatarColor(name: string): string {
	return `var(${laneColorVar(hash(name.trim().toLowerCase()) % LANE_COLOR_COUNT)})`;
}

/**
 * One or two letters for a name.
 *
 * First and last word, which is what a person recognises. Names written as one
 * word give one letter rather than an arbitrary second one, and a name that is
 * an email address — which git allows — uses the part before the `@` so the
 * avatar does not become a wall of identical `@`s.
 */
export function initials(name: string): string {
	const cleaned = name.trim().replace(/<[^>]*>/g, '').trim();
	const source = cleaned.includes('@') && !cleaned.includes(' ')
		? cleaned.slice(0, cleaned.indexOf('@'))
		: cleaned;

	const words = source.split(/[\s._-]+/).filter((word) => /\p{L}|\p{N}/u.test(word));
	if (words.length === 0) return '?';
	if (words.length === 1) return [...words[0]][0].toUpperCase();

	const first = [...words[0]][0];
	const last = [...words[words.length - 1]][0];
	return (first + last).toUpperCase();
}

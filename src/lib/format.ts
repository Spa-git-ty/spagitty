// SPDX-License-Identifier: GPL-3.0-or-later

/** Relative time, in the register the handoff uses: "now", "1 hour ago", "yesterday". */
export function relativeTime(unixSeconds: number, now = Date.now()): string {
	const seconds = Math.floor(now / 1000) - unixSeconds;

	if (seconds < 45) return 'now';
	if (seconds < 90) return 'a minute ago';

	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes} minutes ago`;

	const hours = Math.round(minutes / 60);
	if (hours === 1) return '1 hour ago';
	if (hours < 24) return `${hours} hours ago`;

	const days = Math.round(hours / 24);
	if (days === 1) return 'yesterday';
	if (days < 30) return `${days} days ago`;

	const months = Math.round(days / 30);
	if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;

	const years = Math.round(days / 365);
	return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * The graph's message column only shows a time when it is *notable* — the
 * handoff labels a few rows rather than every one, so the eye reads the column
 * as messages with occasional landmarks rather than a wall of timestamps.
 * A row is notable when it is the first of its day.
 */
export function isNotable(time: number, previousTime: number | undefined): boolean {
	if (previousTime === undefined) return true;
	const day = (t: number) => Math.floor(t / 86400);
	return day(time) !== day(previousTime);
}

/** Clock time for the detail panel: "12:29 PM". */
export function clockTime(unixSeconds: number): string {
	return new Date(unixSeconds * 1000).toLocaleTimeString(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	});
}

/** Full date for tooltips. */
export function fullDate(unixSeconds: number): string {
	return new Date(unixSeconds * 1000).toLocaleString();
}

/** The status glyphs from the handoff: `+ ~ − ?`. */
export function statusGlyph(status: string): string {
	switch (status) {
		case 'added':
			return '+';
		case 'deleted':
			return '−';
		case 'renamed':
			return '~';
		case 'modified':
			return '~';
		default:
			return '?';
	}
}

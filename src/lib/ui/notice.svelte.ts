// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What just happened, said once.
 *
 * Git operations fail in ways only git can describe — "your local changes would
 * be overwritten", "not something we can merge" — and those sentences are the
 * most useful thing GitLumiere can show. Before this existed they went to a
 * `catch` that put them in a store belonging to whichever screen started the
 * operation, which meant an action started from the command palette had nowhere
 * to report to.
 *
 * One notice at a time, newest wins. A stack of them is a log, and a log is
 * `docs/`-shaped, not corner-of-the-screen-shaped.
 */

export type Tone = 'ok' | 'error';

export interface Notice {
	id: number;
	tone: Tone;
	/** One line. The headline of what happened. */
	title: string;
	/** git's own words, when there are any. Shown small, wrapped, selectable. */
	detail: string | null;
}

/** How long a success stays up. Failures stay until dismissed. */
const LINGER = 4000;

let current = $state<Notice | null>(null);
let nextId = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function show(tone: Tone, title: string, detail: string | null): void {
	if (timer) clearTimeout(timer);
	timer = null;

	current = { id: ++nextId, tone, title, detail };

	// A failure is something to read and act on, so it waits to be dismissed. A
	// success is an acknowledgement, and an acknowledgement that needs clicking
	// away is worse than no acknowledgement.
	if (tone === 'ok') {
		const mine = current.id;
		timer = setTimeout(() => {
			if (current?.id === mine) current = null;
		}, LINGER);
	}
}

/** Git errors arrive as `Error`, as a string, or as neither. Say something either way. */
export function describe(error: unknown): string {
	if (typeof error === 'string') return error;
	if (error instanceof Error) return error.message;
	return String(error);
}

export const notice = {
	get current(): Notice | null {
		return current;
	},

	ok(title: string, detail: string | null = null): void {
		show('ok', title, detail);
	},

	/** Report a failure with git's own message under the headline. */
	failed(title: string, error: unknown): void {
		show('error', title, describe(error));
	},

	dismiss(): void {
		if (timer) clearTimeout(timer);
		timer = null;
		current = null;
	}
};

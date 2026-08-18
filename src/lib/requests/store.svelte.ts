// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Pull requests.
 *
 * GitLumiere talks to no hosting service, and by decision nothing here will in
 * this pass. What this store holds is the shape the screen renders once a host
 * *is* connected — the list, the selection, and whether an account exists at
 * all — so that FEAT-017 fills it in rather than redesigning the screen.
 *
 * There is no `load()` that calls anything. Adding one is FEAT-017's job, and
 * a stub that pretended to fetch would be worse than an honest absence.
 */

import type { PullRequest } from '../types';

let list = $state<PullRequest[]>([]);
let connected = $state(false);
let error = $state<string | null>(null);
let openId = $state<string | null>(null);

export const requests = {
	get all(): PullRequest[] {
		return list;
	},
	/** True when a hosting account is connected. Always false in this pass. */
	get connected(): boolean {
		return connected;
	},
	get error(): string | null {
		return error;
	},
	get openId(): string | null {
		return openId;
	},

	/** What is waiting on the person using GitLumiere. The screen leads with these. */
	get needingYou(): PullRequest[] {
		return list.filter((request) => request.needsYou);
	},

	/** Everything else: open, but somebody else's move. */
	get waitingOnOthers(): PullRequest[] {
		return list.filter((request) => !request.needsYou);
	},

	/** The open request, or null. */
	get open(): PullRequest | null {
		return list.find((request) => request.id === openId) ?? null;
	},

	select(id: string | null): void {
		openId = id;
	},

	/**
	 * Put a list on the screen.
	 *
	 * The only way requests get here, and it exists for the tests and for
	 * FEAT-017 to call once it has fetched something. Connecting an account,
	 * storing a token and making the request are all FEAT-017.
	 */
	present(next: PullRequest[], from: { connected: boolean } = { connected: true }): void {
		list = next;
		connected = from.connected;
		error = null;
		// Keep the open request only while it is still in the list.
		if (openId === null || !next.some((request) => request.id === openId)) {
			openId = next[0]?.id ?? null;
		}
	},

	/** Record a failure to reach the host. FEAT-017 will call this. */
	fail(reason: string): void {
		error = reason;
		list = [];
		openId = null;
	},

	clear(): void {
		list = [];
		connected = false;
		error = null;
		openId = null;
	}
};

/** What each review state is called on screen. Host-agnostic, deliberately. */
export const REVIEW_LABELS: Record<PullRequest['review'], string> = {
	awaitingReview: 'awaiting review',
	changesRequested: 'changes requested',
	approved: 'approved',
	noReviewers: 'no reviewers'
};

/** What each check state is called. `null` means the host runs no checks. */
export const CHECK_LABELS: Record<NonNullable<PullRequest['checks']>, string> = {
	passing: 'checks passing',
	failing: 'checks failing',
	running: 'checks running'
};

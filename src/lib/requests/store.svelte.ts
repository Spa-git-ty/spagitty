// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Pull requests, read from whichever service hosts the open repository.
 *
 * FEAT-010 built this store's shape with nothing behind it; FEAT-017 filled it
 * in without changing the shape, which is what the earlier item was for.
 *
 * The read is a single call that either succeeds completely or fails with a
 * reason — offline, rate limited, no account, or a repository the host will not
 * show. Those are four different sentences and the store keeps them apart,
 * because "could not load" is a useless thing to tell somebody who is about to
 * decide whether to wait or to go and fix something.
 */

import * as api from '../api';
import type { ForgeRepo, PullRequest } from '../types';

let list = $state<PullRequest[]>([]);
let connected = $state(false);
let error = $state<string | null>(null);
let openId = $state<string | null>(null);
let repo = $state<ForgeRepo | null>(null);
let loading = $state(false);

/** Guards against a slow read landing after a newer one. */
let seq = 0;

export const requests = {
	get all(): PullRequest[] {
		return list;
	},
	/** True when the last read reached a host and came back with a list. */
	get connected(): boolean {
		return connected;
	},
	/** Which repository on a host this is, or null when it is not on one. */
	get repo(): ForgeRepo | null {
		return repo;
	},
	get loading(): boolean {
		return loading;
	},
	get error(): string | null {
		return error;
	},
	get openId(): string | null {
		return openId;
	},

	/** What is waiting on the person using Spagitty. The screen leads with these. */
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
	 * The only way requests get here — `load` calls it, and so do the tests.
	 * Kept separate from the read so that what the screen does with a list is
	 * testable without one.
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

	/** Record a failure to reach the host, in the host's own words. */
	fail(reason: string): void {
		connected = false;
		error = reason;
		list = [];
		openId = null;
	},

	/**
	 * Read the open repository's pull requests.
	 *
	 * Two calls, and the first one decides whether the second is worth making:
	 * a repository that is not on a host Spagitty reads has nothing to fetch,
	 * and saying so is a different answer from a failed request.
	 */
	async load(): Promise<void> {
		if (!api.inTauri()) return;

		loading = true;
		const mine = ++seq;
		try {
			const where = await api.forgeRepo();
			if (mine !== seq) return;
			repo = where;

			if (where === null) {
				list = [];
				connected = false;
				error = null;
				openId = null;
				return;
			}

			const found = await api.pullRequests();
			if (mine !== seq) return;
			this.present(found);
		} catch (e) {
			if (mine === seq) this.fail(String(e));
		} finally {
			if (mine === seq) loading = false;
		}
	},

	clear(): void {
		seq += 1;
		list = [];
		connected = false;
		error = null;
		openId = null;
		repo = null;
		loading = false;
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

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
import type { FileDiff, ForgeRepo, PullRequest, ReviewVerdict } from '../types';

let list = $state<PullRequest[]>([]);
let connected = $state(false);
let error = $state<string | null>(null);
let openId = $state<string | null>(null);
let repo = $state<ForgeRepo | null>(null);
let loading = $state(false);

/** Guards against a slow read landing after a newer one. */
let seq = 0;

/**
 * The files of the pull request currently open, and nothing else's.
 *
 * One request's worth rather than a cache keyed by number: a reader looks at
 * one pull request at a time, and a cache would have to be invalidated when
 * somebody pushes to a branch — which is a thing this screen cannot see happen.
 * Re-reading on selection is one request and is always current.
 */
let files = $state<FileDiff[]>([]);
let filesFor = $state<number | null>(null);
let filesLoading = $state(false);
let filesError = $state<string | null>(null);
let openPath = $state<string | null>(null);

/** Guards a slow file read landing after the reader has moved on. */
let fileSeq = 0;

/** In flight, or the host's refusal of the last attempt. */
let reviewing = $state(false);
let reviewError = $state<string | null>(null);

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

	/** The files of the open pull request. Empty until they are read. */
	get files(): FileDiff[] {
		return files;
	},
	get filesLoading(): boolean {
		return filesLoading;
	},
	get filesError(): string | null {
		return filesError;
	},
	/** Which file is open in the diff pane, or null. */
	get openPath(): string | null {
		return openPath;
	},
	/** The open file's diff, or null when none is selected. */
	get openFile(): FileDiff | null {
		return files.find((file) => file.path === openPath) ?? null;
	},
	get reviewing(): boolean {
		return reviewing;
	},
	get reviewError(): string | null {
		return reviewError;
	},

	select(id: string | null): void {
		if (id === openId) return;
		openId = id;
		// The files belong to whichever request was open. Dropping them here
		// rather than when the new ones arrive means the pane is never showing
		// one pull request's diff under another's title.
		this.clearFiles();
	},

	/** Open one file in the diff pane. */
	selectPath(path: string | null): void {
		openPath = path;
	},

	/**
	 * Put a file list on the screen.
	 *
	 * The only way files get here — `loadFiles` calls it, and so do the tests.
	 * Selects the first file, since a file list with nothing open is a screen
	 * asking the reader to click before it will show them anything.
	 */
	presentFiles(next: FileDiff[], forNumber: number): void {
		files = next;
		filesFor = forNumber;
		filesError = null;
		if (openPath === null || !next.some((file) => file.path === openPath)) {
			openPath = next[0]?.path ?? null;
		}
	},

	/**
	 * Read the open pull request's files.
	 *
	 * Does nothing when they are already read: this is called from an effect
	 * that re-runs whenever the selection changes, and a request per re-render
	 * would spend somebody's rate limit on nothing.
	 */
	async loadFiles(): Promise<void> {
		if (!api.inTauri()) return;

		const request = this.open;
		if (request === null) return;
		if (filesFor === request.number && filesError === null) return;

		filesLoading = true;
		filesError = null;
		const mine = ++fileSeq;
		try {
			const found = await api.pullRequestFiles(request.number);
			if (mine !== fileSeq) return;
			this.presentFiles(found, request.number);
		} catch (e) {
			if (mine === fileSeq) {
				filesError = String(e);
				files = [];
				filesFor = null;
				openPath = null;
			}
		} finally {
			if (mine === fileSeq) filesLoading = false;
		}
	},

	clearFiles(): void {
		fileSeq += 1;
		files = [];
		filesFor = null;
		filesError = null;
		filesLoading = false;
		openPath = null;
		reviewError = null;
	},

	/**
	 * Leave a review on the open pull request.
	 *
	 * Resolves to whether it landed, so the caller can say so without reading
	 * the error back out of the store. The list is re-read afterwards rather
	 * than patched locally: the review decision is the host's to compute, and a
	 * guess at it here would be a second source of truth for the one fact this
	 * screen exists to show.
	 */
	async review(verdict: ReviewVerdict, comment: string): Promise<boolean> {
		if (!api.inTauri()) return false;

		const request = this.open;
		if (request === null) return false;

		reviewing = true;
		reviewError = null;
		try {
			await api.submitReview(request.number, verdict, comment);
			await this.load();
			return true;
		} catch (e) {
			reviewError = String(e);
			return false;
		} finally {
			reviewing = false;
		}
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
		const was = openId;
		if (openId === null || !next.some((request) => request.id === openId)) {
			openId = next[0]?.id ?? null;
		}
		// A different request open than before means the files on screen belong
		// to something nobody is looking at any more.
		if (openId !== was) this.clearFiles();
	},

	/** Record a failure to reach the host, in the host's own words. */
	fail(reason: string): void {
		connected = false;
		error = reason;
		list = [];
		openId = null;
		this.clearFiles();
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
		this.clearFiles();
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

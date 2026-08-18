// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Bringing a repository in.
 *
 * The modal's whole state, including the running clone. It lives here rather
 * than in a component because a clone survives navigation: the modal is mounted
 * by the layout, and a clone in progress must not be cancelled by pressing
 * something in the nav rail.
 *
 * The plan — where the clone will land and what is wrong with that — is
 * recomputed in Rust as the user types. None of those refusals needs the
 * network, so the user is told while typing rather than after a round trip.
 */

import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import * as api from '../api';
import { repo } from '../repo.svelte';
import {
	CLONE_DONE_EVENT,
	CLONE_PROGRESS_EVENT,
	type ClonePlan,
	type CloneDoneEvent,
	type CloneProgress,
	type CloneProgressEvent
} from '../types';

const NOTHING_YET: ClonePlan = {
	name: null,
	destination: null,
	createsDestination: false,
	problem: null,
	message: null
};

let open = $state(false);
let url = $state('');
let parent = $state('');
let plan = $state<ClonePlan>(NOTHING_YET);
let step = $state<CloneProgress | null>(null);
let token = $state<number | null>(null);
let error = $state<string | null>(null);
/** The path of the clone that just finished, until it is opened or dismissed. */
let cloned = $state<string | null>(null);
let busy = $state(false);

/** Drops a plan that a newer keystroke has already superseded. */
let planSeq = 0;

async function replan(): Promise<void> {
	if (!api.inTauri()) return;
	const current = ++planSeq;
	try {
		const next = await api.clonePlan(url, parent);
		if (current === planSeq) plan = next;
	} catch (e) {
		if (current === planSeq) error = String(e);
	}
}

export const clone = {
	get open(): boolean {
		return open;
	},
	get url(): string {
		return url;
	},
	get parent(): string {
		return parent;
	},
	get plan(): ClonePlan {
		return plan;
	},
	get step(): CloneProgress | null {
		return step;
	},
	get error(): string | null {
		return error;
	},
	get cloned(): string | null {
		return cloned;
	},
	get busy(): boolean {
		return busy;
	},

	/** True while git is running. */
	get running(): boolean {
		return token !== null;
	},

	/** True when there is a destination and nothing wrong with it. */
	get runnable(): boolean {
		return plan.problem === null && plan.destination !== null;
	},

	/**
	 * Listen for the clone's progress.
	 *
	 * Attached by the layout before anything can emit, so the first line of a
	 * clone is never missed.
	 */
	async attach(): Promise<() => void> {
		const offProgress: UnlistenFn = await listen<CloneProgressEvent>(
			CLONE_PROGRESS_EVENT,
			(event) => {
				// A line from a clone that is no longer the one running is from a
				// clone the user already stopped.
				if (event.payload.token !== token) return;
				step = {
					phase: event.payload.phase,
					percent: event.payload.percent,
					line: event.payload.line
				};
			}
		);

		const offDone: UnlistenFn = await listen<CloneDoneEvent>(CLONE_DONE_EVENT, (event) => {
			if (event.payload.token !== token) return;
			token = null;
			void api.cloneRelease();

			if (event.payload.ok) {
				cloned = event.payload.path;
				error = null;
			} else {
				// A cancelled clone is not a failure to report as one: the user
				// knows, because they asked for it.
				error = event.payload.cancelled ? null : event.payload.error;
				step = null;
			}
		});

		return () => {
			offProgress();
			offDone();
		};
	},

	show(): void {
		open = true;
		error = null;
	},

	/**
	 * Close the modal. A clone in progress keeps running: the modal is a view of
	 * it, not the thing itself.
	 */
	hide(): void {
		open = false;
	},

	setUrl(next: string): void {
		url = next;
		cloned = null;
		void replan();
	},

	/** Ask the user for the folder to clone into. */
	async chooseParent(): Promise<void> {
		const picked = await openDialog({
			directory: true,
			multiple: false,
			title: 'Clone into'
		});
		if (typeof picked !== 'string') return;
		parent = picked;
		cloned = null;
		await replan();
	},

	async start(): Promise<void> {
		if (busy || this.running || !this.runnable) return;
		busy = true;
		error = null;
		step = null;
		cloned = null;
		try {
			token = await api.cloneStart(url, parent);
		} catch (e) {
			error = String(e);
			token = null;
		} finally {
			busy = false;
		}
	},

	/**
	 * Stop the clone. Rust removes the destination only if the clone created it;
	 * a folder that was already there is left as it was found.
	 */
	async cancel(): Promise<void> {
		if (!this.running) return;
		token = null;
		step = null;
		try {
			await api.cloneRelease();
		} catch (e) {
			error = String(e);
		}
		// The destination may have just been removed, so what was refused a
		// moment ago may be fine now.
		await replan();
	},

	/**
	 * Open what was just cloned. Opening is also what puts it in the repository
	 * list, so a failed clone leaves no entry behind.
	 */
	async openCloned(): Promise<boolean> {
		if (cloned === null) return false;
		busy = true;
		try {
			const opened = await repo.open(cloned);
			if (opened) {
				cloned = null;
				open = false;
				url = '';
				step = null;
				plan = NOTHING_YET;
			}
			return opened;
		} finally {
			busy = false;
		}
	},

	clear(): void {
		planSeq += 1;
		open = false;
		url = '';
		parent = '';
		plan = NOTHING_YET;
		step = null;
		token = null;
		error = null;
		cloned = null;
		busy = false;
	}
};

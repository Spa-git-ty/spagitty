// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What Spagitty ran, for the panel that shows it.
 *
 * The Settings toggle 'Show the git command behind each action' is answered
 * here. It is answered with a record rather than a label: the command text
 * comes from `crates/spagitty-core/src/record.rs`, written by the module that
 * spawns the process, so this store never composes a line of its own. A screen
 * that wrote its own would be describing what it asked for, which is not the
 * same claim as what ran.
 *
 * Two ways in, because one is not enough on its own. The event carries new
 * executions live, which is what makes the panel useful while a fetch is
 * running; the read catches up on everything that happened before the panel was
 * opened, which the event cannot do. `seq` is what stops the two from
 * duplicating an entry.
 */

import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import * as api from '../api';
import { notice } from '../ui/notice.svelte';
import { GIT_COMMAND_EVENT, type ExecutedCommand } from '../types';

/**
 * Mirrors `record::CAPACITY`. The buffer on the Rust side is already capped;
 * this keeps the webview's copy from outliving it after a long session.
 */
export const CAPACITY = 200;

let entries = $state<ExecutedCommand[]>([]);
let open = $state(false);
let unlisten: UnlistenFn | null = null;

/**
 * Insert an entry in sequence order, dropping one already held.
 *
 * The event and the catch-up read overlap by design — a command can arrive both
 * ways — and `seq` is monotonic, so identity is the sequence number rather than
 * the text. Two `git status` runs are two entries; one `git status` seen twice
 * is one.
 */
function absorb(incoming: ExecutedCommand[]): void {
	const bySeq = new Map(entries.map((entry) => [entry.seq, entry]));
	for (const entry of incoming) bySeq.set(entry.seq, entry);

	entries = [...bySeq.values()].sort((a, b) => a.seq - b.seq).slice(-CAPACITY);
}

export const commandLog = {
	get entries(): ExecutedCommand[] {
		return entries;
	},
	get open(): boolean {
		return open;
	},
	get latest(): ExecutedCommand | null {
		return entries.at(-1) ?? null;
	},

	/** The highest sequence held, which is where a catch-up read starts. */
	get since(): number {
		return entries.at(-1)?.seq ?? 0;
	},

	/**
	 * Subscribe to executions. Call once, from the shell; the returned function
	 * detaches.
	 *
	 * Subscribed regardless of the toggle. The toggle governs whether the panel
	 * can be reached, not whether the record is kept: turning it on should show
	 * what has already happened this session, and a subscription that started
	 * at the moment of the flip would show an empty panel and imply Spagitty had
	 * run nothing.
	 */
	async attach(): Promise<() => void> {
		unlisten = await listen<ExecutedCommand>(GIT_COMMAND_EVENT, (event) => {
			absorb([event.payload]);
		});

		return () => {
			unlisten?.();
			unlisten = null;
		};
	},

	/** Read what ran before the listener existed, or while the webview reloaded. */
	async refresh(): Promise<void> {
		if (!api.inTauri()) return;
		try {
			absorb(await api.gitCommands(this.since));
		} catch (error) {
			notice.failed('Could not read the command log', error);
		}
	},

	async show(): Promise<void> {
		open = true;
		await this.refresh();
	},

	hide(): void {
		open = false;
	},

	async toggle(): Promise<void> {
		if (open) this.hide();
		else await this.show();
	},

	/** Forget everything recorded, on both sides. */
	async clear(): Promise<void> {
		entries = [];
		if (!api.inTauri()) return;
		try {
			await api.clearGitCommands();
		} catch (error) {
			notice.failed('Could not clear the command log', error);
		}
	}
};

/** One entry as a line that can be pasted into a terminal. */
export function line(entry: ExecutedCommand): string {
	return entry.argv
		.map((argument) =>
			argument === '' || /\s/.test(argument)
				? `"${argument.replace(/"/g, '\\"')}"`
				: argument
		)
		.join(' ');
}

/** Every entry as text, newest last — what the copy-all button puts on the clipboard. */
export function transcript(list: ExecutedCommand[]): string {
	return list.map(line).join('\n');
}

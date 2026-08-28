// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The command palette, and the registry behind it.
 *
 * `Ctrl/Cmd+P` opens a list of everything Spagitty can do, filtered as you type.
 * The point is not a second way to click a button: it is that a command which
 * only exists behind a right-click on the right row is otherwise undiscoverable
 * and unreachable from the keyboard.
 *
 * Commands are **registered**, not listed here. A screen or a store contributes
 * its own, which keeps the palette from becoming a file that has to import
 * every feature in the application in order to name it — and keeps a feature's
 * command next to the feature.
 *
 * Matching is a subsequence over the title and the keywords, scored so that a
 * match at a word boundary beats a match in the middle of one. That is enough
 * to make `cbh` find "Create branch here" without a fuzzy-search dependency.
 */

export interface Command {
	/** Stable, unique. Used as the keyed-each key and for replacing on re-register. */
	id: string;
	/** What it is called, in the same words the menu uses. */
	title: string;
	/** The heading it sits under: "Graph", "Branch", "Appearance". */
	group: string;
	/** Extra words that should find it. Never shown. */
	keywords?: string[];
	/** The shortcut to show on the right, already formatted for display. */
	shortcut?: string;
	/**
	 * Whether it can run right now. A command that cannot is shown greyed with
	 * its reason rather than hidden — a palette whose contents change based on
	 * state is one nobody can learn.
	 */
	enabled?: () => boolean;
	/** Why it is unavailable, when it is. One short phrase. */
	unavailable?: () => string | null;
	run: () => void | Promise<void>;
}

export interface Match {
	command: Command;
	score: number;
	/** Indices into `command.title` that matched, for highlighting. */
	hits: number[];
}

const registry = new Map<string, Command>();

let open = $state(false);
let query = $state('');
let cursor = $state(0);
/** Bumped whenever the registry changes, so the list re-derives. */
let revision = $state(0);

/**
 * Score `text` against `needle` as a subsequence.
 *
 * Returns null when the needle is not a subsequence at all. A higher score is
 * better: every character that starts a word is worth more than one in the
 * middle, and a run of consecutive matches is worth more than the same
 * characters scattered.
 */
export function score(text: string, needle: string): { score: number; hits: number[] } | null {
	if (needle === '') return { score: 0, hits: [] };

	const haystack = text.toLowerCase();
	const wanted = needle.toLowerCase();

	let total = 0;
	let at = 0;
	let previous = -2;
	const hits: number[] = [];

	for (const character of wanted) {
		const found = haystack.indexOf(character, at);
		if (found === -1) return null;

		let points = 1;
		// A word boundary: the start of the string, or after a space or a
		// separator. This is what makes initials work as a query.
		if (found === 0 || /[\s\-_/.]/.test(haystack[found - 1])) points += 8;
		// Consecutive characters, which is what typing a whole word looks like.
		if (found === previous + 1) points += 4;

		total += points;
		hits.push(found);
		previous = found;
		at = found + 1;
	}

	// Shorter titles win ties: "Push" should beat "Push all tags" for `push`.
	return { score: total * 100 - text.length, hits };
}

/** The best score over a command's title and its keywords. */
function rank(command: Command, needle: string): Match | null {
	const title = score(command.title, needle);
	let best = title;
	let hits = title?.hits ?? [];

	for (const keyword of command.keywords ?? []) {
		const keywordScore = score(keyword, needle);
		// A keyword match is real but weaker than a title match — the user is
		// searching for what they can see.
		if (keywordScore && (!best || keywordScore.score - 400 > best.score)) {
			best = { score: keywordScore.score - 400, hits: [] };
			hits = [];
		}
	}

	if (!best) return null;
	return { command, score: best.score, hits };
}

export const palette = {
	get open(): boolean {
		return open;
	},
	get query(): string {
		return query;
	},
	get cursor(): number {
		return cursor;
	},

	/** Everything registered, ranked against the current query. */
	get matches(): Match[] {
		void revision;
		const needle = query.trim();

		const ranked: Match[] = [];
		for (const command of registry.values()) {
			const match = rank(command, needle);
			if (match) ranked.push(match);
		}

		ranked.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			// A stable order for equal scores, so the list does not shuffle
			// between keystrokes that changed nothing.
			if (a.command.group !== b.command.group) {
				return a.command.group.localeCompare(b.command.group);
			}
			return a.command.title.localeCompare(b.command.title);
		});

		return ranked;
	},

	/** The one Enter would run, or null when nothing matches. */
	get active(): Command | null {
		const list = this.matches;
		return list[Math.min(cursor, list.length - 1)]?.command ?? null;
	},

	/**
	 * Add commands. Re-registering an id replaces it, so a store that
	 * re-registers on change does not accumulate duplicates.
	 */
	register(...commands: Command[]): void {
		for (const command of commands) registry.set(command.id, command);
		revision += 1;
	},

	/** Drop commands by id. For a screen that unmounts. */
	unregister(...ids: string[]): void {
		let changed = false;
		for (const id of ids) changed = registry.delete(id) || changed;
		if (changed) revision += 1;
	},

	show(): void {
		open = true;
		query = '';
		cursor = 0;
	},
	hide(): void {
		open = false;
	},
	toggle(): void {
		if (open) this.hide();
		else this.show();
	},

	setQuery(next: string): void {
		query = next;
		cursor = 0;
	},

	/** Point the cursor at a row. What hovering does. */
	setCursor(index: number): void {
		cursor = Math.max(0, index);
	},

	move(delta: number): void {
		const length = this.matches.length;
		if (length === 0) return;
		// Wraps, because a list you can walk off the end of makes you look.
		cursor = (cursor + delta + length) % length;
	},

	/** Run the highlighted command and close. A disabled one does neither. */
	async accept(): Promise<void> {
		const command = this.active;
		if (!command) return;
		if (command.enabled && !command.enabled()) return;

		this.hide();
		await command.run();
	},

	/** Test seam: forget everything registered. */
	clear(): void {
		registry.clear();
		revision += 1;
	}
};

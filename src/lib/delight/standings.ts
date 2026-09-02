// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What the badge screen shows, worked out away from the markup (FEAT-072).
 *
 * Grouping, counting and ranking are here rather than in the route because a
 * route is not a component this suite mounts, and the interesting decisions —
 * which badges are hidden, who is ranked above whom, what a rate is when the
 * denominator is zero — are exactly the ones worth a test.
 */

import { BADGES, badge, weight, type Badge, type Category } from './badges';
import type { ActorRecord } from './engine';

export interface Slot {
	/** Null for a secret badge that has not been found. */
	found: Badge | null;
	locked: boolean;
	/** The badge id, so a locked secret still has a stable key. */
	id: string;
}

export interface Section {
	category: Category;
	label: string;
	slots: Slot[];
	earned: number;
}

/**
 * The badges of one category, earned first and locked after.
 *
 * A secret badge that has not been earned is a slot with no badge in it. It is
 * *shown* rather than omitted, because "there are three more of these" is the
 * whole point — a list that simply ended would say the collection was complete.
 */
export function section(record: ActorRecord, category: Category, label: string): Section {
	const held = new Set(record.earned.map((entry) => entry.id));
	const all = BADGES.filter((found) => found.category === category);

	const slots: Slot[] = all
		.map((found) => ({
			id: found.id,
			locked: !held.has(found.id),
			// A secret badge gives nothing away until it is earned.
			found: held.has(found.id) || !found.secret ? found : null
		}))
		.sort((a, b) => {
			if (a.locked !== b.locked) return a.locked ? 1 : -1;
			const left = a.found ? weight(a.found.rarity) : -1;
			const right = b.found ? weight(b.found.rarity) : -1;
			return right - left;
		});

	return { category, label, slots, earned: all.filter((found) => held.has(found.id)).length };
}

/** Badges this record holds that this build does not know. Kept, never dropped. */
export function unknown(record: ActorRecord): string[] {
	return record.earned.map((entry) => entry.id).filter((id) => badge(id) === null);
}

/** How many badges are earned, and out of how many are not secret. */
export function tally(record: ActorRecord): { earned: number; known: number } {
	const held = new Set(record.earned.map((entry) => entry.id));
	return {
		earned: BADGES.filter((found) => held.has(found.id)).length,
		known: BADGES.filter((found) => !found.secret).length
	};
}

export interface Standing {
	id: string;
	name: string;
	tasks: number;
	/** Percent, rounded. Null when nothing has been reviewed yet. */
	approval: number | null;
	/** Percent, rounded. Null when nothing has been tested yet. */
	tests: number | null;
	badges: number;
	/** The best badge they hold, for the row's glyph. */
	best: Badge | null;
}

/** A rate as a whole percent, or null when there is nothing to divide by. */
function rate(part: number, whole: number): number | null {
	if (whole <= 0) return null;
	return Math.round((part / whole) * 100);
}

/**
 * The agents that have done work here, best first.
 *
 * Deliberately only the agents. Ranking the person at the keyboard against the
 * models they are supervising turns a useful comparison — which of these does
 * well in *this* repository — into a productivity leaderboard with a human on
 * it, which is the thing the design document says not to build.
 *
 * Ordered by first-pass rate rather than by volume, because volume rewards
 * whichever agent was given the most work rather than the one that did it best.
 */
export function standings(records: ActorRecord[]): Standing[] {
	return records
		.filter((record) => record.kind !== 'human' && record.stats.tasks > 0)
		.map((record) => {
			const held = record.earned
				.map((entry) => badge(entry.id))
				.filter((found): found is Badge => found !== null && !found.shame)
				.sort((a, b) => weight(b.rarity) - weight(a.rarity));

			return {
				id: record.id,
				name: record.name,
				tasks: record.stats.tasks,
				approval: rate(record.stats.firstTries, record.stats.tasks),
				tests: rate(record.stats.testsGreen, record.stats.tasks),
				badges: held.length,
				best: held[0] ?? null
			};
		})
		.sort((a, b) => (b.approval ?? -1) - (a.approval ?? -1) || b.tasks - a.tasks);
}

/**
 * The headline numbers for one actor, in the order they are shown.
 *
 * Everything here is an outcome — work done, work that held up, disasters
 * survived. There is no time-in-app, no session count and no streak of days,
 * because none of those is a fact about engineering.
 */
export function summary(record: ActorRecord): { label: string; value: string }[] {
	const stats = record.stats;
	const rows: { label: string; value: string }[] = [];

	if (stats.tasks > 0) {
		rows.push({ label: 'Tasks completed', value: String(stats.tasks) });
		rows.push({
			label: 'First-pass approvals',
			value: `${rate(stats.firstTries, stats.tasks) ?? 0}%`
		});
		rows.push({ label: 'Tests passed', value: `${rate(stats.testsGreen, stats.tasks) ?? 0}%` });
	}

	rows.push({ label: 'Commits', value: String(stats.commits) });
	rows.push({ label: 'Clean commits', value: String(stats.cleanCommits) });
	rows.push({ label: 'Best clean streak', value: String(stats.bestCleanStreak) });
	rows.push({ label: 'Conflicts resolved', value: String(stats.conflictsResolved) });
	rows.push({ label: 'Rebases finished', value: String(stats.rebases) });
	rows.push({ label: 'Work recovered', value: String(stats.recoveries) });

	return rows;
}

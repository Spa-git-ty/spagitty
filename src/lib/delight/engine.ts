// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The achievement engine (FEAT-072).
 *
 * Pure. No storage, no clock of its own, no Svelte, no `api`. An event and a
 * record go in, a new record and whatever was just unlocked come out — which is
 * what lets the whole rule set be tested as a table rather than by driving the
 * application.
 *
 * ```
 *   event ─► apply()  ─► counters ─► evaluate() ─► unlocked ids
 *                          ▲                           │
 *                          └───────────────────────────┘
 *                        (rules read badges as well as counters)
 * ```
 *
 * # Why the rules run to a fixed point
 *
 * Some badges are earned by holding other badges — Certified Chef wants four
 * engineering badges, Git Sensei wants the conflict chain finished, Git Lord
 * wants Git Sensei. One pass would award the prerequisite this time and the
 * badge that depends on it only on the *next* unrelated event, which reads as a
 * bug even though the state is right. So `evaluate` loops until a pass unlocks
 * nothing, and the whole chain lands in the same reward moment.
 *
 * # Why nothing is ever taken away
 *
 * A badge is a record of something that happened. Recomputing the catalogue
 * from scratch after a rule is retuned would let a badge somebody earned
 * disappear because a threshold moved, and a reputation that can be silently
 * revised is not a reputation. Earned ids are kept as-is; an id this build does
 * not know is kept too, and drawn as unknown rather than dropped.
 */

import { BADGES, badge, weight, type Badge } from './badges';
import type { ActorKind, ActorRef, DelightEvent } from './events';

/**
 * Everything a rule can count.
 *
 * Every field is here because a rule reads it. A counter nobody reads is a
 * counter that will be wrong for years without anybody noticing, so this grows
 * with the rules rather than ahead of them.
 */
export interface Stats {
	commits: number;
	/** Commits confined to one directory, of a size a person can review. */
	cleanCommits: number;
	/** Two files or fewer and a dozen lines or fewer. Not a first commit. */
	surgicalFixes: number;
	messyCommits: number;
	commitsToDefault: number;
	testCommits: number;
	refactors: number;
	merges: number;
	rebases: number;
	interactiveRebases: number;
	rebaseCommitsReplayed: number;
	/** Rebases that hit conflicts and still finished. */
	rebasesRecovered: number;
	conflictSessions: number;
	conflictsResolved: number;
	/** The most files conflicted in any single operation. */
	worstConflict: number;
	cherryPicks: number;
	recoveries: number;
	detachedEscapes: number;
	pushes: number;
	forcePushes: number;
	branchesDeleted: number;
	/** Runs of six checkouts inside three minutes. */
	switchBursts: number;
	tasks: number;
	firstTries: number;
	hardFirstTries: number;
	testsGreen: number;
	failedElsewhere: number;
	handoffs: number;
	reviews: number;
	regressionsCaught: number;
	uniqueFindings: number;
	/** Consecutive clean commits, now. */
	cleanStreak: number;
	bestCleanStreak: number;
	/** Consecutive first-pass tasks, now. */
	firstTryStreak: number;
	bestFirstTryStreak: number;
}

/** One badge, with when it was earned. */
export interface Earned {
	id: string;
	/** Milliseconds since the epoch. */
	at: number;
}

export interface ActorRecord {
	id: string;
	kind: ActorKind;
	name: string;
	stats: Stats;
	earned: Earned[];
	/** The equipped badge id, or null. Shame badges cannot be equipped. */
	title: string | null;
	/** The last few checkout times, for the burst detector. Not persisted deep. */
	recentCheckouts: number[];
}

export function emptyStats(): Stats {
	return {
		commits: 0,
		cleanCommits: 0,
		surgicalFixes: 0,
		messyCommits: 0,
		commitsToDefault: 0,
		testCommits: 0,
		refactors: 0,
		merges: 0,
		rebases: 0,
		interactiveRebases: 0,
		rebaseCommitsReplayed: 0,
		rebasesRecovered: 0,
		conflictSessions: 0,
		conflictsResolved: 0,
		worstConflict: 0,
		cherryPicks: 0,
		recoveries: 0,
		detachedEscapes: 0,
		pushes: 0,
		forcePushes: 0,
		branchesDeleted: 0,
		switchBursts: 0,
		tasks: 0,
		firstTries: 0,
		hardFirstTries: 0,
		testsGreen: 0,
		failedElsewhere: 0,
		handoffs: 0,
		reviews: 0,
		regressionsCaught: 0,
		uniqueFindings: 0,
		cleanStreak: 0,
		bestCleanStreak: 0,
		firstTryStreak: 0,
		bestFirstTryStreak: 0
	};
}

export function emptyRecord(actor: ActorRef): ActorRecord {
	return {
		id: actor.id,
		kind: actor.kind,
		name: actor.name,
		stats: emptyStats(),
		earned: [],
		title: null,
		recentCheckouts: []
	};
}

// --- What counts as what ----------------------------------------------------

/**
 * The thresholds, in one place and exported.
 *
 * They are named rather than inlined because the tests assert against these
 * values, not against copies of them — a threshold that is retuned should make
 * the suite say so once, in the rule, rather than fail in six assertions that
 * each hard-code the old number.
 */
export const LIMITS = {
	/** A commit small enough that somebody will actually read the diff. */
	cleanFiles: 8,
	cleanLines: 240,
	/** A fix so small it is worth pointing at. */
	surgicalFiles: 2,
	surgicalLines: 12,
	/** A diff that has stopped being one change. */
	messyFiles: 25,
	messyDirectories: 6,
	/** Checkouts, and the window they have to fall inside, for a burst. */
	burstSwitches: 6,
	burstWindowMs: 3 * 60 * 1000
} as const;

function isClean(event: Extract<DelightEvent, { kind: 'commit' }>): boolean {
	return (
		event.directories <= 1 &&
		event.files <= LIMITS.cleanFiles &&
		event.added + event.removed <= LIMITS.cleanLines
	);
}

function isSurgical(event: Extract<DelightEvent, { kind: 'commit' }>): boolean {
	return (
		event.files <= LIMITS.surgicalFiles &&
		event.files > 0 &&
		event.added + event.removed <= LIMITS.surgicalLines
	);
}

function isMessy(event: Extract<DelightEvent, { kind: 'commit' }>): boolean {
	return event.files >= LIMITS.messyFiles && event.directories >= LIMITS.messyDirectories;
}

// --- Counting ---------------------------------------------------------------

/**
 * Fold one event into the counters.
 *
 * Returns a new `Stats` rather than mutating, so a caller holding the previous
 * record — the store, which needs to know whether anything actually changed —
 * can compare the two.
 */
export function apply(record: ActorRecord, event: DelightEvent): ActorRecord {
	const stats = { ...record.stats };
	let checkouts = record.recentCheckouts;

	switch (event.kind) {
		case 'commit': {
			stats.commits += 1;
			if (event.onDefaultBranch) stats.commitsToDefault += 1;
			if (event.tests) stats.testCommits += 1;
			if (event.refactor && event.files >= LIMITS.cleanFiles && event.tests) {
				stats.refactors += 1;
			}
			if (isMessy(event)) {
				stats.messyCommits += 1;
				// One messy commit ends the run. That is the point of a streak:
				// it says the last stretch was disciplined, not that most of it
				// was.
				stats.cleanStreak = 0;
			} else if (isClean(event)) {
				stats.cleanCommits += 1;
				stats.cleanStreak += 1;
				stats.bestCleanStreak = Math.max(stats.bestCleanStreak, stats.cleanStreak);
			}
			// A surgical fix is judged on its own, not against the clean rule:
			// a one-line fix in a directory you also touched elsewhere is still
			// a one-line fix.
			if (isSurgical(event) && record.stats.commits > 0) stats.surgicalFixes += 1;
			break;
		}

		case 'rebase': {
			stats.rebases += 1;
			if (event.interactive) stats.interactiveRebases += 1;
			stats.rebaseCommitsReplayed += Math.max(0, event.commits);
			// The badge is for coming out the other side of one that fought
			// back, so a clean rebase is not a recovery.
			if (event.conflicts > 0) stats.rebasesRecovered += 1;
			break;
		}

		case 'conflict': {
			stats.conflictSessions += 1;
			stats.conflictsResolved += Math.max(0, event.files);
			stats.worstConflict = Math.max(stats.worstConflict, event.files);
			break;
		}

		case 'cherryPick':
			stats.cherryPicks += Math.max(1, event.commits);
			break;

		case 'merge':
			// A fast-forward moves a pointer. Nothing was folded together, so
			// nothing was merged in the sense Octopus is counting.
			if (!event.fastForward) stats.merges += 1;
			break;

		case 'recovery':
			stats.recoveries += 1;
			if (event.how === 'detached') stats.detachedEscapes += 1;
			break;

		case 'checkout': {
			const window = [...checkouts, event.at].filter(
				(at) => event.at - at < LIMITS.burstWindowMs
			);
			if (window.length >= LIMITS.burstSwitches) {
				stats.switchBursts += 1;
				// Start again, so one long debugging session is one burst
				// rather than one per checkout after the sixth.
				checkouts = [];
			} else {
				checkouts = window;
			}
			break;
		}

		case 'push':
			stats.pushes += 1;
			if (event.force) stats.forcePushes += 1;
			break;

		case 'branchDeleted':
			stats.branchesDeleted += 1;
			break;

		case 'agentTask': {
			stats.tasks += 1;
			if (event.testsPassed) stats.testsGreen += 1;
			if (event.failedElsewhere) stats.failedElsewhere += 1;
			if (event.handoff) stats.handoffs += 1;

			const firstTry = event.testsPassed && event.approved && event.corrections === 0;
			if (firstTry) {
				stats.firstTries += 1;
				stats.firstTryStreak += 1;
				stats.bestFirstTryStreak = Math.max(
					stats.bestFirstTryStreak,
					stats.firstTryStreak
				);
				if (event.difficulty === 'hard') stats.hardFirstTries += 1;
			} else {
				stats.firstTryStreak = 0;
			}
			break;
		}

		case 'review': {
			stats.reviews += 1;
			if (event.caughtRegression) stats.regressionsCaught += 1;
			if (event.missedByOthers) stats.uniqueFindings += 1;
			break;
		}
	}

	return { ...record, stats, recentCheckouts: checkouts };
}

// --- The rules --------------------------------------------------------------

interface Rule {
	id: string;
	when(record: ActorRecord, has: (id: string) => boolean): boolean;
}

/** How many engineering badges an actor holds. Certified Chef's criterion. */
function engineeringHeld(has: (id: string) => boolean): number {
	return BADGES.filter((found) => found.category === 'engineering' && has(found.id)).length;
}

/**
 * Every rule, in no particular order — `evaluate` runs all of them.
 *
 * Each one reads counters and other badges only. None of them reads a clock, a
 * repository or a setting, which is what keeps the whole set testable by
 * building a record and asking what it earns.
 */
export const RULES: Rule[] = [
	// Git skill
	{ id: 'cherry-picker', when: (r) => r.stats.cherryPicks >= 5 },
	{ id: 'conflict-rookie', when: (r) => r.stats.conflictSessions >= 1 },
	{
		id: 'conflict-tamer',
		when: (r) => r.stats.worstConflict >= 3 || r.stats.conflictsResolved >= 10
	},
	{
		id: 'conflict-samurai',
		when: (r) => r.stats.conflictSessions >= 10 && r.stats.worstConflict >= 6
	},
	{ id: 'rebase-ronin', when: (r) => r.stats.interactiveRebases >= 8 },
	{ id: 'octopus', when: (r) => r.stats.merges >= 15 },
	{
		id: 'git-sensei',
		when: (_r, has) =>
			has('conflict-samurai') && has('rebase-ronin') && has('cherry-picker') && has('reflog-wizard')
	},

	// Engineering quality
	{ id: 'cook', when: (r) => r.stats.cleanCommits >= 1 },
	{ id: 'zero-noise', when: (r) => r.stats.cleanCommits >= 3 },
	{ id: 'test-goblin', when: (r) => r.stats.testCommits >= 10 },
	{ id: 'clean-freak', when: (r) => r.stats.bestCleanStreak >= 8 },
	{ id: 'spagitty-chef', when: (r) => r.stats.cleanCommits >= 12 },
	{ id: 'surgical-strike', when: (r) => r.stats.surgicalFixes >= 1 },
	{ id: 'architect', when: (r) => r.stats.refactors >= 1 },
	{ id: 'regression-slayer', when: (r) => r.stats.regressionsCaught >= 1 },

	// Agent performance
	{ id: 'first-try', when: (r) => r.stats.firstTries >= 1 },
	{ id: 'eagle-eye', when: (r) => r.stats.uniqueFindings >= 1 },
	{ id: 'gatekeeper', when: (r) => r.stats.regressionsCaught >= 5 },
	{ id: 'big-brain', when: (r) => r.stats.hardFirstTries >= 1 },
	{ id: 'perfect-handoff', when: (r) => r.stats.handoffs >= 1 },
	{ id: 'certified-chef', when: (_r, has) => has('spagitty-chef') && engineeringHeld(has) >= 4 },

	// Recovery
	{ id: 'rebase-survivor', when: (r) => r.stats.rebasesRecovered >= 1 },
	{ id: 'detached-head-survivor', when: (r) => r.stats.detachedEscapes >= 1 },
	{ id: 'reflog-wizard', when: (r) => r.stats.recoveries >= 1 },

	// Hall of shame
	{ id: 'main-character', when: (r) => r.stats.commitsToDefault >= 1 },
	{ id: 'rip-branch', when: (r) => r.stats.branchesDeleted >= 3 },
	{ id: 'force-push-and-pray', when: (r) => r.stats.forcePushes >= 1 },
	{ id: 'works-on-my-machine', when: (r) => r.stats.failedElsewhere >= 1 },
	{ id: 'actual-spaghetti', when: (r) => r.stats.messyCommits >= 1 },
	{ id: 'this-is-fine', when: (r) => r.stats.worstConflict >= 10 },
	{ id: 'what-branch-am-i-on', when: (r) => r.stats.switchBursts >= 1 },

	// Legendary
	{
		id: 'git-lord',
		when: (r, has) =>
			has('git-sensei') &&
			r.stats.recoveries >= 3 &&
			r.stats.rebases >= 50 &&
			r.stats.bestCleanStreak >= 20
	},
	{
		id: 'history-bender',
		when: (r) => r.stats.rebaseCommitsReplayed >= 200 && r.stats.rebasesRecovered >= 3
	},
	{
		id: 'michelin-commit',
		when: (r, has) => has('certified-chef') && r.stats.bestFirstTryStreak >= 10
	},
	{
		id: 'pasta-master',
		// Everything worth having: no shame badges, and not itself.
		when: (_r, has) =>
			BADGES.filter((found) => !found.shame && found.id !== 'pasta-master').every((found) =>
				has(found.id)
			)
	}
];

/**
 * Which badges this record has just earned.
 *
 * Runs to a fixed point so a chain lands in one moment — see the file header.
 * The cap is a guard against a rule that unlocks something which un-unlocks
 * something else; there is no such rule, and if one is ever written this stops
 * it hanging the commit that triggered it rather than letting it.
 */
export function evaluate(record: ActorRecord, now: number): { record: ActorRecord; unlocked: Badge[] } {
	const held = new Set(record.earned.map((entry) => entry.id));
	const has = (id: string) => held.has(id);
	const unlocked: Badge[] = [];

	for (let pass = 0; pass < BADGES.length; pass += 1) {
		const fresh = RULES.filter((rule) => !held.has(rule.id) && rule.when(record, has));
		if (fresh.length === 0) break;
		for (const rule of fresh) {
			held.add(rule.id);
			const found = badge(rule.id);
			if (found) unlocked.push(found);
		}
	}

	if (unlocked.length === 0) return { record, unlocked };

	// Sorted so the biggest one is shown last: a reward moment that opens with
	// Git Lord and trails off into Cook has the shape backwards.
	unlocked.sort((a, b) => weight(a.rarity) - weight(b.rarity));

	return {
		record: {
			...record,
			earned: [...record.earned, ...unlocked.map((found) => ({ id: found.id, at: now }))]
		},
		unlocked
	};
}

/** Count an event and award whatever it earns, in one step. */
export function record(
	current: ActorRecord,
	event: DelightEvent,
	now: number
): { record: ActorRecord; unlocked: Badge[] } {
	return evaluate(apply(current, event), now);
}

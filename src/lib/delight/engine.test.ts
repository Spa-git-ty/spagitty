// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The rules, as a table (FEAT-072).
 *
 * The engine is pure, so every badge below is earned by building a record and
 * feeding it events — no application, no repository, no clock but the one
 * passed in. That is the whole reason the engine is pure.
 *
 * What is worth asserting here is not "the rule fires", which is a restatement
 * of the rule. It is the three things that are easy to get wrong and impossible
 * to notice: that a badge is awarded **once**, that a chain lands in **one**
 * moment, and that a threshold is not accidentally *off* by one in the
 * direction that makes a badge unearnable.
 */

import { describe, expect, it } from 'vitest';
import { BADGES, badge } from './badges';
import { apply, emptyRecord, evaluate, LIMITS, record, RULES, type ActorRecord } from './engine';
import type { ActorRef, DelightEvent } from './events';

const ME: ActorRef = { id: 'ada@example.com', kind: 'human', name: 'Ada' };
const NOW = 1_700_000_000_000;

function fresh(): ActorRecord {
	return emptyRecord(ME);
}

/** Feed a run of events and hand back the record they leave behind. */
function feed(events: DelightEvent[], from: ActorRecord = fresh()): ActorRecord {
	return events.reduce((current, event) => record(current, event, NOW).record, from);
}

/** A commit of a given shape, with the boring fields filled in. */
function commit(over: Partial<Extract<DelightEvent, { kind: 'commit' }>> = {}): DelightEvent {
	return {
		kind: 'commit',
		files: 3,
		directories: 1,
		added: 40,
		removed: 10,
		onDefaultBranch: false,
		amend: false,
		tests: false,
		refactor: false,
		...over
	};
}

function ids(current: ActorRecord): string[] {
	return current.earned.map((entry) => entry.id);
}

describe('the catalogue and the rules agree', () => {
	it('gives every rule a badge that exists', () => {
		const known = new Set(BADGES.map((found) => found.id));
		expect(RULES.filter((rule) => !known.has(rule.id)).map((rule) => rule.id)).toEqual([]);
	});

	it('gives every badge a rule, so none of them is unearnable', () => {
		// A badge in the catalogue with nothing that awards it is a slot that
		// stays grey forever, which is worse than not having drawn it.
		const ruled = new Set(RULES.map((rule) => rule.id));
		expect(BADGES.filter((found) => !ruled.has(found.id)).map((found) => found.id)).toEqual([]);
	});

	it('uses each id once', () => {
		const all = BADGES.map((found) => found.id);
		expect(all.length).toBe(new Set(all).size);
	});

	it('points every evolution at a badge that exists', () => {
		for (const found of BADGES) {
			if (!found.after) continue;
			expect(badge(found.after), `${found.id} evolves from ${found.after}`).not.toBeNull();
		}
	});
});

describe('awarding', () => {
	it('gives a badge once, however many times it is earned again', () => {
		const after = feed([commit(), commit(), commit(), commit()]);

		expect(ids(after).filter((id) => id === 'cook')).toHaveLength(1);
	});

	it('lands a whole chain in one moment', () => {
		// Certified Chef needs Spagitty Chef and four engineering badges; the
		// commit that earns the fourth must award both, not one now and one on
		// the next unrelated event.
		let current = fresh();
		for (let i = 0; i < 11; i += 1) current = record(current, commit(), NOW).record;
		current = record(current, commit({ files: 1, added: 3, removed: 1 }), NOW).record;

		// Twelve clean commits: Cook, Zero Noise, Clean Freak, Spagitty Chef,
		// Surgical Strike — and Certified Chef on top of them.
		const { unlocked } = record(current, commit(), NOW);
		const earned = new Set(ids(feed([commit()], current)));

		expect(earned.has('spagitty-chef')).toBe(true);
		expect(earned.has('certified-chef')).toBe(true);
		// Whatever landed in that final moment came out biggest-last.
		const rarities = unlocked.map((found) => found.rarity);
		expect(rarities).toEqual([...rarities].sort());
	});

	it('never takes a badge away when a streak is broken', () => {
		let current = fresh();
		for (let i = 0; i < 8; i += 1) current = record(current, commit(), NOW).record;
		expect(ids(current)).toContain('clean-freak');

		current = record(current, commit({ files: 40, directories: 9 }), NOW).record;

		expect(current.stats.cleanStreak).toBe(0);
		expect(ids(current), 'earned is earned').toContain('clean-freak');
	});

	it('keeps a badge this build does not know rather than dropping it', () => {
		const current: ActorRecord = { ...fresh(), earned: [{ id: 'from-the-future', at: NOW }] };

		expect(ids(evaluate(current, NOW).record)).toContain('from-the-future');
	});
});

describe('what a commit is worth', () => {
	it('counts one directory and a readable size as clean', () => {
		const after = feed([commit({ files: LIMITS.cleanFiles, added: 200, removed: 40 })]);

		expect(after.stats.cleanCommits).toBe(1);
		expect(ids(after)).toContain('cook');
	});

	it('does not count a commit that reaches into a second directory', () => {
		expect(feed([commit({ directories: 2 })]).stats.cleanCommits).toBe(0);
	});

	it('calls a commit spaghetti only when it is both wide and scattered', () => {
		// Thirty files inside one directory is a generated file or a rename, not
		// a mess — the badge is about a change that stopped being one change.
		expect(feed([commit({ files: 30, directories: 1 })]).stats.messyCommits).toBe(0);
		expect(
			feed([commit({ files: LIMITS.messyFiles, directories: LIMITS.messyDirectories })]).stats
				.messyCommits
		).toBe(1);
	});

	it('will not call the first commit in a repository a surgical fix', () => {
		// Every repository starts with a tiny commit. Awarding a rare badge for
		// `git init` would be the first thing anybody saw, and the last one they
		// believed.
		const first = feed([commit({ files: 1, added: 3, removed: 1 })]);
		expect(first.stats.surgicalFixes).toBe(0);
		expect(ids(first)).not.toContain('surgical-strike');

		const second = feed([commit(), commit({ files: 1, added: 3, removed: 1 })]);
		expect(second.stats.surgicalFixes).toBe(1);
		expect(ids(second)).toContain('surgical-strike');
	});

	it('wants tests beside an implementation, not tests on their own', () => {
		expect(feed([commit({ tests: false })]).stats.testCommits).toBe(0);
		expect(feed([commit({ tests: true })]).stats.testCommits).toBe(1);
	});

	it('notices a commit straight to the default branch, without approving', () => {
		const after = feed([commit({ onDefaultBranch: true })]);

		expect(ids(after)).toContain('main-character');
		expect(badge('main-character')?.shame).toBe(true);
	});
});

describe('conflicts, rebases and getting things back', () => {
	it('earns the conflict chain in order', () => {
		let current = feed([{ kind: 'conflict', files: 1, operation: 'merge' }]);
		expect(ids(current)).toContain('conflict-rookie');
		expect(ids(current)).not.toContain('conflict-tamer');

		current = feed([{ kind: 'conflict', files: 4, operation: 'merge' }], current);
		expect(ids(current)).toContain('conflict-tamer');

		for (let i = 0; i < 8; i += 1) {
			current = feed([{ kind: 'conflict', files: 7, operation: 'rebase' }], current);
		}
		expect(ids(current)).toContain('conflict-samurai');
	});

	it('treats a rebase that fought back as a recovery, and a clean one as not', () => {
		expect(
			feed([{ kind: 'rebase', commits: 5, conflicts: 0, interactive: true }]).stats
				.rebasesRecovered
		).toBe(0);
		const fought = feed([{ kind: 'rebase', commits: 5, conflicts: 2, interactive: true }]);
		expect(fought.stats.rebasesRecovered).toBe(1);
		expect(ids(fought)).toContain('rebase-survivor');
	});

	it('does not count a fast-forward as a merge', () => {
		expect(feed([{ kind: 'merge', fastForward: true }]).stats.merges).toBe(0);
		expect(feed([{ kind: 'merge', fastForward: false }]).stats.merges).toBe(1);
	});

	it('makes reflog recovery a secret badge, because finding it is the point', () => {
		const after = feed([{ kind: 'recovery', how: 'reflog' }]);

		expect(ids(after)).toContain('reflog-wizard');
		expect(badge('reflog-wizard')?.secret).toBe(true);
	});

	it('needs six checkouts inside the window to call it a burst', () => {
		const at = NOW;
		const inside: DelightEvent[] = Array.from({ length: LIMITS.burstSwitches }, (_, i) => ({
			kind: 'checkout',
			at: at + i * 1000
		}));
		expect(feed(inside).stats.switchBursts).toBe(1);

		const spread: DelightEvent[] = Array.from({ length: LIMITS.burstSwitches }, (_, i) => ({
			kind: 'checkout',
			at: at + i * LIMITS.burstWindowMs
		}));
		expect(feed(spread).stats.switchBursts).toBe(0);
	});

	it('counts one long debugging session as one burst', () => {
		const many: DelightEvent[] = Array.from({ length: 18 }, (_, i) => ({
			kind: 'checkout',
			at: NOW + i * 1000
		}));

		expect(feed(many).stats.switchBursts).toBe(3);
	});
});

describe('agents', () => {
	function task(over: Partial<Extract<DelightEvent, { kind: 'agentTask' }>> = {}): DelightEvent {
		return {
			kind: 'agentTask',
			testsPassed: true,
			approved: true,
			corrections: 0,
			difficulty: 'routine',
			handoff: false,
			failedElsewhere: false,
			...over
		};
	}

	it('needs green tests, an approval and no corrections for a first try', () => {
		expect(feed([task({ corrections: 1 })]).stats.firstTries).toBe(0);
		expect(feed([task({ approved: false })]).stats.firstTries).toBe(0);
		expect(feed([task({ testsPassed: false })]).stats.firstTries).toBe(0);
		expect(ids(feed([task()]))).toContain('first-try');
	});

	it('breaks the first-pass streak on a task that needed work', () => {
		const after = feed([task(), task(), task({ corrections: 2 }), task()]);

		expect(after.stats.firstTryStreak).toBe(1);
		expect(after.stats.bestFirstTryStreak).toBe(2);
	});

	it('acknowledges tests that only passed here', () => {
		const after = feed([task({ failedElsewhere: true })]);

		expect(ids(after)).toContain('works-on-my-machine');
		expect(badge('works-on-my-machine')?.shame).toBe(true);
	});

	it('gives Big Brain only for a hard one done first time', () => {
		expect(ids(feed([task({ difficulty: 'hard', corrections: 3 })]))).not.toContain('big-brain');
		expect(ids(feed([task({ difficulty: 'hard' })]))).toContain('big-brain');
	});
});

describe('apply', () => {
	it('leaves the record it was given alone', () => {
		const before = fresh();
		apply(before, commit());

		expect(before.stats.commits, 'the input was mutated').toBe(0);
	});
});

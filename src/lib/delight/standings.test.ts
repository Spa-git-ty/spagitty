// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What the badge screen is allowed to show (FEAT-072).
 *
 * The decisions worth a test are the ones about restraint: a secret badge that
 * has not been found gives nothing away, the total does not let somebody work
 * out how many secrets are left by arithmetic, and the agent table has no human
 * on it.
 */

import { describe, expect, it } from 'vitest';
import { BADGES } from './badges';
import { emptyRecord, emptyStats, type ActorRecord } from './engine';
import { section, standings, summary, tally, unknown } from './standings';
import type { ActorKind } from './events';

function actor(id: string, kind: ActorKind, badges: string[] = []): ActorRecord {
	return {
		...emptyRecord({ id, kind, name: id }),
		earned: badges.map((badgeId) => ({ id: badgeId, at: 0 }))
	};
}

describe('a section', () => {
	it('puts what has been earned before what has not', () => {
		const record = actor('ada', 'human', ['git-sensei']);
		const { slots } = section(record, 'git', 'Git skill');

		expect(slots[0].id).toBe('git-sensei');
		expect(slots[0].locked).toBe(false);
		expect(slots.slice(1).every((slot) => slot.locked)).toBe(true);
	});

	it('shows a locked secret as a slot with nothing in it', () => {
		const { slots } = section(actor('ada', 'human'), 'recovery', 'Recovery');
		const wizard = slots.find((slot) => slot.id === 'reflog-wizard');

		expect(wizard?.locked).toBe(true);
		expect(wizard?.found, 'a secret gives nothing away until it is found').toBeNull();
	});

	it('shows a secret in full once it has been earned', () => {
		const { slots } = section(actor('ada', 'human', ['reflog-wizard']), 'recovery', 'Recovery');
		const wizard = slots.find((slot) => slot.id === 'reflog-wizard');

		expect(wizard?.found?.name).toBe('Reflog Wizard');
	});

	it('counts what is earned in that category only', () => {
		const record = actor('ada', 'human', ['git-sensei', 'cook']);

		expect(section(record, 'git', 'Git skill').earned).toBe(1);
		expect(section(record, 'engineering', 'Engineering').earned).toBe(1);
	});
});

describe('the tally', () => {
	it('leaves the secrets out of the denominator', () => {
		const { known } = tally(actor('ada', 'human'));
		const secrets = BADGES.filter((found) => found.secret).length;

		expect(secrets).toBeGreaterThan(0);
		expect(known).toBe(BADGES.length - secrets);
	});

	it('counts a found secret in the numerator all the same', () => {
		expect(tally(actor('ada', 'human', ['reflog-wizard'])).earned).toBe(1);
	});
});

describe('badges from a newer build', () => {
	it('are named rather than silently dropped', () => {
		expect(unknown(actor('ada', 'human', ['cook', 'from-the-future']))).toEqual([
			'from-the-future'
		]);
	});
});

describe('the agent table', () => {
	function withStats(id: string, tasks: number, firstTries: number, green: number): ActorRecord {
		return {
			...actor(id, 'claude'),
			stats: { ...emptyStats(), tasks, firstTries, testsGreen: green }
		};
	}

	it('has no human on it', () => {
		const human = { ...actor('ada', 'human'), stats: { ...emptyStats(), tasks: 90 } };

		expect(standings([human, withStats('claude', 3, 3, 3)]).map((row) => row.id)).toEqual([
			'claude'
		]);
	});

	it('leaves out an agent that has done no tasks here', () => {
		expect(standings([actor('gpt', 'gpt')])).toEqual([]);
	});

	it('ranks by first-pass rate rather than by how much work it was given', () => {
		const rows = standings([withStats('busy', 100, 50, 100), withStats('good', 10, 9, 10)]);

		expect(rows.map((row) => row.id)).toEqual(['good', 'busy']);
		expect(rows[0].approval).toBe(90);
	});

	it('says nothing rather than zero when there is nothing to divide by', () => {
		const rows = standings([
			{ ...actor('new', 'codex'), stats: { ...emptyStats(), tasks: 0 } },
			withStats('one', 1, 0, 0)
		]);

		expect(rows.map((row) => row.id)).toEqual(['one']);
		expect(rows[0].approval).toBe(0);
	});
});

describe('the summary', () => {
	it('says nothing about tasks for somebody who has not done any', () => {
		const rows = summary(actor('ada', 'human')).map((row) => row.label);

		expect(rows).not.toContain('Tasks completed');
		expect(rows).toContain('Commits');
	});

	it('counts outcomes, never time spent', () => {
		const labels = summary(actor('ada', 'human')).map((row) => row.label.toLowerCase());

		// The rule the whole feature is written against: nothing rewards being
		// in the application.
		for (const forbidden of ['session', 'hours', 'days', 'opened', 'streak of days']) {
			expect(labels.some((label) => label.includes(forbidden)), forbidden).toBe(false);
		}
	});
});

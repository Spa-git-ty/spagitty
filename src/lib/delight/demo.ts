// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The events God mode can fire (FEAT-072).
 *
 * A named list rather than a form with twelve fields. What somebody testing the
 * delight layer actually wants is "do the thing that earns Surgical Strike",
 * not the freedom to set `directories` to 4 — and a list of *situations* is
 * also a readable specification of what each rule is supposed to mean.
 *
 * Every event here is a shape the application really produces. Nothing in this
 * file invents a fact the engine would never see in ordinary use.
 */

import type { DelightEvent } from './events';

export interface Demo {
	id: string;
	label: string;
	/** What it should earn, or move towards. Shown under the button. */
	what: string;
	event: DelightEvent;
	/** Fire it this many times, for the rules that count to a threshold. */
	times?: number;
	/**
	 * This one moves a counter without finishing anything.
	 *
	 * Declared rather than discovered: a button that earns nothing looks broken,
	 * so the section says "towards" in its description and the suite holds every
	 * *other* demo to actually earning something.
	 */
	partial?: boolean;
}

function commit(over: Partial<Extract<DelightEvent, { kind: 'commit' }>>): DelightEvent {
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

export const DEMOS: Demo[] = [
	{
		id: 'clean',
		label: 'A clean commit',
		what: 'One directory, a readable size. Cook, then Zero Noise, then Spagitty Chef.',
		event: commit({})
	},
	{
		id: 'streak',
		label: 'Eight clean commits',
		what: 'Clean Freak — the streak badge.',
		event: commit({}),
		times: 8
	},
	{
		id: 'surgical',
		label: 'A four-line fix',
		what: 'Surgical Strike. Needs a commit before it, so fire a clean one first.',
		event: commit({ files: 1, added: 3, removed: 1 })
	},
	{
		id: 'tests',
		label: 'A commit with its tests',
		what: 'Test Goblin, after ten of them.',
		event: commit({ tests: true }),
		times: 10
	},
	{
		id: 'refactor',
		label: 'A big refactor that kept its tests',
		what: 'Architect.',
		event: commit({ files: 14, directories: 1, added: 400, removed: 380, tests: true, refactor: true })
	},
	{
		id: 'spaghetti',
		label: 'A 30-file commit across 9 directories',
		what: 'Actual Spaghetti, and it breaks any clean streak.',
		event: commit({ files: 30, directories: 9, added: 900, removed: 400 })
	},
	{
		id: 'main',
		label: 'A commit straight to main',
		what: "Main Character. We're not angry.",
		event: commit({ onDefaultBranch: true })
	},
	{
		id: 'conflict',
		label: 'A three-file conflict, resolved',
		what: 'Conflict Rookie, then Conflict Tamer.',
		event: { kind: 'conflict', files: 3, operation: 'merge' }
	},
	{
		id: 'bigConflict',
		label: 'A twelve-file conflict, resolved',
		what: 'This Is Fine.',
		event: { kind: 'conflict', files: 12, operation: 'rebase' }
	},
	{
		id: 'conflictRun',
		label: 'Ten six-file conflicts',
		what: 'Conflict Samurai.',
		event: { kind: 'conflict', files: 6, operation: 'rebase' },
		times: 10
	},
	{
		id: 'rebaseClean',
		label: 'A clean interactive rebase',
		what: 'Towards Rebase Ronin. Eight of them earns it — the button below does all eight.',
		event: { kind: 'rebase', commits: 12, conflicts: 0, interactive: true },
		partial: true
	},
	{
		id: 'rebaseFought',
		label: 'A rebase that fought back',
		what: 'Rebase Survivor.',
		event: { kind: 'rebase', commits: 23, conflicts: 14, interactive: true }
	},
	{
		id: 'ronin',
		label: 'Eight interactive rebases',
		what: 'Rebase Ronin.',
		event: { kind: 'rebase', commits: 9, conflicts: 0, interactive: true },
		times: 8
	},
	{
		id: 'cherry',
		label: 'Five cherry-picks',
		what: 'Cherry Picker.',
		event: { kind: 'cherryPick', commits: 1 },
		times: 5
	},
	{
		id: 'merges',
		label: 'Fifteen real merges',
		what: 'Octopus. Fast-forwards do not count.',
		event: { kind: 'merge', fastForward: false },
		times: 15
	},
	{
		id: 'reflog',
		label: 'Work recovered from the reflog',
		what: 'Reflog Wizard — a secret badge, so it was ??? until now.',
		event: { kind: 'recovery', how: 'reflog' }
	},
	{
		id: 'detached',
		label: 'Escaped a detached HEAD',
		what: 'Detached HEAD Survivor. Also secret.',
		event: { kind: 'recovery', how: 'detached' }
	},
	{
		id: 'lost',
		label: 'Six checkouts in a minute',
		what: 'What Branch Am I On? — secret, and a little rude.',
		event: { kind: 'checkout', at: 0 },
		times: 6
	},
	{
		id: 'force',
		label: 'A force push',
		what: 'Force Push And Pray. Nothing in the UI can do this yet.',
		event: { kind: 'push', force: true }
	},
	{
		id: 'branches',
		label: 'Three branches deleted',
		what: 'RIP Branch.',
		event: { kind: 'branchDeleted', name: 'feature/old' },
		times: 3
	},
	{
		id: 'firstTry',
		label: 'An agent task, first time',
		what: 'First Try. Green tests, approved, no corrections.',
		event: {
			kind: 'agentTask',
			testsPassed: true,
			approved: true,
			corrections: 0,
			difficulty: 'routine',
			handoff: false,
			failedElsewhere: false
		}
	},
	{
		id: 'bigBrain',
		label: 'A hard agent task, first time',
		what: 'Big Brain.',
		event: {
			kind: 'agentTask',
			testsPassed: true,
			approved: true,
			corrections: 0,
			difficulty: 'hard',
			handoff: false,
			failedElsewhere: false
		}
	},
	{
		id: 'handoff',
		label: 'A planner → implementer → reviewer run',
		what: 'Perfect Handoff.',
		event: {
			kind: 'agentTask',
			testsPassed: true,
			approved: true,
			corrections: 0,
			difficulty: 'routine',
			handoff: true,
			failedElsewhere: false
		}
	},
	{
		id: 'elsewhere',
		label: 'Tests that only passed here',
		what: 'Works On My Machine.',
		event: {
			kind: 'agentTask',
			testsPassed: true,
			approved: true,
			corrections: 0,
			difficulty: 'routine',
			handoff: false,
			failedElsewhere: true
		}
	},
	{
		id: 'regression',
		label: 'A review that caught a regression',
		what: 'Regression Slayer, and Gatekeeper after five.',
		event: { kind: 'review', caughtRegression: true, missedByOthers: false }
	},
	{
		id: 'eagle',
		label: 'A review that found what others missed',
		what: 'Eagle Eye.',
		event: { kind: 'review', caughtRegression: true, missedByOthers: true }
	}
];

/**
 * The events a demo fires, expanded.
 *
 * A checkout burst needs the clock to move between its events, so the timestamp
 * is stepped here rather than left at whatever the shape carried — six
 * checkouts at the same instant is not a burst, it is one checkout six times.
 */
export function expand(demo: Demo, now: number): DelightEvent[] {
	const times = demo.times ?? 1;
	return Array.from({ length: times }, (_, index) =>
		demo.event.kind === 'checkout' ? { ...demo.event, at: now + index * 5_000 } : demo.event
	);
}

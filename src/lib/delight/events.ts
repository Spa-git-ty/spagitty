// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What enters the achievement engine (FEAT-072).
 *
 * The delight layer never watches git. It is told, by the same code that
 * already reports what happened to the user, and that is the whole reason it is
 * safe: a broken rule here cannot break a rebase, because the rebase has
 * already finished by the time anything in this directory runs.
 *
 * Every field on every event below is something Spagitty already knows at the
 * moment it reports success. Nothing here needs a new read, a new command or a
 * new walk — if a rule wanted a fact that could only come from an extra call,
 * the rule was rewritten rather than the boundary widened.
 */

/**
 * Who did it.
 *
 * `human` is the person at the keyboard, identified by their git identity.
 * Everything else is an agent, and agents are named rather than lumped together
 * because the point of the whole thing is being able to ask which of them
 * actually performs well *in this repository*.
 */
export type ActorKind = 'human' | 'claude' | 'gpt' | 'codex' | 'gemini' | 'local' | 'agent';

export interface ActorRef {
	/** Stable key. The git email for a human, the agent's slug otherwise. */
	id: string;
	kind: ActorKind;
	/** What to draw. A display name, not a key. */
	name: string;
}

/** A commit that landed. */
export interface CommitEvent {
	kind: 'commit';
	files: number;
	/** Distinct top-level directories the commit touched. The spaghetti signal. */
	directories: number;
	added: number;
	removed: number;
	/** True when HEAD was `main`, `master` or `trunk` at the time. */
	onDefaultBranch: boolean;
	amend: boolean;
	/** The commit touched a test file as well as an implementation file. */
	tests: boolean;
	/** The subject says this is a refactor. Behaviour-preserving, by claim. */
	refactor: boolean;
}

/** A rebase that finished, however hard it was. */
export interface RebaseEvent {
	kind: 'rebase';
	/** Commits replayed. Zero when the count is not known. */
	commits: number;
	/** Conflicts hit along the way and resolved rather than aborted. */
	conflicts: number;
	interactive: boolean;
}

/** A conflicted operation that was carried through to the end. */
export interface ConflictEvent {
	kind: 'conflict';
	/** Files that were conflicted in this one operation. */
	files: number;
	/** The operation the conflicts belonged to, for the wording. */
	operation: string;
}

export interface CherryPickEvent {
	kind: 'cherryPick';
	commits: number;
}

export interface MergeEvent {
	kind: 'merge';
	fastForward: boolean;
}

/** Work that was gone and came back — the reflog, or an escape from a detached HEAD. */
export interface RecoveryEvent {
	kind: 'recovery';
	how: 'reflog' | 'detached' | 'rebase';
}

export interface CheckoutEvent {
	kind: 'checkout';
	/** Milliseconds since the epoch. The burst detector needs the clock. */
	at: number;
}

export interface PushEvent {
	kind: 'push';
	force: boolean;
}

export interface BranchDeletedEvent {
	kind: 'branchDeleted';
	name: string;
}

/**
 * An agent finished a task (FEAT-072).
 *
 * This is the event the agent farm feeds. Nothing in Spagitty emits it yet —
 * the farm is what will — and it is defined here rather than later because the
 * badge rules that read it are the reason half the catalogue exists, and a rule
 * with no event shape to read is a rule nobody can test.
 */
export interface AgentTaskEvent {
	kind: 'agentTask';
	/** Tests all passed. */
	testsPassed: boolean;
	/** The reviewer approved it. */
	approved: boolean;
	/** Corrections the reviewer asked for. Zero is what First Try means. */
	corrections: number;
	difficulty: 'routine' | 'hard';
	/** Planner → implementer → reviewer, with no human asked anything. */
	handoff: boolean;
	/** The tests passed here and failed somewhere else. */
	failedElsewhere: boolean;
}

/** A review that was completed, by a person or by an agent. */
export interface ReviewEvent {
	kind: 'review';
	/** The review found a real regression before it merged. */
	caughtRegression: boolean;
	/** Nobody else had found it. */
	missedByOthers: boolean;
}

export type DelightEvent =
	| CommitEvent
	| RebaseEvent
	| ConflictEvent
	| CherryPickEvent
	| MergeEvent
	| RecoveryEvent
	| CheckoutEvent
	| PushEvent
	| BranchDeletedEvent
	| AgentTaskEvent
	| ReviewEvent;

/** The branch names a commit to which earns Main Character. */
export const DEFAULT_BRANCHES = ['main', 'master', 'trunk'];

/** True when committing to this branch is committing to the default one. */
export function isDefaultBranch(name: string | null): boolean {
	return name !== null && DEFAULT_BRANCHES.includes(name);
}

/**
 * Which agent, if any, a commit message credits.
 *
 * This is the one place the delight layer can attribute work to an agent
 * *today*, before the farm exists: agents sign their work with a `Co-authored-by`
 * trailer, and a repository full of them is already a repository with a record
 * of who wrote what. Read from the trailer rather than guessed from prose, so a
 * commit that merely mentions Claude in its body is not credited to it.
 */
export function agentFromMessage(message: string): ActorRef | null {
	const trailers = message
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => /^co-authored-by:/i.test(line));

	for (const trailer of trailers) {
		const who = trailer.slice(trailer.indexOf(':') + 1).trim();
		const kind = agentKind(who);
		if (kind) {
			// The name before the address, which is what an agent puts its
			// model name in.
			const name = who.replace(/<[^>]*>/, '').trim() || who;
			return { id: kind, kind, name };
		}
	}
	return null;
}

/** The agent a trailer names, or null when it names a person. */
function agentKind(who: string): Exclude<ActorKind, 'human'> | null {
	const text = who.toLowerCase();
	if (text.includes('claude')) return 'claude';
	if (text.includes('codex')) return 'codex';
	if (text.includes('gemini')) return 'gemini';
	if (/\bgpt\b|openai/.test(text)) return 'gpt';
	return null;
}

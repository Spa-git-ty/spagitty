// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Wire types shared with the Rust core.
 *
 * These mirror the `serde` shapes in `crates/gitlord-core` and
 * `src-tauri/src/commands.rs`, which all carry
 * `#[serde(rename_all = "camelCase")]`. Keep the two in step.
 */

// --- Refs -----------------------------------------------------------------

export type RefKind = 'branch' | 'remote' | 'tag';

export interface RefChip {
	/** Display name, already shortened: `master`, `origin/master`, `v12.0.0`. */
	name: string;
	kind: RefKind;
	/** True for the branch HEAD points at. Renders with accent border and a check. */
	current: boolean;
}

// --- Graph ----------------------------------------------------------------

/**
 * A lane segment in the band *above* a row, running from the previous row's
 * center to this row's. `from === to` is a straight vertical; otherwise it is a
 * cubic elbow spanning exactly one row.
 */
export interface LaneEdge {
	from: number;
	to: number;
	/** Index into the lane color cycle. Stable for a lane's whole lifetime. */
	color: number;
}

/** One commit row. Everything needed to paint it, with no global state. */
export interface GraphRow {
	/** Absolute index in the walk. Row `i` is at `y = i * ROW_PITCH`. */
	index: number;
	id: string;
	short: string;
	/** First line of the commit message. */
	summary: string;
	authorName: string;
	/** Up to two uppercase letters, drawn inside the node. */
	initials: string;
	/** Author time, unix seconds. */
	time: number;
	/** Lane this commit's node sits in. */
	lane: number;
	color: number;
	parents: string[];
	refs: RefChip[];
	edges: LaneEdge[];
}

// --- Commit detail --------------------------------------------------------

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';

export interface ChangedFile {
	path: string;
	status: FileStatus;
}

export interface CommitDetail {
	id: string;
	short: string;
	summary: string;
	/** Everything after the first line, trimmed. May be empty. */
	body: string;
	authorName: string;
	authorEmail: string;
	authorTime: number;
	committerName: string;
	committerEmail: string;
	commitTime: number;
	parents: string[];
	files: ChangedFile[];
}

// --- Diff -----------------------------------------------------------------

export type LineOrigin = 'context' | 'added' | 'removed';

export interface DiffLine {
	origin: LineOrigin;
	/** 1-based line number in the old version. Null on an added line. */
	old: number | null;
	/** 1-based line number in the new version. Null on a removed line. */
	new: number | null;
	/** The line's text, without its terminator. */
	text: string;
}

/** One run of changes plus its context — a `@@` block. */
export interface Hunk {
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	header: string;
	lines: DiffLine[];
}

/** A row in the Diff screen's file list. */
export interface FileChange {
	path: string;
	status: FileStatus;
	/**
	 * No line diff exists: the file is binary, or one side was too large. In
	 * both cases `added` and `removed` are 0 rather than a guess.
	 */
	binary: boolean;
	tooLarge: boolean;
	added: number;
	removed: number;
}

export interface CommitDiff {
	id: string;
	short: string;
	summary: string;
	files: FileChange[];
	/** Totals across every file, for the header. */
	added: number;
	removed: number;
}

export interface FileDiff {
	path: string;
	status: FileStatus;
	binary: boolean;
	tooLarge: boolean;
	added: number;
	removed: number;
	hunks: Hunk[];
}

// --- Working copy ---------------------------------------------------------

/** Which two sides of the working copy a diff compares. */
export type DiffSide = 'staged' | 'unstaged';

/** One path in the working copy, on the side it was found. */
export interface StatusEntry {
	path: string;
	status: FileStatus;
}

/**
 * The working copy, split the way the Commit screen shows it.
 *
 * A path can be in `staged` and `unstaged` at once — staged in part, or
 * changed again afterwards — so these are three lists rather than one list of
 * rows carrying flags.
 */
export interface WorkingCopy {
	/** HEAD against the index: what a commit right now would contain. */
	staged: StatusEntry[];
	/** The index against the working tree, plus untracked files. */
	unstaged: StatusEntry[];
	/** Paths the index holds at stages 1 to 3. Nothing can be committed yet. */
	conflicted: StatusEntry[];
}

// --- Branches -------------------------------------------------------------

/** One row of the Branches screen. */
export interface BranchRow {
	/** Short name for display: `main`, `origin/main`. */
	name: string;
	/** The full ref, for anything that has to be unambiguous. */
	fullName: string;
	kind: RefKind;
	current: boolean;
	id: string;
	short: string;
	/** First line of the tip's message. */
	summary: string;
	authorName: string;
	/** Author time of the tip, unix seconds. */
	time: number;
	/** Short name of the configured upstream, when there is one. */
	upstream: string | null;
	/**
	 * Commits this branch has that its upstream does not, and the other way
	 * round. Null when there is no upstream to compare against. As old as the
	 * last fetch: nothing here talks to a network.
	 */
	ahead: number | null;
	behind: number | null;
	/** Fully contained in HEAD — the branch that is safe to forget. */
	merged: boolean;
}

// --- Stash ----------------------------------------------------------------

/**
 * One `stash@{n}`.
 *
 * A stash is a commit whose first parent is the commit the work was made on, so
 * `commitDiff(entry.id)` shows what is in it — there is no separate stash-diff
 * call, and there does not need to be.
 */
export interface StashEntry {
	/** `n` in `stash@{n}`. 0 is the most recent. */
	index: number;
	/** `stash@{n}` — the name git itself uses. */
	name: string;
	id: string;
	short: string;
	/** What the entry says about itself: `On main: wip on notes`. */
	message: string;
	time: number;
	authorName: string;
	/** The commit the work was made on — the row it hangs off. */
	parent: string;
	parentShort: string;
	parentSummary: string;
}

// --- Pull requests --------------------------------------------------------

/**
 * The shape a pull request takes on the screen.
 *
 * **This is FEAT-017's contract.** Nothing populates it today — GitLord talks
 * to no hosting service — and it is defined now so that connecting a host is a
 * matter of filling this in rather than redesigning the screen around whatever
 * one host's API happens to return.
 *
 * The vocabulary is host-agnostic on purpose: "pull request", never a brand.
 * The hosting service is a detail, not the language.
 */
export interface PullRequest {
	/** The host's own identifier, whatever form it takes. */
	id: string;
	/** The number people say out loud: "#412". */
	number: number;
	title: string;
	/** Display name of whoever opened it. */
	authorName: string;
	/** Seconds since the unix epoch. */
	updated: number;
	sourceBranch: string;
	targetBranch: string;
	draft: boolean;
	/** Where it sits with reviewers. */
	review: ReviewState;
	/** Whether the host's checks passed. Null when the host runs none. */
	checks: CheckState | null;
	/** True when this one is waiting on the person using GitLord. */
	needsYou: boolean;
	/** Why it needs you, in one line, when it does. */
	needsYouBecause: string | null;
	changedFiles: number;
	added: number;
	removed: number;
	/** Whether the host says it can merge. Null when the host has not said. */
	mergeable: boolean | null;
}

export type ReviewState = 'awaitingReview' | 'changesRequested' | 'approved' | 'noReviewers';

export type CheckState = 'passing' | 'failing' | 'running';

// --- Interactive rebase ---------------------------------------------------

/** What to do with one commit, in git's own vocabulary. */
export type RebaseAction = 'pick' | 'squash' | 'reword' | 'drop';

/** One row of the todo list, as `git rebase -i` would open it. */
export interface TodoRow {
	id: string;
	short: string;
	summary: string;
	authorName: string;
	time: number;
	/** Paths this commit changed. What the conflict heuristic compares. */
	paths: string[];
}

export interface RebaseTodo {
	/** The commit the rebase would replay onto. */
	upstream: string;
	upstreamShort: string;
	/** Oldest first — a rebase replays forwards. */
	rows: TodoRow[];
	/** True when the range was longer than the cap and was cut. */
	truncated: boolean;
}

/** One entry of the plan. The plan is the complete list, and its order is the order. */
export interface RebaseEdit {
	id: string;
	action: RebaseAction;
}

/** One row of the result: what a commit would become. */
export interface PreviewRow {
	id: string;
	short: string;
	summary: string;
	/** Commits folded into this one, oldest first. Empty for a plain pick. */
	absorbed: string[];
	reworded: boolean;
	/**
	 * An earlier row in the plan touched a path this one also touches, so
	 * replaying it may not apply cleanly. A heuristic — knowing for certain
	 * means performing the merges, which is execution.
	 */
	mayConflict: boolean;
}

export interface RebasePreview {
	rows: PreviewRow[];
	dropped: string[];
	/**
	 * Set when the plan cannot be executed as written. Dropping everything is
	 * not one of these — an empty result is a legitimate thing to look at.
	 */
	refusal: string | null;
	/** True when the plan would leave no commits at all. */
	emptiesTheBranch: boolean;
}

// --- Log search -----------------------------------------------------------

/**
 * What to look for. Every field is optional and they compose as AND.
 *
 * Text matching is a case-insensitive substring, not a regular expression —
 * regexes are explicit non-scope for this pass.
 */
export interface SearchQuery {
	/** Matched against `Name <email>`, the way `git log --author` looks at it. */
	author?: string | null;
	/** Matched against the whole message, subject and body, like `--grep`. */
	message?: string | null;
	/** A path the commit changed, like `git log -- <path>`. */
	path?: string | null;
	/** Seconds since the unix epoch, like `--since`. */
	since?: number | null;
	/** Seconds since the unix epoch, like `--until`. */
	until?: number | null;
}

/**
 * One result: the graph's row without its lane.
 *
 * A filtered list has no lanes, and drawing them would draw edges between
 * commits that are not parent and child.
 */
export interface SearchRow {
	/** Position in the result list, not in history. */
	index: number;
	id: string;
	short: string;
	summary: string;
	authorName: string;
	authorEmail: string;
	initials: string;
	time: number;
	refs: RefChip[];
}

export interface SearchRowsEvent {
	token: number;
	rows: SearchRow[];
}

export interface SearchDoneEvent {
	token: number;
	total: number;
	/** True when the walk reached the end of history rather than being cancelled. */
	complete: boolean;
	error: string | null;
}

/** Why there is nothing to blame. Not an error — ordinary states of files. */
export type NotBlamable = 'binary' | 'tooLarge' | 'notAFile' | 'empty';

export interface BlameLine {
	/** 1-based line number in the blamed file. */
	line: number;
	text: string;
	commit: string;
	short: string;
	summary: string;
	authorName: string;
	time: number;
	/** Where the line lived before, when it arrived under another name. */
	sourcePath: string | null;
}

export interface Blame {
	path: string;
	/** The revision blamed, resolved to a full id. */
	revision: string;
	lines: BlameLine[];
	/** Set when `lines` is empty for a reason worth stating. */
	refused: NotBlamable | null;
}

// --- Conflicts ------------------------------------------------------------

/**
 * What the repository is in the middle of.
 *
 * Read from the repository's own state, never inferred from the presence of
 * conflicts: merge, rebase, cherry-pick and revert all leave conflicts behind,
 * and naming the wrong one sends someone to the wrong command to get out.
 */
export type ConflictOperation =
	| 'merge'
	| 'rebase'
	| 'rebaseInteractive'
	| 'cherryPick'
	| 'revert'
	| 'applyMailbox'
	| 'bisect'
	| 'none';

/**
 * Which sides a conflicted path has, which is the same thing as what kind of
 * conflict it is.
 */
export type ConflictKind = 'bothModified' | 'bothAdded' | 'deletedByUs' | 'deletedByThem';

export interface ConflictFile {
	path: string;
	kind: ConflictKind;
}

/** One version of a conflicted file. */
export interface ConflictSide {
	/** Empty when `binary` or `tooLarge`, because there is nothing honest to show. */
	text: string;
	lines: number;
	bytes: number;
	binary: boolean;
	tooLarge: boolean;
}

/**
 * The three index stages of one conflicted path, plus what is on disk.
 *
 * A missing side is `null` rather than an empty side: "deleted on that side"
 * and "emptied on that side" are different things, and the second loses work if
 * acted on.
 */
export interface ConflictSides {
	path: string;
	kind: ConflictKind;
	/** Stage 1, the common ancestor. Null when both sides added the path. */
	base: ConflictSide | null;
	/** Stage 2 — ours, which is HEAD. */
	ours: ConflictSide | null;
	/** Stage 3 — theirs, the incoming side. */
	theirs: ConflictSide | null;
	/** The working-tree file, markers and all. Null when there is none on disk. */
	merged: ConflictSide | null;
}

export interface ConflictState {
	operation: ConflictOperation;
	files: ConflictFile[];
}

// --- Repository -----------------------------------------------------------

export interface HeadInfo {
	/** Short branch name, or null when detached. */
	branch: string | null;
	detached: boolean;
	id: string | null;
	short: string | null;
}

export interface RepoInfo {
	path: string;
	name: string;
	bare: boolean;
	head: HeadInfo;
}

/**
 * Right-aligned counts in the nav rail.
 *
 * `null` means "not computed yet" — the rail shows a `·` rather than a number.
 * Counts whose screens do not exist yet are null on purpose: a wrong count is
 * worse than no count, because it is what people use to decide whether a screen
 * is worth opening.
 */
export interface RepoCounts {
	commits: number | null;
	working: number | null;
	/** Paths staged for the next commit — what the Commit button counts. */
	staged: number | null;
	conflicts: number | null;
	branches: number | null;
	stashes: number | null;
	tags: number | null;
	submodules: number | null;
}

/**
 * One card on the All repositories screen.
 *
 * Read where the repository sits, without opening it as the current one.
 * `present` false means the path is gone or is no longer a repository, and
 * every other field is a default that means nothing.
 */
export interface RepoSummary {
	path: string;
	name: string;
	present: boolean;
	bare: boolean;
	branch: string | null;
	detached: boolean;
	short: string | null;
	/** First line of the tip's message, so a card says what it was last doing. */
	summary: string | null;
	time: number | null;
	/** Distinct changed paths, or null for a bare repository. */
	dirty: number | null;
	conflicts: number | null;
	stashes: number | null;
	branches: number | null;
}

export interface OpenResult {
	info: RepoInfo;
	counts: RepoCounts;
	/** Identifies this walk. Rows from any other token are stale. */
	token: number;
}

export interface Snapshot {
	info: RepoInfo;
	counts: RepoCounts;
}

export interface About {
	version: string;
	commit: string;
	license: string;
}

// --- Settings -------------------------------------------------------------

/** A configuration file GitLord will write to. Never inferred — always chosen. */
export type IdentityScope = 'global' | 'local';

/** The two keys the Settings screen edits, and no others. */
export type IdentityKey = 'name' | 'email';

/**
 * Where the value git would actually use comes from.
 *
 * Wider than `IdentityScope`, because a value can come from somewhere GitLord
 * will not write: saying "system" out loud is what explains why editing the
 * global field did not change the effective value.
 */
export type IdentityOrigin = 'unset' | 'system' | 'global' | 'local' | 'environment';

export interface IdentityValue {
	/** What git would use. */
	effective: string | null;
	origin: IdentityOrigin;
	/** What each writable scope holds, so an override can be shown beside what it hides. */
	global: string | null;
	local: string | null;
}

export interface Identity {
	name: IdentityValue;
	email: IdentityValue;
	/** False when no repository is open: the local scope is neither read nor written. */
	repository: boolean;
}

/** GitLord's own behaviour toggles, stored in its config directory. */
export interface Settings {
	signCommits: boolean;
	confirmHistoryRewrite: boolean;
	showGitCommands: boolean;
}

export interface Dependency {
	name: string;
	version: string;
	/** Null where the package declares none — listed as "not declared", never hidden. */
	license: string | null;
}

/**
 * Every dependency this build is made of, generated from the lockfiles.
 *
 * `generated` false means the build could not produce the list; `notes` says
 * why. An empty list with no explanation would read as "no dependencies".
 */
export interface Licenses {
	generated: boolean;
	notes: string[];
	rust: Dependency[];
	npm: Dependency[];
}

// --- Events ---------------------------------------------------------------

/** Payload of `graph-rows`: one streamed chunk. */
export interface GraphRowsEvent {
	token: number;
	rows: GraphRow[];
}

/** Payload of `graph-done`: the walk for `token` stopped. */
export interface GraphDoneEvent {
	token: number;
	total: number;
	/** True when it reached the end of history rather than being cancelled. */
	complete: boolean;
	error: string | null;
}

/** Payload of `repo-changed`: the filesystem watcher saw something settle. */
export interface RepoChangedEvent {
	refs: boolean;
	worktree: boolean;
}

export const SEARCH_ROWS_EVENT = 'search-rows';
export const SEARCH_DONE_EVENT = 'search-done';
export const GRAPH_ROWS_EVENT = 'graph-rows';
export const GRAPH_DONE_EVENT = 'graph-done';
export const REPO_CHANGED_EVENT = 'repo-changed';

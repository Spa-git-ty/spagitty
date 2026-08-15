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

export const GRAPH_ROWS_EVENT = 'graph-rows';
export const GRAPH_DONE_EVENT = 'graph-done';
export const REPO_CHANGED_EVENT = 'repo-changed';

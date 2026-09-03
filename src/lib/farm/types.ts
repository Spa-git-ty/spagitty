// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The farm's types, mirroring `spagitty-farm`'s serialisation (FEAT-073).
 *
 * Hand-written rather than generated, like the rest of `types.ts`: the Rust
 * side already writes `camelCase`, and a generator would be a build step for
 * thirty types that change when the feature changes.
 *
 * The rule these follow is the one the whole feature rests on: **a status is a
 * closed set, not a string.** Every screen branches on them, and a union type
 * is what makes an unhandled case a type error rather than a blank cell.
 */

export type AgentProvider = 'claudeCode' | 'codex' | 'cursor' | 'ohMyPi' | 'custom';

export type AgentCapability =
	| 'planning'
	| 'coding'
	| 'review'
	| 'testing'
	| 'frontend'
	| 'backend'
	| 'documentation'
	| 'research'
	| 'longContext'
	| 'vision'
	| 'toolUse';

export type AgentRole =
	| 'architect'
	| 'backend'
	| 'frontend'
	| 'reviewer'
	| 'tester'
	| 'researcher'
	| 'general';

export type AgentInputMode = 'cliPrompt' | 'stdin' | 'acp' | 'mcp' | 'api';

export interface AgentTraits {
	resumableSessions: boolean;
	streaming: boolean;
	structuredOutput: boolean;
	toolUse: boolean;
	headless: boolean;
}

export interface AgentDefinition {
	id: string;
	provider: AgentProvider;
	displayName: string;
	executable: string;
	capabilities: AgentCapability[];
	inputMode: AgentInputMode;
	traits: AgentTraits;
	role: AgentRole;
	extraArgs: string[];
	enabled: boolean;
}

/** What detection found. `state` discriminates. */
export type AgentAvailability =
	| { state: 'available'; path: string; version: string }
	| { state: 'broken'; path: string; reason: string }
	| { state: 'missing' };

export interface AgentStatus {
	definition: AgentDefinition;
	availability: AgentAvailability;
}

export type TaskStatus =
	| 'draft'
	| 'ready'
	| 'assigned'
	| 'running'
	| 'waiting'
	| 'blocked'
	| 'review'
	| 'verification'
	| 'done'
	| 'failed'
	| 'cancelled';

export type TaskKind =
	| 'architecture'
	| 'backend'
	| 'frontend'
	| 'testing'
	| 'documentation'
	| 'research'
	| 'review'
	| 'integration'
	| 'general';

export type TaskPriority = 'high' | 'normal' | 'low';

export interface Task {
	id: string;
	title: string;
	description: string;
	status: TaskStatus;
	kind: TaskKind;
	priority: TaskPriority;
	dependsOn: string[];
	assignedAgent: string | null;
	implementedBy: string | null;
	allowedPaths: string[];
	acceptanceCriteria: string[];
	verification: string[];
	verificationOverrides: boolean;
	branch: string | null;
	worktree: string | null;
	attempts: number;
	note: string | null;
	createdMs: number;
	updatedMs: number;
}

export type FarmStatus =
	| 'idle'
	| 'planning'
	| 'running'
	| 'paused'
	| 'blocked'
	| 'reviewing'
	| 'completed'
	| 'failed'
	| 'cancelled';

export type Autonomy = 'manual' | 'assisted' | 'semiAuto' | 'auto' | 'yolo';

export interface Permissions {
	writeFiles: boolean;
	runCommands: boolean;
	network: boolean;
	commit: boolean;
	push: boolean;
	merge: boolean;
	deleteBranch: boolean;
}

export interface Goal {
	id: string;
	title: string;
	description: string;
	constraints: string[];
	createdMs: number;
}

export interface Farm {
	id: string;
	repository: string;
	status: FarmStatus;
	goal: Goal;
	autonomy: Autonomy;
	permissions: Permissions;
	agents: string[];
	tasks: Task[];
	verification: string[];
	maxParallel: number;
	createdMs: number;
	updatedMs: number;
}

export type RunPhase = 'planning' | 'implementation' | 'review';

export type RunOutcome =
	| { state: 'running' }
	| { state: 'completed'; exitCode: number }
	| { state: 'failed'; exitCode: number | null; reason: string }
	| { state: 'cancelled' };

export interface AgentRun {
	id: string;
	task: string;
	agent: string;
	phase: RunPhase;
	outcome: RunOutcome;
	command: string[];
	startedMs: number;
	endedMs: number | null;
	logFile: string | null;
}

export interface CommandResult {
	command: string;
	passed: boolean;
	output: string;
	durationMs: number;
}

export interface Verification {
	results: CommandResult[];
	passed: boolean;
	/** Nothing was configured, so nothing was checked. Not the same as passing. */
	unverified: boolean;
}

export type ReviewDecision = 'approve' | 'request_changes' | 'blocked';

export interface ReviewIssue {
	severity: 'high' | 'medium' | 'low';
	file: string;
	message: string;
}

export interface Review {
	decision: ReviewDecision;
	summary: string;
	issues: ReviewIssue[];
}

export type HandoffStatus = 'completed' | 'blocked' | 'failed' | 'unknown';

export interface Handoff {
	status: HandoffStatus;
	summary: string;
	filesChanged: string[];
	commits: string[];
	tests: { name: string; outcome: 'passed' | 'failed' | 'skipped'; detail: string }[];
	risks: string[];
	questions: string[];
	proposedTasks: { title: string; description: string; dependsOn: string[] }[];
}

export interface PolicySource {
	path: string;
	authoritative: boolean;
	bytes: number;
}

export interface Policy {
	sources: PolicySource[];
	text: string;
}

export interface StaleWorkspace {
	task: string;
	path: string;
	branch: string;
}

export interface AgentScore {
	agent: string;
	completed: number;
	failed: number;
	changesRequested: number;
	successRate: number | null;
	averageMs: number | null;
}

/**
 * Every event the backend emits, discriminated by `kind`.
 *
 * A single union rather than one type per channel, because the screen keeps one
 * subscription — see the Rust side's `model/event.rs` for why.
 */
export type FarmEvent =
	| { kind: 'farmStatusChanged'; status: FarmStatus }
	| { kind: 'taskCreated'; task: string; title: string }
	| { kind: 'taskStatusChanged'; task: string; status: TaskStatus; note: string | null }
	| { kind: 'taskAssigned'; task: string; agent: string }
	| { kind: 'agentStarted'; run: string; task: string; agent: string; command: string }
	| { kind: 'agentOutput'; run: string; task: string; line: string }
	| { kind: 'agentStopped'; run: string; task: string; ok: boolean; reason: string | null }
	| { kind: 'verificationStarted'; task: string; command: string }
	| {
			kind: 'verificationFinished';
			task: string;
			command: string;
			passed: boolean;
			output: string;
	  }
	| { kind: 'reviewRequested'; task: string; reviewer: string }
	| {
			kind: 'reviewCompleted';
			task: string;
			reviewer: string;
			approved: boolean;
			summary: string;
	  }
	| { kind: 'mergeRequested'; task: string; branch: string }
	| { kind: 'mergeCompleted'; task: string; branch: string; ok: boolean; error: string | null }
	| { kind: 'workspaceChanged'; task: string; path: string; created: boolean }
	| { kind: 'taskProposed'; from: string; title: string }
	| { kind: 'failed'; message: string };

export interface FarmSnapshot {
	farm: Farm | null;
	agents: AgentStatus[];
	undetected: AgentProvider[];
	events: FarmEvent[];
	runs: AgentRun[];
	policy: Policy;
	scoreboard: AgentScore[];
}

export interface TaskDetail {
	task: Task;
	verification: Verification | null;
	review: Review | null;
	handoff: Handoff | null;
	runs: AgentRun[];
}

/** What the task editor sends back. */
export interface TaskDraft {
	title: string;
	description: string;
	kind: TaskKind;
	priority: TaskPriority;
	dependsOn: string[];
	allowedPaths: string[];
	acceptanceCriteria: string[];
	verification: string[];
	verificationOverrides: boolean;
	assignedAgent: string | null;
	ready: boolean;
}

export interface FarmSettings {
	autonomy?: Autonomy;
	permissions?: Permissions;
	maxParallel?: number;
	verification?: string[];
	agents?: string[];
	goalTitle?: string;
	goalDescription?: string;
}

/** The shape a farm command rejects with. */
export interface FarmFailure {
	kind: string;
	message: string;
}

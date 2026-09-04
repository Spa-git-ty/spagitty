// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The Farm screen's state (FEAT-073).
 *
 * # Why the events drive this and not a poll
 *
 * A farm changes when an agent says something, which is at the model's pace and
 * not on any schedule. Polling for it would be either too slow to watch or a
 * request every few hundred milliseconds for an answer that has not changed.
 * So the backend emits, this store applies, and the screen is a function of the
 * store.
 *
 * # Why an event still triggers a refresh
 *
 * Applying an event locally keeps the screen live; refetching keeps it *right*.
 * A status change is applied immediately so the chip moves as it happens, and a
 * snapshot is fetched shortly afterwards so nothing drifts if an event was
 * missed while the window was closed. The refresh is debounced, because a farm
 * with four agents produces bursts.
 *
 * Transcript lines are the exception: they are applied and never refetched, and
 * they are capped, because one agent run produces thousands of them and the
 * point of the pane is the last few hundred.
 */

import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import * as api from './api';
import type {
	AgentScore,
	AgentStatus,
	Farm,
	FarmEvent,
	FarmSnapshot,
	Policy,
	AgentProvider,
	AgentRun,
	StaleWorkspace,
	Task,
	TaskStatus
} from './types';

/** The Tauri event every farm event arrives on. */
export const EVENT = 'farm-event';

/**
 * The task identifier a planning run's output is filed under.
 *
 * A planning run has no task — it is what produces the tasks — so the backend
 * files it under this fixed identifier. It is not in `farm.tasks`, which is why
 * a planning run was invisible until something asked for it by name.
 */
export const PLANNING_TASK = 'planning';

/**
 * How many activity lines are kept.
 *
 * Three hundred: more than a screenful of history, few enough that appending to
 * it stays free. The whole log is on disk and is re-read on open.
 */
export const ACTIVITY_LIMIT = 300;

/** How many transcript lines are kept per task, for the same reason. */
export const TRANSCRIPT_LIMIT = 500;

/** How long a burst of events is allowed to settle before a refetch. */
export const REFRESH_DELAY_MS = 250;

let farm = $state<Farm | null>(null);
let agents = $state<AgentStatus[]>([]);
let undetected = $state<AgentProvider[]>([]);
let activity = $state<FarmEvent[]>([]);
let runs = $state<AgentRun[]>([]);
let policy = $state<Policy>({ sources: [], text: '' });
let stale = $state<StaleWorkspace[]>([]);
let scoreboard = $state<AgentScore[]>([]);
let transcripts = $state<Record<string, string[]>>({});
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);

let unlisten: UnlistenFn | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function apply(snapshot: FarmSnapshot): void {
	farm = snapshot.farm;
	agents = snapshot.agents;
	undetected = snapshot.undetected;
	runs = snapshot.runs;
	policy = snapshot.policy;
	stale = snapshot.stale;
	scoreboard = snapshot.scoreboard;
	activity = snapshot.events.slice(-ACTIVITY_LIMIT);
	loaded = true;
}

/**
 * Apply one event without waiting for a refetch.
 *
 * Only the changes a person watches for. Everything else arrives with the next
 * snapshot, which is a quarter of a second away.
 */
function absorb(event: FarmEvent): void {
	if (event.kind === 'agentOutput') {
		const existing = transcripts[event.task] ?? [];
		const next = [...existing, event.line];
		transcripts = {
			...transcripts,
			[event.task]: next.length > TRANSCRIPT_LIMIT ? next.slice(-TRANSCRIPT_LIMIT) : next
		};
		return;
	}

	activity = [...activity, event].slice(-ACTIVITY_LIMIT);

	if (event.kind === 'farmStatusChanged' && farm) {
		farm = { ...farm, status: event.status };
		return;
	}
	if (event.kind === 'taskStatusChanged' && farm) {
		farm = {
			...farm,
			tasks: farm.tasks.map((task) =>
				task.id === event.task ? { ...task, status: event.status, note: event.note } : task
			)
		};
	}
}

function scheduleRefresh(): void {
	if (refreshTimer) clearTimeout(refreshTimer);
	refreshTimer = setTimeout(() => {
		refreshTimer = null;
		void refresh();
	}, REFRESH_DELAY_MS);
}

async function refresh(): Promise<void> {
	try {
		apply(await api.snapshot());
	} catch (cause) {
		// A refresh that fails must not blank a screen that is showing
		// something true. The error is recorded and the last snapshot stays.
		error = api.failure(cause).message;
	}
}

export const farmStore = {
	get farm(): Farm | null {
		return farm;
	},
	get agents(): AgentStatus[] {
		return agents;
	},
	get undetected(): AgentProvider[] {
		return undetected;
	},
	get activity(): FarmEvent[] {
		return activity;
	},
	get runs(): AgentRun[] {
		return runs;
	},
	get policy(): Policy {
		return policy;
	},
	get stale(): StaleWorkspace[] {
		return stale;
	},
	get scoreboard(): AgentScore[] {
		return scoreboard;
	},
	get loaded(): boolean {
		return loaded;
	},
	get loading(): boolean {
		return loading;
	},
	get error(): string | null {
		return error;
	},

	get tasks(): Task[] {
		return farm?.tasks ?? [];
	},

	/** Tasks by identifier, for dependency lookups. */
	get byId(): Map<string, Task> {
		return new Map((farm?.tasks ?? []).map((task) => [task.id, task]));
	},

	/** Agents that could be given a task right now. */
	get usable(): AgentStatus[] {
		return agents.filter(
			(agent) => agent.definition.enabled && agent.availability.state === 'available'
		);
	},

	/** How many tasks have finished, and how many there are. */
	get progress(): { done: number; total: number } {
		const tasks = farm?.tasks ?? [];
		return { done: tasks.filter((task) => task.status === 'done').length, total: tasks.length };
	},

	/** Tasks waiting for a person: reviewed and not merged, or blocked. */
	get needsYou(): Task[] {
		return (farm?.tasks ?? []).filter(
			(task) => task.status === 'review' || task.status === 'blocked'
		);
	},

	/** The lines one task's agent has produced this session. */
	transcript(task: string): string[] {
		return transcripts[task] ?? [];
	},

	/** What the planner has said so far, this session. */
	get planning(): string[] {
		return transcripts[PLANNING_TASK] ?? [];
	},

	/**
	 * The planning run in flight, if there is one.
	 *
	 * Read from `runs` rather than remembered when the status changed, so it
	 * survives the screen being left and come back to, and so the elapsed time
	 * is the run's own rather than the screen's.
	 */
	get planningRun(): AgentRun | null {
		return (
			runs.find((run) => run.phase === 'planning' && run.outcome.state === 'running') ?? null
		);
	},

	/** Tasks in a given status. */
	inStatus(status: TaskStatus): Task[] {
		return (farm?.tasks ?? []).filter((task) => task.status === status);
	},

	/** Point the farm at a repository and start listening. */
	async open(path: string): Promise<void> {
		loading = true;
		error = null;
		try {
			apply(await api.open(path));
			await this.listen();
		} catch (cause) {
			error = api.failure(cause).message;
		} finally {
			loading = false;
		}
	},

	/** Subscribe to the backend's events. Safe to call twice. */
	async listen(): Promise<void> {
		if (unlisten) return;
		unlisten = await listen<FarmEvent>(EVENT, (message) => {
			absorb(message.payload);
			scheduleRefresh();
		});
	},

	/** Stop listening. Running agents are not affected. */
	async stop(): Promise<void> {
		if (refreshTimer) {
			clearTimeout(refreshTimer);
			refreshTimer = null;
		}
		if (unlisten) {
			unlisten();
			unlisten = null;
		}
	},

	refresh,

	/** Apply an event by hand. Exists for the tests and for the event listener. */
	absorb,

	/** Throw away everything. The farm on disk is untouched. */
	reset(): void {
		farm = null;
		agents = [];
		undetected = [];
		activity = [];
		runs = [];
		policy = { sources: [], text: '' };
		stale = [];
		scoreboard = [];
		transcripts = {};
		loaded = false;
		loading = false;
		error = null;
	},

	/** Record a failure from an action, for the screen to show. */
	fail(cause: unknown): string {
		const failure = api.failure(cause);
		error = failure.message;
		return failure.message;
	},

	clearError(): void {
		error = null;
	}
};

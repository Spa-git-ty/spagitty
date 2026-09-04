<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as api from '$lib/farm/api';
	import AgentCard from '$lib/farm/components/AgentCard.svelte';
	import TaskDetailPanel from '$lib/farm/components/TaskDetail.svelte';
	import TaskEditor from '$lib/farm/components/TaskEditor.svelte';
	import TaskRow from '$lib/farm/components/TaskRow.svelte';
	import Starter from '$lib/farm/components/Starter.svelte';
	import { AUTONOMY_LEVELS, eventLine, FARM_STATUS_LABELS, PROVIDER_LABELS } from '$lib/farm/describe';
	import { lines, text } from '$lib/farm/options';
	import { farmStore } from '$lib/farm/store.svelte';
	import type { Task, TaskDetail, TaskDraft } from '$lib/farm/types';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import { dialog } from '$lib/ui/dialog.svelte';
	import { notice } from '$lib/ui/notice.svelte';

	/**
	 * Farm (1Q) — supervising a small engineering team inside the Git client
	 * (FEAT-073).
	 *
	 * Three columns, and the split is the plan's product principle rather than
	 * a layout preference. The left column answers *what is the plan*, the
	 * middle answers *what is happening to this task*, and the strip along the
	 * bottom answers *what has happened*. A person who can see all three at once
	 * can supervise; one who has to navigate between them is reading a log.
	 *
	 * The screen has no timers. Everything arrives on the farm's event channel,
	 * which the store subscribes to — see its header for why polling is the
	 * wrong shape for something that moves at a model's pace.
	 */

	type Pane = 'tasks' | 'agents' | 'settings';

	let pane = $state<Pane>((page.url.searchParams.get('pane') as Pane) || 'tasks');

	$effect(() => {
		const requested = page.url.searchParams.get('pane');
		if (requested === 'tasks' || requested === 'agents' || requested === 'settings') {
			pane = requested;
		}
	});
	let selected = $state<string | null>(null);
	let detail = $state<TaskDetail | null>(null);
	let editing = $state<Task | null | 'new'>(null);
	let busy = $state(false);

	// The settings panel's working copy. Applied on save rather than on every
	// keystroke: a verification command is not valid halfway through being
	// typed, and saving each character would run a write per keystroke.
	let verificationText = $state('');
	let goalTitle = $state('');
	let goalDescription = $state('');

	const farm = $derived(farmStore.farm);
	const tasks = $derived(farmStore.tasks);
	const progress = $derived(farmStore.progress);
	const usable = $derived(farmStore.usable);
	/** The activity strip: everything except the transcript flood. */
	const activity = $derived(farmStore.activity.filter((event) => event.kind !== 'agentOutput'));

	/**
	 * Follow the open repository.
	 *
	 * The farm belongs to a repository, so opening one points the farm at it and
	 * closing one lets it go. The running agents are not stopped — they are in
	 * worktrees of their own and their work is on disk.
	 */
	$effect(() => {
		const path = repo.info?.path ?? null;
		if (path) {
			void farmStore.open(path);
		} else {
			farmStore.reset();
		}
	});

	// The settings fields are seeded from the farm when it arrives, and left
	// alone afterwards so typing is never overwritten by an event.
	let seeded = $state<string | null>(null);
	$effect(() => {
		if (farm && seeded !== farm.id) {
			seeded = farm.id;
			verificationText = text(farm.verification);
			goalTitle = farm.goal.title;
			goalDescription = farm.goal.description;
		}
	});

	$effect(() => {
		const id = selected;
		if (!id) {
			detail = null;
			return;
		}
		// Re-read whenever the task changes, so the panel follows the farm.
		void farmStore.tasks.find((task) => task.id === id)?.updatedMs;
		void api
			.taskDetail(id)
			.then((found) => (detail = found))
			.catch(() => (detail = null));
	});

	/** Run an action, keeping the screen honest about failure. */
	async function act(what: string, run: () => Promise<unknown>): Promise<void> {
		busy = true;
		try {
			await run();
			await farmStore.refresh();
		} catch (cause) {
			notice.failed(what, farmStore.fail(cause));
		} finally {
			busy = false;
		}
	}

	async function createFarm(): Promise<void> {
		await startFarm(goalTitle.trim(), goalDescription.trim());
	}

	/**
	 * Start a farm from a goal typed anywhere on the screen.
	 *
	 * The starter page and the Settings pane both ask for the same two fields,
	 * so they call the same function rather than each having their own idea of
	 * what a blank title means. The fields are seeded back into Settings so the
	 * goal a person just typed is the goal Settings shows.
	 */
	async function startFarm(title: string, description: string): Promise<void> {
		if (!title) return;
		goalTitle = title;
		goalDescription = description;
		await act('Could not start a farm', async () => {
			await api.create(title, description);
			// Verification is a property of a farm, so a command typed in
			// Settings before there was one had nowhere to go and was silently
			// dropped by the create. It is applied here instead, in the same
			// action, because the alternative is a screen that accepted a
			// setting and did not keep it.
			const commands = lines(verificationText);
			if (commands.length > 0) await api.configure({ verification: commands });
		});
		pane = 'tasks';
	}

	async function saveTask(draft: TaskDraft): Promise<void> {
		const target = editing;
		await act('Could not save the task', () =>
			target && target !== 'new' ? api.editTask(target.id, draft) : api.addTask(draft)
		);
		editing = null;
	}

	async function deleteTask(id: string): Promise<void> {
		const agreed = await dialog.confirm({
			title: `Delete ${id}`,
			body:
				"The task and its worktree are removed. Commits on its branch are kept: an unmerged " +
				'branch survives, and stays visible in the graph.',
			confirmLabel: 'Delete',
			danger: true
		});
		if (!agreed) return;
		await act('Could not delete the task', () => api.deleteTask(id));
		if (selected === id) selected = null;
	}

	async function saveSettings(): Promise<void> {
		await act('Could not save the farm', () =>
			api.configure({
				verification: lines(verificationText),
				goalTitle: goalTitle.trim(),
				goalDescription: goalDescription.trim()
			})
		);
		notice.ok('Farm settings saved');
	}

	async function writePolicy(): Promise<void> {
		try {
			const path = await api.writePolicy();
			notice.ok(`Wrote ${path}`);
			await farmStore.refresh();
		} catch (cause) {
			notice.failed('Could not write AGENTS.md', farmStore.fail(cause));
		}
	}

	function openDiff(branch: string): void {
		// The graph is the diff. Being a Git client is the advantage here.
		void goto(`/?ref=${encodeURIComponent(branch)}`);
	}
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">Farm</span>
			{#if farm}
				<Chip title="What the farm is doing">{FARM_STATUS_LABELS[farm.status]}</Chip>
				<span class="note">{progress.done} / {progress.total} done</span>
			{/if}
		</div>
		<div class="right">
			<Chip active={pane === 'tasks'} onclick={() => (pane = 'tasks')}>Tasks</Chip>
			<Chip active={pane === 'agents'} onclick={() => (pane = 'agents')}>
				Agents<span class="note">&nbsp;{usable.length}</span>
			</Chip>
			<Chip active={pane === 'settings'} onclick={() => (pane = 'settings')}>Settings</Chip>
		</div>
	</header>

	<div class="body">
		{#if repo.info === null}
			<!--
				A farm belongs to a repository, and this screen is now the first
				thing in the rail — so the state a new window opens in is this
				one, and "No repository open." was the whole of it. It says what
				a farm is for and offers the one action that makes the screen
				work, which is also the action the rail stops offering once a
				repository is open.
			-->
			<div class="empty">
				<div class="nothing">
					<h2 class="heading">A farm lives in a repository</h2>
					<p class="note">
						Open one and the farm follows it: its goal, its tasks and its agents are
						stored with that repository, and the branches its agents produce are the
						branches you read in the graph.
					</p>
					<div class="actions">
						<Btn primary onclick={() => repo.choose()}>Open repository…</Btn>
					</div>
				</div>
			</div>
		{:else if !farmStore.loaded && farmStore.loading}
			<div class="empty"><p class="note">Reading the farm…</p></div>
		{:else if pane === 'agents'}
			<section class="pane single">
				<div class="row-between">
					<h2 class="heading">Agents on this machine</h2>
					<Btn disabled={busy} onclick={() => act('Detection failed', api.detectAgents)}>
						Look again
					</Btn>
				</div>
				<p class="note">
					Spagitty runs these; it does not contain them. What is configured here is which of
					them this repository should use, and what each is good at.
				</p>

				{#each farmStore.agents as agent (agent.definition.id)}
					<AgentCard
						{agent}
						onsave={(definition) =>
							act('Could not save the agent', () => api.saveAgent(definition))}
						onremove={(id) => act('Could not forget the agent', () => api.removeAgent(id))}
					/>
				{/each}

				{#if farmStore.agents.length === 0}
					<p class="note">
						Nothing detected yet. Claude Code, Codex, Cursor and Oh My Pi are found on
						<span class="mono">PATH</span>.
					</p>
				{/if}

				{#if farmStore.undetected.length > 0}
					<p class="note">
						Not found: {farmStore.undetected.map((id) => PROVIDER_LABELS[id]).join(', ')}.
					</p>
				{/if}

				{#if farmStore.scoreboard.length > 0}
					<h2 class="heading">What has happened here</h2>
					<p class="note">
						Counted in this repository, not a claim about which model is better.
					</p>
					<div class="table">
						{#each farmStore.scoreboard as row (row.agent)}
							<div class="score">
								<span>{row.agent}</span>
								<span class="note">{row.completed} completed</span>
								<span class="note">{row.failed} failed</span>
								<span class="note">{row.changesRequested} sent back</span>
								<span class="note">
									{row.successRate === null
										? '—'
										: `${Math.round(row.successRate * 100)}%`}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{:else if pane === 'settings'}
			<section class="pane single">
				<h2 class="heading">{farm ? 'The goal' : 'Start a farm'}</h2>
				<label class="field">
					<span class="note">What is this farm for?</span>
					<input bind:value={goalTitle} placeholder="e.g. Implement dark mode support" />
				</label>
				<label class="field">
					<span class="note">Anything the agents should know</span>
					<textarea bind:value={goalDescription} rows="3" placeholder="Constraints, conventions, files to avoid"></textarea>
				</label>

				{#if !farm}
					<div class="actions">
						<Btn primary disabled={busy || goalTitle.trim().length === 0} onclick={createFarm}>
							Start a farm
						</Btn>
					</div>
				{/if}

				<h2 class="heading">How much it may do on its own</h2>
				<div class="levels">
					{#each AUTONOMY_LEVELS as level (level.id)}
						<button
							class="level"
							class:on={(farm ? farm.autonomy : 'semiAuto') === level.id}
							disabled={busy}
							onclick={() =>
								farm && act('Could not change the autonomy level', () =>
									api.configure({ autonomy: level.id })
								)}
						>
							<span class="level-name">{level.label}</span>
							<span class="note">{level.detail}</span>
						</button>
					{/each}
				</div>

				{#if farm}
					<h2 class="heading">Agents at once</h2>
					<div class="chips">
						{#each [1, 2, 3, 4] as count (count)}
							<Chip
								active={farm.maxParallel === count}
								disabled={busy}
								onclick={() =>
									act('Could not change the limit', () =>
										api.configure({ maxParallel: count })
									)}
							>
								{count}
							</Chip>
						{/each}
					</div>
				{/if}

				<h2 class="heading">Verification</h2>
				<p class="note">
					Run against every task's worktree before it can be accepted. With none, a task
					reaches review having been checked by nobody, and the screen says so.
				</p>
				<label class="field">
					<textarea bind:value={verificationText} rows="3" placeholder="cargo test"></textarea>
				</label>

				<h2 class="heading">Repository rules</h2>
				{#if farmStore.policy.sources.length > 0}
					<p class="note">
						Read from {farmStore.policy.sources.map((source) => source.path).join(', ')} and
						attached to every prompt.
					</p>
				{:else}
					<p class="note">
						This repository has no agent rules file, so agents follow whatever
						conventions they find in the code.
					</p>
					<div class="actions">
						<Btn disabled={busy} onclick={writePolicy}>Write a starter AGENTS.md</Btn>
					</div>
				{/if}

				{#if farm}
					<div class="actions">
						<Btn primary disabled={busy} onclick={saveSettings}>Save</Btn>
					</div>

					{#if farmStore.stale.length > 0}
						<h2 class="heading">Left behind</h2>
						<p class="note">
							{farmStore.stale.length}
							{farmStore.stale.length === 1 ? 'worktree' : 'worktrees'} from tasks this farm
							no longer has. Anything with uncommitted work is kept.
						</p>
						<div class="actions">
							<Btn disabled={busy} onclick={() => act('Could not clean up', api.sweep)}>
								Clean up
							</Btn>
						</div>
					{/if}
				{/if}
			</section>
		{:else if !farm}
			<section class="pane single wide">
				<Starter
					ready={usable}
					undetected={farmStore.undetected}
					policySources={farmStore.policy.sources.map((source) => source.path)}
					verificationCount={lines(verificationText).length}
					{busy}
					onstart={startFarm}
					ondetect={() => act('Detection failed', api.detectAgents)}
					onwritePolicy={writePolicy}
					onsettings={() => (pane = 'settings')}
				/>
			</section>
		{:else}
			<section class="pane list">
				<div class="row-between">
					<h2 class="heading">{farm.goal.title}</h2>
					<div class="chips">
						{#if farm.status === 'running'}
							<Btn disabled={busy} onclick={() => act('Could not pause', api.pause)}>Pause</Btn>
						{:else}
							<Btn
								primary
								disabled={busy || tasks.length === 0}
								onclick={() => act('Could not start the farm', api.start)}
							>
								Start
							</Btn>
						{/if}
						<Btn
							disabled={busy || usable.length === 0}
							title={usable.length === 0 ? 'No agent is available' : 'Ask an agent to plan'}
							onclick={() => act('Could not plan', () => api.plan(null))}
						>
							Plan it
						</Btn>
						<Btn disabled={busy} onclick={() => (editing = 'new')}>Add task</Btn>
					</div>
				</div>

				{#if farmStore.needsYou.length > 0}
					<p class="note attention">
						{farmStore.needsYou.length}
						{farmStore.needsYou.length === 1 ? 'task needs' : 'tasks need'} you.
					</p>
				{/if}

				{#if tasks.length === 0}
					<p class="note">
						No tasks yet. Write one, or ask an agent to break the goal into some.
					</p>
				{:else}
					<div class="tasks">
						{#each tasks as task (task.id)}
							<TaskRow
								{task}
								selected={selected === task.id}
								byId={farmStore.byId}
								onselect={(id) => {
									selected = id;
									editing = null;
								}}
							/>
						{/each}
					</div>
				{/if}
			</section>

			<section class="pane side">
				{#if editing !== null}
					{#key editing === 'new' ? 'new' : editing.id}
						<TaskEditor
							task={editing === 'new' ? null : editing}
							candidates={tasks.filter(
								(task) => editing === 'new' || task.id !== (editing as Task).id
							)}
							{busy}
							onsave={saveTask}
							oncancel={() => (editing = null)}
						/>
					{/key}
				{:else if detail}
					<TaskDetailPanel
						{detail}
						agents={usable}
						transcript={farmStore.transcript(detail.task.id)}
						{busy}
						onrun={(agent) =>
							act('Could not run the task', () => api.runTask(detail!.task.id, agent))}
						onstop={() => act('Could not stop the task', () => api.cancelTask(detail!.task.id))}
						onretry={() => act('Could not retry', () => api.retryTask(detail!.task.id))}
						onverify={() => act('Could not verify', () => api.verifyTask(detail!.task.id))}
						onreview={() => act('Could not request a review', () => api.reviewTask(detail!.task.id))}
						onmerge={() => act('Could not merge', () => api.mergeTask(detail!.task.id))}
						onready={() => act('Could not add to the plan', () => api.readyTask(detail!.task.id))}
						onedit={() => (editing = detail!.task)}
						ondelete={() => deleteTask(detail!.task.id)}
						onopenDiff={openDiff}
					/>
				{:else}
					<div class="empty"><p class="note">Pick a task.</p></div>
				{/if}
			</section>
		{/if}
	</div>

	{#if farm && activity.length > 0}
		<footer class="activity">
			{#each activity.slice(-6) as event, index (index)}
				<span class="line">{eventLine(event)}</span>
			{/each}
		</footer>
	{/if}
</div>

<style>
	.screen {
		flex: 1;
		min-width: 0;
		min-height: 0;
		height: 100%;
		width: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head {
		/* One line across the window with the rail's header. */
		min-height: var(--head-h);
		box-sizing: border-box;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 12px;
		background-color: var(--chrome-veil);
		border-bottom: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
		position: relative;
		z-index: 1;
	}

	.left,
	.right {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.body {
		flex: 1;
		min-height: 0;
		height: 100%;
		width: 100%;
		display: flex;
		overflow: hidden;
	}

	.pane {
		min-width: 0;
		min-height: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.single {
		flex: 1;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow-y: auto;
		padding: 16px 28px 24px 20px;
		scrollbar-gutter: stable;
	}

	.single > * {
		max-width: 76ch;
	}

	/* The starter page sets its own measure and centres itself, so the pane
	   must not clamp it to the Settings pane's column. */
	.wide > :global(*) {
		max-width: none;
	}

	.list {
		flex: 1;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow-y: auto;
		padding: 16px 24px 24px 16px;
		scrollbar-gutter: stable;
	}

	/* The detail column. Fixed-ish so the task list does not reflow every time
	   a longer note arrives — a list that jumps while an agent talks is
	   unreadable. */
	.side {
		flex: none;
		width: 30rem;
		max-width: 45%;
		height: 100%;
		min-height: 0;
		border-left: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* The no-repository state: a short column rather than one grey line. */
	.nothing {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
		max-width: 46ch;
	}

	.empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px 20px;
		text-align: center;
		flex: 1;
		height: 100%;
		min-height: 0;
	}

	.heading {
		margin: 0;
		font-size: var(--fs-ui);
		font-weight: 600;
	}

	.row-between {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}

	.chips,
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}

	.tasks {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.attention {
		color: var(--warn);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field input,
	.field textarea {
		width: 100%;
		padding: 5px 8px;
		border: 1px solid var(--line);
		border-radius: var(--r-field);
		background-color: var(--surface-veil);
		color: var(--ink);
		font: inherit;
		font-size: var(--fs-secondary);
	}

	.field textarea {
		font-family: var(--font-mono);
		font-size: var(--fs-mono);
		resize: vertical;
	}

	.levels {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	/*
	 * A row per level rather than a slider.
	 *
	 * A slider would say "more" and "less", and the thing that changes between
	 * levels is *where the human is*, which is a sentence and not a magnitude.
	 */
	.level {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1px;
		padding: 7px 10px;
		border: 1px solid var(--soft);
		border-radius: var(--r-row);
		background-color: transparent;
		text-align: left;
		transition:
			background-color var(--t-fast) var(--ease),
			border-color var(--t-fast) var(--ease);
	}

	.level:hover {
		background-color: var(--stripe);
	}

	.level.on {
		background-color: var(--selection);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.level-name {
		font-weight: 550;
	}

	.table {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.score {
		display: flex;
		gap: 10px;
		align-items: baseline;
		padding: 4px 8px;
		border-radius: var(--r-row);
		font-size: var(--fs-secondary);
	}

	.score:nth-child(odd) {
		background-color: var(--stripe);
	}

	/*
	 * The activity strip.
	 *
	 * Along the bottom rather than in a column, because it is the answer to
	 * "what just happened" and not something anybody reads top to bottom. Six
	 * lines: enough to catch what moved while you were looking elsewhere.
	 */
	.activity {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 6px 12px;
		border-top: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
		background-color: var(--chrome-veil);
		font-size: var(--fs-mono);
		color: var(--muted);
		max-height: 7.5em;
		overflow: hidden;
		margin-top: auto;
	}

	.line {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>

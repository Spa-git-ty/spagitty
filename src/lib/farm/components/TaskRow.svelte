<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import Chip from '$lib/ui/Chip.svelte';
	import TaskChip from './TaskChip.svelte';
	import { originLine, originMark, TASK_KIND_LABELS, waitingOn } from '../describe';
	import type { Task } from '../types';

	/**
	 * One task in the list (FEAT-073).
	 *
	 * The row answers the questions the plan's product principle asks — who is
	 * doing what, which branch, why is it waiting — without being opened. A
	 * list where every row needs a click to mean anything is a list of
	 * identifiers.
	 */
	interface Props {
		task: Task;
		selected?: boolean;
		byId: Map<string, Task>;
		/**
		 * Why the scheduler has not started this one, when it has an answer.
		 *
		 * From the backend, because the answer depends on path leases and agent
		 * availability that this screen cannot see (FEAT-075).
		 */
		blocked?: string | null;
		/** Shown while a plan is being accepted, so drafts can be picked. */
		pick?: { on: boolean; ontoggle: () => void } | null;
		/** How far down the outline this row sits (FEAT-076). */
		depth?: number;
		/** Finished children out of all of them, for a container. */
		progress?: { done: number; total: number } | null;
		onselect: (id: string) => void;
	}

	let {
		task,
		selected = false,
		byId,
		blocked = null,
		pick = null,
		depth = 0,
		progress = null,
		onselect
	}: Props = $props();

	/** A task something was cut out of. It is a heading, and it never runs. */
	const container = $derived(progress !== null && progress.total > 0);

	/**
	 * Whether an agent asked for this rather than a person (FEAT-078).
	 *
	 * Unmarked when it is the person's own, because most rows in most farms are
	 * theirs and a mark on everything marks nothing.
	 */
	const mark = $derived(originMark(task.origin));

	/**
	 * Why this row is not moving, in one line.
	 *
	 * The task's own note first — a verification failure or a reviewer's words
	 * are about *this* task and outrank anything general. Then the scheduler's
	 * reason, then the dependency the interface can work out for itself.
	 */
	const waiting = $derived(
		blocked ??
			(task.status === 'ready' || task.status === 'waiting' ? waitingOn(task, byId) : null)
	);

	/**
	 * A row that has just moved says so, for about a second (FEAT-074).
	 *
	 * A farm changes while nobody is looking at the row it changed. Without
	 * this, a list of eight tasks where one moved is a list of eight tasks: the
	 * chip is right, and there is nothing to draw the eye to *which* chip. The
	 * effect is a background wash that fades out — no movement, no size change,
	 * nothing that shifts the rows around it.
	 */
	let moved = $state(false);
	let previous = $state<string | null>(null);
	let clearing: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const status = task.status;
		if (previous === null) {
			// The first render is not a change: a list that flashes on arrival
			// is a list that flashes when you switch to the screen.
			previous = status;
			return;
		}
		if (previous === status) return;
		previous = status;
		moved = true;
		if (clearing) clearTimeout(clearing);
		clearing = setTimeout(() => (moved = false), 1100);
		return () => {
			if (clearing) clearTimeout(clearing);
		};
	});
</script>

<button
	class="row"
	class:moved
	class:container
	class:selected
	style="--depth: {depth}"
	onclick={() => onselect(task.id)}
	aria-current={selected ? 'true' : undefined}
>
	{#if pick}
		<!--
			A checkbox inside a button is not nested interaction: the click is
			stopped here, so picking a draft never also selects the row. Both
			are wanted, and they are different gestures.
		-->
		<input
			class="pick"
			type="checkbox"
			checked={pick.on}
			onclick={(event) => {
				event.stopPropagation();
				pick?.ontoggle();
			}}
			aria-label="Include {task.id} in the plan"
		/>
	{/if}
	<span class="id mono">
		{#if mark}<span class="mark" title={originLine(task.origin)}>{mark}</span>{/if}{task.id}
	</span>
	<span class="title">{task.title}</span>
	<span class="meta">
		{#if task.assignedAgent}
			<Chip title="Assigned to {task.assignedAgent}">{task.assignedAgent}</Chip>
		{/if}
		{#if container}
			<!--
				A container's progress is the only number on the row that is
				about other rows, so it reads as a fraction rather than a chip.
			-->
			<span class="progress note" title="Tasks cut out of this one">
				{progress?.done} of {progress?.total}
			</span>
		{:else}
			<Chip title="Kind of work">{TASK_KIND_LABELS[task.kind]}</Chip>
		{/if}
		<TaskChip status={task.status} title={task.note ?? undefined} />
	</span>
	{#if task.note}
		<span class="note reason">{task.note}</span>
	{:else if waiting}
		<span class="note reason">{waiting}</span>
	{/if}
</button>

<style>
	.row {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		grid-template-areas: 'pick id title meta' '. . reason reason';
		align-items: center;
		gap: 4px 10px;
		width: 100%;
		padding: 7px 10px;
		/* One indent per level of the outline, from the row's own custom
		   property, so nesting costs no extra element. After the shorthand,
		   which would otherwise reset it. */
		padding-left: calc(10px + var(--depth, 0) * 18px);
		border-radius: var(--r-row);
		border: 1px solid transparent;
		text-align: left;
		background-color: transparent;
		transition:
			background-color var(--t-fast) var(--ease),
			border-color var(--t-fast) var(--ease);
	}

	.row:hover {
		background-color: var(--stripe);
	}

	/* The wash a row gets when its status changes under the reader. */
	.moved {
		animation: moved 1.1s var(--ease);
	}

	@keyframes moved {
		0% {
			background-color: color-mix(in srgb, var(--accent) 22%, transparent);
		}
		100% {
			background-color: transparent;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.moved {
			animation: none;
		}
	}

	.selected {
		background-color: var(--selection);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
	}

	/* A heading over other work reads as one: its title carries the weight. */
	.container .title {
		font-weight: 600;
	}

	.progress {
		font-size: var(--fs-mono);
		white-space: nowrap;
	}

	.pick {
		grid-area: pick;
		margin: 0;
		accent-color: var(--accent);
	}

	.id {
		grid-area: id;
		color: var(--muted);
		font-size: var(--fs-mono);
		white-space: nowrap;
	}

	/* An agent asked for this one. Quiet: it is provenance, not a warning. */
	.mark {
		margin-right: 3px;
		color: var(--accent);
	}

	.title {
		grid-area: title;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		grid-area: meta;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.reason {
		grid-area: reason;
		font-size: var(--fs-mono);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>

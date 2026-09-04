<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import Chip from '$lib/ui/Chip.svelte';
	import TaskChip from './TaskChip.svelte';
	import { TASK_KIND_LABELS, waitingOn } from '../describe';
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
		onselect: (id: string) => void;
	}

	let { task, selected = false, byId, blocked = null, pick = null, onselect }: Props = $props();

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
	class:selected
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
	<span class="id mono">{task.id}</span>
	<span class="title">{task.title}</span>
	<span class="meta">
		{#if task.assignedAgent}
			<Chip title="Assigned to {task.assignedAgent}">{task.assignedAgent}</Chip>
		{/if}
		<Chip title="Kind of work">{TASK_KIND_LABELS[task.kind]}</Chip>
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

	.pick {
		grid-area: pick;
		margin: 0;
		accent-color: var(--accent);
	}

	.id {
		grid-area: id;
		color: var(--muted);
		font-size: var(--fs-mono);
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

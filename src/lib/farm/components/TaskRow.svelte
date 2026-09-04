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
		onselect: (id: string) => void;
	}

	let { task, selected = false, byId, onselect }: Props = $props();

	const waiting = $derived(
		task.status === 'ready' || task.status === 'waiting' ? waitingOn(task, byId) : null
	);
</script>

<button
	class="row"
	class:selected
	onclick={() => onselect(task.id)}
	aria-current={selected ? 'true' : undefined}
>
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
		grid-template-columns: auto 1fr auto;
		grid-template-areas: 'id title meta' '. reason reason';
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

	.selected {
		background-color: var(--selection);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
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

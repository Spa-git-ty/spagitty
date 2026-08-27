<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { ACTION_MEANINGS, ACTIONS, rebase } from '$lib/rebase/store.svelte';
	import Chip from '$lib/ui/Chip.svelte';

	/**
	 * The todo list, in plan order.
	 *
	 * Rows move by drag *and* by keyboard. The store owns the ordering; this
	 * component only reports intent, which is what makes the reordering unit
	 * testable without a pointer — and what makes the screen usable by someone
	 * who does not drag.
	 */
	let dragging = $state<string | null>(null);

	function keydown(id: string, event: KeyboardEvent) {
		if (!(event.altKey || event.metaKey)) return;
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			rebase.move(id, -1);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			rebase.move(id, 1);
		}
	}

	function drop(overId: string) {
		if (dragging === null || dragging === overId) return;
		const from = rebase.plan.findIndex((entry) => entry.id === dragging);
		const to = rebase.plan.findIndex((entry) => entry.id === overId);
		if (from !== -1 && to !== -1) rebase.move(dragging, to - from);
		dragging = null;
	}
</script>

<ol class="todo">
	{#each rebase.rows as { row, action } (row.id)}
		<li
			class="row"
			class:dropped={action === 'drop'}
			class:focused={row.id === rebase.focused}
			draggable="true"
			ondragstart={() => (dragging = row.id)}
			ondragover={(event) => event.preventDefault()}
			ondrop={() => drop(row.id)}
			ondragend={() => (dragging = null)}
		>
			<span
				class="handle"
				aria-hidden="true"
				title="Drag to reorder, or Alt+↑ / Alt+↓ from the row">⠿</span
			>

			<div class="actions">
				{#each ACTIONS as candidate (candidate)}
					<Chip
						active={candidate === action}
						title={ACTION_MEANINGS[candidate]}
						onclick={() => rebase.setAction(row.id, candidate)}
					>
						{candidate}
					</Chip>
				{/each}
			</div>

			<button
				class="body"
				onclick={() => rebase.focus(row.id)}
				onkeydown={(event) => keydown(row.id, event)}
			>
				<span class="sha mono note">{row.short}</span>
				<span class="summary" title={row.summary}>{row.summary}</span>
				<span class="who note">{row.authorName}</span>
			</button>
		</li>
	{/each}
</ol>

<style>
	.todo {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 6px;
		border: 1px solid var(--soft);
		border-radius: var(--r-panel);
		background-color: var(--surface-veil);
		box-shadow: var(--glass-rim), var(--shadow-1);
		min-width: 0;
	}

	/* A dropped commit stays visible and reads as spent: put back down on the
	   page — no lift, no light, dimmed — rather than drawn with a dashed
	   border, which read as "still being edited". */
	.row.dropped {
		color: var(--muted);
		background: none;
		box-shadow: none;
	}

	.row.focused {
		border-color: color-mix(in srgb, var(--accent) 60%, transparent);
		box-shadow: var(--sheen), var(--shadow-2);
	}

	.handle {
		flex: none;
		cursor: grab;
		color: var(--muted);
	}

	.actions {
		flex: none;
		display: flex;
		gap: 3px;
	}

	.body {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: baseline;
		gap: 8px;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		padding: 0;
	}

	.sha {
		flex: none;
	}

	.summary {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.who {
		flex: none;
	}
</style>

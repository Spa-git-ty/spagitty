<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { branches } from '$lib/branches/store.svelte';
	import { relativeTime } from '$lib/format';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import type { BranchRow } from '$lib/types';

	/**
	 * Branch, drift, last change, actions.
	 *
	 * Merged branches render dashed: the same device the rest of the application
	 * uses for "not settled", here meaning "nothing here is only here". Deleting
	 * them is FEAT-013, so the button says so rather than being hidden — a
	 * screen that shows what is safe to remove and no way to remove it should at
	 * least admit that is what it is doing.
	 */

	const DELETE_PENDING = 'Deleting branches is not built yet';

	const rows = $derived(branches.filtered);

	/** `↑2 ↓3`, or a plain dash when there is nothing to compare against. */
	function drift(row: BranchRow): string {
		if (row.ahead === null || row.behind === null) return '—';
		if (row.ahead === 0 && row.behind === 0) return 'level';
		const parts: string[] = [];
		if (row.ahead > 0) parts.push(`↑${row.ahead}`);
		if (row.behind > 0) parts.push(`↓${row.behind}`);
		return parts.join(' ');
	}

	function driftTitle(row: BranchRow): string {
		if (row.upstream === null) return 'No upstream configured';
		return `${row.ahead} ahead of and ${row.behind} behind ${row.upstream}, as of the last fetch`;
	}
</script>

<div class="table" role="table" aria-label="Branches">
	<div class="head" role="row">
		<span role="columnheader">branch</span>
		<span role="columnheader" class="drift">ahead / behind</span>
		<span role="columnheader" class="when">last change</span>
		<span role="columnheader" class="actions">actions</span>
	</div>

	{#each rows as row (row.fullName)}
		<div
			class="row"
			class:merged={row.merged && !row.current}
			class:current={row.current}
			role="row"
		>
			<div class="name" role="cell">
				<span class="mono mark" aria-hidden="true">{row.current ? '✔' : ' '}</span>
				<span class="label" title={row.fullName}>{row.name}</span>
				{#if row.upstream}
					<span class="mono muted up" title="Tracks {row.upstream}">→ {row.upstream}</span>
				{/if}
			</div>

			<div class="drift mono" role="cell" title={driftTitle(row)}>{drift(row)}</div>

			<div class="when note" role="cell" title={row.summary}>
				{relativeTime(row.time)} · {row.authorName}
			</div>

			<div class="actions" role="cell">
				{#if row.current}
					<span class="note">on this branch</span>
				{:else if row.kind === 'branch'}
					<Btn disabled={branches.busy} onclick={() => branches.checkout(row.name)}>
						Check out
					</Btn>
				{:else}
					<Btn
						disabled={branches.busy}
						title="Create a local branch that tracks {row.name}"
						onclick={() => {
							branches.setNewName(row.name.replace(/^[^/]+\//, ''));
							branches.setNewStart(row.name);
						}}
					>
						Branch from it
					</Btn>
				{/if}
				<Chip title={DELETE_PENDING}>Delete</Chip>
			</div>
		</div>
	{/each}

	{#if rows.length === 0}
		<p class="empty note">
			{branches.rows.length === 0
				? 'This repository has no branches yet.'
				: 'No branch matches those filters.'}
		</p>
	{/if}
</div>

<style>
	.table {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.head,
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 90px 220px 210px;
		align-items: center;
		gap: 10px;
		padding: 4px 12px;
	}

	.head {
		border-bottom: 1.5px solid var(--soft);
		font-size: var(--fs-secondary);
		color: var(--muted);
		position: sticky;
		top: 0;
		background: var(--bg);
		z-index: 1;
	}

	.row {
		border-bottom: 1.5px solid var(--soft);
		min-height: 30px;
	}

	/* Nothing on a merged branch is only there. Dashed says "spent", the same
	   way it says "not staged" on the Commit screen. */
	.row.merged {
		border-bottom-style: dashed;
		color: var(--muted);
	}

	.row.current {
		background: var(--selection);
	}

	.row:hover {
		background: var(--stripe);
	}

	.name {
		display: flex;
		align-items: baseline;
		gap: 6px;
		min-width: 0;
	}

	.mark {
		flex: none;
		width: 10px;
		color: var(--accent);
	}

	.label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.up {
		flex: none;
	}

	.drift {
		text-align: right;
	}

	.when {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
	}

	.empty {
		padding: 14px 12px;
	}
</style>

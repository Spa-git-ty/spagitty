<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { untrack } from 'svelte';
	import BranchTable from '$lib/branches/BranchTable.svelte';
	import { branches, FILTERS } from '$lib/branches/store.svelte';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';

	/**
	 * Every branch, how far it has drifted, and what is safe to forget.
	 *
	 * Nothing here removes anything. Checking out is refused by git if it would
	 * overwrite uncommitted work, and creating a branch adds a ref and nothing
	 * else — so the worst this screen can do is leave you somewhere you did not
	 * mean to be, which is one more checkout away from fixed.
	 */

	let generation: number | null = null;
	$effect(() => {
		const current = repo.generation;
		if (repo.info === null) return;
		if (generation === current) return;

		generation = current;
		untrack(() => {
			branches.clear();
			branches.load();
		});
	});

	const counts = $derived.by(() => {
		const rows = branches.rows;
		const local = rows.filter((r) => r.kind === 'branch').length;
		const remote = rows.length - local;
		return remote === 0
			? `${local} ${local === 1 ? 'branch' : 'branches'}`
			: `${local} local · ${remote} remote-tracking`;
	});

	/** Whether any counts on screen could be out of date. */
	const anyUpstream = $derived(branches.rows.some((row) => row.upstream !== null));
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">Branches</span>
			{#if branches.loaded}<span class="note">{counts}</span>{/if}
		</div>
		<div class="right">
			{#if branches.loading}<span class="note">Reading…</span>{/if}
			<Btn disabled={branches.busy} onclick={() => branches.load()}>Refresh</Btn>
		</div>
	</header>

	{#if repo.info === null}
		<div class="empty"><p class="note">No repository open.</p></div>
	{:else if branches.error}
		<div class="empty"><p class="note error">{branches.error}</p></div>
	{:else if !branches.loaded}
		<div class="empty"><span class="note">Reading the branches…</span></div>
	{:else}
		<div class="filters">
			<input
				class="field"
				type="text"
				placeholder="Filter by name"
				value={branches.query}
				oninput={(event) => branches.setQuery(event.currentTarget.value)}
				aria-label="Filter branches by name"
			/>
			{#each FILTERS as filter (filter)}
				<Chip
					active={branches.active.includes(filter)}
					onclick={() => branches.toggle(filter)}
					title={filter === 'mine'
						? 'Local branches — not "authored by me", which GitLumiere cannot know yet'
						: undefined}
				>
					{filter}
				</Chip>
			{/each}
			{#if branches.hidden > 0}
				<span class="note">{branches.hidden} hidden</span>
				<Chip onclick={() => branches.clearFilters()}>clear</Chip>
			{/if}
		</div>

		<BranchTable />

		<div class="create">
			<span class="note">New branch</span>
			<input
				class="field name"
				type="text"
				placeholder="name"
				value={branches.newName}
				oninput={(event) => branches.setNewName(event.currentTarget.value)}
				aria-label="New branch name"
			/>
			<span class="note">from</span>
			<input
				class="field start"
				type="text"
				placeholder={branches.current?.name ?? 'HEAD'}
				value={branches.newStart}
				oninput={(event) => branches.setNewStart(event.currentTarget.value)}
				aria-label="Start point for the new branch"
			/>
			<Chip
				active={branches.newCheckout}
				onclick={() => branches.setNewCheckout(!branches.newCheckout)}
			>
				check it out
			</Chip>
			<Btn
				primary
				disabled={branches.busy || branches.newName.trim() === ''}
				onclick={() => branches.create()}
			>
				Create
			</Btn>
		</div>
	{/if}

	<footer class="foot">
		{#if branches.writeError}
			<span class="note error">{branches.writeError}</span>
		{:else if anyUpstream}
			<span class="note">
				Ahead and behind are counted against the last fetch. Nothing on this screen
				talks to a network.
			</span>
		{:else}
			<span class="note">Nothing here deletes a branch.</span>
		{/if}
	</footer>
</div>

<style>
	.screen {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head,
	.foot,
	.filters,
	.create {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.head {
		justify-content: space-between;
		padding: 10px 12px;
		border-bottom: 1.5px solid var(--soft);
	}

	.filters {
		padding: 8px 12px;
		flex-wrap: wrap;
	}

	.create {
		padding: 8px 12px;
		border-top: 1.5px solid var(--soft);
	}

	.foot {
		padding: 8px 12px;
		border-top: 1.5px solid var(--soft);
	}

	.left,
	.right {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.title {
		font-size: var(--fs-title);
		white-space: nowrap;
	}

	.field {
		background: transparent;
		border: 1.5px solid var(--line);
		border-radius: var(--r-field);
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: var(--fs-secondary);
		padding: 3px 6px;
	}

	.field:focus {
		outline: none;
		border-color: var(--accent);
	}

	.field::placeholder {
		color: var(--placeholder);
	}

	.filters .field {
		width: 220px;
	}

	.name {
		width: 200px;
	}

	.start {
		width: 160px;
	}

	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 0 20px;
		text-align: center;
	}

	.error {
		color: var(--accent);
	}
</style>

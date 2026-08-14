<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import CommitDetail from '$lib/graph/CommitDetail.svelte';
	import CommitRows from '$lib/graph/CommitRows.svelte';
	import { graph } from '$lib/graph/store.svelte';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import Splitter from '$lib/ui/Splitter.svelte';

	const branch = $derived(repo.info?.head.branch ?? null);

	function openDiff(id: string) {
		goto(`/diff?commit=${id}`);
	}
</script>

<div class="screen">
	<div class="column">
		<header class="head">
			<div class="left">
				<span class="title">Graph</span>
				{#if branch}<Chip active>{branch}</Chip>{/if}
				<Chip active title="Every local and remote branch is walked">all branches</Chip>
			</div>
			<div class="right">
				<Chip active>lanes</Chip>
				<Chip title="Not built yet">flat list</Chip>
			</div>
		</header>

		{#if repo.info === null}
			<div class="empty">
				{#if repo.busy}
					<span class="note">Opening…</span>
				{:else}
					<p class="note">No repository open.</p>
					<Btn primary onclick={() => repo.choose()}>Open repository…</Btn>
					{#if repo.error}<p class="note error">{repo.error}</p>{/if}
				{/if}
			</div>
		{:else if graph.error && graph.count === 0}
			<div class="empty">
				<p class="note error">{graph.error}</p>
			</div>
		{:else if graph.count === 0}
			<div class="empty"><span class="note">Walking history…</span></div>
		{:else}
			<CommitRows onopen={openDiff} />
		{/if}

		<footer class="foot">
			<span class="note">drag a commit onto a branch to merge · right-click for the full menu</span>
			<span class="note">click a row to open its diff</span>
		</footer>
	</div>

	<Splitter panel="detail" label="Resize the detail panel" />
	<CommitDetail onopen={openDiff} />
</div>

<style>
	.screen {
		flex: 1;
		min-width: 0;
		display: flex;
		overflow: hidden;
	}

	.column {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 12px;
		border-bottom: 1.5px solid var(--soft);
		flex: none;
	}

	.left,
	.right {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.left {
		gap: 8px;
	}

	.title {
		font-size: var(--fs-title);
	}

	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.error {
		color: var(--accent);
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px;
		border-top: 1.5px solid var(--soft);
		flex: none;
	}
</style>

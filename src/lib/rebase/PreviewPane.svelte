<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { rebase } from '$lib/rebase/store.svelte';

	/**
	 * What the plan would produce.
	 *
	 * Recomputed after every edit rather than kept as its own model, so the plan
	 * and the picture of the plan cannot disagree about what would happen.
	 */
	const preview = $derived(rebase.preview);
</script>

<section class="preview">
	{#if !preview}
		<p class="note state">Choose an upstream to see what a rebase would produce.</p>
	{:else if preview.refusal}
		<p class="note error state">This plan cannot run: {preview.refusal}</p>
	{:else if preview.emptiesTheBranch}
		<p class="note state">
			This plan drops every commit. The branch would end up exactly at the upstream, with
			nothing of its own left.
		</p>
	{:else}
		<ol class="rows">
			{#each preview.rows as row (row.id)}
				<li class="row" class:risky={row.mayConflict}>
					<span class="sha mono note">{row.short}</span>
					<span class="summary" title={row.summary}>{row.summary}</span>
					{#if row.absorbed.length > 0}
						<span class="note tag">
							+{row.absorbed.length} squashed
						</span>
					{/if}
					{#if row.reworded}<span class="note tag">reworded</span>{/if}
					{#if row.mayConflict}<span class="note tag warn">may conflict</span>{/if}
				</li>
			{/each}
		</ol>
	{/if}

	{#if preview && preview.dropped.length > 0}
		<p class="note dropped">
			{preview.dropped.length}
			{preview.dropped.length === 1 ? 'commit' : 'commits'} dropped.
		</p>
	{/if}
</section>

<style>
	.preview {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 8px;
	}

	.state {
		margin: 0;
	}

	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.row {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 4px 6px;
		border: 1.5px solid var(--soft);
		border-radius: var(--r-field);
		min-width: 0;
	}

	.row.risky {
		border-color: var(--accent);
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

	.tag {
		flex: none;
		white-space: nowrap;
	}

	.tag.warn {
		color: var(--accent);
	}

	.dropped {
		margin: 8px 0 0;
	}
</style>

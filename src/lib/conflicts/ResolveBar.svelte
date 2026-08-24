<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { conflicts } from '$lib/conflicts/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';

	/**
	 * The ways out of one conflicted file (FEAT-016).
	 *
	 * Two rows, and the split is the point. The top row is about the *file*:
	 * take a whole side, edit it by hand, or say it is done. The rows under it
	 * are about one marker region each, because a real conflict is usually ours
	 * here and theirs there, and a screen that could only choose per file would
	 * send that case to a text editor.
	 *
	 * Regions are numbered from 1 for the reader and from 0 in the store, which
	 * is the only place those two numbers meet.
	 */

	const regions = $derived(conflicts.regions);
	const editing = $derived(conflicts.draft !== null);
</script>

<div class="resolve">
	<div class="row whole">
		<span class="note">
			{#if regions.length === 0}
				No conflict markers in this file
			{:else}
				{regions.length}
				{regions.length === 1 ? 'conflict' : 'conflicts'} in this file
			{/if}
		</span>

		<div class="acts">
			<Btn
				disabled={conflicts.busy}
				title="Keep the whole file as your branch had it"
				onclick={() => conflicts.take('ours')}
			>
				Take ours
			</Btn>
			<Btn
				disabled={conflicts.busy}
				title="Keep the whole file as the incoming side has it"
				onclick={() => conflicts.take('theirs')}
			>
				Take theirs
			</Btn>

			{#if editing}
				<Btn
					primary
					disabled={conflicts.busy || !conflicts.dirty}
					title="Write what is in the merged pane to the file"
					onclick={() => conflicts.save()}
				>
					Save
				</Btn>
				<Chip
					disabled={conflicts.busy}
					danger
					title="Throw the edit away and go back to what is on disk"
					onclick={() => conflicts.discardDraft()}
				>
					discard edit
				</Chip>
			{:else}
				<Btn
					disabled={conflicts.busy}
					title="Edit the merged result by hand"
					onclick={() => conflicts.edit()}
				>
					Edit
				</Btn>
			{/if}

			<Btn
				disabled={conflicts.busy}
				title="Stage this file as resolved — git add"
				onclick={() => conflicts.markResolved()}
			>
				Mark resolved
			</Btn>
		</div>
	</div>

	{#if regions.length > 0}
		<div class="row regions">
			{#each regions as region (region.index)}
				<span class="region">
					<span class="note mono">
						#{region.index + 1} · lines {region.startLine}–{region.endLine}
					</span>
					<Chip
						disabled={conflicts.busy}
						title="Keep our lines in this conflict only"
						onclick={() => conflicts.resolveRegion(region.index, 'ours')}
					>
						ours
					</Chip>
					<Chip
						disabled={conflicts.busy}
						title="Keep their lines in this conflict only"
						onclick={() => conflicts.resolveRegion(region.index, 'theirs')}
					>
						theirs
					</Chip>
				</span>
			{/each}

			{#if regions.length > 1}
				<span class="region all">
					<span class="note">all of them</span>
					<Chip disabled={conflicts.busy} onclick={() => conflicts.resolveRegion(null, 'ours')}>
						ours
					</Chip>
					<Chip disabled={conflicts.busy} onclick={() => conflicts.resolveRegion(null, 'theirs')}>
						theirs
					</Chip>
				</span>
			{/if}
		</div>
	{/if}

	{#if conflicts.writeError}
		<p class="note error">{conflicts.writeError}</p>
	{/if}
</div>

<style>
	.resolve {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px 12px;
		border-bottom: 1.5px solid var(--soft);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.whole {
		justify-content: space-between;
	}

	.acts {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	/* Wraps rather than scrolls: a file with a dozen conflicts is exactly when
	   the per-region buttons matter most, and hiding half of them off the right
	   edge would send that case back to a text editor. */
	.regions {
		flex-wrap: wrap;
		row-gap: 6px;
	}

	.region {
		display: flex;
		align-items: center;
		gap: 4px;
		padding-right: 10px;
	}

	.region.all {
		margin-left: auto;
	}
</style>

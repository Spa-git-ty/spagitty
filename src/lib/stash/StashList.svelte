<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { relativeTime } from '$lib/format';
	import { LANE_PITCH, LANE_X0, NODE_R, ROW_PITCH } from '$lib/metrics';
	import { stash } from '$lib/stash/store.svelte';
	import RefChip from '$lib/ui/RefChip.svelte';

	/**
	 * Stash entries, each drawn hanging off the commit it was made on.
	 *
	 * The lane is two rows per entry: the stash sits in lane 1 with the commit it
	 * came from in lane 0 below it, joined by an elbow — the same shape the graph
	 * draws for a branch, because that is exactly what a stash is.
	 *
	 * Drawn with the graph's metrics but not its canvas. The canvas exists to keep
	 * scrolling flat across a hundred thousand rows; a stash list is a dozen, and
	 * a handful of SVG paths is the smaller thing that reads the same.
	 */

	const entries = $derived(stash.entries);

	/** The lane column is two lanes wide plus the node's own radius. */
	const width = LANE_X0 + LANE_PITCH + NODE_R * 2;
	const height = ROW_PITCH * 2;

	const stashX = LANE_X0 + LANE_PITCH;
	const baseX = LANE_X0;
	const stashY = ROW_PITCH / 2;
	const baseY = ROW_PITCH + ROW_PITCH / 2;

	/** Leaves vertically, crosses, arrives vertically — the graph's elbow. */
	const elbow = `M ${stashX} ${stashY} C ${stashX} ${stashY + ROW_PITCH * 0.65}, ${baseX} ${baseY - ROW_PITCH * 0.58}, ${baseX} ${baseY}`;
</script>

<nav class="list" aria-label="Stash entries">
	{#each entries as entry (entry.id)}
		<button
			class="entry"
			class:selected={stash.selected?.id === entry.id}
			onclick={() => stash.select(entry.id)}
		>
			<svg class="lane" {width} {height} aria-hidden="true" viewBox="0 0 {width} {height}">
				<path d={elbow} fill="none" stroke="var(--lane-2)" stroke-width="2" />
				<circle cx={stashX} cy={stashY} r={NODE_R} fill="var(--lane-2)" />
				<circle cx={baseX} cy={baseY} r={NODE_R - 2} fill="var(--lane-1)" />
			</svg>

			<div class="text">
				<div class="top">
					<RefChip chip={{
						name: entry.name,
						kind: 'branch',
						current: false,
						local: true,
						remotes: [],
						// A stash's branch name is a label, not a live ref to compare.
						divergence: null
					}} />
					<span class="message" title={entry.message}>{entry.message}</span>
				</div>
				<div class="note base" title={entry.parentSummary}>
					on <span class="mono">{entry.parentShort}</span>
					{entry.parentSummary} · {relativeTime(entry.time)}
				</div>
			</div>
		</button>
	{/each}

	{#if entries.length === 0}
		<div class="empty note">
			<p>Nothing is stashed.</p>
			<p>
				A stash puts your uncommitted work aside so you can do something else, and
				keeps it until you bring it back.
			</p>
		</div>
	{/if}
</nav>

<style>
	/* A fixed column since FEAT-034 put a diff pane beside it: two flexible
	   columns next to each other leave the divider between them with nothing
	   to mean. */
	.list {
		width: var(--stash-entries-w);
		flex: none;
		min-width: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.entry {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 12px;
		text-align: left;
		width: 100%;
		border-bottom: 1.5px solid var(--soft);
	}

	.entry:hover {
		background: var(--stripe);
	}

	.entry.selected {
		background: var(--selection);
	}

	.lane {
		flex: none;
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.top {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.message,
	.base {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty {
		padding: 14px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 460px;
	}

	.empty p {
		margin: 0;
	}
</style>

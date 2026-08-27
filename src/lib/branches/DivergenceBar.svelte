<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { divergence, divergenceTitle, type Diverged } from '$lib/branches/divergence';

	/**
	 * How far a branch has drifted from its upstream, as a shape (FEAT-047).
	 *
	 * The branch sits at the centre line. Behind grows to the left, ahead grows
	 * to the right, both scaled against the widest divergence on screen so that
	 * rows can be compared without reading a number. The counts stay in the
	 * `title` and in the text beside the bar — the bar is the thing you see
	 * first, not the only thing there is.
	 */

	interface Props {
		row: Diverged;
		/** The widest single-sided distance on screen, from `widest()`. */
		max: number;
	}

	let { row, max }: Props = $props();

	const shape = $derived(divergence(row, max));
	const title = $derived(divergenceTitle(row));
</script>

{#if shape.state === 'none'}
	<span class="none note" {title}>no upstream</span>
{:else}
	<span class="bar" {title} role="img" aria-label={title}>
		<span class="half left">
			<span class="fill behind" style="width: {shape.behind}%"></span>
		</span>
		<span class="tick" class:level={shape.state === 'level'}></span>
		<span class="half right">
			<span class="fill ahead" style="width: {shape.ahead}%"></span>
		</span>
	</span>
	<span class="counts mono note" aria-hidden="true">
		{#if shape.state === 'level'}
			level
		{:else}
			{row.behind}/{row.ahead}
		{/if}
	</span>
{/if}

<style>
	.bar {
		display: flex;
		align-items: center;
		flex: none;
		width: 74px;
		height: 10px;
	}

	/*
	 * Each half is its own track, so a segment grows from the centre outwards
	 * rather than from the cell's edge inwards. Getting this the other way round
	 * puts the longest bars furthest from the line they are measured against.
	 */
	.half {
		display: flex;
		flex: 1;
		height: 4px;
		background: var(--soft);
		min-width: 0;
	}

	.half.left {
		justify-content: flex-end;
		border-radius: 2px 0 0 2px;
	}

	.half.right {
		justify-content: flex-start;
		border-radius: 0 2px 2px 0;
	}

	.fill {
		height: 100%;
	}

	.behind {
		background: var(--lane-2);
		border-radius: 2px 0 0 2px;
	}

	.ahead {
		background: var(--lane-1);
		border-radius: 0 2px 2px 0;
	}

	/* The branch's own position. It is always drawn, so "level" is a mark on a
	   line rather than an empty cell that could equally mean "not loaded". */
	.tick {
		flex: none;
		width: 1.5px;
		height: 10px;
		background: var(--muted);
	}

	.tick.level {
		background: var(--accent);
	}

	.counts {
		flex: none;
	}

	.none {
		font-style: italic;
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { graph } from '$lib/graph/store.svelte';
	import LaneCanvas from '$lib/graph/LaneCanvas.svelte';
	import { lanesNeeded, visibleRange } from '$lib/graph/lanes';
	import { isNotable, relativeTime } from '$lib/format';
	import { laneColumns, laneColumnWidth, LANE_COLUMNS_MIN, ROW_PITCH } from '$lib/metrics';
	import RefChip from '$lib/ui/RefChip.svelte';

	/**
	 * The virtualized commit list.
	 *
	 * One DOM node per *visible* row, positioned by transform inside a sizer
	 * that is `count * ROW_PITCH` tall. The lane canvas is a sibling pinned over
	 * the lane column and redrawn from the same scroll offset, so rows and lanes
	 * cannot drift apart: both are `index * ROW_PITCH`, from one constant.
	 */

	interface Props {
		onopen?: (id: string) => void;
	}

	let { onopen }: Props = $props();

	let scroller = $state<HTMLDivElement | null>(null);
	let scrollTop = $state(0);
	let viewportHeight = $state(0);

	/** The refs gutter shows at most this many chips before collapsing. */
	const MAX_CHIPS = 2;

	const range = $derived(visibleRange(scrollTop, viewportHeight, graph.count));

	const rows = $derived.by(() => {
		// Read the version so new batches re-render.
		void graph.version;
		const out = [];
		for (let i = range.first; i <= range.last; i++) {
			const row = graph.row(i);
			if (row) out.push(row);
		}
		return out;
	});

	// Pull more history when the viewport approaches the end of what is loaded.
	$effect(() => {
		if (range.last >= 0) graph.ensure(range.last);
	});

	/*
	 * Adaptive lane column.
	 *
	 * Five lanes is the design's width and covers ordinary repositories. Real
	 * histories go wider — git/git needs 11 lanes in a typical viewport — so the
	 * column grows to fit what is actually on screen, up to LANE_COLUMNS_MAX.
	 *
	 * It grows immediately but shrinks only after the narrower window has held
	 * for a moment. Without that, scrolling through varying history would make
	 * the message column jump left and right under the reader's eyes.
	 */
	const SHRINK_DELAY = 400;

	let columns = $state(LANE_COLUMNS_MIN);
	/** Untracked mirror, so the effect below doesn't depend on what it writes. */
	let currentColumns = LANE_COLUMNS_MIN;
	let shrinkTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		void graph.version;
		const needed = laneColumns(lanesNeeded(range.first, range.last, (i) => graph.row(i)));

		if (needed > currentColumns) {
			if (shrinkTimer) clearTimeout(shrinkTimer);
			shrinkTimer = null;
			currentColumns = needed;
			columns = needed;
		} else if (needed < currentColumns && shrinkTimer === null) {
			shrinkTimer = setTimeout(() => {
				shrinkTimer = null;
				currentColumns = needed;
				columns = needed;
			}, SHRINK_DELAY);
		}
	});

	$effect(() => () => {
		if (shrinkTimer) clearTimeout(shrinkTimer);
	});

	const laneWidth = $derived(laneColumnWidth(columns));

	function onscroll(event: Event) {
		scrollTop = (event.currentTarget as HTMLDivElement).scrollTop;
	}

	function select(index: number) {
		graph.select(index);
	}

	function scrollIntoView(index: number) {
		if (!scroller) return;
		const top = index * ROW_PITCH;
		const bottom = top + ROW_PITCH;
		if (top < scroller.scrollTop) {
			scroller.scrollTop = top;
		} else if (bottom > scroller.scrollTop + viewportHeight) {
			scroller.scrollTop = bottom - viewportHeight;
		}
	}

	function onkeydown(event: KeyboardEvent) {
		const current = graph.selectedIndex ?? -1;
		let next: number | null = null;

		switch (event.key) {
			case 'ArrowDown':
				next = Math.min(graph.count - 1, current + 1);
				break;
			case 'ArrowUp':
				next = Math.max(0, current - 1);
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = graph.count - 1;
				break;
			case 'Enter':
				if (current >= 0) {
					const row = graph.row(current);
					if (row) onopen?.(row.id);
				}
				return;
			default:
				return;
		}

		if (next !== null && next >= 0) {
			event.preventDefault();
			select(next);
			scrollIntoView(next);
		}
	}

	/** Time is shown only on the first row of each day, as a landmark. */
	function notableTime(index: number, time: number): string | null {
		const previous = graph.row(index - 1);
		return isNotable(time, previous?.time) ? relativeTime(time) : null;
	}
</script>

<div class="body">
	<div
		class="scroller"
		bind:this={scroller}
		bind:clientHeight={viewportHeight}
		{onscroll}
		{onkeydown}
		role="listbox"
		aria-label="Commits"
		aria-activedescendant={graph.selectedIndex === null
			? undefined
			: `commit-${graph.selectedIndex}`}
		tabindex="0"
	>
		<div class="sizer" style="height: {graph.count * ROW_PITCH}px">
			{#each rows as row (row.index)}
				{@const time = notableTime(row.index, row.time)}
				{@const extra = row.refs.length - MAX_CHIPS}
				<!--
					Keyboard handling lives on the listbox, not on each option —
					that is the ARIA pattern, and it is also the only workable
					one here: options are virtualized, so most of them do not
					exist as DOM nodes to receive a key event.
				-->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					id="commit-{row.index}"
					class="row"
					class:stripe={row.index % 2 === 1}
					class:selected={graph.selectedIndex === row.index}
					style="transform: translateY({row.index * ROW_PITCH}px)"
					role="option"
					aria-selected={graph.selectedIndex === row.index}
					tabindex="-1"
					onclick={() => select(row.index)}
					ondblclick={() => onopen?.(row.id)}
				>
					<div class="refs">
						{#each row.refs.slice(0, MAX_CHIPS) as chip (chip.kind + chip.name)}
							<RefChip {chip} />
						{/each}
						{#if extra > 0}
							<span class="more" title={row.refs.map((r) => r.name).join(', ')}>
								+{extra}
							</span>
						{/if}
					</div>

					<div class="lane-space" style="width: {laneWidth}px"></div>

					<div class="message">
						<span class="summary" title={row.summary}>{row.summary}</span>
						{#if time}<span class="mono muted when">{time}</span>{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<LaneCanvas
		scrollTop={scrollTop}
		first={range.first}
		last={range.last}
		width={laneWidth}
		height={viewportHeight}
		{columns}
	/>
</div>

<style>
	.body {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.scroller {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		outline: none;
	}

	.sizer {
		position: relative;
		width: 100%;
	}

	.row {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: var(--row-pitch);
		display: flex;
		align-items: center;
		cursor: pointer;
		contain: layout paint;
	}

	.row.stripe {
		background: var(--stripe);
	}

	.row:hover {
		background: var(--stripe);
	}

	.row.selected {
		background: var(--selection);
	}

	.refs {
		width: var(--refs-gutter-w);
		flex: none;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
		padding: 0 8px;
		overflow: hidden;
	}

	.more {
		border: 1.5px solid var(--soft);
		border-radius: var(--r-field);
		padding: 0 5px;
		font-family: var(--font-mono);
		font-size: var(--fs-mono);
		color: var(--muted);
		background: var(--bg);
		flex: none;
	}

	/* Reserves the lane column; the canvas overlays exactly this. Width is set
	   inline because it adapts to how wide the visible history actually is. */
	.lane-space {
		flex: none;
	}

	.message {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
		border-left: 1.5px solid var(--soft);
		height: 100%;
	}

	.summary {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.when {
		flex: none;
	}
</style>

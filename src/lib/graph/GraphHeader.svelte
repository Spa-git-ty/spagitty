<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { columns, type ColumnId } from '$lib/graph/columns.svelte';
	import Menu from '$lib/ui/Menu.svelte';
	import type { MenuItem } from '$lib/ui/menu';

	/**
	 * The graph's column header.
	 *
	 * Three things live here, and they are all direct manipulation of the same
	 * strip: right-click to choose which columns exist, drag a header to reorder
	 * them, drag a divider to resize. The alternative — a preferences page with
	 * a list of checkboxes — puts the control a long way from the thing it
	 * controls, and this is a header people are already pointing at.
	 *
	 * The Graph column's width is the exception: it is computed from how many
	 * lanes are on screen, so its divider is not draggable. That is stated in
	 * the divider's title rather than left as a divider that mysteriously does
	 * nothing.
	 */

	interface Props {
		/**
		 * How far the rows are scrolled sideways.
		 *
		 * The header is not inside the rows' scroller — it must stay visible
		 * while they scroll vertically — so it is moved by the same amount
		 * instead. One number, passed down, rather than two scrollers kept in
		 * step by listening to each other.
		 */
		scrollLeft?: number;
		/** Total width of the columns, or null while one of them fills. */
		tableWidth?: number | null;
		/** Width of the lane column right now, which the store cannot know. */
		laneWidth: number;
	}

	let { laneWidth, scrollLeft = 0, tableWidth = null }: Props = $props();

	const shown = $derived(columns.shown);

	let menu = $state<{ x: number; y: number } | null>(null);
	/** Index of the header being dragged, and the slot it would land in. */
	let dragging = $state<number | null>(null);
	let over = $state<number | null>(null);
	/** The resize in progress: which column, and where it started. */
	let resizing: { id: ColumnId; startX: number; startWidth: number } | null = null;
	let filtering = $state(false);

	function widthOf(id: ColumnId): number {
		return id === 'graph' ? laneWidth : columns.width(id);
	}

	function openMenu(event: MouseEvent) {
		event.preventDefault();
		menu = { x: event.clientX, y: event.clientY };
	}

	const menuItems = $derived<MenuItem[]>([
		{ heading: 'Columns' },
		...columns.catalogue.map(({ column, shown: on }) => ({
			id: column.id,
			label: `${on ? '✓ ' : '   '}${column.label}`,
			disabled: column.required && on,
			reason: column.required && on ? 'always shown' : undefined,
			run: () => columns.toggle(column.id)
		})),
		{ separator: true as const },
		{ id: 'reset', label: 'Reset columns', run: () => columns.reset() }
	]);

	/**
	 * A divider sizes the column on its **left**.
	 *
	 * That is the only model under which the boundary goes where the pointer
	 * goes: everything left of it grows, everything right of it shifts along,
	 * and the filling column takes up whatever is left.
	 *
	 * Two earlier attempts got this wrong in ways only a person dragging it
	 * could see. Sizing the column *after* the divider changed that column's
	 * width while its left edge stayed pinned, so the commit message column
	 * shrank from its **right** edge and left a growing gap before the detail
	 * panel — the boundary never moved. Skipping backwards past the graph column
	 * moved the boundary correctly but left the graph itself unresizable, so
	 * narrowing the table could not reclaim the empty half of a wide graph
	 * column.
	 *
	 * Every column is now sizable, including the graph, whose lanes compress
	 * into whatever width they are given (FEAT-039). So the answer is the
	 * simplest one: the column the divider sits on.
	 */
	function resizeTarget(index: number): ColumnId {
		return shown[index].id;
	}

	function startResize(event: PointerEvent, index: number) {
		const id = resizeTarget(index);

		event.preventDefault();
		event.stopPropagation();

		// Measured, not read from the store: the filling column's stored width
		// is 0 until it is dragged, and starting a drag from 0 would snap it to
		// its minimum before the pointer had moved a pixel.
		const handle = event.currentTarget as HTMLElement;
		const cell = handle.closest('.header')?.querySelector<HTMLElement>(`[data-column="${id}"]`);
		const startWidth = cell ? cell.getBoundingClientRect().width : columns.width(id);

		resizing = { id, startX: event.clientX, startWidth };
		handle.setPointerCapture(event.pointerId);
	}

	function moveResize(event: PointerEvent) {
		if (!resizing) return;
		columns.resize(resizing.id, resizing.startWidth + (event.clientX - resizing.startX));
	}

	function endResize(event: PointerEvent) {
		if (!resizing) return;
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		resizing = null;
	}

	function drop(to: number) {
		if (dragging !== null) columns.reorder(dragging, to);
		dragging = null;
		over = null;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="header-clip">
<div
	class="header"
	style="transform: translateX({-scrollLeft}px); {tableWidth === null
		? ''
		: `width: ${tableWidth}px`}"
	oncontextmenu={openMenu}
	role="row"
	tabindex="-1"
	aria-label="Graph columns"
>
	{#each shown as column, index (column.id)}
		{@const target = resizeTarget(index)}
		{@const sized = shown.find((c) => c.id === target)?.label}
		<div
			class="cell"
			data-column={column.id}
			class:fills={column.fills}
			class:dragging={dragging === index}
			class:over={over === index && dragging !== index}
			style={column.fills ? '' : `width: ${widthOf(column.id)}px`}
			role="columnheader"
			tabindex="-1"
			draggable="true"
			ondragstart={() => (dragging = index)}
			ondragend={() => {
				dragging = null;
				over = null;
			}}
			ondragover={(event) => {
				event.preventDefault();
				over = index;
			}}
			ondrop={(event) => {
				event.preventDefault();
				drop(index);
			}}
		>
			<span class="label note">{column.label}</span>

			{#if column.id === 'author'}
				<!--
					The filter lives in the Author column because that is what it
					filters, and it opens on click rather than always showing a
					field: a permanently open input in a header reads as a search
					box for the whole screen.
				-->
				{#if filtering || columns.author !== ''}
					<input
						class="filter"
						type="text"
						placeholder="filter…"
						spellcheck="false"
						aria-label="Filter by author"
						value={columns.author}
						oninput={(event) => columns.setAuthor(event.currentTarget.value)}
						onblur={() => (filtering = false)}
					/>
				{:else}
					<button
						class="filter-open"
						title="Filter by author"
						aria-label="Filter by author"
						onclick={() => (filtering = true)}
					>
						⌕
					</button>
				{/if}
			{/if}

			<!--
				Every column gets a divider, including the one that fills.
				Dragging the filling column is how it stops filling — before this
				it was the one column with no handle at all, which read as "this
				one is not resizable" rather than "this one takes what is left".
				Double-click hands the fill back.
			-->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="divider"
				class:last={index === shown.length - 1}
				title={`Resize ${sized} — double-click to reset`}
				onpointerdown={(event) => startResize(event, index)}
				onpointermove={moveResize}
				onpointerup={endResize}
				onpointercancel={endResize}
				ondblclick={() => columns.unsize(target)}
			></div>
		</div>
	{/each}
</div>
</div>

{#if menu}
	<Menu
		x={menu.x}
		y={menu.y}
		items={menuItems}
		label="Columns"
		onclose={() => (menu = null)}
	/>
{/if}

<style>
	/* The header is clipped rather than scrolled: it is moved by the rows'
	   scroll offset, so anything past the right edge must not paint outside. */
	.header-clip {
		overflow: hidden;
		flex: none;
	}

	.header {
		display: flex;
		align-items: stretch;
		height: calc(var(--row-pitch) + 2px);
		border-bottom: 1px solid var(--line);
		/* Chrome, so it is glass too — and it casts onto the rows under it,
		   which is what keeps a column heading readable while a hundred commits
		   scroll beneath it. */
		background-color: var(--chrome-veil);
		box-shadow:
			var(--glass-rim),
			0 1px 3px color-mix(in srgb, var(--umbra) 8%, transparent);
		font-size: var(--fs-secondary);
		font-weight: 550;
		letter-spacing: 0.02em;
		flex: none;
		user-select: none;
	}

	.cell {
		position: relative;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 8px;
		min-width: 0;
		flex: none;
		cursor: grab;
	}

	.cell.fills {
		flex: 1;
		min-width: 0;
	}

	.cell.dragging {
		opacity: 0.4;
	}

	.cell.over {
		box-shadow: inset 0 -2px 0 var(--accent);
	}

	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.divider {
		position: absolute;
		top: 0;
		right: -3px;
		width: 7px;
		height: 100%;
		cursor: col-resize;
		z-index: 1;
	}

	/*
	 * The last column's divider sits wholly inside it.
	 *
	 * Every other divider straddles the boundary between two columns, which is
	 * what makes it feel like it belongs to both. The last one has nothing on
	 * its right but the window edge, so the same -3px put a third of the grab
	 * area off-screen and the rest against the frame — the message column, which
	 * is last by default, could not be resized at all.
	 */
	.divider.last {
		right: 0;
	}

	.divider::after {
		content: '';
		position: absolute;
		left: 3px;
		top: 0;
		width: 1px;
		height: 100%;
		background: var(--soft);
	}

	/* Its line stays on the column's own edge rather than moving in with it. */
	.divider.last::after {
		left: auto;
		right: 0;
	}

	/* A hover hint, not an announcement: the divider is a handle, and lighting
	   it in the accent read as something breaking along the header's edge. */
	.divider:hover::after {
		background: var(--line);
	}



	.filter {
		font: inherit;
		font-size: var(--fs-secondary);
		color: inherit;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: var(--r-field);
		padding: 1px 5px;
		min-width: 0;
		width: 100%;
		outline: none;
	}

	.filter:focus {
		border-color: var(--accent);
	}

	.filter-open {
		font-size: var(--fs-ui);
		color: var(--muted);
		line-height: 1;
	}

	.filter-open:hover {
		color: var(--accent);
	}
</style>

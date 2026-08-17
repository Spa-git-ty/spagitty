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
		/** Width of the lane column right now, which the store cannot know. */
		laneWidth: number;
	}

	let { laneWidth }: Props = $props();

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

	function startResize(event: PointerEvent, id: ColumnId) {
		event.preventDefault();
		event.stopPropagation();
		resizing = { id, startX: event.clientX, startWidth: columns.width(id) };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
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
<div class="header" oncontextmenu={openMenu} role="row" tabindex="-1" aria-label="Graph columns">
	{#each shown as column, index (column.id)}
		<div
			class="cell"
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

			{#if !column.fills}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="divider"
					class:fixed={column.computed}
					title={column.computed
						? 'The graph column is sized to the lanes on screen'
						: `Resize ${column.label}`}
					onpointerdown={(event) => !column.computed && startResize(event, column.id)}
					onpointermove={moveResize}
					onpointerup={endResize}
					onpointercancel={endResize}
				></div>
			{/if}
		</div>
	{/each}
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
	.header {
		display: flex;
		align-items: stretch;
		height: calc(var(--row-pitch) + 2px);
		border-bottom: 1.5px solid var(--soft);
		background: var(--panel);
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
		box-shadow: inset 2px 0 0 var(--accent);
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

	.divider::after {
		content: '';
		position: absolute;
		left: 3px;
		top: 0;
		width: 1.5px;
		height: 100%;
		background: var(--soft);
	}

	.divider:hover::after {
		background: var(--accent);
	}

	.divider.fixed {
		cursor: default;
	}

	.divider.fixed:hover::after {
		background: var(--soft);
	}

	.filter {
		font: inherit;
		font-size: var(--fs-secondary);
		color: inherit;
		background: var(--bg);
		border: 1.5px solid var(--line);
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

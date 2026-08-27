<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { panels, PANELS, type PanelKey } from '$lib/panels.svelte';

	/**
	 * A draggable divider between two panels.
	 *
	 * It sits *on* the border rather than adding width, so resizing does not
	 * shift the layout by a few pixels the moment the component mounts. Pointer
	 * capture means a fast drag that leaves the element still tracks.
	 */

	interface Props {
		/** Which panel this divider resizes. */
		panel: PanelKey;
		label: string;
	}

	let { panel, label }: Props = $props();

	let dragging = $state(false);

	/**
	 * A collapsed rail is not resizable: dragging a strip of icons wider would
	 * produce a rail that is neither collapsed nor expanded, and the width it
	 * would be dragging is the one being held for when it expands again.
	 */
	const locked = $derived(panel === 'rail' && panels.railCollapsed);

	const width = $derived(panels.size(panel));

	/**
	 * Resize from the panel's own edge, not the window's.
	 *
	 * The panel being sized is always the splitter's immediate neighbour — the
	 * element before it for a left-anchored panel, after it for a right-anchored
	 * one — so its own box is the reference. Measuring from the window instead
	 * would work for the rail and break for anything nested inside a screen,
	 * where the rail's width sits between the window edge and the panel.
	 */
	function apply(clientX: number, element: HTMLElement) {
		const left = PANELS[panel].side === 'left';
		const neighbour = (left ? element.previousElementSibling : element.nextElementSibling) as
			| HTMLElement
			| null;

		const box = neighbour?.getBoundingClientRect();
		if (!box) return;

		panels.set(panel, left ? clientX - box.left : box.right - clientX);
	}

	function onpointerdown(event: PointerEvent) {
		if (event.button !== 0 || locked) return;
		event.preventDefault();
		dragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onpointermove(event: PointerEvent) {
		if (!dragging) return;
		apply(event.clientX, event.currentTarget as HTMLElement);
	}

	function onpointerup(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		panels.commit();
	}

	/** Keyboard resizing, so this is not a mouse-only control. */
	function onkeydown(event: KeyboardEvent) {
		if (locked) return;
		const step = event.shiftKey ? 32 : 8;
		let delta = 0;
		if (event.key === 'ArrowLeft') delta = -step;
		else if (event.key === 'ArrowRight') delta = step;
		else if (event.key === 'Home') {
			panels.reset();
			return;
		} else return;

		event.preventDefault();
		const towards = panel === 'rail' ? delta : -delta;
		if (panel === 'rail') panels.setRail(width + towards);
		else panels.setDetail(width + towards);
		panels.commit();
	}
</script>

<!--
	A focusable `separator` is a widget, not decoration: ARIA defines exactly
	this for a resize handle, and it is what makes the divider usable from the
	keyboard. The rule below assumes every separator is presentational.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="splitter {panel}"
	class:dragging
	class:locked
	role="separator"
	aria-orientation="vertical"
	aria-label={label}
	aria-valuenow={width}
	tabindex="0"
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	{onkeydown}
	ondblclick={() => {
		panels.reset();
	}}
	title={locked
		? 'The sidebar is collapsed — expand it to resize'
		: 'Drag to resize · double-click to reset'}
></div>

<style>
	.splitter.locked {
		cursor: default;
	}

	.splitter {
		flex: none;
		width: 7px;
		margin-inline: -4px;
		cursor: col-resize;
		z-index: 5;
		position: relative;
		background: transparent;
		touch-action: none;
	}

	/* A hairline that only shows while the divider is in use, so the resting
	   state stays exactly as designed. */
	.splitter::after {
		content: '';
		position: absolute;
		inset-block: 0;
		left: 50%;
		width: 2px;
		border-radius: var(--r-pill);
		transform: translateX(-50%);
		background: transparent;
		transition:
			background var(--t-fast) var(--ease),
			box-shadow var(--t-fast) var(--ease);
	}

	/*
	 * Hover is a hint, not an announcement.
	 *
	 * This used to light up in the accent with a halo behind it the moment the
	 * pointer came within four pixels — which is most of the time, because the
	 * divider sits against the rail everyone's cursor crosses. A glowing blue
	 * rule down the edge of the window reads as something being wrong with the
	 * rail rather than as a handle. It is a plain hairline under the pointer
	 * now, and takes the accent only while it is actually being dragged, or
	 * when the keyboard is on it and there is no cursor to say where you are.
	 */
	.splitter:hover::after {
		background: var(--line);
	}

	.splitter:focus-visible::after,
	.splitter.dragging::after {
		background: var(--accent);
		box-shadow: 0 0 6px var(--accent-glow);
	}

	.splitter:focus-visible {
		outline: none;
	}
</style>

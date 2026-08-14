<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { panels } from '$lib/panels.svelte';

	/**
	 * A draggable divider between two panels.
	 *
	 * It sits *on* the border rather than adding width, so resizing does not
	 * shift the layout by a few pixels the moment the component mounts. Pointer
	 * capture means a fast drag that leaves the element still tracks.
	 */

	interface Props {
		/** Which panel this divider resizes. */
		panel: 'rail' | 'detail';
		label: string;
	}

	let { panel, label }: Props = $props();

	let dragging = $state(false);

	const width = $derived(panel === 'rail' ? panels.rail : panels.detail);

	function apply(clientX: number, element: HTMLElement) {
		const app = element.closest('.app') as HTMLElement | null;
		const bounds = app?.getBoundingClientRect();
		if (!bounds) return;

		if (panel === 'rail') {
			// The rail is on the left: wider as the pointer moves right.
			panels.setRail(clientX - bounds.left);
		} else {
			// The detail panel is on the right: wider as the pointer moves left.
			panels.setDetail(bounds.right - clientX);
		}
	}

	function onpointerdown(event: PointerEvent) {
		if (event.button !== 0) return;
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
	title="Drag to resize · double-click to reset"
></div>

<style>
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
		width: 1.5px;
		transform: translateX(-50%);
		background: transparent;
		transition: background 0.12s ease;
	}

	.splitter:hover::after,
	.splitter:focus-visible::after,
	.splitter.dragging::after {
		background: var(--accent);
	}

	.splitter:focus-visible {
		outline: none;
	}
</style>

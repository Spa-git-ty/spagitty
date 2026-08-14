<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { appWindow, type ResizeEdge } from '$lib/chrome/window';

	/**
	 * Resize handles for an undecorated window.
	 *
	 * With `decorations: false` the compositor stops providing resize edges, so
	 * the window draws its own: a thin invisible frame of eight regions, with
	 * corners sitting above the sides so diagonal resizing wins where they meet.
	 */

	const SIDES: ResizeEdge[] = ['North', 'South', 'East', 'West'];
	const CORNERS: ResizeEdge[] = ['NorthWest', 'NorthEast', 'SouthWest', 'SouthEast'];

	function grab(edge: ResizeEdge) {
		return (event: MouseEvent) => {
			// Left button only; a right-click here should fall through.
			if (event.button !== 0) return;
			event.preventDefault();
			appWindow.startResize(edge);
		};
	}
</script>

{#each SIDES as edge (edge)}
	<div
		class="edge {edge.toLowerCase()}"
		onmousedown={grab(edge)}
		role="presentation"
		aria-hidden="true"
	></div>
{/each}

{#each CORNERS as edge (edge)}
	<div
		class="corner {edge.toLowerCase()}"
		onmousedown={grab(edge)}
		role="presentation"
		aria-hidden="true"
	></div>
{/each}

<style>
	.edge,
	.corner {
		position: fixed;
		z-index: 100;
	}

	/* Wide enough to hit reliably, narrow enough not to steal clicks from the
	   rail, the detail panel, or the scrollbar. */
	.north,
	.south {
		left: 4px;
		right: 4px;
		height: 4px;
		cursor: ns-resize;
	}

	.north {
		top: 0;
	}

	.south {
		bottom: 0;
	}

	.east,
	.west {
		top: 4px;
		bottom: 4px;
		width: 4px;
		cursor: ew-resize;
	}

	.west {
		left: 0;
	}

	.east {
		right: 0;
	}

	.corner {
		width: 10px;
		height: 10px;
		/* Above the sides, so a corner drag resizes both axes. */
		z-index: 101;
	}

	.northwest {
		top: 0;
		left: 0;
		cursor: nwse-resize;
	}

	.northeast {
		top: 0;
		right: 0;
		cursor: nesw-resize;
	}

	.southwest {
		bottom: 0;
		left: 0;
		cursor: nesw-resize;
	}

	.southeast {
		bottom: 0;
		right: 0;
		cursor: nwse-resize;
	}
</style>

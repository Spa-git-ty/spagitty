<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { graph } from '$lib/graph/store.svelte';
	import { drawLanes } from '$lib/graph/lanes';
	import { LANE_COLOR_COUNT, laneColorVar } from '$lib/metrics';
	import { scale } from '$lib/scale.svelte';
	import { theme } from '$lib/theme.svelte';

	interface Props {
		scrollTop: number;
		first: number;
		last: number;
		/** CSS pixel size of the lane column. */
		width: number;
		height: number;
		/** Lane columns the column is currently sized for. */
		columns: number;
		/** Rows to keep at full strength; null when no highlight is running. */
		highlight?: Set<number> | null;
		/** The ghost branch's rows, from a hovered commit to its nearest ref. */
		ghost?: number[];
		/** Rows carrying stashes, and how many each has. */
		stashes?: Map<number, number>;
	}

	let {
		scrollTop,
		first,
		last,
		width,
		height,
		columns,
		highlight = null,
		ghost = [],
		stashes
	}: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);

	/**
	 * Lane colors come from the stylesheet, so switching theme repaints without
	 * any color literal living in TypeScript. Re-resolved whenever the theme
	 * changes; `theme.id` is read here purely to create that dependency, and it
	 * names the family as well as the mode — switching family repaints too.
	 */
	function resolveColors(el: HTMLElement): { lanes: string[]; nodeText: string } {
		void theme.id;
		const styles = getComputedStyle(el);
		const lanes: string[] = [];
		for (let i = 0; i < LANE_COLOR_COUNT; i++) {
			lanes.push(styles.getPropertyValue(laneColorVar(i)).trim() || '#888');
		}
		return {
			lanes,
			nodeText: styles.getPropertyValue('--on-accent').trim() || '#fff'
		};
	}

	$effect(() => {
		const el = canvas;
		if (!el || width <= 0 || height <= 0) return;

		// Track everything the drawing depends on.
		void graph.version;
		void scrollTop;
		void first;
		void last;
		void columns;
		void theme.id;
		void highlight;
		void ghost;
		void stashes;
		// Row pitch and lane spacing both move with these, so a zoom is a
		// repaint even when nothing scrolled.
		const pitch = scale.pitch;
		const zoom = scale.zoom;

		const dpr = window.devicePixelRatio || 1;
		const pixelWidth = Math.round(width * dpr);
		const pixelHeight = Math.round(height * dpr);
		if (el.width !== pixelWidth) el.width = pixelWidth;
		if (el.height !== pixelHeight) el.height = pixelHeight;

		const ctx = el.getContext('2d');
		if (!ctx) return;

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const { lanes, nodeText } = resolveColors(el);
		drawLanes({
			ctx,
			width,
			height,
			scrollTop,
			first,
			last,
			row: (index) => graph.row(index),
			colors: lanes,
			nodeText,
			columns,
			pitch,
			zoom,
			highlight,
			ghost,
			stashes
		});
	});
</script>

<!--
	Purely presentational: the rows underneath own the clicks, so this must not
	swallow them.
-->
<canvas
	bind:this={canvas}
	class="lanes"
	style="width: {width}px; height: {height}px"
	aria-hidden="true"
></canvas>

<style>
	.lanes {
		position: absolute;
		top: 0;
		left: var(--refs-gutter-w);
		pointer-events: none;
		display: block;
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Accent border and text — the selected state of a chip group. */
		active?: boolean;
		/**
		 * Paints the chip as destructive, for an action that cannot be undone.
		 * Muted until hovered: a row of red chips down the pane would read as
		 * an error state rather than as a set of available actions.
		 */
		danger?: boolean;
		title?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let { active = false, danger = false, title, onclick, children }: Props = $props();
</script>

<svelte:element
	this={onclick ? 'button' : 'span'}
	class="chip"
	class:active
	class:danger
	{title}
	{onclick}
	role={onclick ? 'button' : undefined}
>
	{@render children()}
</svelte:element>

<style>
	.chip {
		border: 1.5px solid var(--soft);
		border-radius: var(--r-pill);
		padding: 1px 8px;
		font-size: var(--fs-mono);
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.chip.active {
		border-color: var(--accent);
		color: var(--accent);
	}

	button.chip:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	/* `--lane-3` is the palette's red, and what Notice already uses to mean
	   "this one is not routine". */
	button.chip.danger:hover {
		border-color: var(--lane-3);
		color: var(--lane-3);
	}
</style>

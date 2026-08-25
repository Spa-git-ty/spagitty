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
		/**
		 * Only meaningful with `onclick`. A chip that acts is a button and has
		 * to be able to go dead while a write is in flight, the same as `Btn` —
		 * otherwise the one control that deletes things stays pressable twice.
		 */
		disabled?: boolean;
		title?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let { active = false, danger = false, disabled = false, title, onclick, children }: Props = $props();
</script>

<svelte:element
	this={onclick ? 'button' : 'span'}
	class="chip"
	class:active
	class:danger
	{title}
	{onclick}
	disabled={onclick ? disabled : undefined}
	role={onclick ? 'button' : undefined}
>
	{@render children()}
</svelte:element>

<style>
	/*
	 * A chip is a small raised surface, not an outlined word.
	 *
	 * The wireframe drew it as a pill with a hairline around it, which is what
	 * every filter, every tag and every inline action in the application ended
	 * up looking like — a rectangle with text in it. It has a fill and a
	 * hairline of its own now, so a row of them reads as a row of *objects*,
	 * and the ones that act lift under the pointer.
	 */
	.chip {
		border: 1px solid var(--soft);
		border-radius: var(--r-pill);
		padding: 2px 9px;
		font-size: var(--fs-mono);
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background-color: var(--surface-veil);
		background-image: var(--glass-sheen);
		box-shadow: var(--glass-rim);
		transition:
			background var(--t-fast) var(--ease),
			border-color var(--t-fast) var(--ease),
			box-shadow var(--t-fast) var(--ease),
			transform var(--t-fast) var(--spring),
			color var(--t-fast) var(--ease);
	}

	button.chip:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	button.chip:active:not(:disabled) {
		transform: translateY(0) scale(0.97);
	}

	.chip:disabled {
		opacity: 0.4;
		box-shadow: none;
	}

	/* Selected, in a group where one of them is. The accent tint is what says
	   so — an accent *outline* alone is too easy to miss in a row of eight. */
	.chip.active {
		border-color: color-mix(in srgb, var(--accent) 62%, transparent);
		color: var(--accent);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--accent) 10%, var(--surface)),
			color-mix(in srgb, var(--accent) 18%, var(--surface))
		);
		box-shadow: var(--sheen), 0 1px 3px var(--accent-soft);
	}

	button.chip:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--accent) 62%, transparent);
		color: var(--accent);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--accent) 8%, var(--surface)),
			color-mix(in srgb, var(--accent) 14%, var(--surface))
		);
		box-shadow: var(--sheen), var(--shadow-1);
	}

	button.chip:active:not(:disabled) {
		background: var(--press);
		box-shadow: none;
	}

	/*
	 * Destructive. `--danger` is the palette's own red — it used to be
	 * `--lane-3`, which is the graph's third lane and is red only in Latte: in
	 * Mocha it is pink and in Dracula it is cyan, so a delete chip turned cyan
	 * on a theme somebody actually uses.
	 */
	button.chip.danger:hover:not(:disabled) {
		border-color: var(--danger);
		color: var(--danger);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--danger) 10%, var(--surface)),
			color-mix(in srgb, var(--danger) 18%, var(--surface))
		);
		box-shadow: var(--sheen), 0 1px 3px var(--danger-soft);
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		primary?: boolean;
		disabled?: boolean;
		title?: string;
		/**
		 * Turn the travelling glow off on a primary button.
		 *
		 * The glow marks *the* thing to do next, so a screen showing several
		 * primary buttons at once has more than one of them and none is the
		 * next thing. Set this on the ones that are merely filled.
		 */
		quiet?: boolean;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let {
		primary = false,
		disabled = false,
		quiet = false,
		title,
		onclick,
		children
	}: Props = $props();
</script>

<button class="btn" class:primary class:glow={primary && !quiet} {disabled} {title} {onclick}>
	{@render children()}
</button>

<style>
	.btn {
		border: 1.5px solid var(--line);
		border-radius: var(--r-button);
		padding: 3px 10px;
		font-size: var(--fs-secondary);
		display: inline-flex;
		align-items: center;
		gap: 5px;
		white-space: nowrap;
		background: transparent;
	}

	.btn:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}

	/*
	 * `:not(.glow)` on the fill, not on the colour.
	 *
	 * The glow paints its own background — an accent fill through `padding-box`
	 * with the conic gradient in the ring — and this rule is scoped, so without
	 * the exclusion it would win on specificity and flatten the effect back to
	 * a plain accent block. The text colour is shared, because it is the same
	 * either way.
	 */
	.btn.primary {
		color: var(--on-accent);
	}

	.btn.primary:not(.glow) {
		background: var(--accent);
		border-color: var(--accent);
	}

	/* The glow's ring is 2px where the plain border is 1.5px; take the half
	   pixel back out of the padding so both buttons are the same size. */
	.btn.glow {
		padding: 2.5px 9.5px;
	}

	.btn.primary:hover:not(:disabled) {
		color: var(--on-accent);
		opacity: 0.9;
	}

	.btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
</style>

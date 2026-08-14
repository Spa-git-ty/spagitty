<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Accent border and text — the selected state of a chip group. */
		active?: boolean;
		title?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let { active = false, title, onclick, children }: Props = $props();
</script>

<svelte:element
	this={onclick ? 'button' : 'span'}
	class="chip"
	class:active
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
</style>

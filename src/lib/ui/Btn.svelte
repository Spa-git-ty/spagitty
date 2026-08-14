<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		primary?: boolean;
		disabled?: boolean;
		title?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let { primary = false, disabled = false, title, onclick, children }: Props = $props();
</script>

<button class="btn" class:primary {disabled} {title} {onclick}>
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

	.btn.primary {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
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

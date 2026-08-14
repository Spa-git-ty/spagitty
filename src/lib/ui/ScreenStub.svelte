<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Placeholder body for a screen that has a route and a rail entry but no
	 * implementation yet. It states what the screen will be rather than
	 * pretending to be it — a fake-looking half-built screen is harder to read
	 * than an honest empty one.
	 */
	interface Props {
		title: string;
		/** What this screen does, in one line, from the handoff. */
		purpose: string;
		/** The pieces it will have, so the stub documents the spec. */
		parts?: string[];
		actions?: Snippet;
	}

	let { title, purpose, parts = [], actions }: Props = $props();
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">{title}</span>
		</div>
		{#if actions}<div class="right">{@render actions()}</div>{/if}
	</header>

	<div class="body">
		<div class="card">
			<p class="purpose">{purpose}</p>
			{#if parts.length}
				<ul class="parts">
					{#each parts as part (part)}
						<li>{part}</li>
					{/each}
				</ul>
			{/if}
			<p class="note">Not built yet.</p>
		</div>
	</div>
</div>

<style>
	.screen {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 12px;
		border-bottom: 1.5px solid var(--soft);
		flex: none;
	}

	.title {
		font-size: var(--fs-title);
	}

	.body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 14px 12px;
	}

	.card {
		border: 1.5px dashed var(--soft);
		border-radius: var(--r-field);
		padding: 14px;
		max-width: 560px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.purpose {
		margin: 0;
	}

	.parts {
		margin: 0;
		padding-left: 16px;
		color: var(--muted);
		font-size: var(--fs-secondary);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.note {
		margin: 0;
		font-size: var(--fs-secondary);
		color: var(--muted);
	}
</style>

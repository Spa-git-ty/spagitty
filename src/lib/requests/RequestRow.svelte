<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { relativeTime } from '$lib/format';
	import { CHECK_LABELS, REVIEW_LABELS, requests } from '$lib/requests/store.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import type { PullRequest } from '$lib/types';

	/**
	 * One pull request.
	 *
	 * The vocabulary is host-agnostic throughout: "pull request", never a
	 * brand. The hosting service is a detail, not the language.
	 */
	interface Props {
		request: PullRequest;
		/** Rows waiting on somebody else render dashed. */
		waiting?: boolean;
	}

	let { request, waiting = false }: Props = $props();

	const open = $derived(request.id === requests.openId);
</script>

<li class="row" class:waiting class:open>
	<button class="body" onclick={() => requests.select(request.id)}>
		<span class="number mono note">#{request.number}</span>
		<span class="title" title={request.title}>{request.title}</span>

		<span class="chips">
			{#if request.draft}<Chip>draft</Chip>{/if}
			<Chip active={request.review === 'changesRequested'}>
				{REVIEW_LABELS[request.review]}
			</Chip>
			{#if request.checks}
				<Chip active={request.checks === 'failing'}>{CHECK_LABELS[request.checks]}</Chip>
			{/if}
		</span>

		<span class="who note">{request.authorName}</span>
		<span class="when note">{relativeTime(request.updated)}</span>
	</button>

	{#if request.needsYou && request.needsYouBecause}
		<div class="because note">{request.needsYouBecause}</div>
	{/if}
</li>

<style>
	.row {
		list-style: none;
		background-color: var(--surface-veil);
		border: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
		border-radius: var(--r-panel);
		box-shadow: var(--glass-rim), var(--shadow-1);
		padding: 5px 9px;
		transition:
			box-shadow var(--t-fast) var(--ease),
			border-color var(--t-fast) var(--ease);
	}

	.row:hover {
		box-shadow: var(--glass-rim), var(--shadow-2);
		transform: translateY(-1px);
	}

	/*
	 * Waiting on somebody else. It used to be a dashed border — the wireframe's
	 * word for "not settled" — which on a screen full of them read as a screen
	 * full of unfinished boxes. It is a card that has not been lifted instead:
	 * flat on the page, dimmed, no shadow.
	 */
	.row.waiting {
		background: none;
		box-shadow: none;
		color: var(--muted);
	}

	.row.waiting:hover {
		box-shadow: var(--shadow-1);
	}

	/* The one being read. */
	.row.open {
		background: var(--selection);
		border-color: color-mix(in srgb, var(--accent) 45%, var(--soft));
		box-shadow: var(--sheen), var(--shadow-1);
	}

	.body {
		width: 100%;
		display: flex;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		padding: 0;
	}

	.number {
		flex: none;
	}

	.title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chips {
		flex: none;
		display: flex;
		gap: 4px;
	}

	.who,
	.when {
		flex: none;
		white-space: nowrap;
	}

	.because {
		margin-top: 2px;
	}
</style>

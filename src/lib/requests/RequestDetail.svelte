<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { relativeTime } from '$lib/format';
	import { CHECK_LABELS, REVIEW_LABELS, requests } from '$lib/requests/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';

	/**
	 * The open pull request.
	 *
	 * Every action here is disabled and names FEAT-017, because reviewing,
	 * approving and merging all need a host and GitLord talks to none. A
	 * control that looks live and does nothing is worse than one that explains
	 * itself.
	 */
	const request = $derived(requests.open);
</script>

<section class="detail">
	{#if !request}
		<p class="note state">Open a pull request to read it.</p>
	{:else}
		<header class="top">
			<span class="number mono">#{request.number}</span>
			{#if request.draft}<Chip>draft</Chip>{/if}
		</header>

		<h2 class="title">{request.title}</h2>

		<div class="who note">{request.authorName} · {relativeTime(request.updated)}</div>
		<div class="branches note mono">
			{request.sourceBranch} → {request.targetBranch}
		</div>

		<div class="chips">
			<Chip active={request.review === 'changesRequested'}>
				{REVIEW_LABELS[request.review]}
			</Chip>
			{#if request.checks}
				<Chip active={request.checks === 'failing'}>{CHECK_LABELS[request.checks]}</Chip>
			{/if}
			{#if request.mergeable === false}<Chip active>conflicts</Chip>{/if}
		</div>

		<div class="counts note">
			{request.changedFiles}
			{request.changedFiles === 1 ? 'file' : 'files'} · +{request.added} −{request.removed}
		</div>

		<footer class="actions">
			<Btn disabled title="Reviewing needs a connected account — FEAT-017.">Review</Btn>
			<Btn disabled title="Merging needs a connected account — FEAT-017.">Merge</Btn>
		</footer>
	{/if}
</section>

<style>
	.detail {
		width: var(--requests-detail-w);
		flex: none;
		min-height: 0;
		overflow: auto;
		padding: 8px;
		border-left: 1.5px solid var(--soft);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.state {
		margin: 0;
	}

	.top {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.title {
		margin: 0;
		font-size: var(--fs-body);
		font-weight: inherit;
	}

	.branches {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chips {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.actions {
		display: flex;
		gap: 6px;
		margin-top: auto;
		padding-top: 6px;
	}
</style>

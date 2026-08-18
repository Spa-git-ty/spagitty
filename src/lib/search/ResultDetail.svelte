<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { clockTime, relativeTime } from '$lib/format';
	import { search } from '$lib/search/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	/**
	 * The opened commit, beside the results rather than instead of them.
	 *
	 * "Opening a commit" here means reading it — message, people, and the files
	 * it touched. Its hunks are a different question and a different screen,
	 * which is what `Alt+Enter` is for.
	 */
	interface Props {
		ondiff?: (id: string) => void;
	}

	let { ondiff }: Props = $props();

	const detail = $derived(search.detail);
</script>

<section class="detail">
	{#if search.detailError}
		<p class="note error state">{search.detailError}</p>
	{:else if !detail}
		<p class="note state">Open a result to read it.</p>
	{:else}
		<header class="top">
			<span class="sha mono">{detail.short}</span>
			<Btn onclick={() => ondiff?.(detail.id)}>Open full diff →</Btn>
		</header>

		<h2 class="summary">{detail.summary}</h2>
		{#if detail.body}<p class="body note">{detail.body}</p>{/if}

		<div class="who note">
			{detail.authorName} &lt;{detail.authorEmail}&gt;
		</div>
		<div class="when note">
			{relativeTime(detail.authorTime)} · {clockTime(detail.authorTime)}
		</div>

		<div class="files note">
			{detail.files.length}
			{detail.files.length === 1 ? 'file' : 'files'}
		</div>
		<ul class="filelist mono">
			{#each detail.files as file (file.path)}
				<li title={file.path}>{file.path}</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.detail {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.state {
		margin: 0;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.summary {
		margin: 4px 0 0;
		font-size: var(--fs-body);
		font-weight: inherit;
	}

	.body {
		margin: 0;
		white-space: pre-wrap;
	}

	.files {
		margin-top: 6px;
	}

	.filelist {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--fs-secondary);
	}

	/* The tail of a path identifies the file, so the head takes the ellipsis —
	   the same rule every other file list here follows. */
	.filelist li {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		direction: rtl;
		text-align: left;
	}
</style>

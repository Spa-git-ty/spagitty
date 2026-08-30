<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { fileHistory } from './store.svelte';
	import { graph } from '$lib/graph/store.svelte';
	import { relativeTime } from '$lib/format';
	import { goto } from '$app/navigation';
	import { notice } from '$lib/ui/notice.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	let { onclose }: { onclose?: () => void } = $props();

	const path = $derived(fileHistory.path);
	const entries = $derived(fileHistory.entries);
	const blame = $derived(fileHistory.blame);
	const loading = $derived(fileHistory.loading);
	const error = $derived(fileHistory.error);
	const highlighted = $derived(fileHistory.highlightedCommit);

	async function jumpToGraph(commitSha: string): Promise<void> {
		graph.want(commitSha);
		await goto('/');
		if (onclose) onclose();
	}

	async function copyPath(): Promise<void> {
		if (!path) return;
		try {
			await navigator.clipboard.writeText(path);
			notice.ok('Path copied to clipboard');
		} catch (err) {
			notice.failed('Could not copy path', err);
		}
	}
</script>

<div class="history-view" aria-label="File History and Blame">
	<header class="header">
		<div class="header-left">
			<span class="path mono" title={path ?? ''}>{path ?? 'No file selected'}</span>
			{#if path}
				<button class="copy-btn" title="Copy path" onclick={copyPath}>📋</button>
			{/if}
			{#if entries.length > 0}
				<span class="count-badge">{entries.length} commits</span>
			{/if}
		</div>
		<div class="header-right">
			{#if onclose}
				<Btn onclick={onclose}>Close</Btn>
			{/if}
		</div>
	</header>

	{#if loading}
		<div class="loading-state">Loading file history and blame…</div>
	{:else if error}
		<div class="error-state" role="alert">{error}</div>
	{:else if !path}
		<div class="empty-state">Select a file to inspect its history and blame.</div>
	{:else}
		<div class="content-split">
			<!-- Left: Commit Timeline -->
			<aside class="timeline-pane" aria-label="Commit timeline">
				<div class="pane-header">Commits ({entries.length})</div>
				<div class="timeline-list">
					{#each entries as entry (entry.commit)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="timeline-card"
							class:highlighted={highlighted === entry.commit}
							onmouseenter={() => fileHistory.setHighlight(entry.commit)}
							onmouseleave={() => fileHistory.setHighlight(null)}
						>
							<div class="card-row-top">
								<span class="author">{entry.authorName}</span>
								<span class="time">{relativeTime(entry.time)}</span>
							</div>
							<div class="summary">{entry.summary}</div>
							<div class="card-row-bottom">
								<span class="sha mono">{entry.short}</span>
								<button
									type="button"
									class="graph-jump"
									onclick={() => void jumpToGraph(entry.commit)}
								>View on Graph →</button>
							</div>
						</div>
					{/each}
				</div>
			</aside>

			<!-- Right: Blame Gutter + File Content -->
			<main class="blame-pane" aria-label="Line attribution">
				{#if blame?.refused}
					<div class="refused-message">
						{#if blame.refused === 'binary'}
							Binary file cannot be blamed.
						{:else if blame.refused === 'tooLarge'}
							File is too large to blame.
						{:else if blame.refused === 'notAFile'}
							Path is not a regular file in this revision.
						{:else if blame.refused === 'empty'}
							File is empty.
						{/if}
					</div>
				{:else if blame && blame.lines.length > 0}
					<div class="blame-table mono">
						{#each blame.lines as line (line.line)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="blame-row"
								class:row-highlight={highlighted === line.commit}
								onmouseenter={() => fileHistory.setHighlight(line.commit)}
								onmouseleave={() => fileHistory.setHighlight(null)}
							>
								<div class="gutter-num">{line.line}</div>
								<div class="gutter-meta" title="{line.authorName} • {line.summary}">
									<span class="meta-author">{line.authorName}</span>
									<span class="meta-sha">{line.short}</span>
									<span class="meta-time">{relativeTime(line.time)}</span>
								</div>
								<div class="code-line">{line.text}</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty-state">No line attribution available.</div>
				{/if}
			</main>
		</div>
	{/if}
</div>

<style>
	.history-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-1, #1e1e20);
		color: var(--fg, #eee);
		overflow: hidden;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: var(--bg-2, #18181a);
		border-bottom: 1px solid var(--line, #333);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 8px;
		overflow: hidden;
	}

	.path {
		font-size: 13px;
		font-weight: 500;
		color: var(--fg, #eee);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 450px;
	}

	.copy-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 12px;
		padding: 2px 4px;
	}

	.count-badge {
		background: var(--bg-3, #2a2a2d);
		color: var(--dim, #aaa);
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 10px;
	}

	.content-split {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.timeline-pane {
		width: 320px;
		min-width: 260px;
		background: var(--bg-2, #141416);
		border-right: 1px solid var(--line, #333);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.pane-header {
		padding: 8px 12px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--dim, #888);
		border-bottom: 1px solid var(--line, #28282c);
	}

	.timeline-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px;
	}

	.timeline-card {
		background: var(--bg-3, #202024);
		border: 1px solid var(--line, #2c2c30);
		border-radius: 6px;
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		cursor: default;
		transition: border-color 0.15s, background 0.15s;
	}

	.timeline-card:hover,
	.timeline-card.highlighted {
		border-color: var(--accent, #eeb04d);
		background: var(--bg-hover, #28282e);
	}

	.card-row-top {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
	}

	.author {
		font-weight: 500;
		color: var(--fg, #eee);
	}

	.time {
		font-size: 11px;
		color: var(--dim, #888);
	}

	.summary {
		font-size: 12px;
		color: var(--dim, #bbb);
		line-height: 1.3;
	}

	.card-row-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 2px;
	}

	.sha {
		font-size: 11px;
		color: var(--accent, #eeb04d);
	}

	.graph-jump {
		background: transparent;
		border: none;
		font-size: 11px;
		color: var(--dim, #888);
		cursor: pointer;
		padding: 0;
	}

	.graph-jump:hover {
		color: var(--accent, #eeb04d);
	}

	.blame-pane {
		flex: 1;
		overflow: auto;
		background: var(--bg-1, #1a1a1c);
	}

	.blame-table {
		display: flex;
		flex-direction: column;
		font-size: 12px;
		line-height: 20px;
	}

	.blame-row {
		display: flex;
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
		transition: background 0.1s;
	}

	.blame-row:hover,
	.blame-row.row-highlight {
		background: rgba(238, 176, 77, 0.12);
	}

	.gutter-num {
		width: 45px;
		text-align: right;
		padding-right: 8px;
		color: var(--dim, #666);
		user-select: none;
		flex-shrink: 0;
	}

	.gutter-meta {
		width: 220px;
		padding: 0 8px;
		color: var(--dim, #888);
		background: rgba(0, 0, 0, 0.15);
		border-right: 1px solid var(--line, #28282c);
		display: flex;
		gap: 6px;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		flex-shrink: 0;
		font-size: 11px;
	}

	.meta-author {
		color: var(--fg, #ccc);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta-sha {
		color: var(--accent, #eeb04d);
	}

	.meta-time {
		color: var(--dim, #666);
	}

	.code-line {
		padding: 0 12px;
		white-space: pre;
		color: var(--fg, #eee);
		flex: 1;
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, monospace;
	}

	.loading-state,
	.empty-state,
	.refused-message {
		padding: 48px;
		text-align: center;
		color: var(--dim, #888);
		font-size: 13px;
	}

	.error-state {
		padding: 16px;
		color: var(--danger, #e5534b);
		background: rgba(229, 83, 75, 0.1);
		margin: 16px;
		border-radius: 6px;
		font-size: 13px;
	}
</style>

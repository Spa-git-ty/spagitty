<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { changes } from '$lib/changes/store.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import type { DiffLine } from '$lib/types';

	/**
	 * The hunks of the selected file, each with the one action that makes sense
	 * for the side it is on: stage it, or take it back out.
	 *
	 * Deliberately unified only. Split is for reading a commit someone else
	 * wrote; here the question is "does this hunk belong in the commit", and one
	 * column keeps the answer next to the button.
	 */

	const file = $derived(changes.file);
	const side = $derived(changes.selection?.side ?? 'unstaged');

	function sign(line: DiffLine): string {
		if (line.origin === 'added') return '+';
		if (line.origin === 'removed') return '−';
		return ' ';
	}
</script>

<div class="pane">
	{#if changes.fileError}
		<div class="pad note error">{changes.fileError}</div>
	{:else if changes.selection === null}
		<div class="pad note">Select a file to see what changed in it.</div>
	{:else if file === null}
		<div class="pad note">{changes.fileLoading ? 'Reading…' : ''}</div>
	{:else if file.binary}
		<div class="pad note">Binary file. There are no hunks to stage individually.</div>
	{:else if file.tooLarge}
		<div class="pad note">This file is too large to diff.</div>
	{:else if file.hunks.length === 0}
		<div class="pad note">No line changes — only the file's mode changed.</div>
	{:else}
		{#each file.hunks as hunk, index (hunk.header + index)}
			<section class="hunk">
				<div class="hunk-head">
					<span class="mono muted">{hunk.header}</span>
					<Chip
						onclick={() => changes.hunk(index, hunk.header)}
						title={side === 'unstaged'
							? 'Stage this hunk and nothing else'
							: 'Take this hunk back out of the next commit'}
					>
						{side === 'unstaged' ? 'stage hunk' : 'unstage hunk'}
					</Chip>
				</div>
				{#each hunk.lines as line, row (row)}
					<div class="line {line.origin}">
						<span class="num">{line.old ?? ''}</span>
						<span class="num">{line.new ?? ''}</span>
						<span class="sign">{sign(line)}</span>
						<span class="text">{line.text}</span>
					</div>
				{/each}
			</section>
		{/each}
	{/if}
</div>

<style>
	.pane {
		flex: 1;
		min-width: 0;
		overflow: auto;
		font-family: var(--font-mono);
		font-size: var(--fs-code);
	}

	.pad {
		padding: 10px 12px;
	}

	.error {
		color: var(--accent);
	}

	.hunk-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		background: var(--panel);
		border-top: 1.5px solid var(--soft);
		border-bottom: 1.5px solid var(--soft);
		padding: 2px 8px;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	/* Rows are as wide as their longest line, so the tint spans the whole row
	   when the pane is scrolled sideways. */
	.line {
		display: flex;
		min-width: 100%;
		width: max-content;
	}

	.num {
		flex: none;
		width: var(--diff-gutter-w);
		padding-right: 8px;
		text-align: right;
		color: var(--muted);
		user-select: none;
	}

	.sign {
		flex: none;
		width: 14px;
		text-align: center;
		color: var(--muted);
		user-select: none;
	}

	.text {
		white-space: pre;
		tab-size: 4;
		padding-right: 12px;
	}

	.line.added {
		background: color-mix(in srgb, var(--lane-5) 12%, transparent);
	}

	.line.removed {
		background: color-mix(in srgb, var(--lane-3) 12%, transparent);
	}
</style>

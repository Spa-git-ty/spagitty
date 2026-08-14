<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { changes } from '$lib/changes/store.svelte';
	import { statusGlyph } from '$lib/format';
	import Btn from '$lib/ui/Btn.svelte';
	import type { DiffSide, StatusEntry } from '$lib/types';

	/**
	 * What is staged and what is not, in one column.
	 *
	 * Staged rows are solid and unstaged rows are dashed — the same device the
	 * rest of the application uses for "settled" against "not yet". A path can
	 * appear in both sections at once, because a file can be staged in part;
	 * collapsing that into one row is what makes people commit something they
	 * did not mean to.
	 */

	/** See FileList.svelte: keeps `.gitignore` from rendering as `gitignore.`. */
	const LRM = '‎';

	const work = $derived(changes.work);

	function selected(entry: StatusEntry, side: DiffSide): boolean {
		return changes.selection?.path === entry.path && changes.selection?.side === side;
	}

	function paths(entries: StatusEntry[]): string[] {
		return entries.map((entry) => entry.path);
	}
</script>

<div class="column">
	{#if work.conflicted.length > 0}
		<section class="group">
			<header class="head">
				<span class="note">Conflicts</span>
				<span class="mono muted">{work.conflicted.length}</span>
			</header>
			<p class="note explain">
				Nothing can be committed until these are resolved.
			</p>
			{#each work.conflicted as entry (entry.path)}
				<div class="row conflicted" title={entry.path}>
					<span class="mono glyph">!</span>
					<span class="path">{LRM + entry.path}</span>
				</div>
			{/each}
		</section>
	{/if}

	<section class="group">
		<header class="head">
			<span class="note">Staged</span>
			<div class="right">
				<span class="mono muted">{work.staged.length}</span>
				{#if work.staged.length > 0}
					<Btn disabled={changes.busy} onclick={() => changes.unstage(paths(work.staged))}>
						Unstage all
					</Btn>
				{/if}
			</div>
		</header>

		{#each work.staged as entry (entry.path)}
			<div class="row solid" class:selected={selected(entry, 'staged')}>
				<button class="open" onclick={() => changes.open({ path: entry.path, side: 'staged' })} title={entry.path}>
					<span class="mono glyph" class:added={entry.status === 'added'}>
						{statusGlyph(entry.status)}
					</span>
					<span class="path">{LRM + entry.path}</span>
				</button>
				<button
					class="act mono"
					disabled={changes.busy}
					title="Unstage {entry.path}"
					onclick={() => changes.unstage([entry.path])}
				>
					−
				</button>
			</div>
		{/each}

		{#if work.staged.length === 0}
			<p class="note empty">Nothing staged.</p>
		{/if}
	</section>

	<section class="group">
		<header class="head">
			<span class="note">Unstaged</span>
			<div class="right">
				<span class="mono muted">{work.unstaged.length}</span>
				{#if work.unstaged.length > 0}
					<Btn disabled={changes.busy} onclick={() => changes.stage(paths(work.unstaged))}>
						Stage all
					</Btn>
				{/if}
			</div>
		</header>

		{#each work.unstaged as entry (entry.path)}
			<div class="row dashed" class:selected={selected(entry, 'unstaged')}>
				<button
					class="open"
					onclick={() => changes.open({ path: entry.path, side: 'unstaged' })}
					title={entry.path}
				>
					<span
						class="mono glyph"
						class:added={entry.status === 'added' || entry.status === 'untracked'}
					>
						{statusGlyph(entry.status)}
					</span>
					<span class="path">{LRM + entry.path}</span>
				</button>
				<button
					class="act mono"
					disabled={changes.busy}
					title="Stage {entry.path}"
					onclick={() => changes.stage([entry.path])}
				>
					+
				</button>
			</div>
		{/each}

		{#if work.unstaged.length === 0}
			<p class="note empty">Nothing unstaged.</p>
		{/if}
	</section>
</div>

<style>
	.column {
		width: var(--changes-files-w);
		flex: none;
		background: var(--panel);
		border-right: 1.5px solid var(--line);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 6px 0 10px;
	}

	.group {
		display: flex;
		flex-direction: column;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 4px 8px;
		border-bottom: 1.5px solid var(--soft);
	}

	.right {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.explain,
	.empty {
		margin: 0;
		padding: 6px 8px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 4px;
		margin: 2px 6px 0;
		padding-right: 4px;
		border: 1.5px solid transparent;
		border-radius: var(--r-field);
		min-width: 0;
	}

	/* Solid is settled, dashed is not — the same device the rest of the
	   application uses. */
	.row.solid {
		border-color: var(--soft);
	}

	.row.dashed {
		border-style: dashed;
		border-color: var(--soft);
	}

	.row.conflicted {
		border-color: var(--accent);
		padding: 2px 8px;
	}

	.row:hover {
		border-color: var(--accent);
	}

	.row.selected {
		background: var(--selection);
		border-color: var(--accent);
	}

	.open {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		min-width: 0;
		padding: 2px 6px;
		text-align: left;
	}

	.glyph {
		color: var(--muted);
		flex: none;
		width: 8px;
	}

	.glyph.added {
		color: var(--accent);
	}

	/* The tail of a path identifies the file, so the head gets the ellipsis. */
	.path {
		font-size: var(--fs-secondary);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		direction: rtl;
		text-align: left;
	}

	.act {
		flex: none;
		width: 18px;
		color: var(--muted);
	}

	.act:hover:not(:disabled) {
		color: var(--accent);
	}

	.act:disabled {
		opacity: 0.4;
	}
</style>

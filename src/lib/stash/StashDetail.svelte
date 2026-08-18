<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { clockTime, statusGlyph } from '$lib/format';
	import { stash } from '$lib/stash/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';

	/**
	 * What is in the selected entry, and what could be done with it.
	 *
	 * Pop, Apply and Drop each hand off to `stash.restore`, which puts the
	 * confirmation up through `graph/actions.ts` and re-reads the list. What
	 * each one does is said in that confirmation rather than here, so the Stash
	 * screen and the graph's own stash menu cannot describe the same operation
	 * two different ways.
	 */

	const entry = $derived(stash.selected);
	const contents = $derived(stash.contents);

	/** See FileList.svelte: keeps `.gitignore` from rendering as `gitignore.`. */
	const LRM = '‎';

	const counts = $derived.by(() => {
		if (contents === null) return '';
		const files = contents.files.length === 1 ? '1 file' : `${contents.files.length} files`;
		return `${files} · +${contents.added} −${contents.removed}`;
	});
</script>

<aside class="detail">
	{#if entry === null}
		<div class="empty note">Select an entry to see what is in it.</div>
	{:else}
		<header class="head">
			<span class="mono">{entry.name}</span>
			<span class="mono muted">{entry.short}</span>
		</header>

		<div class="pad column">
			<div class="message">{entry.message}</div>
			<div class="mono muted">
				{entry.authorName} · {clockTime(entry.time)}
			</div>
			<div class="mono muted" title={entry.parentSummary}>
				made on {entry.parentShort}
			</div>

			<div class="hr"></div>

			{#if stash.contentsError}
				<p class="note error">{stash.contentsError}</p>
			{:else if contents === null}
				<p class="note">{stash.contentsLoading ? 'Reading…' : ''}</p>
			{:else}
				<div class="files-head">
					<span class="note">{counts}</span>
					<Btn onclick={() => goto(`/diff?commit=${entry.id}`)}>Open full diff →</Btn>
				</div>

				<div class="files">
					{#each contents.files as file (file.path)}
						<div class="file" title={file.path}>
							<span class="mono glyph" class:added={file.status === 'added'}>
								{statusGlyph(file.status)}
							</span>
							<span class="path">{LRM + file.path}</span>
						</div>
					{/each}
					{#if contents.files.length === 0}
						<span class="note">This entry changed nothing.</span>
					{/if}
				</div>
			{/if}

			<div class="hr"></div>

			<div class="actions">
				<span class="note">Restoring this entry</span>
				<div class="chips">
					<Chip
						title="Restore this entry and remove it from the stash"
						onclick={() => stash.restore('pop')}>Pop</Chip
					>
					<Chip
						title="Restore this entry and keep it in the stash"
						onclick={() => stash.restore('apply')}>Apply — keep in stash</Chip
					>
					<Chip title="Delete this entry without restoring it" onclick={() => stash.restore('drop')}
						>Drop</Chip
					>
				</div>
			</div>
		</div>
	{/if}
</aside>

<style>
	.detail {
		width: var(--detail-w);
		flex: none;
		border-left: 1.5px solid var(--line);
		background: var(--panel);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 10px;
		border-bottom: 1.5px solid var(--soft);
		flex: none;
	}

	.pad {
		padding: 10px;
		overflow-y: auto;
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.empty {
		padding: 14px 10px;
	}

	.files-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.files {
		display: flex;
		flex-direction: column;
	}

	.file {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 1px 0;
		min-width: 0;
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		direction: rtl;
		text-align: left;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.error {
		color: var(--accent);
	}
</style>

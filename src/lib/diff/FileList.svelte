<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { diff } from '$lib/diff/store.svelte';
	import { statusGlyph } from '$lib/format';

	/**
	 * The files a commit touched, with what each one cost in lines.
	 *
	 * A file with no line counts says why — binary, or too large — rather than
	 * showing `+0 −0`, which would read as "nothing changed".
	 */

	const files = $derived(diff.commit?.files ?? []);

	/**
	 * Left-to-right mark.
	 *
	 * The path column elides its *head* (see the CSS), which needs
	 * `direction: rtl`. That makes the leading `.` of a dotfile a neutral
	 * character at the edge of an RTL paragraph, so it is reordered to the end
	 * and `.gitignore` renders as `gitignore.`. A strong LTR character in front
	 * of it settles the direction without changing what is displayed.
	 */
	const LRM = '\u200e';
</script>

<nav class="files" aria-label="Files in this commit">
	{#each files as file (file.path)}
		<button
			class="file"
			class:selected={file.path === diff.path}
			onclick={() => diff.select(file.path)}
			title={file.path}
		>
			<span class="mono glyph" class:added={file.status === 'added'}>
				{statusGlyph(file.status)}
			</span>
			<span class="path">{LRM + file.path}</span>
			{#if file.binary}
				<span class="mono muted counts">bin</span>
			{:else if file.tooLarge}
				<span class="mono muted counts">big</span>
			{:else}
				<span class="mono counts">
					<span class="plus">+{file.added}</span>
					<span class="minus">−{file.removed}</span>
				</span>
			{/if}
		</button>
	{/each}

	{#if files.length === 0}
		<div class="empty note">No file changes.</div>
	{/if}
</nav>

<style>
	.files {
		width: var(--diff-files-w);
		flex: none;
		background: var(--panel);
		border-right: 1.5px solid var(--line);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 4px 0;
	}

	.file {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 2px 8px;
		text-align: left;
		width: 100%;
		min-width: 0;
		flex: none;
	}

	.file:hover {
		background: var(--stripe);
	}

	.file.selected {
		background: var(--selection);
	}

	.glyph {
		color: var(--muted);
		flex: none;
		width: 8px;
	}

	.glyph.added {
		color: var(--accent);
	}

	/* The tail of a path identifies the file, so the head gets the ellipsis.
	   `direction: rtl` puts it there; the LRM in the markup keeps the text
	   itself running left to right. */
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

	.counts {
		flex: none;
		display: flex;
		gap: 4px;
	}

	.plus {
		color: var(--lane-5);
	}

	.minus {
		color: var(--lane-3);
	}

	.empty {
		padding: 8px;
	}
</style>

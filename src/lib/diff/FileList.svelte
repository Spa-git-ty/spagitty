<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { statusGlyph } from '$lib/format';
	import type { FileChange } from '$lib/types';

	/**
	 * The files a commit touched, with what each one cost in lines.
	 *
	 * A file with no line counts says why — binary, or too large — rather than
	 * showing `+0 −0`, which would read as "nothing changed".
	 *
	 * Given its files rather than reading a store, so the Stash screen can show
	 * the contents of an entry with this component instead of a second one that
	 * drifts from it (FEAT-034). A stash *is* a commit, so the two lists are the
	 * same list.
	 */

	interface Props {
		files: FileChange[];
		/** Path of the selected file, or null when nothing is selected. */
		selected: string | null;
		onselect: (path: string) => void;
		/**
		 * Move `delta` files through the list. Given, the list handles the
		 * arrow keys itself; withheld, it is click-only.
		 */
		onstep?: (delta: number) => void;
		/** What this is a list of. Read out, so it says which screen it is on. */
		label?: string;
		/** Shown when there are no files at all. */
		empty?: string;
	}

	let {
		files,
		selected,
		onselect,
		onstep,
		label = 'Files in this commit',
		empty = 'No file changes.'
	}: Props = $props();

	/**
	 * Arrow keys walk the list, Home and End reach its ends.
	 *
	 * On the list rather than the window: a file list is one of several things
	 * on screen that answer to an arrow key, and the one with focus is the one
	 * that should.
	 */
	function onkeydown(event: KeyboardEvent) {
		if (!onstep || event.metaKey || event.ctrlKey || event.altKey) return;

		if (event.key === 'ArrowDown') onstep(1);
		else if (event.key === 'ArrowUp') onstep(-1);
		else if (event.key === 'Home') onstep(-files.length);
		else if (event.key === 'End') onstep(files.length);
		else return;

		event.preventDefault();
	}

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

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<nav class="files" aria-label={label} {onkeydown}>
	{#each files as file (file.path)}
		<button
			class="file"
			class:selected={file.path === selected}
			onclick={() => onselect(file.path)}
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
		<div class="empty note">{empty}</div>
	{/if}
</nav>

<style>
	.files {
		width: var(--diff-files-w);
		flex: none;
		background: var(--panel);
		border-right: 1px solid var(--line);
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
		background: var(--hover);
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
		color: var(--ok);
	}

	.minus {
		color: var(--danger);
	}

	.empty {
		padding: 8px;
	}
</style>

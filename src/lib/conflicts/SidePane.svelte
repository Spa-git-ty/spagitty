<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { conflicts, missingSideReason } from '$lib/conflicts/store.svelte';
	import type { ConflictKind, ConflictSide } from '$lib/types';

	/**
	 * One version of a conflicted file, rendered as plain text.
	 *
	 * Plain text and not a diff on purpose: the question this screen answers is
	 * "what did each side actually have", and a diff would answer a different
	 * one while hiding the lines that agree.
	 *
	 * The merged pane becomes a textarea while it is being edited (FEAT-016).
	 * A textarea and not a line-numbered editor: this is the escape hatch for
	 * the conflict the buttons cannot express, and the thing it has to be is
	 * exactly what will be on disk afterwards.
	 */
	interface Props {
		title: string;
		/** What this side is, in one line — "HEAD", "the incoming side". */
		subtitle: string;
		side: ConflictSide | null;
		/** Which of the three this is, so a missing one can say why. */
		which: 'base' | 'ours' | 'theirs' | 'merged';
		kind: ConflictKind;
		/** The merged pane is the one carrying markers, and reads as the middle. */
		middle?: boolean;
	}

	let { title, subtitle, side, which, kind, middle = false }: Props = $props();

	const readable = $derived(Boolean(side) && !side?.binary && !side?.tooLarge);

	/**
	 * A trailing newline ends the last line rather than starting an empty one,
	 * which is how the line count in the header is arrived at too. An empty file
	 * is no rows at all, not one blank one.
	 */
	const rows = $derived.by(() => {
		if (!readable || !side?.text) return [];
		const lines = side.text.split('\n');
		return lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
	});

	/** True when this pane is the merged one and an edit is in progress. */
	const editing = $derived(which === 'merged' && conflicts.draft !== null);

	const missing = $derived(
		which === 'merged'
			? 'No file on disk. Until this conflict is resolved there is nothing here to show.'
			: missingSideReason(kind, which)
	);
</script>

<section class="pane" class:middle>
	<header class="head">
		<div class="titles">
			<span class="title">{title}</span>
			<span class="note">{subtitle}</span>
		</div>
		{#if side && !side.binary && !side.tooLarge}
			<span class="note count">{side.lines} {side.lines === 1 ? 'line' : 'lines'}</span>
		{/if}
	</header>

	<div class="body">
		{#if editing}
			<textarea
				class="editor mono"
				spellcheck="false"
				aria-label="Merged result"
				value={conflicts.draft}
				oninput={(event) => conflicts.setDraft(event.currentTarget.value)}
			></textarea>
		{:else if !side}
			<p class="note state">{missing}</p>
		{:else if side.binary}
			<p class="note state">Binary — {side.bytes} bytes. Not shown as text.</p>
		{:else if side.tooLarge}
			<p class="note state">
				{side.bytes} bytes, too large to show. Read it in an editor instead.
			</p>
		{:else if rows.length === 0}
			<p class="note state">Empty on this side.</p>
		{:else}
			<ol class="lines mono">
				{#each rows as row, index (index)}
					<li class:marker={/^(<{7}|={7}|>{7}|\|{7})/.test(row)}>{row}</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>

<style>
	.editor {
		width: 100%;
		height: 100%;
		border: 0;
		resize: none;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: var(--fs-mono);
		padding: 4px 8px;
		white-space: pre;
		overflow: auto;
	}

	.editor:focus {
		outline: 1.5px solid var(--accent);
		outline-offset: -1.5px;
	}

	.pane {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1.5px solid var(--soft);
		border-radius: var(--r-field);
	}

	/* The merged result is where the markers are, so it is the one that reads
	   as the thing being worked on rather than a reference. */
	.pane.middle {
		border-color: var(--line);
	}

	.head {
		flex: none;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		padding: 6px 8px;
		border-bottom: 1.5px solid var(--soft);
	}

	.titles {
		display: flex;
		align-items: baseline;
		gap: 6px;
		min-width: 0;
	}

	.title {
		white-space: nowrap;
	}

	.count {
		flex: none;
	}

	.body {
		flex: 1;
		min-height: 0;
		overflow: auto;
	}

	.state {
		margin: 0;
		padding: 10px 8px;
	}

	.lines {
		margin: 0;
		padding: 4px 0;
		list-style: none;
		counter-reset: line;
		font-size: var(--fs-secondary);
	}

	.lines li {
		counter-increment: line;
		display: flex;
		gap: 8px;
		padding: 0 8px;
		white-space: pre;
	}

	.lines li::before {
		content: counter(line);
		flex: none;
		min-width: 32px;
		text-align: right;
		color: var(--muted);
	}

	.lines li.marker {
		background: var(--selection);
	}
</style>

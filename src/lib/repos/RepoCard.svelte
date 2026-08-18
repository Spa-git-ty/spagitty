<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { relativeTime } from '$lib/format';
	import { repos } from '$lib/repos/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import RefChip from '$lib/ui/RefChip.svelte';
	import type { RepoSummary } from '$lib/types';

	interface Props {
		card: RepoSummary;
		/** Idle cards render dashed with a one-line status. */
		idle?: boolean;
	}

	let { card, idle = false }: Props = $props();

	const open = $derived(repos.isOpen(card));

	/** The chips a card earns. A card with nothing to say shows nothing. */
	const chips = $derived.by(() => {
		const out: Array<{ label: string; strong?: boolean }> = [];
		if (!card.present) return out;
		if ((card.conflicts ?? 0) > 0) out.push({ label: `${card.conflicts} conflicted`, strong: true });
		if ((card.dirty ?? 0) > 0) out.push({ label: `${card.dirty} changed` });
		if ((card.stashes ?? 0) > 0) out.push({ label: `${card.stashes} stashed` });
		if (card.bare) out.push({ label: 'bare' });
		return out;
	});
</script>

<article class="card" class:idle class:missing={!card.present} class:open>
	<header class="top">
		<span class="name" title={card.path}>{card.name}</span>
		{#if open}<span class="note here">open</span>{/if}
	</header>

	{#if !card.present}
		<p class="note gone">
			Not here any more. The path may have moved, or it may no longer be a
			repository — GitLumiere has not touched it either way.
		</p>
		<div class="path mono muted" title={card.path}>{card.path}</div>
	{:else}
		<div class="branch">
			{#if card.branch}
				<RefChip chip={{ name: card.branch, kind: 'branch', current: true }} />
			{:else if card.short}
				<RefChip chip={{ name: `detached at ${card.short}`, kind: 'branch', current: false }} />
			{:else}
				<span class="note">no commits yet</span>
			{/if}
			{#if card.branches !== null && card.branches > 1}
				<span class="note count">{card.branches} branches</span>
			{/if}
		</div>

		<div class="path mono muted" title={card.path}>{card.path}</div>

		{#if card.summary}
			<div class="note last" title={card.summary}>
				{card.summary}{#if card.time} · {relativeTime(card.time)}{/if}
			</div>
		{/if}

		{#if chips.length > 0}
			<div class="chips">
				{#each chips as chip (chip.label)}
					<Chip active={chip.strong}>{chip.label}</Chip>
				{/each}
			</div>
		{/if}
	{/if}

	<footer class="actions">
		<Btn
			primary={!idle && card.present}
			disabled={repos.busy || !card.present || open}
			onclick={() => repos.open(card)}
		>
			{open ? 'Already open' : 'Open'}
		</Btn>
		<Btn
			disabled={repos.busy}
			title="Remove this card. The directory on disk is not touched."
			onclick={() => repos.forget(card)}
		>
			Forget
		</Btn>
	</footer>
</article>

<style>
	.card {
		width: var(--repo-card-w);
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px;
		border: 1.5px solid var(--soft);
		border-radius: var(--r-field);
		background: var(--bg);
	}

	/* Dashed for a repository with nothing going on — the same device the rest
	   of the application uses for "not right now". */
	.card.idle {
		border-style: dashed;
		color: var(--muted);
	}

	.card.missing {
		border-color: var(--accent);
	}

	.card.open {
		background: var(--selection);
		border-color: var(--accent);
	}

	.top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		min-width: 0;
	}

	.name {
		font-size: var(--fs-title);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.here {
		flex: none;
		color: var(--accent);
	}

	.branch {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	/*
	 * BUG-006. The branch name is the part that gives way, never the count.
	 * "7 branches" is four characters of information that a card is useless
	 * without; the branch name has an ellipsis and a `title` to fall back on.
	 */
	.branch .count {
		flex: none;
	}

	/* The tail of a path identifies the directory, so the head gets the
	   ellipsis — the same rule the file lists follow. */
	.path {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		direction: rtl;
		text-align: left;
	}

	.last {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.gone {
		margin: 0;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: auto;
		padding-top: 4px;
	}
</style>

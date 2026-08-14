<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { graph } from '$lib/graph/store.svelte';
	import { isActive, NAV_ITEMS } from '$lib/nav';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	const counts = $derived(repo.counts);

	/**
	 * A count of `null` means "not computed yet" and renders as a dot. Only the
	 * screens that exist report real numbers; inventing the rest would make the
	 * rail lie about how much work is waiting.
	 */
	function countLabel(key: keyof typeof counts): string {
		const value = counts[key];
		return value === null ? '·' : String(value);
	}

	const tagsLabel = $derived(counts.tags === null ? '·' : String(counts.tags));
	const submodulesLabel = $derived(
		counts.submodules === null ? '·' : String(counts.submodules)
	);
</script>

<nav class="rail" aria-label="Screens">
	<div class="head">
		<span class="mono muted">
			◂ {graph.count}{graph.complete ? '' : ' …'}
		</span>
		<span class="note">{graph.complete ? 'all' : 'loading'}</span>
	</div>

	<div class="filter">
		<button class="field" onclick={() => goto('/search')}>
			<span class="mono muted">filter commits</span>
			<span class="mono muted">⌘F</span>
		</button>
	</div>

	{#each NAV_ITEMS as item (item.href)}
		{#if item.dividerBefore}
			<div class="hr"></div>
		{/if}
		<button
			class="item"
			data-active={isActive(item.href, page.url.pathname)}
			onclick={() => goto(item.href)}
		>
			<span>{item.label}</span>
			<span class="mono muted">
				{item.count ? countLabel(item.count) : (item.hint ?? '')}
			</span>
		</button>
	{/each}

	<div class="spacer"></div>

	<div class="foot">
		<span class="note">Tags {tagsLabel} · Submodules {submodulesLabel}</span>
		<Btn onclick={() => repo.choose()}>Open repository…</Btn>
	</div>
</nav>

<style>
	.rail {
		width: var(--rail-w);
		flex: none;
		display: flex;
		flex-direction: column;
		background: var(--panel);
		border-right: 1.5px solid var(--line);
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 8px;
		border-bottom: 1.5px solid var(--soft);
	}

	.filter {
		padding: 8px;
	}

	.field {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		width: 100%;
		padding: 5px 6px;
		border: 1.5px dashed var(--soft);
		border-radius: var(--r-field);
	}

	.field:hover {
		border-color: var(--accent);
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		width: 100%;
		padding: 6px 10px;
		font-size: 12px;
		text-align: left;
		border-left: 3px solid transparent;
	}

	.item:hover {
		background: var(--stripe);
	}

	/* The active item is the only thing that answers "where am I". */
	.item[data-active='true'] {
		background: var(--selection);
		border-left-color: var(--accent);
		color: var(--accent);
	}

	.spacer {
		flex: 1;
	}

	.foot {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px;
		align-items: flex-start;
	}
</style>

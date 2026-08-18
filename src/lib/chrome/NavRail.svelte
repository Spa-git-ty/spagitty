<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { graph } from '$lib/graph/store.svelte';
	import { isActive, NAV_ITEMS } from '$lib/nav';
	import { panels } from '$lib/panels.svelte';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	/**
	 * Collapsed, the rail is a strip of glyphs. Everything stays where it was —
	 * same items, same order, same routes — so the muscle memory of which
	 * position is which screen survives the collapse.
	 */
	const collapsed = $derived(panels.railCollapsed);

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

<nav class="rail" class:collapsed aria-label="Screens">
	<div class="head">
		<button
			class="collapse"
			title={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
			aria-label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
			aria-expanded={!collapsed}
			onclick={() => panels.toggleRail()}
		>
			{collapsed ? '»' : '«'}
		</button>
		{#if !collapsed}
			<span class="mono muted">
				◂ {graph.count}{graph.complete ? '' : ' …'}
			</span>
			<span class="note">{graph.complete ? 'all' : 'loading'}</span>
		{/if}
	</div>

	<!--
		Opening a repository is the first thing a new user needs and the least
		discoverable place in the rail is below a spacer, which is where it used
		to sit. It takes the top slot instead — the one the log filter had, which
		only duplicated the Log screen's own query bar and the Ctrl+F shortcut.
	-->
	<div class="open">
		{#if collapsed}
			<button
				class="item"
				title="Open repository…"
				aria-label="Open repository…"
				onclick={() => repo.choose()}
			>
				<span class="glyph" aria-hidden="true">⊞</span>
			</button>
		{:else}
			<Btn primary onclick={() => repo.choose()}>Open repository…</Btn>
		{/if}
	</div>

	{#each NAV_ITEMS as item (item.href)}
		{#if item.dividerBefore}
			<div class="hr"></div>
		{/if}
		<button
			class="item"
			data-active={isActive(item.href, page.url.pathname)}
			title={item.label}
			aria-label={item.label}
			onclick={() => goto(item.href)}
		>
			{#if collapsed}
				<span class="glyph" aria-hidden="true">{item.glyph}</span>
			{:else}
				<span>{item.label}</span>
				<span class="mono muted">
					{item.count ? countLabel(item.count) : (item.hint ?? '')}
				</span>
			{/if}
		</button>
	{/each}

	<div class="spacer"></div>

	{#if !collapsed}
		<div class="foot">
			<span class="note">Tags {tagsLabel} · Submodules {submodulesLabel}</span>
		</div>
	{/if}
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

	.rail.collapsed .head {
		justify-content: center;
		padding: 8px 4px;
	}

	.collapse {
		flex: none;
		color: var(--muted);
		font-size: var(--fs-secondary);
		line-height: 1;
		padding: 2px 4px;
		border-radius: var(--r-field);
	}

	.collapse:hover {
		color: var(--accent);
		background: var(--soft);
	}

	/* Collapsed, an item is a glyph in a square: same order, same routes, no
	   labels. The title attribute carries the name for a pointer, and
	   `aria-label` carries it for everything else. */
	.rail.collapsed .item {
		justify-content: center;
		padding-left: 0;
		padding-right: 0;
	}

	.rail.collapsed .open,
	.rail.collapsed .foot {
		padding: 8px 4px;
	}

	.glyph {
		font-size: var(--fs-ui);
		line-height: 1;
	}

	/* The primary action, so it gets the width of the rail rather than sitting
	   in it at its own size. */
	.open {
		padding: 8px;
	}

	.open :global(.btn) {
		width: 100%;
		justify-content: center;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		width: 100%;
		padding: 6px 10px;
		font-size: var(--fs-secondary);
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

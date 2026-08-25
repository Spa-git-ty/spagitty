<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { graph } from '$lib/graph/store.svelte';
	import { isActive, NAV_ITEMS } from '$lib/nav';
	import { panels } from '$lib/panels.svelte';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Icon from '$lib/ui/Icon.svelte';

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
			<Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size="1em" />
		</button>
		{#if !collapsed}
			<!--
				What the walk has found so far. One statement instead of the
				three pieces of text this row used to carry — a glyph, a count
				and the word "loading" — and the dot is what says it is still
				running, so nothing has to move to say so.
			-->
			<span class="walk" class:running={!graph.complete}>
				<span class="pulse" aria-hidden="true"></span>
				<span class="mono">{graph.count}</span>
				<span class="note">{graph.complete ? 'commits' : 'walking…'}</span>
			</span>
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
				<Icon name="folder" size="1.2em" />
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
				<Icon name={item.icon} size="1.2em" />
			{:else}
				<span class="name">
					<Icon name={item.icon} size="1.15em" />
					<span>{item.label}</span>
				</span>
				<span class="count mono">
					{item.count ? countLabel(item.count) : ''}
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
	/*
	 * The rail is chrome, so it takes the chrome gradient — but vertically,
	 * falling away from the screen it sits beside, and it casts a short shadow
	 * over that screen. That shadow is the whole reason the rail reads as a
	 * *sidebar* rather than as the left-hand third of one flat window.
	 */
	.rail {
		width: var(--rail-w);
		flex: none;
		display: flex;
		flex-direction: column;
		background-color: var(--chrome-veil);
		background-image: var(--glass-sheen), var(--grad-rail);
		border-right: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
		box-shadow:
			var(--glass-rim),
			1px 0 3px color-mix(in srgb, var(--umbra) 7%, transparent);
		position: relative;
		z-index: 1;
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 8px;
		border-bottom: 1px solid var(--soft);
	}

	.rail.collapsed .head {
		justify-content: center;
		padding: 8px 4px;
	}

	.collapse {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
		font-size: var(--fs-secondary);
		line-height: 1;
		padding: 4px;
		border-radius: var(--r-field);
		transition:
			background var(--t-fast) var(--ease),
			color var(--t-fast) var(--ease),
			transform var(--t-fast) var(--spring);
	}

	.collapse:active {
		transform: scale(0.9);
	}

	/* How far the walk has got. */
	.walk {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		min-width: 0;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	/*
	 * The dot. Still while the walk is finished, breathing while it runs — the
	 * one piece of motion in the rail, and the only thing on this row that says
	 * work is happening.
	 */
	.pulse {
		width: 6px;
		height: 6px;
		flex: none;
		align-self: center;
		border-radius: var(--r-pill);
		background: var(--ok);
		box-shadow: 0 0 6px color-mix(in srgb, var(--ok) 60%, transparent);
	}

	.walk.running .pulse {
		background: var(--accent);
		box-shadow: 0 0 8px var(--accent-glow);
		animation: pulse-breathe 1.6s ease-in-out infinite;
	}

	@keyframes pulse-breathe {
		0%,
		100% {
			opacity: 0.35;
			transform: scale(0.82);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	.collapse:hover {
		color: var(--accent);
		background: var(--accent-soft);
	}

	/* Collapsed, an item is a glyph in a square: same order, same routes, no
	   labels. The title attribute carries the name for a pointer, and
	   `aria-label` carries it for everything else. */
	.rail.collapsed .item {
		justify-content: center;
		padding-left: 0;
		padding-right: 0;
		width: calc(100% - 8px);
		margin-inline: 4px;
	}

	.rail.collapsed .open,
	.rail.collapsed .foot {
		padding: 8px 4px;
	}

	/* Label and icon travel together; the count is what the row's spare width
	   belongs to. */
	.name {
		display: flex;
		align-items: center;
		gap: 9px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/*
	 * The count is a number in a soft capsule rather than loose grey text, so a
	 * rail of twelve items reads as twelve rows with badges instead of
	 * twenty-four pieces of text.
	 */
	.count {
		flex: none;
		min-width: 20px;
		padding: 0 6px;
		border-radius: var(--r-pill);
		text-align: center;
		color: var(--muted);
		background: var(--soft);
		font-variant-numeric: tabular-nums;
	}

	.item[data-active='true'] .count {
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 18%, transparent);
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

	/*
	 * An item is a pill, not a full-width strip with a bar stuck on its left.
	 *
	 * The strip ran edge to edge, so the only thing that could mark the active
	 * one was a border on the window's own edge. A pill sits *inside* the rail
	 * with room around it, which means the active one can be a raised object —
	 * and that is a much louder answer to "where am I" than three pixels of
	 * accent at the far left.
	 */
	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		width: calc(100% - 12px);
		margin: 1px 6px;
		padding: 6px 10px;
		border-radius: var(--r-button);
		font-size: var(--fs-secondary);
		text-align: left;
		transition:
			background var(--t-fast) var(--ease),
			box-shadow var(--t-fast) var(--ease),
			transform var(--t-fast) var(--spring),
			color var(--t-fast) var(--ease);
	}

	.item:hover {
		background: var(--hover);
		transform: translateX(2px);
	}

	.item:active {
		transform: translateX(1px) scale(0.99);
	}

	/*
	 * The active item is a flat accent-tinted pill and nothing else.
	 *
	 * It had a bar down its leading edge and a halo under it as well, which
	 * together read as a raised blue-edged tab rather than as "you are here" —
	 * the extra depth was the loudest thing in the rail and it was saying
	 * nothing the tint and the accent label do not already say. No inset bar,
	 * no glow, no rim.
	 */
	.item[data-active='true'] {
		background: color-mix(in srgb, var(--accent) 16%, transparent);
		color: var(--accent);
		font-weight: 600;
	}

	.item[data-active='true']:hover {
		transform: none;
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

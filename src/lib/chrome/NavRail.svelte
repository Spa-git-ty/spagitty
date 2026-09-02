<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { relativeTime } from '$lib/format';
	import { graph } from '$lib/graph/store.svelte';
	import { isActive, NAV_ITEMS } from '$lib/nav';
	import { panels } from '$lib/panels.svelte';
	import { repo } from '$lib/repo.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { submodules } from '$lib/submodules/store.svelte';
	import { submoduleModal } from '$lib/submodules/modal.svelte';

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
	const workingLabel = $derived(
		counts.working === null
			? 'working copy not read yet'
			: counts.working === 0
				? 'working copy clean'
				: `${counts.working} changed ${counts.working === 1 ? 'file' : 'files'}`
	);

	/**
	 * What the foot says (FEAT-040).
	 *
	 * The three things a person wants to know while looking at a repository —
	 * how much is changed, when the walk last refreshed, and when the remote was
	 * last heard from — each of them a fact the rail already has or can get
	 * honestly. It lived on the Graph screen's own footer until the rail became
	 * the place the workspace is described from.
	 *
	 * `now` is a signal so the ages re-read when anything else changes; nothing
	 * here polls. A rail that ticked would draw the eye to its least important
	 * row.
	 */
	let now = $state(Date.now());

	const refreshed = $derived(
		graph.refreshedAt === null ? 'not refreshed yet' : `refreshed ${relativeTime(graph.refreshedAt, now)}`
	);

	const fetched = $derived.by(() => {
		if (!repo.info) return null;
		const at = repo.info.lastFetched;
		// An empty time, or a time invented for a fetch that never happened, is
		// the thing this must not do.
		return at === null ? 'never fetched' : `fetched ${relativeTime(at, now)}`;
	});

	// Re-read whenever the walk finishes or the counts move, which is every
	// moment the numbers behind these could have changed.
	$effect(() => {
		void graph.refreshedAt;
		void repo.counts.working;
		void repo.info?.lastFetched;
		now = Date.now();
	});
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
	</div>

	<!--
		Opening a repository is the first thing a new user needs and the least
		discoverable place in the rail is below a spacer, which is where it used
		to sit. It takes the top slot instead — the one the log filter had, which
		only duplicated the Log screen's own query bar and the Ctrl+F shortcut.
	-->
	<div class="open">
		<button
			class="item open-repository primary"
			title="Open repository…"
			aria-label="Open repository…"
			onclick={() => repo.choose()}
		>
			<!--
				The icon and the label in one `.name`, exactly as every other row
				builds itself.

				They were direct children, and `.item` lays its children out with
				`space-between` so that a screen's count can sit at the far right.
				With nothing to push apart but an icon and a word, that put the
				icon against the left edge and the text against the right, with
				the whole rail's width between them. Grouping them is what every
				other row already does, and it is why every other row reads.
			-->
			<span class="name">
				<Icon name="folder" size="1.2em" />
				{#if !collapsed}<span class="responsive-label">Open repository…</span>{/if}
			</span>
		</button>
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

	{#if !collapsed && repo.info}
		<div class="foot">
			<span class="walk" class:running={!graph.complete}>
				<span class="pulse" aria-hidden="true"></span>
				<span>{graph.complete ? 'Repository ready' : 'Loading history…'}</span>
			</span>
			<span class="note">{graph.count} commits · {workingLabel}</span>
			<span class="note">{refreshed}{fetched ? ` · ${fetched}` : ''}</span>
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
		border-right: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
		box-shadow: none;
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
		box-shadow: none;
	}

	.walk.running .pulse {
		background: var(--accent);
		box-shadow: none;
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

	/* Collapsed, the group holds one glyph and must not claim the row's width,
	   or the icon centres inside a stretched box instead of inside the pill. */
	.rail.collapsed .open-repository .name {
		justify-content: center;
		width: 100%;
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
	 * The one item that is a button rather than a destination.
	 *
	 * No `justify-content` of its own: it inherits `.item`'s, and its icon and
	 * label are grouped in a `.name` like every other row's, so the group sits
	 * at the leading edge and the collapsed rule still centres it.
	 */
	.open-repository {
		background: var(--accent);
		color: var(--on-accent);
		font-weight: 650;
	}

	.open-repository:hover {
		background: var(--accent-lift);
		color: var(--on-accent);
		transform: none;
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

	/* A tiling compositor can make a window narrower than the application's
	   requested minimum. Compact the chrome instead of squeezing the workspace. */
	@media (max-width: 900px) {
		.rail {
			width: 48px;
		}

		.head {
			justify-content: center;
			padding: 8px 4px;
		}

		.walk,
		.count,
		.foot,
		.name > span,
		.responsive-label {
			display: none;
		}

		.open {
			padding: 8px 4px;
		}

		.item,
		.open-repository {
			justify-content: center;
			width: calc(100% - 8px);
			margin-inline: 4px;
			padding-inline: 0;
		}
	}
</style>

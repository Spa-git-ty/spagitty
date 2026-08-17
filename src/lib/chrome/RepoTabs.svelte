<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import * as api from '$lib/api';
	import { clone } from '$lib/clone/store.svelte';
	import { graph } from '$lib/graph/store.svelte';
	import { repo } from '$lib/repo.svelte';
	import Menu from '$lib/ui/Menu.svelte';
	import type { MenuItem } from '$lib/ui/menu';
	import { notice } from '$lib/ui/notice.svelte';
	import { workspace } from '$lib/workspace.svelte';
	import type { RepoSummary } from '$lib/types';

	/**
	 * The repositories open as tabs.
	 *
	 * A tab is a place to go back to, not a live session — GitLord's backend
	 * holds one repository at a time, and switching re-opens the one clicked and
	 * restores the screen and the selection it was left on. `workspace.svelte.ts`
	 * carries the reasoning; the honest consequence is that a switch costs a
	 * fresh walk, which is why the tab shows its repository as loading rather
	 * than pretending the graph is ready.
	 */

	const tabs = $derived(workspace.tabs);
	let menu = $state<{ x: number; y: number } | null>(null);
	let recents = $state<RepoSummary[]>([]);

	/** Where the current repository is right now, for remembering on the way out. */
	function here() {
		return { route: page.url.pathname, selected: graph.selectedId };
	}

	async function switchTo(path: string): Promise<void> {
		if (workspace.isActive(path)) return;

		const leaving = repo.info?.path;
		if (leaving) workspace.remember(leaving, here());

		const place = workspace.placeOf(path);
		const opened = await repo.open(path);
		if (!opened) return;

		// The route first, then the selection: the graph store holds a wanted id
		// across a walk it cannot see the end of, so it can be handed over before
		// the rows that contain it have arrived.
		if (place?.route && place.route !== page.url.pathname) await goto(place.route);
		if (place?.selected) graph.want(place.selected);
	}

	function closeTab(event: MouseEvent, path: string): void {
		event.stopPropagation();

		const wasActive = workspace.isActive(path);
		if (wasActive && repo.info?.path === path) workspace.remember(path, here());

		const next = workspace.close(path);
		if (wasActive && next) void switchTo(next);
	}

	async function openMenu(event: MouseEvent): Promise<void> {
		const button = event.currentTarget as HTMLElement;
		const box = button.getBoundingClientRect();
		menu = { x: box.left, y: box.bottom + 2 };

		try {
			recents = await api.recentRepos();
		} catch (error) {
			// The menu still offers Open and Clone; only the recent list is lost.
			notice.failed('Could not read the repository list', error);
			recents = [];
		}
	}

	const menuItems = $derived.by((): MenuItem[] => {
		const items: MenuItem[] = [
			{ id: 'open', label: 'Open repository…', run: () => void repo.choose() },
			{ id: 'clone', label: 'Clone…', run: () => clone.show() }
		];

		// Only the ones not already open: a menu offering to open the tab you are
		// looking at teaches nothing.
		const unopened = recents.filter((entry) => !tabs.some((tab) => tab.path === entry.path));
		if (unopened.length > 0) {
			items.push({ heading: 'Recent' });
			for (const entry of unopened.slice(0, 8)) {
				items.push({
					id: entry.path,
					label: entry.name,
					note: entry.branch ?? undefined,
					disabled: !entry.present,
					reason: entry.present ? undefined : 'missing from disk',
					run: () => void switchTo(entry.path)
				});
			}
		}

		return items;
	});
</script>

<div class="tabs" role="tablist" aria-label="Open repositories">
	{#each tabs as tab (tab.path)}
		<div
			class="tab"
			class:active={workspace.isActive(tab.path)}
			role="tab"
			tabindex={workspace.isActive(tab.path) ? 0 : -1}
			aria-selected={workspace.isActive(tab.path)}
			title={tab.path}
			onclick={() => void switchTo(tab.path)}
			onkeydown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					void switchTo(tab.path);
				}
			}}
		>
			<span class="label">{tab.name}</span>
			{#if workspace.isActive(tab.path) && repo.busy}
				<span class="note" aria-label="Opening">…</span>
			{/if}
			<button
				class="close"
				title="Close this tab — the repository stays in your list"
				aria-label="Close {tab.name}"
				onclick={(event) => closeTab(event, tab.path)}
			>
				✕
			</button>
		</div>
	{/each}

	<button class="add" title="Open, clone or reopen a repository" aria-label="Add a repository" onclick={openMenu}>
		+
	</button>
</div>

{#if menu}
	<Menu x={menu.x} y={menu.y} items={menuItems} label="Repositories" onclose={() => (menu = null)} />
{/if}

<style>
	.tabs {
		display: flex;
		align-items: stretch;
		gap: 2px;
		min-width: 0;
		/* The title bar drags the window; a tab has to be clickable instead. */
		-webkit-app-region: no-drag;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 6px;
		max-width: 190px;
		padding: 0 6px 0 10px;
		border-radius: var(--r-field) var(--r-field) 0 0;
		color: var(--muted);
		cursor: pointer;
		user-select: none;
	}

	.tab:hover {
		background: var(--soft);
		color: var(--ink);
	}

	.tab.active {
		background: var(--bg);
		color: var(--ink);
		box-shadow: inset 0 -2px 0 var(--accent);
	}

	.label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--fs-secondary);
	}

	/* Visible on the active tab and on hover only: a row of close buttons reads
	   as a row of things to dismiss rather than a row of repositories. */
	.close {
		flex: none;
		font-size: 10px;
		line-height: 1;
		color: var(--muted);
		padding: 2px;
		border-radius: var(--r-field);
		opacity: 0;
	}

	.tab:hover .close,
	.tab.active .close,
	.close:focus-visible {
		opacity: 1;
	}

	.close:hover {
		color: var(--ink);
		background: var(--soft);
	}

	.add {
		flex: none;
		width: 22px;
		color: var(--muted);
		font-size: var(--fs-title);
		line-height: 1;
		border-radius: var(--r-field);
	}

	.add:hover {
		color: var(--accent);
		background: var(--soft);
	}
</style>

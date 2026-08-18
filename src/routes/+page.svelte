<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import CommitDetail from '$lib/graph/CommitDetail.svelte';
	import CommitRows from '$lib/graph/CommitRows.svelte';
	import { graph } from '$lib/graph/store.svelte';
	import { visibility, type Mode } from '$lib/graph/visibility.svelte';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import Menu from '$lib/ui/Menu.svelte';
	import type { MenuItem } from '$lib/ui/menu';
	import Splitter from '$lib/ui/Splitter.svelte';

	const branch = $derived(repo.info?.head.branch ?? null);

	/** What the chip says the walk is currently rooted at. */
	const SCOPE: Record<Mode, { label: string; title: string }> = {
		all: { label: 'all branches', title: 'Every local and remote branch is walked' },
		hide: { label: 'some branches hidden', title: 'Everything except the branches you hid' },
		solo: { label: 'soloed', title: 'Only the branches you soloed' },
		smart: {
			label: 'smart visibility',
			title: 'The checked-out branch, what it is based on, and their upstreams'
		}
	};

	const scope = $derived(SCOPE[visibility.mode]);

	/**
	 * The visibility gear.
	 *
	 * It sits in the graph's own header rather than in Settings because it is a
	 * per-repository view control that gets changed several times an hour, and
	 * anything you reach for that often belongs next to what it changes. The
	 * modes are listed with their effect spelled out, and whatever you hid or
	 * soloed is listed underneath so there is always a way back — a filter you
	 * cannot see is a filter you forget is on.
	 */
	let gear = $state<{ x: number; y: number } | null>(null);

	const gearItems = $derived<MenuItem[]>([
		{ heading: 'Show' },
		{
			id: 'all',
			label: `${visibility.mode === 'all' ? '✓ ' : '   '}All branches`,
			run: () => visibility.showAll()
		},
		{
			id: 'smart',
			label: `${visibility.mode === 'smart' ? '✓ ' : '   '}Smart branch visibility`,
			note: 'checked-out branch and its upstreams',
			run: () => visibility.setMode('smart')
		},
		...(visibility.hidden.length > 0
			? ([{ separator: true as const }, { heading: 'Hidden' }] as MenuItem[]).concat(
					visibility.hidden.map((name) => ({
						id: `unhide:${name}`,
						label: name,
						note: 'unhide',
						run: () => visibility.unhide(name)
					}))
				)
			: []),
		...(visibility.soloed.length > 0
			? ([{ separator: true as const }, { heading: 'Soloed' }] as MenuItem[]).concat(
					visibility.soloed.map((name) => ({
						id: `unsolo:${name}`,
						label: name,
						note: 'stop soloing',
						run: () => visibility.showAll()
					}))
				)
			: []),
		...(visibility.pinned.length > 0
			? ([{ separator: true as const }, { heading: 'Pinned left' }] as MenuItem[]).concat(
					visibility.pinned.map((name) => ({
						id: `unpin:${name}`,
						label: name,
						note: 'unpin',
						run: () => visibility.togglePin(name)
					}))
				)
			: [])
	]);

	function openGear(event: MouseEvent) {
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		// Anchored to the button's bottom-left, so the menu hangs under the gear
		// instead of under the pointer — this one is clicked, not right-clicked.
		gear = { x: box.left, y: box.bottom + 4 };
	}

	function openDiff(id: string) {
		goto(`/diff?commit=${id}`);
	}
</script>

<div class="screen">
	<div class="column">
		<header class="head">
			<div class="left">
				<span class="title">Graph</span>
				{#if branch}<Chip active>{branch}</Chip>{/if}
				<Chip active={visibility.filtered} title={scope.title}>{scope.label}</Chip>
			</div>
			<div class="right">
				<button
					class="gear"
					aria-label="Branch visibility"
					title="Branch visibility"
					onclick={openGear}
				>
					⚙
				</button>
			</div>
		</header>

		{#if repo.info === null}
			<div class="empty">
				{#if repo.busy}
					<span class="note">Opening…</span>
				{:else}
					<p class="note">No repository open.</p>
					<Btn primary onclick={() => repo.choose()}>Open repository…</Btn>
					{#if repo.error}<p class="note error">{repo.error}</p>{/if}
				{/if}
			</div>
		{:else if graph.error && graph.count === 0}
			<div class="empty">
				<p class="note error">{graph.error}</p>
			</div>
		{:else if graph.count === 0}
			<div class="empty"><span class="note">Walking history…</span></div>
		{:else}
			<CommitRows onopen={openDiff} onwip={() => goto('/changes')} />
		{/if}

		<footer class="foot">
			<span class="note">drag a branch onto another to merge, rebase or fast-forward</span>
			<span class="note">right-click a row for the full menu · double-click a row to open its diff</span>
		</footer>
	</div>

	<Splitter panel="detail" label="Resize the detail panel" />
	<CommitDetail onopen={openDiff} />
</div>

{#if gear}
	<Menu
		x={gear.x}
		y={gear.y}
		items={gearItems}
		label="Branch visibility"
		onclose={() => (gear = null)}
	/>
{/if}

<style>
	.screen {
		flex: 1;
		min-width: 0;
		display: flex;
		overflow: hidden;
	}

	.column {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 12px;
		border-bottom: 1.5px solid var(--soft);
		flex: none;
	}

	.left,
	.right {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.left {
		gap: 8px;
	}

	.title {
		font-size: var(--fs-title);
	}

	.gear {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border: 1.5px solid transparent;
		border-radius: var(--r-chip);
		background: none;
		color: var(--dim);
		cursor: pointer;
	}

	.gear:hover {
		border-color: var(--line);
		color: var(--ink);
	}

	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.error {
		color: var(--accent);
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px;
		border-top: 1.5px solid var(--soft);
		flex: none;
	}
</style>

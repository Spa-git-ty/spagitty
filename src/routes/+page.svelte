<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import CommitDetail from '$lib/graph/CommitDetail.svelte';
	import CommitRows from '$lib/graph/CommitRows.svelte';
	import { graph } from '$lib/graph/store.svelte';
	import { visibility, type Mode } from '$lib/graph/visibility.svelte';
	import { relativeTime } from '$lib/format';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import Menu from '$lib/ui/Menu.svelte';
	import type { MenuItem } from '$lib/ui/menu';
	import Icon from '$lib/ui/Icon.svelte';
	import { panels } from '$lib/panels.svelte';
	import Splitter from '$lib/ui/Splitter.svelte';

	const branch = $derived(repo.info?.head.branch ?? null);

	/** Whether the commit detail panel is put away. */
	const detailHidden = $derived(panels.isHidden('detail'));

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
	 * What the footer says (FEAT-040).
	 *
	 * It used to carry two lines telling the user how to operate the screen they
	 * were already operating — the last of the copy TASK-007 and TASK-009 took
	 * out everywhere else. In its place, the three things a person actually
	 * wants to know while looking at a graph, and each of them is a fact this
	 * screen already has or can get honestly.
	 *
	 * `now` is a signal so the ages re-read when anything else on the screen
	 * changes; nothing here polls. A footer that ticks would draw the eye to the
	 * least important row on the screen.
	 */
	let now = $state(Date.now());

	const changed = $derived(repo.counts.working);

	const refreshed = $derived(
		graph.refreshedAt === null ? null : relativeTime(graph.refreshedAt, now)
	);

	const fetched = $derived.by(() => {
		if (!repo.info) return null;
		const at = repo.info.lastFetched;
		return at === null ? 'never fetched' : `fetched ${relativeTime(at, now)}`;
	});

	// The ages are re-read whenever the walk finishes or the counts change,
	// which is every moment the numbers behind them could have moved.
	$effect(() => {
		void graph.refreshedAt;
		void repo.counts.working;
		void repo.info?.lastFetched;
		now = Date.now();
	});

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
	let gear = $state<{ x: number; y: number; anchor: HTMLElement } | null>(null);

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
		// Clicking the gear again closes it — see BUG-018 and the `anchor` note
		// on `Menu`.
		if (gear) {
			gear = null;
			return;
		}
		const button = event.currentTarget as HTMLElement;
		const box = button.getBoundingClientRect();
		// Anchored to the button's bottom-left, so the menu hangs under the gear
		// instead of under the pointer — this one is clicked, not right-clicked.
		gear = { x: box.left, y: box.bottom + 4, anchor: button };
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
				<!--
					The detail panel had no way to go away (FEAT-054). It is a
					third of the window on a laptop, and reading a wide commit
					message meant dragging it shut and dragging it back.
				-->
				<button
					class="gear"
					aria-label={detailHidden ? 'Show the detail panel' : 'Hide the detail panel'}
					title={detailHidden ? 'Show the detail panel' : 'Hide the detail panel'}
					aria-pressed={!detailHidden}
					onclick={() => panels.toggleHidden('detail')}
				>
					<Icon name={detailHidden ? 'chevron-left' : 'chevron-right'} size="1.1em" />
				</button>
				<button
					class="gear"
					aria-label="Branch visibility"
					title="Branch visibility"
					onclick={openGear}
				>
					<Icon name="settings" size="1.1em" />
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
			<span class="note">
				{#if changed === null}
					working copy not read yet
				{:else if changed === 0}
					no changed files
				{:else if changed === 1}
					1 changed file
				{:else}
					{changed} changed files
				{/if}
			</span>
			<span class="note">
				{#if refreshed}refreshed {refreshed}{:else}walking…{/if}
				{#if fetched}<span class="dot" aria-hidden="true">·</span>{fetched}{/if}
			</span>
		</footer>
	</div>

	<!-- Both go together: a divider with nothing on one side of it resizes
	     nothing. -->
	{#if !detailHidden}
		<Splitter panel="detail" label="Resize the detail panel" />
		<CommitDetail onopen={openDiff} />
	{/if}
</div>

{#if gear}
	<Menu
		x={gear.x}
		y={gear.y}
		anchor={gear.anchor}
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
		background-color: var(--chrome-veil);
		border-bottom: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
		box-shadow: none;
		position: relative;
		z-index: 1;
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

	/* `--r-chip` and `--dim` were never tokens — both silently resolved to
	   nothing, so these buttons had square corners and inherited colour. */
	.gear {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: 1px solid transparent;
		border-radius: var(--r-button);
		background: none;
		color: var(--muted);
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease),
			color var(--t-fast) var(--ease),
			transform var(--t-fast) var(--spring);
	}

	.gear:hover {
		background: var(--hover);
		color: var(--accent);
	}

	.gear:active {
		transform: scale(0.92);
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
		color: var(--danger);
	}

	.dot {
		margin: 0 6px;
		color: var(--muted);
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px;
		background-color: var(--chrome-veil);
		border-top: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
		box-shadow: none;
		position: relative;
		z-index: 1;
		flex: none;
	}
</style>

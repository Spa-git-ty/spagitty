<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { clone } from '$lib/clone/store.svelte';
	import { commandLog } from '$lib/commandlog/store.svelte';
	import { fetchAll, pull, pushCurrent } from '$lib/graph/actions';
	import Menu from '$lib/ui/Menu.svelte';
	import type { MenuItem } from '$lib/ui/menu';
	import { repo } from '$lib/repo.svelte';
	import { settings } from '$lib/settings/store.svelte';

	const head = $derived(repo.info?.head ?? null);

	/**
	 * Actions that are still not built say so when you point at them, rather
	 * than failing silently when clicked. Fetch and Push used to be among them
	 * and no longer are: FEAT-022 built both, and a button that claims to be
	 * unbuilt while the palette runs the same operation is a worse lie than the
	 * original one.
	 */
	const PENDING = 'Not built yet';

	interface ToolItem {
		glyph: string;
		label: string;
		/** Where it goes, for the actions that are a screen. */
		href?: string;
		/** What it does, for the actions that are not. */
		act?: () => void;
		title?: string;
		/** Offers a choice of how, on right-click. */
		menu?: boolean;
	}

	/**
	 * Three groups, divided: what has happened, what talks to a remote, and what
	 * moves work about. Grouping is how a row of eight glyphs becomes something
	 * you can aim at without reading every label.
	 */
	let pullMenu = $state<{ x: number; y: number } | null>(null);

	function openPullMenu(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		pullMenu = { x: event.clientX, y: event.clientY };
	}

	/**
	 * The three ways to pull, offered rather than assumed.
	 *
	 * Clicking Pull takes the fast-forward-only path, because it is the one that
	 * cannot go wrong: it either moves the branch forward or refuses and says so.
	 * Merging and rebasing both write history and both can stop in a conflict, so
	 * they are a deliberate choice rather than what a single click does.
	 */
	const PULL_ITEMS: MenuItem[] = [
		{ heading: 'Pull' },
		{
			id: 'ff',
			label: 'Fast-forward only',
			note: 'never writes a commit',
			run: () => pull('fastForwardOnly')
		},
		{ id: 'merge', label: 'Merge if it cannot fast-forward', run: () => pull('merge') },
		{
			id: 'rebase',
			label: 'Rebase my commits on top',
			note: 'rewrites them',
			danger: true,
			run: () => pull('rebase')
		}
	];

	const GROUPS: ToolItem[][] = [
		[
			{ glyph: '↺', label: 'Undo', title: PENDING },
			{ glyph: '↻', label: 'Redo', title: PENDING }
		],
		[
			{
				glyph: '⇓',
				label: 'Pull',
				title: 'Fetch and bring the upstream in — right-click for how',
				act: () => pull(),
				menu: true
			},
			{ glyph: '⇩', label: 'Fetch', title: 'Fetch every remote, pruning', act: () => fetchAll() },
			{
				glyph: '⇧',
				label: 'Push',
				title: 'Push the current branch',
				act: () => pushCurrent()
			},
			{ glyph: '⎘', label: 'Clone', title: 'Bring a repository in', act: () => clone.show() }
		],
		[
			{ glyph: '⑃', label: 'Branch', href: '/branches' },
			{ glyph: '▤', label: 'Stash', href: '/stash' },
			{ glyph: '✎', label: 'Rebase', href: '/rebase' }
		]
	];
</script>

{#if pullMenu}
	<Menu
		x={pullMenu.x}
		y={pullMenu.y}
		label="How to pull"
		items={PULL_ITEMS}
		onclose={() => (pullMenu = null)}
	/>
{/if}

<div class="toolbar">
	<div class="pickers">
		<div class="picker">
			<span class="note">repository</span>
			<button class="field" onclick={() => goto('/repos')}>
				<span class="value">{repo.info?.name ?? 'no repository'}</span>
				<span class="mono muted" aria-hidden="true">▾</span>
			</button>
		</div>
		<div class="picker">
			<span class="note">branch</span>
			<button class="field" onclick={() => goto('/branches')}>
				<span class="value">{head?.branch ?? head?.short ?? '—'}</span>
				<span class="mono muted" aria-hidden="true">▾</span>
			</button>
		</div>
	</div>

	<!--
		The actions sit in the middle of the bar rather than packed against the
		pickers: they belong to the repository as a whole, and on a wide window a
		left-packed row leaves them stranded beside the branch name with an ocean
		to their right.
	-->
	<div class="actions">
		{#each GROUPS as group, index (index)}
			{#if index > 0}
				<span class="vr" style="height: 26px"></span>
			{/if}
			{#each group as action (action.label)}
				<button
					class="tool"
					title={action.title}
					oncontextmenu={(event) => action.menu && openPullMenu(event)}
					onclick={() => (action.act ? action.act() : action.href && goto(action.href))}
				>
					<span aria-hidden="true">{action.glyph}</span>
					<span>{action.label}</span>
				</button>
			{/each}
		{/each}
	</div>

	<!--
		Only when the toggle is on. The feature is opt-in, and a button for it
		sitting in the chrome of every session would be a second, quieter answer
		to a question Settings already asks.
	-->
	{#if settings.settings.showGitCommands}
		<span class="vr" style="height: 26px"></span>
		<button
			class="tool"
			title="What GitLumiere has run"
			aria-pressed={commandLog.open}
			onclick={() => commandLog.toggle()}
		>
			<span aria-hidden="true">≡</span><span>Commands</span>
		</button>
	{/if}

	<!--
		No Commit button. Committing is the Working copy screen's job — it has the
		message box, the staged list and its own Commit — and a second one here
		was a button that could not do what it said: it navigated. The staged
		count went with it, to the screen that can act on it.
	-->
</div>

<style>
	/*
	 * Three tracks, and the outer two are equal.
	 *
	 * The actions used to be centred with `margin: 0 auto` inside a flex row
	 * whose first child grows, which centres them in *what is left over* rather
	 * than in the bar — so they sat right of centre by half the pickers' width.
	 * Equal outer tracks put them in the middle of the window, which is where
	 * they look aimed.
	 */
	.toolbar {
		height: var(--toolbar-h);
		flex: none;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 16px;
		padding: 0 12px;
		border-bottom: 1.5px solid var(--line);
	}

	/* The command log toggle rides in the third track, at its right edge. */
	.toolbar > :global(.vr:last-of-type),
	.toolbar > .tool {
		justify-self: end;
	}

	.pickers {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 280px;
	}

	.picker {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
		min-width: 0;
	}

	.field {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 4px 6px;
		border: 1.5px solid var(--line);
		border-radius: var(--r-field);
		min-width: 0;
	}

	.field:hover {
		border-color: var(--accent);
	}

	.value {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
	}

	.tool {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		font-size: var(--fs-mono);
		color: var(--muted);
		min-width: 44px;
		user-select: none;
	}

	.tool:hover {
		color: var(--accent);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}
</style>

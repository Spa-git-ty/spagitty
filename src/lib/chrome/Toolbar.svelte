<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { branches } from '$lib/branches/store.svelte';
	import { clone } from '$lib/clone/store.svelte';
	import { commandLog } from '$lib/commandlog/store.svelte';
	import { fetchAll, pull, pushCurrent } from '$lib/graph/actions';
	import Menu from '$lib/ui/Menu.svelte';
	import type { MenuItem } from '$lib/ui/menu';
	import { repo } from '$lib/repo.svelte';
	import { settings } from '$lib/settings/store.svelte';

	const head = $derived(repo.info?.head ?? null);

	/**
	 * The location line, and the dropdown that is actually a dropdown (FEAT-045).
	 *
	 * The repository's name is text: a name, not a control. What used to be a
	 * button here navigated to All repositories, which the rail and the tabs row
	 * both already reach, so the third route was a control that looked like a
	 * list and replaced the screen instead.
	 */
	const branchLabel = $derived(head?.branch ?? head?.short ?? '—');

	let branchMenu = $state<{ x: number; y: number } | null>(null);

	/**
	 * Opened under the control rather than at the pointer, so a keyboard
	 * activation puts the list in the same place a click does.
	 *
	 * The list is loaded on opening and not before: the toolbar is drawn for
	 * every screen, and reading every branch on start-up to fill a menu nobody
	 * opened is work done for nothing. `branches.load` is the same call the
	 * Branches screen makes and is guarded by the store's own sequence counter,
	 * so the two cannot race into a stale list.
	 */
	function openBranchMenu(event: MouseEvent) {
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		branchMenu = { x: box.left, y: box.bottom + 4 };
		if (!branches.loaded && !branches.loading) void branches.load();
	}

	/**
	 * Local branches only.
	 *
	 * A remote-tracking ref is not a thing to check out — doing so detaches HEAD
	 * — so offering one in a switcher is how an accidental detached HEAD
	 * happens. The Branches screen still shows every ref there is.
	 *
	 * The branch already checked out is listed, disabled, with its reason, which
	 * is the convention `Menu` is built around: a list whose contents change with
	 * state is one nobody can learn.
	 */
	const BRANCH_ITEMS: MenuItem[] = $derived.by(() => {
		const heading: MenuItem = { heading: 'Switch to' };

		if (!branches.loaded) {
			return [heading, { id: 'loading', label: 'reading branches…', disabled: true, run: () => {} }];
		}

		const local = branches.rows.filter((row) => row.kind === 'branch');
		if (local.length === 0) {
			return [heading, { id: 'none', label: 'no local branches', disabled: true, run: () => {} }];
		}

		return [
			heading,
			...local.map((row) => ({
				id: row.fullName,
				label: row.name,
				note: row.upstream ?? undefined,
				disabled: row.current,
				reason: row.current ? 'already on it' : undefined,
				run: () => {
					void branches.checkout(row.name);
				}
			}))
		];
	});

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

{#if branchMenu}
	<Menu
		x={branchMenu.x}
		y={branchMenu.y}
		label="Switch branch"
		items={BRANCH_ITEMS}
		onclose={() => (branchMenu = null)}
	/>
{/if}

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
	<!--
		Where you are: the repository, then the branch. The name is text and the
		branch is a real list (FEAT-045).
	-->
	<div class="location">
		{#if repo.info}
			<span class="repo" title={repo.info.path}>{repo.info.name}</span>
			<span class="sep" aria-hidden="true">›</span>
			<button
				class="field"
				aria-haspopup="menu"
				aria-expanded={branchMenu !== null}
				title="Switch branch"
				onclick={openBranchMenu}
			>
				<span class="value">{branchLabel}</span>
				<span class="mono muted" aria-hidden="true">▾</span>
			</button>
		{:else}
			<span class="repo none">no repository</span>
		{/if}

		<!--
			A checkout git refused. It is said here, where the action was taken,
			rather than left for the Branches screen to show — that screen may
			never be opened, and a switch that silently did not happen is the
			worst outcome this control has.
		-->
		{#if branches.writeError}
			<span class="note error" role="alert" title={branches.writeError}>{branches.writeError}</span>
		{/if}
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
			title="What Spagitty has run"
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

	.location {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.repo {
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.repo.none {
		font-weight: 400;
		color: var(--muted);
	}

	.sep {
		color: var(--muted);
	}

	/*
	 * Long enough to say why, truncated rather than allowed to grow: the
	 * actions sit in the middle track and a message that widened this one would
	 * push them off centre.
	 */
	.error {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--accent);
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

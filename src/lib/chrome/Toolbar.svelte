<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { branches } from '$lib/branches/store.svelte';
	import { clone } from '$lib/clone/store.svelte';
	import { commandLog } from '$lib/commandlog/store.svelte';
	import { fetchAll, pull, pushCurrent } from '$lib/graph/actions';
	import { network } from '$lib/network/store.svelte';
	import { remotes } from '$lib/remotes/store.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import type { IconName } from '$lib/ui/icons';
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

	let branchMenu = $state<{ x: number; y: number; anchor: HTMLElement } | null>(null);

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
		// A second click on the control closes it. `Menu` leaves mousedowns on
		// its anchor alone precisely so that this decision is made here, once,
		// rather than by a mousedown that closes and a click that reopens
		// (BUG-018).
		if (branchMenu) {
			branchMenu = null;
			return;
		}
		const button = event.currentTarget as HTMLElement;
		const box = button.getBoundingClientRect();
		branchMenu = { x: box.left, y: box.bottom + 4, anchor: button };
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
		icon: IconName;
		label: string;
		/** Where it goes, for the actions that are a screen. */
		href?: string;
		/** What it does, for the actions that are not. */
		act?: () => void;
		title?: string;
		/** Offers a choice of how, on right-click. */
		menu?: boolean;
		/** Offers a choice of which remote, on right-click (FEAT-018). */
		fetchMenu?: boolean;
	}

	/**
	 * Three groups, divided: what has happened, what talks to a remote, and what
	 * moves work about. Grouping is how a row of eight glyphs becomes something
	 * you can aim at without reading every label.
	 */
	let pullMenu = $state<{ x: number; y: number } | null>(null);
	let fetchMenu = $state<{ x: number; y: number } | null>(null);

	/**
	 * Right-clicking Fetch offers one remote at a time (FEAT-018).
	 *
	 * Every layer has taken a remote since the plumbing was built; the button
	 * always sent the empty string, so "fetch one remote" existed everywhere
	 * except where somebody could ask for it. The list is read on opening the
	 * menu rather than kept live: remotes change about once a year, and a store
	 * loaded on every repository change to fill a menu nobody opened would be
	 * work done for nothing.
	 */
	async function openFetchMenu(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		await remotes.load();
		fetchMenu = { x: event.clientX, y: event.clientY };
	}

	const FETCH_ITEMS = $derived<MenuItem[]>([
		{ heading: 'Fetch' },
		{
			id: 'all',
			label: 'Every remote',
			note: settings.settings.pruneOnFetch ? 'pruning' : undefined,
			run: () => void fetchAll()
		},
		...(remotes.list.length > 0 ? [{ separator: true as const }] : []),
		...remotes.list.map((remote) => ({
			id: remote.name,
			label: remote.name,
			note: remote.url,
			run: () => void network.fetch(remote.name)
		}))
	]);

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
			{ icon: 'undo', label: 'Undo', title: PENDING },
			{ icon: 'redo', label: 'Redo', title: PENDING }
		],
		[
			{
				icon: 'pull',
				label: 'Pull',
				title: 'Fetch and bring the upstream in — right-click for how',
				act: () => pull(),
				menu: true
			},
			{
				icon: 'fetch',
				label: 'Fetch',
				title: settings.settings.pruneOnFetch
					? 'Fetch every remote, pruning — right-click for one'
					: 'Fetch every remote — right-click for one',
				act: () => fetchAll(),
				fetchMenu: true
			},
			{
				icon: 'push',
				label: 'Push',
				title: 'Push the current branch',
				act: () => pushCurrent()
			},
			{ icon: 'clone', label: 'Clone', title: 'Bring a repository in', act: () => clone.show() }
		],
		[
			{ icon: 'branch', label: 'Branch', href: '/branches' },
			{ icon: 'stash', label: 'Stash', href: '/stash' },
			{ icon: 'rebase', label: 'Rebase', href: '/rebase' }
		]
	];
</script>

{#if branchMenu}
	<Menu
		x={branchMenu.x}
		y={branchMenu.y}
		anchor={branchMenu.anchor}
		label="Switch branch"
		items={BRANCH_ITEMS}
		onclose={() => (branchMenu = null)}
	/>
{/if}

{#if fetchMenu}
	<Menu
		x={fetchMenu.x}
		y={fetchMenu.y}
		label="What to fetch"
		items={FETCH_ITEMS}
		onclose={() => (fetchMenu = null)}
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

		<!--
			What the network is doing, in git's own words (FEAT-018). Beside the
			location rather than over the buttons: it is about the repository,
			and a spinner on the button that started it would move the target
			out from under the pointer.
		-->
		{#if network.running}
			<span class="note working" role="status">{network.label}</span>
		{:else if network.error}
			<span class="note error" role="alert" title={network.error}>{network.error}</span>
		{:else if network.summary}
			<span class="note" title={network.summary}>{network.summary}</span>
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
					oncontextmenu={(event) => {
						if (action.menu) openPullMenu(event);
						else if (action.fetchMenu) void openFetchMenu(event);
					}}
					onclick={() => (action.act ? action.act() : action.href && goto(action.href))}
				>
					<Icon name={action.icon} size="1.25em" />
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
		background-color: var(--chrome-veil);
		border-bottom: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
		/* The pane casts onto whatever screen is under it, which is what stops
		   the toolbar and the content it sits above reading as one surface. */
		box-shadow:
			var(--glass-rim),
			0 1px 3px color-mix(in srgb, var(--umbra) 8%, transparent);
		position: relative;
		z-index: 2;
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

	/* git's own progress line, which can be long. It gets whatever room is
	   left rather than pushing the branch picker off the bar. */
	.working {
		min-width: 0;
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
	/* An error on the toolbar is the palette's red, which is what the rest of
	   the application now uses to mean "this did not work". */
	.error {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--danger);
	}

	/* The branch and remote pickers. Wells, like every other field — they are
	   read as "this is the current one, click to change it". */
	.field {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 4px 7px;
		border: 1px solid var(--line);
		border-radius: var(--r-field);
		background: var(--sunken);
		box-shadow: inset 0 1px 2px color-mix(in srgb, var(--umbra) 6%, transparent);
		min-width: 0;
		transition:
			border-color var(--t-fast) var(--ease),
			background var(--t-fast) var(--ease);
	}

	.field:hover {
		border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
		background: color-mix(in srgb, var(--sunken) 88%, var(--accent) 6%);
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
		padding: 3px 6px;
		border-radius: var(--r-button);
		font-size: var(--fs-mono);
		color: var(--muted);
		min-width: 44px;
		user-select: none;
		transition:
			background var(--t-fast) var(--ease),
			color var(--t-fast) var(--ease);
	}

	.tool:hover {
		color: var(--accent);
		background: var(--accent-soft);
	}

	.tool:active {
		background: var(--press);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}
</style>

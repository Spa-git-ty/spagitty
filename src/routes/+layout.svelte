<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import '../app.css';

	import * as api from '$lib/api';
	import CloneModal from '$lib/clone/CloneModal.svelte';
	import { clone } from '$lib/clone/store.svelte';
	import { network } from '$lib/network/store.svelte';
	import { rebase } from '$lib/rebase/store.svelte';
	import CommandLog from '$lib/commandlog/CommandLog.svelte';
	import { commandLog } from '$lib/commandlog/store.svelte';
	import NavRail from '$lib/chrome/NavRail.svelte';
	import ResizeEdges from '$lib/chrome/ResizeEdges.svelte';
	import { appWindow } from '$lib/chrome/window';
	import RepoTabs from '$lib/chrome/RepoTabs.svelte';
	import StatusStrip from '$lib/chrome/StatusStrip.svelte';
	import TitleBar from '$lib/chrome/TitleBar.svelte';
	import Toolbar from '$lib/chrome/Toolbar.svelte';
	import { graph } from '$lib/graph/store.svelte';
	import { ROW_PITCH } from '$lib/metrics';
	import Palette from '$lib/palette/Palette.svelte';
	import { palette } from '$lib/palette/store.svelte';
	import { registerCommands } from '$lib/palette/commands';
	import { panels } from '$lib/panels.svelte';
	import { repo } from '$lib/repo.svelte';
	import { scale } from '$lib/scale.svelte';
	import { settings } from '$lib/settings/store.svelte';
	import Dialog from '$lib/ui/Dialog.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import Splitter from '$lib/ui/Splitter.svelte';
	import { theme } from '$lib/theme.svelte';
	import { workspace } from '$lib/workspace.svelte';
	import { REPO_CHANGED_EVENT, type RepoChangedEvent } from '$lib/types';

	let { children } = $props();

	/** Re-walk when a ref moves, but not on every keystroke into a rebase. */
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;

	const cleanups: Array<() => void> = [];

	onMount(() => {
		theme.init();
		// Publishes the structural metrics as well as the type scale, at the
		// stored zoom — so there is no frame at 100% before the user's zoom
		// arrives.
		scale.init();
		// After the metrics, so stored panel widths win over the defaults.
		panels.init();
		// The tab strip, before anything can open a repository into it.
		workspace.init();
		registerCommands();
		// The window's own corner and shadow come off when it is maximized, and
		// CSS cannot ask Tauri whether it is (FEAT-037).
		appWindow.watchMaximized().then((off) => cleanups.push(off));

		if (!api.inTauri()) return;

		let cancelled = false;

		(async () => {
			// Listeners go up before anything can emit, so the first batch of a
			// walk is never missed.
			cleanups.push(await graph.attach());
			// A clone survives navigation, so its listener belongs to the shell
			// rather than to whichever screen started it.
			cleanups.push(await clone.attach());
			// A rebase survives navigation for the same reason: people leave the
			// screen for Conflicts while it is still running, and its progress
			// must not stop being heard when they do.
			cleanups.push(await rebase.attach());
			// A fetch survives navigation too: somebody who starts one from the
			// toolbar and walks to Branches should not stop hearing about it.
			cleanups.push(await network.attach());
			// Recording starts with the app, not with the panel: turning the
			// toggle on mid-session should show what has already run.
			cleanups.push(await commandLog.attach());

			// The toggles are read once, here, rather than by the Settings
			// screen alone. Everything that consults them — the confirmation
			// before a history rewrite, the command log — is reachable without
			// ever opening Settings, and until this read lands they answer from
			// the defaults instead of from what the user chose.
			settings.load();

			const off: UnlistenFn = await listen<RepoChangedEvent>(
				REPO_CHANGED_EVENT,
				(event) => {
					if (event.payload.refs) {
						// Refs moved: HEAD, the chips and the history itself are
						// all potentially stale, so re-read and re-walk.
						if (refreshTimer) clearTimeout(refreshTimer);
						refreshTimer = setTimeout(() => {
							repo.refresh();
							graph.reload();
						}, 100);
					} else if (event.payload.worktree) {
						repo.refresh();
					}
				}
			);
			cleanups.push(off);

			// Guard against the two definitions of the row pitch drifting apart.
			try {
				const rust = await api.metrics();
				if (rust.rowPitch !== ROW_PITCH) {
					console.error(
						`row pitch mismatch: Rust says ${rust.rowPitch}, frontend says ${ROW_PITCH}. ` +
							'Lanes and rows will not line up.'
					);
				}
			} catch {
				// Older backend without the command; not fatal.
			}

			if (cancelled) return;

			const launch = await api.launchPath();
			if (launch) await repo.open(launch);
		})();

		return () => {
			cancelled = true;
			if (refreshTimer) clearTimeout(refreshTimer);
			for (const cleanup of cleanups) cleanup();
		};
	});

	/**
	 * `Ctrl+F` — or the command key equivalent on macOS — reaches Log search from
	 * anywhere, with the first field focused. The focus is carried in the URL
	 * rather than through a store, so the same shortcut and a bookmark behave
	 * identically.
	 */
	function shortcut(event: KeyboardEvent) {
		if (!(event.metaKey || event.ctrlKey) || event.altKey) return;

		switch (event.key) {
			case 'f':
				event.preventDefault();
				goto('/search?focus=1');
				return;
			case 'p':
				event.preventDefault();
				palette.toggle();
				return;
			// `=` is the unshifted key most keyboards put `+` on, and browsers
			// report both. Accepting only one means the shortcut works on some
			// layouts and not others.
			case '+':
			case '=':
				event.preventDefault();
				scale.zoomIn();
				return;
			case '-':
				event.preventDefault();
				scale.zoomOut();
				return;
			case '0':
				event.preventDefault();
				scale.reset();
				return;
		}
	}

	// A newly opened repository means a fresh walk.
	let lastGeneration = 0;
	$effect(() => {
		if (repo.generation !== lastGeneration) {
			lastGeneration = repo.generation;
			graph.restart();
		}
	});
</script>

<svelte:window onkeydown={shortcut} />

<div class="app">
	<TitleBar />
	<!-- Its own row, and absent when nothing is open (FEAT-044). -->
	<RepoTabs />
	<Toolbar />
	<div class="main">
		<NavRail />
		<Splitter panel="rail" label="Resize the nav rail" />
		{@render children()}
	</div>
	<!--
		The window's own bottom edge (FEAT-043). Outside `.main`, so it spans the
		rail as well as the screen, and after it, so nothing scrolls over it.
	-->
	<StatusStrip />
</div>

<!--
	Mounted here rather than by a screen: a clone keeps running while the user
	navigates, and a modal owned by a screen would go with it.
-->
<CloneModal />

<!-- Reaches every command from every screen, so it belongs to the shell. -->
<Palette />

<!--
	Every confirmation and every result. Both are mounted once, here, because an
	action started on the graph can finish after the user has navigated away —
	a dialog owned by a screen would take the question with it.
-->
<Dialog />
<Notice />

<!--
	The record of what Spagitty ran. Mounted by the shell for the same reason as
	the dialog: a command started on one screen finishes wherever the user is.
-->
<CommandLog />

<!-- The window is undecorated, so it provides its own resize edges. -->
<ResizeEdges />

<style>
	/*
	 * The card the whole application sits on (FEAT-037).
	 *
	 * The window is transparent and undecorated, so the corner, the edge and the
	 * shadow are all drawn here. Three things together make it read as a
	 * physical surface rather than a flat rectangle:
	 *
	 * - a **hairline outline** at sub-pixel width, which on a HiDPI display
	 *   lands as a real edge and on a 1x display as a faint one. Heavier and it
	 *   reads as a border, which is a different thing — a border belongs to a
	 *   component, an edge belongs to a window;
	 * - an **inset highlight** along the top, where light would catch a raised
	 *   surface. It is what stops the outline reading as a drawn line;
	 * - a **two-part shadow** — a tight, dark contact shadow holding the card
	 *   down, and a wide, soft one giving it height. One shadow can do either
	 *   but not both, and a single mid-sized blur is what makes a page look
	 *   like it has a sticker on it.
	 */
	.app {
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--bg);
		border-radius: var(--r-window);
		outline: 0.2px solid var(--window-edge);
		outline-offset: -0.2px;
		box-shadow:
			inset 0 1px 0 var(--window-sheen),
			0 1px 2px var(--window-contact),
			/*
				No negative spread. A shadow's corner radius is the box's radius
				plus its spread, so `-4px` drew the cast with an 8px corner under
				a 12px window — a squarer shape beneath a rounder one, which is
				what read as wrong. Without the shrink the cast follows the
				window exactly; the offset, blur and alpha come down together so
				the weight of it is unchanged (FEAT-042).
			*/
			0 10px 28px var(--window-cast);
	}

	/* Square against the screen edge, and nothing to cast a shadow onto. */
	:global(:root[data-window='maximized']) .app {
		border-radius: 0;
		box-shadow: inset 0 1px 0 var(--window-sheen);
	}

	.main {
		flex: 1;
		min-height: 0;
		display: flex;
		overflow: hidden;
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import '../app.css';

	import * as api from '$lib/api';
	import CloneModal from '$lib/clone/CloneModal.svelte';
	import { clone } from '$lib/clone/store.svelte';
	import NavRail from '$lib/chrome/NavRail.svelte';
	import ResizeEdges from '$lib/chrome/ResizeEdges.svelte';
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
	import Dialog from '$lib/ui/Dialog.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import Splitter from '$lib/ui/Splitter.svelte';
	import { theme } from '$lib/theme.svelte';
	import { REPO_CHANGED_EVENT, type RepoChangedEvent } from '$lib/types';

	let { children } = $props();

	/** Re-walk when a ref moves, but not on every keystroke into a rebase. */
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		theme.init();
		// Publishes the structural metrics as well as the type scale, at the
		// stored zoom — so there is no frame at 100% before the user's zoom
		// arrives.
		scale.init();
		// After the metrics, so stored panel widths win over the defaults.
		panels.init();
		registerCommands();

		if (!api.inTauri()) return;

		const cleanups: Array<() => void> = [];
		let cancelled = false;

		(async () => {
			// Listeners go up before anything can emit, so the first batch of a
			// walk is never missed.
			cleanups.push(await graph.attach());
			// A clone survives navigation, so its listener belongs to the shell
			// rather than to whichever screen started it.
			cleanups.push(await clone.attach());

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
	 * `⌘F` — or `Ctrl+F` where there is no command key — reaches Log search from
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
	<Toolbar />
	<div class="main">
		<NavRail />
		<Splitter panel="rail" label="Resize the nav rail" />
		{@render children()}
	</div>
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

<!-- The window is undecorated, so it provides its own resize edges. -->
<ResizeEdges />

<style>
	.app {
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.main {
		flex: 1;
		min-height: 0;
		display: flex;
		overflow: hidden;
	}
</style>

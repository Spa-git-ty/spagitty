<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import '../app.css';

	import * as api from '$lib/api';
	import NavRail from '$lib/chrome/NavRail.svelte';
	import ResizeEdges from '$lib/chrome/ResizeEdges.svelte';
	import TitleBar from '$lib/chrome/TitleBar.svelte';
	import Toolbar from '$lib/chrome/Toolbar.svelte';
	import { graph } from '$lib/graph/store.svelte';
	import { applyMetrics, ROW_PITCH } from '$lib/metrics';
	import { panels } from '$lib/panels.svelte';
	import { repo } from '$lib/repo.svelte';
	import Splitter from '$lib/ui/Splitter.svelte';
	import { theme } from '$lib/theme.svelte';
	import { REPO_CHANGED_EVENT, type RepoChangedEvent } from '$lib/types';

	let { children } = $props();

	/** Re-walk when a ref moves, but not on every keystroke into a rebase. */
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		theme.init();
		applyMetrics();
		// After applyMetrics, so stored panel widths win over the defaults.
		panels.init();

		if (!api.inTauri()) return;

		const cleanups: Array<() => void> = [];
		let cancelled = false;

		(async () => {
			// Listeners go up before anything can emit, so the first batch of a
			// walk is never missed.
			cleanups.push(await graph.attach());

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

	// A newly opened repository means a fresh walk.
	let lastGeneration = 0;
	$effect(() => {
		if (repo.generation !== lastGeneration) {
			lastGeneration = repo.generation;
			graph.restart();
		}
	});
</script>

<div class="app">
	<TitleBar />
	<Toolbar />
	<div class="main">
		<NavRail />
		<Splitter panel="rail" label="Resize the nav rail" />
		{@render children()}
	</div>
</div>

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

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { appWindow } from '$lib/chrome/window';
	import RepoTabs from '$lib/chrome/RepoTabs.svelte';
	import { version } from '$lib/version';

	/**
	 * The title bar is the workspace bar: what this program is, the way back to
	 * every repository, and the ones open right now.
	 *
	 * The branch used to be here as a chip. It is on the toolbar's branch picker
	 * one row below and on the active tab, and three copies of one fact is two
	 * too many — so the bar says the name of the program and gets out of the way.
	 */

	/**
	 * The window has no platform decorations, so these are the only close,
	 * minimize and maximize controls there are.
	 *
	 * Deliberately neither macOS traffic lights nor Windows' full-height filled
	 * blocks: small, evenly weighted glyph buttons that read as GitLord's own,
	 * and entirely colourless — they use the theme's neutral tokens and nothing
	 * else, including the close button.
	 */
	const CONTROLS = [
		{ kind: 'minimize', glyph: '–', label: 'Minimize', run: () => appWindow.minimize() },
		{ kind: 'maximize', glyph: '▢', label: 'Maximize', run: () => appWindow.toggleMaximize() },
		{ kind: 'close', glyph: '✕', label: 'Close', run: () => appWindow.close() }
	] as const;
</script>

<!-- Dragging the bar moves the window; double-clicking it maximizes, as a
     title bar is expected to. Controls stop the event so they don't drag. -->
<div
	class="titlebar"
	data-tauri-drag-region
	ondblclick={() => appWindow.toggleMaximize()}
	role="toolbar"
	tabindex="-1"
	aria-label="Window"
>
	<span class="name">GitLord</span>

	<!--
		Where every repository is, open or not. First in the strip because it is
		the way back when nothing is open, and because that is where the reference
		puts its equivalent.
	-->
	<button
		class="all"
		class:active={page.url.pathname === '/repos'}
		onclick={() => goto('/repos')}
	>
		All repositories
	</button>

	<RepoTabs />

	<span class="spacer"></span>

	<!--
		What the title bar says is what it knows: which repository, which branch,
		what this build is. The theme belongs to Settings → Appearance, which is
		the one place it is set; a second control here would be a second thing to
		keep in step. There was also a `⌘K` chip that opened Log search — the
		shortcut is `⌘F`, and writing a macOS key name on every platform for a
		combination that does nothing is worse than no hint at all.
	-->
	<span class="note" title={version.license}>{version.licenseShort} · v{version.number}</span>

	<div class="controls">
		{#each CONTROLS as control (control.kind)}
			<button
				class="control {control.kind}"
				title={control.label}
				aria-label={control.label}
				onclick={(event) => {
					event.stopPropagation();
					control.run();
				}}
			>
				<span aria-hidden="true">{control.glyph}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.titlebar {
		height: var(--titlebar-h);
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
		background: var(--panel);
		border-bottom: 1.5px solid var(--line);
		font-size: 12px;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 2px;
		margin-left: 4px;
		margin-right: -6px;
	}

	.control {
		width: 24px;
		height: 22px;
		border-radius: var(--r-field);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		line-height: 1;
		color: var(--muted);
		transition:
			background 0.1s ease,
			color 0.1s ease;
	}

	/* Colourless by design: no platform's palette, no red close button. The
	   affordance is a neutral tint from the theme's own tokens. */
	.control:hover {
		background: var(--stripe);
		color: var(--ink);
	}

	.control:active {
		background: var(--soft);
	}

	.all {
		flex: none;
		padding: 3px 10px;
		border-radius: var(--r-pill);
		color: var(--muted);
		font-size: var(--fs-secondary);
		white-space: nowrap;
	}

	.all:hover {
		color: var(--ink);
		background: var(--soft);
	}

	.all.active {
		color: var(--ink);
		background: var(--soft);
	}

	/* Bold, because it is the one thing on this bar that is not a control: it
	   says which program you are looking at, and everything else says state. */
	.name {
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.spacer {
		flex: 1;
	}

	.muted {
		color: var(--muted);
	}

	.note {
		font-size: var(--fs-secondary);
		color: var(--muted);
		white-space: nowrap;
	}
</style>

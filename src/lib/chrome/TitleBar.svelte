<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { appWindow } from '$lib/chrome/window';
	import { repo } from '$lib/repo.svelte';
	import { theme } from '$lib/theme.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import RefChip from '$lib/ui/RefChip.svelte';
	import { version } from '$lib/version';

	const head = $derived(repo.info?.head ?? null);

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
	<span class="name">{repo.info?.name ?? 'GitLord'}</span>

	{#if head}
		<span class="muted" aria-hidden="true">·</span>
		{#if head.branch}
			<RefChip chip={{ name: head.branch, kind: 'branch', current: true }} />
		{:else if head.short}
			<RefChip chip={{ name: `detached at ${head.short}`, kind: 'branch', current: false }} />
		{/if}
	{/if}

	<span class="spacer"></span>

	<Chip onclick={() => theme.toggle()} title="Switch between light and dark">
		{theme.isDark ? 'light' : 'dark'}
	</Chip>
	<Chip onclick={() => goto('/search')} title="Log search">⌘K</Chip>
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

	.name {
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

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">

	import { appWindow } from '$lib/chrome/window';

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
	 * blocks: small, evenly weighted glyph buttons that read as GitLumiere's own,
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
	<span class="name">GitLumiere</span>

	<!--
		The tabs and the way back to every repository were both here. The tabs
		have a row of their own now (FEAT-044) — they are a workspace control,
		and this row is window controls — and `All repositories` went with them
		rather than staying as a button that read like a tab which is always
		open. It is screen 1J on the rail, which is where the way back belongs.
	-->

	<span class="spacer"></span>

	<!--
		What the title bar says is what it knows: which repository, and the ones
		open right now. The theme belongs to Settings → Appearance, which is the
		one place it is set; a second control here would be a second thing to keep
		in step. There was also a `⌘K` chip that opened Log search — the shortcut
		is `⌘F`, and writing a macOS key name on every platform for a combination
		that does nothing is worse than no hint at all.

		The build identity — licence and version — used to sit here too. It is the
		least changing fact in the application and it was in the most contested
		row, which also has to give way to tabs as repositories are opened; it is
		on the status strip along the bottom now (FEAT-043).
	-->

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

</style>

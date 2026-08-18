<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { version } from '$lib/version';

	/**
	 * The window's bottom edge (FEAT-043).
	 *
	 * The shell had no bottom: every screen draws its own footer or none, so
	 * anything true regardless of which screen is open had nowhere to live, and
	 * the build identity ended up in the title bar — the most contested row in
	 * the window, shared with the repository tabs.
	 *
	 * The strip carries **one** thing, at its right end. The left end is empty
	 * on purpose: a status bar filled with second copies of what the rail and
	 * toolbar already say is how it becomes noise, and the first thing put there
	 * should have to argue for itself.
	 */
</script>

<div class="strip" role="contentinfo" aria-label="Application status">
	<span class="left"></span>
	<span class="note mono" title={version.license}>
		{version.licenseShort} · v{version.number}
	</span>
</div>

<style>
	.strip {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 0 10px;
		height: var(--strip-h);
		border-top: 1.5px solid var(--line);
		background: var(--panel);
	}

	.left {
		min-width: 0;
	}

	.note {
		font-size: var(--fs-secondary);
		color: var(--muted);
		white-space: nowrap;
	}
</style>

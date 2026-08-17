<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import Chip from '$lib/ui/Chip.svelte';
	import type { Settings } from '$lib/types';
	import { settings } from './store.svelte';

	/**
	 * GitLord's own preferences, stored in its config directory rather than in
	 * `.git/config` — none of them is a fact about a repository.
	 *
	 * **A toggle that does nothing yet says so.** Each one below persists, and
	 * each names the work item that will make it take effect. Narrowing the
	 * claim to the truth is the honest half of this screen: a switch that
	 * silently does nothing is worse than one that says it is waiting.
	 */
	const TOGGLES: { key: keyof Settings; label: string; what: string; pending: string | null }[] = [
		{
			key: 'signCommits',
			label: 'Sign my commits',
			what: 'Pass --gpg-sign when committing, using whichever program git is configured with.',
			pending: 'FEAT-019 — committing does not read this yet.'
		},
		{
			key: 'confirmHistoryRewrite',
			label: 'Ask before rewriting history',
			what: 'Confirm before anything that changes commits that already exist.',
			pending: 'FEAT-015 — nothing in this build rewrites history yet.'
		},
		{
			key: 'showGitCommands',
			label: 'Show the git command behind each action',
			// Not "the equivalent command line": what is shown is the command that
			// ran, recorded where it was spawned. Reads never run one, and the
			// panel says so rather than inventing one.
			what: 'Adds a Commands panel listing every git command GitLord executes.',
			pending: null
		}
	];
</script>

<section class="section">
	<header>
		<h2 class="heading">Behaviour</h2>
		<span class="note">Stored in GitLord's own configuration, not in any repository.</span>
	</header>

	{#each TOGGLES as toggle (toggle.key)}
		<div class="row">
			<Chip
				active={settings.settings[toggle.key]}
				onclick={() => settings.toggle(toggle.key)}
				title={toggle.what}
			>
				{settings.settings[toggle.key] ? 'on' : 'off'}
			</Chip>
			<div class="text">
				<div>{toggle.label}</div>
				<div class="note">{toggle.what}</div>
				{#if toggle.pending}
					<div class="note">Persisted, not yet honoured: {toggle.pending}</div>
				{/if}
			</div>
		</div>
	{/each}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: 640px;
	}

	.heading {
		margin: 0;
		font-size: var(--fs-ui);
		font-weight: inherit;
	}

	.row {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.text {
		min-width: 0;
	}
</style>

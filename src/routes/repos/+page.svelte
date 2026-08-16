<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import RepoCard from '$lib/repos/RepoCard.svelte';
	import { repos } from '$lib/repos/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	/**
	 * Every repository you work in, and which ones need attention.
	 *
	 * Unlike the other screens this one does not need a repository open: it is
	 * where you go when none is, so it loads on mount rather than on the open
	 * repository changing.
	 */

	onMount(() => {
		repos.load();
	});

	const needing = $derived(repos.needingAttention);
	const idle = $derived(repos.idle);
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">Your repositories</span>
			{#if repos.loaded && repos.cards.length > 0}
				<span class="note">
					{repos.cards.length === 1 ? '1 repository' : `${repos.cards.length} repositories`}
				</span>
			{/if}
		</div>
		<div class="right">
			{#if repos.loading}<span class="note">Reading…</span>{/if}
			<Btn disabled={repos.busy} onclick={() => repos.load()}>Refresh</Btn>
			<Btn primary disabled={repos.busy} onclick={() => repos.choose()}>
				Open repository…
			</Btn>
		</div>
	</header>

	<div class="body">
		{#if repos.error}
			<p class="note error">{repos.error}</p>
		{:else if !repos.loaded}
			<p class="note">Reading…</p>
		{:else if repos.cards.length === 0}
			<div class="empty">
				<p class="note">GitLord has not been shown a repository yet.</p>
				<p class="note">
					It never goes looking for one. Open a directory and it will be remembered
					here.
				</p>
				<Btn primary disabled={repos.busy} onclick={() => repos.choose()}>
					Open repository…
				</Btn>
			</div>
		{:else}
			{#if needing.length > 0}
				<section class="group">
					<h2 class="note heading">Needs you</h2>
					<div class="grid">
						{#each needing as card (card.path)}
							<RepoCard {card} />
						{/each}
					</div>
				</section>
			{/if}

			{#if idle.length > 0}
				<section class="group">
					<h2 class="note heading">Nothing in progress</h2>
					<div class="grid">
						{#each idle as card (card.path)}
							<RepoCard {card} idle />
						{/each}
					</div>
				</section>
			{/if}
		{/if}
	</div>

	<footer class="foot">
		{#if repos.writeError}
			<span class="note error">{repos.writeError}</span>
		{:else}
			<span class="note">
				Repositories are read straight from disk, where they sit. Nothing is uploaded
				anywhere, and forgetting one removes a card, not a directory.
			</span>
		{/if}
	</footer>
</div>

<style>
	.screen {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head,
	.foot {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.head {
		justify-content: space-between;
		padding: 10px 12px;
		border-bottom: 1.5px solid var(--soft);
	}

	.foot {
		padding: 8px 12px;
		border-top: 1.5px solid var(--soft);
	}

	.left,
	.right {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.title {
		font-size: var(--fs-title);
		white-space: nowrap;
	}

	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.heading {
		margin: 0;
		font-weight: inherit;
	}

	.grid {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: stretch;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		max-width: 460px;
	}

	.empty p {
		margin: 0;
	}

	.error {
		color: var(--accent);
	}
</style>

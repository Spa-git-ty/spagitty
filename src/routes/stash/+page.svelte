<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { untrack } from 'svelte';
	import { repo } from '$lib/repo.svelte';
	import StashDetail from '$lib/stash/StashDetail.svelte';
	import StashList from '$lib/stash/StashList.svelte';
	import { stash } from '$lib/stash/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import Splitter from '$lib/ui/Splitter.svelte';

	/**
	 * Stash entries, each hanging off the commit it was made on.
	 *
	 * Stashing is the only write here. Pop, apply and drop are FEAT-014 — the
	 * first two write to the working copy and can conflict, and the third
	 * destroys an entry whose only other reference is a reflog that expires.
	 */

	let generation: number | null = null;
	$effect(() => {
		const current = repo.generation;
		if (repo.info === null) return;
		if (generation === current) return;

		generation = current;
		untrack(() => {
			stash.clear();
			stash.load();
		});
	});

	const count = $derived(
		stash.entries.length === 1 ? '1 entry' : `${stash.entries.length} entries`
	);
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">Stash</span>
			{#if stash.loaded}<span class="note">{count}</span>{/if}
		</div>
		<div class="right">
			{#if stash.loading}<span class="note">Reading…</span>{/if}
			<Btn disabled={stash.busy} onclick={() => stash.load()}>Refresh</Btn>
		</div>
	</header>

	{#if repo.info === null}
		<div class="empty"><p class="note">No repository open.</p></div>
	{:else if stash.error}
		<div class="empty"><p class="note error">{stash.error}</p></div>
	{:else if !stash.loaded}
		<div class="empty"><span class="note">Reading the stash…</span></div>
	{:else}
		<div class="body">
			<StashList />
			<Splitter panel="detail" label="Resize the stash detail panel" />
			<StashDetail />
		</div>

		<div class="push">
			<span class="note">Stash the working copy</span>
			<input
				class="field"
				type="text"
				placeholder="message (optional)"
				value={stash.message}
				oninput={(event) => stash.setMessage(event.currentTarget.value)}
				aria-label="Stash message"
			/>
			<Chip
				active={stash.includeUntracked}
				onclick={() => stash.setIncludeUntracked(!stash.includeUntracked)}
				title="Take files git is not tracking yet as well"
			>
				include untracked
			</Chip>
			<Btn primary disabled={stash.busy} onclick={() => stash.push()}>Stash</Btn>
		</div>
	{/if}

	<!--
		The footer appears only when there is a failure to report. Its other
		sentence explained what stashing is and claimed restoring it was unbuilt;
		the first is not this screen's job and the second was untrue — the whole
		pop / apply / drop path exists. Left rendering unconditionally it would
		be a bordered empty strip.
	-->
	{#if stash.writeError}
		<footer class="foot">
			<span class="note error">{stash.writeError}</span>
		</footer>
	{/if}
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
	.foot,
	.push {
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

	.push,
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
		display: flex;
		overflow: hidden;
	}

	.field {
		background: transparent;
		border: 1.5px solid var(--line);
		border-radius: var(--r-field);
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: var(--fs-secondary);
		padding: 3px 6px;
		width: 280px;
	}

	.field:focus {
		outline: none;
		border-color: var(--accent);
	}

	.field::placeholder {
		color: var(--placeholder);
	}

	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 0 20px;
		text-align: center;
	}

	.error {
		color: var(--accent);
	}
</style>

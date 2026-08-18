<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as api from '$lib/api';
	import PreviewPane from '$lib/rebase/PreviewPane.svelte';
	import { rebase } from '$lib/rebase/store.svelte';
	import TodoList from '$lib/rebase/TodoList.svelte';
	import { branches } from '$lib/branches/store.svelte';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	/**
	 * Plan a history rewrite and see the result before anything runs.
	 *
	 * This screen is the preview and only the preview. Executing a plan is
	 * FEAT-015, and there is no command behind Apply — a disabled button backed
	 * by nothing is easier to explain than one backed by a half-written path.
	 */

	onMount(() => {
		if (!api.inTauri() || !repo.info) return;

		// The upstream a branch is already tracking is the usual thing to
		// replay onto, so it is filled in. Anything else would be a guess, and
		// a wrong default here plans a rebase nobody asked for.
		branches.load().then(() => {
			const current = branches.rows.find((row) => row.current);
			if (rebase.upstream === '' && current?.upstream) {
				rebase.upstream = current.upstream;
			}
		});

		return () => rebase.clear();
	});

	/** Branches worth offering as an upstream: anything that is not HEAD. */
	const candidates = $derived(branches.rows.filter((row) => !row.current));
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">Interactive rebase</span>
			{#if rebase.todo}
				<span class="note">
					{rebase.todo.rows.length}
					{rebase.todo.rows.length === 1 ? 'commit' : 'commits'} onto
					<span class="mono">{rebase.todo.upstreamShort}</span>
				</span>
			{/if}
		</div>
		<div class="right">
			<label class="field">
				<span class="note">onto</span>
				<input
					bind:value={rebase.upstream}
					list="rebase-upstreams"
					placeholder="branch or revision"
				/>
			</label>
			<datalist id="rebase-upstreams">
				{#each candidates as row (row.fullName)}
					<option value={row.name}></option>
				{/each}
			</datalist>
			<Btn disabled={rebase.upstream.trim() === '' || rebase.loading} onclick={() => rebase.load()}>
				Plan
			</Btn>
			<Btn disabled={!rebase.edited} onclick={() => rebase.reset()}>Reset</Btn>
			<Btn
				disabled
				title="Running a rebase is FEAT-015. This screen plans it; git will execute it."
			>
				Apply
			</Btn>
		</div>
	</header>

	<div class="body">
		{#if rebase.error}
			<p class="note error pad">{rebase.error}</p>
		{:else if rebase.loading}
			<p class="note pad">Reading…</p>
		{:else if !rebase.loaded}
			<div class="empty pad">
				<p class="note">
					Choose what to replay onto, and this screen shows the commits git would
					offer you and what your history would look like afterwards.
				</p>
			</div>
		{:else if rebase.todo && rebase.todo.rows.length === 0}
			<p class="note pad">
				There is nothing to rebase: this branch has no commits the upstream does not
				already have.
			</p>
		{:else}
			<div class="columns">
				<section class="column">
					<h2 class="note heading">Plan</h2>
					<div class="scroll">
						<TodoList />
					</div>
				</section>
				<section class="column">
					<h2 class="note heading">Result</h2>
					<PreviewPane />
				</section>
			</div>
		{/if}
	</div>

	<footer class="foot">
		{#if rebase.todo?.truncated}
			<span class="note error">
				Only the first {rebase.todo.rows.length} commits are shown. A rebase longer than
				that is a different operation from the one this screen is for.
			</span>
		{:else}
			<span class="note">
				Nothing here runs. "May conflict" means two commits in the plan touch the same
				file — whether they actually clash is only known once the merges are performed,
				which is what Apply will do. The reflog keeps the old history for 30 days.
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

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 12px;
		border-bottom: 1.5px solid var(--soft);
		flex: none;
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
	}

	.field {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.field input {
		width: 160px;
		border: 1.5px solid var(--soft);
		border-radius: var(--r-field);
		padding: 3px 6px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: var(--fs-secondary);
	}

	.field input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.body {
		flex: 1;
		min-height: 0;
		display: flex;
		overflow: hidden;
	}

	.pad {
		padding: 12px;
		margin: 0;
	}

	.empty {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 520px;
	}

	/* Two equal columns: the plan and what it produces, side by side, because
	   the whole argument for this screen is seeing both at once. */
	.columns {
		flex: 1;
		min-width: 0;
		display: flex;
		gap: 8px;
		padding: 8px 12px;
	}

	.column {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.heading {
		flex: none;
		margin: 0 0 6px;
		font-size: var(--fs-secondary);
		font-weight: inherit;
	}

	.scroll {
		flex: 1;
		min-height: 0;
		overflow: auto;
	}

	.foot {
		flex: none;
		padding: 8px 12px;
		border-top: 1.5px solid var(--soft);
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as api from '$lib/api';
	import ConflictPager from '$lib/conflicts/ConflictPager.svelte';
	import SidePane from '$lib/conflicts/SidePane.svelte';
	import { conflicts } from '$lib/conflicts/store.svelte';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	/**
	 * A repository stopped mid-operation: ours, the merged result, and theirs.
	 *
	 * Read-only in this pass. Every control that would write is disabled and
	 * says which item builds it — a button that looks live and does nothing is
	 * worse than one that explains itself.
	 */

	onMount(() => {
		if (api.inTauri() && repo.info) conflicts.load();
	});

	const kind = $derived(conflicts.sides?.kind ?? 'bothModified');

	/** What the user would type to get out, named after the real operation. */
	const escapeHatch = $derived(
		conflicts.operation === 'none' ? null : `git ${conflicts.operationLabel} --abort`
	);
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">Conflicts</span>
			{#if conflicts.operation !== 'none'}
				<span class="note">{conflicts.operationLabel} in progress</span>
			{/if}
			{#if conflicts.files.length > 0}
				<span class="note">
					{conflicts.files.length}
					{conflicts.files.length === 1 ? 'file' : 'files'}
				</span>
			{/if}
		</div>
		<div class="right">
			{#if conflicts.loading}<span class="note">Reading…</span>{/if}
			<Btn onclick={() => conflicts.load()}>Refresh</Btn>
			<Btn disabled title="Marking a file resolved is not built yet">
				Mark resolved
			</Btn>
			<Btn disabled title="Aborting discards work, and is not built yet">
				Abort {conflicts.operation === 'none' ? '' : conflicts.operationLabel}
			</Btn>
		</div>
	</header>

	{#if conflicts.files.length > 0}
		<div class="bar">
			<ConflictPager />
		</div>
	{/if}

	<div class="body">
		{#if conflicts.error}
			<p class="note error">{conflicts.error}</p>
		{:else if !conflicts.loaded}
			<p class="note">Reading…</p>
		{:else if conflicts.files.length === 0}
			<div class="empty">
				<p class="note">Nothing is conflicted.</p>
				<p class="note">
					When git cannot merge two versions of a file it keeps all three — the common
					ancestor, yours and theirs — and they appear here side by side.
				</p>
			</div>
		{:else if conflicts.sidesError}
			<p class="note error">{conflicts.sidesError}</p>
		{:else if !conflicts.sides}
			<p class="note">Reading…</p>
		{:else}
			<div class="path mono muted">{conflicts.sides.path}</div>
			<div class="panes">
				<SidePane
					title="Ours"
					subtitle="HEAD"
					side={conflicts.sides.ours}
					which="ours"
					{kind}
				/>
				<SidePane
					title="Merged result"
					subtitle="on disk, with markers"
					side={conflicts.sides.merged}
					which="merged"
					{kind}
					middle
				/>
				<SidePane
					title="Theirs"
					subtitle="the incoming side"
					side={conflicts.sides.theirs}
					which="theirs"
					{kind}
				/>
			</div>
			<details class="base">
				<summary class="note">Common ancestor</summary>
				<div class="basepane">
					<SidePane
						title="Base"
						subtitle="what both sides started from"
						side={conflicts.sides.base}
						which="base"
						{kind}
					/>
				</div>
			</details>
		{/if}
	</div>

	<footer class="foot">
		<span class="note">
			This screen only reads; resolving is not built yet.{#if escapeHatch}
				Today, <span class="mono">{escapeHatch}</span> is what undoes the operation.
			{/if}
		</span>
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

	.bar {
		flex: none;
		padding: 8px 12px;
		border-bottom: 1.5px solid var(--soft);
	}

	.body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.path {
		flex: none;
	}

	/* Three equal panes: the widths say the three sides are equally real, which
	   is the whole point of showing them together. */
	.panes {
		flex: 1;
		min-height: 240px;
		display: flex;
		gap: 8px;
		min-width: 0;
	}

	.base {
		flex: none;
	}

	.basepane {
		display: flex;
		height: 200px;
		padding-top: 8px;
	}

	.empty {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 520px;
	}

	.foot {
		flex: none;
		padding: 8px 12px;
		border-top: 1.5px solid var(--soft);
	}
</style>

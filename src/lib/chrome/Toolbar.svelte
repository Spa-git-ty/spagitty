<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	const head = $derived(repo.info?.head ?? null);
	/** Staged is what a commit would actually contain, so that is what it counts. */
	const staged = $derived(repo.counts.staged);

	/**
	 * Actions that need network, hooks or a working-copy write are not built
	 * yet. They stay in the toolbar because the chrome is persistent and its
	 * shape is part of the design — but they say so when you point at them
	 * rather than failing silently when clicked.
	 */
	const PENDING = 'Not built yet';

	interface ToolItem {
		glyph: string;
		label: string;
		href?: string;
		title?: string;
	}

	const actions: ToolItem[] = [
		{ glyph: '⇩', label: 'Fetch', title: PENDING },
		{ glyph: '⇧', label: 'Push', title: PENDING },
		{ glyph: '⑃', label: 'Branch', href: '/branches' },
		{ glyph: '▤', label: 'Stash', href: '/stash' },
		{ glyph: '✎', label: 'Rebase', href: '/rebase' }
	];

	function commitLabel(): string {
		if (staged === null) return 'Commit';
		if (staged === 0) return 'Commit';
		return staged === 1 ? 'Commit 1 file' : `Commit ${staged} files`;
	}
</script>

<div class="toolbar">
	<div class="pickers">
		<div class="picker">
			<span class="note">repository</span>
			<button class="field" onclick={() => goto('/repos')}>
				<span class="value">{repo.info?.name ?? 'no repository'}</span>
				<span class="mono muted" aria-hidden="true">▾</span>
			</button>
		</div>
		<div class="picker">
			<span class="note">branch</span>
			<button class="field" onclick={() => goto('/branches')}>
				<span class="value">{head?.branch ?? head?.short ?? '—'}</span>
				<span class="mono muted" aria-hidden="true">▾</span>
			</button>
		</div>
	</div>

	<span class="vr" style="height: 26px"></span>

	<button class="tool" title={PENDING}><span aria-hidden="true">↺</span><span>Undo</span></button>
	<button class="tool" title={PENDING}><span aria-hidden="true">↻</span><span>Redo</span></button>

	<span class="vr" style="height: 26px"></span>

	{#each actions as action (action.label)}
		<button
			class="tool"
			title={action.title}
			onclick={() => action.href && goto(action.href)}
		>
			<span aria-hidden="true">{action.glyph}</span>
			<span>{action.label}</span>
		</button>
	{/each}

	<span class="spacer"></span>

	<Btn primary onclick={() => goto('/changes')}>{commitLabel()}</Btn>
</div>

<style>
	.toolbar {
		height: var(--toolbar-h);
		flex: none;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 0 12px;
		border-bottom: 1.5px solid var(--line);
	}

	.pickers {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 280px;
	}

	.picker {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
		min-width: 0;
	}

	.field {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 4px 6px;
		border: 1.5px solid var(--line);
		border-radius: var(--r-field);
		min-width: 0;
	}

	.field:hover {
		border-color: var(--accent);
	}

	.value {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
	}

	.tool {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		font-size: var(--fs-mono);
		color: var(--muted);
		min-width: 44px;
		user-select: none;
	}

	.tool:hover {
		color: var(--accent);
	}

	.spacer {
		flex: 1;
	}
</style>

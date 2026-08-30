<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { worktrees } from './store.svelte';
	import { worktreeModal } from './modal.svelte';
	import { workspace } from '$lib/workspace.svelte';
	import { repo } from '$lib/repo.svelte';
	import { notice } from '$lib/ui/notice.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import type { Worktree } from '$lib/types';

	let removingPath = $state<string | null>(null);
	let forceRemove = $state(false);
	let removeError = $state<string | null>(null);
	let isActionRunning = $state(false);

	const list = $derived(worktrees.list);

	async function openWorktree(wt: Worktree): Promise<void> {
		try {
			await repo.open(wt.path);
			worktreeModal.hideManager();
			notice.ok('Switched worktree', wt.name);
		} catch (err) {
			notice.failed('Could not switch worktree', err);
		}
	}

	async function toggleLock(wt: Worktree): Promise<void> {
		isActionRunning = true;
		try {
			if (wt.lockedReason) {
				await worktrees.unlock(wt.path);
				notice.ok('Worktree unlocked', wt.name);
			} else {
				await worktrees.lock(wt.path, 'locked via Spagitty');
				notice.ok('Worktree locked', wt.name);
			}
		} catch (err) {
			notice.failed('Lock operation failed', err);
		} finally {
			isActionRunning = false;
		}
	}

	async function confirmRemove(): Promise<void> {
		if (!removingPath) return;
		isActionRunning = true;
		removeError = null;

		try {
			await worktrees.remove(removingPath, forceRemove);
			notice.ok('Worktree removed', removingPath);
			removingPath = null;
			forceRemove = false;
		} catch (err) {
			removeError = err instanceof Error ? err.message : String(err);
		} finally {
			isActionRunning = false;
		}
	}

	async function pruneStale(): Promise<void> {
		isActionRunning = true;
		try {
			await worktrees.prune();
			notice.ok('Pruned stale worktree metadata');
		} catch (err) {
			notice.failed('Pruning failed', err);
		} finally {
			isActionRunning = false;
		}
	}

	function keydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			if (removingPath) {
				removingPath = null;
			} else {
				worktreeModal.hideManager();
			}
		}
	}
</script>

{#if worktreeModal.isManagerOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="scrim"
		role="dialog"
		aria-modal="true"
		aria-label="Manage git worktrees"
		tabindex="-1"
		onkeydown={keydown}
	>
		<div class="modal">
			<header class="head">
				<div class="head-left">
					<span class="title">Worktrees</span>
					<span class="badge">{list.length}</span>
				</div>
				<div class="head-actions">
					<Btn
						disabled={isActionRunning}
						onclick={() => {
							worktreeModal.hideManager();
							worktreeModal.showAdd();
						}}
					>+ Add Worktree</Btn>
					<Btn disabled={isActionRunning} onclick={pruneStale}>Prune Stale</Btn>
					<button
						class="close"
						aria-label="Close"
						onclick={() => worktreeModal.hideManager()}
					>✕</button>
				</div>
			</header>

			<div class="body">
				{#if list.length === 0}
					<div class="empty">No worktrees found for this repository.</div>
				{:else}
					<div class="worktree-list">
						{#each list as wt (wt.path)}
							<div class="worktree-card" class:main={wt.isMain}>
								<div class="card-info">
									<div class="card-top">
										<span class="name">{wt.name}</span>
										{#if wt.isMain}
											<span class="pill main-pill">main</span>
										{/if}
										{#if wt.branch}
											<span class="pill branch-pill">{wt.branch}</span>
										{:else}
											<span class="pill detached-pill">detached</span>
										{/if}
										{#if wt.lockedReason}
											<span class="pill locked-pill" title={wt.lockedReason}>🔒 locked</span>
										{/if}
										{#if wt.prunableReason}
											<span class="pill prunable-pill" title={wt.prunableReason}>⚠️ prunable</span>
										{/if}
									</div>
									<div class="card-bottom">
										<span class="path mono" title={wt.path}>{wt.path}</span>
										<span class="sha mono">{wt.headShort}</span>
									</div>
								</div>

								<div class="card-actions">
									{#if repo.info?.path === wt.path}
										<span class="active-label">Active</span>
									{:else}
										<Btn
											disabled={isActionRunning}
											onclick={() => void openWorktree(wt)}
										>Open</Btn>
									{/if}
									{#if !wt.isMain}
										<button
											type="button"
											class="icon-btn"
											title={wt.lockedReason ? 'Unlock worktree' : 'Lock worktree'}
											disabled={isActionRunning}
											onclick={() => void toggleLock(wt)}
										>
											{wt.lockedReason ? '🔓' : '🔒'}
										</button>
										<button
											type="button"
											class="icon-btn danger"
											title="Remove worktree"
											disabled={isActionRunning}
											onclick={() => (removingPath = wt.path)}
										>
											🗑️
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			{#if removingPath}
				<div class="remove-dialog">
					<div class="remove-title">Remove Worktree</div>
					<div class="remove-body">
						Are you sure you want to remove <span class="mono">{removingPath}</span>?
					</div>
					<label class="force-checkbox">
						<input type="checkbox" bind:checked={forceRemove} />
						<span>Force remove (even if working tree is dirty or locked)</span>
					</label>
					{#if removeError}
						<div class="error" role="alert">{removeError}</div>
					{/if}
					<div class="remove-actions">
						<Btn disabled={isActionRunning} onclick={() => (removingPath = null)}>Cancel</Btn>
						<Btn danger disabled={isActionRunning} onclick={confirmRemove}>
							{isActionRunning ? 'Removing…' : 'Remove'}
						</Btn>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal {
		background: var(--panel, #1e1e20);
		border: 1px solid var(--line, #333);
		border-radius: var(--r-field, 6px);
		width: 640px;
		max-width: 90vw;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-soft, #333);
	}

	.head-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.title {
		font-weight: 600;
		font-size: 14px;
		color: var(--fg, #eee);
	}

	.badge {
		background: var(--bg-3, #2a2a2d);
		color: var(--dim, #aaa);
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 10px;
	}

	.head-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.close {
		background: transparent;
		border: none;
		color: var(--dim, #888);
		cursor: pointer;
		font-size: 14px;
		padding: 4px;
		margin-left: 4px;
	}

	.close:hover {
		color: var(--fg, #eee);
	}

	.body {
		padding: 16px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.empty {
		text-align: center;
		padding: 32px;
		color: var(--dim, #888);
		font-size: 13px;
	}

	.worktree-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.worktree-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		background: var(--bg-2, #141416);
		border: 1px solid var(--border-soft, #2e2e32);
		border-radius: 6px;
		gap: 12px;
	}

	.worktree-card.main {
		border-left: 3px solid var(--accent, #eeb04d);
	}

	.card-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		overflow: hidden;
		flex: 1;
	}

	.card-top {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.name {
		font-weight: 500;
		font-size: 13px;
		color: var(--fg, #eee);
	}

	.pill {
		font-size: 11px;
		padding: 1px 6px;
		border-radius: 4px;
	}

	.main-pill {
		background: rgba(238, 176, 77, 0.15);
		color: var(--accent, #eeb04d);
	}

	.branch-pill {
		background: var(--bg-3, #2a2a2d);
		color: var(--fg, #ddd);
	}

	.detached-pill {
		background: rgba(180, 180, 180, 0.15);
		color: var(--dim, #aaa);
	}

	.locked-pill {
		background: rgba(255, 193, 7, 0.15);
		color: #ffc107;
	}

	.prunable-pill {
		background: rgba(244, 67, 54, 0.15);
		color: #f44336;
	}

	.card-bottom {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.path {
		font-size: 11px;
		color: var(--dim, #888);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 380px;
	}

	.sha {
		font-size: 11px;
		color: var(--accent, #eeb04d);
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, monospace;
	}

	.card-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.active-label {
		font-size: 11px;
		color: var(--accent, #eeb04d);
		font-weight: 500;
		padding: 4px 8px;
	}

	.icon-btn {
		background: var(--bg-3, #222);
		border: 1px solid var(--border-soft, #333);
		border-radius: 4px;
		padding: 4px 6px;
		cursor: pointer;
		font-size: 12px;
	}

	.icon-btn:hover {
		background: var(--bg-hover, #333);
	}

	.icon-btn.danger:hover {
		background: rgba(229, 83, 75, 0.2);
		border-color: var(--danger, #e5534b);
	}

	.remove-dialog {
		background: var(--bg-2, #18181a);
		border-top: 1px solid var(--border-soft, #333);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.remove-title {
		font-weight: 600;
		font-size: 13px;
		color: var(--danger, #e5534b);
	}

	.remove-body {
		font-size: 12px;
		color: var(--fg, #ccc);
	}

	.force-checkbox {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--dim, #aaa);
		cursor: pointer;
	}

	.error {
		font-size: 12px;
		color: var(--danger, #e5534b);
		background: rgba(229, 83, 75, 0.1);
		padding: 6px 8px;
		border-radius: 4px;
	}

	.remove-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
</style>

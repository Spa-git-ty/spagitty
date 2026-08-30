<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { submodules } from './store.svelte';
	import { submoduleModal } from './modal.svelte';
	import { repo } from '$lib/repo.svelte';
	import { notice } from '$lib/ui/notice.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import type { Submodule } from '$lib/types';

	let isRunning = $state(false);
	let output = $state<string | null>(null);

	const list = $derived(submodules.list);

	async function updateAll(): Promise<void> {
		isRunning = true;
		output = null;
		try {
			const res = await submodules.update([], true, true);
			notice.ok('Submodules updated');
			output = res || 'All submodules are up to date.';
		} catch (err) {
			notice.failed('Submodule update failed', err);
		} finally {
			isRunning = false;
		}
	}

	async function syncUrls(): Promise<void> {
		isRunning = true;
		output = null;
		try {
			const res = await submodules.sync(true);
			notice.ok('Submodule URLs synchronized');
			output = res || 'Synchronized configured URLs.';
		} catch (err) {
			notice.failed('URL sync failed', err);
		} finally {
			isRunning = false;
		}
	}

	async function updateSingle(sub: Submodule): Promise<void> {
		isRunning = true;
		output = null;
		try {
			const res = await submodules.update([sub.path], true, true);
			notice.ok('Submodule updated', sub.name);
			output = res || `Submodule ${sub.name} is up to date.`;
		} catch (err) {
			notice.failed('Update failed', err);
		} finally {
			isRunning = false;
		}
	}

	async function deinitSingle(sub: Submodule): Promise<void> {
		isRunning = true;
		output = null;
		try {
			const res = await submodules.deinit(sub.path, false);
			notice.ok('Submodule de-initialized', sub.name);
			output = res || `De-initialized ${sub.name}.`;
		} catch (err) {
			notice.failed('De-init failed', err);
		} finally {
			isRunning = false;
		}
	}

	async function openAsRepo(sub: Submodule): Promise<void> {
		if (!repo.info) return;
		const fullPath = `${repo.info.path}/${sub.path}`;
		try {
			await repo.open(fullPath);
			submoduleModal.hide();
			notice.ok('Opened submodule', sub.name);
		} catch (err) {
			notice.failed('Could not open submodule directory', err);
		}
	}

	function keydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			submoduleModal.hide();
		}
	}
</script>

{#if submoduleModal.isOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="scrim"
		role="dialog"
		aria-modal="true"
		aria-label="Manage git submodules"
		tabindex="-1"
		onkeydown={keydown}
	>
		<div class="modal">
			<header class="head">
				<div class="head-left">
					<span class="title">Submodules</span>
					<span class="badge">{list.length}</span>
				</div>
				<div class="head-actions">
					<Btn disabled={isRunning || list.length === 0} onclick={updateAll}>
						{isRunning ? 'Updating…' : 'Update All (Recursive)'}
					</Btn>
					<Btn disabled={isRunning || list.length === 0} onclick={syncUrls}>Sync URLs</Btn>
					<button
						class="close"
						aria-label="Close"
						onclick={() => submoduleModal.hide()}
					>✕</button>
				</div>
			</header>

			<div class="body">
				{#if list.length === 0}
					<div class="empty">No submodules declared in this repository.</div>
				{:else}
					<div class="submodule-list">
						{#each list as sub (sub.path)}
							<div class="submodule-card">
								<div class="card-info">
									<div class="card-top">
										<span class="name">{sub.name}</span>
										{#if sub.inSync}
											<span class="pill ok-pill">in sync</span>
										{:else if !sub.initialized}
											<span class="pill warn-pill">uninitialized</span>
										{:else if sub.hasConflict}
											<span class="pill danger-pill">conflict</span>
										{:else}
											<span class="pill warn-pill">drifted</span>
										{/if}
										{#if sub.describe}
											<span class="pill desc-pill">{sub.describe}</span>
										{/if}
									</div>
									<div class="card-bottom">
										<span class="path mono" title={sub.path}>{sub.path}</span>
										{#if sub.headShort}
											<span class="sha mono">{sub.headShort}</span>
										{/if}
										{#if sub.url}
											<span class="url mono" title={sub.url}>{sub.url}</span>
										{/if}
									</div>
								</div>

								<div class="card-actions">
									{#if sub.initialized}
										<Btn disabled={isRunning} onclick={() => void openAsRepo(sub)}>
											Open as Repo
										</Btn>
									{/if}
									<Btn disabled={isRunning} onclick={() => void updateSingle(sub)}>
										Update
									</Btn>
									{#if sub.initialized}
										<button
											type="button"
											class="deinit-btn"
											title="De-initialize submodule"
											disabled={isRunning}
											onclick={() => void deinitSingle(sub)}
										>
											Deinit
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				{#if output}
					<div class="output-box mono">{output}</div>
				{/if}
			</div>
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
		width: 680px;
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
		border-bottom: 1px solid var(--line, #333);
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

	.submodule-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.submodule-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		background: var(--bg-2, #141416);
		border: 1px solid var(--line, #2e2e32);
		border-radius: 6px;
		gap: 12px;
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

	.ok-pill {
		background: rgba(46, 125, 31, 0.15);
		color: var(--ok, #2e7d1f);
	}

	.warn-pill {
		background: rgba(188, 106, 0, 0.15);
		color: var(--warn, #bc6a00);
	}

	.danger-pill {
		background: rgba(210, 15, 57, 0.15);
		color: var(--danger, #d20f39);
	}

	.desc-pill {
		background: var(--bg-3, #2a2a2d);
		color: var(--dim, #aaa);
	}

	.card-bottom {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.path {
		font-size: 11px;
		color: var(--dim, #888);
	}

	.sha {
		font-size: 11px;
		color: var(--accent, #eeb04d);
	}

	.url {
		font-size: 11px;
		color: var(--dim, #666);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 200px;
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, monospace;
	}

	.card-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.deinit-btn {
		background: transparent;
		border: 1px solid var(--line, #333);
		border-radius: 4px;
		color: var(--dim, #888);
		padding: 4px 8px;
		font-size: 11px;
		cursor: pointer;
	}

	.deinit-btn:hover {
		color: var(--danger, #d20f39);
		border-color: var(--danger, #d20f39);
	}

	.output-box {
		background: var(--bg-3, #141416);
		border: 1px solid var(--line, #28282c);
		border-radius: 4px;
		padding: 8px 12px;
		font-size: 11px;
		color: var(--dim, #ccc);
		white-space: pre-wrap;
	}
</style>

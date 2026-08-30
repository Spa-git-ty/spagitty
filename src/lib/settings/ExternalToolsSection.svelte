<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as api from '$lib/api';
	import { notice } from '$lib/ui/notice.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import type { ExternalToolsConfig } from '$lib/types';

	let config = $state<ExternalToolsConfig | null>(null);
	let loading = $state(false);
	let isGlobal = $state(false);
	let isSaving = $state(false);

	async function loadConfig(): Promise<void> {
		loading = true;
		try {
			config = await api.externalToolsConfig();
		} catch (err) {
			notice.failed('Could not load external tools configuration', err);
		} finally {
			loading = false;
		}
	}

	async function updateDiffTool(toolId: string): Promise<void> {
		isSaving = true;
		try {
			await api.setExternalTool('diff', toolId || null, isGlobal);
			notice.ok('Diff tool updated', toolId || 'none');
			await loadConfig();
		} catch (err) {
			notice.failed('Could not update diff tool', err);
		} finally {
			isSaving = false;
		}
	}

	async function updateMergeTool(toolId: string): Promise<void> {
		isSaving = true;
		try {
			await api.setExternalTool('merge', toolId || null, isGlobal);
			notice.ok('Merge tool updated', toolId || 'none');
			await loadConfig();
		} catch (err) {
			notice.failed('Could not update merge tool', err);
		} finally {
			isSaving = false;
		}
	}

	onMount(() => {
		void loadConfig();
	});
</script>

<section class="section" aria-label="External diff and merge tools">
	<div class="row">
		<h2 class="title">External Tools</h2>
		<label class="scope-toggle">
			<input type="checkbox" bind:checked={isGlobal} />
			<span>Save changes to global git config (~/.gitconfig)</span>
		</label>
	</div>

	<p class="desc">
		Configure external 2-way diff and 3-way merge tools to launch from file context menus and conflict resolution screens.
	</p>

	{#if loading && !config}
		<div class="note">Scanning for installed tools on $PATH…</div>
	{:else if config}
		<div class="tool-settings">
			<!-- Diff Tool -->
			<div class="field-card">
				<div class="card-head">
					<span class="label">Diff Tool (diff.tool)</span>
					<span class="current mono">{config.diffTool ?? 'none (built-in)'}</span>
				</div>
				<div class="control-row">
					<select
						class="field-select"
						disabled={isSaving}
						value={config.diffTool ?? ''}
						onchange={(e) => void updateDiffTool(e.currentTarget.value)}
					>
						<option value="">None (use Spagitty built-in diff)</option>
						{#each config.availableDiffTools as tool}
							<option value={tool.id}>
								{tool.name} {tool.isInstalled ? '(detected)' : '(not in PATH)'}
							</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Merge Tool -->
			<div class="field-card">
				<div class="card-head">
					<span class="label">Merge Tool (merge.tool)</span>
					<span class="current mono">{config.mergeTool ?? 'none (built-in)'}</span>
				</div>
				<div class="control-row">
					<select
						class="field-select"
						disabled={isSaving}
						value={config.mergeTool ?? ''}
						onchange={(e) => void updateMergeTool(e.currentTarget.value)}
					>
						<option value="">None (use Spagitty built-in merge editor)</option>
						{#each config.availableMergeTools as tool}
							<option value={tool.id}>
								{tool.name} {tool.isInstalled ? '(detected)' : '(not in PATH)'}
							</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<div class="catalogue-section">
			<h3 class="sub-title">Detected Utilities on $PATH</h3>
			<div class="tools-grid">
				{#each config.availableDiffTools as tool}
					<div class="tool-pill" class:installed={tool.isInstalled}>
						<span class="status-dot"></span>
						<span class="tool-name">{tool.name}</span>
						<span class="tool-cmd mono">{tool.command}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: 680px;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--fg, #eee);
	}

	.sub-title {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--dim, #aaa);
		text-transform: uppercase;
	}

	.desc {
		margin: 0;
		font-size: 13px;
		color: var(--dim, #888);
		line-height: 1.4;
	}

	.scope-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--dim, #aaa);
		cursor: pointer;
	}

	.tool-settings {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.field-card {
		background: var(--panel, #18181a);
		border: 1px solid var(--line, #28282c);
		border-radius: var(--r-field, 6px);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.label {
		font-size: 13px;
		font-weight: 500;
		color: var(--fg, #eee);
	}

	.current {
		font-size: 12px;
		color: var(--accent, #eeb04d);
	}

	.control-row {
		display: flex;
		gap: 8px;
	}

	.field-select {
		flex: 1;
		background: var(--bg-2, #141416);
		border: 1px solid var(--line, #333);
		border-radius: 4px;
		padding: 6px 10px;
		font-size: 13px;
		color: var(--fg, #eee);
		outline: none;
	}

	.field-select:focus {
		border-color: var(--accent, #eeb04d);
	}

	.catalogue-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 8px;
	}

	.tools-grid {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tool-pill {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--bg-2, #141416);
		border: 1px solid var(--line, #28282c);
		border-radius: 4px;
		padding: 6px 10px;
		font-size: 12px;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--dim, #666);
	}

	.tool-pill.installed .status-dot {
		background: var(--ok, #2e7d1f);
	}

	.tool-name {
		font-weight: 500;
		color: var(--fg, #ddd);
		width: 160px;
	}

	.tool-cmd {
		color: var(--dim, #888);
		font-size: 11px;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, monospace;
	}

	.note {
		font-size: 13px;
		color: var(--dim, #888);
	}
</style>

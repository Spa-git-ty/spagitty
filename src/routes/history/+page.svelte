<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { fileHistory } from '$lib/history/store.svelte';
	import FileHistoryView from '$lib/history/FileHistoryView.svelte';
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	let inputPath = $state('');

	onMount(() => {
		const paramPath = page.url.searchParams.get('path');
		if (paramPath && repo.info) {
			inputPath = paramPath;
			void fileHistory.inspect(paramPath);
		}
	});

	function inspectFile(): void {
		if (inputPath.trim()) {
			void fileHistory.inspect(inputPath.trim());
		}
	}
</script>

<div class="history-page">
	{#if !fileHistory.path}
		<div class="empty-prompt">
			<div class="prompt-box">
				<h2 class="title">File History & Blame</h2>
				<p class="desc">
					Inspect the commit evolution and line-by-line attribution of any file in the repository.
				</p>
				<form
					class="input-form"
					onsubmit={(e) => {
						e.preventDefault();
						inspectFile();
					}}
				>
					<input
						type="text"
						class="field mono"
						placeholder="path/to/file.ext"
						bind:value={inputPath}
					/>
					<Btn primary onclick={inspectFile}>Inspect File</Btn>
				</form>
			</div>
		</div>
	{:else}
		<FileHistoryView />
	{/if}
</div>

<style>
	.history-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-1, #1e1e20);
		overflow: hidden;
	}

	.empty-prompt {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 32px;
	}

	.prompt-box {
		background: var(--panel, #1e1e20);
		border: 1px solid var(--line, #333);
		border-radius: var(--r-field, 6px);
		padding: 24px;
		max-width: 480px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--fg, #eee);
	}

	.desc {
		margin: 0;
		font-size: 13px;
		color: var(--dim, #888);
		line-height: 1.4;
	}

	.input-form {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.field {
		flex: 1;
		background: var(--bg-2, #141416);
		border: 1px solid var(--line, #333);
		border-radius: 4px;
		padding: 8px 10px;
		font-size: 13px;
		color: var(--fg, #eee);
		outline: none;
	}

	.field:focus {
		border-color: var(--accent, #eeb04d);
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, monospace;
	}
</style>

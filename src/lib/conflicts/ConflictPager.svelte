<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { conflicts } from '$lib/conflicts/store.svelte';
	import { openFile, stepFile } from '$lib/conflicts/actions';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import type { ConflictKind } from '$lib/types';

	/**
	 * Moving between conflicted files.
	 *
	 * One chip per file rather than a dropdown: the number of conflicted files
	 * is the thing people most want to know, and a dropdown hides it behind a
	 * click.
	 *
	 * Every move goes through `$lib/conflicts/actions`, never straight to the
	 * store, so an unsaved edit to the merged pane is asked about rather than
	 * dropped on the way past (FEAT-016).
	 */

	/** What each kind is called on a chip. Short enough to sit beside a path. */
	const KIND_LABELS: Record<ConflictKind, string> = {
		bothModified: 'both changed',
		bothAdded: 'both added',
		deletedByUs: 'we deleted',
		deletedByThem: 'they deleted'
	};

	function short(path: string): string {
		const at = path.lastIndexOf('/');
		return at === -1 ? path : path.slice(at + 1);
	}
</script>

<div class="pager">
	<div class="steps">
		<Btn disabled={conflicts.position <= 1} onclick={() => stepFile(-1)}>Previous</Btn>
		<span class="note position">
			{conflicts.position} of {conflicts.files.length}
		</span>
		<Btn
			disabled={conflicts.position === 0 || conflicts.position >= conflicts.files.length}
			onclick={() => stepFile(1)}
		>
			Next
		</Btn>
	</div>

	<div class="files">
		{#each conflicts.files as file (file.path)}
			<Chip
				active={file.path === conflicts.openPath}
				title={`${file.path} — ${KIND_LABELS[file.kind]}`}
				onclick={() => openFile(file.path)}
			>
				{short(file.path)}
			</Chip>
		{/each}
	</div>
</div>

<style>
	.pager {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		flex-wrap: wrap;
	}

	.steps {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: none;
	}

	.position {
		white-space: nowrap;
	}

	.files {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
		min-width: 0;
	}
</style>

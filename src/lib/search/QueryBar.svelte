<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { search } from '$lib/search/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';

	/**
	 * The query fields and the chips they add up to.
	 *
	 * The chips are derived from the fields rather than stored beside them, so a
	 * chip and its field cannot disagree about what is applied — which is the
	 * failure that makes a filter bar untrustworthy.
	 */
	interface Props {
		/** Focused on mount when the screen was reached by its shortcut. */
		autofocus?: boolean;
	}

	let { autofocus = false }: Props = $props();

	let first = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (autofocus) first?.focus();
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		search.run();
	}
</script>

<form class="bar" onsubmit={submit}>
	<div class="fields">
		<label class="field">
			<span class="note">author</span>
			<input bind:this={first} bind:value={search.author} placeholder="name or email" />
		</label>
		<label class="field wide">
			<span class="note">message</span>
			<input bind:value={search.message} placeholder="text in the message" />
		</label>
		<label class="field wide">
			<span class="note">path</span>
			<input bind:value={search.path} placeholder="a file the commit changed" />
		</label>
		<label class="field">
			<span class="note">since</span>
			<input bind:value={search.since} placeholder="YYYY-MM-DD" />
		</label>
		<label class="field">
			<span class="note">until</span>
			<input bind:value={search.until} placeholder="YYYY-MM-DD" />
		</label>
		<Btn primary disabled={search.empty}>Search</Btn>
	</div>

	{#if search.chips.length > 0}
		<div class="chips">
			{#each search.chips as chip (chip.key)}
				<Chip
					active
					title={`Remove ${chip.label}`}
					onclick={() => search.removeChip(chip.key)}
				>
					{chip.label} ×
				</Chip>
			{/each}
		</div>
	{/if}
</form>

<style>
	.bar {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.fields {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		flex-wrap: wrap;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.field input {
		width: 150px;
		border: 1px solid var(--soft);
		border-radius: var(--r-field);
		padding: 3px 6px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: var(--fs-secondary);
	}

	.field.wide input {
		width: 220px;
	}

	.field input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.chips {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { changes } from '$lib/changes/store.svelte';
	import Chip from '$lib/ui/Chip.svelte';

	/**
	 * Subject, a divider, then the body — the shape of a commit message rather
	 * than a single box people are expected to remember the convention for.
	 *
	 * The subject counter appears only once the line is long: git's own
	 * convention is 50 characters, and a number that is always on screen reads
	 * as a limit rather than as a warning.
	 */

	const SUBJECT_HINT = 50;

	const subject = $derived(changes.subject);
	const over = $derived(subject.length > SUBJECT_HINT);
</script>

<div class="message">
	<div class="subject-row">
		<input
			class="subject"
			type="text"
			placeholder="Summary of this commit"
			value={subject}
			oninput={(event) => changes.setSubject(event.currentTarget.value)}
			aria-label="Commit subject"
		/>
		{#if over}
			<span class="mono muted count" title="git's convention is {SUBJECT_HINT} characters">
				{subject.length}
			</span>
		{/if}
	</div>

	<div class="hr"></div>

	<textarea
		class="body"
		placeholder="Why, if the summary is not enough"
		value={changes.body}
		oninput={(event) => changes.setBody(event.currentTarget.value)}
		aria-label="Commit body"
	></textarea>

	<div class="row">
		<Chip
			active={changes.amend}
			onclick={() => changes.setAmend(!changes.amend)}
			title="Replace the previous commit instead of adding one"
		>
			amend the previous commit
		</Chip>
		{#if changes.amend}
			<span class="note">This rewrites the last commit rather than adding to history.</span>
		{/if}
	</div>
</div>

<style>
	.message {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px 10px;
		border-bottom: 1.5px solid var(--soft);
	}

	.subject-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.subject,
	.body {
		width: 100%;
		background: transparent;
		border: none;
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: var(--fs-ui);
		padding: 2px 0;
	}

	.subject:focus,
	.body:focus {
		outline: none;
	}

	.subject::placeholder,
	.body::placeholder {
		color: var(--placeholder);
	}

	.body {
		min-height: 52px;
		resize: vertical;
		font-size: var(--fs-secondary);
		line-height: var(--lh-ui);
	}

	.count {
		flex: none;
		color: var(--accent);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import Btn from '$lib/ui/Btn.svelte';
	import { dialog } from '$lib/ui/dialog.svelte';

	/**
	 * The one confirmation and prompt dialog, mounted by the shell.
	 *
	 * Every destructive action routes through here, so the sentence explaining
	 * what is about to be lost is written in one style and cannot be forgotten
	 * by a screen that adds an action later.
	 */

	let field = $state<HTMLInputElement | null>(null);
	const question = $derived(dialog.question);

	$effect(() => {
		if (question?.kind === 'prompt') field?.select();
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			dialog.dismiss();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			dialog.accept();
		}
	}
</script>

{#if question}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="backdrop"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) dialog.dismiss();
		}}
	>
		<div
			class="panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
			tabindex="-1"
			{onkeydown}
		>
			<h2 class="title" id="dialog-title">{question.title}</h2>
			<p class="body note">{question.body}</p>

			{#if question.kind === 'prompt'}
				<label class="field">
					<span class="note">{question.label}</span>
					<input
						bind:this={field}
						type="text"
						spellcheck="false"
						autocomplete="off"
						placeholder={question.placeholder ?? ''}
						value={dialog.draft}
						oninput={(event) => dialog.setDraft(event.currentTarget.value)}
					/>
				</label>
			{/if}

			<div class="actions">
				<Btn onclick={() => dialog.dismiss()}>Cancel</Btn>
				<!--
					`quiet` on a destructive confirmation: the travelling glow says
					"this is the thing to do next", and it is not — the thing to do
					next is to read the sentence above it.
				-->
				<Btn primary quiet={question.danger} disabled={dialog.blocked} onclick={() => dialog.accept()}>
					{question.confirmLabel}
				</Btn>
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--bg) 60%, transparent);
		z-index: 60;
	}

	.panel {
		width: min(420px, 92vw);
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		background: var(--panel);
		border: 1.5px solid var(--line);
		border-radius: var(--r-panel);
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
	}

	.title {
		margin: 0;
		font-size: var(--fs-title);
		font-weight: inherit;
	}

	.body {
		margin: 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field input {
		font: inherit;
		font-size: var(--fs-ui);
		color: inherit;
		background: var(--bg);
		border: 1.5px solid var(--line);
		border-radius: var(--r-field);
		padding: 5px 8px;
		outline: none;
	}

	.field input:focus {
		border-color: var(--accent);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 4px;
	}
</style>

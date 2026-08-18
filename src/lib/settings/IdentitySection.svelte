<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import type { IdentityKey } from '$lib/types';
	import { describeOrigin, describeOverride } from './describe';
	import { settings } from './store.svelte';

	/**
	 * Who commits: `user.name` and `user.email`, read from and written to git's
	 * own configuration.
	 *
	 * The scope is chosen, never inferred. Writing a repository-local identity
	 * into the global file is a mistake nobody notices until it is on somebody
	 * else's commits, so both scopes are shown, the fields say which one they
	 * are editing, and each value says which file it is coming from.
	 */
	const FIELDS: { key: IdentityKey; label: string; placeholder: string }[] = [
		{ key: 'name', label: 'Name', placeholder: 'Ada Lovelace' },
		{ key: 'email', label: 'Email', placeholder: 'ada@example.com' }
	];

	const identity = $derived(settings.identity);
</script>

<section class="section">
	<header class="row">
		<h2 class="heading">You</h2>
		<span class="note">What your commits are signed with by name and address.</span>
	</header>

	<div class="row">
		<span class="note">Editing</span>
		<Chip active={settings.scope === 'global'} onclick={() => settings.setScope('global')}>
			global
		</Chip>
		<Chip
			active={settings.scope === 'local'}
			onclick={() => settings.setScope('local')}
			title={settings.canEditLocally
				? 'This repository only'
				: 'No repository is open, so there is no repository configuration to edit'}
		>
			this repository
		</Chip>
		{#if !settings.canEditLocally}
			<span class="note">No repository is open, so only the global configuration is offered.</span>
		{/if}
	</div>

	{#if identity === null}
		<p class="note">Reading the git configuration…</p>
	{:else}
		{#each FIELDS as field (field.key)}
			{@const value = identity[field.key]}
			<div class="field-row">
				<label class="label" for="identity-{field.key}">{field.label}</label>
				<input
					id="identity-{field.key}"
					class="field"
					type="text"
					placeholder={field.placeholder}
					value={settings.draft(field.key)}
					oninput={(event) => settings.setDraft(field.key, event.currentTarget.value)}
				/>
				<Btn
					primary
					disabled={settings.busy || !settings.isDirty(field.key)}
					onclick={() => settings.save(field.key)}
				>
					Save
				</Btn>
				<Btn
					disabled={settings.busy || settings.draft(field.key) === ''}
					title="Empty the field. Saving an empty field unsets the key rather than storing a blank value."
					onclick={() => settings.clear(field.key)}
				>
					Clear
				</Btn>
			</div>
			<p class="note under">
				{#if value.effective === null}
					{describeOrigin(value.origin)}
				{:else}
					In effect: <span class="mono">{value.effective}</span> — {describeOrigin(value.origin)}
				{/if}
			</p>
			{#if describeOverride(value, settings.scope)}
				<p class="note under warn">{describeOverride(value, settings.scope)}</p>
			{/if}
		{/each}

		<p class="note">
			Written with <span class="mono">git config {settings.scope === 'local'
				? '--local'
				: '--global'}</span>, so it is the same file and the same value your own
			<span class="mono">git</span> reads. Saving an empty field unsets the key instead of
			writing an empty string, which git would otherwise commit with.
		</p>
	{/if}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 640px;
	}

	.heading {
		margin: 0;
		font-size: var(--fs-ui);
		font-weight: inherit;
	}

	.row,
	.field-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.label {
		width: 48px;
		flex: none;
		font-size: var(--fs-secondary);
		color: var(--muted);
	}

	.under {
		margin: -4px 0 4px 56px;
	}

	.warn {
		color: var(--ink);
	}

	.field {
		background: transparent;
		border: 1.5px solid var(--line);
		border-radius: var(--r-field);
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: var(--fs-secondary);
		padding: 3px 6px;
		width: 260px;
	}

	.field:focus {
		outline: none;
		border-color: var(--accent);
	}

	.field::placeholder {
		color: var(--placeholder);
	}

	p {
		margin: 0;
	}
</style>

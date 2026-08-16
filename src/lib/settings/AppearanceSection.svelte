<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import Chip from '$lib/ui/Chip.svelte';
	import { theme, type Theme } from '$lib/theme.svelte';

	/**
	 * Theme, which is where the temporary chip in the stub's header belonged.
	 *
	 * The theme is not one of the behaviour toggles and is not stored with them:
	 * it is a flip of one attribute on `<html>` that has to survive a reload
	 * before anything has been read from disk, so it lives in `localStorage`
	 * where the boot path can reach it. See `src/lib/theme.svelte.ts`.
	 */
	const THEMES: { id: Theme; label: string }[] = [
		{ id: 'light', label: 'Light' },
		{ id: 'dark', label: 'Dark' }
	];
</script>

<section class="section">
	<header>
		<h2 class="heading">Appearance</h2>
		<span class="note">Applied immediately and remembered on this machine.</span>
	</header>

	<div class="row">
		<span class="note">Theme</span>
		{#each THEMES as option (option.id)}
			<Chip active={theme.value === option.id} onclick={() => theme.set(option.id)}>
				{option.label}
			</Chip>
		{/each}
	</div>

	<p class="note">
		The first time GitLord runs it follows the system preference. Choosing here replaces that
		until it is changed again.
	</p>
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

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	p {
		margin: 0;
	}
</style>

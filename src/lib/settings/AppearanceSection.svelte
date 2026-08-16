<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import Chip from '$lib/ui/Chip.svelte';
	import { theme } from '$lib/theme.svelte';
	import { FAMILIES, paletteOf, type Mode } from '$lib/themes';

	/**
	 * The palette: which family, and light or dark within it.
	 *
	 * This is the one place either is set — the title bar used to carry a
	 * toggle as well, which meant two controls for one preference.
	 *
	 * The theme is not one of the behaviour toggles and is not stored with
	 * them: it has to be applied before anything has been read from disk, so it
	 * lives in `localStorage` where the boot path can reach it. See
	 * `src/lib/theme.svelte.ts`.
	 */
	const MODES: { id: Mode; label: string }[] = [
		{ id: 'light', label: 'Light' },
		{ id: 'dark', label: 'Dark' }
	];

	/**
	 * Each family is shown in the mode that is on, so the swatches are the
	 * colours that would actually appear rather than a light preview of a theme
	 * about to be used in the dark.
	 */
	const swatches = $derived(
		FAMILIES.map((family) => {
			const palette = paletteOf(family.id, theme.mode);
			return {
				id: family.id,
				name: family.name,
				variant: family[theme.mode].name,
				colours: [palette.bg, palette.panel, palette.accent, palette.ink]
			};
		})
	);
</script>

<section class="section">
	<header>
		<h2 class="heading">Appearance</h2>
		<span class="note">Applied immediately and remembered on this machine.</span>
	</header>

	<div class="row">
		<span class="note label">Mode</span>
		{#each MODES as option (option.id)}
			<Chip active={theme.mode === option.id} onclick={() => theme.setMode(option.id)}>
				{option.label}
			</Chip>
		{/each}
	</div>

	<div class="row">
		<span class="note label">Theme</span>
		<span class="note">{theme.variant.name}</span>
	</div>

	<div class="families">
		{#each swatches as family (family.id)}
			<button
				class="family"
				class:active={theme.family === family.id}
				aria-pressed={theme.family === family.id}
				onclick={() => theme.setFamily(family.id)}
			>
				<span class="swatch" aria-hidden="true">
					{#each family.colours as colour, index (index)}
						<span class="chip-colour" style="background: {colour}"></span>
					{/each}
				</span>
				<span class="names">
					<span class="family-name">{family.name}</span>
					<span class="note">{family.variant}</span>
				</span>
			</button>
		{/each}
	</div>

	<p class="note">
		The first time GitLord runs it takes light or dark from the system preference and opens on
		{FAMILIES[0].name}. Choosing here replaces both until they are changed again.
	</p>
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 10px;
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

	.label {
		width: 48px;
		flex: none;
	}

	.families {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 8px;
	}

	.family {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border: 1.5px solid var(--soft);
		border-radius: var(--r-field);
		text-align: left;
		min-width: 0;
	}

	.family:hover {
		border-color: var(--accent);
	}

	.family.active {
		border-color: var(--accent);
		background: var(--selection);
	}

	.swatch {
		display: flex;
		flex: none;
		border: 1.5px solid var(--soft);
		border-radius: var(--r-field);
		overflow: hidden;
	}

	.chip-colour {
		width: 12px;
		height: 24px;
	}

	.names {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.family-name {
		font-size: var(--fs-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	p {
		margin: 0;
	}
</style>

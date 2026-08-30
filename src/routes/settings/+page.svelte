<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import AccountsSection from '$lib/settings/AccountsSection.svelte';
	import RemotesSection from '$lib/settings/RemotesSection.svelte';
	import LicenseSection from '$lib/settings/LicenseSection.svelte';
	import AppearanceSection from '$lib/settings/AppearanceSection.svelte';
	import BehaviourSection from '$lib/settings/BehaviourSection.svelte';
	import IdentitySection from '$lib/settings/IdentitySection.svelte';
	import SigningSection from '$lib/settings/SigningSection.svelte';
	import UpdateSection from '$lib/settings/UpdateSection.svelte';
	import ExternalToolsSection from '$lib/settings/ExternalToolsSection.svelte';
	import ProfilesSection from '$lib/settings/ProfilesSection.svelte';
	import { SECTIONS, settings } from '$lib/settings/store.svelte';
	import Chip from '$lib/ui/Chip.svelte';

	/**
	 * Identity, accounts, behaviour, appearance, and what this build is made of.
	 *
	 * A chip index rather than five screens: these are read rarely and changed
	 * rarely, and one route that says which part of itself is showing is easier
	 * to link to than five that each need a rail entry.
	 *
	 * The section is in the URL fragment, so `/settings#accounts` — which the
	 * Pull requests screen links to — lands on the right one, and so does going
	 * back to it. `hashchange` is listened for as well as read on mount: a
	 * fragment-only navigation from another screen does not remount this one.
	 *
	 * Nothing here needs an open repository.
	 */
	function follow() {
		settings.showFromHash(location.hash);
	}

	function choose(id: string) {
		if (typeof history !== 'undefined') {
			history.replaceState(history.state, '', `#${id}`);
		}
		settings.showFromHash(`#${id}`);
	}

	onMount(() => {
		follow();
		settings.load();

		window.addEventListener('hashchange', follow);
		return () => window.removeEventListener('hashchange', follow);
	});
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">Settings</span>
			{#each SECTIONS as section (section.id)}
				<Chip active={settings.section === section.id} onclick={() => choose(section.id)}>
					{section.label}
				</Chip>
			{/each}
		</div>
		{#if settings.busy}<span class="note">Working…</span>{/if}
	</header>

	<div class="body">
		{#if settings.section === 'you'}
			<IdentitySection />
			<SigningSection />
			<ProfilesSection />
			<AccountsSection />
		{:else if settings.section === 'remotes'}
			<RemotesSection />
		{:else if settings.section === 'tools'}
			<ExternalToolsSection />
		{:else if settings.section === 'behaviour'}
			<BehaviourSection />
			<UpdateSection />
		{:else if settings.section === 'appearance'}
			<AppearanceSection />
		{:else}
			<LicenseSection />
		{/if}
	</div>

	<!--
		Only a failure gets a footer here. Where the settings are stored is not
		something the person changing them needs told, and rendered
		unconditionally the strip would be empty on every ordinary visit.
	-->
	{#if settings.writeError || settings.error}
		<footer class="foot">
			{#if settings.writeError}
				<span class="note error">{settings.writeError}</span>
			{:else}
				<span class="note error">{settings.error}</span>
			{/if}
		</footer>
	{/if}
</div>

<style>
	.screen {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 12px;
		background-color: var(--chrome-veil);
		border-bottom: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
		box-shadow: none;
		position: relative;
		z-index: 1;
	}

	.left {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		flex-wrap: wrap;
	}

	.title {
		font-size: var(--fs-title);
		white-space: nowrap;
	}

	/* A column since **You** grew a second section: two stacked sections with no
	   gap read as one section with a stray heading in the middle. */
	.body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.foot {
		flex: none;
		padding: 8px 12px;
		background-color: var(--chrome-veil);
		border-top: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
		box-shadow: none;
		position: relative;
		z-index: 1;
	}

	.error {
		color: var(--danger);
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import AccountsSection from '$lib/settings/AccountsSection.svelte';
	import AdvancedSection from '$lib/settings/AdvancedSection.svelte';
	import AppearanceSection from '$lib/settings/AppearanceSection.svelte';
	import BehaviourSection from '$lib/settings/BehaviourSection.svelte';
	import IdentitySection from '$lib/settings/IdentitySection.svelte';
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
		{:else if settings.section === 'accounts'}
			<AccountsSection />
		{:else if settings.section === 'behaviour'}
			<BehaviourSection />
		{:else if settings.section === 'appearance'}
			<AppearanceSection />
		{:else}
			<AdvancedSection />
		{/if}
	</div>

	<footer class="foot">
		{#if settings.writeError}
			<span class="note error">{settings.writeError}</span>
		{:else if settings.error}
			<span class="note error">{settings.error}</span>
		{:else}
			<span class="note">
				The identity is git's own configuration and is written with <span class="mono"
					>git config</span
				>. Everything else on this screen is GitLord's own and is stored beside its list of
				repositories.
			</span>
		{/if}
	</footer>
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
		border-bottom: 1.5px solid var(--soft);
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

	.body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 12px;
	}

	.foot {
		flex: none;
		padding: 8px 12px;
		border-top: 1.5px solid var(--soft);
	}

	.error {
		color: var(--accent);
	}
</style>

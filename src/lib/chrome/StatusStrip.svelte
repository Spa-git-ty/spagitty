<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { version } from '$lib/version';
	import { settings } from '$lib/settings/store.svelte';
	import { profiles } from '$lib/profiles/store.svelte';
	import Menu from '$lib/ui/Menu.svelte';
	import type { MenuItem } from '$lib/ui/menu';

	const identity = $derived(settings.identity);
	const name = $derived(identity?.name.effective ?? null);
	const email = $derived(identity?.email.effective ?? null);

	let menu = $state<{ x: number; y: number; anchor: HTMLElement } | null>(null);

	const activeProfile = $derived(
		profiles.list.find((p) => p.authorName === name && p.authorEmail === email)
	);

	function openProfileMenu(event: MouseEvent) {
		if (menu) {
			menu = null;
			return;
		}
		const btn = event.currentTarget as HTMLElement;
		const box = btn.getBoundingClientRect();
		menu = { x: box.left, y: box.top - 4, anchor: btn };
	}

	const menuItems = $derived.by((): MenuItem[] => {
		const items: MenuItem[] = profiles.list.map((p) => ({
			id: p.id,
			label: p.name,
			note: `${p.authorName} <${p.authorEmail}>`,
			run: () => void profiles.apply(p, false)
		}));
		items.push({
			id: 'manage-profiles',
			label: 'Manage Profiles…',
			run: () => {
				window.location.href = '/settings#you';
			}
		});
		return items;
	});

	onMount(() => {
		void profiles.fetch();
	});
</script>

<div class="strip" role="contentinfo" aria-label="Application status">
	<span class="left">
		{#if name || email}
			<button
				type="button"
				class="profile-btn"
				title={email ? `${name ?? ''} <${email}>` : (name ?? '')}
				onclick={openProfileMenu}
			>
				<span class="avatar-dot">👤</span>
				<span class="profile-text">
					{#if activeProfile}
						<b>{activeProfile.name}</b> ({name})
					{:else}
						{name ?? email}
					{/if}
				</span>
			</button>
		{/if}
	</span>
	<span class="note mono" title={version.license}>
		{version.licenseShort} · v{version.number}
	</span>
</div>

{#if menu}
	<Menu
		x={menu.x}
		y={menu.y}
		anchor={menu.anchor}
		items={menuItems}
		label="Identity profiles"
		onclose={() => (menu = null)}
	/>
{/if}

<style>
	.strip {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 0 10px;
		height: var(--strip-h);
		border-top: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
		background-color: var(--chrome-veil);
	}

	.left {
		min-width: 0;
	}

	.note {
		font-size: var(--fs-secondary);
		color: var(--muted);
		white-space: nowrap;
	}

	.profile-btn {
		background: transparent;
		border: none;
		color: var(--muted);
		font: inherit;
		font-size: var(--fs-secondary);
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 2px 4px;
		border-radius: 4px;
		cursor: pointer;
	}

	.profile-btn:hover {
		background: var(--soft);
		color: var(--fg, #eee);
	}

	.avatar-dot {
		font-size: 11px;
	}

	.profile-text {
		max-width: 320px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { tick } from 'svelte';
	import { isEntry, type MenuItem } from '$lib/ui/menu';

	/**
	 * A floating menu, positioned at a point.
	 *
	 * Every right-click menu in GitLord is this component with a different list,
	 * because the behaviour that has to be right — closing on an outside click,
	 * closing on Escape, staying inside the window, arrow-key navigation, not
	 * letting a disabled entry be chosen — is the same every time and is not
	 * worth getting subtly different in six places.
	 *
	 * An entry that cannot run is **shown, disabled, with its reason** rather
	 * than hidden. A menu whose contents change with state is one nobody can
	 * learn; a menu that says "Delete — checked out" teaches the rule.
	 */

	interface Props {
		x: number;
		y: number;
		items: MenuItem[];
		/** Named for screen readers, since the menu has no visible title. */
		label: string;
		onclose: () => void;
	}

	let { x, y, items, label, onclose }: Props = $props();

	let element = $state<HTMLDivElement | null>(null);
	let placed = $state<{ left: number; top: number } | null>(null);
	let cursor = $state(-1);

	const entries = $derived(items.filter(isEntry));

	/**
	 * Keep the menu inside the window.
	 *
	 * Measured after mount rather than estimated: the height depends on how many
	 * entries the caller passed and on the current text size, and a menu opened
	 * near the bottom of a window is the ordinary case, not the edge case.
	 */
	$effect(() => {
		void items;
		(async () => {
			await tick();
			if (!element) return;
			const box = element.getBoundingClientRect();
			const margin = 8;
			placed = {
				left: Math.max(margin, Math.min(x, window.innerWidth - box.width - margin)),
				top: Math.max(margin, Math.min(y, window.innerHeight - box.height - margin))
			};
			element.focus();
		})();
	});

	async function choose(entry: (typeof entries)[number]) {
		if (entry.disabled) return;
		// Close first: the action may open a dialog, and a menu still on screen
		// behind it would take the next outside click meant for the dialog.
		onclose();
		await entry.run();
	}

	function step(delta: number) {
		const usable = entries.filter((entry) => !entry.disabled);
		if (usable.length === 0) return;

		const current = usable.findIndex((entry) => entry === entries[cursor]);
		const next = (current + delta + usable.length) % usable.length;
		cursor = entries.indexOf(usable[next]);
	}

	function onkeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				onclose();
				return;
			case 'ArrowDown':
				event.preventDefault();
				step(1);
				return;
			case 'ArrowUp':
				event.preventDefault();
				step(-1);
				return;
			case 'Enter':
			case ' ':
				if (cursor >= 0) {
					event.preventDefault();
					choose(entries[cursor]);
				}
				return;
		}
	}
</script>

<svelte:window
	onmousedown={(event) => {
		if (element && !element.contains(event.target as Node)) onclose();
	}}
	onresize={onclose}
/>

<div
	bind:this={element}
	class="menu"
	class:measuring={placed === null}
	style="left: {placed?.left ?? x}px; top: {placed?.top ?? y}px"
	role="menu"
	aria-label={label}
	tabindex="-1"
	{onkeydown}
>
	{#each items as item, index (index)}
		{#if 'separator' in item}
			<div class="hr" role="separator"></div>
		{:else if 'heading' in item}
			<div class="heading note">{item.heading}</div>
		{:else}
			<button
				class="entry"
				class:danger={item.danger}
				class:at={entries[cursor] === item}
				role="menuitem"
				disabled={item.disabled}
				onmouseenter={() => (cursor = entries.indexOf(item))}
				onclick={() => choose(item)}
			>
				<span class="label">{item.label}</span>
				{#if item.disabled && item.reason}
					<span class="note side">{item.reason}</span>
				{:else if item.note}
					<span class="mono muted side">{item.note}</span>
				{/if}
			</button>
		{/if}
	{/each}
</div>

<style>
	.menu {
		position: fixed;
		z-index: 50;
		min-width: 200px;
		max-width: 340px;
		padding: 5px;
		background: var(--panel);
		border: 1.5px solid var(--line);
		border-radius: var(--r-panel);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.26);
		outline: none;
	}

	/* Rendered so it can be measured, but not shown at the wrong place first. */
	.measuring {
		visibility: hidden;
	}

	.heading {
		padding: 5px 8px 3px;
	}

	.entry {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 5px 8px;
		border-radius: var(--r-row);
		text-align: left;
		font-size: var(--fs-secondary);
	}

	.entry.at:not(:disabled) {
		background: var(--selection);
	}

	.entry:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.entry.danger:not(:disabled) .label {
		color: var(--lane-3);
	}

	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.side {
		flex: none;
	}
</style>

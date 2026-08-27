<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { tick } from 'svelte';
	import { isEntry, type MenuItem } from '$lib/ui/menu';
	import { liquidGlass } from '$lib/ui/liquidGlass';

	/**
	 * A floating menu, positioned at a point.
	 *
	 * Every right-click menu in Spagitty is this component with a different list,
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
		/**
		 * The control this menu was opened from, when it was opened by a click
		 * rather than at the pointer.
		 *
		 * A pointer sends `mousedown` and then `click`. Without this, the
		 * mousedown on the control landed outside the menu and closed it, and
		 * the click that followed opened it again — so the one gesture everybody
		 * tries first, clicking the control a second time, could not dismiss it
		 * (BUG-018). Mousedowns on the anchor are left alone, and the control
		 * decides on the click whether it is opening or closing.
		 */
		anchor?: HTMLElement | null;
		onclose: () => void;
	}

	let { x, y, items, label, anchor = null, onclose }: Props = $props();

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

	/**
	 * Move the cursor by `delta`, over the entries that can actually run.
	 *
	 * BUG-008: with nothing selected yet, `entries[cursor]` is `entries[-1]` —
	 * `undefined` — and `findIndex` answers `-1` for it. Down happened to work
	 * out (`-1 + 1` is the first entry); up did not, landing on
	 * `usable.length - 2`, so the first ArrowUp into a three-item menu chose the
	 * middle one and into a two-item menu chose the first.
	 *
	 * With no cursor there is no "current", so the direction alone decides:
	 * down opens at the first entry, up at the last.
	 */
	function step(delta: number) {
		const usable = entries.filter((entry) => !entry.disabled);
		if (usable.length === 0) return;

		const current = usable.findIndex((entry) => entry === entries[cursor]);
		const next =
			current === -1
				? delta > 0
					? 0
					: usable.length - 1
				: (current + delta + usable.length) % usable.length;

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
		const target = event.target as Node;
		// The control that opened it gets to be the control that closes it.
		if (anchor?.contains(target)) return;
		if (element && !element.contains(target)) onclose();
	}}
	onresize={onclose}
/>

<div
	bind:this={element}
	class="menu"
	class:measuring={placed === null}
	use:liquidGlass
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
	/*
	 * A menu floats over the application rather than sitting in it, so it takes
	 * the floating surface and the deepest of the three shadows — and the
	 * shadow is the theme's own ink rather than black, which is what stopped a
	 * menu over Gruvbox looking like a hole cut in the window.
	 */
	.menu {
		position: fixed;
		z-index: 50;
		min-width: 200px;
		max-width: 340px;
		padding: 5px;
		background-color: var(--glass-thick);
		backdrop-filter: var(--blur-thick);
		-webkit-backdrop-filter: var(--blur-thick);
		border: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
		border-radius: var(--r-panel);
		box-shadow: var(--glass-rim-thick), var(--shadow-3);
		outline: none;
		/* It appears at the pointer, so it grows from where it was asked for
		   rather than fading in from nowhere. */
		transform-origin: top left;
		animation: pop-in var(--t-enter-liquid) var(--spring-liquid);
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

	/* The item the keyboard is on. A stronger tint than the hover state, so the
	   two are tellable apart at a glance. */
	.entry.at:not(:disabled) {
		background: var(--selection);
	}

	.entry:not(:disabled):hover {
		background: var(--hover);
	}

	.entry:disabled {
		opacity: 0.45;
		cursor: default;
	}

	/* The palette's red, not the graph's third lane — see `Chip.svelte`. */
	.entry.danger:not(:disabled) .label {
		color: var(--danger);
	}

	.entry.danger:not(:disabled):hover {
		background: var(--danger-soft);
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

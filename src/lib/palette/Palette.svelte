<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { palette } from '$lib/palette/store.svelte';

	/**
	 * The command palette overlay.
	 *
	 * Mounted once by the shell, because the palette is not a screen's control:
	 * it reaches every command from wherever you are, and one owned by a route
	 * would go away with it.
	 */

	let input = $state<HTMLInputElement | null>(null);
	let list = $state<HTMLDivElement | null>(null);

	const matches = $derived(palette.matches);

	// Focus the field the moment it appears. Autofocus attributes do not fire
	// on an element that was conditionally rendered into an already-loaded page.
	$effect(() => {
		if (palette.open) input?.focus();
	});

	// Keep the highlighted row on screen when the cursor moves by keyboard.
	$effect(() => {
		void palette.cursor;
		list?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
	});

	function onkeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				palette.hide();
				return;
			case 'ArrowDown':
				event.preventDefault();
				palette.move(1);
				return;
			case 'ArrowUp':
				event.preventDefault();
				palette.move(-1);
				return;
			case 'Enter':
				event.preventDefault();
				palette.accept();
				return;
		}
	}

	/** Split a title into matched and unmatched runs, for highlighting. */
	function parts(title: string, hits: number[]): { text: string; hit: boolean }[] {
		if (hits.length === 0) return [{ text: title, hit: false }];

		const marked = new Set(hits);
		const out: { text: string; hit: boolean }[] = [];
		for (let i = 0; i < title.length; i++) {
			const hit = marked.has(i);
			const last = out[out.length - 1];
			if (last && last.hit === hit) last.text += title[i];
			else out.push({ text: title[i], hit });
		}
		return out;
	}

	function reason(index: number): string | null {
		const command = matches[index].command;
		if (command.enabled && !command.enabled()) {
			return command.unavailable?.() ?? 'not available right now';
		}
		return null;
	}
</script>

{#if palette.open}
	<!--
		The backdrop closes on click, which is why it carries a role and a key
		handler: it is a real dismiss control, not decoration.
	-->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="backdrop"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) palette.hide();
		}}
	>
		<div class="panel" role="dialog" aria-modal="true" aria-label="Commands">
			<input
				bind:this={input}
				class="field"
				type="text"
				placeholder="Type a command…"
				spellcheck="false"
				autocomplete="off"
				aria-label="Command"
				aria-controls="palette-list"
				value={palette.query}
				oninput={(event) => palette.setQuery(event.currentTarget.value)}
				{onkeydown}
			/>

			<div class="hr"></div>

			<div class="list" id="palette-list" role="listbox" bind:this={list}>
				{#each matches as match, index (match.command.id)}
					{@const blocked = reason(index)}
					{@const group =
						index === 0 || matches[index - 1].command.group !== match.command.group
							? match.command.group
							: null}

					{#if group}<div class="group note">{group}</div>{/if}

					<button
						class="item"
						class:active={index === palette.cursor}
						class:blocked={blocked !== null}
						data-active={index === palette.cursor}
						role="option"
						aria-selected={index === palette.cursor}
						disabled={blocked !== null}
						onmouseenter={() => palette.setCursor(index)}
						onclick={() => palette.accept()}
					>
						<span class="title">
							{#each parts(match.command.title, match.hits) as run, i (i)}
								{#if run.hit}<b>{run.text}</b>{:else}{run.text}{/if}
							{/each}
						</span>
						{#if blocked}
							<span class="note why">{blocked}</span>
						{:else if match.command.shortcut}
							<span class="mono muted">{match.command.shortcut}</span>
						{/if}
					</button>
				{:else}
					<p class="note empty">Nothing matches “{palette.query}”.</p>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		/* Not centred: the palette appears where the eye already is on a screen
		   read top-down, and centring it would move the list under the cursor. */
		padding-top: 12vh;
		background: color-mix(in srgb, var(--bg) 55%, transparent);
		z-index: 40;
	}

	.panel {
		width: min(560px, 92vw);
		max-height: 60vh;
		display: flex;
		flex-direction: column;
		background: var(--panel);
		border: 1.5px solid var(--line);
		border-radius: var(--r-panel);
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
		overflow: hidden;
	}

	.field {
		font: inherit;
		font-size: var(--fs-title);
		color: inherit;
		background: transparent;
		border: none;
		outline: none;
		padding: 12px 14px;
	}

	.field::placeholder {
		color: var(--placeholder);
	}

	.list {
		overflow-y: auto;
		padding: 6px;
	}

	.group {
		padding: 8px 8px 4px;
	}

	.item {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 6px 8px;
		border-radius: var(--r-row);
		text-align: left;
	}

	.item.active {
		background: var(--selection);
	}

	.item.blocked {
		opacity: 0.5;
		cursor: default;
	}

	.title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.title b {
		font-weight: inherit;
		color: var(--accent);
	}

	.why {
		flex: none;
	}

	.empty {
		margin: 0;
		padding: 10px 8px;
	}
</style>

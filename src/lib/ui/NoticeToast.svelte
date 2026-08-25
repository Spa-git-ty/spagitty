<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { notice } from '$lib/ui/notice.svelte';

	/**
	 * The result of the last operation, bottom-right, mounted by the shell.
	 *
	 * Named `NoticeToast` rather than `Notice` because of BUG-010: the store it
	 * reads is `notice.svelte.ts`, and on a case-insensitive filesystem —
	 * Windows, and macOS by default — `$lib/ui/notice.svelte` resolved to
	 * `Notice.svelte` instead. The component imported itself and the Windows
	 * build failed where the Linux one had always passed. A component and a
	 * rune store in one directory must not differ only by case.
	 */
	const current = $derived(notice.current);
</script>

{#if current}
	<div class="notice" class:error={current.tone === 'error'} role="status" aria-live="polite">
		<div class="text">
			<span class="title">{current.title}</span>
			{#if current.detail}<span class="note detail">{current.detail}</span>{/if}
		</div>
		<button class="close" aria-label="Dismiss" onclick={() => notice.dismiss()}>×</button>
	</div>
{/if}

<style>
	.notice {
		position: fixed;
		right: 14px;
		bottom: 14px;
		z-index: 55;
		max-width: min(420px, 60vw);
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 12px;
		background-color: var(--glass-thick);
		backdrop-filter: var(--blur-thick);
		-webkit-backdrop-filter: var(--blur-thick);
		border: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
		/* The stripe says which kind of news this is, and it is the palette's own
		   green or red rather than a graph lane, which was cyan on Dracula. */
		border-left: 3px solid var(--ok);
		border-radius: var(--r-panel);
		box-shadow: var(--glass-rim), var(--shadow-3);
		/* It arrives from the corner it lives in. */
		animation: rise-in var(--t-enter-liquid) var(--spring-liquid);
		/* A tint of the same colour behind it, so the meaning is carried by more
		   than three pixels down one edge. */
		background-image: linear-gradient(90deg, var(--ok-soft), transparent 42%);
	}

	.notice.error {
		border-left-color: var(--danger);
		background-image: linear-gradient(90deg, var(--danger-soft), transparent 42%);
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.title {
		font-size: var(--fs-secondary);
	}

	/* Selectable and wrapped: git's message is often the thing worth copying. */
	.detail {
		white-space: pre-wrap;
		word-break: break-word;
		user-select: text;
	}

	.close {
		flex: none;
		line-height: 1;
		font-size: var(--fs-title);
		color: var(--muted);
		border-radius: var(--r-field);
		padding: 0 4px;
		transition:
			background var(--t-fast) var(--ease),
			color var(--t-fast) var(--ease);
	}

	.close:hover {
		color: var(--ink);
		background: var(--hover);
	}
</style>

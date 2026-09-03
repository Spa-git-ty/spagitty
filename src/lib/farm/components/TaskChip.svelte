<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { taskStatusLabel, tone, isMoving } from '../describe';
	import type { TaskStatus } from '../types';

	/**
	 * A task's status, as a chip (FEAT-073).
	 *
	 * Not `Chip` from the UI set: this one carries a *tone* rather than an
	 * active state, and a pulse while something is happening. A row of eleven
	 * differently-coloured chips would be a rainbow, so `tone()` collapses the
	 * eleven statuses into four — finished, moving, stuck, waiting — and the
	 * word says which of the eleven it actually is.
	 */
	interface Props {
		status: TaskStatus;
		title?: string;
	}

	let { status, title }: Props = $props();
</script>

<span
	class="chip {tone(status)}"
	class:moving={isMoving(status)}
	title={title ?? taskStatusLabel(status)}
	data-status={status}
>
	{taskStatusLabel(status)}
</span>

<style>
	.chip {
		border: 1px solid var(--soft);
		border-radius: var(--r-pill);
		padding: 1px 8px;
		font-size: var(--fs-mono);
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
		background-color: var(--surface-veil);
		color: var(--muted);
	}

	.done {
		color: var(--ok);
		border-color: color-mix(in srgb, var(--ok) 40%, transparent);
	}

	.active {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 45%, transparent);
	}

	.stuck {
		color: var(--danger);
		border-color: color-mix(in srgb, var(--danger) 40%, transparent);
	}

	/*
	 * A slow breath while an agent is working, so a screen left open says
	 * whether anything is still happening without being read.
	 *
	 * Opacity only — no movement, no size change. A chip that jumps drags the
	 * eye away from whatever the person is actually reading.
	 */
	.moving {
		animation: breathe 2.4s var(--ease) infinite;
	}

	@keyframes breathe {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.moving {
			animation: none;
		}
	}
</style>

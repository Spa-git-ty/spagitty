<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import BadgeChip from '$lib/delight/BadgeChip.svelte';
	import { delight } from '$lib/delight/store.svelte';

	/**
	 * The reward moment (FEAT-072).
	 *
	 * Mounted once by the shell, like the notice and the dialog, and for the
	 * same reason: a rebase started on one screen finishes on whichever screen
	 * the user has walked to, and the badge it earns has to arrive there.
	 *
	 * # The timing is the feature
	 *
	 * ```
	 *   operation completes
	 *          │
	 *          ▼   SILENCE, 220ms          ← this is the part people feel
	 *      badge appears
	 *          │
	 *          ▼   holds 2.6s (4.2s legendary)
	 *        leaves
	 * ```
	 *
	 * The pause before it appears is not a loading delay — it is what separates
	 * the acknowledgement from the operation, so the badge reads as a *reaction*
	 * to what happened rather than as part of it. Without it the card arrives
	 * inside the same frame as the notice and the two look like one busy toast.
	 *
	 * # It never blocks
	 *
	 * No backdrop that swallows clicks, no focus trap, no button that must be
	 * pressed. Somebody who has just finished a rebase is in the middle of
	 * something, and a git client that interrupts them to say well done is worse
	 * than a git client that says nothing. The card is `pointer-events: none`
	 * apart from its own dismiss, and typing straight through it is expected.
	 *
	 * The one exception is a legendary badge, which dims the window for a
	 * second — and even that dims it without capturing anything.
	 */

	const showing = $derived(delight.showing);
	const legendary = $derived(showing?.badge.rarity === 'legendary');

	/** How long a card stays. The rare ones have more to read. */
	const HOLD = 2600;
	const HOLD_LEGENDARY = 4200;
	/** The silence before it appears. */
	const BEAT = 220;

	let timer: ReturnType<typeof setTimeout> | null = null;
	let waking: ReturnType<typeof setTimeout> | null = null;
	/** Drives the entrance, so the card animates in rather than snapping in. */
	let entered = $state(false);

	/**
	 * Pull the next unlock off the queue after the beat, then set its exit.
	 *
	 * Runs whenever the queue grows and nothing is showing, which is what makes
	 * a chain of unlocks a sequence of cards instead of five cards on top of
	 * each other.
	 */
	$effect(() => {
		const waiting = delight.waiting;
		if (waiting === 0 || delight.showing !== null || waking !== null) return;

		waking = setTimeout(() => {
			waking = null;
			delight.advance();
		}, BEAT);
	});

	$effect(() => {
		const current = delight.showing;
		if (!current) {
			entered = false;
			return;
		}

		// One frame late, so the transition has a state to move from.
		const raised = requestAnimationFrame(() => {
			entered = true;
		});

		if (timer) clearTimeout(timer);
		timer = setTimeout(
			() => delight.dismiss(),
			current.badge.rarity === 'legendary' ? HOLD_LEGENDARY : HOLD
		);

		return () => {
			cancelAnimationFrame(raised);
			if (timer) clearTimeout(timer);
			timer = null;
		};
	});

	onMount(() => () => {
		if (timer) clearTimeout(timer);
		if (waking) clearTimeout(waking);
	});
</script>

{#if showing}
	<!--
		`aria-live="polite"` rather than an alert: it is worth announcing and it
		is never worth interrupting what a screen reader is already saying.
	-->
	<div class="stage" class:legendary aria-live="polite">
		{#if legendary}<div class="dim" aria-hidden="true"></div>{/if}

		<div class="card" class:entered>
			<BadgeChip found={showing.badge} size="large" />
			<p class="line">{showing.badge.line}</p>
			<span class="rarity">{showing.badge.rarity}</span>
			{#if showing.who}<span class="note who">{showing.who}</span>{/if}
			<button class="close" aria-label="Dismiss" onclick={() => delight.dismiss()}>×</button>
		</div>
	</div>
{/if}

<style>
	/*
	 * Above everything, and in the way of nothing.
	 *
	 * `pointer-events: none` on the stage with the card's own dismiss opting
	 * back in: the card sits over the middle of the window, which is exactly
	 * where somebody's next click is going to be.
	 */
	.stage {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.dim {
		position: absolute;
		inset: 0;
		background: color-mix(in srgb, var(--umbra) 55%, transparent);
		animation: fade-in 320ms var(--ease);
	}

	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 22px 30px 18px;
		border-radius: var(--r-floating);
		background-color: var(--glass-thick);
		backdrop-filter: var(--blur-thick);
		-webkit-backdrop-filter: var(--blur-thick);
		border: var(--glass-edge-line);
		border-top-color: var(--glass-edge);
		box-shadow: var(--shadow-3);
		/* The state it moves *from*. `.entered` is added a frame later. */
		opacity: 0;
		transform: translateY(10px) scale(0.96);
		transition:
			opacity 200ms var(--ease),
			transform 320ms var(--spring-liquid);
	}

	.card.entered {
		opacity: 1;
		transform: translateY(0) scale(1);
	}

	.line {
		margin: 0;
		max-width: 34ch;
		text-align: center;
		font-size: var(--fs-secondary);
		color: var(--muted);
	}

	.rarity {
		font-size: var(--fs-mono);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.legendary .rarity {
		color: var(--warn);
	}

	.who {
		font-size: var(--fs-mono);
	}

	.close {
		position: absolute;
		top: 6px;
		right: 8px;
		line-height: 1;
		font-size: var(--fs-title);
		color: var(--muted);
		border-radius: var(--r-field);
		padding: 0 4px;
		/* The one thing on the stage that can be clicked. */
		pointer-events: auto;
	}

	.close:hover {
		color: var(--ink);
		background: var(--hover);
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/*
	 * Motion off means motion off.
	 *
	 * The card still appears, still holds and still leaves — what goes is the
	 * travel and the scale. An achievement that only exists as an animation
	 * would be an achievement somebody with vestibular problems cannot have.
	 */
	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: opacity 120ms linear;
			transform: none;
		}

		.card.entered {
			transform: none;
		}

		.dim {
			animation: none;
		}
	}
</style>

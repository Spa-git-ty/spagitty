<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	/**
	 * How far a farm has got, as a ring (FEAT-077).
	 *
	 * `3 / 7 done` is a fact and reads as one. A farm is watched rather than
	 * read, often out of the corner of an eye while something else has the
	 * attention, and a shape says "nearly there" or "barely started" without
	 * being parsed.
	 *
	 * # Why one ring and not a bar per status
	 *
	 * Because there are four numbers and only one of them is the question. Done
	 * fills the ring; what is *running* is a brighter arc at the leading edge,
	 * so a farm that is working looks different from one that has stopped with
	 * the same amount finished; and anything blocked colours the remainder,
	 * because a farm with two blocked tasks is not simply unfinished.
	 *
	 * The whole thing is one SVG with two arcs and no layout of its own, so it
	 * costs nothing to put in a header that already has chips in it.
	 */
	interface Props {
		done: number;
		running: number;
		blocked: number;
		total: number;
		/** Diameter in pixels. */
		size?: number;
	}

	let { done, running, blocked, total, size = 22 }: Props = $props();

	const RADIUS = 9;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	const share = $derived(total > 0 ? done / total : 0);
	const active = $derived(total > 0 ? running / total : 0);

	/** Where the running arc starts: at the end of the finished one. */
	const offset = $derived(-share * CIRCUMFERENCE);

	const label = $derived(
		total === 0
			? 'No tasks yet'
			: `${done} of ${total} done` +
					(running > 0 ? `, ${running} running` : '') +
					(blocked > 0 ? `, ${blocked} needing you` : '')
	);
</script>

<span class="ring" title={label} role="img" aria-label={label}>
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<!-- The remainder. Red when something is stuck: an unfinished farm and a
		     stuck one are not the same state. -->
		<circle
			class="rest"
			class:stuck={blocked > 0}
			cx="12"
			cy="12"
			r={RADIUS}
			fill="none"
			stroke-width="3"
		/>
		<!-- What is finished. -->
		<circle
			class="done"
			cx="12"
			cy="12"
			r={RADIUS}
			fill="none"
			stroke-width="3"
			stroke-linecap="round"
			stroke-dasharray="{share * CIRCUMFERENCE} {CIRCUMFERENCE}"
			transform="rotate(-90 12 12)"
		/>
		<!-- What is happening right now, at the leading edge. -->
		{#if running > 0}
			<circle
				class="running"
				cx="12"
				cy="12"
				r={RADIUS}
				fill="none"
				stroke-width="3"
				stroke-linecap="round"
				stroke-dasharray="{active * CIRCUMFERENCE} {CIRCUMFERENCE}"
				stroke-dashoffset={offset}
				transform="rotate(-90 12 12)"
			/>
		{/if}
	</svg>
	<span class="count note">{done}<span class="of">/{total}</span></span>
</span>

<style>
	.ring {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.rest {
		stroke: var(--soft);
	}

	.rest.stuck {
		stroke: color-mix(in srgb, var(--danger) 45%, transparent);
	}

	.done {
		stroke: var(--ok);
		/*
		 * The arc grows rather than jumps. It is the one animation on this
		 * screen that is about a number changing, and a ring that snaps is a
		 * ring nobody sees change.
		 */
		transition: stroke-dasharray var(--t-slow) var(--ease);
	}

	.running {
		stroke: var(--accent);
		animation: breathe 2.4s var(--ease) infinite;
		transition:
			stroke-dasharray var(--t-slow) var(--ease),
			stroke-dashoffset var(--t-slow) var(--ease);
	}

	.count {
		font-size: var(--fs-mono);
		white-space: nowrap;
	}

	.of {
		color: var(--muted);
	}

	@keyframes breathe {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.45;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.done,
		.running {
			transition: none;
			animation: none;
		}
	}
</style>

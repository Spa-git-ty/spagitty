<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import type { RefChip } from '$lib/types';

	interface Props {
		chip: RefChip;
	}

	let { chip }: Props = $props();
</script>

<!--
	Tags take a right-notched radius and a dashed border so a tag is tellable
	from a branch at a glance, without a label or an icon. The current branch is
	the only chip that gets accent color and a check.
-->
<span
	class="ref"
	class:current={chip.current}
	class:tag={chip.kind === 'tag'}
	class:remote={chip.kind === 'remote'}
	title={chip.name}
>
	{#if chip.current}<span aria-hidden="true">✔</span>{/if}{chip.name}
</span>

<style>
	.ref {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		border: 1.5px solid var(--soft);
		border-radius: var(--r-field);
		padding: 0 5px;
		font-family: var(--font-mono);
		font-size: var(--fs-mono);
		background: var(--bg);
		white-space: nowrap;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		/*
		 * BUG-006. The three rules above promise a chip that ellipsises rather
		 * than pushing its neighbours out of the box, and without this one they
		 * do not keep that promise anywhere the chip is a flex item.
		 *
		 * A flex item's `min-width` defaults to `auto`, whose used value is the
		 * content's own width — so the chip refuses to shrink below a long
		 * branch name, `max-width: 100%` never gets to apply, and the overflow
		 * lands on top of whatever sits beside it. On the All repositories card
		 * that is the "N branches" count, which is what the overlap was.
		 */
		min-width: 0;
	}

	.ref.current {
		border-color: var(--accent);
		color: var(--accent);
	}

	.ref.remote {
		color: var(--muted);
	}

	.ref.tag {
		border-radius: 3px 8px 8px 3px;
		border-style: dashed;
	}
</style>

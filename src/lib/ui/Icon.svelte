<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { ICONS, type IconName } from './icons';

	interface Props {
		name: IconName;
		/**
		 * Sized in `em` by default, so an icon grows with the text beside it
		 * rather than staying a fixed dot next to a label at 130%. A number is
		 * taken as CSS pixels for the few places that need a fixed size.
		 */
		size?: string | number;
		/** Stroke weight. Heavier for a small icon standing alone. */
		weight?: number;
		title?: string;
	}

	let { name, size = '1.15em', weight = 1.7, title }: Props = $props();

	const paths = $derived(ICONS[name] ?? []);
	const box = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

<!--
	`aria-hidden` unless it is given a title: an icon is decoration beside a
	label almost everywhere it appears, and a screen reader announcing "graph
	image" before the word "Graph" is worse than silence. Where an icon is the
	*only* thing a control says, the caller passes a title and gets a real
	label.
-->
<svg
	class="icon"
	viewBox="0 0 24 24"
	width={box}
	height={box}
	fill="none"
	stroke="currentColor"
	stroke-width={weight}
	stroke-linecap="round"
	stroke-linejoin="round"
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
	aria-label={title}
>
	{#if title}<title>{title}</title>{/if}
	{#each paths as d (d)}
		<path {d} />
	{/each}
</svg>

<style>
	.icon {
		flex: none;
		/* `inline-block`, not `block`: an icon dropped inline beside a word has
		   to sit on that word's baseline, and the optical correction below only
		   applies to an inline box. */
		display: inline-block;
		vertical-align: -0.15em;
	}
</style>

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	/**
	 * TEMPORARY — a tuning harness for the liquid glass, not a feature.
	 *
	 * Six sliders for the six numbers the effect is made of, so the author can
	 * settle on values by looking at them instead of by describing them. It
	 * lives on `chore/glass-knobs-tuning-scratch` and is never merged: once the
	 * numbers are chosen they go into `DEFAULTS` and `--r-panel`, and this file
	 * goes to the trash bin.
	 *
	 * Two of the six do not belong to `DEFAULTS`:
	 *
	 * - **radius** is `--r-panel`, the corner every panel and menu is cut with.
	 *   It is written straight onto the document, and the lens follows it
	 *   without being told: `geometry()` reads the pane's computed
	 *   `border-radius` when it measures, so the refraction ring changes shape
	 *   with the corner.
	 * - the rest are the material, and are pushed into `DEFAULTS` in place so
	 *   that the next menu opened is built with them.
	 *
	 * The sample pane below carries `use:liquidGlass` with the live values, so
	 * the action's own `update` fires on every drag and the preview refracts
	 * immediately — no need to open a menu to see a change.
	 */
	import { liquidGlass } from '$lib/ui/liquidGlass';
	import { DEFAULTS } from '$lib/ui/liquidGlassMaps';

	interface Knob {
		key: 'depth' | 'strength' | 'chromaticAberration' | 'blur' | 'saturate' | 'radius';
		label: string;
		hint: string;
		min: number;
		max: number;
		step: number;
	}

	const KNOBS: Knob[] = [
		{
			key: 'depth',
			label: 'Depth',
			hint: 'Width of the refracting band at the rim — the thickness of the glass.',
			min: 2,
			max: 60,
			step: 1
		},
		{
			key: 'strength',
			label: 'Strength',
			hint: 'How hard the band pushes the backdrop outward.',
			min: 0,
			max: 60,
			step: 1
		},
		{
			key: 'chromaticAberration',
			label: 'Chromatic aberration',
			hint: 'Colour split at the rim, in displacement pixels.',
			min: 0,
			max: 12,
			step: 0.5
		},
		{ key: 'blur', label: 'Blur', hint: 'The frost inside the pane.', min: 0, max: 80, step: 1 },
		{
			key: 'saturate',
			label: 'Saturate',
			hint: 'Saturation of the frost, as a multiplier.',
			min: 0,
			max: 4,
			step: 0.1
		},
		{
			key: 'radius',
			label: 'Corner radius',
			hint: 'The --r-panel corner. Reshapes the refraction ring as well as the edge.',
			min: 0,
			max: 48,
			step: 1
		}
	];

	const STORE_KEY = 'spagitty.glass.knobs';

	function initial(): Record<Knob['key'], number> {
		const base = {
			depth: DEFAULTS.depth,
			strength: DEFAULTS.strength,
			chromaticAberration: DEFAULTS.chromaticAberration,
			blur: DEFAULTS.blur,
			saturate: DEFAULTS.saturate,
			radius: 14
		};
		try {
			const raw = localStorage.getItem(STORE_KEY);
			if (raw) Object.assign(base, JSON.parse(raw));
		} catch {
			// Nothing stored, or unreadable. The defaults are fine.
		}
		return base;
	}

	let values = $state(initial());

	const material = $derived({
		depth: values.depth,
		strength: values.strength,
		chromaticAberration: values.chromaticAberration,
		blur: values.blur,
		saturate: values.saturate
	});

	/** Push the chosen numbers where the rest of the application reads them. */
	$effect(() => {
		Object.assign(DEFAULTS, material);
		document.documentElement.style.setProperty('--r-panel', `${values.radius}px`);
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify(values));
		} catch {
			// Not worth failing a drag over.
		}
	});

	/** What to paste back, so the numbers travel exactly as they were set. */
	const literal = $derived(
		[
			`depth: ${values.depth}`,
			`strength: ${values.strength}`,
			`chromaticAberration: ${values.chromaticAberration}`,
			`blur: ${values.blur}`,
			`saturate: ${values.saturate}`,
			`--r-panel: ${values.radius}px`
		].join(', ')
	);

	function reset() {
		values = {
			depth: 18,
			strength: 14,
			chromaticAberration: 2,
			blur: 28,
			saturate: 2,
			radius: 14
		};
	}
</script>

<section>
	<h2 class="heading">Glass — temporary tuning</h2>
	<p class="note">
		Not a feature. Drag until it looks right, then read the line at the bottom back to me and this
		whole section comes out.
	</p>

	<div class="knobs">
		{#each KNOBS as knob (knob.key)}
			<label class="knob">
				<span class="name">{knob.label}</span>
				<input
					type="range"
					min={knob.min}
					max={knob.max}
					step={knob.step}
					bind:value={values[knob.key]}
				/>
				<span class="mono value">{values[knob.key]}</span>
				<span class="note hint">{knob.hint}</span>
			</label>
		{/each}
	</div>

	<!--
		Something to look at while dragging. It sits over text on purpose: frost
		that is only ever shown over a flat panel tells you nothing about whether
		a menu will be readable over a commit list.
	-->
	<div class="stage">
		<div class="under">
			<p>
				feat(FEAT-007): Markdown preview, split view, and scroll sync — the backdrop is here so the
				frost has something to be frosted over, and the refraction has an edge to bend.
			</p>
			<p>
				fix(FEAT-006): three defects the first visual sweep found. Drag a slider and watch the rim,
				not the middle: the rim is where the glass is.
			</p>
			<p>feat(FEAT-005): application shell — window, state machine, settings, themes</p>
		</div>
		<div
			class="sample"
			style="border-radius: {values.radius}px"
			use:liquidGlass={material}
			aria-hidden="true"
		>
			<span class="mono">sample pane</span>
		</div>
	</div>

	<p class="mono literal">{literal}</p>
	<button class="reset" onclick={reset}>Back to the committed values</button>
</section>

<style>
	.heading {
		font-size: var(--fs-title);
		font-weight: 600;
		margin-bottom: 4px;
	}

	.knobs {
		display: grid;
		gap: 10px;
		margin: 14px 0;
		max-width: 640px;
	}

	.knob {
		display: grid;
		grid-template-columns: 150px 1fr 56px;
		align-items: center;
		gap: 10px;
	}

	.knob .name {
		font-size: var(--fs-secondary);
	}

	.knob .value {
		text-align: right;
	}

	.knob .hint {
		grid-column: 1 / -1;
		opacity: 0.7;
	}

	.knob input[type='range'] {
		width: 100%;
	}

	.stage {
		position: relative;
		height: 240px;
		margin: 16px 0;
		padding: 14px;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: var(--r-panel);
		max-width: 640px;
	}

	.under {
		font-size: var(--fs-secondary);
		line-height: 1.6;
		opacity: 0.9;
	}

	.sample {
		position: absolute;
		left: 90px;
		top: 60px;
		width: 260px;
		height: 130px;
		display: grid;
		place-items: center;
		background-color: var(--glass-thick);
		border: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
		box-shadow: var(--glass-rim-thick), var(--shadow-3);
	}

	.literal {
		font-size: var(--fs-mono);
		padding: 8px 10px;
		border-radius: var(--r-row);
		background: var(--hover);
		user-select: all;
	}

	.reset {
		margin-top: 10px;
		padding: 5px 10px;
		border: 1px solid var(--line);
		border-radius: var(--r-field);
		font-size: var(--fs-secondary);
	}
</style>

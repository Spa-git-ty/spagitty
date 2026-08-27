<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	/**
	 * TEMPORARY — a tuning harness for the glass as it is now, not a feature.
	 *
	 * The first set of knobs drove an SVG lens with six numbers in it. That lens
	 * was measured at 196ms a frame and retired (TASK-022), so there is less to
	 * turn and every one of these is free at runtime: they are all either a
	 * `backdrop-filter` the GPU applies, a colour, or a corner.
	 *
	 * Five knobs:
	 *
	 * - **blur** and **saturate** are `--blur-thick`, the frost itself.
	 * - **tint** is `--glass-thick`, how much of the surface colour the pane
	 *   carries over the frost. It is what stops text showing through where the
	 *   blur alone is not enough.
	 * - **corner** is `--r-panel`, worn by every surface, not just the glass.
	 * - **rim** brings back a fraction of `--glass-rim-thick`, the drawn
	 *   shoulder removed earlier today. It is here because the panes now carry
	 *   tint and cast shadow and nothing else, and against a dark region of the
	 *   commit list the edge may be gone. At 0 it is absent, which is what
	 *   shipped; anything above 0 mixes it back in.
	 *
	 * Everything is written straight onto the document, so every menu, dialog,
	 * palette, toast and command log follows a drag immediately. Open one over
	 * the commit list and drag with the other hand.
	 */
	interface Knob {
		key: 'blur' | 'saturate' | 'tint' | 'corner' | 'rim';
		label: string;
		hint: string;
		min: number;
		max: number;
		step: number;
	}

	const KNOBS: Knob[] = [
		{ key: 'blur', label: 'Blur', hint: 'The frost. GPU-applied, effectively free.', min: 0, max: 60, step: 1 },
		{
			key: 'saturate',
			label: 'Saturate',
			hint: '0 drains the colour behind the pane to grey; 1 keeps it as it is; above 1 pulls it forward.',
			min: 0,
			max: 3,
			step: 0.05
		},
		{
			key: 'tint',
			label: 'Tint',
			hint: 'How much surface colour the pane carries, as a percentage. Higher hides more of what is behind.',
			min: 0,
			max: 100,
			step: 1
		},
		{
			key: 'corner',
			label: 'Corner radius',
			hint: 'The --r-panel corner. Every panel, card and modal takes it, not only the glass.',
			min: 0,
			max: 32,
			step: 1
		},
		{
			key: 'rim',
			label: 'Rim (drawn edge)',
			hint: 'Brings back a fraction of the removed shoulder. 0 is what ships now — raise it only if a pane loses its edge over dark content.',
			min: 0,
			max: 100,
			step: 5
		}
	];

	const STORE_KEY = 'spagitty.glass.knobs.gpu';

	/** What is committed today, and what Reset returns to. */
	const SHIPPED: Record<Knob['key'], number> = {
		blur: 10,
		saturate: 0,
		tint: 86,
		corner: 8,
		rim: 0
	};

	function initial(): Record<Knob['key'], number> {
		const base = { ...SHIPPED };
		try {
			const raw = localStorage.getItem(STORE_KEY);
			if (raw) Object.assign(base, JSON.parse(raw));
		} catch {
			// Nothing stored, or unreadable. The shipped values are fine.
		}
		return base;
	}

	let values = $state(initial());

	/**
	 * The drawn shoulder, at a fraction of its full strength.
	 *
	 * The removed token's own layers, with every alpha multiplied by the knob —
	 * so 100 is exactly what used to ship and 0 emits nothing at all rather
	 * than a stack of fully transparent shadows.
	 */
	function rimShadow(percent: number): string {
		if (percent <= 0) return 'none';
		const f = percent / 100;
		const w = (pct: number) => `color-mix(in srgb, #fff ${(pct * f).toFixed(1)}%, transparent)`;
		return [
			`inset 0 1px 0 ${w(24)}`,
			`inset 0 0 0 1px ${w(6)}`,
			`inset 0 10px 18px -12px ${w(16)}`,
			`inset 7px 0 16px -14px ${w(12)}`,
			`inset -7px 0 16px -14px ${w(7)}`
		].join(', ');
	}

	$effect(() => {
		const root = document.documentElement;
		root.style.setProperty('--blur-thick', `blur(${values.blur}px) saturate(${values.saturate})`);
		root.style.setProperty(
			'--glass-thick',
			`color-mix(in srgb, var(--surface-2) ${values.tint}%, transparent)`
		);
		root.style.setProperty('--r-panel', `${values.corner}px`);
		root.style.setProperty('--glass-rim-thick', rimShadow(values.rim));
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify(values));
		} catch {
			// Not worth failing a drag over.
		}
	});

	/** What to read back, so the numbers travel exactly as they were set. */
	const literal = $derived(
		[
			`--blur-thick: blur(${values.blur}px) saturate(${values.saturate})`,
			`--glass-thick: ${values.tint}% of surface-2`,
			`--r-panel: ${values.corner}px`,
			`rim: ${values.rim}%`
		].join('  |  ')
	);

	function reset() {
		values = { ...SHIPPED };
	}
</script>

<section>
	<h2 class="heading">Glass — temporary tuning</h2>
	<p class="note">
		Not a feature. Open a menu over the commit list and drag with the other hand — every pane in the
		application follows immediately. When it looks right, read the line at the bottom back to me and
		this section comes out.
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
		Somewhere to judge it without opening a menu, over text rather than over
		a flat panel — frost judged against a blank surface tells you nothing
		about whether a real menu stays readable over a commit list. It wears the
		same tokens the real panes do.
	-->
	<div class="stage">
		<div class="under">
			<p>
				feat(FEAT-007): Markdown preview, split view, and scroll sync — the backdrop is here so the
				frost has something to be frosted over, and the edge has something to be lost against.
			</p>
			<p>
				fix(FEAT-006): three defects the first visual sweep found. Watch the edge of the pane against
				the dark gaps between these lines: that is where a pane with no rim disappears.
			</p>
			<p>feat(FEAT-005): application shell — window, state machine, settings, themes</p>
			<p>feat(FEAT-004): document model — edit journal, file kinds, encoding-preserving IO</p>
		</div>
		<div class="sample" aria-hidden="true"><span class="mono">sample pane</span></div>
	</div>

	<p class="mono literal">{literal}</p>
	<button class="reset" onclick={reset}>Back to what ships today</button>
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
		height: 260px;
		margin: 16px 0;
		padding: 14px;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: var(--r-panel);
		max-width: 640px;
	}

	.under {
		font-size: var(--fs-secondary);
		line-height: 1.7;
		opacity: 0.9;
	}

	/* Exactly what a menu wears, so the sample is not a flattering lie. */
	.sample {
		position: absolute;
		left: 90px;
		top: 60px;
		width: 280px;
		height: 140px;
		display: grid;
		place-items: center;
		border-radius: var(--r-panel);
		background-color: var(--glass-thick);
		backdrop-filter: var(--blur-thick);
		-webkit-backdrop-filter: var(--blur-thick);
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

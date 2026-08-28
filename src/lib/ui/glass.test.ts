// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The thick glass material, guarded at the source.
 *
 * TASK-024: the author reported that a floating pane "still looks just
 * transparent". Three things had made it so, and each of them is asserted here
 * because each is one edit away from coming back:
 *
 * 1. `saturate(0)` drained the backdrop to grey, so what showed through the
 *    pane carried none of the colour that makes a blur read as a material.
 * 2. The tint covered 82% of the backdrop, leaving the frost almost nothing to
 *    be made of.
 * 3. TASK-023 switched off `--glass-rim` and `--glass-sheen` when it flattened
 *    the interface, and nothing replaced them, so a pane had no edge at all.
 *
 * And one thing that must *not* come back: TASK-022 measured the blur radius
 * at 10px costing 16.0ms a frame against the 196ms of the lens it replaced.
 * Widening it is the way this material becomes expensive again, so the radius
 * is pinned rather than merely commented.
 *
 * These assertions read the stylesheets rather than a rendered pane, for the
 * reason `btn.test.ts` gives: the test environment mounts components without
 * applying any CSS, so `getComputedStyle` here would pass whatever the rules
 * say.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/app.css', 'utf8');

/** The value of a custom property declared on a `:root` rule. */
function token(name: string, scope = ':root {'): string {
	const from = css.indexOf(scope);
	if (from === -1) throw new Error(`no ${scope} rule`);
	const at = css.indexOf(`${name}:`, from);
	if (at === -1) throw new Error(`no ${name} under ${scope}`);
	return css.slice(at + name.length + 1, css.indexOf(';', at)).trim();
}

/** Every `.svelte` file under a directory, recursively. */
function componentsUnder(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return componentsUnder(path);
		return entry.name.endsWith('.svelte') ? [path] : [];
	});
}

/** Every component that paints itself with the thick glass material. */
function thickGlassPanes(): { path: string; source: string }[] {
	return [...componentsUnder('src/lib'), ...componentsUnder('src/routes')]
		.map((path) => ({ path, source: readFileSync(path, 'utf8') }))
		.filter(({ source }) => source.includes('var(--blur-thick)'));
}

describe('the thick glass material', () => {
	it('does not drain the colour out of what is behind it', () => {
		// saturate(0) is the whole of failure 1: a grey backdrop under a tint
		// is indistinguishable from a flat translucent rectangle.
		expect(token('--blur-thick')).not.toMatch(/saturate\(\s*0\s*\)/);
	});

	it('pulls the colour behind it forward rather than leaving it as it is', () => {
		const saturation = token('--blur-thick').match(/saturate\((\d+)%\)/);
		expect(saturation, '--blur-thick declares no saturation').not.toBeNull();
		expect(Number(saturation![1])).toBeGreaterThan(100);
	});

	it('keeps the blur radius TASK-022 measured', () => {
		// 10px cost 16.0ms a frame — no measurable cost at all. This is the
		// number that made the material affordable, and it is not a style
		// choice: widening it is how the window went to 5fps the first time.
		expect(token('--blur-thick')).toContain('blur(10px)');
	});

	it('leaves enough of the backdrop visible to be frosted', () => {
		for (const scope of [':root {', ":root[data-theme='dark'] {"]) {
			const tint = token('--glass-thick', scope).match(/(\d+)%/);
			expect(tint, `--glass-thick has no percentage under ${scope}`).not.toBeNull();
			expect(Number(tint![1]), `--glass-thick hides the backdrop under ${scope}`).toBeLessThan(
				80
			);
		}
	});

	it('gives every floating pane an edge', () => {
		const panes = thickGlassPanes();
		// If this drops to nothing the rest of the suite is asserting over an
		// empty list, which is the failure mode a scan like this has.
		expect(panes.length).toBeGreaterThanOrEqual(5);

		for (const { path, source } of panes) {
			expect(source, `${path} floats with no edge to catch the light`).toMatch(
				/border(-top)?:[^;]*var\(--glass-edge/
			);
		}
	});

	it('draws that edge as a border rather than as the shadow TASK-023 removed', () => {
		// The author asked for a flat interface with no shadows. The edge is
		// what gives a pane thickness; a rim shadow is what was taken away.
		// Both rim tokens stay off, in both themes.
		expect([...css.matchAll(/--glass-(rim|rim-thick|sheen):\s*([^;]+);/g)].length).toBe(6);
		for (const [, , value] of css.matchAll(/--glass-(rim|rim-thick|sheen):\s*([^;]+);/g)) {
			expect(value.trim()).toBe('none');
		}
	});
});

describe('the stylesheet itself', () => {
	it('is brace-balanced', () => {
		// A stray `}` shipped in FEAT-056 and sat in the file until TASK-024.
		// Browsers recover from one, which is exactly why nothing caught it.
		let depth = 0;
		let line = 0;
		for (const text of css.split('\n')) {
			line += 1;
			for (const character of text) {
				if (character === '{') depth += 1;
				if (character === '}') depth -= 1;
				expect(depth, `unbalanced closing brace at src/app.css:${line}`).toBeGreaterThanOrEqual(
					0
				);
			}
		}
		expect(depth, 'src/app.css has an unclosed rule').toBe(0);
	});
});

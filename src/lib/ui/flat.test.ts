// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The interface is flat, and stays flat (TASK-026).
 *
 * The author has now asked for this twice — "ok also remove shadows !" for
 * TASK-023, and "remove all shadows i want it all flat dont bring back
 * shadows" for this one. The second time was necessary because TASK-023 could
 * only reach what was written as a token: it set `--shadow-1/2/3` and `--sheen`
 * to `none` on the light `:root` and left the dark theme's own values in place,
 * and a dozen components had their shadows written out literally where no token
 * change could reach them.
 *
 * So this is asserted rather than intended. It reads the stylesheets, for the
 * reason `btn.test.ts` gives: the test environment mounts components without
 * applying any CSS, so `getComputedStyle` would pass whatever the rules say.
 *
 * **The rule is the blur radius, not the property.** A shadow is a soft edge:
 * every one removed here had a blur of 3px or more. What is left using
 * `box-shadow` has a blur of exactly zero and is a *line* — a focus ring, a
 * hairline around an avatar, the accent bar down a selected row, the rules
 * either side of the graph's lane band. Those are borders drawn with the one
 * property that does not change an element's size, and taking them away would
 * delete structure rather than decoration.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every stylesheet and every component that carries one. */
function stylesheets(): { path: string; source: string }[] {
	function under(dir: string): string[] {
		return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) return under(path);
			return entry.name.endsWith('.svelte') ? [path] : [];
		});
	}

	return ['src/app.css', ...under('src/lib'), ...under('src/routes')].map((path) => ({
		path,
		source: readFileSync(path, 'utf8')
	}));
}

/** Every `box-shadow` value in a source file, with the line it starts on. */
function shadowValues(source: string): { value: string; line: number }[] {
	const found: { value: string; line: number }[] = [];
	const pattern = /box-shadow\s*:\s*([^;{}]+);/g;

	for (const match of source.matchAll(pattern)) {
		const line = source.slice(0, match.index).split('\n').length;
		found.push({ value: match[1].trim(), line });
	}
	return found;
}

/**
 * The blur radius of each layer of one `box-shadow` value, in pixels.
 *
 * A layer is `[inset] <offset-x> <offset-y> [<blur>] [<spread>] [<color>]`, so
 * the blur is the third length. Function calls are removed first — a
 * `color-mix(… 8%, …)` carries numbers that are not lengths, and splitting on
 * the commas inside one would tear a layer in half.
 */
function blurRadii(value: string): number[] {
	const withoutFunctions = value.replace(/[a-z-]+\([^()]*(\([^()]*\))?[^()]*\)/gi, 'COLOR');

	return withoutFunctions.split(',').flatMap((layer) => {
		const lengths = layer
			.trim()
			.split(/\s+/)
			.filter((token) => /^-?[\d.]+(px|em|rem)?$/.test(token));

		// Fewer than three lengths means no blur was given, which is a blur of
		// zero. `none`, and a layer that is only a `var()`, land here too.
		if (lengths.length < 3) return [];
		return [Math.abs(parseFloat(lengths[2]))];
	});
}

describe('the interface is flat', () => {
	it('has no box-shadow anywhere with a blur radius', () => {
		const soft: string[] = [];

		for (const { path, source } of stylesheets()) {
			for (const { value, line } of shadowValues(source)) {
				for (const blur of blurRadii(value)) {
					if (blur > 0) soft.push(`${path}:${line} — blur ${blur}px in "${value}"`);
				}
			}
		}

		expect(soft, `a soft shadow is back:\n${soft.join('\n')}`).toEqual([]);
	});

	it('keeps every shadow token switched off, in both themes', () => {
		// TASK-023 set these on the light `:root` only, which is how the dark
		// theme kept casting for two more tasks. Every declaration of each, in
		// every block, has to be `none` — not just the first one found.
		const css = readFileSync('src/app.css', 'utf8');
		const declarations = [
			...css.matchAll(/--(shadow-[123]|sheen|glass-rim|glass-rim-thick|glass-sheen)\s*:\s*([^;]+);/g)
		];

		// Both themes declare all seven; anything fewer means a block was missed
		// and this test is passing over an incomplete set.
		expect(declarations.length).toBeGreaterThanOrEqual(12);

		for (const [, name, value] of declarations) {
			expect(value.trim(), `--${name} is not none`).toBe('none');
		}
	});

	it('still draws the lines that are not shadows', () => {
		// The other half of the rule. A flat interface is not a structureless
		// one, and these four are borders drawn with `box-shadow` because a real
		// border would change the element's size.
		const css = readFileSync('src/app.css', 'utf8');
		const rows = readFileSync('src/lib/graph/CommitRows.svelte', 'utf8');

		// The focus ring. Removing this is an accessibility regression, not a
		// flattening.
		expect(css).toMatch(/box-shadow:\s*0 0 0 \d+px var\(--ring\)/);
		// The rules either side of the graph's lane band.
		expect(rows).toContain('inset 1px 0 0 var(--graph-line)');
		// The row the detail panel is showing.
		expect(rows).toContain('inset 2px 0 0 var(--accent)');
	});
});

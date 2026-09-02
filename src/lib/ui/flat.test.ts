// SPDX-License-Identifier: GPL-3.0-or-later

/** The regression contract for restrained spatial depth and selective glass. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/app.css', 'utf8');

function componentsUnder(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return componentsUnder(path);
		return entry.name.endsWith('.svelte') ? [path] : [];
	});
}

/**
 * Every `var(--token)` a component reads is a token that exists.
 *
 * FEAT-068's External Tools section was written against `--fg`, `--dim` and
 * `--bg-2`. None of them is defined anywhere, so each one fell through to a
 * hard-coded fallback — `#eee`, `#888`, `#141416` — and the section rendered a
 * fixed dark palette regardless of the theme. On a light theme it was pale text
 * on pale cards. Nothing failed, nothing warned, and it shipped.
 *
 * The failure is invisible by construction: `var(--nope, #eee)` is valid CSS
 * that works. Only a check like this one can see it.
 *
 * `KNOWN` is a shrinking list, not a permanent exemption. Every entry is a
 * component that still does this and is recorded rather than hidden; adding a
 * *new* one fails, and fixing an old one fails too until its row is deleted, so
 * the list cannot quietly grow or go stale.
 */
describe('the tokens components read', () => {
	/**
	 * Every token that exists: the stylesheet's, plus the ones published from
	 * JavaScript.
	 *
	 * `metrics.ts` and `panels.svelte.ts` set the structural sizes on `:root` at
	 * runtime — `--rail-w`, `--row-pitch`, `--detail-w` and the rest — which is
	 * the arrangement `docs/architecture.md` describes and is entirely correct.
	 * They are read from those two files rather than listed here, so a metric
	 * renamed on one side does not need remembering on the other.
	 */
	const published = ['src/lib/metrics.ts', 'src/lib/panels.svelte.ts', 'src/lib/scale.svelte.ts']
		.map((path) => readFileSync(path, 'utf8'))
		.flatMap((text) => [
			// `'--row-pitch'`, and `variable: 'rail-w'`.
			...[...text.matchAll(/'--([a-z0-9-]+)'/g)].map((match) => match[1]),
			...[...text.matchAll(/variable:\s*'([a-z0-9-]+)'/g)].map((match) => match[1]),
			// The `px` map, whose keys are token names without the `--`.
			...[...text.matchAll(/^\t\t'([a-z0-9-]+)':\s*[A-Z_]/gm)].map((match) => match[1])
		]);

	const defined = new Set([
		...[...css.matchAll(/--([a-z0-9-]+)\s*:/g)].map((match) => match[1]),
		...published
	]);

	/**
	 * Components that still read tokens that do not exist.
	 *
	 * All of them arrived with FEAT-063, FEAT-067, FEAT-069, FEAT-070 and
	 * FEAT-071, which is the same run of work that is holding the coverage floor
	 * down. They are a theming pass of their own, not a passenger to whatever
	 * change comes next.
	 */
	const KNOWN = [
		'src/lib/chrome/StatusStrip.svelte',
		'src/lib/diff/BinaryDiff.svelte',
		'src/lib/diff/ImageDiff.svelte',
		'src/lib/history/FileHistoryView.svelte',
		'src/lib/requests/CreatePRModal.svelte',
		'src/lib/requests/PRWorkspace.svelte',
		'src/lib/settings/ProfilesSection.svelte',
		'src/lib/submodules/SubmodulesModal.svelte',
		'src/lib/worktrees/AddWorktreeModal.svelte',
		'src/lib/worktrees/WorktreesModal.svelte',
		'src/routes/history/+page.svelte'
	];

	/** The tokens a file reads that nothing defines — its own included. */
	function undefinedTokens(path: string): string[] {
		const text = readFileSync(path, 'utf8');
		// A component may declare its own custom properties, and several set one
		// from JavaScript. Those are defined, just not in `app.css`.
		const own = new Set([...text.matchAll(/--([a-z0-9-]+)\s*:/g)].map((match) => match[1]));

		return [
			...new Set(
				[...text.matchAll(/var\(\s*--([a-z0-9-]+)/g)]
					.map((match) => match[1])
					.filter((name) => !defined.has(name) && !own.has(name))
			)
		];
	}

	const components = [...componentsUnder('src/lib'), ...componentsUnder('src/routes')].map(
		(path) => path.split('\\').join('/')
	);

	it('is true of every component but the ones already recorded', () => {
		const offenders = components.filter((path) => undefinedTokens(path).length > 0);

		expect(
			offenders.filter((path) => !KNOWN.includes(path)),
			'these read a token nothing defines, so they render a hard-coded fallback and ignore the theme'
		).toEqual([]);
	});

	it('keeps no stale row in the recorded list', () => {
		// A file that has been fixed must lose its row, or the list stops being
		// a debt and becomes a place things hide.
		const fixed = KNOWN.filter((path) => undefinedTokens(path).length === 0);

		expect(fixed, 'these are themed correctly now; delete their rows').toEqual([]);
	});

	it('and the section that was reported is one of the fixed ones', () => {
		expect(undefinedTokens('src/lib/settings/ExternalToolsSection.svelte')).toEqual([]);
	});
});

/**
 * The controls that would otherwise be the platform's.
 *
 * A `<select>` ignores `background` and paints the desktop's own widget unless
 * `appearance: none` says not to — which on a dark theme means a white field in
 * a dark window. It was true of all five selects in the application and had
 * been since the first one was written, because the stylesheet's field rules
 * looked as though they covered it.
 */
describe('native widgets are taken over rather than trusted', () => {
	it('stops a select drawing itself', () => {
		expect(css).toMatch(/select\s*{[^}]*appearance:\s*none/s);
		expect(css, 'WebKit needs the prefix too').toMatch(
			/select\s*{[^}]*-webkit-appearance:\s*none/s
		);
	});

	it('draws the arrow in a colour that follows the theme', () => {
		// An inlined SVG chevron cannot read a custom property, so it would be
		// one hard-coded colour in every theme — the exact defect this replaced.
		expect(css).toMatch(/select\s*{[^}]*background-image:[^;]*currentcolor/s);
		expect(css).not.toMatch(/select\s*{[^}]*data:image\/svg/s);
	});

	it('never resets the field background with the shorthand', () => {
		// `background:` would wipe the chevron out on hover and on focus.
		// Anchored at the start of a line, so `::selection` — which merely
		// contains the word "select" — is not mistaken for a field rule.
		const fields = css.match(/^(?:input|select|textarea)[^{]*{[^}]*}/gms) ?? [];
		const shorthand = fields.filter((rule) => /\n\s*background:\s/.test(rule));

		expect(shorthand, 'use background-color, or the select loses its arrow').toEqual([]);
	});

	it('gives the checkbox and the radio the theme accent', () => {
		expect(css).toMatch(/input\[type='checkbox'\][\s\S]*?accent-color:\s*var\(--accent\)/);
	});
});

describe('the soft spatial interface', () => {
	it('keeps ordinary cards opaque', () => {
		expect(css).toMatch(/\.card\s*{[^}]*background-color:\s*var\(--surface\)/s);
		expect(css).not.toMatch(/\.card\s*{[^}]*backdrop-filter/s);
	});

	it('gives floating layers their own geometry and restrained depth', () => {
		expect(css).toContain('--r-floating: 18px');
		expect(css).toMatch(/--shadow-3:\s*[\s\S]*?30px/);
		expect(css).toMatch(/\.floating\s*{[^}]*border-radius:\s*var\(--r-floating\)/s);
	});

	it('uses backdrop blur only on a bounded set of transient components', () => {
		const blurred = [...componentsUnder('src/lib'), ...componentsUnder('src/routes')].filter(
			(path) => readFileSync(path, 'utf8').includes('backdrop-filter: var(--blur-thick)')
		);

		expect(blurred.length).toBeGreaterThanOrEqual(5);
		expect(blurred.length).toBeLessThanOrEqual(12);
		for (const path of blurred) expect(path).not.toMatch(/(CommitRows|DiffPane|FileList|NavRail)/);
	});

	it('removes motion when the platform requests it', () => {
		expect(css).toMatch(
			/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration:\s*0\.01ms !important/
		);
	});
});

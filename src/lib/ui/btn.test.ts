// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The primary button's fill, guarded at the source.
 *
 * BUG-002: the Commit button's label was `--on-accent` white on the page
 * background, because a *scoped* `.btn { background: transparent }` in this
 * component outranked the *global* `.glow` rule that paints the accent fill.
 * Specificity, not colour — both tokens were correct the whole time.
 *
 * These assertions read the stylesheets rather than a rendered button, and that
 * is deliberate: the test environment mounts components without applying any
 * CSS, so a `getComputedStyle` check here would pass no matter what the rules
 * say. What can be checked honestly is the rule that caused it — that nothing
 * in this component sets a background on a selector which also matches `.glow`.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { flushSync, render, textSnippet } from '../../testing/mount';
import Btn from './Btn.svelte';

const component = readFileSync('src/lib/ui/Btn.svelte', 'utf8');
const globals = readFileSync('src/app.css', 'utf8');

/** The declarations inside one selector's block, as written. */
function block(css: string, selector: string): string {
	const at = css.indexOf(`${selector} {`);
	if (at === -1) throw new Error(`no rule for ${selector}`);
	return css.slice(at, css.indexOf('}', at));
}

describe("the primary button's fill", () => {
	it('never sets a background on a selector that also matches the glow', () => {
		// Every `background` declaration in the component, with the selector it
		// belongs to. A bare `.btn` here is the bug coming back.
		const rules = [...component.matchAll(/([^{}]+)\{([^}]*background[^}]*)\}/g)].map(
			(match) => match[1].trim()
		);

		for (const selector of rules) {
			const matchesEveryButton = /(^|\s)\.btn\s*\{?$|^\.btn$/.test(selector);
			expect(
				matchesEveryButton,
				`${selector} sets a background on every button, including .glow`
			).toBe(false);
		}
	});

	it('excludes the glow from the secondary fill', () => {
		// A secondary button is a raised surface rather than an outline, so it
		// *does* carry a fill — and the fill has to stay off any selector the
		// glow also matches, which is the whole of BUG-002. The exclusion is the
		// invariant here; which colour it fills with is a design decision.
		expect(component).toContain('.btn:not(.glow)');
		// `background-color`, not `background`: a secondary button is glass, and
		// the shorthand would wipe the sheen layer painted with it.
		expect(block(component, '.btn:not(.glow)')).toContain('background-color:');
	});

	it('leaves the accent fill to the glow rule in app.css', () => {
		// The global rule is what paints it as a flat accent fill.
		const glow = block(globals, '.glow');
		expect(glow).toContain('var(--accent)');
	});

	it('still fills a glow button that cannot animate', () => {
		// prefers-reduced-motion and :disabled both drop the animation. Neither
		// may drop the fill — that is the same failure wearing a different hat.
		expect(block(globals, '.glow:disabled')).toContain('var(--accent)');
		expect(globals).toContain('prefers-reduced-motion');
	});

	it('marks a primary button as glowing unless it is asked not to', () => {
		const loud = render(Btn, { primary: true, children: textSnippet('Commit') });
		flushSync();
		const button = loud.get('button');

		expect(button.classList.contains('primary')).toBe(true);
		expect(button.classList.contains('glow')).toBe(true);
		loud.destroy();

		const quiet = render(Btn, { primary: true, quiet: true, children: textSnippet('Delete') });
		flushSync();

		expect(quiet.get('button').classList.contains('glow')).toBe(false);
		quiet.destroy();
	});
});

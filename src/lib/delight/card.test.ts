// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The share card and the markdown (FEAT-072).
 *
 * Both of these leave the application — into a pull request, a chat window, a
 * profile README — which makes two things worth holding: the card has to line
 * up when it is pasted somewhere monospaced, and neither of them may carry a
 * shame badge out of the repository it was earned in.
 */

import { describe, expect, it } from 'vitest';
import { badge } from './badges';
import { card, displayWidth, markdown, titleLine } from './card';
import { emptyRecord, type ActorRecord } from './engine';

function held(...badges: string[]): ActorRecord {
	return {
		...emptyRecord({ id: 'ada@example.com', kind: 'human', name: 'Ada' }),
		earned: badges.map((id) => ({ id, at: 0 }))
	};
}

describe('the card', () => {
	const drawn = card(badge('git-sensei')!, 'Ada');
	const lines = drawn.split('\n');

	it('is a closed box', () => {
		expect(lines[0].startsWith('╭')).toBe(true);
		expect(lines.at(-1)?.startsWith('╰')).toBe(true);
		for (const line of lines.slice(1, -1)) {
			expect(line.startsWith('│'), line).toBe(true);
			expect(line.endsWith('│'), line).toBe(true);
		}
	});

	it('is the same width all the way down', () => {
		// The reason the emoji width is counted at all: a card whose middle
		// line is one column wider looks broken in the terminal somebody
		// pasted it into.
		const widths = new Set(lines.map(displayWidth));
		expect(widths.size, drawn).toBe(1);
	});

	it('says the badge, the line and who earned it', () => {
		expect(drawn).toContain('GIT SENSEI');
		expect(drawn).toContain('EPIC BADGE');
		expect(drawn).toContain('Ada');
		expect(drawn).toContain('SPAGITTY');
	});

	it('wraps a line too long for the box rather than widening it', () => {
		const long = card(badge('perfect-handoff')!, 'Ada');
		const widths = new Set(long.split('\n').map(displayWidth));

		expect(widths.size, long).toBe(1);
	});
});

describe('the markdown', () => {
	it('lists what was earned, best first', () => {
		const text = markdown(held('cook', 'git-lord', 'surgical-strike'));

		expect(text.indexOf('Git Lord')).toBeLessThan(text.indexOf('Surgical Strike'));
		expect(text.indexOf('Surgical Strike')).toBeLessThan(text.indexOf('Cook'));
	});

	it('leaves the Hall of Shame at home', () => {
		// The joke is between a developer and their own repository. Pasting one
		// of these into a public profile turns it into something said *about*
		// somebody, where they cannot take it back.
		const text = markdown(held('cook', 'main-character', 'force-push-and-pray'));

		expect(text).toContain('Cook');
		expect(text).not.toContain('Main Character');
		expect(text).not.toContain('Force Push');
	});

	it('says so plainly when there is nothing yet', () => {
		expect(markdown(held())).toContain('No badges yet');
	});

	it('ignores a badge id this build does not know', () => {
		expect(() => markdown(held('from-the-future'))).not.toThrow();
	});
});

describe('the title line', () => {
	it('is empty when nothing is equipped', () => {
		expect(titleLine(held('cook'))).toBe('');
	});

	it('is the glyph and the name when something is', () => {
		expect(titleLine({ ...held('cook'), title: 'cook' })).toBe('🥄 Cook');
	});
});

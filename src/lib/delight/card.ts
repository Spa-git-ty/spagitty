// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Achievement cards, and the markdown that leaves the application (FEAT-072).
 *
 * Text, on purpose. A share card that is an image needs a canvas, a font that
 * renders the same on three platforms, and a file the user then has to find —
 * whereas a box drawn in box-drawing characters pastes into a pull request, a
 * chat window, a commit message and a terminal, and looks the same in all four.
 *
 * The markdown block is the other half: badges are only worth anything outside
 * Spagitty if they can be put somewhere outside Spagitty, and a README table is
 * where developers already keep this kind of thing.
 *
 * Nothing here reaches a network. It builds strings; copying them somewhere is
 * the user's decision, made with their own clipboard.
 */

import { badge, weight, type Badge } from './badges';
import type { ActorRecord } from './engine';

/** The inside width of the card, in characters. */
const WIDTH = 31;

/**
 * Code points that a terminal draws two columns wide.
 *
 * A pragmatic set rather than the whole East Asian Width table: this file's job
 * is to line up a card made of this catalogue's glyphs, and the ranges below
 * are the emoji blocks those glyphs come from. Box-drawing characters are
 * deliberately *not* here — they are U+2500 and up, they are one column wide,
 * and treating them as wide was what made the first version of this card claim
 * its own border was the wrong size.
 */
function isWide(code: number): boolean {
	return (
		code >= 0x1f000 ||
		(code >= 0x2600 && code <= 0x27bf) ||
		(code >= 0x2b00 && code <= 0x2bff) ||
		(code >= 0x23e9 && code <= 0x23fa) ||
		code === 0x231a ||
		code === 0x231b
	);
}

/**
 * How many columns `text` occupies when it is pasted somewhere monospaced.
 *
 * Counted per grapheme, not per code point, because an emoji is one column-pair
 * however many code points it is made of — `👨‍🍳` is three (two glyphs and a
 * zero-width joiner) and draws as two columns, and counting its parts would
 * push the card's border out by two.
 *
 * Exported because it is also the only honest way to assert that the card is a
 * rectangle: counting code points would call a correct card wrong.
 */
export function displayWidth(text: string): number {
	let width = 0;
	for (const cluster of graphemes(text)) {
		const code = cluster.codePointAt(0) ?? 0;
		width += isWide(code) ? 2 : 1;
	}
	return width;
}

/** Grapheme clusters, falling back to code points where `Intl.Segmenter` is absent. */
function graphemes(text: string): string[] {
	const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
	if (!Segmenter) return [...text];
	return [...new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(
		(part) => part.segment
	);
}

function centre(text: string): string {
	const room = Math.max(0, WIDTH - displayWidth(text));
	const left = Math.floor(room / 2);
	return `│${' '.repeat(left)}${text}${' '.repeat(room - left)}│`;
}

function blank(): string {
	return `│${' '.repeat(WIDTH)}│`;
}

/** Break a sentence into centred lines that fit the card. */
function wrap(text: string): string[] {
	const lines: string[] = [];
	let line = '';
	for (const word of text.split(/\s+/)) {
		const candidate = line ? `${line} ${word}` : word;
		if (displayWidth(candidate) > WIDTH - 4 && line) {
			lines.push(line);
			line = word;
		} else {
			line = candidate;
		}
	}
	if (line) lines.push(line);
	return lines.map(centre);
}

/**
 * One badge as a card.
 *
 * ```
 * ╭───────────────────────────────╮
 * │                               │
 * │              🥋               │
 * │                               │
 * │          GIT SENSEI           │
 * ...
 * ```
 */
export function card(found: Badge, who: string): string {
	const top = `╭${'─'.repeat(WIDTH)}╮`;
	const bottom = `╰${'─'.repeat(WIDTH)}╯`;

	return [
		top,
		blank(),
		centre(found.emoji),
		blank(),
		centre(found.name.toUpperCase()),
		blank(),
		...wrap(found.line),
		blank(),
		centre(`${found.rarity.toUpperCase()} BADGE`),
		blank(),
		centre(who),
		centre('🍝 SPAGITTY'),
		blank(),
		bottom
	].join('\n');
}

/**
 * An actor's whole record as a markdown block, for a profile or a README.
 *
 * Shame badges are left out. They are a joke between the developer and their
 * own repository, and putting one in something somebody pastes into a public
 * profile turns a joke into a thing said about them where they cannot take it
 * back.
 */
export function markdown(record: ActorRecord): string {
	const badges = record.earned
		.map((entry) => badge(entry.id))
		.filter((found): found is Badge => found !== null && !found.shame)
		.sort((a, b) => weight(b.rarity) - weight(a.rarity));

	const lines = [`## Spagitty achievements — ${record.name}`, ''];

	if (badges.length === 0) {
		lines.push('_No badges yet._');
		return lines.join('\n');
	}

	for (const found of badges) {
		lines.push(`- ${found.emoji} **${found.name}** — ${found.line}`);
	}

	lines.push('', `<sub>Earned in one repository, with 🍝 Spagitty.</sub>`);
	return lines.join('\n');
}

/** The line a title puts beside a name. Empty when nothing is equipped. */
export function titleLine(record: ActorRecord): string {
	if (!record.title) return '';
	const found = badge(record.title);
	return found ? `${found.emoji} ${found.name}` : '';
}

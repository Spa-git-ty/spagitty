// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';

import { avatarColor, initials } from './avatar';
import { LANE_COLOR_COUNT } from '../metrics';

describe('initials', () => {
	it('takes the first and last word', () => {
		expect(initials('Ada Lovelace')).toBe('AL');
		expect(initials('Ada Byron King Lovelace')).toBe('AL');
	});

	it('gives one letter for a single word rather than inventing a second', () => {
		expect(initials('Ada')).toBe('A');
	});

	it('splits on the separators names actually use', () => {
		expect(initials('ada.lovelace')).toBe('AL');
		expect(initials('ada_lovelace')).toBe('AL');
		expect(initials('ada-lovelace')).toBe('AL');
	});

	it('uses the local part of a bare email address', () => {
		expect(initials('ada.lovelace@example.com')).toBe('AL');
	});

	it('keeps a real name that happens to carry an address', () => {
		expect(initials('Ada Lovelace <ada@example.com>')).toBe('AL');
	});

	it('falls back rather than throwing on a name with no letters', () => {
		expect(initials('')).toBe('?');
		expect(initials('   ')).toBe('?');
		expect(initials('!!!')).toBe('?');
	});

	it('handles names outside the Latin alphabet', () => {
		expect(initials('محمود عارف')).toBe('مع');
		expect(initials('Ada 李')).toBe('A李');
	});
});

describe('avatarColor', () => {
	it('is stable for the same name', () => {
		expect(avatarColor('Ada Lovelace')).toBe(avatarColor('Ada Lovelace'));
	});

	it('ignores case and surrounding space, since git does not normalise them', () => {
		expect(avatarColor('  ADA LOVELACE ')).toBe(avatarColor('ada lovelace'));
	});

	it('only ever names a lane colour the theme defines', () => {
		const allowed = new Set(
			Array.from({ length: LANE_COLOR_COUNT }, (_, i) => `var(--lane-${i + 1})`)
		);
		for (const name of ['Ada', 'Grace Hopper', 'x', 'محمود عارف', 'a@b.c']) {
			expect(allowed.has(avatarColor(name))).toBe(true);
		}
	});

	it('spreads names that differ only at the end across buckets', () => {
		const colors = new Set(
			['Ada A', 'Ada B', 'Ada C', 'Ada D', 'Ada E', 'Ada F', 'Ada G'].map(avatarColor)
		);
		// Not a guarantee of uniqueness — that is impossible with five colours —
		// but a hash that returned one bucket for near-identical names would
		// defeat the point of the avatar.
		expect(colors.size).toBeGreaterThan(1);
	});
});

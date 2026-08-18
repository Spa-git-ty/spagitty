// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { clockTime, fullDate, isNotable, relativeTime, statusGlyph } from './format';

/** `relativeTime` takes `now` in milliseconds, so tests can pin it. */
const NOW = 1_700_000_000_000;
const nowSeconds = NOW / 1000;

/** A time `seconds` in the past. */
function ago(seconds: number): number {
	return nowSeconds - seconds;
}

describe('relativeTime', () => {
	it('calls anything under 45 seconds "now"', () => {
		expect(relativeTime(ago(0), NOW)).toBe('now');
		expect(relativeTime(ago(44), NOW)).toBe('now');
	});

	it('switches to "a minute ago" at 45 seconds, not at 60', () => {
		expect(relativeTime(ago(45), NOW)).toBe('a minute ago');
		expect(relativeTime(ago(89), NOW)).toBe('a minute ago');
	});

	it('counts minutes up to an hour', () => {
		expect(relativeTime(ago(90), NOW)).toBe('2 minutes ago');
		expect(relativeTime(ago(59 * 60), NOW)).toBe('59 minutes ago');
	});

	it('says "1 hour ago" rather than "1 hours ago"', () => {
		expect(relativeTime(ago(3600), NOW)).toBe('1 hour ago');
		expect(relativeTime(ago(2 * 3600), NOW)).toBe('2 hours ago');
	});

	it('says "yesterday" for one day', () => {
		expect(relativeTime(ago(24 * 3600), NOW)).toBe('yesterday');
		expect(relativeTime(ago(3 * 24 * 3600), NOW)).toBe('3 days ago');
	});

	it('singularises months and years', () => {
		expect(relativeTime(ago(30 * 24 * 3600), NOW)).toBe('1 month ago');
		expect(relativeTime(ago(90 * 24 * 3600), NOW)).toBe('3 months ago');
		expect(relativeTime(ago(365 * 24 * 3600), NOW)).toBe('1 year ago');
		expect(relativeTime(ago(3 * 365 * 24 * 3600), NOW)).toBe('3 years ago');
	});

	it('does not produce a negative interval for a commit dated in the future', () => {
		// Clock skew and rebases both produce these. "now" is wrong but harmless;
		// "-3 minutes ago" is not.
		expect(relativeTime(nowSeconds + 600, NOW)).toBe('now');
	});
});

describe('isNotable', () => {
	const day = 86400;

	it('marks the first row notable, since it has nothing above it', () => {
		expect(isNotable(1000, undefined)).toBe(true);
	});

	it('marks the first row of a day', () => {
		// Two timestamps either side of a day boundary.
		expect(isNotable(2 * day + 5, 2 * day - 5)).toBe(true);
	});

	it('does not mark a row in the same day as the one above', () => {
		expect(isNotable(2 * day + 500, 2 * day + 5)).toBe(false);
	});

	it('is not fooled by rows out of chronological order', () => {
		// Same day either way round: order does not create a landmark.
		expect(isNotable(2 * day + 5, 2 * day + 500)).toBe(false);
	});
});

describe('statusGlyph', () => {
	it('uses the handoff glyphs', () => {
		expect(statusGlyph('added')).toBe('+');
		expect(statusGlyph('deleted')).toBe('−');
		expect(statusGlyph('modified')).toBe('~');
		expect(statusGlyph('renamed')).toBe('~');
	});

	it('falls back to ? for anything it does not know', () => {
		expect(statusGlyph('typechange')).toBe('?');
		expect(statusGlyph('')).toBe('?');
	});

	it('uses a real minus sign, not a hyphen', () => {
		expect(statusGlyph('deleted')).not.toBe('-');
		expect(statusGlyph('deleted').codePointAt(0)).toBe(0x2212);
	});
});

describe('clockTime and fullDate', () => {
	it('render the same instant they are given', () => {
		const seconds = 1_700_000_000;
		const expected = new Date(seconds * 1000);
		// Locale output varies by machine, so compare against the same
		// formatting rather than a fixed string.
		expect(clockTime(seconds)).toBe(
			expected.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
		);
		expect(fullDate(seconds)).toBe(expected.toLocaleString());
	});

	it('treat the input as seconds, not milliseconds', () => {
		// A millisecond value passed by mistake would land in 1970.
		expect(fullDate(1_700_000_000)).not.toBe(fullDate(1_700_000));
	});
});

// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { DIFF_ROUTE, isActive, NAV_ITEMS, OFF_RAIL } from './nav';

describe('isActive', () => {
	it('matches the graph only on the root path', () => {
		expect(isActive('/', '/')).toBe(true);
		expect(isActive('/', '')).toBe(true);
		expect(isActive('/', '/branches')).toBe(false);
	});

	it('does not treat every route as a child of the root', () => {
		// The naive `startsWith` implementation would light up the Graph item on
		// every screen, which would make the rail useless as an answer to
		// "where am I".
		for (const item of NAV_ITEMS) {
			if (item.href === '/') continue;
			expect(isActive('/', item.href)).toBe(false);
		}
	});

	it('matches an exact route', () => {
		expect(isActive('/branches', '/branches')).toBe(true);
	});

	it('matches a child route', () => {
		expect(isActive('/branches', '/branches/detail')).toBe(true);
	});

	it('does not match a sibling that merely shares a prefix', () => {
		expect(isActive('/branch', '/branches')).toBe(false);
		expect(isActive('/repos', '/repositories')).toBe(false);
	});
});

describe('NAV_ITEMS', () => {
	it('has a unique code and a unique href per item', () => {
		const codes = NAV_ITEMS.map((item) => item.code);
		const hrefs = NAV_ITEMS.map((item) => item.href);
		expect(new Set(codes).size).toBe(codes.length);
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});

	it('never both counts and hints on the same item', () => {
		// The rail draws one right-aligned value; an item asking for both would
		// silently lose one of them.
		for (const item of NAV_ITEMS) {
			expect(item.count !== undefined && item.hint !== undefined).toBe(false);
		}
	});

	it('keeps the Diff screen off the rail', () => {
		expect(NAV_ITEMS.some((item) => item.href === DIFF_ROUTE)).toBe(false);
		expect(OFF_RAIL[DIFF_ROUTE].code).toBe('1B');
	});

	it('starts at the graph', () => {
		expect(NAV_ITEMS[0].href).toBe('/');
		expect(NAV_ITEMS[0].code).toBe('1A');
	});

	/**
	 * FEAT-030 put Log after Rebase. The order is the screens roughly as they
	 * are worked through — what changed, what conflicts, what branches — and Log
	 * is where you go to look something up rather than a step in that sequence.
	 */
	it('runs the screens in the order they are worked through', () => {
		expect(NAV_ITEMS.map((item) => item.href)).toEqual([
			'/',
			'/changes',
			'/conflicts',
			'/branches',
			'/stash',
			'/requests',
			'/rebase',
			'/search',
			'/repos',
			'/settings'
		]);
	});

	it('puts Log immediately after Rebase', () => {
		const hrefs = NAV_ITEMS.map((item) => item.href);
		expect(hrefs.indexOf('/search')).toBe(hrefs.indexOf('/rebase') + 1);
	});

	it('keeps the divider before All repositories', () => {
		const repos = NAV_ITEMS.find((item) => item.href === '/repos');
		expect(repos?.dividerBefore).toBe(true);
	});
});

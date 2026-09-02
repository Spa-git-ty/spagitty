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

	it('names no keyboard shortcut, in any notation (FEAT-041)', () => {
		// The rail's right-hand column is counts. A shortcut printed there was
		// the only non-number in it, and it was written in one platform's
		// notation on every platform — the defect FEAT-021 took out of the title
		// bar. The palette lists shortcuts, per platform, in one place.
		// Serialised whole, so a shortcut smuggled back in under any property
		// name fails this rather than only the one that was removed.
		expect(JSON.stringify(NAV_ITEMS)).not.toMatch(/ctrl|cmd|⌘|⌃/i);
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
			// FEAT-051. Beside Branches because they are the same kind of
			// thing — named positions in history — and the rail already
			// counted tags with nowhere to send anyone.
			'/tags',
			'/stash',
			'/requests',
			'/rebase',
			'/search',
			// FEAT-050. After Log because they answer neighbouring questions —
			// what is in history, and what was just done to it — and before the
			// divider because both are about the open repository.
			'/reflog',
			// FEAT-072. Last of the repository screens, because it is the only
			// one that is not about the repository's state — it is about what
			// has been done in it, which is a question people ask after the
			// ones above rather than instead of them.
			'/badges',
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

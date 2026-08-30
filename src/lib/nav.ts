// SPDX-License-Identifier: GPL-3.0-or-later

import type { IconName } from './ui/icons';
import type { RepoCounts } from './types';

/**
 * The nav rail is the only source of "where am I" — the active item and the
 * route are the same fact. Screen order and labels come from the handoff and
 * use standard git terminology verbatim.
 */

export type CountKey = keyof RepoCounts;

/**
 * Screen codes.
 *
 * Short handles so a screen can be named in one token in conversation and in
 * commit messages — "1A" rather than "the graph screen". The letters follow the
 * order the screens appear in the design handoff.
 *
 *   1A  Graph              1G  Stash
 *   1B  Diff               1H  Pull requests
 *   1C  Working copy       1I  Log search
 *   1D  Conflicts          1J  All repositories
 *   1E  Rebase             1K  Settings
 *   1F  Branches           1L  Clone modal
 *
 * 1M is the Reflog (FEAT-050) and 1N is Tags (FEAT-051): the first screens that
 * were not in the design handoff. Both came out of the GitKraken gap analysis,
 * and they are numbered after the handoff's run rather than inserted into it so
 * that a code still says where a screen came from.
 */
export type ScreenCode =
	| '1A'
	| '1B'
	| '1C'
	| '1D'
	| '1E'
	| '1F'
	| '1G'
	| '1H'
	| '1I'
	| '1J'
	| '1K'
	| '1L'
	| '1M'
	| '1N'
	| '1O';

export interface NavItem {
	code: ScreenCode;
	label: string;
	href: string;
	/** Which count to show right-aligned, if any. */
	count?: CountKey;
	/** Render a divider above this item. */
	dividerBefore?: boolean;
	/**
	 * The screen's icon: beside the label when the rail is open, and the whole
	 * item when it is collapsed.
	 *
	 * These were Unicode glyphs, chosen because the application shipped no icon
	 * set. It ships one now — `src/lib/ui/icons.ts` — so a screen names an icon
	 * and every rail, menu and toolbar draws the same shape at the same weight.
	 */
	icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
	{ code: '1A', label: 'Graph', href: '/', count: 'commits', icon: 'graph' },
	{ code: '1C', label: 'Working copy', href: '/changes', count: 'working', icon: 'edit' },
	{ code: '1D', label: 'Conflicts', href: '/conflicts', count: 'conflicts', icon: 'conflict' },
	{ code: '1F', label: 'Branches', href: '/branches', count: 'branches', icon: 'branch' },
	{ code: '1N', label: 'Tags', href: '/tags', count: 'tags', icon: 'tag' },
	{ code: '1G', label: 'Stash', href: '/stash', count: 'stashes', icon: 'stash' },
	{ code: '1H', label: 'Pull requests', href: '/requests', icon: 'request' },
	{ code: '1E', label: 'Rebase', href: '/rebase', icon: 'rebase' },
	{ code: '1I', label: 'Log', href: '/search', icon: 'search' },
	{ code: '1M', label: 'Reflog', href: '/reflog', icon: 'history' },
	{ code: '1J', label: 'All repositories', href: '/repos', dividerBefore: true, icon: 'folder' },
	{ code: '1K', label: 'Settings', href: '/settings', icon: 'settings' }
];

/** Screens that exist but are not reachable from the rail. */
export const OFF_RAIL: Record<string, { code: ScreenCode; label: string }> = {
	'/diff': { code: '1B', label: 'Diff' },
	'/history': { code: '1O', label: 'File history' }
};

/** Routes that are screens but are not reachable from the rail. */
export const DIFF_ROUTE = '/diff';

/** True when `href` is the active screen for `pathname`. */
export function isActive(href: string, pathname: string): boolean {
	if (href === '/') return pathname === '/' || pathname === '';
	return pathname === href || pathname.startsWith(href + '/');
}

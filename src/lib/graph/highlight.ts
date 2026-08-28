// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Which rows the Author column's filter keeps bright.
 *
 * A question about *the rows already loaded*, not about the repository, and
 * that is deliberate: the graph's rows already carry what is needed, so the
 * answer costs no round trip. It stops at the end of what has been walked,
 * which is the honest answer anyway — a highlight cannot mean anything about
 * rows that are not on screen to be highlighted.
 *
 * This file used to hold three more functions, answering hover questions:
 * `ancestry`, `ghostPath` and `rowOfRef`. FEAT-023 removed the hover effect
 * they served — dimming most of the screen as the pointer crosses it makes the
 * graph flicker — and they went with it, to
 * `~/claudetrashbin/spagitty-FEAT-023/` rather than into a delete.
 *
 * Everything here is a pure function over a row accessor, so it is testable
 * without a repository and without a DOM.
 */

import type { GraphRow } from '../types';

export type RowAt = (index: number) => GraphRow | undefined;

/** Rows whose author matches, for the Author column's filter. */
export function byAuthor(
	needle: string,
	row: RowAt,
	first: number,
	last: number
): Set<number> | null {
	const wanted = needle.trim().toLowerCase();
	if (wanted === '') return null;

	const found = new Set<number>();
	for (let i = first; i <= last; i++) {
		const current = row(i);
		if (!current) continue;
		if (current.authorName.toLowerCase().includes(wanted)) found.add(i);
	}
	return found;
}

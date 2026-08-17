// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Which commits are selected, for the operations that act on several.
 *
 * This is a **second** selection, deliberately. `graph.selectedIndex` is the
 * row the detail panel is showing — there is exactly one, and it follows the
 * keyboard. This one is the set a cherry-pick or a range rebase would act on,
 * and it is usually empty. Collapsing the two would mean either that arrowing
 * down changed what a menu would do, or that ctrl-clicking a second row
 * silently replaced the detail panel.
 *
 * Rows are stored by **index**, not by id: the operations are about a run of
 * history, and a run is contiguous in index. A re-walk invalidates indices, so
 * the selection is cleared then rather than being followed to wherever the
 * commits landed — after a rebase the commits selected before it no longer
 * exist under those ids anyway.
 */

let picked = $state<Set<number>>(new Set());
/** Where a shift-extend measures from. The last row clicked without shift. */
let anchor = $state<number | null>(null);

export const selection = {
	get size(): number {
		return picked.size;
	},

	has(index: number): boolean {
		return picked.has(index);
	},

	/**
	 * The selection, newest first — which is the order the rows are on screen.
	 *
	 * Callers that replay commits reverse it, because replaying goes forwards
	 * in time. Returning screen order and letting them reverse is clearer than
	 * returning an order that matches neither the screen nor git.
	 */
	ordered(): number[] {
		return [...picked].sort((a, b) => a - b);
	},

	/** Select one row and nothing else. A plain click. */
	only(index: number): void {
		picked = new Set([index]);
		anchor = index;
	},

	/** Add or remove one row. Ctrl or Cmd click. */
	toggle(index: number): void {
		const next = new Set(picked);
		if (next.has(index)) next.delete(index);
		else next.add(index);
		picked = next;
		anchor = index;
	},

	/**
	 * Select everything between the anchor and `index`. Shift click.
	 *
	 * With no anchor — the first click of a session being a shift-click — this
	 * is just a plain selection, which is what every list does.
	 */
	extendTo(index: number): void {
		if (anchor === null) {
			this.only(index);
			return;
		}
		const low = Math.min(anchor, index);
		const high = Math.max(anchor, index);

		const next = new Set<number>();
		for (let i = low; i <= high; i++) next.add(i);
		picked = next;
	},

	clear(): void {
		picked = new Set();
		anchor = null;
	}
};

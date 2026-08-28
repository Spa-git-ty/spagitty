// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What goes in a [`Menu`](./Menu.svelte).
 *
 * The types live beside the component rather than inside it because half a
 * dozen modules build menu lists and none of them should have to import a
 * Svelte component to describe one.
 */

export interface MenuEntry {
	id: string;
	label: string;
	/** Shown on the right, quietly: a shortcut, or the target of the action. */
	note?: string;
	/** Marks an entry that destroys work. Rendered apart, never silently. */
	danger?: boolean;
	disabled?: boolean;
	/**
	 * Why it is disabled, in one short phrase.
	 *
	 * An entry that cannot run is shown with its reason rather than hidden: a
	 * menu whose contents change with state is one nobody can learn, and
	 * "Delete — checked out" teaches the rule in four words.
	 */
	reason?: string;
	run: () => void | Promise<void>;
}

export type MenuItem = MenuEntry | { separator: true } | { heading: string };

/** True for an entry, as opposed to a separator or a heading. */
export function isEntry(item: MenuItem): item is MenuEntry {
	return 'run' in item;
}

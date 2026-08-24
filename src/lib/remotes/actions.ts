// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Changing a remote, and asking first where it matters (FEAT-049).
 *
 * Two of the three writes here move more than they look like they move, and the
 * confirmations say so:
 *
 * - **Renaming** rewrites the upstream of every branch that tracked the old
 *   name and moves its refs under `refs/remotes/`. That is what makes it a
 *   rename rather than a config edit, and it is worth knowing before agreeing.
 * - **Removing** takes those refs with it. Nothing is lost that a fetch cannot
 *   bring back, and saying that plainly is what stops it reading as worse than
 *   it is.
 */

import { remotes } from '$lib/remotes/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import type { Remote } from '$lib/types';

/** Ask for the new name, then rename. */
export async function renameRemote(remote: Remote): Promise<boolean> {
	const next = await dialog.prompt({
		title: `Rename ${remote.name}`,
		body: 'Every branch tracking this remote is repointed at the new name, and its remote-tracking refs move with it.',
		label: 'New name',
		value: remote.name,
		confirmLabel: 'Rename'
	});
	if (next === null || next.trim() === '' || next === remote.name) return false;

	return remotes.rename(remote.name, next);
}

/** Ask for the new URL, then change it. */
export async function retargetRemote(remote: Remote): Promise<boolean> {
	const next = await dialog.prompt({
		title: `Change where ${remote.name} points`,
		body: 'Only the URL changes. The refs already fetched from it stay where they are until the next fetch.',
		label: 'URL',
		value: remote.url,
		confirmLabel: 'Change'
	});
	if (next === null || next.trim() === '' || next === remote.url) return false;

	return remotes.setUrl(remote.name, next);
}

/**
 * What removing this remote costs.
 *
 * Named in refs, because that is the only thing actually lost, and it is
 * recoverable by adding the remote back and fetching. A remote that was never
 * fetched costs nothing at all and says so.
 */
export function removeBody(remote: Remote): string {
	const branches =
		'Branches that tracked it stop tracking anything, and pushing them will ask for a remote again.';

	if (remote.refs === 0) {
		return `${remote.name} has never been fetched, so nothing local is lost. ${branches}`;
	}

	return (
		`Its ${remote.refs} remote-tracking ${remote.refs === 1 ? 'ref is' : 'refs are'} ` +
		`removed with it. Nothing on the remote itself is touched, and adding it back and ` +
		`fetching brings them all back. ${branches}`
	);
}

/** Ask, then remove. */
export async function removeRemote(remote: Remote): Promise<boolean> {
	const agreed = await dialog.confirm({
		title: `Remove ${remote.name}`,
		body: removeBody(remote),
		confirmLabel: 'Remove',
		danger: true
	});
	if (!agreed) return false;

	return remotes.remove(remote.name);
}

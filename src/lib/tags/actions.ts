// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Changing a tag, and asking first (FEAT-051).
 *
 * Two of these say something people do not expect:
 *
 * - **Deleting** only removes the local tag. A tag already pushed stays on the
 *   remote until it is deleted there too, and a fetch can bring it straight
 *   back — which looks like the delete failed.
 * - **Retagging** is a delete and a recreate, because a tag object is immutable.
 *   The message changes and so do the date and the tagger, and a tag already
 *   pushed needs forcing to update.
 *
 * Checking a tag out is neither surprising nor destructive, but it detaches
 * HEAD, and saying so is what stops the next screen looking broken.
 */

import { tags } from '$lib/tags/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import { notice } from '$lib/ui/notice.svelte';
import type { Tag } from '$lib/types';

/** What deleting this tag does and does not reach. */
export function deleteBody(tag: Tag): string {
	return (
		`Only the local tag is removed; the commit it points at is untouched. ` +
		`A remote that has ${tag.name} keeps it until it is deleted there too, and ` +
		`a fetch can bring it back.`
	);
}

/** Ask, then delete. */
export async function deleteTag(tag: Tag): Promise<boolean> {
	const agreed = await dialog.confirm({
		title: `Delete ${tag.name}`,
		body: deleteBody(tag),
		confirmLabel: 'Delete',
		danger: true
	});
	if (!agreed) return false;

	const done = await tags.remove(tag.name);
	if (done) notice.ok(`${tag.name} is gone`);
	else notice.failed('Could not delete the tag', tags.writeError);
	return done;
}

/**
 * Ask for a new message, then rewrite an annotated tag.
 *
 * Only offered for an annotated tag: a lightweight one has no message and no
 * object to rewrite, and turning one into the other silently is not something a
 * button labelled "edit message" should do.
 */
export async function editMessage(tag: Tag): Promise<boolean> {
	if (!tag.annotated) return false;

	const next = await dialog.prompt({
		title: `Message for ${tag.name}`,
		body: 'A tag object cannot be edited, so this deletes and recreates it at the same commit. Its date and tagger become today’s, and a tag already pushed needs forcing to update the remote.',
		label: 'Message',
		value: tag.message,
		confirmLabel: 'Rewrite',
		danger: true
	});
	if (next === null || next.trim() === '' || next.trim() === tag.message) return false;

	const done = await tags.retag(tag.name, tag.target, next);
	if (done) notice.ok(`${tag.name} rewritten`);
	else notice.failed('Could not rewrite the tag', tags.writeError);
	return done;
}

/** Ask, then check the tag out with no branch attached. */
export async function checkoutTag(tag: Tag): Promise<boolean> {
	const agreed = await dialog.confirm({
		title: `Check out ${tag.name}`,
		body: `The working tree goes to ${tag.targetShort} with no branch attached. Checking out a branch again puts everything back; committing here needs a branch first.`,
		confirmLabel: 'Check out'
	});
	if (!agreed) return false;

	const done = await tags.checkout(tag.name);
	if (done) notice.ok(`Detached at ${tag.name}`);
	else notice.failed('Could not check it out', tags.writeError);
	return done;
}

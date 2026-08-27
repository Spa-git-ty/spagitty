// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The questions asked before a tag changes (FEAT-051).
 *
 * Both destructive wordings here say something people do not expect. Deleting
 * a tag only deletes it locally, and a fetch can bring it straight back — which
 * looks like the delete failed. Rewriting a message is a delete and a recreate,
 * because a tag object is immutable, so the date and tagger move too.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tag } from '$lib/types';

vi.mock('$lib/tags/store.svelte', () => ({
	tags: {
		writeError: null as string | null,
		remove: vi.fn(() => Promise.resolve(true)),
		retag: vi.fn(() => Promise.resolve(true)),
		checkout: vi.fn(() => Promise.resolve(true))
	}
}));

vi.mock('$lib/ui/notice.svelte', () => ({ notice: { ok: vi.fn(), failed: vi.fn() } }));

import { tags } from '$lib/tags/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import { checkoutTag, deleteBody, deleteTag, editMessage } from './actions';

const remove = vi.mocked(tags.remove);
const retag = vi.mocked(tags.retag);
const checkout = vi.mocked(tags.checkout);

function tag(overrides: Partial<Tag> = {}): Tag {
	return {
		name: 'v1.0.0',
		target: 'a'.repeat(40),
		targetShort: 'aaaaaaa',
		annotated: true,
		message: 'First release',
		taggerName: 'Ada Lovelace',
		time: 1_800_000_000,
		summary: 'The tagged commit',
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	dialog.dismiss();
});

describe('what deleting a tag reaches', () => {
	it('says the commit is untouched', () => {
		expect(deleteBody(tag())).toContain('the commit it points at is untouched');
	});

	it('warns that a fetch can bring it back', () => {
		// Otherwise the tag reappearing looks like the delete failed.
		const body = deleteBody(tag());
		expect(body).toContain('keeps it until it is deleted there too');
		expect(body).toContain('a fetch can bring it back');
	});
});

describe('the gate on delete', () => {
	it('asks first, and is painted as destructive', async () => {
		const running = deleteTag(tag());

		expect(dialog.question?.title).toBe('Delete v1.0.0');
		expect(dialog.question?.danger).toBe(true);
		expect(remove).not.toHaveBeenCalled();

		dialog.accept();
		expect(await running).toBe(true);
		expect(remove).toHaveBeenCalledWith('v1.0.0');
	});

	it('does nothing when dismissed', async () => {
		const running = deleteTag(tag());
		dialog.dismiss();

		expect(await running).toBe(false);
		expect(remove).not.toHaveBeenCalled();
	});
});

describe('rewriting a message', () => {
	it('is offered only for an annotated tag', async () => {
		// A lightweight tag has no message and no object to rewrite, and
		// turning one into the other silently is not what "edit message" means.
		expect(await editMessage(tag({ annotated: false, message: '' }))).toBe(false);
		expect(dialog.question).toBeNull();
		expect(retag).not.toHaveBeenCalled();
	});

	it('says it is a delete and a recreate, and what that moves', async () => {
		const running = editMessage(tag());

		expect(dialog.question?.kind).toBe('prompt');
		expect(dialog.question?.value).toBe('First release');
		expect(dialog.question?.body).toContain('deletes and recreates it at the same commit');
		expect(dialog.question?.body).toContain('date and tagger become today');
		expect(dialog.question?.danger).toBe(true);

		dialog.setDraft('Corrected');
		dialog.accept();

		expect(await running).toBe(true);
		expect(retag).toHaveBeenCalledWith('v1.0.0', 'a'.repeat(40), 'Corrected');
	});

	it('does nothing when the message comes back unchanged or empty', async () => {
		const unchanged = editMessage(tag());
		dialog.accept();
		expect(await unchanged).toBe(false);

		const dismissed = editMessage(tag());
		dialog.dismiss();
		expect(await dismissed).toBe(false);

		expect(retag).not.toHaveBeenCalled();
	});
});

describe('checking a tag out', () => {
	it('says the head will be detached, and how to get back', async () => {
		const running = checkoutTag(tag());

		expect(dialog.question?.body).toContain('no branch attached');
		expect(dialog.question?.body).toContain('puts everything back');
		// Not destructive: checking out a branch again undoes it.
		expect(dialog.question?.danger).toBe(false);

		dialog.accept();
		expect(await running).toBe(true);
		expect(checkout).toHaveBeenCalledWith('v1.0.0');
	});
});

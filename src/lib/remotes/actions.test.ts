// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The questions asked before a remote changes (FEAT-049).
 *
 * Removing a remote sounds worse than it is and renaming one sounds milder,
 * which is the whole reason both have wording worth asserting. Removing loses
 * only refs, and a fetch brings them back; renaming quietly repoints every
 * branch that tracked the old name.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Remote } from '$lib/types';

vi.mock('$lib/remotes/store.svelte', () => ({
	remotes: {
		rename: vi.fn(() => Promise.resolve(true)),
		remove: vi.fn(() => Promise.resolve(true)),
		setUrl: vi.fn(() => Promise.resolve(true))
	}
}));

import { remotes } from '$lib/remotes/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import { removeBody, removeRemote, renameRemote, retargetRemote } from './actions';

const rename = vi.mocked(remotes.rename);
const remove = vi.mocked(remotes.remove);
const setUrl = vi.mocked(remotes.setUrl);

function remote(overrides: Partial<Remote> = {}): Remote {
	return {
		name: 'origin',
		url: 'https://example.com/repo.git',
		pushUrl: null,
		host: 'generic',
		refs: 0,
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	dialog.dismiss();
});

describe('what removing costs', () => {
	it('says nothing local is lost when it was never fetched', () => {
		expect(removeBody(remote({ refs: 0 }))).toContain('never been fetched, so nothing local is lost');
	});

	it('counts the refs, and says a fetch brings them back', () => {
		// The reassurance is the point: "remove" reads as destructive, and the
		// only thing actually lost is recoverable in one command.
		const body = removeBody(remote({ refs: 12 }));

		expect(body).toContain('12 remote-tracking refs');
		expect(body).toContain('adding it back and fetching brings them all back');
	});

	it('has the singular for one ref', () => {
		expect(removeBody(remote({ refs: 1 }))).toContain('1 remote-tracking ref is');
	});

	it('always warns that branches stop tracking anything', () => {
		for (const refs of [0, 1, 9]) {
			expect(removeBody(remote({ refs }))).toContain('stop tracking anything');
		}
	});
});

describe('the gate on remove', () => {
	it('asks first, and is painted as destructive', async () => {
		const running = removeRemote(remote());

		expect(dialog.question?.title).toBe('Remove origin');
		expect(dialog.question?.danger).toBe(true);
		expect(remove).not.toHaveBeenCalled();

		dialog.accept();
		expect(await running).toBe(true);
		expect(remove).toHaveBeenCalledWith('origin');
	});

	it('does nothing when dismissed', async () => {
		const running = removeRemote(remote());
		dialog.dismiss();

		expect(await running).toBe(false);
		expect(remove).not.toHaveBeenCalled();
	});
});

describe('renaming', () => {
	it('warns that every branch tracking it is repointed', async () => {
		const running = renameRemote(remote());

		expect(dialog.question?.kind).toBe('prompt');
		expect(dialog.question?.value).toBe('origin');
		expect(dialog.question?.body).toContain('repointed at the new name');

		dialog.setDraft('upstream');
		dialog.accept();

		expect(await running).toBe(true);
		expect(rename).toHaveBeenCalledWith('origin', 'upstream');
	});

	it('does nothing when the name comes back unchanged or empty', async () => {
		const unchanged = renameRemote(remote());
		dialog.accept();
		expect(await unchanged).toBe(false);

		const dismissed = renameRemote(remote());
		dialog.dismiss();
		expect(await dismissed).toBe(false);

		expect(rename).not.toHaveBeenCalled();
	});
});

describe('changing the URL', () => {
	it('says the refs already fetched stay where they are', async () => {
		const running = retargetRemote(remote());

		expect(dialog.question?.value).toBe('https://example.com/repo.git');
		expect(dialog.question?.body).toContain('refs already fetched from it stay');

		dialog.setDraft('https://example.com/moved.git');
		dialog.accept();

		expect(await running).toBe(true);
		expect(setUrl).toHaveBeenCalledWith('origin', 'https://example.com/moved.git');
	});

	it('does nothing when the URL comes back unchanged', async () => {
		const running = retargetRemote(remote());
		dialog.accept();

		expect(await running).toBe(false);
		expect(setUrl).not.toHaveBeenCalled();
	});
});

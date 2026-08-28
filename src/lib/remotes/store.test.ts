// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The remotes store (FEAT-049).
 *
 * The interesting assertions here are about what the store refuses. A remote
 * name with a slash in it, or one that is already taken, is caught before git
 * sees it — not because git would accept them, but because git's messages for
 * both name a config key rather than the remote, and a form that says "that
 * name is taken" beats one that reports `remote.origin.url already exists`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Remote } from '$lib/types';

vi.mock('$lib/api', () => ({
	inTauri: () => true,
	remotes: vi.fn(),
	remoteAdd: vi.fn(),
	remoteRename: vi.fn(),
	remoteRemove: vi.fn(),
	remoteSetUrl: vi.fn()
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { control as repoControl } from '../../testing/repo-store.svelte';
import { remotes } from './store.svelte';

const list = vi.mocked(api.remotes);
const add = vi.mocked(api.remoteAdd);
const rename = vi.mocked(api.remoteRename);
const remove = vi.mocked(api.remoteRemove);
const setUrl = vi.mocked(api.remoteSetUrl);

function remote(name: string, overrides: Partial<Remote> = {}): Remote {
	return {
		name,
		url: `https://example.com/${name}.git`,
		pushUrl: null,
		host: 'generic',
		refs: 0,
		...overrides
	};
}

beforeEach(async () => {
	vi.clearAllMocks();
	remotes.clear();
	repoControl.reset();
	repoControl.setInfo({
		path: '/repos/fixture',
		name: 'fixture',
		bare: false,
		head: { branch: 'main', detached: false, id: 'a'.repeat(40), short: 'aaaaaaa' },
		lastFetched: null
	});
	list.mockResolvedValue([remote('origin')]);
	add.mockResolvedValue(undefined);
	rename.mockResolvedValue(undefined);
	remove.mockResolvedValue(undefined);
	setUrl.mockResolvedValue(undefined);
});

describe('reading', () => {
	it('takes the list the repository reported', async () => {
		await remotes.load();

		expect(remotes.list.map((r) => r.name)).toEqual(['origin']);
		expect(remotes.loaded).toBe(true);
	});

	it('reports an empty list rather than an error with no repository open', async () => {
		// Remotes belong to a repository. Having none open is a state, not a
		// failure, and the section says so in words.
		repoControl.reset();
		await remotes.load();

		expect(remotes.list).toEqual([]);
		expect(remotes.error).toBeNull();
		expect(remotes.loaded).toBe(true);
	});

	it('surfaces a read that failed', async () => {
		list.mockRejectedValueOnce(new Error('not a git repository'));
		await remotes.load();

		expect(remotes.error).toContain('not a git repository');
		expect(remotes.list).toEqual([]);
	});
});

describe('the add form', () => {
	it('needs both a name and a URL', async () => {
		await remotes.load();
		expect(remotes.addable).toBe(false);

		remotes.setNewName('upstream');
		expect(remotes.addable).toBe(false);

		remotes.setNewUrl('https://example.com/other.git');
		expect(remotes.addable).toBe(true);
	});

	it('refuses a name that is already taken', async () => {
		// git's own refusal names a config key, which is not what the person
		// typing a name is looking at.
		await remotes.load();
		remotes.setNewName('origin');
		remotes.setNewUrl('https://example.com/other.git');

		expect(remotes.addable).toBe(false);
	});

	it('refuses a name with a slash or a space in it', async () => {
		await remotes.load();
		remotes.setNewUrl('https://example.com/other.git');

		remotes.setNewName('up/stream');
		expect(remotes.addable).toBe(false);

		remotes.setNewName('up stream');
		expect(remotes.addable).toBe(false);
	});

	it('trims what was typed and clears the form afterwards', async () => {
		await remotes.load();
		remotes.setNewName('  upstream  ');
		remotes.setNewUrl('  https://example.com/other.git  ');

		expect(await remotes.add()).toBe(true);

		expect(add).toHaveBeenCalledWith('upstream', 'https://example.com/other.git');
		expect(remotes.newName).toBe('');
		expect(remotes.newUrl).toBe('');
	});

	it('keeps the form when the add failed', async () => {
		await remotes.load();
		remotes.setNewName('upstream');
		remotes.setNewUrl('https://example.com/other.git');
		add.mockRejectedValueOnce(new Error('remote upstream already exists'));

		expect(await remotes.add()).toBe(false);
		expect(remotes.writeError).toContain('already exists');
		expect(remotes.newName).toBe('upstream');
	});
});

describe('writing', () => {
	it('re-reads the list after every write', async () => {
		// Renaming moves refs and rewrites upstreams; removing takes tracking
		// refs with it. Neither is something a local edit could model.
		await remotes.load();
		list.mockClear();

		await remotes.rename('origin', 'upstream');

		expect(rename).toHaveBeenCalledWith('origin', 'upstream');
		expect(list).toHaveBeenCalled();
	});

	it('refuses a rename to nothing or to the same name', async () => {
		await remotes.load();

		expect(await remotes.rename('origin', '   ')).toBe(false);
		expect(await remotes.rename('origin', 'origin')).toBe(false);
		expect(rename).not.toHaveBeenCalled();
	});

	it('trims a typed name and URL', async () => {
		await remotes.load();

		await remotes.rename('origin', '  upstream  ');
		expect(rename).toHaveBeenCalledWith('origin', 'upstream');

		await remotes.setUrl('origin', '  https://example.com/moved.git  ');
		expect(setUrl).toHaveBeenCalledWith('origin', 'https://example.com/moved.git');
	});

	it('refuses an empty URL', async () => {
		await remotes.load();

		expect(await remotes.setUrl('origin', '  ')).toBe(false);
		expect(setUrl).not.toHaveBeenCalled();
	});

	it('removes without asking — the confirmation belongs to the caller', async () => {
		await remotes.load();

		expect(await remotes.remove('origin')).toBe(true);
		expect(remove).toHaveBeenCalledWith('origin');
	});

	it('surfaces a refusal rather than pretending it worked', async () => {
		await remotes.load();
		remove.mockRejectedValueOnce(new Error('No such remote'));

		expect(await remotes.remove('origin')).toBe(false);
		expect(remotes.writeError).toContain('No such remote');
	});
});

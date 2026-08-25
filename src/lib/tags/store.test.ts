// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The tags store (FEAT-051).
 *
 * The one thing here that could quietly destroy something is `retag`: it is a
 * delete followed by a create, so an empty message would leave no tag at all.
 * The core refuses it and so does this store — belt and braces, because the two
 * layers fail in different places and only one of them is on screen.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tag } from '$lib/types';

vi.mock('$lib/api', () => ({
	inTauri: () => true,
	tags: vi.fn(),
	tagCreate: vi.fn(),
	tagDelete: vi.fn(),
	tagRetag: vi.fn(),
	checkoutDetached: vi.fn()
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { calls as repoCalls, control as repoControl } from '../../testing/repo-store.svelte';
import { tags } from './store.svelte';

const list = vi.mocked(api.tags);
const create = vi.mocked(api.tagCreate);
const remove = vi.mocked(api.tagDelete);
const retag = vi.mocked(api.tagRetag);
const checkoutDetached = vi.mocked(api.checkoutDetached);

function tag(name: string, overrides: Partial<Tag> = {}): Tag {
	return {
		name,
		target: 'a'.repeat(40),
		targetShort: 'aaaaaaa',
		annotated: true,
		message: `${name} released`,
		taggerName: 'Ada Lovelace',
		time: 1_800_000_000,
		summary: 'The tagged commit',
		...overrides
	};
}

function openRepository() {
	repoControl.setInfo({
		path: '/repos/fixture',
		name: 'fixture',
		bare: false,
		head: { branch: 'main', detached: false, id: 'a'.repeat(40), short: 'aaaaaaa' },
		lastFetched: null
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	tags.clear();
	repoControl.reset();
	openRepository();
	list.mockResolvedValue([tag('v1.0.0'), tag('v0.9.0', { annotated: false, message: '' })]);
	create.mockResolvedValue(undefined);
	remove.mockResolvedValue(undefined);
	retag.mockResolvedValue(undefined);
	checkoutDetached.mockResolvedValue(undefined);
});

describe('reading', () => {
	it('takes the list the repository reported', async () => {
		await tags.load();

		expect(tags.list.map((t) => t.name)).toEqual(['v1.0.0', 'v0.9.0']);
		expect(tags.loaded).toBe(true);
	});

	it('reports nothing rather than failing with no repository open', async () => {
		repoControl.reset();
		await tags.load();

		expect(tags.list).toEqual([]);
		expect(tags.error).toBeNull();
	});

	it('surfaces a read that failed', async () => {
		list.mockRejectedValueOnce(new Error('could not read refs'));
		await tags.load();

		expect(tags.error).toContain('could not read refs');
	});
});

describe('the filter', () => {
	beforeEach(async () => {
		await tags.load();
	});

	it('matches the name', () => {
		tags.setQuery('v1.0');

		expect(tags.filtered.map((t) => t.name)).toEqual(['v1.0.0']);
		expect(tags.hidden).toBe(1);
	});

	it('matches the message and the summary too, ignoring case', () => {
		tags.setQuery('RELEASED');
		expect(tags.filtered).toHaveLength(1);

		tags.setQuery('tagged commit');
		expect(tags.filtered).toHaveLength(2);
	});

	it('shows everything again when cleared', () => {
		tags.setQuery('v1.0');
		tags.setQuery('  ');

		expect(tags.filtered).toHaveLength(2);
		expect(tags.hidden).toBe(0);
	});
});

describe('creating', () => {
	beforeEach(async () => {
		await tags.load();
	});

	it('needs a name', () => {
		expect(tags.creatable).toBe(false);

		tags.setNewName('v2.0.0');
		expect(tags.creatable).toBe(true);
	});

	it('refuses a name that already exists', () => {
		tags.setNewName('v1.0.0');
		expect(tags.creatable).toBe(false);
	});

	it('sends an empty target and message as they are', async () => {
		// Empty target means HEAD, and an empty message means lightweight —
		// both are `git tag`'s own defaults rather than something invented here.
		tags.setNewName('v2.0.0');

		expect(await tags.create()).toBe(true);
		expect(create).toHaveBeenCalledWith('v2.0.0', '', '');
	});

	it('trims all three and clears the form afterwards', async () => {
		tags.setNewName('  v2.0.0  ');
		tags.setNewTarget('  HEAD~1  ');
		tags.setNewMessage('  Second  ');

		await tags.create();

		expect(create).toHaveBeenCalledWith('v2.0.0', 'HEAD~1', 'Second');
		expect(tags.newName).toBe('');
		expect(tags.newMessage).toBe('');
	});

	it('keeps the form when the create failed', async () => {
		tags.setNewName('v2.0.0');
		create.mockRejectedValueOnce(new Error('not a valid object name'));

		expect(await tags.create()).toBe(false);
		expect(tags.writeError).toContain('not a valid object name');
		expect(tags.newName).toBe('v2.0.0');
	});
});

describe('changing a tag', () => {
	beforeEach(async () => {
		await tags.load();
	});

	it('deletes by name and re-reads', async () => {
		list.mockClear();

		expect(await tags.remove('v1.0.0')).toBe(true);
		expect(remove).toHaveBeenCalledWith('v1.0.0');
		expect(list).toHaveBeenCalled();
		expect(repoCalls.refreshed).toBeGreaterThan(0);
	});

	it('rewrites a message at the same commit', async () => {
		expect(await tags.retag('v1.0.0', 'a'.repeat(40), '  Corrected  ')).toBe(true);

		expect(retag).toHaveBeenCalledWith('v1.0.0', 'a'.repeat(40), 'Corrected');
	});

	it('refuses an empty rewrite, which would leave no tag at all', async () => {
		// `retag` deletes before it creates. This guard is the difference
		// between an edit that does nothing and an edit that loses the tag.
		expect(await tags.retag('v1.0.0', 'a'.repeat(40), '   ')).toBe(false);
		expect(retag).not.toHaveBeenCalled();
	});

	it('checks a tag out by name, detached', async () => {
		await tags.checkout('v1.0.0');

		expect(checkoutDetached).toHaveBeenCalledWith('v1.0.0');
	});

	it('surfaces a refusal rather than pretending it worked', async () => {
		remove.mockRejectedValueOnce(new Error("tag 'v1.0.0' not found"));

		expect(await tags.remove('v1.0.0')).toBe(false);
		expect(tags.writeError).toContain('not found');
	});
});

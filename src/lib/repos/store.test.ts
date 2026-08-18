// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepoSummary } from '$lib/types';

vi.mock('$lib/api', () => ({
	recentRepos: vi.fn(),
	forgetRepo: vi.fn(() => Promise.resolve())
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { calls as repoCalls, control as repoControl } from '../../testing/repo-store.svelte';
import { repos } from './store.svelte';

const recentRepos = vi.mocked(api.recentRepos);
const forgetRepo = vi.mocked(api.forgetRepo);

function card(name: string, overrides: Partial<RepoSummary> = {}): RepoSummary {
	return {
		path: `/repos/${name}`,
		name,
		present: true,
		bare: false,
		branch: 'main',
		detached: false,
		short: 'aaaaaaa',
		summary: 'A commit',
		time: 1_700_000_000,
		dirty: 0,
		conflicts: 0,
		stashes: 0,
		branches: 1,
		...overrides
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => (resolve = res));
	return { promise, resolve };
}

beforeEach(() => {
	vi.clearAllMocks();
	repos.clear();
	repoControl.reset();
	recentRepos.mockResolvedValue([card('quiet'), card('dirty', { dirty: 3 })]);
});

describe('load', () => {
	it('takes the list in the order it was given', async () => {
		await repos.load();

		expect(repos.cards.map((c) => c.name)).toEqual(['quiet', 'dirty']);
		expect(repos.loaded).toBe(true);
		expect(repos.error).toBeNull();
	});

	it('records a failure and shows nothing', async () => {
		recentRepos.mockRejectedValueOnce('could not read the list');
		await repos.load();

		expect(repos.error).toBe('could not read the list');
		expect(repos.cards).toEqual([]);
	});

	it('drops a slow read that a newer one superseded', async () => {
		const slow = deferred<RepoSummary[]>();
		recentRepos.mockReturnValueOnce(slow.promise);

		const first = repos.load();
		await repos.load();
		slow.resolve([card('stale')]);
		await first;

		expect(repos.cards.map((c) => c.name)).not.toContain('stale');
	});
});

describe('grouping', () => {
	it('leads with the ones that have something going on', async () => {
		recentRepos.mockResolvedValueOnce([
			card('clean'),
			card('changed', { dirty: 2 }),
			card('stashed', { stashes: 1 }),
			card('conflicted', { conflicts: 1 }),
			card('gone', { present: false, dirty: null, stashes: null, conflicts: null })
		]);
		await repos.load();

		expect(repos.needingAttention.map((c) => c.name)).toEqual([
			'changed',
			'stashed',
			'conflicted',
			'gone'
		]);
		expect(repos.idle.map((c) => c.name)).toEqual(['clean']);
	});

	it('puts every card in exactly one group', async () => {
		recentRepos.mockResolvedValueOnce([card('a'), card('b', { dirty: 1 })]);
		await repos.load();

		const both = [...repos.needingAttention, ...repos.idle].map((c) => c.name).sort();
		expect(both).toEqual(['a', 'b']);
	});

	it('counts a missing repository as needing attention', async () => {
		// A path that moved is something to see, not something to file away.
		recentRepos.mockResolvedValueOnce([card('gone', { present: false })]);
		await repos.load();

		expect(repos.needingAttention).toHaveLength(1);
		expect(repos.idle).toHaveLength(0);
	});
});

describe('opening', () => {
	it('opens a card and re-reads the list afterwards', async () => {
		await repos.load();
		recentRepos.mockClear();

		expect(await repos.open(card('quiet'))).toBe(true);

		expect(repoCalls.opened).toEqual(['/repos/quiet']);
		expect(recentRepos).toHaveBeenCalled();
	});

	it('refuses a card whose path is gone', async () => {
		await repos.load();

		expect(await repos.open(card('gone', { present: false }))).toBe(false);
		expect(repoCalls.opened).toEqual([]);
	});

	it('knows which card is the open repository', async () => {
		await repos.load();
		repoControl.setInfo({
			path: '/repos/quiet',
			name: 'quiet',
			bare: false,
			head: { branch: 'main', detached: false, id: 'a'.repeat(40), short: 'aaaaaaa' }
		});

		expect(repos.isOpen(card('quiet'))).toBe(true);
		expect(repos.isOpen(card('dirty'))).toBe(false);
	});

	it('asks for a directory and re-reads afterwards', async () => {
		await repos.load();
		recentRepos.mockClear();

		expect(await repos.choose()).toBe(true);

		expect(repoCalls.chosen).toBe(1);
		expect(recentRepos).toHaveBeenCalled();
	});

	it('refuses a second action while one is in flight', async () => {
		await repos.load();
		const slow = deferred<RepoSummary[]>();
		recentRepos.mockReturnValueOnce(slow.promise);

		const first = repos.open(card('quiet'));
		expect(await repos.choose()).toBe(false);

		slow.resolve([]);
		await first;
	});
});

describe('forgetting', () => {
	it('removes the card and re-reads, without touching the repository', async () => {
		await repos.load();
		recentRepos.mockClear();

		await repos.forget(card('quiet'));

		expect(forgetRepo).toHaveBeenCalledWith('/repos/quiet');
		expect(recentRepos).toHaveBeenCalled();
		// Nothing about the repository itself is asked to change.
		expect(repoCalls.opened).toEqual([]);
		expect(repoCalls.closed).toBe(0);
	});

	it('records a failure to forget', async () => {
		await repos.load();
		forgetRepo.mockRejectedValueOnce('could not write the list');

		await repos.forget(card('quiet'));

		// Kept apart from `error`: the re-read that follows a write succeeds,
		// and would otherwise clear the failure it is reporting.
		expect(repos.writeError).toBe('could not write the list');
		expect(repos.error).toBeNull();
	});
});

describe('clear', () => {
	it('forgets the cards it had loaded', async () => {
		await repos.load();
		repos.clear();

		expect(repos.cards).toEqual([]);
		expect(repos.loaded).toBe(false);
		expect(repos.error).toBeNull();
	});
});

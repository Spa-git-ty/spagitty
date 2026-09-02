// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Branch visibility and pinning (FEAT-047, covered under FEAT-072).
 *
 * The store's whole job is to turn three buttons into one answer — which refs
 * the walk is rooted at — so almost every test here asserts on the ref list
 * handed to `api.graphVisibility` rather than on the store's own fields. What
 * the store believes matters far less than what the backend is told.
 *
 * `localStorage` is stubbed per test rather than trusted from the environment:
 * happy-dom carries one between tests in the same file, and a restore test that
 * accidentally reads the previous test's write proves nothing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchRow, RepoInfo } from '$lib/types';

vi.mock('$lib/api', () => ({
	branches: vi.fn(),
	graphVisibility: vi.fn(() => Promise.resolve(7))
}));

vi.mock('./store.svelte', () => ({
	graph: { adopt: vi.fn(() => Promise.resolve()) }
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { graph } from './store.svelte';
import { control } from '../../testing/repo-store.svelte';
import { visibility } from './visibility.svelte';

const branchList = vi.mocked(api.branches);
const graphVisibility = vi.mocked(api.graphVisibility);
const adopt = vi.mocked(graph.adopt);

function aBranch(overrides: Partial<BranchRow> = {}): BranchRow {
	return {
		name: 'main',
		fullName: 'refs/heads/main',
		kind: 'branch',
		current: false,
		id: 'a'.repeat(40),
		short: 'aaaaaaa',
		summary: 'a commit',
		authorName: 'Somebody',
		time: 0,
		upstream: null,
		ahead: null,
		behind: null,
		...overrides
	} as BranchRow;
}

function anInfo(path: string): RepoInfo {
	return {
		path,
		name: path.split('/').pop() ?? path,
		bare: false,
		head: { detached: false, branch: 'main', id: 'a'.repeat(40) } as RepoInfo['head'],
		lastFetched: null
	};
}

/** The ref list handed to the backend by the most recent apply. */
function lastRoots(): string[] {
	const call = graphVisibility.mock.calls.at(-1);
	if (!call) throw new Error('the backend was never told anything');
	return call[0];
}

/** The pinned list handed to the backend by the most recent apply. */
function lastHeld(): string[] {
	const call = graphVisibility.mock.calls.at(-1);
	if (!call) throw new Error('the backend was never told anything');
	return call[1];
}

let store: Record<string, string> = {};

beforeEach(async () => {
	vi.clearAllMocks();
	store = {};
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		}
	});

	control.reset();
	control.setInfo(anInfo('/work/project'));

	// A fresh repository key each test, because `open` is a no-op for the key
	// it is already pointed at — which is the behaviour, not an obstacle.
	visibility.open(`/work/${Math.random()}`);
	await visibility.showAll();
	graphVisibility.mockClear();
	adopt.mockClear();
});

describe('the mode decides the roots', () => {
	it('asks for everything by sending nothing', async () => {
		await visibility.setMode('all');

		// An empty list is the backend's own word for "all refs", so `all` has
		// no list to compute — and the store must not invent one.
		expect(lastRoots()).toEqual([]);
		expect(visibility.filtered).toBe(false);
	});

	it('sends the branches that were not hidden', async () => {
		branchList.mockResolvedValue([
			aBranch({ name: 'main', fullName: 'refs/heads/main' }),
			aBranch({ name: 'spike', fullName: 'refs/heads/spike' })
		]);
		await visibility.load();

		await visibility.hide('refs/heads/spike');

		expect(lastRoots()).toEqual(['refs/heads/main']);
		expect(visibility.isHidden('refs/heads/spike')).toBe(true);
		expect(visibility.filtered).toBe(true);
	});

	it('treats hiding every branch as a request for all of them', async () => {
		// Not a request to see nothing — it is a state somebody clicked their
		// way into, and an empty graph looks broken rather than filtered.
		branchList.mockResolvedValue([aBranch({ fullName: 'refs/heads/main' })]);
		await visibility.load();

		await visibility.hide('refs/heads/main');

		expect(lastRoots()).toEqual([]);
		expect(visibility.filtered).toBe(false);
	});

	it('un-hiding a branch puts it back in the roots', async () => {
		branchList.mockResolvedValue([
			aBranch({ fullName: 'refs/heads/main' }),
			aBranch({ fullName: 'refs/heads/spike' })
		]);
		await visibility.load();
		await visibility.hide('refs/heads/spike');

		await visibility.unhide('refs/heads/spike');

		expect(lastRoots()).toEqual([]);
		expect(visibility.isHidden('refs/heads/spike')).toBe(false);
	});

	it('solo sends exactly one ref', async () => {
		await visibility.solo('refs/heads/spike');

		expect(lastRoots()).toEqual(['refs/heads/spike']);
		expect(visibility.isSoloed('refs/heads/spike')).toBe(true);
	});

	it('a second solo compares two branches rather than replacing the first', async () => {
		await visibility.solo('refs/heads/spike');

		await visibility.alsoSolo('refs/heads/main');

		expect(lastRoots()).toEqual(['refs/heads/spike', 'refs/heads/main']);
	});

	it('does not add the same branch to a solo twice', async () => {
		await visibility.solo('refs/heads/spike');

		await visibility.alsoSolo('refs/heads/spike');

		expect(lastRoots()).toEqual(['refs/heads/spike']);
	});

	it('an empty solo falls back to everything', async () => {
		await visibility.setMode('solo');

		expect(lastRoots()).toEqual([]);
	});

	it('showing all clears both lists', async () => {
		await visibility.hide('refs/heads/spike');
		await visibility.alsoSolo('refs/heads/other');

		await visibility.showAll();

		expect(visibility.mode).toBe('all');
		expect(visibility.hidden).toEqual([]);
		expect(visibility.soloed).toEqual([]);
	});

	it('hiding switches into hide mode from wherever it was', async () => {
		await visibility.solo('refs/heads/spike');

		await visibility.hide('refs/heads/other');

		expect(visibility.mode).toBe('hide');
	});
});

describe('smart visibility names its guess', () => {
	it('takes the current branch, its upstream, and the trunk', async () => {
		branchList.mockResolvedValue([
			aBranch({ name: 'feature', fullName: 'refs/heads/feature', current: true, upstream: 'origin/feature' }),
			aBranch({ name: 'origin/feature', fullName: 'refs/remotes/origin/feature', kind: 'remote' }),
			aBranch({ name: 'main', fullName: 'refs/heads/main', upstream: 'origin/main' }),
			aBranch({ name: 'origin/main', fullName: 'refs/remotes/origin/main', kind: 'remote' }),
			aBranch({ name: 'unrelated', fullName: 'refs/heads/unrelated' })
		]);
		await visibility.load();

		await visibility.setMode('smart');

		expect(lastRoots()).toEqual([
			'refs/heads/feature',
			'refs/remotes/origin/feature',
			'refs/heads/main',
			'refs/remotes/origin/main'
		]);
		expect(lastRoots()).not.toContain('refs/heads/unrelated');
	});

	it('stops at the first trunk name it finds', async () => {
		// main, master, develop and dev are tried in order; a repository with
		// both must not have every one of them pulled in.
		branchList.mockResolvedValue([
			aBranch({ name: 'feature', fullName: 'refs/heads/feature', current: true }),
			aBranch({ name: 'master', fullName: 'refs/heads/master' }),
			aBranch({ name: 'develop', fullName: 'refs/heads/develop' })
		]);
		await visibility.load();

		await visibility.setMode('smart');

		expect(lastRoots()).toEqual(['refs/heads/feature', 'refs/heads/master']);
	});

	it('skips an upstream that is configured but not fetched', async () => {
		branchList.mockResolvedValue([
			aBranch({ name: 'feature', fullName: 'refs/heads/feature', current: true, upstream: 'origin/feature' })
		]);
		await visibility.load();

		await visibility.setMode('smart');

		expect(lastRoots()).toEqual(['refs/heads/feature']);
	});

	it('shows everything when there is no current branch to be smart about', async () => {
		// A detached HEAD. Everything is visibly the wrong answer; an empty
		// screen is an answer that looks like a bug.
		branchList.mockResolvedValue([aBranch({ fullName: 'refs/heads/main' })]);
		await visibility.load();

		await visibility.setMode('smart');

		expect(lastRoots()).toEqual([]);
	});

	it('does not mistake a remote branch for the trunk', async () => {
		branchList.mockResolvedValue([
			aBranch({ name: 'feature', fullName: 'refs/heads/feature', current: true }),
			aBranch({ name: 'main', fullName: 'refs/remotes/origin/main', kind: 'remote' })
		]);
		await visibility.load();

		await visibility.setMode('smart');

		expect(lastRoots()).toEqual(['refs/heads/feature']);
	});
});

describe('pinning is the other axis', () => {
	it('toggles a branch on and off the pinned list', async () => {
		await visibility.togglePin('refs/heads/main');
		expect(visibility.isPinned('refs/heads/main')).toBe(true);
		expect(lastHeld()).toEqual(['refs/heads/main']);

		await visibility.togglePin('refs/heads/main');
		expect(visibility.isPinned('refs/heads/main')).toBe(false);
		expect(lastHeld()).toEqual([]);
	});

	it('drops a pin on a branch the walk is not showing', async () => {
		// A pinned ref outside the walk would hold a lane open that nothing
		// ever draws into — a permanent empty column.
		branchList.mockResolvedValue([
			aBranch({ fullName: 'refs/heads/main' }),
			aBranch({ fullName: 'refs/heads/spike' })
		]);
		await visibility.load();
		await visibility.togglePin('refs/heads/spike');

		await visibility.hide('refs/heads/spike');

		expect(lastRoots()).toEqual(['refs/heads/main']);
		expect(lastHeld()).toEqual([]);
	});

	it('keeps every pin when the walk is showing everything', async () => {
		await visibility.togglePin('refs/heads/anything');

		await visibility.setMode('all');

		expect(lastHeld()).toEqual(['refs/heads/anything']);
	});
});

describe('the walk is restarted, not just re-filtered', () => {
	it('adopts the token the backend hands back', async () => {
		await visibility.setMode('all');

		expect(adopt).toHaveBeenCalledWith(7);
	});

	it('says nothing to a backend with no repository open', async () => {
		control.setInfo(null);

		await visibility.setMode('solo');

		expect(graphVisibility).not.toHaveBeenCalled();
		expect(adopt).not.toHaveBeenCalled();
	});
});

describe('the branch list behind the modes', () => {
	it('is re-read on load', async () => {
		branchList.mockResolvedValue([aBranch({ fullName: 'refs/heads/main' })]);

		await visibility.load();

		expect(visibility.branches).toHaveLength(1);
	});

	it('an unreadable branch list leaves the modes computing against nothing', async () => {
		// Which resolves to "show everything" — the safe direction to fail in.
		branchList.mockResolvedValue([aBranch({ fullName: 'refs/heads/main' })]);
		await visibility.load();
		branchList.mockRejectedValue(new Error('not a repository'));

		await visibility.load();

		expect(visibility.branches).toEqual([]);
		await visibility.setMode('hide');
		expect(lastRoots()).toEqual([]);
	});
});

describe('the selection survives the application closing', () => {
	it('writes the selection under the repository it belongs to', async () => {
		visibility.open('/work/one');

		await visibility.solo('refs/heads/spike');

		expect(JSON.parse(store['spagitty.graph.visibility:/work/one'])).toEqual({
			mode: 'solo',
			hidden: [],
			soloed: ['refs/heads/spike'],
			pinned: []
		});
	});

	it('reads it back for that repository and not another', () => {
		store['spagitty.graph.visibility:/work/one'] = JSON.stringify({
			mode: 'hide',
			hidden: ['refs/heads/spike'],
			soloed: [],
			pinned: ['refs/heads/main']
		});

		visibility.open('/work/one');

		expect(visibility.mode).toBe('hide');
		expect(visibility.hidden).toEqual(['refs/heads/spike']);
		expect(visibility.pinned).toEqual(['refs/heads/main']);

		visibility.open('/work/two');

		expect(visibility.mode).toBe('all');
		expect(visibility.hidden).toEqual([]);
	});

	it('ignores a stored mode that is not a mode', () => {
		store['spagitty.graph.visibility:/work/broken'] = JSON.stringify({ mode: 'sideways' });

		visibility.open('/work/broken');

		expect(visibility.mode).toBe('all');
	});

	it('ignores stored lists that are not lists of strings', () => {
		// Written by an older version, or edited by hand. A ref list with a
		// number in it would reach the backend as a ref.
		store['spagitty.graph.visibility:/work/odd'] = JSON.stringify({
			mode: 'hide',
			hidden: ['refs/heads/main', 3, null],
			soloed: 'refs/heads/spike',
			pinned: null
		});

		visibility.open('/work/odd');

		expect(visibility.hidden).toEqual(['refs/heads/main']);
		expect(visibility.soloed).toEqual([]);
		expect(visibility.pinned).toEqual([]);
	});

	it('survives unparseable stored state', () => {
		store['spagitty.graph.visibility:/work/corrupt'] = 'not json';

		visibility.open('/work/corrupt');

		expect(visibility.mode).toBe('all');
	});

	it('survives a localStorage that refuses to write', async () => {
		// Private windows and locked-down webviews both do this, and a paint is
		// not worth failing over.
		vi.stubGlobal('localStorage', {
			getItem: () => null,
			setItem: () => {
				throw new Error('quota exceeded');
			}
		});
		visibility.open('/work/readonly');

		await expect(visibility.setMode('solo')).resolves.toBeUndefined();
	});

	it('a null path leaves the store pointed where it already was', async () => {
		// Closing a repository must not silently repoint this at nothing, or
		// the next write would land under a key nobody reads back.
		visibility.open('/work/one');
		await visibility.solo('refs/heads/spike');
		store = {};

		visibility.open(null);
		await visibility.setMode('hide');

		expect(Object.keys(store)).toEqual(['spagitty.graph.visibility:/work/one']);
		expect(JSON.parse(store['spagitty.graph.visibility:/work/one']).mode).toBe('hide');
	});

	it('re-opening the repository it is already on does not reset it', async () => {
		visibility.open('/work/one');
		await visibility.solo('refs/heads/spike');

		visibility.open('/work/one');

		expect(visibility.mode).toBe('solo');
		expect(visibility.soloed).toEqual(['refs/heads/spike']);
	});
});

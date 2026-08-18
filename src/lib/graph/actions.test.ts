// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What the graph's menus actually do.
 *
 * The module's own doc comment sets the contract: ask when there is something
 * to lose, run it, re-read. The branches that matter are the *refusals* — a
 * cancelled confirmation must not reach `api`, and a failed operation must not
 * refresh as though it had worked. Both are invisible in the UI until the day
 * they are wrong, and both destroy work when they are.
 *
 * `api`, the stores and the dialog are mocked; what is under test is the
 * decision-making between them, not git.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Integration, ResetMode, StashAction } from '$lib/types';

/** The options object every action hands to the dialog, as far as tests care. */
interface Asked {
	title: string;
	body: string;
	confirmLabel: string;
	danger?: boolean;
}

const confirm = vi.fn<(options: Asked) => Promise<boolean>>();
const prompt = vi.fn<(options: Asked) => Promise<string | null>>();
vi.mock('$lib/ui/dialog.svelte', () => ({
	dialog: {
		confirm: (options: Asked) => confirm(options),
		prompt: (options: Asked) => prompt(options)
	}
}));

const ok = vi.fn();
const failed = vi.fn();
vi.mock('$lib/ui/notice.svelte', () => ({
	notice: {
		ok: (title: string, detail?: string | null) => ok(title, detail),
		failed: (title: string, error: unknown) => failed(title, error)
	}
}));

const reload = vi.fn(() => Promise.resolve());
vi.mock('$lib/graph/store.svelte', () => ({ graph: { reload: () => reload() } }));

const repoRefresh = vi.fn(() => Promise.resolve());
vi.mock('$lib/repo.svelte', () => ({ repo: { refresh: () => repoRefresh() } }));

let confirmHistoryRewrite = true;
vi.mock('$lib/settings/store.svelte', () => ({
	settings: {
		get settings() {
			return { confirmHistoryRewrite };
		}
	}
}));

/**
 * `vi.hoisted`, because `vi.mock`'s factory is lifted above every `const` in
 * this file and `() => api` would dereference the binding before it exists.
 */
const api = vi.hoisted(() => ({
	reset: vi.fn(() => Promise.resolve()),
	revert: vi.fn(() => Promise.resolve()),
	cherryPick: vi.fn(() => Promise.resolve()),
	integrate: vi.fn(() => Promise.resolve()),
	rebaseOnto: vi.fn(() => Promise.resolve()),
	checkout: vi.fn(() => Promise.resolve()),
	checkoutDetached: vi.fn(() => Promise.resolve()),
	createBranch: vi.fn(() => Promise.resolve()),
	createTag: vi.fn(() => Promise.resolve()),
	renameBranch: vi.fn(() => Promise.resolve()),
	deleteBranch: vi.fn(() => Promise.resolve()),
	deleteTag: vi.fn(() => Promise.resolve()),
	stashAction: vi.fn(() => Promise.resolve()),
	fetch: vi.fn(() => Promise.resolve('')),
	push: vi.fn(() => Promise.resolve(''))
}));
vi.mock('$lib/api', () => api);

import * as actions from '$lib/graph/actions';

/** The last options object handed to `dialog.confirm`. */
function lastConfirmation(): Asked {
	const call = confirm.mock.calls.at(-1);
	if (!call) throw new Error('nothing was confirmed');
	return call[0];
}

beforeEach(() => {
	vi.clearAllMocks();
	confirmHistoryRewrite = true;
	confirm.mockResolvedValue(true);
	prompt.mockResolvedValue('given-name');
});

describe('perform — the shape every action shares', () => {
	it('reports and re-reads on success', async () => {
		await actions.checkoutBranch('main');

		expect(api.checkout).toHaveBeenCalledWith('main');
		expect(ok).toHaveBeenCalledWith('Switched to main', undefined);
		expect(repoRefresh).toHaveBeenCalledTimes(1);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	/** A refresh after a failure redraws the same state and reads as success. */
	it('reports the failure and does not re-read', async () => {
		const boom = new Error('would be overwritten');
		api.checkout.mockRejectedValueOnce(boom);

		await actions.checkoutBranch('main');

		expect(failed).toHaveBeenCalledWith('Could not switch to main', boom);
		expect(ok).not.toHaveBeenCalled();
		expect(reload).not.toHaveBeenCalled();
	});

	it('does not throw out to a menu entry, which has nowhere to catch', async () => {
		api.checkout.mockRejectedValueOnce(new Error('nope'));
		await expect(actions.checkoutBranch('main')).resolves.toBeUndefined();
	});
});

describe('copyId', () => {
	it('puts the full id on the clipboard and names the short one', async () => {
		const writeText = vi.fn(() => Promise.resolve());
		vi.stubGlobal('navigator', { clipboard: { writeText } });

		await actions.copyId('a1b2c3d4e5f6', 'a1b2c3d');

		expect(writeText).toHaveBeenCalledWith('a1b2c3d4e5f6');
		expect(ok).toHaveBeenCalledWith('Copied a1b2c3d', undefined);
		vi.unstubAllGlobals();
	});

	it('says so when the webview refuses clipboard access', async () => {
		const denied = new Error('denied');
		vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(() => Promise.reject(denied)) } });

		await actions.copyId('a1b2c3d4e5f6', 'a1b2c3d');

		expect(failed).toHaveBeenCalledWith('Could not copy the commit id', denied);
		vi.unstubAllGlobals();
	});
});

describe('createBranchAt / createTagAt', () => {
	it('creates and checks out the branch it was given a name for', async () => {
		prompt.mockResolvedValueOnce('feature/FEAT-031-graph');

		await actions.createBranchAt('a1b2c3d4', 'a1b2c3d');

		expect(api.createBranch).toHaveBeenCalledWith('feature/FEAT-031-graph', 'a1b2c3d4', true);
		expect(ok).toHaveBeenCalledWith('Created feature/FEAT-031-graph', undefined);
	});

	it('creates nothing when the naming prompt is dismissed', async () => {
		prompt.mockResolvedValueOnce(null);

		await actions.createBranchAt('a1b2c3d4', 'a1b2c3d');

		expect(api.createBranch).not.toHaveBeenCalled();
		expect(ok).not.toHaveBeenCalled();
	});

	it('tags the commit it was given a name for', async () => {
		prompt.mockResolvedValueOnce('v2.1.0');

		await actions.createTagAt('a1b2c3d4', 'a1b2c3d');

		expect(api.createTag).toHaveBeenCalledWith('v2.1.0', 'a1b2c3d4');
		expect(ok).toHaveBeenCalledWith('Tagged a1b2c3d as v2.1.0', undefined);
	});

	it('tags nothing when the naming prompt is dismissed', async () => {
		prompt.mockResolvedValueOnce(null);

		await actions.createTagAt('a1b2c3d4', 'a1b2c3d');

		expect(api.createTag).not.toHaveBeenCalled();
	});
});

describe('resetTo', () => {
	/**
	 * The module's rule: `hard` always asks, whatever the setting says, because
	 * uncommitted work destroyed by it is the one thing the reflog cannot return.
	 */
	it('always asks before a hard reset, even with the warning turned off', async () => {
		confirmHistoryRewrite = false;

		await actions.resetTo('a1b2c3d4', 'a1b2c3d', 'hard');

		expect(confirm).toHaveBeenCalledTimes(1);
		expect(lastConfirmation().danger).toBe(true);
		expect(lastConfirmation().body).toContain('cannot be recovered');
		expect(api.reset).toHaveBeenCalledWith('a1b2c3d4', 'hard');
	});

	it.each<[ResetMode, string]>([
		['soft', 'staged and ready to commit again'],
		['mixed', 'in your files, unstaged']
	])('asks before a %s reset while the warning is on', async (mode, wording) => {
		await actions.resetTo('a1b2c3d4', 'a1b2c3d', mode);

		expect(confirm).toHaveBeenCalledTimes(1);
		expect(lastConfirmation().body).toContain(wording);
		expect(lastConfirmation().danger).toBe(false);
		expect(api.reset).toHaveBeenCalledWith('a1b2c3d4', mode);
	});

	it.each<ResetMode>(['soft', 'mixed'])(
		'goes straight ahead on a %s reset with the warning off',
		async (mode) => {
			confirmHistoryRewrite = false;

			await actions.resetTo('a1b2c3d4', 'a1b2c3d', mode);

			expect(confirm).not.toHaveBeenCalled();
			expect(api.reset).toHaveBeenCalledWith('a1b2c3d4', mode);
		}
	);

	it('resets nothing when the confirmation is declined', async () => {
		confirm.mockResolvedValueOnce(false);

		await actions.resetTo('a1b2c3d4', 'a1b2c3d', 'hard');

		expect(api.reset).not.toHaveBeenCalled();
	});
});

describe('revertCommit', () => {
	it('reverts once confirmed', async () => {
		await actions.revertCommit('a1b2c3d4', 'a1b2c3d');

		expect(api.revert).toHaveBeenCalledWith('a1b2c3d4');
		expect(ok).toHaveBeenCalledWith('Reverted a1b2c3d', undefined);
	});

	it('reverts nothing when declined', async () => {
		confirm.mockResolvedValueOnce(false);
		await actions.revertCommit('a1b2c3d4', 'a1b2c3d');
		expect(api.revert).not.toHaveBeenCalled();
	});
});

describe('cherryPick', () => {
	it('does nothing, and asks nothing, for an empty selection', async () => {
		await actions.cherryPick([], []);

		expect(confirm).not.toHaveBeenCalled();
		expect(api.cherryPick).not.toHaveBeenCalled();
	});

	it('names the commit when there is one', async () => {
		await actions.cherryPick(['a1'], ['a1b2c3d']);

		expect(lastConfirmation().title).toBe('Cherry pick a1b2c3d');
		expect(lastConfirmation().body).toContain('This commit is');
		expect(api.cherryPick).toHaveBeenCalledWith(['a1']);
	});

	it('counts them when there are several', async () => {
		await actions.cherryPick(['a1', 'b2', 'c3'], ['a1b2c3d', 'b2c3d4e', 'c3d4e5f']);

		expect(lastConfirmation().title).toBe('Cherry pick 3 commits');
		expect(lastConfirmation().body).toContain('These commits are');
		expect(ok).toHaveBeenCalledWith('Cherry picked 3 commits', undefined);
	});

	it('picks nothing when declined', async () => {
		confirm.mockResolvedValueOnce(false);
		await actions.cherryPick(['a1'], ['a1b2c3d']);
		expect(api.cherryPick).not.toHaveBeenCalled();
	});
});

describe('rebaseOntoCommit', () => {
	it('warns that the rebase rewrites, and rebases', async () => {
		await actions.rebaseOntoCommit('a1b2c3d4', 'a1b2c3d');

		expect(lastConfirmation().danger).toBe(true);
		expect(lastConfirmation().body).toContain('force push');
		expect(api.rebaseOnto).toHaveBeenCalledWith('a1b2c3d4');
	});

	it('rebases nothing when declined', async () => {
		confirm.mockResolvedValueOnce(false);
		await actions.rebaseOntoCommit('a1b2c3d4', 'a1b2c3d');
		expect(api.rebaseOnto).not.toHaveBeenCalled();
	});
});

describe('rebaseRangeOnto', () => {
	const oldest = { id: 'a1b2c3d4', short: 'a1b2c3d', parents: ['p1'] };

	/**
	 * A root commit has no parent to bound the range with, and `git` would read
	 * the missing bound as "the whole branch" — which is not what was selected.
	 */
	it('refuses a selection whose oldest commit is a root', async () => {
		await actions.rebaseRangeOnto({ ...oldest, parents: [] }, 3, 'main');

		expect(confirm).not.toHaveBeenCalled();
		expect(api.rebaseOnto).not.toHaveBeenCalled();
		expect(failed).toHaveBeenCalledWith(
			'Could not rebase the selection',
			'the oldest commit selected has no parent, so there is no range to move'
		);
	});

	it('bounds the range at the oldest commit’s parent', async () => {
		await actions.rebaseRangeOnto(oldest, 3, 'main');

		expect(lastConfirmation().title).toBe('Rebase 3 commits onto main');
		expect(api.rebaseOnto).toHaveBeenCalledWith('main', 'a1b2c3d4^');
		expect(ok).toHaveBeenCalledWith('Rebased 3 onto main', undefined);
	});

	it('says "commit" for a range of one', async () => {
		await actions.rebaseRangeOnto(oldest, 1, 'main');
		expect(lastConfirmation().title).toBe('Rebase 1 commit onto main');
	});

	it('rebases nothing when declined', async () => {
		confirm.mockResolvedValueOnce(false);
		await actions.rebaseRangeOnto(oldest, 3, 'main');
		expect(api.rebaseOnto).not.toHaveBeenCalled();
	});
});

describe('checkoutCommit', () => {
	it('explains the detached HEAD before detaching', async () => {
		await actions.checkoutCommit('a1b2c3d4', 'a1b2c3d');

		expect(lastConfirmation().body).toContain('detached HEAD');
		expect(api.checkoutDetached).toHaveBeenCalledWith('a1b2c3d4');
	});

	it('checks out nothing when declined', async () => {
		confirm.mockResolvedValueOnce(false);
		await actions.checkoutCommit('a1b2c3d4', 'a1b2c3d');
		expect(api.checkoutDetached).not.toHaveBeenCalled();
	});
});

describe('integrate', () => {
	it('has wording for every integration it offers', () => {
		expect(actions.INTEGRATIONS.map((entry) => entry.how)).toEqual([
			'merge',
			'mergeNoFastForward',
			'fastForward',
			'rebase'
		]);
	});

	it('does nothing for an integration it does not know', async () => {
		await actions.integrate('feature/x', 'main', 'nonsense' as Integration);

		expect(confirm).not.toHaveBeenCalled();
		expect(api.integrate).not.toHaveBeenCalled();
	});

	it('always asks before a rebase, even with the warning off', async () => {
		confirmHistoryRewrite = false;

		await actions.integrate('feature/x', 'main', 'rebase');

		expect(confirm).toHaveBeenCalledTimes(1);
		expect(lastConfirmation().danger).toBe(true);
		expect(api.integrate).toHaveBeenCalledWith('feature/x', 'rebase');
	});

	it.each<Integration>(['merge', 'mergeNoFastForward', 'fastForward'])(
		'asks before %s while the warning is on',
		async (how) => {
			await actions.integrate('feature/x', 'main', how);

			expect(confirm).toHaveBeenCalledTimes(1);
			expect(lastConfirmation().danger).toBe(false);
			expect(api.integrate).toHaveBeenCalledWith('feature/x', how);
		}
	);

	it('goes straight ahead on a merge with the warning off', async () => {
		confirmHistoryRewrite = false;

		await actions.integrate('feature/x', 'main', 'merge');

		expect(confirm).not.toHaveBeenCalled();
		expect(api.integrate).toHaveBeenCalledWith('feature/x', 'merge');
	});

	it('integrates nothing when declined', async () => {
		confirm.mockResolvedValueOnce(false);
		await actions.integrate('feature/x', 'main', 'merge');
		expect(api.integrate).not.toHaveBeenCalled();
	});
});

describe('renameBranch', () => {
	it('renames to the typed name', async () => {
		prompt.mockResolvedValueOnce('feature/renamed');

		await actions.renameBranch('feature/old');

		expect(api.renameBranch).toHaveBeenCalledWith('feature/old', 'feature/renamed');
		expect(ok).toHaveBeenCalledWith('Renamed feature/old to feature/renamed', undefined);
	});

	it('renames nothing when the prompt is dismissed', async () => {
		prompt.mockResolvedValueOnce(null);
		await actions.renameBranch('feature/old');
		expect(api.renameBranch).not.toHaveBeenCalled();
	});

	/** Confirming the pre-filled name unchanged is a no-op, not a rename to itself. */
	it('renames nothing when the name comes back unchanged', async () => {
		prompt.mockResolvedValueOnce('feature/old');
		await actions.renameBranch('feature/old');
		expect(api.renameBranch).not.toHaveBeenCalled();
	});
});

describe('deleteBranch', () => {
	it('is gentle and unforced for a merged branch', async () => {
		await actions.deleteBranch('feature/done', true);

		expect(lastConfirmation().danger).toBe(false);
		expect(lastConfirmation().body).toContain('nothing is lost');
		expect(api.deleteBranch).toHaveBeenCalledWith('feature/done', false);
	});

	/** Unmerged is the case where commits are actually lost, so it forces and says so. */
	it('is dangerous and forced for an unmerged branch', async () => {
		await actions.deleteBranch('feature/wip', false);

		expect(lastConfirmation().danger).toBe(true);
		expect(lastConfirmation().body).toContain('reflog');
		expect(api.deleteBranch).toHaveBeenCalledWith('feature/wip', true);
	});

	it('deletes nothing when declined', async () => {
		confirm.mockResolvedValueOnce(false);
		await actions.deleteBranch('feature/wip', false);
		expect(api.deleteBranch).not.toHaveBeenCalled();
	});
});

describe('deleteTag', () => {
	it('deletes the local tag once confirmed', async () => {
		await actions.deleteTag('v1.0.0');

		expect(lastConfirmation().danger).toBe(true);
		expect(api.deleteTag).toHaveBeenCalledWith('v1.0.0');
	});

	it('deletes nothing when declined', async () => {
		confirm.mockResolvedValueOnce(false);
		await actions.deleteTag('v1.0.0');
		expect(api.deleteTag).not.toHaveBeenCalled();
	});
});

describe('stash', () => {
	it.each<[StashAction, string, string, boolean]>([
		['apply', 'Apply', 'Applied', false],
		['pop', 'Pop', 'Popped', false],
		['drop', 'Drop', 'Dropped', true]
	])('words %s as its own operation', async (action, title, done, danger) => {
		await actions.stash(2, 'stash@{2}', action);

		expect(lastConfirmation().title).toBe(`${title} stash@{2}`);
		expect(lastConfirmation().confirmLabel).toBe(title);
		expect(lastConfirmation().danger).toBe(danger);
		expect(api.stashAction).toHaveBeenCalledWith(2, action);
		expect(ok).toHaveBeenCalledWith(`${done} stash@{2}`, undefined);
	});

	it('does nothing when declined', async () => {
		confirm.mockResolvedValueOnce(false);
		await actions.stash(0, 'stash@{0}', 'drop');
		expect(api.stashAction).not.toHaveBeenCalled();
	});

	it('reports git’s own refusal', async () => {
		const boom = new Error('could not restore untracked files');
		api.stashAction.mockRejectedValueOnce(boom);

		await actions.stash(0, 'stash@{0}', 'pop');

		expect(failed).toHaveBeenCalledWith('Could not pop stash@{0}', boom);
	});
});

describe('remotes', () => {
	it('fetches without asking — nothing is lost by fetching', async () => {
		await actions.fetchAll();

		expect(confirm).not.toHaveBeenCalled();
		expect(api.fetch).toHaveBeenCalledTimes(1);
		expect(ok).toHaveBeenCalledWith('Fetched', undefined);
	});

	it('pushes without asking', async () => {
		await actions.pushCurrent();

		expect(confirm).not.toHaveBeenCalled();
		expect(api.push).toHaveBeenCalledTimes(1);
		expect(ok).toHaveBeenCalledWith('Pushed', undefined);
	});

	it('reports a rejected push', async () => {
		const boom = new Error('non-fast-forward');
		api.push.mockRejectedValueOnce(boom);

		await actions.pushCurrent();

		expect(failed).toHaveBeenCalledWith('Could not push', boom);
	});
});

// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, render } from '../../testing/mount';
import type { RepoSummary } from '$lib/types';

vi.mock('$lib/api', () => ({
	recentRepos: vi.fn(() => Promise.resolve([])),
	forgetRepo: vi.fn(() => Promise.resolve())
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { calls as repoCalls, control as repoControl } from '../../testing/repo-store.svelte';
import RepoCard from './RepoCard.svelte';

const forgetRepo = vi.mocked(api.forgetRepo);

function card(overrides: Partial<RepoSummary> = {}): RepoSummary {
	return {
		path: '/repos/fixture',
		name: 'fixture',
		present: true,
		bare: false,
		branch: 'main',
		detached: false,
		short: 'aaaaaaa',
		summary: 'Merge feature/split-view',
		time: Math.floor(Date.now() / 1000) - 3600,
		dirty: 0,
		conflicts: 0,
		stashes: 0,
		branches: 1,
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	repoControl.reset();
});

describe('RepoCard', () => {
	it('names the repository, its branch, its path and what it was last doing', () => {
		const view = render(RepoCard, { card: card() });

		expect(view.text()).toContain('fixture');
		expect(view.text()).toContain('main');
		expect(view.get('.path').textContent).toBe('/repos/fixture');
		expect(view.text()).toContain('Merge feature/split-view');

		view.destroy();
	});

	it('says where a detached HEAD is rather than showing no branch', () => {
		const view = render(RepoCard, { card: card({ branch: null, detached: true }) });
		expect(view.text()).toContain('detached at aaaaaaa');
		view.destroy();
	});

	it('says a repository has no commits yet', () => {
		const view = render(RepoCard, {
			card: card({ branch: null, short: null, summary: null, detached: false })
		});
		expect(view.text()).toContain('no commits yet');
		view.destroy();
	});

	it('earns a chip per thing going on, and shows none when nothing is', () => {
		const quiet = render(RepoCard, { card: card() });
		expect(quiet.all('.chip')).toHaveLength(0);
		quiet.destroy();

		const busy = render(RepoCard, {
			card: card({ dirty: 2, stashes: 1, conflicts: 3, bare: false })
		});
		const labels = busy.all('.chip').map((c) => c.textContent?.trim());
		expect(labels).toEqual(['3 conflicted', '2 changed', '1 stashed']);
		busy.destroy();
	});

	it('leads with conflicts, which are the thing that stops work', () => {
		const view = render(RepoCard, { card: card({ dirty: 5, conflicts: 1 }) });
		expect(view.all('.chip')[0].textContent?.trim()).toBe('1 conflicted');
		view.destroy();
	});

	it('says a missing repository is missing and does not offer to open it', () => {
		const view = render(RepoCard, { card: card({ present: false }) });

		expect(view.text()).toContain('Not here any more');
		expect(view.text()).toContain('GitLumiere has not touched it either way');
		const open = view.all('button').find((b) => b.textContent?.includes('Open'));
		expect((open as HTMLButtonElement).disabled).toBe(true);
		// The path stays visible: it is the only clue to where it went.
		expect(view.get('.path').textContent).toBe('/repos/fixture');

		view.destroy();
	});

	it('marks the open repository and does not offer to open it again', () => {
		repoControl.setInfo({
			path: '/repos/fixture',
			name: 'fixture',
			bare: false,
			head: { branch: 'main', detached: false, id: 'a'.repeat(40), short: 'aaaaaaa' }
		});
		const view = render(RepoCard, { card: card() });

		expect(view.text()).toContain('open');
		const open = view.all('button').find((b) => b.textContent?.includes('Already open'));
		expect((open as HTMLButtonElement).disabled).toBe(true);

		view.destroy();
	});

	it('opens a repository from its card', () => {
		const view = render(RepoCard, { card: card() });

		const open = view.all('button').find((b) => b.textContent?.trim() === 'Open');
		click(open as HTMLElement);

		expect(repoCalls.opened).toEqual(['/repos/fixture']);
		view.destroy();
	});

	it('forgetting says plainly that the directory is not touched', () => {
		const view = render(RepoCard, { card: card() });

		const forget = view.all('button').find((b) => b.textContent?.includes('Forget'));
		expect(forget?.getAttribute('title')).toContain('directory on disk is not touched');

		click(forget as HTMLElement);
		expect(forgetRepo).toHaveBeenCalledWith('/repos/fixture');

		view.destroy();
	});

	it('renders an idle card dashed', () => {
		const view = render(RepoCard, { card: card(), idle: true });
		expect(view.get('.card').classList.contains('idle')).toBe(true);
		view.destroy();
	});

	it('shows a branch count only when there is more than one', () => {
		const one = render(RepoCard, { card: card({ branches: 1 }) });
		expect(one.text()).not.toContain('branches');
		one.destroy();

		const many = render(RepoCard, { card: card({ branches: 6 }) });
		expect(many.text()).toContain('6 branches');
		many.destroy();
	});
});

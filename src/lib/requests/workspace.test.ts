// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, render } from '../../testing/mount';
import type {
	FileDiff,
	ForgeRepo,
	PullRequest,
	PullRequestComment,
	PullRequestCommit
} from '$lib/types';

vi.mock('$lib/api', () => ({
	inTauri: vi.fn(() => true),
	forgeRepo: vi.fn(),
	forgeAccounts: vi.fn(() => Promise.resolve([{ kind: 'gitHub', host: 'github.com', user: 'ada' }])),
	pullRequests: vi.fn(),
	pullRequestFiles: vi.fn(),
	pullRequestCommits: vi.fn(),
	pullRequestComments: vi.fn(),
	commitFiles: vi.fn(),
	submitReview: vi.fn(),
	replyComment: vi.fn()
}));

import * as api from '$lib/api';
import PRDiffPane from './PRDiffPane.svelte';
import PRWorkspace from './PRWorkspace.svelte';
import { requests } from './store.svelte';

const forgeRepo = vi.mocked(api.forgeRepo);
const pullRequests = vi.mocked(api.pullRequests);
const pullRequestFiles = vi.mocked(api.pullRequestFiles);
const pullRequestCommits = vi.mocked(api.pullRequestCommits);
const pullRequestComments = vi.mocked(api.pullRequestComments);
const commitFiles = vi.mocked(api.commitFiles);
const submitReview = vi.mocked(api.submitReview);
const replyComment = vi.mocked(api.replyComment);

const REPO: ForgeRepo = {
	kind: 'gitHub',
	host: 'github.com',
	owner: 'spagitty',
	name: 'spagitty'
};

function request(overrides: Partial<PullRequest> = {}): PullRequest {
	return {
		id: 'PR_1',
		number: 412,
		title: 'Workspace review overhaul',
		authorName: 'ada',
		updated: 1_787_650_200,
		sourceBranch: 'feature/workspace',
		targetBranch: 'main',
		draft: false,
		review: 'awaitingReview',
		checks: 'passing',
		needsYou: false,
		needsYouBecause: null,
		changedFiles: 2,
		added: 25,
		removed: 5,
		mergeable: true,
		...overrides
	};
}

function file(path = 'src/main.rs'): FileDiff {
	return {
		path,
		status: 'modified',
		binary: false,
		tooLarge: false,
		added: 10,
		removed: 2,
		hunks: [
			{
				oldStart: 1,
				oldLines: 3,
				newStart: 1,
				newLines: 4,
				header: '@@ -1,3 +1,4 @@',
				lines: [
					{ origin: 'context', old: 1, new: 1, text: 'fn main() {' },
					{ origin: 'removed', old: 2, new: null, text: '    old();' },
					{ origin: 'added', old: null, new: 2, text: '    new_one();' },
					{ origin: 'added', old: null, new: 3, text: '    new_two();' },
					{ origin: 'context', old: 3, new: 4, text: '}' }
				]
			}
		]
	};
}

function commit(sha = 'abc123456789'): PullRequestCommit {
	return {
		sha,
		short: sha.slice(0, 7),
		summary: 'Refactor diff and workspace components',
		authorName: 'Ada Lovelace',
		authorEmail: 'ada@example.com',
		time: 1_787_650_200
	};
}

function comment(id = 101): PullRequestComment {
	return {
		id,
		inReplyTo: null,
		path: 'src/main.rs',
		line: 2,
		side: 'RIGHT',
		body: 'Please rename new_one()',
		author: 'grace',
		createdAt: 1_787_650_200,
		resolved: false
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	requests.clear();
	vi.mocked(api.inTauri).mockReturnValue(true);
	forgeRepo.mockResolvedValue(REPO);
	pullRequests.mockResolvedValue([request()]);
	pullRequestFiles.mockResolvedValue([file()]);
	pullRequestCommits.mockResolvedValue([commit()]);
	pullRequestComments.mockResolvedValue([comment()]);
	commitFiles.mockResolvedValue([file('src/commit-specific.rs')]);
});

describe('PR workspace store flow', () => {
	it('opens workspace and loads PR data', async () => {
		requests.present([request()]);
		requests.openWorkspace('PR_1');

		expect(requests.viewMode).toBe('workspace');
		expect(requests.openId).toBe('PR_1');

		await requests.loadWorkspaceData();

		expect(pullRequestFiles).toHaveBeenCalledWith(412);
		expect(pullRequestCommits).toHaveBeenCalledWith(412);
		expect(pullRequestComments).toHaveBeenCalledWith(412);
		expect(requests.files).toHaveLength(1);
		expect(requests.commits).toHaveLength(1);
		expect(requests.comments).toHaveLength(1);
	});

	it('closes workspace back to list view', () => {
		requests.present([request()]);
		requests.openWorkspace('PR_1');
		expect(requests.viewMode).toBe('workspace');

		requests.closeWorkspace();
		expect(requests.viewMode).toBe('list');
	});

	it('selects commit and loads commit files into cache', async () => {
		requests.present([request()]);
		requests.presentFiles([file('src/main.rs')], 412);

		await requests.selectCommit('abc123456789');

		expect(requests.selectedCommitSha).toBe('abc123456789');
		expect(commitFiles).toHaveBeenCalledWith('abc123456789');
		expect(requests.currentFiles[0].path).toBe('src/commit-specific.rs');

		await requests.selectCommit(null);
		expect(requests.selectedCommitSha).toBeNull();
		expect(requests.currentFiles[0].path).toBe('src/main.rs');
	});

	it('adds and removes draft comments', () => {
		requests.addDraftComment('src/main.rs', 2, 'RIGHT', 'Nice clean refactor');
		expect(requests.draftComments).toHaveLength(1);
		expect(requests.draftComments[0].body).toBe('Nice clean refactor');

		requests.removeDraftComment('src/main.rs', 2, 'RIGHT');
		expect(requests.draftComments).toHaveLength(0);
	});

	it('submits review with draft comments included', async () => {
		requests.present([request()]);
		requests.addDraftComment('src/main.rs', 2, 'RIGHT', 'Inline review note');

		submitReview.mockResolvedValueOnce();

		const ok = await requests.review('comment', 'Summary note');
		expect(ok).toBe(true);
		expect(submitReview).toHaveBeenCalledWith(
			412,
			'comment',
			'Summary note',
			[{ path: 'src/main.rs', line: 2, side: 'RIGHT', body: 'Inline review note' }]
		);
		expect(requests.draftComments).toHaveLength(0);
	});

	it('resolves comment threads', () => {
		requests.presentComments([comment(101)], 412);
		expect(requests.comments[0].resolved).toBe(false);

		requests.resolveComment(101);
		expect(requests.comments[0].resolved).toBe(true);
	});

	it('replies to comment thread', async () => {
		requests.present([request()]);
		requests.presentComments([comment(101)], 412);

		replyComment.mockResolvedValueOnce({
			id: 102,
			inReplyTo: 101,
			path: 'src/main.rs',
			line: 2,
			side: 'RIGHT',
			body: 'Done in recent commit',
			author: 'ada',
			createdAt: 1_787_650_300,
			resolved: false
		});

		const ok = await requests.replyToComment(101, 'Done in recent commit');
		expect(ok).toBe(true);
		expect(replyComment).toHaveBeenCalledWith(412, 101, 'Done in recent commit');
		expect(requests.comments).toHaveLength(2);
	});

	it('determines role from author vs connected user', async () => {
		await requests.load();
		requests.present([request({ authorName: 'ada' })]);
		expect(requests.role).toBe('developer');

		requests.present([request({ authorName: 'grace' })]);
		expect(requests.role).toBe('reviewer');
	});
});

describe('PRWorkspace component UI', () => {
	it('mounts and renders PR header, accordion panes, and controls', () => {
		vi.mocked(api.inTauri).mockReturnValue(false);
		requests.present([request()]);
		requests.select('PR_1');
		requests.presentFiles([file('src/main.rs')], 412);
		requests.presentCommits([commit()], 412);
		requests.presentComments([comment()], 412);

		const view = render(PRWorkspace, {});

		expect(view.text()).toContain('#412');
		expect(view.text()).toContain('Workspace review overhaul');
		expect(view.text()).toContain('ada');
		expect(view.text()).toContain('ALL changed files');
		expect(view.text()).toContain('LIST OF COMMITS');
		expect(view.text()).toContain('src/main.rs');
		expect(view.text()).toContain('Refactor diff and workspace components');

		// Toggle role preview
		expect(view.text()).toContain('Reviewer View');
		const roleBtn = view.get('.role-toggle-btn');
		click(roleBtn);
		expect(view.text()).toContain('Developer View');

		// Toggle accordion
		const headers = view.all('.accordion-header');
		click(headers[0]); // collapse all files
		click(headers[1]); // collapse commits

		// Toggle commit expansion
		click(headers[1]); // expand commits again
		const commitToggle = view.get('.commit-toggle');
		click(commitToggle);

		// Switch diff view
		const splitBtn = view.all('.switch-btn')[1];
		click(splitBtn);
		expect(view.text()).toContain('before');
		expect(view.text()).toContain('after');

		view.destroy();
	});

	it('opens and closes review modal in reviewer mode', () => {
		vi.mocked(api.inTauri).mockReturnValue(false);
		requests.present([request({ authorName: 'grace' })]);
		requests.select('PR_1');
		requests.presentFiles([file('src/main.rs')], 412);

		const view = render(PRWorkspace, {});

		const publishBtn = view.all('button').find((b) => b.textContent?.includes('Publish Review'));
		expect(publishBtn).toBeDefined();
		if (publishBtn) click(publishBtn);

		expect(view.text()).toContain('Publish Pull Request Review');
		expect(view.text()).toContain('Approve');
		expect(view.text()).toContain('Request Changes');

		const cancelBtn = view.all('button').find((b) => b.textContent?.includes('Cancel'));
		expect(cancelBtn).toBeDefined();
		if (cancelBtn) click(cancelBtn);

		expect(view.text()).not.toContain('Publish Pull Request Review');
		view.destroy();
	});
});

describe('PRDiffPane component UI', () => {
	it('renders diff lines, comments, and draft composers', () => {
		vi.mocked(api.inTauri).mockReturnValue(false);
		requests.presentComments([comment(101)], 412);
		requests.addDraftComment('src/main.rs', 2, 'RIGHT', 'Draft inline note');

		const view = render(PRDiffPane, {
			file: file('src/main.rs'),
			path: 'src/main.rs',
			error: null,
			loading: false,
			view: 'unified' as const
		});

		expect(view.text()).toContain('fn main()');
		expect(view.text()).toContain('new_one()');
		expect(view.text()).toContain('Please rename new_one()');
		expect(view.text()).toContain('Draft inline note');
		expect(view.text()).toContain('Pending Review Draft');

		// Open inline composer
		const triggers = view.all('.comment-trigger');
		expect(triggers.length).toBeGreaterThan(0);
		click(triggers[0]);

		expect(view.text()).toContain('Add inline review comment');

		view.destroy();
	});
});

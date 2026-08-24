// SPDX-License-Identifier: GPL-3.0-or-later

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { click, render } from '../../testing/mount';
import type { PullRequest } from '$lib/types';

import RequestDetail from './RequestDetail.svelte';
import RequestRow from './RequestRow.svelte';
import { CHECK_LABELS, REVIEW_LABELS, requests } from './store.svelte';

function request(overrides: Partial<PullRequest> = {}): PullRequest {
	return {
		id: 'pr-1',
		number: 412,
		title: 'Split the diff view',
		authorName: 'Ada Lovelace',
		updated: Math.floor(Date.now() / 1000) - 3600,
		sourceBranch: 'feature/split-view',
		targetBranch: 'main',
		draft: false,
		review: 'awaitingReview',
		checks: 'passing',
		needsYou: true,
		needsYouBecause: 'Your review was requested.',
		changedFiles: 4,
		added: 120,
		removed: 8,
		mergeable: true,
		...overrides
	};
}

beforeEach(() => {
	requests.clear();
});

describe('grouping', () => {
	it('leads with what is waiting on you', () => {
		requests.present([
			request({ id: 'a', needsYou: false }),
			request({ id: 'b', needsYou: true })
		]);

		expect(requests.needingYou.map((r) => r.id)).toEqual(['b']);
		expect(requests.waitingOnOthers.map((r) => r.id)).toEqual(['a']);
	});

	it('puts every request in exactly one group', () => {
		requests.present([
			request({ id: 'a', needsYou: true }),
			request({ id: 'b', needsYou: false }),
			request({ id: 'c', needsYou: true })
		]);

		expect(requests.needingYou.length + requests.waitingOnOthers.length).toBe(
			requests.all.length
		);
	});

	it('opens the first request so the panel is never blank beside a list', () => {
		requests.present([request({ id: 'a' }), request({ id: 'b' })]);

		expect(requests.openId).toBe('a');
		expect(requests.open?.id).toBe('a');
	});

	it('keeps the open request across a refresh when it is still there', () => {
		requests.present([request({ id: 'a' }), request({ id: 'b' })]);
		requests.select('b');

		requests.present([request({ id: 'a' }), request({ id: 'b' })]);

		expect(requests.openId).toBe('b');
	});

	it('falls back to the first when the open one was closed elsewhere', () => {
		requests.present([request({ id: 'a' }), request({ id: 'b' })]);
		requests.select('b');

		requests.present([request({ id: 'a' })]);

		expect(requests.openId).toBe('a');
	});
});

describe('the state before a host exists', () => {
	it('starts with no account connected, which is the only state in this pass', () => {
		expect(requests.connected).toBe(false);
		expect(requests.all).toEqual([]);
	});

	it('records a failure to reach a host and shows nothing', () => {
		requests.present([request()]);

		requests.fail('could not reach the host');

		expect(requests.error).toContain('could not reach');
		expect(requests.all).toEqual([]);
		expect(requests.openId).toBeNull();
	});

	it('clearing forgets the list and the account', () => {
		requests.present([request()]);

		requests.clear();

		expect(requests.connected).toBe(false);
		expect(requests.all).toEqual([]);
		expect(requests.openId).toBeNull();
	});
});

describe('RequestRow', () => {
	it('names the request, its number, its author and when it moved', () => {
		requests.present([request()]);
		const view = render(RequestRow, { request: request() });

		expect(view.text()).toContain('#412');
		expect(view.text()).toContain('Split the diff view');
		expect(view.text()).toContain('Ada Lovelace');
		view.destroy();
	});

	it('says why it needs you, when it does', () => {
		const view = render(RequestRow, { request: request() });

		expect(view.text()).toContain('Your review was requested');
		view.destroy();
	});

	it('says nothing about why when it is somebody else\'s move', () => {
		const view = render(RequestRow, {
			request: request({ needsYou: false, needsYouBecause: null }),
			waiting: true
		});

		expect(view.all('.because')).toHaveLength(0);
		view.destroy();
	});

	it('renders a waiting row dashed', () => {
		const view = render(RequestRow, {
			request: request({ needsYou: false }),
			waiting: true
		});

		expect(view.all('.row.waiting')).toHaveLength(1);
		view.destroy();
	});

	it('shows review and check state, and a draft as a draft', () => {
		const view = render(RequestRow, {
			request: request({ draft: true, review: 'changesRequested', checks: 'failing' })
		});

		expect(view.text()).toContain('draft');
		expect(view.text()).toContain('changes requested');
		expect(view.text()).toContain('checks failing');
		view.destroy();
	});

	it('says nothing about checks when the host runs none', () => {
		const view = render(RequestRow, { request: request({ checks: null }) });

		expect(view.text()).not.toContain('checks');
		view.destroy();
	});

	it('opens a request from its row', () => {
		requests.present([request({ id: 'a' }), request({ id: 'b' })]);
		const view = render(RequestRow, { request: request({ id: 'b' }) });

		click(view.get('.body'));

		expect(requests.openId).toBe('b');
		view.destroy();
	});

	it('marks the open row', () => {
		requests.present([request({ id: 'a' })]);
		const view = render(RequestRow, { request: request({ id: 'a' }) });

		expect(view.all('.row.open')).toHaveLength(1);
		view.destroy();
	});
});

describe('RequestDetail', () => {
	it('says what it is for before a request is opened', () => {
		const view = render(RequestDetail, {});

		expect(view.text()).toContain('Open a pull request');
		view.destroy();
	});

	it('shows the branches, the counts and the state', () => {
		requests.present([request()]);
		const view = render(RequestDetail, {});

		expect(view.text()).toContain('feature/split-view');
		expect(view.text()).toContain('main');
		expect(view.text()).toContain('4 files');
		expect(view.text()).toContain('+120');
		expect(view.text()).toContain('awaiting review');
		view.destroy();
	});

	it('says when the host reports it cannot merge', () => {
		requests.present([request({ mergeable: false })]);
		const view = render(RequestDetail, {});

		expect(view.text()).toContain('conflicts');
		view.destroy();
	});

	it('disables every action and says what it needs, without naming a work item', () => {
		// Reviewing, approving and merging all need a host, and Spagitty talks
		// to none. A control that looks live and does nothing is worse than one
		// that explains itself.
		requests.present([request()]);
		const view = render(RequestDetail, {});

		const buttons = view.all('button') as HTMLButtonElement[];
		expect(buttons.length).toBeGreaterThan(0);
		for (const button of buttons) {
			expect(button.disabled).toBe(true);
			// It says what is missing — a connected account — rather than quoting
			// an identifier only this project's own record can resolve.
			expect(button.title).toContain('connected account');
			expect(button.title).not.toMatch(/FEAT-\d/);
		}
		view.destroy();
	});
});

describe('the promises this screen makes', () => {
	/** Every source file the screen is built from. */
	function sources(): string[] {
		const here = join(process.cwd(), 'src/lib/requests');
		const files = readdirSync(here)
			.filter((name) => !name.endsWith('.test.ts'))
			.map((name) => readFileSync(join(here, name), 'utf8'));
		files.push(readFileSync(join(process.cwd(), 'src/routes/requests/+page.svelte'), 'utf8'));
		return files;
	}

	it('uses no host\'s name anywhere in the screen', () => {
		// This is the kind of thing that rots the moment somebody adds "Open on
		// <host>" without thinking, so it is asserted rather than intended.
		const brands = ['GitHub', 'GitLab', 'Bitbucket', 'Gitea', 'Forgejo', 'Azure DevOps'];

		for (const source of sources()) {
			for (const brand of brands) {
				expect(source).not.toContain(brand);
			}
		}
	});

	it('makes no network call, because there is nothing to make one with', () => {
		// A screen with no way to make a request cannot make one. That is a
		// stronger claim than any behavioural test could make.
		for (const source of sources()) {
			expect(source).not.toMatch(/\bfetch\s*\(/);
			expect(source).not.toContain('XMLHttpRequest');
			expect(source).not.toContain('WebSocket');
			expect(source).not.toMatch(/https?:\/\//);
		}
	});

	it('links no HTTP client into the application, in either language', () => {
		const npm = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
		const declared = Object.keys({
			...(npm.dependencies ?? {}),
			...(npm.devDependencies ?? {})
		});
		for (const name of ['axios', 'node-fetch', 'got', 'undici', 'ky', 'superagent']) {
			expect(declared).not.toContain(name);
		}

		for (const manifest of ['Cargo.toml', 'crates/spagitty-core/Cargo.toml', 'src-tauri/Cargo.toml']) {
			const text = readFileSync(join(process.cwd(), manifest), 'utf8');
			for (const crate of ['reqwest', 'ureq', 'hyper', 'isahc', 'attohttpc', 'curl']) {
				expect(text).not.toMatch(new RegExp(`^\\s*${crate}\\s*=`, 'm'));
			}
		}
	});

	it('names every state in words a user of any host would recognise', () => {
		expect(Object.values(REVIEW_LABELS)).toEqual([
			'awaiting review',
			'changes requested',
			'approved',
			'no reviewers'
		]);
		expect(Object.values(CHECK_LABELS)).toEqual([
			'checks passing',
			'checks failing',
			'checks running'
		]);
	});
});

// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The one-at-a-time notice, store and component together.
 *
 * The logic worth testing is the asymmetry: a success acknowledges itself and
 * leaves, a failure waits to be read. Getting that backwards either makes the
 * user dismiss every routine fetch by hand, or hides git's own explanation of
 * what went wrong — which is usually the most useful sentence GitLumiere has.
 *
 * Timers are faked rather than waited on: `LINGER` is four seconds, and a suite
 * that actually sleeps for them is a suite nobody runs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { click, flushSync, render } from '../../testing/mount';
import Notice from './Notice.svelte';
import { describe as explain, notice } from './notice.svelte';

/** How long a success stays up, mirroring `LINGER` in the store. */
const LINGER = 4000;

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	notice.dismiss();
	vi.useRealTimers();
});

describe('notice store', () => {
	it('shows a success and takes it away on its own', () => {
		notice.ok('Fetched origin');

		expect(notice.current?.tone).toBe('ok');
		expect(notice.current?.title).toBe('Fetched origin');
		expect(notice.current?.detail).toBeNull();

		vi.advanceTimersByTime(LINGER - 1);
		expect(notice.current).not.toBeNull();

		vi.advanceTimersByTime(1);
		expect(notice.current).toBeNull();
	});

	it('carries a detail on a success when one is given', () => {
		notice.ok('Pushed main', 'everything up-to-date');
		expect(notice.current?.detail).toBe('everything up-to-date');
	});

	it('keeps a failure up until it is dismissed', () => {
		notice.failed('Push failed', new Error('non-fast-forward'));

		expect(notice.current?.tone).toBe('error');
		expect(notice.current?.detail).toBe('non-fast-forward');

		vi.advanceTimersByTime(LINGER * 10);
		expect(notice.current?.title).toBe('Push failed');

		notice.dismiss();
		expect(notice.current).toBeNull();
	});

	it('replaces the previous notice, newest wins', () => {
		notice.ok('Fetched origin');
		const first = notice.current?.id;

		notice.ok('Pulled main');
		expect(notice.current?.title).toBe('Pulled main');
		expect(notice.current?.id).not.toBe(first);
	});

	/**
	 * The replaced notice's timer has to be cancelled, not merely orphaned: if
	 * it survives, it fires mid-way through the *second* notice's life and takes
	 * a message off the screen that the user has had for under a second.
	 */
	it('cancels the replaced expiry rather than orphaning it', () => {
		notice.ok('Fetched origin');
		vi.advanceTimersByTime(LINGER - 100);

		notice.ok('Pulled main');
		vi.advanceTimersByTime(200);

		expect(notice.current?.title).toBe('Pulled main');
	});

	it('cancels a pending expiry when dismissed early', () => {
		notice.ok('Fetched origin');
		notice.dismiss();
		notice.failed('Push failed', 'rejected');

		vi.advanceTimersByTime(LINGER * 2);
		expect(notice.current?.title).toBe('Push failed');
	});

	it('does not expire a failure that replaced a success', () => {
		notice.ok('Staged 3 files');
		notice.failed('Commit failed', new Error('empty message'));

		vi.advanceTimersByTime(LINGER * 2);
		expect(notice.current?.tone).toBe('error');
	});
});

describe('describe()', () => {
	it('passes a string through', () => {
		expect(explain('not something we can merge')).toBe('not something we can merge');
	});

	it('takes the message off an Error', () => {
		expect(explain(new Error('your local changes would be overwritten'))).toBe(
			'your local changes would be overwritten'
		);
	});

	it('says something for anything else', () => {
		expect(explain(undefined)).toBe('undefined');
		expect(explain(404)).toBe('404');
		expect(explain(null)).toBe('null');
	});
});

describe('Notice component', () => {
	it('renders nothing when there is nothing to say', () => {
		const view = render(Notice, {});
		expect(view.find('.notice')).toBeNull();
		view.destroy();
	});

	it('shows the title, and the detail when there is one', () => {
		const view = render(Notice, {});

		notice.ok('Fetched origin');
		flushSync();
		expect(view.get('.title').textContent).toBe('Fetched origin');
		expect(view.find('.detail')).toBeNull();

		notice.failed('Push failed', new Error('non-fast-forward'));
		flushSync();
		expect(view.get('.detail').textContent).toBe('non-fast-forward');

		view.destroy();
	});

	it('marks a failure so it does not read as an acknowledgement', () => {
		const view = render(Notice, {});

		notice.ok('Fetched origin');
		flushSync();
		expect(view.get('.notice').classList.contains('error')).toBe(false);

		notice.failed('Push failed', 'rejected');
		flushSync();
		expect(view.get('.notice').classList.contains('error')).toBe(true);

		view.destroy();
	});

	it('dismisses from the close button', () => {
		const view = render(Notice, {});
		notice.failed('Push failed', 'rejected');
		flushSync();

		click(view.get('.close'));
		flushSync();

		expect(notice.current).toBeNull();
		expect(view.find('.notice')).toBeNull();

		view.destroy();
	});

	it('is announced without stealing focus', () => {
		const view = render(Notice, {});
		notice.ok('Fetched origin');
		flushSync();

		const element = view.get('.notice');
		expect(element.getAttribute('role')).toBe('status');
		expect(element.getAttribute('aria-live')).toBe('polite');

		view.destroy();
	});
});

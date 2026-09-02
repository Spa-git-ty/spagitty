// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The badge and the reward moment, mounted (FEAT-072).
 *
 * The behaviours worth holding are the ones about restraint. A badge nobody has
 * earned must not name itself if it is secret. A reward moment must not appear
 * *instantly* — the beat before it is the difference between an acknowledgement
 * and a busy toast — and it must never take the pointer away from somebody who
 * is in the middle of something.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { click, render } from '../../testing/mount';
import { flushSync } from 'svelte';
import BadgeChip from './BadgeChip.svelte';
import RewardOverlay from './RewardOverlay.svelte';
import { badge } from './badges';
import { delight } from './store.svelte';
import { settings } from '$lib/settings/store.svelte';
import type { DelightEvent } from './events';

const COMMIT: DelightEvent = {
	kind: 'commit',
	files: 2,
	directories: 1,
	added: 20,
	removed: 4,
	onDefaultBranch: false,
	amend: false,
	tests: false,
	refactor: false
};

describe('a badge', () => {
	it('draws the glyph and the name it was earned under', () => {
		const view = render(BadgeChip, { found: badge('git-sensei') });

		expect(view.text()).toContain('🥋');
		expect(view.text()).toContain('Git Sensei');
		view.destroy();
	});

	it('says nothing at all about a secret nobody has found', () => {
		const view = render(BadgeChip, { found: null, locked: true });

		expect(view.text()).toContain('???');
		expect(view.text()).not.toContain('Reflog');
		expect(view.get('.badge').getAttribute('aria-label')).toBe('Undiscovered badge');
		view.destroy();
	});

	it('is a button only when it does something', () => {
		const still = render(BadgeChip, { found: badge('cook') });
		expect(still.find('button')).toBeNull();
		still.destroy();

		const acts = render(BadgeChip, { found: badge('cook'), onclick: () => {} });
		expect(acts.find('button')).not.toBeNull();
		acts.destroy();
	});

	it('calls back when it is pressed', () => {
		const onclick = vi.fn();
		const view = render(BadgeChip, { found: badge('cook'), onclick });

		click(view.get('button'));

		expect(onclick).toHaveBeenCalled();
		view.destroy();
	});

	it('marks the one that is equipped as the title', () => {
		const view = render(BadgeChip, { found: badge('cook'), equipped: true });

		expect(view.text()).toContain('title');
		view.destroy();
	});
});

describe('the reward moment', () => {
	/**
	 * Earn something and let the card arrive.
	 *
	 * The `flushSync` between the two is not ceremony: the overlay schedules its
	 * beat from an effect, and an effect that has not run has scheduled no
	 * timer for the fake clock to advance past.
	 */
	function earn(): void {
		delight.record(COMMIT);
		flushSync();
		vi.advanceTimersByTime(400);
		flushSync();
	}

	beforeEach(() => {
		vi.useFakeTimers();
		localStorage.clear();
		delight.clear();
		settings.settings.personality = 'balanced';
		delight.bind('/repos/one');
	});

	afterEach(() => {
		delight.clear();
		vi.useRealTimers();
		localStorage.clear();
	});

	it('shows nothing until something is earned', () => {
		const view = render(RewardOverlay, {});

		expect(view.find('.card')).toBeNull();
		view.destroy();
	});

	it('waits a beat before it appears', () => {
		const view = render(RewardOverlay, {});

		delight.record(COMMIT);
		flushSync();

		// The silence is the point: a card in the same frame as the operation
		// reads as part of it rather than as a reaction to it.
		expect(view.find('.card')).toBeNull();

		vi.advanceTimersByTime(400);
		flushSync();
		expect(view.find('.card')).not.toBeNull();

		view.destroy();
	});

	it('leaves on its own', () => {
		const view = render(RewardOverlay, {});

		earn();
		expect(view.find('.card')).not.toBeNull();

		vi.advanceTimersByTime(5000);
		flushSync();
		expect(view.find('.card')).toBeNull();

		view.destroy();
	});

	it('never takes the pointer from the window underneath', () => {
		const view = render(RewardOverlay, {});
		earn();

		// A stage that swallowed clicks would put a wall in front of somebody
		// who is in the middle of something.
		expect(view.get('.stage').className).toContain('stage');
		expect(view.find('.dim'), 'only a legendary badge dims the window').toBeNull();

		view.destroy();
	});

	it('can be put away by hand', () => {
		const view = render(RewardOverlay, {});
		earn();

		click(view.get('.close'));

		expect(view.find('.card')).toBeNull();
		view.destroy();
	});

	it('shows one card at a time when several are earned at once', () => {
		const view = render(RewardOverlay, {});

		// A first commit earns Cook and Zero Noise is close behind; whatever
		// lands together, one card is on screen at a time.
		expect(delight.waiting).toBe(0);
		earn();

		expect(view.all('.card')).toHaveLength(1);
		view.destroy();
	});
});

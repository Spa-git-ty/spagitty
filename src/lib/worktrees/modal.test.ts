// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Which worktree dialog is up (FEAT-062, covered under FEAT-072).
 *
 * Two dialogs share one store because they are one stack: opening the add
 * form from the manager has to hide the manager, and closing the add form has
 * to leave the manager where it was. `isOpen` is what the host uses to decide
 * whether anything is up at all, so it is asserted separately from each.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { worktreeModal } from './modal.svelte';

beforeEach(() => {
	worktreeModal.hideAll();
});

describe('nothing is up to begin with', () => {
	it('reports every dialog closed', () => {
		expect(worktreeModal.isOpen).toBe(false);
		expect(worktreeModal.isManagerOpen).toBe(false);
		expect(worktreeModal.isAddOpen).toBe(false);
	});
});

describe('the manager', () => {
	it('opens, and counts as something being up', () => {
		worktreeModal.showManager();

		expect(worktreeModal.isManagerOpen).toBe(true);
		expect(worktreeModal.isOpen).toBe(true);
	});

	it('closes without disturbing the add form', () => {
		worktreeModal.showManager();
		worktreeModal.showAdd();

		worktreeModal.hideManager();

		expect(worktreeModal.isManagerOpen).toBe(false);
		expect(worktreeModal.isAddOpen).toBe(true);
		expect(worktreeModal.isOpen).toBe(true);
	});
});

describe('the add form', () => {
	it('opens over the manager rather than beside it', () => {
		worktreeModal.showAdd();

		expect(worktreeModal.isAddOpen).toBe(true);
		expect(worktreeModal.isOpen).toBe(true);
	});

	it('closing it leaves the manager up, because that is where it was opened from', () => {
		worktreeModal.showManager();
		worktreeModal.showAdd();

		worktreeModal.hideAdd();

		expect(worktreeModal.isAddOpen).toBe(false);
		expect(worktreeModal.isManagerOpen).toBe(true);
		expect(worktreeModal.isOpen).toBe(true);
	});

	it('is dismissed when the manager is opened again', () => {
		// Showing the manager is a return to it, not a second layer on top of
		// the form that was covering it.
		worktreeModal.showAdd();

		worktreeModal.showManager();

		expect(worktreeModal.isAddOpen).toBe(false);
		expect(worktreeModal.isManagerOpen).toBe(true);
	});
});

describe('closing everything', () => {
	it('takes both down at once', () => {
		worktreeModal.showManager();
		worktreeModal.showAdd();

		worktreeModal.hideAll();

		expect(worktreeModal.isOpen).toBe(false);
		expect(worktreeModal.isManagerOpen).toBe(false);
		expect(worktreeModal.isAddOpen).toBe(false);
	});

	it('is safe when nothing was up', () => {
		worktreeModal.hideAll();

		expect(worktreeModal.isOpen).toBe(false);
	});
});

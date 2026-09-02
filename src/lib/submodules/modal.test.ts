// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Whether the submodules dialog is up (FEAT-067, covered under FEAT-072).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { submoduleModal } from './modal.svelte';

beforeEach(() => {
	submoduleModal.hide();
});

describe('the submodules dialog', () => {
	it('starts closed', () => {
		expect(submoduleModal.isOpen).toBe(false);
	});

	it('opens', () => {
		submoduleModal.show();

		expect(submoduleModal.isOpen).toBe(true);
	});

	it('closes', () => {
		submoduleModal.show();

		submoduleModal.hide();

		expect(submoduleModal.isOpen).toBe(false);
	});

	it('showing twice leaves it open rather than toggling it shut', () => {
		// The command palette and the tabs menu can both ask for it, and the
		// second ask must not be read as a dismissal.
		submoduleModal.show();

		submoduleModal.show();

		expect(submoduleModal.isOpen).toBe(true);
	});
});

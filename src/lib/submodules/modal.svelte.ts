// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Submodules modal state manager (FEAT-067).
 */

let open = $state(false);

export const submoduleModal = {
	get isOpen(): boolean {
		return open;
	},
	show(): void {
		open = true;
	},
	hide(): void {
		open = false;
	}
};

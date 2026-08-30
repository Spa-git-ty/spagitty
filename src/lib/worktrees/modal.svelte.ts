// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Worktree modal state manager (FEAT-062).
 */

let managerOpen = $state(false);
let addOpen = $state(false);

export const worktreeModal = {
	get isOpen(): boolean {
		return managerOpen || addOpen;
	},
	get isManagerOpen(): boolean {
		return managerOpen;
	},
	get isAddOpen(): boolean {
		return addOpen;
	},

	showManager(): void {
		managerOpen = true;
		addOpen = false;
	},
	hideManager(): void {
		managerOpen = false;
	},

	showAdd(): void {
		addOpen = true;
	},
	hideAdd(): void {
		addOpen = false;
	},

	hideAll(): void {
		managerOpen = false;
		addOpen = false;
	}
};
